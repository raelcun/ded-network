'use strict';

const expect = require('chai').expect,
      Contact = require('../lib/contact'),
      Node = require('../lib/node'),
      magic = require('../lib/magic'),
      _ = require('lodash'),
      Logger = require('../lib/logger');
     
const numNodes = 2;
const logger = Logger({ minLevel: 4 });
const nodeOpts = [{id: '6bb852acbce77aa6bf09a36a81c45f358e3207bc', ip: '127.0.0.1', port: 4000, logger: logger}, {id: '0888b900099c87050ee5aa3efb253b830fdee8b9', ip: '127.0.0.1', port: 4001, logger: logger}];

const internals = {};
internals.nodes = [];

describe('router', () => {
  before(done => {
    Promise.all(nodeOpts.map(opt => Node(opt))).then(nodes => {
      internals.nodes = nodes;
      done();
    });
  });

  it('#updateContact', (done) => {
    internals.nodes[0].router.updateContact(Contact.fromNode(internals.nodes[1]));
    expect(internals.nodes[0].router._buckets[158][0].id).to.equal(internals.nodes[1].id);
    done();
  });
  it('#getNearestNodes', (done) => {
    internals.nodes[0].router.getNearestNodes(Contact.fromNode(internals.nodes[1]));
    done();
  });
});