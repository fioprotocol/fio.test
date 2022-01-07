require('mocha')
const {expect} = require('chai')
const {newUser, existingUser, callFioApi, fetchJson, generateFioDomain, getAccountFromKey, generateFioAddress, createKeypair, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

/**
 * FIP-21 tests for genesis (mainnet) lock accounts performing staking
 */

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
    uint32_t daysSinceGrant =  (int)((present_time  - lockiter->timestamp) / 10);
    uint32_t firstPayPeriod = 1;
    uint32_t payoutTimePeriod = 1;

  3. Change the unlock period:

  int64_t UNSTAKELOCKDURATIONSECONDS = 604800;

    to become

  int64_t UNSTAKELOCKDURATIONSECONDS = 70;
 
  2. Permit anyone to call the addlocked action in the system contract.

  In: fio.system.cpp

  Comment out the following line in the addlocked action of the fio.system.cpp file

    // require_auth(_self);
  
*/

const lockdurationseconds = 10;      // This should equal whatever you updated in the contract.
const stakingLockPeriod = 70;        // This should equal whatever you updated in the contract. Default is 604800


describe(`************************** stake-mainet-locked-tokens-with-staking.js ************************** \n    A. Test genesis/mainnet locked tokens with staked, unstaked (and including a general lock for the unstake). Ensure all genesis locking works as expected using voting`, () => {

  let userA1, prevFundsAvailable, locksdk, keys, accountnm, newFioDomain, newFioAddress, vote_producer_fee, stake_fio_tokens_fee, totalStaked
  const fundsAmount = 1000000000000   // 1,000 FIO
  const stakeAmount = 400000000000   // 400 FIO
  const unstakeAmount = 200000000000  // 200 FIO
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

  it('Get /vote_producer fee', async () => {
    try {
      result = await userA1.sdk.getFee('vote_producer', userA1.address);
      vote_producer_fee = result.fee;
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Get /stake_fio_tokens fee', async () => {
    try {
      result = await userA1.sdk.getFee('stake_fio_tokens', userA1.address);
      stake_fio_tokens_fee = result.fee;
      //console.log('stake_fio_tokens_fee: ', stake_fio_tokens_fee)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Transfer ${lockAmount} tokens to locksdk`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: lockAmount,
      maxFee: config.maxFee,
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

  it(`getFioBalance for genesis locksdk. Expect available balance = 0 `, async () => {
      const result = await locksdk.genericAction('getFioBalance', { })
      expect(result.available).to.equal(0)
  })

  it(`Transfer additional ${fundsAmount} to locksdk`, async () => {
    try {
      const result = await userA1.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: keys.publicKey,
        amount: fundsAmount,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null);
    }
  })

  it(`getFioBalance for locksdk. Expect available balance = ${fundsAmount} `, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})
    prevFundsAvailable = result.available
    expect(result.available).to.equal(fundsAmount)
  })

  it(`Register domain for voting for locksdk `, async () => {
    try {
      newFioDomain = generateFioDomain(15)
      const result = await locksdk.genericAction('registerFioDomain', {
        fioDomain: newFioDomain,
        maxFee: 800000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null);
    }
  })

  it(`Register address for voting for locked account`, async () => {
    try {
      newFioAddress = generateFioAddress(newFioDomain,15)
      const result = await locksdk.genericAction('registerFioAddress', {
        fioAddress: newFioAddress,
        maxFee: 400000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null);
    }
  })

  it(`Failure test Transfer 700 FIO from locksdk to userA1 FIO public key. Expect error: ${config.error.insufficientBalance}`, async () => {
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
  })

  it(`Failure test stake ${stakeAmount} tokens before user has voted. Expect error: has not voted`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: stakeAmount,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid:''
        }
      })
     // console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log("Error : ", err)
      expect(err.json.fields[0].error).to.contain('has not voted')
    }
  })

  it(`Success, locksdk votes for producers`, async () => {
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
      expect(err).to.equal(null);
    }
  })

  it(`Failure test stake ${stakeAmount} tokens before unlocking. Expect error: Insufficient balance`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: stakeAmount,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log("Error : ", err)
      expect(err.json.fields[0].error).to.contain('Insufficient balance')
    }
  })

  it(`Waiting for unlock`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it('Wait.', async () => {
    await timeout(lockdurationseconds * 1000);
  })

  it(`Success, locksdk votes for producers`, async () => {
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
      expect(err).to.equal(null);
    }
  })

  it(`Set prevFundsAvailable locksdk.`, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})
    //console.log('prevFundsAvailable: ', result)
    prevFundsAvailable = result.available
  })

  // Stake #1

  it(`Success. Stake #1. locksdk stakes ${stakeAmount/1000000000} tokens `, async () => {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: stakeAmount,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
  })

  it(`getFioBalance available for locksdk. Expect balance = previous balance - staked amount`, async () => {
    let prevAmount = prevFundsAvailable;
    const result = await locksdk.genericAction('getFioBalance', {})
    //console.log('prevFundsAvailable: ', result)
    prevFundsAvailable = result.available
    expect(result.available).to.equal(prevAmount - stakeAmount)
  })

  it(`Success. Unstake #1. unstake ${unstakeAmount} tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: unstakeAmount,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid:''
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Call get_table_rows from locktokens and confirm: lock period added correctly`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '2'
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);
      //console.log('Periods: ', result.rows[0].periods[0]);
      expect(result.rows[0].periods[0].duration).to.equal(stakingLockPeriod);
      expect(result.rows[0].periods[0].amount).to.equal(unstakeAmount);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`getFioBalance available for locksdk. Expect balance = previous balance (no change since tokens are still staked)`, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})
    //console.log('prevFundsAvailable: ', result)
    expect(result.available).to.equal(prevFundsAvailable)
  })

  //wait for unlock 2
  it(`Waiting for unlock 2 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it('Wait a few seconds.', async () => {
    await timeout(lockdurationseconds * 1000);
  })

  it(`Success, locksdk votes for producers`, async () => {
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

  it('Wait a few seconds.', async () => {
    await timeout(lockdurationseconds * 1000);
  })

  it(`Success, locksdk votes for producers`, async () => {
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

  it('Wait a few seconds.', async () => {
    await timeout(lockdurationseconds * 1000);
  })

  it(`Success, locksdk votes for producers`, async () => {
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

  it('Wait a few seconds.', async () => {
    await timeout(lockdurationseconds * 1000);
  })

  it(`Success, locksdk votes for producers`, async () => {
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

  it('Wait a few seconds.', async () => {
    await timeout(lockdurationseconds * 1000);
  })

  it(`Success, locksdk votes for producers`, async () => {
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
      expect(result.rows[0].remaining_locked_amount).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Success, locksdk votes for producers`, async () => {
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
      expect(result.rows[0].remaining_locked_amount).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})


