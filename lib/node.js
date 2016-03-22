const assert = require('assert'),
			_ = require('lodash'),
			utils = require('./utils'),
			Contact = require('./contact')

const identifier = 'NODE'
const Node = ({ username, logger, id = utils.generateId(username) }) => {
	const newNode = { username, id, logger }
	
	newNode.connect = connect
	newNode.asContact = () => Contact.fromNode(newNode)
	
	return newNode
}
Node.__classId = identifier

module.exports = Node