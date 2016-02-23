'use strict';

const net = require('net'),
      Command = require('./command'),
      constants = require('./constants'),
      magic = require('./magic'),
      assert = require('assert'),
      Node = require('./node'),
      _ = require('lodash');

module.exports = (node) => {
  return new Promise((resolve, reject) => {
    /**** PRIVATE FIELDS ****/
    const pendingRequests = [];
    const buckets = [];
    /**** END PRIVATE FIELDS ****/
    
    /**** METHODS ****/
    const sendCommand = (command) => {
      const p = new Promise((resolve, reject) => {
        console.log(`attempting to connect to ${command.ip}:${command.port}`);
        const socket = net.createConnection(command.port, command.ip);
    
        socket.on('error', err => {
          console.log(`error connecting: ${err}`);
          reject(err);
        });
        
        socket.on('connect', () => {
          const data = Command.serialize(command);
          socket.write(data);
          console.log(`sent ${data} from ${node.ip}:${node.port} to ${command.ip}:${command.port}`);
          
          // wait for responses to some requests
          if (_.includes(['PING', 'MESSAGE'], command.command)) {
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
          
          break;
      }
    };
    
    const updateContact = (node, newNode) => {
      var bucketIndex = magic.getBucketIndex(node.id, newNode.id);
      var contact = Node(newNode.id, newNode.ip, newNode.port, false);

      console.log('updating contact %j', newNode.id);
      assert(bucketIndex < constants.B);
    
      if (!buckets[bucketIndex]) {
        console.log('creating new bucket for contact at index %d', bucketIndex);
        buckets[bucketIndex] = [];
      }
    
      var bucket = buckets[bucketIndex];
      
      newNode.lastSeen = Date.now();
    
      if (_.includes(bucket, newNode.id)) {
        moveContact(bucket, bucket.indexOf(contact), bucket.length - 1);
      } else if (bucket.getSize() < constants.K) {
        bucket.push(contact);
        moveContact(bucket, bucket.indexOf(contact), 0);
      } else {
        
      }
    
      return contact;
    }
    
    const moveContact = (array, oldIndex, newIndex) => {
      if (new_index >= array.length) {
        var k = new_index - array.length;
        while ((k--) + 1) {
          array.push(undefined);
        }
      }
      array.splice(new_index, 0, array.splice(old_index, 1)[0]);
    }
    /**** END METHODS ****/
    
    /**** CONSTRUCTOR ****/
    // create listening server
    const socket = net.createServer(socket => {
      const addr = socket.remoteAddress;
      const port = socket.remotePort;
      
      console.log(`${node.id}((${node.ip}:${node.port}) connection from ${addr}:${port}`);
      
      socket.on('data', data => {
        console.log(`${node.id}((${node.ip}:${node.port}) received ${data}`);
        handleCommand(data);
      });
      
      socket.on('close', () => {
        console.log(`${node.id}(${node.ip}:${node.port}) closed connection with ${addr}:${port}`);
      });
    });
  
    // reject promise if listening server fails to start
    socket.on('error', err => {
      reject(err);
    });
  
    // resolve only after listening server has started
    socket.on('listening', () => {
      resolve({
        sendCommand
      });
    });
    
    // attempt to start listening server
    console.log(`attempting to listen on ${node.ip}:${node.port}`);
    socket.listen(node.port, node.ip);
    /**** END CONSTRUCTOR ****/
  });
};