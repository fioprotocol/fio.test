require('mocha')
const {expect} = require('chai')
const {newUser, getProdVoteTotal, fetchJson, generateFioDomain, callFioApi,  generateFioAddress, createKeypair, getTestType} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');
const testType = getTestType();

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** locks-transfer-locked-tokens-max-load.js ************************** \n    A. Create 2400 General Locked Token grant accounts`, () => {

  //to perform max tests, run this test to load the system with the desired amount of locks.
  //then run normal regression tests on the general locks

  let userA4, keys, locksdk
  let accounts = [], privkeys = [], pubkeys = []
  let numlocks = 0
  const fundsAmount = 500000000000
  const maxTestFundsAmount = 5000000000
  const halfundsAmount = 220000000000

  it(`Create users`, async () => {

    userA4 = await newUser(faucet);

    keys = await createKeypair();
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

  })

  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
      }
    catch
      (err)
      {
        console.log('Error', err)
      }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the protocol with 80 general grants`, async () => {
    try {


      for (let step = 0; step < 80; step++) {

        try {

          if (step % 100 == 0){
            userA4 = await newUser(faucet);
            console.log("created another granting user")
          }
          keys = await createKeypair();
          accounts.push(keys.account)
          privkeys.push(keys.privateKey)
          pubkeys.push(keys.publicKey)


          const result = await userA4.sdk.genericAction('transferLockedTokens', {
            payeePublicKey: keys.publicKey,
            canVote: false,
            periods: [
              {
                duration: 1,
                amount: 100000000,
              },
              {
                duration: 2,
                amount: 100000000,
              },
              {
                duration: 3,
                amount: 100000000,
              },
              {
                duration: 4,
                amount: 100000000,
              },
              {
                duration: 5,
                amount: 100000000,
              },
              {
                duration: 6,
                amount: 100000000,
              },
              {
                duration: 7,
                amount: 100000000,
              },
              {
                duration: 8,
                amount: 100000000,
              },
              {
                duration: 9,
                amount: 100000000,
              },
              {
                duration: 10,
                amount: 100000000,
              },
              {
                duration: 11,
                amount: 100000000,
              },
              {
                duration: 12,
                amount: 100000000,
              },
              {
                duration: 13,
                amount: 100000000,
              },
              {
                duration: 14,
                amount: 100000000,
              },
              {
                duration: 15,
                amount: 100000000,
              },
              {
                duration: 16,
                amount: 100000000,
              },
              {
                duration: 17,
                amount: 100000000,
              },
              {
                duration: 18,
                amount: 100000000,
              },
              {
                duration: 19,
                amount: 100000000,
              },
              {
                duration: 20,
                amount: 100000000,
              },
              {
                duration: 21,
                amount: 100000000,
              },
              {
                duration: 22,
                amount: 100000000,
              },
              {
                duration: 23,
                amount: 100000000,
              },
              {
                duration: 24,
                amount: 100000000,
              },
              {
                duration: 25,
                amount: 100000000,
              },
              {
                duration: 26,
                amount: 100000000,
              },
              {
                duration: 27,
                amount: 100000000,
              },
              {
                duration: 28,
                amount: 100000000,
              },
              {
                duration: 29,
                amount: 100000000,
              },
              {
                duration: 30,
                amount: 100000000,
              },
              {
                duration: 31,
                amount: 100000000,
              },
              {
                duration: 32,
                amount: 100000000,
              },
              {
                duration: 33,
                amount: 100000000,
              },
              {
                duration: 34,
                amount: 100000000,
              },
              {
                duration: 35,
                amount: 100000000,
              },
              {
                duration: 36,
                amount: 100000000,
              },
              {
                duration: 37,
                amount: 100000000,
              },
              {
                duration: 38,
                amount: 100000000,
              },
              {
                duration: 39,
                amount: 100000000,
              },
              {
                duration: 40,
                amount: 100000000,
              },
              {
                duration: 41,
                amount: 100000000,
              },
              {
                duration: 42,
                amount: 100000000,
              },
              {
                duration: 43,
                amount: 100000000,
              },
              {
                duration: 44,
                amount: 100000000,
              },
              {
                duration: 45,
                amount: 100000000,
              },
              {
                duration: 46,
                amount: 100000000,
              },
              {
                duration: 47,
                amount: 100000000,
              },
              {
                duration: 48,
                amount: 100000000,
              },
              {
                duration: 49,
                amount: 100000000,
              },
              {
                duration: 50,
                amount: 100000000,
              }
            ],
            amount: maxTestFundsAmount,
            maxFee: 400000000000,
            tpid: '',

          })
          expect(result.status).to.equal('OK')
          expect(result).to.have.all.keys('status', 'fee_collected')
          numlocks = numlocks + 1
          console.log(" max test iteration: ", numlocks)
        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })



})




