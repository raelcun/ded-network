const expect = require('chai').expect,
			Contact = require('../lib/contact'),
			Command = require('../lib/command'),
			utils = require('../lib/utils'),
			faker = require('faker'),
			_ = require('lodash')

const contacts = _.range(3).map(e => Contact({
	id: utils.generateId(e.toString()),
	username: e.toString(),
	ip: faker.internet.ip(),
	port: utils.getRandomRange(1000, 5000)
}))

describe('Command', () => {
	describe('#createCommand', () => {
		it('should output proper object', done => {
			const [sourceContact, destContact] = contacts
			const strCommand = 'myCommand'
			const payload = { test: 'this is my payload' }
			const command = Command.createCommand({ destContact, sourceContact, strCommand, payload })
			expect(command).to.deep.equal({
				id: command.id || '',
				destination: {
					username: destContact.username,
					id: destContact.id,
					ip: destContact.ip,
					port: destContact.port,
					publicKey: destContact.publicKey
				},
				strCommand,
				payload: _.merge({}, payload, {
					sourceId: sourceContact.id,
					sourceIP: sourceContact.ip,
					sourcePort: sourceContact.port,
					destId: destContact.id
				})
			})
			
			done()
		})
		
		it('should override id', done => {
			const id = utils.generateId('abc123')
			const [sourceContact, destContact] = contacts
			const strCommand = 'myCommand'
			const payload = { test: 'this is my payload' }
			const command = Command.createCommand({ id, destContact, sourceContact, strCommand, payload })
			expect(command.id).to.equal(id)
			done()
		})
		
		it('should default id', done => {
			const [sourceContact, destContact] = contacts
			const strCommand = 'myCommand'
			const payload = { test: 'this is my payload' }
			const command = Command.createCommand({ destContact, sourceContact, strCommand, payload })
			expect(command.id).to.be.a('string')
			done()
		})
	})
	
	it('#createMessageReq', done => {
		const [sourceContact, destContact] = contacts
		const strMessage = 'test message'
		const command = Command.createMessageReq({ sourceContact, destContact, strMessage })
		expect(command).to.deep.equal({
			id: command.id || '',
			destination: {
				username: destContact.username,
				id: destContact.id,
				ip: destContact.ip,
				port: destContact.port,
				publicKey: destContact.publicKey
			},
			strCommand: 'MESSAGE',
			payload: _.merge({ message: strMessage }, {
				sourceId: sourceContact.id,
				sourceIP: sourceContact.ip,
				sourcePort: sourceContact.port,
				destId: destContact.id
			})
		})
		done()
	})
})