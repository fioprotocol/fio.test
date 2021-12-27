require('mocha');
const {expect, use} = require('chai');
const {newUser, existingUser, fetchJson, generateFioDomain, generateFioAddress, createKeypair, callFioApi, timeout, getAccountFromKey} = require('../utils.js');
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {getStakedTokenPool, getCombinedTokenPool, getGlobalSrpCount} = require("./Helpers/token-pool.js");
let faucet;

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

  it(`Happy Test, Retire ${fundsAmount} SUFs from UserA2 (type 1 lock)`, async function () {
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

describe(`B. Retire locked FIO Tokens`, function () {
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

  it(`transfer FIO to userA for funding`, async function () {
    // it.skip(`Transfer ${fundsAmount} FIO to userA FIO public key`, async function () {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: fundsAmount * 15,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    //console.log('Result: ', result)
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    // });
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

  // it.skip(`Transfer ${fundsAmount} FIO to userA1 FIO public key`, async function () {
  //   const result = await faucet.genericAction('transferTokens', {
  //     payeeFioPublicKey: RETIRETEST1.publicKey,
  //     amount: fundsAmount,
  //     maxFee: config.api.transfer_tokens_pub_key.fee,
  //     technologyProviderId: ''
  //   });
  //   expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
  // });

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

    // const json = {
    //   json: true,
    //   code: 'eosio',
    //   scope: 'eosio',
    //   table: 'lockedtokens',
    //   limit: 99999,
    //   reverse: true,
    //   show_payer: false
    // }
    // let found = false;
    // let user;
    // let row;
    // const lockedtokens = await callFioApi("get_table_rows", json);
    // for (user in lockedtokens.rows) {
    //   if (lockedtokens.rows[user].owner == userA1.account) {
    //     // break;
    //     row = lockedtokens.rows[user];
    //   }
    // }
    // // WTF where are the locks?
    // console.log(row)
  });




  it(`Set three FIP-6 lock periods for userA2 and only unlock two of them, expect status: OK`, async function () {
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

  it(`init userA2 from existing keys`, async function () {
    userA2 = await existingUser(RETIRETEST2.account, RETIRETEST2.privateKey, RETIRETEST2.publicKey,'','');
    userA2Bal = await userA2.sdk.genericAction('getFioBalance', { });
  });

  it(`(bug - integer wraparound) try to retire > 1100000000000, expect Error`, async function () {
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









  it(`Set two FIP-6 lock periods for userA3, expect status: OK`, async function () {
    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: RETIRETEST3.publicKey,
          can_vote: 0,
          periods: [
            {
              "duration": 1,
              "amount": 1100000000000
            },
            {
              "duration": 4000000000000,
              // "duration": 2,
              "amount": 12000000000000
            }
          ],
          // amount: 2300000000000,
          amount: 13100000000000,
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

    await timeout(4000);
  });

  it(`init userA3 from existing keys`, async function () {
    userA3 = await existingUser(RETIRETEST3.account, RETIRETEST3.privateKey, RETIRETEST3.publicKey,'','');
    userA3Bal = await userA3.sdk.genericAction('getFioBalance', { });
  });

  /**
   * I think this is relate to BD-3003 and is the amount trying to retire is greater than the number of "available" (which I believe are unlocked)
   * if retire amount is greater than unlocked, then
   *
   */
  it(`try to retire < 1100000000000, expect `, async function () {
    // let lockedToks = (userA3Bal.balance - userA3Bal.available);
    let newUserBal;
    try {
      const result = await userA3.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: 1000500000000,
          memo: "test string",
          actor: userA3.account,
        }
      });
      expect(result.status).to.equal('OK');
      newUserBal = await userA3.sdk.genericAction('getFioBalance', { });
      console.log(newUserBal)
      expect(newUserBal.balance).to.equal(userA3Bal.balance - 1000500000000);
      expect(newUserBal.available).to.equal(userA3Bal.available - 1000500000000);
    } catch (err) {
      newUserBal = await userA3.sdk.genericAction('getFioBalance', { });
      console.log(err, newUserBal)
      throw err;
    }
  });

  it(`Set five FIP-6 lock periods for userA4 and only unlock two of them, expect status: OK`, async function () {
    try {
      const result = await userA.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: RETIRETEST4.publicKey,
          can_vote: 0,
          periods: [
            {
              "duration": 1,
              "amount": 1000000000000
            },
            {
              "duration": 2,
              "amount": 1000000000000
            },
            {
              "duration": 3,
              "amount": 1000000000000
            },
            {
              "duration": 4,
              "amount": 1000000000000
            },
            {
              "duration": 90000,
              "amount": 1000000000000
            }
          ],
          amount: 5000000000000,
          max_fee: 40000000000,
          tpid: "bp1@dapixdev",
          actor: userA.account
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json.fields[0].error).to.equal('Locked tokens can only be transferred to new account');
      throw err;
    }

    await timeout(4500); // let those SUFs unlock
  });

  it(`init userA4 from existing keys`, async function () {
    userA4 = await existingUser(RETIRETEST4.account, RETIRETEST4.privateKey, RETIRETEST4.publicKey,'','');
    userA4Bal = await userA4.sdk.genericAction('getFioBalance', { });
  });

  it(`(bug - integer wraparound) try to retire more tokens than are unlocked, expect unlocked to retire first, locked to retire second`, async function () {
    // let lockedToks = (userA4Bal.balance - userA4Bal.available);
    let newUserBal;
    try {
      const result = await userA4.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          // quantity: 1000500000000,
          // quantity: 4000000000000,
          quantity: 4500000000000,
          memo: "test string",
          actor: userA4.account,
        }
      });
      newUserBal = await userA4.sdk.genericAction('getFioBalance', { });
      // console.log(newUserBal)
      expect(newUserBal.available).to.equal(0);
      expect(newUserBal.balance).to.equal(userA4Bal.balance - 500000000000);
      expect(result.status).to.equal('OK');
    } catch (err) {
      newUserBal = await userA4.sdk.genericAction('getFioBalance', { });
      console.log(err, newUserBal)
      throw err;
    }
  });

  it(`get userA4 locks`, async function () {
    // locks
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
    let user = "";
    let lockedtokens = await callFioApi("get_table_rows", json);
    for (user in lockedtokens.rows) {
      if (lockedtokens.rows[user].owner == RETIRETEST4.account) {
        // break;
        found = true;
      }
    }

    //TODO: Shouldn't the lock table have the user's locks?
    expect(found).to.equal(true);
  });

  it(`Set seven FIP-6 lock periods for userA5 and only unlock two of them, expect status: OK`, async function () {
    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: userA5Keys.publicKey,
          can_vote: 0,
          periods: [
            {
              "duration": 1,
              "amount": 1000000000000
            },
            {
              "duration": 90000,
              "amount": 1000000000000
            },
            {
              "duration": 100000,
              "amount": 1000000000000
            },
            {
              "duration": 110000,
              "amount": 1000000000000
            },
            {
              "duration": 120000,
              "amount": 1000000000000
            },
            {
              "duration": 130000,
              "amount": 1000000000000
            },
            {
              "duration": 140000,
              "amount": 1000000000000
            }
          ],
          amount: 7000000000000,
          max_fee: 40000000000,
          tpid: "bp1@dapixdev",
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

    await timeout(4500); // let those SUFs unlock

    // // locks
    // const json = {
    //   json: true,
    //   code: 'eosio',
    //   scope: 'eosio',
    //   table: 'lockedtokens',
    //   limit: 99999,
    //   reverse: true,
    //   show_payer: false
    // }
    // let found = false;
    // let user = "";
    // let lockedtokens = await callFioApi("get_table_rows", json);
    // for (user in lockedtokens.rows) {
    //   if (lockedtokens.rows[user].owner == userA5Keys.account) {
    //     // break;
    //     found = true;
    //   }
    // }
    //
    // //TODO: Shouldn't the lock table have the user's locks?
    // expect(found).to.equal(true);
  });

  it(`init userA5 from existing keys`, async function () {
    userA5 = await existingUser(userA5Keys.account, userA5Keys.privateKey, userA5Keys.publicKey,'','');
    userA5Bal = await userA5.sdk.genericAction('getFioBalance', { });
  });

  it(`(bug - integer wraparound) try to retire fewer tokens than are unlocked, expect unlocked to retire first, locked to retire second`, async function () {
    let lockedToks = (userA5Bal.balance - userA5Bal.available);
    let newUserBal;
    try {
      const result = await userA5.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          // quantity: 1000500000000,
          // quantity: 4000000000000,
          quantity: 2500000000000,
          memo: "test string",
          actor: userA5.account,
        }
      });
      newUserBal = await userA5.sdk.genericAction('getFioBalance', { });
      console.log(newUserBal)
      expect(newUserBal.available).to.equal(userA5Bal.available - 2500000000000);
      expect(newUserBal.balance).to.equal(userA5Bal.balance - 2500000000000);
      expect(result.status).to.equal('OK');
    } catch (err) {
      newUserBal = await userA5.sdk.genericAction('getFioBalance', { });
      console.log(err, newUserBal)

      throw err;
    }
  });

  it(`get userA5 locks`, async function () {

    // locks
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
    let user = "";
    let lockedtokens = await callFioApi("get_table_rows", json);
    for (user in lockedtokens.rows) {
      if (lockedtokens.rows[user].owner == userA5.account) {
        // break;
        found = true;
      }
    }

    expect(found).to.equal(true);
  });




  /*
  Retire 1000 FIO tokens from a FIP-6 locked account with “test string” memo,
  where some > 1000 tokens were unlocked and > 1000 are still locked.
  Observe:
  Account balance is updated
  Total tokens issued count is reduced by 1000
  Locks table is updated and unlocked tokens remain the same
  */

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

describe(`C. (unhappy) Try to retire from an account that has staked tokens`, function () {
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
