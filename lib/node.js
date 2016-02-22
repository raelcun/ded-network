const assert = require('assert'),
      hat = require('hat'),
      Command = require('./command'),
      Router = require('./router'),
      _ = require('lodash'),
      constants = require('./constants')
      rpc = require('./rpc');

module.exports = () => {
  const id = hat.rack();
  
  const connect = (node, callback) => {
    // node.router.updateContacts();
    // node.router.findNode(id);
    // node.router.refreshBucketsBeyond();
  };
  
  const ping = (node, callback) => {
    
  };
  
  const sendMessage = (node, strMessage) => {
    const messsage = Command.createMessage(node.id, strMessage);
    // TODO: send command
  };
  
  const _sendCommand = (node, command) => {
    
  };
  
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
  
  const _messageHandler = (message) => {
    console.log('got a message!');
  };
  
  const _pingHandler = (message) => {
    console.log('got a ping!');
  };
  
  const node = {
    id,
    
    connect,
    ping,
    sendMessage
  };
  node.router = Router(node);
  
  return node;
};