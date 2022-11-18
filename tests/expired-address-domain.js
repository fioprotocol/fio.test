/**
 * This test requires manually updating xyz contract to shorten the expiration for domains and addresses
 * to 10 seconds. 
 * 
 * In fio.address.cpp:
 * 
 * 
 * For Domains we want to expire them after the Address expiration to allow for testing expired Addresses.
 * Otherwise calls like get_pub_address will return that the Address does not exist if it is on an expired Domain.
 * In fio_domain_update, change:
 * 
 *   expiration_time = get_now_plus_one_year();
 * to
 *   expiration_time = now() + 30;
 *
 * 
 * To enable an expired address, in fio_address_update change:
 * 
 *   const uint32_t expiration_time = 4294967295;
 * to
 *   const uint32_t expiration_time = now() + 10;
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

describe('************************** expired-address-domain.js ************************** \n A. Test expired addresses: getters return future date, renewaddress', () => {

  let user1, user2, bundleCount

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  })

  it(`getFioNames for user1 and confirm the address and domain are NOT expired`, async () => {
    try {
      curdate = new Date();
      var utcSeconds = (curdate.getTime() + curdate.getTimezoneOffset()*60*1000)/1000;  // Convert to UTC
      const result = await user1.sdk.genericAction('getFioNames', {
          fioPublicKey: user1.publicKey
      })
      expect(result.fio_domains[0].fio_domain).to.equal(user1.domain);
      expect(Date.parse(result.fio_domains[0].expiration)/1000).to.be.greaterThan(utcSeconds);
      expect(result.fio_addresses[0].fio_address).to.equal(user1.address);
      expect(Date.parse(result.fio_addresses[0].expiration)/1000).to.be.greaterThan(utcSeconds);
    } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
    }
  })

  it(`Check isAvailable for domain. Expect is_registered = 1`, async () => {
    try {
        const result = await user1.sdk.genericAction('isAvailable', {
            fioName: user1.domain,
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
        const result = await user1.sdk.genericAction('isAvailable', {
            fioName: user1.address,
        })
        //console.log('Result: ', result);
        expect(result.is_registered).to.equal(1);
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    }
  })

  it(`Wait 10 seconds for the addresses to expire`, async () => {
    await timeout(11000);
  })

  it(`Call get_table_rows from fionames. Verify address is expired (have to use table lookup since getters return future date for addresses)`, async () => {
    let addressExpiration;
    try {
      const json = {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'fionames',
        lower_bound: user1.account,
        upper_bound: user1.account,
        key_type: 'i64',
        index_position: '4'
      }
      fionames = await callFioApi("get_table_rows", json);
      //console.log('fionames: ', fionames);
      addressExpiration = fionames.rows[0].expiration;
      curdate = new Date();
      var utcSeconds = (curdate.getTime() + curdate.getTimezoneOffset() * 60 * 1000) / 1000;  // Convert to UTC
      //console.log('utcSeconds', utcSeconds);
      expect(addressExpiration).to.be.lessThan(utcSeconds);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`get_fio_names for user1. Expect future "never expire" date.`, async () => {
    try {
      const json = {
        "fio_public_key": user1.publicKey
      }
      result = await callFioApi("get_fio_names", json);
      //console.log('get_fio_names', result);
      expect(result.fio_addresses[0].fio_address).to.equal(user1.address);
      expect(result.fio_addresses[0].expiration).to.equal('2106-02-07T06:28:15');
    } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
    }
  })

  it(`get_fio_addresses for user1. Expect future "never expire" date.`, async () => {
    try {
      const json = {
        "fio_public_key": user1.publicKey
      }
      result = await callFioApi("get_fio_addresses", json);
      //console.log('get_fio_addresses', result);
      expect(result.fio_addresses[0].fio_address).to.equal(user1.address);
      expect(result.fio_addresses[0].expiration).to.equal('2106-02-07T06:28:15');
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`get_pub_address for user1. Expect expired address to be returned.`, async () => {
    try {
      const result = await callFioApi("get_pub_address", {
        fio_address: user1.address,
        chain_code: "FIO",
        token_code: "FIO"
      })
      //console.log('get_pub_address', result);
      expect(result.public_address).to.equal(user1.publicKey);
    } catch (err) {
      console.log('Error', err.error.fields[0]);
      expect(err).to.equal(null);
    }
  })

  it(`get_pub_addresses for user1. Expect expired address to be returned.`, async () => {
    try {
      const result = await callFioApi("get_pub_addresses", {
        fio_address: user1.address,
        limit: 1000,
        offset: 0
      })
      //console.log('get_fio_addresses', result);
      expect(result.public_addresses[0].public_address).to.equal(user1.publicKey);
    } catch (err) {
      console.log('Error', err.error.fields[0]);
      expect(err).to.equal(null);
    }
  })

  it(`Check isAvailable for expired domain. Expect is_registered = 1`, async () => {
    try {
        const result = await user1.sdk.genericAction('isAvailable', {
            fioName: user1.domain,
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
        const result = await user1.sdk.genericAction('isAvailable', {
            fioName: user1.address,
        })
        //console.log('Result: ', result);
        expect(result.is_registered).to.equal(1);
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    }
  })

  it(`Wait 20 seconds for the domains to expire`, async () => {
    await timeout(20000);
  })

  it(`Call get_table_rows from domains. Verify domain is expired.`, async () => {
    let domainExpiration;
    try {
      const json = {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'domains',
        limit: 1000,
        reverse: true,
        show_payer: false
      }
      fionames = await callFioApi("get_table_rows", json);
      //console.log('fionames: ', fionames);
      for (fioname in fionames.rows) {
        if (fionames.rows[fioname].name == user1.domain) {
          //console.log('fioname: ', fionames.rows[fioname]);
          domainExpiration = fionames.rows[fioname].expiration;
        }
      }
      curdate = new Date();
      var utcSeconds = (curdate.getTime() + curdate.getTimezoneOffset() * 60 * 1000) / 1000;  // Convert to UTC
      expect(domainExpiration).to.be.lessThan(utcSeconds);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Transfer expired domain. Expect success (expired domains allowed as per FIP-17.b)`, async () => {
    // FIP 17.b changed behavior to allow for transfer of FIO Domains that are expired to support the Domain Marketplace
    try {
      const result = await user1.sdk.genericAction('transferFioDomain', {
        fioDomain: user1.domain,
        newOwnerKey: user2.publicKey,
        maxFee: config.api.transfer_fio_domain.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get bundle count for user1`, async () => {
    const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey });
    bundleCount = result.fio_addresses[0].remaining_bundled_tx;
    //console.log('Result: ', result)
  })

  it(`renew user1 expired address`, async () => {
    const result = await user1.sdk.genericAction('renewFioAddress', {
      fioAddress: user1.address,
      maxFee: config.maxFee
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`Get bundle count for user1. Expect increase.`, async () => {
    let prevBundleCount = bundleCount;
    const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey });
    //console.log('Result: ', result);
    bundleCount = result.fio_addresses[0].remaining_bundled_tx;
    expect(bundleCount).to.equal(prevBundleCount + 100);
  })

  it(`Call get_table_rows from fionames. Verify address is has future date of 4294967295 (2106-02-07T06:28:15)`, async () => {
    let addressExpiration;
    try {
      const json = {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'fionames',
        limit: 1000,
        reverse: true,
        show_payer: false
      }
      fionames = await callFioApi("get_table_rows", json);
      //console.log('fionames: ', fionames);
      for (fioname in fionames.rows) {
        if (fionames.rows[fioname].name == user1.address) {
          //console.log('fioname: ', fionames.rows[fioname]);
          addressExpiration = fionames.rows[fioname].expiration;
        }
      }
      expect(addressExpiration).to.equal(4294967295);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Wait 2 seconds to prevent duplicate transaction for renewal`, async () => {
    await timeout(2000);
  })

  it(`renew user1 expired address again`, async () => {
    try {
      const result = await user1.sdk.genericAction('renewFioAddress', {
        fioAddress: user1.address,
        maxFee: config.maxFee
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get bundle count for user1. Expect increase.`, async () => {
    let prevBundleCount = bundleCount;
    const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey });
    //console.log('Result: ', result);
    bundleCount = result.fio_addresses[0].remaining_bundled_tx;
    expect(bundleCount).to.equal(prevBundleCount + 100);
  })

  it(`Call get_table_rows from fionames. Verify address is has future date of 4294967295 (2106-02-07T06:28:15)`, async () => {
    let addressExpiration;
    try {
      const json = {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'fionames',
        limit: 1000,
        reverse: true,
        show_payer: false
      }
      fionames = await callFioApi("get_table_rows", json);
      //console.log('fionames: ', fionames);
      for (fioname in fionames.rows) {
        if (fionames.rows[fioname].name == user1.address) {
          //console.log('fioname: ', fionames.rows[fioname]);
          addressExpiration = fionames.rows[fioname].expiration;
        }
      }
      expect(addressExpiration).to.equal(4294967295);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})

describe('B. On expired address: confirm actions still work and expire date is no longer checked', () => {
/*
Confirm the following do not check for expired addresses anymore:
addaddress, remaddress, remalladdr, newfundsreq, cancelfndreq, recordobt, xferaddress, voteproducer, regproxy, unregproxy, 
regproducer, unregprod, trnsfiopubad, stakefio, unstakefio, addnft, remnft, remallnfts, voteproxy, claimbprewards
  */
  
  let user1, user2, user3, user4, requestId, requestId2, requestId3;
  const requestMemo = 'request memo';
  const obtMemo = 'obt memo'

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    user4 = await newUser(faucet);
    user5 = await newUser(faucet);
  })

  it(`Wait 10 seconds for the addresses to expire`, async () => {
    await timeout(11000);
  })

  it(`Call get_table_rows from fionames. Verify addresses are expired`, async () => {
    let addressExpiration, addressExpiration2, addressExpiration3;
    try {
      const json = {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'fionames',
        limit: 1000,
        reverse: true,
        show_payer: false
      }
      fionames = await callFioApi("get_table_rows", json);
      //console.log('fionames: ', fionames);
      for (fioname in fionames.rows) {
        if (fionames.rows[fioname].name == user1.address) {
          //console.log('fioname: ', fionames.rows[fioname]);
          addressExpiration = fionames.rows[fioname].expiration;
        } else if (fionames.rows[fioname].name == user2.address) {
          //console.log('fioname: ', fionames.rows[fioname]);
          addressExpiration2 = fionames.rows[fioname].expiration;
        } else if (fionames.rows[fioname].name == user3.address) {
          //console.log('fioname: ', fionames.rows[fioname]);
          addressExpiration3 = fionames.rows[fioname].expiration;
        };
      }
      curdate = new Date();
      var utcSeconds = (curdate.getTime() + curdate.getTimezoneOffset() * 60 * 1000) / 1000;  // Convert to UTC
      //console.log('utcSeconds', utcSeconds);
      expect(addressExpiration).to.be.lessThan(utcSeconds);
      expect(addressExpiration2).to.be.lessThan(utcSeconds);
      expect(addressExpiration3).to.be.lessThan(utcSeconds);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })
  it(`TEST: addaddress`, async () => { });

  it(`Add DASH and BCH addresses to user1`, async () => {
    try {
      const result = await user1.sdk.genericAction('addPublicAddresses', {
        fioAddress: user1.address,
        publicAddresses: config.public_addresses,
        maxFee: config.api.add_pub_address.fee,
        walletFioAddress: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it('confirm BCH address was added', async () => {
    try {
      const result = await user1.sdk.genericAction('getPublicAddress', {
        fioAddress: user1.address,
        chainCode: "BCH",
        tokenCode: "BCH"
      })
      //console.log('Result', result)
      expect(result.public_address).to.equal('bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9')
    } catch (err) {
      console.log('Error', err)
    }
  })

  // Adding this in can cause the test to fail due to expiring domain timing
  it.skip('Wait a few seconds...', async () => {
    await timeout(1000);
  })

  it(`TEST: remaddress`, async () => { });

  it(`Remove BCH and DASH from user1`, async () => {
    try {
      const result = await user1.sdk.genericAction('removePublicAddresses', {
        fioAddress: user1.address,
        publicAddresses: config.public_addresses,
        maxFee: config.api.add_pub_address.fee,
        tpid: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it('confirm BCH address was removed', async () => {
    try {
      const result = await user1.sdk.genericAction('getPublicAddress', {
        fioAddress: user1.address,
        chainCode: "BCH",
        tokenCode: "BCH"
      })
      //console.log('Result', result)
    } catch (err) {
      //console.log('Error', err)
      expect(err.json.message).to.equal(config.error.publicAddressFound)
    }
  })


  it(`TEST: remalladdr`, async () => { });

  it(`Add DASH and BCH addresses to user1`, async () => {
    try {
      const result = await user1.sdk.genericAction('addPublicAddresses', {
        fioAddress: user1.address,
        publicAddresses: [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qn9g9',
          },
          {
            chain_code: 'DASH',
            token_code: 'DASH',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        walletFioAddress: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it('confirm BCH address was added', async () => {
    try {
      const result = await user1.sdk.genericAction('getPublicAddress', {
        fioAddress: user1.address,
        chainCode: "BCH",
        tokenCode: "BCH"
      })
      //console.log('Result', result)
      expect(result.public_address).to.equal('bitcoincash:qn9g9')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Remove All public addresses from user1`, async () => {
    try {
      const result = await user1.sdk.genericAction('removeAllPublicAddresses', {
        fioAddress: user1.address,
        maxFee: config.api.add_pub_address.fee,
        tpid: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it('confirm BCH address was removed', async () => {
    try {
      const result = await user1.sdk.genericAction('getPublicAddress', {
        fioAddress: user1.address,
        chainCode: "BCH",
        tokenCode: "BCH"
      })
      //console.log('Result', result)
    } catch (err) {
      //console.log('Error', err)
      expect(err.json.message).to.equal(config.error.publicAddressFound)
    }
  })
  
  
  it(`TEST: newfundsreq`, async () => { });

  it(`user1 requests funds from user2`, async () => {
    try {
      const result = await user1.sdk.genericAction('requestFunds', {
        payerFioAddress: user2.address,
        payeeFioAddress: user1.address,
        payeeTokenPublicAddress: 'thisispayeetokenpublicaddress',
        amount: 1000000000,
        chainCode: 'BTC',
        tokenCode: 'BTC',
        memo: requestMemo,
        maxFee: config.maxFee,
        payerFioPublicKey: user2.publicKey,
        technologyProviderId: ''
      })
      //console.log('Result: ', result);
      requestId = result.fio_request_id;
      expect(result.status).to.equal('requested');
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  });

  it(`get_sent_fio_requests for user1 (payee)`, async () => {
    try {
      const result = await user1.sdk.genericAction('getSentFioRequests', {
        limit: '',
        offset: ''
      })
      //console.log('result: ', result);
      //console.log('content: ', result.requests[0].content);
      expect(result.requests[0].fio_request_id).to.equal(requestId);
      expect(result.requests[0].payer_fio_address).to.equal(user2.address);
      expect(result.requests[0].payee_fio_address).to.equal(user1.address);
      expect(result.requests[0].payer_fio_public_key).to.equal(user2.publicKey);
      expect(result.requests[0].payee_fio_public_key).to.equal(user1.publicKey);
      expect(result.requests[0].status).to.equal('requested');
      expect(result.requests[0].content.memo).to.equal(requestMemo);
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  });
  

  it(`TEST: recordobt`, async () => { });

  it(`user2 does recordObtData previous payment with the fioRequestId`, async () => {
    try {
      const result = await user2.sdk.genericAction('recordObtData', {
        fioRequestId: requestId,
        payerFioAddress: user2.address,
        payeeFioAddress: user1.address,
        payerTokenPublicAddress: user2.publicKey,
        payeeTokenPublicAddress: user1.publicKey,
        amount: 1000000000,
        chainCode: "BTC",
        tokenCode: "BTC",
        status: '',
        obtId: '',
        maxFee: config.maxFee,
        technologyProviderId: '',
        payeeFioPublicKey: user1.publicKey,
        memo: obtMemo,
        hash: '',
        offLineUrl: ''
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('sent_to_blockchain')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })


  it(`TEST: cancelfndreq`, async () => { });

  it(`user1 requests funds from user2`, async () => {
    try {
      const result = await user1.sdk.genericAction('requestFunds', {
        payerFioAddress: user2.address,
        payeeFioAddress: user1.address,
        payeeTokenPublicAddress: 'thisispayeetokenpublicaddress',
        amount: 1000000000,
        chainCode: 'BTC',
        tokenCode: 'BTC',
        memo: requestMemo,
        maxFee: config.maxFee,
        payerFioPublicKey: user2.publicKey,
        technologyProviderId: '',
        hash: '',
        offLineUrl: ''
      })
      //console.log('Result: ', result)
      requestId2 = result.fio_request_id
      expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`user1 (payee) Call cancel_funds_request to cancel request in pending state`, async () => {
    try {
      const result = await user1.sdk.genericAction('cancelFundsRequest', {
        fioRequestId: requestId2,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      //console.log('Result: ', result);
      expect(result).to.have.any.keys('status');
      expect(result).to.have.any.keys('fee_collected');
      expect(result).to.have.any.keys('block_num');
      expect(result).to.have.any.keys('transaction_id');
      expect(result.status).to.equal('cancelled');
      expect(result.fee_collected).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Verify request was cancelled: getCancelledFioRequests for user1 (payee) returns 1 request with status 'cancelled'`, async () => {
    try {
      const result = await user1.sdk.genericAction('getCancelledFioRequests', {
        limit: '',
        offset: ''
      })
      //console.log('result: ', result)
      expect(result.requests[0].fio_request_id).to.equal(requestId2);
      expect(result.requests[0].payer_fio_address).to.equal(user2.address);
      expect(result.requests[0].payee_fio_address).to.equal(user1.address);
      expect(result.requests[0].payer_fio_public_key).to.equal(user2.publicKey);
      expect(result.requests[0].payee_fio_public_key).to.equal(user1.publicKey);
      expect(result.requests[0].status).to.equal('cancelled');
      expect(result.requests[0].content.memo).to.equal(requestMemo);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`TEST: rejectfndreq`, async () => { });

  it(`user1 requests funds from user2`, async () => {
    try {
      const result = await user1.sdk.genericAction('requestFunds', {
        payerFioAddress: user2.address,
        payeeFioAddress: user1.address,
        payeeTokenPublicAddress: 'thisispayeetokenpublicaddress',
        amount: 1000000000,
        chainCode: 'BTC',
        tokenCode: 'BTC',
        memo: requestMemo,
        maxFee: config.maxFee,
        payerFioPublicKey: user2.publicKey,
        technologyProviderId: '',
        hash: '',
        offLineUrl: ''
      })
      //console.log('Result: ', result)
      requestId3 = result.fio_request_id;
      expect(result.status).to.equal('requested');
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`user1 (payee) Call rejectFundsRequest to cancel request in pending state`, async () => {
    try {
      const result = await user2.sdk.genericAction('rejectFundsRequest', {
        fioRequestId: requestId3,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      //console.log('Result: ', result);
      expect(result).to.have.any.keys('status');
      expect(result).to.have.any.keys('fee_collected');
      expect(result).to.have.any.keys('block_num');
      expect(result).to.have.any.keys('transaction_id');
      expect(result.status).to.equal('request_rejected');
      expect(result.fee_collected).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Verify request was rejected: get_sent_fio_requests for userA1 (payee) returns 1 request with status 'cancelled'`, async () => {
    try {
      const result = await user1.sdk.genericAction('getSentFioRequests', {
        limit: '',
        offset: ''
      })
      //console.log('result: ', result);
      expect(result.requests[2].fio_request_id).to.equal(requestId3);
      expect(result.requests[2].payer_fio_address).to.equal(user2.address);
      expect(result.requests[2].payee_fio_address).to.equal(user1.address);
      expect(result.requests[2].payer_fio_public_key).to.equal(user2.publicKey);
      expect(result.requests[2].payee_fio_public_key).to.equal(user1.publicKey);
      expect(result.requests[2].status).to.equal('rejected');
      expect(result.requests[2].content.memo).to.equal(requestMemo);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })


  it(`TEST: xferaddress`, async () => { });

  it(`Transfer address from user2 to user3`, async () => {
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'xferaddress',
        account: 'fio.address',
        data: {
          fio_address: user2.address,
          new_owner_fio_public_key: user3.publicKey,
          max_fee: config.maxFee,
          actor: user2.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK');

    } catch (err) {
      console.log(err);
      expect(err).to.equal(null);
    }
  });

  it(`TEST: voteproducer`, async () => { });

  it(`user1 votes for bp1@dapixdev`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: user1.address,
          actor: user1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal('null');
    }
  })


  it(`TEST: regproxy`, async () => { });

  it(`Register user3 as a proxy`, async () => {
    try {
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: user3.address,
          actor: user3.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal('null');
    }
  })

  it(`TEST: stakefio autoproxy`, async () => { });

  it(`user5 (who has NOT voted) stakes 10 fio with user3 as proxy`, async () => {
    try {
      const result = await user5.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: user5.address,
          amount: 10000000000,
          actor: user5.account,
          max_fee: config.maxFee,
          tpid: user3.address
        }
      });
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log("ERROR: ", err.json);
      expect(err).to.equal(null);
    }
  });

  it(`TEST: unstakefio`, async () => { });

  it(`user5 (who has NOT voted) unstakes 5 fio with user3 as proxy`, async () => {
    try {
      const result = await user5.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: user5.address,
          amount: 5000000000,
          actor: user5.account,
          max_fee: config.maxFee,
          tpid: user3.address
        }
      });
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log("ERROR: ", err.json);
      expect(err).to.equal(null);
    }
  });

  it(`TEST: voteproxy`, async () => { });

  it(`user1 proxy votes to user3`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: user3.address,
          fio_address: user1.address,
          actor: user1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal('null');
    }
  })


  it(`TEST: unregproxy`, async () => { });

  it(`Un-register user3 as a proxy`, async () => {
    try {
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'unregproxy',
        account: 'eosio',
        data: {
          fio_address: user3.address,
          actor: user3.account,
          max_fee: config.api.unregister_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal('null');
    }
  })


  it(`TEST: regproducer`, async () => { });

  it(`Register user4 as producer`, async () => {
    try {
      const result = await user4.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user4.address,
          fio_pub_key: user4.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          actor: user4.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json);
      expect(err).to.equal('null');
    }
  })

  it(`TEST: unregprod`, async () => { });

  it(`Unregister user2 as producer`, async () => {
    try {
      const result = await user4.sdk.genericAction('pushTransaction', {
        action: 'unregprod',
        account: 'eosio',
        data: {
          fio_address: user4.address,
          fio_pub_key: user4.publicKey,
          max_fee: config.api.unregister_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal('null');
    }
  })

  it(`TEST: stakefio`, async () => { });

  it(`user1 (who has voted) stakes 10 fio `, async () => {
    const result = await user1.sdk.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: user1.address,
        amount: 10000000000,
        actor: user1.account,
        max_fee: config.maxFee,
        tpid: ''
      }
    });
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK');
  });

  it(`TEST: unstakefio`, async () => { });

  it(`user1 (who has voted) unstakes 5 fio `, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: user1.address,
          amount: 5000000000,
          actor: user1.account,
          max_fee: config.maxFee,
          tpid: ''
        }
      });
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log("ERROR: ", err.json);
      expect(err).to.equal(null);
    }
  });

  it(`TEST: addnft`, async () => { });

  it(`Add NFT to user1 FIO Address`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "1", "url": "", "hash": "", "metadata": ""
          }],
          max_fee: config.maxFee,
          actor: user1.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK')

    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal('null');
    }
  })


  it(`TEST: remnft`, async () => { });

  it(`Remove NFT from user1 FIO Address`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "1", "url": "", "hash": "", "metadata": ""
          }],
          max_fee: config.maxFee,
          actor: user1.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK')

    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal('null');
    }
  })


  it(`TEST: remallnfts`, async () => { });

  it(`Add 3 NFTs to user1 FIO Address`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "7", "url": "", "hash": "", "metadata": ""
          }, {
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "8", "url": "", "hash": "", "metadata": ""
          }, {
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "9", "url": "", "hash": "", "metadata": ""
          }],
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK')

    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal('null');
    }
  })

  it('Wait 2 seconds. (Slower test systems)', async () => {
    await timeout(2000);
  })

  it(`Remove all NFTs from user1 FIO Address`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'remallnfts',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          max_fee: 5000000000,
          actor: user1.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK')

    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal('null');
    }
  })
  

})

