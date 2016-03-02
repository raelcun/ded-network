'use strict';

const expect = require('chai').expect,
      Contact = require('../lib/contact'),
      Node = require('../lib/node'),
      magic = require('../lib/magic'),
      _ = require('lodash'),
      Logger = require('../lib/logger'),
      utils = require('../lib/utils');

const numNodes = 5;
const logger = Logger({ minLevel: 4 });

const nodeOpts = _.range(numNodes).map(e => ({
  ip: '127.0.0.1',
  port: 4000 + e,
  logger: logger
}))



const internals = {};
internals.nodes = [];

describe('router', () => {
  before(done => {
    Promise.all(nodeOpts.map(opt => Node(opt))).then(nodes => {
      internals.nodes = nodes;
      done();
    });
  });

  // false hope... for now
  describe('#updateContact', () => {
    it('add contact to empty bucket', done => {
      const fromIndex = utils.getRandomRange(0, numNodes - 1);
      var toIndex = fromIndex;
      while (fromIndex === toIndex) toIndex = utils.getRandomRange(0, numNodes - 1)
      
      const from = internals.nodes[fromIndex]
      const to = internals.nodes[toIndex]
      const index = magic.getBucketIndex(from.id, to.id)
      from.router.updateContact(Contact.fromNode(to));
      expect(from.router._buckets[index][0].id).to.equal(to.id);
      done();
    });
    
    it('add contact to partially full bucket', done => {
      const fromIndex = utils.getRandomRange(0, numNodes - 1)
      var toIndex = fromIndex;
      while (fromIndex === toIndex) toIndex = utils.getRandomRange(0, numNodes - 1)
      
      const from = internals.nodes[fromIndex];
      const to1 = Contact.fromNode(internals.nodes[toIndex]);
      const to2 = Contact.fromNode(internals.nodes[toIndex]);
      const index = magic.getBucketIndex(from.id, to1.id);
      //console.log(magic.getRandomInBucketRangeBuffer(index))
      from.router.updateContact(to1);
      from.router.updateContact(to2);
      //console.log(from.router._buckets[index])
      done()
    });
  })
  
  it('#getNearestNodes', (done) => {
    internals.nodes[0].router.updateContact(internals.nodes[1].asContact());
    internals.nodes[0].router.getNearestNodes(internals.nodes[1].id).then(() => { done() });
  });
});