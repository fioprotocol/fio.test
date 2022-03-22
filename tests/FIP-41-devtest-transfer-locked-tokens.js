require('mocha')
const {expect} = require('chai')
const {newUser, getProdVoteTotal, fetchJson, generateFioDomain, callFioApi,  generateFioAddress, createKeypair, getTestType, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const testType = getTestType();


/*
NOTE
NOTE
NOTE
NOTE  -- these tests have some timing issues that crop up from run to run
NOTE  -- if you start test near a second boundary its possible that the duration merges
NOTE  -- can slip a bit from the results expected in these tests...this is NOT
NOTE  -- an issue, run the tests again and verify the test can be run successfully
NOTE  -- IT is advised for QA purposes to design tests that do not suffer this slippage
NOTE  -- or extend the logic in teh results checks to check for values being 1 off
NOTE
NOTE
NOTE
NOTE
*/
before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

let userA1, userA2, userA3, userA4,
    test1, test2, test3, test4, test5, test6,
    keys, keys1, keys2, keys3,keys4, locksdk,
    locksdk1, locksdk2, locksdk3,locksdk4, newFioAddress, newFioDomain, newFioDomain2, newFioAddress2,
    total_bp_votes_before, total_bp_votes_after
const fundsAmount = 500000000000
const maxTestFundsAmount = 5000000000
const halfundsAmount = 220000000000

describe(`************************** locks-transfer-locked-tokens.js ************************** \n    A. Create accounts for tests`, () => {


  it(`Create users`, async () => {
    userA1 = await newUser(faucet);
    userA2 = await newUser(faucet);
    userA3 = await newUser(faucet);
    userA4 = await newUser(faucet);
    test1 = await newUser(faucet);
    test2 = await newUser(faucet);
    test3 = await newUser(faucet);
    test4 = await newUser(faucet);
    test5 = await newUser(faucet);
    test6 = await newUser(faucet);




    keys = await createKeypair();
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
    keys1 = await createKeypair();
    locksdk1 = new FIOSDK(keys1.privateKey, keys1.publicKey, config.BASE_URL, fetchJson);
    keys2 = await createKeypair();
    locksdk2 = new FIOSDK(keys2.privateKey, keys2.publicKey, config.BASE_URL, fetchJson);
    console.log("account for keys2 is ",keys2.account)
    keys3 = await createKeypair();
    locksdk3 = new FIOSDK(keys3.privateKey, keys3.publicKey, config.BASE_URL, fetchJson);
    keys4 = await createKeypair();
    locksdk4 = new FIOSDK(keys4.privateKey, keys4.publicKey, config.BASE_URL, fetchJson);
  })

  /*
  it.skip(`Show account info`, async () => {
    console.log('              userA1.account:', userA1.account)
    console.log('              userA1.publicKey:', userA1.publicKey)
    console.log('              userA1.privateKey:', userA1.privateKey)
    console.log('              userA1.domain:', userA1.domain)
    console.log('              userA1.address:', userA1.address)
    console.log("              locked token holder pub key ",keys.publicKey)
    console.log("              locked token holder account ",keys.account)
    console.log("              locked token holder priv key ",keys.privateKey)
    console.log("              locked token holder votable pub key ",keys1.publicKey)
    console.log("              locked token holder votable account ",keys1.account)
    console.log("              locked token holder votable priv key ",keys1.privateKey)
  })
  */
})

describe(`FIP-41 Development tests`, () => {

  it(`(${testType}) Failure test, Transfer locked tokens,  periods total not equal to amount`, async () => {
    if (testType == 'sdk') {
      try {
        const result = await userA1.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: keys.publicKey,
          canVote: 0,
          periods: [
            {
              duration: 120,
              amount: 220000000000,
            },
            {
              duration: 240,
              amount: 280000000000,
            }
          ],
          amount: 600000000000,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.not.equal('OK')
      } catch (err) {
        //console.log('error: ', err)
        var expected = `Error 400`
        expect(err.message).to.include(expected)
      }
    } else {  
      try {
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: keys.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 120,
                amount: 220000000000,
              },
              {
                duration: 240,
                amount: 280000000000,
              }
            ],
            amount: 600000000000,
            max_fee: 400000000000,
            tpid: '',
            actor: userA1.account,
          }
        })
        expect(result.status).to.not.equal('OK')
      } catch (err) {
        console.log(err)
        var expected = `Error 400`
        expect(err.message).to.include(expected)
      }
    }
  })

  it(`(${testType}) Failure test, Transfer locked tokens, periods are not in ascending order of duration`, async () => {

    if (testType == 'sdk') {
      try {
        const result = await userA1.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: keys.publicKey,
          canVote: 0,
          periods: [
            {
              duration: 240,
              amount: 220000000000,
            },
            {
              duration: 120,
              amount: 280000000000,
            }
          ],
          amount: fundsAmount,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.not.equal('OK')
      } catch (err) {
       // console.log('error: ', err)
        var expected = `Error 400`
        expect(err.message).to.include(expected)
      }
    } else {
      try {
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: keys.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 240,
                amount: 220000000000,
              },
              {
                duration: 120,
                amount: 280000000000,
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
       // console.log(err)
        var expected = `Error 400`
        expect(err.message).to.include(expected)
      }
    }
  })

  it(`(${testType}) Failure test, Transfer locked tokens, duration 0`, async () => {
    if (testType == 'sdk') {
      try {
        const result = await userA1.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: keys.publicKey,
          canVote: 0,
          periods: [
            {
              duration: 0,
              amount: 220000000000,
            },
            {
              duration: 120,
              amount: 280000000000,
            }
          ],
          amount: fundsAmount,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.not.equal('OK')
      } catch (err) {
        //console.log('error: ', err)
        var expected = `Error 400`
        expect(err.message).to.include(expected)
      }
    } else {
      try {
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: keys.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 0,
                amount: 220000000000,
              },
              {
                duration: 120,
                amount: 280000000000,
              }
            ],
            amount: fundsAmount,
            max_fee: 400000000000,
            tpid: '',
            actor: userA1.account
          }

        })
        expect(result.status).to.not.equal('OK')
      } catch (err) {
        var expected = `Error 400`
        expect(err.message).to.include(expected)
      }
    }
  })



  // test 1 same number of periods in follow on grant as in initial grant.
  it(`(${testType}) success test, Transfer locked tokens to a new account. `, async () => {
    if (testType == 'sdk') {
      try {
        const result = await userA1.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test1.publicKey,
          canVote: 0,
          periods: [
            {
              duration: 120,
              amount: 220000000000,
            },
            {
              duration: 240,
              amount: 280000000000,
            }
          ],
          amount: fundsAmount,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.equal('OK')
      } catch (err) {
        //console.log('error: ', err)
        expect(err).to.equal(null)
      }
    } else {
      try {
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: test1.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 120,
                amount: 220000000000,
              },
              {
                duration: 240,
                amount: 280000000000,
              }
            ],
            amount: fundsAmount,
            max_fee: 400000000000,
            tpid: '',
            actor: userA1.account
          }

        })
        expect(result.status).to.equal('OK')
      } catch (err) {
        expect(err).to.equal(null)
      }
    }
  })

  it(`Waiting 10 seconds`, async () => {
    console.log("            waiting 10 seconds ")
  })

  it(`Wait 10 seconds.`, async () => { await timeout(10000) });

  it(`(${testType}) success test, Transfer locked tokens to the account that already exists. `, async () => {
    if (testType == 'sdk') {
      try {
        const result = await userA1.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test1.publicKey,
          canVote: 0,
          periods: [
            {
              duration: 121,
              amount: 220000000000,
            },
            {
              duration: 241,
              amount: 280000000000,
            }
          ],
          amount: fundsAmount,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.equal('OK')
      } catch (err) {
        //console.log('error: ', err)
        expect(err).to.equal(null)
      }
    } else {
      try {
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: test1.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 121,
                amount: 220000000000,
              },
              {
                duration: 241,
                amount: 280000000000,
              }
            ],
            amount: fundsAmount,
            max_fee: 400000000000,
            tpid: '',
            actor: userA1.account
          }

        })
        expect(result.status).to.equal('OK')
      } catch (err) {
        expect(err).to.equal(null)
      }
    }
  })

  it(`Call get_table_rows from locktokens and confirm merged periods`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: test1.account,
        upper_bound: test1.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      result = await callFioApi("get_table_rows", json);
      console.log('Result: ', result);
      //NOTE -- these checks fail sometimes if the timing of the wait adds one sec to the duration,
      //  when this happense please run the test again.
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods[0].duration).to.equal(120);
      expect(result.rows[0].periods[1].duration).to.equal(131);
      expect(result.rows[0].periods[2].duration).to.equal(240);
      expect(result.rows[0].periods[3].duration).to.equal(251);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //test 2 25 each list, merge some amounts, but not all
  it(`(${testType}) success test,  25 lock periods into account`, async () => {
    if (testType == 'sdk') {
      try {
        const result = await userA4.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test2.publicKey,
          canVote: 0,
          periods: [
            {
              duration: 1,
              amount: 1000000000,
            },
            {
              duration: 2,
              amount: 1000000000,
            },
            {
              duration: 3,
              amount: 1000000000,
            },
            {
              duration: 4,
              amount: 1000000000,
            },
            {
              duration: 5,
              amount: 1000000000,
            },
            {
              duration: 6,
              amount: 1000000000,
            },
            {
              duration: 7,
              amount: 1000000000,
            },
            {
              duration: 8,
              amount: 1000000000,
            },
            {
              duration: 9,
              amount: 1000000000,
            },
            {
              duration: 10,
              amount: 1000000000,
            },
            {
              duration: 11,
              amount: 1000000000,
            },
            {
              duration: 12,
              amount: 1000000000,
            },
            {
              duration: 13,
              amount: 1000000000,
            },
            {
              duration: 14,
              amount: 1000000000,
            },
            {
              duration: 15,
              amount: 1000000000,
            },
            {
              duration: 16,
              amount: 1000000000,
            },
            {
              duration: 17,
              amount: 1000000000,
            },
            {
              duration: 18,
              amount: 1000000000,
            },
            {
              duration: 19,
              amount: 1000000000,
            },
            {
              duration: 20,
              amount: 1000000000,
            },
            {
              duration: 21,
              amount: 1000000000,
            },
            {
              duration: 22,
              amount: 1000000000,
            },
            {
              duration: 23,
              amount: 1000000000,
            },
            {
              duration: 24,
              amount: 1000000000,
            },
            {
              duration: 25,
              amount: 1000000000,
            }
          ],
          amount: 25000000000,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.equal('OK')
      } catch (err) {
        //console.log('error: ', err)
        expect(err).to.equal(null)
      }
    } else {
        const result = await userA4.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: test2.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 1,
                amount: 1000000000,
              },
              {
                duration: 2,
                amount: 1000000000,
              },
              {
                duration: 3,
                amount: 1000000000,
              },
              {
                duration: 4,
                amount: 1000000000,
              },
              {
                duration: 5,
                amount: 1000000000,
              },
              {
                duration: 6,
                amount: 1000000000,
              },
              {
                duration: 7,
                amount: 1000000000,
              },
              {
                duration: 8,
                amount: 1000000000,
              },
              {
                duration: 9,
                amount: 1000000000,
              },
              {
                duration: 10,
                amount: 1000000000,
              },
              {
                duration: 11,
                amount: 1000000000,
              },
              {
                duration: 12,
                amount: 1000000000,
              },
              {
                duration: 13,
                amount: 1000000000,
              },
              {
                duration: 14,
                amount: 1000000000,
              },
              {
                duration: 15,
                amount: 1000000000,
              },
              {
                duration: 16,
                amount: 1000000000,
              },
              {
                duration: 17,
                amount: 1000000000,
              },
              {
                duration: 18,
                amount: 1000000000,
              },
              {
                duration: 19,
                amount: 1000000000,
              },
              {
                duration: 20,
                amount: 1000000000,
              },
              {
                duration: 21,
                amount: 1000000000,
              },
              {
                duration: 22,
                amount: 1000000000,
              },
              {
                duration: 23,
                amount: 1000000000,
              },
              {
                duration: 24,
                amount: 1000000000,
              },
              {
                duration: 25,
                amount: 1000000000,
              }
            ],
            amount: 25000000000,
            max_fee: 400000000000,
            tpid: '',
            actor: userA4.account,
          }

        })
        //console.log(result);
        expect(result.status).to.equal('OK')
    }
  })
  it(`Waiting 2 seconds`, async () => {
    console.log("            waiting 10 seconds ")
  })

  it(`Wait 2 seconds.`, async () => { await timeout(2000) });
  it(`(${testType}) success test,  add 25 lock periods into existing account with 25 locking periods`, async () => {
    if (testType == 'sdk') {
      try {
        const result = await userA4.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test2.publicKey,
          canVote: 0,
          periods: [
            {
              duration: 1,
              amount: 1000000000,
            },
            {
              duration: 2,
              amount: 1000000000,
            },
            {
              duration: 3,
              amount: 1000000000,
            },
            {
              duration: 4,
              amount: 1000000000,
            },
            {
              duration: 5,
              amount: 1000000000,
            },
            {
              duration: 6,
              amount: 1000000000,
            },
            {
              duration: 7,
              amount: 1000000000,
            },
            {
              duration: 8,
              amount: 1000000000,
            },
            {
              duration: 9,
              amount: 1000000000,
            },
            {
              duration: 10,
              amount: 1000000000,
            },
            {
              duration: 11,
              amount: 1000000000,
            },
            {
              duration: 12,
              amount: 1000000000,
            },
            {
              duration: 13,
              amount: 1000000000,
            },
            {
              duration: 14,
              amount: 1000000000,
            },
            {
              duration: 15,
              amount: 1000000000,
            },
            {
              duration: 16,
              amount: 1000000000,
            },
            {
              duration: 17,
              amount: 1000000000,
            },
            {
              duration: 18,
              amount: 1000000000,
            },
            {
              duration: 19,
              amount: 1000000000,
            },
            {
              duration: 20,
              amount: 1000000000,
            },
            {
              duration: 21,
              amount: 1000000000,
            },
            {
              duration: 22,
              amount: 1000000000,
            },
            {
              duration: 23,
              amount: 1000000000,
            },
            {
              duration: 24,
              amount: 1000000000,
            },
            {
              duration: 25,
              amount: 1000000000,
            }
          ],
          amount: 25000000000,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('error: ', err)
        expect(err).to.equal(null)
      }
    } else {
      try{
      const result = await userA4.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: test2.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 1,
              amount: 1000000000,
            },
            {
              duration: 2,
              amount: 1000000000,
            },
            {
              duration: 3,
              amount: 1000000000,
            },
            {
              duration: 4,
              amount: 1000000000,
            },
            {
              duration: 5,
              amount: 1000000000,
            },
            {
              duration: 6,
              amount: 1000000000,
            },
            {
              duration: 7,
              amount: 1000000000,
            },
            {
              duration: 8,
              amount: 1000000000,
            },
            {
              duration: 9,
              amount: 1000000000,
            },
            {
              duration: 10,
              amount: 1000000000,
            },
            {
              duration: 11,
              amount: 1000000000,
            },
            {
              duration: 12,
              amount: 1000000000,
            },
            {
              duration: 13,
              amount: 1000000000,
            },
            {
              duration: 14,
              amount: 1000000000,
            },
            {
              duration: 15,
              amount: 1000000000,
            },
            {
              duration: 16,
              amount: 1000000000,
            },
            {
              duration: 17,
              amount: 1000000000,
            },
            {
              duration: 18,
              amount: 1000000000,
            },
            {
              duration: 19,
              amount: 1000000000,
            },
            {
              duration: 20,
              amount: 1000000000,
            },
            {
              duration: 21,
              amount: 1000000000,
            },
            {
              duration: 22,
              amount: 1000000000,
            },
            {
              duration: 23,
              amount: 1000000000,
            },
            {
              duration: 24,
              amount: 1000000000,
            },
            {
              duration: 26,
              amount: 1000000000,
            }
          ],
          amount: 25000000000,
          max_fee: 400000000000,
          tpid: '',
          actor: userA4.account,
        }

      })
      console.log(result);
      expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('error: ', err)
        expect(err).to.equal(null)
      }
    }
  })
  it(`Call get_table_rows from locktokens and confirm: merge is correct`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: test2.account,
        upper_bound: test2.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      result = await callFioApi("get_table_rows", json);
      console.log('Result: ', result);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods.length).to.equal(27);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


  //test 3 25 each list merge ALL amounts.
  it(`(${testType}) success test,  25 lock periods into account`, async () => {
    if (testType == 'sdk') {
      try {
        const result = await userA4.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test3.publicKey,
          canVote: 0,
          periods: [
            {
              duration: 3,
              amount: 1000000000,
            },
            {
              duration: 4,
              amount: 1000000000,
            },
            {
              duration: 5,
              amount: 1000000000,
            },
            {
              duration: 6,
              amount: 1000000000,
            },
            {
              duration: 7,
              amount: 1000000000,
            },
            {
              duration: 8,
              amount: 1000000000,
            },
            {
              duration: 9,
              amount: 1000000000,
            },
            {
              duration: 10,
              amount: 1000000000,
            },
            {
              duration: 11,
              amount: 1000000000,
            },
            {
              duration: 12,
              amount: 1000000000,
            },
            {
              duration: 13,
              amount: 1000000000,
            },
            {
              duration: 14,
              amount: 1000000000,
            },
            {
              duration: 15,
              amount: 1000000000,
            },
            {
              duration: 16,
              amount: 1000000000,
            },
            {
              duration: 17,
              amount: 1000000000,
            },
            {
              duration: 18,
              amount: 1000000000,
            },
            {
              duration: 19,
              amount: 1000000000,
            },
            {
              duration: 20,
              amount: 1000000000,
            },
            {
              duration: 21,
              amount: 1000000000,
            },
            {
              duration: 22,
              amount: 1000000000,
            },
            {
              duration: 23,
              amount: 1000000000,
            },
            {
              duration: 24,
              amount: 1000000000,
            },
            {
              duration: 25,
              amount: 1000000000,
            },
            {
              duration: 26,
              amount: 1000000000,
            },
            {
              duration: 27,
              amount: 1000000000,
            }
          ],
          amount: 25000000000,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.equal('OK')
      } catch (err) {
        //console.log('error: ', err)
        expect(err).to.equal(null)
      }
    } else {
      const result = await userA4.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: test3.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 3,
              amount: 1000000000,
            },
            {
              duration: 4,
              amount: 1000000000,
            },
            {
              duration: 5,
              amount: 1000000000,
            },
            {
              duration: 6,
              amount: 1000000000,
            },
            {
              duration: 7,
              amount: 1000000000,
            },
            {
              duration: 8,
              amount: 1000000000,
            },
            {
              duration: 9,
              amount: 1000000000,
            },
            {
              duration: 10,
              amount: 1000000000,
            },
            {
              duration: 11,
              amount: 1000000000,
            },
            {
              duration: 12,
              amount: 1000000000,
            },
            {
              duration: 13,
              amount: 1000000000,
            },
            {
              duration: 14,
              amount: 1000000000,
            },
            {
              duration: 15,
              amount: 1000000000,
            },
            {
              duration: 16,
              amount: 1000000000,
            },
            {
              duration: 17,
              amount: 1000000000,
            },
            {
              duration: 18,
              amount: 1000000000,
            },
            {
              duration: 19,
              amount: 1000000000,
            },
            {
              duration: 20,
              amount: 1000000000,
            },
            {
              duration: 21,
              amount: 1000000000,
            },
            {
              duration: 22,
              amount: 1000000000,
            },
            {
              duration: 23,
              amount: 1000000000,
            },
            {
              duration: 24,
              amount: 1000000000,
            },
            {
              duration: 25,
              amount: 1000000000,
            },
            {
              duration: 26,
              amount: 1000000000,
            },
            {
              duration: 27,
              amount: 1000000000,
            }
          ],
          amount: 25000000000,
          max_fee: 400000000000,
          tpid: '',
          actor: userA4.account,
        }

      })
      //console.log(result);
      expect(result.status).to.equal('OK')
    }
  })
  it(`Waiting 2 seconds`, async () => {
    console.log("            waiting 10 seconds ")
  })

  it(`Wait 2 seconds.`, async () => { await timeout(2000) });
  it(`(${testType}) success test,  add 25 lock periods into existing account with 25 locking periods`, async () => {
    if (testType == 'sdk') {
      try {
        const result = await userA4.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test3.publicKey,
          canVote: 0,
          periods: [
            {
              duration: 1,
              amount: 1000000000,
            },
            {
              duration: 2,
              amount: 1000000000,
            },
            {
              duration: 3,
              amount: 1000000000,
            },
            {
              duration: 4,
              amount: 1000000000,
            },
            {
              duration: 5,
              amount: 1000000000,
            },
            {
              duration: 6,
              amount: 1000000000,
            },
            {
              duration: 7,
              amount: 1000000000,
            },
            {
              duration: 8,
              amount: 1000000000,
            },
            {
              duration: 9,
              amount: 1000000000,
            },
            {
              duration: 10,
              amount: 1000000000,
            },
            {
              duration: 11,
              amount: 1000000000,
            },
            {
              duration: 12,
              amount: 1000000000,
            },
            {
              duration: 13,
              amount: 1000000000,
            },
            {
              duration: 14,
              amount: 1000000000,
            },
            {
              duration: 15,
              amount: 1000000000,
            },
            {
              duration: 16,
              amount: 1000000000,
            },
            {
              duration: 17,
              amount: 1000000000,
            },
            {
              duration: 18,
              amount: 1000000000,
            },
            {
              duration: 19,
              amount: 1000000000,
            },
            {
              duration: 20,
              amount: 1000000000,
            },
            {
              duration: 21,
              amount: 1000000000,
            },
            {
              duration: 22,
              amount: 1000000000,
            },
            {
              duration: 23,
              amount: 1000000000,
            },
            {
              duration: 24,
              amount: 1000000000,
            },
            {
              duration: 25,
              amount: 1000000000,
            }
          ],
          amount: 25000000000,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('error: ', err)
        expect(err).to.equal(null)
      }
    } else {
      try{
        const result = await userA4.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: test3.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 1,
                amount: 1000000000,
              },
              {
                duration: 2,
                amount: 1000000000,
              },
              {
                duration: 3,
                amount: 1000000000,
              },
              {
                duration: 4,
                amount: 1000000000,
              },
              {
                duration: 5,
                amount: 1000000000,
              },
              {
                duration: 6,
                amount: 1000000000,
              },
              {
                duration: 7,
                amount: 1000000000,
              },
              {
                duration: 8,
                amount: 1000000000,
              },
              {
                duration: 9,
                amount: 1000000000,
              },
              {
                duration: 10,
                amount: 1000000000,
              },
              {
                duration: 11,
                amount: 1000000000,
              },
              {
                duration: 12,
                amount: 1000000000,
              },
              {
                duration: 13,
                amount: 1000000000,
              },
              {
                duration: 14,
                amount: 1000000000,
              },
              {
                duration: 15,
                amount: 1000000000,
              },
              {
                duration: 16,
                amount: 1000000000,
              },
              {
                duration: 17,
                amount: 1000000000,
              },
              {
                duration: 18,
                amount: 1000000000,
              },
              {
                duration: 19,
                amount: 1000000000,
              },
              {
                duration: 20,
                amount: 1000000000,
              },
              {
                duration: 21,
                amount: 1000000000,
              },
              {
                duration: 22,
                amount: 1000000000,
              },
              {
                duration: 23,
                amount: 1000000000,
              },
              {
                duration: 24,
                amount: 1000000000,
              },
              {
                duration: 25,
                amount: 1000000000,
              }
            ],
            amount: 25000000000,
            max_fee: 400000000000,
            tpid: '',
            actor: userA4.account,
          }

        })
        console.log(result);
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('error: ', err)
        expect(err).to.equal(null)
      }
    }
  })
  it(`Call get_table_rows from locktokens and confirm: merge is correct`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: test3.account,
        upper_bound: test3.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      result = await callFioApi("get_table_rows", json);
      console.log('Result: ', result);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods.length).to.equal(25);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


  //test 4now wait 40 seconds so the locks are past all the periods.
  it(`Waiting 50 seconds`, async () => {
    console.log("            waiting 50 seconds ")
  })

  it(`Wait 50 seconds.`, async () => { await timeout(50000) });

  //now do one transfer out of this account, look and see
  //locks removed.
  it(`Transfer 10 FIO from the lock account to anywhere`, async () => {
    const result = await test3.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 10,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    console.log('Result: ', result)
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
  })

  //add check of locked tokens to not exist.
  it(`Call get_table_rows from locktokens and confirm: merge is correct`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: test3.account,
        upper_bound: test3.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      result = await callFioApi("get_table_rows", json);
      console.log('Result: ', result);
      expect(result.rows).empty;

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })








  //Test 5 op2 size larger than op1 size
  it(`(${testType}) success test, Transfer locked tokens to an account that already exists. `, async () => {
    if (testType == 'sdk') {
      try {
        const result = await userA1.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test5.publicKey,
          canVote: 0,
          periods: [
            {
              duration: 240,
              amount: 280000000000,
            }
          ],
          amount: 280000000000,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.equal('OK')
      } catch (err) {
        //console.log('error: ', err)
        expect(err).to.equal(null)
      }
    } else {
      try {
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: test5.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 240,
                amount: 280000000000,
              }
            ],
            amount: 280000000000,
            max_fee: 280000000000,
            tpid: '',
            actor: userA1.account
          }

        })
        expect(result.status).to.equal('OK')
      } catch (err) {
        expect(err).to.equal(null)
      }
    }
  })

  it(`Waiting 10 seconds`, async () => {
    console.log("            waiting 10 seconds ")
  })

  it(`Wait 10 seconds.`, async () => { await timeout(10000) });

  it(`(${testType}) success test, Transfer locked tokens to an account that already exists. `, async () => {
    if (testType == 'sdk') {
      try {
        const result = await userA1.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test5.publicKey,
          canVote: 0,
          periods: [
            {
              duration: 121,
              amount: 220000000000,
            },
            {
              duration: 241,
              amount: 280000000000,
            }
          ],
          amount: fundsAmount,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.equal('OK')
      } catch (err) {
        //console.log('error: ', err)
        expect(err).to.equal(null)
      }
    } else {
      try {
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: test5.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 121,
                amount: 220000000000,
              },
              {
                duration: 241,
                amount: 280000000000,
              }
            ],
            amount: fundsAmount,
            max_fee: 400000000000,
            tpid: '',
            actor: userA1.account
          }

        })
        expect(result.status).to.equal('OK')
      } catch (err) {
        expect(err).to.equal(null)
      }
    }
  })

  it(`Call get_table_rows from locktokens and confirm merged periods`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: test5.account,
        upper_bound: test5.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      result = await callFioApi("get_table_rows", json);
      console.log('Result: ', result);
      //NOTE -- these checks fail sometimes if the timing of the wait adds one sec to the duration,
      //  when this happense please run the test again.
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods[0].duration).to.equal(131);
      expect(result.rows[0].periods[1].duration).to.equal(240);
      expect(result.rows[0].periods[2].duration).to.equal(251);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //test 6 op1 larger than op2
  it(`(${testType}) success test, Transfer locked tokens to an account that already exists. `, async () => {
    if (testType == 'sdk') {
      try {
        const result = await userA2.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test6.publicKey,
          canVote: 0,
          periods: [
            {
              duration: 121,
              amount: 220000000000,
            },
            {
              duration: 241,
              amount: 280000000000,
            }
          ],
          amount: fundsAmount,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('error: ', err)
        expect(err).to.equal(null)
      }
    } else {
      try {
        const result = await userA2.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: test6.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 121,
                amount: 220000000000,
              },
              {
                duration: 241,
                amount: 280000000000,
              }
            ],
            amount: fundsAmount,
            max_fee: 400000000000,
            tpid: '',
            actor: userA2.account
          }

        })
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('error: ', err)
        expect(err).to.equal(null)
      }
    }
  })

  it(`Waiting 10 seconds`, async () => {
    console.log("            waiting 10 seconds ")
  })

  it(`Wait 10 seconds.`, async () => { await timeout(10000) });
  it(`(${testType}) success test, Transfer locked tokens to an account that already exists. `, async () => {
    if (testType == 'sdk') {
      try {
        const result = await userA2.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test6.publicKey,
          canVote: 0,
          periods: [
            {
              duration: 240,
              amount: 280000000000,
            }
          ],
          amount: 280000000000,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.equal('OK')
      } catch (err) {
        //console.log('error: ', err)
        expect(err).to.equal(null)
      }
    } else {
      try {
        const result = await userA2.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: test6.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 240,
                amount: 280000000000,
              }
            ],
            amount: 280000000000,
            max_fee: 280000000000,
            tpid: '',
            actor: userA2.account
          }

        })
        expect(result.status).to.equal('OK')
      } catch (err) {
        expect(err).to.equal(null)
      }
    }
  })

  it(`Call get_table_rows from locktokens and confirm merged periods`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: test6.account,
        upper_bound: test6.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      result = await callFioApi("get_table_rows", json);
      console.log('Result: ', result);
      //NOTE -- these checks fail sometimes if the timing of the wait adds one sec to the duration,
      //  when this happense please run the test again.
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods[0].duration).to.equal(121);
      expect(result.rows[0].periods[1].duration).to.equal(241);
      expect(result.rows[0].periods[2].duration).to.equal(250);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })



})

