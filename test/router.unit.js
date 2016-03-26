const expect = require('chai').expect,
			Contact = require('../lib/contact'),
			Command = require('../lib/command'),
			Logger = require('../lib/logger'),
			Router = require('../lib/router'),
			Node = require('../lib/node'),
			utils = require('../lib/utils'),
			magic = require('../lib/magic'),
			crypto = require('../lib/crypto'),
			pkStore = require('../lib/pkStore'),
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
const kp = crypto.generateKeyPair()

describe('Router', () => {

	before(done => {
		internals.contacts = _.range(numNodes).map(e => Contact({
				id: utils.generateId(e.toString()),
				username: e.toString(),
				publicKey: kp.public,
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
			pkStore[internals.contacts[i].id] = { publicKey: kp.public, privateKey: kp.private }
			internals.nodes.push({
				router: await Router({
					logger, privateKey: kp.private, sourceContact: internals.contacts[i]
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

	it('#requestPublicKey', async done => {
		if (numNodes < 7) done(new Error('not enough nodes to run this test'))

		/* 0 - 1 - 3 - 6
		 *  \   \   /
		 *   2   - 4 - 5
		 */

		const connect = (from, to) => to.forEach(e => internals.nodes[from].router.updateContact(internals.nodes[e].contact))
		const getConnectedTo = i => _.flatten(internals.nodes[i].router.buckets.filter(e => e.length > 0)).map(e => e.username).sort()


		connect(0, [1, 2])
		connect(1, [3, 4])
		connect(3, [6])
		connect(4, [5, 6])

		expect(getConnectedTo(0)).to.deep.equal(['1', '2'])
		expect(getConnectedTo(1)).to.deep.equal(['3', '4'])
		expect(getConnectedTo(2)).to.deep.equal([])
		expect(getConnectedTo(3)).to.deep.equal(['6'])
		expect(getConnectedTo(4)).to.deep.equal(['5', '6'])
		expect(getConnectedTo(5)).to.deep.equal([])
		expect(getConnectedTo(6)).to.deep.equal([])
		const key = await internals.nodes[0].router.requestPublicKey(internals.nodes[5].contact.id)
		expect(key).to.equal(internals.nodes[5].contact.publicKey)

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
