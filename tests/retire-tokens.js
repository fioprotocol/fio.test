require('mocha');
const {expect, use} = require('chai');
const {newUser, existingUser, fetchJson, generateFioDomain, generateFioAddress, createKeypair, callFioApi, timeout, getAccountFromKey} = require('../utils.js');
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {getStakedTokenPool, getCombinedTokenPool, getGlobalSrpCount} = require("./Helpers/token-pool.js");
let faucet;

/**
 * Notes for running tests
 *
 * Updates should be made to fio.devtools to make dealing with the locked tokens easiser
 *
 * locked token accounts created in 15_create_locked_token_holder_test_accounts.sh must have
 * a larger "amount" value than the "amount" argument used in 17_emplace_test_grants_into_locked_tokens.sh
 *
 * TODO: Make a branch in fio.devtools with these additions
 *
 * 15_create_locked_token_holder_test_accounts.sh
 *
 * # Create locked token account userA5Keys
 * # Public key: 'FIO5ZiPCxxtND2Z9NvYQYVphGYiXhwDRiH4mbg3ENp6Bh6pGR2WjB'
 * # FIO Public Address (actor name): tkvlcmcdftuv'
 *
 * ./clio -u http://localhost:8889 push action -j fio.token trnsfiopubky '{"payee_public_key": "'FIO5ZiPCxxtND2Z9NvYQYVphGYiXhwDRiH4mbg3ENp6Bh6pGR2WjB'", "amount": 10000000000000, "max_fee": "1000000000000", "actor": "eosio","tpid":""}' -p eosio@active
 * echo "create userA5"
 * sleep 1
 *
 * # Create locked token account userA6Keys
 * # Public key: 'FIO5co2UAAAjVgwtaZMT8Uu7pAHHGAtWUzstqg7hZyJKVBWMW7ZDh'
 * # FIO Public Address (actor name): isqotfueflhg'
 *
 * ./clio -u http://localhost:8889 push action -j fio.token trnsfiopubky '{"payee_public_key": "'FIO5co2UAAAjVgwtaZMT8Uu7pAHHGAtWUzstqg7hZyJKVBWMW7ZDh'", "amount": 8000000000000, "max_fee": "1000000000000", "actor": "eosio","tpid":""}' -p eosio@active
 * echo "create userA6"
 * sleep 1
 *
 *
 * 17_emplace_test_grants_into_locked_tokens.sh
 *
 * # RETIRETEST3
 * ./clio -u http://localhost:8889 push action -j eosio addlocked '{"owner":"pzjjgjwwdm5v","amount":2000000000000,"locktype":2}' -p eosio@active
 * echo "create RETIRETEST3 grant"
 * sleep 1
 *
 * # RETIRETEST4
 * ./clio -u http://localhost:8889 push action -j eosio addlocked '{"owner":"c5mkju354ibi","amount":2000000000000,"locktype":3}' -p eosio@active
 * echo "create RETIRETEST4 grant"
 * sleep 1
 *
 * # userA5Keys
 * ./clio -u http://localhost:8889 push action -j eosio addlocked '{"owner":"tkvlcmcdftuv","amount":2000000000000,"locktype":2}' -p eosio@active
 * echo "create another grant for userA5"
 * sleep 1
 *
 * # userA6Keys
 * ./clio -u http://localhost:8889 push action -j eosio addlocked '{"owner":"isqotfueflhg","amount":2000000000000,"locktype":3}' -p eosio@active
 * echo "create another grant for userA6"
 * sleep 1
 */

before(async function () {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
});

describe(`************************** retire-tokens.js ************************** \n    A. Retire FIO Tokens`, function () {
  let userA, userA1, userA2;

  let userABal, userA1Bal, userA2Bal;

  const fundsAmount = 1000000000000

  before(async function () {
    userA = await newUser(faucet);
    // userA1 = await existingUser(RETIRETEST1.account, RETIRETEST1.privateKey, RETIRETEST1.publicKey, '', '');
    // userA2 = await existingUser(RETIRETEST2.account, RETIRETEST2.privateKey, RETIRETEST2.publicKey, '', '');

    userA1 = await newUser(faucet);
    userA2 = await newUser(faucet);
  });

  it.skip(`Transfer ${fundsAmount} FIO to userA FIO public key`, async function () {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    //console.log('Result: ', result)
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
  });
  it.skip(`Transfer ${fundsAmount} FIO to userA1 FIO public key`, async function () {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
  });

  /*
  Retire 1000 FIO tokens from a non-locks account with empty memo
  Observe:
  Account balance is updated
  Total tokens issued count is reduced by 1000
  */

  it(`Happy Test, Retire ${fundsAmount} SUFs from userA (empty memo)`, async function () {
    userABal = await userA.sdk.genericAction('getFioBalance', { });
    const result = await userA.sdk.genericAction('pushTransaction', {
      action: 'retire',
      account: 'fio.token',
      data: {
        quantity: fundsAmount,
        memo: "",
        actor: userA.account,
      }
    });
    expect(result.status).to.equal('OK');
    let newUserBal = await userA.sdk.genericAction('getFioBalance', { });
    expect(newUserBal.available).to.equal(userABal.available - fundsAmount);
    expect(newUserBal.balance).to.equal(userABal.balance - fundsAmount);
  });

  /*
  Retire 1000 FIO tokens from a Type 4 locked account with “test string” memo
  Observe:
  Account balance is updated
  Total tokens issued count is reduced by 1000
  Locks table is updated
  */

  // Lock set in fio.devtools 17_emplace_test_grants_into_locked_tokens.sh
  it(`Happy Test, Retire ${fundsAmount} SUFs from UserA1 (type 4 lock)`, async function () {
    userA1Bal = await userA1.sdk.genericAction('getFioBalance', {});
    const result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'retire',
      account: 'fio.token',
      data: {
        quantity: fundsAmount,
        memo: "test string",
        actor: userA1.account,
      }
    });
    expect(result.status).to.equal('OK');
    let newUserBal = await userA1.sdk.genericAction('getFioBalance', {});
    expect(newUserBal.available).to.equal(userA1Bal.available - fundsAmount);
    expect(newUserBal.balance).to.equal(userA1Bal.balance - fundsAmount);
  });

  /*
  Retire 1000 FIO tokens from a Type 1 locked account with “test string” memo,
  where some > 1000 tokens were unlocked and > 1000 are still locked and new funds have been sent in.
  Observe:
  Account balance is updated
  Total tokens issued count is reduced by 1000
  Locks table is updated and unlocked tokens remain the same
  */

  it.skip(`Happy Test, Retire ${fundsAmount} SUFs from UserA2 (type 1 lock)`, async function () {
    userA2Bal = await userA2.sdk.genericAction('getFioBalance', { });

    const result = await userA2.sdk.genericAction('pushTransaction', {
      action: 'retire',
      account: 'fio.token',
      data: {
        quantity: fundsAmount,
        memo: "test string",
        actor: userA2.account,
      }
    });
    expect(result.status).to.equal('OK');
    let newUserBal = await userA2.sdk.genericAction('getFioBalance', { });
    expect(newUserBal.available).to.equal(userA2Bal.available - fundsAmount);
    expect(newUserBal.balance).to.equal(userA2Bal.balance - fundsAmount);
  });

  it(`Sad Test, Retire 1 FIO token from userA2`, async function () {
    try {
      const result = await userA2.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: 1000000000,
          memo: "test string",
          actor: userA2.account,
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      //  console.log(err.json)
      expect(err.json.fields[0].error).to.equal("Minimum 1000 FIO has to be retired");
    }
  });

  it(`Sad Test, Retire 999999999999 FIO token from userA2`, async function () {
    try {
      const result = await userA2.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: 999999999999,
          memo: "test string",
          actor: userA2.account,
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.json.fields[0].error).to.equal("Minimum 1000 FIO has to be retired");
    }
  });

  it(`Sad Test, Retire ${fundsAmount} SUFs from userA1 (Insufficient funds)`, async function () {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: fundsAmount*1000,
          memo: "test string",
          actor: userA1.account,
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.json.fields[0].error).to.equal("Insufficient balance");

    }
  });

  it(`Sad Test, Retire ${fundsAmount} SUFs from userA2 (memo > 256)`, async function () {
    try {
      const result = await userA2.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: fundsAmount,
          memo: "I am a really long string I am a really long string I am a really long string I am a really long string I am a really long string I am a really long string I am a really long string I am a really long string I am a really long string I am a really long string I am a really long string I am a really long string 123456789",
          actor: userA2.account,
        }
      });
      expect(result).to.equal(null);

    } catch (err) {
      expect(err.json.fields[0].error).to.equal("memo has more than 256 bytes");
    }
  });
});

