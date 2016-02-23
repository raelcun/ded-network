'use strict';

const ursa = require('ursa'),
	  _ = require('lodash'),
	  constants = require('./constants');

const encrypt = _.curry((publicKey, data) => {
	return ursa.createPublicKey(publicKey, 'base64').encrypt(data, 'utf8', 'base64');
});

const decrypt = _.curry((privateKey, data) => {
	return ursa.createPrivateKey(privateKey, '', 'base64').decrypt(data, 'base64', 'utf8');
});

const sign = _.curry((privateKey, data) => {
	return ursa.createPrivateKey(privateKey, '', 'base64').hashAndSign('sha256', data, 'base64', 'base64');
});

const verify = _.curry((publicKey, data, signature) => {
	return ursa.createPublicKey(publicKey, 'base64').hashAndVerify('sha256', data, signature, 'base64');
});

const encryptAndSign = _.curry((sourcePrivateKey, destPublicKey, command) => {
    const signature = new Buffer(sign(sourcePrivateKey, command));
    const encryptedCommand = encrypt(destPublicKey, new Buffer(command, 'utf8'));
    return Buffer.concat([encryptedCommand, signature]);
});
// TODO: test these ^ v
const decryptAndVerify = _.curry((sourcePrivateKey, destPublicKey, data) => {
    let signature = new Buffer(constants.SIGNATURE_SIZE);
    let encryptedCommand = new Buffer(data.length - constants.SIGNATURE_SIZE);
    data.copy(signature, 0, data.length - constants.SIGNATURE_SIZE); // copy signature from end of data
    data.copy(encryptedCommand); // beginning of data contains encrypted command
    const decryptedCommand = decrypt(sourcePrivateKey, encryptedCommand);
    const verified = verify(destPublicKey, signature);
    return { decryptedCommand, verified };
});

const generateKeyPair = () => {
	const key = ursa.generatePrivateKey(2048);
	const privateKey = key.toPrivatePem('base64');
	const publicKey = key.toPublicPem('base64');

	return {
		public: publicKey,
		private: privateKey,
		decrypt: decrypt(privateKey),
		sign: sign(privateKey),
		encryptAndSign: encryptAndSign(privateKey),
		decryptAndVerify: decryptAndVerify(privateKey)
	};
};

module.exports = {
	generateKeyPair: generateKeyPair,
	encrypt: encrypt,
	verify: verify 
};