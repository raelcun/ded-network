const Node = require('./lib/node'),
			_ = require('lodash');

const numNodes = 2;
const nodeOpts = _.range(numNodes).map(e => { return { id: e, addr: '127.0.0.1', port: 3100 + e } });
const nodes = nodeOpts.map(opt => Node(opt.id, opt.addr, opt.port));
setTimeout(() => {
	nodes[0].ping(nodes[1], (err, result) => {
		console.log('err', err);
		console.log('results', result);
	})
}, 1000);