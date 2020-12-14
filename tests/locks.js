require('mocha')
const {expect} = require('chai')
const {newUser, unlockWallet, generateFioDomain, addLock, timeout, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

let total_voted_fio

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** locks.js ************************** \n A. Test to make sure accounts with locked tokens cannot register domains.`, () => {

  let userA1
  const lockType = 1 // 1,2,3,4

  it(`Create users`, async () => {
    userA1 = await newUser(faucet);

    userA1.domain2 = generateFioDomain(10);
    userA1.domain3 = generateFioDomain(10);
  })

  it.skip(`Unlock fio wallet with wallet key: ${config.WALLETKEY}`, async () => {
    unlockWallet('fio');
  })

  it.skip('Wait a few seconds... unlocking the wallet sometimes fails', async () => {
    await timeout(2000);
  })

  it(`Register fee test domain pre lock. `, async () => {
    try {
      const result = await userA1.sdk.genericAction('registerFioDomain', {
        fioDomain: userA1.domain2,
        maxFee: config.api.register_fio_domain.fee,
        //walletFioAddress: ''
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it.skip(`Apply Lock Type ${lockType} to 500 FIO for userA1`, async () => {
    try {
      let result = await addLock(userA1.account, 500000000000, lockType);  // Requires eosio private key.
      //console.log('result:', result)
      expect(result).to.have.all.keys('transaction_id', 'processed')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Register fee test domain post lock returns: ${config.error.regdomainLockedAccount} `, async () => {
    try {
      const result = await userA1.sdk.genericAction('registerFioDomain', {
        fioDomain: userA1.domain3,
        maxFee: config.api.register_fio_domain.fee,
      })
      //console.log('Result: ', result)
    } catch (err) {
      //console.log('Error: ', err.json)
      expect(err.json.fields[0].error).to.equal(config.error.regdomainLockedAccount)
    }
  })
})

