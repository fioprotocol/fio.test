require('mocha');
const {expect} = require('chai');
const {newUser, existingUser, fetchJson, createKeypair, callFioApi, timeout} = require('../utils.js');
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {getStakedTokenPool, getCombinedTokenPool, getGlobalSrpCount} = require("./Helpers/token-pool.js");
let faucet;

before(async function () {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
});

describe(`************************** retire-tokens.js ************************** \n    A. Retire FIO Tokens`, function () {
  let userA, userA1, userA2, userAKeys, userA1Keys, userA2Keys;

  let userABal, userA1Bal, userA2Bal;

  const fundsAmount = 1000000000000;
  const grantAmount = 1250000000000;

  before(async function () {
    userAKeys = await createKeypair();
    userA1Keys = await createKeypair();
    userA2Keys = await createKeypair();

    await faucet.genericAction('pushTransaction', {
      action: 'trnsfiopubky',
      account: 'fio.token',
      data: {
        payee_public_key: userAKeys.publicKey,
        amount: 1000000000000,
        max_fee: 1000000000000,
        actor: faucet.account,
        tpid: ""
      }
    });

    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: userA1Keys.publicKey,
        can_vote: 0,
        periods: [
          { // 1000 are unlocked
            "duration": 1,
            "amount": 1000000000000
          },
          { // > 1000 are still locked
            // "duration": 3000000000000,
            "duration": 2,
            "amount": 1250000000000
          }
        ],
        amount: 2250000000000,
        max_fee: 40000000000,
        tpid: "",
        actor: faucet.account
      }
    });

    await timeout(3500);

    await faucet.genericAction('pushTransaction', {
      action: 'trnsfiopubky',
      account: 'fio.token',
      data: {
        payee_public_key: userA1Keys.publicKey,
        amount: 3000000000000,
        max_fee: 1000000000000,
        actor: faucet.account,
        tpid: ""
      }
    });

    await faucet.genericAction('pushTransaction', {
      action: 'trnsfiopubky',
      account: 'fio.token',
      data: {
        payee_public_key: userA2Keys.publicKey,
        amount: 15000000000000,
        max_fee: 1000000000000,
        actor: faucet.account,
        tpid: ""
      }
    });

    userA = await existingUser(userAKeys.account, userAKeys.privateKey, userAKeys.publicKey,'','');
    userA1 = await existingUser(userA1Keys.account, userA1Keys.privateKey, userA1Keys.publicKey,'','');
    userA2 = await existingUser(userA2Keys.account, userA2Keys.privateKey, userA2Keys.publicKey,'','');

    userABal = await userA.sdk.genericAction('getFioBalance', { });
    userA1Bal = await userA1.sdk.genericAction('getFioBalance', { });
    userA2Bal = await userA2.sdk.genericAction('getFioBalance', { });
  });

  it(`verify initial balances`, async function () {
    expect(userABal.balance).to.equal(1000000000000);
    expect(userABal.available).to.equal(1000000000000);
    expect(userA1Bal.balance).to.equal(5250000000000);
    expect(userA1Bal.available).to.equal(5250000000000);
    expect(userA2Bal.balance).to.equal(15000000000000);
    expect(userA2Bal.available).to.equal(15000000000000);
  });

  /*
  Retire 1000 FIO tokens from a non-locks account with empty memo
  Observe:
  Account balance is updated
  Total tokens issued count is reduced by 1000
  */

  it(`Happy Test, Retire ${fundsAmount} SUFs from userA (empty memo)`, async function () {
    let newUserBal;
    try {
      const result = await userA.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: fundsAmount,
          memo: "",
          actor: userAKeys.account,
        }
      });
      expect(result.status).to.equal('OK');
      newUserBal = await userA.sdk.genericAction('getFioBalance', {});
      expect(newUserBal.available).to.equal(userABal.available - fundsAmount);
      expect(newUserBal.balance).to.equal(userABal.balance - fundsAmount);
      userABal = newUserBal;
    } catch (e) {
      newUserBal = await userA.sdk.genericAction('getFioBalance', {});
      console.log(e, newUserBal);
      throw e;
    }
  });

  /*
  Retire 1000 FIO tokens from a Type 4 locked account with “test string” memo
  Observe:
  Account balance is updated
  Total tokens issued count is reduced by 1000
  Locks table is updated
  */

  it(`add type 4 lock to userA1`, async function () {
    let newUserBal;
    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'addlocked',
        account: 'eosio',
        data: {
          owner: userA1Keys.account,
          amount: fundsAmount,
          locktype: 4,
        }
      });
      expect(result.status).to.equal('OK');
      newUserBal = await userA1.sdk.genericAction('getFioBalance', {});
      expect(newUserBal.balance).to.equal(userA1Bal.balance);
      expect(newUserBal.available).to.equal(userA1Bal.available - fundsAmount);
      userA1Bal = newUserBal;
    } catch (err) {
      newUserBal = await userA1.sdk.genericAction('getFioBalance', {});
      console.log(err, newUserBal);
      throw err;
    }
  });
  it(`Happy Test, Retire ${fundsAmount} SUFs from UserA1 (type 4 lock)`, async function () {
    let newUserBal;
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
    newUserBal = await userA1.sdk.genericAction('getFioBalance', {});
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

  it(`add type 1 lock to userA2`, async function () {
    let newUserBal;
    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'addlocked',
        account: 'eosio',
        data: {
          owner: userA2Keys.account,
          amount: grantAmount,
          locktype: 1,
        }
      });
      expect(result.status).to.equal('OK');
      newUserBal = await userA2.sdk.genericAction('getFioBalance', {});
      expect(newUserBal.balance).to.equal(userA2Bal.balance);
      expect(newUserBal.available).to.equal(userA2Bal.available - grantAmount);
      userA2Bal = newUserBal;
    } catch (err) {
      newUserBal = await userA2.sdk.genericAction('getFioBalance', {});
      console.log(err, newUserBal);
      throw err;
    }
  });
  it(`Happy Test, Retire ${fundsAmount} SUFs from UserA2 (type 1 lock)`, async function () {
    let newUserBal;
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
    newUserBal = await userA2.sdk.genericAction('getFioBalance', { });
    expect(newUserBal.balance).to.equal(14000000000000);
    expect(newUserBal.available).to.equal(13000000000000);
  });
});

