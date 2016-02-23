'use strict';

const Node = require('./lib/node'),
			_ = require('lodash');

const numNodes = 2;
const nodeOpts = _.range(numNodes).map(e => { return { addr: '127.0.0.1', port: 3100 + e } });
const nodesP = nodeOpts.map(opt => Node(opt.id, opt.addr, opt.port));
Promise.all(nodesP).then(nodes => {
  nodes[0].connect(nodes[1]);
});