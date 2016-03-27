const expect = require('chai').expect,
			Contact = require('../lib/contact'),
			Command = require('../lib/command'),
			Logger = require('../lib/logger'),
			Router = require('../lib/router'),
			Node = require('../lib/node'),
			utils = require('../lib/utils'),
			magic = require('../lib/magic'),
			crypto = require('../lib/crypto'),
			_ = require('lodash'),
			cp = require('child_process')

const debug = false
const logger = Logger({
	minLevel: debug ? 0 : 3,
	maxLevel: debug ? 1 : 4
})

const numNodes = 20
const internals = {}
internals.nodes = []

describe('Node', () => {

	before(async done => {
		internals.nodes = await Promise.all(_.range(numNodes).map(e => Node({ username: e.toString(), ip: '0.0.0.0', port: 4000 + e, logger })))
		if (debug) { internals.nodes.forEach(e => console.log(e.username, e.id)) }
		done()
	})

	after(async done => {
		await Promise.all(internals.nodes.map(e => e.close()))
		done()
	})

	it('connect', async done => {
		const baseNode = internals.nodes[0]
		const additionalNodes = _.take(_.drop(internals.nodes, 1), 19)
		if (additionalNodes.length < 19) {
			return done(new Error('not enough nodes to test'))
		}

		for (let i = 0; i < 19; i++) {
			await additionalNodes[i].connect(baseNode.asContact())
		}

		const expectedResults = {
			'0': {
				'154': [ '19', '10' ],
				'155': [ '13' ],
				'156': [ '5' ],
				'157': [ '18', '7' ],
				'158': [ '15', '8', '2', '6', '14' ],
				'159': [ '17', '12', '9', '3', '1', '4', '11', '16' ]
			},
			'1': {
				'157': [ '17', '11', '4', '9', '16' ],
				'158': [ '12', '3' ],
				'159': [ '5', '19', '0', '8', '6', '2', '13', '18', '7', '10', '14', '15' ]
			},
			'2': {
				'156': [ '6' ],
				'157': [ '15', '8', '14' ],
				'158': [ '19', '13', '7', '0', '5', '10', '18' ],
				'159': [ '17', '12', '9', '3', '1', '4', '11', '16' ]
			},
			'3': {
				'155': [ '12' ],
				'158': [ '17', '11', '4', '1', '9', '16' ],
				'159': [ '5', '19', '0', '8', '6', '2', '13', '18', '7', '10', '14', '15' ]
			},

			'4': {
				'155': [ '16', '11' ],
				'156': [ '17', '9' ],
				'157': [ '1' ],
				'158': [ '12', '3' ],
				'159': [ '5', '19', '0', '8', '6', '2', '13', '18', '7', '10', '14', '15' ]
			},
			'5': {
				'156': [ '19', '10', '0', '13' ],
				'157': [ '18', '7' ],
				'158': [ '15', '8', '2', '6', '14' ],
				'159': [ '17', '12', '9', '4', '1', '3', '11', '16' ]
			},
			'6': {
				'156': [ '2' ],
				'157': [ '15', '8', '14' ],
				'158': [ '19', '13', '7', '0', '5', '10', '18' ],
				'159': [ '17', '12', '9', '4', '3', '1', '11', '16' ]
			},
			'7': {
				'155': [ '18' ],
				'157': [ '19', '10', '0', '5', '13' ],
				'158': [ '15', '8', '2', '6', '14' ],
				'159': [ '17', '12', '9', '1', '4', '3', '11', '16' ]
			},
			'8': {
				'154': [ '14' ],
				'155': [ '15' ],
				'157': [ '6', '2' ],
				'158': [ '19', '13', '7', '0', '5', '10', '18' ],
				'159': [ '17', '12', '9', '1', '3', '4', '11', '16' ]
			},
			'9': {
				'155': [ '17' ],
				'156': [ '16', '4', '11' ],
				'157': [ '1' ],
				'158': [ '12', '3' ],
				'159': [ '5', '19', '0', '8', '6', '7', '13', '18', '2', '10', '14', '15' ]
			},
			'10': {
				'153': [ '19' ],
				'154': [ '0' ],
				'155': [ '13' ],
				'156': [ '5' ],
				'157': [ '18', '7' ],
				'158': [ '15', '6', '8', '2', '14' ],
				'159': [ '17', '12', '3', '4', '1', '9', '11', '16' ]
			},
			'11': {
				'153': [ '16' ],
				'155': [ '4' ],
				'156': [ '17', '9' ],
				'157': [ '1' ],
				'158': [ '12', '3' ],
				'159': [ '10', '19', '0', '6', '5', '7', '13', '18', '2', '8', '14', '15' ]
			},
			'12': {
				'155': [ '3' ],
				'158': [ '17', '9', '4', '1', '11', '16' ],
				'159': [ '2', '19', '0', '5', '6', '8', '13', '18', '10', '7', '14', '15' ]
			},
			'13': {
				'155': [ '19', '0', '10' ],
				'156': [ '5' ],
				'157': [ '18', '7' ],
				'158': [ '15', '6', '8', '2', '14' ],
				'159': [ '17', '3', '9', '4', '1', '11', '12', '16' ]
			},
			'14': {
				'154': [ '8' ],
				'155': [ '15' ],
				'157': [ '6', '2' ],
				'158': [ '19', '7', '10', '0', '13', '5', '18' ],
				'159': [ '17', '9', '4', '3', '12', '1', '11', '16' ]
			},
			'15': {
				'155': [ '8', '14' ],
				'157': [ '6', '2' ],
				'158': [ '19', '7', '13', '0', '10', '5', '18' ],
				'159': [ '17', '9', '11', '12', '3', '1', '4', '16' ]
			},
			'16': {
				'153': [ '11' ],
				'155': [ '4' ],
				'156': [ '17', '9' ],
				'157': [ '1' ],
				'158': [ '12', '3' ],
				'159': [ '10', '19', '0', '2', '13', '7', '15', '18', '5', '6', '8', '14' ]
			},
			'17': {
				'155': [ '9' ],
				'156': [ '4', '11', '16' ],
				'157': [ '1' ],
				'158': [ '12', '3' ],
				'159': [ '5', '19', '0', '6', '10', '7', '15', '18', '13', '2', '8', '14' ]
			},
			'18': {
				'155': [ '7' ],
				'157': [ '19', '10', '0', '13', '5' ],
				'158': [ '15', '8', '2', '6', '14' ],
				'159': [ '3', '1', '9', '11', '4', '16', '17', '12' ]
			},
			'19': {
				'153': [ '10' ],
				'154': [ '0' ],
				'155': [ '13' ],
				'156': [ '5' ],
				'157': [ '18', '7' ],
				'158': [ '6', '8', '15', '14', '2' ],
				'159': [ '12', '9', '4', '11', '1', '16', '17', '3' ]
			}
		}

		const actualResults = {}
		_.concat(baseNode, additionalNodes).forEach(e => {
			const curr = actualResults[e.username] = {}
			e.router.buckets.forEach((b, i) => {
				if (b.length > 0) {
					curr[i] = b.map(c => c.username)
				}
			})
		})

		expect(actualResults).to.deep.equal(expectedResults)

		done()
	})
})

