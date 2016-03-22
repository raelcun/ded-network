const assert = require('assert'),
			utils = require('./utils'),
			Contact = require('./contact'),
			_ = require('lodash')

const Command = { __classId: 'COMMAND' }

Command.createCommand = ({ destContact, sourceContact, strCommand, payload = {}, id = utils.generateMessageId() }) => {
	assert(utils.objIsFactory(destContact, Contact))
	assert(utils.objIsFactory(sourceContact, Contact))
	
	let { id: sourceId, ip: sourceIP, port: sourcePort, publicKey: sourcePK } = sourceContact
	let { username: destUsername, id: destId, ip: destIP, port: destPort, publicKey: destPK } = destContact
	payload = _.merge({ sourceId, sourceIP, sourcePort, destId }, payload)
	
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
	
Command.serialize = command => JSON.stringify(command)

Command.deserialize = str => JSON.parse(str)

module.exports = Command