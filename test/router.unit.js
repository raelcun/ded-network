const expect = require('chai').expect,
			Contact = require('../lib/contact'),
			Command = require('../lib/command'),
			Logger = require('../lib/logger'),
			Router = require('../lib/router'),
			Node = require('../lib/node'),
			utils = require('../lib/utils'),
			magic = require('../lib/magic'),
			_ = require('lodash')

const numNodes = 20
const debug = false
const logger = Logger({
	minLevel: debug ? 0 : 3,
	maxLevel: debug ? 1 : 4
})

const internals = {}
internals.nodes = []
internals.contacts = []

describe('Router', () => {

	before(done => {
		internals.contacts = _.range(numNodes).map(e => Contact({
				id: utils.generateId(e.toString()),
				username: e.toString(),
				ip: '127.0.0.1',
				port: 3000 + e,
				logger
			}))
		if (debug) { internals.contacts.forEach(e => console.log(e.username, e.id)) }
		done()
	})

	beforeEach(async done => {
		internals.nodes = []
		for (let i of _.range(numNodes)) {
			internals.nodes.push({
				router: await Router({
					logger, sourceContact: internals.contacts[i]
				}),
				contact: internals.contacts[i]
			})
		}
		done()
	})

	afterEach(async done => {
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

	it('#getNearestContacts', done => {
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

	it('#lookup', async done => {
		const baseNode = internals.nodes[0]
		const additionalNodes = _(internals.nodes).drop(1).value()

		additionalNodes.forEach(e => {
			baseNode.router.updateContact(e.contact)
		})

		const finalState = await baseNode.router.lookup(additionalNodes[2].contact.id)
		
		const allContacts = internals.nodes.map(e => e.contact.id).sort()
		expect(finalState.contactlist.map(e => e.id).sort()).to.deep.equal(allContacts)
		expect(finalState.contacted.sort()).to.deep.equal(allContacts)

		done()
	})
})