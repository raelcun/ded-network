const assert = require('assert'),
      constants = require('./constants')

exports.isValidKey = key => {
  return !!key && key.length === constants.B / 4
}

exports.bufferToHex = buffer => buffer.toString('hex')

exports.hexToBuffer = hexString => {
  var buf = new Buffer(constants.K)
  buf.write(hexString, 0, 'hex')
  return buf
}

exports.getDistance = (id1, id2) => {
  assert(exports.isValidKey(id1), 'Invalid key supplied')
  assert(exports.isValidKey(id2), 'Invalid key supplied')

  var distance = new Buffer(constants.K)
  var id1Buf = exports.hexToBuffer(id1)
  var id2Buf = exports.hexToBuffer(id2)

  for(var i = 0; i < constants.K; ++i) {
    distance[i] = id1Buf[i] ^ id2Buf[i]
  }

  return distance
}

exports.getBucketIndex = (id1, id2) => {
  assert(exports.isValidKey(id1), 'Invalid key supplied')
  assert(exports.isValidKey(id2), 'Invalid key supplied')

  var distance = exports.getDistance(id1, id2)
  var bucketNum = constants.B

  for (var i = 0; i < distance.length; i++) {
    if (distance[i] === 0) {
      bucketNum -= 8
      continue
    }

    for (var j = 0; j < 8; j++) {
      if (distance[i] & (0x80 >> j)) {
        return --bucketNum
      }
      bucketNum--
    }
  }

  return bucketNum
}

exports.compareKeys = (b1, b2) => {
  assert.equal(b1.length, b2.length)

  for (var i = 0; i < b1.length; ++i) {
    if (b1[i] !== b2[i]) {
      return b1[i] < b2[i] ? -1 : 1
    }
  }

  return 0
}