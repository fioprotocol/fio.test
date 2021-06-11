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

describe(`************************** stake-regression.js ************************** \n    A. Stake tokens genesis lock account`, () => {

  //NOTE -- these tests are general regression tests for staking.
  //they require the running of the 20_debug_staking script at chain startup.
  /*
     the use the following account
     #create an account with 1M FIO
     #Private key: 5Ke8oZdtefgVEC6GDUeo7FW9xC7WgdxC9Fi92b3YmTrPynWb4Rb
     #Public key: FIO6ydLCnUfsEMpbp35kF8oaUbHvcmLEyswMUF75C4FQAm78DUhAi
     #FIO Public Address (actor name): ni1eyydbdpht

     to run these tests, init the chain, then run these tests.
     to rerun, restart the chain cleanly then run these tests.
   */

  /*
    first setup the chain with 1M in staking.
       set up account with more than 1M in fio.
       stake 1M fio.
    parameter tests
    stakefio -- parameters
    stakefio -- nominal
        stake all that the account has.
        check that transfer fails.
        check that staking attempts fail.
    unstakefio --
         unstake more than account has.
         unstake less than the amount the account has.
         unstake the rest of what the account has.
         try to unstake again (fail).



   */


  let userA1, prevFundsAmount, locksdk
  const fundsAmount = 1000000000000


  it(`Create users`, async () => {
    userA1 = await newUser(faucet);
    locksdk = await existingUser('ni1eyydbdpht', '5Ke8oZdtefgVEC6GDUeo7FW9xC7WgdxC9Fi92b3YmTrPynWb4Rb', 'FIO6ydLCnUfsEMpbp35kF8oaUbHvcmLEyswMUF75C4FQAm78DUhAi', 'dapixdev', 'stake@dapixdev');

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
          fio_address:'stake@dapixdev',
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


  it(`Success, stake 900k tokens `, async () => {

      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 900000000000000,
          actor: locksdk.account,
          max_fee: config.maxFee,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
  })

  it(`Failure test Transfer 700k FIO to userA1 FIO public key, insufficient balance staked tokens`, async () => {
    try {
      const result = await locksdk.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 700000000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log('Error: ', err)
      expect(err.json.fields[0].error).to.contain('Insufficient Funds')
    }
  })

  it(`Failure, try to stake again, stake 1M tokens `, async () => {
    try {
        const result = await locksdk.sdk.genericAction('pushTransaction', {
          action: 'stakefio',
          account: 'fio.staking',
          data: {
            fio_address: locksdk.fio_address,
            amount: 1000000000000000,
            actor: locksdk.account,
            max_fee: config.maxFee,
            tpid:''
          }
        })
        // console.log('Result: ', result)
        expect(result.status).to.not.equal('OK')
      } catch (err) {
        // console.log('Error: ', err)
         expect(err.json.fields[0].error).to.contain('Insufficient balance')
      }
  })

  it(`Failure , unstake 1.1M tokens `, async () => {

    try {
        const result = await locksdk.sdk.genericAction('pushTransaction', {
          action: 'unstakefio',
          account: 'fio.staking',
          data: {
            fio_address: locksdk.fio_address,
            amount: 1100000000000000,
            actor: locksdk.account,
            max_fee: config.maxFee,
            tpid:''
          }
        })
      // console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log('Error: ', err)
      expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
    }
  })

  it(`success , unstake 450k tokens `, async () => {

    const result = await locksdk.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: locksdk.fio_address,
        amount: 450000000000000,
        actor: locksdk.account,
        max_fee: config.maxFee,
        tpid:''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`success , unstake 450k more tokens `, async () => {

    const result = await locksdk.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: locksdk.fio_address,
        amount: 450000000000000,
        actor: locksdk.account,
        max_fee: config.maxFee+1,
        tpid:''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`Failure , unstake 500k more tokens `, async () => {

    try {

      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: locksdk.fio_address,
          amount: 500000000000000,
          actor: locksdk.account,
          max_fee: config.maxFee + 1,
          tpid: ''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    }catch (err) {
      //console.log('Error: ', err)
      expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
    }
  })

})

