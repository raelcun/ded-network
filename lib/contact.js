'use strict';

module.exports = (id, ip, port) => {
  const newNode = {
    id,
    ip,
    port,
    lastSeen: Date.now()
  };
  
    return newNode;
};