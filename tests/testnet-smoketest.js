require('mocha')
const {expect} = require('chai')
const {newUser, existingUser, callFioApi, generateFioAddress, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

let user1, user2, user3

before(async () => {
  user1 = await existingUser('zzsfyigdmxmi', '5K7xWsabnxQoJAu9JnwNsMerTvCabHKaa1Q6CNYLRmjbXGUa9B8', 'FIO5NQBPnGKnhBCzhdRrrm6BD5eyYbVk2695sp2GKYLmXkR3Ycmux', 'fiotestnet', 'smoketest11@fiotestnet');
  user1.domain2 = 'transferrabledomain'
  user1.address2 = 'smoketest9@transferrabledomain'
  user2 = await existingUser('5cb1as5ppd3e', '5KS4d3tECgmDUfJNZnhjiVGEWqR7d6WDBjkkmf3bfRAvc9CLi7t', 'FIO5uQf2RW9JVoaCq9rze3xYZ1m8xDqFZpHCQqMQ86E9C68GRS3eM', 'fiotestnet', 'smoketest22@fiotestnet');
  user3 = await existingUser('ensfrgwbdv4n', '5HvKD3SyD88dRSag5CvPPNy7dRiuUGSmMgGHRwQW8PZ71mCupPY', 'FIO5d4Zj6MUd42hVgRt9kiVUrrNdg9zpjUeK2siRBCE4RySDdidm1', 'fiotestnet', 'smoketest33@fiotestnet');
})


describe(`************************** testnet-smoketest.js **************************`, () => {})

describe(`FIO Requests (error conditions only)`, () => {
  let user1RequestId
  const payment = 5000000000 // 5 FIO
  const requestMemo = 'Memo in the initial request'

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
      //console.log('Result: ', result.fio_request_id)
      user1RequestId = result.fio_request_id
      expect(result.status).to.equal('requested') 
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Create OBT in response to request with non-existent ID. Expect error type 400: ${config.error.requestNotFound}`, async () => {
    try {
      const result = await user2.sdk.genericAction('recordObtData', {
        fioRequestId: 9999999999,
        payerFioAddress: user2.address,
        payeeFioAddress: user1.address,
        payerTokenPublicAddress: user2.publicKey,
        payeeTokenPublicAddress: user1.publicKey,
        amount: 5000000000,
        chainCode: "BTC",
        tokenCode: "BTC",
        status: '',
        obtId: '',
        maxFee: config.api.record_obt_data.fee,
        technologyProviderId: '',
        payeeFioPublicKey: user1.publicKey,
        memo: 'this is a test',
        hash: '',
        offLineUrl: ''
      })
      console.log('Result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error', err);
      expect(err.json.fields[0].error).to.equal('No such FIO Request ');
      expect(err.errorCode).to.equal(400);
    }
  })

  it(`Other user3 attempts OBT with requestId from user1. Expect error type 403: ${config.error.signatureError} (part 1 with user3 as payerFioAddress)`, async () => {
    try {
      const result = await user3.sdk.genericAction('recordObtData', {
        fioRequestId: user1RequestId,
        payerFioAddress: user3.address,
        payeeFioAddress: user1.address,
        payerTokenPublicAddress: user3.publicKey,
        payeeTokenPublicAddress: user1.publicKey,
        amount: 5000000000,
        chainCode: "BTC",
        tokenCode: "BTC",
        status: '',
        obtId: '',
        maxFee: config.api.record_obt_data.fee,
        technologyProviderId: '',
        payeeFioPublicKey: user1.publicKey,
        memo: 'this is a test',
        hash: '',
        offLineUrl: ''
      })
      console.log('Result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error', err);
      expect(err.json.type).to.equal('invalid_signature');
      expect(err.json.message).to.equal(config.error.invalidRequestSignature);
      expect(err.errorCode).to.equal(403);
    }
  })

  it(`Other user3 attempts OBT with requestId from user1. Expect error type 403: ${config.error.invalidRequestSignature} (part 2 with user2 as payerFioAddress)`, async () => {
    try {
      const result = await user3.sdk.genericAction('recordObtData', {
        fioRequestId: user1RequestId,
        payerFioAddress: user2.address,
        payeeFioAddress: user1.address,
        payerTokenPublicAddress: user2.publicKey,
        payeeTokenPublicAddress: user1.publicKey,
        amount: 5000000000,
        chainCode: "BTC",
        tokenCode: "BTC",
        status: '',
        obtId: '',
        maxFee: config.api.record_obt_data.fee,
        technologyProviderId: '',
        payeeFioPublicKey: user1.publicKey,
        memo: 'this is a test',
        hash: '',
        offLineUrl: ''
      })
      console.log('Result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error', err);
      expect(err.json.type).to.equal('invalid_signature');
      expect(err.json.message).to.equal(config.error.invalidRequestSignature);
      expect(err.errorCode).to.equal(403);
    }
  })

  it(`Initial requestor user1 attempts OBT with requestId from user1. Expect error type 403: ${config.error.invalidRequestSignature}`, async () => {
    try {
      const result = await user1.sdk.genericAction('recordObtData', {
        fioRequestId: user1RequestId,
        payerFioAddress: user2.address,
        payeeFioAddress: user1.address,
        payerTokenPublicAddress: user2.publicKey,
        payeeTokenPublicAddress: user1.publicKey,
        amount: 5000000000,
        chainCode: "BTC",
        tokenCode: "BTC",
        status: '',
        obtId: '',
        maxFee: config.api.record_obt_data.fee,
        technologyProviderId: '',
        payeeFioPublicKey: user1.publicKey,
        memo: 'this is a test',
        hash: '',
        offLineUrl: ''
      })
      console.log('Result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error', err);
      expect(err.json.type).to.equal('invalid_signature');
      expect(err.json.message).to.equal(config.error.invalidRequestSignature);
      expect(err.errorCode).to.equal(403);
    }
  })
})

describe(`Cancel Funds Request`, () => {
  const payment = 5000000000 // 5 FIO
  const requestMemo = 'Memo in the initial request'

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

  it('Wait a few seconds To make sure the obt gets recorded.', async () => {
    await timeout(2000);
  })

  it(`get_sent_fio_requests for user1`, async () => {
    try {
      const result = await user1.sdk.genericAction('getSentFioRequests', {
        limit: '',
        offset: ''
      }) 
      //console.log('result: ', result)
      numRequests = result.requests.length;
      expect(result.requests[numRequests-1].fio_request_id).to.equal(user1RequestId);
      expect(result.requests[numRequests-1].content.memo).to.equal(requestMemo);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`get_pending_fio_requests for user2`, async () => {
    try {
      const result = await user2.sdk.genericAction('getPendingFioRequests', {
        limit: '',
        offset: ''
      }) 
      //console.log('result: ', result)
      numRequests = result.requests.length;
      expect(result.requests[numRequests-1].fio_request_id).to.equal(user1RequestId);
      expect(result.requests[numRequests-1].content.memo).to.equal(requestMemo);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Call cancel_funds_request (push transaction) to cancel request in pending state`, async () => {
    try{
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'cancelfndreq',
        account: 'fio.reqobt',
        data: {
          "fio_request_id": user1RequestId,
          "max_fee": config.api.cancel_funds_request.fee,
          "tpid": '',
          "actor": user1.account
        }
      })
      //console.log('Result: ', result);
      expect(result).to.have.all.keys('status', 'fee_collected')
      expect(result.status).to.equal('cancelled');
      expect(result.fee_collected).to.equal(0);
    } catch (err) {
      console.log('Error', err.json);
      expect(err).to.equal(null);
    }
  })

  it(`Verify request was cancelled: get_sent_fio_requests for user1 returns 1 request with status 'cancelled'`, async () => {
    try {
      const result = await user1.sdk.genericAction('getSentFioRequests', {
        limit: '',
        offset: ''
      }) 
      //console.log('result: ', result)
      numRequests = result.requests.length;
      expect(result.requests[numRequests-1].fio_request_id).to.equal(user1RequestId);
      expect(result.requests[numRequests-1].content.memo).to.equal(requestMemo);
      expect(result.requests[numRequests-1].status).to.equal('cancelled');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Verify request was cancelled: get_cancelled_fio_requests returns 1 request with status 'cancelled'`, async () => {
    try {
      const json = {
        "fio_public_key": user1.publicKey
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      //console.log('Result: ', result);
      numRequests = result.requests.length;
      expect(result.requests[numRequests-1].fio_request_id).to.equal(user1RequestId);
      expect(result.requests[numRequests-1].status).to.equal('cancelled');
    } catch (err) {
      console.log('Error', err)
      expect(err.error.message).to.equal(config.error.noFioRequests)
    }
  })

})

describe('Transfer domain', () => {

  let user1OrigBalance, transfer_fio_domain_fee, feeCollected

  it('Get transfer_fio_domain fee', async () => {
    try {
      result = await user1.sdk.getFee('transfer_fio_domain', user1.address);
      transfer_fio_domain_fee = result.fee;
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`getFioNames for user1 and confirm it owns user1.domain2`, async () => {
    try {
      const result = await user1.sdk.genericAction('getFioNames', {
        fioPublicKey: user1.publicKey
      }) 
      //console.log('getFioNames', result)
      for (domain in result.fio_domains) {
        if (result.fio_domains[domain].fio_domain == user1.domain2) {break} 
      }
      expect(result.fio_domains[domain].fio_domain).to.equal(user1.domain2);
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Get balance for user1`, async () => {
    try {
      const result = await user1.sdk.genericAction('getFioBalance', {
        fioPublicKey: user1.publicKey
      }) 
      user1OrigBalance = result.balance
      //console.log('user1 fio balance', result)
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Transfer user1.domain2 to user2`, async () => {
    try {
        const result = await user1.sdk.genericAction('transferFioDomain', {
          fioDomain: user1.domain2,
          newOwnerKey: user2.publicKey,
          maxFee: transfer_fio_domain_fee,
          walletFioAddress: ''
        })
        feeCollected = result.fee_collected;
        //console.log('Result: ', result);
        expect(result.status).to.equal('OK');
    } catch (err) {
        console.log('Error: ', err.json.error);
        expect(err).to.equal(null);
    } 
  })

  it('Confirm proper fee was collected', async () => {
    expect(feeCollected).to.equal(transfer_fio_domain_fee)
  })

  it('Confirm fee was deducted from user1 account', async () => {
    try {
      const result = await user1.sdk.genericAction('getFioBalance', {
        fioPublicKey: user1.publicKey
      }) 
      expect(result.balance).to.equal(user1OrigBalance - transfer_fio_domain_fee);
      //console.log('user1 fio balance', result)
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`getFioNames for user1 and confirm it still owns the address registered on the domain`, async () => {
    try {
      const result = await user1.sdk.genericAction('getFioNames', {
        fioPublicKey: user1.publicKey
      }) 
      //console.log('getFioNames', result)
      for (address in result.fio_addresses) {
        if (result.fio_addresses[address].fio_address == user1.address2) {break} 
      }
      expect(result.fio_addresses[address].fio_address).to.equal(user1.address2);
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`getFioNames for user2 and confirm it now owns the domain`, async () => {
    try {
      const result = await user2.sdk.genericAction('getFioNames', {
        fioPublicKey: user2.publicKey
      }) 
      //console.log('getFioNames', result)
      for (domain in result.fio_domains) {
        if (result.fio_domains[domain].fio_domain == user1.domain2) {break} 
      }
      expect(result.fio_domains[domain].fio_domain).to.equal(user1.domain2);
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Transfer user1.domain2 back to user1 from user2 to clean up test`, async () => {
    try {
        const result = await user2.sdk.genericAction('transferFioDomain', {
          fioDomain: user1.domain2,
          newOwnerKey: user1.publicKey,
          maxFee: transfer_fio_domain_fee,
          walletFioAddress: ''
        })
        feeCollected = result.fee_collected;
        //console.log('Result: ', result);
        expect(result.status).to.equal('OK');
    } catch (err) {
        console.log('Error: ', err.json.error);
        expect(err).to.equal(null);
    } 
  })

})

describe(`Remove pub address`, () => {

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

  it('Wait a few seconds To make add_address goes through.', async () => {
    await timeout(2000);
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

})

describe(`Paging - FIO Address`, () => {
  let addressCount = 20, newAddressCount

  // Only include if you need to generate new addresses.
  it.skip(`Register ${addressCount} addresses for user3`, async () => {
    for (i = 0; i < addressCount; i++) {
      try {
        newAddress = i + generateFioAddress(user3.domain, 7)
        const result = await user3.sdk.genericAction('registerFioAddress', { 
          fioAddress: newAddress, 
          maxFee: config.api.register_fio_address.fee,
          walletFioAddress: ''
        })   
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error: ', err)
      }
    }
  })

  it(`Call (get_fio_addresses, no limit param, no offset param). Get current number of addressess.`, async () => {
    try {
      const json = {
        "fio_public_key": user3.publicKey
      }
      result = await callFioApi("get_fio_addresses", json);
      //console.log('Result: ', result);
      newAddressCount = result.fio_addresses.length;
      expect(result.fio_addresses.length).to.be.greaterThan(addressCount-1)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call (get_fio_addresses, limit=0, offset=0). Expect newAddressCount results.`, async () => {
    try {
      const json = {
        "fio_public_key": user3.publicKey,
        "limit": 0,
        "offset": 0
      }
      result = await callFioApi("get_fio_addresses", json);
      //console.log('Result: ', result);
      expect(result.fio_addresses.length).to.equal(newAddressCount)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call (get_fio_addresses, limit=1, offset=0). Expect 1 address. Expect address user3.address`, async () => {
    try {
      const json = {
        "fio_public_key": user3.publicKey,
        "limit": 1,
        "offset": 0
      }
      result = await callFioApi("get_fio_addresses", json);
      //console.log('Result: ', result);
      expect(result.fio_addresses.length).to.equal(1);
      expect(result.fio_addresses[0].fio_address).to.equal(user3.address); // First character of address = 0 (1st address in list)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call (get_fio_addresses, limit=2, offset=4). Expect 2 address. Expect address #5-6`, async () => {
    try {
      const json = {
        "fio_public_key": user3.publicKey,
        "limit": 2,
        "offset": 4
      }
      result = await callFioApi("get_fio_addresses", json);
      //console.log('Result: ', result);
      expect(result.fio_addresses.length).to.equal(2);
      expect(result.fio_addresses[0].fio_address.charAt(0)).to.equal('3'); // First character of address = 4 (5th address in list)
      expect(result.fio_addresses[1].fio_address.charAt(0)).to.equal('4'); 
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call (get_fio_addresses, limit=10, offset=15). Expect address #16-20`, async () => {
    try {
      const json = {
        "fio_public_key": user3.publicKey,
        "limit": 10,
        "offset": 15
      }
      result = await callFioApi("get_fio_addresses", json);
      //console.log('Result: ', result);
      expect(result.fio_addresses[0].fio_address.charAt(0)).to.equal('1'); 
      expect(result.fio_addresses[0].fio_address.charAt(1)).to.equal('4'); // 15         
      expect(result.fio_addresses[4].fio_address.charAt(0)).to.equal('1'); 
      expect(result.fio_addresses[4].fio_address.charAt(1)).to.equal('8'); // 19
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Negative offset. Call (get_fio_addresses, limit=1, offset=-1). Expect error type 400: ${config.error.invalidOffset}`, async () => {
    try {
      const json = {
        "fio_public_key": user3.sdk.publicKey,
        "limit": 1,
        "offset": -1
      }
      result = await callFioApi("get_fio_addresses", json);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error);
      expect(err.error.fields[0].error).to.equal(config.error.invalidOffset);
      expect(err.statusCode).to.equal(400);
    }
  })

  it(`Negative limit. Call (get_fio_addresses, limit=-5, offset=5). Expect error type 400: ${config.error.invalidLimit}`, async () => {
    try {
      const json = {
        "fio_public_key": user3.publicKey,
        "limit": -5,
        "offset": 5
      }
      result = await callFioApi("get_fio_addresses", json);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error);
      expect(err.error.fields[0].error).to.equal(config.error.invalidLimit);
      expect(err.statusCode).to.equal(400);
    }
  })

  it(`Send string to limit/offset. Expect error type 500: ${config.error.parseError}`, async () => {
    try {
      const json = {
        "fio_public_key": user3.publicKey,
        "limit": "string",
        "offset": "string2"
      }
      result = await callFioApi("get_fio_addresses", json);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error.error);
      expect(err.error.error.what).to.equal(config.error.parseError);
      expect(err.statusCode).to.equal(500);
    }
  })

  it(`Invalid pub key. Expect error type 400: ${config.error.invalidKey}`, async () => {
    try {
      const json = {
        "fio_public_key": 'FIOXXXLGcmXLCw87pqNMFurd23SqqEDbCUirr7vwuwuzfaySxQ9w6',
        "limit": 5,
        "offset": 5
      }
      result = await callFioApi("get_fio_addresses", json);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error);
      expect(err.error.fields[0].error).to.equal(config.error.invalidKey);
      expect(err.statusCode).to.equal(400);
    }
  })

  it(`Use floats in limit/offset. Expect valid return with zero results.`, async () => {
    try {
      const json = {
        "fio_public_key": user3.publicKey,
        "limit": 123.456,
        "offset": 345.678
      }
      result = await callFioApi("get_fio_addresses", json);
      //console.log('Result: ', result)
      expect(result.fio_addresses.length).to.equal(0)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null)
    }
  })

  it(`No pub key. Expect error type 400: ${config.error.invalidKey}`, async () => {
    try {
      const json = {
        "limit": 1,
        "offset": 1
      }
      result = await callFioApi("get_fio_addresses", json);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error);
      expect(err.error.fields[0].error).to.equal(config.error.invalidKey);
      expect(err.statusCode).to.equal(400);
    }
  })

})