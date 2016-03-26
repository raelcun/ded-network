'use strict';

const expect = require('chai').expect,
      crypto = require('../lib/crypto'),
      constants = require('../lib/constants'),
      Logger = require('../lib/logger');

const logger = Logger({ minLevel: 3 })

describe('Crypto', () => {

	describe('#encrypt', () => {

		it('should return a modified string', () => {
      const kp = crypto.generateKeyPair();
			const encrypted = crypto.encrypt(kp.public, 'super secret data');
			expect(typeof encrypted).to.equal('string');
		});

		it('should return a string different from the input', () => {
      const kp = crypto.generateKeyPair();
			const data = 'super secret data';
			const encrypted = crypto.encrypt(kp.public, data);
			expect(encrypted).to.not.equal(data);
		})

	})

	describe('#decrypt', () => {

		it('decrypt returns original value', () => {
			const data = 'super secret data';
			const kp = crypto.generateKeyPair();
			const encrypted = crypto.encrypt(kp.public, data);
			const decrypted = crypto.decrypt(kp.private, encrypted);
			expect(decrypted).to.equal(data);
		})

	})

	describe('#sign', () => {

		it('should create a digital signature string', () => {
      const kp = crypto.generateKeyPair();
			const signature = crypto.sign(kp.private, 'super secret data');
			expect(typeof signature).to.equal('string');
		})

		it('should return a string different from the input', () => {
			const data = 'super secret data';
      const kp = crypto.generateKeyPair();
			const signature = crypto.sign(kp.private, data);
			expect(typeof signature).to.equal('string');
			expect(signature).to.not.equal(data);
		})

	})

	describe('#verify', () => {

		it('should verify signed value', () => {
			const data = 'super secret data';
			const kp = crypto.generateKeyPair();
			const signature = crypto.sign(kp.private, data);
			const bool = crypto.verify(kp.public, data, signature);
			expect(bool).to.be.true;
		})

	})

  describe('#aesEncrypt', () => {

    it('should return encrypted message, shared key, and iv', () => {
      const encrypted = crypto.aesEncrypt('super secret data');
      expect(typeof encrypted.payload).to.equal('string');
      expect(typeof encrypted.key).to.equal('object'); // buffer object
      expect(typeof encrypted.iv).to.equal('object'); // buffer object
    })

    it('should return and encrypted string different than input', () => {
      const data = 'super secret data';
      const encrypted = crypto.aesEncrypt(data);
      expect(encrypted.payload).to.not.equal(data);
    })

  })

  describe('#aesDecrypt', () => {

    it('should decrypt successfully using shared key', () => {
      const data = 'super secret data';
      const encrypted = crypto.aesEncrypt(data);
      const decrypted = crypto.aesDecrypt(encrypted.payload, encrypted.key, encrypted.iv);
      expect(decrypted).to.equal(data);
    })

  })

})
