'use strict';

const expect = require('chai').expect,
      Contact = require('../lib/contact'),
      Command = require('../lib/command'),
      crypto = require('../lib/crypto'),
      _ = require('lodash'),
      faker = require('faker'),
      utils = require('../lib/utils');

const contacts = _.range(3).map(e => Contact({
    id: utils.generateId(),
    ip: faker.internet.ip(),
    port: utils.getRandomRange(1000, 5000)
  }));

describe('Command', () => {
  describe('#createCommand', () => {
    it('should default id', done => {
      const source = contacts[0];
      const dest = contacts[1];
      const strCommand = 'my command';
      const payload = { test: 'this is my payload' };
      const command = Command.createCommand(dest, source, strCommand, payload);
      expect(command.id).to.be.a('string');
      expect(command.destination.ip).to.be.a('string');
      expect(command.destination.ip).to.equal(dest.ip);
      expect(command.destination.port).to.be.a('number');
      expect(command.destination.port).to.equal(dest.port);
      expect(command.command).to.equal(strCommand);
      expect(command.payload).to.be.an('object');
      expect(command.payload).to.deep.equal(payload);
      done();
    });

    it('should override id', done => {
      const id = utils.generateId();
      const source = contacts[0];
      const dest = contacts[1];
      const strCommand = 'my command';
      const payload = { test: 'this is my payload' };
      const command = Command.createCommand(dest, source, strCommand, payload, id);
      expect(command.id).to.be.a('string');
      expect(command.id).to.equal(id);
      expect(command.destination.ip).to.be.a('string');
      expect(command.destination.ip).to.equal(dest.ip);
      expect(command.destination.port).to.be.a('number');
      expect(command.destination.port).to.equal(dest.port);
      expect(command.command).to.equal(strCommand);
      expect(command.payload).to.be.an('object');
      expect(command.payload).to.deep.equal(payload);
      done();
    });
  });

  it('#createPingReq', done => {
    const source = contacts[0];
    const dest = contacts[1];
    const request = Command.createPingReq(source, dest);
    expect(request.payload.sourceId).to.be.a('string');
    expect(request.payload.sourceId).to.equal(source.id);
    expect(request.payload.sourceIP).to.be.a('string');
    expect(request.payload.sourceIP).to.equal(source.ip);
    expect(request.payload.sourcePort).to.be.a('number');
    expect(request.payload.sourcePort).to.equal(source.port);
    expect(request.payload.destinationId).to.be.a('string');
    expect(request.payload.destinationId).to.equal(dest.id);
    done();
  });

  it('#createPingRes', done => {
    const source = contacts[0];
    const dest = contacts[1];
    const request = Command.createPingReq(source, dest);
    const response = Command.createPingRes(request, dest);
    expect(response.payload.sourceId).to.be.a('string');
    expect(response.payload.sourceId).to.equal(dest.id);
    expect(response.payload.destinationId).to.be.a('string');
    expect(response.payload.destinationId).to.equal(source.id);
    done();
  });

  it('#createMessageReq', done => {
    const source = contacts[0];
    const dest = contacts[1];
    const message = 'test message';
    const request = Command.createMessageReq(source, dest, message);
    expect(request.payload.sourceId).to.be.a('string');
    expect(request.payload.sourceId).to.equal(source.id);
    expect(request.payload.sourceIP).to.be.a('string');
    expect(request.payload.sourceIP).to.equal(source.ip);
    expect(request.payload.sourcePort).to.be.a('number');
    expect(request.payload.sourcePort).to.equal(source.port);
    expect(request.payload.strMessage).to.be.a('string');
    expect(request.payload.strMessage).to.equal(message);
    done();
  });

  it('#createMessageRes', done => {
    const source = contacts[0];
    const dest = contacts[1];
    const message = 'test message';
    const request = Command.createMessageReq(source, dest, message);
    const response = Command.createMessageRes(request, dest);
    expect(response.payload.sourceId).to.be.a('string');
    expect(response.payload.sourceId).to.equal(dest.id);
    expect(response.payload.destinationId).to.be.a('string');
    expect(response.payload.destinationId).to.equal(source.id);
    done();
  });

  it('#createFindReq', done => {
    const source = contacts[0];
    const dest = contacts[1];
    const key = 'my public key';
    const request = Command.createFindReq(source, dest, key);
    expect(request.payload.sourceId).to.be.a('string');
    expect(request.payload.sourceId).to.equal(source.id);
    expect(request.payload.sourceIP).to.be.a('string');
    expect(request.payload.sourceIP).to.equal(source.ip);
    expect(request.payload.sourcePort).to.be.a('number');
    expect(request.payload.sourcePort).to.equal(source.port);
    expect(request.payload.publicKey).to.be.a('string');
    expect(request.payload.publicKey).to.equal(key);
    done();
  });

  it('#createMessageRes', done => {
    const source = contacts[0];
    const dest = contacts[1];
    const key = 'my public key';
    const request = Command.createFindReq(source, dest, key);
    const response = Command.createFindRes(request, dest);
    expect(response.payload.sourceId).to.be.a('string');
    expect(response.payload.sourceId).to.equal(dest.id);
    expect(response.payload.destinationId).to.be.a('string');
    expect(response.payload.destinationId).to.equal(source.id);
    expect(response.payload.publicKey).to.be.a('string');
    expect(response.payload.publicKey).to.equal(key);
    done();
  });
  
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
    const encrypted = Command.encryptAndSign(command, destKeyPair.public, sourceKeyPair.private);
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
    const encrypted = Command.encryptAndSign(command, destKeyPair.public, sourceKeyPair.private);
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
    const encrypted = Command.encryptAndSign(command, destKeyPair.public, sourceKeyPair.private);
    const decrypted = Command.decrypt(encrypted, destKeyPair.private);
    const verified = Command.verify(decrypted, sourceKeyPair.public);
    expect(verified).to.equal(true);
    done();
  });
  
});
