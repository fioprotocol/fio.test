require('mocha')
const {expect} = require('chai')
const {newUser, existingUser,callFioApi,fetchJson, generateFioDomain, getAccountFromKey,generateFioAddress, createKeypair} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');

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

const UNSTAKELOCKDURATIONSECONDS = 604800

describe(`************************** stake-general-locked-tokens.js ************************** \n    A. Stake/unstake tokens with existing general lock account`, () => {
  //FIP-21 tests for general lock accounts performing staking

  let userA1, locksdk, keys, accountnm, newFioDomain, newFioAddress, lockDuration

  const genLock1Dur = 60, genLock1Amount = 5000000000000,  // 1 minute, 5000 FIO
    genLock2Dur = 120, genLock2Amount = 4000000000000,     // 2 minutes, 4000 FIO
    genLock3Dur = 1204800, genLock3Amount = 1000000000000  // 20080 minuteS, 1000 FIO

  const genLockTotal = genLock1Amount + genLock2Amount + genLock3Amount

  const fundsAmount = 1000000000000
  const stakeAmount = 1000000000000 // 1000 FIO
  const unstake1 = 100000000000     // 100 FIO
  const unstake2 = 2000000000       // 2 FIO
  const unstake3 = 2000000000       // 2 FIO

  it(`Create users`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();
    accountnm = await getAccountFromKey(keys.publicKey);
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    //console.log("locksdk priv key ", keys.privateKey);
    //console.log("locksdk pub key ", keys.publicKey);
    //console.log("locksdk Account name ", accountnm);
  })

  it(`trnsloctoks with three periods to locksdk: 5000 FIO - 1 min, 4000 FIO - 2 min, and 1000 FIO - 20080 minutes`, async () => {
    const result = await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: genLock1Dur,
            amount: genLock1Amount,
          },
          {
            duration: genLock2Dur,
            amount: genLock2Amount,
          },
          {
            duration: genLock3Dur,
            amount: genLock3Amount,
          }
        ],
        amount: genLockTotal,
        max_fee: config.maxFee,
        tpid: '',
        actor: config.FAUCET_ACCOUNT,
      }
    })
    expect(result.status).to.equal('OK')
  })

  it(`Call get_table_rows from locktokensv2 and confirm: three lock periods added correctly`, async () => {
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
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal)
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].duration).to.equal(genLock1Dur)
      expect(result.rows[0].periods[0].amount).to.equal(genLock1Amount)
      expect(result.rows[0].periods[1].duration).to.equal(genLock2Dur)
      expect(result.rows[0].periods[1].amount).to.equal(genLock2Amount)
      expect(result.rows[0].periods[2].duration).to.equal(genLock3Dur)
      expect(result.rows[0].periods[2].amount).to.equal(genLock3Amount)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`getFioBalance for locksdk general lock token holder Expect: available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', { })
    //console.log(result)
    expect(result.available).to.equal(0)
  })

  it(`Failure test. Transfer 700 FIO from locksdk to userA1 FIO public key. Expect: insufficient balance tokens locked`, async () => {
    try {
    const result = await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 70000000000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log('Error: ', err)
      expect(err.json.fields[0].error).to.contain('Funds locked')
    }
  })

  it(`Transfer ${fundsAmount} FIO to locked account`, async () => {
    try {
      const result = await userA1.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: keys.publicKey,
        amount: 1000000000000,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Register domain for voting for locked account `, async () => {
    try {
      newFioDomain = generateFioDomain(15)
      const result = await locksdk.genericAction('registerFioDomain', {
        fioDomain: newFioDomain,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Register address for voting for locked account`, async () => {
    try {
      newFioAddress = generateFioAddress(newFioDomain,15)
      const result = await locksdk.genericAction('registerFioAddress', {
        fioAddress: newFioAddress,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Failure test. locksdk tries to stake tokens before it has voted. Expect: Error has not voted`, async () => {
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
      expect(err.json.fields[0].error).to.contain('has not voted')
    }
  })

  it(`Success. locksdk vote for producers.`, async () => {
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
      console.log("Error : ", err.json)
      expect(err).to.equal(null)
    }
  })

  it(`Failure test. locksdk stake tokens before any tokens are unlocked. Expect: Insufficient balance `, async () => {
    try {
     // console.log("address is ",newFioAddress)
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


  it(`Waiting 1 minute for unlock of 5000 FIO`, async () => {
    console.log("            waiting 65 seconds ")
  })

  it(` wait 65 seconds`, async () => {
    try {
      wait(65000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Transfer 1 FIO from locksdk to trigger update of locktokensv2`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call get_table_rows from locktokensv2. Confirm: payouts_performed = 1, remaining_lock_amount decreased`, async () => {
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
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal)
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal - genLock1Amount)
      expect(result.rows[0].payouts_performed).to.equal(1)  
      expect(result.rows[0].periods[0].duration).to.equal(genLock1Dur)
      expect(result.rows[0].periods[0].amount).to.equal(genLock1Amount)
      expect(result.rows[0].periods[1].duration).to.equal(genLock2Dur)
      expect(result.rows[0].periods[1].amount).to.equal(genLock2Amount)
      expect(result.rows[0].periods[2].duration).to.equal(genLock3Dur)
      expect(result.rows[0].periods[2].amount).to.equal(genLock3Amount)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Success. After unlock, transfer 700 FIO from locksdk to userA1`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 70000000000,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    }catch (err){
      console.log("ERROR: ", err)
    }
  })

  it(`Failure. Stake 6K tokens. Expect: Insufficient Balance `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 6000000000000,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log("Error : ", err.json)
      expect(err.json.fields[0].error).to.contain('Insufficient balance')
    }
  })

  it(`Success, stake ${stakeAmount/1000000000} tokens `, async () => {
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

  it(`Success, unstake ${unstake1 / 1000000000} tokens `, async () => {
    const result = await locksdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: newFioAddress,
        amount: unstake1,
        actor: accountnm,
        max_fee: config.maxFee,
        tpid:''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`Call get_table_rows from locktokensv2. Confirm: genlock1 removed from table, lock_amount updated, additional Staking period added at 2nd period`, async () => {
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
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal - genLock1Amount + unstake1)  // Unstake removes old locks, so this should update
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal - genLock1Amount + unstake1)  // Updated to reflect new amount. Will be same as lock_amount.
      expect(result.rows[0].payouts_performed).to.equal(0)  // Reset to 0 because genLock1 was removed and there are no longer any past payouts
      expect(result.rows[0].periods[0].duration).to.equal(genLock2Dur)
      expect(result.rows[0].periods[0].amount).to.equal(genLock2Amount)
      expect(result.rows[0].periods[1].duration).is.greaterThanOrEqual(UNSTAKELOCKDURATIONSECONDS)  // Hard to know this. It is 7 days + the time that has elapsed since the original record was created (the timestamp)
      lockDuration = result.rows[0].periods[1].duration  // Grab this to make sure it does not change later
      expect(result.rows[0].periods[1].amount).to.equal(unstake1)
      expect(result.rows[0].periods[2].duration).to.equal(genLock3Dur)
      expect(result.rows[0].periods[2].amount).to.equal(genLock3Amount)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Success, unstake ${unstake2 / 1000000000} tokens `, async () => {
    const result = await locksdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: newFioAddress,
        amount: unstake2,
        actor: accountnm,
        max_fee: config.maxFee,
        tpid:''
      }
    })
   // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`Call get_table_rows from locktokensv2. Confirm: existing Staking period periods[2] Amount updated`, async () => {
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
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal - genLock1Amount + unstake1 + unstake2)
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal - genLock1Amount + unstake1 + unstake2)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].duration).to.equal(genLock2Dur)
      expect(result.rows[0].periods[0].amount).to.equal(genLock2Amount)
      expect(result.rows[0].periods[1].duration).to.equal(lockDuration)
      expect(result.rows[0].periods[1].amount).to.equal(unstake1 + unstake2)
      expect(result.rows[0].periods[2].duration).to.equal(genLock3Dur)
      expect(result.rows[0].periods[2].amount).to.equal(genLock3Amount)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Success, unstake ${unstake3 / 1000000000} tokens `, async () => {
    try {
    const result = await locksdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: newFioAddress,
        amount: unstake3,
        actor: accountnm,
        max_fee: config.maxFee+1,
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

  it(`Call get_table_rows from locktokensv2. Confirm: existing Staking period periods[2] Amount updated`, async () => {
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
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal - genLock1Amount + unstake1 + unstake2 + unstake3)
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal - genLock1Amount + unstake1 + unstake2 + unstake3)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].duration).to.equal(genLock2Dur)
      expect(result.rows[0].periods[0].amount).to.equal(genLock2Amount)
      expect(result.rows[0].periods[1].duration).to.equal(lockDuration)
      expect(result.rows[0].periods[1].amount).to.equal(unstake1 + unstake2 + unstake3)
      expect(result.rows[0].periods[2].duration).to.equal(genLock3Dur)
      expect(result.rows[0].periods[2].amount).to.equal(genLock3Amount)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Failure, unstake 80M tokens, cannot unstake more than has been staked `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 80000000000000000,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
    }
  })

   it(`Success, unstake 190 tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 190000000000,
          actor: accountnm,
          max_fee: config.maxFee +1,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error :", err)
      expect(err).to.equal(null)
    }
  })

  it(`Success, unstake 115 tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 115000000000,
          actor: accountnm,
          max_fee: config.maxFee +1,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error :", err)
      expect(err).to.equal(null)
    }
  })

   it(`Success, unstake 185 tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 185000000000,
          actor: accountnm,
          max_fee: config.maxFee +1,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error :", err)
      expect(err).to.equal(null)
    }
  })
  //rapid fire unstaking forces the system to modify a pre existing period in the locks
  //with the unstaking lock info.

  it(`Success, unstake 5 tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 5000000000,
          actor: accountnm,
          max_fee: config.maxFee +1,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error :", err)
      expect(err).to.equal(null)
    }
  })
  it(`Success, unstake 4 tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 4000000000,
          actor: accountnm,
          max_fee: config.maxFee +1,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error :", err)
      expect(err).to.equal(null)
    }
  })
  it(`Success, unstake 3 tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 3000000000,
          actor: accountnm,
          max_fee: config.maxFee +1,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error :", err)
      expect(err).to.equal(null)
    }
  })
  it(`Success, unstake 2 tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 2000000000,
          actor: accountnm,
          max_fee: config.maxFee +1,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error :", err)
      expect(err).to.equal(null)
    }
  })
  it(`Success, unstake 1 tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 1000000000,
          actor: accountnm,
          max_fee: config.maxFee +1,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error :", err)
      expect(err).to.equal(null)
    }
  })
  it(`Success, unstake 5 tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 5000000000,
          actor: accountnm,
          max_fee: config.maxFee +2,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error :", err)
      expect(err).to.equal(null)
    }
  })
  it(`Success, unstake 4 tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 4000000000,
          actor: accountnm,
          max_fee: config.maxFee +2,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error :", err)
      expect(err).to.equal(null)
    }
  })
  it(`Success, unstake 3 tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 3000000000,
          actor: accountnm,
          max_fee: config.maxFee +2,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error :", err)
      expect(err).to.equal(null)
    }
  })
  it(`Success, unstake 2 tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 2000000000,
          actor: accountnm,
          max_fee: config.maxFee +2,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error :", err)
      expect(err).to.equal(null)
    }
  })
  it(`Success, unstake 1 tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 1000000000,
          actor: accountnm,
          max_fee: config.maxFee +2,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error :", err)
      expect(err).to.equal(null)
    }
  })
  it(`Success, unstake 5 tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 5000000000,
          actor: accountnm,
          max_fee: config.maxFee +3,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error :", err)
      expect(err).to.equal(null)
    }
  })
  it(`Success, unstake 4 tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 4000000000,
          actor: accountnm,
          max_fee: config.maxFee +3,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error :", err)
      expect(err).to.equal(null)
    }
  })
  it(`Success, unstake 3 tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 3000000000,
          actor: accountnm,
          max_fee: config.maxFee +3,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error :", err)
      expect(err).to.equal(null)
    }
  })
  it(`Success, unstake 2 tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 2000000000,
          actor: accountnm,
          max_fee: config.maxFee +3,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error :", err)
      expect(err).to.equal(null)
    }
  })
  it(`Success, unstake 1 tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 1000000000,
          actor: accountnm,
          max_fee: config.maxFee +3,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error :", err)
      expect(err).to.equal(null)
    }
  })

  it(`Call get_table_rows from locktokensv2. Confirm: existing Staking period periods[2] Amount updated`, async () => {
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
      console.log('Result: ', result);
      console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].duration).to.equal(genLock2Dur)
      expect(result.rows[0].periods[0].amount).to.equal(genLock2Amount)
      expect(result.rows[0].periods[1].duration).to.equal(lockDuration)
      expect(result.rows[0].periods[1].amount).to.be.greaterThan(unstake1 + unstake2 + unstake3)
      expect(result.rows[0].periods[2].duration).to.equal(genLock3Dur)
      expect(result.rows[0].periods[2].amount).to.equal(genLock3Amount)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

