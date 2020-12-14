require('mocha')
const {expect} = require('chai')
const {newUser, generateFioAddress, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

describe('************************** txn-resubmit.js ************************** \n A. Get raw transaction and resubmit.', () => {

    let userA1, userA2, preparedTrx, userA1RequestId
    const payment = 5000000000 // 5 FIO
    const requestMemo = 'Memo in the initial request'

    it(`Create users`, async () => {
        userA1 = await newUser(faucet);
        userA2 = await newUser(faucet);
    })

    it(`userA1 requests funds from userA2`, async () => {
      try {
        userA1.sdk.setSignedTrxReturnOption(true)
        preparedTrx = await userA1.sdk.genericAction('requestFunds', {
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
        userA1.sdk.setSignedTrxReturnOption(false)
      } catch (err) {
        console.log('Error: ', err)
        expect(err).to.equal(null)
      }
    })

    it(`submit transaction`, async () => {
        try {
          userA1.sdk.setSignedTrxReturnOption(true)
          const result = await userA1.sdk.executePreparedTrx('new_funds_request', preparedTrx)
          //console.log('Result: ', result)
          userA1RequestId = result.fio_request_id
          userA1.sdk.setSignedTrxReturnOption(false)
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

      it(`Resubmit transaction via SDK. Expect 'Duplicate transaction' error.`, async () => {
        try {
          userA1.sdk.setSignedTrxReturnOption(true)
          const result = await userA1.sdk.executePreparedTrx('new_funds_request', preparedTrx)
          expect(result).to.equal(null);
          userA1.sdk.setSignedTrxReturnOption(false)
        } catch (err) {
          //console.log('Error: ', err.json.error.details)
          expect(err.json.error.what).to.equal('Duplicate transaction')
        }
      })

    it(`Resubmit transaction using push_transaction endpoint. Expect 'Duplicate transaction' error.`, async () => {
      try {
        const fiourl = config.URL + "/v1/chain/";
        const endPoint = "push_transaction";
        const result = await fetch(fiourl + endPoint, {
          body: JSON.stringify(preparedTrx),
          method: 'POST',
        });
        const json = await result.json()
        //console.log('result: ', result)
        expect(json.error.what).to.equal('Duplicate transaction')
      } catch (err) {
        console.log('Error: ', err)
        expect(err).to.equal(null);
      }
    })

})
