require('mocha')
const {expect} = require('chai')
const {newUser, existingUser,callFioApi,fetchJson, generateFioDomain, getAccountFromKey, generateFioAddress, createKeypair} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const { createNull } = require('typescript');
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

function wait(ms){
  var start = new Date().getTime();
  var end = start;
  while(end < start + ms) {
    end = new Date().getTime();
  }
}
/**
 MANUAL CONFIGURATION REQUIRED TO RUN TEST
 
 The following changes must be made to run these tests:

 1. Shorten the main net locking period to become 1 minute
 
  In: fio.token.hpp
 
  Comment out the following lines in the computeremaininglockedtokens method:

    //uint32_t daysSinceGrant = (int) ((present_time - lockiter->timestamp) / SECONDSPERDAY);
    //uint32_t firstPayPeriod = 90;
    //uint32_t payoutTimePeriod = 180;

  Then add the following code beneath what you commented out.

    // TESTING ONLY!!! shorten genesis locking periods..DO NOT DELIVER THIS
    uint32_t daysSinceGrant =  (int)((present_time  - lockiter->timestamp) / 60);
    uint32_t firstPayPeriod = 1;
    uint32_t payoutTimePeriod = 1;

  2. Permit anyone to call the addlocked action in the system contract.

  In: fio.system.cpp

  Comment out the following line in the addlocked action of the fio.system.cpp file

    // require_auth(_self);

*/

/**
  REFERENCE: 

  The token unlock schedule for Type 1 mainnet/genesis tokens:

  Day 0: 0.00%
  Day 90: 6.00% (period 1)
  Day 270: 18.80% (period 2)
  Day 450: 18.80% (period 3)
  Day 630: 18.80% (period 4)
  Day 810: 18.80% (period 5)
  Day 990: 18.80% (period 1)
*/

const unlock1Percent = 0.06,
  unlock2Percent = 0.06 + .188,
  unlock3Percent = 0.06 + .188 + .188,
  unlock4Percent = 0.06 + .188 + .188 + .188,
  unlock5Percent = 0.06 + .188 + .188 + .188 + .188,
  unlock6Percent = 0.06 + .188 + .188 + .188 + .188 + .188


