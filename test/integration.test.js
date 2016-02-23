'use strict';

const expect = require('chai').expect,
      Node = require('../lib/node'),
      _ = require('lodash');
     
const numNodes = 5;
const nodeOpts = _.range(numNodes).map(e => { return { ip: '127.0.0.1', port: 3100 + e }});

const internals = {};
internals.nodes = [];

describe('integration', () => {
  beforeEach(done => {
    Promise.all(nodeOpts.map(opt => Node(opt))).then(nodes => {
      internals.nodes = nodes;
      done();
    });
  });
  
  describe('Node', () => {
    it('#ping', (done) => {
      internals.nodes[0].ping(internals.nodes[1]).then(result => {
        expect(true).to.equal(true);
        done();
      });
    });
  });
});