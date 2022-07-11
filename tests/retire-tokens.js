require('mocha');
const {expect} = require('chai');
const {newUser, existingUser, fetchJson, createKeypair, callFioApi, getTotalVotedFio, timeout} = require('../utils.js');
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
let faucet;

/*
 MANUAL CONFIGURATION REQUIRED TO RUN TESTS

 The following changes must be made to run these tests:

 1. Shorten the main net locking period to become 1 minute

  In: fio.token.hpp

  Comment out the following lines in the computeremaininglockedtokens method:

    //uint32_t daysSinceGrant = (int) ((present_time - lockiter->timestamp) / SECONDSPERDAY);
    //uint32_t firstPayPeriod = 90;
    //uint32_t payoutTimePeriod = 180;

  Then add the following code beneath what you commented out.

    // TESTING ONLY!!! shorten genesis locking periods..DO NOT DELIVER THIS
    uint32_t daysSinceGrant =  (int)((present_time  - lockiter->timestamp) / 60);
    uint32_t firstPayPeriod = 1;
    uint32_t payoutTimePeriod = 1;

  2. Permit anyone to call the addlocked action in the system contract.

  In: fio.system.cpp

  Comment out the following line in the addlocked action of the fio.system.cpp file

    // require_auth(_self);


  ADDITIONAL CHANGES REQUIRED FOR STAKING TESTS

  3. you must shorten the unstake locking period

  go to the contract fio.staking.cpp and change the following lines

  change

  int64_t UNSTAKELOCKDURATIONSECONDS = 604800;

   to become

  int64_t UNSTAKELOCKDURATIONSECONDS = 70;

  Next, update both instances of SECONDSPERDAY in the unstakefio function to 10:

  //the days since launch.
  uint32_t insertday = (lockiter->timestamp + insertperiod) / SECONDSPERDAY;

    to become

  //the days since launch.
  uint32_t insertday = (lockiter->timestamp + insertperiod) / 10;

    and

  daysforperiod = (lockiter->timestamp + lockiter->periods[i].duration)/SECONDSPERDAY;

    to become

  daysforperiod = (lockiter->timestamp + lockiter->periods[i].duration)/10;


 4. To enable daily staking rewards, change the foundation account to be one of the accounts we use to test:

   In fio.accounts.hpp

     change the following line:

     static const name FOUNDATIONACCOUNT = name("tw4tjkmo4eyd");

     to become:

    //must change foundation account for testing BPCLAIM...test change only!!
    static const name FOUNDATIONACCOUNT = name("htjonrkf1lgs");

 5. Change the allowable BP claim time (usually 4 hours)

   In fio.common.hpp

     change the following line:

     #define SECONDSBETWEENBPCLAIM (SECONDSPERHOUR * 4)

     to become

     #define SECONDSBETWEENBPCLAIM (5)
*/

function triggerLockTableUpdate(userObj) {

}

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

  // No general (fip-6) or genesis (mainnet) locks
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

  // Two fip-6 locks that are unlocked and one type 4 genesis lock; only total balance should update
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
  it(`transfer 100 tokens to userA to trigger a locktokensv2 table update`, async function () {
    try {
      const result = await userA1.sdk.transferTokens(userA.publicKey, 100000000000, config.api.transfer_tokens_pub_key.fee);
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.transfer_tokens_pub_key.fee)
    } catch (err) {
      throw err;
    }
  });
  it(`confirm that locktokensv2 remaining_lock_amount is 0`, async function () {
    // shows that lock table has been updated
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA1.account,
      upper_bound: userA1.account,
      reverse: true,
      key_type: 'i64',
      index_position: '2'
    }

    try {
      const lockedtokens = await callFioApi("get_table_rows", json);
      expect(lockedtokens.rows[0].remaining_lock_amount).to.equal(0);
    } catch (err) {
      throw err;
    }
  });

  // Confirm that there is a mainnet lock for userA1
  it(`Call get_table_rows from lockedtokens. Expect: remaining_locked_amount = ${fundsAmount}`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: userA1.account,
        upper_bound: userA1.account,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(0);
      expect(result.rows[0].remaining_locked_amount).to.equal(fundsAmount);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Happy Test, Retire ${fundsAmount} SUFs from UserA1 (type 4 lock)`, async function () {
    let newUserBal;
    userA1Bal = await userA1.sdk.genericAction('getFioBalance', {});

    try {
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
      // userA1 has 3000 unlocked and 1000 locked, so available should not decrease
      expect(newUserBal.available).to.equal(userA1Bal.available);
      expect(newUserBal.balance).to.equal(userA1Bal.balance - fundsAmount);
    } catch (err) {
      console.log('err: ', err)
      throw err;
    }
  });

  // Confirm that userA1 mainnet locks decreased by 1000 FIO (so it is zero)
  it(`Call get_table_rows from lockedtokens. Expect: remaining_locked_amount = 0`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: userA1.account,
        upper_bound: userA1.account,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(0);
      expect(result.rows[0].remaining_locked_amount).to.equal(0);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  /*
  Retire 1000 FIO tokens from a Type 1 locked account with “test string” memo,
  where some > 1000 tokens were unlocked and > 1000 are still locked and new funds have been sent in.
  Observe:
  Account balance is updated
  Total tokens issued count is reduced by 1000
  Locks table is updated and unlocked tokens remain the same
  */

  // No fip-6 locks and one type 1 genesis lock; only total balance should update
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
  it(`transfer 100 tokens to userA to trigger a locktokensv2 table update`, async function () {
    try {
      const result = await userA2.sdk.transferTokens(userA.publicKey, 100000000000, config.api.transfer_tokens_pub_key.fee);
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.transfer_tokens_pub_key.fee)
    } catch (err) {
      throw err;
    }
  });
  it(`confirm that userA2 has no lock records in locktokensv2`, async function () {
    // shows that lock table has been updated
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA2.account,
      upper_bound: userA2.account,
      reverse: true,
      key_type: 'i64',
      index_position: '2'
    }

    try {
      const lockedtokens = await callFioApi("get_table_rows", json);
      expect(lockedtokens.rows.length).to.equal(0);
    } catch (err) {
      throw err;
    }
  });
  // Confirm mainnet lock for userA2
  it(`Call get_table_rows from lockedtokens. Expect: remaining_locked_amount = ${grantAmount}`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: userA2.account,
        upper_bound: userA2.account,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(0);
      expect(result.rows[0].remaining_locked_amount).to.equal(grantAmount);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Happy Test, Retire ${fundsAmount} SUFs from UserA2 (type 1 lock)`, async function () {
    let newUserBal;
    userA2Bal = await userA2.sdk.genericAction('getFioBalance', { });

    try {
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
      newUserBal = await userA2.sdk.genericAction('getFioBalance', {});
      // grantAmount is greater than fundsAmount, so only locked tokens should be reduced. Available stays the same.
      expect(newUserBal.balance).to.equal(userA2Bal.balance - fundsAmount);
      expect(newUserBal.available).to.equal(userA2Bal.available);
    } catch (err) {
      throw err;
    }
  });

  // Confirm mainnet lock for userA2 was reduced
  it(`Call get_table_rows from lockedtokens. Expect: remaining_locked_amount = ${grantAmount}`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: userA2.account,
        upper_bound: userA2.account,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(0);
      expect(result.rows[0].remaining_locked_amount).to.equal(grantAmount - fundsAmount);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })
});

