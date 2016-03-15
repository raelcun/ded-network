'use strict';

const Node = require('./lib/node'),
      constants = require('./lib/constants'),
      rack = require('hat').rack(constants.B),
      magic = require('./lib/magic'),
			_ = require('lodash'),
			Logger = require('./lib/logger');

const numNodes = 10;
const debug = true;
const logger = Logger({ minLevel: debug ? 0 : 4, maxLevel: 1 });
const nodeOpts = _.range(numNodes).map(e => { return { ip: '127.0.0.1', port: 3100 + e, logger}; });

const internals = {};

Promise.all(nodeOpts.map(opt => Node(opt))).then(nodes => {
	internals.nodes = nodes;
  var BaseNode = internals.nodes[0];
	var nodes = _.slice(internals.nodes, 1, internals.nodes.length);

	var p = Promise.resolve();
	nodes.forEach(node => {
	  p = p.then(() => {
	    return node.connect(BaseNode);
	  });
	});
	p.then(() => { 
	  console.log('test')
	})
});