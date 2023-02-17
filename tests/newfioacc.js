require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, createKeypair, getAccountFromKey, generateFioDomain, generateFioAddress, callFioApi, callFioApiSigned, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
config = require('../config.js');
let faucet;

before(async () => {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
});

/**
 * Used to sort sdk objects by actor field
 */
  function compareAccount(a, b) {
    if (a.account < b.account) {
      return -1;
    }
    if (a.account > b.account) {
      return 1;
    }
    // a must be equal to b
    return 0;
  }

describe('************************** newfioacc.js ************************** \n    A. Test newfioacc - empty owner and active aaccounts (default)', () => {
    let user1, newAccount = {};
    const xferAmount = 90000000000;  // 90 FIO
  
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
      //console.log(`newAccount: , ${newAccount.account}, ${newAccount.publicKey},${newAccount.privateKey},${newAccount.domain},${newAccount.address}`)
    });

    it(`get user1 original balance`, async function () {
        result = await user1.sdk.genericAction('getFioBalance', {});
        user1.balance = result.available;
    });


    it(`Create new account with newfioacc - empty accounts and keys. Expect new account with fio_public_key as permissions`, async () => {
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
                    "accounts": []
                },
                "active": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": []
                },
                "max_fee": config.maxFee,
                "actor": user1.account,
                "tpid": user1.address
            }
            })
            expect(result.status).to.equal('OK');

        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
    });

    it(`get_account for newAccount. Confirm permissions.`, async function () {
        try {
            const json = {
                "account_name": newAccount.account
            }
            result = await callFioApi("get_account", json);
            //console.log(JSON.stringify(result, null, 4));
            expect(result.permissions[0].perm_name).to.equal('active');
            expect(result.permissions[0].parent).to.equal('owner');
            expect(result.permissions[0].required_auth.keys[0].key).to.equal(newAccount.publicKey);
            expect(result.permissions[0].required_auth.keys[0].weight).to.equal(1);
            expect(result.permissions[0].required_auth.threshold).to.equal(1);
            expect(result.permissions[0].required_auth.accounts.length).to.equal(0);
            expect(result.permissions[0].required_auth.waits.length).to.equal(0);
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
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

    it(`getfiodomains for newAccount from FIO chain. Expect single domain.`, async () => {
        try {
            const result = await user1.sdk.genericAction('getFioDomains', {
                fioPublicKey: newAccount.publicKey
            })
            //console.log('Result:', result);
            expect(result.fio_domains.length).to.equal(1);
        } catch (err) {
            console.log('Error', err);
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

    // This is here to make sure the format of the next transfer call works with known user1
    it(`user1 transfers FIO`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'trnsfiopubky',
                account: 'fio.token',
                actor: user1.account,
                privKey: user1.privateKey,
                data: {
                  amount: 1000000000,
                  payee_public_key: faucet.publicKey,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: user1.account
                }
            });
            //console.log('Result: ', result);
            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log('Error: ', err);
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

    it(`newAccount transfers FIO`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'trnsfiopubky',
                account: 'fio.token',
                actor: newAccount.account,
                privKey: newAccount.privateKey,
                data: {
                  amount: 1000000000,
                  payee_public_key: user1.publicKey,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: newAccount.account
                }
            });
            //console.log('Result: ', result);
            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log('Error: ', err);
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
            //console.log('Result: ', result);
            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log('Error: ', err);
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
            //console.log(result)
            expect(result.public_address).to.equal(newAccount.publicKey);
        } catch (err) {
            console.log(err.message)
            expect(err).to.equal(null);
        }
    });
});

describe('B. Test newfioacc - accounts - set owner and active to single account that is different from main account', () => {
    let user1, newAccount = {};
    const xferAmount = 90000000000;  // 90 FIO
  
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
      //console.log(`newAccount: , ${newAccount.account}, ${newAccount.publicKey},${newAccount.privateKey},${newAccount.domain},${newAccount.address}`)
    });

    it(`get user1 original balance`, async function () {
        result = await user1.sdk.genericAction('getFioBalance', {});
        user1.balance = result.available;
    });


    it(`Create new account with active and owner perms from user1`, async () => {
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
                            "actor": user1.account,
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
                                "actor": user1.account,
                                "permission": "active"
                            },
                            "weight": 1
                        }
                    ]
                },
                "max_fee": config.maxFee,
                "actor": user1.account,
                "tpid": user1.address
            }
            })
            expect(result.status).to.equal('OK');

        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
    });

    it(`get_account for user1. Confirm permissions.`, async function () {
        try {
            const json = {
                "account_name": user1.account
            }
            result = await callFioApi("get_account", json);
            //console.log(JSON.stringify(result, null, 4));
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    });

    it(`get_account for newAccount. Confirm permissions.`, async function () {
        try {
            const json = {
                "account_name": newAccount.account
            }
            result = await callFioApi("get_account", json);
            //console.log(JSON.stringify(result, null, 4));
            expect(result.account_name).to.equal(newAccount.account);
            expect(result.permissions[0].required_auth.accounts[0].permission.actor).to.equal(user1.account);
            expect(result.permissions[0].required_auth.accounts[0].permission.permission).to.equal('active');
            expect(result.permissions[1].required_auth.accounts[0].permission.actor).to.equal(user1.account);
            expect(result.permissions[1].required_auth.accounts[0].permission.permission).to.equal('active');
            expect(result.permissions[0].required_auth.keys.length).to.equal(0);
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
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

    it(`getfiodomains for newAccount from FIO chain. Expect single domain.`, async () => {
        try {
            const result = await user1.sdk.genericAction('getFioDomains', {
                fioPublicKey: newAccount.publicKey
            })
            //console.log('Result:', result);
            expect(result.fio_domains.length).to.equal(1);
        } catch (err) {
            console.log('Error', err);
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

    // This is here to make sure the format of the next transfer call works with known user1
    it(`user1 transfers FIO`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'trnsfiopubky',
                account: 'fio.token',
                actor: user1.account,
                privKey: user1.privateKey,
                data: {
                  amount: 1000000000,
                  payee_public_key: faucet.publicKey,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: user1.account
                }
            });
            //console.log('Result: ', result);
            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log('Error: ', err);
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

    it(`newAccount transfers FIO using user1 private key (BD-4469)`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'trnsfiopubky',
                account: 'fio.token',
                actor: newAccount.account,
                privKey: user1.privateKey,
                data: {
                  amount: 1000000000,
                  payee_public_key: user1.publicKey,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: newAccount.account
                }
            });
            //console.log('Result: ', result);
            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });

    it(`newAccount registers address using user1 private key (BD-4469)`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'regaddress',
                account: 'fio.address',
                actor: newAccount.account,
                privKey: user1.privateKey,
                data: {
                  fio_address: newAccount.address,
                  owner_fio_public_key: newAccount.publicKey,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: newAccount.account
                }
            });
            //console.log('Result: ', result);
            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log('Error: ', err);
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
            //console.log(result);
            expect(result.public_address).to.equal(newAccount.publicKey);
        } catch (err) {
            console.log(err.message)
            expect(err).to.equal(null);
        }
    });
});

