require('mocha')
const {expect} = require('chai')
const {newUser, generateFioAddress, callFioApi, timeout, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

describe('************************** producer.js ************************** \n    A. Test register/unregister as a producer.', () => {

  let prodA1, userA1, total_voted_fio, total_bp_votes

  it(`Create users`, async () => {
    prodA1 = await newUser(faucet);
    userA1 = await newUser(faucet);
    userA1.address2 = generateFioAddress(userA1.domain, 5)
  })

  it(`Register userA1 address #2`, async () => {
    const result = await userA1.sdk.genericAction('registerFioAddress', {
      fioAddress: userA1.address2,
      maxFee: config.api.register_fio_address.fee,
      walletFioAddress: ''
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  });

  it(`Confirm prodA1 is not a registered producer`, async function () {
    try {
      const json = {
        "code": "eosio",
        "scope": "eosio",
        "table": "producers",
        "lower_bound": prodA1.account,
        "upper_bound": prodA1.account,
        "key_type": "name",
        "index_position": "4",
        "json": true
      }
      const result = await callFioApi("get_table_rows", json);
      //console.log('result: ', result);
      expect(result.rows.length).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Register prodA1 as producer`, async () => {
    try {
      const result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          actor: prodA1.account,
          max_fee: config.api.register_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) });

  it(`Confirm prodA1 is registered as producer`, async function () {
    try {
      const json = {
        "code": "eosio",
        "scope": "eosio",
        "table": "producers",
        "lower_bound": prodA1.account,
        "upper_bound": prodA1.account,
        "key_type": "name",
        "index_position": "4",
        "json": true
      }
      const result = await callFioApi("get_table_rows", json);
      //console.log('result: ', result);
      expect(result.rows.length).to.equal(1);
      expect(result.rows[0].owner).to.equal(prodA1.account);
      expect(result.rows[0].producer_public_key).to.equal(prodA1.publicKey);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`userA1 votes for prodA1 using address #1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: userA1.address,
          actor: userA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`userA1 votes for prodA1 using address #2`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: userA1.address2,
          actor: userA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Unregister prodA1 as producer`, async () => {
    try {
      const result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'unregprod',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          max_fee: config.api.unregister_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  });

  /**
   * Note that unregproducer changes the producer key to a "default" key. 
   * See BD-4083 for more information.
   */
  it(`Confirm prodA1 is not a registered producer`, async function () {
    try {
      const json = {
        "code": "eosio",
        "scope": "eosio",
        "table": "producers",
        "lower_bound": prodA1.account,
        "upper_bound": prodA1.account,
        "key_type": "name",
        "index_position": "4",
        "json": true
      }
      const result = await callFioApi("get_table_rows", json);
      //console.log('result: ', result);
      expect(result.rows.length).to.equal(1);
      expect(result.rows[0].owner).to.equal(prodA1.account);
      expect(result.rows[0].is_active).to.equal(0);
      expect(result.rows[0].producer_public_key).to.equal('FIO1111111111111111111111111111111114T1Anm');
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

})

describe('B. regproducer with pub key not associated with account (BD-3521)', () => {
  let user1, user2;

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  });

  it(`Confirm user1 is not a registered producer`, async function () {
    try {
      const json = {
        "code": "eosio",
        "scope": "eosio",
        "table": "producers",
        "lower_bound": user1.account,
        "upper_bound": user1.account,
        "key_type": "name",
        "index_position": "4",
        "json": true
      }
      const result = await callFioApi("get_table_rows", json);
      //console.log('result: ', result);
      expect(result.rows.length).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Register user1 as producer using user2 public key`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user1.address,
          fio_pub_key: user2.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          actor: user1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal('null');
    }
  });

  it(`Confirm user1 is registered as producer`, async function () {
    try {
      const json = {
        "code": "eosio",
        "scope": "eosio",
        "table": "producers",
        "lower_bound": user1.account,
        "upper_bound": user1.account,
        "key_type": "name",
        "index_position": "4",
        "json": true
      }
      const result = await callFioApi("get_table_rows", json);
      //console.log('result: ', result);
      expect(result.rows.length).to.equal(1);
      expect(result.rows[0].owner).to.equal(user1.account);
      expect(result.rows[0].producer_public_key).to.equal(user2.publicKey);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Unregister user1 as producer (cleanup)`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'unregprod',
        account: 'eosio',
        data: {
          fio_address: user1.address,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  });

  it(`Confirm user1 is unregistered`, async function () {
    try {
      const json = {
        "code": "eosio",
        "scope": "eosio",
        "table": "producers",
        "lower_bound": user1.account,
        "upper_bound": user1.account,
        "key_type": "name",
        "index_position": "4",
        "json": true
      }
      const result = await callFioApi("get_table_rows", json);
      //console.log('result: ', result);
      expect(result.rows.length).to.equal(1);
      expect(result.rows[0].owner).to.equal(user1.account);
      expect(result.rows[0].is_active).to.equal(0);
      expect(result.rows[0].producer_public_key).to.equal('FIO1111111111111111111111111111111114T1Anm');
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

});