describe(`B. (BD-3153) accounts with remaining locked FIP-6 periods should not be able to retire any tokens`, function () {
  let userA, userA1, userA2, userA3, userA4, userA5, userA6;
  let userALocks,userA1Locks, userA2Locks, userA3Locks, userA4Locks, userA5Locks, userA6Locks;
  let userABal, userA1Bal, userA2Bal, userA3Bal, userA4Bal, userA5Bal, userA6Bal;
  let RETIRETEST1, RETIRETEST2, RETIRETEST3, RETIRETEST4, userA5Keys, userA6Keys;

  const grantAmountA1 = 1250000000000;
  const fundsAmount = 1000000000000

  before(async function () {
    userA = await newUser(faucet);
    userA3 = await newUser(faucet);

    // generating my own keys so I don't have to rely on fio.devtools
    RETIRETEST1 = await createKeypair();
    RETIRETEST2 = await createKeypair();
    RETIRETEST3 = await createKeypair();
    RETIRETEST4 = await createKeypair();
    userA5Keys = await createKeypair();
    userA6Keys = await createKeypair();
  });

  it(`Set two FIP-6 lock periods for userA1 and only let one unlock, expect status: OK`, async function () {
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
              "amount": 2000000000000
            },
            { // > 1000 are still locked
              "duration": 3000000000000,
              // "duration": 2,
              "amount": 250000000000
            }
          ],
          amount: 2250000000000,
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

    // await timeout(3500); // let those SUFs unlock
  });

  it(`add locked tokens to userA1`, async function () {
    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'addlocked',
        account: 'eosio',
        data: {
          owner: RETIRETEST1.account,
          amount: fundsAmount, //grantAmountA1,
          locktype: 4,
        }
      });
      console.log(result);
    } catch (err) {
      throw err;
    }
  });

  it(`init userA1 from existing keys`, async function () {
    userA1 = await existingUser(RETIRETEST1.account, RETIRETEST1.privateKey, RETIRETEST1.publicKey,'','');
    userA1Bal = await userA1.sdk.genericAction('getFioBalance', { });
    // expect(userA1Bal.balance).to.equal(2250000000000);
    // expect(userA1Bal.available).to.equal(1000000000000);
    const fip6Locks = await userA1.sdk.getLocks(RETIRETEST1.publicKey);
    console.log(fip6Locks);
  });

  it(`get userA1 locks`, async function () {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'lockedtokens',
      lower_bound: RETIRETEST1.account,
      upper_bound: RETIRETEST1.account,
      // limit: 99999,
      reverse: true,
      show_payer: false
    }
    let found = false;
    let user;
    const lockedtokens = await callFioApi("get_table_rows", json);
    for (user in lockedtokens.rows) {
      if (lockedtokens.rows[user].owner === RETIRETEST1.account) {
        found = true;
        userA1Locks = lockedtokens.rows[user];
        break;
      }
    }
    // console.log(userA1Locks);
    expect(found).to.equal(true);
    // expect(userA1Locks.total_grant_amount).to.equal(grantAmountA1);
    // expect(userA1Locks.remaining_locked_amount).to.equal(grantAmountA1);
  });

  it(`(bug - should not be able to retire with locked periods remaining) try to retire tokens with a remaining locked FIP-6 period, expect Error`, async function () {

    //
    let locks = await userA1.sdk.getLocks(RETIRETEST1.publicKey);
    // leaving this assertion for proof of concept, but if unlock_periods.length > 0 then this should fail
    expect(locks.unlock_periods.length).to.equal(2);
    let newUserBal;

    // now, try to retire tokens and there should be an error
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: 1000000000000,
          // quantity: 1500000000000,
          memo: "test string",
          actor: userA1.account,
        }
      });
      newUserBal = await userA1.sdk.genericAction('getFioBalance', {});
      console.log(newUserBal)
      expect(newUserBal.balance).to.equal(userA1Bal.balance - 1500000000000)
      expect(newUserBal.available).to.equal(0);   //(userA1Bal.available - 1000000000000)
      expect(result.status).to.equal('OK');
    } catch (err) {
      newUserBal = await userA1.sdk.genericAction('getFioBalance', {});
      console.log(err, newUserBal)
      expect(err.json.fields[0].error).to.equal('Account with partially locked balance cannot retire');
    }
  })
});

