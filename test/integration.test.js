'use strict';

const expect = require('chai').expect,
      Node = require('../lib/node'),
      _ = require('lodash'),
      logger = require('../lib/logger')({ minLevel: 4, maxLevel: 4 });
     
const numNodes = 5;
const nodeOpts = _.range(numNodes).map(e => { return { ip: '127.0.0.1', port: 3100 + e, logger}; });

const internals = {};
internals.nodes = [];

describe('integration', () => {
  before(done => {
    Promise.all(nodeOpts.map(opt => Node(opt))).then(nodes => {
      internals.nodes = nodes;
      done();
    });
  });
  
  after(done => {
    internals.nodes.forEach(e => e.close());
    done();
  });
  
  describe('Node', () => {
    it('#ping', (done) => {
      internals.nodes[0].ping(internals.nodes[1]).then(result => {
        expect(result).to.equal(true);
        done();
      });
    });
    
    it('#message', (done) => {
      internals.nodes[0].sendMessage(internals.nodes[1], 'hello world').then(result => {
        expect(result).to.equal(true);
        done();
      });
    });
  
    it('#find', (done) => {
      internals.nodes[0].find(internals.nodes[1]).then(result => {
        expect(result).to.be.a('string');
        done();
      });
    });
    
  });
});