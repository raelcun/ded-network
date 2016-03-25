const assert = require('assert'),
			utils = require('./utils'),
			Contact = require('./contact'),
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
	
Command.createPublicKeyReq = ({ sourceContact, destContact, queryId, requestContactId }) =>
	Command.createCommand({ sourceContact, destContact, strCommand: 'KEY_REQUEST', payload: { queryId, requestContactId } })

Command.createPublicKeyRes = ({ sourceContact, destContact, orgRequestId, publicKey }) =>
	Command.createCommand({ sourceContact, destContact, id: orgRequestId, strCommand: 'KEY_REQUEST_RESPONSE', payload: { publicKey } })

Command.serialize = command => JSON.stringify(command)

Command.deserialize = str => JSON.parse(str, (k, v) => v && v.type === 'Buffer' ? new Buffer(v.data) : v)

module.exports = Command