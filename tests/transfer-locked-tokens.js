require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, generateFioDomain, generateFioAddress, createKeypair} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/FIOSDK')
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

describe(`************************** transfer-locked-tokens.js ************************** \n A. Transferring locked tokens Happy`, () => {
  let userA1, keys, locksdk
  const fundsAmount = 1000000000000
  const halfundsAmount = 450000000000

  it(`Create users`, async () => {
    userA1 = await newUser(faucet);
    keys = await createKeypair();
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  })

  it(`Show account info`, async () => {
    console.log('              userA1.account:', userA1.account)
    console.log('              userA1.publicKey:', userA1.publicKey)
    console.log('              userA1.privateKey:', userA1.privateKey)
    console.log('              userA1.domain:', userA1.domain)
    console.log('              userA1.address:', userA1.address)
    console.log("              locked token holder pub key ",keys.publicKey)
    console.log("              locked token holder account ",keys.account)
    console.log("              locked token holder priv key ",keys.privateKey)
  })

  it(`getFioBalance for userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', { })
      prevFundsAmount = result.balance
    } catch (err) {
      expect(err.json.message).to.equal(null)
    } 
  })


  it(`Transfer locked tokens, fail periods percent not 100`, async () => {
    try {
      const result = await userA1.sdk.genericAction('transferLockedTokens', {
        payeePublicKey: keys.publicKey,
        canVote: false,
        periods: [
          {
            duration: 120,
            percent: 50.30,
          },
          {
            duration: 240,
            percent: 50.0,
          }
        ],
        amount: fundsAmount,
        maxFee: 400000000000,
        tpid: '',

      })

    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`Transfer locked tokens, fail periods percent larger than 3 decimals`, async () => {
    try {
      const result = await userA1.sdk.genericAction('transferLockedTokens', {
        payeePublicKey: keys.publicKey,
        canVote: false,
        periods: [
          {
            duration: 120,
            percent: 50.4444,
          },
          {
            duration: 240,
            percent: 49.5556,
          }
        ],
        amount: fundsAmount,
        maxFee: 400000000000,
        tpid: '',

      })

    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })


  it(`Transfer locked tokens, fail duration 0`, async () => {
    try {
      const result = await userA1.sdk.genericAction('transferLockedTokens', {
        payeePublicKey: keys.publicKey,
        canVote: false,
        periods: [
          {
            duration: 0,
            percent: 50.0,
          },
          {
            duration: 240,
            percent: 50.0,
          }
        ],
        amount: fundsAmount,
        maxFee: 400000000000,
        tpid: '',

      })
    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })




  it(`Transfer ${fundsAmount} locked FIO from userA1 public key`, async () => {
    try {
      const result = await userA1.sdk.genericAction('transferLockedTokens', {
        payeePublicKey: keys.publicKey,
        canVote: false,
        periods: [
          {
            duration: 20,
            percent: 50.0,
          },
          {
            duration: 20,
            percent: 50.0,
          }
        ],
        amount: fundsAmount,
        maxFee: 400000000000,
        tpid: '',

      })
      expect(result.status).to.equal('OK')
      expect(result).to.have.all.keys( 'status', 'fee_collected')
    } catch (err) {
      console.log('Error', err)
    }
    })

  it(`Waiting 20 seconds for first unlock`, async () => {
    console.log("            waiting 20 seconds for first unlock ")
  })

  it(` wait 20 seconds`, async () => {
    try {
     wait(20000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  //try to transfer whole amount, fail.
  it(`Transfer ${fundsAmount} Fail, fail to transfer locked FIO to userA1 FIO public key`, async () => {
    try{
    const result = await locksdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
  } catch (err) {
    var expected = `Error 400`
    expect(err.message).to.include(expected)
  }
  })

it(`Transfer ${halfundsAmount} FIO to userA1 FIO public key`, async () => {
  const result = await locksdk.genericAction('transferTokens', {
    payeeFioPublicKey: userA1.publicKey,
    amount: halfundsAmount,
    maxFee: config.api.transfer_tokens_pub_key.fee,
    technologyProviderId: ''
  })
  expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
})

  it(`Waiting 20 seconds for second unlock`, async () => {
    console.log("            waiting 20 seconds for second unlock ")
  })

it(` wait 20 seconds`, async () => {
  try {
    wait(20000)
  } catch (err) {
    console.log('Error', err)
  }
})


it(`Transfer ${halfundsAmount} FIO to userA1 FIO public key`, async () => {
  const result = await locksdk.genericAction('transferTokens', {
    payeeFioPublicKey: userA1.publicKey,
    amount: halfundsAmount,
    maxFee: config.api.transfer_tokens_pub_key.fee,
    technologyProviderId: ''
  })
  expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
})



it(`Transfer locked tokens, fail pub key account pre exists`, async () => {
    try {
      const result = await userA1.sdk.genericAction('transferLockedTokens', {
        payeePublicKey: keys.publicKey,
        canVote: false,
        periods: [
          {
            duration: 0,
            percent: 50.0,
          },
          {
            duration: 240,
            percent: 50.0,
          }
        ],
        amount: fundsAmount,
        maxFee: 400000000000,
        tpid: '',

      })
    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  })


