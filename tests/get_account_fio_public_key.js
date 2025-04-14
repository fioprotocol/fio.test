require('mocha')
const {expect} = require('chai')
const {
  callFioApi, 
  newUser, 
  timeout,
  fetchJson,
} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {getRamForUser} = require("../utils");
let faucet;

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

describe('************************** get_account_fio_public_key.js ************************** \n      A. (Positive) Testing get_account_fio_public_key', () => {
  let user1, actionCount

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
  });

  it(`Wait a few seconds.`, async () => { await timeout(2000) });

  it(`(success) Send user1 account. Expect success`, async () => {
    try {
      const json = {
        account: user1.account
      }
      result = await callFioApi("get_account_fio_public_key", json);
      //console.log('Result: ', result);
      expect(result.fio_public_key).to.equal(user1.publicKey);
    } catch (err) {
      expect(err).to.equal(null);
    }
  })
})

describe('B. (Negative) Testing get_account_fio_public_key', () => {
  let user1, actionCount

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
  })

  it(`(failure) Invalid account. Expect 400 'Invalid FIO Account format'`, async () => {
    try {
      const json = {
        account: "purse@alice"
      }
      result = await callFioApi("get_account_fio_public_key", json);
      expect(actionList.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err);
      expect(err.error.fields[0].error).to.equal('Invalid FIO Account format');
      expect(err.statusCode).to.equal(400);
    }
  })

  it(`(failure) Account not found. Expect 404 'Account not found'`, async () => {
    try {
      const json = {
        account: "testtesttes"
      }
      result = await callFioApi("get_account_fio_public_key", json);
      expect(actionList.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err);
      expect(err.error.message).to.equal('Account not found');
      expect(err.statusCode).to.equal(404);
    }
  })

  it(`(failure) Invalid account = -1. Expect 400 'Invalid FIO Account format'`, async () => {
    try {
      const json = {
        account: -1
      }
      result = await callFioApi("get_account_fio_public_key", json);
      expect(actionList.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err);
      expect(err.error.fields[0].error).to.equal('Invalid FIO Account format');
      expect(err.statusCode).to.equal(400);
    }
  })

})