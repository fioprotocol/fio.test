require('mocha')
const {expect} = require('chai')
const {newUser, callFioApi, timeout,fetchJson, createKeypair, generateFioAddress} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
const config = require('../config.js');
const { nextTick } = require('process');
let faucet;

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})


describe(`************************** BD-3853-dev-tests.js ************************** \n    A. Stake from small balance of tokens before and after voteproducer.`, () => {

  let user1, keysStaker, sdkStaker;

  it(`Set up users`, async () => {
    user1 = await newUser(faucet);
    keysStaker = await createKeypair();
    proxy1 = await newUser(faucet);
    proxy1.address2 = generateFioAddress(proxy1.domain, 5);
  })

  it(`Transfer 21 tokens to staking account`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: keysStaker.publicKey,
        amount: 21000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err.json.fields[0].error).to.equal(null)
    }
  })

  it(`Create staker sdk for further tests`, async () => {

    sdkStaker = new FIOSDK(keysStaker.privateKey, keysStaker.publicKey, config.BASE_URL, fetchJson);
    console.log ("keysStaker is ",keysStaker);
  })

  //now voteproducers 18 times

  let maxits = 20;
  for (let numits = 0; numits < maxits; numits++) {
    it(`sdkstaker votes alternating for bp1 then bp2`, async () => {
      try {
        let bpstr = 'bp1@dapixdev';
        if (numits % 2 == 0){
          bpstr = 'bp2@dapixdev';
        }
        console.log("BP string ",bpstr);
        const result = await sdkStaker.genericAction('pushTransaction', {
          action: 'voteproducer',
          account: 'eosio',
          data: {
            "producers": [
              bpstr
            ],
            fio_address: sdkStaker.address,
            actor: sdkStaker.account,
            max_fee: config.maxFee
          }
        })
        console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error: ', err.json)
        expect(err).to.equal('null')
      }
    })

    it(`Waiting 1 seconds`, async () => {
      console.log("            waiting 1 seconds ")
    })
    it(`Wait 1 seconds.`, async () => { await timeout(1000) });

  }

  it(`getFioBalance for sdkstaker`, async () => {
    try {
      const result = await sdkStaker.genericAction('getFioBalance', { })
      console.log('Result: ', result)
    } catch (err) {
      expect(err.json.message).to.equal(null)
    }
  })

  // Next, have the user stake

  it(`sdkstaker stakes 5 FIO )`, async () => {
    try {
      const result = await sdkStaker.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: sdkStaker.address,
          amount: 5000000000,
          actor: sdkStaker.account,
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

  it(`getFioBalance for sdkstaker`, async () => {
    try {
      const result = await sdkStaker.genericAction('getFioBalance', { })
      console.log('Result: ', result)
    } catch (err) {
      expect(err.json.message).to.equal(null)
    }
  })

  it(`sdkstaker un stakes 5 FIO )`, async () => {
    try {
      const result = await sdkStaker.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: sdkStaker.address,
          amount: 5000000000,
          actor: sdkStaker.account,
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

  it(`getFioBalance for sdkstaker`, async () => {
    try {
      const result = await sdkStaker.genericAction('getFioBalance', { })
      console.log('Result: ', result)
    } catch (err) {
      expect(err.json.message).to.equal(null)
    }
  })

  it(`Call get_table_rows from locktokensv2 for sdkstaker`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: keysStaker.account,
        upper_bound: keysStaker.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      result = await callFioApi("get_table_rows", json);
      console.log('Result: ', result);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })



})
