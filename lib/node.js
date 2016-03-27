require('babel-polyfill')

const assert = require('assert'),
			_ = require('lodash'),
			utils = require('./utils'),
			Contact = require('./contact'),
			Router = require('./router'),
			Logger = require('./logger'),
			crypto = require('./crypto'),
			pkStore = require('./pkStore')

const identifier = 'NODE'
const Node = async ({ username, ip, port, publicKey, viewCommands, privateKey, logger: logger = Logger() }) => {
	const keyPair = crypto.generateKeyPair()
	const newNode = _.merge({}, { publicKey: keyPair.public, privateKey: keyPair.private }, {
		username,
		logger,
		ip,
		port,
		publicKey,
		privateKey,
		id: utils.generateId(username)
	})
	
	newNode.router = await Router({ sourceContact: Contact.fromNode(newNode), privateKey: newNode.privateKey, viewCommands, logger })

	const connect = async contact => {
		newNode.logger.debug(`${newNode.username} is connecting to ${contact.username}`)
		await newNode.router.updateContact(contact)
		await newNode.router.lookup(newNode.id)
		// TODO: test kicking off refresh buckets without waiting for it to complete
		//await newNode.router.refreshBucketsByondClosest()
		newNode.logger.debug(`${newNode.username} is connected to ${contact.username}`)
	}

	const requestPublicKey = async username => {
		console.log('node req')
		const id = utils.generateId(username)
    const bucket = router.buckets[magic.getBucketIndex(node.id, id)]

    // check if key is stored locally
    if (bucket) {
      const contactIndex = _.findIndex(bucket, e => e.id === id)
      if (contactIndex !== -1) { return bucket[contactIndex].publicKey }
    }

    // else send request to other nodes
		return router.requestPublicKey(id)
  }

	pkStore[newNode.id] = { publicKey: newNode.publicKey, privateKey: newNode.privateKey }

	newNode.setViewer = newNode.router.setViewer
	newNode.connect = connect
	newNode.requestPublicKey = requestPublicKey
	newNode.close = newNode.router.close
	newNode.asContact = () => Contact.fromNode(newNode)

	return newNode
}
Node.__classId = identifier

module.exports = Node
