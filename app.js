'use strict';

require('babel-polyfill')

const Node = require('./lib/node'),
      Contact = require('./lib/contact'),
      utils = require('./lib/utils'),
			_ = require('lodash'),
			Logger = require('./lib/logger');

const debug = true;
const logger = Logger({ minLevel: debug ? 0 : 3, maxLevel: 4 });

let node;
const serverName = '0';
const serverId = utils.generateId(serverName);
const serverOpts = { username: serverName, ip: '127.0.0.1', port: 3000, logger };
serverOpts.publicKey = 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUE5dVFQRWZodVhhSUptWkM1OXp2VQpvcGtCSnorTEY3cmZwQlFOTWhtQVlpc1R3UW4ydzRodWdQTlZRUWIva2IwcVV4RlJSWmZjbDIyb2txdXNLK3M0CmRidkx4RzVRR3JBS0VqdHd4Qks1OGVOTjV2UEZlMjAyUXhYc3ZtcEVWdDM3dVQvUW1NU3ZDRUdHMDkvUi9MdVoKM2MvOGlTWjcvL1FSSnlJbVRZRXpJUy92K1ZBbnpDOFlvWkFpaTFKSmJ1Mmo0NkJuQnBEakxVOGdTbVBwMTNWTAp6N0loSEJxZmZrZ01xMVFaVEJFTHBmVEdzS3VLZHNPNUFQNjdDWGhHSC9wa2xZTW1VNGQ0R3lYeDM5ODdUS3lOCjVLUVY0MDJLNlZzaWoxRzRLSHpzdjJiWENDR1dCNGlWYlVJMm1yOWo4d212VVVxazdCVVN2WVQ5OWdZTzh1TE0Ka1FJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg=='

