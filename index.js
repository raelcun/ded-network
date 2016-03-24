'use strict';

const Node = require('./lib/node'),
      constants = require('./lib/constants'),
      rack = require('hat').rack(constants.B),
      magic = require('./lib/magic'),
			_ = require('lodash'),
			Logger = require('./lib/logger');

let numNodes = 20;
const debug = false;
const logger = Logger({ minLevel: debug ? 0 : 3, maxLevel: 4 });
const nodeOpts = _.range(numNodes).map(e => { return { ip: '127.0.0.1', port: 3100 + e, logger}; });

const internals = {};

// main needed for async
const main = async () => {
  logger.warn('nodes initializing');
  const nodes = await Promise.all(nodeOpts.map((opts, i) => Node((i+1).toString(), opts)));

  logger.warn('nodes connecting');
  for (let i = 1; i < nodes.length; i++){
    await nodes[i].connect(nodes[0]);
  }
  logger.warn('finished connecting');


  process.stdin.on('data', async text => {
    const input = text.toString().trim().split(' ');

    if (input[0] == 'close'){
      logger.warn('nodes closing');
      nodes.map(e => e.close());
    }
    if (input[0] == 'exit'){
      process.exit();
    }

    if (input[0] == 'key'){
      const key = await nodes[Number(input[1])-1].findPublicKeyP(input[2]);
      console.log(key);
    }

    if (input[0] == 'allbuckets'){
      nodes.forEach(node => {
        logger.warn('node', node.username);
        node.router._buckets.forEach((bucket, j) => {
          console.log(j, bucket.filter(e => e !== undefined).map(e => e.username));
        });
      });
    }

    if (input[0] == 'buckets'){
      nodes[Number(input[1])-1].router._buckets.forEach((bucket, j) => {
        console.log(j, bucket.filter(e => e !== undefined).map(e => e.username));
      });
    }

    if(input[0] == 'message'){
      const message = _.slice(input, 3).join(' ') || 'hello';
      const key = await nodes[Number(input[1])-1].findPublicKeyP(input[2]);
      const response = await nodes[Number(input[1])-1].sendMessage(input[2], message, key);
      console.log('response', response);
    }

    if(input == 'addNode'){
      const id = ++numNodes;
      console.log(id);
      const node = await Node((id).toString(), { ip: '127.0.0.1', port: 3100 + id, logger});
      nodes.push(node);
      await nodes[id-1].connect(nodes[0]);
    }

  });

}

main();
