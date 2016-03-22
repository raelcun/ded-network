'use strict';

const expect = require('chai').expect,
      Node = require('../lib/node'),
      _ = require('lodash'),
      Logger = require('../lib/logger'),
      magic = require('../lib/magic'),
      Promise = require('bluebird');

Promise.config({ longStackTrace: true })

const numNodes = 10;
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
      internals.nodes[0].connect(internals.nodes[1]).then(() => {
        console.log('connected');
        internals.nodes[0].ping(internals.nodes[1].asContact()).then(result => {
          expect(result).to.equal(true);
          done();
        });
      });
    });
  });

  it('#message', done => {
    var source = internals.nodes[0];
    var nodes = _.slice(internals.nodes, 1, internals.nodes.length);
    var p = Promise.resolve();
    nodes.forEach(e => {
      p = p.then(() => {
        return e.connect(source)
      })
    });
    p.then(() => {
      const findKey = internals.nodes[2].findPublicKeyP('5');
      findKey.then(pubKey => {
        const msg = internals.nodes[2].sendMessage('5', 'hello world', pubKey);
        msg.then(result => {
          console.log('message response result', result);
          expect(result).to.equal(true);
          done();
        }).catch(error => {
          done(error);
        })
      }).catch(error => {
        done(error);
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
        //console.log(0, _.flatten(BaseNode.router._buckets).filter(e => e).map(e => e.username));
        nodes.forEach((node, i) => {
            //console.log('node', i+1);
          node.router._buckets.forEach((bucket, j) => {
            //console.log(j, bucket.filter(e => e).map(e => e.username));
          })
        })

        done();
      })
    });
  });
});
