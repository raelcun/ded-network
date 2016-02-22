'use strict';

const assert = require('assert'),
      hat = require('hat'),
      Command = require('./command'),
      Router = require('./router'),
      _ = require('lodash'),
      constants = require('./constants');

module.exports = (id, ip, port) => {
  id = id || hat.rack();
  
  const newNode = {
    id,
    ip,
    port
  };
  return Router(newNode).then(router => {
    newNode.router = router;
    
    const ping = (node) => {
      const ping = Command.createPing(node);
      return newNode.router.sendCommand(ping);
    };
    
    newNode.ping = ping;
  
    return newNode;
  });
};