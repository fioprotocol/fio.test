require('mocha')
const {expect} = require('chai')
const {newUser, callFioApi,fetchJson, generateFioAddress} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
const config = require('../config.js');
const { nextTick } = require('process');
let faucet;

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})


describe(`************************** stake-BD-3835-voting.js ************************** \n    A. Stake tokens before and after voteproducer.`, () => {

  let user1, proxy1;

  it(`Set up users`, async () => {
    user1 = await newUser(faucet);
    proxy1 = await newUser(faucet);
    console.log('proxy: ', proxy1.account)
    console.log('user1: ', user1.account)
    proxy1.address2 = generateFioAddress(proxy1.domain, 5);
  })

  // First, set up the proxy

  it.skip(`register second address for proxy1`, async () => {
    try {
      const result = await proxy1.sdk.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        data: {
          fio_address: proxy1.address2,
          owner_fio_public_key: proxy1.publicKey,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Register proxy1 as a proxy using proxy1.address`, async () => {
    try {
      const result = await proxy1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxy1.address,
          actor: proxy1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      //console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it.skip(`proxy1 votes for bp1 and bp2`, async () => {
    try {
      const result = await proxy1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev',
            'bp2@dapixdev'
          ],
          fio_address: proxy1.address,
          actor: proxy1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it('get voter info for proxy1', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        lower_bound: proxy1.account,
        upper_bound: proxy1.account,
        key_type: "name",
        index_position: 3,
      }
      const voterInfo = await callFioApi("get_table_rows", json);
      console.log('voterInfo: ', voterInfo);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  // Next, have the user vote directly for producers

  it(`User1 stakes 100 FIO using address as tpid (the account it is linked to was registered as a proxy using a different FIO Address)`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: user1.address,
          amount: 100000000000,
          actor: user1.account,
          max_fee: config.maxFee,
          tpid: proxy1.address
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err.json);
      expect(err).to.equal(null);
    }
  })
  
  it(`user1 votes for bp1 and bp2`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev',
            'bp2@dapixdev'
          ],
          fio_address: user1.address,
          actor: user1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  // Next, have the user stake

  it(`User1 stakes 100 FIO using address2 as tpid (the account it is linked to was registered as a proxy using a different FIO Address)`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: user1.address,
          amount: 200000000000,
          actor: user1.account,
          max_fee: config.maxFee,
          tpid: proxy1.address
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err.json);
      expect(err).to.equal(null);
    }
  })

  it('[BUG BD-nnnn] get voter info for user1: expect no entry in proxy field', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        lower_bound: user1.account,
        upper_bound: user1.account,
        key_type: "name",
        index_position: 3,
      }
      const voterInfo = await callFioApi("get_table_rows", json);
      console.log('voterInfo: ', voterInfo);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Transfer more FIO to user1. Expect success`, async function () {
    try {
      await faucet.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: user1.publicKey,
          amount: 100000000000,
          max_fee: config.maxFee,
          actor: faucet.account,
          tpid: ''
        }
      });
    } catch (err) {
      console.log("Error : ", err.json.error);
      expect(err).to.equal(null);
    };
  });

})
