'use strict';

const net = require('net'),
      Command = require('./command'),
      constants = require('./constants'),
      magic = require('./magic'),
      assert = require('assert'),
      Contact = require('./contact'),
      _ = require('lodash');

module.exports = node => {
  return new Promise((resolve, reject) => {
    /**** PRIVATE FIELDS ****/
    const pendingRequests = [];
    const buckets = [];
    const logger = node.logger;
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
          const data = Command.serialize(command);
          socket.write(data, () => {
            logger.debug(`destroyed socket connecting to ${command.destination.ip}:${command.destination.port}`);
            socket.destroy();
          });
          logger.info(`sent ${data} from ${node.ip}:${node.port} to ${command.destination.ip}:${command.destination.port}`);
          
          // wait for responses to some requests
          if (_.includes(['PING', 'MESSAGE', 'FIND'], command.command)) {
            pendingRequests.push({ command, resolve, reject });
            setTimeout(() => rejectRequest(command.id), constants.RESPONSE_TIMEOUT);
          }
        });
      });
      
      return p;
    };
    
    const handleCommand = (data) => {
      const command = Command.deserialize(data);
      
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
          // sendCommand(Command.createFindRes(command.id, node, command.payload.sourceId, command.payload.sourceIP, command.payload.sourcePort, node.publicKey));
          const res = Command.createFindRes(command, node.asContact());
          //console.log(res);
          sendCommand(res);
          break;
        case 'FIND_RESPONSE':
          resolveRequest(command.id, command.payload.publicKey);
          break;
      }
    };
    
    const updateContact = (contact) => {
      const bucketIndex = magic.getBucketIndex(node.id, contact.id);

      logger.debug('updating contact %j', contact.id);
      assert(bucketIndex < constants.B);
    
      // Eli - create new bucket
      if (!buckets[bucketIndex]) buckets[bucketIndex] = []; // Dan - create new bucket
    
      const bucket = buckets[bucketIndex];
      
      contact.lastSeen = Date.now();
      
      if (_.includes(bucket, contact)) {
        moveContact(bucket, bucket.indexOf(contact), bucket.length - 1);
      } else if (bucket.length < constants.K) {
        bucket.push(contact);
        moveContact(bucket, bucket.indexOf(contact), 0);
      } else {
        node.ping(bucket[0]).then(null, result => {
          bucket.splice(0);
          bucket.push(contact);
          moveContact(bucket, bucket.indexOf(contact), 0);
        });
      }
    
      return contact;
    };
    
    const moveContact = (array, oldIndex, newIndex) => {
      if (newIndex >= array.length) {
        var k = newIndex - array.length;
        while ((k--) + 1) array.push(undefined);
      }
      array.splice(newIndex, 0, array.splice(oldIndex, 1)[0]);
    }
    
    const getNearestNodes = (contact) => {
      var state = {
        limit: null,
        contacted: [],
        contactlist: [],
        key: contact.id
      };
    }
    
    const getNearestContacts = () => {
      
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
      
      socket.on('data', data => {
        logger.info(`${node.id}((${node.ip}:${node.port}) received ${data}`);
        handleCommand(data);
      });
      
      socket.on('close', () => {
        logger.debug(`${node.id}(${node.ip}:${node.port}) closed connection with ${addr}:${port}`);
      });
    });
  
    // reject promise if listening server fails to start
    server.on('error', err => {
      reject(err);
    });
  
    // resolve only after listening server has started
    server.on('listening', () => {
      resolve({
        close: (cb) => {
          server.close(() => {
            logger.debug(`stopped listening on ${node.ip}:${node.port}`);
            if (_.isFunction(cb)) cb();
          });
        },
        sendCommand,
        updateContact,
        getNearestNodes,
        _buckets: buckets
      });
    });
    
    // attempt to start listening server
    logger.debug(`attempting to listen on ${node.ip}:${node.port}`);
    server.listen(node.port, node.ip);
    /**** END CONSTRUCTOR ****/
  });
};