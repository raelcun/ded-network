'use strict';

module.exports = {
  B: 160, // address length
  K: 20,
  MESSAGE_TYPES: [
    'PING',
    'PING_RESPONSE',
    'CONNECT',
    'CONNECT_RESPONSE',
    'MESSAGE',
    'MESSAGE_RESPONSE',
    'FIND',
    'FIND_RESPONSE'
  ],
  RESPONSE_TIMEOUT: 5000,
  SIGNATURE_SIZE: 344
};