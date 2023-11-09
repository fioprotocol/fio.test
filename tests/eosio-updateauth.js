require('mocha')
const {expect} = require('chai')
const {
  newUser, 
  callFioApiSigned,
  callFioApi,
  fetchJson,
  generateFioAddress,
  timeout,
  randStr
} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
const config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

/**
 * IMPORTANT NOTE ON UPDATEAUTH
 * 
 * When you do a transaction with a custom permission, the only thing that needs to change in the transaction is the private
 * key. So, if you add a new account2 permission to account1, then you want to transfer FIO from account1 using the new permission,
 * you should use all account1 info in the transaction EXCEPT for the private key, which should be the account2 private key.
 */

describe(`************************** eosio-updateauth.js ************************** \n    A. Create a new permission (permission: active) `, () => {

  let user1, user2, user3, user4, user5, user6, user7, user8, user9, user10;
  let usersByAccount = [];
  let usersByKey = [];
  const parent = 'owner'
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

  it(`(failure) user1 create account-based permission with non-existent account. Expect "account does not exist" error`, async () => {
    try {
      const noAcct = randStr(12);
      const authorization = {
        threshold: 1,
        accounts: [
          {
            permission: {
              actor: noAcct,
              permission: permission
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
          permission: permission,
          parent: parent,
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

  it(`(success) user1 create new active permission - 1 account`, async () => {
    try {

      const authorization = {
        threshold: 1,
        accounts: [
          {
            permission: {
              actor: user2.account,
              permission: permission
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
          permission: permission,
          parent: parent,
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

  it(`Get account for user1. Expect new account permission for owner`, async () => {
    try {
      const json = {
        "account_name": user1.account
      }
      result = await callFioApi("get_account", json);
      //console.log(JSON.stringify(result, null, 4));
      expect(result.permissions[0].required_auth.accounts[0].permission.actor).to.equal(user2.account);
      expect(result.permissions[0].required_auth.accounts[0].permission.permission).to.equal(permission);
      expect(result.permissions[1].required_auth.keys[0].key).to.equal(user1.publicKey);
    } catch (err) {
      console.log(JSON.stringify(err, null, 4));
      expect(err).to.equal(null);
    }
  });

  it(`user1 transfers FIO using private key for new account`, async () => {
    try {
        const result = await callFioApiSigned('push_transaction', {
            action: 'trnsfiopubky',
            account: 'fio.token',
            actor: user1.account,
            privKey: user2.privateKey,
            data: {
              amount: 1000000000,
              payee_public_key: user2.publicKey,
              max_fee: config.maxFee,
              tpid: '',
              actor: user1.account
            }
        }, permission);
        //console.log(JSON.stringify(result, null, 4));
        expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
      console.log(JSON.stringify(err, null, 4));
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  });

  it(`(success) user2 create new active permission - 2 accounts (sorted)`, async () => {
    try {
      const authorization = {
        threshold: 1,
        accounts: [
          {
            permission: {
              actor: usersByAccount[2],
              permission: permission
            },
            weight: 1
          },
          {
            permission: {
              actor: usersByAccount[3],
              permission: permission
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
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          permission: permission,
          parent: parent,
          auth: authorization,
          max_fee: config.maxFee,
          account: user2.account
        }
      });
      //console.log('Result: ', result);
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  });

  it(`Get account for user2. Expect new account permission for active`, async () => {
    try {
      const json = {
        "account_name": user2.account
      }
      result = await callFioApi("get_account", json);
      //console.log(JSON.stringify(result, null, 4));
      expect(result.permissions[0].required_auth.accounts[0].permission.actor).to.equal(usersByAccount[2]);
      expect(result.permissions[0].required_auth.accounts[0].permission.permission).to.equal(permission);
      expect(result.permissions[0].required_auth.accounts[1].permission.actor).to.equal(usersByAccount[3]);
      expect(result.permissions[0].required_auth.accounts[1].permission.permission).to.equal(permission);
      expect(result.permissions[1].required_auth.keys[0].key).to.equal(user2.publicKey);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it.skip(`(success) create new active permission - Use new permission to update key again`, async () => {
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
          permission: permission,
          parent: parent,
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

  it(`(success) user3 create new active permission - 1 public key`, async () => {
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
        actor: user3.account,
        privKey: user3.privateKey,
        data: {
          permission: permission,
          parent: parent,
          auth: authorization,
          max_fee: config.maxFee,
          account: user3.account
        }
      });
      //console.log('Result: ', result);
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  });

  it(`Get account for user3`, async () => {
    try {
      const json = {
        "account_name": user3.account
      }
      result = await callFioApi("get_account", json);
      expect(result.permissions[0].required_auth.keys[0].key).to.equal(user2.publicKey);
      expect(result.permissions[1].required_auth.keys[0].key).to.equal(user3.publicKey);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`(success) user4 create new active permission - 2 public keys (BD-4194)`, async () => {
    try {
      const authorization = {
        threshold: 1,
        accounts: [],
        keys: [
          {
            key: usersByKey[6],
            weight: 1
          },
          {
            key: usersByKey[7],
            weight: 1
          }
        ],
        waits: [],
      };

      const result = await callFioApiSigned('push_transaction', {
        action: 'updateauth',
        account: 'eosio',
        actor: user4.account,
        privKey: user4.privateKey,
        data: {
          permission: permission,
          parent: parent,
          auth: authorization,
          max_fee: config.maxFee,
          account: user4.account
        }
      });
      //console.log('Result: ', result);
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  });

  it(`Get account for user4`, async () => {
    try {
      const json = {
        "account_name": user4.account
      }
      result = await callFioApi("get_account", json);
      expect(result.permissions[0].required_auth.keys[0].key).to.equal(usersByKey[6]);
      expect(result.permissions[0].required_auth.keys[1].key).to.equal(usersByKey[7]);
      expect(result.permissions[1].required_auth.keys[0].key).to.equal(user4.publicKey);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`(success) user5 create new active permission - 10 public keys)`, async () => {
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
        actor: user5.account,
        privKey: user5.privateKey,
        data: {
          permission: permission,
          parent: parent,
          auth: authorization,
          max_fee: config.maxFee,
          account: user5.account
        }
      });
      //console.log('Result: ', result);
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  });

  it(`Get account for user5. Expect 10 keys for active`, async () => {
    try {
      const json = {
        "account_name": user5.account
      }
      result = await callFioApi("get_account", json);
      expect(result.permissions[0].required_auth.keys[0].key).to.equal(usersByKey[0]);
      expect(result.permissions[0].required_auth.keys[1].key).to.equal(usersByKey[1]);
      expect(result.permissions[0].required_auth.keys[9].key).to.equal(usersByKey[9]);
      expect(result.permissions[1].required_auth.keys[0].key).to.equal(user5.publicKey);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

});

describe(`B. Create a new permission (permission: owner) `, () => {

  let user1, user2, user3, user4, user5, user6, user7, user8, user9, user10;
  let usersByAccount = [];
  let usersByKey = [];
  const parent = ''
  const permission = 'owner'

  before(`Create users`, async () => {
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
              permission: permission
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
          permission: permission,
          parent: parent,
          auth: authorization,
          max_fee: config.maxFee,
          account: user1.account
        }
      }, permission);
      //console.log('Result: ', result);
      expect(result.error.details[0].message).to.equal(`account '${noAcct}' does not exist`);
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  });

  it(`(success) user1 create new owner permission - 1 account`, async () => {
    try {

      const authorization = {
        threshold: 1,
        accounts: [
          {
            permission: {
              actor: user2.account,
              permission: permission
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
          permission: permission,
          parent: parent,
          auth: authorization,
          max_fee: config.maxFee,
          account: user1.account
        }
      }, permission);
      //console.log('Result: ', result);
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  });

  it(`Get account for user1. Expect new account permission for owner`, async () => {
    try {
      const json = {
        "account_name": user1.account
      }
      result = await callFioApi("get_account", json);
      //console.log('Result: ', result.permissions);
      //console.log('active required_auth: ', result.permissions[0].required_auth);
      //console.log('owner required_auth: ', result.permissions[1].required_auth.accounts);
      expect(result.permissions[1].required_auth.accounts[0].permission.actor).to.equal(user2.account);
      expect(result.permissions[1].required_auth.accounts[0].permission.permission).to.equal(permission);
      expect(result.permissions[0].required_auth.keys[0].key).to.equal(user1.publicKey);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`(success) create new owner permission - 2 accounts (sorted)`, async () => {
    try {
      const authorization = {
        threshold: 1,
        accounts: [
          {
            permission: {
              actor: usersByAccount[2],
              permission: permission
            },
            weight: 1
          },
          {
            permission: {
              actor: usersByAccount[3],
              permission: permission
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
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          permission: permission,
          parent: parent,
          auth: authorization,
          max_fee: config.maxFee,
          account: user2.account
        }
      }, permission);
      //console.log('Result: ', result);
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  });

  it(`Get account for user2. Expect 2 account permissions for owner`, async () => {
    try {
      const json = {
        "account_name": user2.account
      }
      result = await callFioApi("get_account", json);
      //console.log('Result: ', result.permissions);
      //console.log('active required_auth: ', result.permissions[0].required_auth);
      //console.log('owner required_auth: ', result.permissions[1].required_auth.accounts);
      expect(result.permissions[1].required_auth.accounts[0].permission.actor).to.equal(usersByAccount[2]);
      expect(result.permissions[1].required_auth.accounts[0].permission.permission).to.equal(permission);
      expect(result.permissions[1].required_auth.accounts[1].permission.actor).to.equal(usersByAccount[3]);
      expect(result.permissions[1].required_auth.accounts[1].permission.permission).to.equal(permission);
      expect(result.permissions[0].required_auth.keys[0].key).to.equal(user2.publicKey);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`(success) user3 create new owner permission - 1 public key`, async () => {
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
        actor: user3.account,
        privKey: user3.privateKey,
        data: {
          permission: permission,
          parent: parent,
          auth: authorization,
          max_fee: config.maxFee,
          account: user3.account
        }
      }, permission);
      //console.log('Result: ', result.error.details);
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  }, permission);

  it(`Get account for user3. Expect new permission for owner`, async () => {
    try {
      const json = {
        "account_name": user3.account
      }
      result = await callFioApi("get_account", json);
      //console.log('Result: ', result.permissions);
      //console.log('active required_auth: ', result.permissions[0].required_auth);
      //console.log('owner required_auth: ', result.permissions[1].required_auth);
      expect(result.permissions[1].required_auth.keys[0].key).to.equal(user2.publicKey);
      expect(result.permissions[0].required_auth.keys[0].key).to.equal(user3.publicKey);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`(success) user4 create new owner permission - 2 public keys (BD-4194)`, async () => {
    try {
      const authorization = {
        threshold: 1,
        accounts: [],
        keys: [
          {
            key: usersByKey[6],
            weight: 1
          },
          {
            key: usersByKey[7],
            weight: 1
          }
        ],
        waits: [],
      };

      const result = await callFioApiSigned('push_transaction', {
        action: 'updateauth',
        account: 'eosio',
        actor: user4.account,
        privKey: user4.privateKey,
        data: {
          permission: permission,
          parent: parent,
          auth: authorization,
          max_fee: config.maxFee,
          account: user4.account
        }
      }, permission);
      //console.log('Result: ', result);
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  });

  it(`Get account for user3`, async () => {
    try {
      const json = {
        "account_name": user4.account
      }
      result = await callFioApi("get_account", json);
      //console.log('Result: ', result.permissions);
      //console.log('active required_auth: ', result.permissions[0].required_auth);
      //console.log('owner required_auth: ', result.permissions[1].required_auth);
      expect(result.permissions[1].required_auth.keys[0].key).to.equal(usersByKey[6]);
      expect(result.permissions[1].required_auth.keys[1].key).to.equal(usersByKey[7]);
      expect(result.permissions[0].required_auth.keys[0].key).to.equal(user4.publicKey);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`(success) user5 create new owner permission - 10 public keys)`, async () => {
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
        actor: user5.account,
        privKey: user5.privateKey,
        data: {
          permission: permission,
          parent: parent,
          auth: authorization,
          max_fee: config.maxFee,
          account: user5.account
        }
      }, permission);
      //console.log('Result: ', result);
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  });

  it(`Get account for user5. Expect 10 keys for active`, async () => {
    try {
      const json = {
        "account_name": user5.account
      }
      result = await callFioApi("get_account", json);
      //console.log('Result: ', result.permissions);
      //console.log('active required_auth: ', result.permissions[0].required_auth);
      //console.log('owner required_auth: ', result.permissions[1].required_auth);
      expect(result.permissions[1].required_auth.keys[0].key).to.equal(usersByKey[0]);
      expect(result.permissions[1].required_auth.keys[1].key).to.equal(usersByKey[1]);
      expect(result.permissions[1].required_auth.keys[9].key).to.equal(usersByKey[9]);
      expect(result.permissions[0].required_auth.keys[0].key).to.equal(user5.publicKey);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

});

describe(`C. Create custom perm for regaddress to enable secondary account to register addresses on private domain of primary account `, () => {

  let user1, user2;
  const newPerm = "regmyadd";
  const count = 5;

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  });

  it(`Create regmyadd permission on user1 active account and link it to user2 'active' account`, async () => {
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
          permission: newPerm,
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

  it(`user1 links ${newPerm} permission to regaddress`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'linkauth',
        account: 'eosio',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          account: user1.account,                 // the owner of the permission to be linked, this account will sign the transaction
          code: 'fio.address',                    // the contract owner of the action to be linked
          type: 'regaddress',                     // the action to be linked
          requirement: newPerm,                   // the name of the custom permission (created by updateauth)
          max_fee: config.maxFee
        }
      });
      //console.log('Result: ', result);
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  });

  it(`Call regaddress ${count} times using user1 info, ${newPerm} permission, and user2 private key`, async () => {
    for (i = 0; i < count; i++) {
      try {
        const mnemonic = `${randStr(6)} ${randStr(6)} ${randStr(6)} ${randStr(6)} ${randStr(6)} ${randStr(6)} ${randStr(6)} ${randStr(6)} ${randStr(6)} ${randStr(6)} ${randStr(6)} ${randStr(6)}`
        const keyRes = await FIOSDK.createPrivateKeyMnemonic(mnemonic);
        const privateKey = keyRes.fioKey;
        const publicKey = FIOSDK.derivedPublicKey(privateKey).publicKey;
        newAddress = generateFioAddress(user1.domain, 7);
        const result = await callFioApiSigned('push_transaction', {
          action: 'regaddress',
          account: 'fio.address',
          actor: user1.account,
          privKey: user2.privateKey,
          data: {
            fio_address: newAddress,
            owner_fio_public_key: publicKey,
            max_fee: config.maxFee,
            tpid: '',
            actor: user1.account
          }
        }, newPerm);
        //console.log(JSON.stringify(result, null, 4));
        expect(result.processed.receipt.status).to.equal('executed');

        timeout(1000);

        // confirm new address
        const json = {
          "fio_public_key": publicKey
        }
        const addresses = await callFioApi("get_fio_addresses", json);
        //console.log('get_fio_addresses', result);
        expect(addresses.fio_addresses[0].fio_address).to.equal(newAddress);

      } catch (err) {
          console.log('Error: ', err);
          expect(err).to.equal(null);
      };
    };
  });

});

describe(`D. (SDK generic action - push_transaction) Create custom perm for regaddress to enable secondary account to register addresses on private domain of primary account `, () => {

  let user1, user2;
  const newPerm = "regmyadd";

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  });

  it(`Create regmyadd permission on user1 active account and link it to user2 'active' account`, async () => {
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
          permission: newPerm,
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

  it(`user1 links ${newPerm} permission to regaddress`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'linkauth',
        account: 'eosio',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          account: user1.account,                 // the owner of the permission to be linked, this account will sign the transaction
          code: 'fio.address',                    // the contract owner of the action to be linked
          type: 'regaddress',                     // the action to be linked
          requirement: newPerm,                   // the name of the custom permission (created by updateauth)
          max_fee: config.maxFee
        }
      });
      //console.log('Result: ', result);
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  });

  it.skip(`(TODO: Update afte DASH-268 is completed = support for authPermission) user 2 calls regaddress using user1 actor, ${newPerm} permission, and user2 private key`, async () => {
    try {
      const mnemonic = `${randStr(6)} ${randStr(6)} ${randStr(6)} ${randStr(6)} ${randStr(6)} ${randStr(6)} ${randStr(6)} ${randStr(6)} ${randStr(6)} ${randStr(6)} ${randStr(6)} ${randStr(6)}`
      const keyRes = await FIOSDK.createPrivateKeyMnemonic(mnemonic);
      const privateKey = keyRes.fioKey;
      const publicKey = FIOSDK.derivedPublicKey(privateKey).publicKey;
      newAddress = generateFioAddress(user1.domain, 7);

      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        authPermission: newPerm,
        data: {
          fio_address: newAddress,
          owner_fio_public_key: publicKey,
          max_fee: config.maxFee,
          tpid: '',
          actor: user1.account
        }
      })

      //console.log(JSON.stringify(result, null, 4));
      expect(result.status).to.equal('OK');

      timeout(1000);

      // confirm new address
      const json = {
        "fio_public_key": publicKey
      }
      const addresses = await callFioApi("get_fio_addresses", json);
      //console.log('get_fio_addresses', addresses);
      expect(addresses.fio_addresses[0].fio_address).to.equal(newAddress);

    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    };
  });

});