describe.only(`B. Retire locked FIO Tokens`, function () {
  let userA, userA1, userA2, userA3, userA4, userA5, userA6;
  let userALocks,userA1Locks, userA2Locks, userA3Locks, userA4Locks, userA5Locks, userA6Locks;
  let userABal, userA1Bal, userA2Bal, userA3Bal, userA4Bal, userA5Bal, userA6Bal;
  let RETIRETEST1, RETIRETEST2, RETIRETEST3, RETIRETEST4, userA5Keys, userA6Keys;

  const fundsAmount = 1000000000000

  before(async function () {
    userA = await newUser(faucet);

    // generating my own keys so I don't have to rely on fio.devtools
    RETIRETEST1 = await createKeypair();
    RETIRETEST2 = await createKeypair();
    RETIRETEST3 = await createKeypair();
    RETIRETEST4 = await createKeypair();
    userA5Keys = await createKeypair();
    userA6Keys = await createKeypair();
  });

  it(`Set two FIP-6 lock periods for userA1, expect status: OK`, async function () {
    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: RETIRETEST1.publicKey,
          can_vote: 0,
          periods: [
            { // > 1000 are unlocked
              "duration": 1,
              "amount": 1100000000000
            },
            { // > 1000 are still locked
              "duration": 3000,
              "amount": 1000000000000
            }
          ],
          amount: 2100000000000,
          max_fee: 40000000000,
          tpid: "",
          actor: faucet.account
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Locked tokens can only be transferred to new account');
      throw err;
    }

    await timeout(3000); // let those SUFs unlock
  });

  it(`init userA1 from existing keys`, async function () {
    userA1 = await existingUser(RETIRETEST1.account, RETIRETEST1.privateKey, RETIRETEST1.publicKey,'','');
    userA1Bal = await userA1.sdk.genericAction('getFioBalance', { });
  });

  it.skip(`Transfer ${fundsAmount} FIO to userA1 FIO public key`, async function () {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: RETIRETEST1.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
  });

  it(`try to retire < 1100000000000, expect OK`, async function () {
    let newUserBal;
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {//58000000000
          // quantity: fundsAmount,
          // quantity: 1100000000050, // this one so far is our culprit
          // quantity: 1000000000050,
          quantity: 1000500000000,
          // quantity: 2160000000000,
          // quantity: 2200000000000,
          memo: "test string",
          actor: userA1.account,
        }
      });
      newUserBal = await userA1.sdk.genericAction('getFioBalance', { });
      // console.log(newUserBal)
      expect(result.status).to.equal('OK');
      expect(newUserBal.balance).to.equal(userA1Bal.balance - 1000500000000)
      expect(newUserBal.available).to.equal(userA1Bal.available - 1000500000000)
    } catch (err) {
      newUserBal = await userA1.sdk.genericAction('getFioBalance', { });
      console.log(err, newUserBal)
      throw err;
    }

    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'lockedtokens',
      limit: 99999,
      reverse: true,
      show_payer: false
    }
    let found = false;
    let user;
    let row;
    const lockedtokens = await callFioApi("get_table_rows", json);
    for (user in lockedtokens.rows) {
      if (lockedtokens.rows[user].owner == userA1.account) {
        // break;
        row = lockedtokens.rows[user];
      }
    }
    // WTF where are the locks?
    console.log(row)
  });




  it.only(`Set three FIP-6 lock periods for userA2 and only unlock two of them, expect status: OK`, async function () {
    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: RETIRETEST2.publicKey,
          can_vote: 0,
          periods: [
            { // > 1000 are unlocked
              "duration": 1,
              "amount": 1100000000000
            },
            { // > 1000 are still locked
              "duration": 3000,
              "amount": 1000000000000
            },
            {
              "duration": 90000,
              "amount": 1000000000000
            }
          ],
          amount: 3100000000000,
          max_fee: 40000000000,
          tpid: "",
          actor: faucet.account
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Locked tokens can only be transferred to new account');
      throw err;
    }

    await timeout(3000); // let those SUFs unlock
  });

  it.only(`init userA2 from existing keys`, async function () {
    userA2 = await existingUser(RETIRETEST2.account, RETIRETEST2.privateKey, RETIRETEST2.publicKey,'','');
    userA2Bal = await userA2.sdk.genericAction('getFioBalance', { });
  });

  it.only(`(bug - integer weirdness) try to retire > 1100000000000, expect Error`, async function () {
    let newUserBal;
    try {
      const result = await userA2.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: 1100000000050, // this one so far is our culprit
          memo: "test string",
          actor: userA2.account,
        }
      });
      newUserBal = await userA2.sdk.genericAction('getFioBalance', { });
      // console.log(newUserBal)
      expect(newUserBal.available).to.equal(userA2Bal.available)
    } catch (err) {
      newUserBal = await userA2.sdk.genericAction('getFioBalance', { });
      console.log(err, newUserBal)
      throw err;

    }
  });









  it(`Set one FIP-6 lock period for userA3, expect status: OK`, async function () {
    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: RETIRETEST3.publicKey,
          can_vote: 0,
          periods: [
            { // all are unlocked
              "duration": 3000,
              "amount": 900000000000
            }
            // { // > 1000 are still locked
            //   "duration": 10000000,
            //   "amount": 1100000000000
            // }
          ],
          amount: 900000000000,
          max_fee: 40000000000,
          tpid: "",
          actor: faucet.account
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Locked tokens can only be transferred to new account');
      throw err;
    }

    await timeout(3000); // Don't let ALL the SUFs unlock this time
  });

  it(`init userA3 from existing keys`, async function () {
    userA3 = await existingUser(RETIRETEST3.account, RETIRETEST3.privateKey, RETIRETEST3.publicKey,'','');
    userA3Bal = await userA3.sdk.genericAction('getFioBalance', { });
  });

  //TODO: Try retiring < 1100000000000, expect ???
  it(`try to retire < 1100000000000, expect OK because amount is still > 1000000000000`, async function () {
    try {
      const result = await userA3.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: 1000000000000,
          memo: "test string",
          actor: userA3.account,
        }
      });
      expect(result.status).to.equal('OK');
      let newUserBal = await userA3.sdk.genericAction('getFioBalance', { });
      console.log(newUserBal)
      expect(newUserBal.balance).to.equal(userA3Bal.balance - 1000000000000);
      // expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  // it(`Set FIP-6 lock for userA6, expect status: OK`, async function () {
  //   try {
  //     const result = await faucet.genericAction('pushTransaction', {
  //       action: 'trnsloctoks',
  //       account: 'fio.token',
  //       data: {
  //         // payee_public_key: RETIRETEST2.publicKey,
  //         payee_public_key: userA5Keys.publicKey,
  //         can_vote: 0,
  //         periods: [
  //           { // < 1000 are unlocked
  //             "duration": 3000,
  //             "amount": 900000000000
  //           },
  //           { // > 1000 are still locked
  //             "duration": 10000000,
  //             "amount": 1100000000000
  //           }
  //         ],
  //         amount: 2000000000000,
  //         max_fee: 40000000000,
  //         tpid: "",
  //         actor: faucet.account
  //       }
  //     });
  //     expect(result.status).to.equal('OK');
  //   } catch (err) {
  //     expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
  //     expect(err.errorCode).to.equal(400);
  //     expect(err.json.fields[0].error).to.equal('Locked tokens can only be transferred to new account');
  //   }
  //
  //   await timeout(3000); // Don't let ALL the SUFs unlock this time
  // });


  //TODO: Try retiring > 900000000000, expect to have some left over
  //TODO: BUG - wraparound
  // it(`try to retire > 900000000000, expect ?????`, async function () {
  //   userA6Bal = await userA2.sdk.genericAction('getFioBalance', {fioPublicKey: userA6.publicKey});
  //   try {
  //     const result = await userA2.sdk.genericAction('pushTransaction', {
  //       action: 'retire',
  //       account: 'fio.token',
  //       data: {
  //         quantity: 1000000000000,
  //         memo: "test string",
  //         actor: userA2.account,
  //       }
  //     });
  //     let newUserBal = await userA2.sdk.genericAction('getFioBalance', {fioPublicKey: userA6.publicKey});
  //     console.log(newUserBal)
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     expect(err).to.equal(null)
  //   }
  // });







  /*
  Retire 1000 FIO tokens from a FIP-6 locked account with “test string” memo,
  where some > 1000 tokens were unlocked and > 1000 are still locked.
  Observe:
  Account balance is updated
  Total tokens issued count is reduced by 1000
  Locks table is updated and unlocked tokens remain the same
  */


  // it(`(Sad test) Set FIP-6 lock for UserA5, expect Error: Locked tokens can only be transferred to new account`, async function () {
  //   try {
  //     const result = await userA.sdk.genericAction('pushTransaction', {
  //       action: 'trnsloctoks',
  //       account: 'fio.token',
  //       data: {
  //         payee_public_key: userA5Keys.publicKey,
  //         can_vote: 0,
  //         periods: [
  //           { // > 1000 are unlocked
  //             "duration": 1,
  //             "amount": 1100000000000
  //           },
  //           { // > 1000 are still locked
  //             "duration": 10000,
  //             "amount": 1100000000000
  //           }
  //         ],
  //         amount: 2200000000000,
  //         max_fee: 40000000000,
  //         tpid: "",
  //         actor: userA.account
  //       }
  //     });
  //     expect(result.status).to.equal('OK');
  //   } catch (err) {
  //     expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
  //     expect(err.errorCode).to.equal(400);
  //     expect(err.json.fields[0].error).to.equal('Locked tokens can only be transferred to new account');
  //   }
  //
  //   await timeout(1000); // let those SUFs unlock
  // });

  // it(`Happy Test, Retire ${fundsAmount} SUFs from UserA2 (FIP-6 Lock)`, async function () {
  //   userA5Bal = await userA2.sdk.genericAction('getFioBalance', { });
  //   const result = await userA2.sdk.genericAction('pushTransaction', {
  //     action: 'retire',
  //     account: 'fio.token',
  //     data: {
  //       quantity: fundsAmount,
  //       memo: "test string",
  //       actor: userA2.account,
  //     }
  //   });
  //   expect(result.status).to.equal('OK');
  //   let newUserBal = await userA2.sdk.genericAction('getFioBalance', { });
  //   expect(newUserBal.available).to.be.greaterThanOrEqual(userA5Bal.available - fundsAmount);
  //   expect(newUserBal.balance).to.equal(userA5Bal.balance - fundsAmount);
  //
  //   const json = {
  //     json: true,
  //     code: 'eosio',
  //     scope: 'eosio',
  //     table: 'lockedtokens',
  //     limit: 99999,
  //     reverse: true,
  //     show_payer: false
  //   }
  //   let found = false;
  //   let user = "";
  //   let row;
  //   let lockedtokens = await callFioApi("get_table_rows", json);
  //   for (user in lockedtokens.rows) {
  //     if (lockedtokens.rows[user].owner == userA2.account) {
  //       // break;
  //       row = lockedtokens.rows[user];
  //     }
  //   }
  //
  //   // let row = lockedtokens.rows[user];
  //   expect(row.remaining_locked_amount).to.equal(userA5Bal.balance - userA5Bal.available);
  //   expect(row.remaining_locked_amount).to.equal(newUserBal.balance - newUserBal.available);
  //   expect(row.grant_type).to.equal(2);
  //   expect(row.remaining_locked_amount).to.equal(userA5Bal.balance - newUserBal.balance);
  // });

  /*
  Retire 1000 FIO tokens from a FIP-6 locked account with “test string” memo,
  where some < 1000 tokens were unlocked and > 1000 are still locked.

  Observe:
  Account balance is updated
  Total tokens issued count is reduced by 1000
  Locks table is updated and both locked and unlocked tokens are adjusted
  */

  // it(`Happy Test, Retire ${fundsAmount} SUFs from UserA6 (FIP-6 Lock)`, async function () {
  //   let userBal = await userA6.sdk.genericAction('getFioBalance', {fioPublicKey: userA6.publicKey});
  //   const result = await userA6.sdk.genericAction('pushTransaction', {
  //     action: 'retire',
  //     account: 'fio.token',
  //     data: {
  //       quantity: fundsAmount,
  //       memo: "test string",
  //       actor: userA6.account,
  //     }
  //   });
  //   expect(result.status).to.equal('OK');
  //   let newUserBal = await userA6.sdk.genericAction('getFioBalance', {fioPublicKey: userA6.publicKey});
  //   expect(newUserBal.available).to.equal(userBal.available - fundsAmount);
  //   expect(newUserBal.balance).to.equal(userBal.balance - fundsAmount);
  //
  //   const json = {
  //     json: true,
  //     code: 'eosio',
  //     scope: 'eosio',
  //     table: 'lockedtokens',
  //     limit: 99999,
  //     reverse: true,
  //     show_payer: false
  //   }
  //   let found = false;
  //   let user = "";
  //   let lockedtokens = await callFioApi("get_table_rows", json);
  //   for (user in lockedtokens.rows) {
  //     if (lockedtokens.rows[user].owner == userA6.account) {
  //       break;
  //     }
  //   }
  //
  //   expect(userBal.available - newUserBal.available).to.equal(fundsAmount);
  //   expect(userBal.balance - newUserBal.balance).to.equal(fundsAmount);
  //
  //   let row = lockedtokens.rows[user];
  //   expect(row.remaining_locked_amount).to.equal(userBal.balance - userBal.available);
  //   expect(row.remaining_locked_amount).to.equal(newUserBal.balance - newUserBal.available);
  //   expect(row.grant_type).to.equal(3);
  //   expect(row.remaining_locked_amount).to.equal(userBal.balance - newUserBal.balance);
  // });

});

