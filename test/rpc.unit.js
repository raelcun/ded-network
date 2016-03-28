require('babel-polyfill')

const expect = require('chai').expect,
			Contact = require('../lib/contact'),
			Command = require('../lib/command'),
			RPC = require('../lib/rpc'),
			utils = require('../lib/utils'),
			Logger = require('../lib/logger'),
			crypto = require('../lib/crypto'),
			faker = require('faker'),
			_ = require('lodash')

const debug = false
const onlyDebug = false
const logger = Logger({ minLevel: (onlyDebug || debug) ? 1 : 3, maxLevel: onlyDebug ? 1 : 4 })
const kp = crypto.generateKeyPair()

const contacts = _.range(3).map(e => Contact({
	id: utils.generateId(e.toString()),
	username: e.toString(),
	ip: '127.0.0.1',
	port: utils.getRandomRange(2000, 5000)
}))
const rpcs = []

describe('RPC', () => {

	before(async done => {
		for (let c of contacts){
			rpcs.push(await RPC({ contact: c, privateKey: kp.private, logger }))
		}
		done()
	})

	after(done => {
		for (let r of rpcs)
			r.close()
		done()
	})

	describe('#sendCommand', () => {
		it('send command', async done => {
			const [sourceContact, destContact] = contacts
			const [sourceRPC, destRPC] = rpcs
			const queryId = utils.generateMessageId()
			const state = {
				requestedContactId: destContact.id,
				requestedKeys: [],
				queryId: queryId,
				contacted: [sourceContact.id],
				contactlist: []
			}
			const command = Command.createMessageReq({ sourceContact, destContact, state })
			const handleCommand = received => {
				console.log(received)
				expect(received.payload.state).to.deep.equal(state)
				done()
			}
			sourceRPC.setHandler(handleCommand)
			destRPC.setHandler(handleCommand)
			sourceRPC.sendCommand(command, kp.public)
		})

		it('receive response', async done => {
			const [sourceContact, destContact] = contacts
			const [sourceRPC, destRPC] = rpcs
			const queryId = utils.generateMessageId()
			const state = {
				requestedContactId: destContact.id,
				requestedKeys: [],
				queryId: queryId,
				contacted: [sourceContact.id],
				contactlist: []
			}
			const command = Command.createMessageReq({ sourceContact, destContact, state })
			sourceRPC.setHandler(received => { })
			destRPC.setHandler(received => {
				destRPC.sendCommand(Command.createMessageRes({ sourceContact: destContact, destContact: sourceContact, orgRequestId: received.id, state: state }), kp.public)
			})
			sourceRPC.sendCommand(command, kp.public).then(result => {
				expect(result.id).to.equal(command.id)
				done()
			})
		})
	})
})
