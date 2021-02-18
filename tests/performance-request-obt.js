require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, callFioApi, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** performance-request-obt.js ************************** \n    A. FIO Request and OBT Record performance test`, () => {
  let user1, user2, user3,
  payment = 3000000000,
  requestMemo = 'asdf',
  count = 5,
  funding = 5000000000000 

  it(`Create users`, async () => {
      user1 = await newUser(faucet);
      user2 = await newUser(faucet);
      user3 = await newUser(faucet);

      //console.log('user1: ' + user1.account + ', ' + user1.privateKey + ', ' + user1.publicKey)
      //console.log('user2: ' + user2.account + ', ' + user2.privateKey + ', ' + user2.publicKey)
      //console.log('user3: ' + user3.account + ', ' + user3.privateKey + ', ' + user3.publicKey)
  })

  it('Transfer lots of FIO to users', async () => {
    try {
        const result = await faucet.genericAction('transferTokens', {
            payeeFioPublicKey: user1.publicKey,
            amount: funding,
            maxFee: config.maxFee,
            technologyProviderId: ''
        })
        //console.log('Result: ', result)
        expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    } 

    try {
      const result = await faucet.genericAction('transferTokens', {
          payeeFioPublicKey: user2.publicKey,
          amount: funding,
          maxFee: config.maxFee,
          technologyProviderId: ''
      })
      //console.log('Result: ', result)
      expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    } 

    try {
      const result = await faucet.genericAction('transferTokens', {
          payeeFioPublicKey: user3.publicKey,
          amount: funding,
          maxFee: config.maxFee,
          technologyProviderId: ''
      })
      //console.log('Result: ', result)
      expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    } 
  })

  describe(`A. Load Requests and OBTs`, () => {

    it(`${count}x - user1 requests funds from user2`, async () => {
        for (i = 0; i < count; i++) {
          try {
            const result = await user1.sdk.genericAction('requestFunds', {
              payerFioAddress: user2.address,
              payeeFioAddress: user1.address,
              payeeTokenPublicAddress: user1.address,
              amount: payment,
              chainCode: 'FIO',
              tokenCode: 'FIO',
              memo: requestMemo,
              maxFee: config.api.new_funds_request.fee,
              payerFioPublicKey: user2.publicKey,
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

    it(`${count}x - user2 requests funds from user1`, async () => {
        for (i = 0; i < count; i++) {
          try {
            const result = await user2.sdk.genericAction('requestFunds', {
              payerFioAddress: user1.address,
              payeeFioAddress: user2.address,
              payeeTokenPublicAddress: user2.address,
              amount: payment,
              chainCode: 'FIO',
              tokenCode: 'FIO',
              memo: requestMemo,
              maxFee: config.api.new_funds_request.fee,
              payerFioPublicKey: user1.publicKey,
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

    it(`${count}x - user3 requests funds from user2, user2 rejects request`, async () => {
        let requestId;
        for (i = 0; i < count; i++) {
            try {
                const result = await user3.sdk.genericAction('requestFunds', {
                    payerFioAddress: user2.address,
                    payeeFioAddress: user3.address,
                    payeeTokenPublicAddress: user3.address,
                    amount: payment,
                    chainCode: 'FIO',
                    tokenCode: 'FIO',
                    memo: requestMemo,
                    maxFee: config.api.new_funds_request.fee,
                    payerFioPublicKey: user2.publicKey,
                    technologyProviderId: '',
                    hash: 'fmwazjvmenfz',  // This is the hash of off-chain data... ?
                    offlineUrl: ''
                })
                //console.log('Result: ', result)
                requestId = result.fio_request_id;
                expect(result.status).to.equal('requested')
            } catch (err) {
                console.log('Error', err.json)
                expect(err).to.equal(null)
            }

            try {
                const result = await user2.sdk.genericAction('pushTransaction', {
                    action: 'rejectfndreq',
                    account: 'fio.reqobt',
                    data: {
                        fio_request_id: requestId,
                        max_fee: config.api.cancel_funds_request.fee,
                        tpid: '',
                        actor: user2.account
                    }
                })
                //console.log('Result:', result)
                expect(result.status).to.equal('request_rejected') 
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        }
    })

    it(`${count}x - user2 requests funds from user1, user 1 records OBT response`, async () => {
        let requestId;
        for (i = 0; i < count; i++) {
            try {
                const result = await user2.sdk.genericAction('requestFunds', {
                    payerFioAddress: user1.address,
                    payeeFioAddress: user2.address,
                    payeeTokenPublicAddress: user2.address,
                    amount: payment,
                    chainCode: 'FIO',
                    tokenCode: 'FIO',
                    memo: requestMemo,
                    maxFee: config.api.new_funds_request.fee,
                    payerFioPublicKey: user1.publicKey,
                    technologyProviderId: '',
                    hash: 'fmwazjvmenfz',  // This is the hash of off-chain data... ?
                    offlineUrl: ''
                })
                //console.log('Result: ', result)
                requestId = result.fio_request_id;
                expect(result.status).to.equal('requested')
            } catch (err) {
                console.log('Error', err.json)
                expect(err).to.equal(null)
            }

          try {
                const result = await user1.sdk.genericAction('recordObtData', {
                    payerFioAddress: user1.address,
                    payeeFioAddress: user2.address,
                    payerTokenPublicAddress: user1.publicKey,
                    payeeTokenPublicAddress: user2.publicKey,
                    amount: payment,
                    chainCode: "FIO",
                    tokenCode: "FIO",
                    status: '',
                    obtId: requestId,
                    maxFee: config.api.record_obt_data.fee,
                    technologyProviderId: '',
                    payeeFioPublicKey: user2.publicKey,
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

    it(`${count}x user3 creates BTC OBT send record to user1`, async () => {
        for (i = 0; i < count; i++) {
            try {
                const result = await user3.sdk.genericAction('recordObtData', {
                    payerFioAddress: user3.address,
                    payeeFioAddress: user1.address,
                    payerTokenPublicAddress: user3.publicKey,
                    payeeTokenPublicAddress: user1.publicKey,
                    amount: payment,
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
                //console.log('Result: ', result)
                expect(result.status).to.equal('sent_to_blockchain')
            } catch (err) {
                console.log('Error', err.json)
                expect(err).to.equal(null)
            }
        }
    })

  })

  describe(`B. Check user1`, () => {

    it(`get_sent_fio_requests for user1`, async () => {
      try {
          const result = await user1.sdk.genericAction('getSentFioRequests', {
              limit: '',
              offset: ''
          })
          //console.log('result: ', result);
          //console.log('length: ', result.requests.length);
          expect(result.requests.length).to.equal(count)
          //expect(result.requests[0].fio_request_id).to.equal(requestId);
          //expect(result.requests[0].payer_fio_address).to.equal(userA2.address);
          //expect(result.requests[0].payee_fio_address).to.equal(userA1.address);
          //expect(result.requests[0].payer_fio_public_key).to.equal(userA2.publicKey);
          //expect(result.requests[0].payee_fio_public_key).to.equal(userA1.publicKey);
          //expect(result.requests[0].status).to.equal('requested');
          //expect(result.requests[0].content.memo).to.equal(requestMemo);
      } catch (err) {
          console.log('Error: ', err)
          expect(err).to.equal(null)
      }
    })

    it.skip(`get_sent_fio_requests for userA2 (payer). Expect 'No FIO Requests'`, async () => {
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

    it(`get_pending_fio_requests for user1`, async () => {
      try {
        const result = await user1.sdk.genericAction('getPendingFioRequests', {
          limit: '',
          offset: ''
        })
        //console.log('result: ', result)
        //console.log('content: ', result.requests[0].content)
        expect(result.requests.length).to.equal(count * 2)
      } catch (err) {
        console.log('Error: ', err)
        expect(err).to.equal(null)
      }
    })
/*
    it.skip(`get_pending_fio_requests for user2 (payer)`, async () => {
      try {
        const result = await user2.sdk.genericAction('getPendingFioRequests', {
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
*/
    it(`get_cancelled_fio_requests for user1 (payee). Expect 'No FIO Requests'`, async () => {
      try {
        const result = await user1.sdk.genericAction('getCancelledFioRequests', {
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

    it.skip(`get_cancelled_fio_requests for user2 (payer). Expect 'No FIO Requests'`, async () => {
      try {
        const result = await user1.sdk.genericAction('getCancelledFioRequests', {
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

    it(`Bahamas TODO: update after added to SDK to include memo check. get_received_fio_requests for user1 (payer)`, async () => {
      try {
        const json = {
          fio_public_key: user1.publicKey,
          limit: 100,
          offset: 0
        }
        result = await callFioApi("get_received_fio_requests", json);
        //console.log('result: ', result)
        //console.log('content: ', result.requests[0].content)
        //expect(result.requests[0].fio_request_id).to.equal(requestId);
        //expect(result.requests[0].payer_fio_address).to.equal(userA2.address);
        //expect(result.requests[0].payee_fio_address).to.equal(userA1.address);
        //expect(result.requests[0].payer_fio_public_key).to.equal(userA2.publicKey);
        //expect(result.requests[0].payee_fio_public_key).to.equal(userA1.publicKey);
        //expect(result.requests[0].status).to.equal('requested');
        //expect(result.requests[0].content.memo).to.equal(requestMemo);
      } catch (err) {
        console.log('Error: ', err)
        expect(err).to.equal(null)
      }
    })

    it.skip(`get_received_fio_requests for userA1 (payee). Expect 'No FIO Requests'`, async () => {
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

    it(`getObtData for user1`, async () => {
      try {
        const result = await user1.sdk.genericAction('getObtData', {
          limit: '',
          offset: '',
        })
        console.log('result: ', result)
        //console.log('content: ', result.obt_data_records[0].content)
        expect(result.requests.length).to.equal(count * 2)
        //expect(result.obt_data_records[0].fio_request_id).to.equal(requestId);
        //expect(result.obt_data_records[0].payer_fio_address).to.equal(userA2.address);
        //expect(result.obt_data_records[0].payee_fio_address).to.equal(userA1.address);
        //expect(result.obt_data_records[0].payer_fio_public_key).to.equal(userA2.publicKey);
        //expect(result.obt_data_records[0].payee_fio_public_key).to.equal(userA1.publicKey);
        //expect(result.obt_data_records[0].status).to.equal('sent_to_blockchain');
        //expect(result.obt_data_records[0].content.memo).to.equal(obtMemo);
      } catch (err) {
        console.log('Error: ', err)
        expect(err).to.equal(null)
      }
    })

    it.skip(`getObtData for user2`, async () => {
      try {
        const result = await userA1.sdk.genericAction('getObtData', {
          limit: '',
          offset: '',
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

    it(`get_fio_balance`, async () => {
      try {
        const result = await user1.sdk.genericAction('getFioBalance', {
          fioPublicKey: user1.publicKey
        })
        //console.log('result: ', result)
        balance = result.balance
        expect(result.balance).to.be.greaterThan(0)
      } catch (err) {
        console.log('Error: ', err)
      }
    })

  })

})
