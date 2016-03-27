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

module.exports = async({ sourceContact, privateKey, viewCommands, logger: logger = Logger() }) => {
	const buckets = _.range(constants.B).map(e => [])
	const queryCache = []
	const rpc = await RPC({
		contact: sourceContact,
		privateKey,
		logger,
		handleCommand: async command => {
			if (viewCommands) { viewCommands(_.cloneDeep(command)) }
			
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

				const lookupState = await iterativeFind(state)

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

			else if (command.strCommand === 'KEY_REQUEST'){
				let { sourceId: destId, sourceIP: destIp, sourcePort: destPort, sourceUsername: destUsername } = command.payload

				// check if current node is the requested node
				if (sourceContact.id === command.payload.requestedContactId){
					rpc.sendCommand(Command.createPublicKeyRes({
						sourceContact, destContact: Contact({
							id: destId,
							ip: destIp,
							port: destPort,
							username: destUsername
						}), orgRequestId: command.id, publicKey: sourceContact.publicKey
					}))
					return
				}

				// stop if we already responded to the same message
				if (_.includes(queryCache, command.payload.queryId)){
					rpc.sendCommand(Command.createPublicKeyRes({
						sourceContact, destContact: Contact({
							id: destId,
							ip: destIp,
							port: destPort,
							username: destUsername
						}), orgRequestId: command.id, publicKey: null
					}))
					return
				}
				queryCache.push(command.payload.queryId)

				// forward request to other nodes
				const key = await requestPublicKey(command.payload.requestedContactId)
				rpc.sendCommand(Command.createPublicKeyRes({
				  sourceContact, destContact: Contact({
						id: destId,
						ip: destIp,
						port: destPort,
						username: destUsername
					}), orgRequestId: command.id, publicKey: key
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

		const finalState = await iterativeFind(state)

		finalState.contactlist.forEach(e => updateContact(e))

		return finalState
	}

	const iterativeFind = async state =>
		await route({
			state,
			fnGatherContacts: ({ contacted, contactlist }) => _.reject(contactlist, e => _.includes(contacted, e.id)),
			fnConstructCommand: (contact, state) => Command.createRetrieveContactsReq({ sourceContact, destContact: contact, state }),
			fnOnQuerySuccess: (contact, queryResult, state) => {
				const distance = magic.getDistance(state.key, contact.id)
				if (magic.compareKeys(distance, state.closestNodeDistance) === -1) {
					state.previousClosestNode = state.closestNode
					state.closestNode = contact
					state.closestNodeDistance = distance
				}

				state.contactlist = _.uniqBy(_.concat(state.contactlist, queryResult.value().payload.state.contactlist), 'id')
				state.contacted = _.uniq(_.concat(state.contacted, queryResult.value().payload.state.contacted))
			}
		})

	const requestPublicKey = async contactId =>
		await route({
			state: {
				requestedContactId: contactId,
				requestedKeys: [],
				queryId: utils.generateMessageId(),
				contacted: [sourceContact.id],
				contactlist: getNearestContacts(contactId, constants.K, sourceContact.id)
			},
			fnGatherContacts: state => _.reject(state.contactlist, e => _.includes(state.contacted, e.id)),
			fnConstructCommand: (contact, state) => Command.createPublicKeyReq({ sourceContact, destContact: contact, queryId: state.queryId, requestedContactId: state.requestedContactId }),
			fnOnQueryResults: (queryContacts, queryResults, state) => {
				state.contacted = state.contacted.concat(queryContacts.map(e => e.id))
				const validResults = queryResults.filter(e => e.isFulfilled()).filter(e => e.value()).map(e => e.value().payload.publicKey).filter(e => e !== null && e !== undefined)
				state.requestedKeys = state.requestedKeys.concat(validResults)
			},
			fnOnQuerySuccess: (contact, queryResult, state) => {

			},
			fnGetResult: (state) => {
				const resultsDict = _.countBy(state.requestedKeys)
				if (state.requestedKeys.length > 0){
	        const mostFrequentResult = Object.keys(resultsDict).reduce((a, b) => {return resultsDict[a] > resultsDict[b] ? a : b });
	        if ((resultsDict[mostFrequentResult] / state.requestedKeys.length * 100) >= constants.APPROVAL_PERCENTAGE){
	          return mostFrequentResult
					}
				}
				return null
			}
		})

	const route = async ({
		state,
		fnGatherContacts,
		fnGetResult: fnGetResult = state => state,
		fnStopState,
		fnConstructCommand,
		fnOnQueryResults,
		fnOnQuerySuccess,
		fnOnQueryFailure }) => {

		while (true) {
			const remainingContacts = fnGatherContacts(state)
			if (remainingContacts.length === 0) break
			if (fnStopState && fnStopState(state)) break

			for (let queryContacts of _.chunk(remainingContacts, constants.ALPHA)) {
				const queries = queryContacts.map(contact => {
					const command = fnConstructCommand(contact, state)
					return rpc.sendCommand(command).reflect()
				})

				const queryResults = await Promise.all(queries)
				if (fnOnQueryResults) fnOnQueryResults(queryContacts, queryResults, state)
				for (let i = 0; i < queryResults.length; i++) {
					const queryResult = queryResults[i]
					if (queryResult.isFulfilled()) {
						if (fnOnQuerySuccess) fnOnQuerySuccess(queryContacts[i], queryResult, state)
					} else {
						logger.warn(`query to ${queryContacts[i].username} failed with reason ${queryResult.reason()}`)
						if (fnOnQueryFailure) fnOnQueryFailure(queryContacts[i], queryResult, state)
					}
				}
			}
		}

		return fnGetResult(state)
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
		setViewer: fn => viewCommands = fn,
		buckets,
		close: rpc.close,
		rpc,
		lookup,
		iterativeFind,
		requestPublicKey,
		updateContact,
		getNearestContacts,
		refreshBucketsBeyondClosest
	}
}
