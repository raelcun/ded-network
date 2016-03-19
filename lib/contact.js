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
  
  contact.__classId = identifier;

  return contact;
};

Contact.fromNode = node => {
	assert(node.publicKey !== undefined, 'contact requires public key')
	return Contact({ username: node.username, id: node.id, ip: node.ip, port: node.port, publicKey: node.publicKey });
}
Contact.__classId = identifier;

module.exports = Contact;