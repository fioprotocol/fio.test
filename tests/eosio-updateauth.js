/**
 * Adds a new permission to an account. In this example it adds a "regaddress" permission to the account.
 * This permission can then be linked to a contract action (see eosio-linkauth.js) to enable a secondary 
 * account to execute actions on the primary accounts behalf.
 */

require('mocha')
const {expect} = require('chai')
const {
  newUser, 
  callFioApiSigned,
  fetchJson,
  randStr
} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
const config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** eosio-updateauth.js ************************** \n    A. Create a new account permission`, () => {

  let user1, user2, user3, user4, user5, user6, user7, user8, user9, user10;
  let usersByAccount = [];
  let usersByKey = [];
  const permissionName = 'regaddress'
  const parent = 'active'
  const permission = 'active'

  it(`Create users`, async () => {
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
      // sort accounts and keys
      usersByAccount = [user1.account, user2.account, user3.account, user4.account, user5.account, user6.account, user7.account, user8.account, user9.account, user10.account, ]
      usersByAccount.sort();
      usersByKey = [user1.publicKey, user2.publicKey, user3.publicKey, user4.publicKey, user5.publicKey, user6.publicKey, user7.publicKey, user8.publicKey, user9.publicKey, user10.publicKey, ]
      usersByKey.sort();
    });

  it(`(failure) create account-based permission with non-existent account. Expect "account does not exist" error`, async () => {
    try {
      const noAcct = randStr(12);
      const authorization = {
        threshold: 1,
        accounts: [
          {
            permission: {
              actor: noAcct,
              permission: 'active'
            },
            weight: 1
          }
        ],
        keys: [],
        waits: [],
      };

      const result = await callFioApiSigned('push_transaction', {
        action: 'updateauth',
        account: 'eosio',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          permission: permissionName,
          parent: 'active',
          auth: authorization,
          max_fee: config.maxFee,
          account: user1.account
        }
      });
      //console.log('Result: ', result);
      expect(result.error.details[0].message).to.equal(`account '${noAcct}' does not exist`);
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  });

  it(`(success) create account-based permission - 1 account`, async () => {
    try {

      const authorization = {
        threshold: 1,
        accounts: [
          {
            permission: {
              actor: user2.account,
              permission: 'active'
            },
            weight: 1
          }
        ],
        keys: [],
        waits: [],
      };

      const result = await callFioApiSigned('push_transaction', {
        action: 'updateauth',
        account: 'eosio',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          permission: permissionName,
          parent: 'active',
          auth: authorization,
          max_fee: config.maxFee,
          account: user1.account
        }
      });
      //console.log('Result: ', result);
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  });

  it(`(success) create account-based permission - 2 accounts (sorted)`, async () => {
    try {
      const authorization = {
        threshold: 1,
        accounts: [
          {
            permission: {
              actor: usersByAccount[0],
              permission: 'active'
            },
            weight: 1
          },
          {
            permission: {
              actor: usersByAccount[1],
              permission: 'active'
            },
            weight: 1
          }
        ],
        keys: [],
        waits: [],
      };

      const result = await callFioApiSigned('push_transaction', {
        action: 'updateauth',
        account: 'eosio',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          permission: permissionName,
          parent: 'active',
          auth: authorization,
          max_fee: config.maxFee,
          account: user1.account
        }
      });
      //console.log('Result: ', result);
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  });

  it(`(success) create account-based permission - 1 public key`, async () => {
    try {

      const authorization = {
        threshold: 1,
        accounts: [],
        keys: [
          {
            key: user2.publicKey,
            weight: 1
          }
        ],
        waits: [],
      };

      const result = await callFioApiSigned('push_transaction', {
        action: 'updateauth',
        account: 'eosio',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          permission: permissionName,
          parent: 'active',
          auth: authorization,
          max_fee: config.maxFee,
          account: user1.account
        }
      });
      //console.log('Result: ', result);
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  });

  it(`(success) create account-based permission - 2 public keys (BD-4194)`, async () => {
    try {
      const authorization = {
        threshold: 1,
        accounts: [],
        keys: [
          {
            key: usersByKey[1],
            weight: 1
          },
          {
            key: usersByKey[2],
            weight: 1
          }
        ],
        waits: [],
      };

      const result = await callFioApiSigned('push_transaction', {
        action: 'updateauth',
        account: 'eosio',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          permission: permissionName,
          parent: 'active',
          auth: authorization,
          max_fee: config.maxFee,
          account: user1.account
        }
      });
      //console.log('Result: ', result);
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  });

  it(`(success) create account-based permission - Remove one key`, async () => {
    try {
      const authorization = {
        threshold: 1,
        accounts: [],
        keys: [
          {
            key: usersByKey[1],
            weight: 1
          }
        ],
        waits: [],
      };

      const result = await callFioApiSigned('push_transaction', {
        action: 'updateauth',
        account: 'eosio',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          permission: permissionName,
          parent: 'active',
          auth: authorization,
          max_fee: config.maxFee,
          account: user1.account
        }
      });
      //console.log('Result: ', result);
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  });

  it(`(success) create account-based permission - 10 public keys)`, async () => {
    try {
      const authorization = {
        threshold: 1,
        accounts: [],
        keys: [
          {
            key: usersByKey[0],
            weight: 1
          },
          {
            key: usersByKey[1],
            weight: 1
          },
          {
            key: usersByKey[2],
            weight: 1
          },
          {
            key: usersByKey[3],
            weight: 1
          },
          {
            key: usersByKey[4],
            weight: 1
          },
          {
            key: usersByKey[5],
            weight: 1
          },
          {
            key: usersByKey[6],
            weight: 1
          },
          {
            key: usersByKey[7],
            weight: 1
          },          {
            key: usersByKey[8],
            weight: 1
          },
          {
            key: usersByKey[9],
            weight: 1
          }
        ],
        waits: [],
      };

      const result = await callFioApiSigned('push_transaction', {
        action: 'updateauth',
        account: 'eosio',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          permission: permissionName,
          parent: 'active',
          auth: authorization,
          max_fee: config.maxFee,
          account: user1.account
        }
      });
      //console.log('Result: ', result);
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  });

});