describe(`B. (BD-3153) accounts with remaining locked FIP-6 periods should not be able to retire any tokens`, function () {
  let userA, userA1, userA3;
  let userA1Locks;
  let userA1Bal;
  let RETIRETEST1, RETIRETEST2, RETIRETEST3, RETIRETEST4, userA5Keys, userA6Keys;
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
      await faucet.genericAction('pushTransaction', {
        action: 'addlocked',
        account: 'eosio',
        data: {
          owner: RETIRETEST1.account,
          amount: fundsAmount, //grantAmountA1,
          locktype: 4,
        }
      });
    } catch (err) {
      throw err;
    }
  });

  it(`init userA1 from existing keys`, async function () {
    userA1 = await existingUser(RETIRETEST1.account, RETIRETEST1.privateKey, RETIRETEST1.publicKey,'','');
    userA1Bal = await userA1.sdk.genericAction('getFioBalance', { });
  });

  it(`get userA1 locks`, async function () {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'lockedtokens',
      lower_bound: RETIRETEST1.account,
      upper_bound: RETIRETEST1.account,
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
    expect(found).to.equal(true);
  });

  it(`try to retire tokens with a remaining locked FIP-6 period, expect Error`, async function () {

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
          memo: "test string",
          actor: userA1.account,
        }
      });
      newUserBal = await userA1.sdk.genericAction('getFioBalance', {});
      expect(newUserBal.balance).to.equal(userA1Bal.balance - 1500000000000);
      expect(newUserBal.available).to.equal(0);
      expect(result.status).to.equal('OK');
    } catch (err) {
      newUserBal = await userA1.sdk.genericAction('getFioBalance', {});
      //console.log(err, newUserBal);
      expect(err.json.fields[0].error).to.equal('Account with partially locked balance cannot retire');
    }
  });
});

