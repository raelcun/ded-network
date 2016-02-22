'use strict';

const net = require('net'),
      Command = require('./command'),
      constants = require('./constants'),
      _ = require('lodash');

module.exports = (node) => {
  return new Promise((resolve, reject) => {
    /**** PRIVATE FIELDS ****/
    const pendingRequests = [];
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
      }
    };
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