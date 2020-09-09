require('mocha')
const {expect} = require('chai')
const {newUser, generateFioAddress, generateFioDomain, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/FIOSDK')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

describe('************************** expired-domains.js ************************** \n A. General testing for expired domains.', () => {

  let userA1, userA2

  it(`Create users`, async () => {
    userA1 = await newUser(faucet);
    userA2 = await newUser(faucet);
  })

  it.skip(`Transfer expired domain. Expect error type 400: ${config.error.fioDomainNeedsRenew}`, async () => {
    try {
      const result = await userA1.sdk.genericAction('transferFioDomain', {
        fioDomain: userA1.domain,
        newOwnerKey: userA2.publicKey,
        maxFee: config.api.transfer_fio_domain.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal(null);
    } catch (err) {
      console.log('Error: ', err)
      expect(err.json.fields[0].error).to.equal(config.error.fioDomainNeedsRenew);
      expect(err.statusCode).to.equal(400);
    }
  })

})
