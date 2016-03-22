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
		if (command.strCommand === 'RETRIEVE_CONTACTS') {
			const state = command.payload.state
			
			//const contacts = getNearestContacts()
			
			let { sourceId: destId, sourceIP: destIp, sourcePort: destPort, sourceUsername: destUsername } = command.payload
			rpc.sendCommand(Command.createRetrieveContactsRes({ sourceContact, destContact: Contact({ id: destId, ip: destIp, port: destPort, username: destUsername }), orgRequestId: command.id, state }))
		}
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
		
		return contact
	}
	
	const lookup = async contactID => {
		const state = {
			key: contactID,
			queryId: utils.generateMessageId(),
			contact: sourceContact,
			limit: constants.ALPHA,
			contacted: [],
			contactlist: [],
			closestNode: null,
			previousClosestNode: null
		}
		
		state.contacted.push(sourceContact.id)
		state.contactlist = getNearestContacts(contactID, state.limit, sourceContact.id)
		state.closestNode = state.contactlist[0]
		state.closestNodeDistance = magic.getDistance(state.key, state.closestNode.id)
		
		return await iterativeFind(contactID, state)
	}
	
	const iterativeFind = async (contactID, state) => {
		while (state.contactlist.length > 0) {
			//const queryContacts = state.contactlist.splice(0, state.limit)
			const queryContacts = _.reject(state.contactlist, e => _.includes(state.contacted, e.id))
			if (queryContacts.length === 0) break
			
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
					updateContact(queryContacts[i])
					state.contacted.push(queryContacts[i].id)
					
					const distance = magic.getDistance(state.key, queryContacts[i].id)
					if (magic.compareKeys(distance, state.closestNodeDistance) === -1) {
						state.previousClosestNode = state.closestNode
						state.closestNode = queryContacts[i]
						state.closestNodeDistance = distance
					}
					
					state.contactlist = _.uniqBy(_.concat(state.contactlist, query.value().payload.state.contactlist), 'id')
					state.contacted = _.uniq(_.concat(state.contacted, query.value().payload.state.contacted))
				} else {
					logger.warn(`query to ${queryContacts[i].username} failed with reason ${query.reason()}`)
					// element was already removed from the contactlist, so no need to do it again here
				}
			}
		}
		
		return state
	}
	
	const getNearestContacts = (contactID, limit, sourceID) => {
		const index = magic.getBucketIndex(sourceID, contactID)
		
		const nearestBlob = []
		let i = 1
		buckets[index].forEach(e => nearestBlob.push(e))
		while (nearestBlob.length < limit && i < constants.B) {
			if (index + i < constants.B) buckets[index+i].forEach(e => nearestBlob.push(e))
			if (index - i >= 0) buckets[index-i].forEach(e => nearestBlob.push(e))
			i++
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
		lookup,
		iterativeFind,
		updateContact,
		getNearestContacts
	}
}