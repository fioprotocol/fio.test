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
 * - run expired-address-domain.js
 */

require('mocha')
const {expect} = require('chai')
const { newUser, fetchJson, timeout, callFioApiSigned} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

function mintNfts(num) {
  let nfts = [];
  if (num === 0) return nfts;
  for (let i = 1; i <= num; i++) {
    nfts.push({
      "chain_code": "ETH",
      "contract_address": "0x123456789ABCDEF",
      "token_id": `${i}`,
      "url": "",
      "hash": "",
      "metadata": ""
    });
  }
  return nfts;
}

const expireDate = 1527686000;  // May, 2018

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

describe('************************** expired-address-domain.js ************************** \n A. General testing for expired domains and addresses', () => {

  let user1, user2

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  })

  it(`getFioNames for user1 and confirm the address and domain are NOT expired`, async () => {
    try {
      curdate = new Date()
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

  it(`Wait 2 minutes for the addresses and domains to expire`, async () => {
    //await timeout(125000);

    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'modexpire',
        account: 'fio.address',
        data: {
          fio_address: user1.domain,
          expire: expireDate,
          actor: user1.account
        }
      })
      console.log(`Result: `, result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log(err);
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('No work.');
    }
  })

  it(`getFioNames for user1 and confirm the address and domain ARE expired`, async () => {
    try {
      curdate = new Date()
      var utcSeconds = (curdate.getTime() + curdate.getTimezoneOffset()*60*1000)/1000;  // Convert to UTC
      const result = await user1.sdk.genericAction('getFioNames', {
          fioPublicKey: user1.publicKey
      })
      console.log('getFioNames', result);
      expect(result.fio_domains[0].fio_domain).to.equal(user1.domain);
      expect(Date.parse(result.fio_domains[0].expiration)/1000).to.be.lessThan(utcSeconds);
      expect(result.fio_addresses[0].fio_address).to.equal(user1.address);
      expect(Date.parse(result.fio_addresses[0].expiration)/1000).to.be.lessThan(utcSeconds);
    } catch (err) {
        console.log('Error', err);
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

  it(`Transfer expired domain. Expect error type 400: ${config.error.fioDomainNeedsRenew}`, async () => {
    try {
      const result = await user1.sdk.genericAction('transferFioDomain', {
        fioDomain: user1.domain,
        newOwnerKey: user2.publicKey,
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

  it(`Burn user1.address. Expect error type 400: ${config.error.fioDomainNeedsRenew} (BD-2475)`, async () => {
    try {
        const result = await callFioApiSigned('push_transaction', {
            action: 'burnaddress',
            account: 'fio.address',
            actor: user1.account,
            privKey: user1.privateKey,
            data: {
                "fio_address": user1.address,
                "max_fee": config.maxFee,
                "tpid": '',
                "actor": user1.account
            }
        })
        console.log('Result: ', result);
        expect(result.fields[0].error).to.equal(config.error.fioDomainNeedsRenew);
        //expect(err.errorCode).to.equal(400);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

})

describe('B. Check relevant actions to confirm expired addresses work as expected', () => {
/*
Confirm the following do not check for expired addresses anymore:
remaddress, remalladdr, newfundsreq, cancelfndreq, recordobt, xferaddress, voteproducer, regproxy, unregproxy, 
regproducer, unregprod, trnsfiopubad, stakefio, unstakefio, addnft, remnft, remallnfts
  */
  
  let user1, user2, user3

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
  })

  it(`Add Address and wait for it to expire`, async () => {
    // May need to do the timing thing above. Separate these into different tests. One with timing, one with the remove action.
  })


  // remaddress
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

  it('Wait a few seconds...', async () => {
    await timeout(2000);
  })

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


  // remalladdr

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
  

  // newfundsreq

  it(`user1 requests funds from user2`, async () => {
    try {
      const result = await user1.sdk.genericAction('requestFunds', {
        payerFioAddress: user2.address,
        payeeFioAddress: user1.address,
        payeeTokenPublicAddress: 'thisispayeetokenpublicaddress',
        amount: 1000,
        chainCode: 'BTC',
        tokenCode: 'BTC',
        memo: 'requestMemo',
        maxFee: config.maxFee,
        payerFioPublicKey: user2.publicKey,
        technologyProviderId: ''
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

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
  })
  

  // recordobt

  it(`user2 does recordObtData previous payment with the fioRequestId`, async () => {
    try {
      const result = await user2.sdk.genericAction('recordObtData', {
        fioRequestId: requestId,
        payerFioAddress: user2.address,
        payeeFioAddress: user1.address,
        payerTokenPublicAddress: user2.publicKey,
        payeeTokenPublicAddress: user1.publicKey,
        amount: payment,
        chainCode: "BTC",
        tokenCode: "BTC",
        status: '',
        obtId: '',
        maxFee: config.api.record_obt_data.fee,
        technologyProviderId: '',
        payeeFioPublicKey: userA1.publicKey,
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


  // cancelfndreq

  it(`user1 requests funds from user2`, async () => {
    try {
      const result = await user1.sdk.genericAction('requestFunds', {
        payerFioAddress: user2.address,
        payeeFioAddress: user1.address,
        payeeTokenPublicAddress: 'thisispayeetokenpublicaddress',
        amount: payment,
        chainCode: 'BTC',
        tokenCode: 'BTC',
        memo: requestMemo,
        maxFee: config.api.new_funds_request.fee,
        payerFioPublicKey: user2.publicKey,
        technologyProviderId: '',
        hash: '',
        offLineUrl: ''
      })
      //console.log('Result: ', result)
      user1RequestId = result.fio_request_id
      expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`user1 (payee) Call cancel_funds_request to cancel request in pending state`, async () => {
    try {
      const result = await user1.sdk.genericAction('cancelFundsRequest', {
        fioRequestId: userA1RequestId,
        maxFee: cancel_funds_request_fee,
        technologyProviderId: ''
      })
      //console.log('Result: ', result);
      expect(result).to.have.all.keys('status', 'fee_collected')
      expect(result.status).to.equal('cancelled');
      expect(result.fee_collected).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Verify request was cancelled: get_sent_fio_requests for userA1 (payee) returns 1 request with status 'cancelled'`, async () => {
    try {
      const result = await user1.sdk.genericAction('getSentFioRequests', {
        limit: '',
        offset: ''
      })
      //console.log('result: ', result)
      expect(result.requests[0].fio_request_id).to.equal(user1RequestId);
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

  // xferaddress

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
      expect(result.status).to.equal('OK')

    } catch (err) {
      //console.log(err.message)
      expect(err).to.equal(null);
    }
  })

  // voteproducer

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
      console.log('Error: ', err)
    }
  })


  // regproxy

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
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  // unregproxy

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
      console.log('Error: ', err.json)
    }
  })

  // regproducer

  it(`Register user2 as producer`, async () => {
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user2.address,
          fio_pub_key: user2.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          actor: user2.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  // unregprod

  it(`Unregister user2 as producer`, async () => {
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'unregprod',
        account: 'eosio',
        data: {
          fio_address: user2.address,
          fio_pub_key: user2.publicKey,
          max_fee: config.api.unregister_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  // addnft

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
      //console.log(err.message)
      expect(err).to.equal(null);
    }
  })

  // remnft

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
      console.log(err.message)
    }
  })

  // remallnfts

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
      //console.log(err.message)
      expect(err).to.equal(null);
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
      console.log(err.message)
    }
  })
  
})
