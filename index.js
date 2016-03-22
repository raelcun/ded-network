const Node = require('./lib/node')
const utils = require('./lib/utils')

const n = Node({ username: 'test' })
console.log(n)
console.log(utils.generateId('test'))