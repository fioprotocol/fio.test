require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, generateFioDomain, generateFioAddress, createKeypair} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** transfer-tokens.js ************************** \n A. Transferring tokens to Happy`, () => {
  let userA1, prevFundsAmount
  const fundsAmount = 1000000000000

  it(`Create users`, async () => {
    userA1 = await newUser(faucet);
  })

  it(`getFioBalance for userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', { })
      //console.log('Result: ', result)
      prevFundsAmount = result.balance
    } catch (err) {
      expect(err.json.message).to.equal(null)
    }
  })

  it(`Transfer ${fundsAmount} FIO to userA1 FIO public key`, async () => {
      const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    //console.log('Result: ', result)
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
  })

  it(`userA1's FIO public key has an additional ${fundsAmount} FIO`, async () => {
    const result = await userA1.sdk.genericAction('getFioBalance', {})
    //console.log('Result: ', result)
    expect(result.balance).to.equal(fundsAmount + prevFundsAmount)
  })

})

describe('B. Transfer Tokens to Sad account ', () => {
  let userB1
  const sadFioDomain = generateFioDomain(15)
  const sadFioAddress = generateFioAddress(sadFioDomain)
  const fundsAmount = 100000000000
  let sadFioBalance = 0

  it(`Create users`, async () => {
    keys = await createKeypair();
    userB1 = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  })

  it(`getFioBalance for userB1 pre transfer returns error: ${config.error.keyNotFound}`, async () => {
    try {
      const result = await userB1.genericAction('getFioBalance', {
        fioPublicKey: userB1.publicKey
      })
    } catch (err) {
      //console.log('Error: ', err.json)
      expect(err.json.message).to.equal(config.error.keyNotFound)
    }
  })

  it(`Transfer to empty public key returns: ${config.error.invalidKey}`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: '',
        amount: fundsAmount,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
    } catch (err) {
      //console.log('Error: ', err.json)
      expect(err.json.fields[0].error).to.equal(config.error.invalidKey)
    }
  })

  it(`Transfer ${100000000000000000/1000000000} returns: ${config.error.insufficientBalance}`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: userB1.publicKey,
        amount: 100000000000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
    } catch (err) {
      //console.log('Error: ', err.json)
      expect(err.json.fields[0].error).to.equal(config.error.insufficientBalance)
    }
  })

  it(`Transfer without enough FEE returns ${config.error.feeExceedsMax}`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: userB1.publicKey,
        amount: fundsAmount,
        maxFee: config.api.transfer_tokens_pub_key.fee - 1000000,
        technologyProviderId: ''
      })
    } catch (err) {
      //console.log('Error: ', err.json)
      expect(err.json.fields[0].error).to.equal(config.error.feeExceedsMax)
    }
  })

  it(`Transfer to invalid public key returns ${config.error.invalidKey}`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: 'EOS8k9vgu2YEWWACcEaNMvX5BvoHD8NEq1NgNAW7v1d37axaNEuLB',
        amount: fundsAmount,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
    } catch (err) {
      //console.log('Error: ', err.json.fields[0].error)
      expect(err.json.fields[0].error).to.equal(config.error.invalidKey)
    }
  })

  it(`Transfer -100 returns ${config.error.invalidAmount}`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: userB1.publicKey,
        amount: -100,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
    } catch (err) {
      //console.log('Error: ', err.json)
      expect(err.json.fields[0].error).to.equal(config.error.invalidAmount)
    }
  })
})

