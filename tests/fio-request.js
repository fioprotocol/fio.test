require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/FIOSDK')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** fio-request.js ************************** \n A. Send fio request from userA1 to userA2`, () => {

    let userA1, userA2, requestId
    const payment = 5000000000 // 5 FIO
    const requestMemo = 'Memo in the initial request'
    const obtMemo = 'Memo in OBT response to request'
    const btcPubAdd = 'btc:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'

    it(`Create users`, async () => {
        userA1 = await newUser(faucet);
        userA2 = await newUser(faucet);
    })
  
    it(`Add BTC addresses to userA1`, async () => {
      try {
        const result = await userA1.sdk.genericAction('addPublicAddresses', {
          fioAddress: userA1.address,
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
          hash: 'fmwazjvmenfz',  // This is the hash of off-chain data... ?
          offlineUrl: ''
        })    
        //console.log('Result: ', result)
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
        //console.log('content: ', result.requests[0].content)
        requestId = result.requests[0].fio_request_id
        expect(result.requests[0].content.memo).to.equal(requestMemo)  
      } catch (err) {
        console.log('Error: ', err)
        expect(err).to.equal(null)
      }
    })

    it(`get_pending_fio_requests for userA2`, async () => {
      try {
        const result = await userA2.sdk.genericAction('getPendingFioRequests', {
          limit: '',
          offset: ''
        }) 
        //console.log('result: ', result)
        //console.log('content: ', result.requests[0].content)
        expect(result.requests[0].fio_request_id).to.equal(requestId)  
        expect(result.requests[0].content.memo).to.equal(requestMemo)  
      } catch (err) {
        console.log('Error: ', err)
        expect(err).to.equal(null)
      }
    })

    it('userA2 getPublicAddress for userA1 BTC', async () => {
      try {
        const result = await userA2.sdk.genericAction('getPublicAddress', {
          fioAddress: userA1.address,
          chainCode: "BTC",
          tokenCode: "BTC"
        })  
        //console.log('Result', result)
        expect(result.public_address).to.equal(btcPubAdd)  
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it(`userA2 transferTokens to userA1`, async () => {
      const result = await userA2.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: payment,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      walletFioAddress: ''
    })
    //console.log('Result: ', result)
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
  })

  it(`userA2 does recordObtData previous payment with the fioRequestId`, async () => {
    try {
      const result = await userA2.sdk.genericAction('recordObtData', {
        fioRequestId: requestId,
        payerFioAddress: userA2.address,
        payeeFioAddress: userA1.address,
        payerTokenPublicAddress: userA2.publicKey,
        payeeTokenPublicAddress: userA1.publicKey,
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

  it('Wait a few seconds To make sure the obt gets recorded.', async () => {
    await timeout(5000);
  })

  it(`get_sent_fio_requests for userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getSentFioRequests', {
        limit: '',
        offset: ''
      }) 
      //console.log('result: ', result)
      //console.log('content: ', result.requests[0].content)
      expect(result.requests[0].content.memo).to.equal(requestMemo)  
      expect(result.requests[0].status).to.equal('sent_to_blockchain')  
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`getObtData for userA2`, async () => {
    try {
      const result = await userA2.sdk.genericAction('getObtData', {
        limit: '',
        offset: '',
        tokenCode: 'BTC'
      }) 
      //console.log('result: ', result)
      //console.log('content: ', result.obt_data_records[0].content)
      expect(result.obt_data_records[0].content.memo).to.equal(obtMemo)  
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`getObtData for userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getObtData', {
        limit: '',
        offset: '',
        tokenCode: 'BTC'
      }) 
      //console.log('result: ', result)
      //console.log('content: ', result.obt_data_records[0].content)
      expect(result.obt_data_records[0].content.memo).to.equal(obtMemo)  
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })
  
})

describe(`B. Test FIO Request error conditions`, () => {
  let userB1, userB2, userB3, userB1RequestId, userB1RequestId2, userB1Balance
  const payment = 5000000000 // 5 FIO
  const requestMemo = 'Memo in the initial request'
  const btcPubAdd = 'btc:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'

  it(`Create users`, async () => {
    userB1 = await newUser(faucet);
    userB2 = await newUser(faucet);
    userB3 = await newUser(faucet);
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
      //console.log('Result: ', result.fio_request_id)
      userB1RequestId = result.fio_request_id
      expect(result.status).to.equal('requested') 
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Create OBT in response to request with non-existent ID. Expect error type 400: ${config.error.requestNotFound}`, async () => {
    try {
      const result = await userB2.sdk.genericAction('recordObtData', {
        fioRequestId: 999,
        payerFioAddress: userB2.address,
        payeeFioAddress: userB1.address,
        payerTokenPublicAddress: userB2.publicKey,
        payeeTokenPublicAddress: userB1.publicKey,
        amount: 5000000000,
        chainCode: "BTC",
        tokenCode: "BTC",
        status: '',
        obtId: '',
        maxFee: config.api.record_obt_data.fee,
        technologyProviderId: '',
        payeeFioPublicKey: userB1.publicKey,
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

  it(`Other userB3 attempts OBT with requestId from userB1. Expect error type 403: ${config.error.signatureError} (part 1 with userB3 as payerFioAddress)`, async () => {
    try {
      const result = await userB3.sdk.genericAction('recordObtData', {
        fioRequestId: userB1RequestId,
        payerFioAddress: userB3.address,
        payeeFioAddress: userB1.address,
        payerTokenPublicAddress: userB3.publicKey,
        payeeTokenPublicAddress: userB1.publicKey,
        amount: 5000000000,
        chainCode: "BTC",
        tokenCode: "BTC",
        status: '',
        obtId: '',
        maxFee: config.api.record_obt_data.fee,
        technologyProviderId: '',
        payeeFioPublicKey: userB1.publicKey,
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

  it(`Other userB3 attempts OBT with requestId from userB1. Expect error type 403: ${config.error.invalidRequestSignature} (part 2 with userB2 as payerFioAddress)`, async () => {
    try {
      const result = await userB3.sdk.genericAction('recordObtData', {
        fioRequestId: userB1RequestId,
        payerFioAddress: userB2.address,
        payeeFioAddress: userB1.address,
        payerTokenPublicAddress: userB2.publicKey,
        payeeTokenPublicAddress: userB1.publicKey,
        amount: 5000000000,
        chainCode: "BTC",
        tokenCode: "BTC",
        status: '',
        obtId: '',
        maxFee: config.api.record_obt_data.fee,
        technologyProviderId: '',
        payeeFioPublicKey: userB1.publicKey,
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

  it(`Initial requestor userB1 attempts OBT with requestId from userB1. Expect error type 403: ${config.error.invalidRequestSignature}`, async () => {
    try {
      const result = await userB1.sdk.genericAction('recordObtData', {
        fioRequestId: userB1RequestId,
        payerFioAddress: userB2.address,
        payeeFioAddress: userB1.address,
        payerTokenPublicAddress: userB2.publicKey,
        payeeTokenPublicAddress: userB1.publicKey,
        amount: 5000000000,
        chainCode: "BTC",
        tokenCode: "BTC",
        status: '',
        obtId: '',
        maxFee: config.api.record_obt_data.fee,
        technologyProviderId: '',
        payeeFioPublicKey: userB1.publicKey,
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


/*

  it(`Cancel request with invalid tpid returns error: ${config.error.invalidTpid}`, async () => {
    try{
      const result = await userB1.sdk.genericAction('pushTransaction', {
        action: 'cancelfndreq',
        account: 'fio.reqobt',
        data: {
          "fio_request_id": userB1RequestId,
          "max_fee": config.api.cancel_funds_request.fee,
          "tpid": '-invalidtpid-',
          "actor": userB1.account
        }
      })
      //console.log('Result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error', err.json);
      expect(err.json.fields[0].error).to.equal(config.error.invalidTpid);
    }
  })

  it(`Cancel request not initiated by actor returns error: ${config.error.signatureError}`, async () => {
    try{
      const result = await userB2.sdk.genericAction('pushTransaction', {
        action: 'cancelfndreq',
        account: 'fio.reqobt',
        data: {
          "fio_request_id": userB1RequestId,
          "max_fee": config.api.cancel_funds_request.fee,
          "tpid": '',
          "actor": userB2.account
        }
      })
      //console.log('Result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error', err.json);
      expect(err.json.message).to.equal(config.error.signatureError);
    }
  })

  it(`userB2 records OBT response to transaction`, async () => {
      try {
        const result = await userB2.sdk.genericAction('recordObtData', {
          fioRequestId: userB1RequestId,
          payerFioAddress: userB2.address,
          payeeFioAddress: userB1.address,
          payerTokenPublicAddress: userB2.publicKey,
          payeeTokenPublicAddress: userB1.publicKey,
          amount: 5000000000,
          chainCode: "BTC",
          tokenCode: "BTC",
          status: '',
          obtId: '',
          maxFee: config.api.record_obt_data.fee,
          technologyProviderId: '',
          payeeFioPublicKey: userB1.publicKey,
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

   it(`Cancel request after it was approved returns ${config.error.invalidRequestStatus}`, async () => {
    try{
      const result = await userB1.sdk.genericAction('pushTransaction', {
        action: 'cancelfndreq',
        account: 'fio.reqobt',
        data: {
          "fio_request_id": userB1RequestId,
          "max_fee": config.api.cancel_funds_request.fee,
          "tpid": '',
          "actor": userB1.account
        }
      })
      console.log('Result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error', err.json);
      expect(err.json.fields[0].error).to.equal(config.error.invalidRequestStatus);
    }
  })

  it(`Add ETH address to userB1`, async () => {
    try {
      const result = await userB1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userB1.address,
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

  it(`userB1 request #2 from userB2`, async () => {
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
      userB1RequestId2 = result.fio_request_id
      expect(result.status).to.equal('requested') 
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
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

  it(`Get balance for userB1`, async () => {
    try {
      const result = await userB1.sdk.genericAction('getFioBalance', {
        fioPublicKey: userB1.publicKey
      }) 
      userB1Balance = result.balance
      //console.log('userB1 fio balance', result)
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it('Transfer entire balance for userB1 to userB2 to register address', async () => {
    try {
      const result = await userB1.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: userB2.publicKey,
        amount: userB1Balance - config.api.transfer_tokens_pub_key.fee,
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

  it(`Verify balance for userB1 = 0`, async () => {
    try {
      const result = await userB1.sdk.genericAction('getFioBalance', {
        fioPublicKey: userB1.publicKey
      }) 
      //console.log('userB1 fio balance', result)
      expect(result.balance).to.equal(0)
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it('Call get_table_rows from fionames to get bundles remaining for userB1. Verify 0 bundles', async () => {
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
        if (fionames.rows[name].name == userB1.address) {
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

  it(`Cancel request without available bundled tx and with insufficient fee returns error ${config.error.insufficientFunds}`, async () => {
    try{
      const result = await userB1.sdk.genericAction('pushTransaction', {
        action: 'cancelfndreq',
        account: 'fio.reqobt',
        data: {
          "fio_request_id": userB1RequestId2,
          "max_fee": config.api.cancel_funds_request.fee,
          "tpid": '',
          "actor": userB1.account
        }
      })
      console.log('Result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error', err.json);
      expect(err.json.fields[0].error).to.equal(config.error.insufficientFunds);
    }
  })
*/
})




