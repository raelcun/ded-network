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
    const sendCommand = command => {
      const p = new Promise((resolve, reject) => {
        logger.info(`attempting to connect to ${command.ip}:${command.port}`);
        const socket = net.createConnection(command.port, command.ip);
    
        socket.on('error', err => {
          logger.error(`error connecting: ${err}`);
          reject(err);
        });
        
        socket.on('connect', () => {
          const data = Command.serialize(command);
          socket.write(data);
          logger.info(`sent ${data} from ${node.ip}:${node.port} to ${command.ip}:${command.port}`);
          
          // wait for responses to some requests
          if (_.includes(['PING', 'MESSAGE', 'FIND'], command.command)) {
            pendingRequests.push({ command, resolve, reject });
            setTimeout(() => {
              const i = _.findIndex(pendingRequests, e => e.command.id === command.id);
              if (i !== -1) {
                pendingRequests[i].reject(new Error('timeout'));
                pendingRequests.splice(i, 1);
              }
            }, constants.RESPONSE_TIMEOUT);
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
          sendCommand(Command.createPingRes(command.id, node, command.payload.sourceId, command.payload.sourceIP, command.payload.sourcePort));
          // send back ping response
          break;
        case 'PING_RESPONSE':
          const i = _.findIndex(pendingRequests, e => e.command.id === command.id);
          if (i !== -1) {
            pendingRequests[i].resolve(true);
            pendingRequests.splice(i, 1);
          }
          break;
        case 'MESSAGE':
          // TODO decrypt and verify
          logger.info(`received ${command.payload.messageString}`);
          sendCommand(Command.createMessageRes(command.id, node, command.payload.sourceId, command.payload.sourceIP, command.payload.sourcePort));
          break;
        case 'MESSAGE_RESPONSE':
          const messageRes = _.findIndex(pendingRequests, e => e.command.id === command.id);
          if (messageRes !== -1) {
            pendingRequests[messageRes].resolve(true);
            pendingRequests.splice(messageRes, 1);
          }
          break;
        case 'FIND':
          // TODO: save pubkey
          logger.info(`found ${command.payload.publicKey}`);
          // sendCommand(Command.createFindRes(command.id, node, command.payload.sourceId, command.payload.sourceIP, command.payload.sourcePort, node.publicKey));
          sendCommand(Command.createFindRes(command.id, node, command.payload.sourceId, command.payload.sourceIP, command.payload.sourcePort, node.publicKey));
          break;
        case 'FIND_RESPONSE':
          const findRes = _.findIndex(pendingRequests, e => e.command.id === command.id);
          if (findRes !== -1) {
            pendingRequests[findRes].resolve(command.payload.publicKey);
            pendingRequests.splice(findRes, 1);
          }
          break;
      }
    };
    
    const updateContact = (node, newNode) => {
      var bucketIndex = magic.getBucketIndex(node.id, newNode.id);
      var contact = Contact(newNode.id, newNode.ip, newNode.port);

      logger.debug('updating contact %j', newNode.id);
      assert(bucketIndex < constants.B);
    
      if (!buckets[bucketIndex]) {
        logger.debug('creating new bucket for contact at index %d', bucketIndex);
        buckets[bucketIndex] = [];
      }
    
      var bucket = buckets[bucketIndex];
      
      newNode.lastSeen = Date.now();
      
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
        while ((k--) + 1) {
          array.push(undefined);
        }
      }
      array.splice(newIndex, 0, array.splice(oldIndex, 1)[0]);
    }
    /**** END METHODS ****/
    
    /**** CONSTRUCTOR ****/
    // create listening server
    const socket = net.createServer(socket => {
      const addr = socket.remoteAddress;
      const port = socket.remotePort;
      
      logger.info(`${node.id}((${node.ip}:${node.port}) connection from ${addr}:${port}`);
      
      socket.on('data', data => {
        logger.info(`${node.id}((${node.ip}:${node.port}) received ${data}`);
        handleCommand(data);
      });
      
      socket.on('close', () => {
        logger.info(`${node.id}(${node.ip}:${node.port}) closed connection with ${addr}:${port}`);
      });
    });
  
    // reject promise if listening server fails to start
    socket.on('error', err => {
      reject(err);
    });
  
    // resolve only after listening server has started
    socket.on('listening', () => {
      resolve({
        sendCommand,
        updateContact
      });
    });
    
    // attempt to start listening server
    logger.info(`attempting to listen on ${node.ip}:${node.port}`);
    socket.listen(node.port, node.ip);
    /**** END CONSTRUCTOR ****/
  });
};