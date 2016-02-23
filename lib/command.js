'use strict';

const hat = require('hat');

const createCommand = (destNode, command, payload, id) => {
  return {
    id: id === undefined ? hat.rack()() : id,
    ip: destNode.ip,
    port: destNode.port,
    command,
    payload
  };
};

// const createMessage = (node, message) => {
//   return createCommand(node.ip, node.port, 'MESSAGE', {
//     destinationId: node.id,
//     message: message
//   });
// };

const createPingReq = (sourceNode, destNode) => {
  return createCommand(destNode, 'PING', {
    sourceId: sourceNode.id,
    sourceIP: sourceNode.ip,
    sourcePort: sourceNode.port,
    destinationId: destNode.id // TODO: remove, only for testing
  });
};

const createPingRes = (messageId, sourceNode, destinationId, destinationIP, destinationPort) => {
  const Node = require('./node'); // leave this here rather than at the top or you'll get a circular dependency
  return createCommand(Node(destinationId, destinationIP, destinationPort, false), 'PING_RESPONSE', { sourceId: sourceNode.id, destinationId: destinationId}, messageId);
};

const createMessage = (sourceNode, destNode, messageString) => {
  return createCommand(destNode, 'MESSAGE', {
    sourceId: sourceNode.id,
    sourceIP: sourceNode.ip,
    sourcePort: sourceNode.port,
    messageString: messageString // TODO: encrypt & sign string (or command)
  });
};

const createConnectReq = (sourceNode, destNode) => {
  return createCommand(destNode, 'CONNECT', {
    id: sourceNode.id,
    sourceIP: sourceNode.ip,
    sourcePort: sourceNode.port
  });
};

const createConnectRes = (commandId, destNode, contactList) => {
  return createCommand(destNode, 'CONNECT_RESPONSE', {
    contactList
  })
};

const serialize = (command) => {
  return new Buffer(JSON.stringify(command), 'utf8');
};

const deserialize = (str) => {
  return JSON.parse(str.toString('utf8'), (key, value) => { return value && value.type === 'Buffer' ? new Buffer(value.data) : value; });
};

module.exports = {
  // createMessage,
  createPingReq,
  createPingRes,
  createConnectReq,
  createConnectRes,
  serialize,
  deserialize
};