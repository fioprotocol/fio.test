require('mocha')
const { Client } = require('pg');
const {expect} = require('chai')
const {newUser, fetchJson, timeout, callFioApi} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');
let client;




before(async () => {
  try{
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
  client = new Client({
    user: 'chronicle_user',
    host: 'localhost',
    database: 'relicdb',
    password: 'relicchronicle1@0@2',
    port: 5432, // Default PostgreSQL port
  });
  await client.connect();
} catch (err) {
  console.log('Error', err);
}
})

describe(`************************** relic-datapipeline-finctional-tests.js ************************** \n    A. Add 2 addresses, then add 3 addresses including the original 2`, () => {

    let userA1

    it(`Create users`, async () => {
        userA1 = await newUser(faucet);
    })

    it(`basic query of blocks`, async () => {
      try {
        const result = await userA1.sdk.genericAction('addPublicAddresses', {
          fioAddress: userA1.address,
          publicAddresses: [
            {
              chain_code: 'BCH',
              token_code: 'BCH',
              public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
            },
            {
              chain_code: 'DASH',
              token_code: 'DASH',
              public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
            }
          ],
          maxFee: config.api.add_pub_address.fee,
          technologyProviderId: ''
        })
        //console.log('Result:', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })


})

