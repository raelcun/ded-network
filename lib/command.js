'use strict';

const utils = require('./utils'),
      Contact = require('./contact');

const createCommand = (destContact, command, payload, id) => {
  return {
    id: id === undefined ? hat.rack()() : id,
    ip: destContact.ip,
    port: destContact.port,
    command,
    payload
  };
};

const createPingReq = (sourceContact, destContact) => {
  return createCommand(destContact, 'PING', {
    sourceId: sourceContact.id,
    sourceIP: sourceContact.ip,
    sourcePort: sourceContact.port,
    destinationId: destContact.id // TODO: remove, only for testing
  });
};

const createPingRes = (messageId, sourceNode, destinationId, destinationIP, destinationPort) => {
  return createCommand(Contact({ id: destinationId, ip: destinationIP, port: destinationPort }), 'PING_RESPONSE', { sourceId: sourceNode.id, destinationId: destinationId}, messageId);
};

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
  })
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
  // createMessage,
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