require('mocha')
const {expect} = require('chai')
const {newUser, existingUser,callFioApi,fetchJson, generateFioDomain, getAccountFromKey, generateFioAddress, createKeypair} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
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
// To test genesis locks.  please modify the following 2 files in the fio.contracts repository, to enable them
// to be placed into "test mode"
//
// First, shorten the main net locking period to become 1 minute,
// do this by commenting out the following lines in the fio.token.hpp computeremaininglockedtokens method.

// TESTING ONLY!!! comment out genesis locking periods..DO NOT DELIVER THIS
/* uint32_t daysSinceGrant = (int) ((present_time - lockiter->timestamp) / SECONDSPERDAY);
 uint32_t firstPayPeriod = 90;
 uint32_t payoutTimePeriod = 180;
 */

//  then add the following code beneath what you commented out.

//TEST LOCKED TOKENS
// TESTING ONLY!!! shorten genesis locking periods..DO NOT DELIVER THIS
//               uint32_t daysSinceGrant =  (int)((present_time  - lockiter->timestamp) / 60);
//               uint32_t firstPayPeriod = 1;
//               uint32_t payoutTimePeriod = 1;

//next permit anyone to call the addlocked action in the system contract.
// do this by commenting out the following line in the addlocked action of the fio.system.cpp file

//     // require_auth(_self);

//add a return status, so that tests can run successfully at the end of the action.
// const string response_string = string("{"status": "OK"}");
// send_response(response_string.c_str());


//next modify the faucet to have more tokens
//08_token_issue.sh – modify the amount of tokens in the faucet to permit large grants.
//    ./clio -u http://localhost:8879 push action -j fio.token issue '["qhh25sqpktwh","100000000.000000000 FIO","memo"]' -p eosio@active

// after making these modifications rebuild the contracts locally and restart your chain.
// hou may then proceed with genesis locks testing.

//


