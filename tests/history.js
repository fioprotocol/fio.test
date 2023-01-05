/**
 * Tests for FIO History node.
 *
 * You need both a TESTURL and a HISTORYURL for this test.
 * Enter the URL of the history node in: config.js > HISTORYURL
 */

require('mocha')
const {expect} = require('chai')
const {callFioHistoryApi, callFioApi, callFioApiSigned, unlockWallet, runClio, newUser, existingUser, generateFioDomain, generateFioAddress, createKeypair, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {getRamForUser} = require("../utils");
let faucet;

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)

  //const result = await unlockWallet('fio');
})

describe('************************** history.js ************************** \n A. trnsfiopubky to existing account', () => {
  let user1, actionCount

  it(`Create users`, async () => {
    user1 = await newUser(faucet);

    //console.log('user1 Account: ', user1.account)
    //console.log('user1 Public: ', user1.publicKey)
    //console.log('user1 Private: ', user1.privateKey)
  })

  it(`get_actions for user1`, async () => {
    const json = {
      "account_name": user1.account
    }
    result = await callFioHistoryApi("get_actions", json);
    //console.log('Result: ', result)
    actionCount = result.actions.length
    expect(actionCount).to.equal(7)  // All of the setup actions for the account
  })

  it(`Transfer tokens to existing account userA1`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: user1.publicKey,
        amount: 123,
        maxFee: config.maxFee,
        walletFioAddress: ''
      })
      //console.log('Result: ', result)
      expect(result).to.have.any.keys('status');
      expect(result).to.have.any.keys('fee_collected');
      expect(result).to.have.any.keys('block_num');
      expect(result).to.have.any.keys('transaction_id');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`get_actions for user1. Expect 3 additional actions`, async () => {
    let prevActionCount = actionCount;
    const json = {
      "account_name": user1.account
    }
    result = await callFioHistoryApi("get_actions", json);
    //console.log('Result: ', result)
    actionCount = result.actions.length
    expect(actionCount).to.equal(prevActionCount + 3) // Transfer to user1, fee, and foundation
  })


})

describe('B. trnsfiopubky to existing account', () => {

  let user1, actionCount, transactionID;
  let transferAmount = 33000000000;

  it(`Create users`, async () => {
    let keys = await createKeypair();
    user1 = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson)
    user1.account = FIOSDK.accountHash(user1.publicKey).accountnm;

    console.log('user1 Account: ', user1.account)
    console.log('user1 Public: ', user1.publicKey)
    //console.log('user1 Private: ', user1.privateKey)
  });

  it(`get_actions for user1. Expect empty array.`, async () => {
    const json = {
      "account_name": user1.account
    };
    result = await callFioHistoryApi("get_actions", json);
    //console.log('Result: ', result);
    actionCount = result.actions.length;
    expect(actionCount).to.equal(0);
  });

  it(`Transfer tokens to non-existant account user1`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: user1.publicKey,
        amount: transferAmount,
        maxFee: config.maxFee,
        walletFioAddress: ''
      })
      //console.log('Result: ', result);
      expect(result).to.have.any.keys('status');
      expect(result).to.have.any.keys('fee_collected');
      expect(result).to.have.any.keys('block_num');
      expect(result).to.have.any.keys('transaction_id');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  });

  it(`get_actions for user1. Expect 3 additional actions`, async () => {
    let prevActionCount = actionCount;
    const json = {
      "account_name": user1.account
    }
    result = await callFioHistoryApi("get_actions", json);
    //console.log('Result: ', result);

    // Grab the trx ID
    transactionID = result.actions[0].action_trace.trx_id;

    actionCount = result.actions.length
    expect(actionCount).to.equal(prevActionCount + 3) // Transfer to user1, fee, and foundation
  });

  it(`Look up transaction`, async () => {
    const json = {
      "id": transactionID
    }
    result = await callFioHistoryApi("get_transaction", json);
    //console.log('Result: ', result);
    //console.log('Result Traces: ', result.traces);
    expect(result.traces.length).to.equal(14);
  });

})

