require('babel-polyfill')

const assert = require('assert'),
			_ = require('lodash'),
			Node = require('./node'),
			Contact = require('./contact'),
			Logger = require('./logger'),
			cp = require('child_process')

const debug = false
const logger = Logger({
	minLevel: debug ? 0 : 3,
	maxLevel: debug ? 1 : 4
})

const child = {
	node: {}
}

const handleMessage = async message => {
	if (message.command === 'create'){
		child.node = await Node({ username: message.node.username, ip: message.node.ip, port: message.node.port, logger })
		process.send({node: child.node, message})
	}else if (message.command === 'connect'){
		console.log('Connecting')
		await child.node.connect(message.contact)
		console.log('Connected')
		process.send({ node: child.node, message })
	}
}

process.on('message', (m) => {
	handleMessage(m)
});

process.on('disconnect', (m) => {
	child.node.close()
})

