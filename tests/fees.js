require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, callFioApi} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const { to } = require('mathjs');
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

describe('************************** fees.js ************************** \n    Test Transaction Fees', () => {
  let userA1

  it(`Create users`, async () => {
    userA1 = await newUser(faucet);
  })

  it(`Test all fees`, async () => {
    for (fioEndpoint in config.api) {
      try {
        //console.log('fioEndpoint: ', fioEndpoint)
        //console.log('bundledEligible: ', config.api[fioEndpoint].bundledEligible)
        if (config.api[fioEndpoint].bundledEligible) {
          const result = await userA1.sdk.genericAction('getFee', {
            endPoint: fioEndpoint,
            fioAddress: userA1.address,
          })
          //console.log('Returned fee: ', result)
          expect(result.fee).to.equal(0)
        } else {
          const result = await userA1.sdk.genericAction('getFee', {
            endPoint: fioEndpoint,
            fioAddress: ''
          })
          //console.log('Returned fee: ', result)
          expect(result.fee).to.equal(config.api[fioEndpoint].fee)
        }
      } catch (err) {
        console.log('Error: ', err)
      }
    }
  })

  it(`Test all fees UPPERCASE`, async () => {
    let fioEndpoint;
    for (fioEndpoint in config.api) {
      try {
        //console.log('fioEndpoint: ', fioEndpoint)
        //console.log('bundledEligible: ', config.api[fioEndpoint].bundledEligible)
        if (config.api[fioEndpoint].bundledEligible) {
          const result = await userA1.sdk.genericAction('getFee', {
            endPoint: fioEndpoint,
            fioAddress: userA1.address.toUpperCase(),
          })
          //console.log('Returned fee: ', result)
          expect(result.fee).to.equal(0)
        } else {
          const result = await userA1.sdk.genericAction('getFee', {
            endPoint: fioEndpoint,
            fioAddress: ''
          })
          //console.log('Returned fee: ', result)
          expect(result.fee).to.equal(config.api[fioEndpoint].fee)
        }
      } catch (err) {
        console.log('Error: ', err)
      }
    }
  })
})

describe('B. Compare get_fee to actual fee returned from transaction', () => {

  let user1, user2, fee;
  const amount = 2000000000; // 2 FIO

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  })

  it('Get fee for transfer_fio_pub_key', async () => {
    try {
        const result = await callFioApi("get_fee", {
          end_point: 'transfer_tokens_pub_key',
          fio_address: user1.address
      })
      //console.log('Result', result);
      fee = result.fee;
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null);
    }
  })

  it(`Test all fees UPPERCASE`, async () => {
    try {
      result = await user1.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: user2.publicKey,
          amount: amount,
          max_fee: config.maxFee,
          actor: user1.account,
          tpid: ''
        }
      });
      //console.log('Result', result);
      expect(result.fee_collected).to.equal(fee);
    } catch (err) {
      console.log('Error: ', err)
    }
  });



});