describe('C. trnsloctoks - confirm transactions available from history', () => {

  let user1, actionCount, transactionID;

  it(`Create users`, async () => {
    let keys = await createKeypair();
    user1 = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson)
    user1.account = FIOSDK.accountHash(user1.publicKey).accountnm;

    //console.log('user1 Account: ', user1.account)
    //console.log('user1 Public: ', user1.publicKey)
    //console.log('user1 Private: ', user1.privateKey)
  });

  it(`get_actions for user1. Expect empty array.`, async () => {
    try {
      const json = {
        "account_name": user1.account
      }
      result = await callFioHistoryApi("get_actions", json);
      //console.log('Result: ', result);
      actionCount = result.actions.length;
      expect(actionCount).to.equal(0);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  });

  it(`trnsloctoks from faucet to non-existant account user1`, async () => {
    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: user1.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 60,
              amount: 1000000000
            },
            {
              duration: 6000,
              amount: 2000000000
            },
            {
              duration: 60000,
              amount: 3000000000
            }
          ],
          amount: 6000000000,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  });

  it(`get_actions for user1. Expect 3 additional actions`, async () => {
    try {
      let prevActionCount = actionCount;
      const json = {
        "account_name": user1.account
      }
      result = await callFioHistoryApi("get_actions", json);
      //console.log('Result: ', result);

      // Grab the trx ID
      transactionID = result.actions[0].action_trace.trx_id;

      actionCount = result.actions.length;
      expect(actionCount).to.equal(prevActionCount + 3) // Transfer to user1, fee, and foundation
      // action[0] has the trnsloctoks action from the sending account
      expect(result.actions[0].action_trace.act.name).to.equal('trnsloctoks');
      expect(result.actions[1].action_trace.act.authorization.actor).to.equal(faucet.account);
      // action[1] has the new account creation for the receiving user1 account
      expect(result.actions[1].action_trace.act.name).to.equal('newaccount');
      expect(result.actions[1].action_trace.act.data.name).to.equal(user1.account);
      // action[2] is the fee collection
      expect(result.actions[2].action_trace.receipt.response).to.contain('fee_collected');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  });

  it(`Confirm transaction shows up in get_transaction`, async () => {
    const json = {
      "id": transactionID
    }
    result = await callFioHistoryApi("get_transaction", json);
    //console.log('Result: ', result);
    //console.log('Result Traces: ', result.traces);
    expect(result.traces.length).to.equal(16);
  });

})

describe.skip('D. Need to complete. updateauth using key with no associated account', () => {
  let userMain, userAuth1, userAuth2

  it(`Create users and import private keys`, async () => {
    userMain = await newUser(faucet);
    user1 = await newUser(faucet);

    //User with no existing account
    keys2 = await createKeypair();

    //user2 = await existingUser(account2, keys2.privateKey, keys2.publicKey, '', '');
    user2 = new FIOSDK(keys2.privateKey, keys2.publicKey, config.BASE_URL, fetchJson)
    user2.account = FIOSDK.accountHash(user2.publicKey).accountnm;
    //user2 = await newUser(faucet);
    console.log('user2: ', user2.account)

    //Alphabetical sort by account name for updateauth
    if (user1.account < user2.account) {
      userAuth1 = user1;
      userAuth2 = user2;
    } else {
      userAuth1 = user2;
      userAuth2 = user1;
    }
    console.log('userAuth1: ', userAuth1.account)
    console.log('userAuth2: ', userAuth2.account)

  })

  it(`Show permissions userMain`, async () => {
    try {
        const json = {
            "account_name": userMain.account
        }
        result = await callFioApi("get_account", json);
        console.log('Result.permissions: ', result.permissions);
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
  })

  // Reminder that the accounts under auth need to be in alphabetical order
  it(`Updateauth for userMain: threshold = 2, account1 = userAuth1, account2 = userAuth2`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'updateauth',
        account: 'eosio',
        actor: userMain.account,
        privKey: userMain.privateKey,
        data: {
          "account": userMain.account,
          "permission": "active",
          "parent": "owner",
          "auth": {
            "threshold": 2,
            "keys": [],
            "waits": [],
            "accounts": [
              {
                "permission": {
                  "actor": userAuth1.account,
                  "permission": "active"
                },
                "weight":1
              },
              {
                "permission": {
                  "actor": userAuth2.account,
                  "permission": "active"
                },
                "weight":1
              }
            ]
          },
          "max_fee": config.maxFee
        }
      })
      //console.log('Result: ', result)
      //console.log('Result: ', result.error.details)
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
    }
  })

  it(`Show permissions userMain`, async () => {
    try {
        const json = {
            "account_name": userMain.account
        }
        result = await callFioApi("get_account", json);
        console.log('Result.permissions: ', result.permissions[0].required_auth);
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
  })

})

