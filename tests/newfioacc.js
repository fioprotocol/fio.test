require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, createKeypair, getAccountFromKey, generateFioDomain, generateFioAddress, callFioApi, callFioApiSigned, randStr} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
config = require('../config.js');
let faucet;

before(async () => {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
});

describe('************************** newfioacc.js ************************** \n    A. Test newfioacc happy path', () => {
    let user1, newAccount = {};
    const xferAmount = 90000000000;  // 90 FIO
  
    before(async () => {
      user1 = await newUser(faucet);
      const keypair = await createKeypair();
      newAccount = {
        publicKey: keypair.publicKey,
        privateKey: keypair.privateKey,
        account: await getAccountFromKey(keypair.publicKey),
        domain: generateFioDomain(10),
        address: generateFioAddress(this.domain,10)
      }
      //newAccount.publicKey = keypair.publicKey
      //newAccount.privateKey = keypair.privateKey
      //newAccount.account = await getAccountFromKey(newAccount.publicKey);
      //newAccount.domain = generateFioDomain(10);
      //newAccount.address = generateFioAddress(newAccount.domain,10);
    });

    it(`get user1 original balance`, async function () {
        result = await user1.sdk.genericAction('getFioBalance', {});
        user1.balance = result.available;
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

    it(`confirm fee deducted from user1 account`, async function () {
        user1.prevBalance = user1.balance;
        result = await user1.sdk.genericAction('getFioBalance', {});
        user1.balance = result.available;
        expect(user1.balance).to.equal(user1.prevBalance  - config.api.new_fio_chain_account.fee);
    });

    it(`Confirm new account exists in fio.address accountmap table`, async () => {
        try {
            const json = {
                json: true,
                code: 'fio.address',
                scope: 'fio.address',
                table: 'accountmap',
                lower_bound: newAccount.account,
                upper_bound: newAccount.account,
                key_type: 'i64',
                index_position: '0'
            }
            result = await callFioApi("get_table_rows", json);
            //console.log(result)
            expect(result.rows[0].account).to.equal(newAccount.account);
            expect(result.rows[0].clientkey).to.equal(newAccount.publicKey);
        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
    });

    it(`Get FIO balance for new account. Confirm 0`, async () => {
        try {
            const json = {
                fio_public_key: newAccount.publicKey
            }
            result = await callFioApi("get_fio_balance", json);
            expect(result.balance).to.equal(0);
        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
    });

    it(`get_actor for new account`, async () => {
        try {
            const json = {
                fio_public_key: newAccount.publicKey
            }
            result = await callFioApi("get_actor", json);
            expect(result.actor).to.equal(newAccount.account);
        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
    });

    it(`user1 registers domain for newAccount`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'regdomain',
                account: 'fio.address',
                data: {
                    fio_domain: newAccount.domain,
                    owner_fio_public_key: newAccount.publicKey,
                    max_fee: config.maxFee,
                    tpid: ''
                }
            })
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
    });

    it(`user1 sends ${xferAmount / 1000000000} FIO to new account`, async () => {
        try {
            const transfer = await user1.sdk.genericAction('pushTransaction', {
                action: 'trnsfiopubky',
                account: 'fio.token',
                data: {
                    payee_public_key: newAccount.publicKey,
                    amount: xferAmount,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(transfer.status).to.equal('OK')
        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
    });

    it(`Get FIO balance for new account. Confirm ${xferAmount / 1000000000} FIO`, async () => {
        try {
            const json = {
                "fio_public_key": newAccount.publicKey
            }
            result = await callFioApi("get_fio_balance", json);
            expect(result.balance).to.equal(xferAmount);
        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
    });

    it(`newAccount registers address`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'regaddress',
                account: 'fio.address',
                actor: newAccount.account,
                privKey: newAccount.privateKey,
                data: {
                  fio_address: newAccount.address,
                  owner_fio_public_key: newAccount.publicKey,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: newAccount.account
                }
            });
            console.log(result)
        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
    });

    it(`get_pub_address for FIO token for new account`, async () => {
        try {

            const result = await callFioApi("get_pub_address", {
                fio_address: newAccount.address,
                chain_code: "FIO",
                token_code: "FIO"
            });
            console.log(result)
        } catch (err) {
            console.log(err.message)
            expect(err).to.equal(null);
        }
    });
});

describe('B. Test add_pub_address RAM Consumption', () => {

    let user1, user1Ram, newAccount;

    before(async () => {
        user1 = await newUser(faucet);
        newAccount = randStr(12);
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
        
    it(`User1 creates new account with newfioacc`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
            action: 'newfioacc',
            account: 'eosio',
            actor: user1.account,
            privKey: user1.privateKey,
            data: {
                "fio_public_key": keypair.publicKey,
                "owner": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": [{
                        "permission": {
                            "actor": newAccount,
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
                            "actor": newAccount,
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
            console.log('Result: ', result)
            expect(result.status).to.equal('OK')

        } catch (err) {
            console.log(err.message)
            expect(err).to.equal(null);
        }
    });

    it(`Confirm RAM quota for user1 was incremented by NEWFIOCHAINACCOUNTRAM = ${config.RAM.NEWFIOCHAINACCOUNTRAM}`, async () => {
        try {
            const json = {
                "account_name": newAccount
            }
            result = await callFioApi("get_account", json);
            const newAccntRam = result.ram_quota;
            expect(newAccntRam).to.equal(config.RAM.NEWFIOCHAINACCOUNTRAM);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`Confirm RAM quota for ${newAccount} was incremented by INITIALACCOUNTRAM = ${config.RAM.INITIALACCOUNTRAM}`, async () => {
        try {
            let prevRam = user1Ram;
            const json = {
            "account_name": user1.account
            }
            result = await callFioApi("get_account", json);
            user1Ram = result.ram_quota;
            expect(user1Ram).to.equal(prevRam + config.RAM.INITIALACCOUNTRAM + (2 * config.RAM.ADDNFTRAM));
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });
});

describe('C. Test newfioacc - Sad Path', () => {

    // register new account to existing account

});