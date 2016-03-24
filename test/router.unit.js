const expect = require('chai').expect,
	Contact = require('../lib/contact'),
	Command = require('../lib/command'),
	Logger = require('../lib/logger'),
	Router = require('../lib/router'),
	Node = require('../lib/node'),
	utils = require('../lib/utils'),
	magic = require('../lib/magic'),
	_ = require('lodash')

const debug = false
const logger = Logger({
	minLevel: debug ? 0 : 3,
	maxLevel: debug ? 1 : 4
})

const internals = {}
internals.nodes = []

describe('Router', () => {

	before(async done => {
		for (let i of _.range(20)) {
			const contact = Contact({
				id: utils.generateId(i.toString()),
				username: i.toString(),
				ip: '127.0.0.1',
				port: 3000 + i,
				logger
			})

			console.log(contact.username, ':', contact.id)

			internals.nodes.push({
				router: await Router({
					logger, sourceContact: contact
				}),
				contact
			})
		}
		done()
	})

	after(async done => {
		await Promise.all(internals.nodes.map(e => e.router.rpc.close()))
		done()
	})

	describe('#updateContact', () => {
		it('add contact to empty bucket', done => {
			const node1 = internals.nodes[0]
			const node2 = internals.nodes[1]
			const expectedBucket = magic.getBucketIndex(node1.contact.id, node2.contact.id)

			node1.router.updateContact(node2.contact)
			expect(node1.router.buckets[expectedBucket][0].id).to.equal(node2.contact.id)
			done()
		})
	})

	describe('#getNearestContacts', () => {
		it('get nearest contacts should work', done => {
			const baseNode = internals.nodes[0]
			const additionalNodes = _(internals.nodes).drop(1).take(10).value()
			const targetNode = additionalNodes[1]
			const sortByDistance = additionalNodes
				.map(e => ({
					id: e.contact.id,
					distance: magic.getDistance(targetNode.contact.id, e.contact.id)
				}))
				.sort((a, b) => magic.compareKeys(a.distance, b.distance))

			additionalNodes.forEach(e => {
				baseNode.router.updateContact(e.contact)
			})

			const nearest = baseNode.router.getNearestContacts(targetNode.contact.id, 4, baseNode.contact.id)
			const expectedNearest = sortByDistance.map(e => e.id)

			expect(nearest.map(e => e.id)).to.deep.equal(_.take(sortByDistance.map(e => e.id), nearest.length))

			done()
		})
	})

	describe('#iterativeFind', () => {
		it('test', async done => {
			const baseNode = internals.nodes[0]
			const additionalNodes = _(internals.nodes).drop(1).value()

			additionalNodes.forEach(e => {
				baseNode.router.updateContact(e.contact)
			})

			const result = await baseNode.router.lookup(additionalNodes[2].contact.id)

			done()
		})
	})

	describe('#connect', () => {
		it('connect', async done => {
			const baseNode = internals.nodes[0]
			const additionalNodes = _(internals.nodes).drop(1).take(19).value()
			if (additionalNodes.length < 19) {
				return done(new Error('not enough nodes to test'))
			}

			for (let i = 0; i < additionalNodes.length; i++) {
				await additionalNodes[i].router.updateContact(baseNode.contact)
				await additionalNodes[i].router.lookup(additionalNodes[i].contact.id)
				//await additionalNodes[i].router.refreshBucketsBeyondClosest()
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
			internals.nodes.forEach(e => {
				const curr = actualResults[e.contact.username] = {}
				e.router.buckets.forEach((b, i) => {
					if (b.length > 0) {
						curr[i] = b.map(c => c.username)
					}
				})
			})
			
			expect(actualResults).to.deep.equal(expectedResults)

			done()
		})

		it('connectNodes', async done => {
			const numNodes = 20
			const nodes = await Promise.all(_.range(numNodes).map(e => Node({ username: e.toString(), ip: '127.0.0.1', port: 3100 + e, logger })))
			const baseNode = nodes[0]
			const additionalNodes = _.drop(nodes, 1)
			
			for (let i = 0; i < additionalNodes.length; i++) {
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
			nodes.forEach(e => {
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
})