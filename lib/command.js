'use strict';

const utils = require('./utils'),
      assert = require('assert'),
      _ = require('lodash'),
      Contact = require('./contact'),
      crypto = require('./crypto'),
      magic = require('./magic'),
      pkStore = require('./pkStore');

const createCommand = (destContact, sourceContact, command, payload, id) => {
  assert(utils.objIsFactory(destContact, Contact), 'expected a Contact object');
  assert(utils.objIsFactory(sourceContact, Contact), 'expected a Contact object');

  payload = _.extend({}, payload, {
    sourceId: sourceContact.id,
    sourceIP: sourceContact.ip,
    sourcePort: sourceContact.port
  });

  return {
    id: utils.default(id, utils.generateMessageId()),
    destination: {
      id: destContact.id,
      ip: destContact.ip,
      port: destContact.port,
      publicKey: destContact.publicKey
    },
    command,
    payload
  };
};

const createPingReq = (sourceContact, destContact) => {
  assert(utils.objIsFactory(sourceContact, Contact), 'expected a Contact object');
  assert(utils.objIsFactory(destContact, Contact), 'expected a Contact object');

  return createCommand(destContact, sourceContact, 'PING', {
    sourceId: sourceContact.id,
    sourceIP: sourceContact.ip,
    sourcePort: sourceContact.port,
    destinationId: destContact.id // TODO: remove, only for testing
  });
};

const createPingRes = (request, sourceContact, destPublicKey) => {
  assert(utils.objIsFactory(sourceContact, Contact), 'expected a Contact object');

  return createCommand(Contact({ ip: request.payload.sourceIP, port: request.payload.sourcePort, publicKey: destPublicKey }), sourceContact, 'PING_RESPONSE', {
    sourceId: sourceContact.id,
    destinationId: request.payload.sourceId,
  }, request.id);
};

const createMessageReq = (sourceContact, destContact, strMessage) => {
  assert(utils.objIsFactory(sourceContact, Contact), 'expected a Contact object');
  assert(utils.objIsFactory(destContact, Contact), 'expected a Contact object');

  return createCommand(destContact, sourceContact, 'MESSAGE', {
    sourceId: sourceContact.id,
    sourceIP: sourceContact.ip,
    sourcePort: sourceContact.port,
    strMessage
  });
};

const createMessageRes = (request, sourceContact, destPublicKey) => {
  assert(utils.objIsFactory(sourceContact, Contact), 'expected a Contact object');

  return createCommand(Contact({ ip: request.payload.sourceIP, port: request.payload.sourcePort, publicKey: destPublicKey }), sourceContact, 'MESSAGE_RESPONSE', {
    sourceId: sourceContact.id,
    destinationId: request.payload.sourceId
  }, request.id);
};

const createRetrieveContactReq = (sourceContact, destContact, state) => {
  assert(utils.objIsFactory(sourceContact, Contact), 'expected a Contact object');
  assert(utils.objIsFactory(destContact, Contact), 'expected a Contact object');

  return createCommand(destContact, sourceContact, 'RETRIEVE_CONTACTS', {
    sourceId: sourceContact.id,
    sourceIP: sourceContact.ip,
    sourcePort: sourceContact.port,
    state
  });
};

const createPubKeyReq = (sourceContact, destContact, state) => {
  assert(utils.objIsFactory(sourceContact, Contact), 'expected a Contact object');
  assert(utils.objIsFactory(destContact, Contact), 'expected a Contact object');
  
  return createCommand(destContact, sourceContact, 'KEY_REQUEST', {
    state
  });
};

const createPubKeyRes = (request, sourceContact, requestedKey) => {
  assert(utils.objIsFactory(sourceContact, Contact), 'expected a Contact object');

  return createCommand(
    Contact({ ip: request.payload.sourceIP, port: request.payload.sourcePort, publicKey: pkStore[request.payload.sourceId].publicKey }),
    sourceContact,
    'KEY_RESPONSE',
    {
      requestedKey
    }, request.id
  );
};

const createRetrieveContactRes = (request, contact, destPublicKey) => {
  assert(utils.objIsFactory(contact, Contact), 'expected a Contact object');

  if ((destPublicKey === pkStore[request.payload.sourceId].publicKey) === false) {
    console.log('False')
  }

  return createCommand(Contact({ ip: request.payload.sourceIP, port: request.payload.sourcePort, publicKey: destPublicKey }), contact, 'RETRIEVE_CONTACTS_RESPONSE', {
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

const encryptAndSign = (command, publicKey, senderPrivateKey) => {
  const pk = command.destination.publicKey || publicKey;
  assert(pk !== undefined, 'cannot encrypt without a public key');
  const oEncrypted = crypto.aesEncrypt(JSON.stringify(command.payload));
  const hexKey = magic.bufferToHex(oEncrypted.key);
  const hexIV = magic.bufferToHex(oEncrypted.iv);
  const aesParams = JSON.stringify({ key: hexKey, iv:hexIV });
  const encAESParams = crypto.encrypt(pk, aesParams);
  const signature = crypto.sign(senderPrivateKey, aesParams);
  return _.extend({}, command, {
    payload: oEncrypted.payload,
    aesParams: encAESParams,
    signature
  });
};

const decrypt = (command, privateKey) => {
  const aesParams = JSON.parse(crypto.decrypt(privateKey, command.aesParams));
  assert(aesParams.key !== undefined, 'aes key is missing for decryption');
  assert(aesParams.iv !== undefined, 'aes iv is missing for decryption');
  const key = magic.hexToBuffer(aesParams.key, aesParams.key.length / 2);
  const iv = magic.hexToBuffer(aesParams.iv, aesParams.iv.length / 2);
  const payload = JSON.parse(crypto.aesDecrypt(command.payload, key, iv));
  return _.extend({}, command, { payload, aesParams });
};

const verify = (command, publicKey) => {
  assert(publicKey !== undefined, 'public key needed to verify sender');
  return crypto.verify(publicKey, JSON.stringify(command.aesParams), command.signature);
}

module.exports = {
  __classId: 'COMMAND',
  createCommand,
  createPingReq,
  createPingRes,
  createMessageReq,
  createMessageRes,
  createPubKeyReq,
  createPubKeyRes,
  createRetrieveContactReq,
  createRetrieveContactRes,
  serialize,
  deserialize,
  encryptAndSign,
  decrypt,
  verify
};
