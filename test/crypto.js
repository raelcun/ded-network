'use strict';

const expect = require('chai').expect,
      crypto = require('../lib/crypto'),
      constants = require('../lib/constants');


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
			const decrypted = kp.decrypt(encrypted);
			expect(decrypted).to.equal(data);
		})

	})

	describe('#sign', () => {

		it('should create a digital signature string', () => {
			const signature = crypto.generateKeyPair().sign('super secret data');
			expect(typeof signature).to.equal('string');
		})

		it('should return a string different from the input', () => {
			const data = 'super secret data';
			const signature = crypto.generateKeyPair().sign(data);
			expect(signature).to.not.equal(data);
		})

		it('should always create a signature of constant length', () => {
			const data1 = 'super secret data';
			const data2 = 'secret data with a different length';
			const sig_size = constants.SIGNATURE_SIZE;
			const signature1 = crypto.generateKeyPair().sign(data1);
			const signature2 = crypto.generateKeyPair().sign(data2);
			expect(sig_size).all.to.equal(signature1.length, signature2.length);
		})

	})

	describe('#verify', () => {

		it('should verify signed value', () => {
			const data = 'super secret data';
			const kp = crypto.generateKeyPair();
			const signature = kp.sign(data);
			const bool = crypto.verify(kp.public, data, signature);
			expect(bool).to.be.true;
		})

	})

  describe('#encryptAndSign', () => {

    it('should encrypt data and add signature to buffer', () => {
      const data = 'super secret data';
      const source_kp = crypto.generateKeyPair();
      const dest_kp = crypto.generateKeyPair();
      const payload = source_kp.encryptAndSign(dest_kp.public, data);
      expect(typeof payload).to.equal('string');
    })

  })

  describe('#decryptAndVerify', () => {

    it('should decrypt data and verify signature', () => {
      const data = 'super secret data';
      const source_kp = crypto.generateKeyPair();
      const dest_kp = crypto.generateKeyPair();
      const payload = source_kp.encryptAndSign(dest_kp.public, data);
      const output = dest_kp.decryptAndVerify(source_kp.public, payload);
      expect(output.payload).to.equal(data);
      expect(output.verified).to.be.true;
    })

  })

})
