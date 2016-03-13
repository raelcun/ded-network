'use strict';

const expect = require('chai').expect,
      Node = require('../lib/node'),
      _ = require('lodash'),
      Logger = require('../lib/logger');
     
const numNodes = 2;
const debug = true;
const logger = Logger({ minLevel: debug ? 3 : 4, maxLevel: 4 });
const nodeOpts = _.range(numNodes).map(e => { return { ip: '127.0.0.1', port: 3100 + e, logger}; });

const internals = {};
internals.nodes = [];

describe('Integration', () => {
  before(done => {
    Promise.all(nodeOpts.map((opt, i) => Node(i.toString(), opt))).then(nodes => {
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
    it('connect once', (done) => {
      var BaseNode = internals.nodes[0];
      var nodes = _.slice(internals.nodes, 1, internals.nodes.length);
      nodes[nodes.length - 1].connect(BaseNode).then(() => { done() });
    });
    
    it('#connect', (done) => {
      var BaseNode = internals.nodes[0];
      var nodes = _.slice(internals.nodes, 1, internals.nodes.length);
      var p = Promise.resolve();
      nodes.forEach(e => {
        p = p.then(() => {
          return e.connect(BaseNode)
        })
      });
      p.then(() => { 
        done();
      })
    });
  });
});