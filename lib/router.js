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

module.exports = async({ sourceContact, logger: logger = Logger() }) => {
	const buckets = _.range(constants.B).map(e => [])
	const queryCache = []

	const rpc = await RPC({
		contact: sourceContact,
		logger,
		handleCommand: async command => {
			if (command.strCommand === 'RETRIEVE_CONTACTS') {
				const state = command.payload.state

				// stop if we already responded to the same message
				if (_.includes(queryCache, state.queryId)){
					state.contacted.push(sourceContact.id);
					state.contacted = _.uniq(state.contacted);
					let { sourceId: destId, sourceIP: destIp, sourcePort: destPort, sourceUsername: destUsername } = command.payload
					rpc.sendCommand(Command.createRetrieveContactsRes({
						sourceContact, destContact: Contact({
							id: destId,
							ip: destIp,
							port: destPort,
							username: destUsername
						}), orgRequestId: command.id, state: state
					}))
					return
				}
				queryCache.push(state.queryId)

				updateContact(state.contact)
				state.contacted.push(sourceContact.id)
				state.contactlist = _.uniqBy(_.concat(state.contactlist, getNearestContacts(state.key, state.limit, sourceContact.id)), 'id')

				const lookupState = await iterativeFind(state.key, state)

				let { sourceId: destId, sourceIP: destIp, sourcePort: destPort, sourceUsername: destUsername } = command.payload
				rpc.sendCommand(Command.createRetrieveContactsRes({
					sourceContact, destContact: Contact({
						id: destId,
						ip: destIp,
						port: destPort,
						username: destUsername
					}), orgRequestId: command.id, state: lookupState
				}))
			}
		}
	})

	const updateContact = contact => {
		if (contact.id === sourceContact.id) return contact
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
			limit: constants.K,
			contacted: [],
			contactlist: [],
			closestNode: null,
			previousClosestNode: null
		}

		queryCache.push(state.queryId)

		state.contacted.push(sourceContact.id)
		state.contactlist = getNearestContacts(contactID, state.limit, sourceContact.id)
		state.closestNode = state.contactlist[0]
		state.closestNodeDistance = magic.getDistance(state.key, state.closestNode.id)

		const finalState = await iterativeFind(contactID, state)

		finalState.contactlist.forEach(e => updateContact(e))

		return finalState
	}

	const iterativeFind = async(contactID, state) => {
		while (true) {
			// 1. gather all contacts that still need contacted
			const remainingContacts = _.reject(state.contactlist, e => _.includes(state.contacted, e.id))
			if (remainingContacts.length === 0) break
				
			// 2. after gathering contacts
			remainingContacts.forEach(e => state.contacted.push(e.id))
			
			// 3. chunk up remaining contacts
			for (let queryContacts of _.chunk(remainingContacts, constants.ALPHA)) {
				// 4. map contacts to commands and send them
				const queries = queryContacts.map(contact => {
					const command = Command.createRetrieveContactsReq({
						sourceContact, destContact: contact, state
					})
					return rpc.sendCommand(command).reflect()
				})

				// 5. wait for all queries to finish
				const queryResults = await Promise.all(queries)
				for (let i = 0; i < queryResults.length; i++) {
					const query = queryResults[i]
					if (query.isFulfilled()) {
						// 6. do things if query resolved
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
		}

		return state
	}

	const getNearestContacts = (contactID, limit, sourceID) => {
		const index = magic.getBucketIndex(sourceID, contactID)

		const nearestBlob = []
		let i = 1
		buckets[index].forEach(e => nearestBlob.push(e))
		while (nearestBlob.length < limit && i < constants.B) {
			if (index + i < constants.B) buckets[index + i].forEach(e => nearestBlob.push(e))
			if (index - i >= 0) buckets[index - i].forEach(e => nearestBlob.push(e))
			i++
		}

		return nearestBlob
			.map(contact => ({
				contact, distance: magic.getDistance(contact.id, contactID)
			}))
			.sort((a, b) => magic.compareKeys(a.distance, b.distance)) // sort keys by distance
			.splice(0, limit)
			.map(e => e.contact)
	}

	const refreshBucketsBeyondClosest = async() => {
		const firstBucketIndex = _.findIndex(buckets, e => e.length > 0)
		const refreshBucketIndexes = Object.keys(buckets).filter(e => e >= firstBucketIndex)

		for (let index of refreshBucketIndexes) {
			const random = magic.getRandomInBucketRangeBuffer(index)
			await lookup(random.toString('hex'))
		}
	}

	return {
		buckets,
		close: rpc.close,
		rpc,
		lookup,
		iterativeFind,
		updateContact,
		getNearestContacts,
		refreshBucketsBeyondClosest
	}
}