describe(`************************** mainet-locked-tokens.js ************************** \n    A. Create large grant verify unlocking using voting \n       also test error cant transfer more than unlocked amount\n     also test multiple calls to voting do not have effect.`, () => {

  let userA1, prevFundsAmount, locksdk, keys, accountnm,newFioDomain, newFioAddress
  const fundsAmount = 1000000000000
  const lockdurationseconds = 60


  it(`Create users`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();

    accountnm =  await getAccountFromKey(keys.publicKey);
    console.log("priv key ", keys.privateKey);
    console.log("pub key ", keys.publicKey);
    console.log(" account ",accountnm);


    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: 7075065123456789,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')


    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner : accountnm,
        amount: 7075065123456789,
        locktype: 1
      }
    })
    expect(result1.status).to.equal('OK')

    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

  })

  it(`getFioBalance for genesis lock token holder, available balance 0 `, async () => {
      const result = await locksdk.genericAction('getFioBalance', { })
      prevFundsAmount = result.balance
      expect(result.available).to.equal(7075065123456789)
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

  it(`Success, vote for producers.`, async () => {

    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: newFioAddress,
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
      result = await callFioApi("get_table_rows", json);
     // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(1);
      expect(result.rows[0].remaining_locked_amount).to.equal(6650561216049387);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Success, vote for producers.`, async () => {

    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp2@dapixdev"],
          fio_address: newFioAddress,
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

  //check that 6% was unlocked.
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount unchangd with multiple calls`, async () => {
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
      result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(1);
      expect(result.rows[0].remaining_locked_amount).to.equal(6650561216049387);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Failure, Transfer 1M FIO to userA1 FIO public key`, async () => {

    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    }catch (err){
      //console.log("ERROR: ", err)
      expect(err.json.fields[0].error).to.contain(config.error.insufficientBalance)
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
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: newFioAddress,
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
      result = await callFioApi("get_table_rows", json);
    // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(2);
      expect(result.rows[0].remaining_locked_amount).to.equal(5320448972849387);

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
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: newFioAddress,
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
      result = await callFioApi("get_table_rows", json);
     // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(3);
      expect(result.rows[0].remaining_locked_amount).to.equal(3990336729649387);

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
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: newFioAddress,
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
      result = await callFioApi("get_table_rows", json);
    //  console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(4);
      expect(result.rows[0].remaining_locked_amount).to.equal(2660224486449387);

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
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: newFioAddress,
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
      result = await callFioApi("get_table_rows", json);
    //  console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(5);
      expect(result.rows[0].remaining_locked_amount).to.equal(1330112243249387);

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
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: newFioAddress,
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
      result = await callFioApi("get_table_rows", json);
     // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(6);
      expect(result.rows[0].remaining_locked_amount).to.equal(49387);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Success, vote for producers.`, async () => {

    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp2@dapixdev"],
          fio_address: newFioAddress,
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

  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount doesnt change`, async () => {
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
      result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(6);
      expect(result.rows[0].remaining_locked_amount).to.equal(49387);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


})

describe(`************************** stake-mainet-locked-tokens.js ************************** \n    A. Create large grant verify unlocking with skipped periods using voting \n also verify voting power is correct after 3rd unlock period`, () => {

  let userA1, prevFundsAmount, locksdk, keys, accountnm,newFioDomain, newFioAddress
  const fundsAmount = 1000000000000
  const lockdurationseconds = 60


  it(`Create users`, async () => {
    try {
      userA1 = await newUser(faucet);

      keys = await createKeypair();
      console.log("priv key ", keys.privateKey);
      console.log("pub key ", keys.publicKey);
      accountnm =  await getAccountFromKey(keys.publicKey);
      console.log(" account ",accountnm);
      let accountnm1 = await getAccountFromKey(faucet.publicKey);
      //console.log("faucet account ", accountnm1 );


      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: keys.publicKey,
        amount: 7075065123456789,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })

      // console.log(result)

      expect(result.status).to.equal('OK')


      const result1 = await userA1.sdk.genericAction('pushTransaction', {
        action: 'addlocked',
        account: 'eosio',
        data: {
          owner : accountnm,
          amount: 7075065123456789,
          locktype: 1
        }
      })
      //console.log(result1)
      expect(result1.status).to.equal('OK')

      locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
    } catch (err) {
      console.log('Error setting up  lock account: ', err)
      //expect(err.json.fields[0].error).to.contain(config.error.insufficientBalance)
    }

  })

  it(`getFioBalance for genesis lock token holder, available balance bug `, async () => {
    try {
      const result = await locksdk.genericAction('getFioBalance', { })
      prevFundsAmount = result.balance
      //console.log(result)
      expect(result.available).to.equal(7075065123456789)
    } catch (err) {
      //  console.log('   Error: ', err)
      expect(err.json.fields[0].error).to.contain(config.error.insufficientBalance)
    }
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
          fio_address: newFioAddress,
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

  it(`Call get_table_rows from locked tokens and confirm: unlocked amount`, async () => {
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
      result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(3);
      expect(result.rows[0].remaining_locked_amount).to.equal(3990336729639387);

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
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voters);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == accountnm) {
          // console.log('voters.rows[voter]: ', voters.rows[voter]);
          break;
        }
      }


      expect(voters.rows[voter].last_vote_weight).to.equal('3084728393817402.00000000000000000');
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
          fio_address: newFioAddress,
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
  it(`Call get_table_rows from lockedtokens and confirm: unlocked amount has dust bug`, async () => {
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
      result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(6);
      expect(result.rows[0].remaining_locked_amount).to.equal(19387);

    } catch (err) {
      // console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})

describe(`************************** stake-mainet-locked-tokens.js ************************** \n    A. Create large grant verify unlocking using transfer`, () => {

  let userA1, prevFundsAmount, locksdk, keys, accountnm,newFioDomain, newFioAddress
  const fundsAmount = 1000000000000
  const lockdurationseconds = 60


  it(`Create users`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();
    console.log("priv key ", keys.privateKey);
    console.log("pub key ", keys.publicKey);
    accountnm =  await getAccountFromKey(keys.publicKey);
    console.log(" account ",accountnm);


    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: 7075065123456789,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')


    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner : accountnm,
        amount: 7075065123456789,
        locktype: 1
      }
    })
    expect(result1.status).to.equal('OK')

    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

  })

  it(`getFioBalance for genesis lock token holder, available balance bug `, async () => {
    const result = await locksdk.genericAction('getFioBalance', { })
    prevFundsAmount = result.balance
    expect(result.available).to.equal(7075065123456789)
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
      const result = await locksdk.genericAction('transferTokens', {
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
        lower_bound: accountnm,
        upper_bound: accountnm,
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
      const result = await locksdk.genericAction('transferTokens', {
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
        lower_bound: accountnm,
        upper_bound: accountnm,
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
      const result = await locksdk.genericAction('transferTokens', {
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
        lower_bound: accountnm,
        upper_bound: accountnm,
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
      const result = await locksdk.genericAction('transferTokens', {
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
        lower_bound: accountnm,
        upper_bound: accountnm,
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
      const result = await locksdk.genericAction('transferTokens', {
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
        lower_bound: accountnm,
        upper_bound: accountnm,
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

describe(`************************** stake-mainet-locked-tokens.js ************************** \n    A. Create large grant verify unlocking with skipped periods using transfer`, () => {

  let userA1, prevFundsAmount, locksdk, keys, accountnm,newFioDomain, newFioAddress
  const fundsAmount = 1000000000000
  const lockdurationseconds = 60


  it(`Create users`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();
    console.log("priv key ", keys.privateKey);
    console.log("pub key ", keys.publicKey);
    accountnm =  await getAccountFromKey(keys.publicKey);
    console.log(" account ",accountnm);


    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: 7075065123456789,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')


    const result1 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addlocked',
      account: 'eosio',
      data: {
        owner : accountnm,
        amount: 7075065123456789,
        locktype: 1
      }
    })
    expect(result1.status).to.equal('OK')

    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

  })

  it(`getFioBalance for genesis lock token holder, available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', { })
    prevFundsAmount = result.balance
    expect(result.available).to.equal(7075065123456789)
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
        lower_bound: accountnm,
        upper_bound: accountnm,
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
      const result = await locksdk.genericAction('transferTokens', {
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
        lower_bound: accountnm,
        upper_bound: accountnm,
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
