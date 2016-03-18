'use strict';

const net = require('net'),
      Command = require('./command'),
      constants = require('./constants'),
      magic = require('./magic'),
      assert = require('assert'),
      Contact = require('./contact'),
      _ = require('lodash'),
      prettyjson = require('prettyjson'),
      utils = require('./utils'),
      Promise = require('bluebird');

Promise.config({ longStackTrace: true })

module.exports = node => {
  return new Promise((resolve, reject) => {
    /**** PRIVATE FIELDS ****/
    const pendingRequests = [];
    const buckets = [];
    const logger = node.logger;
    const messageDelimiter = ';';
    /**** END PRIVATE FIELDS ****/
    
    /**** METHODS ****/
    /**
     * @param  {Command} command
     * @return {Promise}
     */
    const sendCommand = command => {
      const p = new Promise((resolve, reject) => {
        logger.debug(`attempting to connect to ${command.destination.ip}:${command.destination.port}`);
        const socket = net.createConnection(command.destination.port, command.destination.ip);
    
        socket.on('error', err => {
          logger.error(`error connecting: ${err}`);
          reject(err);
        });
        
        socket.on('connect', () => {
          var data = Command.encryptAndSign(command, command.destination.publicKey, node.privateKey)
          data = Command.serialize(data) + messageDelimiter;
          socket.write(data, () => {
            logger.debug(`destroyed socket connecting to ${command.destination.ip}:${command.destination.port}`);
            socket.destroy();
          });
          logger.info(`sent data from ${node.ip}:${node.port} to ${command.destination.ip}:${command.destination.port}\n${prettyjson.render(command, { noColor: true })}`);
          
          // wait for responses to some requests
          if (_.includes(['PING', 'MESSAGE', 'FIND', 'RETRIEVE_CONTACTS', 'KEY_REQUEST'], command.command)) {
            pendingRequests.push({ command, resolve, reject });
            setTimeout(() => rejectRequest(command.id), constants.RESPONSE_TIMEOUT);
          }
        });
      });
      
      return p;
    };
    
    /**
     * @param  {string} serializedData
     */
    const handleCommand = (serializedData) => {
      var command = Command.deserialize(serializedData);
      command = Command.decrypt(command, node.privateKey);
      logger.info(`${node.id}((${node.ip}:${node.port}) received\n ${prettyjson.render(command, { noColor: true })}`);
      
      switch(command.command)
      {
        case 'PING':
          sendCommand(Command.createPingRes(command, node.asContact()));
          break;
        case 'MESSAGE_RESPONSE':
        case 'PING_RESPONSE':
          resolveRequest(command.id, true);
          break;
        case 'MESSAGE':
          // TODO decrypt and verify
          logger.info(`received ${command.payload.messageString}`);
          sendCommand(Command.createMessageRes(command, node.asContact()));
          break;
        case 'FIND':
          // TODO: save pubkey
          const res = Command.createFindRes(command, node.asContact());
          sendCommand(res);
          break;
        case 'FIND_RESPONSE':
          resolveRequest(command.id, command.payload.publicKey);
          break;
        case 'KEY_REQUEST':
          logger.warn(`in key request ${node.username}`);
          const requestedKey = routePublicKeyP(command.payload.state).then(res => {
            return sendCommand(Command.createPubKeyRes(command, node.asContact(), res));
          });
          break;
        case 'KEY_RESPONSE':
          logger.warn(`in key response ${node.username}`);
          resolveRequest(command.id, command.payload.requestedKey);
          break;
        case 'RETRIEVE_CONTACTS':
          var state = command.payload.state;
          var distance = magic.getDistance(state.contact.id, node.id);
          updateContactP(state.contact).then(result => {
            state.contacted[node.id] = result;
          }).then(() => {
            if (magic.compareKeys(distance, magic.hexToBuffer(state.closestNodeDistance)) === -1) {
              state.previousClosestNode = state.closestNode;
              state.closestNode = node.id;
              state.closestNodeDistance = magic.bufferToHex(distance);
            }
            
            var contacts = getNearestContacts(state.key, state.limit, node.id);
            
            state.contactlist = state.contactlist.concat(contacts);
            state.contactlist = _.uniqBy(state.contactlist, 'id');
            state.contactlist = state.contactlist.filter(contact => {
              return contact.id !== state.contact.id;
            });
            
            if(state.closestNode && state.previousClosestNode) {
              var closestNodeUnchanged = state.closestNode.id === state.previousClosestNode.id;
            } else {
              var closestNodeUnchanged = state.closestNode === state.previousClosestNode;
            }
            
            var contactlistFull = state.contactlist.length >= constants.K;
            
            if (closestNodeUnchanged || contactlistFull) {
              command.payload.state = state;
              sendCommand(Command.createRetrieveContactRes(command, node.asContact()));
              return null;
            }
            
            state.remainingContacts = _.reject(state.contactlist, function(c) {
              return state.contacted[c.id];
            });

            state.remainingContacts = state.remainingContacts//.splice(0,constants.ALPHA);

            if (state.remainingContacts.length === 0) {
              command.payload.state = state;
              sendCommand(Command.createRetrieveContactRes(command, node.asContact()));
              return null;
            }
            
            return iteritiveFindP(state).then(resultState => {
              state = resultState;
              command.payload.state = state;
              sendCommand(Command.createRetrieveContactRes(command, node.asContact()));
              logger.debug(`${node.id} received RETRIEVE_CONTACTS finished`)
            });
          });
          
          break;
        case 'RETRIEVE_CONTACTS_RESPONSE':
          resolveRequest(command.id, command.payload.state);
          break;
      }
    };
    
    const updateContactP = (contact) => {
      
      const bucketIndex = magic.getBucketIndex(node.id, contact.id);

      logger.debug(node.id, 'is updating buckets with contact', contact.id);
      assert(bucketIndex < constants.B);
    
      // Eli - create new bucket :(
      if (!buckets[bucketIndex]) buckets[bucketIndex] = []; // Dan - create new bucket :)
      
      const bucket = buckets[bucketIndex];
      
      const p = Promise.resolve();
      
      const foundAt = _.findIndex(bucket, e => e.id === contact.id);
      if (foundAt !== -1) {
        bucket[foundAt].lastSeen = Date.now();
      } else if (bucket.length < constants.K) {
        contact.lastSeen = Date.now();
        bucket.push(contact);
      } else {
        p.then(() => {
          return node.ping(bucket[0]).then(null, result => {
            bucket.splice(0);
            bucket.push(contact);
          });
        });
      }
      
      p.then(() => { bucket.sort(e => e.lastSeen); })
      
      return p.then(() => { return contact });
    };
    
    const getNearestNodesP = (contactID) => {
      var state = {
        key: contactID,
        contact: node.asContact(),
        limit: constants.ALPHA,
        contacted: {},
        contactlist: [],
        remainingContacts: [],
        previousClosestNode: null
      };
      
      state.contacted[node.id] = node.asContact();

      getNearestContacts(contactID, state.limit, node.id).forEach(function addContact(contact) {
        state.contactlist.push(contact);
      });

      state.remainingContacts = state.contactlist;

      state.closestNode = state.contactlist[0];
      state.previousClosestNode = state.closestNode;
      
      assert(state.closestNode, 'Not connected to any peers');
      state.closestNodeDistance = magic.bufferToHex(magic.getDistance(state.key, state.closestNode.id));
      
      return iteritiveFindP(state).then(resultState => {
        state = resultState;
        return Promise.all(state.contactlist.map(e => updateContactP(e)));
      });
    };
    
    const iteritiveFindP = (state) => {
      return route(state, undefined, () => Promise.resolve(state.remainingContacts), (c, state) => {
        return new Promise((resolve, reject) => {
          node.retrieveContacts(c, state).then(state => {
            resolve(state);
          })
        })
      })
    };
    
    const route = (state, fnDestinationP, fnGatherContactsP, fnEachContactP) => {
      console.log(`routing to ${state.destinationId} from ${node.username}`);
      if (state.destinationId === node.id && fnDestinationP) return fnDestinationP();
      
      const contactsP = fnGatherContactsP();
      
      return contactsP.then(contacts => {
        let p = Promise.resolve(state);
        while (contacts.length !== 0){
          const nextContacts = contacts.splice(0,constants.ALPHA);
          p.then(nextState => {
            return Promise.all(nextContacts.map(e => fnEachContactP(e, nextState).reflect()))
          }).then(results => {
            results.forEach(result => {
              if (result.isFulfilled()) {
                result = result.value()
                state.contactlist = state.contactlist.concat(result.contactlist);
                state.contactlist = _.uniqBy(state.contactlist, 'id');
                state.contacted = state.contactlist.concat(result.contacted);
                state.contacted = _.uniqBy(state.contacted, 'id');
                state.remainingContacts = state.remainingContacts.concat(result.remainingContacts);
                state.remainingContacts = _.uniqBy(state.remainingContacts, 'id');
              } else { // rejected
                console.log('promise done fucked up with error ' + result.reason())
              }
            })
            return state;
          })
        }

        // for(var i = 0; i < result.length; i++){
        //       state.contactlist = state.contactlist.concat(result[i].state.contactlist);
        //       state.contactlist = _.uniqBy(state.contactlist, 'id');
        //       state.contacted = state.contactlist.concat(result[i].state.contacted);
        //       state.contacted = _.uniqBy(state.contacted, 'id');
        //       state.remainingContacts = state.remainingContacts.concat(result[i].state.remainingContacts);
        //       state.remainingContacts = _.uniqBy(state.remainingContacts, 'id');
        //     }
        
        return p;
      });
      /*
      return contactsP
        .then(contacts => contacts.filter(e => !_.includes(state.visited, e.id))) // filter out visited nodes
        .then(contacts => {
          return Promise.all(contacts.map(e => fnEachContactP(e, state)))
        });
        */
    }
    
    const findPublicKeyP = (username) => {
      const id = utils.generateId(username);
      const bucketIndex = magic.getBucketIndex(node.id, id);
      const bucket = buckets[bucketIndex];

      if(bucket) {
        const contactIndex = _.findIndex(bucket, e => e.id === id);
        if (contactIndex !== -1) {
          return Promise.resolve(bucket[contactIndex].publicKey);
        }
      }
      
      return routePublicKeyP({ destinationId: id, visited: [] });

    };

    const routePublicKeyP = (state) => {
      console.log('routePublicKeyP')
      state.visited.push(node.id);
      return route(state, () => {
        console.log('found destination')
        return Promise.resolve(node.publicKey); // return public key when it gets to destination node
      }, () => {
        const contactList = _.flatten(buckets).filter(e => e !== undefined).filter(e => !_.includes(state.visited, e));
        console.log(`found ${contactList.length} contacts`)
        return Promise.resolve(_.sampleSize(contactList, constants.ELI_THRESHOLD));
      }, (contact) => {
        console.log(`sending request from ${node.username} to ${contact.username}`)
        return sendCommand(Command.createPubKeyReq(node.asContact(), contact, state));
      });
    };
    
    const getNearestContacts = (contactID, limit, nodeID) => {
      var contacts = [];
      var index = magic.getBucketIndex(nodeID, contactID);
      var ascBucketIndex = index;
      var descBucketIndex = index;
    
      function addNearestFromBucket(bucket) {
        getNearestFromBucket(bucket, contactID, limit - contacts.length).forEach(function addToContacts(contact) {
            var isContact = contact.__classId === 'CONTACT';
            var poolNotFull = contacts.length < limit;
            var notRequester = contact.nodeID !== nodeID;
    
            if (isContact && poolNotFull && notRequester) { contacts.push(contact); }
          });
      }
    
      // add contacts from current bucket
      addNearestFromBucket(buckets[index]);
      
      // add contacts while decrementing counter
      while (contacts.length < limit && ascBucketIndex < constants.B) { ascBucketIndex++; addNearestFromBucket(buckets[ascBucketIndex]); }
    
      // add contacts while incrementing counter
      while (contacts.length < limit && descBucketIndex >= 0) { descBucketIndex--; addNearestFromBucket(buckets[descBucketIndex]); }
      
      return contacts;
    };
    
    const getNearestFromBucket = (bucket, key, limit) => {
      if (!bucket) { return []; }
    
      var nearest = bucket.map(function addDistance(contact) {
        return { contact: contact, distance: magic.getDistance(contact.id, key) };
      }).sort(function sortKeysByDistance(a, b) {
        return magic.compareKeys(a.distance, b.distance);
      }).splice(0, limit).map(function pluckContact(c) {
        return c.contact;
      });
    
      return nearest;
    };
    
    const refreshBucketsBeyondClosestP = (shortlist) => {
      var bucketIndexes = Object.keys(buckets);
      var leastBucket = _.min(bucketIndexes);
    
      function bucketFilter(index) { return index > leastBucket; }
    
      var refreshBuckets = bucketIndexes.filter(bucketFilter);
      
      logger.debug('refreshing buckets farthest than closest known');
    
      var p = Promise.resolve();
      
      refreshBuckets.forEach(index => {
        p = p.then(() => {
          return refreshBucketP(index)
        });
      });

      p.then(r => {
        logger.debug('refreshed all buckets');
        return r
      })
      
      return p;
    };
    
    const refreshBucketP = (index) => {
      var random = magic.getRandomInBucketRangeBuffer(index);
      return getNearestNodesP(random.toString('hex')).then(r => {
        return r
      });
    };
    
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