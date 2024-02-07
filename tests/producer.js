require('mocha')
const {expect} = require('chai')
const {
  newUser, 
  generateFioAddress, 
  callFioApi, 
  callFioApiSigned,
  getAccountVoteWeight,
  getProdVoteTotal,
  timeout, 
  fetchJson
} = require('../utils.js');
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
      expect(result.rows[0].is_active).to.equal(1);
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
      expect(result.rows[0].is_active).to.equal(1);
      expect(result.rows[0].producer_public_key).to.equal(prodA1.publicKey);
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

describe('C. FIP47 Update Regproducer', () => {
  let user1, user2, prodkey;
  const url = "https://user1site.io/";
  const url2 = "https://user1sitechanged.io/";

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    user1.address2 = generateFioAddress(user1.domain, 5);
    user2 = await newUser(faucet);
    prodkey = await newUser(faucet);
  });

  it(`Wait a few seconds.`, async () => { await timeout(2000) });

  it(`Register user1 as producer`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user1.address,
          fio_pub_key: user1.publicKey,
          url: url,
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

  it(`(Success) Update user1 producer info url to url2`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user1.address,
          fio_pub_key: user1.publicKey,
          url: url2,
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

  it(`Confirm user1 url changed`, async function () {
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
      expect(result.rows[0].url).to.equal(url2);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`(Success) Update user1 producer info location`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user1.address,
          fio_pub_key: user1.publicKey,
          url: url2,
          location: 20,
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

  it(`Confirm user1 location changed`, async function () {
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
      expect(result.rows[0].location).to.equal(20);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`(Success) Update user1 producer public key`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user1.address,
          fio_pub_key: prodkey.publicKey,
          url: url2,
          location: 20,
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

  it(`Confirm user1 producer public key changed`, async function () {
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
      expect(result.rows[0].producer_public_key).to.equal(prodkey.publicKey);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Wait a few seconds.`, async () => { await timeout(3000) });

  it(`Register user1 address #2`, async () => {
    try {
      const result = await user1.sdk.genericAction('registerFioAddress', {
        fioAddress: user1.address2,
        maxFee: config.maxFee,
        walletFioAddress: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log(JSON.stringify(err, null, 4));
      expect(err).to.equal('null');
    }
  });

  it(`(Success) Update user1 producer FIO Address`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user1.address2, 
          fio_pub_key: prodkey.publicKey,
          url: url2,
          location: 20,
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

  it(`Confirm new fio address for user1 producer was registered`, async function () {
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
      expect(result.rows[0].fio_address).to.equal(user1.address2);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Wait a few seconds.`, async () => { await timeout(3000) });

  it(`Update regproducer to change everything back`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user1.address,
          fio_pub_key: user1.publicKey,
          url: url,
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

  it(`Confirm the rollback`, async function () {
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
      expect(result.rows[0].fio_address).to.equal(user1.address);
      expect(result.rows[0].location).to.equal(80);
      expect(result.rows[0].url).to.equal(url);
      expect(result.rows[0].producer_public_key).to.equal(user1.publicKey);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Attempt to update the FIO Handle to one not owned by the signer`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user2.address,
          fio_pub_key: user1.publicKey,
          url: url,
          location: 80,
          actor: user1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.code).to.equal(403);
      expect(err.json.message).to.equal('Request signature is not valid or this user is not allowed to sign this transaction.');
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
      console.log(JSON.stringify(err, null, 4));
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

describe('D. FIP47 Confirm voting after updating producer key', () => {
  let user1, user2, prodkey, total_bp_votes;
  const url = "https://user1site.io/";

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    user1.address2 = generateFioAddress(user1.domain, 5);
    user2 = await newUser(faucet);
    prodkey = await newUser(faucet);
  });

  it(`Wait a few seconds.`, async () => { await timeout(2000) });

  it(`Register user1 as producer`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user1.address,
          fio_pub_key: user1.publicKey,
          url: url,
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

  it(`Get votes for user1 producer `, async () => {
    try {
      total_bp_votes = await getProdVoteTotal(user1.address);
      //console.log(`${user1.address} total_votes: ${total_bp_votes}`)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`user2 votes for user1 producer`, async () => {
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            user1.address
          ],
          fio_address: user2.address,
          actor: user2.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  });

  it(`Get user account vote weight`, async () => {
    try {
      user2.last_vote_weight = await getAccountVoteWeight(user2.account);
      //console.log('proxyA1.last_vote_weight: ', user2.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Get last_vote_weight for user1 producer`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal(user1.address);
      //console.log(`${user1.address} total_votes: ${total_bp_votes}`)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + user2.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  });

  it(`(Success) Update user1 producer public key`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user1.address,
          fio_pub_key: prodkey.publicKey,
          url: url,
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

  it(`Confirm user1 producer public key changed`, async function () {
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
      expect(result.rows[0].producer_public_key).to.equal(prodkey.publicKey);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Register user1 address #2`, async () => {
    try {
      const result = await user1.sdk.genericAction('registerFioAddress', {
        fioAddress: user1.address2,
        maxFee: config.maxFee,
        walletFioAddress: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log(JSON.stringify(err, null, 4));
      expect(err).to.equal('null');
    }
  });

  it(`(Success) Update user1 producer FIO Address`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user1.address2, 
          fio_pub_key: prodkey.publicKey,
          url: url,
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

  it(`Confirm new fio address for user1 producer was registered`, async function () {
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
      expect(result.rows[0].fio_address).to.equal(user1.address2);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Get last_vote_weight for user1 producer`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal(user1.address2);
      //console.log(`${user1.address} total_votes: ${total_bp_votes}`);
      expect(total_bp_votes).to.equal(prev_total_bp_votes);
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
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

describe('E. FIP47 Update Regproducer - Sad Path', () => {
  let user1, user2, prodkey;
  const url = "https://user1site.io/";
  const url2 = "https://user1sitechanged.io/";

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    user1.address2 = generateFioAddress(user1.domain, 5)
    user2 = await newUser(faucet);
    prodkey = await newUser(faucet);
  });

  it(`Wait a few seconds...`, async () => { await timeout(2000) });

  it(`Register user1 as producer`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user1.address,
          fio_pub_key: user1.publicKey,
          url: url,
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

  it(`Wait a few seconds to avoid duplicate transaction error.`, async () => { await timeout(3000) });

  it(`(Failure) Try to update with same fields. Expect: ${config.error2.prodAlreadyRegistered.statusCode} ${config.error2.prodAlreadyRegistered.message}`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user1.address,
          fio_pub_key: user1.publicKey,
          url: url,
          location: 80,
          actor: user1.account,
          max_fee: config.maxFee
        }
      })
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log(JSON.stringify(err, null, 4));
      expect(err.json.fields[0].error).to.equal(config.error2.prodAlreadyRegistered.message);
      expect(err.code).to.equal(config.error2.prodAlreadyRegistered.statusCode);
    }
  });

  it(`(Failure) Try to update actor. Expect: ${config.error2.invalidSignature.statusCode} ${config.error2.invalidSignature.message}`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user1.address,
          fio_pub_key: user1.publicKey,
          url: url,
          location: 80,
          actor: user2.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log(JSON.stringify(err, null, 4));
      expect(err.json.message).to.equal(config.error2.invalidSignature.message);
      expect(err.code).to.equal(config.error2.invalidSignature.statusCode);
    }
  });

  it(`(Failure) Update with invalid fio_address. Expect: ${config.error2.fioAddressNotRegistered.statusCode} ${config.error2.fioAddressNotRegistered.message}`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: 'invalidaddress',
          fio_pub_key: user1.publicKey,
          url: url,
          location: 80,
          actor: user1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log(JSON.stringify(err, null, 4));
      expect(err.json.fields[0].error).to.equal(config.error2.fioAddressNotRegistered.message);
      expect(err.code).to.equal(config.error2.fioAddressNotRegistered.statusCode);
    }
  });

  it(`(Failure) Update with invalid fio_pub_key. Expect: ${config.error2.invalidKey.statusCode} ${config.error2.invalidKey.message}`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user1.address,
          fio_pub_key: 'invalidkey',
          url: url,
          location: 80,
          actor: user1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log(JSON.stringify(err, null, 4));
      expect(err.json.fields[0].error).to.equal(config.error2.invalidKey.message);
      expect(err.code).to.equal(config.error2.invalidKey.statusCode);
    }
  });

  it('(Failure) Update with invalid location. Expect error', async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regproducer',
        account: 'eosio',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          fio_address: user1.address,
          fio_pub_key: user1.publicKey,
          url: url,
          location: 'invalidlocation',
          actor: user1.account,
          max_fee: config.maxFee
        }
      })
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error: ', err);
      expect(err).to.not.equal(null);
    }
  })

  it(`(Failure) Update with FIO Address not registered to user1. Expect: ${config.error2.invalidSignature.statusCode} ${config.error2.invalidSignature.message}`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user2.address,
          fio_pub_key: user1.publicKey,
          url: url,
          location: 80,
          actor: user1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log(JSON.stringify(err, null, 4));
      expect(err.json.message).to.equal(config.error2.invalidSignature.message);
      expect(err.code).to.equal(config.error2.invalidSignature.statusCode);
    }
  });

});
