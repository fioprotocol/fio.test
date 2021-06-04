require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, generateFioAddress} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** pushtransaction.js ************************** \n    A. Misc. pushtransaction tests`, () => {

    let userA1

    it(`Create users`, async () => {
        userA1 = await newUser(faucet);
        userA1.address2 = generateFioAddress(userA1.domain, 5)
        userA1.address3 = generateFioAddress(userA1.domain, 5)
    })

    it(`Register address using registerFioAddress endpoint`, async () => {
      const result = await userA1.sdk.genericAction('registerFioAddress', {
        fioAddress: userA1.address2,
        ownerPublicKey: userA1.publicKey,
        maxFee: config.api.register_fio_address.fee,
        technologyProviderId: ''
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    })

    it(`Register address using pushTransaction endpoint`, async () => {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        data: {
          fio_address: userA1.address3,
          owner_fio_public_key: userA1.publicKey,
          actor: userA1.account,
          max_fee: config.api.register_fio_address.fee,
          tpid: ''
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    })


})

