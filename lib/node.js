require('babel-polyfill')

const assert = require('assert'),
			_ = require('lodash'),
			utils = require('./utils'),
			Contact = require('./contact'),
			Router = require('./router'),
			Logger = require('./logger')

const identifier = 'NODE'
const Node = async ({ username, ip, port, logger: logger = Logger() }) => {
	const newNode = { username, logger, ip, port, id: utils.generateId(username) }
	
	newNode.router = await Router({ sourceContact: Contact.fromNode(newNode), logger })
	
	const connect = async contact => {
		newNode.logger.debug(`${newNode.username} is connecting to ${contact.username}`)
		await newNode.router.updateContact(contact)
		await newNode.router.lookup(newNode.id)
		// TODO: test kicking off refresh buckets without waiting for it to complete
		//await newNode.router.refreshBucketsByondClosest()
		newNode.logger.debug(`${newNode.username} is connected to ${contact.username}`)
	}
	
	newNode.connect = connect
	newNode.close = newNode.router.close
	newNode.asContact = () => Contact.fromNode(newNode)
	
	return newNode
}
Node.__classId = identifier

module.exports = Node