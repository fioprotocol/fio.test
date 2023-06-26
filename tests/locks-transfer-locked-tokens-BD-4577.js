require('mocha')
const {expect} = require('chai')
const {newUser, getProdVoteTotal, fetchJson, generateFioDomain, callFioApi,  generateFioAddress, createKeypair, getTestType, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const testType = getTestType();

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

let userA1, userA2, userA3, userA4, keys, keys1, keys2, keys3,keys4, locksdk,
    locksdk1, locksdk2, locksdk3,locksdk4, newFioAddress, newFioDomain, newFioDomain2, newFioAddress2,
    total_bp_votes_before, total_bp_votes_after
const fundsAmount = 500000000000
const maxTestFundsAmount = 5000000000
const halfundsAmount = 220000000000

describe(`************************** locks-transfer-locked-tokens-BD-4577.js ************************** \n    A. Create accounts for tests`, () => {

  it(`Create users`, async () => {
    userA1 = await newUser(faucet);
    userA2 = await newUser(faucet);
    userA3 = await newUser(faucet);
    userA4 = await newUser(faucet);

    keys = await createKeypair();
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
    keys1 = await createKeypair();
    locksdk1 = new FIOSDK(keys1.privateKey, keys1.publicKey, config.BASE_URL, fetchJson);
    keys2 = await createKeypair();
    locksdk2 = new FIOSDK(keys2.privateKey, keys2.publicKey, config.BASE_URL, fetchJson);
    keys3 = await createKeypair();
    locksdk3 = new FIOSDK(keys3.privateKey, keys3.publicKey, config.BASE_URL, fetchJson);
    keys4 = await createKeypair();
    locksdk4 = new FIOSDK(keys4.privateKey, keys4.publicKey, config.BASE_URL, fetchJson);
  })

})


describe(`A. Token unlocking tests, and get_fio_balance`, () => {

  it(`Transfer  locked FIO using canvote true, 12 lock periods, 3 second periods`, async () => {
      userA1 = await newUser(faucet);
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys4.publicKey,
          can_vote: 1,
          periods: [
            {
              duration: 3,
              amount: 30000000000,
            },
            {
              duration: 6,
              amount: 30000000000,
            },
            {
              duration: 9,
              amount: 30000000000,
            },
            {
              duration: 12,
              amount: 30000000000,
            },
            {
              duration: 15,
              amount: 30000000000,
            },
            {
              duration: 18,
              amount: 30000000000,
            },
            {
              duration: 21,
              amount: 30000000000,
            },
            {
              duration: 24,
              amount: 30000000000,
            },
            {
              duration: 27,
              amount: 30000000000,
            },
            {
              duration: 30,
              amount: 30000000000,
            },
            {
              duration: 33,
              amount: 30000000000,
            },
            {
              duration: 36,
              amount: 30000000000,
            }
          ],
          amount: 360000000000,
          max_fee: config.maxFee,
          tpid: '',
          actor: userA1.account,
        }

      })
      expect(result.status).to.equal('OK')
      expect(result).to.have.any.keys('status');
      expect(result).to.have.any.keys('fee_collected');
      expect(result).to.have.any.keys('block_num');
      expect(result).to.have.any.keys('transaction_id');
  })

  it(`Waiting 3 seconds`, async () => {
    console.log("            waiting 3 seconds ")
  })

  it(`Wait 3 seconds.`, async () => { await timeout(3000) }); //30 unlock

  it(`Transfer 28 FIO to another account`, async () => {

    const result = await locksdk4.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 28000000000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });

  it(`Waiting 12 seconds`, async () => {
    console.log("            waiting 12 seconds ")
  })

  it(`Wait  seconds.`, async () => { await timeout(12000) });      //120 available

  it(`Transfer locked FIO short periods using canvote true, 12 lock periods 3 second periods`, async () => {
    userA1 = await newUser(faucet);
    const result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys4.publicKey,
        can_vote: 1,
        periods: [
          {
            duration: 3,
            amount: 30000000000,
          },
          {
            duration: 6,
            amount: 30000000000,
          },
          {
            duration: 9,
            amount: 30000000000,
          },
          {
            duration: 12,
            amount: 30000000000,
          },
          {
            duration: 15,
            amount: 30000000000,
          },
          {
            duration: 18,
            amount: 30000000000,
          },
          {
            duration: 21,
            amount: 30000000000,
          },
          {
            duration: 24,
            amount: 30000000000,
          },
          {
            duration: 27,
            amount: 30000000000,
          },
          {
            duration: 30,
            amount: 30000000000,
          },
          {
            duration: 33,
            amount: 30000000000,
          },
          {
            duration: 36,
            amount: 30000000000,
          }
        ],
        amount: 360000000000,
        max_fee: config.maxFee,
        tpid: '',
        actor: userA1.account,
      }

    })
    expect(result.status).to.equal('OK')
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  })

  it(`Transfer 89 FIO to another account`, async () => {
    const result = await locksdk4.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 89000000000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });

  it(`Waiting 6 seconds`, async () => {
    console.log("            waiting 6 seconds ")
  })

  it(`Wait 6 seconds.`, async () => { await timeout(6000) });    //90 more unlock 120 available.
  it(`Transfer 90 FIO to another account`, async () => {
    const result = await locksdk4.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 90000010000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });
  it(`Transfer 31 FIO to another account`, async () => {
    const result = await locksdk4.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 31000001000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });

  it(`Transfer 19 FIO to another account`, async () => {
    const result = await locksdk4.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 19000010010,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });

  it(`Waiting 9 seconds`, async () => {
    console.log("            waiting 6 seconds ")
  })

  it(`Wait 9 seconds.`, async () => { await timeout(9000) });    //90 more unlock 120 available.

  it(`Transfer 90 FIO to another account`, async () => {
    const result = await locksdk4.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 90000011000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });

  it(`Waiting 9 seconds`, async () => {
    console.log("            waiting 6 seconds ")
  })

  it(`Wait 9 seconds.`, async () => { await timeout(9000) });    //90 more unlock 120 available.

  it(`Get FIO balance for new account. available should NOT be the balance!!!!`, async () => {
    try {
      const json = {
        fio_public_key: keys4.publicKey
      }
      result = await callFioApi("get_fio_balance", json);
     // console.log("get_fio_balance ",result)
      //console.log("priv key ",keys4.privateKey);
     // console.log("pub key ", keys4.publicKey);
      expect(result.available).to.equal(240999967990);
    } catch (err) {
      console.log(err);
      expect(err).to.equal(null);
    }
  });

  it(`Failure -- funds locked Transfer 330 FIO to another account`, async () => {
    try {
      const result = await locksdk4.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 330000000000,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      expect(result).to.have.any.keys('status');
      expect(result).to.have.any.keys('fee_collected');
      expect(result).to.have.any.keys('block_num');
      expect(result).to.have.any.keys('transaction_id');
    }catch (err)
    {
     // console.log(err);
      expect(err.message).to.equal("Funds locked");
    }
  });
})

