'use strict';

const utils = require('./utils'),
      assert = require('assert'),
      Contact = require('./contact'),
      Command = require('./command');

const createCommand = (destContact, command, payload, id) => {
  assert(utils.objIsFactory(destContact, Contact), 'expected a Contact object');

  return {
    id: utils.default(id, utils.generateId()),
    destination: {
      ip: destContact.ip,
      port: destContact.port
    },
    command,
    payload
  };
};

const createPingReq = (sourceContact, destContact) => {
  assert(utils.objIsFactory(sourceContact, Contact), 'expected a Contact object');
  assert(utils.objIsFactory(destContact, Contact), 'expected a Contact object');

  return createCommand(destContact, 'PING', {
    sourceId: sourceContact.id,
    sourceIP: sourceContact.ip,
    sourcePort: sourceContact.port,
    destinationId: destContact.id // TODO: remove, only for testing
  });
};

const createPingRes = (request, sourceContact) => {
  assert(utils.objIsFactory(sourceContact, Contact), 'expected a Contact object');

  return createCommand(Contact({ ip: request.payload.sourceIP, port: request.payload.sourcePort }), 'PING_RESPONSE', {
    sourceId: sourceContact.id,
    destinationId: request.payload.sourceId,
  }, request.id);
};


// const createPingRes = (messageId, sourceNode, destinationId, destinationIP, destinationPort) => {
//   return createCommand(Contact({ id: destinationId, ip: destinationIP, port: destinationPort }), 'PING_RESPONSE', {
//     sourceId: sourceNode.id, destinationId: destinationId}, messageId);
// };

const createMessageReq = (sourceNode, destNode, strMessage) => {
  return createCommand(destNode, 'MESSAGE', {
    sourceId: sourceNode.id,
    sourceIP: sourceNode.ip,
    sourcePort: sourceNode.port,
    strMessage // TODO: encrypt & sign string (or command)
  });
};

const createMessageRes = (messageId, sourceNode, destinationId, destinationIP, destinationPort) => {
  return createCommand(Contact({ id: destinationId, ip: destinationIP, port: destinationPort }), 'MESSAGE_RESPONSE', {sourceId: sourceNode.id, destinationId: destinationId}, messageId);
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
  });
};

const createFindReq = (sourceNode, destNode, publicKey) => {
  return createCommand(destNode, 'FIND', {
    sourceId: sourceNode.id,
    sourceIP: sourceNode.ip,
    sourcePort: sourceNode.port,
    publicKey
  });
};

const createFindRes = (messageId, sourceNode, destinationId, destinationIP, destinationPort, publicKey) => {
  return createCommand(Contact({ id: destinationId, ip: destinationIP, port: destinationPort }), 'FIND_RESPONSE', {sourceId: sourceNode.id, destinationId: destinationId, publicKey}, messageId);
};

const serialize = (command) => {
  return new Buffer(JSON.stringify(command), 'utf8');
};

const deserialize = (str) => {
  return JSON.parse(str.toString('utf8'), (key, value) => { return value && value.type === 'Buffer' ? new Buffer(value.data) : value; });
};

module.exports = {
  __classId: 'COMMAND',
  createPingReq,
  createPingRes,
  createMessageReq,
  createMessageRes,
  createConnectReq,
  createConnectRes,
  createFindReq,
  createFindRes,
  serialize,
  deserialize
};