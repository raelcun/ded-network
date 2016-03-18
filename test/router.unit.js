'use strict';

const expect = require('chai').expect,
      Contact = require('../lib/contact'),
      Node = require('../lib/node'),
      magic = require('../lib/magic'),
      _ = require('lodash'),
      Logger = require('../lib/logger'),
      constants = require('../lib/constants'),
      utils = require('../lib/utils');

const numNodes = 10;
const debug = false;
const logger = Logger({ minLevel: debug ? 1 : 3, maxLevel: 4 });

const nodeOpts = _.range(numNodes).map(e => ({
  ip: '127.0.0.1',
  port: 4000 + e,
  logger: logger
}))

const internals = {};

describe('router', () => {
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

  // false hope... for now
  describe('#updateContact', () => {
    it('add contact to empty bucket', done => {
      const fromIndex = utils.getRandomRange(0, numNodes - 1);
      var toIndex = fromIndex;
      while (fromIndex === toIndex) toIndex = utils.getRandomRange(0, numNodes - 1)
      
      const from = internals.nodes[fromIndex]
      const to = internals.nodes[toIndex]
      const index = magic.getBucketIndex(from.id, to.id)
      from.router.updateContactP(Contact.fromNode(to));
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
      var newId = null;
      while (newId === null || magic.getBucketIndex(from.id, newId) !== index)
        newId = utils.generateId(utils.getRandomRange(1, 1000000).toString());
      to2.id = newId;
      expect(magic.getBucketIndex(from.id, to2.id)).to.equal(index);
      from.router.updateContactP(to1);
      from.router.updateContactP(to2);
      expect(_.includes(from.router._buckets[index].map(e => e.id), to1.id))
      expect(_.includes(from.router._buckets[index].map(e => e.id), to2.id))
      done()
    });
  });
  
  it('#getNearestContacts', (done) => {
    const BaseNode = internals.nodes[0];
    const nodes = _.slice(internals.nodes, 1, internals.nodes.length);
    
    nodes.forEach(node => {
      BaseNode.router.updateContactP(node.asContact());
    });
    
    const contacts = BaseNode.router._getNearestContacts(nodes[0].id, constants.ALPHA, BaseNode.id);
    const index = magic.getBucketIndex(BaseNode.id, nodes[0].id);
    
    expect(contacts.length === constants.ALPHA);
    
    contacts.forEach(contact => {
      expect(contact.id != nodes[0].id);
    });
    
    var distance = nodes.map(node => ({ id: node.id, distance: magic.getDistance(nodes[0].id, node.id) }));
    
    distance.sort(function sortKeysByDistance(a, b) {
        return magic.compareKeys(a.distance, b.distance);
    });
    
    distance = distance.splice(1, 3);
    
    distance.forEach(e => expect(_.includes(contacts, e)));

    done();
  });

  it('#refreshBucketsBeyondClosest', (done) => {
    const BaseNode = internals.nodes[0];
    const nodes = _.slice(internals.nodes, 1, internals.nodes.length);
    var p = Promise.resolve();

    const connect = (newNode, node) => {
      return Promise.resolve()
        .then(() => newNode.router.updateContactP(node.asContact()))
        .then(() => newNode.router.getNearestNodesP(node.id))
        .then(result => {
          newNode.router.refreshBucketsBeyondClosestP(result);
          return true;
        });
    }

    nodes.forEach(node => {
      p = p.then(() => connect(node, BaseNode)).then(result => expect(result === true));
    });
    
    p = p.then(() => {
      done();
    });
  });
  
  it('#findPublicKey', done => {
    var source = internals.nodes[0];
    var nodes = _.slice(internals.nodes, 1, internals.nodes.length);
    var p = Promise.resolve();
    nodes.forEach(e => {
      p = p.then(() => {
        return e.connect(source)
      })
    });
    p.then(() => {
      const findKey = source.findPublicKeyP('9');
      findKey.then(result => {
        console.log('result', result);
        expect(result).to.be.a('string');
        expect(result).to.equal(internals.nodes[9].publicKey);
        done();
      }).catch(error => {
        done(error);
      });
    });
  });
  
});