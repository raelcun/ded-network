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

const createMessageReq = (sourceContact, destContact, strMessage) => {
  assert(utils.objIsFactory(sourceContact, Contact), 'expected a Contact object');
  assert(utils.objIsFactory(destContact, Contact), 'expected a Contact object');

  return createCommand(destContact, 'MESSAGE', {
    sourceId: sourceContact.id,
    sourceIP: sourceContact.ip,
    sourcePort: sourceContact.port,
    strMessage // TODO: encrypt & sign string (or command)
  });
};

const createMessageRes = (request, sourceContact) => {
  assert(utils.objIsFactory(sourceContact, Contact), 'expected a Contact object');

  return createCommand(Contact({ ip: request.payload.sourceIP, port: request.payload.sourcePort }), 'MESSAGE_RESPONSE', {
    sourceId: sourceContact.id,
    destinationId: request.payload.sourceId
  }, request.id);
};

const createConnectReq = (sourceContact, destContact) => {
  return createCommand(destContact, 'CONNECT', {
    id: sourceContact.id,
    sourceIP: sourceContact.ip,
    sourcePort: sourceContact.port
  });
};

const createConnectRes = (commandId, destContact, contactList) => {
  return createCommand(destContact, 'CONNECT_RESPONSE', {
    contactList
  });
};

const createFindReq = (sourceContact, destContact, publicKey) => {
  assert(utils.objIsFactory(sourceContact, Contact), 'expected a Contact object');
  assert(utils.objIsFactory(destContact, Contact), 'expected a Contact object');

  return createCommand(destContact, 'FIND', {
    sourceId: sourceContact.id,
    sourceIP: sourceContact.ip,
    sourcePort: sourceContact.port,
    publicKey
  });
};

const createFindRes = (request, sourceContact) => {
  assert(utils.objIsFactory(sourceContact, Contact), 'expected a Contact object');

  return createCommand(Contact({ ip: request.payload.sourceIP, port: request.payload.sourcePort }), 'FIND_RESPONSE', {
    sourceId: sourceContact.id,
    destinationId: request.payload.sourceId,
    publicKey: request.payload.publicKey
  }, request.id);
};

const createRetrieveContactReq = (sourceContact, destContact, state) => {
  assert(utils.objIsFactory(sourceContact, Contact), 'expected a Contact object');
  assert(utils.objIsFactory(destContact, Contact), 'expected a Contact object');
  
  return createCommand(destContact, 'RETRIEVE_CONTACTS', {
    sourceId: sourceContact.id,
    sourceIP: sourceContact.ip,
    sourcePort: sourceContact.port,
    state
  });
};

const createRetrieveContactRes = (request, contact) => {
  assert(utils.objIsFactory(contact, Contact), 'expected a Contact object');
  
  return createCommand(Contact({ ip: request.payload.sourceIP, port: request.payload.sourcePort }), 'RETRIEVE_CONTACTS_RESPONSE', {
    sourceId: contact.id,
    destinationId: request.payload.sourceId,
    state: request.payload.state
  }, request.id);
};

const serialize = (command) => {
  return JSON.stringify(command);
};

const deserialize = (str) => {
  return JSON.parse(str);
};

module.exports = {
  __classId: 'COMMAND',
  createCommand,
  createPingReq,
  createPingRes,
  createMessageReq,
  createMessageRes,
  createConnectReq,
  createConnectRes,
  createFindReq,
  createFindRes,
  createRetrieveContactReq,
  createRetrieveContactRes,
  serialize,
  deserialize
};