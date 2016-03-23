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

exports.getPowerOfTwoBuffer = exp => {
  assert.ok(exp >= 0 && exp < constants.B)

  var buffer = new Buffer(constants.K)
  var byte = parseInt(exp / 8)

  // we set the byte containing the bit to the right left shifted amount
  buffer.fill(0)
  buffer[constants.K - byte - 1] = 1 << (exp % 8)

  return buffer
}

exports.getRandomInBucketRangeBuffer = index => {
  var base = exports.getPowerOfTwoBuffer(index)
  var byte = parseInt(index / 8) // randomize bytes below the power of two

  for (var i = constants.K - 1; i > (constants.K - byte - 1); i--) {
    base[i] = parseInt(Math.random() * 256)
  }

  // also randomize the bits below the number in that byte
  // and remember arrays are off by 1
  for (var j = index - 1; j >= byte * 8; j--) {
    var one = Math.random() >= 0.5
    var shiftAmount = j - byte * 8

    base[constants.K - byte - 1] |= one ? (1 << shiftAmount) : 0
  }

  return base
}