describe.only(`C. (unhappy) Try to retire from an account that has staked tokens`, function () {
  let bp1, bp2, bp3, userA, userA4, userB, userC, userP, prevFundsAmount, locksdk, keys, userKeys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  let userABal;

  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 1000000000000;

  // const RETIRETEST4 = {
  //   account: 'c5mkju354ibi',
  //   publicKey: 'FIO6AsajVZBdmWBuxTUFURqGBk822L11q8BpWH8vBXyteiGeU8mRX',
  //   privateKey:'5K8gtheotX9pXEpswmSs52Hg1rDUHKiD1JYTSMfJqCkfhEa59si'
  // }

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    userP = await newUser(faucet);
    faucetKeys = await createKeypair();
    userKeys = await createKeypair();

    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: userKeys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 120,
            amount: 5000000000000,
          },
          {
            duration: 180,
            amount: 4000000000000,
          },
          {
            duration: 1204800,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: faucet.account,
      }
    });

    // transfer some test FIO
    await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: userKeys.publicKey,
      amount: fundsAmount*2,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });

    // register our proxy
    await userP.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: userP.address,
        actor: userP.account,
        max_fee: config.api.register_proxy.fee
      }
    });

    userA = await existingUser(userKeys.account, userKeys.privateKey, userKeys.publicKey,'','');
    userABal = await userA.sdk.genericAction('getFioBalance', { });

    // proxy so userA can stake
    await userA.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userA.address,
        actor: userA.account,
        max_fee: config.api.proxy_vote.fee
      }
    });
  });

  it(`stake 1000 FIO from userA`, async () => {
    let stakedTokenPool, combinedTokenPool, globalSrpCount, newStakedTokenPool, newCombinedTokenPool, newGlobalSrpCount;
    let newUserBal;
    stakedTokenPool = await getStakedTokenPool();
    combinedTokenPool = await getCombinedTokenPool();
    globalSrpCount = await getGlobalSrpCount();
    userABal = await userA.sdk.genericAction('getFioBalance', { });

    try {
      const result = await userA.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA.address,
          amount: stakeAmt,
          actor: userA.account,
          max_fee: config.api.stake_fio_tokens.fee,
          tpid: userP.address
        }
      });
      newUserBal = await userA.sdk.genericAction('getFioBalance', {});
      newStakedTokenPool = await getStakedTokenPool();
      newCombinedTokenPool = await getCombinedTokenPool();
      newGlobalSrpCount = await getGlobalSrpCount();
      expect(result).to.have.all.keys('status', 'fee_collected');
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.stake_fio_tokens.fee);
      expect(newUserBal.staked - userABal.staked).to.equal(stakeAmt);
      expect(newStakedTokenPool).to.be.greaterThan(stakedTokenPool);
      expect(newStakedTokenPool - stakedTokenPool).to.equal(stakeAmt);
      // expect(newCombinedTokenPool - combinedTokenPool).to.equal(stakeAmt);
      // expect(newGlobalSrpCount - globalSrpCount).to.equal(newBalA.srps);
    } catch (err) {
      newUserBal = await userA.sdk.genericAction('getFioBalance', {});
      console.log(err, newUserBal)
      throw err;
    }
  });

  it(`retire ${fundsAmount} SUFs from userA, expect Error: Account staking cannot retire`, async function () {
    let newUserBal;
    try {
      const result = await userA.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: fundsAmount,
          memo: "test string",
          actor: userA.account,
        }
      });
      newUserBal = await userA.sdk.genericAction('getFioBalance', {});
      console.log(newUserBal)
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      newUserBal = await userA.sdk.genericAction('getFioBalance', {});
      expect(err.json.fields[0].error).to.equal("Account staking cannot retire.");
    }
  });
});




















