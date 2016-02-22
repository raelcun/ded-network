'use strict';

const hat = require('hat');

const createCommand = (ip, port, command, payload) => {
  return {
    id: hat.rack(),
    ip,
    port,
    command,
    payload
  };
};

const createMessage = (node, message) => {
  return createCommand(node.ip, node.port, 'MESSAGE', {
    destinationID: node.id,
    message: message
  });
};

const createPing = (node) => {
  return createCommand(node.ip, node.port, 'PING');
};

const encode = (command) => {
  return JSON.stringify(command);
};

const decode = (str) => {
  return JSON.parse(str);
};

module.exports = {
  createMessage,
  createPing,
  encode,
  decode
};