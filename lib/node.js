'use strict';

const assert = require('assert'),
      hat = require('hat'),
      Command = require('./command'),
      Router = require('./router'),
      _ = require('lodash'),
      constants = require('./constants');

module.exports = (id, ip, port, routable) => {
  if (id === undefined) id = hat.rack(constants.B)();
  
  const newNode = {
    id,
    ip,
    port,
    lastSeen: Date.now()
  };
  
  if (routable === false) return newNode;
  
  return Router(newNode).then(router => {
    newNode.router = router;
    
    const ping = (node) => {
      const ping = Command.createPingReq(newNode, node);
      return newNode.router.sendCommand(ping);
    };
    
    const sendMessage = (node, messageString) => {
      const message = Command.createMessageReq(newNode, node, messageString);
      return newNode.router.sendCommand(message);
    };
    
    const connect = (node) => {
      newNode.router.updateContact(newNode, node);
    };
    
    const find = (node) => {
      //const findReq = Command.createFindReq(newNode, node, newNode.publicKey); // TODO: add public key functionality
      const findReq = Command.createFindReq(newNode, node, '12345'); // TODO: add public key functionality
      return newNode.router.sendCommand(findReq);
    };
    
    newNode.ping = ping;
    newNode.sendMessage = sendMessage;
    newNode.connect = connect;
    newNode.find = find;
  
    return newNode;
  });
};