// NOTE: when using updateauth and newfioacc the accounts must be in sorted order!
describe('C. Test newfioacc - accounts - set owner and active to 2 accounts (in sorted order!) (BD-4480) ', () => {
    let pretestUser1, pretestUser2, pretestUser3, user1, user2, user3, newAccount = {}, sortedPretestUsers = [], sortedUsers = [];
    const xferAmount = 90000000000;  // 90 FIO
  
    before(async () => {
        pretestUser1 = await newUser(faucet);
        pretestUser2 = await newUser(faucet);
        pretestUser3 = await newUser(faucet);
        const pretestUsers = [pretestUser1, pretestUser2, pretestUser3]
        sortedPretestUsers = pretestUsers.sort(compareAccount);
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
        user3 = await newUser(faucet);
        const users = [user1, user2, user3]
        sortedUsers = users.sort(compareAccount);
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
      //console.log(`newAccount: , ${newAccount.account}, ${newAccount.publicKey},${newAccount.privateKey},${newAccount.domain},${newAccount.address}`)
    });

    it(`UPDATEAUTH PRETEST: Confirm updateauth allows adding of multiple permissions`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'updateauth',
                account: 'eosio',
                actor: pretestUser1.account,
                privKey: pretestUser1.privateKey,
                data: {
                    permission: 'active',
                    parent: 'owner',
                    auth: {
                        threshold: 1,
                        accounts: 
                        [
                            {
                                "permission": {
                                    "actor": sortedPretestUsers[0].account,
                                    "permission": "active"
                                },
                                "weight": 1
                            },
                            {
                                "permission": {
                                    "actor": sortedPretestUsers[1].account,
                                    "permission": "active"
                                },
                                "weight": 1
                            },
                            {
                                "permission": {
                                    "actor": sortedPretestUsers[2].account,
                                    "permission": "active"
                                },
                                "weight": 1
                            }
                        ],
                        keys: [],
                        waits: [],
                  },
                  max_fee: config.maxFee,
                  account: pretestUser1.account
                }
            });
            //console.log(JSON.stringify(result, null, 4));
            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log("Error: ", err);
            console.log(JSON.stringify(err, null, 4));
            expect(err).to.equal(null);
        }
    });


    it(`get user1 original balance`, async function () {
        result = await user1.sdk.genericAction('getFioBalance', {});
        user1.balance = result.available;
    });

    it(`Create new account with 3 active permissions - Getting occasional failures (BD-4480 was sort order issue) `, async () => {
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
                    "accounts": []
                },
                "owner": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": 
                    [
                        {
                            "permission": {
                                "actor": sortedUsers[0].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[1].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[2].account,
                                "permission": "active"
                            },
                            "weight": 1
                        }
                    ]
                },
                "active": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": 
                    [
                        {
                            "permission": {
                                "actor": sortedUsers[0].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[1].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[2].account,
                                "permission": "active"
                            },
                            "weight": 1
                        }
                    ]
                },
                "max_fee": config.maxFee,
                "actor": user1.account,
                "tpid": user1.address
            }
            })
            //console.log('Result: ', JSON.stringify(result, null, 4));
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log('Error1: ', err);
            console.log('Error2: ', JSON.stringify(err, null, 4));
            expect(err).to.equal(null);
        }
    });

    it(`get_account for newAccount. Confirm permissions.`, async function () {
        try {
            const json = {
                "account_name": newAccount.account
            }
            result = await callFioApi("get_account", json);
            //console.log(JSON.stringify(result, null, 4));
            expect(result.account_name).to.equal(newAccount.account);
            expect(result.permissions[0].required_auth.accounts[0].permission.actor).to.equal(sortedUsers[0].account);
            expect(result.permissions[0].required_auth.accounts[0].permission.permission).to.equal('active');
            expect(result.permissions[1].required_auth.accounts[0].permission.actor).to.equal(sortedUsers[0].account);
            expect(result.permissions[1].required_auth.accounts[0].permission.permission).to.equal('active');
            expect(result.permissions[0].required_auth.keys.length).to.equal(0);
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
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

    it(`getfiodomains for newAccount from FIO chain. Expect single domain.`, async () => {
        try {
            const result = await user1.sdk.genericAction('getFioDomains', {
                fioPublicKey: newAccount.publicKey
            })
            //console.log('Result:', result);
            expect(result.fio_domains.length).to.equal(1);
        } catch (err) {
            console.log('Error', err);
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

    it(`newAccount transfers FIO using user1 private key`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'trnsfiopubky',
                account: 'fio.token',
                actor: newAccount.account,
                privKey: sortedUsers[0].privateKey,
                data: {
                  amount: 1000000000,
                  payee_public_key: user1.publicKey,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: newAccount.account
                }
            });
            //console.log('Result: ', result);
            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });

    it(`newAccount registers address using user permission private key`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'regaddress',
                account: 'fio.address',
                actor: newAccount.account,
                privKey: sortedUsers[0].privateKey,
                data: {
                  fio_address: newAccount.address,
                  owner_fio_public_key: newAccount.publicKey,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: newAccount.account
                }
            });
            //console.log('Result: ', result);
            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log('Error: ', err);
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
            //console.log(result);
            expect(result.public_address).to.equal(newAccount.publicKey);
        } catch (err) {
            console.log(err.message)
            expect(err).to.equal(null);
        }
    });
    
});

