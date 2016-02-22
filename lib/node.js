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
    port
  };
  
  if (routable === false) return newNode;
  
  return Router(newNode).then(router => {
    newNode.router = router;
    
    const ping = (node) => {
      const ping = Command.createPingReq(newNode, node);
      return newNode.router.sendCommand(ping);
    };
    
    newNode.ping = ping;
  
    return newNode;
  });
};