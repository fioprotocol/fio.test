require('mocha');
const {expect} = require('chai');
const {
  newUser,
  fetchJson,
  callFioApi,
  createKeypair,
  generateFioAddress,
  existingUser,
  getTestType,
  timeout,
  callFioApiSigned,
  getTotalVotedFio,
  getProdVoteTotal,
  getAccountVoteWeight
} = require('../utils.js');
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const testType = getTestType();
let faucet;

/*
NOTE
NOTE    Update 5/6/2022: this should not be an issue anymore, but it might be good to keep in mind for any failing tests
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
});

let userA1, userA2, userA3, userA4, userA5, userA6,
    test1, test2, test3, test4, test5, test6,
    keys, keys1, keys2, keys3,keys4, locksdk,
    locksdk1, locksdk2, locksdk3,locksdk4, newFioAddress, newFioDomain, newFioDomain2, newFioAddress2,
    total_bp_votes_before, total_bp_votes_after;
const fundsAmount = 500000000000;
const maxTestFundsAmount = 5000000000;
const halfundsAmount = 220000000000;

describe(`************************** FIP-41-devtest-transfer-locked-tokens.js ************************** \n    A. FIP-41 Development tests ("test case" #1)`, () => {

  before(async () => {
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
  });

  it(`(${testType}) Failure test, Transfer locked tokens,  periods total not equal to amount`, async () => {
    if (testType === 'sdk') {
      try {
        const result = await userA1.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: keys.publicKey,
          canVote: 1,
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
        let expected = `Error 400`
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
        let expected = `Error 400`;
        expect(err.message).to.include(expected);
      }
    }
  });

  it(`(${testType}) Failure test, Transfer locked tokens, periods are not in ascending order of duration`, async () => {
    if (testType === 'sdk') {
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
        expect(result.status).to.not.equal('OK');
      } catch (err) {
        let expected = `Error 400`;
        expect(err.message).to.include(expected);
      }
    } else {
      try {
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: keys.publicKey,
            can_vote: 1,
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
        expect(result.status).to.not.equal('OK');

      } catch (err) {
        let expected = `Error 400`;
        expect(err.message).to.include(expected);
      }
    }
  });

  it(`(${testType}) Failure test, Transfer locked tokens, duration 0`, async () => {
    if (testType === 'sdk') {
      try {
        const result = await userA1.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: keys.publicKey,
          canVote: 1,
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
        let expected = `Error 400`
        expect(err.message).to.include(expected)
      }
    } else {
      try {
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: keys.publicKey,
            can_vote: 1,
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
        expect(result.status).to.not.equal('OK');
      } catch (err) {
        let expected = `Error 400`
        expect(err.message).to.include(expected);
      }
    }
  });

  // test 1 same number of periods in follow on grant as in initial grant.
  it(`(${testType}) success test, Transfer canvote:1 locked tokens to an existing account. `, async () => {
    if (testType === 'sdk') {
      try {
        const result = await userA1.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test1.publicKey,
          canVote: 1,
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
        });
        expect(result.status).to.equal('OK');
      } catch (err) {
        throw err;
      }
    } else {
      try {
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: test1.publicKey,
            can_vote: 1,
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
        expect(result.status).to.equal('OK');
      } catch (err) {
        throw err;
      }
    }
  });

  it(`Wait 10 seconds.`, async () => { await timeout(10000) });

  it(`(${testType}) success test, Transfer locked tokens to the account that already exists. `, async () => {
    if (testType === 'sdk') {
      try {
        const result = await userA1.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test1.publicKey,
          canVote: 1,
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

        });
        expect(result.status).to.equal('OK');
      } catch (err) {
        throw err;
      }
    } else {
      try {
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: test1.publicKey,
            can_vote: 1,
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
        expect(result.status).to.equal('OK');
      } catch (err) {
        throw err;
      }
    }
  });

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
      const result = await callFioApi("get_table_rows", json);
      //NOTE -- these checks fail sometimes if the timing of the wait adds one sec to the duration,
      //  when this happense please run the test again.
      //console.log('Result: ', result);
      expect(result.rows[0].can_vote).to.equal(1);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods[0].duration).to.be.greaterThanOrEqual(120).and.lessThanOrEqual(129);
      expect(result.rows[0].periods[1].duration).to.be.greaterThanOrEqual(130).and.lessThanOrEqual(139);
      expect(result.rows[0].periods[2].duration).to.be.greaterThanOrEqual(240).and.lessThanOrEqual(249);
      expect(result.rows[0].periods[3].duration).to.be.greaterThanOrEqual(250).and.lessThanOrEqual(259);
    } catch (err) {
      throw err;
    }
  });

  //test 2 25 each list, merge some amounts, but not all
  it(`(${testType}) success test,  25 lock periods into account`, async () => {
    if (testType === 'sdk') {
      try {
        const result = await userA4.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test2.publicKey,
          canVote: 1,
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
        expect(result.status).to.equal('OK');
      } catch (err) {
        throw err;
      }
    } else {
      const result = await userA4.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: test2.publicKey,
          can_vote: 1,
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
      });
      expect(result.status).to.equal('OK');
    }
  });

  it(`Wait 2 seconds.`, async () => { await timeout(2000) });

  it(`(${testType}) success test,  add 25 lock periods into existing account with 25 locking periods`, async () => {
    if (testType === 'sdk') {
      try {
        const result = await userA4.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test2.publicKey,
          canVote: 1,
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
        });
        expect(result.status).to.equal('OK');
      } catch (err) {
        throw err;
      }
    } else {
      try{
        const result = await userA4.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: test2.publicKey,
            can_vote: 1,
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
        });
        expect(result.status).to.equal('OK');
      } catch (err) {
        throw err;
      }
    }
  });
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
      const result = await callFioApi("get_table_rows", json);
      expect(result.rows[0].can_vote).to.equal(1);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods.length).to.be.greaterThanOrEqual(25).and.lessThanOrEqual(35);
    } catch (err) {
      throw err;
    }
  });

  //test 3 25 each list merge ALL amounts.
  it(`(${testType}) success test,  25 lock periods into account`, async () => {
    if (testType === 'sdk') {
      try {
        const result = await userA4.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test3.publicKey,
          canVote: 1,
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
        });
        expect(result.status).to.equal('OK');
      } catch (err) {
        throw err;
      }
    } else {
      const result = await userA4.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: test3.publicKey,
          can_vote: 1,
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
      });
      expect(result.status).to.equal('OK');
    }
  });

  it(`Wait 2 seconds.`, async () => { await timeout(2000) });

  it(`(${testType}) success test,  add 25 lock periods into existing account with 25 locking periods`, async () => {
    if (testType === 'sdk') {
      try {
        const result = await userA4.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test3.publicKey,
          canVote: 1,
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
        });
        expect(result.status).to.equal('OK');
      } catch (err) {
        throw err;
      }
    } else {
      try{
        const result = await userA4.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: test3.publicKey,
            can_vote: 1,
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
        });
        expect(result.status).to.equal('OK');
      } catch (err) {
        throw err;
      }
    }
  });

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
      const result = await callFioApi("get_table_rows", json);
      expect(result.rows[0].can_vote).to.equal(1);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods.length).to.be.greaterThanOrEqual(25).and.lessThanOrEqual(30);
    } catch (err) {
      throw err;
    }
  });

  //test 4now wait 40 seconds so the locks are past all the periods.
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
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
  });

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
      const result = await callFioApi("get_table_rows", json);
      expect(result.rows).empty;
    } catch (err) {
      throw err;
    }
  });

  //Test 5 op2 size larger than op1 size
  it(`(${testType}) success test, Transfer locked tokens to an account that already exists. `, async () => {
    if (testType === 'sdk') {
      try {
        const result = await userA1.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test5.publicKey,
          canVote: 1,
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
        expect(result.status).to.equal('OK');
      } catch (err) {
        throw err;
      }
    } else {
      try {
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: test5.publicKey,
            can_vote: 1,
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
        expect(result.status).to.equal('OK');
      } catch (err) {
        throw err;
      }
    }
  });

  it(`Wait 10 seconds.`, async () => { await timeout(10000) });

  it(`(${testType}) success test, Transfer locked tokens to an account that already exists. `, async () => {
    if (testType === 'sdk') {
      try {
        const result = await userA1.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test5.publicKey,
          canVote: 1,
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
        expect(result.status).to.equal('OK');
      } catch (err) {
        throw err;
      }
    } else {
      try {
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: test5.publicKey,
            can_vote: 1,
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
        expect(result.status).to.equal('OK');
      } catch (err) {
        throw err;
      }
    }
  });

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
      const result = await callFioApi("get_table_rows", json);
      //NOTE -- these checks fail sometimes if the timing of the wait adds one sec to the duration,
      //  when this happense please run the test again.
      expect(result.rows[0].periods.length).to.equal(3);
      expect(result.rows[0].can_vote).to.equal(1);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods[0].duration).to.be.greaterThanOrEqual(130).and.lessThanOrEqual(139);
      expect(result.rows[0].periods[1].duration).to.be.greaterThanOrEqual(240).and.lessThanOrEqual(249);
      expect(result.rows[0].periods[2].duration).to.be.greaterThanOrEqual(250).and.lessThanOrEqual(259);
    } catch (err) {
      throw err;
    }
  });

  //test 6 op1 larger than op2
  it(`(${testType}) success test, Transfer locked tokens to an account that already exists. `, async () => {
    if (testType === 'sdk') {
      try {
        const result = await userA2.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test6.publicKey,
          canVote: 1,
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
        expect(result.status).to.equal('OK');
      } catch (err) {
        throw err;
      }
    } else {
      try {
        const result = await userA2.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: test6.publicKey,
            can_vote: 1,
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
        expect(result.status).to.equal('OK');
      } catch (err) {
        throw err;
      }
    }
  });

  it(`Wait 10 seconds.`, async () => { await timeout(10000) });

  it(`(${testType}) success test, Transfer locked tokens to an account that already exists. `, async () => {
    if (testType === 'sdk') {
      try {
        const result = await userA2.sdk.genericAction('transferLockedTokens', {
          payeePublicKey: test6.publicKey,
          canVote: 1,
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
        expect(result.status).to.equal('OK');
      } catch (err) {
        expect(err).to.equal(null);
      }
    } else {
      try {
        const result = await userA2.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: test6.publicKey,
            can_vote: 1,
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

        });
        expect(result.status).to.equal('OK');
      } catch (err) {
        expect(err).to.equal(null);
      }
    }
  });

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
      const result = await callFioApi("get_table_rows", json);
      //NOTE -- these checks fail sometimes if the timing of the wait adds one sec to the duration,
      //  when this happense please run the test again.
      expect(result.rows[0].periods.length).to.equal(3);
      expect(result.rows[0].can_vote).to.equal(1);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods[0].duration).to.be.greaterThanOrEqual(120).and.lessThanOrEqual(129);
      expect(result.rows[0].periods[1].duration).to.be.greaterThanOrEqual(240).and.lessThanOrEqual(249);
      expect(result.rows[0].periods[2].duration).to.be.greaterThanOrEqual(250).and.lessThanOrEqual(259);
    } catch (err) {
      throw err;
    }
  });
});

describe(`B. FIP-41 tests without using the SDK (just the API via callFioApiSigned)`, function () {

  before(async () => {
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
  });

  it(`(non-SDK) Failure test, Transfer locked tokens, periods total not equal to amount`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA1.account,
        privKey: userA1.privateKey,
        data: {
          payee_public_key: keys.publicKey,
          can_vote: 1,
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
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('unlock_periods');
      expect(result.fields[0].value).to.equal('Invalid unlock periods');
      expect(result.fields[0].error).to.equal('Invalid total amount for unlock periods');
    } catch (err) {
      throw err;
    }
  });

  it(`(non-SDK) Failure test, Transfer locked tokens, periods are not in ascending order of duration`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA1.account,
        privKey: userA1.privateKey,
        data: {
          payee_public_key: keys.publicKey,
          can_vote: 1,
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
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('unlock_periods');
      expect(result.fields[0].value).to.equal('Invalid unlock periods');
      expect(result.fields[0].error).to.equal('Invalid duration value in unlock periods, must be sorted');
    } catch (err) {
      throw err;
    }
  });

  it(`(non-SDK) Failure test, Transfer locked tokens, duration 0`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA1.account,
        privKey: userA1.privateKey,
        data: {
          payee_public_key: keys.publicKey,
          can_vote: 1,
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
          actor: userA1.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('unlock_periods');
      expect(result.fields[0].value).to.equal('Invalid unlock periods');
      expect(result.fields[0].error).to.equal('Invalid duration value in unlock periods');
    } catch (err) {
      throw err;
    }
  });

  // test 1 same number of periods in follow on grant as in initial grant.
  it(`(non-SDK) success test, Transfer locked tokens to a new account. `, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA1.account,
        privKey: userA1.privateKey,
        data: {
          payee_public_key: test1.publicKey,
          can_vote: 1,
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
          actor: userA1.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK","fee_collected":${config.api.transfer_tokens_pub_key.fee}}`);
    } catch (err) {
      throw err;
    }
  });

  it(`Wait 10 seconds.`, async () => { await timeout(10000) });

  it(`(non-SDK) success test, Transfer locked tokens to the account that already exists. `, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA1.account,
        privKey: userA1.privateKey,
        data: {
          payee_public_key: test1.publicKey,
          can_vote: 1,
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
          actor: userA1.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK","fee_collected":${config.api.transfer_tokens_pub_key.fee}}`);
    } catch (err) {
      throw err;
    }
  });

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
      const result = await callFioApi("get_table_rows", json);
      //NOTE -- these checks fail sometimes if the timing of the wait adds one sec to the duration,
      //  when this happense please run the test again.
      expect(result.rows[0].periods.length).to.equal(4);
      expect(result.rows[0].can_vote).to.equal(1);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods[0].duration).to.be.greaterThanOrEqual(120).and.lessThanOrEqual(129);
      expect(result.rows[0].periods[1].duration).to.be.greaterThanOrEqual(130).and.lessThanOrEqual(139);
      expect(result.rows[0].periods[2].duration).to.be.greaterThanOrEqual(240).and.lessThanOrEqual(249);
      expect(result.rows[0].periods[3].duration).to.be.greaterThanOrEqual(250).and.lessThanOrEqual(259);
    } catch (err) {
      throw err;
    }
  });

  //test 2 25 each list, merge some amounts, but not all
  it(`(non-SDK) success test,  25 lock periods into account`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA4.account,
        privKey: userA4.privateKey,
        data: {
          payee_public_key: test2.publicKey,
          can_vote: 1,
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
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK","fee_collected":${config.api.transfer_tokens_pub_key.fee}}`);
    } catch (err) {
      throw err;
    }
  });

  it(`Wait 2 seconds.`, async () => { await timeout(2000) });

  it(`(non-SDK) success test,  add 25 lock periods into existing account with 25 locking periods`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA4.account,
        privKey: userA4.privateKey,
        data: {
          payee_public_key: test2.publicKey,
          can_vote: 1,
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
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK","fee_collected":${config.api.transfer_tokens_pub_key.fee}}`);
    } catch (err) {
      throw err;
    }
  });

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
      const result = await callFioApi("get_table_rows", json);
      expect(result.rows[0].can_vote).to.equal(1);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods.length).to.be.greaterThanOrEqual(27).and.lessThanOrEqual(37);
    } catch (err) {
      throw err;
    }
  });

  //test 3 25 each list merge ALL amounts.
  it(`(non-SDK) success test,  25 lock periods into account`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA4.account,
        privKey: userA4.privateKey,
        data: {
          payee_public_key: test3.publicKey,
          can_vote: 1,
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
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK","fee_collected":${config.api.transfer_tokens_pub_key.fee}}`);
    } catch (err) {
      throw err;
    }
  });

  it(`Wait 2 seconds.`, async () => { await timeout(2000) });

  it(`(non-SDK) success test,  add 25 lock periods into existing account with 25 locking periods`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA4.account,
        privKey: userA4.privateKey,
        data: {
          payee_public_key: test3.publicKey,
          can_vote: 1,
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
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK","fee_collected":${config.api.transfer_tokens_pub_key.fee}}`);
    } catch (err) {
      throw err;
    }
  });

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
      const result = await callFioApi("get_table_rows", json);
      expect(result.rows[0].can_vote).to.equal(1);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods.length).to.be.greaterThanOrEqual(25).and.lessThanOrEqual(35);
    } catch (err) {
      throw err;
    }
  });

  //test 4now wait 40 seconds so the locks are past all the periods.
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
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
  });

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
      const result = await callFioApi("get_table_rows", json);
      expect(result.rows).empty;
    } catch (err) {
      throw err;
    }
  });

  //Test 5 op2 size larger than op1 size
  it(`(non-SDK) success test, Transfer locked tokens to an account that already exists. `, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA4.account,
        privKey: userA4.privateKey,
        data: {
          payee_public_key: test3.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 240,
              amount: 280000000000,
            }
          ],
          amount: 280000000000,
          max_fee: 400000000000,
          tpid: '',
          actor: userA4.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK","fee_collected":${config.api.transfer_tokens_pub_key.fee}}`);
    } catch (err) {
      throw err;
    }
  });

  it(`Wait 10 seconds.`, async () => { await timeout(10000) });

  it(`(non-SDK) success test, Transfer locked tokens to an account that already exists. `, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA1.account,
        privKey: userA1.privateKey,
        data: {
          payee_public_key: test5.publicKey,
          can_vote: 1,
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
          actor: userA1.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK","fee_collected":${config.api.transfer_tokens_pub_key.fee}}`);
    } catch (err) {
      throw err;
    }
  });

  it(`Call get_table_rows from locktokens and confirm 2 periods`, async () => {
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
      const result = await callFioApi("get_table_rows", json);
      //NOTE -- these checks fail sometimes if the timing of the wait adds one sec to the duration,
      //  when this happense please run the test again.
      expect(result.rows[0].periods.length).to.equal(2);
      expect(result.rows[0].can_vote).to.equal(1);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      // expect(result.rows[0].periods[0].duration).to.be.greaterThanOrEqual(130).and.lessThanOrEqual(139);
      // expect(result.rows[0].periods[1].duration).to.be.greaterThanOrEqual(240).and.lessThanOrEqual(249);
      // expect(result.rows[0].periods[2].duration).to.be.greaterThanOrEqual(250).and.lessThanOrEqual(259);
      expect(result.rows[0].periods[0].duration).to.be.greaterThanOrEqual(120).and.lessThanOrEqual(129);
      expect(result.rows[0].periods[1].duration).to.be.greaterThanOrEqual(240).and.lessThanOrEqual(249);
      // expect(result.rows[0].periods[2].duration).to.be.greaterThanOrEqual(250).and.lessThanOrEqual(259);
    } catch (err) {
      throw err;
    }
  });

  //test 6 op1 larger than op2
  it(`(non-SDK) success test, Transfer locked tokens to an account that already exists. `, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA2.account,
        privKey: userA2.privateKey,
        data: {
          payee_public_key: test6.publicKey,
          can_vote: 1,
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
          actor: userA2.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK","fee_collected":${config.api.transfer_tokens_pub_key.fee}}`);
    } catch (err) {
      throw err;
    }
  });

  it(`Wait 10 seconds.`, async () => { await timeout(10000) });

  it(`(non-SDK) success test, Transfer locked tokens to an account that already exists. `, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA2.account,
        privKey: userA2.privateKey,
        data: {
          payee_public_key: test6.publicKey,
          can_vote: 1,
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
          actor: userA2.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK","fee_collected":${config.api.transfer_tokens_pub_key.fee}}`);
    } catch (err) {
      throw err;
    }
  });

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
      const result = await callFioApi("get_table_rows", json);
      //NOTE -- these checks fail sometimes if the timing of the wait adds one sec to the duration,
      //  when this happense please run the test again.
      expect(result.rows[0].periods.length).to.equal(4);
      expect(result.rows[0].can_vote).to.equal(1);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods[0].duration).to.be.greaterThanOrEqual(120).and.lessThanOrEqual(129);
      expect(result.rows[0].periods[1].duration).to.be.greaterThanOrEqual(130).and.lessThanOrEqual(139);
      expect(result.rows[0].periods[2].duration).to.be.greaterThanOrEqual(240).and.lessThanOrEqual(249);
      expect(result.rows[0].periods[3].duration).to.be.greaterThanOrEqual(250).and.lessThanOrEqual(259);
    } catch (err) {
      throw err;
    }
  });
});

describe(`C. Try to transfer more locked tokens than available`, function () {

  before(async () => {
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
  });

  let preTransferA1Bal, postTransferA1Bal;
  it(`get userA1 balance`, async () => {
    preTransferA1Bal = await userA1.sdk.genericAction('getFioBalance', {});
  });

  it(`success test, Transfer locked tokens to a new account. `, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA1.account,
        privKey: userA1.privateKey,
        data: {
          payee_public_key: test1.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 5,
              amount: 220000000000,
            },
            {
              duration: 40,
              amount: 280000000000,
            },
            {
              duration: 250,
              amount: 100000000000
            }
          ],
          amount: fundsAmount + 100000000000,
          max_fee: 400000000000,
          tpid: '',
          actor: userA1.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK","fee_collected":${config.api.transfer_tokens_pub_key.fee}}`);
    } catch (err) {
      throw err;
    }
  });
  it(`get userA1 balance`, async () => {
    postTransferA1Bal = await userA1.sdk.genericAction('getFioBalance', {});
  });

  it(`Wait 10 seconds.`, async () => { await timeout(10000) });

  let preTransferA4Bal, postTransferA4Bal;

  it(`get userA4 balance`, async () => {
    preTransferA4Bal = await userA4.sdk.genericAction('getFioBalance', {});
  });

  let preTransferTest1Bal, postTransferTest1Bal;

  it(`get test1 balance`, async () => {
    preTransferTest1Bal = await test1.sdk.genericAction('getFioBalance', {});
  });

  it(`call get_table_rows from locktokens and confirm 3 periods`, async () => {
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
      const result = await callFioApi("get_table_rows", json);
      //NOTE -- these checks fail sometimes if the timing of the wait adds one sec to the duration,
      //  when this happense please run the test again.
      expect(result.rows[0].periods.length).to.equal(3);
      expect(result.rows[0].can_vote).to.equal(1);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods[0].duration).to.be.greaterThanOrEqual(5).and.lessThanOrEqual(10);
      expect(result.rows[0].periods[1].duration).to.be.greaterThanOrEqual(40).and.lessThanOrEqual(49);
      expect(result.rows[0].periods[2].duration).to.be.greaterThanOrEqual(250).and.lessThanOrEqual(259);
    } catch (err) {
      throw err;
    }
  });

  //now do one transfer out of this account, look and see
  //locks removed.
  it(`Transfer 10 FIO from the lock account to anywhere`, async () => {
    const result = await test1.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA4.publicKey,
      amount: 10,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected');
  });

  it(`get userA4 balance`, async () => {
    postTransferA4Bal = await userA4.sdk.genericAction('getFioBalance', {});
    expect(postTransferA4Bal.balance).to.equal(preTransferA4Bal.balance + 10);
    expect(postTransferA4Bal.available).to.equal(preTransferA4Bal.available + 10);
  });

  it(`get test1 balance`, async () => {
    postTransferTest1Bal = await test1.sdk.genericAction('getFioBalance', {});
    expect(postTransferTest1Bal.balance).to.equal(preTransferTest1Bal.balance - (10 + config.api.transfer_tokens_pub_key.fee));
    expect(postTransferTest1Bal.available).to.equal(preTransferTest1Bal.available - (10 + config.api.transfer_tokens_pub_key.fee));
  });

  //add check of locked tokens to not exist.
  it(`Call get_table_rows from userA1 and confirm: merge is correct`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: userA1.account,
        upper_bound: userA1.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      const result = await callFioApi("get_table_rows", json);
      expect(result.rows).empty;
    } catch (err) {
      throw err;
    }
  });

  it(`Call get_table_rows from userA4 and confirm: merge is correct`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: userA4.account,
        upper_bound: userA4.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      const result = await callFioApi("get_table_rows", json);
      expect(result.rows).empty;
    } catch (err) {
      throw err;
    }
  });

  it(`Call get_table_rows from test1 and confirm: merge is correct`, async () => {
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
      const result = await callFioApi("get_table_rows", json);
      expect(result.rows[0].periods.length).to.equal(3);
      expect(result.rows[0].can_vote).to.equal(1);
      expect(result.rows[0].lock_amount).to.equal(600000000000);
      expect(result.rows[0].remaining_lock_amount).to.equal(380000000000);
      expect(result.rows[0].periods[0].duration).to.be.greaterThanOrEqual(5).and.lessThanOrEqual(15);
      expect(result.rows[0].periods[1].duration).to.be.greaterThanOrEqual(40).and.lessThanOrEqual(50);
      expect(result.rows[0].periods[2].duration).to.be.greaterThanOrEqual(250).and.lessThanOrEqual(260);
    } catch (err) {
      throw err;
    }
  });

  // now try to transfer more locked tokens than available (may need trnsloctoks instead)
  it(`success test, Transfer more locked tokens than available to userA4. `, async () => {
    let fee = 400000000000;
    let transferAmt = postTransferTest1Bal.available; //.balance;
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: test1.account,
        privKey: test1.privateKey,
        data: {
          payee_public_key: userA4.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 250,
              amount: transferAmt
            }
          ],
          amount: transferAmt,
          max_fee: fee,
          tpid: '',
          actor: test1.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('actor');
      expect(result.fields[0].error).to.equal('Funds locked');
    } catch (err) {
      throw err;
    }
  });

  it(`validate ending balances`, async () => {
    const userA4Bal = await userA4.sdk.genericAction('getFioBalance', {});
    const test1Bal = await test1.sdk.genericAction('getFioBalance', {});
    expect(postTransferA4Bal.available).to.equal(userA4Bal.available);
    expect(postTransferA4Bal.balance).to.equal(userA4Bal.balance);
    expect(postTransferTest1Bal.available).to.equal(test1Bal.available);
    expect(postTransferTest1Bal.balance).to.equal(test1Bal.balance);
  });
});

describe(`D. Attempt a transfer of zero locked tokens`, function () {

  before(async () => {
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
  });

  let preTransferTest1Bal, postTransferTest1Bal;

  it(`get test1 balance`, async () => {
    preTransferTest1Bal = await test1.sdk.genericAction('getFioBalance', {});
  });

  let preTransferA1Bal, postTransferA1Bal;

  it(`get userA1 balance`, async () => {
    preTransferA1Bal = await userA1.sdk.genericAction('getFioBalance', {});
  });

  it(`(empty unlock periods) try to transfer 0 locked tokens, expect Error`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA1.account,
        privKey: userA1.privateKey,
        data: {
          payee_public_key: test1.publicKey,
          can_vote: 0,
          periods: [],
          amount: 0,
          max_fee: 400000000000,
          tpid: '',
          actor: userA1.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('unlock_periods');
      expect(result.fields[0].value).to.equal('Invalid unlock periods');
      expect(result.fields[0].error).to.equal('Invalid number of unlock periods');
    } catch (err) {
      throw err;
    }
  });
  it(`(single unlock period, 0 amount) try to transfer 0 locked tokens, expect Error`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA1.account,
        privKey: userA1.privateKey,
        data: {
          payee_public_key: test1.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 120,
              amount: 0,
            },
          ],
          amount: 0,
          max_fee: 400000000000,
          tpid: '',
          actor: userA1.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('amount');
      expect(result.fields[0].value).to.equal('0');
      expect(result.fields[0].error).to.equal('Invalid amount value');
    } catch (err) {
      throw err;
    }
  });

  it(`validate ending balances`, async () => {
    postTransferA1Bal = await userA1.sdk.genericAction('getFioBalance', {});
    postTransferTest1Bal = await test1.sdk.genericAction('getFioBalance', {});
    expect(postTransferA1Bal.available).to.equal(preTransferA1Bal.available);
    expect(postTransferA1Bal.balance).to.equal(preTransferA1Bal.balance);
    expect(postTransferTest1Bal.available).to.equal(preTransferTest1Bal.available);
    expect(postTransferTest1Bal.balance).to.equal(preTransferTest1Bal.balance);
  });
});

describe(`E. test locked token transfer invalid input handling`, function () {

  before(async () => {
    userA1 = await newUser(faucet);
    userA2 = await newUser(faucet);
    userA3 = await newUser(faucet);
    userA4 = await newUser(faucet);
    userA5 = await newUser(faucet);
    userA6 = await newUser(faucet);
    test1 = await newUser(faucet);
    test2 = await newUser(faucet);
    test3 = await newUser(faucet);
    test4 = await newUser(faucet);
    test5 = await newUser(faucet);
    test6 = await newUser(faucet);
  });

  let preTransferTest1Bal, postTransferTest1Bal;
  let preTransferTest2Bal, postTransferTest2Bal;
  let preTransferTest3Bal, postTransferTest3Bal;
  let preTransferTest4Bal, postTransferTest4Bal;
  let preTransferTest5Bal, postTransferTest5Bal;
  let preTransferTest6Bal, postTransferTest6Bal;
  let preTransferA1Bal, postTransferA1Bal;
  let preTransferA2Bal, postTransferA2Bal;
  let preTransferA3Bal, postTransferA3Bal;
  let preTransferA4Bal, postTransferA4Bal;
  let preTransferA5Bal, postTransferA5Bal;
  let preTransferA6Bal, postTransferA6Bal;

  it(`set initial user balances`, async () => {
    preTransferTest1Bal = await test1.sdk.genericAction('getFioBalance', {});
    preTransferTest2Bal = await test2.sdk.genericAction('getFioBalance', {});
    preTransferTest3Bal = await test3.sdk.genericAction('getFioBalance', {});
    preTransferTest4Bal = await test4.sdk.genericAction('getFioBalance', {});
    preTransferTest5Bal = await test5.sdk.genericAction('getFioBalance', {});
    preTransferTest6Bal = await test6.sdk.genericAction('getFioBalance', {});
    preTransferA1Bal = await userA1.sdk.genericAction('getFioBalance', {});
    preTransferA2Bal = await userA2.sdk.genericAction('getFioBalance', {});
    preTransferA3Bal = await userA3.sdk.genericAction('getFioBalance', {});
    preTransferA4Bal = await userA4.sdk.genericAction('getFioBalance', {});
    preTransferA5Bal = await userA5.sdk.genericAction('getFioBalance', {});
    preTransferA6Bal = await userA6.sdk.genericAction('getFioBalance', {});
  });

  it(`(mismatched amounts) try to transfer locked tokens, expect Error`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA1.account,
        privKey: userA1.privateKey,
        data: {
          payee_public_key: test1.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 120,
              amount: 220000000000,
            },
          ],
          amount: 220000000010,
          max_fee: 400000000000,
          tpid: '',
          actor: userA1.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('unlock_periods');
      expect(result.fields[0].value).to.equal('Invalid unlock periods');
      expect(result.fields[0].error).to.equal('Invalid total amount for unlock periods');
    } catch (err) {
      throw err;
    }
  });

  it(`(negative total amount) try to transfer locked tokens, expect Error`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA2.account,
        privKey: userA2.privateKey,
        data: {
          payee_public_key: test2.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 120,
              amount: 220000000000,
            },
          ],
          amount: -220000000010,
          max_fee: 400000000000,
          tpid: '',
          actor: userA2.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('amount');
      expect(result.fields[0].value).to.equal('-220000000010');
      expect(result.fields[0].error).to.equal('Invalid amount value');
    } catch (err) {
      throw err;
    }
  });

  it(`(negative period amount) try to transfer locked tokens, expect Error`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA3.account,
        privKey: userA3.privateKey,
        data: {
          payee_public_key: test3.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 120,
              amount: -220000000000,
            },
          ],
          amount: 220000000010,
          max_fee: 400000000000,
          tpid: '',
          actor: userA3.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('unlock_periods');
      expect(result.fields[0].value).to.equal('Invalid unlock periods');
      expect(result.fields[0].error).to.equal('Invalid amount value in unlock periods');
    } catch (err) {
      throw err;
    }
  });

  it(`(negative amounts) try to transfer locked tokens, expect Error`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA4.account,
        privKey: userA4.privateKey,
        data: {
          payee_public_key: test4.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 120,
              amount: -220000000000,
            },
          ],
          amount: 220000000010,
          max_fee: 400000000000,
          tpid: '',
          actor: userA4.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('unlock_periods');
      expect(result.fields[0].value).to.equal('Invalid unlock periods');
      expect(result.fields[0].error).to.equal('Invalid amount value in unlock periods');
    } catch (err) {
      throw err;
    }
  });

  it(`(negative duration) try to transfer locked tokens, expect Error`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA4.account,
        privKey: userA4.privateKey,
        data: {
          payee_public_key: test5.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: -120,
              amount: 220000000000,
            },
          ],
          amount: 220000000010,
          max_fee: 400000000000,
          tpid: '',
          actor: userA4.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('unlock_periods');
      expect(result.fields[0].value).to.equal('Invalid unlock periods');
      expect(result.fields[0].error).to.equal('Invalid duration value in unlock periods');
    } catch (err) {
      throw err;
    }
  });

  it(`(invalid duration type) try to transfer locked tokens, expect Error`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA4.account,
        privKey: userA4.privateKey,
        data: {
          payee_public_key: test5.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: "!invalid@#",
              amount: 220000000000,
            },
          ],
          amount: 220000000010,
          max_fee: 400000000000,
          tpid: '',
          actor: userA4.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('unlock_periods');
      expect(result.fields[0].value).to.equal('Invalid unlock periods');
      expect(result.fields[0].error).to.equal('Invalid amount value in unlock periods');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(non-existent payee_public_key) try to transfer locked tokens, expect Error`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA4.account,
        privKey: userA4.privateKey,
        data: {
          payee_public_key: "!nvalid@#$",
          can_vote: 1,
          periods: [
            {
              duration: 120,
              amount: 220000000000,
            },
          ],
          amount: 220000000010,
          max_fee: 400000000000,
          tpid: '',
          actor: userA4.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('payee_public_key');
      expect(result.fields[0].value).to.equal('!nvalid@#$');
      expect(result.fields[0].error).to.equal('Invalid FIO Public Key');
    } catch (err) {
      throw err;
    }
  });

  it(`(invalid payee_public_key) try to transfer locked tokens, expect Error`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA4.account,
        privKey: userA4.privateKey,
        data: {
          payee_public_key: -10000000000,
          can_vote: 1,
          periods: [
            {
              duration: 120,
              amount: 220000000000,
            },
          ],
          amount: 220000000010,
          max_fee: 400000000000,
          tpid: '',
          actor: userA4.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('payee_public_key');
      expect(result.fields[0].value).to.equal('-10000000000');
      expect(result.fields[0].error).to.equal('Invalid FIO Public Key');
    } catch (err) {
      throw err;
    }
  });

  it(`validate ending balances`, async () => {
    postTransferA1Bal = await userA1.sdk.genericAction('getFioBalance', {});
    postTransferA2Bal = await userA2.sdk.genericAction('getFioBalance', {});
    postTransferA3Bal = await userA3.sdk.genericAction('getFioBalance', {});
    postTransferA4Bal = await userA4.sdk.genericAction('getFioBalance', {});
    postTransferA5Bal = await userA5.sdk.genericAction('getFioBalance', {});
    postTransferA6Bal = await userA6.sdk.genericAction('getFioBalance', {});
    postTransferTest1Bal = await test1.sdk.genericAction('getFioBalance', {});
    postTransferTest2Bal = await test2.sdk.genericAction('getFioBalance', {});
    postTransferTest3Bal = await test3.sdk.genericAction('getFioBalance', {});
    postTransferTest4Bal = await test4.sdk.genericAction('getFioBalance', {});
    postTransferTest5Bal = await test5.sdk.genericAction('getFioBalance', {});
    postTransferTest6Bal = await test6.sdk.genericAction('getFioBalance', {});
    expect(postTransferA1Bal.available).to.equal(preTransferA1Bal.available);
    expect(postTransferA1Bal.balance).to.equal(preTransferA1Bal.balance);
    expect(postTransferA2Bal.available).to.equal(preTransferA2Bal.available);
    expect(postTransferA2Bal.balance).to.equal(preTransferA2Bal.balance);
    expect(postTransferA3Bal.available).to.equal(preTransferA3Bal.available);
    expect(postTransferA3Bal.balance).to.equal(preTransferA3Bal.balance);
    expect(postTransferA4Bal.available).to.equal(preTransferA4Bal.available);
    expect(postTransferA4Bal.balance).to.equal(preTransferA4Bal.balance);
    expect(postTransferA5Bal.available).to.equal(preTransferA5Bal.available);
    expect(postTransferA5Bal.balance).to.equal(preTransferA5Bal.balance);
    expect(postTransferA6Bal.available).to.equal(preTransferA6Bal.available);
    expect(postTransferA6Bal.balance).to.equal(preTransferA6Bal.balance);
    expect(postTransferTest1Bal.available).to.equal(preTransferTest1Bal.available);
    expect(postTransferTest1Bal.balance).to.equal(preTransferTest1Bal.balance);
    expect(postTransferTest2Bal.available).to.equal(preTransferTest2Bal.available);
    expect(postTransferTest3Bal.balance).to.equal(preTransferTest2Bal.balance);
    expect(postTransferTest3Bal.available).to.equal(preTransferTest3Bal.available);
    expect(postTransferTest3Bal.balance).to.equal(preTransferTest3Bal.balance);
    expect(postTransferTest4Bal.available).to.equal(preTransferTest4Bal.available);
    expect(postTransferTest4Bal.balance).to.equal(preTransferTest4Bal.balance);
    expect(postTransferTest5Bal.available).to.equal(preTransferTest5Bal.available);
    expect(postTransferTest5Bal.balance).to.equal(preTransferTest5Bal.balance);
    expect(postTransferTest6Bal.available).to.equal(preTransferTest6Bal.available);
    expect(postTransferTest6Bal.balance).to.equal(preTransferTest6Bal.balance);
  });
});

describe(`F. test a mix of non-restricted and voting-restricted locked tokens`, function () {

  before(async () => {
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
  });

  let newKeyPair, newUserAcct;

  it(`Create a new keypair`, async () => {
    newKeyPair = await createKeypair();
  });

  it(`Try to transfer restricted voting locked tokens (can_vote=0) to a newly generated public key so that the locks table is not empty.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA2.account,
        privKey: userA2.privateKey,
        data: {
          payee_public_key: newKeyPair.publicKey,
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
          actor: userA2.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  it(`Try to transfer non-restricted voting locked tokens (can_vote=1) to the same account and expect Error because the account has existing can_vote=0 locked tokens.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA2.account,
        privKey: userA2.privateKey,
        data: {
          payee_public_key: newKeyPair.publicKey,
          can_vote: 1,
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
          actor: userA2.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('can_vote');
      expect(result.fields[0].value).to.equal('1');
      expect(result.fields[0].error).to.equal(config.error.locktoken1to0);
    } catch (err) {
      throw err;
    }
  });

  it(`wait 2 seconds`, async function () {await timeout(2000);});

  it(`Try to transfer MORE restricted voting locked tokens (can_vote=0) to the same account, expect success.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA2.account,
        privKey: userA2.privateKey,
        data: {
          payee_public_key: newKeyPair.publicKey,
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
          actor: userA2.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      console.log('Error: ', err);
      throw err;
    }
  });

  it(`Call get_table_rows from locktokens, expect successful merge of the restricted lock periods`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: newKeyPair.account,
        upper_bound: newKeyPair.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      const result = await callFioApi("get_table_rows", json);
      //NOTE -- these checks fail sometimes if the timing of the wait adds one sec to the duration,
      //  when this happense please run the test again.
      expect(result.rows[0].can_vote).to.equal(0);
      expect(result.rows[0].periods.length).to.equal(4);  // two periods then two more periods
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods[0].duration).to.be.greaterThanOrEqual(120).and.lessThanOrEqual(130);
      expect(result.rows[0].periods[1].duration).to.be.greaterThanOrEqual(120).and.lessThanOrEqual(130);
      expect(result.rows[0].periods[2].duration).to.be.greaterThanOrEqual(240).and.lessThanOrEqual(250);
      expect(result.rows[0].periods[3].duration).to.be.greaterThanOrEqual(240).and.lessThanOrEqual(250);
    } catch (err) {
      throw err;
    }
  });

  let newKeyPair2; 

  it(`Create a new keypair`, async () => {
    newKeyPair2 = await createKeypair();
  });

  it(`Call get_table_rows from locktokens, expect zero entries for the new keypair`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: newKeyPair2.account,
        upper_bound: newKeyPair2.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      const result = await callFioApi("get_table_rows", json);
      expect(result.rows).empty;
    } catch (err) {
      throw err;
    }
  });

  it(`Try to transfer non-restricted voting locked tokens (can_vote=1) to a newly generated account, expect success because account has no lock periods.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA2.account,
        privKey: userA2.privateKey,
        data: {
          payee_public_key: newKeyPair2.publicKey,
          can_vote: 1,
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
          actor: userA2.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  it(`wait 2 seconds`, async function () {await timeout(2000);});

  it(`Try to transfer MORE non-restricted voting locked tokens (can_vote=1) to the same account, expect success because existing lock entries are non-restricted.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA3.account,
        privKey: userA3.privateKey,
        data: {
          payee_public_key: newKeyPair2.publicKey,
          can_vote: 1,
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
          actor: userA3.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  it(`Try to transfer restricted voting locked tokens (can_vote=0) to the same account that has (can_vote=1) locked tokens, expect Error.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA4.account,
        privKey: userA4.privateKey,
        data: {
          payee_public_key: newKeyPair2.publicKey,
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
          actor: userA4.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('can_vote');
      expect(result.fields[0].value).to.equal('0');
      expect(result.fields[0].error).to.equal(config.error.locktoken0to1);
    } catch (err) {
      throw err;
    }
  });

  it(`Call get_table_rows from locktokens, expect successful merge of the non-restricted lock periods`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: newKeyPair2.account,
        upper_bound: newKeyPair2.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      const result = await callFioApi("get_table_rows", json);
      //NOTE -- these checks fail sometimes if the timing of the wait adds one sec to the duration,
      //  when this happense please run the test again.
      expect(result.rows[0].can_vote).to.equal(1);
      expect(result.rows[0].periods.length).to.equal(4);  // two periods then two more periods
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods[0].duration).to.be.greaterThanOrEqual(120).and.lessThanOrEqual(129);
      expect(result.rows[0].periods[1].duration).to.be.greaterThanOrEqual(120).and.lessThanOrEqual(129);
      expect(result.rows[0].periods[2].duration).to.be.greaterThanOrEqual(240).and.lessThanOrEqual(249);
      expect(result.rows[0].periods[3].duration).to.be.greaterThanOrEqual(240).and.lessThanOrEqual(249);
    } catch (err) {
      throw err;
    }
  });

  let newKeyPair3, newUser3;

  it(`Create a new keypair`, async () => {
    newKeyPair3 = await createKeypair();
  });

  it(`Call get_table_rows from locktokens and expect zero entries for the new keypair`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: newKeyPair3.account,
        upper_bound: newKeyPair3.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      const result = await callFioApi("get_table_rows", json);
      expect(result.rows).empty;
    } catch (err) {
      throw err;
    }
  });

  it(`Try to transfer restricted voting locked tokens (can_vote=0) to a newly generated account, expect success because account has no lock periods.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA4.account,
        privKey: userA4.privateKey,
        data: {
          payee_public_key: newKeyPair3.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 5,
              amount: fundsAmount,
            },
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: userA4.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  it(`wait 15 seconds for the one period to unlock`, async function () {await timeout(15000);});

  // See notes in BD-3816. Caused by table staing in state even though all periods have expired. So, expected behavior. There is a workaround for this bug.
  it.skip(`[BUG BD-3816 - Will not fix.] Try to transfer additional restricted (can_vote=0) voting locked tokens to the account now that the restricted lock period has ended (so no locks exist), expect Error.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA4.account,
        privKey: userA4.privateKey,
        data: {
          payee_public_key: newKeyPair3.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 121,
              amount: 220000000000,
            },
            {
              duration: 241,
              amount: 280000000000,
            },
            {
              duration: 261,
              amount: 200000000000,
            }
          ],
          amount: 700000000000,
          max_fee: 400000000000,
          tpid: '',
          actor: userA4.account,
        }
      });
      console.log(result);
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('can_vote');
      expect(result.fields[0].value).to.equal('1');
      expect(result.fields[0].error).to.equal(config.error.locktokenacctexists);
    } catch (err) {
      throw err;
    }
  });

  it(`Call get_table_rows from locktokens, expect only the 1 period from the first transfer`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: newKeyPair3.account,
        upper_bound: newKeyPair3.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      const result = await callFioApi("get_table_rows", json);
      //NOTE -- these checks fail sometimes if the timing of the wait adds one sec to the duration,
      //  when this happense please run the test again.
      expect(result.rows[0].can_vote).to.equal(0);
      expect(result.rows[0].periods.length).to.equal(1);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods[0].duration).to.be.greaterThanOrEqual(5).and.lessThanOrEqual(15);
    } catch (err) {
      throw err;
    }
  });

  let newKeyPair4, newUser4;

  it(`Create a new keypair`, async () => {
    newKeyPair4 = await createKeypair();
  });

  it(`Call get_table_rows from locktokens and expect zero entries for the new keypair`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: newKeyPair4.account,
        upper_bound: newKeyPair4.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      const result = await callFioApi("get_table_rows", json);
      expect(result.rows).empty;
    } catch (err) {
      throw err;
    }
  });

  it(`Try to transfer non-restricted voting locked tokens (can_vote=1) to a newly generated account, expect success because account has no lock periods.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA4.account,
        privKey: userA4.privateKey,
        data: {
          payee_public_key: newKeyPair4.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 5,
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
          actor: userA4.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  it(`wait 15 seconds for just one period to unlock`, async function () {await timeout(15000);});

  it(`Try to transfer restricted voting locked tokens (can_vote=0) to the account with (can_vote=1) existing locks, expect Error.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA4.account,
        privKey: userA4.privateKey,
        data: {
          payee_public_key: newKeyPair4.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 121,
              amount: 220000000000,
            },
            {
              duration: 241,
              amount: 280000000000,
            },
            {
              duration: 261,
              amount: 200000000000,
            }
          ],
          amount: 700000000000,
          max_fee: 400000000000,
          tpid: '',
          actor: userA4.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('can_vote');
      expect(result.fields[0].value).to.equal('0');
      expect(result.fields[0].error).to.equal(config.error.locktoken0to1);
    } catch (err) {
      throw err;
    }
  });

  it(`Call get_table_rows from locktokens, expect only the 2 periods from the first transfer`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: newKeyPair4.account,
        upper_bound: newKeyPair4.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      const result = await callFioApi("get_table_rows", json);
      //NOTE -- these checks fail sometimes if the timing of the wait adds one sec to the duration,
      //  when this happense please run the test again.
      expect(result.rows[0].periods.length).to.equal(2);
      expect(result.rows[0].can_vote).to.equal(1);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods[0].duration).to.be.greaterThanOrEqual(5).and.lessThanOrEqual(15);
      expect(result.rows[0].periods[1].duration).to.be.greaterThanOrEqual(240).and.lessThanOrEqual(249);
    } catch (err) {
      throw err;
    }
  });
});

describe(`G. Test a mix of non-restricted and voting-restricted locked tokens`, function () {

  before(async () => {
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
  });

  // test 1
  it(`Success test, Transfer locked tokens with non-restricted voting to a new account.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA1.account,
        privKey: userA1.privateKey,
        data: {
          payee_public_key: test1.publicKey,
          can_vote: 1,
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
          actor: userA1.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK","fee_collected":${config.api.transfer_tokens_pub_key.fee}}`);
    } catch (err) {
      throw err;
    }
  });

  it(`Wait 10 seconds.`, async () => { await timeout(10000) });

  it(`Try to transfer restricted voting locked tokens (can_vote=0) to the account with non-restricted (can_vote=0) voting tokens, expect Error. `, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA1.account,
        privKey: userA1.privateKey,
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
          actor: userA1.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('can_vote');
      expect(result.fields[0].value).to.equal('0');
      expect(result.fields[0].error).to.equal(config.error.locktoken0to1);
    } catch (err) {
      throw err;
    }
  });

  it(`Call get_table_rows from locktokens and confirm no new periods were added.`, async () => {
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
      const result = await callFioApi("get_table_rows", json);
      //NOTE -- these checks fail sometimes if the timing of the wait adds one sec to the duration,
      //  when this happense please run the test again.
      expect(result.rows[0].can_vote).to.equal(1);
      expect(result.rows[0].periods.length).to.equal(2);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods[0].duration).to.be.greaterThanOrEqual(120).and.lessThanOrEqual(129);
      expect(result.rows[0].periods[1].duration).to.be.greaterThanOrEqual(240).and.lessThanOrEqual(249);
    } catch (err) {
      throw err;
    }
  });

  // test 2
  let newKeyPair, newUserAcct;

  it(`Success test, Transfer locked tokens with non-restricted voting to a new account. `, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA2.account,
        privKey: userA2.privateKey,
        data: {
          payee_public_key: test2.publicKey,
          can_vote: 1,
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
          actor: userA2.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK","fee_collected":${config.api.transfer_tokens_pub_key.fee}}`);
    } catch (err) {
      throw err;
    }
  });

  it(`Wait 10 seconds.`, async () => { await timeout(10000) });

  it(`Create a new keypair`, async () => {
    newKeyPair = await createKeypair();
  });

  it(`Try to transfer non-restricted voting locked tokens (can_vote=1) from previous receiving account to a newly generated public key, expect success.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: test2.account, //userA2.account,
        privKey: test2.privateKey, // userA2.privateKey,
        data: {
          payee_public_key: newKeyPair.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 1,
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
          actor: test2.account, //userA2.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  it(`Call get_table_rows from locktokens and confirm 2 lock periods`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: newKeyPair.account,
        upper_bound: newKeyPair.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      const result = await callFioApi("get_table_rows", json);
      //NOTE -- these checks fail sometimes if the timing of the wait adds one sec to the duration,
      //  when this happense please run the test again.
      expect(result.rows[0].can_vote).to.equal(1);
      expect(result.rows[0].periods.length).to.equal(2);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods[0].duration).to.be.greaterThanOrEqual(1).and.lessThanOrEqual(10);
      expect(result.rows[0].periods[1].duration).to.be.greaterThanOrEqual(240).and.lessThanOrEqual(249);
    } catch (err) {
      throw err;
    }
  });

  // it(`init new account from new key`, async () => {
  //   newUserAcct = await existingUser(newKeyPair.account, newKeyPair.privateKey, newKeyPair.publicKey, "", "");
  //   console.log(newUserAcct);
  // });

  it(`wait 10 seconds`, async () => {await timeout(10000)});

  it(`Try to transfer non-restricted voting locked tokens (can_vote=1) to the same account, expect success - the account already exists, but has existing non-restricted voting lock`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA3.account,
        privKey: userA3.privateKey,
        data: {
          payee_public_key: newKeyPair.publicKey,
          can_vote: 1,
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
          actor: userA3.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  it(`Call get_table_rows from locktokens, expect 4 merged lock periods`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: newKeyPair.account,
        upper_bound: newKeyPair.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      const result = await callFioApi("get_table_rows", json);
      //NOTE -- these checks fail sometimes if the timing of the wait adds one sec to the duration,
      //  when this happense please run the test again.
      expect(result.rows[0].can_vote).to.equal(1);
      expect(result.rows[0].periods.length).to.equal(4);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods[0].duration).to.be.greaterThanOrEqual(1).and.lessThanOrEqual(10);
      expect(result.rows[0].periods[1].duration).to.be.greaterThanOrEqual(130).and.lessThanOrEqual(139);
      expect(result.rows[0].periods[2].duration).to.be.greaterThanOrEqual(240).and.lessThanOrEqual(249);
      expect(result.rows[0].periods[3].duration).to.be.greaterThanOrEqual(250).and.lessThanOrEqual(259);

    } catch (err) {
      throw err;
    }
  });

  let newUser2, newKeyPair2;

  // it(`init new account from new key`, async () => {
  //   newUser2 = await newUser(faucet);
  //   //existingUser(newKeyPair.account, newKeyPair.privateKey, newKeyPair.publicKey, "", "");
  //   //console.log(newUserAcct);
  // });

  it(`Create a new keypair`, async () => {
    newKeyPair2 = await createKeypair();
  });

  it(`init new account from new key`, async () => {
    newUser2 = await //newUser(faucet);
                  existingUser(newKeyPair.account, newKeyPair.privateKey, newKeyPair.publicKey, "", "");
    //console.log(newUser2);
  });

  it(`Success test, Transfer locked tokens with restricted voting to a new account.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: test1.account,
        privKey: test1.privateKey,
        data: {
          payee_public_key: newKeyPair2.publicKey,
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
          actor: test1.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK","fee_collected":${config.api.transfer_tokens_pub_key.fee}}`);
    } catch (err) {
      throw err;
    }
  });

  it(`[BUG BD-3744] Try to transfer non-restricted voting locked tokens (can_vote=1) to the account with restricted (can_vote=0) tokens, expect Error. `, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA3.account,
        privKey: userA3.privateKey,
        data: {
          payee_public_key: newKeyPair2.publicKey,
          can_vote: 1,
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
          actor: userA3.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('can_vote');
      expect(result.fields[0].value).to.equal('1');
      expect(result.fields[0].error).to.equal(config.error.locktoken1to0);
    } catch (err) {
      throw err;
    }
  });

  it(`Call get_table_rows from locktokens, expect only the restricted voting lock periods from the first transfer`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: newKeyPair2.account,
        upper_bound: newKeyPair2.account,
        key_type: 'i64',
        reverse: true,
        index_position: '2'
      }
      const result = await callFioApi("get_table_rows", json);
      //NOTE -- these checks fail sometimes if the timing of the wait adds one sec to the duration,
      //  when this happense please run the test again.
      expect(result.rows[0].can_vote).to.equal(0);
      expect(result.rows[0].periods.length).to.equal(2);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
      expect(result.rows[0].periods[0].duration).to.be.greaterThanOrEqual(120).and.lessThanOrEqual(129);
      expect(result.rows[0].periods[1].duration).to.be.greaterThanOrEqual(240).and.lessThanOrEqual(249);
    } catch (err) {
      throw err;
    }
  });

  let newKeyPair3, newUser3;

  it(`Create a new keypair`, async () => {
    newKeyPair3 = await createKeypair();
  });

  it(`Success test, Transfer locked tokens with restricted voting (can_vote=0) from an old to a new public key.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: test1.account,
        privKey: test1.privateKey,
        data: {
          payee_public_key: newKeyPair3.publicKey,
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
          actor: test1.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK","fee_collected":${config.api.transfer_tokens_pub_key.fee}}`);
    } catch (err) {
      throw err;
    }
  });

  it(`[BUG BD-3744] Try to transfer non-restricted voting locked tokens (can_vote=1) to the account with restricted (can_vote=0) locked tokens, expect Error. `, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA3.account,
        privKey: userA3.privateKey,
        data: {
          payee_public_key: newKeyPair3.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 5,
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
          actor: userA3.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('can_vote');
      expect(result.fields[0].value).to.equal('1');
      expect(result.fields[0].error).to.equal(config.error.locktoken1to0);
    } catch (err) {
      throw err;
    }
  });

  // should have restricted locks already from above
  it(`Try to transfer additional restricted voting locked tokens (can_vote=0) to account with existing (can_vote=0) locked tokens. Expect success. `, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA3.account,
        privKey: userA3.privateKey,
        data: {
          payee_public_key: newKeyPair3.publicKey,
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
          actor: userA3.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
      throw err;
    }
  });

  it(`init new account from new key`, async () => {
    newUser3 = await existingUser(newKeyPair.account, newKeyPair.privateKey, newKeyPair.publicKey, "", "");
    //console.log(newUser3);
  });

  it.skip(`wait for 1 unlock period`, async () => {await timeout(130000);});

  it(`Try to transfer locked tokens from test1 (can_vote=1) to test2 (can_vote=0), expect Error`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: newUser3.account,
        privKey: newUser3.privateKey,
        data: {
          payee_public_key: test2.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 121,
              amount: 220000000000,
            },
            // {
            //   duration: 241,
            //   amount: 280000000000,
            // }
          ],
          amount: 230000000000, //fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: newUser3.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].error).to.equal('Funds locked');
    } catch (err) {
      throw err;
    }
  });

  it(`wait for 1 unlock period`, async () => {await timeout(10000);});

  it(`Try to transfer locked tokens, expect Error`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: newUser3.account,
        privKey: newUser3.privateKey,
        data: {
          payee_public_key: test2.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 121,
              amount: 220000000000,
            },
            // {
            //   duration: 241,
            //   amount: 280000000000,
            // }
          ],
          amount: 220000000000, //fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: newUser3.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('actor');
      expect(result.fields[0].error).to.equal('Funds locked');
    } catch (err) {
      throw err;
    }
  });
});

describe(`H. redundant test - transfer restricted voting locks, then non-restricted voting locks`, function () {

  before(async () => {
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
  });

  let newKeyPair, newUserAcct;

  it(`Create a new keypair`, async () => {
    newKeyPair = await createKeypair();
    newKeyPair2 = await createKeypair();
  });

  it(`Try to transfer restricted voting locked tokens (can_vote=0) to a newly generated public key so that the locks table is not empty.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA2.account,
        privKey: userA2.privateKey,
        data: {
          payee_public_key: newKeyPair.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 5,
              amount: 220000000000,
            },
            {
              duration: 10,
              amount: 280000000000,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: userA2.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  it(`wait for both periods to unlock`, async () => {await timeout(30000);});

  it(`Try to transfer non-restricted voting locked tokens (can_vote=1) to a newly generated public key, expect success.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA2.account,
        privKey: userA2.privateKey,
        data: {
          payee_public_key: newKeyPair2.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 5,
              amount: 220000000000,
            },
            {
              duration: 10,
              amount: 280000000000,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: userA2.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      //expect(result.type).to.equal('invalid_input');
      //expect(result.fields[0].name).to.equal('can_vote');
      //expect(result.fields[0].value).to.equal('1');
      //expect(result.fields[0].error).to.equal('Locked tokens with restricted voting can only be transferred to a new account.');
    } catch (err) {
      throw err;
    }
  });
});

describe(`I. redundant test - transfer non-restricted voting locks, then restricted voting locks`, function () {

  before(async () => {
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
  });

  let newKeyPair, newUserAcct;

  it(`Create a new keypair`, async () => {
    newKeyPair = await createKeypair();
  });

  it(`Try to transfer non-restricted voting locked tokens (can_vote=1) to a newly generated public key so that the locks table is not empty.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA2.account,
        privKey: userA2.privateKey,
        data: {
          payee_public_key: newKeyPair.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 5,
              amount: 220000000000,
            },
            {
              duration: 10,
              amount: 280000000000,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: userA2.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      // expect(result.type).to.equal('invalid_input');
      // expect(result.fields[0].name).to.equal('can_vote');
      // expect(result.fields[0].value).to.equal('1');
      // expect(result.fields[0].error).to.equal('Locked tokens with restricted voting can only be transferred to a new account.');
    } catch (err) {
      throw err;
    }
  });

  it(`wait for both periods to unlock`, async () => {await timeout(30000);});

  it(`Try to transfer restricted voting locked tokens (can_vote=0) to the same key, expect error.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: userA2.account,
        privKey: userA2.privateKey,
        data: {
          payee_public_key: newKeyPair.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 5,
              amount: 220000000000,
            },
            {
              duration: 10,
              amount: 280000000000,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: userA2.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('can_vote');
      expect(result.fields[0].value).to.equal('0');
      //expect(result.fields[0].error).to.equal('Locked tokens with restricted voting can only be transferred to a new account.');
    } catch (err) {
      throw err;
    }
  });
});

describe(`J. Test trnsloctoks effect on total_voted_fio for a user with non-restricted locks`, () => {

  let user1, user2, total_voted_fio, totalVotesBP1, totalVotesBP2, totalVotesBP3

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  });

  it(`Wait a few seconds.`, async () => { await timeout(3000) });

  it(`Get initial total_voted_fio`, async () => {
    total_voted_fio = await getTotalVotedFio();
  });

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      totalVotesBP1 = await getProdVoteTotal('bp1@dapixdev');
    } catch (err) {
      throw err;
    }
  });

  it(`Get bp2@dapixdev total_votes`, async () => {
    try {
      totalVotesBP2 = await getProdVoteTotal('bp2@dapixdev');
    } catch (err) {
      throw err;
    }
  });

  it(`Get bp3@dapixdev total_votes`, async () => {
    try {
      totalVotesBP3 = await getProdVoteTotal('bp3@dapixdev');
    } catch (err) {
      throw err;
    }
  });

  let preVoteWeight, preVoteFio;

  it(`Get last_vote_weight`, async () => {
    preVoteWeight = await getAccountVoteWeight(user1.account);
    //console.log('[dbg] pre-vote last_vote_weight: ', preVoteWeight / 1000000000);
    //expect(preVoteWeight).to.equal(0);
  });

  it(`Get total_voted_fio`, async () => {
    preVoteFio = await getTotalVotedFio();
    //console.log('[dbg] total_voted_fio: ', preVoteFio);
  });

  it(`user1 votes for bp1 and bp2`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev',
            'bp2@dapixdev'
          ],
          fio_address: user1.address,
          actor: user1.account,
          max_fee: config.maxFee
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      throw err;
    }
  });

  let postVoteWeight, postVoteFio;

  // get vote weight after voting
  it(`Get last_vote_weight after voting`, async () => {
    postVoteWeight = await getAccountVoteWeight(user1.account);
    //console.log('[dbg] post-vote last_vote_weight: ', postVoteWeight / 1000000000);
    let bal = await user1.sdk.genericAction('getFioBalance', {});
    expect(postVoteWeight).to.equal(bal.available);
    expect(postVoteWeight).to.equal(bal.balance);
  });

  it(`Get total_voted_fio`, async () => {
    postVoteFio = await getTotalVotedFio();
    //console.log('[dbg] total_voted_fio: ', postVoteFio);
  });

  // transfer some lock tokens to the voter
  it(`Try to transfer non-restricted voting locked tokens (can_vote=1) to user1.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          payee_public_key: user1.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 5,
              amount: 220000000000,
            },
            {
              duration: 10,
              amount: 280000000000,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: user2.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      // expect(result.type).to.equal('invalid_input');
      // expect(result.fields[0].name).to.equal('can_vote');
      // expect(result.fields[0].value).to.equal('1');
      // expect(result.fields[0].error).to.equal('Locked tokens with restricted voting can only be transferred to a new account.');
    } catch (err) {
      throw err;
    }
  });

  let postTransferVoteWeight, postTransferVoteFio;

  // get vote weight and confirm that it increased
  it(`Get last_vote_weight after receiving locked token transfer`, async () => {
    postTransferVoteWeight = await getAccountVoteWeight(user1.account);
    //console.log('[dbg] post-transfer last_vote_weight: ', postTransferVoteWeight / 1000000000);
  });

  it(`Get total_voted_fio`, async () => {
    postTransferVoteFio = await getTotalVotedFio();
    //console.log('[dbg] total_voted_fio: ', postTransferVoteFio);
  });

  // vote weight assertion
  it(`expect increase in total FIO and vote weight after lock token transfer`, async () => {
    let weightIncrease = postTransferVoteWeight > postVoteWeight;
    let fioIncrease = postTransferVoteFio > postVoteFio;
    expect(weightIncrease).to.equal(true);
    expect(fioIncrease).to.equal(true);
  });
});

describe(`K.1 -  BD-3809 - Test trnsloctoks effect on total_voted_fio for a user with restricted locks`, () => {

  let user1, totalVotedFio, newKeyPairSDK;

  before(async () => {
    user1 = await newUser(faucet);
  });

  /**
   * Test Case 1: Create account with can_vote=0 locks on it and register a FIO Address
   */

  it(`Get initial totalVotedFio`, async () => {
    totalVotedFio = await getTotalVotedFio();
  });

  // Create new key pair and send can_vote=0 locks to key pair

  it(`Create a new keypair`, async () => {
    newKeyPair = await createKeypair();
  });

  it(`Create a new SDK object for newKeyPair user`, async () => {
    newKeyPairSDK = new FIOSDK(newKeyPair.privateKey, newKeyPair.publicKey, config.BASE_URL, fetchJson);
  });

  it(`Transfer can_vote=0 locks to unestablished newKeyPair account.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          payee_public_key: newKeyPair.publicKey,
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
          actor: user1.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  it(`Get totalVotedFio. Expect: No change`, async () => {
    const oldTotalVotedFio = totalVotedFio;
    totalVotedFio = await getTotalVotedFio();
    //console.log('total_voted_fio: ', totalVotedFio);
    expect(totalVotedFio).to.equal(oldTotalVotedFio);
  });

  it(`Set user1 domain as public so newkeypair can register address on it`, async () => {
    const result = await user1.sdk.genericAction('setFioDomainVisibility', {
      fioDomain: user1.domain,
      isPublic: true,
      maxFee: config.maxFee
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')
    //const result = await user1Ram.setRamData('SETDOMAINPUBRAM', user1Ram)
  })

  it(`Transfer 200 FIO from user1 to newKeyPair to be used for registering a new address`, async () => {
    const result = await user1.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: newKeyPair.publicKey,
      amount: 200000000000,
      maxFee: config.maxFee,
    })
    //console.log('Result', result)
    expect(result.status).to.equal('OK')
  })

  it(`regaddress for newKeyPair so it can vote`, async () => {
    try {
      newKeyPair.address = generateFioAddress(user1.domain, 8)
      const result = await newKeyPairSDK.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        data: {
          fio_address: newKeyPair.address,
          owner_fio_public_key: newKeyPair.publicKey,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })


  /**
   * Test Case 1: Voting with can_vote=0 locked tokens
   */

  let availableFio, lockedFio;

   it(`Get newKeyPair locked and available tokens`, async () => {
     try {
      let bal = await newKeyPairSDK.genericAction('getFioBalance', {});
      availableFio = bal.available;
      lockedFio = bal.balance - availableFio;
      //console.log('bal: ', bal);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal('null');
    }
  });

  it(`Get updated total_voted_fio`, async () => {
    totalVotedFio = await getTotalVotedFio();
    //console.log('total_voted_fio: ', totalVotedFio);
  });

  it(`newKeyPair votes for bp1 and bp2`, async () => {
    try {
      const result = await newKeyPairSDK.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev',
            'bp2@dapixdev'
          ],
          fio_address: newKeyPair.address,
          actor: newKeyPair.account,
          max_fee: config.maxFee
        }
      });
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err);
      throw err;
    }
  });

  it(`Get totalVotedFio after user with can_vote=0 votes. Expect: totalVotedFio increases by available FIO (not locked FIO)`, async () => {
    const oldTotalVotedFio = totalVotedFio;
    totalVotedFio = await getTotalVotedFio();
    //console.log('total_voted_fio: ', totalVotedFio);
    expect(totalVotedFio).to.equal(oldTotalVotedFio + availableFio);
  });

  /**
   * Test Case 2: Transfer additional (can_vote=0) tokens to newKeyPair. This should not increase Total Voted FIO
   */

  // transfer additional locked tokens to newKeyPair
  it(`Transfer additional ${fundsAmount} LOCKED tokens (can_vote=0) to newKeyPair.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          payee_public_key: newKeyPair.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 5,
              amount: 220000000000,
            },
            {
              duration: 10,
              amount: 280000000000,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: user1.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  it(`[BUG BD-3809] Get totalVotedFio. Expect: totalVotedFio does NOT increase`, async () => {
    const oldTotalVotedFio = totalVotedFio;
    totalVotedFio = await getTotalVotedFio();
    //console.log('total_voted_fio: ', totalVotedFio);
    expect(totalVotedFio).to.equal(oldTotalVotedFio);
  });
});

