require('mocha')
const {expect} = require('chai')
const {newUser, getProdVoteTotal, fetchJson, generateFioDomain, callFioApi,  generateFioAddress, createKeypair} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

function wait(ms){
  var start = new Date().getTime();
  var end = start;
  while(end < start + ms) {
    end = new Date().getTime();
  }
}

let userA1, keys, locksdk
const fundsAmount = 50000000000 //50 fio


describe(`************************** locks-transfer-locked-tokens-testnet-smoke-tests.js ************************** \n A. Create accounts for tests`, () => {

//These tests are for test net only...
// The userA1 account used must be funded through the test net faucet.
//the account does NOT need funded by the faucet every time the tests are run, the account
//should have enough FIO to run these tests perhaps 19 times. and the account should be funded
// on test net at this time. if funds are not adequate
//just go to the testnet monitor faucet and fund the pub key FIO7KbD6G6gFuTvv8xiJzKSmkUauq5Gm48uECiPkVDcwJhBY6njfB
// These tests will provide a set of tests on general locks that can be run to show that
  //the locks are functioning without error on test net., it is not meant to be comprehensive, but just
  // a functional smoke check for the test net.
  it(`Create users`, async () => {
   // userA1.account: 3lv2dsu2oavw
   // userA1.publicKey: FIO7KbD6G6gFuTvv8xiJzKSmkUauq5Gm48uECiPkVDcwJhBY6njfB
   // userA1.privateKey: 5KUtrhW1xrHxR5LSdeTjWGVrvN8Zv3Neg8zq9wDWiAvMzUiogeW
    //NOTE -- this userA1 must be funded on test net.
    userA1 = new FIOSDK('5KUtrhW1xrHxR5LSdeTjWGVrvN8Zv3Neg8zq9wDWiAvMzUiogeW',
        'FIO7KbD6G6gFuTvv8xiJzKSmkUauq5Gm48uECiPkVDcwJhBY6njfB',
        config.BASE_URL, fetchJson);

    keys = await createKeypair();
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

  })

  it(`Show account info`, async () => {
    console.log("              locked token holder pub key ",keys.publicKey)
    console.log("              locked token holder account ",keys.account)
    console.log("              locked token holder priv key ",keys.privateKey)
  })
})



describe(`B. Parameter tests`, () => {

  //these tests use userA1 account and key info.


  it(`Failure test, Transfer locked tokens,  periods total percent not 100`, async () => {
    try {

      const result = await userA1.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 120,
              amount: fundsAmount * .503,
            },
            {
              duration: 240,
              amount: fundsAmount * .5,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: userA1.account,
        }
      })
      expect(result.status).to.not.equal('OK')

    } catch (err) {
      var expected = `Error 400`
      console.log('Error: ', err.json.error)
      expect(err.message).to.include(expected)
    }
  })

  it(`Failure test, Transfer locked tokens, period percent larger than 3 decimals`, async () => {
    try {
      const result = await userA1.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 120,
              amount: fundsAmount * .504444,
            },
            {
              duration: 240,
              amount: fundsAmount * .495556,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor:'3lv2dsu2oavw',
        }

      })
      expect(result.status).to.not.equal('OK')

    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`Failure test, Transfer locked tokens, periods are not in ascending order of duration`, async () => {
    try {
      const result = await userA1.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 240,
              amount: fundsAmount * .504444,
            },
            {
              duration: 120,
              amount: fundsAmount * .495556,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: '3lv2dsu2oavw',
        }

      })
      expect(result.status).to.not.equal('OK')

    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`Failure test, Transfer locked tokens, duration 0`, async () => {
    try {
      const result = await userA1.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 0,
              amount: fundsAmount * .5,
            },
            {
              duration: 240,
              amount: fundsAmount * .5,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: '3lv2dsu2oavw'
        }

      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`Failute test, Transfer locked tokens, pub key account pre exists`, async () => {
    try {
      const result = await userA1.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: userA1.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 0,
              amount: fundsAmount * .5,
            },
            {
              duration: 240,
              amount: fundsAmount * .5,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: '3lv2dsu2oavw'
        }

      })
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`Failute test, Too many lock periods`, async () => {
    try {
      const result = await userA1.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 1,
              amount: fundsAmount * .273,
            },
            {
              duration: 2,
              amount: fundsAmount * .273,
            },
            {
              duration: 3,
              amount: fundsAmount * .273,
            },
            {
              duration: 4,
              amount: fundsAmount * .273,
            },
            {
              duration: 5,
              amount: fundsAmount * .273,
            },
            {
              duration: 6,
              amount: fundsAmount * .273,
            },
            {
              duration: 7,
              amount: fundsAmount * .273,
            },
            {
              duration: 8,
              amount: fundsAmount * .273,
            },
            {
              duration: 9,
              amount: fundsAmount * .273,
            },
            {
              duration: 10,
              amount: fundsAmount * .273,
            },
            {
              duration: 11,
              amount: fundsAmount * .273,
            },
            {
              duration: 12,
              amount: fundsAmount * .273,
            },
            {
              duration: 13,
              amount: fundsAmount * .273,
            },
            {
              duration: 14,
              amount: fundsAmount * .273,
            },
            {
              duration: 15,
              amount: fundsAmount * .273,
            },
            {
              duration: 16,
              amount: fundsAmount * .273,
            },
            {
              duration: 17,
              amount: fundsAmount * .273,
            },
            {
              duration: 18,
              amount: fundsAmount * .273,
            },
            {
              duration: 19,
              amount: fundsAmount * .273,
            },
            {
              duration: 20,
              amount: fundsAmount * .273,
            },
            {
              duration: 21,
              amount: fundsAmount * .273,
            },
            {
              duration: 22,
              amount: fundsAmount * .273,
            },
            {
              duration: 23,
              amount: fundsAmount * .273,
            },
            {
              duration: 24,
              amount: fundsAmount * .273,
            },
            {
              duration: 25,
              amount: fundsAmount * .273,
            },
            {
              duration: 26,
              amount: fundsAmount * .273,
            },
            {
              duration: 27,
              amount: fundsAmount * .273,
            },
            {
              duration: 28,
              amount: fundsAmount * .273,
            },
            {
              duration: 29,
              amount: fundsAmount * .273,
            },
            {
              duration: 30,
              amount: fundsAmount * .273,
            },
            {
              duration: 31,
              amount: fundsAmount * .273,
            },
            {
              duration: 32,
              amount: fundsAmount * .273,
            },
            {
              duration: 33,
              amount: fundsAmount * .273,
            },
            {
              duration: 34,
              amount: fundsAmount * .273,
            },
            {
              duration: 35,
              amount: fundsAmount * .273,
            },
            {
              duration: 36,
              amount: fundsAmount * .273,
            },
            {
              duration: 37,
              amount: fundsAmount * .273,
            },
            {
              duration: 38,
              amount: fundsAmount * .273,
            },
            {
              duration: 39,
              amount: fundsAmount * .273,
            },
            {
              duration: 40,
              amount: fundsAmount * .273,
            },
            {
              duration: 41,
              amount: fundsAmount * .273,
            },
            {
              duration: 42,
              amount: fundsAmount * .273,
            },
            {
              duration: 43,
              amount: fundsAmount * .273,
            },
            {
              duration: 44,
              amount: fundsAmount * .273,
            },
            {
              duration: 45,
              amount: fundsAmount * .273,
            },
            {
              duration: 46,
              amount: fundsAmount * .273,
            },
            {
              duration: 47,
              amount: fundsAmount * .273,
            },
            {
              duration: 48,
              amount: fundsAmount * .273,
            },
            {
              duration: 49,
              amount: fundsAmount * .273,
            },
            {
              duration: 50,
              amount: fundsAmount * .273,
            },
            {
              duration: 51,
              amount: fundsAmount * .8635,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: '3lv2dsu2oavw',
        }

      })
      expect(result.status).to.not.equal('OK')

    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

})

