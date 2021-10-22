require('mocha')
const {createHash} = require('crypto');
const {expect}     = require('chai');
const {
	      newUser,
	      existingUser,
	      fetchJson,
	      createKeypair,
	      timeout,
	      callFioApi,
	      generateFioDomain,
	      generateFioAddress,
	      callFioApiSigned
      }            = require('../utils.js');
const {FIOSDK}     = require('@fioprotocol/fiosdk')
const config       = require("../config.js");

let userA1;
let userA2;
let domain;
let domainA2;

// sad paths
let domainSadPath1;
let domainSadPath2;
let faucet, marketplaceUser;

let isSetup      = false;
let isDebug      = true;
const expireDate = 420202800;  // April, 1983
// const expireDate = 1034960126;  // October 2002
let timeoutDuration = 2000;

before(async () => {
	await setup();
})

describe.only(`************************** fio-escrow.js **************************`, async () => {
	before(async () => {
		await setup();
	})

	describe(`Set up Marketplace Config table`, async () => {

		afterEach(async () => {
			// console.log(`${timeoutDuration / 1000} second Timeout`);
			await timeout(timeoutDuration);
		})

		describe(`Golden Path`, async () => {
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
					expect(err).to.equal(null)
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

					expect(result.rows[0].commission_fee).to.equal('6.00000000000000000');
					expect(result.rows[0].e_break).to.equal(1);
				} catch (err) {
					console.log(err);
					expect(err).to.equal(null)
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
							"max_fee"       : "15000000000",
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
					expect(err).to.equal(null)
					console.log(err);
				}
			});
		})

		describe(`Error Handling Path`, async () => {
			// invalid listing_fee value
			it(`setmrkplcfg: Invalid listing_fee value`, async () => {
				try {
					let data = {
						"actor"         : marketplaceUser.account,
						"listing_fee"   : "50000000000000000",
						"commission_fee": 10,
						"max_fee"       : "50000000000",
						"e_break"       : 0
					}

					await marketplaceUser.sdk.genericAction('pushTransaction', {
						action : 'setmrkplcfg',
						account: 'fio.escrow',
						data
					})
				} catch (err) {
					// console.log(err.errorCode);
					// console.log(err.json.fields[0]);
					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('listing_fee')
					expect(err.json.fields[0].value).to.equal('50000000000000000')
					expect(err.json.fields[0].error).to.equal('Listing fee should be between 0 and 25,000,000,000 (25 FIO in SUF)')
				}
			})
			// actor unauthorized
			it(`setmrkplcfg: actor unauthorized`, async () => {
				try {
					let data = {
						"actor"         : "2rvrh54kfro5",
						"listing_fee"   : "5000000000",
						"commission_fee": 10,
						"max_fee"       : "5000000000",
						"e_break"       : 0
					}

					await userA1.sdk.genericAction('pushTransaction', {
						action : 'setmrkplcfg',
						account: 'fio.escrow',
						data
					})

					// console.log(result);

				} catch (err) {
					// console.log(err.errorCode);
					// console.log(err.json.fields[0]);
					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('actor')
					expect(err.json.fields[0].value).to.equal(userA1.account)
					expect(err.json.fields[0].error).to.equal('Only owner of marketplace can modify config')
				}
			})
			// invalid commission fee value
			it(`setmrkplcfg: Invalid commission_fee value`, async () => {
				try {
					let data = {
						"actor"         : marketplaceUser.account,
						"listing_fee"   : "5000000000",
						"commission_fee": 26,
						"max_fee"       : "50000000000",
						"e_break"       : 0
					}

					await marketplaceUser.sdk.genericAction('pushTransaction', {
						action : 'setmrkplcfg',
						account: 'fio.escrow',
						data
					})
				} catch (err) {
					// console.log(err.errorCode);
					// console.log(err.json.fields[0]);
					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('commission_fee')
					expect(err.json.fields[0].value).to.equal('26.000000')
					expect(err.json.fields[0].error).to.equal('Commission fee should be between 0 and 25')
				}
			})
			// invalid e_break value
			it(`setmrkplcfg: Invalid e_break value`, async () => {
				try {
					let data = {
						"actor"         : marketplaceUser.account,
						"listing_fee"   : "5000000000",
						"commission_fee": 5,
						"max_fee"       : "50000000000",
						"e_break"       : 2
					}

					await marketplaceUser.sdk.genericAction('pushTransaction', {
						action : 'setmrkplcfg',
						account: 'fio.escrow',
						data
					})
				} catch (err) {
					// console.log(err);
					// console.log(err.json.fields[0]);
					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('e_break')
					expect(err.json.fields[0].value).to.equal('2')
					expect(err.json.fields[0].error).to.equal('E-break setting must be either 0 for disabled or 1 for enabled')
				}
			})
		})
	});

	describe(`List Domains`, async () => {
		before(async () => {
			await setup();
		})

		afterEach(async () => {
			await timeout(3000)
		})

		describe(`Golden Path`, async () => {
			it(`userA1 and userA2 register a domain`, async () => {
				try {
					await transferTokens(userA1);
					const result = await registerDomain(userA1, domain);
					expect(result.status).to.equal('OK')

					await transferTokens(userA2);
					const resultA2 = await registerDomain(userA2, domainA2);
					expect(resultA2.status).to.equal('OK')
				} catch (err) {
					expect(err).to.equal(null)
				}
			})

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
					const commissionFee            = configs.rows[0].commission_fee;
					const listing_fee              = configs.rows[0].listing_fee;
					const e_break                  = configs.rows[0].e_break;
					const marketplaceBalanceResult = await marketplaceUser.sdk.genericAction('getFioBalance', {
						fioPublicKey: marketplaceUser.publicKey
					})
					const userBalanceResult        = await userA1.sdk.genericAction('getFioBalance', {
						fioPublicKey: userA1.publicKey
					})

					let userA1Balance = userBalanceResult.balance;
					let salePrice     = 2000000000000;

					let domain   = generateFioDomain(10);
					let domainA2 = generateFioDomain(10);

					await registerDomain(userA1, domain)
					await registerDomain(userA2, domainA2)

					let ramBefore = await getRamForUser(userA1);
					// console.log(`ramBefore: ${ramBefore}`)
					const result  = await listDomain(userA1, domain, salePrice);
					let ramAfter  = await getRamForUser(userA1);

					// console.log(`ramAfter: ${ramAfter}`)
					// console.log(`diff: ${ramAfter - ramBefore}`)
					expect(ramAfter).to.equal(ramBefore + config.RAM.FIOESCROWRAM)

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
					expect(domainSaleRow.rows[0].sale_price).to.equal(salePrice);
					expect(domainSaleRow.rows[0].status).to.equal(1); // (status = 1: on sale, status = 2: Sold, status = 3; Cancelled)

					// marketplace account balance goes up by commission_fee
					const marketplaceBalanceResultAfter = await marketplaceUser.sdk.genericAction('getFioBalance', {
						fioPublicKey: marketplaceUser.publicKey
					})
					let listingFeeSUFs                  = listing_fee;
					expect(FIOSDK.SUFToAmount(marketplaceBalanceResultAfter.balance)).to.equal(FIOSDK.SUFToAmount(marketplaceBalanceResult.balance + listingFeeSUFs))
					const userBalanceResultAfter = await userA1.sdk.genericAction('getFioBalance', {
						fioPublicKey: userA1.publicKey
					})
					// expect(userBalanceResultAfter.balance).to.equal(userA1Balance - parseInt(listing_fee) - config.api.list_domain.fee)
					domainSaleIdA1               = result.domainsale_id;
					let dataA2                   = {
						"actor"     : userA2.account,
						"fio_domain": domainA2,
						"sale_price": 300000000000,
						"max_fee"   : 5000000000,
						"tpid"      : ""
					};
					const resultA2               = await userA2.sdk.genericAction('pushTransaction', {
						action : 'listdomain',
						account: 'fio.escrow',
						data   : dataA2
					})
					domainSaleIdA2               = resultA2.domainsale_id;
					expect(resultA2.status).to.equal('OK')
					// TODO: check no bundle transactions deducted
				} catch (err) {
					// console.log(err);
					console.log(err.json);
					expect(err).to.equal(null)
				}
			})

			it(`burn domain that is in domainsales table`, async () => {
				let offset = 0;
				let limit  = 15;

				try {
					let domain = generateFioDomain(10);

					let offset = await getLastDomainId();

					// register domain
					await registerDomain(userA1, domain);

					// list for sale
					await listDomain(userA1, domain);

					// expire domain
					const result = await callFioApiSigned('push_transaction', {
						action : 'modexpire',
						account: 'fio.address',
						actor  : userA1.account,
						privKey: userA1.privateKey,
						data   : {
							"fio_address": domain,
							"expire"     : expireDate,
							"actor"      : userA1.account
						}
					})

					// console.log('Result: ', result);

					// console.log(`${domain} has expired date set to ${expireDate}`)

					expect(result.processed.receipt.status).to.equal('executed');

					// burn expired
					await userA1.sdk.genericAction('pushTransaction', {
						action : 'burnexpired',
						account: 'fio.address',
						data   : {
							actor: userA1.account,
							offset,
							limit
						}
					})

					// Observe (via table lookup)
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
					// Listing for burned domain set to cancelled
					expect(domainSaleRow.rows[0].status).to.equal(3);

				} catch (err) {
					if (err.errorCode == 400 && err.json.fields[0].error == 'No work.') {
						retryCount = 0;
						console.log('Offset = ' + offset + ', Limit = ' + limit + ', Result: ' + err.json.fields[0].error);
						expect(err.errorCode).to.equal(400);
						expect(err.json.fields[0].error).to.equal('No work.');
						// } else if (err.errorCode == 500 && err.json.fields[0].error == 'Transaction exceeded the current CPU usage limit imposed on the transaction') {
						// 	console.log('Offset = ' + offset + ', Limit = ' + limit + ', Result: Transaction exceeded the current CPU usage limit imposed on the transaction');
						// 	retryCount++;
					} else {
						console.log('UNEXPECTED ERROR: ', err);
					}
					// if (err) {
					// 	console.log(err);
					// 	console.log(err.json);
					// }
					// expect(err).to.equal(null)
				}
			})

			it(`list 2 domains, purchase 1, expire both and burnexpired`, async () => {
				try {

					let offset = await getLastDomainId();
					// create domains
					let domain  = generateFioDomain(10);
					let domain2 = generateFioDomain(10);

					// register domain
					await registerDomain(userA1, domain);
					await registerDomain(userA1, domain2);

					// list for sale
					let listDomainResult  = await listDomain(userA1, domain, 2000000000000);
					let listDomainResult2 = await listDomain(userA1, domain2);

					// purchase 1 of the domains
					await buyDomain(userA2, domain, listDomainResult.domainsale_id, 2000000000000);

					// expire domains
					let expireResult1 = await callFioApiSigned('push_transaction', {
						action : 'modexpire',
						account: 'fio.address',
						actor  : userA1.account,
						privKey: userA1.privateKey,
						data   : {
							"fio_address": domain,
							"expire"     : expireDate,
							"actor"      : userA1.account
						}
					})

					expect(expireResult1.processed.receipt.status).to.equal('executed');

					let expireResult2 = await callFioApiSigned('push_transaction', {
						action : 'modexpire',
						account: 'fio.address',
						actor  : userA1.account,
						privKey: userA1.privateKey,
						data   : {
							"fio_address": domain2,
							"expire"     : expireDate,
							"actor"      : userA1.account
						}
					})
					expect(expireResult2.processed.receipt.status).to.equal('executed');

					await userA1.sdk.genericAction('pushTransaction', {
						action : 'burnexpired',
						account: 'fio.address',
						data   : {
							offset,
							limit: 15
						}
					})

					// Observe (via table lookup)
					const domainHash1 = stringToHash(domain);
					const domainHash2 = stringToHash(domain2);

					const domainSaleRow = await callFioApi("get_table_rows", {
						json          : true,
						code          : 'fio.escrow',
						scope         : 'fio.escrow',
						table         : 'domainsales',
						upper_bound   : domainHash1.toString(),
						lower_bound   : domainHash1.toString(),
						key_type      : 'i128',
						index_position: 2,
						reverse       : true,
						show_payer    : false
					});
					// `domain` should retain status of 2, sold
					// console.log(domainSaleRow.rows[0]);
					expect(domainSaleRow.rows[0].status).to.equal(2);

					const domainSaleRow2 = await callFioApi("get_table_rows", {
						json          : true,
						code          : 'fio.escrow',
						scope         : 'fio.escrow',
						table         : 'domainsales',
						upper_bound   : domainHash2.toString(),
						lower_bound   : domainHash2.toString(),
						key_type      : 'i128',
						index_position: 2,
						reverse       : true,
						show_payer    : false
					});
					// `domain2` should be set to 3, cancelled
					// console.log(domainSaleRow2.rows[0]);
					expect(domainSaleRow2.rows[0].status).to.equal(3);
				} catch (err) {
					console.log(err)
					expect(err).to.equal(null)
				}
			})
		})

		describe(`Error Handling Path`, async () => {
			it(`listdomain: sale price too high`, async () => {
				try {
					domainSadPath1 = generateFioDomain(10);
					domainSadPath2 = generateFioDomain(10);

					await transferTokens(userA1);
					const result = await registerDomain(userA1, domainSadPath1);

					expect(result.status).to.equal('OK')

					let dataA1 = {
						"actor"     : userA1.account,
						"fio_domain": domainSadPath1,
						"sale_price": 1000000000000000, // too high
						"max_fee"   : config.api.list_domain.fee,
						"tpid"      : ""
					};

					await userA1.sdk.genericAction('pushTransaction', {
						action : 'listdomain',
						account: 'fio.escrow',
						data   : dataA1
					})
				} catch (err) {
					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('sale_price')
					expect(err.json.fields[0].value).to.equal('1000000000000000')
					expect(err.json.fields[0].error).to.equal('Sale price should be less than 999,999 FIO (999,999,000,000,000 SUF)')
				}
			})

			it(`listdomain: sale price too low`, async () => {
				try {
					domainSadPath1 = generateFioDomain(10);
					domainSadPath2 = generateFioDomain(10);

					await transferTokens(userA1);
					const result = await registerDomain(userA1, domainSadPath1);

					expect(result.status).to.equal('OK')

					let dataA1 = {
						"actor"     : userA1.account,
						"fio_domain": domainSadPath1,
						"sale_price": 100000, // too low
						"max_fee"   : config.api.list_domain.fee,
						"tpid"      : ""
					};

					await userA1.sdk.genericAction('pushTransaction', {
						action : 'listdomain',
						account: 'fio.escrow',
						data   : dataA1
					})
				} catch (err) {
					// console.log(err.json);
					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('sale_price')
					expect(err.json.fields[0].value).to.equal('100000')
					expect(err.json.fields[0].error).to.equal('Sale price should be greater than 1 FIO (1,000,000,000 SUF)')
				}

			})

			it(`listdomain: invalid fee format`, async () => {
				try {
					domainSadPath1 = generateFioDomain(10);
					domainSadPath2 = generateFioDomain(10);

					await transferTokens(userA1);
					const result = await registerDomain(userA1, domainSadPath1);

					expect(result.status).to.equal('OK')

					let dataA1 = {
						"actor"     : userA1.account,
						"fio_domain": domainSadPath1,
						"sale_price": 500000000000,
						"max_fee"   : -1, // invalid fee format
						"tpid"      : ""
					};

					await userA1.sdk.genericAction('pushTransaction', {
						action : 'listdomain',
						account: 'fio.escrow',
						data   : dataA1
					})
				} catch (err) {
					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('max_fee')
					expect(err.json.fields[0].value).to.equal('-1')
					expect(err.json.fields[0].error).to.equal('Invalid fee value')
				}
			})

			it(`listdomain: Fee exceeds supplied maximum`, async () => {
				try {
					domainSadPath1 = generateFioDomain(10);
					domainSadPath2 = generateFioDomain(10);

					await transferTokens(userA1);
					const result = await registerDomain(userA1, domainSadPath1);

					expect(result.status).to.equal('OK')

					let dataA1 = {
						"actor"     : userA1.account,
						"fio_domain": domainSadPath1,
						"sale_price": 50000000000,
						"max_fee"   : config.api.list_domain.fee / 2, // fee too low
						"tpid"      : ""
					};

					await userA1.sdk.genericAction('pushTransaction', {
						action : 'listdomain',
						account: 'fio.escrow',
						data   : dataA1
					})

				} catch (err) {
					// console.log(err.json)
					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('max_fee')
					expect(err.json.fields[0].value).to.equal((config.api.list_domain.fee / 2).toString())
					expect(err.json.fields[0].error).to.equal('Fee exceeds supplied maximum.')
				}
			})

			it(`listdomain: invalid domain format`, async () => {
				try {
					domainSadPath1       = generateFioDomain(10);
					domainSadPath2       = generateFioDomain(10);
					const fiftyfiveChars = "0123456789012345678901234567890123456789012345678901234"
					domain0Bad           = "";
					domain63Bad          = fiftyfiveChars + Math.random().toString(26).substr(2, 8)

					await transferTokens(userA1);
					const result = await registerDomain(userA1, domainSadPath1);

					expect(result.status).to.equal('OK')

					let dataA1 = {
						"actor"     : userA1.account,
						"fio_domain": domain63Bad,
						"sale_price": 50000000000,
						"max_fee"   : config.api.list_domain.fee,
						"tpid"      : ""
					};

					await userA1.sdk.genericAction('pushTransaction', {
						action : 'listdomain',
						account: 'fio.escrow',
						data   : dataA1
					})
				} catch (err) {
					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('fio_domain')
					expect(err.json.fields[0].value).to.equal(domain63Bad)
					expect(err.json.fields[0].error).to.equal('FIO domain not found')
				}
			})

			it(`listdomain: expired domain`, async () => {
				let domain;
				try {
					// create domain
					domain = generateFioDomain(10);

					// register domain
					await registerDomain(userA1, domain);

					// expire domain
					let expireResult = await callFioApiSigned('push_transaction', {
						action : 'modexpire',
						account: 'fio.address',
						actor  : userA1.account,
						privKey: userA1.privateKey,
						data   : {
							"fio_address": domain,
							"expire"     : expireDate,
							"actor"      : userA1.account
						}
					})

					expect(expireResult.processed.receipt.status).to.equal('executed');

					// try to list domain for sale
					await listDomain(userA1, domain);

				} catch (err) {
					// console.log(err.json)
					expect(err.json.fields[0].name).to.equal('fio_domain')
					expect(err.json.fields[0].value).to.equal(domain)
					expect(err.json.fields[0].error).to.equal('FIO Domain expired. Renew first.')
				}
			})

			it(`listdomain: user does not own domain`, async () => {
				try {
					domainSadPath1 = generateFioDomain(10);
					domainSadPath2 = generateFioDomain(10);

					await transferTokens(userA1);
					const result = await registerDomain(userA1, domainSadPath1);

					expect(result.status).to.equal('OK')

					await faucet.genericAction('transferTokens', {
						payeeFioPublicKey: userA2.publicKey,
						amount           : 8000000000000,
						maxFee           : config.api.transfer_tokens_pub_key.fee,
					})

					const resultA2 = await userA2.sdk.genericAction('registerFioDomain', {
						fioDomain           : domainSadPath2,
						maxFee              : config.api.register_fio_domain.fee,
						technologyProviderId: ''
					})

					expect(resultA2.status).to.equal('OK')

					let dataA1 = {
						"actor"     : userA1.account,
						"fio_domain": domainSadPath2,
						"sale_price": 50000000000,
						"max_fee"   : config.api.list_domain.fee,
						"tpid"      : ""
					};

					await userA2.sdk.genericAction('pushTransaction', {
						action : 'listdomain',
						account: 'fio.escrow',
						data   : dataA1
					})
				} catch (err) {
					expect(err.errorCode).to.equal(403)
					expect(err.json.fields[0].name).to.equal('fio_domain')
					expect(err.json.fields[0].value).to.equal(domainSadPath2)
					expect(err.json.fields[0].error).to.equal('FIO domain not owned by actor')
				}
			})

			it(`listdomain: actor doesnt match the signer`, async () => {
				// TODO: I am not sure how to check this either.
				// I do not have an explicit error message for this error path either
				// unless the `require_auth(actor)` covers this path
				try {
					domainSadPath1 = generateFioDomain(10);
					domainSadPath2 = generateFioDomain(10);

					await transferTokens(userA1);
					const result = await registerDomain(userA1, domainSadPath1);

					expect(result.status).to.equal('OK')

					await transferTokens(userA2);
					const resultA2 = await registerDomain(userA2, domainSadPath2);

					expect(resultA2.status).to.equal('OK')

					let dataA1 = {
						"actor"     : userA1.account,
						"fio_domain": domainSadPath1,
						"sale_price": 50000000000,
						"max_fee"   : config.api.list_domain.fee,
						"tpid"      : ""
					};

					await userA2.sdk.genericAction('pushTransaction', {
						action : 'listdomain',
						account: 'fio.escrow',
						data   : dataA1
					})
				} catch (err) {
					expect(err.errorCode).to.equal(403)
					expect(err.json.fields[0].name).to.equal('fio_domain')
					expect(err.json.fields[0].value).to.equal(domainSadPath1)
					expect(err.json.fields[0].error).to.equal('FIO domain not owned by actor')
				}

			})

			it(`listdomain: list domain with e_break enabled`, async () => {
				let domain;
				try {
					domain = generateFioDomain(10);

					await transferTokens(userA1);
					const registerDomainResult = await registerDomain(userA1, domain);

					expect(registerDomainResult.status).to.equal('OK')

					// set e_break to 1
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
					expect(result.rows[0].e_break).to.equal(1);

					// list domain
					await listDomain(userA1, domain);
				} catch (err) {
					// console.log(err.json)
					expect(err.json.fields[0].name).to.equal('marketplace_iter->e_break')
					expect(err.json.fields[0].value).to.equal('1')
					expect(err.json.fields[0].error).to.equal('E-Break Enabled, action disabled')

					// set e_break back to 0
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
						limit     : 1,
						reverse   : false,
						show_payer: false
					}
					let result = await callFioApi("get_table_rows", json);
					expect(result.rows[0].e_break).to.equal(0);
				}
			})

			it(`listdomain: not enough FIO to list domain`, async () => {
				let errorUser1 = await newUser(faucet);
				let errorUser2 = await newUser(faucet);

				try {
					// get FIO balance for user2
					const errorUser2BalanceResult = await errorUser2.sdk.genericAction('getFioBalance', {
						fioPublicKey: errorUser2.publicKey
					})
					let errorUser2Balance         = errorUser2BalanceResult.balance;

					// transfer everything except 0.25 FIO to user1
					let data     = {
						action : 'trnsfiopubky',
						account: 'fio.token',
						data   : {
							payee_public_key: errorUser1.publicKey,
							amount          : errorUser2Balance - ((250000000) + config.api.transfer_tokens_pub_key.fee), // leave ~0.25 FIO left as balance
							max_fee         : config.api.transfer_tokens_pub_key.fee,
							tpid            : '',
							actor           : errorUser2.account
						}
					}
					const result = await errorUser2.sdk.genericAction('pushTransaction', data)
					expect(result.status).to.equal('OK')

					// list domain
					await listDomain(errorUser2, errorUser2.domain)
				} catch (err) {
					// if(err.json)
					// 	console.log(err.json)
					// else
					// 	console.log(err);
					expect(err.errorCode).to.equal(400);
					expect(err.json.fields[0].name).to.equal('max_fee');
					expect(err.json.fields[0].value).to.equal('5000000000');
					expect(err.json.fields[0].error).to.equal('Insufficient funds to cover fee');
				}
			})
		});
	});

	describe(`Buy Domain Listing`, async () => {

		before(async () => {
			await setup();
		})

		afterEach(async () => {
			// console.log(`${timeoutDuration / 1000} second Timeout`)
			await timeout(timeoutDuration)
		})

		describe(`Golden path`, async () => {
			// buy domain listed for sale
			it(`userA1 buys domain listed for sale by userA2`, async () => {
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
					await timeout(500);

					// Getting marketplace configurations
					const commissionFeePct = configs.rows[0].commission_fee / 100;

					let userA2ListDomainResult = await listDomain(userA2, userA2.domain, 300000000000)
					await timeout(2000); // have to wait a few seconds after listing the domain to buy the domain so the date_updated is changed

					const marketplaceBalanceResult = await marketplaceUser.sdk.genericAction('getFioBalance', {
						fioPublicKey: marketplaceUser.publicKey
					})

					const userBalanceResult = await userA1.sdk.genericAction('getFioBalance', {
						fioPublicKey: userA1.publicKey
					})
					let userA1Balance       = userBalanceResult.balance;

					const userA2BalanceResult = await userA2.sdk.genericAction('getFioBalance', {
						fioPublicKey: userA2.publicKey
					})
					let userA2Balance         = userA2BalanceResult.balance;

					let data = {
						"actor"        : userA1.account,
						"fio_domain"   : userA2.domain,
						"sale_id"      : userA2ListDomainResult.domainsale_id,
						"max_buy_price": 300000000000,
						"max_fee"      : config.api.buy_domain.fee,
						"tpid"         : ""
					};

					let marketplaceCommission = data.max_buy_price * commissionFeePct;

					const result = await userA1.sdk.genericAction('pushTransaction', {
						action : 'buydomain',
						account: 'fio.escrow',
						data   : data
					});

					const domainHash = stringToHash(userA2.domain);

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
					await timeout(500);

					const userA2BalanceResultAfter = await userA2.sdk.genericAction('getFioBalance', {
						fioPublicKey: userA2.publicKey
					})
					await timeout(500);

					const marketplaceBalanceResultAfter = await marketplaceUser.sdk.genericAction('getFioBalance', {
						fioPublicKey: marketplaceUser.publicKey
					})
					await timeout(500);

					// check balance of userA1 (buyer)
					expect(userBalanceResultAfter.balance).to.equal(userA1Balance - config.api.buy_domain.fee - domainSaleRow.rows[0].sale_price)
					// check balance of userA2 (seller)
					expect(userA2BalanceResultAfter.balance).to.equal(userA2Balance + domainSaleRow.rows[0].sale_price - marketplaceCommission)
					// check balance of marketplace
					expect(marketplaceBalanceResultAfter.balance).to.equal(marketplaceBalanceResult.balance + marketplaceCommission)

					expect(result.status).to.equal('OK')
				} catch (err) {
					if (isDebug) {
						if (err.json)
							console.log(err.json)
						else
							console.log(err);
					}
					expect(err).to.equal(null)
				}
			})
		});

		describe(`Error handling`, async () => {
			let domain           = generateFioDomain(10);
			let listDomainResult = {};

			it(`buydomain: domain not listed in domainsales table`, async () => {
				try {
					// userA1 registers domain
					domain = generateFioDomain(10);
					await registerDomain(userA1, domain);

					// userA1 lists domain for sale
					let listDomainResult = await listDomain(userA1, domain);

					// userA2 tries to buy domain not listed for sale
					let data = {
						"actor"        : userA2.account,
						"fio_domain"   : domain + '123',
						"sale_id"      : listDomainResult.domainsale_id,
						"max_buy_price": 300000000000,
						"max_fee"      : config.api.buy_domain.fee,
						"tpid"         : ""
					};

					const result = await userA1.sdk.genericAction('pushTransaction', {
						action : 'buydomain',
						account: 'fio.escrow',
						data   : data
					})
				} catch (err) {
					// console.log(err.errorCode)
					// console.log(err.json.fields[0])
					expect(err.errorCode).to.equal(403)
					expect(err.json.fields[0].name).to.equal('domainsale')
					expect(err.json.fields[0].value).to.equal(domain + '123')
					expect(err.json.fields[0].error).to.equal('Domain not found')
				}
			});

			it(`buydomain: not enough FIO to buy`, async () => {
				let buydomainErrorUser1 = await newUser(faucet);
				let buydomainErrorUser2 = await newUser(faucet);

				try {
					// lists domain
					let listDomainResult = await listDomain(buydomainErrorUser1, buydomainErrorUser1.domain)

					const buydomainErrorUser2BalanceResult = await buydomainErrorUser2.sdk.genericAction('getFioBalance', {
						fioPublicKey: buydomainErrorUser2.publicKey
					})
					let buydomainErrorUser2Balance         = buydomainErrorUser2BalanceResult.balance;

					let data     = {
						action : 'trnsfiopubky',
						account: 'fio.token',
						data   : {
							payee_public_key: buydomainErrorUser1.publicKey,
							amount          : buydomainErrorUser2Balance - ((250000000) + config.api.transfer_tokens_pub_key.fee), // leave ~0.25 FIO left as balance
							max_fee         : config.api.transfer_tokens_pub_key.fee,
							tpid            : '',
							actor           : buydomainErrorUser2.account
						}
					}
					// send all userA2 balance to userA1
					const result = await buydomainErrorUser2.sdk.genericAction('pushTransaction', data)

					// console.log('Result', result)
					expect(result.status).to.equal('OK')

					// try to buy domain listed for sale by userA1
					await buyDomain(buydomainErrorUser2, buydomainErrorUser1.domain, listDomainResult.domainsale_id)
				} catch (err) {
					// console.log(err.json)
					expect(err.errorCode).to.equal(400);
					expect(err.json.fields[0].name).to.equal('max_fee');
					expect(err.json.fields[0].value).to.equal('1880000000000');
					expect(err.json.fields[0].error).to.equal('Insufficient funds to cover fee');
				}
			});

			it(`buydomain: max_fee invalid`, async () => {
				try {
					// userA1 registers domain
					domain = generateFioDomain(10);
					await registerDomain(userA1, domain);

					// userA1 lists domain for sale
					let listDomainResult = await listDomain(userA1, domain);

					// userA2 tries to buy domain not listed for sale
					let data = {
						"actor"        : userA2.account,
						"fio_domain"   : domain,
						"sale_id"      : listDomainResult.domainsale_id,
						"max_buy_price": 300000000000,
						"max_fee"      : -1,
						"tpid"         : ""
					};

					const result = await userA1.sdk.genericAction('pushTransaction', {
						action : 'buydomain',
						account: 'fio.escrow',
						data   : data
					})

					// console.log(result);
				} catch (err) {
					// console.log(err.errorCode)
					// console.log(err.json.fields[0])
					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('max_fee')
					expect(err.json.fields[0].value).to.equal('-1')
					expect(err.json.fields[0].error).to.equal('Invalid fee value')
				}
			});

			it(`buydomain: max_fee is less than actual fee`, async () => {
				try {
					// userA1 registers domain
					domain = generateFioDomain(10);
					await transferTokens(userA1);
					await registerDomain(userA1, domain);

					// userA1 lists domain for sale
					let listDomainResult = await listDomain(userA1, domain);

					// userA2 tries to buy domain not listed for sale
					let data = {
						"actor"        : userA2.account,
						"fio_domain"   : domain,
						"sale_id"      : listDomainResult.domainsale_id,
						"max_buy_price": 300000000000,
						"max_fee"      : config.api.buy_domain.fee / 2,
						"tpid"         : ""
					};

					await userA2.sdk.genericAction('pushTransaction', {
						action : 'buydomain',
						account: 'fio.escrow',
						data   : data
					})

					// console.log(result);
				} catch (err) {
					// if(err.json)
					// 	console.log(err.json)
					// else
					// 	console.log(err);
					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('max_fee')
					expect(err.json.fields[0].value).to.equal((config.api.buy_domain.fee / 2).toString())
					expect(err.json.fields[0].error).to.equal('Fee exceeds supplied maximum. 2000000000')
				}
			});

			it(`buydomain: sale_price exceeds supplied max_buy_price`, async () => {
				try {
					// userA1 registers domain
					domain = generateFioDomain(10);
					await registerDomain(userA1, domain);
					await transferTokens(userA1);

					// userA1 lists domain for sale
					let listDomainResult = await listDomain(userA1, domain);

					// userA2 tries to buy domain not listed for sale
					let data = {
						"actor"        : userA2.account,
						"fio_domain"   : domain,
						"sale_id"      : listDomainResult.domainsale_id,
						"max_buy_price": 1, // in `amount` NOT `SUFs`
						"max_fee"      : config.api.buy_domain.fee,
						"tpid"         : ""
					};

					await userA2.sdk.genericAction('pushTransaction', {
						action : 'buydomain',
						account: 'fio.escrow',
						data   : data
					})
				} catch (err) {
					// console.log(err);
					// console.log(err.errorCode)
					// console.log(err.json.fields[0])
					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('max_buy_price')
					expect(err.json.fields[0].value).to.equal('1')
					expect(err.json.fields[0].error).to.equal('Sale Price is greater than submitted buyer max buy price')
				}
			});

			it(`buydomain: Sale ID does not match`, async () => {
				try {
					// userA1 registers domain
					domain = generateFioDomain(10);
					await registerDomain(userA1, domain);
					await transferTokens(userA1);

					// userA1 lists domain for sale
					listDomainResult = await listDomain(userA1, domain);

					let data = {
						"actor"        : userA2.account,
						"fio_domain"   : domain,
						"sale_id"      : listDomainResult.domainsale_id - 1,
						"max_buy_price": 2000, // in `amount` NOT `SUFs`
						"max_fee"      : config.api.buy_domain.fee,
						"tpid"         : ""
					};

					const result = await userA2.sdk.genericAction('pushTransaction', {
						action : 'buydomain',
						account: 'fio.escrow',
						data   : data
					})

				} catch (err) {
					// console.log(err);
					// console.log(err.errorCode)
					// console.log(err.json.fields[0])
					expect(err.errorCode).to.equal(403)
					expect(err.json.fields[0].name).to.equal('sale_id')
					expect(err.json.fields[0].value).to.equal((listDomainResult.domainsale_id - 1).toString())
					expect(err.json.fields[0].error).to.equal('Sale ID does not match')
				}
			});

			it(`buydomain: buy domain with e_break enabled`, async () => {
				try {
					// generate domain
					domain = generateFioDomain(10);

					//register domain
					await registerDomain(userA1, domain);

					// userA1 list domain for sale
					let listResult = await listDomain(userA1, domain)

					// set e_break to 1
					await callFioApiSigned('push_transaction', {
						action : 'setmrkplcfg',
						account: 'fio.escrow',
						actor  : marketplaceUser.account,
						privKey: marketplaceUser.privateKey,
						data   : {
							"actor"         : "5ufabtv13hv4",
							"listing_fee"   : "5000000000",
							"commission_fee": 6,
							"max_fee"       : "15000000000",
							"e_break"       : 1
						}
					})

					await timeout(5000)

					const json             = {
						json      : true,
						code      : 'fio.escrow',
						scope     : 'fio.escrow',
						table     : 'mrkplconfigs',
						limit     : 1,
						reverse   : false,
						show_payer: false
					}
					let getTableRowsResult = await callFioApi("get_table_rows", json);

					expect(getTableRowsResult.rows[0].e_break).to.equal(1)

					let data = {
						"actor"        : userA2.account,
						"fio_domain"   : domain,
						"sale_id"      : listResult.domainsale_id,
						"max_buy_price": 300000000000,
						"max_fee"      : 5000000000,
						"tpid"         : ""
					};

					await userA1.sdk.genericAction('pushTransaction', {
						action : 'buydomain',
						account: 'fio.escrow',
						data   : data
					})
				} catch (err) {
					// console.log(err);
					// console.log(err.json.fields[0]);
					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('marketplace_iter->e_break')
					expect(err.json.fields[0].value).to.equal('1')
					expect(err.json.fields[0].error).to.equal('E-Break Enabled, action disabled')

					await callFioApiSigned('push_transaction', {
						action : 'setmrkplcfg',
						account: 'fio.escrow',
						actor  : marketplaceUser.account,
						privKey: marketplaceUser.privateKey,
						data   : {
							"actor"         : "5ufabtv13hv4",
							"listing_fee"   : "5000000000",
							"commission_fee": 6,
							"max_fee"       : "15000000000",
							"e_break"       : 0
						}
					})

					let result = await callFioApi("get_table_rows", {
						json      : true,
						code      : 'fio.escrow',
						scope     : 'fio.escrow',
						table     : 'mrkplconfigs',
						limit     : 1,
						reverse   : false,
						show_payer: false
					});

					expect(result.rows[0].e_break).to.equal(0);
				}
			})

			it(`userA2 tries to buy userA1's cancelled domain listing`, async () => {
				try {
					// generate domain
					domain = generateFioDomain(10);

					//register domain
					await registerDomain(userA1, domain);

					// userA1 list domain for sale
					let listResult = await listDomain(userA1, domain);

					// cancel domain listing and get saleID
					let cancelData = {
						"actor"     : userA1.account,
						"fio_domain": domain,
						"max_fee"   : config.api.cancel_list_domain.fee,
						"tpid"      : ""
					};

					await userA1.sdk.genericAction('pushTransaction', {
						action : 'cxlistdomain',
						account: 'fio.escrow',
						data   : cancelData
					})

					let data = {
						"actor"        : userA2.account,
						"fio_domain"   : domain,
						"sale_id"      : listResult.domainsale_id,
						"max_buy_price": 300000000000,
						"max_fee"      : 5000000000,
						"tpid"         : ""
					};

					await userA1.sdk.genericAction('pushTransaction', {
						action : 'buydomain',
						account: 'fio.escrow',
						data   : data
					})
				} catch (err) {
					// console.log(err.json.fields[0]);
					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('status')
					expect(err.json.fields[0].value).to.equal('3')
					expect(err.json.fields[0].error).to.equal('domain has already been bought or cancelled')
				}
			});
		});
	});

	describe(`Cancel Domain Listing`, async () => {
		before(async () => {
			await setup();
		});

		afterEach(async () => {
			// console.log(`${timeoutDuration / 1000} second Timeout`)
			await timeout(timeoutDuration)
		})

		describe(`Golden Path`, async () => {
			// cancel domain listing
			it(`userA1 cancels domain listing`, async () => {
				try {
					let domain = userA1.domain;
					// give user tokens
					await transferTokens(userA1);

					// list it for sale
					await listDomain(userA1, domain, 2000000000000);
					await timeout(500);

					const userBalanceResult = await userA1.sdk.genericAction('getFioBalance', {
						fioPublicKey: userA1.publicKey
					})
					let userA1Balance       = userBalanceResult.balance;
					await timeout(500);

					let data     = {
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
					await timeout(500)

					expect(result.status).to.equal('OK');

					const domainHash    = stringToHash(domain);
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
				} catch (err) {
					console.log(err);
					expect(err).to.equal(null)
				}
			})
		})

		describe(`Error Handling`, async () => {
			beforeEach(async () => {
				domainSadPath1 = generateFioDomain(10);
				// domainSadPath2 = generateFioDomain(10);

				await faucet.genericAction('transferTokens', {
					payeeFioPublicKey: userA1.publicKey,
					amount           : 8000000000000,
					maxFee           : config.api.transfer_tokens_pub_key.fee,
				})
				const result = await userA1.sdk.genericAction('registerFioDomain', {
					fioDomain           : domainSadPath1,
					maxFee              : config.api.register_fio_domain.fee,
					technologyProviderId: ''
				})

				expect(result.status).to.equal('OK')

				let dataA1 = {
					"actor"     : userA1.account,
					"fio_domain": domainSadPath1,
					"sale_price": 10000000000,
					"max_fee"   : config.api.list_domain.fee,
					"tpid"      : ""
				};

				const resultListDomain = await userA1.sdk.genericAction('pushTransaction', {
					action : 'listdomain',
					account: 'fio.escrow',
					data   : dataA1
				})
				domainListingId        = resultListDomain.domainsale_id;
			})

			it(`cxdomain: invalid max_fee value`, async () => {
				try {
					let domain = generateFioDomain(10);

					await transferTokens(userA1);
					await timeout(500);
					// register a domain
					await registerDomain(userA1, domain);
					await timeout(500);
					// list it for sale
					await listDomain(userA1, domain, 2000000000000);
					await timeout(500);

					let data = {
						"actor"     : userA1.account,
						"fio_domain": domain,
						"max_fee"   : 0,
						"tpid"      : ""
					};

					await userA1.sdk.genericAction('pushTransaction', {
						action : 'cxlistdomain',
						account: 'fio.escrow',
						data   : data
					})
				} catch (err) {
					// console.log(err);
					// console.log(err.json);
					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('max_fee')
					expect(err.json.fields[0].value).to.equal('0')
				}
			})

			it(`cxdomain: max_fee value too low`, async () => {
				try {
					let domain = generateFioDomain(10);

					await transferTokens(userA1);
					await timeout(500);
					// register a domain
					await registerDomain(userA1, domain);
					await timeout(500);
					// list it for sale
					await listDomain(userA1, domain, 2000000000000);
					await timeout(500);

					let data = {
						"actor"     : userA1.account,
						"fio_domain": domain,
						"max_fee"   : config.api.cancel_list_domain.fee / 2,
						"tpid"      : ""
					};

					await userA1.sdk.genericAction('pushTransaction', {
						action : 'cxlistdomain',
						account: 'fio.escrow',
						data   : data
					})
				} catch (err) {
					// console.log(err);
					// console.log(err.json);
					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('max_fee')
					expect(err.json.fields[0].value).to.equal('500000000')
				}
			})

			it(`cxdomain: cancel listing without enough funds to cover fee`, async () => {

				let errorUser1 = await newUser(faucet);
				let errorUser2 = await newUser(faucet);

				try {
					// list domain for sale
					await listDomain(errorUser1, errorUser1.domain);

					// get FIO balance for user2
					const errorUser1BalanceResult = await errorUser1.sdk.genericAction('getFioBalance', {
						fioPublicKey: errorUser1.publicKey
					})
					let errorUser1Balance         = errorUser1BalanceResult.balance;

					// transfer everything except 0.25 FIO to user2
					let data     = {
						action : 'trnsfiopubky',
						account: 'fio.token',
						data   : {
							payee_public_key: errorUser2.publicKey,
							amount          : errorUser1Balance - ((250000000) + config.api.transfer_tokens_pub_key.fee), // leave ~0.25 FIO left as balance
							max_fee         : config.api.transfer_tokens_pub_key.fee,
							tpid            : '',
							actor           : errorUser1.account
						}
					}
					const result = await errorUser1.sdk.genericAction('pushTransaction', data)
					expect(result.status).to.equal('OK')

					// cancel domain listing
					let cxdata = {
						"actor"     : errorUser1.account,
						"fio_domain": errorUser1.domain,
						"max_fee"   : config.api.cancel_list_domain.fee,
						"tpid"      : ""
					};

					await errorUser1.sdk.genericAction('pushTransaction', {
						action : 'cxlistdomain',
						account: 'fio.escrow',
						data   : cxdata
					})
				} catch (err) {
					// if(err.json)
					// 	console.log(err.json)
					// else
					// 	console.log(err);
					expect(err.errorCode).to.equal(400);
					expect(err.json.fields[0].name).to.equal('max_fee');
					expect(err.json.fields[0].value).to.equal('1000000000');
					expect(err.json.fields[0].error).to.equal('Insufficient funds to cover fee');
				}

			})

			it(`cxdomain: list domain with e_break enabled`, async () => {
				try {
					// create domain

					// register domain

					// list domain

					// enable e_break

					// cancel domain listing

				} catch (err) {
					await callFioApiSigned('push_transaction', {
						action : 'setmrkplcfg',
						account: 'fio.escrow',
						actor  : marketplaceUser.account,
						privKey: marketplaceUser.privateKey,
						data   : {
							"actor"         : "5ufabtv13hv4",
							"listing_fee"   : "5000000000",
							"commission_fee": 6,
							"max_fee"       : "15000000000",
							"e_break"       : 0
						}
					})

					let result = await callFioApi("get_table_rows", {
						json      : true,
						code      : 'fio.escrow',
						scope     : 'fio.escrow',
						table     : 'mrkplconfigs',
						limit     : 1,
						reverse   : false,
						show_payer: false
					});

					expect(result.rows[0].e_break).to.equal(0);
				}
			})
		})
	});
});

