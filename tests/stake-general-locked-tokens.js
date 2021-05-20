require('mocha')
const {expect} = require('chai')
const {newUser, existingUser,callFioApi,fetchJson, generateFioDomain, generateFioAddress, createKeypair} = require('../utils.js');
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

describe(`************************** stake-general-locked-tokens.js ************************** \n    A. Stake tokens genesis lock account`, () => {

  //NOTE -- these tests use a general locked token holder account that is initialized
  // by running the fio.devtools script named 20_debug_staking.sh. Init the chain then run this set
  // of tests immediately after.
  /*
  #   try to transfer more fio than the user has available (this should error).
#   try to transfer an amount that can be transferred (this should transfer)
#   try to stake more than you have available unlocked( this should fail)
#   try to stake 1/2 of the unlocked balance (this should succeed)
#   try to unstake more than you have staked (this should fail)
#   try to unstake less than what you have staked (this should succeed)
#   verify contents of staking table after stake and unstake.
#   verify the contents of the lock tokens table after unstake (the lock should be adapted and contain one new lock period)
   */
  //
  /*
# Create locked token account
#Public key: 'FIO5xGfMyRCVSAhQW1ZAngvvJmwD12NwTf22sgvJoNT1YXcvsZ1Ei'
#private key 5Jo3XKAh4yu8xyvkaRXjPLeSW4RWmcZwGF5EuoZTQ8CqHP8K5tq
#FIO Public Address (actor name): 'gcz2iidl51fy'
   */

  let userA1, prevFundsAmount, locksdk
  const fundsAmount = 1000000000000


  it(`Create users`, async () => {
    userA1 = await newUser(faucet);
    locksdk = await existingUser('gcz2iidl51fy', '5Jo3XKAh4yu8xyvkaRXjPLeSW4RWmcZwGF5EuoZTQ8CqHP8K5tq', 'FIO5xGfMyRCVSAhQW1ZAngvvJmwD12NwTf22sgvJoNT1YXcvsZ1Ei', 'dapixdev', 'general1@dapixdev');

  })

  it(`getFioBalance for general lock token holder (gcz2iidl51fy), available balance 0 `, async () => {
      const result = await locksdk.sdk.genericAction('getFioBalance', { })
    //console.log(result)
      prevFundsAmount = result.balance
      expect(result.available).to.equal(0)
  })

  it(`Failure test Transfer 700 FIO to userA1 FIO public key, insufficient balance tokens locked`, async () => {
    try {
    const result = await locksdk.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 70000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log('Error: ', err)
      expect(err.json.fields[0].error).to.contain('Funds locked')
    }
  })

  it(`Failure test stake tokens before unlocking, Error Insufficient balance `, async () => {
    try {
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 1000000000000,
          actor: locksdk.account,
          max_fee: config.maxFee,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
     // console.log("Error : ", err.json)
      expect(err.json.fields[0].error).to.contain('Insufficient balance')
    }
  })

  it(`Success, vote for producers.`, async () => {

    try {
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address:'general1@dapixdev',
          actor: locksdk.account,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      // console.log("Error : ", err.json)
      expect(err.json.fields[0].error).to.contain('has not voted')
    }
  })

  it(`Waiting 2 minutes for unlock`, async () => {
    console.log("            waiting 120 seconds ")
  })

  it(` wait 120 seconds`, async () => {
    try {
      wait(120000)
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

  it(`Success, stake 1k tokens `, async () => {

      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 1000000000000,
          actor: locksdk.account,
          max_fee: config.maxFee,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
  })

  it(`Success, unstake 110 tokens `, async () => {

    const result = await locksdk.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: locksdk.fio_address,
        amount: 110000000000,
        actor: locksdk.account,
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
        table: 'locktokens',
        lower_bound: locksdk.account,
        upper_bound: locksdk.account,
        key_type: 'i64',
        index_position: '2'
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].periods[2].duration - 604800).greaterThan(120);
     // expect(result.rows[0].periods[2].percent - 4.763).lessThan(0.001);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

   it(`Failure, unstake 75M tokens, cannot unstake more than has been staked `, async () => {
   try {
    const result = await locksdk.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: locksdk.fio_address,
        amount: 80000000000000000,
        actor: locksdk.account,
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

   it(`Success, unstake 190 tokens `, async () => {
   try {
    const result = await locksdk.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: locksdk.fio_address,
        amount: 190000000000,
        actor: locksdk.account,
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

   it(`Success, unstake 115 tokens `, async () => {
    try {
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 115000000000,
          actor: locksdk.account,
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

   it(`Success, unstake 185 tokens `, async () => {
    try {
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 185000000000,
          actor: locksdk.account,
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
  //rapid fire unstaking forces the system to modify a pre existing period in the locks
  //with the unstaking lock info.
  it(`Success, unstake 5 tokens `, async () => {
    try {
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 5000000000,
          actor: locksdk.account,
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
  it(`Success, unstake 4 tokens `, async () => {
    try {
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 4000000000,
          actor: locksdk.account,
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
  it(`Success, unstake 3 tokens `, async () => {
    try {
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 3000000000,
          actor: locksdk.account,
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
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 2000000000,
          actor: locksdk.account,
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
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 1000000000,
          actor: locksdk.account,
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
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 5000000000,
          actor: locksdk.account,
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
  it(`Success, unstake 4 tokens `, async () => {
    try {
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 4000000000,
          actor: locksdk.account,
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
  it(`Success, unstake 3 tokens `, async () => {
    try {
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 3000000000,
          actor: locksdk.account,
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
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 2000000000,
          actor: locksdk.account,
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
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 1000000000,
          actor: locksdk.account,
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
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 5000000000,
          actor: locksdk.account,
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
  it(`Success, unstake 4 tokens `, async () => {
    try {
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 4000000000,
          actor: locksdk.account,
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
  it(`Success, unstake 3 tokens `, async () => {
    try {
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 3000000000,
          actor: locksdk.account,
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
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 2000000000,
          actor: locksdk.account,
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
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 1000000000,
          actor: locksdk.account,
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

  //look at locks afterwards manually.
/*
  it(`Call get_table_rows from locktokens and confirm: lock period added correctly`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokens',
        lower_bound: locksdk.account,
        upper_bound: locksdk.account,
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
        fio_address: locksdk.fio_address,
        amount: 110000000000,
        actor: locksdk.account,
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
          fio_address: locksdk.fio_address,
          amount: 2000000000,
          actor: locksdk.account,
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
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 1000000000,
          actor: locksdk.account,
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

