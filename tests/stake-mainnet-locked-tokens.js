require('mocha')
const {expect} = require('chai')
const {newUser, existingUser,callFioApi,fetchJson, generateFioDomain, getAccountFromKey, generateFioAddress, createKeypair} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

const GENESIS_LOCK_PERIOD = 60;

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

describe(`************************** stake-mainet-locked-tokens.js ************************** \n    A. Stake tokens genesis lock account`, () => {



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

  // after making these modifications rebuild the contracts locally and restart your chain.
  // hou may then proceed with genesis locks testing.

  //




  let userA1, prevFundsAmount, locksdk, keys, accountnm,newFioDomain, newFioAddress
  const fundsAmount = 1000000000000
  const lockdurationseconds = 60


  it(`Create users`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();
    console.log("priv key ", keys.privateKey);
    console.log("pub key ", keys.publicKey);
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

  it(`getFioBalance for genesis lock token holder (xbfugtkzvowu), available balance 0 `, async () => {
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

  it(` wait for lock period`, async () => {
    try {
      wait(lockdurationseconds * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, Transfer 700 FIO to userA1 FIO public key`, async () => {

    try {
      const result = await locksdk.genericAction('transferTokens', {
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
      expect(result.rows[0].periods[0].duration).to.equal(GENESIS_LOCK_PERIOD);
     // expect(result.rows[0].periods[0].percent - 100).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

   it(`Failure, unstake 75M tokens, cannot unstake more than has been staked `, async () => {
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
     // console.log('Result: ', result)
     expect(result.status).to.not.equal('OK')
   } catch (err) {
     expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
     }
    })

  it(`Waiting 5 seconds to unstake next 500 tokens`, async () => {
    console.log("            waiting 5 seconds ")
  })

  it(` wait 5 seconds`, async () => {
    try {
      wait(5000)
    } catch (err) {
      console.log('Error', err)
    }
  })

   it(`Success, unstake 100 tokens `, async () => {
   try {
    const result = await locksdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: newFioAddress,
        amount: 100000000000,
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
      expect(result.rows[0].periods[0].duration).to.equal(GENESIS_LOCK_PERIOD);
     // expect(result.rows[0].periods[0].percent - 50).to.equal(0);
     // expect(result.rows[0].periods[1].duration - 604800 ).greaterThan(4);
     // expect(result.rows[0].periods[1].percent - 50).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
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
      console.log("ERROR :", err.json)
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
      console.log("ERROR :", err.json)
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
      console.log("ERROR :", err.json)
      expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
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
      console.log("ERROR :", err.json)
      expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
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
      console.log("ERROR :", err.json)
      expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
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
      console.log("ERROR :", err.json)
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
      console.log("ERROR :", err.json)
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
      console.log("ERROR :", err.json)
      expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
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
      console.log("ERROR :", err.json)
      expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
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
      console.log("ERROR :", err.json)
      expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
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
      console.log("ERROR :", err.json)
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
      console.log("ERROR :", err.json)
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
      console.log("ERROR :", err.json)
      expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
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
      console.log("ERROR :", err.json)
      expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
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
      console.log("ERROR :", err.json)
      expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
    }
  })

  //some really small amounts.
  it(`Success, unstake .01 tokens `, async () => {
    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 0010000000,
          actor: accountnm,
          max_fee: config.maxFee +3,
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

})

