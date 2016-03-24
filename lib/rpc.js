const Logger = require('./logger'),
			Command = require('./command'),
			net = require('net'),
			Promise = require('bluebird'),
			_ = require('lodash'),
			prettyjson = require('prettyjson')

const messageDelimiter = '~'

const RPC = ({ contact, handleCommand, logger = Logger() }) => {

	const pendingRequests = []
	
	const completeRequest = (id, f) => {
	  const i = _.findIndex(pendingRequests, e => e.command.id === id)
	  if (i !== -1) {
	    f(pendingRequests[i])
	    pendingRequests.splice(i, 1)
	  }
	}
	const rejectRequest = id => completeRequest(id, request => request.reject(new Error('request rejected')))
	const resolveRequest = (id, result) => completeRequest(id, request => request.resolve(result))

	const serverSocket = net.createServer(socket => {
		const { remoteAddress: addr, remotePort: port } = socket
		logger.debug(`${contact.username} connected from ${addr}:${port}`)
		
		let data = ''
		socket.on('data', chunk => {
			data += chunk
			
			let dIndex = data.indexOf(messageDelimiter)
			while (dIndex > -1) {
				const command = Command.deserialize(data.substring(0, dIndex))
				logger.debug(`${contact.username} received ${command.strCommand} command from ${command.payload.sourceUsername}`)
				if (_.includes(['MESSAGE_RESPONSE', 'RETRIEVE_CONTACTS_RESPONSE'], command.strCommand)) {
					resolveRequest(command.id, command)
				}
				handleCommand(command)
				data = data.substring(dIndex + 1)
				dIndex = data.indexOf(messageDelimiter)
			}
		})
	})

	const sendCommand = (command) => {
		return new Promise((resolve, reject) => {
			logger.debug(`${contact.username} attempting to contact to ${command.destination.username}`)
			const socket = net.createConnection(command.destination.port, command.destination.ip)
			
			socket.on('error', err => {
				logger.error(`${contact.username} encountered an error sending a command`, err)
				socket.destroy()
			})
			
			socket.on('connect', () => {
				socket.write(Command.serialize(command) + messageDelimiter, () => {
					logger.info(`${contact.username} successfully sent\n${prettyjson.render(command, { noColor: true })}`)
					socket.destroy()
				})
				
				if (_.includes(['MESSAGE', 'RETRIEVE_CONTACTS'], command.strCommand)) {
					pendingRequests.push({ command, resolve, reject })
				}
			})
		})
	}

	const closeSocket = () => new Promise((resolve, reject) => {
		serverSocket.close(err => {
			if (err) { return reject(err) }
			resolve()
		})
	})
	
	serverSocket.on('error', err => {
		logger.error(`${contact.username} encountered an error`, err)
	})
	
	serverSocket.on('close', () => {
		logger.info(`${contact.username} stopped listening`)
	})
	
	return new Promise((resolve, reject) => {
		serverSocket.on('listening', () => {
			logger.debug(`${contact.username} is now listening`)
			resolve({
				close: closeSocket,
				setHandler: handler => handleCommand = handler,
				sendCommand
			})
		})
		serverSocket.listen({ port: contact.port, host: contact.ip })
	})
}

module.exports = RPC