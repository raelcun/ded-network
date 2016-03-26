const assert = require('assert'),
			utils = require('./utils'),
			Contact = require('./contact'),
			crypto = require('./crypto'),
			magic = require('./magic'),
			_ = require('lodash')

const Command = { __classId: 'COMMAND' }

Command.createCommand = ({ destContact, sourceContact, strCommand, payload = {}, id = utils.generateMessageId() }) => {
	assert(utils.objIsFactory(destContact, Contact))
	assert(utils.objIsFactory(sourceContact, Contact))

	let { username: sourceUsername, id: sourceId, ip: sourceIP, port: sourcePort, publicKey: sourcePK } = sourceContact
	let { username: destUsername, id: destId, ip: destIP, port: destPort, publicKey: destPK } = destContact
	payload = _.merge({ sourceUsername, sourceId, sourceIP, sourcePort, destId }, payload)

	return {
		id,
		destination: { username: destUsername, id: destId, ip: destIP, port: destPort, publicKey: destPK },
		strCommand,
		payload
	}
}

Command.createMessageReq = ({ sourceContact, destContact, strMessage }) =>
	Command.createCommand({ sourceContact, destContact, strCommand: 'MESSAGE', payload: { message: strMessage }})

Command.createMessageRes = ({ sourceContact, destContact, orgRequestId }) =>
	Command.createCommand({ sourceContact, destContact, strCommand: 'MESSAGE_RESPONSE', id: orgRequestId })

Command.createRetrieveContactsReq = ({ sourceContact, destContact, state }) =>
	Command.createCommand({ sourceContact, destContact, strCommand: 'RETRIEVE_CONTACTS', payload: { state }})

Command.createRetrieveContactsRes = ({ sourceContact, destContact, orgRequestId, state }) =>
	Command.createCommand({ sourceContact, destContact, id: orgRequestId, strCommand: 'RETRIEVE_CONTACTS_RESPONSE', payload: { state }})

Command.createPublicKeyReq = ({ sourceContact, destContact, queryId, requestedContactId }) =>
	Command.createCommand({ sourceContact, destContact, strCommand: 'KEY_REQUEST', payload: { queryId, requestedContactId } })


Command.createPublicKeyRes = ({ sourceContact, destContact, orgRequestId, publicKey }) =>
	Command.createCommand({ sourceContact, destContact, id: orgRequestId, strCommand: 'KEY_REQUEST_RESPONSE', payload: { publicKey } })

Command.encrypt = (command, privateKey, destPublicKey) => {
  const pk = destPublicKey || command.destination.publicKey;
  assert(pk !== undefined, 'cannot encrypt without a public key');
  const oEncrypted = crypto.aesEncrypt(Command.serialize(command.payload));
  const hexKey = magic.bufferToHex(oEncrypted.key);
  const hexIV = magic.bufferToHex(oEncrypted.iv);
  const aesParams = Command.serialize({ key: hexKey, iv:hexIV });
  const encAESParams = crypto.encrypt(pk, aesParams);
  const signature = crypto.sign(privateKey, aesParams);
  return _.extend({}, command, {
    payload: oEncrypted.payload,
    aesParams: encAESParams,
    signature
  });
}

Command.decrypt = (command, privateKey) => {
  const aesParams = Command.deserialize(crypto.decrypt(privateKey, command.aesParams));
  assert(aesParams.key !== undefined, 'aes key is missing for decryption');
  assert(aesParams.iv !== undefined, 'aes iv is missing for decryption');
	const key = new Buffer(aesParams.key, 'hex');
	const iv = new Buffer(aesParams.iv, 'hex');
  const payload = Command.deserialize(crypto.aesDecrypt(command.payload, key, iv));
  return _.extend({}, command, { payload, aesParams });
}

Command.verify = (command, publicKey) => {
  assert(publicKey !== undefined, 'public key needed to verify sender');
  return crypto.verify(publicKey, Command.serialize(command.aesParams), command.signature);
}

Command.serialize = command => JSON.stringify(command)

Command.deserialize = str => JSON.parse(str, (k, v) => v && v.type === 'Buffer' ? new Buffer(v.data) : v)

module.exports = Command
