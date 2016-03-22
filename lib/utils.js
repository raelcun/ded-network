const constants = require('./constants'),
			rack = require('hat').rack(constants.B),
			crypto = require('crypto')

module.exports = {
	generateId: (data) => crypto.createHash('sha1').update(data).digest('hex'),
  generateMessageId: () => rack(),
  objIsFactory: (instance, constructor) => instance.__classId === constructor.__classId,
  getRandomRange: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
}