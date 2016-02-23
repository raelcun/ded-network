'use strict';

const Node = require('./lib/node'),
			_ = require('lodash');

const numNodes = 2;
const nodeOpts = _.range(numNodes).map(e => { return { ip: '127.0.0.1', port: 3100 + e } });
console.log(nodeOpts);
const nodesP = nodeOpts.map(opt => Node(opt));

Promise.all(nodesP).then(nodes => {
  nodes[0].ping(nodes[1]).then(result => console.log(result));
  // nodes[0].find(nodes[1]).then(result => {
  //   console.log('find response', result);
  // });
});