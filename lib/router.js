'use strict';

require('babel-polyfill')

const net = require('net'),
      Command = require('./command'),
      constants = require('./constants'),
      magic = require('./magic'),
      assert = require('assert'),
      Contact = require('./contact'),
      _ = require('lodash'),
      prettyjson = require('prettyjson'),
      utils = require('./utils'),
      Promise = require('bluebird')

Promise.config({ longStackTrace: true })

module.exports = node => {
  return new Promise((resolve, reject) => {
    /**** PRIVATE FIELDS ****/
    const pendingRequests = []
    const buckets = []
    const queryCache = []
    const logger = node.logger
    const messageDelimiter = ';'
    /**** END PRIVATE FIELDS ****/

    /**** METHODS ****/
    const sendCommand = command => {
      const p = new Promise((resolve, reject) => {
        logger.debug(`attempting to connect to ${command.destination.ip}:${command.destination.port}`)
        const socket = net.createConnection(command.destination.port, command.destination.ip)

        socket.on('error', err => {
          logger.error(`error connecting: ${err}`)
          reject(err)
        })

        socket.on('connect', () => {
          let data = Command.encryptAndSign(command, command.destination.publicKey, node.privateKey)
          data = Command.serialize(data) + messageDelimiter
          socket.write(data, () => {
            logger.debug(`destroyed socket connecting to ${command.destination.ip}:${command.destination.port}`)
            socket.destroy()
          })
          logger.info(`sent data from ${node.ip}:${node.port} to ${command.destination.ip}:${command.destination.port}\n${prettyjson.render(command, { noColor: true })}`)

          // wait for responses to some requests
          if (_.includes(['PING', 'MESSAGE', 'FIND', 'RETRIEVE_CONTACTS', 'KEY_REQUEST'], command.command)) {
            pendingRequests.push({ command, resolve, reject })
            //setTimeout(() => rejectRequest(command.id), constants.RESPONSE_TIMEOUT);
          }
        })
      })

      return p
    }

    const handleCommand = async (serializedData) => {
      let command = Command.deserialize(serializedData)
      command = Command.decrypt(command, node.privateKey)
      logger.info(`${node.id}((${node.ip}:${node.port}) received\n ${prettyjson.render(command, { noColor: true })}`)

      if (command.command === 'PING')
      {
        const destPublicKey = await findPublicKeyP(command.payload.sourceId)
        sendCommand(Command.createPingRes(command, node.asContact(), destPublicKey))
      }
      else if (command.command === 'MESSAGE_RESPONSE' || command.command === 'PING_RESPONSE')
      {
        resolveRequest(command.id, true)
      }
      else if (command.command === 'MESSAGE')
      {
        if (command.payload.strMessage.destinationId == node.id) {
          const message = Command.deserialize(command.payload.strMessage.message);
          const decrypted = Command.decrypt(message, node.privateKey);
          console.log('decrypted message received ', decrypted.payload.strMessage);
          const destPublicKey = await findPublicKeyP(command.payload.sourceId)
          sendCommand(Command.createMessageRes(command, node.asContact(), destPublicKey))
          return;
        }
        const messageResponse = await routeMessage(command.payload.strMessage);
        const destPublicKey = await findPublicKeyP(command.payload.sourceId)
        sendCommand(Command.createMessageRes(command, node.asContact(), destPublicKey));
        return
      }
      else if (command.command === 'KEY_REQUEST')
      {
          // check if query id is in the cache
          if (_.includes(queryCache, command.payload.state.queryId)){
            sendCommand(Command.createPubKeyRes(command, node.asContact()));
            return;
          }

          const requestedKey = routePublicKeyP(command.payload.state).then(res => {
            return sendCommand(Command.createPubKeyRes(command, node.asContact(), res))
          })
      }
      else if (command.command === 'KEY_RESPONSE')
      {
          resolveRequest(command.id, command.payload.requestedKey)
      }
      else if (command.command === 'RETRIEVE_CONTACTS')
      {
        const state = command.payload.state;

          // stop if we already responded to the same message
          if (_.includes(queryCache, state.queryId)){
            const destPublicKey = await findPublicKeyP(command.payload.sourceId)
            state.contacted.push(node.id);
            state.contacted = _.uniq(state.contacted);
            sendCommand(Command.createRetrieveContactRes(command, node.asContact(), destPublicKey));
            return
          }
          queryCache.push(state.queryId);

          try {
            await updateContactP(command.payload.state.contact)
          } catch (e) {
            logger.error('RETRIEVE_CONTACTS: failed to update contact', e)
            return
          }

          const destPublicKey = await findPublicKeyP(command.payload.sourceId)

          // add current node to contacted list
          state.contacted = _.chain(state.contacted).concat([node.id]).uniq().value()

          // update closest node in state
          const distance = magic.getDistance(state.contact.id, node.id);
          if (magic.compareKeys(distance, magic.hexToBuffer(state.closestNodeDistance)) === -1) {
            state.previousClosestNode = state.closestNode;
            state.closestNode = node.id;
            state.closestNodeDistance = magic.bufferToHex(distance);
          }

          let closestNodeUnchanged = state.closestNode === state.previousClosestNode
          if(state.closestNode && state.previousClosestNode) {
            closestNodeUnchanged = state.closestNode.id === state.previousClosestNode.id;
          }

          // add nearest contacts of current node to contact list
          const nearestContacts = getNearestContacts(state.key, state.limit, node.id);
          state.contactlist = _.chain(state.contactlist).concat(nearestContacts).uniqBy('id').filter(contact => contact.id !== state.contact.id).value()

          // stop if conact list is full or the closest node didn't change
          const contactlistFull = state.contactlist.length >= constants.K;
          if (closestNodeUnchanged || contactlistFull) {
            sendCommand(Command.createRetrieveContactRes(command, node.asContact(), destPublicKey));
            return
          }

          // recalculate remaining contacts
          state.remainingContacts = state.contactlist.filter(e => !_.includes(state.contacted, e.id))

          // stop if there are no more contacts to query
          if (state.remainingContacts.length === 0) {
            sendCommand(Command.createRetrieveContactRes(command, node.asContact(), destPublicKey));
            return
          }

          try {
            command.payload.state = await iteritiveFindP(state)
            sendCommand(Command.createRetrieveContactRes(command, node.asContact(), destPublicKey))
            logger.debug(`${node.username} received RETRIEVE_CONTACTS finished`)
          } catch (e) {
            logger.error('RETRIEVE_CONTACTS: iterative find failed', e)
          }

      }
      else if (command.command === 'RETRIEVE_CONTACTS_RESPONSE')
      {
        resolveRequest(command.id, command.payload.state)
      }
    }

    const updateContactP = async (contact) => {
      const bucketIndex = magic.getBucketIndex(node.id, contact.id)

      logger.debug(node.username, 'is updating buckets with contact', contact.username)
      assert(bucketIndex < constants.B)

      if (!buckets[bucketIndex]) buckets[bucketIndex] = []

      const bucket = buckets[bucketIndex]

      const foundAt = _.findIndex(bucket, e => e.id === contact.id)
      if (foundAt !== -1) {
        bucket[foundAt].lastSeen = Date.now()
      } else if (bucket.length < constants.K) {
        contact.lastSeen = Date.now()
        bucket.push(contact)
      } else {
        // TODO: untested branch
        try {
          await node.ping(bucket[0])
        } catch (e) {
          bucket.splice(0)
          bucket.push(contact)
        }
      }

      bucket.sort(e => e.lastSeen)

      return contact
    }

    const getNearestNodesP = async (contactID) => {
      const state = {
        key: contactID,
        queryId: utils.generateMessageId(),
        contact: node.asContact(),
        limit: constants.ALPHA,
        contacted: [],
        contactlist: [],
        remainingContacts: [],
        previousClosestNode: null
      }

      state.contacted.push(node.id)
      queryCache.push(state.queryId)

      // initialize state
      getNearestContacts(contactID, state.limit, node.id).forEach(contact => state.contactlist.push(contact))
      state.remainingContacts = state.contactlist
      state.closestNode = state.contactlist[0]
      state.previousClosestNode = state.closestNode
      assert(state.closestNode, 'Not connected to any peers')
      state.closestNodeDistance = magic.bufferToHex(magic.getDistance(state.key, state.closestNode.id))

      try {
        const finalState = await iteritiveFindP(state)
        return Promise.all(finalState.contactlist.map(e => updateContactP(e)))
      } catch (e) {
        logger.error('getNearestNodesP: failed iteritiveFindP', e)
        return []
      }
    }

    const iteritiveFindP = async (state) => {
      const remainingContacts = state.contactlist.filter(e => !_.includes(state.contacted, e.id))

      if (remainingContacts.length === 0) { return state }

      const routeResults = await route(state, undefined, () => Promise.resolve(_.take(remainingContacts, constants.ALPHA)), (c, state) => node.retrieveContacts(c, state))

      let contactlist = routeResults.map(e => e.contactlist).reduce((current, previous) => current.concat(previous))
      contactlist = _.uniqBy(contactlist, 'id')
      let contacted = routeResults.map(e => e.contacted).reduce((current, previous) => current.concat(previous))
      contacted = _.uniq(contacted)

      return await iteritiveFindP(_.merge({}, routeResults[0], { contactlist, contacted }))
    }

    const route = async (state, fnDestinationP, fnGatherContactsP, fnEachContactP) => {
      if (state.destinationId === node.id && fnDestinationP) return fnDestinationP()

      const contacts = await fnGatherContactsP()
      return await Promise.all(contacts.map(e => fnEachContactP(e, state)))
    }

    const findPublicKeyP = async id => {
      //console.log('looksups', constants.lookups++);
      const bucketIndex = magic.getBucketIndex(node.id, id)
      const bucket = buckets[bucketIndex]

      // check if key is stored locally
      if (bucket) {
        const contactIndex = _.findIndex(bucket, e => e.id === id)
        if (contactIndex !== -1) { return bucket[contactIndex].publicKey }
      }
      // send request to other nodes
      const queryId = utils.generateMessageId();
      queryCache.push(queryId);
      const results = await routePublicKeyP({ destinationId: id, visited: [], queryId });
      assert(results.length > 0, `no results for find public key ${node.username}`)
      return results[0]; // will be array of size 1
    }

    const routePublicKeyP = async state => {
      state.visited.push(node.id);
      if (node.id !== state.destinationId) { queryCache.push(state.queryId); } // cache query id if not the desination
      let results = [];
      let requests = 0;
      let randReq = [];

      while (results.length < constants.ELI_THRESHOLD && requests < constants.K) {
        const routeResults = await route(state, () => {
          return Promise.resolve([node.publicKey]); // return public key when it gets to destination node
        }, () => {
          const contactList = _.flatten(buckets).filter(e => e !== undefined).filter(e => !_.includes(state.visited, e)).filter(e => !_.includes(randReq, e.id));
          return Promise.resolve(getRandomCloserNodes(state.destinationId, contactList, constants.ALPHA));
          //return Promise.resolve(_.sampleSize(contactList, constants.ALPHA));
        }, contact => {
          randReq.push(contact.id);
          return sendCommand(Command.createPubKeyReq(node.asContact(), contact, state));
        });

        requests += constants.ALPHA;
        results = results.concat(_.flatten(routeResults).filter(e => e !== undefined && e !== null));
      }

      const keyCounts = _.countBy(results);
      if (results.length > 0){
        const maxKey = Object.keys(keyCounts).reduce((a, b) => {return keyCounts[a] > keyCounts[b] ? a : b });
        if ((keyCounts[maxKey] / results.length * 100) >= constants.APPROVAL_PERCENTAGE){
          return [maxKey];
        }
      }

      return [];
    };

    const sendMessage = async (id, strMessage, destPublicKey) => {

      // this is encrypted for the final destination
      const encryptedMessage = Command.serialize(Command.encryptAndSign({
        destination: {},
        payload: {
          sourceId: node.id,
          sourceIp: node.ip,
          sourcePort: node.port,
          strMessage
        }
      }, destPublicKey, node.privateKey));

      // forward routing onto next contact
      const response = await routeMessage({ destinationId: id, message: encryptedMessage });
      // TODO: should there be a visited?
      console.log('response', response);
      return response;
    }

    const routeMessage = async (state) => {
      const contactList = _.flatten(buckets).filter(e => e !== undefined);
      const nextContact = await getRandomCloserNodes(state.destinationId, contactList, 1);
      console.log('routing command from', node.username);
      const req =  await sendCommand(Command.createMessageReq(node.asContact(), nextContact[0], state));
      return req;
    }

    // returns nodes close to destination based on weighted random probability
    const getRandomCloserNodes = async (destId, contactList, numContacts) => {
      const sorted = _.sortBy(contactList, e => { return magic.getDistance(destId, e.id); }).reverse();
      const probabilities = _.range(sorted.length).map((e) => ((e+1) * (e+1)) / ((sorted.length) * (sorted.length)));
      let indexes = [];

      while (indexes.length < numContacts && indexes.length < contactList.length){
        const randNumber = Math.random();
        const index = _.findIndex(probabilities, e => e > randNumber);
        if (!_.includes(indexes, index)) { indexes.push(index); }
    }
      return indexes.map(e => contactList[e]);
    };

    const getNearestContacts = (contactID, limit, nodeID) => {
      const contacts = [];
      const index = magic.getBucketIndex(nodeID, contactID);
      let ascBucketIndex = index;
      let descBucketIndex = index;

      function addNearestFromBucket(bucket) {
        getNearestFromBucket(bucket, contactID, limit - contacts.length).forEach(function addToContacts(contact) {
            const isContact = contact.__classId === 'CONTACT'
            const poolNotFull = contacts.length < limit
            const notRequester = contact.nodeID !== nodeID

            if (isContact && poolNotFull && notRequester) { contacts.push(contact) }
          })
      }

      // add contacts from current bucket
      addNearestFromBucket(buckets[index])

      // add contacts while decrementing counter
      while (contacts.length < limit && ascBucketIndex < constants.B) { ascBucketIndex++; addNearestFromBucket(buckets[ascBucketIndex]) }

      // add contacts while incrementing counter
      while (contacts.length < limit && descBucketIndex >= 0) { descBucketIndex--; addNearestFromBucket(buckets[descBucketIndex]) }

      return contacts
    }

    const getNearestFromBucket = (bucket, key, limit) => {
      if (!bucket) { return [] }

      return bucket
        .map(contact => ({ contact: contact, distance: magic.getDistance(contact.id, key) })) // calculate distances
        .sort((a, b) => magic.compareKeys(a.distance, b.distance)) // sort keys by distance
        .splice(0, limit) // take top $limit
        .map(c => c.contact) // pluck contact
    }

    const refreshBucketsBeyondClosestP = async (shortlist) => {
      const bucketIndexes = Object.keys(buckets)
      const leastBucket = _.min(bucketIndexes)
      const bucketsToRefresh = bucketIndexes.filter(index => index > leastBucket);

      logger.debug('refreshing buckets farthest than closest known');
      for (let i = 0; i < bucketsToRefresh.length; i++) {
        const random = magic.getRandomInBucketRangeBuffer(bucketsToRefresh[i])
        await getNearestNodesP(random.toString('hex'))
      }

      logger.debug('refreshed all buckets');
    }

    /**** END METHODS ****/

    /**** HELPER METHODS ****/
    const completeRequest = (id, f) => {
      const i = _.findIndex(pendingRequests, e => e.command.id === id);
      if (i !== -1) {
        f(pendingRequests[i]);
        pendingRequests.splice(i, 1);
      }
    };
    const rejectRequest = id => completeRequest(id, request => request.reject(new Error('timeout')));
    const resolveRequest = (id, result) => completeRequest(id, request => request.resolve(result));
    /**** END HELPER METHODS ****/

    /**** CONSTRUCTOR ****/
    // create listening server
    const server = net.createServer(socket => {
      const addr = socket.remoteAddress;
      const port = socket.remotePort;

      logger.debug(`${node.id}((${node.ip}:${node.port}) connection from ${addr}:${port}`);

      let data = '';
      socket.on('data', chunk => {
        data += chunk;

        let dIndex = data.indexOf(messageDelimiter);
        while (dIndex > -1) {
          const command = data.substring(0, dIndex);
          handleCommand(command);

          data = data.substring(dIndex + 1);
          dIndex = data.indexOf(messageDelimiter);
        }
      });

      socket.on('close', () => logger.debug(`${node.id}(${node.ip}:${node.port}) closed connection with ${addr}:${port}`));
    });

    // reject promise if listening server fails to start
    server.on('error', err => reject(err));

    // resolve only after listening server has started
    server.on('listening', () => {
      resolve({
        close: () => new Promise((resolve, reject) => {
          server.close(err => {
            if (err) return reject(err)
            logger.debug(`stopped listening on ${node.ip}:${node.port}`);
            resolve();
          })
        }),
        sendCommand,
        updateContactP,
        getNearestNodesP,
        refreshBucketsBeyondClosestP,
        findPublicKeyP,
        sendMessage,
        _getNearestContacts: getNearestContacts,
        _buckets: buckets
      });
    });

    // attempt to start listening server
    logger.debug(`${node.id} is attempting to listen on ${node.ip}:${node.port}`);
    server.listen(node.port, node.ip);
    /**** END CONSTRUCTOR ****/
  });
};