describe('D. Test newfioacc - accounts - set owner and active to multiple (10) accounts that are different from main account', () => {
    let user1, user2, user3, user4, user5, user6, user7, user8, user9, user10, newAccount = {};
    const xferAmount = 90000000000;  // 90 FIO
  
    before(async () => {
      user1 = await newUser(faucet);
      user2 = await newUser(faucet);
      user3 = await newUser(faucet);
      user4 = await newUser(faucet);
      user5 = await newUser(faucet);
      user6 = await newUser(faucet);
      user7 = await newUser(faucet);
      user8 = await newUser(faucet);
      user9 = await newUser(faucet);
      user10 = await newUser(faucet);
      const users = [user1, user2, user3, user4, user5, user6, user7, user8, user9, user10]
      sortedUsers = users.sort(compareAccount);

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
      //console.log(`newAccount: , ${newAccount.account}, ${newAccount.publicKey},${newAccount.privateKey},${newAccount.domain},${newAccount.address}`)
    });

    it(`get user1 original balance`, async function () {
        result = await user1.sdk.genericAction('getFioBalance', {});
        user1.balance = result.available;
    });

    it(`Wait a few seconds.`, async () => { await timeout(3000) })

    it(`Create new account with 10 account-based active and owner perms from user1 and user2`, async () => {
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
                    "accounts": 
                    [
                        {
                            "permission": {
                                "actor": sortedUsers[0].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[1].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[2].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[3].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[4].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[5].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[6].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[7].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[8].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[9].account,
                                "permission": "active"
                            },
                            "weight": 1
                        }
                    ]
                },
                "active": {
                    "threshold": 1,
                    "keys": [],
                    "waits": [],
                    "accounts": 
                    [
                        {
                            "permission": {
                                "actor": sortedUsers[0].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[1].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[2].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[3].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[4].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[5].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[6].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[7].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[8].account,
                                "permission": "active"
                            },
                            "weight": 1
                        },
                        {
                            "permission": {
                                "actor": sortedUsers[9].account,
                                "permission": "active"
                            },
                            "weight": 1
                        }
                    ]
                },
                "max_fee": config.maxFee,
                "actor": user1.account,
                "tpid": user1.address
            }
            })
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log(JSON.stringify(err, null, 4));
            expect(err).to.equal(null);
        }
    });

    it(`get_account for newAccount. Confirm permissions.`, async function () {
        try {
            const json = {
                "account_name": newAccount.account
            }
            result = await callFioApi("get_account", json);
            //console.log(JSON.stringify(result, null, 4));
            expect(result.account_name).to.equal(newAccount.account);
            expect(result.permissions[0].required_auth.accounts[0].permission.actor).to.equal(sortedUsers[0].account);
            expect(result.permissions[0].required_auth.accounts[0].permission.permission).to.equal('active');
            expect(result.permissions[0].required_auth.accounts[1].permission.actor).to.equal(sortedUsers[1].account);
            expect(result.permissions[0].required_auth.accounts[1].permission.permission).to.equal('active');
            expect(result.permissions[0].required_auth.accounts[2].permission.actor).to.equal(sortedUsers[2].account);
            expect(result.permissions[0].required_auth.accounts[2].permission.permission).to.equal('active');
            expect(result.permissions[0].required_auth.accounts[3].permission.actor).to.equal(sortedUsers[3].account);
            expect(result.permissions[0].required_auth.accounts[3].permission.permission).to.equal('active');
            expect(result.permissions[0].required_auth.accounts[4].permission.actor).to.equal(sortedUsers[4].account);
            expect(result.permissions[0].required_auth.accounts[4].permission.permission).to.equal('active');
            expect(result.permissions[0].required_auth.accounts[5].permission.actor).to.equal(sortedUsers[5].account);
            expect(result.permissions[0].required_auth.accounts[5].permission.permission).to.equal('active');
            expect(result.permissions[0].required_auth.accounts[6].permission.actor).to.equal(sortedUsers[6].account);
            expect(result.permissions[0].required_auth.accounts[6].permission.permission).to.equal('active');
            expect(result.permissions[0].required_auth.accounts[7].permission.actor).to.equal(sortedUsers[7].account);
            expect(result.permissions[0].required_auth.accounts[7].permission.permission).to.equal('active');
            expect(result.permissions[0].required_auth.accounts[8].permission.actor).to.equal(sortedUsers[8].account);
            expect(result.permissions[0].required_auth.accounts[8].permission.permission).to.equal('active');
            expect(result.permissions[0].required_auth.accounts[9].permission.actor).to.equal(sortedUsers[9].account);
            expect(result.permissions[0].required_auth.accounts[9].permission.permission).to.equal('active');
            expect(result.permissions[1].required_auth.accounts[0].permission.actor).to.equal(sortedUsers[0].account);
            expect(result.permissions[1].required_auth.accounts[0].permission.permission).to.equal('active');
            expect(result.permissions[1].required_auth.accounts[1].permission.actor).to.equal(sortedUsers[1].account);
            expect(result.permissions[1].required_auth.accounts[1].permission.permission).to.equal('active');
            expect(result.permissions[1].required_auth.accounts[2].permission.actor).to.equal(sortedUsers[2].account);
            expect(result.permissions[1].required_auth.accounts[2].permission.permission).to.equal('active');
            expect(result.permissions[1].required_auth.accounts[3].permission.actor).to.equal(sortedUsers[3].account);
            expect(result.permissions[1].required_auth.accounts[3].permission.permission).to.equal('active');
            expect(result.permissions[1].required_auth.accounts[4].permission.actor).to.equal(sortedUsers[4].account);
            expect(result.permissions[1].required_auth.accounts[4].permission.permission).to.equal('active');
            expect(result.permissions[1].required_auth.accounts[5].permission.actor).to.equal(sortedUsers[5].account);
            expect(result.permissions[1].required_auth.accounts[5].permission.permission).to.equal('active');
            expect(result.permissions[1].required_auth.accounts[6].permission.actor).to.equal(sortedUsers[6].account);
            expect(result.permissions[1].required_auth.accounts[6].permission.permission).to.equal('active');
            expect(result.permissions[1].required_auth.accounts[7].permission.actor).to.equal(sortedUsers[7].account);
            expect(result.permissions[1].required_auth.accounts[7].permission.permission).to.equal('active');
            expect(result.permissions[1].required_auth.accounts[8].permission.actor).to.equal(sortedUsers[8].account);
            expect(result.permissions[1].required_auth.accounts[8].permission.permission).to.equal('active');
            expect(result.permissions[1].required_auth.accounts[9].permission.actor).to.equal(sortedUsers[9].account);
            expect(result.permissions[1].required_auth.accounts[9].permission.permission).to.equal('active');
            expect(result.permissions[0].required_auth.keys.length).to.equal(0);
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
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

    it(`getfiodomains for newAccount from FIO chain. Expect single domain.`, async () => {
        try {
            const result = await user1.sdk.genericAction('getFioDomains', {
                fioPublicKey: newAccount.publicKey
            })
            //console.log('Result:', result);
            expect(result.fio_domains.length).to.equal(1);
        } catch (err) {
            console.log('Error', err);
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

    it(`newAccount transfers FIO using user5 private key`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'trnsfiopubky',
                account: 'fio.token',
                actor: newAccount.account,
                privKey: user5.privateKey,
                data: {
                  amount: 1000000000,
                  payee_public_key: user1.publicKey,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: newAccount.account
                }
            });
            //console.log('Result: ', result);
            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });

    it(`newAccount registers address using user8 private key`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'regaddress',
                account: 'fio.address',
                actor: newAccount.account,
                privKey: user8.privateKey,
                data: {
                  fio_address: newAccount.address,
                  owner_fio_public_key: newAccount.publicKey,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: newAccount.account
                }
            });
            //console.log('Result: ', result);
            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log('Error: ', err);
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
            //console.log(result);
            expect(result.public_address).to.equal(newAccount.publicKey);
        } catch (err) {
            console.log(err.message)
            expect(err).to.equal(null);
        }
    });
});

