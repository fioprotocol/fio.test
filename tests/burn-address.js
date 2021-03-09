require('mocha')
const {expect} = require('chai')
const {newUser, generateFioAddress, callFioApiSigned, callFioApi, getFees, timeout, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

describe('************************** burn-address.js ************************** \n    A. Test Burn FIO Address using push_transaction with burnaddress action ', () => {

    let walletA1, walletA1FioNames, balance, prevBundleCount, walletA1OrigBalance, burn_fio_address_fee, feeCollected

    it(`Create users`, async () => {
        walletA1 = await newUser(faucet);
        walletA1.address2 = generateFioAddress(walletA1.domain, 5)
        wallet2 = await newUser(faucet);
    })

    it(`Register walletA1.address2`, async () => {
        const result = await walletA1.sdk.genericAction('registerFioAddress', {
            fioAddress: walletA1.address2,
            maxFee: config.api.register_fio_address.fee,
            technologyProviderId: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
    })

    it(`getFioNames for walletA1 and confirm it owns 2 addresses and that one of them is walletA1.address2`, async () => {
        try {
            const result = await walletA1.sdk.genericAction('getFioNames', {
                fioPublicKey: walletA1.publicKey
            })
            //console.log('getFioNames', result)
            expect(result.fio_addresses.length).to.equal(2)
            expect(result.fio_domains[0].fio_domain).to.equal(walletA1.domain)
            expect(result.fio_addresses[0].fio_address).to.equal(walletA1.address)
            expect(result.fio_addresses[1].fio_address).to.equal(walletA1.address2)
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it('Call get_table_rows from fionames to get bundles remaining for walletA1. Verify NNN bundles', async () => {
        try {
            const json = {
                json: true,               // Get the response as json
                code: 'fio.address',      // Contract that we target
                scope: 'fio.address',         // Account that owns the data
                table: 'fionames',        // Table name
                limit: 1000,                // Maximum number of rows that we want to get
                reverse: false,           // Optional: Get reversed data
                show_payer: false          // Optional: Show ram payer
            }
            fionames = await callFioApi("get_table_rows", json);
            //console.log('fionames: ', fionames);
            for (fioname in fionames.rows) {
                if (fionames.rows[fioname].name == walletA1.address) {
                    //console.log('bundleeligiblecountdown: ', fionames.rows[fioname].bundleeligiblecountdown);
                    prevBundleCount = fionames.rows[fioname].bundleeligiblecountdown;
                }
            }
            expect(prevBundleCount).to.equal(100);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it('Confirm burn_fio_address fee for walletA1 is zero (bundles remaining)', async () => {
        try {
            result = await walletA1.sdk.getFee('burn_fio_address', walletA1.address);
            //console.log('result: ', result)
            expect(result.fee).to.equal(0);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Burn walletA1.address2. Expect status = 'OK'. Expect fee_collected = 0`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'burnaddress',
                account: 'fio.address',
                actor: walletA1.account,
                privKey: walletA1.privateKey,
                data: {
                    "fio_address": walletA1.address2,
                    "max_fee": config.api.burn_fio_address.fee,
                    "tpid": '',
                    "actor": walletA1.account
                }
            })
            //console.log('Result: ', JSON.parse(result.processed.action_traces[0].receipt.response));
            expect(JSON.parse(result.processed.action_traces[0].receipt.response).status).to.equal('OK');
            expect(JSON.parse(result.processed.action_traces[0].receipt.response).fee_collected).to.equal(0);
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })

    it(`getFioNames for walletA1 and confirm it now only owns 1 address`, async () => {
        try {
            walletA1FioNames = await walletA1.sdk.genericAction('getFioNames', {
                fioPublicKey: walletA1.publicKey
            })
            //console.log('getFioNames', result)
            expect(walletA1FioNames.fio_addresses.length).to.equal(1)
            expect(walletA1FioNames.fio_domains[0].fio_domain).to.equal(walletA1.domain)
            expect(walletA1FioNames.fio_addresses[0].fio_address).to.equal(walletA1.address)
        } catch (err) {
            console.log('Error:', err)
            expect(err).to.equal(null)
        }
    })

    it(`Call get_table_rows from fionames. Verify address not in table.`, async () => {
        let inTable = false;
        try {
          const json = {
            json: true,               // Get the response as json
            code: 'fio.address',      // Contract that we target
            scope: 'fio.address',         // Account that owns the data
            table: 'fionames',        // Table name
            limit: 1000,                // Maximum number of rows that we want to get
            reverse: false,           // Optional: Get reversed data
            show_payer: false          // Optional: Show ram payer
          }
          fionames = await callFioApi("get_table_rows", json);
          //console.log('fionames: ', fionames);
          for (fioname in fionames.rows) {
            if (fionames.rows[fioname].name == walletA1.address2) {
              //console.log('fioname: ', fionames.rows[fioname]);
              inTable = true;
            }
          }
          expect(inTable).to.equal(false);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      })

    it(`Use up all of walletA1's bundles with 51 record_obt_data transactions`, async () => {
        for (i = 0; i < 51; i++) {
            try {
                const result = await walletA1.sdk.genericAction('recordObtData', {
                    payerFioAddress: walletA1.address,
                    payeeFioAddress: wallet2.address,
                    payerTokenPublicAddress: walletA1.publicKey,
                    payeeTokenPublicAddress: wallet2.publicKey,
                    amount: 5000000000,
                    chainCode: "BTC",
                    tokenCode: "BTC",
                    status: '',
                    obtId: '',
                    maxFee: config.api.record_obt_data.fee,
                    technologyProviderId: '',
                    payeeFioPublicKey: wallet2.publicKey,
                    memo: 'this is a test',
                    hash: '',
                    offLineUrl: ''
                })
                //console.log('Result: ', result)
                expect(result.status).to.equal('sent_to_blockchain')
            } catch (err) {
                console.log('Error', err.json)
                expect(err).to.equal(null)
            }
        }
    })

    it('Call get_table_rows from fionames to get bundles remaining for walletA1. Expect 0 bundles', async () => {
        try {
          let bundleCount;
          const json = {
            json: true,               // Get the response as json
            code: 'fio.address',      // Contract that we target
            scope: 'fio.address',         // Account that owns the data
            table: 'fionames',        // Table name
            limit: 1000,                // Maximum number of rows that we want to get
            reverse: false,           // Optional: Get reversed data
            show_payer: false          // Optional: Show ram payer
          }
          fionames = await callFioApi("get_table_rows", json);
          //console.log('fionames: ', fionames);
          for (fioname in fionames.rows) {
            if (fionames.rows[fioname].name == walletA1.address) {
              //console.log('bundleCount: ', fionames.rows[fioname].bundleeligiblecountdown);
              bundleCount = fionames.rows[fioname].bundleeligiblecountdown;
            }
          }
          expect(bundleCount).to.equal(0);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      })

    it(`Confirm burn_fio_address fee for walletA1.address is ${config.api.burn_fio_address.fee}`, async () => {
        try {
            result = await walletA1.sdk.getFee('burn_fio_address', walletA1.address);
            //console.log('result: ', result)
            expect(result.fee).to.equal(config.api.burn_fio_address.fee);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Get balance for walletA1`, async () => {
        try {
            const result = await walletA1.sdk.genericAction('getFioBalance', {
                fioPublicKey: walletA1.publicKey
            })
            balance = result.balance
            //console.log('balance: ', balance)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Burn walletA1.address. Expect status = 'OK'. Expect fee_collected = ${config.api.burn_fio_address.fee}`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'burnaddress',
                account: 'fio.address',
                actor: walletA1.account,
                privKey: walletA1.privateKey,
                data: {
                    "fio_address": walletA1.address,
                    "max_fee": config.api.burn_fio_address.fee,
                    "tpid": '',
                    "actor": walletA1.account
                }
            })
            //console.log('Result: ', JSON.parse(result.processed.action_traces[0].receipt.response));
            expect(JSON.parse(result.processed.action_traces[0].receipt.response).status).to.equal('OK');
            expect(JSON.parse(result.processed.action_traces[0].receipt.response).fee_collected).to.equal(config.api.burn_fio_address.fee);
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })

    it(`Call get_table_rows from fionames. Verify address not in table.`, async () => {
        let inTable = false;
        try {
          const json = {
            json: true,               // Get the response as json
            code: 'fio.address',      // Contract that we target
            scope: 'fio.address',         // Account that owns the data
            table: 'fionames',        // Table name
            limit: 1000,                // Maximum number of rows that we want to get
            reverse: false,           // Optional: Get reversed data
            show_payer: false          // Optional: Show ram payer
          }
          fionames = await callFioApi("get_table_rows", json);
          //console.log('fionames: ', fionames);
          for (fioname in fionames.rows) {
            if (fionames.rows[fioname].name == walletA1.address) {
              //console.log('fioname: ', fionames.rows[fioname]);
              inTable = true;
            }
          }
          expect(inTable).to.equal(false);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      })

    it('Confirm fee was deducted from walletA1 account', async () => {
        let origBalance = balance;
        const result = await walletA1.sdk.genericAction('getFioBalance', {
            fioPublicKey: walletA1.publicKey
        })
        //console.log('balance: ', result.balance);
        expect(result.balance).to.equal(origBalance - config.api.burn_fio_address.fee);
      })

})

describe('C. Run get_fee on burn_fio_address', () => {

    let walletC1, feeFromTable, feeFromApi

    it('Create users', async () => {
        walletC1 = await newUser(faucet);
    })

    it('Get burn_fio_address fee directly from fiofees table', async () => {
        try {
            fees = await getFees();
            //console.log('Result: ', fees['burn_fio_domain']);
            feeFromTable = fees['burn_fio_address'];
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })

    it('Call sdk getFee on burn_fio_address endpoint for walletC1 and verify the fee is 0 showing a bundled transaction', async () => {
        try {
            result = await walletC1.sdk.getFee('burn_fio_address', walletC1.address);
            feeFromApi = result.fee;
            expect(feeFromApi).to.not.equal(feeFromTable);
        } catch (err) {
            //console.log('Error', err);
            expect(err).to.equal(null);
        }
    })
})

describe('D. burnFioAddress Error testing', () => {
    let userD1, userD2

    it(`Create users`, async () => {
        userD1 = await newUser(faucet);
        userD1.address2 = generateFioAddress(userD1.domain, 5)

        userD2 = await newUser(faucet);
    })

    it(`(SDK) Burn address with invalid address format. SDK rejects with no type and error: ${config.error.fioAddressInvalidChar}`, async () => {
        try {
            const result = await userD1.sdk.genericAction('burnFioAddress', {
                fioAddress: ']invid@domain',
                maxFee: config.api.burn_fio_address.fee,
                technologyProviderId: ''
            })
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err)
            expect(err.list[0].message).to.equal(config.error.fioAddressInvalidChar)
        }
    })

    it(`Burn address with invalid max_fee format (-33000000000). Expect error type 400: ${config.error.invalidFeeValue}`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'burnaddress',
                account: 'fio.address',
                actor: userD1.account,
                privKey: userD1.privateKey,
                data: {
                    "fio_address": userD1.address,
                    "max_fee": -33000000000,
                    "tpid": '',
                    "actor": userD1.account
                }
            })
            //console.log('Result: ', result);
            expect(result.fields[0].error).to.equal(config.error.invalidFeeValue)
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })

    it(`(SDK) Burn address with invalid tpid. SDK rejects with no type and error:  ${config.error.invalidTpidSdk}`, async () => {
        try {
            const result = await userD1.sdk.genericAction('burnFioAddress', {
                fioAddress: userD1.address,
                maxFee: config.api.burn_fio_address.fee,
                technologyProviderId: 'invalidtpid'
            })
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err)
            expect(err.list[0].message).to.equal(config.error.invalidTpidSdk)
        }
    })

    it(`(Push transaction) Burn address with invalid tpid. Expect error type 400: ${config.error.invalidTpid}`, async () => {
        try{
            const result = await userD1.sdk.genericAction('pushTransaction', {
                action: 'burnaddress',
                account: 'fio.address',
                data: {
                    "fio_address": userD1.address,
                    "max_fee": config.api.burn_fio_address.fee,
                    "tpid": '##invalidtpid##',
                    "actor": userD1.account
                }
            })
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err)
            expect(err.json.fields[0].error).to.equal(config.error.invalidTpid);
            expect(err.errorCode).to.equal(400);
        }
    })

    it(`Burn address not owned by actor. Expect error type 403: ${config.error.signatureError}`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'burnaddress',
                account: 'fio.address',
                actor: userD1.account,
                privKey: userD1.privateKey,
                data: {
                    "fio_address": userD2.address,
                    "max_fee": config.api.burn_fio_address.fee,
                    "tpid": '',
                    "actor": userD1.account
                }
            })
            //console.log('Result: ', result);
            expect(result.message).to.equal(config.error.signatureError)
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })

    it(`Burn address that is not registered. Expect error type 400: ${config.error.fioAddressNotRegistered}`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'burnaddress',
                account: 'fio.address',
                actor: userD1.account,
                privKey: userD1.privateKey,
                data: {
                    "fio_address": 'sdaewrewfa@dkahsdk',
                    "max_fee": config.api.burn_fio_address.fee,
                    "tpid": '',
                    "actor": userD1.account
                }
            })
            //console.log('Result: ', result);
            expect(result.fields[0].error).to.equal(config.error.fioAddressNotRegistered)
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })

    it(`Use up all of userD1's bundles with 51 record_obt_data transactions`, async () => {
        for (i = 0; i < 51; i++) {
            try {
                const result = await userD1.sdk.genericAction('recordObtData', {
                    payerFioAddress: userD1.address,
                    payeeFioAddress: userD2.address,
                    payerTokenPublicAddress: userD1.publicKey,
                    payeeTokenPublicAddress: userD2.publicKey,
                    amount: 5000000000,
                    chainCode: "BTC",
                    tokenCode: "BTC",
                    status: '',
                    obtId: '',
                    maxFee: config.api.record_obt_data.fee,
                    technologyProviderId: '',
                    payeeFioPublicKey: userD2.publicKey,
                    memo: 'this is a test',
                    hash: '',
                    offLineUrl: ''
                })
                //console.log('Result: ', result)
                expect(result.status).to.equal('sent_to_blockchain')
            } catch (err) {
                console.log('Error', err.json)
                expect(err).to.equal(null)
            }
        }
    })

    it(`Get balance for userD1`, async () => {
        try {
            const result = await userD1.sdk.genericAction('getFioBalance', {
                fioPublicKey: userD1.publicKey
            })
            userC1Balance = result.balance
            //console.log('userD1 fio balance', result)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Burn address with insufficient max fee. Expect error type 400: ${config.error.feeExceedsMax}`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'burnaddress',
                account: 'fio.address',
                actor: userD1.account,
                privKey: userD1.privateKey,
                data: {
                    "fio_address": userD1.address,
                    "max_fee": config.api.burn_fio_address.fee - 200000000,
                    "tpid": '',
                    "actor": userD1.account
                }
            })
            //console.log('Result: ', result);
            expect(result.fields[0].error).to.equal(config.error.feeExceedsMax)
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })


    it('Transfer entire balance for userD1 to userD2', async () => {
        try {
            const result = await userD1.sdk.genericAction('transferTokens', {
                payeeFioPublicKey: userD2.publicKey,
                amount: userC1Balance - config.api.transfer_tokens_pub_key.fee,
                maxFee: config.api.transfer_tokens_pub_key.fee,
                technologyProviderId: ''
            })
            //console.log('Result: ', result)
            expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })

    it(`Verify balance for userD1 = 0`, async () => {
        try {
            const result = await userD1.sdk.genericAction('getFioBalance', {
                fioPublicKey: userD1.publicKey
            })
            //console.log('userD1 fio balance', result)
            expect(result.balance).to.equal(0)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it('Call get_table_rows from fionames to get bundles remaining for userD1. Verify 0 bundles', async () => {
        let bundleCount
        try {
            const json = {
                json: true,               // Get the response as json
                code: 'fio.address',      // Contract that we target
                scope: 'fio.address',         // Account that owns the data
                table: 'fionames',        // Table name
                limit: 1000,                // Maximum number of rows that we want to get
                reverse: false,           // Optional: Get reversed data
                show_payer: false          // Optional: Show ram payer
            }
            fionames = await callFioApi("get_table_rows", json);
            //console.log('fionames: ', fionames);
            for (fioname in fionames.rows) {
                if (fionames.rows[fioname].name == userD1.address) {
                    //console.log('bundleeligiblecountdown: ', fionames.rows[fioname].bundleeligiblecountdown);
                    bundleCount = fionames.rows[fioname].bundleeligiblecountdown;
                }
            }
            expect(bundleCount).to.equal(0);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Burn address with insufficient funds and no bundled transactions. Expect error type 400: ${config.error.insufficientFunds}`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'burnaddress',
                account: 'fio.address',
                actor: userD1.account,
                privKey: userD1.privateKey,
                data: {
                    "fio_address": userD1.address,
                    "max_fee": config.api.burn_fio_address.fee,
                    "tpid": '',
                    "actor": userD1.account
                }
            })
            //console.log('Result: ', result);
            expect(result.fields[0].error).to.equal(config.error.insufficientFunds)
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })

})

describe('E. Test burnfioaddress SDK call (uses chain/burn_fio_address endpoint)', () => {

    let walletA1, walletA1FioNames

    it(`Create users`, async () => {
        walletA1 = await newUser(faucet);
        walletA1.address2 = generateFioAddress(walletA1.domain, 5)
        wallet2 = await newUser(faucet);
    })

    it(`Register walletA1.address2`, async () => {
        const result = await walletA1.sdk.genericAction('registerFioAddress', {
            fioAddress: walletA1.address2,
            maxFee: config.api.register_fio_address.fee,
            technologyProviderId: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
    })

    it(`getFioNames for walletA1 and confirm it owns 2 addresses and that one of them is walletA1.address2`, async () => {
        try {
            const result = await walletA1.sdk.genericAction('getFioNames', {
                fioPublicKey: walletA1.publicKey
            })
            //console.log('getFioNames', result)
            expect(result.fio_addresses.length).to.equal(2)
            expect(result.fio_domains[0].fio_domain).to.equal(walletA1.domain)
            expect(result.fio_addresses[0].fio_address).to.equal(walletA1.address)
            expect(result.fio_addresses[1].fio_address).to.equal(walletA1.address2)
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it('Confirm burn_fio_address fee for walletA1 is zero (bundles remaining)', async () => {
        try {
            result = await walletA1.sdk.getFee('burn_fio_address', walletA1.address);
            //console.log('result: ', result)
            expect(result.fee).to.equal(0);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`(SDK) Burn walletA1.address2. Expect status = 'OK'. Expect fee_collected = 0`, async () => {
        try {
            const result = await walletA1.sdk.genericAction('burnFioAddress', {
                fioAddress: walletA1.address2,
                maxFee: config.api.burn_fio_address.fee,
                technologyProviderId: ''
            })
            //console.log('Result: ', result);
            expect(result.status).to.equal('OK');
            expect(result.fee_collected).to.equal(0);
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })

    it(`getFioNames for walletA1 and confirm it now only owns 1 address`, async () => {
        try {
            walletA1FioNames = await walletA1.sdk.genericAction('getFioNames', {
                fioPublicKey: walletA1.publicKey
            })
            //console.log('getFioNames', result)
            expect(walletA1FioNames.fio_addresses.length).to.equal(1)
            expect(walletA1FioNames.fio_domains[0].fio_domain).to.equal(walletA1.domain)
            expect(walletA1FioNames.fio_addresses[0].fio_address).to.equal(walletA1.address)
        } catch (err) {
            console.log('Error:', err)
            expect(err).to.equal(null)
        }
    })

    it(`Call get_table_rows from fionames. Verify address not in table.`, async () => {
        let inTable = false;
        try {
          const json = {
            json: true,               // Get the response as json
            code: 'fio.address',      // Contract that we target
            scope: 'fio.address',         // Account that owns the data
            table: 'fionames',        // Table name
            limit: 1000,                // Maximum number of rows that we want to get
            reverse: false,           // Optional: Get reversed data
            show_payer: false          // Optional: Show ram payer
          }
          fionames = await callFioApi("get_table_rows", json);
          //console.log('fionames: ', fionames);
          for (fioname in fionames.rows) {
            if (fionames.rows[fioname].name == walletA1.address2) {
              //console.log('fioname: ', fionames.rows[fioname]);
              inTable = true;
            }
          }
          expect(inTable).to.equal(false);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
    })
})

describe('F. Confirm active producers and proxy cannot burn address', () => {

    let user1, prod1, proxy1, burn_fio_address_fee

    it(`Create users`, async () => {
        user1 =  await newUser(faucet);
        prod1 = await newUser(faucet);
        proxy1 = await newUser(faucet);
    })

    it('Get transfer_fio_address fee', async () => {
        try {
            result = await user1.sdk.getFee('burn_fio_address', user1.address);
            burn_fio_address_fee = result.fee;
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Register prod1 as producer`, async () => {
        try {
          const result = await prod1.sdk.genericAction('pushTransaction', {
            action: 'regproducer',
            account: 'eosio',
            data: {
              fio_address: prod1.address,
              fio_pub_key: prod1.publicKey,
              url: "https://mywebsite.io/",
              location: 80,
              actor: prod1.account,
              max_fee: config.api.register_producer.fee
            }
          })
          //console.log('Result: ', result)
          expect(result.status).to.equal('OK') 
        } catch (err) {
          console.log('Error: ', err.json)
        } 
    })

    it(`Wait a few seconds.`, async () => { await timeout(3000) })

    it(`Burn prod1.address. Expect error 400:  ${config.error.activeProducer}`, async () => {
        try{
            const result = await prod1.sdk.genericAction('pushTransaction', {
                action: 'burnaddress',
                account: 'fio.address',
                data: {
                    "fio_address": prod1.address,
                    "max_fee": burn_fio_address_fee,
                    "tpid": '',
                    "actor": prod1.account
                }
            })
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err)
            expect(err.json.fields[0].error).to.equal(config.error.activeProducer);
            expect(err.errorCode).to.equal(400);
        }
    })

    it(`Register proxy1 as a proxy`, async () => {
        try {
          const result = await proxy1.sdk.genericAction('pushTransaction', {
            action: 'regproxy',
            account: 'eosio',
            data: {
              fio_address: proxy1.address,
              actor: proxy1.account,
              max_fee: config.api.register_proxy.fee
            }
          })
          //console.log('Result: ', result)
          expect(result.status).to.equal('OK')
        } catch (err) {
          console.log('Error: ', err.json)
          expect(err).to.equal('null')
        }
    })

    it(`Wait a few seconds.`, async () => { await timeout(3000) })

    it('Confirm is_proxy = 1 for proxy1 ', async () => {
        try {
            const json = {
                json: true,
                code: 'eosio',
                scope: 'eosio',
                table: 'voters',
                limit: 1000,
                reverse: true,
                show_payer: false
            }
            voters = await callFioApi("get_table_rows", json);
            //console.log('voters: ', voters);
            for (voter in voters.rows) {
                if (voters.rows[voter].owner == proxy1.account) {
                  //console.log('voters.rows[voter]: ', voters.rows[voter]);
                  break;
                }
            }
            expect(voters.rows[voter].owner).to.equal(proxy1.account);
            expect(voters.rows[voter].is_proxy).to.equal(1);            
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
      })


    it(`Burn proxy1.address. Expect error 400:  ${config.error.activeProxy}`, async () => {
        try{
            const result = await proxy1.sdk.genericAction('pushTransaction', {
                action: 'burnaddress',
                account: 'fio.address',
                data: {
                    "fio_address": proxy1.address,
                    "max_fee": burn_fio_address_fee,
                    "tpid": '',
                    "actor": proxy1.account
                }
            })
            console.log('Result: ', result)
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err)
            expect(err.json.fields[0].error).to.equal(config.error.activeProxy);
            expect(err.errorCode).to.equal(400);
        }
    })

})