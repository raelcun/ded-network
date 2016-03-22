require('babel-polyfill')

const expect = require('chai').expect,
			Contact = require('../lib/contact'),
			Command = require('../lib/command'),
			RPC = require('../lib/rpc'),
			utils = require('../lib/utils'),
			Logger = require('../lib/logger'),
			faker = require('faker'),
			_ = require('lodash')

const debug = false
const onlyDebug = false
const logger = Logger({ minLevel: (onlyDebug || debug) ? 1 : 3, maxLevel: onlyDebug ? 1 : 4 })

const contacts = _.range(3).map(e => Contact({
	id: utils.generateId(e.toString()),
	username: e.toString(),
	ip: '127.0.0.1',
	port: utils.getRandomRange(2000, 5000)
}))
const rpcs = []

describe('Command', () => {
	
	before(async done => {
		for (let c of contacts)
			rpcs.push(await RPC({ contact: c, logger }))
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
			const strMessage = 'test message'
			const command = Command.createMessageReq({ sourceContact, destContact, strMessage })
			const handleCommand = received => {
				expect(received.payload.message).to.deep.equal(strMessage)
				done()
			}
			sourceRPC.setHandler(handleCommand)
			destRPC.setHandler(handleCommand)
			sourceRPC.sendCommand(command)
		})
		
		it('receive response', async done => {
			const [sourceContact, destContact] = contacts
			const [sourceRPC, destRPC] = rpcs
			const strMessage = 'test message'
			const command = Command.createMessageReq({ sourceContact, destContact, strMessage })
			sourceRPC.setHandler(received => { })
			destRPC.setHandler(received => {
				destRPC.sendCommand(Command.createMessageRes({ sourceContact: destContact, destContact: sourceContact, orgRequestId: received.id }))
			})
			sourceRPC.sendCommand(command).then(result => {
				expect(result.id).to.equal(command.id)
				done()
			})
		})
	})
})