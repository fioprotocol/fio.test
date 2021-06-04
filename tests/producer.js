require('mocha')
const {expect} = require('chai')
const {newUser, generateFioAddress, timeout, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

describe('************************** producer.js ************************** \n    A. Test register as a proxy.', () => {

  let prodA1, userA1, total_voted_fio, total_bp_votes

  it(`Create users`, async () => {
    prodA1 = await newUser(faucet);
    userA1 = await newUser(faucet);
    userA1.address2 = generateFioAddress(userA1.domain, 5)
/*
  #bp1:dapix
  #Private key: 5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R
  #Public key: FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr
  #FIO Public Address (actor name): qbxn5zhw2ypw

  #bp2:dapix
  #Private key: 5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P
  #Public key: FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b
  #FIO Public Address (actor name): hfdg2qumuvlc

  #bp3:dapix
  #Private key: 5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU
  #Public key: FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc
  #FIO Public Address (actor name): wttywsmdmfew
*/
  })

  it(`Register userA1 address #2`, async () => {
    const result = await userA1.sdk.genericAction('registerFioAddress', {
      fioAddress: userA1.address2,
      maxFee: config.api.register_fio_address.fee,
      walletFioAddress: ''
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`Register prodA1 as producer`, async () => {
    try {
      const result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          actor: prodA1.account,
          max_fee: config.api.register_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`userA1 votes for prodA1 using address #1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: userA1.address,
          actor: userA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`userA1 votes for prodA1 using address #2`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            prodA1.address
          ],
          fio_address: userA1.address2,
          actor: userA1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Unregister prodA1 as producer`, async () => {
    try {
      const result = await prodA1.sdk.genericAction('pushTransaction', {
        action: 'unregprod',
        account: 'eosio',
        data: {
          fio_address: prodA1.address,
          fio_pub_key: prodA1.publicKey,
          max_fee: config.api.unregister_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

})
