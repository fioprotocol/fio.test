
/*
 MANUAL CONFIGURATION REQUIRED TO RUN TESTS

 The following changes must be made to run these tests:

  1. Shorten the unstake locking period

  go to the contract fio.staking.cpp and change the following lines

  change

  int64_t UNSTAKELOCKDURATIONSECONDS = 604800;

   to become

  int64_t UNSTAKELOCKDURATIONSECONDS = 70;

  Next, update both instances of SECONDSPERDAY in the unstakefio function to 10:

  //the days since launch.
  uint32_t insertday = (lockiter->timestamp + insertperiod) / SECONDSPERDAY;

    to become

  //the days since launch.
  uint32_t insertday = (lockiter->timestamp + insertperiod) / 10;

    and

  daysforperiod = (lockiter->timestamp + lockiter->periods[i].duration)/SECONDSPERDAY;

    to become

  daysforperiod = (lockiter->timestamp + lockiter->periods[i].duration)/10;
*/

require('mocha');
const {expect} = require('chai');
const {newUser, existingUser, fetchJson, createKeypair, timeout} = require('../utils.js');
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
let faucet;

before(async function () {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
  });


describe(`************************** BD-3941-unstake.js ************************** \n    A. BUG BD-3941 unstake throwing error`, function () {
    let userA1, userA1Keys;
  
    const fundsAmount = 200000000000;   // 200 FIO
    const stakeAmt =    100000000000;      // 100 FIO
    const unstakeAmt =  50000000000;    // 50 FIO

    it(`Create Users`, async function () {
      userA1Keys = await createKeypair();
      userA1 = new FIOSDK(userA1Keys.privateKey, userA1Keys.publicKey, config.BASE_URL, fetchJson);
      userA1.publicKey = userA1Keys.publicKey;
      userA1.account = userA1Keys.account;
    });
  
    it(`Transfer tokens to userA1`, async function () {
      await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: userA1Keys.publicKey,
        amount: fundsAmount*3,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        tpid: '',
      });
    });
  
    it(`userA1 votes for bp1@dapixdev`, async () => {
      try {
        const result = await userA1.genericAction('pushTransaction', {
          action: 'voteproducer',
          account: 'eosio',
          data: {
            "producers": [
              'bp1@dapixdev'
            ],
            fio_address: '',
            actor: userA1.account,
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
  
    it(`try to get userA1 FIP-6 locks, expect Error: No lock tokens in account`, async function () {
      try {
        const result = await userA1.getLocks(userA1Keys.publicKey);
        expect(result.status).to.equal(null);
      } catch (err) {
        //console.log('Error: ', err);
        expect(err.json.message).to.equal('No lock tokens in account');
      }
  
    });
  
    it(`stake ${stakeAmt} FIO from userA1`, async function () {
      //let stake = stakeAmt * 2;
  
      try {
        const result = await userA1.genericAction('pushTransaction', {
          action: 'stakefio',
          account: 'fio.staking',
          data: {
            fio_address: userA1.address,
            amount: stakeAmt,
            actor: userA1.account,
            max_fee: config.api.stake_fio_tokens.fee,
            tpid: ''
          }
        });
        expect(result).to.have.any.keys('status');
        expect(result).to.have.any.keys('fee_collected');
        expect(result).to.have.any.keys('block_num');
        expect(result).to.have.any.keys('transaction_id');
        expect(result.status).to.equal('OK');
        expect(result.fee_collected).to.equal(config.api.stake_fio_tokens.fee);
      } catch (err) {
        console.log('Error: ', err);
        throw err;
      }
    });
  
    it(`unstake ${unstakeAmt} FIO from userA1`, async function () {
      try {
        const result = await userA1.genericAction('pushTransaction', {
          action: 'unstakefio',
          account: 'fio.staking',
          data: {
            fio_address: '',
            amount: unstakeAmt,
            actor: userA1.account,
            max_fee: config.maxFee,
            tpid: ''
          }
        });
        expect(result.status).to.equal('OK');
      } catch (err) {
        console.log('Error: ', err);
        throw err;
      }
    });
  
    it(`get userA1 FIP-6 locks and verify the staking unlock period has been added`, async function () {
        try {
        const result = await userA1.getLocks(userA1Keys.publicKey);
        //console.log('Result: ', result);
        expect(result.remaining_lock_amount).to.equal(unstakeAmt);
        expect(result.unlock_periods.length).to.equal(1);
        expect(result.unlock_periods[0].amount).to.equal(unstakeAmt);
        expect(result.unlock_periods[0].duration).to.equal(70);
        } catch (err) {
            console.log('Error: ', err);
            throw err;
        }
    });
  
    it(`Wait 72 seconds.`, async () => { await timeout(72000) })

    it(`get userA1 FIP-6 locks and verify the staking unlock period has been added`, async function () {
        try {
        const result = await userA1.getLocks(userA1Keys.publicKey);
        //console.log('Result: ', result);
        expect(result.remaining_lock_amount).to.equal(0);
        expect(result.unlock_periods.length).to.equal(0);
        } catch (err) {
            console.log('Error: ', err);
            throw err;
        }
    });
  
    it(`BUG BD-3941: Getting "error looking up lock owner" instead of: unstake remaining ${unstakeAmt} staked FIO tokens from userA1`, async function () {
      try {
        const result = await userA1.genericAction('pushTransaction', {
          action: 'unstakefio',
          account: 'fio.staking',
          data: {
            fio_address: userA1.address,
            amount: unstakeAmt,
            actor: userA1.account,
            max_fee: config.api.unstake_fio_tokens.fee,
            tpid:''
          }
        });
        expect(result.status).to.equal('OK');
      } catch (err) {
        console.log('Error: ', err.json.error);
        throw err;
      }
    });
  });