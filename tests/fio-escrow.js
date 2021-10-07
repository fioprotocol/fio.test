require('mocha')
const {createHash} = require('crypto');
const {expect}     = require('chai');

const {
	      newUser,
	      existingUser,
	      fetchJson,
	      timeout,
	      callFioApi,
	      generateFioDomain,
	      callFioApiSigned, getTable
      }        = require('../utils.js');
const {FIOSDK} = require('@fioprotocol/fiosdk')
config         = require('../config.js');

before(async () => {
	faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** fio-escrow.js ************************** \n    
	A. Set up 2 users, register domains and list one for sale`, () => {

	let userA1;
	let userA2
	let domain;
	let domainA2;
	let domainSaleIdA1;
	let domainSaleIdA2;
	let domainSaleDateListedA1;
	let domainSaleDateListedA2;

	it(`Create users and domains`, async () => {
		let marketplacePriv = `5KePj5qMF7xvXZwY4Tnxy7KbDCdUe7cyZtYv2rsTgaZ7LBuVpUc`;
		let marketplacePub  = `FIO77rFFByyLycsrbC5tH1CXqddZdgkDuTYDbCc2BoGp5hdnU59f7`;

		userA1   = await newUser(faucet);
		userA2   = await newUser(faucet);
		marketplaceUser
		         = await existingUser(`5ufabtv13hv4`, marketplacePriv, marketplacePub, 'marketplace', 'user@marketplace')
		domain   = generateFioDomain(10);
		domainA2 = generateFioDomain(10);
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
					"max_fee"       : "5000000000",
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
					"max_fee"       : "5000000000",
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
					"max_fee"       : "5000000000",
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
	it(`userA1 and userA2 register a domain`, async () => {
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

			await faucet.genericAction('transferTokens', {
				payeeFioPublicKey: userA2.publicKey,
				amount           : 8000000000000,
				maxFee           : config.api.transfer_tokens_pub_key.fee,
			})

			const resultA2 = await userA2.sdk.genericAction('registerFioDomain', {
				fioDomain           : domainA2,
				maxFee              : config.api.register_fio_domain.fee,
				technologyProviderId: ''
			})

			expect(resultA2.status).to.equal('OK')
		} catch (err) {
			expect(err).to.equal(null)
		}
	})

	// list domain for sale
	it(`userA1 and userA2 lists domain for sale`, async () => {
		try {

			const configs = await callFioApi("get_table_rows", {
				json      : true,
				code      : 'fio.escrow',
				scope     : 'fio.escrow',
				table     : 'mrkplconfigs',
				limit     : 1,
				reverse   : false,
				show_payer: false
			});

			// Getting marketplace configurations
			const commissionFee = configs.rows[0].commission_fee;
			const listing_fee   = configs.rows[0].listing_fee;
			const e_break       = configs.rows[0].e_break;

			const marketplaceBalanceResult = await marketplaceUser.sdk.genericAction('getFioBalance', {
				fioPublicKey: marketplaceUser.publicKey
			})

			const userBalanceResult = await userA1.sdk.genericAction('getFioBalance', {
				fioPublicKey: userA1.publicKey
			})
			let userA1Balance       = userBalanceResult.balance;

			let dataA1 = {
				"actor"     : userA1.account,
				"fio_domain": domain,
				"sale_price": 300000000000,
				"max_fee"   : config.api.list_domain.fee,
				"tpid"      : ""
			};

			const result = await userA1.sdk.genericAction('pushTransaction', {
				action : 'listdomain',
				account: 'fio.escrow',
				data   : dataA1
			})
			// check to that the transaction was successful
			expect(result.status).to.equal('OK')

			const domainSaleRow = await callFioApi("get_table_rows", {
				json      : true,
				code      : 'fio.escrow',
				scope     : 'fio.escrow',
				table     : 'domainsales',
				limit     : 1,
				reverse   : true,
				show_payer: false
			});

			/* Checking the fio.escrow domainsales table entries match what was sent in transaction */
			expect(domainSaleRow.rows[0].domain).to.equal(domain);
			expect(domainSaleRow.rows[0].commission_fee).to.equal(commissionFee);
			expect(domainSaleRow.rows[0].sale_price).to.equal(dataA1.sale_price);
			expect(domainSaleRow.rows[0].status).to.equal(1); // (status = 1: on sale, status = 2: Sold, status = 3; Cancelled)

			// marketplace account balance goes up by commission_fee
			const marketplaceBalanceResultAfter = await marketplaceUser.sdk.genericAction('getFioBalance', {
				fioPublicKey: marketplaceUser.publicKey
			})

			let listingFeeSUFs = listing_fee;

			expect(FIOSDK.SUFToAmount(marketplaceBalanceResultAfter.balance)).to.equal(FIOSDK.SUFToAmount(marketplaceBalanceResult.balance + listingFeeSUFs))

			const userBalanceResultAfter = await userA1.sdk.genericAction('getFioBalance', {
				fioPublicKey: userA1.publicKey
			})

			expect(userBalanceResultAfter.balance).to.equal(userA1Balance - parseInt(listing_fee) - config.api.list_domain.fee)

			domainSaleIdA1 = result.domainsale_id;

			let dataA2 = {
				"actor"     : userA2.account,
				"fio_domain": domainA2,
				"sale_price": 300000000000,
				"max_fee"   : 5000000000,
				"tpid"      : ""
			};

			const resultA2 = await userA2.sdk.genericAction('pushTransaction', {
				action : 'listdomain',
				account: 'fio.escrow',
				data   : dataA2
			})

			domainSaleIdA2 = resultA2.domainsale_id;

			expect(resultA2.status).to.equal('OK')

			// TODO: check ram allocation after listing a domain
			// TODO: check no bundle transactions deducted

		} catch (err) {
			console.log(err);
			console.log(err.json);
			expect(err).to.equal(null)
		}
	})

	// cancel domain listing
	it(`userA1 cancels domain listing`, async () => {
		try {

			const userBalanceResult = await userA1.sdk.genericAction('getFioBalance', {
				fioPublicKey: userA1.publicKey
			})
			let userA1Balance       = userBalanceResult.balance;

			let data = {
				"actor"     : userA1.account,
				"fio_domain": domain,
				"max_fee"   : config.api.cancel_list_domain.fee,
				"tpid"      : ""
			};

			const result = await userA1.sdk.genericAction('pushTransaction', {
				action : 'cxlistdomain',
				account: 'fio.escrow',
				data   : data
			})

			const domainHash = stringToHash(domain);

			const domainSaleRow = await callFioApi("get_table_rows", {
				json          : true,
				code          : 'fio.escrow',
				scope         : 'fio.escrow',
				table         : 'domainsales',
				upper_bound   : domainHash.toString(),
				lower_bound   : domainHash.toString(),
				key_type      : 'i128',
				index_position: 2,
				reverse       : true,
				show_payer    : false
			});

			expect(domainSaleRow.rows[0].status).to.equal(3); // cancelled listing
			expect(domainSaleRow.rows[0].date_listed).to.not.equal(domainSaleRow.rows[0].date_updated);

			const userBalanceResultAfter = await userA1.sdk.genericAction('getFioBalance', {
				fioPublicKey: userA1.publicKey
			})

			expect(userBalanceResultAfter.balance).to.equal(userA1Balance - config.api.cancel_list_domain.fee)
			expect(result.status).to.equal('OK')

			// TODO: check ram allocation after listing a domain
			// TODO: check no bundle transactions deducted

		} catch (err) {
			console.log(err);
			expect(err).to.equal(null)
		}
	})

	// buy domain listed for sale
	it(`userA1 buys domain listed for sale by userA2`, async () => {
		try {
			const userBalanceResult = await userA1.sdk.genericAction('getFioBalance', {
				fioPublicKey: userA1.publicKey
			})
			let userA1Balance       = userBalanceResult.balance;

			const userA2BalanceResult = await userA2.sdk.genericAction('getFioBalance', {
				fioPublicKey: userA2.publicKey
			})
			let userA2Balance       = userA2BalanceResult.balance;

			const configs = await callFioApi("get_table_rows", {
				json      : true,
				code      : 'fio.escrow',
				scope     : 'fio.escrow',
				table     : 'mrkplconfigs',
				limit     : 1,
				reverse   : false,
				show_payer: false
			});

			// Getting marketplace configurations
			const commissionFeePct = configs.rows[0].commission_fee / 100;

			const marketplaceBalanceResult = await marketplaceUser.sdk.genericAction('getFioBalance', {
				fioPublicKey: marketplaceUser.publicKey
			})

			let data = {
				"actor"        : userA1.account,
				"fio_domain"   : domainA2,
				"sale_id"      : domainSaleIdA2,
				"max_buy_price": 300000000000,
				"max_fee"      : config.api.buy_domain.fee,
				"tpid"         : ""
			};

			let marketplaceCommission = data.max_buy_price * commissionFeePct;

			const result = await userA1.sdk.genericAction('pushTransaction', {
				action : 'buydomain',
				account: 'fio.escrow',
				data   : data
			})

			const domainHash = stringToHash(domainA2);

			const domainSaleRow = await callFioApi("get_table_rows", {
				json          : true,
				code          : 'fio.escrow',
				scope         : 'fio.escrow',
				table         : 'domainsales',
				upper_bound   : domainHash.toString(),
				lower_bound   : domainHash.toString(),
				key_type      : 'i128',
				index_position: 2,
				reverse       : true,
				show_payer    : false
			});

			expect(domainSaleRow.rows[0].status).to.equal(2); // sold listing
			expect(domainSaleRow.rows[0].date_listed).to.not.equal(domainSaleRow.rows[0].date_updated); // date_updated updated

			const userBalanceResultAfter = await userA1.sdk.genericAction('getFioBalance', {
				fioPublicKey: userA1.publicKey
			})

			const userA2BalanceResultAfter = await userA2.sdk.genericAction('getFioBalance', {
				fioPublicKey: userA2.publicKey
			})
			const marketplaceBalanceResultAfter = await marketplaceUser.sdk.genericAction('getFioBalance', {
				fioPublicKey: marketplaceUser.publicKey
			})

			// check balance of userA1 (buyer)
			expect(userBalanceResultAfter.balance).to.equal(userA1Balance - config.api.buy_domain.fee - domainSaleRow.rows[0].sale_price)
			// check balance of userA2 (seller)
			expect(userA2BalanceResultAfter.balance).to.equal(userA2Balance + domainSaleRow.rows[0].sale_price - marketplaceCommission)
			// check balance of marketplace
			expect(marketplaceBalanceResultAfter.balance).to.equal(marketplaceBalanceResult.balance + marketplaceCommission)

			expect(result.status).to.equal('OK')
		} catch (err) {
			console.log(err);
			console.log(err.json);
			expect(err).to.equal(null)
		}
	})

	it.skip(`userA2 tries to buy userA1's cancelled domain listing`, async () => {
		try {
			let data = {
				"actor"        : userA2.account,
				"fio_domain"   : domain,
				"sale_id"      : domainSaleIdA1,
				"max_buy_price": 300000000000,
				"max_fee"      : 5000000000,
				"tpid"         : ""
			};

			const result = await userA1.sdk.genericAction('pushTransaction', {
				action : 'buydomain',
				account: 'fio.escrow',
				data   : data
			})

			console.log(result);

		} catch (err) {
			// console.log(err);
			console.log(err.json.fields);
			expect(err.errorCode).to.equal(400)
			expect(err.json.fields[0].value).to.equal('3')
		}
	})

	it.skip(`Wait a few seconds.`, async () => {
		await timeout(3000)
	})

	it.skip(`burn domain that is in domainsales table`, async () => {
		// todo Burn domain that is in the domainsales table
		// Observe (via table lookup)
		// All references to burned domain removed from all escrow tables
	})
})

describe(`sad path for fio.escrow actions`, () => {
	it.skip(`listdomain`, async () => {
		// Create tests for conditions in: https://github.com/fioprotocol/fips/blob/master/fip-0026.md#exception-handling
	})

	it.skip(`cxlistdomain`, async () => {
		// Create tests for conditions in: https://github.com/fioprotocol/fips/blob/master/fip-0026.md#exception-handling-1
	})

	it.skip(`buydomain`, async () => {
		// Create tests for conditions in: https://github.com/fioprotocol/fips/blob/master/fip-0026.md#exception-handling-2
	})

	it.skip(`setmrkplcfg`, async () => {

		// Create tests for conditions in: https://github.com/fioprotocol/fips/blob/master/fip-0026.md#exception-handling-3
	})

	it.skip(`xferescrow`, async () => {

		// Create tests for conditions in: https://github.com/fioprotocol/fips/blob/master/fip-0026.md#exception-handling-4
	})

})

let stringToHash = (term) => {
	const hash = createHash('sha1');
	return '0x' + hash.update(term).digest().slice(0, 16).reverse().toString('hex');
};

