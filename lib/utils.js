const constants = require('./constants'),
      rack = require('hat').rack(constants.B);

module.exports = {
  generateId: (data) => data === undefined ? rack() : rack(data)
};