//run this test on previous version of contracts to create incoherent locks, then upgrade contracts and run tests to
//see that the locks are modified to become coherent after the contracts upgrade.
describe.skip(`B. Token unlocking tests, test previous version of contracts, produce incoherent locks and get_fio_balance error`, () => {

  it(`Transfer  locked FIO using canvote true, 12 lock periods, 3 second periods`, async () => {
    userA1 = await newUser(faucet);
    const result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys4.publicKey,
        can_vote: 1,
        periods: [
          {
            duration: 3,
            amount: 30000000000,
          },
          {
            duration: 6,
            amount: 30000000000,
          },
          {
            duration: 9,
            amount: 30000000000,
          },
          {
            duration: 12,
            amount: 30000000000,
          },
          {
            duration: 15,
            amount: 30000000000,
          },
          {
            duration: 18,
            amount: 30000000000,
          },
          {
            duration: 21,
            amount: 30000000000,
          },
          {
            duration: 24,
            amount: 30000000000,
          },
          {
            duration: 27,
            amount: 30000000000,
          },
          {
            duration: 30,
            amount: 30000000000,
          },
          {
            duration: 33,
            amount: 30000000000,
          },
          {
            duration: 36,
            amount: 30000000000,
          }
        ],
        amount: 360000000000,
        max_fee: config.maxFee,
        tpid: '',
        actor: userA1.account,
      }

    })
    expect(result.status).to.equal('OK')
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  })

  it(`Waiting 3 seconds`, async () => {
    console.log("            waiting 3 seconds ")
  })

  it(`Wait 3 seconds.`, async () => { await timeout(3000) }); //30 unlock

  it(`Transfer 28 FIO to another account`, async () => {

    const result = await locksdk4.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 28000000000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });

  it(`Waiting 12 seconds`, async () => {
    console.log("            waiting 12 seconds ")
  })

  it(`Wait  seconds.`, async () => { await timeout(12000) });      //120 available

  //this test is for testing with current contracts...
  //load the last versions contracts, then run this test.
  //be sure to record the pub and private keys of locksdk4 when
  //you run this test, then find the id of the locks that have been added
  //note the 0 in remaining locked amount for this grant.
  //next load onto the chain the fixed contracts.
  //then run the
  it(`Transfer locked FIO last few periods WAY out there, using canvote true, 12 lock periods`, async () => {
    userA1 = await newUser(faucet);
    const result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys4.publicKey,
        can_vote: 1,
        periods: [
          {
            duration: 3,
            amount: 30000000000,
          },
          {
            duration: 6,
            amount: 30000000000,
          },
          {
            duration: 9,
            amount: 30000000000,
          },
          {
            duration: 12,
            amount: 30000000000,
          },
          {
            duration: 15,
            amount: 30000000000,
          },
          {
            duration: 18,
            amount: 30000000000,
          },
          {
            duration: 21,
            amount: 30000000000,
          },
          {
            duration: 24,
            amount: 30000000000,
          },
          {
            duration: 23000000,
            amount: 30000000000,
          },
          {
            duration: 46000000,
            amount: 30000000000,
          },
          {
            duration: 69000000,
            amount: 30000000000,
          },
          {
            duration: 92000000,
            amount: 30000000000,
          }
        ],
        amount: 360000000000,
        max_fee: config.maxFee,
        tpid: '',
        actor: userA1.account,
      }

    })
    expect(result.status).to.equal('OK')
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  })

  it(`Transfer 89 FIO to another account`, async () => {
    const result = await locksdk4.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 89000000000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });

  it(`Waiting 6 seconds`, async () => {
    console.log("            waiting 6 seconds ")
  })

  it(`Wait 6 seconds.`, async () => { await timeout(6000) });    //90 more unlock 120 available.
  it(`Transfer 90 FIO to another account`, async () => {
    const result = await locksdk4.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 90000010000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });
  it(`Transfer 31 FIO to another account`, async () => {
    const result = await locksdk4.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 31000001000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });

  it(`Transfer 19 FIO to another account`, async () => {
    const result = await locksdk4.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 19000010010,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });

  it(`Waiting 9 seconds`, async () => {
    console.log("            waiting 6 seconds ")
  })

  it(`Wait 9 seconds.`, async () => { await timeout(9000) });    //90 more unlock 120 available.

  it(`Transfer 90 FIO to another account`, async () => {
    const result = await locksdk4.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 90000011000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });

  it(`Waiting 9 seconds`, async () => {
    console.log("            waiting 6 seconds ")
  })

  it(`Wait 9 seconds.`, async () => { await timeout(9000) });    //90 more unlock 120 available.

  it(`Get FIO balance for new account. available should NOT be the balance!!!!`, async () => {
    try {
      const json = {
        fio_public_key: keys4.publicKey
      }
      result = await callFioApi("get_fio_balance", json);
      // console.log("get_fio_balance ",result)
      console.log("priv key ",keys4.privateKey);
      console.log("pub key ", keys4.publicKey);
      expect(result.available).to.equal(result.balance);
    } catch (err) {
      console.log(err);
      expect(err).to.equal(null);
    }
  });

  //TEST mods of incoherent locks!!!!
  //fix incoherent lock grant using the keys for account owning a previously messed up set of locks test....this is dev only test.
  //run only this test after setting contracts version to a version that resolves incoherent locks.
  //use the priv and pub keys recorded from setting up the test by running this describe, then just run only this test
  // use ../fio/build/bin/clio -u http://localhost:8889 get table eosio eosio locktokensv2 --limit 1000 and look for the account with previously
  //incoherent locks and note that the lock was modified to become coherent.
  it.skip(`Transfer 1 FIO to another account from account with messed up locks, locks should correct on ID: 1 locktokensv2`, async () => {
    let incoherentLocksSdk = new FIOSDK('5JdxJu9jFETWa4iAbjPkWBCpELAycyZ3zZbiMA32tfqDrqHCcNe', 'FIO5epVVdvp2L3kKidwg2q6T459vT1t2hehYYffGM2ptoVFR2RHkN', config.BASE_URL, fetchJson);
    const result = await incoherentLocksSdk.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 1000011000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    //after this test runs use the id you noted when setting up the test,
    //note that the remaining locked tokens is now set correctly and that
    //the lock is now coherent!!!!
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
  });


  it(`Transfer 330 FIO to another account`, async () => {
    try {
      const result = await locksdk4.genericAction('transferTokens', {
        payeeFioPublicKey: userA1.publicKey,
        amount: 330000000000,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      expect(result).to.have.any.keys('status');
      expect(result).to.have.any.keys('fee_collected');
      expect(result).to.have.any.keys('block_num');
      expect(result).to.have.any.keys('transaction_id');
    }catch (err)
    {
       console.log(err);
       expect(err).to.equal(null);
     // expect(err.message).to.equal("Funds locked");
    }
  });
})
