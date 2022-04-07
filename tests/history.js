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
      expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
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
      expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected');
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

    expect(result.traces.length).to.equal(13);

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

    expect(result.traces.length).to.equal(14);

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