'use strict';

const expect = require('chai').expect,
      Contact = require('../lib/contact'),
      Command = require('../lib/command'),
      _ = require('lodash'),
      logger = require('../lib/logger')({ minLevel: 4 }),
      faker = require('faker'),
      utils = require('../lib/utils');

const contacts = _.range(3).map(e => Contact({
    id: utils.generateId(),
    ip: faker.internet.ip(),
    port: utils.getRandomRange(1000, 5000)
  }));

describe('command', () => {
  it('#createPingReq', done => {
    const source = contacts[0];
    const dest = contacts[1];
    const request = Command.createPingReq(source, dest);
    expect(request.id).to.be.a('string');
    expect(request.destination.ip).to.be.a('string');
    expect(request.destination.ip).to.equal(dest.ip);
    expect(request.destination.port).to.be.a('number');
    expect(request.destination.port).to.equal(dest.port);
    expect(request.command).to.equal('PING');
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
  
  // TODO: add more unit tests for other commands
});