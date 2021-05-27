require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, generateFioDomain, generateFioAddress, createKeypair} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** retire-tokens.js ************************** \n    A. Retire FIO Tokens`, () => {
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

  it(`Success Test, Retire ${fundsAmount} tokens from userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: fundsAmount,
          memo: "Test token burn.",
          actor: userA1.account,
        }
      })
      console.log(`Result: `, result)
      expect(result.status).to.equal('OK')

    } catch (err) {
     console.log(err.message)
    }
  })


})
