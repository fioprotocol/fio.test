require('mocha')
config = require('../config.js');
const {expect} = require('chai')
const {newUser, fetchJson, callFioApi} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/FIOSDK')


before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** cancel-funds-request.js ************************** \n A. cancel_funds_request with bundles remaining`, () => {
  let userA1, userA2, userA1RequestId, cancel_funds_request_fee, userA1OrigRam, userA1OrigBundle
  const payment = 5000000000 // 5 FIO
  const requestMemo = 'Memo in the initial request'
  const btcPubAdd = 'btc:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'

  it(`Create users`, async () => {
      userA1 = await newUser(faucet);
      userA2 = await newUser(faucet);
  })

  it(`userA1 requests funds from userA2`, async () => {
    try {
      const result = await userA1.sdk.genericAction('requestFunds', { 
        payerFioAddress: userA2.address, 
        payeeFioAddress: userA1.address,
        payeeTokenPublicAddress: 'thisispayeetokenpublicaddress',
        amount: payment,
        chainCode: 'BTC',
        tokenCode: 'BTC',
        memo: requestMemo,
        maxFee: config.api.new_funds_request.fee,
        payerFioPublicKey: userA2.publicKey,
        technologyProviderId: '',
        hash: '',
        offLineUrl: ''
      })    
      //console.log('Result: ', result)
      userA1RequestId = result.fio_request_id
      expect(result.status).to.equal('requested') 
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`get_sent_fio_requests for userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getSentFioRequests', {
        limit: '',
        offset: ''
      }) 
      //console.log('result: ', result)
      expect(result.requests[0].fio_request_id).to.equal(userA1RequestId);
      expect(result.requests[0].content.memo).to.equal(requestMemo);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`get_pending_fio_requests for userA2`, async () => {
    try {
      const result = await userA2.sdk.genericAction('getPendingFioRequests', {
        limit: '',
        offset: ''
      }) 
      //console.log('result: ', result)
      expect(result.requests[0].fio_request_id).to.equal(userA1RequestId);
      expect(result.requests[0].content.memo).to.equal(requestMemo);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it('Confirm cancel_funds_request fee for userA1 is zero (bundles remaining)', async () => {
    try {
      result = await userA1.sdk.getFee('cancel_funds_request', userA1.address);
      cancel_funds_request_fee = result.fee;
      //console.log('result: ', result)
      expect(result.fee).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Call get_table_rows from fionames to get bundles remaining for userA1', async () => {
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.address',      // Contract that we target
        scope: 'fio.address',         // Account that owns the data
        table: 'fionames',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      fionames = await callFioApi("get_table_rows", json);
      //console.log('fionames: ', fionames);
      for (name in fionames.rows) {
        if (fionames.rows[name].name == userA1.address) {
          //console.log('bundleeligiblecountdown: ', fionames.rows[name].bundleeligiblecountdown); 
          userA1OrigBundle = fionames.rows[name].bundleeligiblecountdown;
        }
      }
      expect(userA1OrigBundle).to.equal(98);  // 2 for new_funds_request
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get RAM quota for userA1`, async () => {
    try {
      const json = {
        "account_name": userA1.account
      }
      result = await callFioApi("get_account", json);
      userA1OrigRam = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call cancel_funds_request to cancel request in pending state`, async () => {
    try{
      const result = await userA1.sdk.genericAction('cancelFundsRequest', {
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

  it(`Verify request was cancelled: get_sent_fio_requests for userA1 returns 1 request with status 'cancelled'`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getSentFioRequests', {
        limit: '',
        offset: ''
      }) 
      //console.log('result: ', result)
      expect(result.requests[0].fio_request_id).to.equal(userA1RequestId);
      expect(result.requests[0].content.memo).to.equal(requestMemo);
      expect(result.requests[0].status).to.equal('cancelled');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Verify request was cancelled: get_pending_fio_requests for userA2 returns: ${config.error.noPendingRequests}`, async () => {
    try {
      const result = await userA2.sdk.genericAction('getPendingFioRequests', {
        limit: '',
        offset: ''
      }) 
      console.log('result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error: ', err.json);
      expect(err.json.message).to.equal(config.error.noPendingRequests);
    }
  })

  it(`Verify request was cancelled: get_cancelled_fio_requests returns 1 request with status 'cancelled'`, async () => {
    try {
      const json = {
        "fio_public_key": userA1.publicKey
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      //console.log('Result: ', result);
      expect(result.requests[0].fio_request_id).to.equal(userA1RequestId);
      expect(result.requests[0].status).to.equal('cancelled');
    } catch (err) {
      //console.log('Error', err.error.message)
      expect(err.error.message).to.equal(config.error.noFioRequests)
    }
  })

  it(`Verify userA1 bundle count decreased by 1`, async () => {
    let bundleCount;
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.address',      // Contract that we target
        scope: 'fio.address',         // Account that owns the data
        table: 'fionames',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      fionames = await callFioApi("get_table_rows", json);
      //console.log('fionames: ', fionames);
      for (name in fionames.rows) {
        if (fionames.rows[name].name == userA1.address) {
          //console.log('bundleeligiblecountdown: ', fionames.rows[name].bundleeligiblecountdown); 
          bundleCount = fionames.rows[name].bundleeligiblecountdown;
        }
      }
      expect(bundleCount).to.equal(userA1OrigBundle - 1);  // 1 bundle for cancel_funds_request
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Verify RAM quota for userA1 was incremented by ${config.RAM.CANCELFUNDSRAM}`, async () => {
    try {
      const json = {
        "account_name": userA1.account
      }
      result = await callFioApi("get_account", json);
      //console.log('Ram quota: ', result.ram_quota);
      expect(result.ram_quota).to.equal(userA1OrigRam + config.RAM.CANCELFUNDSRAM);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })
})


describe('B. cancel_funds_request with NO bundles remaining', () => {

  let userB1, userB2, userB1RequestId, cancel_funds_request_fee, userB1OrigRam, userB1OrigBundle
  const payment = 5000000000 // 5 FIO
  const requestMemo = 'Memo in the initial request'
  const btcPubAdd = 'btc:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'

  it(`Create users`, async () => {
      userB1 = await newUser(faucet);
      userB2 = await newUser(faucet);
  })

  it(`Use up all of userB1's bundles with 51 record_obt_data transactions`, async () => {
    for (i = 0; i < 51; i++) {
      try {
        const result = await userB1.sdk.genericAction('recordObtData', {
          payerFioAddress: userB1.address,
          payeeFioAddress: userB2.address,
          payerTokenPublicAddress: userB1.publicKey,
          payeeTokenPublicAddress: userB2.publicKey,
          amount: 5000000000,
          chainCode: "BTC",
          tokenCode: "BTC",
          status: '',
          obtId: '',
          maxFee: config.api.record_obt_data.fee,
          technologyProviderId: '',
          payeeFioPublicKey: userB2.publicKey,
          memo: 'this is a test',
          hash: '',
          offLineUrl: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('sent_to_blockchain')
      } catch (err) {
        console.log('Error', err.json)
        expect(err).to.equal(null)
      }
    }
  })

  it(`Add BTC address to userB1`, async () => {
    try {
      const result = await userB1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userB1.address,
        publicAddresses: [
          {
            chain_code: 'BTC',
            token_code: 'BTC',
            public_address: btcPubAdd,
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        technologyProviderId: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK') 
    } catch (err) {
      console.log('Error', err)
      //expect(err).to.equal(null)
    }      
  })

  it(`userB1 requests funds from userB2`, async () => {
    try {
      const result = await userB1.sdk.genericAction('requestFunds', { 
        payerFioAddress: userB2.address, 
        payeeFioAddress: userB1.address,
        payeeTokenPublicAddress: 'thisispayeetokenpublicaddress',
        amount: payment,
        chainCode: 'BTC',
        tokenCode: 'BTC',
        memo: requestMemo,
        maxFee: config.api.new_funds_request.fee,
        payerFioPublicKey: userB2.publicKey,
        technologyProviderId: '',
        hash: '',
        offLineUrl: ''
      })    
      //console.log('Result: ', result)
      userB1RequestId = result.fio_request_id
      expect(result.status).to.equal('requested') 
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`get_sent_fio_requests for userB1`, async () => {
    try {
      const result = await userB1.sdk.genericAction('getSentFioRequests', {
        limit: '',
        offset: ''
      }) 
      //console.log('result: ', result)
      expect(result.requests[0].fio_request_id).to.equal(userB1RequestId);
      expect(result.requests[0].content.memo).to.equal(requestMemo);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`get_pending_fio_requests for userB2`, async () => {
    try {
      const result = await userB2.sdk.genericAction('getPendingFioRequests', {
        limit: '',
        offset: ''
      }) 
      //console.log('result: ', result)
      expect(result.requests[0].fio_request_id).to.equal(userB1RequestId);
      expect(result.requests[0].content.memo).to.equal(requestMemo);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Verify cancel_funds_request fee is > 0 (no more bundles)`, async () => {
    try {
      result = await userB1.sdk.getFee('cancel_funds_request', userB1.address);
      cancel_funds_request_fee = result.fee;
      //console.log('result: ', result)
      expect(result.fee).to.be.greaterThan(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Call get_table_rows from fionames to get bundles remaining for userB1. Expect 0 bundles', async () => {
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.address',      // Contract that we target
        scope: 'fio.address',         // Account that owns the data
        table: 'fionames',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      fionames = await callFioApi("get_table_rows", json);
      //console.log('fionames: ', fionames);
      for (name in fionames.rows) {
        if (fionames.rows[name].name == userB1.address) {
          //console.log('bundleeligiblecountdown: ', fionames.rows[name].bundleeligiblecountdown); 
          userB1OrigBundle = fionames.rows[name].bundleeligiblecountdown;
        }
      }
      expect(userB1OrigBundle).to.equal(0);  
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get RAM quota for userB1`, async () => {
    try {
      const json = {
        "account_name": userB1.account
      }
      result = await callFioApi("get_account", json);
      userB1OrigRam = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call cancel_funds_request to cancel request in pending state. Verify fee was collected`, async () => {
    try{
      const result = await userB1.sdk.genericAction('cancelFundsRequest', {
        fioRequestId: userB1RequestId,
        maxFee: cancel_funds_request_fee,
        technologyProviderId: ''
      })
      //console.log('Result: ', result);
      expect(result).to.have.all.keys('status', 'fee_collected')
      expect(result.status).to.equal('cancelled');
      expect(result.fee_collected).to.equal(cancel_funds_request_fee);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Verify request was cancelled: get_sent_fio_requests for userB1 returns 1 request with status 'cancelled'`, async () => {
    try {
      const result = await userB1.sdk.genericAction('getSentFioRequests', {
        limit: '',
        offset: ''
      }) 
      //console.log('result: ', result)
      expect(result.requests[0].fio_request_id).to.equal(userB1RequestId);
      expect(result.requests[0].content.memo).to.equal(requestMemo);
      expect(result.requests[0].status).to.equal('cancelled');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Verify request was cancelled: get_pending_fio_requests for userB2 returns: ${config.error.noPendingRequests}`, async () => {
    try {
      const result = await userB2.sdk.genericAction('getPendingFioRequests', {
        limit: '',
        offset: ''
      }) 
      console.log('result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error: ', err.json);
      expect(err.json.message).to.equal(config.error.noPendingRequests);
    }
  })

  it(`Verify request was cancelled: get_cancelled_fio_requests returns 1 request with status 'cancelled'`, async () => {
    try {
      const json = {
        "fio_public_key": userB1.publicKey
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      //console.log('Result: ', result);
      expect(result.requests[0].fio_request_id).to.equal(userB1RequestId);
      expect(result.requests[0].status).to.equal('cancelled');
    } catch (err) {
      //console.log('Error', err.error.message)
      expect(err.error.message).to.equal(config.error.noFioRequests)
    }
  })

  it(`Verify RAM quota for userB1 was incremented by ${config.RAM.CANCELFUNDSRAM}`, async () => {
    try {
      const json = {
        "account_name": userB1.account
      }
      result = await callFioApi("get_account", json);
      //console.log('Ram quota: ', result.ram_quota);
      expect(result.ram_quota).to.equal(userB1OrigRam + config.RAM.CANCELFUNDSRAM);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})

describe(`C. Test cancel_funds_request error conditions`, () => {
  let userC1, userC2, userC1RequestId, userC1RequestId2, userC1Balance
  const payment = 5000000000 // 5 FIO
  const requestMemo = 'Memo in the initial request'
  const btcPubAdd = 'btc:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'

  it(`Create users`, async () => {
    userC1 = await newUser(faucet);
    userC2 = await newUser(faucet);
  })
  
  it(`Run get_cancelled_fio_requests when no request have been cancelled. Expect error type 404: ${config.error.noFioRequests}`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      //console.log('Result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error', err)
      expect(err.error.message).to.equal(config.error.noFioRequests)
      expect(err.statusCode).to.equal(404);
    }
  })

  it(`userC1 requests funds from userC2`, async () => {
    try {
      const result = await userC1.sdk.genericAction('requestFunds', { 
        payerFioAddress: userC2.address, 
        payeeFioAddress: userC1.address,
        payeeTokenPublicAddress: 'thisispayeetokenpublicaddress',
        amount: payment,
        chainCode: 'BTC',
        tokenCode: 'BTC',
        memo: requestMemo,
        maxFee: config.api.new_funds_request.fee,
        payerFioPublicKey: userC2.publicKey,
        technologyProviderId: '',
        hash: '',
        offLineUrl: ''
      })    
      //console.log('Result: ', result.fio_request_id)
      userC1RequestId = result.fio_request_id
      expect(result.status).to.equal('requested') 
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Cancel non-existent request. Expect error type 400: ${config.error.requestNotFound}`, async () => {
    try{
      const result = await userC1.sdk.genericAction('pushTransaction', {
        action: 'cancelfndreq',
        account: 'fio.reqobt',
        data: {
          "fio_request_id": 1000,
          "max_fee": config.api.cancel_funds_request.fee,
          "tpid": '',
          "actor": userC1.account
        }
      })
      //console.log('Result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error', err);
      expect(err.json.fields[0].error).to.equal(config.error.requestNotFound);
      expect(err.errorCode).to.equal(400);
    }
  })

  it(`Cancel request with invalid tpid. Expect error type 400: ${config.error.invalidTpid}`, async () => {
    try{
      const result = await userC1.sdk.genericAction('pushTransaction', {
        action: 'cancelfndreq',
        account: 'fio.reqobt',
        data: {
          "fio_request_id": userC1RequestId,
          "max_fee": config.api.cancel_funds_request.fee,
          "tpid": '-invalidtpid-',
          "actor": userC1.account
        }
      })
      //console.log('Result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error', err);
      expect(err.json.fields[0].error).to.equal(config.error.invalidTpid);
      expect(err.errorCode).to.equal(400);
    }
  })

  it(`Cancel request not initiated by actor. Expect error type 403: ${config.error.signatureError}`, async () => {
    try{
      const result = await userC2.sdk.genericAction('pushTransaction', {
        action: 'cancelfndreq',
        account: 'fio.reqobt',
        data: {
          "fio_request_id": userC1RequestId,
          "max_fee": config.api.cancel_funds_request.fee,
          "tpid": '',
          "actor": userC2.account
        }
      })
      //console.log('Result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error', err);
      expect(err.json.message).to.equal(config.error.signatureError);
      expect(err.errorCode).to.equal(403);
    }
  })

  it(`userC2 records OBT response to transaction`, async () => {
      try {
        const result = await userC2.sdk.genericAction('recordObtData', {
          fioRequestId: userC1RequestId,
          payerFioAddress: userC2.address,
          payeeFioAddress: userC1.address,
          payerTokenPublicAddress: userC2.publicKey,
          payeeTokenPublicAddress: userC1.publicKey,
          amount: 5000000000,
          chainCode: "BTC",
          tokenCode: "BTC",
          status: '',
          obtId: '',
          maxFee: config.api.record_obt_data.fee,
          technologyProviderId: '',
          payeeFioPublicKey: userC1.publicKey,
          memo: 'this is a test',
          hash: '',
          offLineUrl: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('sent_to_blockchain')
      } catch (err) {
        console.log('Error', err.json)
        expect(err).to.equal(null)
      }
  })

   it(`Cancel request after it was approved. Expect error type 400: ${config.error.invalidRequestStatus}`, async () => {
    try{
      const result = await userC1.sdk.genericAction('pushTransaction', {
        action: 'cancelfndreq',
        account: 'fio.reqobt',
        data: {
          "fio_request_id": userC1RequestId,
          "max_fee": config.api.cancel_funds_request.fee,
          "tpid": '',
          "actor": userC1.account
        }
      })
      console.log('Result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error', err);
      expect(err.json.fields[0].error).to.equal(config.error.invalidRequestStatus);
      expect(err.errorCode).to.equal(400);
    }
  })

  it(`Add ETH address to userC1`, async () => {
    try {
      const result = await userC1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userC1.address,
        publicAddresses: [
          {
            chain_code: 'ETH',
            token_code: 'ETH',
            public_address: 'adsfasdfasdfasdf',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        technologyProviderId: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK') 
    } catch (err) {
      console.log('Error', err)
      //expect(err).to.equal(null)
    }      
  })

  it(`userC1 request #2 from userC2`, async () => {
    try {
      const result = await userC1.sdk.genericAction('requestFunds', { 
        payerFioAddress: userC2.address, 
        payeeFioAddress: userC1.address,
        payeeTokenPublicAddress: 'thisispayeetokenpublicaddress',
        amount: payment,
        chainCode: 'BTC',
        tokenCode: 'BTC',
        memo: requestMemo,
        maxFee: config.api.new_funds_request.fee,
        payerFioPublicKey: userC2.publicKey,
        technologyProviderId: '',
        hash: '',
        offLineUrl: ''
      })    
      //console.log('Result: ', result)
      userC1RequestId2 = result.fio_request_id
      expect(result.status).to.equal('requested') 
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Use up all of userC1's bundles with 51 record_obt_data transactions`, async () => {
    for (i = 0; i < 51; i++) {
      try {
        const result = await userC1.sdk.genericAction('recordObtData', {
          payerFioAddress: userC1.address,
          payeeFioAddress: userC2.address,
          payerTokenPublicAddress: userC1.publicKey,
          payeeTokenPublicAddress: userC2.publicKey,
          amount: 5000000000,
          chainCode: "BTC",
          tokenCode: "BTC",
          status: '',
          obtId: '',
          maxFee: config.api.record_obt_data.fee,
          technologyProviderId: '',
          payeeFioPublicKey: userC2.publicKey,
          memo: 'this is a test',
          hash: '',
          offLineUrl: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('sent_to_blockchain')
      } catch (err) {
        console.log('Error', err.json)
        expect(err).to.equal(null)
      }
    }
  })

  it(`vote_producer to use up last remaining bundle`, async () => {
    try {
      const result = await userC1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: userC1.address,
          actor: userC1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK') 
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    } 
  })

  it(`Get balance for userC1`, async () => {
    try {
      const result = await userC1.sdk.genericAction('getFioBalance', {
        fioPublicKey: userC1.publicKey
      }) 
      userC1Balance = result.balance
      //console.log('userC1 fio balance', result)
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it('Transfer entire balance for userC1 to userC2 to register address', async () => {
    try {
      const result = await userC1.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: userC2.publicKey,
        amount: userC1Balance - config.api.transfer_tokens_pub_key.fee,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        walletFioAddress: ''
      })
      //console.log('Result: ', result)
      expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    } 
  })

  it(`Verify balance for userC1 = 0`, async () => {
    try {
      const result = await userC1.sdk.genericAction('getFioBalance', {
        fioPublicKey: userC1.publicKey
      }) 
      //console.log('userC1 fio balance', result)
      expect(result.balance).to.equal(0)
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it('Call get_table_rows from fionames to get bundles remaining for userC1. Verify 0 bundles', async () => {
    let bundleCount
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.address',      // Contract that we target
        scope: 'fio.address',         // Account that owns the data
        table: 'fionames',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      fionames = await callFioApi("get_table_rows", json);
      //console.log('fionames: ', fionames);
      for (name in fionames.rows) {
        if (fionames.rows[name].name == userC1.address) {
          //console.log('bundleeligiblecountdown: ', fionames.rows[name].bundleeligiblecountdown); 
          bundleCount = fionames.rows[name].bundleeligiblecountdown;
        }
      }
      expect(bundleCount).to.equal(0);  
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Cancel request without available bundled tx and with insufficient fee. Expect error type 400: ${config.error.insufficientFunds}`, async () => {
    try{
      const result = await userC1.sdk.genericAction('pushTransaction', {
        action: 'cancelfndreq',
        account: 'fio.reqobt',
        data: {
          "fio_request_id": userC1RequestId2,
          "max_fee": config.api.cancel_funds_request.fee,
          "tpid": '',
          "actor": userC1.account
        }
      })
      console.log('Result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error', err);
      expect(err.json.fields[0].error).to.equal(config.error.insufficientFunds);
      expect(err.errorCode).to.equal(400);
    }
  })

})