// describe(`D. Retire an amount less than the number of locked tokens`, function () {
//   let userA, userA1, userA2, userA3, userA4, userA5, userA6, userA7, userA8
//
//   const RETIRETEST1 = {
//     account: 'jbx4oaspu1h1',
//     publicKey: 'FIO6wrUvBNGiKokWkwh3JDnTTXM1P5xj25G7fqhWRzpRbucPiQv16',
//     privateKey: '5JmNogi2RUzkueWcpdg2fSLFX3VJ7VAFtsvPLnsu3QdwTDmLBuM'
//   }
//
//   const RETIRETEST2 = {
//     account:'z4qqs4cugjfa',
//     publicKey:'FIO6py1nZ3Vk61oqSAVudh79apo5vkDaFkDHQeHF45EidYmuYUT38',
//     privateKey: '5KYPFrVdnrKNJkStfjmkq6LLZAiwa46yyiaLrPSBCsHpBNwrytS'
//   }
//
//   const RETIRETEST3 = {
//     account:'pzjjgjwwdm5v',
//     publicKey: 'FIO6kifTDXvnbS8T7Bvuk4zL3d7bysiZGV2s2vQpTnf5oT31CFqAu',
//     privateKey: '5Hs4PZcwsPHVkfWrUVRybikEx5zy92CVYX81s98XPwK1jXWYoEL'
//   }
//
//   const RETIRETEST4 = {
//     account: 'c5mkju354ibi',
//     publicKey: 'FIO6AsajVZBdmWBuxTUFURqGBk822L11q8BpWH8vBXyteiGeU8mRX',
//     privateKey:'5K8gtheotX9pXEpswmSs52Hg1rDUHKiD1JYTSMfJqCkfhEa59si'
//   }
//
//   const userA5Keys = {
//     account: 'tkvlcmcdftuv',
//     publicKey: 'FIO5ZiPCxxtND2Z9NvYQYVphGYiXhwDRiH4mbg3ENp6Bh6pGR2WjB',
//     privateKey: '5JY4WVpxVHcuWuvHpwDAxJL85xNR5nLeq2V2eyen2pcBybVhhnt'
//   }
//
//   const userA6Keys = {
//     account: 'isqotfueflhg',
//     publicKey: 'FIO5co2UAAAjVgwtaZMT8Uu7pAHHGAtWUzstqg7hZyJKVBWMW7ZDh',
//     privateKey: '5JdFRXbxXsKvXWFEuX2GTTakr5oqkhsDVjyXJuUvT8kakgQtmzG'
//   }
//
//   const fundsAmount = 1000000000000
//
//   let userALocks,userA1Locks, userA2Locks, userA3Locks, userA4Locks, userA5Locks, userA6Locks;
//
//   let userABal, userA1Bal, userA2Bal, userA3Bal, userA4Bal, userA5Bal, userA6Bal;
//
//   before(async function () {
//     userA = await newUser(faucet);
//     userA1 = await existingUser(RETIRETEST1.account, RETIRETEST1.privateKey, RETIRETEST1.publicKey,'','');
//     userA2 = await existingUser(RETIRETEST2.account, RETIRETEST2.privateKey, RETIRETEST2.publicKey,'','');
//     userA3 = await existingUser(RETIRETEST3.account, RETIRETEST3.privateKey, RETIRETEST3.publicKey,'','');
//     userA4 = await existingUser(RETIRETEST4.account, RETIRETEST4.privateKey, RETIRETEST4.publicKey,'','');
//     userA5 = await existingUser(userA5Keys.account, userA5Keys.privateKey, userA5Keys.publicKey,'','');
//     userA6 = await existingUser(userA6Keys.account, userA6Keys.privateKey, userA6Keys.publicKey,'','');
//
//     // console.log(`Transfer ${fundsAmount} FIO to userA FIO public key`); //, async function () {
//     const result = await faucet.genericAction('transferTokens', {
//       payeeFioPublicKey: userA.publicKey,
//       amount: fundsAmount,
//       maxFee: config.api.transfer_tokens_pub_key.fee,
//       technologyProviderId: ''
//     });
//     //console.log('Result: ', result)
//     expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
//     // });
//     //
//     // it(`get all balances`, async function () {
//     userABal = await userA.sdk.genericAction('getFioBalance', {});
//     userA1Bal = await userA1.sdk.genericAction('getFioBalance', {});
//     userA2Bal = await userA2.sdk.genericAction('getFioBalance', {});
//     userA3Bal = await userA3.sdk.genericAction('getFioBalance', {});
//     userA4Bal = await userA4.sdk.genericAction('getFioBalance', {});
//     userA5Bal = await userA5.sdk.genericAction('getFioBalance', {});
//     userA6Bal = await userA6.sdk.genericAction('getFioBalance', {});
//
//     // let userALocks,userA1Locks,userA1Locks,userA3Locks,userA4Locks,userA5Locks,userA6Locks;
//     const json = {
//       json: true,
//       code: 'eosio',
//       scope: 'eosio',
//       table: 'lockedtokens',
//       limit: 99999,
//       reverse: true,
//       show_payer: false
//     }
//     let found = false;
//     let user;
//     const lockedtokens = await callFioApi("get_table_rows", json);
//     for (user in lockedtokens.rows) {
//       if (lockedtokens.rows[user].owner == userA.account) {
//         // break;
//         userALocks = lockedtokens.rows[user];
//       }
//       if (lockedtokens.rows[user].owner == userA1.account) {
//         // break;
//         userA1Locks = lockedtokens.rows[user];
//       }
//       if (lockedtokens.rows[user].owner == userA2.account) {
//         // break;
//         userA2Locks = lockedtokens.rows[user];
//       }
//       if (lockedtokens.rows[user].owner == userA3.account) {
//         // break;
//         userA3Locks = lockedtokens.rows[user];
//       }
//
//       if (lockedtokens.rows[user].owner == userA4.account) {
//         // break;
//         userA4Locks = lockedtokens.rows[user];
//       }
//
//       if (lockedtokens.rows[user].owner == userA5.account) {
//         // break;
//         userA5Locks = lockedtokens.rows[user];
//       }
//       if (lockedtokens.rows[user].owner == userA6.account) {
//         // break;
//         userA6Locks = lockedtokens.rows[user];
//       }
//     }
//     // expect(lockedtokens.rows[user].remaining_locked_amount).to.equal(userBal.balance - userBal.available);
//
//     console.log(`bal: ${userA2Bal.balance};   locks: ${userA2Locks.remaining_locked_amount}`);
//     console.log('balances retrieved. userA2:', userA2Locks, userA2Bal);
//
//     await timeout(1000);
//   });
//
//   it(`try to retire from userA2`, async function () {
//     userA2Bal = await userA2.sdk.genericAction('getFioBalance', { });
//
//     try {
//       const result = await userA2.sdk.genericAction('pushTransaction', {
//         action: 'retire',
//         account: 'fio.token',
//         data: {
//           quantity: userA2Locks.remaining_locked_amount,
//           // quantity: userA2Locks.remaining_locked_amount - 69,
//           // quantity: userA2Locks.remaining_locked_amount + 69,
//           memo: "test string",
//           actor: userA2.account,
//         }
//       });//1000000000050
//       expect(result.status).to.equal('OK');
//     } catch (err) {
//       expect(err).to.equal(null);
//     }
//
//
//
//     let newUserBal = await userA2.sdk.genericAction('getFioBalance', { });
//     // let balDiff = userBal.balance - newUserBal.balance
//
//
//     let availDiff = userA2Bal.available - newUserBal.available
//     let availLockDiff = userA2Bal.available - userA2Locks.total_grant_amount
//     let balLockDiff = userA2Bal.balance - userA2Locks.total_grant_amount
//
//     // let asdf =
//     expect(userA2Bal.balance - newUserBal.balance).to.equal(userA2Locks.total_grant_amount);
//     // expect
//
//
//
//
//
//
//
//
//
//     // expect(newUserBal.available).to.equal(userBal.available - fundsAmount);
//     // expect(newUserBal.balance).to.equal(userBal.balance - fundsAmount);
//
//     const json = {
//       json: true,
//       code: 'eosio',
//       scope: 'eosio',
//       table: 'lockedtokens',
//       limit: 99999,
//       reverse: true,
//       show_payer: false
//     }
//     let found = false;
//     let user = "";
//     const lockedtokens = await callFioApi("get_table_rows", json);
//     for (user in lockedtokens.rows) {
//       if (lockedtokens.rows[user].owner == userA2.account) {
//         break;
//       }
//     }
//
//
//     // TODO: SHould the lock still be here after "retiring" the tokens?
//     // expect(userBal.available - newUserBal.available).to.equal(fundsAmount);
//     // expect(userBal.balance - newUserBal.balance).to.equal(fundsAmount);
//
//     let row = lockedtokens.rows[user];
//     // console.log(row);
//     /**
//      * 200000000000000
//      * 200000000000000
//      *
//      * 1000000000000
//      */
//
//     expect(newUserBal.balance).to.equal(userA2Bal.balance - row.total_grant_amount);
//     // expect(row.remaining_locked_amount).to.equal(newUserBal.balance - newUserBal.available);
//     expect(row.grant_type).to.equal(1);
//     // expect(row.remaining_locked_amount).to.equal(userBal.balance - newUserBal.balance);
//   });
//
//   it(`get all balances after retiring tokens`, async function () {
//     userABal = await userA.sdk.genericAction('getFioBalance', {});
//     userA1Bal = await userA1.sdk.genericAction('getFioBalance', {});
//     userA2Bal = await userA2.sdk.genericAction('getFioBalance', {});
//     userA3Bal = await userA3.sdk.genericAction('getFioBalance', {});
//     userA4Bal = await userA4.sdk.genericAction('getFioBalance', {});
//     userA5Bal = await userA5.sdk.genericAction('getFioBalance', {});
//     userA6Bal = await userA6.sdk.genericAction('getFioBalance', {});
//
//     let userALocks, userA1Locks, userA2Locks, userA3Locks, userA4Locks, userA5Locks,userA6Locks;
//
//     const json = {
//       json: true,
//       code: 'eosio',
//       scope: 'eosio',
//       table: 'lockedtokens',
//       limit: 99999,
//       reverse: true,
//       show_payer: false
//     }
//     let found = false;
//     let user;
//     const lockedtokens = await callFioApi("get_table_rows", json);
//     for (user in lockedtokens.rows) {
//       if (lockedtokens.rows[user].owner == userA.account) {
//         // break;
//         userALocks = lockedtokens.rows[user];
//       }
//       if (lockedtokens.rows[user].owner == userA1.account) {
//         // break;
//         userA1Locks = lockedtokens.rows[user];
//       }
//       if (lockedtokens.rows[user].owner == userA2.account) {
//         // break;
//         userA2Locks = lockedtokens.rows[user];
//       }
//       if (lockedtokens.rows[user].owner == userA3.account) {
//         // break;
//         userA3Locks = lockedtokens.rows[user];
//       }
//
//       if (lockedtokens.rows[user].owner == userA4.account) {
//         // break;
//         userA4Locks = lockedtokens.rows[user];
//       }
//
//       if (lockedtokens.rows[user].owner == userA5.account) {
//         // break;
//         userA5Locks = lockedtokens.rows[user];
//       }
//       if (lockedtokens.rows[user].owner == userA6.account) {
//         // break;
//         userA6Locks = lockedtokens.rows[user];
//       }
//     }
//     // expect(lockedtokens.rows[user].remaining_locked_amount).to.equal(userBal.balance - userBal.available);
//
//     console.log('balances retrieved')
//   });
//
//   it(`lock`, async function () {
//
//   });
//
//   it(`try to retire from userA1`, async function () {
//     userA1Bal = await userA1.sdk.genericAction('getFioBalance', { });
//
//     try {
//       const result = await userA1.sdk.genericAction('pushTransaction', {
//         action: 'retire',
//         account: 'fio.token',
//         data: {
//           // quantity: userA1Locks.remaining_locked_amount,
//           // quantity: userA1Locks.remaining_locked_amount - 50,
//           quantity: userA1Locks.remaining_locked_amount + 50,
//           memo: "test string",
//           actor: userA1.account,
//         }
//       });
//       expect(result.status).to.equal('OK');
//     } catch (err) {
//       expect(err).to.equal(null)
//     }
//
//
//
//     let newUserBal = await userA1.sdk.genericAction('getFioBalance', { });
//     let balDiff = userA1Bal.balance - newUserBal.balance
//
//
//     let availDiff = userA1Bal.available - newUserBal.available
//     let availLockDiff = userA1Bal.available - userA1Locks.total_grant_amount
//     let balLockDiff = userA1Bal.balance - userA1Locks.total_grant_amount
//
//
//
//     expect(userA1Bal.balance - newUserBal.balance).to.equal(userA1Locks.total_grant_amount + 50);
//     // expect
//
//
//
//
//
//
//
//
//
//     // expect(newUserBal.available).to.equal(userBal.available - fundsAmount);
//     // expect(newUserBal.balance).to.equal(userBal.balance - fundsAmount);
//
//     const json = {
//       json: true,
//       code: 'eosio',
//       scope: 'eosio',
//       table: 'lockedtokens',
//       limit: 99999,
//       reverse: true,
//       show_payer: false
//     }
//     let found = false;
//     let user = "";
//     const lockedtokens = await callFioApi("get_table_rows", json);
//     for (user in lockedtokens.rows) {
//       if (lockedtokens.rows[user].owner == userA1.account) {
//         break;
//       }
//     }
//     // expect(userBal.available - newUserBal.available).to.equal(fundsAmount);
//     // expect(userBal.balance - newUserBal.balance).to.equal(fundsAmount);
//
//     let row = lockedtokens.rows[user];
//     // console.log(row);
//     /**
//      * 200000000000000
//      * 200000000000000
//      *
//      * 1000000000000
//      */
//
//     expect(newUserBal.balance).to.equal(userA1Bal.balance - (row.total_grant_amount + 50));
//     // expect(row.remaining_locked_amount).to.equal(newUserBal.balance - newUserBal.available);
//     expect(row.grant_type).to.equal(4);
//     // expect(row.remaining_locked_amount).to.equal(userBal.balance - newUserBal.balance);
//   });
//
// });