describe('E. (Failure) Test newfioacc - accounts - new account with owner and active perm set to the main account', () => {
    let user1, user2, pretestUser1, newAccount = {};
    const xferAmount = 90000000000;  // 90 FIO
  
    before(async () => {
        pretestUser1 = await newUser(faucet);
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
        //console.log(`newAccount: , ${newAccount.account}, ${newAccount.publicKey},${newAccount.privateKey},${newAccount.domain},${newAccount.address}`)
    });

    it(`UPDATEAUTH PRETEST: Set active permission with same account. Expect success`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'updateauth',
                account: 'eosio',
                actor: pretestUser1.account,
                privKey: pretestUser1.privateKey,
                data: {
                    permission: 'active',
                    parent: 'owner',
                    auth: {
                        threshold: 1,
                        accounts: 
                        [
                            {
                                "permission": {
                                    "actor": pretestUser1.account,
                                    "permission": "active"
                                },
                                "weight": 1
                            }
                        ],
                        keys: [],
                        waits: [],
                  },
                  max_fee: config.maxFee,
                  account: pretestUser1.account
                }
            });
            //console.log(JSON.stringify(result, null, 4));
            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log("Error: ", err);
            console.log(JSON.stringify(err, null, 4));
            expect(err).to.equal(null);
        }
    });

    /**
     * NOTE: you must pass 'owner' into callFioApiSigned as the final parameter. You cannot update owner permisions 
     * using the default active permission set in callFioApiSigned.
     */
    it(`(failure) UPDATEAUTH PRETEST: Set owner permission with same account. Expect: Irrelevant authority included`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'updateauth',
                account: 'eosio',
                actor: pretestUser1.account,
                privKey: pretestUser1.privateKey,
                data: {
                    permission: 'owner',
                    parent: '',
                    auth: {
                        threshold: 1,
                        accounts: 
                        [
                            {
                                "permission": {
                                    "actor": pretestUser1.account,
                                    "permission": "active"
                                },
                                "weight": 1
                            }
                        ],
                        keys: [],
                        waits: [],
                  },
                  max_fee: config.maxFee,
                  account: pretestUser1.account
                }
            }, 'owner');  // IMPORTANT!
            //console.log(JSON.stringify(result, null, 4));
            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log("Error: ", err);
            console.log(JSON.stringify(err, null, 4));
            expect(err).to.equal(null);
        }
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
                "tpid": user1.address
            }
            })
            expect(result.status).to.equal('OK');

        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
    });

    it(`get_account for user1. Confirm permissions.`, async function () {
        try {
            const json = {
                "account_name": user1.account
            }
            result = await callFioApi("get_account", json);
            //console.log(JSON.stringify(result, null, 4));
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    });

    it(`get_account for newAccount. Confirm permissions.`, async function () {
        try {
            const json = {
                "account_name": newAccount.account
            }
            result = await callFioApi("get_account", json);
            //console.log(JSON.stringify(result, null, 4));
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
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

    it(`getfiodomains for newAccount from FIO chain. Expect single domain.`, async () => {
        try {
            const result = await user1.sdk.genericAction('getFioDomains', {
                fioPublicKey: newAccount.publicKey
            })
            //console.log('Result:', result);
            expect(result.fio_domains.length).to.equal(1);
        } catch (err) {
            console.log('Error', err);
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

    // This is here to make sure the format of the next transfer call works with known user1
    it(`user1 transfers FIO`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'trnsfiopubky',
                account: 'fio.token',
                actor: user1.account,
                privKey: user1.privateKey,
                data: {
                  amount: 1000000000,
                  payee_public_key: faucet.publicKey,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: user1.account
                }
            });
            //console.log('Result: ', result);
            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log('Error: ', err);
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

    it(`(failure) pretestUser1 (set by updateauth) transfers FIO (BD-4469). Can't sign txn with no keys. Expect: Request signature is not valid`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'trnsfiopubky',
                account: 'fio.token',
                actor: pretestUser1.account,
                privKey: pretestUser1.privateKey,
                data: {
                  amount: 1000000000,
                  payee_public_key: user1.publicKey,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: pretestUser1.account
                }
            });
            //console.log('Result: ', result);
            expect(result.message).to.equal('Request signature is not valid or this user is not allowed to sign this transaction.');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });

    it(`(failure) newAccount transfers FIO (BD-4469). Can't sign txn with no keys. Expect: Request signature is not valid`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'trnsfiopubky',
                account: 'fio.token',
                actor: newAccount.account,
                privKey: newAccount.privateKey,
                data: {
                  amount: 1000000000,
                  payee_public_key: user1.publicKey,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: newAccount.account
                }
            });
            //console.log('Result: ', result);
            expect(result.message).to.equal('Request signature is not valid or this user is not allowed to sign this transaction.');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });

    it(`(failure) newAccount registers address (BD-4469). Can't sign txn with no keys. Expect: Request signature is not valid`, async () => {
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
            //console.log('Result: ', result);
            expect(result.message).to.equal('Request signature is not valid or this user is not allowed to sign this transaction.');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });
});

