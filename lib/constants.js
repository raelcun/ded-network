'use strict';

module.exports = {
  ALPHA: 3,
  B: 160, // address length
  K: 20,
  MESSAGE_TYPES: [
    'PING',
    'PING_RESPONSE',
    'CONNECT',
    'CONNECT_RESPONSE',
    'MESSAGE',
    'MESSAGE_RESPONSE',
    'RETRIEVE_CONTACTS',
    'RETRIEVE_CONTACTS_RESPONSE'
  ],
  RESPONSE_TIMEOUT: 5000,
  SIGNATURE_SIZE: 344,
  test: 0
};