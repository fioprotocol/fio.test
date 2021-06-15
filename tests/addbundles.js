require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, timeout, getTestType, callFioApi} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');
const testType = getTestType();

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe('************************** addbundles.js ************************** \n    A. Add 1 set of bundled transactions for FIO Address owned by signer.', () => {

    let user1, user1OrigBalance, user1OrigRam, add_bundled_transactions_fee, feeCollected
    let bundledVoteNumber = config.defaultBundleCount;
    let bundleSets = 2;

    it(`Create users`, async () => {
        user1 = await newUser(faucet);
    })

    it('Get add_bundled_transactions_fee', async () => {
        try {
            result = await user1.sdk.getFee('add_bundled_transactions', user1.address);
            add_bundled_transactions_fee = result.fee;
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Get bundledbvotenumber from bundlevoters table`, async () => {
        try {
            const json = {
              json: true,
              code: 'fio.fee',
              scope: 'fio.fee',
              table: 'bundlevoters',
              limit: 10,
              reverse: false,
              show_payer: false
            }
            result = await callFioApi("get_table_rows", json);
            if (result.rows.length != 0) {
                bundledVoteNumber = result.rows[0].bundledbvotenumber;
            }
            //console.log('bundledVoteNumber: ', bundledVoteNumber);
            expect(bundledVoteNumber).to.greaterThan(0);  
          } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
          }
    })

    it(`Get balance for user1`, async () => {
        try {
            const result = await user1.sdk.genericAction('getFioBalance', {
                fioPublicKey: user1.publicKey
            })
            user1OrigBalance = result.balance
            //console.log('user1 fio balance', result)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get RAM quota for user1`, async () => {
        try {
            const json = {
                "account_name": user1.account
            }
            result = await callFioApi("get_account", json);
            user1OrigRam = result.ram_quota;
            //console.log('Ram quota: ', result.ram_quota);
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get bundle count for user1 `, async () => {
        const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey })
        //console.log('Result: ', result)
        user1BundleCount = result.fio_addresses[0].remaining_bundled_tx;
        expect(user1BundleCount).to.be.greaterThan(0)
      })

    it(`(${testType}) Add bundles with ${bundleSets} sets for FIO Address owned by other user (fixed in BD-2308)`, async () => {
        if (testType == 'sdk') {
            try {
                const result = await user1.sdk.genericAction('addBundledTransactions', {
                    fioAddress: user1.address,
                    bundleSets: 1,
                    maxFee: add_bundled_transactions_fee * bundleSets,
                    technologyProviderId: ''
                })
                feeCollected = result.fee_collected;
                //console.log('Result:', result)
                expect(result.status).to.equal('OK')
            } catch (err) {
                console.log('Error', err.json.fields)
                expect(err).to.equal(null)
            }
        } else {  
           try {
                const result = await user1.sdk.genericAction('pushTransaction', {
                    action: 'addbundles',
                    account: 'fio.address',
                    data: {
                        fio_address: user1.address,
                        bundle_sets: bundleSets,
                        max_fee: add_bundled_transactions_fee * bundleSets,
                        technologyProviderId: ''
                    }
                })
                feeCollected = result.fee_collected;
                //console.log('Result: ', result);
                expect(result.status).to.equal('OK');
            } catch (err) {
                console.log('Error: ', err);
                expect(err).to.equal(null);
            }
        }
    })

    it(`Confirm fee collected = ${bundleSets} * add_bundled_transactions_fee`, async () => {
        expect(feeCollected).to.equal(add_bundled_transactions_fee * bundleSets)
    })

    it('Confirm fee was deducted from user1 account', async () => {
        try {
            const result = await user1.sdk.genericAction('getFioBalance', {
                fioPublicKey: user1.publicKey
            })
            expect(result.balance).to.equal(user1OrigBalance - feeCollected)
            //console.log('user1 fio balance', result)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Confirm RAM quota for user1 was incremented by ${config.RAM.BUNDLEVOTERAM}`, async () => {
        try {
            const json = {
                "account_name": user1.account
            }
            result = await callFioApi("get_account", json);
            //console.log('Ram quota: ', result.ram_quota);
            expect(result.ram_quota).to.equal(user1OrigRam + config.RAM.BUNDLEVOTERAM);
        } catch (err) {
            //console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Get bundle count for user1 `, async () => {
        let prevBundleCount = user1BundleCount;
        const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey })
        //console.log('Result: ', result)
        user1BundleCount = result.fio_addresses[0].remaining_bundled_tx;
        expect(user1BundleCount).to.equal(prevBundleCount + (bundleSets * bundledVoteNumber));
      })

})

describe('B. Add 3 sets of bundled transactions for FIO Address owned by other user.', () => {

    let user1, user2, user1BundleCount, user2BundleCount, user1OrigBalance, user2OrigBalance, user1OrigRam, add_bundled_transactions_fee, feeCollected
    let bundledVoteNumber = config.defaultBundleCount;
    let bundleSets = 3;

    it(`Create users`, async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
    })

    it('Get add_bundled_transactions_fee', async () => {
        try {
            result = await user1.sdk.getFee('add_bundled_transactions', user1.address);
            add_bundled_transactions_fee = result.fee;
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Get bundledbvotenumber from bundlevoters table`, async () => {
        try {
            const json = {
              json: true,
              code: 'fio.fee',
              scope: 'fio.fee',
              table: 'bundlevoters',
              limit: 10,
              reverse: false,
              show_payer: false
            }
            result = await callFioApi("get_table_rows", json);
            if (result.rows.length != 0) {
                bundledVoteNumber = result.rows[0].bundledbvotenumber;
            }
            //console.log('bundledVoteNumber: ', bundledVoteNumber);
            expect(bundledVoteNumber).to.greaterThan(0);  
          } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
          }
    })

    it(`Get balance for user1`, async () => {
        try {
            const result = await user1.sdk.genericAction('getFioBalance', {
                fioPublicKey: user1.publicKey
            })
            user1OrigBalance = result.balance
            //console.log('user1 fio balance', result)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get balance for user2`, async () => {
        try {
            const result = await user2.sdk.genericAction('getFioBalance', {
                fioPublicKey: user2.publicKey
            })
            user2OrigBalance = result.balance
            //console.log('user1 fio balance', result)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get RAM quota for user1`, async () => {
        try {
            const json = {
                "account_name": user1.account
            }
            result = await callFioApi("get_account", json);
            user1OrigRam = result.ram_quota;
            //console.log('Ram quota: ', result.ram_quota);
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get bundle count for user1 `, async () => {
        const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey })
        //console.log('Result: ', result)
        user1BundleCount = result.fio_addresses[0].remaining_bundled_tx;
        expect(user1BundleCount).to.be.greaterThan(0);
    })

    it(`Get bundle count for user2 `, async () => {
        const result = await user2.sdk.genericAction('getFioNames', { fioPublicKey: user2.publicKey })
        //console.log('Result: ', result)
        user2BundleCount = result.fio_addresses[0].remaining_bundled_tx;
        expect(user2BundleCount).to.be.greaterThan(0);
    })

    it(`(${testType}) user1 run addbundles with ${bundleSets} sets for FIO Address owned by user2 (fixed in BD-2308)`, async () => {
        if (testType == 'sdk') {
            try {
                const result = await user1.sdk.genericAction('addBundledTransactions', {
                    fioAddress: user2.address,
                    bundleSets: bundleSets,
                    maxFee: add_bundled_transactions_fee * bundleSets,
                    technologyProviderId: ''
                })
                feeCollected = result.fee_collected;
                //console.log('Result:', result)
                expect(result.status).to.equal('OK')
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        } else {  
            try {
                const result = await user1.sdk.genericAction('pushTransaction', {
                    action: 'addbundles',
                    account: 'fio.address',
                    data: {
                    fio_address: user2.address,
                    bundle_sets: bundleSets,
                    max_fee: add_bundled_transactions_fee * bundleSets,
                    technologyProviderId: ''
                    }
                })
                feeCollected = result.fee_collected;
                //console.log('Result: ', result);
                expect(result.status).to.equal('OK');
            } catch (err) {
                console.log('Error: ', err);
                expect(err).to.equal(null);
            }
        }
    })

    it(`Confirm fee collected = ${bundleSets} * add_bundled_transactions_fee`, async () => {
        expect(feeCollected).to.equal(add_bundled_transactions_fee * bundleSets)
    })

    it('Confirm fee was deducted from user1 account', async () => {
        try {
            const result = await user1.sdk.genericAction('getFioBalance', {
                fioPublicKey: user1.publicKey
            })
            expect(result.balance).to.equal(user1OrigBalance - feeCollected)
            //console.log('user1 fio balance', result)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it('Confirm user2 account balance is unchanged', async () => {
        try {
            const result = await user2.sdk.genericAction('getFioBalance', {
                fioPublicKey: user2.publicKey
            })
            expect(result.balance).to.equal(user2OrigBalance)
            //console.log('user1 fio balance', result)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Confirm RAM quota for user1 was incremented by ${config.RAM.BUNDLEVOTERAM}`, async () => {
        try {
            const json = {
                "account_name": user1.account
            }
            result = await callFioApi("get_account", json);
            //console.log('Ram quota: ', result.ram_quota);
            expect(result.ram_quota).to.equal(user1OrigRam + config.RAM.BUNDLEVOTERAM);
        } catch (err) {
            //console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Confirm user1 bundle count is unchanged`, async () => {
        let prevBundleCount = user1BundleCount;
        const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey })
        //console.log('Result: ', result)
        user1BundleCount = result.fio_addresses[0].remaining_bundled_tx;
        expect(user1BundleCount).to.equal(prevBundleCount); 
    })

    it(`Confirm user2 bundle count was increased by ${bundleSets} sets`, async () => {
        let prevBundleCount = user2BundleCount;
        const result = await user2.sdk.genericAction('getFioNames', { fioPublicKey: user2.publicKey })
        //console.log('Result: ', result)
        user2BundleCount = result.fio_addresses[0].remaining_bundled_tx;
        expect(user2BundleCount).to.equal(prevBundleCount + (bundleSets * bundledVoteNumber));  
    })

})

describe('C. Error testing', () => {
    let user1, user2, add_bundled_transactions_fee, user1Balance
    let bundleSets = 1;

    it(`Create users`, async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
    })

    it('Get add_bundled_transactions_fee', async () => {
        try {
            result = await user1.sdk.getFee('add_bundled_transactions', user1.address);
            add_bundled_transactions_fee = result.fee;
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`(pushtransaction) Run addbundles with invalid FIO Address format. Expect error type ${config.error2.invalidFioAddress.statusCode}: ${config.error2.invalidFioAddress.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addbundles',
                account: 'fio.address',
                data: {
                  fio_address: '[#invalid@address',
                  bundle_sets: bundleSets,
                  max_fee: add_bundled_transactions_fee,
                  tpid: ''
                }
            })
            console.log('Result: ', result);
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err.json.fields);
            expect(err.json.fields[0].error).to.equal(config.error2.invalidFioAddress.message)
            expect(err.errorCode).to.equal(config.error2.invalidFioAddress.statusCode);
        }
    })

    it(`(sdk) Run addbundles with invalid FIO Address format. SDK rejects with no type and error: ${config.error.fioAddressInvalidChar}`, async () => {
        try {
            const result = await user1.sdk.genericAction('addBundledTransactions', {
                fioAddress: '[#invalid@address',
                bundleSets: bundleSets,
                maxFee: add_bundled_transactions_fee,
                technologyProviderId: ''
            })
            console.log('Result: ', result);
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err);
            expect(err.list[0].message).to.equal(config.error.fioAddressInvalidChar)
        }
    })

    it(`Run addbundles with non-existent FIO Address. Expect error type ${config.error2.fioAddressNotRegistered.statusCode}: ${config.error2.fioAddressNotRegistered.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addbundles',
                account: 'fio.address',
                data: {
                  fio_address: 'nonexistent@address',
                  bundle_sets: bundleSets,
                  max_fee: add_bundled_transactions_fee * bundleSets,
                  tpid: ''
                }
            })
            console.log('Result: ', result);
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err.json.fields);
            expect(err.json.fields[0].error).to.equal(config.error2.fioAddressNotRegistered.message)
            expect(err.errorCode).to.equal(config.error2.fioAddressNotRegistered.statusCode);
        }
    })

    it(`Run addbundles with bundle_sets = 0. Expect error type ${config.error2.invalidBundleSets.statusCode}: ${config.error2.invalidBundleSets.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addbundles',
                account: 'fio.address',
                data: {
                  fio_address: user1.address,
                  bundle_sets: 0,
                  max_fee: add_bundled_transactions_fee * bundleSets,
                  tpid: ''
                }
            })
            console.log('Result: ', result);
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err.json.fields);
            expect(err.json.fields[0].error).to.equal(config.error2.invalidBundleSets.message)
            expect(err.errorCode).to.equal(config.error2.invalidBundleSets.statusCode);
        }
    })

    it(`Run addbundles with bundle_sets = -1. Expect error type ${config.error2.invalidBundleSets.statusCode}: ${config.error2.invalidBundleSets.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addbundles',
                account: 'fio.address',
                data: {
                  fio_address: user1.address,
                  bundle_sets: -1,
                  max_fee: add_bundled_transactions_fee * bundleSets,
                  tpid: ''
                }
            })
            console.log('Result: ', result);
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err.json.fields);
            expect(err.json.fields[0].error).to.equal(config.error2.invalidBundleSets.message)
            expect(err.errorCode).to.equal(config.error2.invalidBundleSets.statusCode);
        }
    })

    it(`Attempt addbundles with invalid fee format. Expect error type ${config.error2.invalidFeeValue.statusCode}: ${config.error2.invalidFeeValue.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addbundles',
                account: 'fio.address',
                data: {
                  fio_address: user1.address,
                  bundle_sets: bundleSets,
                  max_fee: -1,
                  tpid: ''
                }
            })
            console.log('Result: ', result);
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err);
            expect(err.json.fields[0].error).to.equal(config.error2.invalidFeeValue.message)
            expect(err.errorCode).to.equal(config.error2.invalidFeeValue.statusCode);
        }
    })

    it(`Attempt addbundles with invalid TPID. Expect error type ${config.error2.invalidTpid.statusCode}: ${config.error2.invalidTpid.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addbundles',
                account: 'fio.address',
                data: {
                  fio_address: user1.address,
                  bundle_sets: bundleSets,
                  max_fee: add_bundled_transactions_fee * bundleSets,
                  tpid: '##invalidtpid##'
                }
            })
            console.log('Result: ', result);
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err);
            expect(err.json.fields[0].error).to.equal(config.error2.invalidTpid.message)
            expect(err.errorCode).to.equal(config.error2.invalidTpid.statusCode);
        }
    })

    it(`Use up all of user1's bundles with 51 record_obt_data transactions`, async () => {
        for (i = 0; i < 51; i++) {
            try {
                const result = await user1.sdk.genericAction('recordObtData', {
                    fioRequestId: '',
                    payerFioAddress: user1.address,
                    payeeFioAddress: user2.address,
                    payerTokenPublicAddress: user1.publicKey,
                    payeeTokenPublicAddress: user2.publicKey,
                    amount: 5000000000,
                    chainCode: "BTC",
                    tokenCode: "BTC",
                    status: '',
                    obtId: '',
                    maxFee: config.api.record_obt_data.fee,
                    technologyProviderId: '',
                    payeeFioPublicKey: user2.publicKey,
                    memo: 'this is a test'
                })
                //console.log('Result: ', result)
                expect(result.status).to.equal('sent_to_blockchain')
            } catch (err) {
                console.log('Error', err.json)
                expect(err).to.equal(null)
            }
        }
    })
    
    it(`Add public addresses to user1 to use up one more bundle`, async () => {
        try {
            const result = await user1.sdk.genericAction('addPublicAddresses', {
                fioAddress: user1.address,
                publicAddresses: [
                {
                    chain_code: 'ETH',
                    token_code: 'ETH',
                    public_address: 'ethaddress',
                    }
                ],
                maxFee: config.api.add_pub_address.fee,
                walletFioAddress: ''
            })
            //console.log('Result:', result)
            expect(result.status).to.equal('OK')
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Wait a few seconds.`, async () => { await timeout(3000) })
    
    it(`Get bundle count for user1. Verify 0 bundles`, async () => {
        let bundleCount;
        const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey })
        //console.log('Result: ', result)
        bundleCount = result.fio_addresses[0].remaining_bundled_tx;
        expect(bundleCount).to.equal(0);
    })

    it(`Attempt addbundles with fee lower than actual fee amount and no bundled transactions left. Expect error type ${config.error2.feeExceedsMax.statusCode}: ${config.error2.feeExceedsMax.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addbundles',
                account: 'fio.address',
                data: {
                  fio_address: user1.address,
                  bundle_sets: bundleSets,
                  max_fee: add_bundled_transactions_fee - 100000000,
                  tpid: ''
                }
            })
            console.log('Result: ', result);
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err);
            expect(err.json.fields[0].error).to.equal(config.error2.feeExceedsMax.message)
            expect(err.errorCode).to.equal(config.error2.feeExceedsMax.statusCode);
        }
    })

    it(`Get balance for user1`, async () => {
        try {
            const result = await user1.sdk.genericAction('getFioBalance', {
                fioPublicKey: user1.publicKey
            }) 
            user1Balance = result.balance
            //console.log('user1 fio balance', result)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })
    
    it('Transfer entire balance for user1 to user2', async () => {
        try {
            const result = await user1.sdk.genericAction('transferTokens', {
                payeeFioPublicKey: user2.publicKey,
                amount: user1Balance - config.api.transfer_tokens_pub_key.fee,
                maxFee: config.maxFee,
                technologyProviderId: ''
            })
            //console.log('Result: ', result)
            expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        } 
    })
    
    it(`Verify balance for user1 = 0`, async () => {
        try {
            const result = await user1.sdk.genericAction('getFioBalance', {
                fioPublicKey: user1.publicKey
            }) 
            //console.log('user1 fio balance', result)
            expect(result.balance).to.equal(0)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Attempt addbundles with insufficient funds to cover fee. Expect error type ${config.error2.insufficientFunds.statusCode}: ${config.error2.insufficientFunds.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addbundles',
                account: 'fio.address',
                data: {
                  fio_address: user1.address,
                  bundle_sets: bundleSets,
                  max_fee: add_bundled_transactions_fee * bundleSets,
                  tpid: ''
                }
            })
            console.log('Result: ', result);
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err);
            expect(err.json.fields[0].error).to.equal(config.error2.insufficientFunds.message)
            expect(err.errorCode).to.equal(config.error2.insufficientFunds.statusCode);
        }
    })

})