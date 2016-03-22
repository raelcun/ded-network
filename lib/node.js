require('babel-polyfill')

const assert = require('assert'),
			_ = require('lodash'),
			utils = require('./utils'),
			Contact = require('./contact')

const identifier = 'NODE'
const Node = async ({ username, logger }) => {
	const newNode = { username, logger, id: utils.generateId(username) }
	
	newNode.router = await Router(newNode)
	
	const connect = async contact => {
		assert(contact.id !== newNode.id)
		
		newNode.logger.debug(`${newNode.username} is connecting to ${contact.username}`)
		await newNode.router.updateContact(contact)
		await newNode.router.getNearestNodes(newNode.id)
		//await newNode.router.refreshBucketsByondClosest()
		newNode.logger.debug(`${newNode.username} is connected to ${contact.username}`)
	}
	
	newNode.connect = connect
	newNode.asContact = () => Contact.fromNode(newNode)
	
	return newNode
}
Node.__classId = identifier

module.exports = Node