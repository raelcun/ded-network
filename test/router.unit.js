'use strict';

const expect = require('chai').expect,
      Node = require('../lib/node'),
      magic = require('../lib/magic'),
      _ = require('lodash');
     
const numNodes = 2;
const nodeOpts = [{id: '6bb852acbce77aa6bf09a36a81c45f358e3207bc', ip: '127.0.0.1', port: 4000}, {id: '0888b900099c87050ee5aa3efb253b830fdee8b9', ip: '127.0.0.1', port: 4001}]

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
    internals.nodes[0].router.updateContact(internals.nodes[1]);
    expect(internals.nodes[0].id).to.equal(nodeOpts[0].id);
    expect(internals.nodes[1].id).to.equal(nodeOpts[1].id);
    expect(internals.nodes[0].router._buckets[158][0].id).to.equal(internals.nodes[1].id);
    done();
  });
});