describe(`C. Retire locked FIO Tokens`, function () {
  let userA, userA1, userA2, userA3, userA4, userA5, userA6;
  let userA3Locks, userA4Locks, userA5Locks, userA6Locks;
  let userA2Bal, userA3Bal, userA4Bal, userA5Bal, userA6Bal;
  let RETIRETEST2, RETIRETEST3, RETIRETEST4, userA5Keys, userA6Keys;
  const fundsAmount = 1000000000000

  before(async function () {
    userA = await newUser(faucet);
    userA1 = await newUser(faucet);
    userA3 = await newUser(faucet);

    // generating my own keys so I don't have to rely on fio.devtools
    RETIRETEST2 = await createKeypair();
    RETIRETEST3 = await createKeypair();
    RETIRETEST4 = await createKeypair();
    userA5Keys = await createKeypair();
    userA6Keys = await createKeypair();
  });

  // No genesis locks and 3 unlocked fip-6 locked periods
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
              // "duration": 3000000000000,
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

    await timeout(5000); // let those SUFs unlock
  });
  it(`init userA2 from existing keys`, async function () {
    userA2 = await existingUser(RETIRETEST2.account, RETIRETEST2.privateKey, RETIRETEST2.publicKey,'','');
    userA2Bal = await userA2.sdk.genericAction('getFioBalance', { });
    expect(userA2Bal.balance).to.equal(3100000000000);
    expect(userA2Bal.available).to.equal(3100000000000);
  });
  it(`transfer some tokens to userA1 to trigger a locktokensv2 table update`, async function () {
    try {
      const result = await userA2.sdk.transferTokens(userA1.publicKey, 100000000000, config.api.transfer_tokens_pub_key.fee);
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.transfer_tokens_pub_key.fee)
    } catch (err) {
      throw err;
    }
  });
  it(`confirm that locktokensv2 remaining_lock_amount is 0`, async function () {
    // shows that lock table has been updated
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA2.account,
      upper_bound: userA2.account,
      reverse: true,
      key_type: 'i64',
      index_position: '2'
    }

    try {
      const lockedtokens = await callFioApi("get_table_rows", json);
      expect(lockedtokens.rows[0].remaining_lock_amount).to.equal(0);
    } catch (err) {
      throw err;
    }
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
      let subtractions = userA2Bal.available - (config.api.transfer_tokens_pub_key.fee + 100000000000 + 1100000000050);
      expect(newUserBal.available).to.equal(subtractions);
    } catch (err) {
      newUserBal = await userA2.sdk.genericAction('getFioBalance', { });
      console.log(err, newUserBal);
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
      reverse: true,
      show_payer: false
    }
    let found = false;
    let user;
    let row;
    const lockedtokens = await callFioApi("get_table_rows", json);
    for (user in lockedtokens.rows) {
      if (lockedtokens.rows[user].owner === userA3.account) {
        found = true;
        row = lockedtokens.rows[user];
        break
      }
    }
    expect(found).to.equal(true);
    expect(row.total_grant_amount).to.equal(1100000000000);
    expect(row.remaining_locked_amount).to.equal(1100000000000);

    userA3Locks = row;
  });

  it(`retire < 1100000000000, expect OK`, async function () {
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
      newUserBal = await userA3.sdk.genericAction('getFioBalance', {});
      // Since quantity is less than the lock, only locks will be reduced. Available stays the same.
      expect(newUserBal.balance).to.equal(userA3Bal.balance - 1000500000000);
      expect(newUserBal.available).to.equal(userA3Bal.available);
      userA3Bal = newUserBal;
    } catch (err) {
      newUserBal = await userA3.sdk.genericAction('getFioBalance', { });
      console.log(err, newUserBal);
      userA3Bal = newUserBal;
      throw err;
    }
  });

  it(`Call get_table_rows from lockedtokens. Expect: remaining_locked_amount to be reduced by retire amount`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'lockedtokens',
        lower_bound: userA3.account,
        upper_bound: userA3.account,
        key_type: 'i64',
        index_position: '1'
      }
      const result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);

      expect(result.rows[0].unlocked_period_count).to.equal(0);
      expect(result.rows[0].total_grant_amount).to.equal(1100000000000);
      expect(result.rows[0].remaining_locked_amount).to.equal(1100000000000 - 1000500000000);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


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
      if (lockedtokens.rows[user].owner === userA4.account) {
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
  it(`transfer some tokens to userA1 to trigger a locktokensv2 table update`, async function () {
    try {
      const result = await userA4.sdk.transferTokens(userA1.publicKey, 100000000000, config.api.transfer_tokens_pub_key.fee);
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.transfer_tokens_pub_key.fee)
    } catch (err) {
      throw err;
    }
  });
  it(`confirm that locktokensv2 remaining_lock_amount is 0`, async function () {
    // shows that lock table has been updated
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA4.account,
      upper_bound: userA4.account,
      reverse: true,
      key_type: 'i64',
      index_position: '2'
    }


    try {
      const lockedtokens = await callFioApi("get_table_rows", json);
      expect(lockedtokens.rows[0].lock_amount).to.equal(5000000000000);
      expect(lockedtokens.rows[0].remaining_lock_amount).to.equal(1000000000000);
      expect(lockedtokens.rows[0].payouts_performed).to.equal(4);
      expect(lockedtokens.rows[0].periods.length).to.equal(5);
    } catch (err) {
      throw err;
    }
  });
  it(`Try to retire more tokens than are unlocked, expect Error (Fixed BD-3132) `, async function () {
    let newUserBal;
    userA4Bal = await userA4.sdk.genericAction('getFioBalance', { });

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
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      newUserBal = await userA4.sdk.genericAction('getFioBalance', { });
      expect(newUserBal.balance).to.equal(userA4Bal.balance);
      expect(newUserBal.available).to.equal(userA4Bal.available);
      expect(err.json.fields[0].error).to.equal('Account with partially locked balance cannot retire');
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
      if (lockedtokens.rows[user].owner === RETIRETEST4.account) {
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
      if (lockedtokens.rows[user].owner === userA5.account) {
        found = true;
        userA5Locks = lockedtokens.rows[user];
        break;
      }
    }

    expect(found).to.equal(true);
  });
  it(`transfer some tokens to userA1 to trigger a locktokensv2 table update`, async function () {
    try {
      const result = await userA5.sdk.transferTokens(userA1.publicKey, 100000000000, config.api.transfer_tokens_pub_key.fee);
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.transfer_tokens_pub_key.fee)
    } catch (err) {
      throw err;
    }
  });
  it(`confirm that locktokensv2 remaining_lock_amount is 0`, async function () {
    // shows that lock table has been updated
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA5.account,
      upper_bound: userA5.account,
      reverse: true,
      key_type: 'i64',
      index_position: '2'
    }


    try {
      const lockedtokens = await callFioApi("get_table_rows", json);
      expect(lockedtokens.rows[0].remaining_lock_amount).to.equal(5000000000000);
      expect(lockedtokens.rows[0].payouts_performed).to.equal(2);
      expect(lockedtokens.rows[0].periods.length).to.equal(7);
    } catch (err) {
      throw err;
    }
  });
  it(`Try to retire 4000000000000 tokens, expect Error (Fixed BD-3132) `, async function () {
    let newUserBal;
    userA5Bal = await userA5.sdk.genericAction('getFioBalance', { });

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
      expect(result.status).to.not.equal('OK');
      userA5Bal = newUserBal;
    } catch (err) {
      newUserBal = await userA5.sdk.genericAction('getFioBalance', { });
      expect(newUserBal.balance).to.equal(userA5Bal.balance);
      expect(newUserBal.available).to.equal(userA5Bal.available);
      expect(err.json.fields[0].error).to.equal('Account with partially locked balance cannot retire');
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
      if (lockedtokens.rows[user].owner === userA5.account) {
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
      if (lockedtokens.rows[user].owner === userA6.account) {
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
  it(`transfer some tokens to userA1 to trigger a locktokensv2 table update`, async function () {
    try {
      const result = await userA6.sdk.transferTokens(userA1.publicKey, 100000000000, config.api.transfer_tokens_pub_key.fee);
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.transfer_tokens_pub_key.fee)
    } catch (err) {
      throw err;
    }
  });
  it(`confirm that locktokensv2 remaining_lock_amount is 0`, async function () {
    // shows that lock table has been updated
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA6.account,
      upper_bound: userA6.account,
      reverse: true,
      key_type: 'i64',
      index_position: '2'
    }


    try {
      const lockedtokens = await callFioApi("get_table_rows", json);
      expect(lockedtokens.rows[0].remaining_lock_amount).to.equal(0);
    } catch (err) {
      throw err;
    }
  });
  it(`Happy Test, Retire ${fundsAmount} SUFs from UserA6 (FIP-6 Lock)`, async function () {
    let newUserBal;
    userA6Bal = await userA6.sdk.genericAction('getFioBalance', {fioPublicKey: userA6.publicKey});

    try {
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
      newUserBal = await userA6.sdk.genericAction('getFioBalance', { fioPublicKey: userA6.publicKey });
      // 1200 locked, retiring 1000, expect only balance to change, not available since locks are retired first
      expect(userA6Bal.available).to.equal(newUserBal.available);
      expect(userA6Bal.balance - newUserBal.balance).to.equal(fundsAmount);
      } catch (err) {
      throw err;
    }
  });
});