async function setup() {
	if (!isSetup) {
		faucet          = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
		marketplaceUser = await existingUser(`5ufabtv13hv4`, config.MARKETPLACE_PRIV_KEY, config.MARKETPLACE_PUB_KEY,
			'marketplace', 'user@marketplace');
		userA1          = await newUser(faucet);
		userA2          = await newUser(faucet);
		domain          = generateFioDomain(10);
		domainA2        = generateFioDomain(10);
		isSetup         = true;
	}
}

async function registerDomain(user, domain) {
	return await user.sdk.genericAction('registerFioDomain', {
		fioDomain           : domain,
		maxFee              : config.api.register_fio_domain.fee,
		technologyProviderId: ''
	})
}

async function listDomain(user, domain, salePrice = 2000000000000) {
	let data = {
		"actor"     : user.account,
		"fio_domain": domain,
		"sale_price": salePrice,
		"max_fee"   : config.api.list_domain.fee,
		"tpid"      : ""
	};
	return await user.sdk.genericAction('pushTransaction', {
		action : 'listdomain',
		account: 'fio.escrow',
		data
	})
}

async function buyDomain(user, domain, saleId, salePrice = 2000000000000) {
	return await user.sdk.genericAction('pushTransaction', {
		action : 'buydomain',
		account: 'fio.escrow',
		data   : {
			"actor"        : user.account,
			"fio_domain"   : domain,
			"sale_id"      : saleId,
			"max_buy_price": salePrice,
			"max_fee"      : config.api.buy_domain.fee,
			"tpid"         : ""
		}
	})
}

