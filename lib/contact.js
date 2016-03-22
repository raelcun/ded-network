const assert = require('assert'),
			_ = require('lodash')
			
const identifier = 'CONTACT'

const Contact = ({ id, username, ip, port, publicKey, lastSeen = Date.now() }) => {
	assert(ip !== undefined, 'ip is required')
	assert(port !== undefined, 'port is required')
	
	return { __classId: identifier, id, username, ip, port, publicKey, lastSeen }
}
Contact.__classId = identifier

Contact.fromNode = node => {
	let { username, id, ip, port, publicKey } = node
	return Contact({ id, username, ip, port, publicKey })
}

module.exports = Contact