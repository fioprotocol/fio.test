require('mocha');
const {expect} = require('chai');
const {newUser, existingUser,callFioApi,fetchJson, generateFioDomain, getAccountFromKey, generateFioAddress, createKeypair} = require('../utils.js');
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {timeout} = require("../utils");
let faucet;

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

/*
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


describe(`************************** locks-mainnet-locked-tokens.js ************************** \n    A. Create large 7075065.123456789 grant. Verify unlocking using voting, can't transfer more than unlocked amount, and multiple calls to voting do not have effect.`, () => {

  let userA1, locksdk, keys, accountnm, transfer_tokens_pub_key_fee
  const lockdurationseconds = 60
  const lockAmount = 7075065123456789
  const eightpercent = Math.trunc(lockAmount * 0.08);


  it(`Create users: locksdk`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    //console.log("priv key ", keys.privateKey);
    //console.log("pub key ", keys.publicKey);
    //console.log("account ",accountnm);

    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  });

  it(`Transfer ${lockAmount} tokens to locksdk`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: lockAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`Lock ${lockAmount} tokens for locksdk`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner: accountnm,
        amount: lockAmount,
        locktype: 1
      }
    })
    expect(result1.status).to.equal('OK')
  });

  it(`getFioBalance for genesis locksdk (lock token holder). Expect: available balance 0 `, async () => {
      const result = await locksdk.genericAction('getFioBalance', { })
      expect(result.available).to.equal(0)
  });

  it(`Failure test. Transfer 700 FIO from locksdk to userA1. Expect error: ${config.error.insufficientBalance}`, async () => {
    try {
    const result = await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 700000000000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
     // console.log('Error: ', err)
      expect(err.json.fields[0].error).to.contain(config.error.insufficientBalance)
    }
  });

  it(`Transfer 10 FIO to locksdk`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: 10000000000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  });

  it(`getFioBalance for genesis locksdk (lock token holder). Expect: available balance 10 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})
    expect(result.available).to.equal(10000000000)
  });

  it('Get /transfer_tokens_pub_key fee', async () => {
    try {
      const result = await userA1.sdk.getFee('transfer_tokens_pub_key');
      transfer_tokens_pub_key_fee = result.fee;
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Transfer 10 FIO - transfer_tokens_pub_key_fee from locksdk to userA1`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 10000000000 - transfer_tokens_pub_key_fee,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      //console.log("Result: ", result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err.json)
      expect(err).to.equal(null);
    }
  });

  it(`getFioBalance for genesis locksdk (lock token holder). Expect: available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})
    expect(result.available).to.equal(0)
  });

  //wait for unlock 1
  it(`Waiting for unlock 1 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  });

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  });

  it(`locksdk votes for producer`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: '',
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
    }
  });

  //check that 6% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: 6% unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(1);
      expect(result.rows[0].remaining_locked_amount).to.equal(6650561216049387);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`locksdk votes for producer again`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp2@dapixdev"],
          fio_address: '',
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  });

  //check that 6% was unlocked.
  it(`Call get_table_rows from lockedtokens. Expect: unlocked amount unchangd with multiple voting calls`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(1);
      expect(result.rows[0].remaining_locked_amount).to.equal(6650561216049387);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Failure. Try to transfer 8% of total FIO from locksdk to userA1. Expect: ${config.error.insufficientBalance}`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: eightpercent,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      console.log('Result: ', result)
      expect(result.status).to.equal(null)
    } catch (err) {
      //console.log("ERROR: ", err)
      expect(err.json.fields[0].error).to.contain(config.error.insufficientBalance)
    }
  });

  it(`Transfer 10 FIO from locksdk to userA1. Expect: success`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 10000000000,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      //console.log("ERROR: ", err)
      expect(err).to.contain(null)
    }
  });

  //wait for unlock 2
  it(`Waiting for unlock 2 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  });

  it(`Wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  });

  it(`locksdk votes for producer`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: '',
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  });

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
    // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(2);
      expect(result.rows[0].remaining_locked_amount).to.equal(5320448972849387);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  //wait for unlock 3
  it(`Waiting for unlock 3 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  });

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  });

  it(`locksdk votes for producer`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: '',
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  });

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
     // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(3);
      expect(result.rows[0].remaining_locked_amount).to.equal(3990336729649387);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  //wait for unlock 4
  it(`Waiting for unlock 4 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  });

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  });

  it(`locksdk votes for producer`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: '',
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  });

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
    //  console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(4);
      expect(result.rows[0].remaining_locked_amount).to.equal(2660224486449387);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  //wait for unlock 5
  it(`Waiting for unlock 5 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  });

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  });

  it(`locksdk votes for producer`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: '',
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  });

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
    //  console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(5);
      expect(result.rows[0].remaining_locked_amount).to.equal(1330112243249387);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  //wait for unlock 6
  it(`Waiting for unlock 6 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  });

  it(`Wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  });

  it(`locksdk votes for producer`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: '',
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  });

  //check that 18.8% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: remaining_locked_amount = 0`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
     // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(6);
      expect(result.rows[0].remaining_locked_amount).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Success, re-vote for producers.`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp2@dapixdev"],
          fio_address: '',
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  });

  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount doesnt change due to re-vote`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(6);
      expect(result.rows[0].remaining_locked_amount).to.equal(0);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });
});

describe(`B. Create large 7075065.123456789 grant verify unlocking using transferTokens`, () => {

  let userA1, locksdk, keys, accountnm
  const lockdurationseconds = 60
  const lockAmount = 7075065123456789

  it(`Create users: locksdk`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();

    accountnm = await getAccountFromKey(keys.publicKey);
    //console.log("priv key ", keys.privateKey);
    //console.log("pub key ", keys.publicKey);
    //console.log("account ",accountnm);

    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  })

  it(`Transfer ${lockAmount} tokens to locksdk`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: lockAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  })

  it(`Lock ${lockAmount} tokens for locksdk`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner: accountnm,
        amount: lockAmount,
        locktype: 1
      }
    })
    expect(result1.status).to.equal('OK')
  })

  it(`getFioBalance for genesis lock token holder, available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', { })
    expect(result.available).to.equal(0)
  })

  it(`Failure test Transfer 700 FIO to userA1 FIO public key, insufficient balance tokens locked`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 700000000000,
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
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    }catch (err){
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
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
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
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
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    }catch (err){
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
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
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
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
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
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
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
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
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
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
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
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
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
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
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
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
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
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
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(6);
      expect(result.rows[0].remaining_locked_amount).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

});

describe(`C. Create large grant verify unlocking with skipped periods using voting`, () => {

  let userA1, locksdk, keys, accountnm
  const lockdurationseconds = 60
  const lockAmount = 7075065123456789

  it(`Create users: locksdk`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();

    accountnm = await getAccountFromKey(keys.publicKey);
    //console.log("priv key ", keys.privateKey);
    //console.log("pub key ", keys.publicKey);
    //console.log("account ",accountnm);

    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  })

  it(`Transfer ${lockAmount} tokens to locksdk`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: lockAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  })

  it(`Lock ${lockAmount} tokens for locksdk`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner: accountnm,
        amount: lockAmount,
        locktype: 1
      }
    })
    expect(result1.status).to.equal('OK')
  })

  it(`getFioBalance for genesis lock token holder, available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', { })
    expect(result.available).to.equal(0)
  })

  it(`Failure test Transfer 700 FIO to userA1 FIO public key, insufficient balance tokens locked`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 700000000000,
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
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: '',
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
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
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
     // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(3);
      expect(result.rows[0].remaining_locked_amount).to.equal(3990336729639387);
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
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: '',
          actor: accountnm,
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
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(6);
      expect(result.rows[0].remaining_locked_amount).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

});

describe(`D. Create large grant verify unlocking with skipped periods using transfer`, () => {

  let userA1, locksdk, keys, accountnm
  const lockdurationseconds = 60
  const lockAmount = 7075065123456789

  it(`Create users: locksdk`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();

    accountnm = await getAccountFromKey(keys.publicKey);
    //console.log("priv key ", keys.privateKey);
    //console.log("pub key ", keys.publicKey);
    //console.log("account ",accountnm);

    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  })

  it(`Transfer ${lockAmount} tokens to locksdk`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: lockAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')
  })

  it(`Lock ${lockAmount} tokens for locksdk`, async () => {
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner: accountnm,
        amount: lockAmount,
        locktype: 1
      }
    })
    expect(result1.status).to.equal('OK')
  })

  it(`getFioBalance for genesis lock token holder, available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', { })
    expect(result.available).to.equal(0)
  })

  it(`Failure test Transfer 700 FIO to userA1 FIO public key, insufficient balance tokens locked`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 700000000000,
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
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
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
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
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
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
      expect(err).to.equal(null);
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
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(6);
      expect(result.rows[0].remaining_locked_amount).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });
});

describe(`E. (BD-2632, BD-2759) Verify get_fio_balance returns accurate balance when an expired mainnet lock is in the table`, () => {
  // create two mainnet (genesis) locks
  let user1, locksdk1, locksdk2, keys1, keys2, accountnm1, accountnm2, transfer_tokens_pub_key_fee
  const lockdurationseconds = 60;
  const lockAmount1 = 7000000000000000;
  const lockAmount2 = 6000000000000000;
  const eightpercent = Math.trunc(lockAmount1 * 0.08);
  let initialLockSdk1Bal, initialLockSdk2Bal;
  const numPeriods = 6;

  before(async () => {
    user1 = await newUser(faucet);
    keys1 = await createKeypair();
    keys2 = await createKeypair();
    accountnm1 =  await getAccountFromKey(keys1.publicKey);
    accountnm2 =  await getAccountFromKey(keys2.publicKey);
    //console.log("priv key ", keys.privateKey);
    //console.log("pub key ", keys.publicKey);
    //console.log("account ",accountnm);
    locksdk1 = new FIOSDK(keys1.privateKey, keys1.publicKey, config.BASE_URL, fetchJson);
    locksdk2 = new FIOSDK(keys2.privateKey, keys2.publicKey, config.BASE_URL, fetchJson);

    console.log(`Transfer ${lockAmount1} tokens to locksdk1`);
    const transfer1 = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys1.publicKey,
      amount: lockAmount1,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(transfer1.status).to.equal('OK');
    const transfer2 = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys2.publicKey,
      amount: lockAmount2,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(transfer2.status).to.equal('OK');

    console.log(`Lock ${lockAmount1} tokens for locksdk`);
    // const lock1 = await user1.sdk.genericAction('pushTransaction', {
    //   action: 'addlocked',
    //   account: 'eosio',
    //   data: {
    //     owner: accountnm1,
    //     amount: lockAmount1 - 1000000000,
    //     locktype: 1
    //   }
    // });
    const lock1 = await locksdk1.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner: accountnm1,
        amount: lockAmount1 - 1000000000,
        locktype: 1
      }
    });
    expect(lock1.status).to.equal('OK');

    const lock2 = await locksdk2.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner: accountnm2,
        amount: lockAmount2,
        locktype: 1
      }
    })
    expect(lock2.status).to.equal('OK');
  });

  // call get_fio_balance, record results
  it(`getFioBalance for genesis locksdk1 (lock token holder). Expect: available balance 0 `, async () => {
    const result = await locksdk1.genericAction('getFioBalance', {});
    expect(result.available).to.equal(1000000000);
    initialLockSdk1Bal = result;
  });

  it(`getFioBalance for genesis locksdk2 (lock token holder). Expect: available balance 0 `, async () => {
    const result = await locksdk2.genericAction('getFioBalance', {});
    expect(result.available).to.equal(0);
    initialLockSdk2Bal = result;
  });

  it(`Call get_table_rows from lockedtokens and confirm: 6% unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm1,
        upper_bound: accountnm1,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(0);
      expect(result.rows[0].remaining_locked_amount).to.equal(initialLockSdk1Bal.balance - initialLockSdk1Bal.available);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  // wait for an unlock period duration to go by
  it(`wait for ${numPeriods} lock periods`, async () => {
    wait(lockdurationseconds * (numPeriods * 1000));
  });

  it(`lock more tokens`, async () => {
    try {
      const lock2 = await locksdk1.genericAction('pushTransaction', {
        action: 'addlocked',
        account: 'eosio',
        data: {
          owner: accountnm1,
          amount: 1000000000,
          locktype: 1
        }
      })
      expect(lock2.status).to.equal('OK');
    } catch (err) {
      console.log(err)
    }
  });

  // call get_table on `eosio lockedtokens`, expect `lock_amount` and `remaining_lock_amount` to be correct and include the amount from the expired lock, even though it is still in the table
  it(`Call get_table_rows from lockedtokens and confirm: 6% unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm1,
        upper_bound: accountnm1,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(0);
      expect(result.rows[0].remaining_locked_amount).to.equal(initialLockSdk1Bal.balance - initialLockSdk1Bal.available);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Call get_table_rows from lockedtokens and confirm: 6% unlocked amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: accountnm2,
        upper_bound: accountnm2,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      expect(result.rows[0].unlocked_period_count).to.equal(0);
      expect(result.rows[0].remaining_locked_amount).to.equal(initialLockSdk2Bal.balance);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`getFioBalance for genesis locksdk1 (lock token holder). Expect: available balance 0 `, async () => {
    const result = await locksdk1.genericAction('getFioBalance', {});
    expect(result.available).to.equal(1000000000);
  });

  it(`getFioBalance for genesis locksdk2 (lock token holder). Expect: available balance 0 `, async () => {
    const result = await locksdk2.genericAction('getFioBalance', {});
    expect(result.available).to.equal(0);
  });

});
