const constants = require('./constants'),
      rack = require('hat').rack(constants.B);

module.exports = {
  generateId: (data) => data === undefined ? rack() : rack(data),
  default: (input, def) => input === undefined ? def: input,
  objIsFactory: (instance, constructor) => instance.__classId === constructor.__classId,
  getRandomRange: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
};