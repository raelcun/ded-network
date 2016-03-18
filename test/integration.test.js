'use strict';

const expect = require('chai').expect,
      Node = require('../lib/node'),
      _ = require('lodash'),
      Logger = require('../lib/logger'),
      magic = require('../lib/magic');
     
const numNodes = 50;
const debug = false;
const logger = Logger({ minLevel: debug ? 1 : 4, maxLevel: 1 });
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
    Promise.all(internals.nodes.map(e => e.close())).then(() => done());
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
      nodes.forEach(e => {
        p = p.then(() => {
          return e.connect(BaseNode)
        })
      });
      p.then((result) => {
        expect(result === true);
        console.log(0, _.flatten(BaseNode.router._buckets).filter(e => e).map(e => e.username));
        nodes.forEach((node, i) => {
          console.log(i+1, _.flatten(node.router._buckets).filter(e => e).map(e => e.username));
        })
        
        // for(let i = 0; i < internals.nodes.length; i++) {
        //   for(let j = 0; j < internals.nodes.length; j++) {
        //     console.log(i, j, parseInt(magic.bufferToHex(magic.getDistance(internals.nodes[i].id, internals.nodes[j].id)), 16))
        //   }
        // }
        
        done();
      })
    });
  });
});