/*
  it(`Waiting 1 minutes for unlock`, async () => {
    console.log("            waiting 60 seconds ")
  })

  it(` wait 60 seconds`, async () => {
    try {
      wait(60000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, Transfer 700 FIO to userA1 FIO public key`, async () => {

    try {
      const result = await locksdk.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 70000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    }catch (err){
      console.log("ERROR: ", err)
    }
  })
*/
  //look at locks afterwards manually.
/*
  it(`Call get_table_rows from locktokens and confirm: lock period added correctly`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokens',
        lower_bound: accountnm,
        upper_bound: accountnm,
        key_type: 'i64',
        index_position: '2'
      }
      result = await callFioApi("get_table_rows", json);
      // console.log('Result: ', result);
      //console.log('periods : ', result.rows[0].periods[0].duration)
      expect(result.rows[0].periods[0].duration).to.equal(604800);
      expect(result.rows[0].periods[0].percent - 50).to.equal(0);
      expect(result.rows[0].periods[1].duration - 604800 ).greaterThan(4);
      expect(result.rows[0].periods[1].percent - 50).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })
*/
/*
  it(`Success, unstake 110 tokens `, async () => {

    const result = await locksdk.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: newFioAddress,
        amount: 110000000000,
        actor: accountnm,
        max_fee: config.maxFee,
        tpid:''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })
  */
