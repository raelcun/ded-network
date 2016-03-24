'use strict';

const assert = require('assert'),
      Contact = require('./contact'),
      Command = require('./command'),
      Router = require('./router'),
      _ = require('lodash'),
      utils = require('./utils'),
      Logger = require('./logger'),
      crypto = require('./crypto'),
      pkStore = require('./pkStore');

const Node = (username, options) => {
  options = _.extend({}, {
    id: utils.generateId(username),
    logger: Logger()
  }, options);

  assert(options.ip !== undefined, 'ip address is required');
  assert(options.port !== undefined, 'port is required');

  const newNode = _.clone(options);

  return Router(newNode).then(router => {
    const ping = async contact => await newNode.router.sendCommand(Command.createPingReq(newNode.asContact(), contact));
    const sendMessage = (username, strMessage, destPublicKey) => newNode.router.sendMessage(utils.generateId(username), strMessage, destPublicKey);
    const findPublicKeyP = username => {
      return newNode.router.findPublicKeyP(utils.generateId(username));
    }
    const retrieveContacts = async (contact, state) =>
      await newNode.router.sendCommand(Command.createRetrieveContactReq(newNode.asContact(), contact, state))

    const connect = node => {
      assert(node.id !== newNode.id);
      newNode.logger.debug(newNode.username, ' is attempting to connect to ', node.username);
      return Promise.resolve()
        .then(() => newNode.router.updateContactP(node.asContact()))
        .then(() => {
          return newNode.router.getNearestNodesP(newNode.id);
        })
        .then(result => newNode.router.refreshBucketsBeyondClosestP(result))
        .then(() => {
          newNode.logger.debug(newNode.username, ' connected to ', node.username);
          return true;
        });
    };

    const keyPair = crypto.generateKeyPair();
    newNode.publicKey = keyPair.public;
    newNode.privateKey = keyPair.private;
    pkStore[newNode.id] = { publicKey: newNode.publicKey, privateKey: newNode.privateKey }; // TODO: remove

    newNode.username = username;
    newNode.close = router.close;
    newNode.ping = ping;
    newNode.sendMessage = sendMessage;
    newNode.connect = connect;
    newNode.router = router;
    newNode.sendCommand = router.sendCommand;
    newNode.asContact = () => Contact.fromNode(newNode);
    newNode.retrieveContacts = retrieveContacts;
    newNode.findPublicKeyP = findPublicKeyP;

    return newNode;
  });
};
Node.__classId = 'NODE';

module.exports = Node;
