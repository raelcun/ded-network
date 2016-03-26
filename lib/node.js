require('babel-polyfill')

const assert = require('assert'),
			_ = require('lodash'),
			utils = require('./utils'),
			Contact = require('./contact'),
			Router = require('./router'),
			Logger = require('./logger'),
			crypto = require('./crypto'),
			pkStore = require('./pkStore')

const identifier = 'NODE'
const Node = async ({ username, ip, port, publicKey, privateKey, logger: logger = Logger() }) => {
	const keyPair = crypto.generateKeyPair()
	const newNode = _.merge({}, { publicKey: keyPair.public, privateKey: keyPair.private }, {
		username,
		logger,
		ip,
		port,
		publicKey,
		privateKey,
		id: utils.generateId(username)
	})

	newNode.router = await Router({ sourceContact: Contact.fromNode(newNode), privateKey: newNode.privateKey, logger })

	const connect = async contact => {
		newNode.logger.debug(`${newNode.username} is connecting to ${contact.username}`)
		await newNode.router.updateContact(contact)
		await newNode.router.lookup(newNode.id)
		// TODO: test kicking off refresh buckets without waiting for it to complete
		//await newNode.router.refreshBucketsByondClosest()
		newNode.logger.debug(`${newNode.username} is connected to ${contact.username}`)
	}

	pkStore[newNode.id] = { publicKey: newNode.publicKey, privateKey: newNode.privateKey }

	newNode.connect = connect
	newNode.close = newNode.router.close
	newNode.asContact = () => Contact.fromNode(newNode)

	return newNode
}
Node.__classId = identifier

module.exports = Node
