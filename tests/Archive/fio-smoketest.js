//require('mocha')
//const { expect } = require('chai')
//const {FIOSDK } = require('@fioprotocol/fiosdk')
//const fioData = require('./serverResponses');
//const fiojs = require("@fioprotocol/fiojs");
//const Transactions_2 = require("@fioprotocol/fiosdk/lib/transactions/Transactions")
//let transaction = new Transactions_2.Transactions

require('mocha')
const {expect} = require('chai')
const {newUser, getProdVoteTotal, importPrivKey, unlockWallet, addLock, getAccountVoteWeight, getTotalVotedFio, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe('A. Transferring tokens to Happy', () => {
  const fundsAmount = 1000000000000
  let happyB1

  it(`Create users`, async () => {
    happyB1 = await newUser(faucet);
  })

  it(`getFioBalance for happy returns: ${config.error.keyNotFound}`, async () => {
    try {
      const result = await happyB1.sdk.genericAction('getFioBalance', { })
    } catch (err) {
      expect(err.json.message).to.equal(config.error.keyNotFound)
    }
  })

  it(`Transfer ${fundsAmount} FIO to Happy's FIO public key`, async () => {
      const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: happyB1.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      walletFioAddress: ''
    })
    //console.log('Result: ', result)
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  })

  it(`Happy's FIO public key has ${fundsAmount} FIO`, async () => {
    const result = await happyB1.sdk.genericAction('getFioBalance', {})
    //console.log('Result: ', result)
    expect(result.balance).to.equal(fundsAmount)
  })

  it(`Transfer ${.5*fundsAmount} to Happy`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: happyB1.publicKey,
      amount: .5*fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      walletFioAddress: ''
    })
    //console.log('Result: ', result)
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  })

  it(`Happy's FIO public key has ${1.5*fundsAmount} FIO`, async () => {
    const result = await happyB1.sdk.genericAction('getFioBalance', {})
    //console.log('Result: ', result)
    expect(result.balance).to.equal(1.5*fundsAmount)
  })

})

describe('C. Transfer Tokens Sad', () => {
  const fundsAmount = 100000000000
  let sadC1

  it(`Create users`, async () => {
    sadC1 = await newUser(faucet);
  })

  it(`getFioBalance for Sad pre transfer returns ${config.keyNotFound}`, async () => {
    try {
      const result = await sadC1.sdk.genericAction('getFioBalance', {
        fioPublicKey: sadC1.publicKey
      })
    } catch (err) {
      expect(err.json.message).to.equal(config.keyNotFound)
    }
  })

  it(`Transfer to empty public key returns: ${config.error.invalidKey}`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: '',
        amount: fundsAmount,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        walletFioAddress: ''
      })
    } catch (err) {
      //console.log('Error: ', err.json)
      expect(err.json.fields[0].error).to.equal(config.error.invalidKey)
    }
  })

  it(`Transfer ${100000000000000000/1000000000} returns: ${config.error.insufficientBalance}`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: sadC1.publicKey,
        amount: 100000000000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        walletFioAddress: ''
      })
    } catch (err) {
      //console.log('Error: ', err.json)
      expect(err.json.fields[0].error).to.equal(config.error.insufficientBalance)
    }
  })

  it(`Transfer without enough FEE returns ${config.error.feeExceedsMax}`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: sadC1.publicKey,
        amount: fundsAmount,
        maxFee: fconfig.api.transfer_tokens_pub_key.fee - 1000000,
        walletFioAddress: ''
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
        walletFioAddress: ''
      })
    } catch (err) {
      //console.log('Error: ', err.json)
      expect(err.json.fields[0].error).to.equal(config.error.invalidKey)
    }
  })

  it(`Transfer -100 returns ${config.error.invalidAmount}`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: sadC1.publicKey,
        amount: -100,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        walletFioAddress: ''
      })
    } catch (err) {
      //console.log('Error: ', err.json)
      expect(err.json.fields[0].error).to.equal(config.error.invalidAmount)
    }
  })
})