describe(`B. Test genesis locked tokens with staked, unstaked (and including a general lock for the unstake, ensure all genesis locking works as expected using transfer`, () => {

  let userA1, prevFundsAmount, locksdk, keys, accountnm, newFioDomain, newFioAddress
  const fundsAmount = 1000000000000


  it(`Create users`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();
    //console.log("priv key ", keys.privateKey);
    //console.log("pub key ", keys.publicKey);
    accountnm =  await getAccountFromKey(keys.publicKey);


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


  it(`getFioBalance for genesis lock token holder. Expect: available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', { })
    prevFundsAmount = result.balance
    expect(result.available).to.equal(0)
  })

  it(`Transfer ${fundsAmount} FIO to locked account`, async () => {
    try {
      const result = await userA1.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: keys.publicKey,
        amount: 1000000000000,
        maxFee: 400000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })


  it(`Register domain for voting for locked account `, async () => {
    try {
      newFioDomain = generateFioDomain(15)
      const result = await locksdk.genericAction('registerFioDomain', {
        fioDomain: newFioDomain,
        maxFee: 800000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })


  it(`Register address for voting for locked account`, async () => {
    try {
      newFioAddress = generateFioAddress(newFioDomain,15)
      const result = await locksdk.genericAction('registerFioAddress', {
        fioAddress: newFioAddress,
        maxFee: 400000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
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


  it(`Failure test stake tokens before user has voted, Error has not voted`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 1000000000000,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //  console.log("Error : ", err.json)
      expect(err.json.fields[0].error).to.contain('has not voted')
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

  it(`Failure test stake tokens before unlocking, Error `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 1000000000000,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log("Error : ", err.json)
      expect(err.json.fields[0].error).to.contain('Insufficient balance')
    }
  })


  it(`Waiting for unlock`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it('Wait a few seconds.', async () => {
    await timeout(lockdurationseconds * 1000);
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

  it(`Success, stake 1k tokens `, async () => {

    const result = await locksdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: newFioAddress,
        amount: 1000000000000,
        actor: accountnm,
        max_fee: config.maxFee,
        tpid:''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`Success, unstake 500 tokens `, async () => {

    const result = await locksdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: newFioAddress,
        amount: 500000000000,
        actor: accountnm,
        max_fee: config.maxFee,
        tpid:''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`Call get_table_rows from locktokens and confirm: lock period added correctly`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '2'
      }
      result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      //console.log('periods : ', result.rows[0].periods[0].duration)
      expect(result.rows[0].periods[0].duration).to.equal(stakingLockPeriod);
      // expect(result.rows[0].periods[0].percent - 100).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //wait for unlock 2
  it(`Waiting for unlock 2 of 6`, async () => {
    console.log("            waiting ",lockdurationseconds," seconds")
  })

  it('Wait a few seconds.', async () => {
    await timeout(lockdurationseconds * 1000);
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

  it('Wait a few seconds.', async () => {
    await timeout(lockdurationseconds * 1000);
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

  it('Wait a few seconds.', async () => {
    await timeout(lockdurationseconds * 1000);
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

  it('Wait a few seconds.', async () => {
    await timeout(lockdurationseconds * 1000);
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

  it('Wait a few seconds.', async () => {
    await timeout(lockdurationseconds * 1000);
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
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Success, Transfer 1 FIO to userA1 FIO public key`, async () => {

    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee+4,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    }catch (err){
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
      expect(result.rows[0].remaining_locked_amount).to.equal(0);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})
