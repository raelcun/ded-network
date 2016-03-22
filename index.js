require('babel-polyfill')

const Node = require('./lib/node')
const utils = require('./lib/utils')

const n = Node({ username: 'test' }).then(a => console.log(a))
console.log(n)
console.log(utils.generateId('test'))