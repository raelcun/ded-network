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
    }
    
    newNode.ping = ping;
    newNode.sendMessage = sendMessage;
    
    const connect = (node) => {
      newNode.router.updateContact(newNode, node);
    }
  
    return newNode;
  });
};