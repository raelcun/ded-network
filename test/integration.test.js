'use strict';

const expect = require('chai').expect,
      Node = require('../lib/node'),
      _ = require('lodash'),
      Logger = require('../lib/logger');
     
const numNodes = 50;
const debug = false;
const logger = Logger({ minLevel: debug ? 1 : 4, maxLevel: 4 });
const nodeOpts = _.range(numNodes).map(e => { return { ip: '127.0.0.1', port: 3100 + e, logger}; });

const internals = {};

describe('Integration', () => {
  
  beforeEach(done => {
    internals.nodes = [];
    Promise.all(nodeOpts.map((opt, i) => Node(i.toString(), opt))).then(nodes => {
      internals.nodes = nodes;
      done();
    });
  });

  afterEach(done => {
    Promise.all(internals.nodes.map(e => e.close())).then(() => {
      done();
    });
  });
  
  describe('Node', () => {
    it('#ping', (done) => {
      internals.nodes[0].ping(internals.nodes[1].asContact()).then(result => {
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
  
  describe('Connect', () => {
    it('#connect', (done) => {
      var BaseNode = internals.nodes[0];
      var nodes = _.slice(internals.nodes, 1, internals.nodes.length);

      var p = Promise.resolve();
      nodes.forEach(node => {
        p = p.then(() => {
          return node.connect(BaseNode);
        });
      });
      p.then(() => { 
        done();
      })
    });
  });
});