describe('F. Test add_pub_address RAM Consumption', () => {

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

describe('G. Test newfioacc - Sad Path', () => {
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

      it(`(failure) Only set owner permission. Expect SDK error (BD-4479)`, async () => {
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

    it(`(failure) Only set active permission. Expect SDK error (BD-4479)`, async () => {
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

    it(`(failure) Invalid FIO Public Key. Expect: ${config.error2.invalidKey.statusCode} ${config.error2.invalidKey.message} (BD-4471)`, async () => {
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
            //console.log(err.json.fields[0]);
            expect(err.json.fields[0].error).to.equal(config.error2.invalidKey.message);
            expect(err.errorCode).to.equal(config.error2.invalidKey.statusCode);
        }
    });

    it(`(failure) Invalid owner permission actor. Expect: ${config.error2.invalidOwnerPerm.statusCode} ${config.error2.invalidOwnerPerm.message}`, async () => {
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
            //console.log(JSON.stringify(err, null, 4));
            expect(err.json.error.details[0].message).to.equal(`account '123' does not exist`);
            expect(err.json.code).to.equal(500);
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

    it(`(failure) Try to Create new account with same account. Expect: ${config.error2.accountExistsPubKey.statusCode} ${config.error2.accountExistsPubKey.message}`, async () => {
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
            expect(err.json.fields[0].error).to.equal(config.error2.accountExistsPubKey.message);
            expect(err.errorCode).to.equal(config.error2.accountExistsPubKey.statusCode);
        }
    });

    it(`(failure) Try to Create new account on existing account. Expect: ${config.error2.accountExistsPubKey.statusCode} ${config.error2.accountExistsPubKey.message}`, async () => {
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
            expect(err.json.fields[0].error).to.equal(config.error2.accountExistsPubKey.message);
            expect(err.errorCode).to.equal(config.error2.accountExistsPubKey.statusCode);
        }
    });

});

describe('H. Test newfioacc - keys - set owner and active to single key that is different from main account key (BUG BD-4481)', () => {
    let pretestUser1, user1, newAccount = {};
    const xferAmount = 90000000000;  // 90 FIO
  
    before(async () => {
        pretestUser1 = await newUser(faucet);
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
      //console.log(`newAccount: , ${newAccount.account}, ${newAccount.publicKey},${newAccount.privateKey},${newAccount.domain},${newAccount.address}`)
    });

    it(`UPDATEAUTH PRETEST: Update pretestUser1 active key with user1 public key`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'updateauth',
                account: 'eosio',
                actor: pretestUser1.account,
                privKey: pretestUser1.privateKey,
                data: {
                    permission: 'active',
                    parent: 'owner',
                    auth: {
                        threshold: 1,
                        accounts: [],
                        keys: 
                        [
                            {
                                key: pretestUser1.publicKey,
                                weight: 1
                            }
                        ],
                        waits: [],
                  },
                  max_fee: config.maxFee,
                  account: pretestUser1.account
                }
            });
            //console.log(JSON.stringify(result, null, 4));
            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log("Error: ", err);
            console.log(JSON.stringify(err, null, 4));
            expect(err).to.equal(null);
        }
    });

    it(`UPDATEAUTH PRETEST: Update pretestUser1 owner key with user1 public key`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'updateauth',
                account: 'eosio',
                actor: pretestUser1.account,
                privKey: pretestUser1.privateKey,
                data: {
                    permission: 'owner',
                    parent: '',
                    auth: {
                        threshold: 1,
                        accounts: [],
                        keys: 
                        [
                            {
                                key: pretestUser1.publicKey,
                                weight: 1
                            }
                        ],
                        waits: [],
                  },
                  max_fee: config.maxFee,
                  account: pretestUser1.account
                }
            }, 'owner');  // IMPORTANT
            //console.log(JSON.stringify(result, null, 4));
            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log("Error: ", err);
            console.log(JSON.stringify(err, null, 4));
            expect(err).to.equal(null);
        }
    });

    it(`Create new account with active and owner keys from user1`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
            action: 'newfioacc',
            account: 'eosio',
            actor: user1.account,
            data: {
                "fio_public_key": newAccount.publicKey,
                "owner": {
                    "threshold": 1,
                    "keys": [
                        {
                            key: user1.publicKey,
                            weight: 1
                        }
                    ],
                    "waits": [],
                    "accounts": []
                },
                "active": {
                    "threshold": 1,
                    "keys": [
                        {
                            key: user1.publicKey,
                            weight: 1
                        }
                    ],
                    "waits": [],
                    "accounts": []
                },
                "max_fee": config.maxFee,
                "actor": user1.account,
                "tpid": user1.address
            }
            })
            expect(result.status).to.equal('OK');

        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
    });

    it(`UPDATEAUTH PRETEST: get_account for pretestUser1. Confirm permissions.`, async function () {
        try {
            const json = {
                "account_name": pretestUser1.account
            }
            result = await callFioApi("get_account", json);
            //console.log(JSON.stringify(result, null, 4));
            expect(result.account_name).to.equal(pretestUser1.account);
            expect(result.permissions[0].required_auth.keys[0].key).to.equal(pretestUser1.publicKey);
            expect(result.permissions[0].required_auth.keys[0].weight).to.equal(1);
            expect(result.permissions[1].required_auth.keys[0].key).to.equal(pretestUser1.publicKey);
            expect(result.permissions[1].required_auth.keys[0].weight).to.equal(1);
            expect(result.permissions[0].required_auth.accounts.length).to.equal(0);
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    });

    it(`get_account for newAccount. Confirm permissions.`, async function () {
        try {
            const json = {
                "account_name": newAccount.account
            }
            result = await callFioApi("get_account", json);
            //console.log(JSON.stringify(result, null, 4));
            expect(result.account_name).to.equal(newAccount.account);
            expect(result.permissions[0].required_auth.keys[0].key).to.equal(user1.publicKey);
            expect(result.permissions[0].required_auth.keys[0].weight).to.equal(1);
            expect(result.permissions[1].required_auth.keys[0].key).to.equal(user1.publicKey);
            expect(result.permissions[1].required_auth.keys[0].weight).to.equal(1);
            expect(result.permissions[0].required_auth.accounts.length).to.equal(0);
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
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

    it(`getfiodomains for newAccount from FIO chain. Expect single domain.`, async () => {
        try {
            const result = await user1.sdk.genericAction('getFioDomains', {
                fioPublicKey: newAccount.publicKey
            })
            //console.log('Result:', result);
            expect(result.fio_domains.length).to.equal(1);
        } catch (err) {
            console.log('Error', err);
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

    it(`newAccount transfers FIO using user1 private key`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'trnsfiopubky',
                account: 'fio.token',
                actor: newAccount.account,
                privKey: user1.privateKey,
                data: {
                  amount: 1000000000,
                  payee_public_key: user1.publicKey,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: newAccount.account
                }
            });
            //console.log('Result: ', result);
            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });

    it(`newAccount registers address using user1 private key`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'regaddress',
                account: 'fio.address',
                actor: newAccount.account,
                privKey: user1.privateKey,
                data: {
                  fio_address: newAccount.address,
                  owner_fio_public_key: newAccount.publicKey,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: newAccount.account
                }
            });
            //console.log('Result: ', result);
            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log('Error: ', err);
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
            //console.log(result);
            expect(result.public_address).to.equal(newAccount.publicKey);
        } catch (err) {
            console.log(err.message)
            expect(err).to.equal(null);
        }
    });
});