describe(`************************** locks-mainnet-locked-tokens-lock1hotfix.js ************************** \n    A. Create large grant verify unlocking using voting \n       also test error cant transfer more than unlocked amount\n     also test multiple calls to voting do not have effect.`, () => {

  let userA1, prevFundsAmount, lockAccount, newFioAddress
  let numberOfVotes = 0

  voteProdFee = config.api.vote_producer.fee

  const lockdurationseconds = 60,
    //lockAmount = 7075065123456789
    lockAmount = 100000000000,  // 100 FIO
    testTransferAmount = 50000000000,  // 50 FIO
    unlock1Amount = lockAmount * unlock1Percent,
    unlock2Amount = lockAmount * unlock2Percent,
    unlock3Amount = lockAmount * unlock3Percent,
    unlock4Amount = lockAmount * unlock4Percent,
    unlock5Amount = lockAmount * unlock5Percent,
    unlock6Amount = lockAmount * unlock6Percent

  it(`Create lockAccount user`, async () => {
    userA1 = await newUser(faucet);

    lockAccount = await createKeypair();

    lockAccount.account = await getAccountFromKey(lockAccount.publicKey);
    console.log("lockAccount priv key: ", lockAccount.privateKey);
    console.log("lockAccount pub key: ", lockAccount.publicKey);
    console.log("lockAccount account: ", lockAccount.account);
    
    lockAccount.sdk = new FIOSDK(lockAccount.privateKey, lockAccount.publicKey, config.BASE_URL, fetchJson);
  })

  it(`Transfer ${lockAmount} SUFs to lockAccount `, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: lockAccount.publicKey,
        amount: lockAmount,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err.json);
      expect(err).to.equal(null);
    }
  })

  it(`Add ${lockAmount} Type 1 locked tokens to lockAccount `, async () => {
    try {
      const result1 = await userA1.sdk.genericAction('pushTransaction', {
        action: 'addlocked',
        account: 'eosio',
        data: {
          owner : lockAccount.account,
          amount: lockAmount,
          locktype: 1
        }
      })
      expect(result1.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Call get_table_rows from lockedtokens. Expect: remaining_locked_amount = ${lockAmount}`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: 'i64',
        index_position: '1'
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(0);
      expect(result.rows[0].remaining_locked_amount).to.equal(lockAmount);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`getFioBalance for lockAccount genesis lock token holder. Expect: available balance = 0 `, async () => {
    try {
      const result = await lockAccount.sdk.genericAction('getFioBalance', {})
      //console.log('Result: ', result);
      prevFundsAmount = result.balance
      expect(result.balance).to.equal(lockAmount);
      //expect(result.available).to.equal(0);  // Known bug in 3.0.1
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })

  it(`Failure test - Transfer ${testTransferAmount} SUFs from lockAccount to userA1 FIO public key, insufficient balance tokens locked`, async () => {
    try {
    const result = await lockAccount.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: testTransferAmount,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log('Error: ', err)
      expect(err.json.fields[0].error).to.contain(config.error.insufficientBalance)
    }
  })

  it(`getFioBalance for lockAccount genesis lock token holder. Expect: balance = ${lockAmount} `, async () => {
    try {
      const result = await lockAccount.sdk.genericAction('getFioBalance', {})
      //console.log('Result: ', result);
      expect(result.balance).to.equal(lockAmount);
      //console.log('Fee: ', voteProdFee)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })

  //wait for unlock 1
  it(`Waiting for unlock 1 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Success, vote for producers.`, async () => {
    try {
      const result = await lockAccount.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: newFioAddress,
          actor: lockAccount.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      numberOfVotes += 1;
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err);
      expect(err).to.equal(null);
    }
  })

  //check that 6% was unlocked.
  it(`Call get_table_rows from lockedtokens. Confirm: unlocked = ${unlock1Percent}, remaining unlocked = ${lockAmount - unlock1Amount}`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: 'i64',
        index_position: '1'
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(1);
      expect(result.rows[0].remaining_locked_amount).to.equal(lockAmount - unlock1Amount);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Success, vote for producers.`, async () => {
    try {
      const result = await lockAccount.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp2@dapixdev"],
          fio_address: newFioAddress,
          actor: lockAccount.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      numberOfVotes += 1;
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  })

  //check that 6% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount unchangd with multiple calls`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: 'i64',
        index_position: '1'
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(1);
      expect(result.rows[0].remaining_locked_amount).to.equal(lockAmount - unlock1Amount);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Failure, Transfer unlock1Amount + 10 FIO to userA1 FIO public key`, async () => {

    try {
      const result = await lockAccount.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: unlock1Amount + 10000000000,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log("ERROR: ", err);
      expect(err.json.fields[0].error).to.contain(config.error.insufficientBalance);
    }
  })

  it(`Confirm last_vote_weight = ${lockAmount * 0.3} (30%) `, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: "name",
        index_position: "3",
      }
      voters = await callFioApi("get_table_rows", json);
      //console.log('Voters: ', voters);
      voteWeight = Math.trunc(parseInt(voters.rows[0].last_vote_weight));
      //console.log('voteWeight: ', voteWeight);

      expect(voteWeight).to.equal(lockAmount * 0.3); //
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //wait for unlock 2
  it(`Waiting for unlock 2 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, vote for producers.`, async () => {

    try {
      const result = await lockAccount.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: newFioAddress,
          actor: lockAccount.account,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      numberOfVotes += 1;
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens. Confirm: unlocked = ${unlock2Percent}, remaining unlocked = ${lockAmount - unlock2Amount}`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: 'i64',
        index_position: '1'
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(2);
      expect(result.rows[0].remaining_locked_amount).to.equal(lockAmount - unlock2Amount);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Confirm last_vote_weight = ${lockAmount * 0.3} (30%) `, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: "name",
        index_position: "3",
      }
      voters = await callFioApi("get_table_rows", json);
      voteWeight = Math.trunc(parseInt(voters.rows[0].last_vote_weight));
      //console.log('Voters: ', voters);

      expect(voteWeight).to.equal(lockAmount * 0.3); //
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //wait for unlock 3
  it(`Waiting for unlock 3 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, vote for producers.`, async () => {

    try {
      const result = await lockAccount.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: newFioAddress,
          actor: lockAccount.account,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      numberOfVotes += 1;
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens. Confirm: unlocked = ${unlock3Percent}, remaining unlocked = ${lockAmount - unlock3Amount}`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: 'i64',
        index_position: '1'
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(3);
      expect(result.rows[0].remaining_locked_amount).to.equal(lockAmount - unlock3Amount);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Confirm last_vote_weight = ${unlock3Amount} minus regprod fees? `, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: "name",
        index_position: "3",
      }
      voters = await callFioApi("get_table_rows", json);
      voteWeight = Math.trunc(parseInt(voters.rows[0].last_vote_weight));
      //console.log('Voters: ', voters);
      //console.log('fee: ', voteProdFee * numberOfVotes)

      expect(voteWeight).to.equal(unlock3Amount - voteProdFee * (numberOfVotes-1)); //Not sure why it did not include all votes...
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //wait for unlock 4
  it(`Waiting for unlock 4 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, vote for producers.`, async () => {

    try {
      const result = await lockAccount.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: newFioAddress,
          actor: lockAccount.account,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      numberOfVotes += 1;
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens. Confirm: unlocked = ${unlock4Percent}, remaining unlocked = ${lockAmount - unlock4Amount}`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: 'i64',
        index_position: '1'
      }
      result = await callFioApi("get_table_rows", json);
    //  console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(4);
      expect(result.rows[0].remaining_locked_amount).to.equal(lockAmount - unlock4Amount);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Confirm last_vote_weight = ${unlock4Amount} minus regprod fees `, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: "name",
        index_position: "3",
      }
      voters = await callFioApi("get_table_rows", json);
      voteWeight = Math.trunc(parseInt(voters.rows[0].last_vote_weight));
      //console.log('Voters: ', voters);
      //console.log('fee: ', voteProdFee * numberOfVotes)

      expect(voteWeight).to.equal(unlock4Amount - voteProdFee * (numberOfVotes - 1)); //
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //wait for unlock 5
  it(`Waiting for unlock 5 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, vote for producers.`, async () => {

    try {
      const result = await lockAccount.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: newFioAddress,
          actor: lockAccount.account,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      numberOfVotes += 1;
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens. Confirm: unlocked = ${unlock5Percent}, remaining unlocked = ${lockAmount - unlock5Amount}`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: 'i64',
        index_position: '1'
      }
      result = await callFioApi("get_table_rows", json);
    //  console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(5);
      expect(result.rows[0].remaining_locked_amount).to.equal(lockAmount - unlock5Amount);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Confirm last_vote_weight = ${unlock5Amount} minus regprod fees `, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: "name",
        index_position: "3",
      }
      voters = await callFioApi("get_table_rows", json);
      voteWeight = Math.trunc(parseInt(voters.rows[0].last_vote_weight));
      //console.log('Voters: ', voters);
      //console.log('fee: ', voteProdFee * numberOfVotes)

      expect(voteWeight).to.equal(unlock5Amount - voteProdFee * (numberOfVotes - 1));
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //wait for unlock 6
  it(`Waiting for unlock 6 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, vote for producers.`, async () => {

    try {
      const result = await lockAccount.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: newFioAddress,
          actor: lockAccount.account,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      numberOfVotes += 1;
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens. Confirm: unlocked = ${unlock6Percent}, remaining unlocked = ${lockAmount - unlock6Amount}`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: 'i64',
        index_position: '1'
      }
      result = await callFioApi("get_table_rows", json);
     // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(6);
      expect(result.rows[0].remaining_locked_amount).to.equal(lockAmount - unlock6Amount);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Success, vote for producers.`, async () => {

    try {
      const result = await lockAccount.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp2@dapixdev"],
          fio_address: newFioAddress,
          actor: lockAccount.account,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      numberOfVotes += 1;
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  })

  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount doesnt change`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: 'i64',
        index_position: '1'
      }
      result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(6);
      expect(result.rows[0].remaining_locked_amount).to.equal(lockAmount - unlock6Amount);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Confirm last_vote_weight = ${unlock6Amount} minus regprod fees `, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: "name",
        index_position: "3",
      }
      voters = await callFioApi("get_table_rows", json);
      voteWeight = Math.trunc(parseInt(voters.rows[0].last_vote_weight));
      //console.log('Voters: ', voters);

      expect(voteWeight).to.equal(unlock6Amount - voteProdFee * (numberOfVotes - 1)); //
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


})


describe(`B. Create large grant verify unlocking with skipped periods using voting also verify voting power is correct after 3rd unlock period`, () => {

  let userA1, lockAccount, newFioAddress
  const lockdurationseconds = 60,
    lockAmount = 7075065123456789,
    //lockAmount = 100000000000,  // 100 FIO
    testTransferAmount = 700000000000  // 50 FIO

  it(`Create lockAccount user`, async () => {
    userA1 = await newUser(faucet);

    lockAccount = await createKeypair();

    lockAccount.account = await getAccountFromKey(lockAccount.publicKey);
    //console.log("lockAccount priv key: ", lockAccount.privateKey);
    //console.log("lockAccount pub key: ", lockAccount.publicKey);
    //console.log("lockAccount account: ", lockAccount.account);

    lockAccount.sdk = new FIOSDK(lockAccount.privateKey, lockAccount.publicKey, config.BASE_URL, fetchJson);
  })

  it(`Transfer ${lockAmount} SUFs to lockAccount `, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: lockAccount.publicKey,
        amount: lockAmount,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err.json);
      expect(err).to.equal(null);
    }
  })

  it(`getFioBalance for genesis lock token holder. Expect available = lockAmount `, async () => {
    try {
      const result = await lockAccount.sdk.genericAction('getFioBalance', {})
      //console.log(result)
      expect(result.available).to.equal(lockAmount)
    } catch (err) {
      console.log('   Error: ', err)
      expect(err).to.equal(null);
    }
  })

  it(`Add ${lockAmount} Type 1 locked tokens to lockAccount `, async () => {
    try {
      const result1 = await userA1.sdk.genericAction('pushTransaction', {
        action: 'addlocked',
        account: 'eosio',
        data: {
          owner: lockAccount.account,
          amount: lockAmount,
          locktype: 1
        }
      })
      expect(result1.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`getFioBalance for genesis lock token holder. Expect available = 0 (100% locked) `, async () => {
    try {
      const result = await lockAccount.sdk.genericAction('getFioBalance', { })
      //console.log(result)
      expect(result.available).to.equal(0)
    } catch (err) {
      console.log('   Error: ', err)
      expect(err).to.equal(null);
    }
  })

  it(`Failure test Transfer 700 FIO to userA1 FIO public key, insufficient balance tokens locked`, async () => {
    try {
      const result = await lockAccount.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: testTransferAmount,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      // console.log('Error: ', err)
      expect(err.json.fields[0].error).to.contain(config.error.insufficientBalance)
    }
  })

  //wait for unlock 3
  it(`Waiting for unlock 3 of 6, this is 3 minutes`, async () => {
    console.log("            waiting ",lockdurationseconds * 3," seconds")
  })

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000 * 3)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, vote for producers.`, async () => {

    try {
      const result = await lockAccount.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: newFioAddress,
          actor: lockAccount.account,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  })

  it(`Call get_table_rows from locked tokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: 'i64',
        index_position: '1'
      }
      result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(3);
      expect(result.rows[0].remaining_locked_amount).to.equal(3990336729639387); // Includes dust

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


  it('Confirm voters record:  ', async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: "name",
        index_position: "3",
      }
      voters = await callFioApi("get_table_rows", json);

      expect(voters.rows[0].last_vote_weight).to.equal('3084728393817402.00000000000000000'); //
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


  //wait for unlock 6
  it(`Waiting for unlock 6 of 6, 3 minutes`, async () => {
    console.log("            waiting ",lockdurationseconds * 3," seconds")
  })

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000 * 3)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, vote for producers.`, async () => {

    try {
      const result = await lockAccount.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: newFioAddress,
          actor: lockAccount.account,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount has dust bug`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: 'i64',
        index_position: '1'
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(6);
      expect(result.rows[0].remaining_locked_amount).to.equal(19387);

    } catch (err) {
      // console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})

describe(`C. Create large grant verify unlocking using transfer`, () => {

  let userA1, lockAccount, newFioAddress
  const lockdurationseconds = 60,
    lockAmount = 7075065123456789,
    //lockAmount = 100000000000,  // 100 FIO
    testTransferAmount = 700000000000,  // 50 FIO
    unlock1Amount = lockAmount * unlock1Percent,
    unlock2Amount = lockAmount * unlock2Percent,
    unlock3Amount = lockAmount * unlock3Percent,
    unlock4Amount = lockAmount * unlock4Percent,
    unlock5Amount = lockAmount * unlock5Percent,
    unlock6Amount = lockAmount * unlock6Percent

  it(`Create lockAccount user`, async () => {
    userA1 = await newUser(faucet);

    lockAccount = await createKeypair();

    lockAccount.account = await getAccountFromKey(lockAccount.publicKey);
    //console.log("lockAccount priv key: ", lockAccount.privateKey);
    //console.log("lockAccount pub key: ", lockAccount.publicKey);
    //console.log("lockAccount account: ", lockAccount.account);

    lockAccount.sdk = new FIOSDK(lockAccount.privateKey, lockAccount.publicKey, config.BASE_URL, fetchJson);
  })

  it(`Transfer ${lockAmount} SUFs to lockAccount `, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: lockAccount.publicKey,
        amount: lockAmount,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err.json);
      expect(err).to.equal(null);
    }
  })

  it(`Add ${lockAmount} Type 1 locked tokens to lockAccount `, async () => {
    try {
      const result1 = await userA1.sdk.genericAction('pushTransaction', {
        action: 'addlocked',
        account: 'eosio',
        data: {
          owner: lockAccount.account,
          amount: lockAmount,
          locktype: 1
        }
      })
      expect(result1.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`getFioBalance for genesis lock token holder. Expect available = 0 (100% locked) `, async () => {
    const result = await lockAccount.sdk.genericAction('getFioBalance', { })
    prevFundsAmount = result.balance
    expect(result.balance).to.equal(lockAmount)
    expect(result.available).to.equal(0)
  })

  it(`Failure test Transfer 700 FIO to userA1 FIO public key, insufficient balance tokens locked`, async () => {
    try {
      const result = await lockAccount.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: testTransferAmount,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      // console.log('Error: ', err)
      expect(err.json.fields[0].error).to.contain(config.error.insufficientBalance)
    }
  })

  //wait for unlock 1
  it(`Waiting for unlock 1 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, Transfer 1 FIO to userA1 FIO public key`, async () => {

    try {
      const result = await lockAccount.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    }catch (err){
      console.log("ERROR: ", err)
    }
  })

  //check that 6% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: 'i64',
        index_position: '1'
      }
      result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(1);
      expect(result.rows[0].remaining_locked_amount).to.equal(6650559216049387);


    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


  //wait for unlock 2
  it(`Waiting for unlock 2 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, Transfer 1 FIO to userA1 FIO public key`, async () => {

    try {
      const result = await lockAccount.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    }catch (err){
      console.log("ERROR: ", err)
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: 'i64',
        index_position: '1'
      }
      result = await callFioApi("get_table_rows", json);
      //  console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(2);
      expect(result.rows[0].remaining_locked_amount).to.equal(5320446972849387);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //wait for unlock 3
  it(`Waiting for unlock 3 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, Transfer 1 FIO to userA1 FIO public key`, async () => {

    try {
      const result = await lockAccount.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    }catch (err){
      console.log("ERROR: ", err)
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: 'i64',
        index_position: '1'
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(3);
      expect(result.rows[0].remaining_locked_amount).to.equal(3990334729649387);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //wait for unlock 4
  it(`Waiting for unlock 4 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, Transfer 1 FIO to userA1 FIO public key`, async () => {

    try {
      const result = await lockAccount.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    }catch (err){
      console.log("ERROR: ", err)
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: 'i64',
        index_position: '1'
      }
      result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(4);
      expect(result.rows[0].remaining_locked_amount).to.equal(2660222486449387);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //wait for unlock 5
  it(`Waiting for unlock 5 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, Transfer 1 FIO to userA1 FIO public key`, async () => {

    try {
      const result = await lockAccount.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    }catch (err){
      console.log("ERROR: ", err)
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: 'i64',
        index_position: '1'
      }
      result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(5);
      expect(result.rows[0].remaining_locked_amount).to.equal(1330110243249387);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //wait for unlock 6
  it(`Waiting for unlock 6 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, Transfer 1 FIO to userA1 FIO public key`, async () => {

    try {
      const result = await lockAccount.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    }catch (err){
      console.log("ERROR: ", err)
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: 'i64',
        index_position: '1'
      }
      result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(6);
      expect(result.rows[0].remaining_locked_amount).to.equal(0);

    } catch (err) {
     // console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})

describe(`D. Create large grant verify unlocking with skipped periods using transfer`, () => {

  let userA1, lockAccount, newFioAddress
  const lockdurationseconds = 60,
    lockAmount = 7075065123456789,
    //lockAmount = 100000000000,  // 100 FIO
    testTransferAmount = 700000000000  // 50 FIO

  it(`Create lockAccount user`, async () => {
    userA1 = await newUser(faucet);

    lockAccount = await createKeypair();

    lockAccount.account = await getAccountFromKey(lockAccount.publicKey);
    //console.log("lockAccount priv key: ", lockAccount.privateKey);
    //console.log("lockAccount pub key: ", lockAccount.publicKey);
    //console.log("lockAccount account: ", lockAccount.account);

    lockAccount.sdk = new FIOSDK(lockAccount.privateKey, lockAccount.publicKey, config.BASE_URL, fetchJson);
  })

  it(`Transfer ${lockAmount} SUFs to lockAccount `, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: lockAccount.publicKey,
        amount: lockAmount,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err.json);
      expect(err).to.equal(null);
    }
  })

  it(`Add ${lockAmount} Type 1 locked tokens to lockAccount `, async () => {
    try {
      const result1 = await userA1.sdk.genericAction('pushTransaction', {
        action: 'addlocked',
        account: 'eosio',
        data: {
          owner: lockAccount.account,
          amount: lockAmount,
          locktype: 1
        }
      })
      expect(result1.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`getFioBalance for genesis lock token holder, available balance 0 `, async () => {
    const result = await lockAccount.sdk.genericAction('getFioBalance', { })
    prevFundsAmount = result.balance
    expect(result.available).to.equal(0)
  })

  it(`Failure test Transfer 700 FIO to userA1 FIO public key, insufficient balance tokens locked`, async () => {
    try {
      const result = await lockAccount.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: testTransferAmount,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      // console.log('Error: ', err)
      expect(err.json.fields[0].error).to.contain(config.error.insufficientBalance)
    }
  })

  //wait for unlock 3
  it(`Waiting for unlock 3 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds * 3," seconds")
  })

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000 * 3)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, Transfer 1 FIO to userA1 FIO public key`, async () => {

    try {
      const result = await lockAccount.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    }catch (err){
      console.log("ERROR: ", err)
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: 'i64',
        index_position: '1'
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(3);
      expect(result.rows[0].remaining_locked_amount).to.equal(3990334729639387);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


  //wait for unlock 6
  it(`Waiting for unlock 6 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds * 3," seconds")
  })

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000 * 3)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, Transfer 1 FIO to userA1 FIO public key`, async () => {

    try {
      const result = await lockAccount.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    }catch (err){
      console.log("ERROR: ", err)
    }
  })

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount with dust bug`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: lockAccount.account,
        upper_bound: lockAccount.account,
        key_type: 'i64',
        index_position: '1'
      }
      result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(6);
      expect(result.rows[0].remaining_locked_amount).to.equal(0);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})
