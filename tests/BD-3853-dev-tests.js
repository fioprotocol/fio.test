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
    //console.log ("keysStaker is ",keysStaker);
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
        //console.log("BP string ",bpstr);
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
        //console.log('Result: ', result)
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
      //console.log('Result: ', result)
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
      //console.log('Result: ', result)
    } catch (err) {
      expect(err.json.message).to.equal(null)
    }
  })

  it(`ERROR -- sdkstaker un stakes 5 FIO, they dont have fio for the fee )`, async () => {
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
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log("Error : ", err.json);
      expect(err.json.fields[0].error).to.equal("Insufficient funds to cover fee");
    }
  })

  it(`getFioBalance for sdkstaker`, async () => {
    try {
      const result = await sdkStaker.genericAction('getFioBalance', { })
      //console.log('Result: ', result)
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
      //console.log('Result: ', result);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })



})

describe(`B. Reduced tests to show failure on unstake`, () => {

  let keysStaker, sdkStaker, stakerBalance, stakerAvailable, stakerStaked, voteproducerFee;
  const initialFio = 2173765615;
  const stakingFee = 3000000000;
  const unstakingFee = 3000000000;

  it(`Set up users`, async () => {
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
    //console.log ("keysStaker is ",keysStaker);
  })


  // voteproducers 1 time

  let maxits = 1;
  for (let numits = 0; numits < maxits; numits++) {
    it(`sdkstaker votes alternating for bp1 then bp2`, async () => {
      try {
        let bpstr = 'bp1@dapixdev';
        if (numits % 2 == 0){
          bpstr = 'bp2@dapixdev';
        }
        //console.log("BP string ",bpstr);
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
        //console.log('Result: ', result)
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
      stakerBalance = result.balance;
      stakerAvailable = result.available;
      //console.log('Result: ', result)
    } catch (err) {
      expect(err.json.message).to.equal(null)
    }
  })

  // Next, have the user stake (fee = 3 FIO)

  it(`Success: sdkstaker stakes balance - staking fee`, async () => {
    try {
      const result = await sdkStaker.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: sdkStaker.address,
          amount: stakerBalance - stakingFee,
          actor: sdkStaker.account,
          max_fee: config.maxFee,
          tpid: proxy1.address
        }
      })
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err.json);
      expect(err).to.equal(null);
    }
  })

  it(`getFioBalance for sdkstaker`, async () => {
    try {
      const prevStakerBalance = stakerBalance;
      const prevStakerAvailable = stakerAvailable;
      const result = await sdkStaker.genericAction('getFioBalance', { })
      stakerBalance = result.balance;
      stakerAvailable = result.available;
      stakerStaked = result.staked;
      //console.log('Result: ', result);
      expect(stakerBalance).to.equal(prevStakerBalance - stakingFee);
      expect(stakerAvailable).to.equal(0);
      expect(stakerStaked).to.equal(prevStakerBalance - stakingFee);
    } catch (err) {
      expect(err).to.equal(null);
    }
  })

  it(`(Bug BD-3853) Failure -- sdkstaker unstakes all staked FIO. Expect error: Insufficient funds to cover fee )`, async () => {
    try {
      const result = await sdkStaker.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: sdkStaker.address,
          amount: stakerStaked,
          actor: sdkStaker.account,
          max_fee: config.maxFee,
          tpid: proxy1.address
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log("Error : ", err);
      expect(err.json.fields[0].error).to.equal("Insufficient funds to cover fee");
    }
  })

  it(`getFioBalance for sdkstaker`, async () => {
    try {
      const prevStakerBalance = stakerBalance;
      const prevStakerAvailable = stakerAvailable;
      const result = await sdkStaker.genericAction('getFioBalance', { })
      stakerBalance = result.balance;
      stakerAvailable = result.available;
      //console.log('Result: ', result);
      expect(stakerBalance).to.equal(prevStakerBalance);
      expect(stakerAvailable).to.equal(prevStakerAvailable);
    } catch (err) {
      expect(err.json.message).to.equal(null)
    }
  })

  it(`Transfer unstaking Fee to staking account`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: keysStaker.publicKey,
        amount: unstakingFee,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })


  it(`Success -- sdkstaker unstakes all staked FIO`, async () => {
    try {
      const result = await sdkStaker.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: sdkStaker.address,
          amount: stakerStaked, 
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
      const prevStakerBalance = stakerBalance;
      const prevStakerAvailable = stakerAvailable;
      const result = await sdkStaker.genericAction('getFioBalance', { })
      stakerBalance = result.balance;
      stakerAvailable = result.available;
      //console.log('Result: ', result);
      expect(stakerBalance).to.equal(prevStakerBalance);
      expect(stakerAvailable).to.equal(0);
      expect(result.staked).to.equal(0);
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
      //console.log('Result: ', result);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })



})