describe('I. Test public key sort order. Confirm it aligns with updateauth', () => {
    let pretestUser1, user1, newAccount = {};
    const xferAmount = 90000000000;  // 90 FIO

    // Failure: eosio sorts "H" before "c"
    const failureKeys = [
        'FIO7ckXdy9m9DgiMPGvs2X59ktXCtdsLxs52fnRWgEzHmqwoiYNUq',
        'FIO7HUoM8BphEqXHmecNEQrUqjFyEKcGahFsUnJNryHhyUzC1iBog'
    ];
    //success
    const successKeys = [
        'FIO7HUoM8BphEqXHmecNEQrUqjFyEKcGahFsUnJNryHhyUzC1iBog',
        'FIO7ckXdy9m9DgiMPGvs2X59ktXCtdsLxs52fnRWgEzHmqwoiYNUq'
    ];

    before(async () => {
        pretestUser1 = await newUser(faucet);
        user1 = await newUser(faucet);
        const keypair = await createKeypair();
        newAccount = {
            publicKey: keypair.publicKey,
            privateKey: keypair.privateKey,
            account: await getAccountFromKey(keypair.publicKey)
      }
    });
  
    it(`(failure) UPDATEAUTH PRETEST: Update pretestUser1 owner keys with failureKeys`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'updateauth',
                account: 'eosio',
                actor: pretestUser1.account,
                privKey: pretestUser1.privateKey,
                data: {
                    permission: 'owner',
                    parent: '',
                    auth: {
                        threshold: 1,
                        accounts: [],
                        keys: 
                        [
                            {
                                key: failureKeys[0],
                                weight: 1
                            },
                            {
                                key: failureKeys[1],
                                weight: 1
                            }
                        ],
                        waits: [],
                  },
                  max_fee: config.maxFee,
                  account: pretestUser1.account
                }
            }, 'owner');  // IMPORTANT
            //console.log(JSON.stringify(result, null, 4));
            expect(result.code).to.equal(500);
            expect(result.error.what).to.equal('Action validate exception');
        } catch (err) {
            console.log("Error: ", err);
            expect(err).to.equal(null);
        }
    });

    it(`Create new account with failureKeys`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
            action: 'newfioacc',
            account: 'eosio',
            actor: user1.account,
            data: {
                "fio_public_key": newAccount.publicKey,
                "owner": {
                    "threshold": 1,
                    "keys": [
                        {
                            key: failureKeys[0],
                            weight: 1
                        },
                        {
                            key: failureKeys[1],
                            weight: 1
                        }
                    ],
                    "waits": [],
                    "accounts": []
                },
                "active": {
                    "threshold": 1,
                    "keys": [
                        {
                            key: failureKeys[0],
                            weight: 1
                        },
                        {
                            key: failureKeys[1],
                            weight: 1
                        }
                    ],
                    "waits": [],
                    "accounts": []
                },
                "max_fee": config.maxFee,
                "actor": user1.account,
                "tpid": user1.address
            }
            })
            console.log('Result: ', result);
            expect(result).to.equal(null);
        } catch (err) {
            //console.log('err: ', err);
            expect(err.json.code).to.equal(500);
            expect(err.json.error.what).to.equal('Action validate exception');
        }
    });

    it(`UPDATEAUTH PRETEST: Update pretestUser1 owner key with successKeys`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'updateauth',
                account: 'eosio',
                actor: pretestUser1.account,
                privKey: pretestUser1.privateKey,
                data: {
                    permission: 'owner',
                    parent: '',
                    auth: {
                        threshold: 1,
                        accounts: [],
                        keys: 
                        [
                            {
                                key: successKeys[0],
                                weight: 1
                            },
                            {
                                key: successKeys[1],
                                weight: 1
                            }
                        ],
                        waits: [],
                  },
                  max_fee: config.maxFee,
                  account: pretestUser1.account
                }
            }, 'owner');  // IMPORTANT
            //console.log(JSON.stringify(result, null, 4));
            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log("Error: ", err);
            console.log(JSON.stringify(err, null, 4));
            expect(err).to.equal(null);
        }
    });

    it(`Create new account with successKeys`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
            action: 'newfioacc',
            account: 'eosio',
            actor: user1.account,
            data: {
                "fio_public_key": newAccount.publicKey,
                "owner": {
                    "threshold": 1,
                    "keys": [
                        {
                            key: successKeys[0],
                            weight: 1
                        },
                        {
                            key: successKeys[1],
                            weight: 1
                        }
                    ],
                    "waits": [],
                    "accounts": []
                },
                "active": {
                    "threshold": 1,
                    "keys": [
                        {
                            key: successKeys[0],
                            weight: 1
                        },
                        {
                            key: successKeys[1],
                            weight: 1
                        }
                    ],
                    "waits": [],
                    "accounts": []
                },
                "max_fee": config.maxFee,
                "actor": user1.account,
                "tpid": user1.address
            }
            })
           //console.log(JSON.stringify(result, null, 4));
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log(JSON.stringify(result, null, 4));
            expect(err).to.equal(null);
        }
    });
});

