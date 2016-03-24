'use strict';

const ursa = require('ursa'),
      crypto = require('crypto');

const encrypt = (publicKey, data) => {
	return ursa.createPublicKey(publicKey, 'base64').encrypt(data, 'utf8', 'base64');
};

const decrypt = (privateKey, data) => {
	return ursa.createPrivateKey(privateKey, '', 'base64').decrypt(data, 'base64', 'utf8');
};

const sign = (privateKey, data) => {
	return ursa.createPrivateKey(privateKey, '', 'base64').hashAndSign('sha256', data, 'base64', 'base64');
};

const verify = (publicKey, data, signature) => {
	return ursa.createPublicKey(publicKey, 'base64').hashAndVerify('sha256', data, signature, 'base64');
};

const aesEncrypt = (message) => {
	const key = crypto.randomBytes(32); // key size must be 32 for aes256
	const iv = crypto.randomBytes(16); // initializationVector size must always be 16
	const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
	let encrypted = cipher.update(message, 'utf8', 'base64');
	encrypted += cipher.final('base64');
	return { payload: encrypted, key, iv };
};

const aesDecrypt = (data, key, iv) => {
	const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
	let decrypted = decipher.update(data, 'base64', 'utf8');
	decrypted += decipher.final('utf8');
	return decrypted;
}

const generateKeyPair = () => {
	const key = ursa.generatePrivateKey(2048);
	const privateKey = key.toPrivatePem('base64');
	const publicKey = key.toPublicPem('base64');

	return {
		public: publicKey,
		private: privateKey,
	};
};

module.exports = {
	generateKeyPair: generateKeyPair,
	encrypt: encrypt,
	decrypt: decrypt,
	verify: verify,
	sign: sign,
	aesEncrypt: aesEncrypt,
	aesDecrypt: aesDecrypt
};
