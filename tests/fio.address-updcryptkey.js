require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, createKeypair, getAccountFromKey, generateFioDomain, generateFioAddress, callFioApi, callFioApiSigned, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
config = require('../config.js');
let faucet;

before(async () => {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
});

describe.only('************************** fio.address-updcryptkey.js ************************** \n    A. Test updcryptkey - add new encrypt key', () => {
    let user1, newAccount = {};
    const xferAmount = 90000000000;  // 90 FIO
  
    before(async () => {
      user1 = await newUser(faucet);
      const keypair = await createKeypair();
      encryptKeys = {
        publicKey: keypair.publicKey,
        privateKey: keypair.privateKey,
      }
      console.log(`newAccount: , ${newAccount.account}, ${newAccount.publicKey},${newAccount.privateKey},${newAccount.domain},${newAccount.address}`)
    });

    it(`get user1 original balance`, async function () {
        result = await user1.sdk.genericAction('getFioBalance', {});
        user1.balance = result.available;
    });

    it(`Add new encrypt key for user1`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'updcryptkey',
                account: 'fio.address',
                data: {
                    fio_address: user1.address,
                    encrypt_public_key: encryptKeys.publicKey,
                    max_fee: config.maxFee,
                    tpid: user1.address
                }
            })
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log(JSON.stringify(err, null, 4));
            expect(err).to.equal(null);
        }
    });

    it.skip(`Call get_table_rows for fionameinfo`, async () => {
        try {
          const json = {
            json: true,
            code: 'fio.address',
            scope: 'fio.address',
            table: 'fionameinfo',
            lower_bound: keysStaker.account,
            upper_bound: keysStaker.account,
            key_type: 'i64',
            reverse: true,
            index_position: '2'
          }
          result = await callFioApi("get_table_rows", json);
          //console.log('Result: ', result);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      })

    it.skip(`get_account for newAccount. Confirm permissions.`, async function () {
        try {
            const json = {
                "account_name": newAccount.account
            }
            result = await callFioApi("get_account", json);
            console.log('Result: ', result);
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    });

    it.skip(`confirm fee deducted from user1 account`, async function () {
        user1.prevBalance = user1.balance;
        result = await user1.sdk.genericAction('getFioBalance', {});
        user1.balance = result.available;
        expect(user1.balance).to.equal(user1.prevBalance  - config.api.new_fio_chain_account.fee);
    });

});

/*
describe('B. Test add_pub_address RAM Consumption', () => {

    let user1, user1Ram, newAccount = {};

    before(async () => {
        user1 = await newUser(faucet);
        const keypair = await createKeypair();
        const newDomain = generateFioDomain(10);
        const newAddress = generateFioAddress(newDomain,10);
        newAccount = {
            publicKey: keypair.publicKey,
            privateKey: keypair.privateKey,
            account: await getAccountFromKey(keypair.publicKey),
            domain: newDomain,
            address: newAddress
          }
      });

    it(`Get RAM quota for user1`, async () => {
        try {
            const json = {
                "account_name": user1.account
            }
            result = await callFioApi("get_account", json);
            user1Ram = result.ram_quota;
            //console.log('Ram quota: ', result.ram_quota);
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
      });
        
      it(`Create new account with newfioacc`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
            action: 'newfioacc',
            account: 'eosio',
            actor: user1.account,
            data: {
                "fio_public_key": newAccount.publicKey,
                "owner": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": [{
                        "permission": {
                            "actor": newAccount.account,
                            "permission": "active"
                        },
                        "weight": 1
                    }]
                },
                "active": {
                "threshold": 1,
                "keys": [],
                "waits": [],
                "accounts": 
                [
                    {
                        "permission": {
                            "actor": newAccount.account,
                            "permission": "active"
                        },
                        "weight": 1
                    }
                ]
                },
                "max_fee": config.maxFee,
                "actor": user1.account,
                "tpid": ''
            }
            })
            expect(result.status).to.equal('OK');

        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
    });

    it(`Confirm RAM quota for user1 was incremented by NEWFIOCHAINACCOUNTRAM = ${config.RAM.NEWFIOCHAINACCOUNTRAM}`, async () => {
        try {
            const json = {
                "account_name": user1.account
            }
            result = await callFioApi("get_account", json);
            expect(result.ram_quota).to.equal(user1Ram + config.RAM.NEWFIOCHAINACCOUNTRAM);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`Confirm RAM quota for newAccount was incremented by INITIALACCOUNTRAM = ${config.RAM.INITIALACCOUNTRAM}`, async () => {
        try {
            let prevRam = user1Ram;
            const json = {
            "account_name": newAccount.account
            }
            result = await callFioApi("get_account", json);
            expect(result.ram_quota).to.equal(config.RAM.INITIALACCOUNTRAM);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });
});

describe.only('C. Test newfioacc - Sad Path', () => {
    let user1, user2, lowBalanceUser = {}, newAccount = {};

    before(async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
        const keypair = await createKeypair();
        const newDomain = generateFioDomain(10);
        const newAddress = generateFioAddress(newDomain,10);
        newAccount = {
            publicKey: keypair.publicKey,
            privateKey: keypair.privateKey,
            account: await getAccountFromKey(keypair.publicKey),
            domain: newDomain,
            address: newAddress
        }
        const keypair1 = await createKeypair();
        lowBalanceUser = {
            publicKey: keypair1.publicKey,
            privateKey: keypair1.privateKey,
            account: await getAccountFromKey(keypair1.publicKey),
            sdk: new FIOSDK(keypair1.privateKey, keypair1.publicKey, config.BASE_URL, fetchJson)
        }
  
      });

      it(`(failure) Only set owner permission. Expect error`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
            action: 'newfioacc',
            account: 'eosio',
            actor: user1.account,
            data: {
                "fio_public_key": newAccount.publicKey,
                "owner": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": [{
                        "permission": {
                            "actor": newAccount.account,
                            "permission": "active"
                        },
                        "weight": 1
                    }]
                },
                "active": "",
                "max_fee": config.maxFee,
                "actor": user1.account,
                "tpid": ''
            }
            })
            console.log('Result: ', result)
            expect(result).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err);
            expect(err);
        }
    });

    it(`(failure) Only set active permission. Expect error`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
            action: 'newfioacc',
            account: 'eosio',
            actor: user1.account,
            data: {
                "fio_public_key": newAccount.publicKey,
                "owner": "",
                "active": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": 
                    [
                        {
                            "permission": {
                                "actor": newAccount.account,
                                "permission": "active"
                            },
                            "weight": 1
                        }
                    ]
                },
                "active": "",
                "max_fee": config.maxFee,
                "actor": user1.account,
                "tpid": ''
            }
            })
            console.log('Result: ', result)
            expect(result).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err);
            expect(err);
        }
    });

    it(`BD-4771) (failure) Invalid FIO Public Key. Expect: ${config.error2.invalidKey.statusCode} ${config.error2.invalidKey.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
            action: 'newfioacc',
            account: 'eosio',
            actor: user1.account,
            data: {
                "fio_public_key": '123',
                "owner": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": [{
                        "permission": {
                            "actor": newAccount.account,
                            "permission": "active"
                        },
                        "weight": 1
                    }]
                },
                "active": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": 
                    [
                        {
                            "permission": {
                                "actor": newAccount.account,
                                "permission": "active"
                            },
                            "weight": 1
                        }
                    ]
                },
                "max_fee": config.maxFee,
                "actor": user1.account,
                "tpid": ''
            }
            })
            expect(result).to.equal(null);
        } catch (err) {
            console.log(err.json.fields[0]);
            expect(err.json.fields[0].error).to.equal(config.error2.invalidKey.message);
            expect(err.errorCode).to.equal(config.error2.invalidKey.statusCode);
        }
    });

    it.skip(`Not clear on which field will cause this... (failure) Invalid owner permission. Expect: ${config.error2.invalidOwnerPerm.statusCode} ${config.error2.invalidOwnerPerm.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
            action: 'newfioacc',
            account: 'eosio',
            actor: user1.account,
            data: {
                "fio_public_key": newAccount.publicKey,
                "owner": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": [{
                        "permission": {
                            "actor": '123',
                            "permission": "owner"
                        },
                        "weight": 1
                    }]
                },
                "active": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": 
                    [
                        {
                            "permission": {
                                "actor": newAccount.account,
                                "permission": "active"
                            },
                            "weight": 1
                        }
                    ]
                },
                "max_fee": config.maxFee,
                "actor": user1.account,
                "tpid": ''
            }
            })
            expect(result).to.equal(null);
        } catch (err) {
            console.log(err.json.error);
            expect(err.json.fields[0].error).to.equal(config.error2.invalidOwnerPerm.message);
            expect(err.errorCode).to.equal(config.error2.invalidOwnerPerm.statusCode);
        }
    });

    it(`(failure) Invalid fee value. Expect: ${config.error2.invalidFeeValue.statusCode} ${config.error2.invalidFeeValue.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
            action: 'newfioacc',
            account: 'eosio',
            actor: user1.account,
            data: {
                "fio_public_key": newAccount.publicKey,
                "owner": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": [{
                        "permission": {
                            "actor": newAccount.account,
                            "permission": "active"
                        },
                        "weight": 1
                    }]
                },
                "active": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": 
                    [
                        {
                            "permission": {
                                "actor": newAccount.account,
                                "permission": "active"
                            },
                            "weight": 1
                        }
                    ]
                },
                "max_fee": -100,
                "actor": user1.account,
                "tpid": ''
            }
            })
            expect(result).to.equal(null);
        } catch (err) {
            //console.log(err.json.fields[0]);
            expect(err.json.fields[0].error).to.equal(config.error2.invalidFeeValue.message);
            expect(err.errorCode).to.equal(config.error2.invalidFeeValue.statusCode);
        }
    });

    it(`(failure) Fee exceeds maximum. Expect: ${config.error2.feeExceedsMax.statusCode} ${config.error2.feeExceedsMax.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
            action: 'newfioacc',
            account: 'eosio',
            actor: user1.account,
            data: {
                "fio_public_key": newAccount.publicKey,
                "owner": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": [{
                        "permission": {
                            "actor": newAccount.account,
                            "permission": "active"
                        },
                        "weight": 1
                    }]
                },
                "active": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": 
                    [
                        {
                            "permission": {
                                "actor": newAccount.account,
                                "permission": "active"
                            },
                            "weight": 1
                        }
                    ]
                },
                "max_fee": 1000,
                "actor": user1.account,
                "tpid": ''
            }
            })
            expect(result).to.equal(null);
        } catch (err) {
            //console.log(err.json.fields[0]);
            expect(err.json.fields[0].error).to.equal(config.error2.feeExceedsMax.message);
            expect(err.errorCode).to.equal(config.error2.feeExceedsMax.statusCode);
        }
    });

    it('Transfer 100000 SUFs to lowBalanceUser', async () => {
        try {
            const result = await user1.sdk.genericAction('transferTokens', {
                payeeFioPublicKey: lowBalanceUser.publicKey,
                amount: 100000,
                maxFee: config.maxFee,
                technologyProviderId: ''
            })
            //console.log('Result: ', result)
            expect(result).to.have.any.keys('transaction_id');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        } 
    })

    it(`(failure) Insufficient balance. Expect: ${config.error2.insufficientFunds.statusCode} ${config.error2.insufficientFunds.message}`, async () => {
        try {
            const result = await lowBalanceUser.sdk.genericAction('pushTransaction', {
            action: 'newfioacc',
            account: 'eosio',
            actor: lowBalanceUser.account,
            data: {
                "fio_public_key": newAccount.publicKey,
                "owner": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": [{
                        "permission": {
                            "actor": newAccount.account,
                            "permission": "active"
                        },
                        "weight": 1
                    }]
                },
                "active": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": 
                    [
                        {
                            "permission": {
                                "actor": newAccount.account,
                                "permission": "active"
                            },
                            "weight": 1
                        }
                    ]
                },
                "max_fee": config.maxFee,
                "actor": lowBalanceUser.account,
                "tpid": ''
            }
            })
            expect(result).to.equal(null);
        } catch (err) {
            //console.log(err.json.fields[0]);
            expect(err.json.fields[0].error).to.equal(config.error2.insufficientFunds.message);
            expect(err.errorCode).to.equal(config.error2.insufficientFunds.statusCode);
        }
    });

    it.skip(`(Bug BD-4770) (failure) Invalid tpid. Expect: ${config.error2.invalidTpid.statusCode} ${config.error2.invalidTpid.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
            action: 'newfioacc',
            account: 'eosio',
            actor: user1.account,
            data: {
                "fio_public_key": newAccount.publicKey,
                "owner": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": [{
                        "permission": {
                            "actor": newAccount.account,
                            "permission": "active"
                        },
                        "weight": 1
                    }]
                },
                "active": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": 
                    [
                        {
                            "permission": {
                                "actor": newAccount.account,
                                "permission": "active"
                            },
                            "weight": 1
                        }
                    ]
                },
                "max_fee": config.maxFee,
                "actor": user1.account,
                "tpid": 'notvalidfioaddress'
            }
            })
            console.log('Result: ', result);
            expect(result).to.equal(null);
        } catch (err) {
            console.log(err);
            expect(err.json.fields[0].error).to.equal(config.error2.invalidTpid.message);
            expect(err.errorCode).to.equal(config.error2.invalidTpid.statusCode);
        }
    });

    it(`(failure) Signer not actor. Expect: ${config.error2.invalidSignature.statusCode} ${config.error2.invalidSignature.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
            action: 'newfioacc',
            account: 'eosio',
            actor: user1.account,
            data: {
                "fio_public_key": newAccount.publicKey,
                "owner": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": [{
                        "permission": {
                            "actor": newAccount.account,
                            "permission": "active"
                        },
                        "weight": 1
                    }]
                },
                "active": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": 
                    [
                        {
                            "permission": {
                                "actor": newAccount.account,
                                "permission": "active"
                            },
                            "weight": 1
                        }
                    ]
                },
                "max_fee": config.maxFee,
                "actor": user2.account,
                "tpid": ''
            }
            })
            expect(result).to.equal(null);
        } catch (err) {
            //console.log(err);
            expect(err.json.message).to.equal(config.error2.invalidSignature.message);
            expect(err.errorCode).to.equal(config.error2.invalidSignature.statusCode);
        }
    });

    it(`Create new account with newfioacc`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
            action: 'newfioacc',
            account: 'eosio',
            actor: user1.account,
            data: {
                "fio_public_key": newAccount.publicKey,
                "owner": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": [{
                        "permission": {
                            "actor": newAccount.account,
                            "permission": "active"
                        },
                        "weight": 1
                    }]
                },
                "active": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": 
                    [
                        {
                            "permission": {
                                "actor": newAccount.account,
                                "permission": "active"
                            },
                            "weight": 1
                        }
                    ]
                },
                "max_fee": config.maxFee,
                "actor": user1.account,
                "tpid": ''
            }
            })
            expect(result.status).to.equal('OK');

        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
    });

    it(`Wait a few seconds.`, async () => { await timeout(1000) })

    it(`(failure) Try to Create new account with same account. Expect: ${config.error2.accountExists.statusCode} ${config.error2.accountExists.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
            action: 'newfioacc',
            account: 'eosio',
            actor: user1.account,
            data: {
                "fio_public_key": newAccount.publicKey,
                "owner": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": [{
                        "permission": {
                            "actor": newAccount.account,
                            "permission": "active"
                        },
                        "weight": 1
                    }]
                },
                "active": {
                "threshold": 1,
                "keys": [],
                "waits": [],
                "accounts": 
                [
                    {
                        "permission": {
                            "actor": newAccount.account,
                            "permission": "active"
                        },
                        "weight": 1
                    }
                ]
                },
                "max_fee": config.maxFee,
                "actor": user1.account,
                "tpid": ''
            }
            })
            expect(result).to.equal(null);
        } catch (err) {
            //console.log(err.json);
            expect(err.json.fields[0].error).to.equal(config.error2.accountExists.message);
            expect(err.errorCode).to.equal(config.error2.accountExists.statusCode);
        }
    });

    it(`(failure) Try to Create new account on existing account. Expect: ${config.error2.accountExists.statusCode} ${config.error2.accountExists.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
            action: 'newfioacc',
            account: 'eosio',
            actor: user1.account,
            data: {
                "fio_public_key": user2.publicKey,
                "owner": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": [{
                        "permission": {
                            "actor": newAccount.account,
                            "permission": "active"
                        },
                        "weight": 1
                    }]
                },
                "active": {
                "threshold": 1,
                "keys": [],
                "waits": [],
                "accounts": 
                [
                    {
                        "permission": {
                            "actor": newAccount.account,
                            "permission": "active"
                        },
                        "weight": 1
                    }
                ]
                },
                "max_fee": config.maxFee,
                "actor": user1.account,
                "tpid": ''
            }
            })
            expect(result).to.equal(null);
        } catch (err) {
            //console.log(err.json);
            expect(err.json.fields[0].error).to.equal(config.error2.accountExists.message);
            expect(err.errorCode).to.equal(config.error2.accountExists.statusCode);
        }
    });

});
*/