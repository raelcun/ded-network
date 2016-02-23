'use strict';

const assert = require('assert'),
			_ = require('lodash');

module.exports = options => {
  const contact = _.extend({}, {
    lastSeen: Date.now()
  }, options);
  
  assert(contact.id !== undefined, 'id is required');
  assert(contact.ip !== undefined, 'ip is required');
  assert(contact.port !== undefined, 'port is required');
  
  return contact;
};