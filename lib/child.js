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

const handleMessage = message => {
	console.log('Child handleling message')
	if (message.command === 'create'){
		console.log('Child executing create command')
		p = new Promise((Resolve, Reject))
		child.node = _.cloneDeep(message.node)
		process.send({node: child.node})
	}else if (message.command === 'connect'){
		console.log('Child executing connect command')
		await child.node.connect(message.contact)
		process.send({contact: child.node.contact})
	}
}

process.on('message', (m) => {
	console.log('Child got message', m.command)
	handleMessage(m)
});