describe(`B. transfer with 2 unlock periods, canvote = false`, () => {

  let rambefore, ramafter, balancebefore, balanceafter, feetransferlocked

  it(`get account ram before `, async () => {
    try {
      const result = await userA1.genericAction('getAccount', {account:'3lv2dsu2oavw'})
      expect(result.ram_quota).to.be.a('number')
      rambefore = result.ram_quota
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`getFioBalance before `, async () => {
    const result = await userA1.genericAction('getFioBalance', {})

    expect(result).to.have.all.keys('balance')
    balancebefore = result.balance;
  })

  it(`SUCCESS transferLockedTokens ${fundsAmount}, canvote false, (20,40 seconds) and (40,60%)`, async () => {
    try {
      const result = await userA1.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 20,
              amount: fundsAmount * .4,
            },
            {
              duration: 40,
              amount: fundsAmount * .6,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: '3lv2dsu2oavw',
        }

      })
      expect(result.status).to.equal('OK')
      expect(result).to.have.all.keys( 'status', 'fee_collected')
    } catch (err) {
      console.log(' Error', err)
    }
  })

  it(`getFioBalance after, verify Fee transfer_locked_tokens was collected`, async () => {
    const result = await userA1.genericAction('getFioBalance', {})

    expect(result).to.have.all.keys('balance')
    balanceafter = result.balance;
    const result1 = await userA1.genericAction('getFee', {
      endPoint: 'transfer_locked_tokens',
      fioAddress: ''
    })

    let diff1 = balancebefore - balanceafter - fundsAmount
    //console.log('Returned fee: ', result)
    expect(diff1).to.equal(result1.fee)

  })

  it(`verify get balance results for locked funds`, async () => {
    const result = await locksdk.genericAction('getFioBalance', {})

    expect(result).to.have.all.keys('balance')
    expect(result.balance).to.be.a('number')
    expect(result.balance).to.equal(50000000000)

  })

  //try to transfer whole amount, fail.
  it(`FAIL Transfer ${fundsAmount} from locked token account, no funds unlocked`, async () => {
    try{
      const result = await locksdk.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: fundsAmount,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`get account ram after, verify RAM bump `, async () => {
    try {
      const result = await userA1.genericAction('getAccount', {account:'3lv2dsu2oavw'})
      expect(result.ram_quota).to.be.a('number')
      ramafter = result.ram_quota
      let diffram = ramafter-rambefore
      expect(diffram).to.equal(1152)
  } catch (err) {
    console.log('Error', err)
  }
  })

  it(`Transfer 1000000000000 FIO into locked funds account`, async () => {
    try {
      const result = await userA1.genericAction('transferTokens', {
        payeeFioPublicKey: keys.publicKey,
        amount: 10000000000,
        maxFee: 400000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })

})
