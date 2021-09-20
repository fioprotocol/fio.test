require('mocha')
const {expect} = require('chai')
const {
	      newUser,
	      existingUser,
	      fetchJson,
	      timeout,
	      callFioApi,
	      generateFioDomain,
	      callFioApiSigned
      }        = require('../utils.js');
const {FIOSDK} = require('@fioprotocol/fiosdk')
config         = require('../config.js');

before(async () => {
	faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** fio-escrow.js ************************** \n    
A. Add 2 addresses, then add 3 addresses including the original 2`, () => {

	let userA1;
	let domain;

	it(`Create users and domain`, async () => {
		let marketplacePriv = `5KePj5qMF7xvXZwY4Tnxy7KbDCdUe7cyZtYv2rsTgaZ7LBuVpUc`;
		let marketplacePub  = `FIO77rFFByyLycsrbC5tH1CXqddZdgkDuTYDbCc2BoGp5hdnU59f7`;

		userA1 = await newUser(faucet);
		marketplaceUser
		       = await existingUser(`5ufabtv13hv4`, marketplacePriv, marketplacePub, 'marketplace', 'user@marketplace')
		domain = generateFioDomain(10);
	})

	// set parameters for marketplace
	it(`set marketplace listing_fee to 50 FIO`, async () => {
		try {
			await callFioApiSigned('push_transaction', {
				action : 'setmrkplcfg',
				account: 'fio.escrow',
				actor  : marketplaceUser.account,
				privKey: marketplaceUser.privateKey,
				data   : {
					"actor"         : "5ufabtv13hv4",
					"listing_fee"   : "5000000000",
					"commission_fee": 10,
					"max_fee"       : "1000000000",
					"e_break"       : 0
				}
			})

			const json = {
				json      : true,
				code      : 'fio.escrow',
				scope     : 'fio.escrow',
				table     : 'mrkplconfigs',
				limit     : 1,
				reverse   : false,
				show_payer: false
			}
			let result = await callFioApi("get_table_rows", json);

			expect(result.rows[0].listing_fee).to.equal(5000000000)

		} catch (err) {
			console.log(err);
		}
	});

	it(`set marketplace commission_fee to 6% and enable e_break`, async () => {
		try {
			await callFioApiSigned('push_transaction', {
				action : 'setmrkplcfg',
				account: 'fio.escrow',
				actor  : marketplaceUser.account,
				privKey: marketplaceUser.privateKey,
				data   : {
					"actor"         : "5ufabtv13hv4",
					"listing_fee"   : "5000000000",
					"commission_fee": 6,
					"max_fee"       : "1000000000",
					"e_break"       : 1
				}
			})

			const json = {
				json      : true,
				code      : 'fio.escrow',
				scope     : 'fio.escrow',
				table     : 'mrkplconfigs',
				limit     : 1,
				reverse   : false,
				show_payer: false
			}
			let result = await callFioApi("get_table_rows", json);

			expect(result.rows[0].commission_fee).to.equal('6.00000000000000000')
			expect(result.rows[0].e_break).to.equal(1)

		} catch (err) {
			console.log(err);
		}
	});

	it(`set marketplace e_break to 0`, async () => {
		try {
			await callFioApiSigned('push_transaction', {
				action : 'setmrkplcfg',
				account: 'fio.escrow',
				actor  : marketplaceUser.account,
				privKey: marketplaceUser.privateKey,
				data   : {
					"actor"         : "5ufabtv13hv4",
					"listing_fee"   : "5000000000",
					"commission_fee": 6,
					"max_fee"       : "1000000000",
					"e_break"       : 0
				}
			})

			const json = {
				json      : true,
				code      : 'fio.escrow',
				scope     : 'fio.escrow',
				table     : 'mrkplconfigs',
				limit     : 10,
				reverse   : false,
				show_payer: false
			}
			let result = await callFioApi("get_table_rows", json);

			expect(result.rows[0].e_break).to.equal(0)

		} catch (err) {
			console.log(err);
		}
	});

	// register domain
	it(`userA1 register a domain`, async () => {
		try {
			await faucet.genericAction('transferTokens', {
				payeeFioPublicKey: userA1.publicKey,
				amount           : 8000000000000,
				maxFee           : config.api.transfer_tokens_pub_key.fee,
			})
			const result = await userA1.sdk.genericAction('registerFioDomain', {
				fioDomain           : domain,
				maxFee              : config.api.register_fio_domain.fee,
				technologyProviderId: ''
			})
			expect(result.status).to.equal('OK')
		} catch (err) {
			expect(err).to.equal(null)
		}
	})

	// list domain for sale
	it(`userA1 lists domain for sale`, async () => {
		try {

			let data = {
				"actor"     : userA1.account,
				"fio_domain": domain,
				"sale_price": "300000000000",
				"max_fee"   : 1000000000,
				"tpid"      : ""
			};

			// console.log(data)

			// const result = await userA1.sdk.genericAction('pushTransaction', {
			// 	fioDomain           : domain,
			// 	maxFee              : config.api.register_fio_domain.fee,
			// 	technologyProviderId: ''
			// })

			let result = await callFioApiSigned('push_transaction', {
				action : 'listdomain',
				account: 'fio.escrow',
				actor  : userA1.account,
				privKey: userA1.privateKey,
				data   : data
			})

			// console.log(result);
			console.log(result.error.details);

			expect(result.status).to.equal('OK')
		} catch (err) {

			console.log(`err`);
			console.log(err);

			expect(err).to.equal(null)
		}
	})

	// cancel domain listing
	// buy domain listed for sale

	it(`Wait a few seconds.`, async () => {
		await timeout(3000)
	})
})
