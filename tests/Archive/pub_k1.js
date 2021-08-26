require('mocha')
const {expect} = require('chai')
const {newUser, generateFioAddress, generateFioDomain, convertToK1, fetchJson} = require('../../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../../config.js');


before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe.skip(`************************** pub_k1.js ************************** \n A. Call get calls with PUB_K1 prefix FIO Public Keys`, () => {

    let userA1, balance

    it(`Create users`, async () => {
        userA1 = await newUser(faucet);
        userA1.publicKeyK1 = convertToK1(userA1.publicKey)
    })

    it(`get_fio_balance with "FIO" key`, async () => {
      try {
        const result = await userA1.sdk.genericAction('getFioBalance', {
          fioPublicKey: userA1.publicKey
        })
        //console.log('result: ', result)
        balance = result.balance
        expect(result.balance).to.be.greaterThan(0)
      } catch (err) {
        console.log('Error: ', err)
      }
    })

    it(`get_fio_balance with "PUB_K1" key`, async () => {
      try {
        const result = await userA1.sdk.genericAction('getFioBalance', {
          fioPublicKey: userA1.publicKeyK1
        })
        //console.log('result: ', result)
        expect(result.balance).to.equal(balance)
      } catch (err) {
        console.log('Error: ', err)
      }
    })

    it(`get_pending_fio_requests with "FIO" key`, async () => {
      try {
        const result = await userA1.sdk.genericAction('getPendingFioRequests', {
          limit: '',
          offset: ''
        })
        //console.log('result: ', result)
        balance = result.balance
        expect(result.balance).to.be.greaterThan(0)
      } catch (err) {
        console.log('Error: ', err)
      }
    })

    it(`get_pending_fio_requests with "PUB_K1" key`, async () => {
      try {
        const result = await userA1.sdk.genericAction('getPendingFioRequests', {
          limit: '',
          offset: ''
        })
        //console.log('result: ', result)
        expect(result.balance).to.equal(balance)
      } catch (err) {
        console.log('Error: ', err)
      }
    })

})
