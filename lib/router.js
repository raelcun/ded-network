require('babel-polyfill')

const Command = require('./command'),
			Contact = require('./contact'),
			constants = require('./constants'),
			utils = require('./utils'),
			RPC = require('./rpc'),
			Logger = require('./logger'),
			magic = require('./magic'),
			assert = require('assert'),
			_ = require('lodash'),
			Promise = require('bluebird')
			
module.exports = async ({ sourceContact, logger: logger = Logger() }) => {
	const buckets = _.range(constants.B).map(e => [])
	
	const rpc = await RPC({ contact: sourceContact, logger, handleCommand: async command => {
		console.log('received command', commad)
	}})
	
	const updateContact = contact => {
		logger.debug(`${sourceContact.username} is updating buckets with contact ${contact.username}`)
		const bucketIndex = magic.getBucketIndex(sourceContact.id, contact.id)
		const bucket = buckets[bucketIndex]
		const foundAt = _.findIndex(bucket, e => e.id === contact.id)
		if (foundAt !== -1) {
			bucket[foundAt].lastSeen = Date.now()
		} else if (bucket.length < constants.K) {
			contact.lastSeen = Date.now()
			bucket.push(contact)
		} else {
			// TODO: implement ping here
		}
		
		bucket.sort(e => e.lastSeen)
	}
	
	const iterativeFind = async contactID => {
		const state = {
			key: contactID,
			queryId: utils.generateMessageID(),
			contact: sourceContact,
			limit: constants.ALPHA,
			contacted: [sourceContact.id],
			contactlist: [],
			closestNode: null,
			previousClosestNode: null
		}
		
		state.contactlist = getNearestContacts(contactID, state.limit, sourceContact.id)
		state.closestNode = state.contactlist[0]
		state.closestNodeDistance = magic.getDistance(state.key, state.closestNode.id)
		
		//while (state.contactlist.length > 0) {
			const queryContacts = state.contactlist.splice(0, state.limit)
			
			// construct ALPHA queries
			const queries = queryContacts.map(contact => {
				const command = Command.createRetrieveContactsReq({ sourceContact, destContact: contact, state })
				return rpc.sendCommand(command).reflect()
			})
			
			// wait for all queries to finish
			const queryResults = await Promise.all(queries)
			for (let i = 0; i < queryResults.length; i++) {
				const query = queryResults[i]
				if (query.isFulfilled()) {
					console.log(query.value())
				} else {
					logger.warn(`query to ${queryContacts[i].username} failed with reason ${query.reason()}`)
					// element was already removed from the contactlist, so no need to do it again here
				}
			}
		//}
	}
	
	const getNearestContacts = (contactID, limit, sourceID) => {
		const index = magic.getBucketIndex(sourceID, contactID)
		
		const nearestBlob = []
		const i = 1
		buckets[index].forEach(e => nearestBlob.push(e))
		while (nearestBlob.length < limit && i < constants.B) {
			if (index + i < constants.B) buckets[index+i].forEach(e => nearestBlob.push(e))
			if (index - i >= 0) buckets[index-i].forEach(e => nearestBlob.push(e))
		}
		
		return nearestBlob
			.map(contact => ({ contact, distance: magic.getDistance(contact.id, contactID)}))
			.sort((a, b) => magic.compareKeys(a.distance, b.distance)) // sort keys by distance
			.splice(0, limit)
			.map(e => e.contact)
	}
	
	return {
		buckets,
		rpc,
		iterativeFind,
		updateContact,
		getNearestContacts
	}
}