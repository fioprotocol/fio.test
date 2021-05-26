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

describe(`************************** stake-mainet-locked-tokens.js ************************** \n    A. Stake tokens genesis lock account`, () => {

  //NOTE -- these tests use a main net (or genesis) locked token holder account that is initialized
  // by running the fio.devtools script named 20_debug_staking.sh. Init the chain then run this set
  // of tests immediately after. This set of tests assumes that the unlocking periods are modified
  // in the fio protocol by editing the fio.token.hpp file to contain the following locking periods
  /*
                    //TEST LOCKED TOKENS
                    // TESTING ONLY!!! shorten genesis locking periods..DO NOT DELIVER THIS
                    uint32_t daysSinceGrant =  (int)((present_time  - lockiter->timestamp) / 60);
                    uint32_t firstPayPeriod = 2;
                    uint32_t payoutTimePeriod = 2;

   */

  //

  /*
# Create locked token account
#Public key: 'FIO8WaU8ZT9YLixZZ41uHiYmkoRSZHgCR3anfL3YupC3boQpwvXqG'
#private key 5JwmDtsJDTY2M3h9bsXZDD2tHPj3UgQf7FVpptaLeC7NzxeXnXu
#FIO Public Address (actor name): 'xbfugtkzvowu'
   */

  let userA1, prevFundsAmount, locksdk
  const fundsAmount = 1000000000000


  it(`Create users`, async () => {
    userA1 = await newUser(faucet);
    locksdk = await existingUser('xbfugtkzvowu', '5JwmDtsJDTY2M3h9bsXZDD2tHPj3UgQf7FVpptaLeC7NzxeXnXu', 'FIO8WaU8ZT9YLixZZ41uHiYmkoRSZHgCR3anfL3YupC3boQpwvXqG', 'dapixdev', 'genesis1@dapixdev');

  })

  it(`getFioBalance for genesis lock token holder (xbfugtkzvowu), available balance 0 `, async () => {
      const result = await locksdk.sdk.genericAction('getFioBalance', { })
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
      expect(err.json.fields[0].error).to.contain(config.error.insufficientBalance)
    }
  })

  it(`Failure test stake tokens before user has voted, Error has not voted`, async () => {
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
      expect(err.json.fields[0].error).to.contain('has not voted')
    }
  })

  it(`Success, vote for producers.`, async () => {

    try {
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address:'genesis1@dapixdev',
          actor: locksdk.account,
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
      //console.log("Error : ", err.json)
      expect(err.json.fields[0].error).to.contain('Insufficient balance')
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

  it(`Success, unstake 500 tokens `, async () => {

    const result = await locksdk.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: locksdk.fio_address,
        amount: 500000000000,
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
     // console.log('Result: ', result);
      //console.log('periods : ', result.rows[0].periods[0].duration)
      expect(result.rows[0].periods[0].duration).to.equal(604800);
      expect(result.rows[0].periods[0].percent - 100).to.equal(0);
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
    const result = await locksdk.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: locksdk.fio_address,
        amount: 100000000000,
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

  //some really small amounts.
  it(`Success, unstake .01 tokens `, async () => {
    try {
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 0010000000,
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

})