// describe(`E. Retire an amount greater than the number of locked tokens`, function () {
//   let userA, userA1, userA2, userA3, userA4, userA5, userA6, userA7, userA8
//
//   const RETIRETEST1 = {
//     account: 'jbx4oaspu1h1',
//     publicKey: 'FIO6wrUvBNGiKokWkwh3JDnTTXM1P5xj25G7fqhWRzpRbucPiQv16',
//     privateKey: '5JmNogi2RUzkueWcpdg2fSLFX3VJ7VAFtsvPLnsu3QdwTDmLBuM'
//   }
//
//   const RETIRETEST2 = {
//     account:'z4qqs4cugjfa',
//     publicKey:'FIO6py1nZ3Vk61oqSAVudh79apo5vkDaFkDHQeHF45EidYmuYUT38',
//     privateKey: '5KYPFrVdnrKNJkStfjmkq6LLZAiwa46yyiaLrPSBCsHpBNwrytS'
//   }
//
//   const RETIRETEST3 = {
//     account:'pzjjgjwwdm5v',
//     publicKey: 'FIO6kifTDXvnbS8T7Bvuk4zL3d7bysiZGV2s2vQpTnf5oT31CFqAu',
//     privateKey: '5Hs4PZcwsPHVkfWrUVRybikEx5zy92CVYX81s98XPwK1jXWYoEL'
//   }
//
//   const RETIRETEST4 = {
//     account: 'c5mkju354ibi',
//     publicKey: 'FIO6AsajVZBdmWBuxTUFURqGBk822L11q8BpWH8vBXyteiGeU8mRX',
//     privateKey:'5K8gtheotX9pXEpswmSs52Hg1rDUHKiD1JYTSMfJqCkfhEa59si'
//   }
//
//   const userA5Keys = {
//     account: 'tkvlcmcdftuv',
//     publicKey: 'FIO5ZiPCxxtND2Z9NvYQYVphGYiXhwDRiH4mbg3ENp6Bh6pGR2WjB',
//     privateKey: '5JY4WVpxVHcuWuvHpwDAxJL85xNR5nLeq2V2eyen2pcBybVhhnt'
//   }
//
//   const userA6Keys = {
//     account: 'isqotfueflhg',
//     publicKey: 'FIO5co2UAAAjVgwtaZMT8Uu7pAHHGAtWUzstqg7hZyJKVBWMW7ZDh',
//     privateKey: '5JdFRXbxXsKvXWFEuX2GTTakr5oqkhsDVjyXJuUvT8kakgQtmzG'
//   }
//
//   const fundsAmount = 2000000000000
//
//   before(async function () {
//     userA = await newUser(faucet);
//     userA1 = await existingUser(RETIRETEST1.account, RETIRETEST1.privateKey, RETIRETEST1.publicKey,'','');
//     userA2 = await existingUser(RETIRETEST2.account, RETIRETEST2.privateKey, RETIRETEST2.publicKey,'','');
//     userA3 = await existingUser(RETIRETEST3.account, RETIRETEST3.privateKey, RETIRETEST3.publicKey,'','');
//     userA4 = await existingUser(RETIRETEST4.account, RETIRETEST4.privateKey, RETIRETEST4.publicKey,'','');
//     userA5 = await existingUser(userA5Keys.account, userA5Keys.privateKey, userA5Keys.publicKey,'','');
//     userA6 = await existingUser(userA6Keys.account, userA6Keys.privateKey, userA6Keys.publicKey,'','');
//
//
//     console.log(`Transfer ${fundsAmount} FIO to userA FIO public key`); //, async function () {
//     const result = await faucet.genericAction('transferTokens', {
//       payeeFioPublicKey: userA.publicKey,
//       amount: fundsAmount,
//       maxFee: config.api.transfer_tokens_pub_key.fee,
//       technologyProviderId: ''
//     });
//     //console.log('Result: ', result)
//     expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
//   });
//
//   it(`get all balances`, async function () {
//     let userABal = await userA.sdk.genericAction('getFioBalance', {});
//     let userA1Bal = await userA.sdk.genericAction('getFioBalance', {});
//     let userA2Bal = await userA.sdk.genericAction('getFioBalance', {});
//     let userA3Bal = await userA.sdk.genericAction('getFioBalance', {});
//     let userA4Bal = await userA.sdk.genericAction('getFioBalance', {});
//     let userA5Bal = await userA.sdk.genericAction('getFioBalance', {});
//     let userA6Bal = await userA.sdk.genericAction('getFioBalance', {});
//
//     let userALocks,userA1Locks,userA2Locks,userA3Locks,userA4Locks,userA5Locks,userA6Locks;
//
//     const json = {
//       json: true,
//       code: 'eosio',
//       scope: 'eosio',
//       table: 'lockedtokens',
//       limit: 99999,
//       reverse: true,
//       show_payer: false
//     }
//     let found = false;
//     let user;
//     const lockedtokens = await callFioApi("get_table_rows", json);
//     for (user in lockedtokens.rows) {
//       if (lockedtokens.rows[user].owner == userA.account) {
//         // break;
//         userALocks = lockedtokens.rows[user];
//       }
//       if (lockedtokens.rows[user].owner == userA1.account) {
//         // break;
//         userA1Locks = lockedtokens.rows[user];
//       }
//       if (lockedtokens.rows[user].owner == userA2.account) {
//         // break;
//         userA2Locks = lockedtokens.rows[user];
//       }
//       if (lockedtokens.rows[user].owner == userA3.account) {
//         // break;
//         userA3Locks = lockedtokens.rows[user];
//       }
//
//       if (lockedtokens.rows[user].owner == userA4.account) {
//         // break;
//         userA4Locks = lockedtokens.rows[user];
//       }
//
//       if (lockedtokens.rows[user].owner == userA5.account) {
//         // break;
//         userA5Locks = lockedtokens.rows[user];
//       }
//       if (lockedtokens.rows[user].owner == userA6.account) {
//         // break;
//         userA6Locks = lockedtokens.rows[user];
//       }
//     }
//     // expect(lockedtokens.rows[user].remaining_locked_amount).to.equal(userBal.balance - userBal.available);
//
//     console.log('balances retrieved')
//   });
//
//   it(`try to retire `, async function () {
//     let userBal = await userA1.sdk.genericAction('getFioBalance', { });
//     const result = await userA1.sdk.genericAction('pushTransaction', {
//       action: 'retire',
//       account: 'fio.token',
//       data: {
//         quantity: fundsAmount,
//         memo: "test string",
//         actor: userA1.account,
//       }
//     });
//     expect(result.status).to.equal('OK');
//
//     let newUserBal = await userA1.sdk.genericAction('getFioBalance', { });
//     expect(newUserBal.available).to.equal(userBal.available - fundsAmount);
//     expect(newUserBal.balance).to.equal(userBal.balance - fundsAmount);
//
//     const json = {
//       json: true,
//       code: 'eosio',
//       scope: 'eosio',
//       table: 'lockedtokens',
//       limit: 99999,
//       reverse: true,
//       show_payer: false
//     }
//     let found = false;
//     let user = "";
//     const lockedtokens = await callFioApi("get_table_rows", json);
//     for (user in lockedtokens.rows) {
//       if (lockedtokens.rows[user].owner == userA1.account) {
//         break;
//       }
//     }
//     expect(userBal.available - newUserBal.available).to.equal(fundsAmount);
//     expect(userBal.balance - newUserBal.balance).to.equal(fundsAmount);
//
//     let row = lockedtokens.rows[user];
//
//     /**
//      * 200000000000000
//      * 200000000000000
//      *
//      * 1000000000000
//      */
//
//     expect(row.remaining_locked_amount).to.equal(200000000000000);
//     // expect(row.remaining_locked_amount).to.equal(newUserBal.balance - newUserBal.available);
//     expect(row.grant_type).to.equal(4);
//     expect(row.remaining_locked_amount).to.equal(userBal.balance - newUserBal.balance);
//   });
//
//   it(`get all balances after retiring tokens`, async function () {
//     let userABal = await userA.sdk.genericAction('getFioBalance', {});
//     let userA1Bal = await userA.sdk.genericAction('getFioBalance', {});
//     let userA2Bal = await userA.sdk.genericAction('getFioBalance', {});
//     let userA3Bal = await userA.sdk.genericAction('getFioBalance', {});
//     let userA4Bal = await userA.sdk.genericAction('getFioBalance', {});
//     let userA5Bal = await userA.sdk.genericAction('getFioBalance', {});
//     let userA6Bal = await userA.sdk.genericAction('getFioBalance', {});
//
//     let userALocks,userA1Locks,userA2Locks,userA3Locks,userA4Locks,userA5Locks,userA6Locks;
//
//     const json = {
//       json: true,
//       code: 'eosio',
//       scope: 'eosio',
//       table: 'lockedtokens',
//       limit: 99999,
//       reverse: true,
//       show_payer: false
//     }
//     let found = false;
//     let user;
//     const lockedtokens = await callFioApi("get_table_rows", json);
//     for (user in lockedtokens.rows) {
//       if (lockedtokens.rows[user].owner == userA.account) {
//         // break;
//         userALocks = lockedtokens.rows[user];
//       }
//       if (lockedtokens.rows[user].owner == userA1.account) {
//         // break;
//         userA1Locks = lockedtokens.rows[user];
//       }
//       if (lockedtokens.rows[user].owner == userA2.account) {
//         // break;
//         userA2Locks = lockedtokens.rows[user];
//       }
//       if (lockedtokens.rows[user].owner == userA3.account) {
//         // break;
//         userA3Locks = lockedtokens.rows[user];
//       }
//
//       if (lockedtokens.rows[user].owner == userA4.account) {
//         // break;
//         userA4Locks = lockedtokens.rows[user];
//       }
//
//       if (lockedtokens.rows[user].owner == userA5.account) {
//         // break;
//         userA5Locks = lockedtokens.rows[user];
//       }
//       if (lockedtokens.rows[user].owner == userA6.account) {
//         // break;
//         userA6Locks = lockedtokens.rows[user];
//       }
//     }
//     // expect(lockedtokens.rows[user].remaining_locked_amount).to.equal(userBal.balance - userBal.available);
//
//     console.log('balances retrieved')
//   });
//
//
// });