describe('J. Test newfioacc - keys - create account with 10 public keys', () => {
    let  user1, newAccount = {};
    const xferAmount = 90000000000;  // 90 FIO  

    const testKeys = [
        'FIO4w7QBqPTqgZWbe8iwP47XrPwZjmiVnXzc6fi6yji9sAc9LrqBK',
        'FIO55EmDGdh28ZpsT7H1bwveD9Vb2XfrQaQEKgVagmDq9ZMaCm7FK',
        'FIO5iLGrsRS2WZWQq1JtZbS8ySaAGiNsij1SFBPLbRb8JyNQfEinb',
        'FIO61wkg5oCwQzSteoninPAnKYH568qhwa5ppirfunREdfrrAycj2',
        'FIO6BGtjQAJxP4oKTLkcenidJaExdpmWzYu3MxcUGNm9oYi36HuXc',
        'FIO6eHL7LEFxKtidZcg93ETJ9bpHs93frufRZXCnED8FrywmNNtCH',
        'FIO7F59GxKmkkWoCncYRfbJ8bv6pnPAKaKYejyEHgBGtKajx8g2dr',
        'FIO7dCVjCin12Yfz839yW7GpgRuG3gnedab8316F9HcJCMh2ogYVD',
        'FIO8SUUvGE5wi5B25YnGm2JRvnWLBrhvkk3BxwV5MMcySsJCqa83m',
        'FIO8XMfzJzncQcokCXC7nAx87h6GcCprdfTVzHD1WJor59TbmVMeD'
    ];
  
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

    it(`Create new account with 10 active and owner keys`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
            action: 'newfioacc',
            account: 'eosio',
            actor: user1.account,
            data: {
                "fio_public_key": newAccount.publicKey,
                "owner": {
                    "threshold": 3,
                    "keys": [
                        {
                            key: testKeys[0],
                            weight: 1
                        },
                        {
                            key: testKeys[1],
                            weight: 1
                        },
                        {
                            key: testKeys[2],
                            weight: 1
                        },
                        {
                            key: testKeys[3],
                            weight: 1
                        },
                        {
                            key: testKeys[4],
                            weight: 1
                        },
                        {
                            key: testKeys[5],
                            weight: 1
                        },
                        {
                            key: testKeys[6],
                            weight: 1
                        },
                        {
                            key: testKeys[7],
                            weight: 1
                        },
                        {
                            key: testKeys[8],
                            weight: 1
                        },
                        {
                            key: testKeys[9],
                            weight: 1
                        }
                    ],
                    "waits": [],
                    "accounts": []
                },
                "active": {
                    "threshold": 3,
                    "keys": [
                        {
                            key: testKeys[0],
                            weight: 1
                        },
                        {
                            key: testKeys[1],
                            weight: 1
                        },
                        {
                            key: testKeys[2],
                            weight: 1
                        },
                        {
                            key: testKeys[3],
                            weight: 1
                        },
                        {
                            key: testKeys[4],
                            weight: 1
                        },
                        {
                            key: testKeys[5],
                            weight: 1
                        },
                        {
                            key: testKeys[6],
                            weight: 1
                        },
                        {
                            key: testKeys[7],
                            weight: 1
                        },
                        {
                            key: testKeys[8],
                            weight: 1
                        },
                        {
                            key: testKeys[9],
                            weight: 1
                        }
                    ],
                    "waits": [],
                    "accounts": []
                },
                "max_fee": config.maxFee,
                "actor": user1.account,
                "tpid": user1.address
            }
            })
            //console.log('Result: ', result);
            expect(result.status).to.equal('OK');

        } catch (err) {
            console.log('err: ', err)
            expect(err).to.equal(null);
        }
    });

    it(`get_account for newAccount. Confirm permissions.`, async function () {
        try {
            const json = {
                "account_name": newAccount.account
            }
            result = await callFioApi("get_account", json);
            //console.log(JSON.stringify(result, null, 4));
            expect(result.account_name).to.equal(newAccount.account);
            expect(result.permissions[0].required_auth.keys[0].key).to.equal(testKeys[0]);
            expect(result.permissions[0].required_auth.keys[1].key).to.equal(testKeys[1]);
            expect(result.permissions[0].required_auth.keys[2].key).to.equal(testKeys[2]);
            expect(result.permissions[0].required_auth.keys[3].key).to.equal(testKeys[3]);
            expect(result.permissions[0].required_auth.keys[4].key).to.equal(testKeys[4]);
            expect(result.permissions[0].required_auth.keys[5].key).to.equal(testKeys[5]);
            expect(result.permissions[0].required_auth.keys[6].key).to.equal(testKeys[6]);
            expect(result.permissions[0].required_auth.keys[7].key).to.equal(testKeys[7]);
            expect(result.permissions[0].required_auth.keys[8].key).to.equal(testKeys[8]);
            expect(result.permissions[0].required_auth.keys[9].key).to.equal(testKeys[9]);
            expect(result.permissions[1].required_auth.keys[0].key).to.equal(testKeys[0]);
            expect(result.permissions[1].required_auth.keys[1].key).to.equal(testKeys[1]);
            expect(result.permissions[1].required_auth.keys[2].key).to.equal(testKeys[2]);
            expect(result.permissions[1].required_auth.keys[3].key).to.equal(testKeys[3]);
            expect(result.permissions[1].required_auth.keys[4].key).to.equal(testKeys[4]);
            expect(result.permissions[1].required_auth.keys[5].key).to.equal(testKeys[5]);
            expect(result.permissions[1].required_auth.keys[6].key).to.equal(testKeys[6]);
            expect(result.permissions[1].required_auth.keys[7].key).to.equal(testKeys[7]);
            expect(result.permissions[1].required_auth.keys[8].key).to.equal(testKeys[8]);
            expect(result.permissions[1].required_auth.keys[9].key).to.equal(testKeys[9]);
            expect(result.permissions[0].required_auth.accounts.length).to.equal(0);
            expect(result.permissions[0].required_auth.threshold).to.equal(3);
            expect(result.permissions[1].required_auth.threshold).to.equal(3);
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
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
});