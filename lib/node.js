'use strict';

const assert = require('assert'),
      Contact = require('./contact'),
      Command = require('./command'),
      Router = require('./router'),
      _ = require('lodash'),
      utils = require('./utils'),
      Logger = require('./logger'),
      crypto = require('./crypto');

const Node = options => {
  options = _.extend({}, {
    id: utils.generateId(),
    logger: Logger()
  }, options);
  
  assert(options.ip !== undefined, 'ip address is required');
  assert(options.port !== undefined, 'port is required');
  
  const newNode = _.clone(options);
  
  return Router(newNode).then(router => {
    const ping = node => newNode.router.sendCommand(Command.createPingReq(newNode.asContact(), node.asContact()));
    const sendMessage = (node, strMessage) => newNode.router.sendCommand(Command.createMessageReq(newNode.asContact(), node.asContact(), strMessage));
    const find = node => newNode.router.sendCommand(Command.createFindReq(newNode.asContact(), node.asContact(), newNode.publicKey));
    const retrieveContacts = (contact, state) => {
      return newNode.router.sendCommand(Command.createRetrieveContactReq(newNode.asContact(), contact, state));
    }
    
    const connect = node => {
      return new Promise((resolve, reject) => {
        newNode.router.updateContact(node.asContact());
        newNode.router.getNearestNodes(newNode.id).then(result => {
          newNode.router.refreshBucketsBeyondClosest(result)
          // TODO: more magic
          resolve(true)
        });
      })
    };
    
    const keyPair = crypto.generateKeyPair();
    newNode.publicKey = keyPair.public;
    newNode.privateKey = keyPair.private;
    
    newNode.close = router.close;
    newNode.ping = ping;
    newNode.sendMessage = sendMessage;
    newNode.connect = connect;
    newNode.router = router;
    newNode.sendCommand = router.sendCommand;
    newNode.find = find;
    newNode.asContact = () => Contact.fromNode(newNode);
    newNode.retrieveContacts = retrieveContacts;
    
    return newNode;
  });
};
Node.__classId = 'NODE';

module.exports = Node;