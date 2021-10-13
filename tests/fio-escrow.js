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
config             = require('../config.js');

let userA1;
let userA2;
let domain;
let domainA2;
let domainSaleIdA1;
let domainSaleIdA2;
let domainSaleDateListedA1;
let domainSaleDateListedA2;

// sad paths
let domainSadPath1;
let domainSadPath2;
let faucet, marketplaceUser;

let isSetup = false;
let isDebug = true;

describe(`************************** fio-escrow.js **************************`, async () => {
	describe(`Set up Marketplace Config table`, async () => {
		before(async () => {
			await setup();
		})

		afterEach(async () => {
			await timeout(3000)
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
			// invalid commission fee value
			// invalid e_break value
		})
	});

	describe(`List Domains`, async () => {

		before(async () => {
			await setup();
		})

		afterEach(async () => {
			await timeout(1000)
		})

		describe(`Golden Path`, async () => {
			// register domain
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

			// list domain for sale
			it(`userA1 and userA2 lists domain for sale`, async () => {
				try {
					const configs                  = await callFioApi("get_table_rows", {
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
					const result      = await listDomain(userA1, domain, salePrice);

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
					expect(userBalanceResultAfter.balance).to.equal(userA1Balance - parseInt(listing_fee) - config.api.list_domain.fee)
					domainSaleIdA1 = result.domainsale_id;
					let dataA2     = {
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

			it(`burn domain that is in domainsales table`, async () => {
				// TODO: is it possible to burn a domain that is not expired? How do I make a domain expired in a unit test?

				// todo Burn domain that is in the domainsales table
				// Observe (via table lookup)
				// All references to burned domain removed from all escrow tables
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
					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('max_fee')
					expect(err.json.fields[0].value).to.equal((config.api.list_domain.fee / 2).toString())
					expect(err.json.fields[0].error).to.equal('Fee exceeds supplied maximum.')
				}
			})

			it(`listdomain: invalid tpid`, async () => {
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
						"max_fee"   : config.api.list_domain.fee,
						"tpid"      : "wrong@tpid@format"
					};

					const resultListDomain = await userA1.sdk.genericAction('pushTransaction', {
						action : 'listdomain',
						account: 'fio.escrow',
						data   : dataA1
					})

				} catch (err) {
					// console.log(err.json);

					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('tpid')
					expect(err.json.fields[0].value).to.equal(`wrong@tpid@format`)
					expect(err.json.fields[0].error).to.equal('TPID must be empty or valid FIO address')
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

			it.skip(`( ? ) listdomain: expired domain`, async () => {
				// TODO: Not sure how to do this
				// Create tests for conditions in: https://github.com/fioprotocol/fips/blob/master/fip-0026.md#exception-handling
			})

			it.skip(`( ? ) listdomain: unregistered domain`, async () => {
				// TODO this is a dupe of `list domain for sale with invalid domain format`
				// it will just not find it on the domains table on fio.address
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

					await userA1.sdk.genericAction('pushTransaction', {
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

			it(`list domain for sale where actor doesnt match the signer`, async () => {
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
		});
	});

	describe(`Buy Domain Listing`, async () => {

		before(async () => {
			await setup();
		})

		afterEach(async () => {
			await timeout(2000)
		})

		describe(`Golden path`, async () => {
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
					let userA2Balance         = userA2BalanceResult.balance;

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

					const userA2BalanceResultAfter      = await userA2.sdk.genericAction('getFioBalance', {
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
					if (isDebug) {
						console.log(err.json);
					}
					expect(err).to.equal(null)
				}
			})
		});

		describe(`Error handling`, async () => {

			it(`buydomain: domain not listed in domainsales table`, async () => {

			});

			it(`buydomain: invalid FIO domain`, async () => {

			});

			it(`buydomain: not enough FIO to buy`, async () => {

			});

			it(`buydomain: max_fee invalid`, async () => {

			});

			it(`buydomain: max_fee is less than actual fee`, async () => {

			});

			it(`buydomain: sale_price exceeds supplied max_buy_price`, async () => {

			});

			it(`userA2 tries to buy userA1's cancelled domain listing`, async () => {
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
				} catch (err) {

					console.log(err.json);

					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('status')
					expect(err.json.fields[0].value).to.equal('3')
				}
			});
		});
	});

	describe(`Cancel Domain Listing`, async () => {
		let domainSadPath1;
		let domainSadPath2;
		let domainListingId;

		before(async () => {
			await setup();
		});

		afterEach(async () => {
			await timeout(2000)
		});

		describe(`Golden Path`, async () => {
			// cancel domain listing
			it.skip(`userA1 cancels domain listing`, async () => {
				try {
					// give user tokens
					await transferTokens(userA1);
					await timeout(500);

					const userBalanceResult = await userA1.sdk.genericAction('getFioBalance', {
						fioPublicKey: userA1.publicKey
					})
					let userA1Balance       = userBalanceResult.balance;
					let domain              = generateFioDomain(10);

					// register a domain
					await registerDomain(userA1, domain);
					await timeout(500);

					// list it for sale
					await listDomain(userA1, domain, 2000000000000);
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

					// TODO: check ram allocation after listing a domain
					// TODO: check no bundle transactions deducted

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
				try {
					let user   = await newUserWithFIO();
					let domain = generateFioDomain(10);

					await transferTokens(user, 100000000);
					await timeout(500);
					// register a domain
					await registerDomain(user, domain);
					await timeout(500);
					// list it for sale
					await listDomain(user, domain, 2000000000000);
					await timeout(500);

					let data = {
						"actor"     : user.account,
						"fio_domain": domain,
						"max_fee"   : config.api.cancel_list_domain.fee,
						"tpid"      : ""
					};

					await user.sdk.genericAction('pushTransaction', {
						action : 'cxlistdomain',
						account: 'fio.escrow',
						data   : data
					})
				} catch (err) {
					console.log(err);
					console.log(err.json);
					expect(err.errorCode).to.equal(400)
					expect(err.json.fields[0].name).to.equal('max_fee')
					expect(err.json.fields[0].value).to.equal('500000000')
				}
			})

			it(`cxdomain: invalid TPID`, async () => {

			})
		})
	});
});

async function setup() {
	if (!isSetup) {
		faucet          = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
		marketplaceUser = await existingUser(`5ufabtv13hv4`, config.MARKETPLACE_PRIV_KEY, config.MARKETPLACE_PUB_KEY,
			'marketplace', 'user@marketplace')
		userA1          = await newUser(faucet);
		userA2          = await newUser(faucet);
		domain          = generateFioDomain(10);
		domainA2        = generateFioDomain(10);
		isSetup         = true;
	}
}

async function registerDomain(user, domain) {
	try {
		return await user.sdk.genericAction('registerFioDomain', {
			fioDomain           : domain,
			maxFee              : config.api.register_fio_domain.fee,
			technologyProviderId: ''
		})
	} catch (err) {
		if (err)
			console.log(err);
		expect(err).to.equal(null)
	}
}

async function listDomain(user, domain, salePrice = 2000000000000) {
	try {
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
	} catch (err) {
		expect(err).to.equal(null)
		console.log(err);
	}
}

async function transferTokens(user, amount = 8000000000000) {
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
