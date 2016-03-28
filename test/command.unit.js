const expect = require('chai').expect,
			Contact = require('../lib/contact'),
			Command = require('../lib/command'),
			crypto = require('../lib/crypto'),
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
					sourceUsername: sourceContact.username,
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
		const queryId = utils.generateMessageId()
		const state = {
				requestedContactId: destContact.id,
				requestedKeys: [],
				queryId: queryId,
				contacted: [sourceContact.id],
				contactlist: []
		}
		const command = Command.createMessageReq({ sourceContact, destContact, state })
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
			payload: _.merge({ state: state }, {
				sourceUsername: sourceContact.username,
				sourceId: sourceContact.id,
				sourceIP: sourceContact.ip,
				sourcePort: sourceContact.port,
				destId: destContact.id
			})
		})
		done()
	})

  it('#encryptAndSign', done => {
    const sourceKeyPair = crypto.generateKeyPair();
    const destKeyPair = crypto.generateKeyPair();
    const command = {
      id: 1,
      destination: {
        ip: '127.0.0.1',
        port: '7001'
      },
      command: 'MESSAGE',
      payload: { message: 'test message'}
    };
    const encrypted = Command.encrypt(command, sourceKeyPair.private, destKeyPair.public);
    expect(encrypted.payload).to.be.a('string');
    expect(encrypted.aesParams).to.be.a('string');
    expect(encrypted.signature).to.be.a('string');
    done();
  });

  it('#decrypt', done => {
    const sourceKeyPair = crypto.generateKeyPair();
    const destKeyPair = crypto.generateKeyPair();
    const command = {
      id: 1,
      destination: {
        ip: '127.0.0.1',
        port: '7001'
      },
      command: 'MESSAGE',
      payload: {
        message: 'test message',
        sourceId: 1,
        sourceIP: '127.0.0.1',
        sourcePort: '7000'
      }
    };
    const encrypted = Command.encrypt(command, sourceKeyPair.private, destKeyPair.public);
    const decrypted = Command.decrypt(encrypted, destKeyPair.private);
    expect(decrypted.payload).to.be.a('object');
    expect(decrypted.aesParams).to.be.a('object');
    done();
  });

  it('#verify', done => {
    const sourceKeyPair = crypto.generateKeyPair();
    const destKeyPair = crypto.generateKeyPair();
    const command = {
      id: 1,
      destination: {
        ip: '127.0.0.1',
        port: '7001'
      },
      command: 'MESSAGE',
      payload: {
        message: 'test message',
        sourceId: 1,
        sourceIP: '127.0.0.1',
        sourcePort: '7000'
      }
    };
    const encrypted = Command.encrypt(command, sourceKeyPair.private, destKeyPair.public);
    const decrypted = Command.decrypt(encrypted, destKeyPair.private);
    const verified = Command.verify(decrypted, sourceKeyPair.public);
    expect(verified).to.equal(true);
    done();
  });

})