describe(`C. Retire locked FIO Tokens`, function () {
  let userA, userA1, userA2, userA3, userA4, userA5, userA6;
  let userALocks,userA1Locks, userA2Locks, userA3Locks, userA4Locks, userA5Locks, userA6Locks;
  let userABal, userA1Bal, userA2Bal, userA3Bal, userA4Bal, userA5Bal, userA6Bal;
  let RETIRETEST1, RETIRETEST2, RETIRETEST3, RETIRETEST4, userA5Keys, userA6Keys;

  const grantAmountA1 = 1250000000000;
  const fundsAmount = 1000000000000

  before(async function () {
    userA = await newUser(faucet);
    userA3 = await newUser(faucet);

    // generating my own keys so I don't have to rely on fio.devtools
    RETIRETEST2 = await createKeypair();
    RETIRETEST3 = await createKeypair();
    RETIRETEST4 = await createKeypair();
    userA5Keys = await createKeypair();
    userA6Keys = await createKeypair();
  });

  it(`Set three FIP-6 lock periods for userA2 and let them all unlock, expect status: OK`, async function () {
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
              "duration": 2,
              "amount": 1000000000000
            },
            {
              "duration": 3,
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

    await timeout(4000); // let those SUFs unlock
  });

  it(`init userA2 from existing keys`, async function () {
    userA2 = await existingUser(RETIRETEST2.account, RETIRETEST2.privateKey, RETIRETEST2.publicKey,'','');
    userA2Bal = await userA2.sdk.genericAction('getFioBalance', { });
    expect(userA2Bal.balance).to.equal(3100000000000);
    expect(userA2Bal.available).to.equal(3100000000000);
  });

  it(`try to retire 1100000000050 tokens, expect OK`, async function () {
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
      expect(result.status).to.equal('OK');
      newUserBal = await userA2.sdk.genericAction('getFioBalance', { });
      // console.log(newUserBal)
      expect(newUserBal.available).to.equal(userA2Bal.available - 1100000000050)
    } catch (err) {
      newUserBal = await userA2.sdk.genericAction('getFioBalance', { });
      console.log(err, newUserBal)
      throw err;
    }
  });




  it(`add locked tokens to userA3 (locktype = 4)`, async function () {
    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'addlocked',
        account: 'eosio',
        data: {
          owner: userA3.account,
          amount: 1100000000000,
          locktype: 4,
        }
      });
      // console.log(result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log(err);
      throw err;
    }

    userA3Bal = await userA3.sdk.genericAction('getFioBalance', { });
    expect(userA3Bal.balance).to.equal(2160000000000);
    expect(userA3Bal.available).to.equal(1060000000000);
  });

  it(`get userA3 locks`, async function () {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'lockedtokens',
      lower_bound: userA3.account,
      upper_bound: userA3.account,
      // limit: 99999,
      reverse: true,
      show_payer: false
    }
    let found = false;
    let user;
    let row;
    const lockedtokens = await callFioApi("get_table_rows", json);
    for (user in lockedtokens.rows) {
      if (lockedtokens.rows[user].owner == userA3.account) {
        found = true;
        row = lockedtokens.rows[user];
        break
      }
    }
    // console.log(row);
    expect(found).to.equal(true);
    expect(row.total_grant_amount).to.equal(1100000000000);
    expect(row.remaining_locked_amount).to.equal(1100000000000);


    userA3Locks = row;
  });

  it(`try to retire < 1100000000000, expect OK`, async function () {
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
      // console.log(newUserBal)
      expect(newUserBal.balance).to.equal(userA3Bal.balance - 1000500000000);
      expect(newUserBal.balance - newUserBal.available).to.equal(1000500000000);
      userA3Bal = newUserBal;
    } catch (err) {
      newUserBal = await userA3.sdk.genericAction('getFioBalance', { });
      console.log(err, newUserBal)
      userA3Bal = newUserBal;
      throw err;
    }
  });

  it(`get userA3 locks`, async function () {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'lockedtokens',
      lower_bound: userA3.account,
      upper_bound: userA3.account,
      // limit: 99999,
      reverse: true,
      show_payer: false
    }
    let found = false;
    let user;
    let row;
    const lockedtokens = await callFioApi("get_table_rows", json);
    for (user in lockedtokens.rows) {
      if (lockedtokens.rows[user].owner == userA3.account) {
        found = true;
        row = lockedtokens.rows[user];
        break
      }
    }
    // console.log(row);
    expect(found).to.equal(true);
    expect(row.total_grant_amount).to.equal(1100000000000);
    expect(row.remaining_locked_amount).to.equal(1000500000000);


    userA3Locks = row;
  });




  it(`Set five FIP-6 lock periods for userA4 and unlock all of them, expect status: OK`, async function () {
    try {
      const result = await faucet.genericAction('pushTransaction', {
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
              // "duration": 5,
              "amount": 1000000000000
            }
          ],
          amount: 5000000000000,
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

    await timeout(5500); // let those SUFs unlock
  });

  it(`init userA4 from existing keys`, async function () {
    userA4 = await existingUser(RETIRETEST4.account, RETIRETEST4.privateKey, RETIRETEST4.publicKey,'','');
    userA4Bal = await userA4.sdk.genericAction('getFioBalance', { });
    expect(userA4Bal.balance).to.equal(5000000000000);
    expect(userA4Bal.available).to.equal(4000000000000);
  });

  it(`add locked tokens to userA4 (locktype = 1)`, async function () {
    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'addlocked',
        account: 'eosio',
        data: {
          owner: RETIRETEST4.account,
          amount: 1200000000000,
          locktype: 1,
        }
      });
      console.log(result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      throw err;
    }

    userA4Bal = await userA4.sdk.genericAction('getFioBalance', { });
    expect(userA4Bal.balance - userA4Bal.available).to.equal(2200000000000);
  });

  it(`get userA4 locks`, async function () {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'lockedtokens',
      lower_bound: userA4.account,
      upper_bound: userA4.account,
      // limit: 99999,
      reverse: true,
      show_payer: false
    }
    let found = false;
    let user;
    let row;
    const lockedtokens = await callFioApi("get_table_rows", json);
    for (user in lockedtokens.rows) {
      if (lockedtokens.rows[user].owner == userA4.account) {
        found = true;
        row = lockedtokens.rows[user];
        break
      }
    }
    expect(found).to.equal(true);
    expect(row.total_grant_amount).to.equal(1200000000000);
    expect(row.remaining_locked_amount).to.equal(1200000000000);


    userA4Locks = row;
  });

  it(`(BD-3132) try to retire more tokens than are unlocked, expect Error`, async function () {
    let newUserBal;
    try {
      const result = await userA4.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: 2900000000000,
          // quantity: 3900500000000,
          // quantity: 3900000000000,
          memo: "test string",
          actor: userA4.account,
        }
      });
      newUserBal = await userA4.sdk.genericAction('getFioBalance', { });
      // console.log(newUserBal)
      expect(result.status).to.equal('OK');
      expect(newUserBal.available).to.equal(0);
      expect(newUserBal.balance).to.equal(userA4Bal.balance - 2900000000000);
    } catch (err) {
      newUserBal = await userA4.sdk.genericAction('getFioBalance', { });
      console.log(err, newUserBal)
      // expect(err.json.fields[0].error).to.equal('Insufficient balance');
      // expect(newUserBal.balance).to.equal(userA4Bal.balance);
      // expect(newUserBal.available).to.equal(userA4Bal.available);
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
      lower_bound: userA4.account,
      upper_bound: userA4.account,
      // limit: 99999,
      reverse: true,
      show_payer: false
    }
    let found = false;
    let user = "";
    let lockedtokens = await callFioApi("get_table_rows", json);
    for (user in lockedtokens.rows) {
      if (lockedtokens.rows[user].owner == RETIRETEST4.account) {
        userA4Locks = lockedtokens.rows[user];
        found = true;
        break;
      }
    }

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
              "duration": 2,
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
  });

  it(`init userA5 from existing keys`, async function () {
    userA5 = await existingUser(userA5Keys.account, userA5Keys.privateKey, userA5Keys.publicKey,'','');
    userA5Bal = await userA5.sdk.genericAction('getFioBalance', { });
    expect(userA5Bal.available).to.equal(2000000000000);
  });

  it(`add locked tokens to userA5 (locktype = 2)`, async function () {
    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'addlocked',
        account: 'eosio',
        data: {
          owner: userA5Keys.account,
          amount: 1000000000000,
          locktype: 2,
        }
      });
      console.log(result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      throw err;
    }

    userA5Bal = await userA5.sdk.genericAction('getFioBalance', { });
    // expect(userA5Bal.balance - userA5Bal.available).to.equal(2200000000000);
  });

  it(`get userA5 locks`, async function () {
    // locks
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'lockedtokens',
      lower_bound: userA5.account,
      upper_bound: userA5.account,
      // limit: 99999,
      reverse: true,
      show_payer: false
    }
    let found = false;
    let user = "";
    let lockedtokens = await callFioApi("get_table_rows", json);
    for (user in lockedtokens.rows) {
      if (lockedtokens.rows[user].owner == userA5.account) {
        found = true;
        userA5Locks = lockedtokens.rows[user];
        break;
      }
    }

    expect(found).to.equal(true);
  });

  it(`(BD-3132) try to retire 4000000000000 tokens, expect Error`, async function () {
    let newUserBal;
    try {
      const result = await userA5.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          // quantity: 2000000000000,
          // quantity: 1000000000000,
          quantity: 4000000000000,
          memo: "test string",
          actor: userA5.account,
        }
      });
      newUserBal = await userA5.sdk.genericAction('getFioBalance', { });
      // console.log(newUserBal);
      // expect(newUserBal.available).to.equal(userA5Bal.available - 1000000000000);
      // expect(newUserBal.balance).to.equal(userA5Bal.balance - 2500000000000);
      expect(result.status).to.not.equal('OK');
      userA5Bal = newUserBal;
    } catch (err) {
      newUserBal = await userA5.sdk.genericAction('getFioBalance', { });
      console.log(err, newUserBal);
      userA5Bal = newUserBal;
      throw err;
    }
  });

  it(`get userA5 locks`, async function () {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'lockedtokens',
      lower_bound: userA5.account,
      upper_bound: userA5.account,
      // limit: 99999,
      reverse: true,
      show_payer: false
    }
    let found = false;
    let user = "";
    let lockedtokens = await callFioApi("get_table_rows", json);
    for (user in lockedtokens.rows) {
      if (lockedtokens.rows[user].owner == userA5.account) {
        found = true;
        userA5Locks = lockedtokens.rows[user];
        break;
      }
    }

    expect(found).to.equal(true);
  });




  it(`Set two FIP-6 lock periods for userA6 and unlock all of them, expect status: OK`, async function () {
    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: userA6Keys.publicKey,
          can_vote: 0,
          periods: [
            {
              "duration": 1,
              "amount":4000000000000
            },
            {
              "duration": 2,
              "amount": 1000000000000
            },
            // {
            //   "duration": 3,
            //   "amount": 1000000000000
            // },
            // {
            //   "duration": 4,
            //   "amount": 1000000000000
            // },
            // {
            //   "duration": 5,
            //   "amount": 1000000000000
            // }
          ],
          amount: 5000000000000,
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

    await timeout(5500); // let those SUFs unlock
  });

  it(`init userA6 from existing keys`, async function () {
    userA6 = await existingUser(userA6Keys.account, userA6Keys.privateKey, userA6Keys.publicKey,'','');
    userA6Bal = await userA6.sdk.genericAction('getFioBalance', { });
    expect(userA6Bal.balance).to.equal(5000000000000);
    expect(userA6Bal.available).to.equal(5000000000000);
  });

  it(`add locked tokens to userA6 (locktype = 1)`, async function () {
    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'addlocked',
        account: 'eosio',
        data: {
          owner: userA6.account,
          amount: 1200000000000,
          locktype: 1,
        }
      });
      console.log(result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      throw err;
    }

    userA6Bal = await userA6.sdk.genericAction('getFioBalance', { });
    expect(userA6Bal.balance - userA6Bal.available).to.equal(1200000000000);
  });

  it(`get userA6 locks`, async function () {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'lockedtokens',
      lower_bound: userA6.account,
      upper_bound: userA6.account,
      // limit: 99999,
      reverse: true,
      show_payer: false
    }
    let found = false;
    let user;
    let row;
    const lockedtokens = await callFioApi("get_table_rows", json);
    for (user in lockedtokens.rows) {
      if (lockedtokens.rows[user].owner == userA6.account) {
        found = true;
        row = lockedtokens.rows[user];
        break
      }
    }
    expect(found).to.equal(true);
    expect(row.total_grant_amount).to.equal(1200000000000);
    expect(row.remaining_locked_amount).to.equal(1200000000000);


    userA6Locks = row;
  });

  it(`Happy Test, Retire ${fundsAmount} SUFs from UserA6 (FIP-6 Lock)`, async function () {
    let newUserBal;
    userA6Bal = await userA6.sdk.genericAction('getFioBalance', {fioPublicKey: userA6.publicKey});
    const result = await userA6.sdk.genericAction('pushTransaction', {
      action: 'retire',
      account: 'fio.token',
      data: {
        quantity: fundsAmount,
        memo: "test string",
        actor: userA6.account,
      }
    });
    expect(result.status).to.equal('OK');
    newUserBal = await userA6.sdk.genericAction('getFioBalance', {fioPublicKey: userA6.publicKey});
    expect(newUserBal.balance).to.equal(userA6Bal.balance - fundsAmount);



    // let diff = userA6Bal.available - (fundsAmount * .2)
    // expect(newUserBal.available).to.equal(userA6Bal.available - (fundsAmount * .2));

    expect(userA6Bal.available - newUserBal.available).to.equal(fundsAmount - 200000000000);
    expect(userA6Bal.balance - newUserBal.balance).to.equal(fundsAmount);

    // let row = lockedtokens.rows[user];
    // expect(row.remaining_locked_amount).to.equal(userA6Bal.balance - userA6Bal.available);
    // expect(row.remaining_locked_amount).to.equal(newUserBal.balance - newUserBal.available);
    // expect(row.grant_type).to.equal(3);
    // expect(row.remaining_locked_amount).to.equal(userA6Bal.balance - newUserBal.balance);
  });

  it(`get userA6 locks`, async function () {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'lockedtokens',
      lower_bound: userA6.account,
      upper_bound: userA6.account,
      // limit: 99999,
      reverse: true,
      show_payer: false
    }
    let found = false;
    let user;
    const lockedtokens = await callFioApi("get_table_rows", json);
    for (user in lockedtokens.rows) {
      if (lockedtokens.rows[user].owner == userA6.account) {
        found = true;
        userA6Locks = lockedtokens.rows[user];
        break
      }
    }
    expect(found).to.equal(true);
    expect(userA6Locks.total_grant_amount).to.equal(1200000000000);
    expect(userA6Locks.remaining_locked_amount).to.equal(1000000000000);
  });
});

