const assert = require('assert'),
      hat = require('hat'),
      Command = require('./command'),
      Router = require('./router'),
      _ = require('lodash'),
      constants = require('./constants');

module.exports = (id, ip, port) => {
  var id = id || hat.rack();
  
  const newNode = {
    id,
    ip,
    port
  };
  newNode.router = Router(newNode);

  const connect = (node, callback) => {
    // node.router.updateContacts();
    // node.router.findNode(id);
    // node.router.refreshBucketsBeyond();
  };
  
  const ping = (node, callback) => {
    const ping = Command.createPing(node);
    //console.log(ping);
    newNode.router.sendCommand(ping, callback);
  };
  
  // const sendMessage = (node, strMessage) => {
  //   const message = Command.createMessage(node.id, strMessage);
  //   _sendCommand(message);
  // };
  
  const _commandHandler = (command, callback) => {
    // validate command type
    assert(_.includes(command.type, constants.MESSAGE_TYPES, 'invalid message type'));
    
    // redirect control to the proper command handler
    const handlers = {
      'MESSAGE': _messageHandler,
      'PING': _pingHandler
    }
    handlers[command.type](command);
  };
  
  // const _messageHandler = (message) => {
  //   console.log('got a message!');
  // };
  
  const _pingHandler = (message) => {
    console.log('got a ping!');
  };
  
  newNode.connect = connect;
  newNode.ping = ping;

  return newNode;
};