/*
  it(`Success, unstake 2 tokens `, async () => {
    try {
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 20000000000,
          actor: accountnm,
          max_fee: config.maxFee +1,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR :", err.json)
      expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
    }
  })

*/
/*

  it(`Success, unstake 1 tokens `, async () => {
    try {
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 1000000000,
          actor: accountnm,
          max_fee: config.maxFee +1,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR :", err.json)
      expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
    }
  })
  */
})


describe(`B. Insert stake period in middle of locktokensv2 general locks, then unlock and unstake, skip two periods of general lock`, () => {

  let userA1, locksdk, keys, accountnm, newFioDomain, newFioAddress, lockDuration

  const genLock1Dur = 30, genLock1Amount = 5000000000000,  // 30 seconds minute, 5000 FIO
    genLock2Dur = 60, genLock2Amount = 4000000000000,     // 1 minute, 4000 FIO
    genLock3Dur = 1204800, genLock3Amount = 1000000000000  // 20080 minuteS, 1000 FIO

  const genLockTotal = genLock1Amount + genLock2Amount + genLock3Amount

  const fundsAmount = 1000000000000
  const stakeAmount = 1000000000000 // 1000 FIO
  const unstake1 = 100000000000     // 100 FIO
  const unstake2 = 2000000000       // 2 FIO
  const unstake3 = 2000000000       // 2 FIO

  it(`Create users`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();
    accountnm = await getAccountFromKey(keys.publicKey);
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    //console.log("locksdk priv key ", keys.privateKey);
    //console.log("locksdk pub key ", keys.publicKey);
    //console.log("locksdk Account name ", accountnm);
  })

  it(`trnsloctoks with three periods to locksdk: 5000 FIO - 1 min, 4000 FIO - 2 min, and 1000 FIO - 20080 minutes`, async () => {
    const result = await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: genLock1Dur,
            amount: genLock1Amount,
          },
          {
            duration: genLock2Dur,
            amount: genLock2Amount,
          },
          {
            duration: genLock3Dur,
            amount: genLock3Amount,
          }
        ],
        amount: genLockTotal,
        max_fee: config.maxFee,
        tpid: '',
        actor: config.FAUCET_ACCOUNT,
      }
    })
    expect(result.status).to.equal('OK')
  })

  it(`Call get_table_rows from locktokensv2 and confirm: three lock periods added correctly`, async () => {
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
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal)
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].duration).to.equal(genLock1Dur)
      expect(result.rows[0].periods[0].amount).to.equal(genLock1Amount)
      expect(result.rows[0].periods[1].duration).to.equal(genLock2Dur)
      expect(result.rows[0].periods[1].amount).to.equal(genLock2Amount)
      expect(result.rows[0].periods[2].duration).to.equal(genLock3Dur)
      expect(result.rows[0].periods[2].amount).to.equal(genLock3Amount)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`getFioBalance for locksdk general lock token holder Expect: available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})
    //console.log(result)
    expect(result.available).to.equal(0)
  })

  it(`Transfer ${fundsAmount} FIO to locked account`, async () => {
    try {
      const result = await userA1.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: keys.publicKey,
        amount: 1000000000000,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Register domain for voting for locked account `, async () => {
    try {
      newFioDomain = generateFioDomain(15)
      const result = await locksdk.genericAction('registerFioDomain', {
        fioDomain: newFioDomain,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Register address for voting for locked account`, async () => {
    try {
      newFioAddress = generateFioAddress(newFioDomain, 15)
      const result = await locksdk.genericAction('registerFioAddress', {
        fioAddress: newFioAddress,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Failure test. locksdk tries to stake tokens before it has voted. Expect: Error has not voted`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 1000000000000,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log("Error : ", err.json)
      expect(err.json.fields[0].error).to.contain('has not voted')
    }
  })

  it(`Success. locksdk vote for producers.`, async () => {
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
      console.log("Error : ", err.json)
      expect(err).to.equal(null)
    }
  })

  it(`Failure test. locksdk stake tokens before any tokens are unlocked. Expect: Insufficient balance `, async () => {
    try {
      // console.log("address is ",newFioAddress)
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 1000000000000,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log("Error : ", err.json)
      expect(err.json.fields[0].error).to.contain('Insufficient balance')
    }
  })


  it(`Waiting 1 minute for unlock of genlock1 (5000 FIO) AND genlock2 (4000 FIO)`, async () => {
    console.log("            waiting 65 seconds ")
  })

  it(` wait 65 seconds`, async () => {
    try {
      wait(65000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Transfer 1 FIO from locksdk to trigger update of locktokensv2`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call get_table_rows from locktokensv2. Confirm: payouts_performed = 2, remaining_lock_amount decreased`, async () => {
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
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal)
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal - genLock1Amount - genLock2Amount)
      expect(result.rows[0].payouts_performed).to.equal(2)
      expect(result.rows[0].periods[0].duration).to.equal(genLock1Dur)
      expect(result.rows[0].periods[0].amount).to.equal(genLock1Amount)
      expect(result.rows[0].periods[1].duration).to.equal(genLock2Dur)
      expect(result.rows[0].periods[1].amount).to.equal(genLock2Amount)
      expect(result.rows[0].periods[2].duration).to.equal(genLock3Dur)
      expect(result.rows[0].periods[2].amount).to.equal(genLock3Amount)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Success. After unlock, transfer 700 FIO from locksdk to userA1`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 70000000000,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  })

  it(`Success, stake ${stakeAmount / 1000000000} tokens `, async () => {
    const result = await locksdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: newFioAddress,
        amount: stakeAmount,
        actor: accountnm,
        max_fee: config.maxFee,
        tpid: ''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`Success, unstake ${unstake1 / 1000000000} tokens `, async () => {
    const result = await locksdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: newFioAddress,
        amount: unstake1,
        actor: accountnm,
        max_fee: config.maxFee,
        tpid: ''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`Call get_table_rows from locktokensv2. Confirm: genlock1 removed from table, lock_amount updated, additional Staking period added at 2nd period`, async () => {
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
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal - genLock1Amount - genLock2Amount + unstake1)  // Unstake removes old locks, so this should update
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal - genLock1Amount - genLock2Amount + unstake1)  // Updated to reflect new amount. Will be same as lock_amount.
      expect(result.rows[0].payouts_performed).to.equal(0)  // Reset to 0 because genLock1 was removed and there are no longer any past payouts
      expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(UNSTAKELOCKDURATIONSECONDS)  // Hard to know this. It is 7 days + the time that has elapsed since the original record was created (the timestamp)
      lockDuration = result.rows[0].periods[0].duration  // Grab this to make sure it does not change later
      expect(result.rows[0].periods[0].amount).to.equal(unstake1)
      expect(result.rows[0].periods[1].duration).to.equal(genLock3Dur)
      expect(result.rows[0].periods[1].amount).to.equal(genLock3Amount)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Success, unstake ${unstake2 / 1000000000} tokens `, async () => {
    const result = await locksdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: newFioAddress,
        amount: unstake2,
        actor: accountnm,
        max_fee: config.maxFee,
        tpid: ''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`Call get_table_rows from locktokensv2. Confirm: existing Staking period periods[2] Amount updated`, async () => {
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
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal - genLock1Amount - genLock2Amount + unstake1 + unstake2)
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal - genLock1Amount - genLock2Amount + unstake1 + unstake2)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].duration).to.equal(lockDuration)
      expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2)
      expect(result.rows[0].periods[1].duration).to.equal(genLock3Dur)
      expect(result.rows[0].periods[1].amount).to.equal(genLock3Amount)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Success, unstake ${unstake3 / 1000000000} tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: unstake3,
          actor: accountnm,
          max_fee: config.maxFee + 1,
          tpid: ''
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Call get_table_rows from locktokensv2. Confirm: existing Staking period periods[2] Amount updated`, async () => {
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
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal - genLock1Amount - genLock2Amount + unstake1 + unstake2 + unstake3)
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal - genLock1Amount - genLock2Amount + unstake1 + unstake2 + unstake3)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].duration).to.equal(lockDuration)
      expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2 + unstake3)
      expect(result.rows[0].periods[1].duration).to.equal(genLock3Dur)
      expect(result.rows[0].periods[1].amount).to.equal(genLock3Amount)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Failure, unstake 80M tokens, cannot unstake more than has been staked `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 80000000000000000,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
    }
  })

})