describe(`K.2 - BD-3808 - Test trnsloctoks effect on last_vote_weight for a user with restricted locks`, () => {

  let user1, voteWeight, newKeyPairSDK, totalVotesBP1;

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  });

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      totalVotesBP1 = await getProdVoteTotal('bp1@dapixdev');
    } catch (err) {
      throw err;
    }
  });

  /**
   * Test Case 1: Create account with can_vote=0 locks on it and register a FIO Address
   */

  // Create new key pair and send can_vote=0 locks to key pair

  it(`Create a new keypair`, async () => {
    newKeyPair = await createKeypair();
  });

  it(`Create a new SDK object for newKeyPair user`, async () => {
    newKeyPairSDK = new FIOSDK(newKeyPair.privateKey, newKeyPair.publicKey, config.BASE_URL, fetchJson);
  });

  it(`Transfer can_vote=0 locks to unestablished newKeyPair account.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          payee_public_key: newKeyPair.publicKey,
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
          actor: user1.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  it(`Set user1 domain as public so newkeypair can register address on it`, async () => {
    const result = await user1.sdk.genericAction('setFioDomainVisibility', {
      fioDomain: user1.domain,
      isPublic: true,
      maxFee: config.maxFee
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')
    //const result = await user1Ram.setRamData('SETDOMAINPUBRAM', user1Ram)
  })

  it(`Transfer 200 FIO from user1 to newKeyPair to be used for registering a new address`, async () => {
    const result = await user1.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: newKeyPair.publicKey,
      amount: 200000000000,
      maxFee: config.maxFee,
    })
    //console.log('Result', result)
    expect(result.status).to.equal('OK')
  })

  it(`regaddress for newKeyPair so it can vote`, async () => {
    try {
      newKeyPair.address = generateFioAddress(user1.domain, 8)
      const result = await newKeyPairSDK.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        data: {
          fio_address: newKeyPair.address,
          owner_fio_public_key: newKeyPair.publicKey,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })


  /**
   * Test Case 1: Voting with can_vote=0 locked tokens
   */

  let availableFio, lockedFio;

   it(`Get newKeyPair locked and available tokens`, async () => {
     try {
      let bal = await newKeyPairSDK.genericAction('getFioBalance', {});
      availableFio = bal.available;
      lockedFio = bal.balance - availableFio;
      //console.log('bal: ', bal);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal('null');
    }
  });

  it(`Get newKeyPair.last_vote_weight`, async () => {
    voteWeight = await getAccountVoteWeight(newKeyPair.account);
    //console.log('pre-vote last_vote_weight: ', voteWeight / 1000000000);
  });

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      const oldtotalVotesBP1 = totalVotesBP1;
      totalVotesBP1 = await getProdVoteTotal('bp1@dapixdev');
      expect(totalVotesBP1).to.equal(oldtotalVotesBP1);
    } catch (err) {
      throw err;
    }
  });

  it(`newKeyPair votes for bp1 and bp2`, async () => {
    try {
      const result = await newKeyPairSDK.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev',
            'bp2@dapixdev'
          ],
          fio_address: newKeyPair.address,
          actor: newKeyPair.account,
          max_fee: config.maxFee
        }
      });
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err);
      throw err;
    }
  });

  it(`Get newKeyPair.last_vote_weight. Expect vote weight to increase by Available tokens.`, async () => {
    const oldvoteWeight = voteWeight;
    voteWeight = await getAccountVoteWeight(newKeyPair.account);
    //console.log('pre-vote last_vote_weight: ', voteWeight / 1000000000);
    expect(voteWeight).to.equal(oldvoteWeight + availableFio);
  });

  it(`Get bp1@dapixdev total_votes. Expect votes to increase by newKeyPair Available FIO`, async () => {
    try {
      const oldtotalVotesBP1 = totalVotesBP1;
      totalVotesBP1 = await getProdVoteTotal('bp1@dapixdev');
      expect(totalVotesBP1).to.equal(oldtotalVotesBP1 + availableFio);
    } catch (err) {
      throw err;
    }
  });


  /**
   * Test Case 2: Transfer additional (can_vote=0) tokens to newKeyPair. This should not increase Total Voted FIO
   */

  // transfer additional locked tokens to newKeyPair
  it(`Transfer additional ${fundsAmount} LOCKED tokens (can_vote=0) to newKeyPair.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          payee_public_key: newKeyPair.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 5,
              amount: 220000000000,
            },
            {
              duration: 10,
              amount: 280000000000,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: user1.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  it(`[BUG BD-3808] Get voteWeight. Expect: voteWeight does NOT increase`, async () => {
    const oldvoteWeight = voteWeight;
    voteWeight = await getAccountVoteWeight(newKeyPair.account);
    //console.log('[dbg] pre-vote last_vote_weight: ', voteWeight / 1000000000);
    expect(voteWeight).to.equal(oldvoteWeight);
  });

  it(`Get bp1@dapixdev total_votes. Expect no change.`, async () => {
    try {
      const oldtotalVotesBP1 = totalVotesBP1;
      totalVotesBP1 = await getProdVoteTotal('bp1@dapixdev');
      expect(totalVotesBP1).to.equal(oldtotalVotesBP1);
    } catch (err) {
      throw err;
    }
  });
  
});

