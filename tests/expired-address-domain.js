/**
 * This test requires manually updating xyz contract to shorten the expiration for domains and addresses
 * to 2 minutes. 
 * 
 * In fio.address.cpp:
 * 
 * For Addresses: Line 162, change:
 *   const uint32_t expiration_time = get_now_plus_one_year();
 * to
 *   const uint32_t expiration_time = now() + 120;
 * 
 * For Domains: Line 245, change:
 *   expiration_time = get_now_plus_one_year();
 * to
 *   expiration_time = now() + 120;
 * 
 * Once updated:
 * - Rebuild the contracts with the fix
 * - cd into fio.test directory
 * - run node tests/expired-address-domain.js
 */

require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, timeout, callFioApi, callFioApiSigned} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

describe('************************** expired-address-domain.js ************************** \n A. General testing for expired domains and addresses', () => {

  let userA1, userA2

  it(`Create users`, async () => {
    userA1 = await newUser(faucet);
    userA2 = await newUser(faucet);
  })

  it(`getFioNames for userA1 and confirm the address and domain are NOT expired`, async () => {
    try {
      curdate = new Date()
      var utcSeconds = (curdate.getTime() + curdate.getTimezoneOffset()*60*1000)/1000;  // Convert to UTC
      const result = await userA1.sdk.genericAction('getFioNames', {
          fioPublicKey: userA1.publicKey
      })
      expect(result.fio_domains[0].fio_domain).to.equal(userA1.domain);
      expect(Date.parse(result.fio_domains[0].expiration)/1000).to.be.greaterThan(utcSeconds);
      expect(result.fio_addresses[0].fio_address).to.equal(userA1.address);
      expect(Date.parse(result.fio_addresses[0].expiration)/1000).to.be.greaterThan(utcSeconds);
    } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
    }
  })

  it(`Check isAvailable for domain. Expect is_registered = 1`, async () => {
    try {
        const result = await userA1.sdk.genericAction('isAvailable', {
            fioName: userA1.domain,
        })
        //console.log('Result: ', result);
        expect(result.is_registered).to.equal(1);
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    }
  })

  it(`Check isAvailable for address. Expect is_registered = 1`, async () => {
    try {
        const result = await userA1.sdk.genericAction('isAvailable', {
            fioName: userA1.address,
        })
        //console.log('Result: ', result);
        expect(result.is_registered).to.equal(1);
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    }
  })

  it(`Wait 2 minutes for the addresses and domains to expire`, async () => {
    await timeout(125000);
  })

  it(`getFioNames for userA1 and confirm the address and domain ARE expired`, async () => {
    try {
      curdate = new Date()
      var utcSeconds = (curdate.getTime() + curdate.getTimezoneOffset()*60*1000)/1000;  // Convert to UTC
      const result = await userA1.sdk.genericAction('getFioNames', {
          fioPublicKey: userA1.publicKey
      })
      //console.log('getFioNames', result);
      expect(result.fio_domains[0].fio_domain).to.equal(userA1.domain);
      expect(Date.parse(result.fio_domains[0].expiration)/1000).to.be.lessThan(utcSeconds);
      expect(result.fio_addresses[0].fio_address).to.equal(userA1.address);
      expect(Date.parse(result.fio_addresses[0].expiration)/1000).to.be.lessThan(utcSeconds);
    } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
    }
  })

  it(`Check isAvailable for expired domain. Expect is_registered = 1`, async () => {
    try {
        const result = await userA1.sdk.genericAction('isAvailable', {
            fioName: userA1.domain,
        })
        //console.log('Result: ', result);
        expect(result.is_registered).to.equal(1);
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    }
  })

  it(`Check isAvailable for expired (but not burned) address. Expect is_registered = 1`, async () => {
    try {
        const result = await userA1.sdk.genericAction('isAvailable', {
            fioName: userA1.address,
        })
        //console.log('Result: ', result);
        expect(result.is_registered).to.equal(1);
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    }
  })

  it(`Transfer expired domain. Expect error type 400: ${config.error.fioDomainNeedsRenew}`, async () => {
    try {
      const result = await userA1.sdk.genericAction('transferFioDomain', {
        fioDomain: userA1.domain,
        newOwnerKey: userA2.publicKey,
        maxFee: config.api.transfer_fio_domain.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error: ', err.json);
      expect(err.json.fields[0].error).to.equal(config.error.fioDomainNeedsRenew);
      expect(err.errorCode).to.equal(400);
    }
  })

  it.skip(`(BUG BD-2475) Burn userA1.address. Expect error type 400: ${config.error.fioDomainNeedsRenew}`, async () => {
    try {
        const result = await callFioApiSigned('push_transaction', {
            action: 'burnaddress',
            account: 'fio.address',
            actor: userA1.account,
            privKey: userA1.privateKey,
            data: {
                "fio_address": userA1.address,
                "max_fee": config.maxFee,
                "tpid": '',
                "actor": userA1.account
            }
        })
        //console.log('Result: ', result);
        //expect(result.fields[0].error).to.equal(config.error.fioDomainNeedsRenew);
        //expect(err.errorCode).to.equal(400);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

})
