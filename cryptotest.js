const ursa = require('ursa');

const key1 = ursa.generatePrivateKey();
const privateKey1 = key1.toPrivatePem('base64');
const publicKey1 = key1.toPublicPem('base64');
console.log(publicKey1);
console.log('\n\n');

const key2 = ursa.generatePrivateKey();
const privateKey2 = key2.toPrivatePem('base64');
const publicKey2 = key2.toPublicPem('base64');
console.log(publicKey2);

//const pair1 = crypto.generateKeyPair().public;
//const pair2 = crypto.generateKeyPair().public;
//console.log(pair1);
//console.log(pair2);