describe(`D. Try to retire from accounts with staked tokens`, function () {
  let bp1, bp2, bp3, userA, userA1, userP, userAKeys, userA1Keys;
  let userABal, userA1Bal;

  const fundsAmount = 1000000000000;
  const stakeAmt = 1000000000000;

  before(async function () {
    // Create sdk objects for the orinigal localhost BPs
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    userP = await newUser(faucet);
    userAKeys = await createKeypair();
    userA1Keys = await createKeypair();

    await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: userAKeys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: 1,
            amount: 5000000000000,
          },
          {
            duration: 2,
            amount: 4000000000000,
          },
          {
            duration: 3,
            amount: 1000000000000,
          }
        ],
        amount: 10000000000000,
        max_fee: 400000000000,
        tpid: '',
        actor: faucet.account,
      }
    });

    await timeout(5000);

    // transfer some test FIO
    await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: userAKeys.publicKey,
      // amount: fundsAmount*2,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      tpid: '',
    });
    await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: userA1Keys.publicKey,
      amount: fundsAmount*3,
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

    userA = await existingUser(userAKeys.account, userAKeys.privateKey, userAKeys.publicKey,'','');
    userA1 = await existingUser(userA1Keys.account, userA1Keys.privateKey, userA1Keys.publicKey,'','');

    userABal = await userA.sdk.genericAction('getFioBalance', { });
    userA1Bal = await userA1.sdk.genericAction('getFioBalance', { });

    // proxy so users can stake
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
    await userA1.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: userP.address,
        fio_address: userA1.address,
        actor: userA1.account,
        max_fee: config.api.proxy_vote.fee
      }
    });

    userABal = await userA.sdk.genericAction('getFioBalance', { });
    userA1Bal = await userA1.sdk.genericAction('getFioBalance', { });

    // let userALocks = await userA.sdk.getLocks(userA.publicKey);
    // let userA1Locks = await userA1.sdk.getLocks(userA1.publicKey);
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

  it(`stake 1000 FIO from userA`, async function () {
    let newUserBal;
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
      expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.stake_fio_tokens.fee);
      expect(newUserBal.staked).to.equal(userABal.staked + stakeAmt);
      userABal = newUserBal;
    } catch (err) {
      newUserBal = await userA.sdk.genericAction('getFioBalance', {});
      console.log(err, newUserBal);
      userABal = newUserBal;
      throw err;
    }
  });

  it(`Retire ${fundsAmount} SUFs from userA, expect Error: Account staking cannot retire (Fixed BD-3133)`, async function () {
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
      expect(result.status).to.not.equal('OK');
      userABal = newUserBal;
    } catch (err) {
      newUserBal = await userA.sdk.genericAction('getFioBalance', {});
      expect(err.json.fields[0].error).to.equal("Account staking cannot retire");
      userABal = newUserBal;
    }
  });

  it(`try to get userA1 FIP-6 locks, expect Error: No lock tokens in account`, async function () {
    try {
      const result = await userA1.sdk.getLocks(userA1Keys.publicKey);
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.message).to.equal('No lock tokens in account');
    }

  });

  it(`stake 2000 FIO from userA1`, async function () {
    let newUserBal;
    userA1Bal = await userA1.sdk.genericAction('getFioBalance', { });
    let stake = stakeAmt * 2;

    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA1.address,
          amount: stake,
          actor: userA1.account,
          max_fee: config.api.stake_fio_tokens.fee,
          tpid: ''
        }
      });
      newUserBal = await userA1.sdk.genericAction('getFioBalance', {});
      expect(result).to.have.all.keys('block_num', 'fee_collected', 'status', 'transaction_id');
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.stake_fio_tokens.fee);
      expect(newUserBal.staked).to.equal(stake);
      userA1Bal = newUserBal;
    } catch (err) {
      newUserBal = await userA1.sdk.genericAction('getFioBalance', {});
      console.log(err, newUserBal);
      userA1Bal = newUserBal;
      throw err;
    }
  });

  it(`unstake 1000 FIO from userA1`, async function () {
    let newUserBal;
    userA1Bal = await userA1.sdk.genericAction('getFioBalance', {});

    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA1.address,
          amount: stakeAmt,
          actor: userA1.account,
          max_fee: config.api.unstake_fio_tokens.fee,
          tpid: ''
        }
      });
      newUserBal = await userA1.sdk.genericAction('getFioBalance', {});
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.stake_fio_tokens.fee);
      expect(userA1Bal.staked - newUserBal.staked).to.equal(stakeAmt);
      userA1Bal = newUserBal;
    } catch (err) {
      newUserBal = await userA1.sdk.genericAction('getFioBalance', {});
      console.log(err, newUserBal);
      userA1Bal = newUserBal;
      throw err;
    }

    // await timeout(72000);
  });

  it(`get userA1 FIP-6 locks and verify the staking unlock period has been added`, async function () {
    const result = await userA1.sdk.getLocks(userA1Keys.publicKey);
    expect(result.remaining_lock_amount).to.equal(1000000000000);
    expect(result.unlock_periods.length).to.equal(1);
    expect(result.unlock_periods[0].amount).to.equal(1000000000000);
    expect(result.unlock_periods[0].duration).to.equal(70);
    await timeout(72000);
  });

  it(`try to retire 1000 tokens from userA1, expect Error: Account staking cannot retire`, async function () {
    let newUserBal;
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: fundsAmount,
          memo: "test string",
          actor: userA1.account,
        }
      });
      newUserBal = await userA1.sdk.genericAction('getFioBalance', {});
      expect(result.status).to.not.equal('OK');
      userA1Bal = newUserBal;
    } catch (err) {
      newUserBal = await userA1.sdk.genericAction('getFioBalance', {});
      expect(err.json.fields[0].error).to.equal("Account staking cannot retire");
      userA1Bal = newUserBal;
    }
  });

  it(`unstake remaining staked FIO tokens from userA1`, async function () {
    let newUserBal;
    userA1Bal = await userA1.sdk.genericAction('getFioBalance', {});

    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA1.address,
          amount: stakeAmt,
          actor: userA1.account,
          max_fee: config.api.unstake_fio_tokens.fee,
          tpid:''
        }
      });
      newUserBal = await userA1.sdk.genericAction('getFioBalance', {});
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.unstake_fio_tokens.fee);
      expect(userA1Bal.staked - newUserBal.staked).to.equal(stakeAmt);
      userA1Bal = newUserBal;
    } catch (err) {
      newUserBal = await userA1.sdk.genericAction('getFioBalance', {});
      console.log(err, newUserBal);
      userA1Bal = newUserBal;
      throw err;
    }
  });

  it(`get userA1 FIP-6 locks and verify the staking unlock period has been added`, async function () {
    const result1 = await userA1.sdk.getLocks(userA1Keys.publicKey);
    expect(result1.remaining_lock_amount).to.equal(1000000000000);
    expect(result1.unlock_periods.length).to.equal(1);
    expect(result1.unlock_periods[0].amount).to.equal(1000000000000);
    expect(result1.unlock_periods[0].duration).to.be.greaterThanOrEqual(140);
    await timeout(142000);
    // check again after the period unlocks
    const result2 = await userA1.sdk.getLocks(userA1Keys.publicKey);
    expect(result2.remaining_lock_amount).to.equal(0);
    expect(result2.unlock_periods.length).to.equal(0);
  });

  it(`transfer some tokens to userA to trigger a locktokensv2 table update`, async function () {
    try {
      const result = await userA1.sdk.transferTokens(userA.publicKey, 100000000000, config.api.transfer_tokens_pub_key.fee);
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.transfer_tokens_pub_key.fee)
    } catch (err) {
      throw err;
    }
  });

  it(`confirm that locktokensv2 remaining_lock_amount is 0`, async function () {
    // shows that lock table has been updated
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA1.account,
      upper_bound: userA1.account,
      reverse: true,
      key_type: 'i64',
      index_position: '2'
    }


    try {
      const lockedtokens = await callFioApi("get_table_rows", json);
      expect(lockedtokens.rows[0].remaining_lock_amount).to.equal(0);
    } catch (err) {
      throw err;
    }
  });

  it(`try to retire 1000 tokens from userA1, expect OK`, async function () {
    let newUserBal;
    userA1Bal = await userA1.sdk.genericAction('getFioBalance', {});

    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: fundsAmount,
          memo: "",
          actor: userA1Keys.account,
        }
      });
      expect(result.status).to.equal('OK');
      newUserBal = await userA1.sdk.genericAction('getFioBalance', {});
      expect(newUserBal.available).to.be.lessThanOrEqual(userA1Bal.available - fundsAmount);
      expect(newUserBal.balance).to.be.lessThanOrEqual(userA1Bal.balance - fundsAmount);
      userA1Bal = newUserBal;
    } catch (err) {
      newUserBal = await userA1.sdk.genericAction('getFioBalance', {});
      console.log(err, newUserBal);
      throw err;
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

  it(`(minimum amount not met) Retire 1000000000 SUFs from userA2`, async function () {
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

  it(`transfer 100 tokens to userA to trigger a locktokensv2 table update`, async function () {
    try {
      const result = await userA1.sdk.transferTokens(userA.publicKey, 100000000000, config.api.transfer_tokens_pub_key.fee);
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.transfer_tokens_pub_key.fee)
    } catch (err) {
      throw err;
    }
  });

  it(`confirm that locktokensv2 remaining_lock_amount is 0`, async function () {
    // shows that lock table has been updated
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: userA1.account,
      upper_bound: userA1.account,
      reverse: true,
      key_type: 'i64',
      index_position: '2'
    }


    try {
      const lockedtokens = await callFioApi("get_table_rows", json);
      expect(lockedtokens.rows[0].remaining_lock_amount).to.equal(0);
    } catch (err) {
      throw err;
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
      expect(result.status).to.not.equal('OK');
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

  it(`(negative quantity) Retire -1000000000 SUFs from userA2 (Fixed BD-3166)`, async function () {
    let newUserBal;
    userA2Bal = await userA2.sdk.genericAction('getFioBalance', {});
    try {
      const result = await userA2.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: -1000000000,
          memo: "test string",
          actor: userA2.account,
        }
      });
      expect(result.status).to.not.equal('OK');
      newUserBal = await userA2.sdk.genericAction('getFioBalance', {});
      expect(newUserBal.balance).to.equal(userA2Bal.balance);
      expect(newUserBal.available).to.equal(userA2Bal.available);
    } catch (err) {
      newUserBal = await userA2.sdk.genericAction('getFioBalance', {});
      expect(newUserBal.balance).to.equal(userA2Bal.balance);
      expect(newUserBal.available).to.equal(userA2Bal.available);
      expect(err.json.fields[0].error).to.equal('Minimum 1000 FIO has to be retired');
    }
  });
  it(`(negative quantity) Retire 0 SUFs from userA2 (Fixed BD-3166)`, async function () {
    let newUserBal;
    userA2Bal = await userA2.sdk.genericAction('getFioBalance', {});
    try {
      const result = await userA2.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: 0,
          memo: "test string",
          actor: userA2.account,
        }
      });
      expect(result.status).to.not.equal('OK');
      newUserBal = await userA2.sdk.genericAction('getFioBalance', {});
      expect(newUserBal.balance).to.equal(userA2Bal.balance);
      expect(newUserBal.available).to.equal(userA2Bal.available);
    } catch (err) {
      newUserBal = await userA2.sdk.genericAction('getFioBalance', {});
      expect(newUserBal.balance).to.equal(userA2Bal.balance);
      expect(newUserBal.available).to.equal(userA2Bal.available);
      expect(err.json.fields[0].error).to.equal('Minimum 1000 FIO has to be retired');
    }
  });
  it(`(negative quantity) Retire -1 SUFs from userA2 (Fixed BD-3166)`, async function () {
    let newUserBal;
    userA2Bal = await userA2.sdk.genericAction('getFioBalance', {});
    try {
      const result = await userA2.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: -1,
          memo: "test string",
          actor: userA2.account,
        }
      });
      expect(result.status).to.not.equal('OK');
      newUserBal = await userA2.sdk.genericAction('getFioBalance', {});
      expect(newUserBal.balance).to.equal(userA2Bal.balance);
      expect(newUserBal.available).to.equal(userA2Bal.available);
    } catch (err) {
      newUserBal = await userA2.sdk.genericAction('getFioBalance', {});
      expect(newUserBal.balance).to.equal(userA2Bal.balance);
      expect(newUserBal.available).to.equal(userA2Bal.available);
      expect(err.json.fields[0].error).to.equal('Minimum 1000 FIO has to be retired');
    }
  });
  it(`(negative quantity) Retire -1000000000000000000000 SUFs from userA2 (Fixed BD-3166)`, async function () {
    let newUserBal;
    userA2Bal = await userA2.sdk.genericAction('getFioBalance', {});
    try {
      const result = await userA2.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: -1000000000000000000000,
          memo: "test string",
          actor: userA2.account,
        }
      });
      expect(result.status).to.not.equal('OK');
      newUserBal = await userA2.sdk.genericAction('getFioBalance', {});
      expect(newUserBal.balance).to.equal(userA2Bal.balance);
      expect(newUserBal.available).to.equal(userA2Bal.available);
    } catch (err) {
      newUserBal = await userA2.sdk.genericAction('getFioBalance', {});
      expect(newUserBal.balance).to.equal(userA2Bal.balance);
      expect(newUserBal.available).to.equal(userA2Bal.available);
      expect(err.message).to.equal('invalid number');
    }
  });
  it(`(negative quantity) Retire -999999999999 SUFs from userA2 (Fixed BD-3166)`, async function () {
    let newUserBal;
    userA2Bal = await userA2.sdk.genericAction('getFioBalance', {});
    try {
      const result = await userA2.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: -999999999999,
          memo: "test string",
          actor: userA2.account,
        }
      });
      expect(result.status).to.not.equal('OK');
      newUserBal = await userA2.sdk.genericAction('getFioBalance', {});
      expect(newUserBal.balance).to.equal(userA2Bal.balance);
      expect(newUserBal.available).to.equal(userA2Bal.available);
    } catch (err) {
      newUserBal = await userA2.sdk.genericAction('getFioBalance', {});
      expect(newUserBal.balance).to.equal(userA2Bal.balance);
      expect(newUserBal.available).to.equal(userA2Bal.available);
      expect(err.json.fields[0].error).to.equal('Minimum 1000 FIO has to be retired');
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

describe(`F. Unlock with various locked and unlocked amounts`, function () {
  let user1, user1TotalBal, user1LockedBal, user1AvailBal, lockTableRemainingAmount, lockTableGrantAmount
  let prevUser1TotalBal, prevUser1AvailBal, prevUser1LockedBal, prevLockTableRemainingAmount, prevLockTableGrantAmount;
  let retireAmount1, retireAmount2;

  const lock1 = 0.5,
    retire1 = 0.25,  // Retire 25% of original total
    retireAmount = 1000;  

  before(async function () {
    user1 = await newUser(faucet);
  });

  it('Get retire_fio_token_fee', async function () {
    try {
      result = await user1.sdk.getFee('add_bundled_transactions', user1.address);
      add_bundled_transactions_fee = result.fee;
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Transfer 10K tokens`, async function () {
    await faucet.genericAction('pushTransaction', {
      action: 'trnsfiopubky',
      account: 'fio.token',
      data: {
        payee_public_key: user1.publicKey,
        amount: 10000000000000,
        max_fee: config.maxFee,
        actor: faucet.account,
        tpid: ""
      }
    });
  });

  it(`Get user1 balance`, async function () {
    const result = await user1.sdk.genericAction('getFioBalance', {});
    user1TotalBal = result.balance;
    user1AvailBal = result.available;
    user1LockedBal = user1TotalBal - user1AvailBal;
  });

  //First lock half of the account's tokens
  it(`Lock ${lock1} of tokens (locktype = 4)`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addlocked',
        account: 'eosio',
        data: {
          owner: user1.account,
          amount: user1TotalBal * lock1,
          locktype: 4,
        }
      });
      // console.log(result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log(err);
      throw err;
    }
  });

  it(`Get user1 balance`, async function () {
    prevUser1TotalBal = user1TotalBal;
    prevUser1AvailBal = user1AvailBal;
    prevUser1LockedBal = user1LockedBal;
    const result = await user1.sdk.genericAction('getFioBalance', {});
    //console.log('Result: ', result);
    user1TotalBal = result.balance;
    user1AvailBal = result.available;
    user1LockedBal = user1TotalBal - user1AvailBal;
    //console.log('user1TotalBal: ', user1TotalBal);
    //console.log('user1AvailBal: ', user1AvailBal);
    //console.log('user1LockedBal: ', user1LockedBal);

    expect(user1TotalBal).to.equal(prevUser1TotalBal);
    expect(user1AvailBal).to.equal(prevUser1AvailBal * lock1);
    expect(user1LockedBal).to.equal(prevUser1LockedBal + (prevUser1AvailBal * lock1));
  });

  it(`get user1 locks`, async function () {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'lockedtokens',
      lower_bound: user1.account,
      upper_bound: user1.account,
      reverse: true,
      show_payer: false
    }
    let found = false;
    let user;
    let row;
    const lockedtokens = await callFioApi("get_table_rows", json);
    for (user in lockedtokens.rows) {
      if (lockedtokens.rows[user].owner === user1.account) {
        found = true;
        row = lockedtokens.rows[user];
        break
      }
    }
    lockTableRemainingAmount = row.remaining_locked_amount;
    lockTableGrantAmount = row.total_grant_amount;
    //console.log(row);
    expect(found).to.equal(true);
    expect(row.total_grant_amount).to.equal(user1LockedBal);
    expect(row.remaining_locked_amount).to.equal(user1LockedBal);
  });

  //TODO: not sure what is going on here, but I didn't write these tests, so will look into it later.
  // I would expect this to fail given that both balance AND available are being reduced

  // Retire 25% of total balance. Since half of the total is locked, this should reduce the number of locked tokens by half.
  it(`Retire ${retire1} of total balance.`, async function () {
    retireAmount1 = user1TotalBal * retire1;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: retireAmount1,
          memo: "",
          actor: user1.account,
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log(err);
      throw err;
    }
  });

  // Number of locked tokens should be reduced by half
  it(`Get user1 balance. Expect reduction in total and locked amount only (since locked tokens get retired before unlocked tokens). (BD-3227)`, async function () {
    prevUser1TotalBal = user1TotalBal;
    prevUser1AvailBal = user1AvailBal;
    prevUser1LockedBal = user1LockedBal;

    try {
      const result = await user1.sdk.genericAction('getFioBalance', {});

      //console.log('Result: ', result);
      user1TotalBal = result.balance;
      user1AvailBal = result.available;
      user1LockedBal = user1TotalBal - user1AvailBal;
      //console.log('user1TotalBal: ', user1TotalBal);
      //console.log('user1AvailBal: ', user1AvailBal);
      //console.log('user1LockedBal: ', user1LockedBal);
      // Total balance should be reduced
      expect(user1TotalBal).to.equal(prevUser1TotalBal - retireAmount1);
      // The available balance should not change (since only locked tokens were retired)
      expect(user1AvailBal).to.equal(prevUser1AvailBal);
      // Locked balance should be reduced
      expect(user1LockedBal).to.equal(prevUser1LockedBal - retireAmount1);
    } catch (err) {
      console.log(err);
      throw err;
    }
  });

  it(`get user1 locks`, async function () {
    prevLockTableRemainingAmount = lockTableRemainingAmount;
    prevLockTableGrantAmount = lockTableGrantAmount;
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'lockedtokens',
      lower_bound: user1.account,
      upper_bound: user1.account,
      reverse: true,
      show_payer: false
    }
    let found = false;
    let user;
    let row;
    const lockedtokens = await callFioApi("get_table_rows", json);
    for (user in lockedtokens.rows) {
      if (lockedtokens.rows[user].owner === user1.account) {
        found = true;
        row = lockedtokens.rows[user];
        break
      }
    }
    //console.log(row);

    lockTableRemainingAmount = row.remaining_locked_amount;
    lockTableGrantAmount = row.total_grant_amount;
    expect(found).to.equal(true);
    expect(row.total_grant_amount).to.equal(prevLockTableGrantAmount);
    expect(row.remaining_locked_amount).to.equal(prevLockTableRemainingAmount - (prevUser1TotalBal * retire1));
  });

  it(`Retire remaining_lock_amount + ${retireAmount} of total balance.`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: lockTableRemainingAmount + retireAmount,
          memo: "",
          actor: user1.account,
        }
      });
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log(err.json);
      throw err;
    }
  });

  it(`Get user1 balance. Expect locked balance = 0 and reduction in total and available balance. (BD-3227)`, async function () {
    prevUser1TotalBal = user1TotalBal;
    prevUser1AvailBal = user1AvailBal;
    prevUser1LockedBal = user1LockedBal;
    const result = await user1.sdk.genericAction('getFioBalance', {});
    //console.log('Result: ', result);
    user1TotalBal = result.balance;
    user1AvailBal = result.available;
    user1LockedBal = user1TotalBal - user1AvailBal;
    expect(user1TotalBal).to.equal(prevUser1TotalBal - (lockTableRemainingAmount + retireAmount));
    expect(user1AvailBal).to.equal(prevUser1AvailBal - retireAmount);
    expect(user1LockedBal).to.equal(0);
  });

  it(`get user1 locks. Expect Lock to go away?? or be empty`, async function () {
    prevLockTableRemainingAmount = lockTableRemainingAmount;
    prevLockTableGrantAmount = lockTableGrantAmount;
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'lockedtokens',
      lower_bound: user1.account,
      upper_bound: user1.account,
      reverse: true,
      show_payer: false
    }
    let found = false;
    let user;
    let row;
    const lockedtokens = await callFioApi("get_table_rows", json);
    for (user in lockedtokens.rows) {
      if (lockedtokens.rows[user].owner === user1.account) {
        found = true;
        row = lockedtokens.rows[user];
        break
      }
    }
    //console.log(row);

    lockTableRemainingAmount = row.remaining_locked_amount;
    lockTableGrantAmount = row.total_grant_amount;
    expect(found).to.equal(true);
    expect(row.total_grant_amount).to.equal(prevLockTableGrantAmount);
    expect(row.remaining_locked_amount).to.equal(0);
  });
});

describe(`G. Test voting power with retire`, function () {

  let user1, user1Balance, user1LastVoteWeight, totalVotedFio;
  //const fundsAmount = 1000000000000;
  const lock1Amount = 400000000000;
  const lock2Amount = 600000000000;
  const fundsAmount = lock1Amount + lock2Amount;

  it(`Create users`, async () => {
    user1 = await newUser(faucet);
  });

  it(`transferLockedTokens to user1`, async function () {
    try {
      const result = await faucet.genericAction('transferLockedTokens', {
        payeePublicKey: user1.publicKey,
        canVote: 0,
        periods: [
          {
            duration: 120,
            amount: lock1Amount,
          },
          {
            duration: 240,
            amount: lock2Amount,
          }
        ],
        amount: lock1Amount + lock2Amount,
        maxFee: config.maxFee,
        tpid: ''
      });
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log('error: ', err)
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    };
  });

  it(`user1 votes for bp1@dapixdev`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: user1.address,
          actor: user1.account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  });

  it(`getFioBalance before retire `, async () => {
    const result = await user1.sdk.genericAction('getFioBalance', { });
    user1Balance = result.balance;
    //console.log('Balance: ', user1Balance)
  });

  it(`Get totalVotedFio before retire`, async () => {
    totalVotedFio = await getTotalVotedFio();
    //console.log('totalVotedFio:', totalVotedFio);
  });

  it(`Get user1 last_vote_weight before retire.`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        lower_bound: user1.account,
        upper_bound: user1.account,
        key_type: "name",
        index_position: "3",
        show_payer: false
      }
      const voter = await callFioApi("get_table_rows", json);
      user1LastVoteWeight = Math.trunc(voter.rows[0].last_vote_weight);

      //console.log('user1LastVoteWeight:', user1LastVoteWeight);
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  });

  it(`Retire ${fundsAmount} SUFs from user1`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: fundsAmount,
          memo: "test string",
          actor: user1.account,
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err);
      throw err;
    }
  });

  it(`getFioBalance after retire `, async () => {
    const prevBalance = user1Balance;
    const result = await user1.sdk.genericAction('getFioBalance', { });
    user1Balance = result.balance;
    //console.log('Balance: ', user1Balance)
    expect(user1Balance).to.equal(prevBalance - fundsAmount);
  });

  it(`Get totalVotedFio after retire. `, async () => {
    const prevTotalVoteFIO = totalVotedFio;
    totalVotedFio = await getTotalVotedFio();
    //console.log('totalVotedFio:', totalVotedFio);
    expect(totalVotedFio).to.equal(prevTotalVoteFIO - fundsAmount);
  })

  it(`Get user1 last_vote_weight after retire.`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        lower_bound: user1.account,
        upper_bound: user1.account,
        key_type: "name",
        index_position: "3",
        show_payer: false
      }
      const prevUser1VoteWeight = user1LastVoteWeight;
      const voter = await callFioApi("get_table_rows", json);
      user1LastVoteWeight = Math.trunc(voter.rows[0].last_vote_weight);
      //console.log('user1LastVoteWeight:', user1LastVoteWeight);
      expect(user1LastVoteWeight).to.equal(prevUser1VoteWeight - fundsAmount);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal('null');
    }
  });

});