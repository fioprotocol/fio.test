require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

describe('************************** fees.js ************************** \n Test Transaction Fees', () => {
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
