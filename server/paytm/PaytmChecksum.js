import crypto from 'crypto';

export class PaytmChecksum {
	static iv = '@@@@&&&&####$$$$';

	static encrypt(input, key) {
		const cipher = crypto.createCipheriv('AES-128-CBC', key, PaytmChecksum.iv);
		let encrypted = cipher.update(input, 'binary', 'base64');
		encrypted += cipher.final('base64');
		return encrypted;
	}

	static decrypt(encrypted, key) {
		const decipher = crypto.createDecipheriv('AES-128-CBC', key, PaytmChecksum.iv);
		let decrypted = decipher.update(encrypted, 'base64', 'binary');
		try {
			decrypted += decipher.final('binary');
		} catch (e) {
			console.error('Decryption error:', e);
		}
		return decrypted;
	}

	static async generateSignature(params, key) {
		if (typeof params !== 'object' && typeof params !== 'string') {
			throw new Error(`string or object expected, ${typeof params} given.`);
		}
		if (typeof params !== 'string') {
			params = PaytmChecksum.getStringByParams(params);
		}
		return PaytmChecksum.generateSignatureByString(params, key);
	}

	static async verifySignature(params, key, checksum) {
		if (typeof params !== 'object' && typeof params !== 'string') {
			throw new Error(`string or object expected, ${typeof params} given.`);
		}
		if (params.hasOwnProperty('CHECKSUMHASH')) {
			delete params.CHECKSUMHASH;
		}
		if (typeof params !== 'string') {
			params = PaytmChecksum.getStringByParams(params);
		}
		return PaytmChecksum.verifySignatureByString(params, key, checksum);
	}

	static async generateSignatureByString(params, key) {
		const salt = await PaytmChecksum.generateRandomString(4);
		return PaytmChecksum.calculateChecksum(params, key, salt);
	}

	static verifySignatureByString(params, key, checksum) {
		const paytm_hash = PaytmChecksum.decrypt(checksum, key);
		const salt = paytm_hash.substr(paytm_hash.length - 4);
		return paytm_hash === PaytmChecksum.calculateHash(params, salt);
	}

	static generateRandomString(length) {
		return new Promise((resolve, reject) => {
			crypto.randomBytes((length * 3) / 4, (err, buf) => {
				if (err) {
					console.log('generateRandomString error:', err);
					reject(err);
				} else {
					resolve(buf.toString('base64'));
				}
			});
		});
	}

	static getStringByParams(params) {
		const data = {};
		Object.keys(params)
			.sort()
			.forEach((key) => {
				data[key] =
					params[key] !== null &&
					typeof params[key] === 'string' &&
					params[key].toLowerCase() !== 'null'
						? params[key]
						: '';
			});
		return Object.values(data).join('|');
	}

	static calculateHash(params, salt) {
		const finalString = params + '|' + salt;
		return crypto.createHash('sha256').update(finalString).digest('hex') + salt;
	}

	static calculateChecksum(params, key, salt) {
		const hashString = PaytmChecksum.calculateHash(params, salt);
		return PaytmChecksum.encrypt(hashString, key);
	}
}

// 👇 This makes the whole class available as default
export default PaytmChecksum;