// main needed for async
const main = async (num) => {

  if (num == '0'){
    serverOpts.privateKey = 'LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcFFJQkFBS0NBUUVBOXVRUEVmaHVYYUlKbVpDNTl6dlVvcGtCSnorTEY3cmZwQlFOTWhtQVlpc1R3UW4yCnc0aHVnUE5WUVFiL2tiMHFVeEZSUlpmY2wyMm9rcXVzSytzNGRidkx4RzVRR3JBS0VqdHd4Qks1OGVOTjV2UEYKZTIwMlF4WHN2bXBFVnQzN3VUL1FtTVN2Q0VHRzA5L1IvTHVaM2MvOGlTWjcvL1FSSnlJbVRZRXpJUy92K1ZBbgp6QzhZb1pBaWkxSkpidTJqNDZCbkJwRGpMVThnU21QcDEzVkx6N0loSEJxZmZrZ01xMVFaVEJFTHBmVEdzS3VLCmRzTzVBUDY3Q1hoR0gvcGtsWU1tVTRkNEd5WHgzOTg3VEt5TjVLUVY0MDJLNlZzaWoxRzRLSHpzdjJiWENDR1cKQjRpVmJVSTJtcjlqOHdtdlVVcWs3QlVTdllUOTlnWU84dUxNa1FJREFRQUJBb0lCQUZicXN1T0FzbG9FVVp6ZQpkcG16Vm9obmxTQmNIbnVjTGw5MUw3QVRpajhGSzA4cVV0VkRrcU9UQnRCOXhqdG9mUjRCV3J0RlcwTjBONFJyCks1SEtuWFhWUjBkQURyTldoalVrOSs0UEthY2VmcTV2NDNZd1hJb0JqZmI3TWxQaWtsd0ZPMHFNODVIVWY4TFgKYVBXd2xkcWcvaWJLaFp6Mkw1TzNVZ1MzRjJqMjVsNlRFTEo3RDBEcTFVRkxSY3lQVEJMOTd0QkxjTlBUR3J1Rwp4djNseXFQamtlSFJSN1c0VFlueERPbTJISjhKaG9GemNYWkE3bkt0Y291a1ZCTmxwR0hCU0E2QTIyV2pudXJ4CnhpVUhkYkpiWVhZSVVTOUFqTVFhNTBWSTR3WDNmWVRqMUY5NStwWkFLVDRianNYaHE5cTVsdHNYeEwzM2lja0kKVVlVRUtBRUNnWUVBL2hoeXFOUE1MRWNJdFp6cGkzMXcyNnEvenI3N21tSi83UXZheVpCREI4UFY5bVZHVVRiego3UXArWGgvdU9LbnBWQ2cyUVd5T2liVE5xb3NjeitvczlwSXVsSGtROSs2Mm9xbXhZcE9mUFpmVEc5VlZsL2YzCjF5VVM3Ym1zNWFtRUpNdkRnd2c5TEZ4dngvMllLZ3NUakRJMlFIcjVacFptdEw0akVDRUVnRmtDZ1lFQStMM0oKY1dxV0NISzlKaU9wbzhKaWx0ZlZrV0FsYlY4dWpPbW9zdDMwdnNwZThYMUdMTk01R2tjRkRsQ3NoS0xiR085KwpUcHovMzR2TEdvTVRDRHVObkJiTHd3Z3F3elZTZjdHT08rTW5TckFMVjVrTFpiaThkWjJrN0NsbGFyRjJ0L1Q4Ckp0Z1VGaWYxbHNGUSt3dEpCbWE5NnNmdnBZVkFTVFpEL09XQzV2a0NnWUVBOXNTSmZqcUxIQ2swWlNScGo4V1kKZUUxZ2tBbmNVZmY5SXhxVE5aTzc5V3VVZlFHb0E3R3B2WGltZHdUdGx1dzBwVDJVUzMrQkFtMnNHMGVWQ0xyMQpSZFY4RlVkcVdrN2o0aCtKSFNJZTBYT0VXNUNZMnNqQVVwbzN3dFhDK3h2aE1OY1BIazgvRWJrSCtpTG54MVVRCmUrUTcyZTFVRHZSYjlJWi9pT2QzOXFrQ2dZRUFwN2RvQlZZbDFZcHY2VEJ3cUo5ZjFHK3hhL1ZWSnhyZmkxbmQKU3NXSHljRXdKVW9mc0FlMzMvVDAvc0w4bis0akp2d013VHJ3K0MwTkJGSk8yZVUxeFlKRlg3cTVBcWlJZU5zaQptVlMvWUllMURocCthZGNYRTRMNCtkZXJyelg3WTJ3SFBMWERUWEVpRWNWRk1oQlk2NzBJM3k1eWNydVhMZ1l0CjcyNWRSaGtDZ1lFQXgrTU43cE5MWHExaXNKZm12OVZweFJwM3lNa0E5cWpwRGJMQUt6NFZ3d2FmMnphU2drb0oKeXMzaXVERFZiWDQ0amh2TlpNV0drMFVROHNjdGFoSUdyODBTQVRIYnNzUXBRYTVyYXJiZURBb3Z5QUV6bWgyYwoyOHJOMVB1ZE1HNW1aaGFOVkFYUEJBREpiL2dUUVFIWWhGWFRBMEFrenoxL1QwVHUxMlkzYUdjPQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo='
    node = await Node(serverOpts);
    logger.warn('server up');
  }
  else {
    node = await Node({ username: num, ip: '127.0.0.1', port: 3000 + Number(num), logger });
    serverOpts.id = serverId;
    await node.connect(Contact(serverOpts));
    logger.warn(`${node.username} connected to server`);
  }

  process.stdin.on('data', async text => {
    const input = text.toString().trim().split(' ');

    if (input[0] == 'close'){
      logger.warn(`node ${node.username} closing`);
      nodes.map(e => e.close());
    }
    if (input[0] == 'exit'){
      process.exit();
    }

    if (input[0] == 'key'){
      const key = await node.findPublicKey(input[1]);
      console.log(key);
    }

    if (input[0] == 'buckets'){
      logger.warn(`node ${node.username}`);
      node.router.buckets.forEach((bucket, j) => {
        if (bucket.length > 0){
          console.log(j, bucket.filter(e => e !== undefined).map(e => e.username));
        }
      });
    }

    if(input[0] == 'message'){
      const message = _.slice(input, 2).join(' ') || 'hello';
      const response = await node.sendMessage(input[1], message);
      console.log('response', response);
    }

  });
}

main(process.argv[2]);