describe(`D. (BD-3133) Try to retire from an account that has staked tokens`, function () {
  let bp1, bp2, bp3, userA, userA4, userB, userC, userP, prevFundsAmount, locksdk, keys, userKeys, accountnm, newFioDomain1, newFioAddress1, newFioDomain2, newFioAddress2, total_bp_votes, total_voted_fio;
  let userABal;

  const fundsAmount = 1000000000000;
  const transferAmt = 100000000000;
  const stakeAmt = 1000000000000;

  before(async () => {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    userP = await newUser(faucet);
    // faucetKeys = await createKeypair();
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

  it(`transfer FIO to userA for funding`, async function () {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: fundsAmount,// * 15,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    userABal = await userA.sdk.genericAction('getFioBalance', {});
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
          tpid: '' //userP.address
        }
      });
      newUserBal = await userA.sdk.genericAction('getFioBalance', {});
      newStakedTokenPool = await getStakedTokenPool();
      newCombinedTokenPool = await getCombinedTokenPool();
      newGlobalSrpCount = await getGlobalSrpCount();
      expect(result).to.have.all.keys('status', 'fee_collected');
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.stake_fio_tokens.fee);
      expect(newUserBal.staked).to.equal(userABal.staked + stakeAmt);
      expect(newStakedTokenPool).to.equal(stakedTokenPool + stakeAmt);
      expect(newCombinedTokenPool).to.be.greaterThanOrEqual(combinedTokenPool + stakeAmt);
      expect(newGlobalSrpCount).to.equal( globalSrpCount + 2*(stakeAmt));
      expect(newGlobalSrpCount - globalSrpCount).to.equal(newUserBal.srps);
      userABal = newUserBal;
    } catch (err) {
      newUserBal = await userA.sdk.genericAction('getFioBalance', {});
      console.log(err, newUserBal)
      userABal = newUserBal;
      throw err;
    }
  });

  it(`(bug - staked accounts should not retire) retire ${fundsAmount} SUFs from userA, expect Error: Account staking cannot retire`, async function () {
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

describe(`E. Unhappy tests. Try to retire FIO tokens with invalid input`, function () {
  let userA, userA1, userA2, userAKeys, userA1Keys, userA2Keys;

  let userABal, userA1Bal, userA2Bal;

  const fundsAmount = 1000000000000

  before(async function () {
    userAKeys = await createKeypair();
    userA1Keys = await createKeypair();
    userA2Keys = await createKeypair();

    await faucet.genericAction('pushTransaction', {
      action: 'trnsfiopubky',
      account: 'fio.token',
      data: {
        payee_public_key: userAKeys.publicKey,
        amount: 1000000000000,
        max_fee: 1000000000000,
        actor: faucet.account,
        tpid: ""
      }
    });

    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: userA1Keys.publicKey,
        can_vote: 0,
        periods: [
          {
            "duration": 1,
            "amount": 1000000000000
          },
          {
            "duration": 2,
            "amount": 1250000000000
          }
        ],
        amount: 2250000000000,
        max_fee: 40000000000,
        tpid: "",
        actor: faucet.account
      }
    });

    await timeout(3500);

    await faucet.genericAction('pushTransaction', {
      action: 'trnsfiopubky',
      account: 'fio.token',
      data: {
        payee_public_key: userA1Keys.publicKey,
        amount: 3000000000000,
        max_fee: 1000000000000,
        actor: faucet.account,
        tpid: ""
      }
    });

    await faucet.genericAction('pushTransaction', {
      action: 'trnsfiopubky',
      account: 'fio.token',
      data: {
        payee_public_key: userA2Keys.publicKey,
        amount: 15000000000000,
        max_fee: 1000000000000,
        actor: faucet.account,
        tpid: ""
      }
    });

    userA = await existingUser(userAKeys.account, userAKeys.privateKey, userAKeys.publicKey,'','');
    userA1 = await existingUser(userA1Keys.account, userA1Keys.privateKey, userA1Keys.publicKey,'','');
    userA2 = await existingUser(userA2Keys.account, userA2Keys.privateKey, userA2Keys.publicKey,'','');

    userABal = await userA.sdk.genericAction('getFioBalance', { });
    userA1Bal = await userA1.sdk.genericAction('getFioBalance', { });
    userA2Bal = await userA2.sdk.genericAction('getFioBalance', { });
  });

  it(`verify initial balances`, async function () {
    expect(userABal.balance).to.equal(1000000000000);
    expect(userABal.available).to.equal(1000000000000);
    expect(userA1Bal.balance).to.equal(5250000000000);
    expect(userA1Bal.available).to.equal(5250000000000);
    expect(userA2Bal.balance).to.equal(15000000000000);
    expect(userA2Bal.available).to.equal(15000000000000);
  });

  it(`(minimum amount not met) Retire 1 SUF from userA2`, async function () {
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

      expect(err.json.fields[0].error).to.equal("Minimum 1000 FIO has to be retired");
    }
  });

  it(`(minimum amount not met) Retire 999999999999 SUFs from userA2`, async function () {
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

  it(`(insufficient funds) Retire ${fundsAmount} SUFs from userA1`, async function () {
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

  it(`(memo > 256) Retire ${fundsAmount} SUFs from userA2`, async function () {
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

  it(`(missing quantity) Retire SUFs from userA1`, async function () {
    try {
      const result = await userA2.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          // quantity: 1000000000000,
          memo: "test string",
          actor: userA2.account,
        }
      });
      expect(result).to.equal(null);
    } catch (err) {

      expect(err.message).to.equal("missing retire.quantity (type=int64)");
    }
  });

  it(`(empty quantity) Retire SUFs from userA1`, async function () {
    try {
      const result = await userA2.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: "", //1000000000000,
          memo: "test string",
          actor: userA2.account,
        }
      });
      expect(result).to.equal(null);
    } catch (err) {

      expect(err.json.fields[0].error).to.equal("Minimum 1000 FIO has to be retired");
    }
  });

  it(`(invalid quantity) Retire SUFs from userA1`, async function () {
    try {
      const result = await userA2.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: "invalid-quantity",
          memo: "test string",
          actor: userA2.account,
        }
      });
      expect(result).to.equal(null);
    } catch (err) {

      expect(err.message).to.equal("invalid number");
    }
  });

  it(`(missing memo) Retire ${fundsAmount} SUFs from userA1`, async function () {
    try {
      const result = await userA2.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: 1000000000000,
          actor: userA2.account,
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      expect(err.message).to.equal('missing retire.memo (type=string)');
    }
  });

  it(`(invalid actor) Retire ${fundsAmount} SUFs from userA1`, async function () {
    try {
      const result = await userA2.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: 1000000000000,
          memo: "test string",
          actor: "invalid"
        }
      });
      expect(result).to.equal(null);
    } catch (err) {

      expect(err.json.error.details[0].message).to.equal('missing authority of invalid');
    }
  });

  it(`(invalid signer) Retire ${fundsAmount} SUFs from userA1`, async function () {
    try {
      const result = await userA2.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: 1000000000000,
          memo: "test string",
          actor: "bp1@dapixdev",
        }
      });
      expect(result).to.equal(null);
    } catch (err) {
      // different verbiage, same error condition
      // expect(err.json.error.details[0].message).to.equal('Signer not actor')
      expect(err.json.error.details[0].message).to.equal('missing authority of bp1.dapixdev');
    }
  });
});