describe(`E. domain and address registration (regdomain, regaddress, regdomadd) confirm domain and address registration txs are available from history`, () => {

  let user1, user2, bp, regDomAddObj, preRegBal, npreRegBal, postRegBal, npostRegBal, regFeeCharged, preRegRAM, npreRegRAM, postRegRAM, npostRegRAM, domainRows, fionameRows, blockTime, expDateObj;
  let domain1 = generateFioDomain(5);
  let domain2 = generateFioDomain(10);
  let address1 = generateFioAddress(domain1, 5);
  let address2 = generateFioAddress(domain2, 9);

  before(async function () {
    bp = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    preRegBal = await user1.sdk.genericAction('getFioBalance', {});
    expect(preRegBal.available).to.equal(2160000000000);
    expect(preRegBal.balance).to.equal(2160000000000);
    preRegRAM = await getRamForUser(user1);
  });

  it(`regdomain:`, async () => {
    let newDomain = await callFioApiSigned('push_transaction', {
      action: 'regdomain',
      account: 'fio.address',
      actor: user1.account,
      privKey: user1.privateKey,
      data: {
        fio_domain: domain1,
        owner_fio_public_key: user1.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user1.account
      }
    });
    expect(newDomain).to.have.all.keys('transaction_id', 'processed');
    expect(newDomain.processed.receipt.status).to.equal('executed');
  })

  it(`- get_actions for user1, expect domain registry to be in array`, async () => {
    let historyArr = await callFioHistoryApi("get_actions", {
      "account_name": user1.account
    });
    let actionCount = historyArr.actions.length;
    expect(actionCount).to.equal(9);
    expect(historyArr.actions[7].action_trace.receiver).to.equal('fio.address');
    expect(historyArr.actions[7].action_trace.act.account).to.equal('fio.address');
    expect(historyArr.actions[7].action_trace.act.name).to.equal('regdomain');
    expect(historyArr.actions[7].action_trace.act.data.fio_domain).to.equal(domain1);
    expect(historyArr.actions[7].action_trace.act.data.owner_fio_public_key).to.equal(user1.publicKey);
  });

  it(`regaddress:`, async () => {
    let newAddress = await callFioApiSigned('push_transaction', {
      action: 'regaddress',
      account: 'fio.address',
      actor: user1.account,
      privKey: user1.privateKey,
      data: {
        fio_address: address1,
        owner_fio_public_key: user1.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user1.account
      }
    });
    expect(newAddress).to.have.all.keys('transaction_id', 'processed');
    expect(newAddress.processed.receipt.status).to.equal('executed');
  })

  it(`- get_actions for user1, expect address registry to be in array`, async () => {
    let historyArr = await callFioHistoryApi("get_actions", {
      "account_name": user1.account
    });
    let actionCount = historyArr.actions.length;
    expect(actionCount).to.equal(11);
    expect(historyArr.actions[9].action_trace.receiver).to.equal('fio.address');
    expect(historyArr.actions[9].action_trace.act.account).to.equal('fio.address');
    expect(historyArr.actions[9].action_trace.act.name).to.equal('regaddress');
    expect(historyArr.actions[9].action_trace.act.data.fio_address).to.equal(address1);
    expect(historyArr.actions[9].action_trace.act.data.owner_fio_public_key).to.equal(user1.publicKey);
  });

  it(`regdomadd:`, async () => {
    regDomAddObj = await callFioApiSigned('push_transaction', {
      action: 'regdomadd',
      account: 'fio.address',
      actor: user2.account,
      privKey: user2.privateKey,
      data: {
        fio_address: address2,
        is_public: 1,
        owner_fio_public_key: user2.publicKey,
        max_fee: config.maxFee,
        tpid: bp.address,
        actor: user2.account
      }
    });
    expect(regDomAddObj).to.have.all.keys('transaction_id', 'processed');
    expect(regDomAddObj.processed.receipt.status).to.equal('executed');
    expect(regDomAddObj.processed.action_traces[0].receipt.response).to.contain('"status": "OK"').and.contain('"fee_collected":800000000000').and.contain('"expiration":');
    expect(regDomAddObj.processed.action_traces[0].act.data.fio_address).to.equal(address2);
    expect(regDomAddObj.processed.action_traces[0].act.data.is_public).to.equal(1);
    expect(regDomAddObj.processed.action_traces[0].act.data.owner_fio_public_key).to.equal(user2.publicKey);
  });

  it(`- get_actions for user2, expect domain and address registries to be in array`, async () => {
    let historyArr = await callFioHistoryApi("get_actions", {
      "account_name": user2.account
    });
    let actionCount = historyArr.actions.length;
    expect(actionCount).to.equal(9);
    expect(historyArr.actions[7].action_trace.receiver).to.equal('fio.address');
    expect(historyArr.actions[7].action_trace.act.account).to.equal('fio.address');
    expect(historyArr.actions[7].action_trace.act.name).to.equal('regdomadd');
    expect(historyArr.actions[7].action_trace.act.data.fio_address).to.equal(address2);
    expect(historyArr.actions[7].action_trace.act.data.actor).to.equal(user2.account);
    expect(historyArr.actions[7].action_trace.act.data.owner_fio_public_key).to.equal(user2.publicKey);
  });
})
