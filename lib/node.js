'use strict';

const assert = require('assert'),
      Contact = require('./contact'),
      Command = require('./command'),
      Router = require('./router'),
      _ = require('lodash'),
      utils = require('./utils'),
      Logger = require('./logger'),
      crypto = require('./crypto');

module.exports = options => {
  options = _.extend({}, {
    id: utils.generateId(),
    logger: Logger()
  }, options);
  
  assert(options.ip !== undefined, 'ip address is required');
  assert(options.port !== undefined, 'port is required');
  
  const newNode = _.clone(options);
  
  return Router(newNode).then(router => {
    const ping = node => newNode.router.sendCommand(
      Command.createPingReq(newNode, node));
    const sendMessage = (node, strMessage) => newNode.router.sendCommand(
      Command.createMessageReq(newNode, node, strMessage));
    const find = node => newNode.router.sendCommand(
      Command.createFindReq(newNode, node, newNode.publicKey));
      
    const connect = node => {
      newNode.router.updateContact(Contact(node.id, node.ip, node.port));
      newNode.router.getNearestNodes(Contact(node.id, node.ip, node.port));
      // TODO: more magic
    };
    
    const keyPair = crypto.generateKeyPair();
    newNode.publicKey = keyPair.public;
    newNode.privateKey = keyPair.private;
    
    newNode.ping = ping;
    newNode.sendMessage = sendMessage;
    newNode.connect = connect;
    newNode.router = router;
    newNode.find = find;
    
    return newNode;
  });
};