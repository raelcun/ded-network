const constants = require('./constants'),
      rack = require('hat').rack(constants.B),
      _ = require('lodash'),
      crypto = require('crypto');

var i = 0

module.exports = {
  generateId: (data) => crypto.createHash('sha1').update(data).digest('hex'),
  generateMessageId: () => rack(),
  default: (input, def) => input === undefined ? def: input,
  objIsFactory: (instance, constructor) => instance.__classId === constructor.__classId,
  getRandomRange: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
};