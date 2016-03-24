const expect = require('chai').expect,
	Contact = require('../lib/contact'),
	Command = require('../lib/command'),
	Logger = require('../lib/logger'),
	Router = require('../lib/router'),
	utils = require('../lib/utils'),
	magic = require('../lib/magic'),
	_ = require('lodash')

const debug = false
const onlyDebug = true
const logger = Logger({
	minLevel: debug ? 1 : 3,
	maxLevel: onlyDebug ? 1 : 4
})

const internals = {}
internals.nodes = []

describe('Router', () => {

	before(async done => {
		for (let i of _.range(50)) {
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

			// add addtional nodes to buckets of base node
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

			try {
				const result = await baseNode.router.lookup(additionalNodes[2].contact.id)
			} catch (e) {
				console.log(e)
			}

			done()
		})
	})

	describe('#connect', () => {
		it('connect', async done => {
			const baseNode = internals.nodes[0]
			const additionalNodes = _(internals.nodes).drop(1).value()

			for (let i = 0; i < additionalNodes.length; i++) {
				await additionalNodes[i].router.updateContact(baseNode.contact)
				await additionalNodes[i].router.lookup(additionalNodes[i].contact.id)
				//await additionalNodes[i].router.refreshBucketsBeyondClosest()
			}

			internals.nodes.forEach(e => {
				console.log('Node: ', e.contact.username)
				//console.log(e.contact.username, _.flatten(e.router.buckets.filter(b => b !== undefined)).map(c => c.username))
				_.forEach(e.router.buckets, (bucket, index) => {
						if (bucket.length !== 0) {
							console.log('index', index, ':', bucket.map(e => e.username));
						}
				})
			})

			done()
		})
	})
})