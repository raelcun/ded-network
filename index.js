'use strict';

const Node = require('./lib/node'),
      constants = require('./lib/constants'),
      rack = require('hat').rack(constants.B),
      magic = require('./lib/magic'),
			_ = require('lodash');

const id = magic.getRandomInBucketRangeBuffer(140);

/*
const numNodes = 2;
const nodeOpts = _.range(numNodes).map(e => { return { ip: '127.0.0.1', port: 3100 + e } });
console.log(nodeOpts);
const nodesP = nodeOpts.map(opt => Node(opt));

Promise.all(nodesP).then(nodes => {
  nodes[0].sendMessage(nodes[1], 'hello').then(result => console.log('find result', result));
  // nodes[0].find(nodes[1]).then(result => {
  //   console.log('find response', result);
  // });
});
*/
const numNodes = 2;
const nodeOpts = [{id: '6bb852acbce77aa6bf09a36a81c45f358e3207bc', ip: '127.0.0.1', port: 3100}, {id: '0888b900099c87050ee5aa3efb253b830fdee8b9', ip: '127.0.0.1', port: 3101}]
const nodesP = nodeOpts.map(opt => Node(opt));

Promise.all(nodesP).then(nodes => {
  nodes.forEach(e => e.close(() => console.log('closed')));
});