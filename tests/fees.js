require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
const {callFioApi, callFioApiSigned} = require("../utils");
config = require('../config.js');
let faucet;

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

describe(`B. do not require FIO addresses for certain fees`, () => {
  let userB1

  before(async () => {
    userB1 = await newUser(faucet);
  })

  it(`call get_fee on stake_fio_tokens without passing in a fio_address, expect OK`, async () => {
    try {
      const result = await callFioApi('get_fee', {"end_point": "stake_fio_tokens"})
      expect(result).to.have.property('fee').which.is.a('number').and.equals(0)
    } catch (err) {
      throw err
    }
  })

  it(`call get_fee on unstake_fio_tokens without passing in a fio_address, expect OK`, async () => {
    try {
      const result = await callFioApi('get_fee', {"end_point": "unstake_fio_tokens"})
      expect(result).to.have.property('fee').which.is.a('number').and.equals(0)
    } catch (err) {
      throw err
    }
  })

  it(`call get_fee on vote_producer without passing in a fio_address, expect OK`, async () => {
    try {
      const result = await callFioApi('get_fee', {"end_point": "vote_producer"})
      expect(result).to.have.property('fee').which.is.a('number').and.equals(0)
    } catch (err) {
      throw err
    }
  })

  it(`call get_fee on proxy_vote without passing in a fio_address, expect OK`, async () => {
    try {
      const result = await callFioApi('get_fee', {end_point: "proxy_vote"})
      expect(result).to.have.property('fee').which.is.a('number').and.equals(0)
    } catch (err) {
      throw err
    }
  })
})