describe('#childProcess', () => {

	before(async done => {
		internals.nodes = _.range(numNodes).map(e => {
			const keyPair = crypto.generateKeyPair()
			return Contact({ username: e.toString(), id: utils.generateId(e.toString()), ip: '0.0.0.0', port: 4000 + e, publicKey: keyPair.publicKey })
		})
		internals.nodes.forEach(e => console.log(e.username, e.id))
		done()
	})

	it.skip('spawn child process', async done => {

		const baseNode = internals.nodes[0]
		const additionalNodes = _(internals.nodes).drop(1).value()

		let baseNodeThread = cp.fork('./dist/lib/child.js')
		let additionalNodesThreads = []
		const pendingConnections = {}

		baseNodeThread.on('message', (m) => {
			if (pendingConnections[m.message.messageID] !== undefined) {
				pendingConnections[m.message.messageID].resolve(true)
			}
			
			if (m.message.command === 'create'){
				baseNode.publicKey = m.node.publicKey
			}else if (m.message.command === 'connect') {
				console.log('base node received connection response from ' + m.node.username)
			}
		})

		baseNodeThread.on('error', err => console.log('baseNode Thread error', err))
		
		new Promise((resolve, reject) => {
			const message = {command: 'create', node: baseNode, messageID: utils.generateMessageId()}
			baseNodeThread.send(message, err => {
				pendingConnections[message.messageID] = { resolve, reject }
			})
		}).then(() => {
			console.log('base node created')
			return true
		}).then(() => {
			return Promise.all(additionalNodes.map(e => new Promise((resolve, reject) => {
				const newThread = cp.fork('./dist/lib/child.js')
				additionalNodesThreads.push(newThread)
				
				newThread.on('message', (m) => {
					if (pendingConnections[m.message.messageID] !== undefined) {
						pendingConnections[m.message.messageID].resolve(true)
					}

					if (m.message.command === 'create'){
						e.publicKey = m.node.publicKey
					}
				})
				newThread.on('error', (err) => { console.log('Thread Error', err) })
				
				const message = { command: 'create', node: e, messageID: utils.generateMessageId() }
				newThread.send(message, err => {
					pendingConnections[message.messageID] = { resolve, reject }
				})
			})))
		}).then(() => {
			console.log('all nodes created')
			return true
		}).then(() => {
			return Promise.all(additionalNodes.map((e, i) => new Promise((resolve, reject) => {
				const message = { command: 'connect', contact: baseNode, messageID: utils.generateMessageId() }
				additionalNodesThreads[i].send(message, err => {
					pendingConnections[message.messageID] = { resolve, reject }
				})
			})))
		}).then(() => {
			console.log('all nodes connected')
			return true
		}).then(() => {
			baseNodeThread.disconnect()
			additionalNodesThreads.forEach(e => e.disconnect())
		}).then(() => {
			console.log('all nodes disconnected')
			return true
		}).then(() => done())
	})
})