/**
 * This test requires manually updating contracts to shorten the expiration for domains
 * to 10 seconds. 
 * 
 * In fio.address.cpp:
 * 
 * 
 * For Domains we want to expire them after 10 seconds.
 * 
 *   expiration_time = get_now_plus_one_year();
 * to
 *   expiration_time = now() + 10;
 *
 * 
 * Next, update the number of days past expiration when certain calls are disallowed
 * 
 * In fio.common.hpp:
 *
 * For the domain expire + 30 day check, change:
 *   #define SECONDS30DAYS 2592000
 * to
 *   #define SECONDS30DAYS 10
 * 
 * Once updated:
 * - Rebuild the contracts with the fix
 */

require('mocha')
const {expect} = require('chai')
const { newUser, fetchJson, timeout, callFioApi} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

describe('************************** expired-domain.js ************************** \n A. Test actions that should fail with expired domain', () => {

  let user1, user2, bundleCount

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  })

  it(`Register user1 as producer`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user1.address,
          fio_pub_key: user1.publicKey,
          url: "https://user1site.io/",
          location: 80,
          actor: user1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log(JSON.stringify(err, null, 4));
      expect(err).to.equal('null');
    }
  });

  it(`Expire domains...`, async () => { });
  it(`Wait 21 seconds to get to domain expire + 30 days`, async () => { await timeout(21000) });

  it(`(failure) regproducer - Try to update producer location. Expect: ${config.error2.domainExpired.statusCode} ${config.error2.domainExpired.message}`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user1.address,
          fio_pub_key: user1.publicKey,
          url: "https://user1site.io/",
          location: 70,
          actor: user1.account,
          max_fee: config.maxFee
        }
      })
      expect(result).to.equal(null);
    } catch (err) {
      //console.log(JSON.stringify(err, null, 4));
      expect(err.json.fields[0].error).to.equal(config.error2.domainExpired.message);
      expect(err.errorCode).to.equal(config.error2.domainExpired.statusCode);
    }
  });

})