describe(`C. Insert stake period at END of locktokensv2 general locks, then unlock and unstake`, () => {

  let userA1, locksdk, keys, accountnm, newFioDomain, newFioAddress, lockDuration

  const genLock1Dur = 30, genLock1Amount = 5000000000000,  // 0.5 minute, 5000 FIO
    genLock2Dur = 60, genLock2Amount = 4000000000000     // 1 minute, 4000 FIO

  const genLockTotal = genLock1Amount + genLock2Amount

  const fundsAmount = 3000000000000 // 3000
  const stakeAmount = 800000000000 // 800 FIO
  const unstake1 = 100000000000     // 100 FIO
  const unstake2 = 2000000000       // 2 FIO
  const unstake3 = 2000000000       // 2 FIO

  it(`Create users`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();
    accountnm = await getAccountFromKey(keys.publicKey);
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    //console.log("locksdk priv key ", keys.privateKey);
    //console.log("locksdk pub key ", keys.publicKey);
    //console.log("locksdk Account name ", accountnm);
  })

  it(`trnsloctoks with three periods to locksdk: 5000 FIO - 1 min, 4000 FIO - 2 min`, async () => {
    const result = await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: genLock1Dur,
            amount: genLock1Amount,
          },
          {
            duration: genLock2Dur,
            amount: genLock2Amount,
          }
        ],
        amount: genLockTotal,
        max_fee: config.maxFee,
        tpid: '',
        actor: config.FAUCET_ACCOUNT,
      }
    })
    expect(result.status).to.equal('OK')
  })

  it(`Call get_table_rows from locktokensv2 and confirm: two lock periods added correctly`, async () => {
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
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal)
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].duration).to.equal(genLock1Dur)
      expect(result.rows[0].periods[0].amount).to.equal(genLock1Amount)
      expect(result.rows[0].periods[1].duration).to.equal(genLock2Dur)
      expect(result.rows[0].periods[1].amount).to.equal(genLock2Amount)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`getFioBalance for locksdk general lock token holder Expect: available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})
    //console.log(result)
    expect(result.available).to.equal(0)
  })

  it(`Transfer ${fundsAmount} FIO to locked account`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: keys.publicKey,
        amount: fundsAmount,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Register domain for voting for locked account `, async () => {
    try {
      newFioDomain = generateFioDomain(15)
      const result = await locksdk.genericAction('registerFioDomain', {
        fioDomain: newFioDomain,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Register address for voting for locked account`, async () => {
    try {
      newFioAddress = generateFioAddress(newFioDomain, 15)
      const result = await locksdk.genericAction('registerFioAddress', {
        fioAddress: newFioAddress,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Success. locksdk vote for producers.`, async () => {
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
      console.log("Error : ", err.json)
      expect(err).to.equal(null)
    }
  })

  it(`getFioBalance for locksdk general lock token holder Expect: available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})
    //console.log(result)
    expect(result.available).is.greaterThan(0)
  })

  it(`Success, stake ${stakeAmount / 1000000000} FIO `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: stakeAmount,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err.json)
      expect(err).to.equal(null)
    }
  })

  it(`Success, unstake ${unstake1 / 1000000000} FIO (BUG-2749)`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: unstake1,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err.json)
      expect(err).to.equal(null)
    }
  })

  it(`Call get_table_rows from locktokensv2. Confirm: lock_amount updated, additional Staking period added at end`, async () => {
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
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal + unstake1)  
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal + unstake1)  
      expect(result.rows[0].payouts_performed).to.equal(0) 
      expect(result.rows[0].periods[0].duration).to.equal(genLock1Dur)
      expect(result.rows[0].periods[0].amount).to.equal(genLock1Amount)
      expect(result.rows[0].periods[1].duration).to.equal(genLock2Dur)
      expect(result.rows[0].periods[1].amount).to.equal(genLock2Amount)
      expect(result.rows[0].periods[2].duration).is.greaterThanOrEqual(UNSTAKELOCKDURATIONSECONDS)  // Hard to know this. It is 7 days + the time that has elapsed since the original record was created (the timestamp)
      lockDuration = result.rows[0].periods[2].duration  // Grab this to make sure it does not change later
      expect(result.rows[0].periods[2].amount).to.equal(unstake1)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Failure. Re-Transfer ${fundsAmount} FIO to locked account. Expect: `, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: keys.publicKey,
        amount: fundsAmount,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Waiting 30 seconds for unlock of genlock1 (5000 FIO)`, async () => {
    console.log("            waiting 35 seconds ")
  })

  it(` wait 35 seconds`, async () => {
    try {
      wait(35000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Transfer 1 FIO from locksdk to trigger update of locktokensv2`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call get_table_rows from locktokensv2. Confirm: payouts_performed = 1, remaining_lock_amount decreased`, async () => {
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
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal + unstake1) 
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal + unstake1 - genLock1Amount)  // Subtract first lock amount.
      expect(result.rows[0].payouts_performed).to.equal(1)  // Changed to 1 to reflect initial period unlock.
      expect(result.rows[0].periods[0].duration).to.equal(genLock1Dur)
      expect(result.rows[0].periods[0].amount).to.equal(genLock1Amount)
      expect(result.rows[0].periods[1].duration).to.equal(genLock2Dur)
      expect(result.rows[0].periods[1].amount).to.equal(genLock2Amount)
      expect(result.rows[0].periods[2].duration).is.greaterThanOrEqual(lockDuration)
      expect(result.rows[0].periods[2].amount).to.equal(unstake1)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Success, unstake ${unstake2 / 1000000000} tokens `, async () => {
    const result = await locksdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: newFioAddress,
        amount: unstake2,
        actor: accountnm,
        max_fee: config.maxFee,
        tpid: ''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`Call get_table_rows from locktokensv2. Confirm: existing Staking Amount updated, lock_amount and remaining_lock_amount updated, first lock removed`, async () => {
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
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal + unstake1 + unstake2 - genLock1Amount)
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal + unstake1 + unstake2 - genLock1Amount) 
      expect(result.rows[0].payouts_performed).to.equal(0)  // Changed to 0 since unstake removes old locks.
      expect(result.rows[0].periods[0].duration).to.equal(genLock2Dur)
      expect(result.rows[0].periods[0].amount).to.equal(genLock2Amount)
      expect(result.rows[0].periods[1].duration).is.greaterThanOrEqual(lockDuration)
      expect(result.rows[0].periods[1].amount).to.equal(unstake1 + unstake2)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Waiting 30 seconds for unlock of genlock2 (4000 FIO)`, async () => {
    console.log("            waiting 35 seconds ")
  })

  it(` wait 35 seconds`, async () => {
    try {
      wait(35000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Transfer 1 FIO from locksdk to trigger update of locktokensv2`, async () => {
    try {
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 1000000000,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call get_table_rows from locktokensv2. Confirm: remaining_lock_amount updated, payouts_performed updated`, async () => {
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
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal + unstake1 + unstake2 - genLock1Amount)
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal + unstake1 + unstake2 - genLock1Amount - genLock2Amount)
      expect(result.rows[0].payouts_performed).to.equal(1) 
      expect(result.rows[0].periods[0].duration).to.equal(genLock2Dur)
      expect(result.rows[0].periods[0].amount).to.equal(genLock2Amount)
      expect(result.rows[0].periods[1].duration).is.greaterThanOrEqual(lockDuration)
      expect(result.rows[0].periods[1].amount).to.equal(unstake1 + unstake2)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Success, unstake ${unstake3 / 1000000000} tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: unstake3,
          actor: accountnm,
          max_fee: config.maxFee + 1,
          tpid: ''
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Call get_table_rows from locktokensv2. Confirm: existing Staking period periods[2] Amount updated`, async () => {
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
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal + unstake1 + unstake2 + unstake3 - genLock1Amount - genLock2Amount)
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal + unstake1 + unstake2 + unstake3 - genLock1Amount - genLock2Amount)
      expect(result.rows[0].payouts_performed).to.equal(0)  // Changed to 0 since unstake removes old locks.
      expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
      expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2 + unstake3)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})


describe(`D. Insert stake period at BEGINNING of locktokensv2 general locks. No testing of unlock/unstake (would require update of unstake period)`, () => {

  let locksdk, keys, accountnm, newFioDomain, newFioAddress

  const genLock1Dur = UNSTAKELOCKDURATIONSECONDS + 100000, genLock1Amount = 5000000000000,  // 0.5 minute, 5000 FIO
    genLock2Dur = UNSTAKELOCKDURATIONSECONDS + 200000, genLock2Amount = 4000000000000     // 1 minute, 4000 FIO

  const genLockTotal = genLock1Amount + genLock2Amount

  const fundsAmount = 3000000000000 // 3000
  const stakeAmount = 800000000000 // 800 FIO
  const unstake1 = 100000000000     // 100 FIO

  it(`Create users`, async () => {

    keys = await createKeypair();
    accountnm = await getAccountFromKey(keys.publicKey);
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    //console.log("locksdk priv key ", keys.privateKey);
    //console.log("locksdk pub key ", keys.publicKey);
    //console.log("locksdk Account name ", accountnm);
  })

  it(`trnsloctoks with three periods to locksdk: 5000 FIO - 1 min, 4000 FIO - 2 min`, async () => {
    const result = await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: genLock1Dur,
            amount: genLock1Amount,
          },
          {
            duration: genLock2Dur,
            amount: genLock2Amount,
          }
        ],
        amount: genLockTotal,
        max_fee: config.maxFee,
        tpid: '',
        actor: config.FAUCET_ACCOUNT,
      }
    })
    expect(result.status).to.equal('OK')
  })

  it(`Try to do another trnsloctoks. Expect: Locked tokens can only be transferred to new account`, async () => {
    try { 
      const result = await faucet.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: genLock1Dur,
              amount: genLock1Amount + 1,
            },
            {
              duration: genLock2Dur,
              amount: genLock2Amount + 1,
            }
          ],
          amount: genLockTotal + 2,
          max_fee: config.maxFee,
          tpid: '',
          actor: config.FAUCET_ACCOUNT,
        }
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log('Error', err.json);
      expect(err.json.fields[0].error).to.equal('Locked tokens can only be transferred to new account');
    }
  })

  it(`Call get_table_rows from locktokensv2 and confirm: two lock periods added correctly`, async () => {
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
      console.log('Result: ', result);
      console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal)
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].duration).to.equal(genLock1Dur)
      expect(result.rows[0].periods[0].amount).to.equal(genLock1Amount)
      expect(result.rows[0].periods[1].duration).to.equal(genLock2Dur)
      expect(result.rows[0].periods[1].amount).to.equal(genLock2Amount)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`getFioBalance for locksdk general lock token holder Expect: available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})
    //console.log(result)
    expect(result.available).to.equal(0)
  })

  it(`Transfer ${fundsAmount} FIO to locked account`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: keys.publicKey,
        amount: fundsAmount,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Register domain for voting for locked account `, async () => {
    try {
      newFioDomain = generateFioDomain(15)
      const result = await locksdk.genericAction('registerFioDomain', {
        fioDomain: newFioDomain,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Register address for voting for locked account`, async () => {
    try {
      newFioAddress = generateFioAddress(newFioDomain, 15)
      const result = await locksdk.genericAction('registerFioAddress', {
        fioAddress: newFioAddress,
        maxFee: config.maxFee,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Success. locksdk vote for producers.`, async () => {
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
      console.log("Error : ", err.json)
      expect(err).to.equal(null)
    }
  })

  it(`getFioBalance for locksdk general lock token holder Expect: available balance 0 `, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})
    //console.log(result)
    expect(result.available).is.greaterThan(0)
  })

  it(`Success, stake ${stakeAmount / 1000000000} FIO `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: stakeAmount,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err.json)
      expect(err).to.equal(null)
    }
  })

  it(`Success, unstake ${unstake1 / 1000000000} FIO (BUG-2749)`, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: unstake1,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err.json)
      expect(err).to.equal(null)
    }
  })

  it(`Call get_table_rows from locktokensv2. Confirm: lock_amount updated, additional Staking period added at beginning`, async () => {
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
      console.log('Result: ', result);
      console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal + unstake1)
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal + unstake1)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(UNSTAKELOCKDURATIONSECONDS)  // Hard to know this. It is 7 days + the time that has elapsed since the original record was created (the timestamp)
      expect(result.rows[0].periods[0].amount).to.equal(unstake1)
      expect(result.rows[0].periods[1].duration).to.equal(genLock1Dur)
      expect(result.rows[0].periods[1].amount).to.equal(genLock1Amount)
      expect(result.rows[0].periods[2].duration).to.equal(genLock2Dur)
      expect(result.rows[0].periods[3].amount).to.equal(genLock2Amount)

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})