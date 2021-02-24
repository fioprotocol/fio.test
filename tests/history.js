/*
 Tests for FIO History node.
*/

require('mocha')
const {expect} = require('chai')
const {callFioHistoryApi, callFioApi, callFioApiSigned, unlockWallet, runClio, newUser, existingUser, generateFioDomain, generateFioAddress, createKeypair, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)

  //const result = await unlockWallet('fio');
})

describe('************************** history.js ************************** \n A. get_transfers to existing account', () => {
  let userA1, userA2

  it(`Create users`, async () => {
    userA1 = await newUser(faucet);

    console.log('userA1 Account: ', userA1.account)
    console.log('userA1 Public: ', userA1.publicKey)
    console.log('userA1 Private: ', userA1.privateKey)
    console.log('userA1 Private: ', userA1.domain)
    console.log('userA1 Private: ', userA1.address)
  })

  it(`Transfer tokens to existing account userA1`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 123,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        walletFioAddress: ''
      })
      //console.log('Result: ', result)
      expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`get_transfers all`, async () => {
    const json = {
      "fio_public_key": userA1.publicKey
    }
    result = await callFioHistoryApi("get_transfers", json);
    //console.log('Result: ', result)
    expect(result.transfers.length).to.be.greaterThan(0)
  })

  it(`get_transfers pos 1 offset 2`, async () => {
    const json = {
      "fio_public_key": userA1.publicKey,
      "pos": -1,
      "offset": -10
    }
    result = await callFioHistoryApi("get_transfers", json);
    //console.log('Result: ', result.transfers)
  })

})

describe.only('B. get_transfers to non-existent account', () => {

  let user1, user2
  let transferAmount = 33000000000

  it(`Create users`, async () => {
    let keys = await createKeypair();
    user1 = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson)
    user1.domain = generateFioDomain(8)
    user1.address = generateFioAddress(user1.domain, 8)

    console.log('userB1 Account: ', user1.account)
    console.log('userB1 Public: ', user1.publicKey)
    console.log('userB1 Private: ', user1.privateKey)

    user2 = await newUser(faucet);
  })

  it(`Transfer 2000000000000 sufs to non-existent account user1`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: user1.publicKey,
        amount: 2000000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        walletFioAddress: ''
      })
      //console.log('Result: ', result)
      expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it('Confirm single, initial trnsfiopubky transfer', async () => {
    try {
      const json = {
        "fio_public_key": user1.publicKey,
        "pos": 0,
        "offset": 100
      }
      result = await callFioHistoryApi("get_transfers", json);
      console.log('Result: ', result)
      expect(result.transfers.length).to.equal(1);   // Should have the initial transfer as a result.
      expect(result.transfers[0].action).to.equal('trnsfiopubky');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })
/*
  it(`Send ${transferAmount} sufs from userB1 to userB2`, async () => {
    try {
      const result = await userB1.genericAction('transferTokens', {
        payeeFioPublicKey: userB2.publicKey,
        amount: transferAmount,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        walletFioAddress: ''
      })
      //console.log('Result: ', result)
      expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Confirm there are three transfers (one for transfer and one for fee) and the second is transfer with transfer_amount= ${transferAmount}`, async () => {
    try {
      const json = {
        "fio_public_key": userB1.publicKey,
        "pos": 0,
        "offset": 100
      }
      result = await callFioHistoryApi("get_transfers", json);
      //console.log('Result: ', result)
      expect(result.transfers.length).to.equal(3);
      expect(result.transfers[1].action).to.equal('trnsfiopubky');
      expect(result.transfers[1].transfer_amount).to.equal(transferAmount);
      expect(result.transfers[2].action).to.equal('transfer');
      expect(result.transfers[2].fee_amount).to.equal(2000000000);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it('userB1 registerFioDomain', async () => {
    try {
      const result = await userB1.genericAction('registerFioDomain', {
        fioDomain: userB1.domain,
        maxFee: config.api.register_fio_domain.fee,
        walletFioAddress: ''
      })
      //console.log('Result', result)
      expect(result).to.have.all.keys('status', 'expiration', 'fee_collected')
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal(null);
    }
  })

  it(`Confirm there are four transfers and the fourth is transfer is a ${config.api.register_fio_domain.fee} fee for domain registration`, async () => {
    try {
      const json = {
        "fio_public_key": userB1.publicKey,
        "pos": 0,
        "offset": 100
      }
      result = await callFioHistoryApi("get_transfers", json);
      //console.log('Result: ', result)
      expect(result.transfers.length).to.equal(4);
      expect(result.transfers[3].action).to.equal('transfer');
      expect(result.transfers[3].fee_amount).to.equal(config.api.register_fio_domain.fee);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it('userB1 registerFioAddress', async () => {
    const result = await userB1.genericAction('registerFioAddress', {
      fioAddress: userB1.address,
      maxFee: config.api.register_fio_address.fee,
      walletFioAddress: ''
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`Confirm there are five transfers and the fifth is a ${config.api.register_fio_address.fee} fee for address registration`, async () => {
    try {
      const json = {
        "fio_public_key": userB1.publicKey,
        "pos": 0,
        "offset": 100
      }
      result = await callFioHistoryApi("get_transfers", json);
      //console.log('Result: ', result)
      expect(result.transfers.length).to.equal(5);
      expect(result.transfers[4].action).to.equal('transfer');
      expect(result.transfers[4].fee_amount).to.equal(config.api.register_fio_address.fee);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })
*/

})

describe('C. updateauth using key with no associated account', () => {
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