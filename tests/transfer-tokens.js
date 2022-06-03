require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, generateFioDomain, generateFioAddress, createKeypair} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** transfer-tokens.js ************************** \n    A. Transferring tokens to Happy`, () => {
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


describe('C. Transfer tokens from account with no tokens ', () => {

  let noFio, user2, newkeypair;

  it(`Create users`, async () => {
    newKeyPair = await createKeypair();
    noFio = new FIOSDK(newKeyPair.privateKey, newKeyPair.publicKey, config.BASE_URL, fetchJson);
    user2 = await newUser(faucet);
  });

  it(`user2 set domain public`, async () => {
    try {
      const result = await user2.sdk.genericAction('setFioDomainVisibility', {
        fioDomain: user2.domain,
        isPublic: true,
        maxFee: config.maxFee,
        walletFioAddress: ''
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`regaddress for noFio account to create account.`, async () => {
    try {
      newAddress = generateFioAddress(user2.domain, 8)
      const result = await faucet.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        data: {
          fio_address: newAddress,
          owner_fio_public_key: newKeyPair.publicKey,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`FAILURE: Send FIO from account with no FIO. `, async () => {
    try {
      const result = await noFio.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: user2.publicKey,
          amount: 10000000000,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log('Error: ', err.json)
      expect(err.json.fields[0].error).to.equal('Insufficient balance')
    }
  })
});