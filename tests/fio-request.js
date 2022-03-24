require('mocha');
const { expect } = require('chai');
const { newUser, fetchJson, callFioApi, callFioApiSigned, randStr, consumeRemainingBundles, getBundleCount, timeout} = require('../utils.js');
const { FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');

// Used to get content size
const fiojs_1 = require('@fioprotocol/fiojs');
const text_encoding_1 = require("text-encoding");
const { receiveMessageOnPort } = require('worker_threads');
const textEncoder = new text_encoding_1.TextEncoder();
const textDecoder = new text_encoding_1.TextDecoder();

/*
async function getContentSize(contentType, content, privateKey, publicKey) {
  const textEncoder = new text_encoding_1.TextEncoder();
  const textDecoder = new text_encoding_1.TextDecoder();

  content = {
    payee_public_address: 'adsfasdf',
    amount: 1000000,
    chain_code: 'FIO',
    token_code: 'FIO',
    memo: 'adsfasdf',
    hash: '',
    offline_url: ''
  };

  const cipher = fiojs_1.Fio.createSharedCipher({ privateKey, publicKey, textEncoder, textDecoder });
  cipher.encrypt(contentType, content);
}
*/
before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** fio-request.js ************************** \n    A. Send fio request from userA1 to userA2. userA2 responds with OBT Record`, () => {

    let userA1, userA2, userA3, userA4, requestId
    const payment = 5000000000 // 5 FIO
    const requestMemo = 'Memo in the initial request'
    const obtMemo = 'Memo in OBT response to request'
    const btcPubAdd = 'btc:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'

    it(`Create users`, async () => {
        userA1 = await newUser(faucet);
        userA2 = await newUser(faucet);
    })
  
    it(`Do an initial Request and OBT to prevent the failure on first run of this test after resetting chain`, async () => {
      userA3 = await newUser(faucet);
      userA4 = await newUser(faucet);

      const result = await userA3.sdk.genericAction('requestFunds', {
        payerFioAddress: userA4.address,
        payeeFioAddress: userA3.address,
        payeeTokenPublicAddress: 'thisispayeetokenpublicaddress',
        amount: payment,
        chainCode: 'BTC',
        tokenCode: 'BTC',
        memo: requestMemo,
        maxFee: config.api.new_funds_request.fee,
        payerFioPublicKey: userA4.publicKey,
        technologyProviderId: '',
        hash: 'fmwazjvmenfz',  // This is the hash of off-chain data... ?
        offlineUrl: ''
      })
      requestId = result.fio_request_id

      const result2 = await userA4.sdk.genericAction('recordObtData', {
        fioRequestId: requestId,
        payerFioAddress: userA4.address,
        payeeFioAddress: userA3.address,
        payerTokenPublicAddress: userA4.publicKey,
        payeeTokenPublicAddress: userA3.publicKey,
        amount: payment,
        chainCode: "BTC",
        tokenCode: "BTC",
        status: '',
        obtId: '',
        maxFee: config.api.record_obt_data.fee,
        technologyProviderId: '',
        payeeFioPublicKey: userA3.publicKey,
        memo: obtMemo,
        hash: '',
        offLineUrl: ''
      })

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

    it(`Wait a few seconds.`, async () => { await timeout(5000) })

    it(`userA1 requests funds from userA2`, async () => {
      try {
        userA1.sdk.setSignedTrxReturnOption(true);
        const preparedTrx = await userA1.sdk.genericAction('requestFunds', {
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
        
        //console.log('preparedTrx: ', preparedTrx)
        const result = await userA1.sdk.executePreparedTrx('new_funds_request', preparedTrx);
        requestId = result.fio_request_id
        userA1.sdk.setSignedTrxReturnOption(false);
        expect(result.status).to.equal('requested')
      } catch (err) {
        console.log('Error: ', err)
        expect(err).to.equal(null)
      }
    })
  
  it(`BUG BD-2992 userA1 requests funds from userA2`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'newfundsreq',
        account: 'fio.reqobt',
        data: {
          payer_fio_address: userA2.address,
          payee_fio_address: userA1.address,
          tpid: '',
          content: {
            payee_public_address: 'thisispayeetokenpublicaddress',
            amount: 2000000000,
            chain_code: 'BTC',
            token_code: 'BTC',
            memo: requestMemo
          },
          max_fee: config.maxFee
        }
      })
      requestId = result.fio_request_id
      //console.log('Result: ', result)
      expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

    it(`get_sent_fio_requests for userA1 (payee)`, async () => {
      try {
          const result = await userA1.sdk.genericAction('getSentFioRequests', {
              limit: '',
              offset: ''
          })
          //console.log('result: ', result);
          //console.log('content: ', result.requests[0].content);
          expect(result.requests[0].fio_request_id).to.equal(requestId);
          expect(result.requests[0].payer_fio_address).to.equal(userA2.address);
          expect(result.requests[0].payee_fio_address).to.equal(userA1.address);
          expect(result.requests[0].payer_fio_public_key).to.equal(userA2.publicKey);
          expect(result.requests[0].payee_fio_public_key).to.equal(userA1.publicKey);
          expect(result.requests[0].status).to.equal('requested');
          expect(result.requests[0].content.memo).to.equal(requestMemo);
      } catch (err) {
          console.log('Error: ', err)
          expect(err).to.equal(null)
      }
    })

    it(`get_sent_fio_requests for userA2 (payer). Expect 'No FIO Requests'`, async () => {
      try {
          const result = await userA2.sdk.genericAction('getSentFioRequests', {
              limit: '',
              offset: ''
          })
          //console.log('result: ', result);
          //console.log('content: ', result.requests[0].content);
          expect(result).to.equal(null)
      } catch (err) {
          //console.log('Error: ', err)
          expect(err.json.message).to.equal('No FIO Requests')
      }
    })

    it(`get_pending_fio_requests for userA1 (payee). Expect 'No FIO Requests'`, async () => {
      try {
        const result = await userA1.sdk.genericAction('getPendingFioRequests', {
          limit: '',
          offset: ''
        })
        console.log('result: ', result)
        //console.log('content: ', result.requests[0].content)
        expect(result).to.equal(null)
      } catch (err) {
          //console.log('Error: ', err)
          expect(err.json.message).to.equal('No FIO Requests')
      }
    })

    it(`get_pending_fio_requests for userA2 (payer)`, async () => {
      try {
        const result = await userA2.sdk.genericAction('getPendingFioRequests', {
          limit: '',
          offset: ''
        })
        //console.log('result: ', result)
        //console.log('content: ', result.requests[0].content)
        expect(result.requests[0].fio_request_id).to.equal(requestId);
        expect(result.requests[0].payer_fio_address).to.equal(userA2.address);
        expect(result.requests[0].payee_fio_address).to.equal(userA1.address);
        expect(result.requests[0].payer_fio_public_key).to.equal(userA2.publicKey);
        expect(result.requests[0].payee_fio_public_key).to.equal(userA1.publicKey);
        expect(result.requests[0].content.memo).to.equal(requestMemo);
      } catch (err) {
        console.log('Error: ', err)
        expect(err).to.equal(null)
      }
    })

    it(`get_cancelled_fio_requests for userA1 (payee). Expect 'No FIO Requests'`, async () => {
      try {
        const result = await userA1.sdk.genericAction('getCancelledFioRequests', {
          limit: '',
          offset: ''
        })
        console.log('result: ', result)
        //console.log('content: ', result.requests[0].content)
        expect(result).to.equal(null)
      } catch (err) {
          //console.log('Error: ', err)
          expect(err.json.message).to.equal('No FIO Requests')
      }
    })

    it(`get_cancelled_fio_requests for userA2 (payer). Expect 'No FIO Requests'`, async () => {
      try {
        const result = await userA1.sdk.genericAction('getCancelledFioRequests', {
          limit: '',
          offset: ''
        })
        console.log('result: ', result)
        //console.log('content: ', result.requests[0].content)
        expect(result).to.equal(null)
      } catch (err) {
          //console.log('Error: ', err)
          expect(err.json.message).to.equal('No FIO Requests')
      }
    })

    it(`get_received_fio_requests for userA2 (payer)`, async () => {
      try {
        const json = {
          fio_public_key: userA2.publicKey,
          limit: 100,
          offset: 0
        }
        result = await callFioApi("get_received_fio_requests", json);
        //console.log('result: ', result)
        //console.log('content: ', result.requests[0].content)
        expect(result.requests[0].fio_request_id).to.equal(requestId);
        expect(result.requests[0].payer_fio_address).to.equal(userA2.address);
        expect(result.requests[0].payee_fio_address).to.equal(userA1.address);
        expect(result.requests[0].payer_fio_public_key).to.equal(userA2.publicKey);
        expect(result.requests[0].payee_fio_public_key).to.equal(userA1.publicKey);
        expect(result.requests[0].status).to.equal('requested');
        //expect(result.requests[0].content.memo).to.equal(requestMemo);
      } catch (err) {
        console.log('Error: ', err)
        expect(err).to.equal(null)
      }
    })

    it(`get_received_fio_requests for userA1 (payee). Expect 'No FIO Requests'`, async () => {
      try {
        const json = {
          fio_public_key: userA1.publicKey,
          limit: 100,
          offset: 0
        }
        result = await callFioApi("get_received_fio_requests", json);
        console.log('result: ', result.json)
        //console.log('content: ', result.requests[0].content)
        expect(result).to.equal(null)
      } catch (err) {
          //console.log('Error: ', err.response)
          expect(err.response.body.message).to.equal('No FIO Requests')
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

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

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
    await timeout(7000);
  })

  it(`get_sent_fio_requests for userA1 (BD-2306)`, async () => {
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
  
  it(`get_sent_fio_requests for userA1 (payee) (BD-2306)`, async () => {
    try {
        const result = await userA1.sdk.genericAction('getSentFioRequests', {
            limit: '',
            offset: ''
        })
        //console.log('result: ', result);
        //console.log('content: ', result.requests[0].content);
        expect(result.requests[0].fio_request_id).to.equal(requestId);
        expect(result.requests[0].payer_fio_address).to.equal(userA2.address);
        expect(result.requests[0].payee_fio_address).to.equal(userA1.address);
        expect(result.requests[0].payer_fio_public_key).to.equal(userA2.publicKey);
        expect(result.requests[0].payee_fio_public_key).to.equal(userA1.publicKey);
        expect(result.requests[0].status).to.equal('sent_to_blockchain');
        expect(result.requests[0].content.memo).to.equal(requestMemo);
    } catch (err) {
        console.log('Error: ', err)
        expect(err).to.equal(null)
    }
  })

  it(`get_sent_fio_requests for userA2 (payer). Expect 'No FIO Requests'`, async () => {
    try {
        const result = await userA2.sdk.genericAction('getSentFioRequests', {
            limit: '',
            offset: ''
        })
        //console.log('result: ', result);
        //console.log('content: ', result.requests[0].content);
        expect(result).to.equal(null)
    } catch (err) {
        //console.log('Error: ', err)
        expect(err.json.message).to.equal('No FIO Requests')
    }
  })

  it(`get_pending_fio_requests for userA1 (payee). Expect 'No FIO Requests'`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getPendingFioRequests', {
        limit: '',
        offset: ''
      })
      console.log('result: ', result)
      //console.log('content: ', result.requests[0].content)
      expect(result).to.equal(null)
    } catch (err) {
        //console.log('Error: ', err)
        expect(err.json.message).to.equal('No FIO Requests')
    }
  })

  it(`get_pending_fio_requests for userA2 (payer)`, async () => {
    try {
      const result = await userA2.sdk.genericAction('getPendingFioRequests', {
        limit: '',
        offset: ''
      })
      //console.log('result: ', result)
      //console.log('content: ', result.requests[0].content)
      expect(result).to.equal(null)
    } catch (err) {
        //console.log('Error: ', err)
        expect(err.json.message).to.equal('No FIO Requests')
    }
  })

  it(`get_cancelled_fio_requests for userA1 (payee). Expect 'No FIO Requests'`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getCancelledFioRequests', {
        limit: '',
        offset: ''
      })
      console.log('result: ', result)
      //console.log('content: ', result.requests[0].content)
      expect(result).to.equal(null)
    } catch (err) {
        //console.log('Error: ', err)
        expect(err.json.message).to.equal('No FIO Requests')
    }
  })

  it(`get_cancelled_fio_requests for userA2 (payer). Expect 'No FIO Requests'`, async () => {
    try {
      const result = await userA2.sdk.genericAction('getCancelledFioRequests', {
        limit: '',
        offset: ''
      })
      console.log('result: ', result)
      //console.log('content: ', result.requests[0].content)
      expect(result).to.equal(null)
    } catch (err) {
        //console.log('Error: ', err)
        expect(err.json.message).to.equal('No FIO Requests')
    }
  })

  it(`get_received_fio_requests for userA2 (payer)`, async () => {
    try {
      const json = {
        fio_public_key: userA2.publicKey,
        limit: 100,
        offset: 0
      }
      result = await callFioApi("get_received_fio_requests", json);
      //console.log('result: ', result)
      //console.log('content: ', result.requests[0].content)
      expect(result.requests[0].fio_request_id).to.equal(requestId);
      expect(result.requests[0].payer_fio_address).to.equal(userA2.address);
      expect(result.requests[0].payee_fio_address).to.equal(userA1.address);
      expect(result.requests[0].payer_fio_public_key).to.equal(userA2.publicKey);
      expect(result.requests[0].payee_fio_public_key).to.equal(userA1.publicKey);
      expect(result.requests[0].status).to.equal('sent_to_blockchain');
      //expect(result.requests[0].content.memo).to.equal(requestMemo);
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`get_received_fio_requests for userA1 (payee). Expect 'No FIO Requests'`, async () => {
    try {
      const json = {
        fio_public_key: userA1.publicKey,
        limit: 100,
        offset: 0
      }
      result = await callFioApi("get_received_fio_requests", json);
      console.log('result: ', result.json)
      //console.log('content: ', result.requests[0].content)
      expect(result).to.equal(null)
    } catch (err) {
        //console.log('Error: ', err.response)
        expect(err.response.body.message).to.equal('No FIO Requests')
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
      expect(result.obt_data_records[0].fio_request_id).to.equal(requestId);
      expect(result.obt_data_records[0].payer_fio_address).to.equal(userA2.address);
      expect(result.obt_data_records[0].payee_fio_address).to.equal(userA1.address);
      expect(result.obt_data_records[0].payer_fio_public_key).to.equal(userA2.publicKey);
      expect(result.obt_data_records[0].payee_fio_public_key).to.equal(userA1.publicKey);
      expect(result.obt_data_records[0].status).to.equal('sent_to_blockchain');
      expect(result.obt_data_records[0].content.memo).to.equal(obtMemo);
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
      expect(result.obt_data_records[0].fio_request_id).to.equal(requestId);
      expect(result.obt_data_records[0].payer_fio_address).to.equal(userA2.address);
      expect(result.obt_data_records[0].payee_fio_address).to.equal(userA1.address);
      expect(result.obt_data_records[0].payer_fio_public_key).to.equal(userA2.publicKey);
      expect(result.obt_data_records[0].payee_fio_public_key).to.equal(userA1.publicKey);
      expect(result.obt_data_records[0].status).to.equal('sent_to_blockchain');
      expect(result.obt_data_records[0].content.memo).to.equal(obtMemo);
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

})

describe(`B. Test FIO Request error conditions`, () => {
  let userB1, userB2, userB3, userB1RequestId, userB1RequestId2, userB1RequestId3, userB1Balance
  const payment = 5000000000 // 5 FIO
  const requestMemo = 'Memo in the initial request'
  const btcPubAdd = 'btc:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'

  it(`Create users`, async () => {
    userB1 = await newUser(faucet);
    userB2 = await newUser(faucet);
    userB3 = await newUser(faucet);
  })

  it(`userB3 requests funds using userB2.address as payer and userB1.address as payee`, async () => {
    try {
      const result = await userB3.sdk.genericAction('requestFunds', {
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
      })
      console.log('Result: ', result)
      expect(result).to.equal(null)
    } catch (err) {
      //console.log('Error: ', err)
      expect(err.json.type).to.equal('invalid_signature');
      expect(err.json.message).to.equal(config.error.invalidRequestSignature);
      expect(err.errorCode).to.equal(403);
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
      expect(err.json.fields[0].error).to.equal('No such FIO Request');
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
      //console.log('Result: ', result);
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
      //console.log('Error', err.json.fields[0].error);
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
      console.log('Result: ', result);
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
      expect(err).to.equal(null)
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
      for (fioname in fionames.rows) {
        if (fionames.rows[fioname].name == userB1.address) {
          //console.log('bundleeligiblecountdown: ', fionames.rows[fioname].bundleeligiblecountdown);
          bundleCount = fionames.rows[fioname].bundleeligiblecountdown;
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

  it(`userB2 requests funds from userB3`, async () => {
    try {
      const result = await userB2.sdk.genericAction('requestFunds', {
        payerFioAddress: userB3.address,
        payeeFioAddress: userB2.address,
        payeeTokenPublicAddress: 'thisispayeetokenpublicaddress',
        amount: payment,
        chainCode: 'FIO',
        tokenCode: 'FIO',
        memo: requestMemo,
        maxFee: config.api.new_funds_request.fee,
        payerFioPublicKey: userB3.publicKey,
        technologyProviderId: '',
        hash: '',
        offLineUrl: ''
      })
      //console.log('Result: ', result)
      userB1RequestId3 = result.fio_request_id
      expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal(null)
    }
  })

  it(`userB3 rejects funds request`, async () => {
    try{
      const result = await userB3.sdk.genericAction('pushTransaction', {
        action: 'rejectfndreq',
        account: 'fio.reqobt',
        data: {
          "fio_request_id": userB1RequestId3,
          "max_fee": config.api.cancel_funds_request.fee,
          "tpid": '',
          "actor": userB3.account
        }
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('request_rejected')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it('Wait a few seconds to avoid duplicate transaction.', async () => {
    await timeout(2000);
  })

  it(`userB3 rejects funds request again. Error 400 returns ${config.error.ivalidRejection}`, async () => {
    try{
      const result = await userB3.sdk.genericAction('pushTransaction', {
        action: 'rejectfndreq',
        account: 'fio.reqobt',
        data: {
          "fio_request_id": userB1RequestId3,
          "max_fee": config.api.cancel_funds_request.fee,
          "tpid": '',
          "actor": userB3.account
        }
      })
      console.log('Result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error', err.json);
      expect(err.json.fields[0].error).to.equal(config.error.ivalidRejection);
    }
  })

})

describe(`C. cancel_funds_request with bundles remaining`, () => {
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
      for (fioname in fionames.rows) {
        if (fionames.rows[fioname].name == userA1.address) {
          //console.log('bundleeligiblecountdown: ', fionames.rows[fioname].bundleeligiblecountdown);
          userA1OrigBundle = fionames.rows[fioname].bundleeligiblecountdown;
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

  it(`userA1 (payee) Call cancel_funds_request to cancel request in pending state`, async () => {
    try{
      const result = await userA1.sdk.genericAction('cancelFundsRequest', {
        fioRequestId: userA1RequestId,
        maxFee: cancel_funds_request_fee,
        technologyProviderId: ''
      })
      //console.log('Result: ', result);
      expect(result).to.have.all.keys('status', 'fee_collected', 'block_num', 'transaction_id');
      expect(result.status).to.equal('cancelled');
      expect(result.fee_collected).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Verify request was cancelled: get_sent_fio_requests for userA1 (payee) returns 1 request with status 'cancelled'`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getSentFioRequests', {
        limit: '',
        offset: ''
      })
      //console.log('result: ', result)
      expect(result.requests[0].fio_request_id).to.equal(userA1RequestId);
      expect(result.requests[0].payer_fio_address).to.equal(userA2.address);
      expect(result.requests[0].payee_fio_address).to.equal(userA1.address);
      expect(result.requests[0].payer_fio_public_key).to.equal(userA2.publicKey);
      expect(result.requests[0].payee_fio_public_key).to.equal(userA1.publicKey);
      expect(result.requests[0].status).to.equal('cancelled');
      expect(result.requests[0].content.memo).to.equal(requestMemo);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`get_sent_fio_requests for userA2 (payer). Expect 'No FIO Requests'`, async () => {
    try {
        const result = await userA2.sdk.genericAction('getSentFioRequests', {
            limit: '',
            offset: ''
        })
        //console.log('result: ', result);
        //console.log('content: ', result.requests[0].content);
        expect(result).to.equal(null)
    } catch (err) {
        //console.log('Error: ', err)
        expect(err.json.message).to.equal('No FIO Requests')
    }
  })

  it(`Verify request was cancelled: get_pending_fio_requests for userA2 returns: ${config.error.noFioRequests}`, async () => {
    try {
      const result = await userA2.sdk.genericAction('getPendingFioRequests', {
        limit: '',
        offset: ''
      })
      console.log('result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error: ', err.json);
      expect(err.json.message).to.equal(config.error.noFioRequests);
    }
  })

  it(`get_pending_fio_requests for userA1 returns: ${config.error.noFioRequests}`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getPendingFioRequests', {
        limit: '',
        offset: ''
      })
      console.log('result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error: ', err.json);
      expect(err.json.message).to.equal(config.error.noFioRequests);
    }
  })

  it(`Verify request was cancelled: get_cancelled_fio_requests for userA1 (payee) returns 1 request with status 'cancelled'`, async () => {
    try {
      const json = {
        "fio_public_key": userA1.publicKey
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      //console.log('Result: ', result);
      expect(result.requests[0].fio_request_id).to.equal(userA1RequestId);
      expect(result.requests[0].payer_fio_address).to.equal(userA2.address);
      expect(result.requests[0].payee_fio_address).to.equal(userA1.address);
      expect(result.requests[0].payer_fio_public_key).to.equal(userA2.publicKey);
      expect(result.requests[0].payee_fio_public_key).to.equal(userA1.publicKey);
      expect(result.requests[0].status).to.equal('cancelled');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`get_cancelled_fio_requests for userA2 (payer). Expect 'No FIO Requests'`, async () => {
    try {
      const result = await userA2.sdk.genericAction('getCancelledFioRequests', {
        limit: '',
        offset: ''
      })
      console.log('result: ', result)
      //console.log('content: ', result.requests[0].content)
      expect(result).to.equal(null)
    } catch (err) {
        //console.log('Error: ', err)
        expect(err.json.message).to.equal('No FIO Requests')
    }
  })

  it(`get_received_fio_requests for userA1 (payee). Expect 'No FIO Requests'`, async () => {
    try {
      const json = {
        fio_public_key: userA1.publicKey,
        limit: 100,
        offset: 0
      }
      result = await callFioApi("get_received_fio_requests", json);
      console.log('result: ', result.json)
      //console.log('content: ', result.requests[0].content)
      expect(result).to.equal(null)
    } catch (err) {
        //console.log('Error: ', err.response)
        expect(err.response.body.message).to.equal('No FIO Requests')
    }
  })

  it(`get_received_fio_requests for userA2 (payer)`, async () => {
    try {
      const json = {
        fio_public_key: userA2.publicKey,
        limit: 100,
        offset: 0
      }
      result = await callFioApi("get_received_fio_requests", json);
      //console.log('result: ', result)
      //console.log('content: ', result.requests[0].content)
      expect(result.requests[0].fio_request_id).to.equal(userA1RequestId);
      expect(result.requests[0].payer_fio_address).to.equal(userA2.address);
      expect(result.requests[0].payee_fio_address).to.equal(userA1.address);
      expect(result.requests[0].payer_fio_public_key).to.equal(userA2.publicKey);
      expect(result.requests[0].payee_fio_public_key).to.equal(userA1.publicKey);
      expect(result.requests[0].status).to.equal('cancelled');
      //expect(result.requests[0].content.memo).to.equal(requestMemo);
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
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
      for (fioname in fionames.rows) {
        if (fionames.rows[fioname].name == userA1.address) {
          //console.log('bundleeligiblecountdown: ', fionames.rows[fioname].bundleeligiblecountdown);
          bundleCount = fionames.rows[fioname].bundleeligiblecountdown;
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

describe('D. cancel_funds_request with NO bundles remaining', () => {

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
      for (fioname in fionames.rows) {
        if (fionames.rows[fioname].name == userB1.address) {
          //console.log('bundleeligiblecountdown: ', fionames.rows[fioname].bundleeligiblecountdown);
          userB1OrigBundle = fionames.rows[fioname].bundleeligiblecountdown;
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
      expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id')
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

  it(`Verify request was cancelled: get_pending_fio_requests for userB2 returns: ${config.error.noFioRequests}`, async () => {
    try {
      const result = await userB2.sdk.genericAction('getPendingFioRequests', {
        limit: '',
        offset: ''
      })
      console.log('result: ', result);
      expect(result).to.equal(null);
    } catch (err) {
      //console.log('Error: ', err.json);
      expect(err.json.message).to.equal(config.error.noFioRequests);
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

describe(`E. Test cancel_funds_request error conditions`, () => {
  let userC1, userC2, userC1RequestId, userC1RequestId2, userC1Balance
  const payment = 5000000000 // 5 FIO
  const requestMemo = 'Memo in the initial request'
  const btcPubAdd = 'btc:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'

  it(`Create users`, async () => {
    userC1 = await newUser(faucet);
    userC2 = await newUser(faucet);
  })
  
  it(`Wait a few seconds.`, async () => { await timeout(2000) })

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
      for (fioname in fionames.rows) {
        if (fionames.rows[fioname].name == userC1.address) {
          //console.log('bundleeligiblecountdown: ', fionames.rows[fioname].bundleeligiblecountdown);
          bundleCount = fionames.rows[fioname].bundleeligiblecountdown;
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

describe(`F. get_cancelled_fio_requests paging: Cancel multiple FIO requests and page through using get_cancelled_fio_requests`, () => {
  let userC1, requestID = [], requestCount = 20

  it('Create userC1', async () => {
    userC1 = await newUser(faucet);
    userC2 = await newUser(faucet);
  })

  it('Transfer 5,000 FIO to userC1', async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: userC1.publicKey,
        amount: 5000000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        walletFioAddress: ''
      })
      //console.log('Result: ', result)
      expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    } catch (err) {
      //console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Add BTC address to userC1`, async () => {
    try {
      const result = await userC1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userC1.address,
        publicAddresses: [
          {
            chain_code: 'BTC',
            token_code: 'BTC',
            public_address: 'btc:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
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

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Make ${requestCount} requests for userC1`, async () => {
    for (i = 0; i < requestCount; i++) {
      try {
        const result = await userC1.sdk.genericAction('requestFunds', {
          payerFioAddress: userC2.address,
          payeeFioAddress: userC1.address,
          payeeTokenPublicAddress: i + 'thisispayeetokenpublicaddress',
          amount: i * 1000000000,
          chainCode: 'BTC',
          tokenCode: 'BTC',
          memo: i + ' Request Memo',
          maxFee: config.api.new_funds_request.fee,
          payerFioPublicKey: userC2.publicKey,
          technologyProviderId: '',
          hash: '',
          offLineUrl: ''
        })
        //console.log('Result: ', result);
        requestID[i] = result.fio_request_id;
        expect(result.status).to.equal('requested');
      } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
      }
    }
  })

  it(`Call (get_cancelled_fio_requests, no limit param, no offset param). Expect error 404: ${config.error.noFioRequests}`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      //console.log('Result: ', result);
      expect(result.requests.length).to.equal(0)
    } catch (err) {
      //console.log('Error', err.error.message)
      expect(err.error.message).to.equal(config.error.noFioRequests);
      expect(err.statusCode).to.equal(404);
    }
  })

  it(`Call cancel_funds_request for all ${requestCount} pending requests`, async () => {
    for (i = 0; i < requestCount; i++) {
      try{
        const result = await userC1.sdk.genericAction('pushTransaction', {
          action: 'cancelfndreq',
          account: 'fio.reqobt',
          data: {
            fio_request_id: requestID[i],
            max_fee: config.api.cancel_funds_request.fee,
            tpid: '',
            actor: userC1.account
          }
        })
        //console.log('Result: ', result);
        expect(result.status).to.equal('cancelled');
      } catch (err) {
        console.log('Error', err.json);
        expect(err).to.equal(null);
      }
    }
  })

  it(`Call (get_cancelled_fio_requests, no limit param, no offset param). Expect ${requestCount} results`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      //console.log('Result: ', result);
      expect(result.requests.length).to.equal(requestCount)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call (get_cancelled_fio_requests, limit=0, offset=0). Expect ${requestCount} results.`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey,
        "limit": 0,
        "offset": 0
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      //console.log('Result: ', result);
      expect(result.requests.length).to.equal(requestCount)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call (get_cancelled_fio_requests, limit=1, offset=0). Expect 1 request. Expect request #1`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey,
        "limit": 1,
        "offset": 0
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      //console.log('Result: ', result);
      expect(result.requests.length).to.equal(1);
      expect(result.requests[0].fio_request_id).to.equal(requestID[0]);
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call (get_cancelled_fio_requests, limit=2, offset=4). Expect 2 requests. Expect requests #5-6`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey,
        "limit": 2,
        "offset": 4
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      //console.log('Result: ', result);
      expect(result.requests.length).to.equal(2);
      expect(result.requests[0].fio_request_id).to.equal(requestID[4]);
      expect(result.requests[1].fio_request_id).to.equal(requestID[5]);
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call (get_cancelled_fio_requests, limit=10, offset=15). Expect 5 requests. Expect requests #16-20`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey,
        "limit": 10,
        "offset": 15
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      //console.log('Result: ', result);
      expect(result.requests.length).to.equal(5);
      expect(result.requests[0].fio_request_id).to.equal(requestID[15]);
      expect(result.requests[4].fio_request_id).to.equal(requestID[19]);
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Negative offset. Call (get_cancelled_fio_requests, limit=1, offset=-1). Expect error type 400: ${config.error.invalidOffset}`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey,
        "limit": 1,
        "offset": -1
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error);
      expect(err.error.fields[0].error).to.equal(config.error.invalidOffset);
      expect(err.statusCode).to.equal(400);
    }
  })

  it(`Negative limit. Call (get_cancelled_fio_requests, limit=-5, offset=5). Expect error type 400: ${config.error.invalidLimit}`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey,
        "limit": -5,
        "offset": 5
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
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
        "fio_public_key": userC1.publicKey,
        "limit": "string",
        "offset": "string2"
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err);
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
      result = await callFioApi("get_cancelled_fio_requests", json);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error);
      expect(err.error.fields[0].error).to.equal(config.error.invalidKey);
      expect(err.statusCode).to.equal(400);
    }
  })

  it(`Use floats in limit/offset. Expect error type 404: ${config.error.noFioRequests}`, async () => {
    try {
      const json = {
        "fio_public_key": userC1.publicKey,
        "limit": 123.456,
        "offset": 345.678
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      //console.log('Result: ', result)
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err);
      expect(err.error.message).to.equal(config.error.noFioRequests);
      expect(err.statusCode).to.equal(404);
    }
  })

  it(`No pub key. Expect error type 400: ${config.error.invalidKey}`, async () => {
    try {
      const json = {
        "limit": 1,
        "offset": 1
      }
      result = await callFioApi("get_cancelled_fio_requests", json);
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error);
      expect(err.error.fields[0].error).to.equal(config.error.invalidKey);
      expect(err.statusCode).to.equal(400);
    }
  })

})

describe(`G. Test rejection of FIO Requests`, () => {

  let user1, user2, user1RequestId

  it('Create users', async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  })

  it(`user1 creates 10 FIO Requests for user2`, async () => {
    for (i = 0; i < 10; i++) {
      try {
        const result = await user1.sdk.genericAction('requestFunds', {
          payerFioAddress: user2.address,
          payeeFioAddress: user1.address,
          payeeTokenPublicAddress: 'thisispayeetokenpublicaddress',
          amount: 1,
          chainCode: 'BTC',
          tokenCode: 'BTC',
          memo: 'requestMemo',
          maxFee: config.api.new_funds_request.fee,
          payerFioPublicKey: user2.publicKey,
          technologyProviderId: ''
        })
        //console.log('Result: ', result)
        if (i == 1) {
          user1RequestId = result.fio_request_id
        }
        expect(result.status).to.equal('requested')
      } catch (err) {
        console.log('Error: ', err)
        expect(err).to.equal(null)
      }
    }
  })

  it('Wait a few seconds to avoid duplicate transaction.', async () => { await timeout(5000); })

  it(`user2 rejects first funds request`, async () => {
    try{
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'rejectfndreq',
        account: 'fio.reqobt',
        data: {
          "fio_request_id": user1RequestId,
          "max_fee": config.api.cancel_funds_request.fee,
          "tpid": '',
          "actor": user2.account
        }
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('request_rejected')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it('Wait a few seconds...', async () => { await timeout(5000); })

  it(`get_pending_fio_requests for user2, expect 9 results`, async () => {
    try {
      const result = await user2.sdk.genericAction('getPendingFioRequests', {
        limit: '',
        offset: ''
      })
      //console.log('result: ', result)
      expect(result.requests.length).to.equal(9)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

})

describe.skip(`H. Records Performance Testing`, () => {

  let userA1, userA2, userB1, userB2, userC1, userC2
  const payment = 5000000000 // 5 FIO
  const requestMemo = 'Memo in the initial request'

  it(`Create users`, async () => {
    userA1 = await newUser(faucet);
    userA2 = await newUser(faucet);

    userB1 = await newUser(faucet);
    userB2 = await newUser(faucet);

    userC1 = await newUser(faucet);
    userC2 = await newUser(faucet);
  })

  it(`userA1 requests funds from userA2 5000 times`, async () => {
    for (i = 0; i < 1000; i++) {
      try {
        const result = await userA1.sdk.genericAction('requestFunds', {
          payerFioAddress: userA2.address,
          payeeFioAddress: userA1.address,
          payeeTokenPublicAddress: userA1.address,
          amount: payment,
          chainCode: 'FIO',
          tokenCode: 'FIO',
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
        console.log('Error', err.json)
        expect(err).to.equal(null)
      }
    }

    for (i = 0; i < 1000; i++) {
      try {
        const result = await userA2.sdk.genericAction('requestFunds', {
          payerFioAddress: userA1.address,
          payeeFioAddress: userA2.address,
          payeeTokenPublicAddress: userA1.address,
          amount: payment,
          chainCode: 'FIO',
          tokenCode: 'FIO',
          memo: requestMemo,
          maxFee: config.api.new_funds_request.fee,
          payerFioPublicKey: userA1.publicKey,
          technologyProviderId: '',
          hash: 'fmwazjvmenfz',  // This is the hash of off-chain data... ?
          offlineUrl: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('requested')
      } catch (err) {
        console.log('Error', err.json)
        expect(err).to.equal(null)
      }
    }

    for (i = 0; i < 1000; i++) {
      try {
        const result = await userB1.sdk.genericAction('requestFunds', {
          payerFioAddress: userB2.address,
          payeeFioAddress: userB1.address,
          payeeTokenPublicAddress: userA1.address,
          amount: payment,
          chainCode: 'FIO',
          tokenCode: 'FIO',
          memo: requestMemo,
          maxFee: config.api.new_funds_request.fee,
          payerFioPublicKey: userB2.publicKey,
          technologyProviderId: '',
          hash: 'fmwazjvmenfz',  // This is the hash of off-chain data... ?
          offlineUrl: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('requested')
      } catch (err) {
        console.log('Error', err.json)
        expect(err).to.equal(null)
      }
    }

    for (i = 0; i < 1000; i++) {
      try {
        const result = await userB2.sdk.genericAction('requestFunds', {
          payerFioAddress: userB1.address,
          payeeFioAddress: userB2.address,
          payeeTokenPublicAddress: userA1.address,
          amount: payment,
          chainCode: 'FIO',
          tokenCode: 'FIO',
          memo: requestMemo,
          maxFee: config.api.new_funds_request.fee,
          payerFioPublicKey: userB1.publicKey,
          technologyProviderId: '',
          hash: 'fmwazjvmenfz',  // This is the hash of off-chain data... ?
          offlineUrl: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('requested')
      } catch (err) {
        console.log('Error', err.json)
        expect(err).to.equal(null)
      }
    }

    for (i = 0; i < 1000; i++) {
      try {
        const result = await userC2.sdk.genericAction('requestFunds', {
          payerFioAddress: userC1.address,
          payeeFioAddress: userC2.address,
          payeeTokenPublicAddress: userA1.address,
          amount: payment,
          chainCode: 'FIO',
          tokenCode: 'FIO',
          memo: requestMemo,
          maxFee: config.api.new_funds_request.fee,
          payerFioPublicKey: userC1.publicKey,
          technologyProviderId: '',
          hash: 'fmwazjvmenfz',  // This is the hash of off-chain data... ?
          offlineUrl: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('requested')
      } catch (err) {
        console.log('Error', err.json)
        expect(err).to.equal(null)
      }
    }
  })
})

describe(`I. reject_funds_request: Check all getters after`, () => {
  let userA1, userA2, requestId
  const payment = 5000000000 // 5 FIO
  const requestMemo = 'Memo in the initial request'

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
      requestId = result.fio_request_id
      expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(5000) })

  it(`get_sent_fio_requests for userA1 (payee) BEFORE Reject`, async () => {
    try {
        const result = await userA1.sdk.genericAction('getSentFioRequests', {
            limit: '',
            offset: ''
        })
        //console.log('result: ', result);
        //console.log('content: ', result.requests[0].content);
        expect(result.requests[0].fio_request_id).to.equal(requestId);
        expect(result.requests[0].payer_fio_address).to.equal(userA2.address);
        expect(result.requests[0].payee_fio_address).to.equal(userA1.address);
        expect(result.requests[0].payer_fio_public_key).to.equal(userA2.publicKey);
        expect(result.requests[0].payee_fio_public_key).to.equal(userA1.publicKey);
        expect(result.requests[0].status).to.equal('requested');
        expect(result.requests[0].content.memo).to.equal(requestMemo);
    } catch (err) {
        console.log('Error: ', err)
        expect(err).to.equal(null)
    }
  })

  it(`userA2 rejects funds request`, async () => {
    try{
      const result = await userA2.sdk.genericAction('pushTransaction', {
        action: 'rejectfndreq',
        account: 'fio.reqobt',
        data: {
          "fio_request_id": requestId,
          "max_fee": config.maxFee,
          "tpid": '',
          "actor": userA2.account
        }
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('request_rejected')
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`get_sent_fio_requests for userA1 (payee) AFTER Reject`, async () => {
    try {
        const result = await userA1.sdk.genericAction('getSentFioRequests', {
            limit: '',
            offset: ''
        })
        //console.log('result: ', result);
        //console.log('content: ', result.requests[0].content);
        expect(result.requests[0].fio_request_id).to.equal(requestId);
        expect(result.requests[0].payer_fio_address).to.equal(userA2.address);
        expect(result.requests[0].payee_fio_address).to.equal(userA1.address);
        expect(result.requests[0].payer_fio_public_key).to.equal(userA2.publicKey);
        expect(result.requests[0].payee_fio_public_key).to.equal(userA1.publicKey);
        expect(result.requests[0].status).to.equal('rejected');
        expect(result.requests[0].content.memo).to.equal(requestMemo);
    } catch (err) {
        console.log('Error: ', err)
        expect(err).to.equal(null)
    }
  })

  it(`get_sent_fio_requests for userA2 (payer). Expect 'No FIO Requests'`, async () => {
    try {
        const result = await userA2.sdk.genericAction('getSentFioRequests', {
            limit: '',
            offset: ''
        })
        //console.log('result: ', result);
        //console.log('content: ', result.requests[0].content);
        expect(result).to.equal(null)
    } catch (err) {
        //console.log('Error: ', err)
        expect(err.json.message).to.equal('No FIO Requests')
    }
  })

  it(`get_pending_fio_requests for userA1 (payee). Expect 'No FIO Requests'`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getPendingFioRequests', {
        limit: '',
        offset: ''
      })
      console.log('result: ', result)
      //console.log('content: ', result.requests[0].content)
      expect(result).to.equal(null)
    } catch (err) {
        //console.log('Error: ', err)
        expect(err.json.message).to.equal('No FIO Requests')
    }
  })

  it(`get_pending_fio_requests for userA2 (payer). Expect 'No FIO Requests'`, async () => {
    try {
      const result = await userA2.sdk.genericAction('getPendingFioRequests', {
        limit: '',
        offset: ''
      })
      console.log('result: ', result)
      //console.log('content: ', result.requests[0].content)
      expect(result).to.equal(null)
    } catch (err) {
        //console.log('Error: ', err)
        expect(err.json.message).to.equal('No FIO Requests')
    }
  })

  it(`get_cancelled_fio_requests for userA1 (payee). Expect 'No FIO Requests'`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getCancelledFioRequests', {
        limit: '',
        offset: ''
      })
      console.log('result: ', result)
      //console.log('content: ', result.requests[0].content)
      expect(result).to.equal(null)
    } catch (err) {
        //console.log('Error: ', err)
        expect(err.json.message).to.equal('No FIO Requests')
    }
  })

  it(`get_cancelled_fio_requests for userA2 (payer). Expect 'No FIO Requests'`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getCancelledFioRequests', {
        limit: '',
        offset: ''
      })
      console.log('result: ', result)
      //console.log('content: ', result.requests[0].content)
      expect(result).to.equal(null)
    } catch (err) {
        //console.log('Error: ', err)
        expect(err.json.message).to.equal('No FIO Requests')
    }
  })

  it(`get_received_fio_requests for userA2 (payer)`, async () => {
    try {
      const json = {
        fio_public_key: userA2.publicKey,
        limit: 100,
        offset: 0
      }
      result = await callFioApi("get_received_fio_requests", json);
      //console.log('result: ', result)
      //console.log('content: ', result.requests[0].content)
      expect(result.requests[0].fio_request_id).to.equal(requestId);
      expect(result.requests[0].payer_fio_address).to.equal(userA2.address);
      expect(result.requests[0].payee_fio_address).to.equal(userA1.address);
      expect(result.requests[0].payer_fio_public_key).to.equal(userA2.publicKey);
      expect(result.requests[0].payee_fio_public_key).to.equal(userA1.publicKey);
      expect(result.requests[0].status).to.equal('rejected');
      //expect(result.requests[0].content.memo).to.equal(requestMemo);
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`get_received_fio_requests for userA1 (payee). Expect 'No FIO Requests'`, async () => {
    try {
      const json = {
        fio_public_key: userA1.publicKey,
        limit: 100,
        offset: 0
      }
      result = await callFioApi("get_received_fio_requests", json);
      console.log('result: ', result.json)
      //console.log('content: ', result.requests[0].content)
      expect(result).to.equal(null)
    } catch (err) {
        //console.log('Error: ', err.response)
        expect(err.response.body.message).to.equal('No FIO Requests')
    }
  })

  it('Call get_table_rows from fiotrxtss (NEW table) and confirm request is in table', async () => {
    try {
        const json = {
        json: true,
        code: 'fio.reqobt',
        scope: 'fio.reqobt',
        table: 'fiotrxtss',
        limit: 2,
        reverse: true,
        show_payer: false
        }
        requests = await callFioApi("get_table_rows", json);
        //console.log('requests: ', requests);
        for (request in requests.rows) {
        if (requests.rows[request].fio_request_id == requestId) {
            //console.log('payer_fio_addr: ', requests.rows[request].payer_fio_addr); 
            break;
        }
        }
        expect(requests.rows[request].payer_fio_addr).to.equal(userA2.address);  
    } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
    }
    })

})

describe(`J. get_received_fio_requests error conditions`, () => {
  let userA1, userA2
  const payment = 5000000000 // 5 FIO
  const requestMemo = 'Memo in the initial request'

  it(`Create users`, async () => {
    userA1 = await newUser(faucet);
    userA2 = await newUser(faucet);
  })

  it(`get_received_fio_requests with no requests. Expect: ${config.error.noFioRequests}`, async () => {
    try {
      const json = {
        fio_public_key: userA2.publicKey,
        limit: 100,
        offset: 0
      }
      result = await callFioApi("get_received_fio_requests", json);
      console.log('result: ', result.json)
      //console.log('content: ', result.requests[0].content)
      expect(result).to.equal(null)
    } catch (err) {
        //console.log('Error: ', err.error)
        expect(err.error.message).to.equal(config.error.noFioRequests)
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
        hash: '',
        offLineUrl: ''
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`get_received_fio_requests with invalid public key. Expect: ${config.error.invalidKey}`, async () => {
    try {
      const json = {
        fio_public_key: 'FIOXXXLGcmXLCw87pqNMFurd23SqqEDbCUirr7vwuwuzfaySxQ9w6',
        limit: 100,
        offset: 0
      }
      result = await callFioApi("get_received_fio_requests", json);
      console.log('result: ', result.json)
      //console.log('content: ', result.requests[0].content)
      expect(result).to.equal(null)
    } catch (err) {
        //console.log('Error: ', err.error)
        expect(err.error.fields[0].error).to.equal(config.error.invalidKey)
    }
  })

  it(`get_received_fio_requests with invalid limit. Expect: ${config.error.invalidLimit}`, async () => {
    try {
      const json = {
        fio_public_key: userA2.publicKey,
        limit: -1,
        offset: 0
      }
      result = await callFioApi("get_received_fio_requests", json);
      console.log('result: ', result.json)
      //console.log('content: ', result.requests[0].content)
      expect(result).to.equal(null)
    } catch (err) {
      //console.log('Error: ', err.error)
      expect(err.error.fields[0].error).to.equal(config.error.invalidLimit)
    }
  })

  it(`get_received_fio_requests with invalid offset. Expect: ${config.error.invalidOffset}`, async () => {
    try {
      const json = {
        fio_public_key: userA2.publicKey,
        limit: 100,
        offset: -1
      }
      result = await callFioApi("get_received_fio_requests", json);
      console.log('result: ', result.json)
      //console.log('content: ', result.requests[0].content)
      expect(result).to.equal(null)
    } catch (err) {
      //console.log('Error: ', err.error)
      expect(err.error.fields[0].error).to.equal(config.error.invalidOffset)
    }
  })

})

describe(`K. Test bundles, fees, and RAM for dynamic content size (FIP-32)`, () => {

  /**
   * FIO Requests now have the following logic:
   * 
   *   BASECONTENTAMOUNT = 1000
   * 
   *   if(content.size() >= BASECONTENTAMOUNT){ feeMultiplier = ( content.size() / BASECONTENTAMOUNT) + 1; }
   *   uint64_t bundleAmount = 2 * feeMultiplier;
   * 
   *   RAM Increment =                 
   *    if (feeMultiplier > 1) {
   *        newFundsFee = NEWFUNDSREQUESTRAM + ((NEWFUNDSREQUESTRAM * feeMultiplier) / 2);
   *    }
   */

  let user1, bundleCount, userBalance, user1Ram, user2, user2Ram, user3, requestId, contentSize, feeMultiplier, new_funds_request_fee
  const payment = 1000000000; // 1 FIO

  const BASECONTENTAMOUNT = 1000;
  const bundleBase = 2;

  const requestMemoBase = randStr(659);  // A memo field of 659 chars (bytes) makes the total Content Field 999 bytes
  const requestMemoBasePlus1 = randStr(660);            // Content = 1000, multiplier = 2
  const requestMemoBasePlus1000 = randStr(1656);        // Content = 1999, multiplier = 2
  const requestMemoBasePlus1001 = randStr(1660);        // Content = 2000, multiplier = 3
  const requestMemoBasePlus100000 = randStr(5905);    // Content = 100999, multiplier = 100
  const requestMemoBasePlus100001 = randStr(5910);    // Content = 101000, multiplier = 101
  
    payeeTokenPublicAddressMin = '1';

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
  })

  it(`Get bundle count for user1 `, async () => {
    const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey })
    //console.log('Result: ', result)
    bundleCount = result.fio_addresses[0].remaining_bundled_tx;
    expect(bundleCount).to.be.greaterThan(0)
  })

  it(`Get RAM quota for user1`, async () => {
    try {
      const json = {
        "account_name": user1.account
      }
      result = await callFioApi("get_account", json);
      user1Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`user1 requests funds from user2 with memo of length ${requestMemoBase.length}`, async () => {
    try {
      const content = {
        payee_public_address: payeeTokenPublicAddressMin,
        amount: payment,
        chain_code: 'FIO',
        token_code: 'FIO',
        memo: requestMemoBase,
        hash: '',
        offline_url: ''
      }

      const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user1.privateKey, user1.publicKey);
      feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
      //console.log('           Content length: ', cipherContent.length);

      const result = await user1.sdk.genericAction('requestFunds', {
        payerFioAddress: user2.address,
        payeeFioAddress: user1.address,
        payeeTokenPublicAddress: content.payee_public_address,
        amount: content.amount,
        chainCode: content.chain_code,
        tokenCode: content.token_code,
        memo: content.memo,
        maxFee: config.maxFee,
        payerFioPublicKey: user2.publicKey,
        technologyProviderId: '',
        hash: '',  
        offlineUrl: ''
      })
      //console.log('result: ', result)
      requestId = result.fio_request_id
      expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Get bundle count for user1.`, async () => {
    let bundleCountPrev = bundleCount;
    const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey })
    //console.log('Result: ', result)
    bundleCount = result.fio_addresses[0].remaining_bundled_tx;
    expect(bundleCount).to.equal(bundleCountPrev - (bundleBase * feeMultiplier))
  })

  it(`Confirm RAM quota for user1 was incremented by multiplier`, async () => {
    try {
      let prevRam = user1Ram;
      const json = {
        "account_name": user1.account
      }
      result = await callFioApi("get_account", json);
      user1Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      // mulitplier is 1 so we do not divide by 2
      expect(user1Ram).to.equal(prevRam + (config.RAM.NEWFUNDSREQUESTRAM * feeMultiplier));
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`user1 requests funds from user2 with memo of length ${requestMemoBasePlus1.length}`, async () => {
    try {
      const content = {
        payee_public_address: payeeTokenPublicAddressMin,
        amount: payment,
        chain_code: 'FIO',
        token_code: 'FIO',
        memo: requestMemoBasePlus1,
        hash: '',
        offline_url: ''
      }

      const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user1.privateKey, user1.publicKey);
      feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
      //console.log('           Content length: ', cipherContent.length);

      const result = await user1.sdk.genericAction('requestFunds', {
        payerFioAddress: user2.address,
        payeeFioAddress: user1.address,
        payeeTokenPublicAddress: content.payee_public_address,
        amount: content.amount,
        chainCode: content.chain_code,
        tokenCode: content.token_code,
        memo: content.memo,
        maxFee: config.maxFee,
        payerFioPublicKey: user2.publicKey,
        technologyProviderId: '',
        hash: '',
        offlineUrl: ''
      })
      //console.log('result: ', result)
      requestId = result.fio_request_id
      expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Get bundle count for user1.`, async () => {
    let bundleCountPrev = bundleCount;
    const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey })
    //console.log('Result: ', result)
    bundleCount = result.fio_addresses[0].remaining_bundled_tx;
    expect(bundleCount).to.equal(bundleCountPrev - (bundleBase * 2))
  })

  it(`Confirm RAM quota for user1 was incremented by multiplier`, async () => {
    try {
      let prevRam = user1Ram;
      const json = {
        "account_name": user1.account
      }
      result = await callFioApi("get_account", json);
      user1Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(user1Ram).to.equal(prevRam + config.RAM.NEWFUNDSREQUESTRAM + (config.RAM.NEWFUNDSREQUESTRAM * feeMultiplier) / 2);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`user1 requests funds from user2 with memo of length ${requestMemoBasePlus1000.length}`, async () => {
    try {
      const content = {
        payee_public_address: payeeTokenPublicAddressMin,
        amount: payment,
        chain_code: 'FIO',
        token_code: 'FIO',
        memo: requestMemoBasePlus1000,
        hash: '',
        offline_url: ''
      }

      const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user1.privateKey, user1.publicKey);
      feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
      //console.log('           Content length: ', cipherContent.length);

      const result = await user1.sdk.genericAction('requestFunds', {
        payerFioAddress: user2.address,
        payeeFioAddress: user1.address,
        payeeTokenPublicAddress: content.payee_public_address,
        amount: content.amount,
        chainCode: content.chain_code,
        tokenCode: content.token_code,
        memo: content.memo,
        maxFee: config.maxFee,
        payerFioPublicKey: user2.publicKey,
        technologyProviderId: '',
        hash: '',
        offlineUrl: ''
      })
      //console.log('result: ', result)
      requestId = result.fio_request_id
      expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Get bundle count for user1.`, async () => {
    let bundleCountPrev = bundleCount;
    const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey })
    //console.log('Result: ', result)
    bundleCount = result.fio_addresses[0].remaining_bundled_tx;
    expect(bundleCount).to.equal(bundleCountPrev - (bundleBase * feeMultiplier))
  })

  it(`Confirm RAM quota for user1 was incremented by multiplier`, async () => {
    try {
      let prevRam = user1Ram;
      const json = {
        "account_name": user1.account
      }
      result = await callFioApi("get_account", json);
      user1Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(user1Ram).to.equal(prevRam + config.RAM.NEWFUNDSREQUESTRAM + (config.RAM.NEWFUNDSREQUESTRAM * feeMultiplier) / 2);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`user1 requests funds from user2 with memo of length ${requestMemoBasePlus1001.length}`, async () => {
    try {
      const content = {
        payee_public_address: payeeTokenPublicAddressMin,
        amount: payment,
        chain_code: 'FIO',
        token_code: 'FIO',
        memo: requestMemoBasePlus1001,
        hash: '',
        offline_url: ''
      }

      const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user1.privateKey, user1.publicKey);
      feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
      //console.log('           Content length: ', cipherContent.length);
      //console.log('           Bundle Payment: ', bundleBase * feeMultiplier);

      const result = await user1.sdk.genericAction('requestFunds', {
        payerFioAddress: user2.address,
        payeeFioAddress: user1.address,
        payeeTokenPublicAddress: content.payee_public_address,
        amount: content.amount,
        chainCode: content.chain_code,
        tokenCode: content.token_code,
        memo: content.memo,
        maxFee: config.maxFee,
        payerFioPublicKey: user2.publicKey,
        technologyProviderId: '',
        hash: '',
        offlineUrl: ''
      })
      //console.log('result: ', result)
      requestId = result.fio_request_id
      expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Get bundle count for user1.`, async () => {
    let bundleCountPrev = bundleCount;
    const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey })
    //console.log('Result: ', result)
    bundleCount = result.fio_addresses[0].remaining_bundled_tx;
    expect(bundleCount).to.equal(bundleCountPrev - (bundleBase * feeMultiplier))
  })

  it(`Confirm RAM quota for user1 was incremented by multiplier`, async () => {
    try {
      let prevRam = user1Ram;
      const json = {
        "account_name": user1.account
      }
      result = await callFioApi("get_account", json);
      user1Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(user1Ram).to.equal(prevRam + config.RAM.NEWFUNDSREQUESTRAM + (config.RAM.NEWFUNDSREQUESTRAM * feeMultiplier) / 2);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`(push_transaction) Add 100 * 5 = 500 bundles to user1`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addbundles',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          bundle_sets: 5,
          max_fee: config.maxFee,
          technologyProviderId: ''
        }
      })
      //console.log('Result: ', result);
      bundleCount = bundleCount + 500;
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`user1 requests funds from user2 with memo of length ${requestMemoBasePlus100000.length}`, async () => {
    try {
      const content = {
        payee_public_address: payeeTokenPublicAddressMin,
        amount: payment,
        chain_code: 'FIO',
        token_code: 'FIO',
        memo: requestMemoBasePlus100000,
        hash: '',
        offline_url: ''
      }

      const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user1.privateKey, user1.publicKey);
      feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
      //console.log('           Content length: ', cipherContent.length);
      //console.log('           Bundle Payment: ', bundleBase * feeMultiplier);

      const result = await user1.sdk.genericAction('requestFunds', {
        payerFioAddress: user2.address,
        payeeFioAddress: user1.address,
        payeeTokenPublicAddress: content.payee_public_address,
        amount: content.amount,
        chainCode: content.chain_code,
        tokenCode: content.token_code,
        memo: content.memo,
        maxFee: config.maxFee,
        payerFioPublicKey: user2.publicKey,
        technologyProviderId: '',
        hash: '',
        offlineUrl: ''
      })
      //console.log('result: ', result)
      requestId = result.fio_request_id
      expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal(null)
    }
  })

  it(`Get bundle count for user1.`, async () => {
    let bundleCountPrev = bundleCount;
    const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey })
    //console.log('Result: ', result)
    bundleCount = result.fio_addresses[0].remaining_bundled_tx;
    expect(bundleCount).to.equal(bundleCountPrev - (bundleBase * feeMultiplier))
  })

  it(`Confirm RAM quota for user1 was incremented by multiplier`, async () => {
    try {
      let prevRam = user1Ram;
      const json = {
        "account_name": user1.account
      }
      result = await callFioApi("get_account", json);
      user1Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(user1Ram).to.equal(prevRam + config.RAM.NEWFUNDSREQUESTRAM + (config.RAM.NEWFUNDSREQUESTRAM * feeMultiplier) / 2);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`user1 requests funds from user2 with memo of length ${requestMemoBasePlus100001.length}. Expect 'Transaction is too large'`, async () => {
    try {
      const content = {
        payee_public_address: payeeTokenPublicAddressMin,
        amount: payment,
        chain_code: 'FIO',
        token_code: 'FIO',
        memo: requestMemoBasePlus100001,
        hash: '',
        offline_url: ''
      }

      const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user1.privateKey, user1.publicKey);
      feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
      //console.log('           Content length: ', cipherContent.length);
      //console.log('           Bundle Payment: ', bundleBase * feeMultiplier);

      const result = await user1.sdk.genericAction('requestFunds', {
        payerFioAddress: user2.address,
        payeeFioAddress: user1.address,
        payeeTokenPublicAddress: content.payee_public_address,
        amount: content.amount,
        chainCode: content.chain_code,
        tokenCode: content.token_code,
        memo: content.memo,
        maxFee: config.maxFee,
        payerFioPublicKey: user2.publicKey,
        technologyProviderId: '',
        hash: '',
        offlineUrl: ''
      })
      //console.log('result: ', result)
      requestId = result.fio_request_id
      expect(result.status).to.equal(null)
    } catch (err) {
      //console.log('Error: ', err)
      expect(err.json.fields[0].error).to.equal('Transaction is too large')
    }
  })

  it(`consume user2's remaining bundled transactions`, async () => {
    try {
      await consumeRemainingBundles(user2, user3);
    } catch (err) {
      expect(err).to.equal(null);
    } finally {
      let bundleCount = await getBundleCount(user2.sdk);
      expect(bundleCount).to.equal(0);
    }
  });

  it('Get new_funds_request fee', async () => {
    try {
      result = await user2.sdk.getFee('new_funds_request', user2.address);
      new_funds_request_fee = result.fee;
      //console.log('new_funds_request_fee: ', new_funds_request_fee);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get balance for user2`, async () => {
    try {
      const result = await user2.sdk.genericAction('getFioBalance', {
        fioPublicKey: user2.publicKey
      })
      userBalance = result.balance
      //console.log('userBalance: ', userBalance);
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Get RAM quota for user2`, async () => {
    try {
      const json = {
        "account_name": user2.account
      }
      result = await callFioApi("get_account", json);
      user2Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`user2 requests funds from user3 with memo of length ${requestMemoBase.length}`, async () => {
    try {
      const content = {
        payee_public_address: payeeTokenPublicAddressMin,
        amount: payment,
        chain_code: 'FIO',
        token_code: 'FIO',
        memo: requestMemoBase,
        hash: '',
        offline_url: ''
      }

      const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user2.privateKey, user2.publicKey);
      feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
      //console.log('           Content length: ', cipherContent.length);

      const result = await user2.sdk.genericAction('requestFunds', {
        payerFioAddress: user3.address,
        payeeFioAddress: user2.address,
        payeeTokenPublicAddress: content.payee_public_address,
        amount: content.amount,
        chainCode: content.chain_code,
        tokenCode: content.token_code,
        memo: content.memo,
        maxFee: config.maxFee,
        payerFioPublicKey: user3.publicKey,
        technologyProviderId: '',
        hash: '',
        offlineUrl: ''
      })
      //console.log('result: ', result)
      requestId = result.fio_request_id
      expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Get balance for user2`, async () => {
    let userBalancePrev = userBalance;
    try {
      const result = await user2.sdk.genericAction('getFioBalance', {
        fioPublicKey: user2.publicKey
      })
      userBalance = result.balance
      //console.log('userBalance: ', userBalance);
      expect(userBalance).to.equal(userBalancePrev - (new_funds_request_fee * feeMultiplier))
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Confirm RAM quota for user2 was incremented by multiplier`, async () => {
    try {
      let prevRam = user2Ram;
      const json = {
        "account_name": user2.account
      }
      result = await callFioApi("get_account", json);
      user2Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(user2Ram).to.equal(prevRam + (config.RAM.NEWFUNDSREQUESTRAM * feeMultiplier));
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`user2 requests funds from user3 with memo of length ${requestMemoBasePlus1.length}`, async () => {
    try {
      const content = {
        payee_public_address: payeeTokenPublicAddressMin,
        amount: payment,
        chain_code: 'FIO',
        token_code: 'FIO',
        memo: requestMemoBasePlus1,
        hash: '',
        offline_url: ''
      }

      const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user2.privateKey, user2.publicKey);
      feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
      //console.log('           Content length: ', cipherContent.length);

      const result = await user2.sdk.genericAction('requestFunds', {
        payerFioAddress: user3.address,
        payeeFioAddress: user2.address,
        payeeTokenPublicAddress: content.payee_public_address,
        amount: content.amount,
        chainCode: content.chain_code,
        tokenCode: content.token_code,
        memo: content.memo,
        maxFee: config.maxFee,
        payerFioPublicKey: user3.publicKey,
        technologyProviderId: '',
        hash: '',
        offlineUrl: ''
      })
      //console.log('result: ', result)
      requestId = result.fio_request_id
      expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Get balance for user2`, async () => {
    let userBalancePrev = userBalance;
    try {
      const result = await user2.sdk.genericAction('getFioBalance', {
        fioPublicKey: user2.publicKey
      })
      userBalance = result.balance
      //console.log('userBalance: ', userBalance);
      expect(userBalance).to.equal(userBalancePrev - (new_funds_request_fee * feeMultiplier))
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Confirm RAM quota for user2 was incremented by multiplier`, async () => {
    try {
      let prevRam = user2Ram;
      const json = {
        "account_name": user2.account
      }
      result = await callFioApi("get_account", json);
      user2Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(user2Ram).to.equal(prevRam + config.RAM.NEWFUNDSREQUESTRAM + (config.RAM.NEWFUNDSREQUESTRAM * feeMultiplier) / 2);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`user2 requests funds from user3 with memo of length ${requestMemoBasePlus1000.length}`, async () => {
    try {
      const content = {
        payee_public_address: payeeTokenPublicAddressMin,
        amount: payment,
        chain_code: 'FIO',
        token_code: 'FIO',
        memo: requestMemoBasePlus1000,
        hash: '',
        offline_url: ''
      }

      const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user2.privateKey, user2.publicKey);
      feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
      //console.log('           Content length: ', cipherContent.length);

      const result = await user2.sdk.genericAction('requestFunds', {
        payerFioAddress: user3.address,
        payeeFioAddress: user2.address,
        payeeTokenPublicAddress: content.payee_public_address,
        amount: content.amount,
        chainCode: content.chain_code,
        tokenCode: content.token_code,
        memo: content.memo,
        maxFee: config.maxFee,
        payerFioPublicKey: user3.publicKey,
        technologyProviderId: '',
        hash: '',
        offlineUrl: ''
      })
      //console.log('result: ', result)
      requestId = result.fio_request_id
      expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Get balance for user2`, async () => {
    let userBalancePrev = userBalance;
    try {
      const result = await user2.sdk.genericAction('getFioBalance', {
        fioPublicKey: user2.publicKey
      })
      userBalance = result.balance
      //console.log('userBalance: ', userBalance);
      expect(userBalance).to.equal(userBalancePrev - (new_funds_request_fee * feeMultiplier))
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Confirm RAM quota for user2 was incremented by multiplier`, async () => {
    try {
      let prevRam = user2Ram;
      const json = {
        "account_name": user2.account
      }
      result = await callFioApi("get_account", json);
      user2Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(user2Ram).to.equal(prevRam + config.RAM.NEWFUNDSREQUESTRAM + (config.RAM.NEWFUNDSREQUESTRAM * feeMultiplier) / 2);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`user2 requests funds from user3 with memo of length ${requestMemoBasePlus1001.length}`, async () => {
    try {
      const content = {
        payee_public_address: payeeTokenPublicAddressMin,
        amount: payment,
        chain_code: 'FIO',
        token_code: 'FIO',
        memo: requestMemoBasePlus1001,
        hash: '',
        offline_url: ''
      }

      const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user2.privateKey, user2.publicKey);
      feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
      //console.log('           Content length: ', cipherContent.length);

      const result = await user2.sdk.genericAction('requestFunds', {
        payerFioAddress: user3.address,
        payeeFioAddress: user2.address,
        payeeTokenPublicAddress: content.payee_public_address,
        amount: content.amount,
        chainCode: content.chain_code,
        tokenCode: content.token_code,
        memo: content.memo,
        maxFee: config.maxFee,
        payerFioPublicKey: user3.publicKey,
        technologyProviderId: '',
        hash: '',
        offlineUrl: ''
      })
      //console.log('result: ', result)
      requestId = result.fio_request_id
      expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Get balance for user2`, async () => {
    let userBalancePrev = userBalance;
    try {
      const result = await user2.sdk.genericAction('getFioBalance', {
        fioPublicKey: user2.publicKey
      })
      userBalance = result.balance
      //console.log('userBalance: ', userBalance);
      expect(userBalance).to.equal(userBalancePrev - (new_funds_request_fee * feeMultiplier))
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Confirm RAM quota for user2 was incremented by multiplier`, async () => {
    try {
      let prevRam = user2Ram;
      const json = {
        "account_name": user2.account
      }
      result = await callFioApi("get_account", json);
      user2Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(user2Ram).to.equal(prevRam + config.RAM.NEWFUNDSREQUESTRAM + (config.RAM.NEWFUNDSREQUESTRAM * feeMultiplier) / 2);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`user2 requests funds from user3 with memo of length ${requestMemoBasePlus100000.length}`, async () => {
    try {
      const content = {
        payee_public_address: payeeTokenPublicAddressMin,
        amount: payment,
        chain_code: 'FIO',
        token_code: 'FIO',
        memo: requestMemoBasePlus100000,
        hash: '',
        offline_url: ''
      }

      const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user2.privateKey, user2.publicKey);
      feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
      //console.log('           Content length: ', cipherContent.length);

      const result = await user2.sdk.genericAction('requestFunds', {
        payerFioAddress: user3.address,
        payeeFioAddress: user2.address,
        payeeTokenPublicAddress: content.payee_public_address,
        amount: content.amount,
        chainCode: content.chain_code,
        tokenCode: content.token_code,
        memo: content.memo,
        maxFee: config.maxFee,
        payerFioPublicKey: user3.publicKey,
        technologyProviderId: '',
        hash: '',
        offlineUrl: ''
      })
      //console.log('result: ', result)
      requestId = result.fio_request_id
      expect(result.status).to.equal('requested')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal(null)
    }
  })

  it(`Get balance for user2`, async () => {
    let userBalancePrev = userBalance;
    try {
      const result = await user2.sdk.genericAction('getFioBalance', {
        fioPublicKey: user2.publicKey
      })
      userBalance = result.balance
      //console.log('userBalance: ', userBalance);
      expect(userBalance).to.equal(userBalancePrev - (new_funds_request_fee * feeMultiplier))
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Confirm RAM quota for user2 was incremented by multiplier`, async () => {
    try {
      let prevRam = user2Ram;
      const json = {
        "account_name": user2.account
      }
      result = await callFioApi("get_account", json);
      user2Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(user2Ram).to.equal(prevRam + config.RAM.NEWFUNDSREQUESTRAM + (config.RAM.NEWFUNDSREQUESTRAM * feeMultiplier) / 2);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`user2 requests funds from user3 with memo of length ${requestMemoBasePlus100001.length}. Expect 'Transaction is too large'`, async () => {
    try {
      const content = {
        payee_public_address: payeeTokenPublicAddressMin,
        amount: payment,
        chain_code: 'FIO',
        token_code: 'FIO',
        memo: requestMemoBasePlus100001,
        hash: '',
        offline_url: ''
      }

      const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user2.privateKey, user2.publicKey);
      feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
      //console.log('           Content length: ', cipherContent.length);

      const result = await user2.sdk.genericAction('requestFunds', {
        payerFioAddress: user3.address,
        payeeFioAddress: user2.address,
        payeeTokenPublicAddress: content.payee_public_address,
        amount: content.amount,
        chainCode: content.chain_code,
        tokenCode: content.token_code,
        memo: content.memo,
        maxFee: config.maxFee,
        payerFioPublicKey: user3.publicKey,
        technologyProviderId: '',
        hash: '',
        offlineUrl: ''
      })
      //console.log('result: ', result)
      requestId = result.fio_request_id
      expect(result.status).to.equal(null)
    } catch (err) {
      //console.log('Error: ', err)
      expect(err.json.fields[0].error).to.equal('Transaction is too large')
    }
  })

})

describe(`L. Test getters with large content (FIP-32)`, () => {
  let user1, user2
  const payment = 5000000000 // 5 FIO

  const requestMemoLarge = randStr(1660);        // Content = 2000, multiplier = 3
  const requestMemoXLarge = randStr(5905);    // Content = 100999, multiplier = 100

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  })

  it(`user1 requests funds from user2 with memo of length ${requestMemoLarge.length}`, async () => {
    try {
      const content = {
        payee_public_address: payeeTokenPublicAddressMin,
        amount: payment,
        chain_code: 'FIO',
        token_code: 'FIO',
        memo: requestMemoLarge,
        hash: '',
        offline_url: ''
      }

      const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user1.privateKey, user1.publicKey);

      const result = await callFioApiSigned('push_transaction', {
        action: 'newfundsreq',
        account: 'fio.reqobt',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          payer_fio_address: user2.address,
          payee_fio_address: user1.address,
          tpid: '',
          content: cipherContent,
          max_fee: config.maxFee,
          actor: user1.account
        }
      })
      //console.log('result: ', result)
      expect(result.processed.receipt.status).to.equal('executed')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`user1 requests funds from user2 with memo of length ${requestMemoXLarge.length}`, async () => {
    try {
      const content = {
        payee_public_address: payeeTokenPublicAddressMin,
        amount: payment,
        chain_code: 'FIO',
        token_code: 'FIO',
        memo: requestMemoXLarge,
        hash: '',
        offline_url: ''
      }

      const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user1.privateKey, user1.publicKey);

      const result = await callFioApiSigned('push_transaction', {
        action: 'newfundsreq',
        account: 'fio.reqobt',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          payer_fio_address: user2.address,
          payee_fio_address: user1.address,
          tpid: '',
          content: cipherContent,
          max_fee: config.maxFee,
          actor: user1.account
        }
      })
      //console.log('result: ', result)
      expect(result.processed.receipt.status).to.equal('executed')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

})