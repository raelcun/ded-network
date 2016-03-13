'use strict';

const assert = require('assert'),
			_ = require('lodash'),
      crypto = require('./crypto');

const identifier = 'CONTACT';

const Contact = options => {
  const contact = _.extend({}, {
    lastSeen: Date.now()
  }, options);
  
  assert(contact.ip !== undefined, 'ip is required');
  assert(contact.port !== undefined, 'port is required');
  
  // const keyPair = crypto.generateKeyPair();
  // if (contact.publicKey === undefined || contact.privateKey === undefined) {
  //   contact.publicKey = keyPair.public;
  //   contact.privateKey = keyPair.private;
  // }
  
  contact.__classId = identifier;

  return contact;
};

Contact.fromNode = node => {
	assert(node.publicKey !== undefined, 'contact requires public key')
	return Contact({ id: node.id, ip: node.ip, port: node.port, publicKey: node.publicKey, privateKey: node.privateKey });
}
Contact.__classId = identifier;

module.exports = Contact;