async function transferTokens(user, amount = 10000000000000) {
	try {
		await faucet.genericAction('transferTokens', {
			payeeFioPublicKey: user.publicKey,
			amount           : amount,
			maxFee           : config.api.transfer_tokens_pub_key.fee,
		})
	} catch (err) {
		expect(err).to.equal(null)
	}
}

async function getRamForUser(user) {
	const json                 = {
		"account_name": user.account
	}
	let getAccountResultBefore = await callFioApi("get_account", json);
	return getAccountResultBefore.ram_quota;
}

async function getLastDomainId() {
	const json = {
		json      : true,
		code      : 'fio.address',
		scope     : 'fio.address',
		table     : 'domains',
		limit     : 1,
		reverse   : true
	}
	let result = await callFioApi("get_table_rows", json);

	return result.rows[0].id;
}

let stringToHash = (term) => {
	const hash = createHash('sha1');
	return '0x' + hash.update(term).digest().slice(0, 16).reverse().toString('hex');
};

async function newUserWithFIO() {
	let keys        = await createKeypair();
	this.account    = keys.account;
	this.privateKey = keys.privateKey;
	this.publicKey  = keys.publicKey;
	this.domain     = generateFioDomain(10);
	this.address    = generateFioAddress(this.domain, 5);

	this.ramUsage   = [];
	this.sdk        = new FIOSDK(this.privateKey, this.publicKey, config.BASE_URL, fetchJson);
	this.lockAmount = 0;
	this.lockType   = 0;

	try {
		const result1 = await this.sdk.genericAction('isAvailable', {fioName: this.domain})
		if (!result1.is_registered) {
			const result = await this.sdk.genericAction('registerFioDomain', {
				fioDomain       : this.domain,
				maxFee          : config.api.register_fio_domain.fee,
				walletFioAddress: ''
			})
			//console.log('Result', result)
			//expect(result.status).to.equal('OK')
		}
	} catch (err) {
		console.log('registerFioDomain error: ', err.json)
		console.log(err.json.error.details)
		return (err);
	}

	try {
		const result1 = await this.sdk.genericAction('isAvailable', {fioName: this.address})
		if (!result1.is_registered) {
			const result = await this.sdk.genericAction('registerFioAddress', {
				fioAddress      : this.address,
				maxFee          : config.api.register_fio_address.fee,
				walletFioAddress: ''
			})
			//console.log('Result: ', result)
			//expect(result.status).to.equal('OK')
		}
	} catch (err) {
		console.log('registerFioAddress error: ', err.json)
		return (err);
	}

	try {
		const result    = await this.sdk.genericAction('getFioBalance', {
			fioPublicKey: this.publicKey
		})
		this.fioBalance = result.balance;
		//console.log('foundationA1 fio balance', result)
		//expect(result.balance).to.equal(proxyA1.last_vote_weight)
	} catch (err) {
		console.log('getFioBalance Error', err);
		console.log(err.json.error)
	}

	return {
		privateKey: this.privateKey,
		publicKey : this.publicKey,
		account   : this.account,
		ramUsage  : this.ramUsage,
		sdk       : this.sdk,
		domain    : this.domain,
		address   : this.address,
		fioBalance: this.fioBalance,
		lockAmount: this.lockAmount,
		lockType  : this.lockType
	};
}
