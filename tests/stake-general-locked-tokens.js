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

describe.only(`************************** stake-general-locked-tokens.js ************************** \n    A. Stake tokens genesis lock account`, () => {
  //FIP-21 tests for general lock accounts performing staking

  let userA1, locksdk, keys, accountnm, newFioDomain, newFioAddress

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

    console.log("locksdk priv key ", keys.privateKey);
    console.log("locksdk pub key ", keys.publicKey);
    console.log("locksdk Account name ", accountnm);
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
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
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
      console.log('Result: ', result);
      console.log('periods : ', result.rows[0].periods)
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

  it(`BUG BD-2745 - Call get_table_rows from locktokensv2. Confirm: payouts_performed = 1, remaining_lock_amount increased`, async () => {
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

  it(`BUG BD-2746 - Call get_table_rows from locktokensv2. Confirm: additional Staking period added at periods[2]`, async () => {
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
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal - genLock1Amount)
      expect(result.rows[0].payouts_performed).to.equal(1)
      expect(result.rows[0].periods[0].duration).to.equal(genLock1Dur)
      expect(result.rows[0].periods[0].amount).to.equal(genLock1Amount)
      expect(result.rows[0].periods[1].duration).to.equal(genLock2Dur)
      expect(result.rows[0].periods[1].amount).to.equal(genLock2Amount)
      expect(result.rows[0].periods[2].duration).to.equal(UNSTAKELOCKDURATIONSECONDS)
      expect(result.rows[0].periods[2].amount).to.equal(unstake1)
      expect(result.rows[0].periods[3].duration).to.equal(genLock3Dur)
      expect(result.rows[0].periods[3].amount).to.equal(genLock3Amount)
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
      console.log('Result: ', result);
      console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal)
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal - genLock1Amount)
      expect(result.rows[0].payouts_performed).to.equal(1)
      expect(result.rows[0].periods[0].duration).to.equal(genLock1Dur)
      expect(result.rows[0].periods[0].amount).to.equal(genLock1Amount)
      expect(result.rows[0].periods[1].duration).to.equal(genLock2Dur)
      expect(result.rows[0].periods[1].amount).to.equal(genLock2Amount)
      expect(result.rows[0].periods[2].duration).to.equal(UNSTAKELOCKDURATIONSECONDS)
      expect(result.rows[0].periods[2].amount).to.equal(unstake1 + unstake2)
      expect(result.rows[0].periods[3].duration).to.equal(genLock3Dur)
      expect(result.rows[0].periods[3].amount).to.equal(genLock3Amount)
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
      console.log('Result: ', result);
      console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(genLockTotal)
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal - genLock1Amount)
      expect(result.rows[0].payouts_performed).to.equal(1)
      expect(result.rows[0].periods[0].duration).to.equal(genLock1Dur)
      expect(result.rows[0].periods[0].amount).to.equal(genLock1Amount)
      expect(result.rows[0].periods[1].duration).to.equal(genLock2Dur)
      expect(result.rows[0].periods[1].amount).to.equal(genLock2Amount)
      expect(result.rows[0].periods[2].duration).to.equal(UNSTAKELOCKDURATIONSECONDS)
      expect(result.rows[0].periods[2].amount).to.equal(unstake1 + unstake2 + unstake3)
      expect(result.rows[0].periods[3].duration).to.equal(genLock3Dur)
      expect(result.rows[0].periods[3].amount).to.equal(genLock3Amount)
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
      expect(result.rows[0].lock_amount).to.equal(genLockTotal)
      expect(result.rows[0].remaining_lock_amount).to.equal(genLockTotal - genLock1Amount)
      expect(result.rows[0].payouts_performed).to.equal(1)
      expect(result.rows[0].periods[0].duration).to.equal(genLock1Dur)
      expect(result.rows[0].periods[0].amount).to.equal(genLock1Amount)
      expect(result.rows[0].periods[1].duration).to.equal(genLock2Dur)
      expect(result.rows[0].periods[1].amount).to.equal(genLock2Amount)
      expect(result.rows[0].periods[2].duration).to.equal(UNSTAKELOCKDURATIONSECONDS)
      expect(result.rows[0].periods[2].amount).to.be.greaterThan(unstake1 + unstake2 + unstake3)
      expect(result.rows[0].periods[3].duration).to.equal(genLock3Dur)
      expect(result.rows[0].periods[3].amount).to.equal(genLock3Amount)
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