describe(`Test trnsloctoks effect on total_voted_fio for a user with restricted locks`, () => {

  let user1, user2, total_voted_fio, totalVotesBP1, totalVotesBP2, totalVotesBP3

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  });

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Get initial total_voted_fio`, async () => {
    total_voted_fio = await getTotalVotedFio();
  });

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      totalVotesBP1 = await getProdVoteTotal('bp1@dapixdev');
    } catch (err) {
      throw err;
    }
  });

  it(`Get bp2@dapixdev total_votes`, async () => {
    try {
      totalVotesBP2 = await getProdVoteTotal('bp2@dapixdev');
    } catch (err) {
      throw err;
    }
  });

  it(`Get bp3@dapixdev total_votes`, async () => {
    try {
      totalVotesBP3 = await getProdVoteTotal('bp3@dapixdev');
    } catch (err) {
      throw err;
    }
  });

  it(`Create a new keypair`, async () => {
    newKeyPair = await createKeypair();
  });

  it(`Create a new SDK object for newKeyPair user`, async () => {
    newKeyPairSDK = new FIOSDK(newKeyPair.privateKey, newKeyPair.publicKey, config.BASE_URL, fetchJson);
  });

  it(`Transfer can_vote=0 locks to unestablished newKeyPair account.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          payee_public_key: newKeyPair.publicKey,
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
          actor: user1.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  let preVoteWeight, preVoteFio;

  it(`Set user1 domain as public`, async () => {
    const result = await user1.sdk.genericAction('setFioDomainVisibility', {
      fioDomain: user1.domain,
      isPublic: true,
      maxFee: config.maxFee
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')
    //const result = await user1Ram.setRamData('SETDOMAINPUBRAM', user1Ram)
  })

  it(`Transfer 200 FIO from user1 back to newKeyPair`, async () => {
    const result = await user1.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: newKeyPair.publicKey,
      amount: 200000000000,
      maxFee: config.maxFee,
    })
    //console.log('Result', result)
    expect(result.status).to.equal('OK')
  })


  it(`regaddressfor newKeyPair so it can vote`, async () => {
    try {
      newKeyPair.address = generateFioAddress(user1.domain, 8)
      const result = await newKeyPairSDK.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        data: {
          fio_address: newKeyPair.address,
          owner_fio_public_key: newKeyPair.publicKey,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Get newKeyPair.last_vote_weight`, async () => {
    preVoteWeight = await getAccountVoteWeight(newKeyPair.account);
    //console.log('[dbg] pre-vote last_vote_weight: ', preVoteWeight / 1000000000);
    //expect(preVoteWeight).to.equal(0);
  });

  it(`Get total_voted_fio`, async () => {
    preVoteFio = await getTotalVotedFio();
    //console.log('[dbg] total_voted_fio: ', preVoteFio);
  });

  it(`newKeyPair votes for bp1 and bp2`, async () => {
    try {
      const result = await newKeyPairSDK.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev',
            'bp2@dapixdev'
          ],
          fio_address: newKeyPair.address,
          actor: newKeyPair.account,
          max_fee: config.maxFee
        }
      });
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err);
      throw err;
    }
  });

  let postVoteWeight, postVoteFio;

  // get vote weight after voting
  it(`Get newKeyPair.last_vote_weight after voting`, async () => {
    postVoteWeight = await getAccountVoteWeight(newKeyPair.account);
    //console.log('[dbg] post-vote last_vote_weight: ', postVoteWeight / 1000000000)
    let bal = await newKeyPairSDK.genericAction('getFioBalance', {});
    expect(postVoteWeight).to.equal(bal.available);
  });

  it(`Get total_voted_fio`, async () => {
    postVoteFio = await getTotalVotedFio();
    //console.log('[dbg] total_voted_fio: ', postVoteFio);
  });

  // transfer some lock tokens to the voter
  it(`Transfer additional ${fundsAmount} LOCKED tokens (can_vote=0) to newKeyPair.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          payee_public_key: newKeyPair.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 5,
              amount: 220000000000,
            },
            {
              duration: 10,
              amount: 280000000000,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: user2.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  it(`wait for periods to unlock`, async () => {await timeout(15000);});

  let postTransferVoteWeight, postTransferVoteFio;

  // get vote weight and confirm that it increased
  it(`Get newKeyPair.last_vote_weight after transferring locked tokens`, async () => {
    postTransferVoteWeight = await getAccountVoteWeight(newKeyPair.account);
    //console.log('[dbg] post-transfer last_vote_weight: ', postTransferVoteWeight / 1000000000)
  });

  it(`Get total_voted_fio`, async () => {
    postTransferVoteFio = await getTotalVotedFio();
    //console.log('[dbg] total_voted_fio: ', postTransferVoteFio);
  });

  it(`[BUG BD-3808] expect no change in newKeyPair vote weight after lock token transfer`, async () => {
    let weightIncrease = postTransferVoteWeight > postVoteWeight;
    expect(weightIncrease).to.equal(false);
  });

  it(`[BUG BD-3809] expect no change in total voted FIO after lock token transfer`, async () => {
    let fioIncrease = postTransferVoteFio > postVoteFio;
    expect(fioIncrease).to.equal(false);
  });
});

describe(`L. Transfer locked tokens canvote=0 to existing account with no locks`, () => {

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  });

  it(`Expect error: Transfer locked tokens canvote=0 to existing account user2 with NO locks.`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          payee_public_key: user2.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 5,
              amount: 220000000000,
            },
            {
              duration: 10,
              amount: 280000000000,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: user1.account,
        }
      });
      expect(result.type).to.equal('invalid_input');
      expect(result.fields[0].name).to.equal('can_vote');
      expect(result.fields[0].value).to.equal('0');
      expect(result.fields[0].error).to.equal(config.error.locktokenacctexists);
    } catch (err) {
      throw err;
    }
  });

});

describe(`M. transfer_locked_tokens - Transfer locked tokens canvote=0 to existing account with no locks`, () => {

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  });

  it(`Expect success: Transfer locked tokens canvote=1 to existing account user2 with NO locks.`, async () => {
    try {
      const result = await callFioApiSigned('transfer_locked_tokens', {
        action: 'trnsloctoks',
        account: 'fio.token',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          payee_public_key: user2.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 5,
              amount: 220000000000,
            },
            {
              duration: 10,
              amount: 280000000000,
            }
          ],
          amount: fundsAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: user1.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

});