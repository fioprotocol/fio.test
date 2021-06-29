require('mocha')
const {expect} = require('chai')
const {newUser, existingUser, fetchJson, generateFioDomain, generateFioAddress, createKeypair, callFioApi, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe.only(`************************** retire-tokens.js ************************** \n    A. Retire FIO Tokens`, () => {
  let userA, userA1, userA2, userA3, userA4, userA5, userA6

  const RETIRETEST1 = {
    account: 'jbx4oaspu1h1',
    publicKey: 'FIO6wrUvBNGiKokWkwh3JDnTTXM1P5xj25G7fqhWRzpRbucPiQv16',
    privateKey: '5JmNogi2RUzkueWcpdg2fSLFX3VJ7VAFtsvPLnsu3QdwTDmLBuM'
  }

  const RETIRETEST2 = {
    account:'z4qqs4cugjfa',
    publicKey:'FIO6py1nZ3Vk61oqSAVudh79apo5vkDaFkDHQeHF45EidYmuYUT38',
    privateKey: '5KYPFrVdnrKNJkStfjmkq6LLZAiwa46yyiaLrPSBCsHpBNwrytS'
  }

  const RETIRETEST3 = {
    account:'pzjjgjwwdm5v',
    publicKey: 'FIO6kifTDXvnbS8T7Bvuk4zL3d7bysiZGV2s2vQpTnf5oT31CFqAu',
    privateKey: '5Hs4PZcwsPHVkfWrUVRybikEx5zy92CVYX81s98XPwK1jXWYoEL'
  }

  const RETIRETEST4 = {
    account: 'c5mkju354ibi',
    publicKey: 'FIO6AsajVZBdmWBuxTUFURqGBk822L11q8BpWH8vBXyteiGeU8mRX',
    privateKey:'5K8gtheotX9pXEpswmSs52Hg1rDUHKiD1JYTSMfJqCkfhEa59si'
  }

  const userA5Keys = {
    account: 'tkvlcmcdftuv',
    publicKey: 'FIO5ZiPCxxtND2Z9NvYQYVphGYiXhwDRiH4mbg3ENp6Bh6pGR2WjB',
    privateKey: '5JY4WVpxVHcuWuvHpwDAxJL85xNR5nLeq2V2eyen2pcBybVhhnt'
  }

  const userA6Keys = {
    account: 'isqotfueflhg',
    publicKey: 'FIO5co2UAAAjVgwtaZMT8Uu7pAHHGAtWUzstqg7hZyJKVBWMW7ZDh',
    privateKey: '5JdFRXbxXsKvXWFEuX2GTTakr5oqkhsDVjyXJuUvT8kakgQtmzG'
  }

  const fundsAmount = 1000000000000

  it(`Create users`, async () => {
    userA = await newUser(faucet);
    userA1 = await existingUser(RETIRETEST1.account, RETIRETEST1.privateKey, RETIRETEST1.publicKey,'','');
    userA2 = await existingUser(RETIRETEST2.account, RETIRETEST2.privateKey, RETIRETEST2.publicKey,'','');
    userA3 = await existingUser(RETIRETEST3.account, RETIRETEST3.privateKey, RETIRETEST3.publicKey,'','');
    userA4 = await existingUser(RETIRETEST4.account, RETIRETEST4.privateKey, RETIRETEST4.publicKey,'','');
  })

  it(`Transfer ${fundsAmount} FIO to userA FIO public key`, async () => {
      const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: userA.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    //console.log('Result: ', result)
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
  })


/*
Retire 1000 FIO tokens from a non-locks account with empty memo
Observe:
Account balance is updated
Total tokens issued count is reduced by 1000
*/


  it(`Happy Test, Retire ${fundsAmount} SUFs from userA (empty memo)`, async () => {
    try {
      const result = await userA.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: fundsAmount,
          memo: "",
          actor: userA.account,
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK')

    } catch (err) {
     console.log(err.message)
    }
  })

/*
Retire 1000 FIO tokens from a Type 4 locked account with “test string” memo
Observe:
Account balance is updated
Total tokens issued count is reduced by 1000
Locks table is updated
*/
// Lock set in fio.devtools 17_emplace_test_grants_into_locked_tokens.sh
  it(`Happy Test, Retire ${fundsAmount} SUFs from UserA1 (type 4 lock)`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: fundsAmount,
          memo: "test string",
          actor: userA1.account,
        }
      })
//    console.log(`Result: `, result);
      expect(result.status).to.equal('OK');
    } catch (err) {
     console.log(err.message);
     expect(err).to.equal(null);
    }

    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {  fioPublicKey: userA1.publicKey })
      //console.log('Result: ', result)
      expect(result.balance).to.equal(0);
      expect(result.available).to.equal(0);
    } catch (err) {
      console.log(err.message);
    }

    try {
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
      lockedtokens = await callFioApi("get_table_rows", json);
      for (user in lockedtokens.rows) {
        if (lockedtokens.rows[user].owner == userA1.account) {
          break;
        }
      }
      expect(lockedtokens.rows[user].remaining_locked_amount).to.equal(0);
      //console.log(lockedtokens.rows[user]);
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

  it(`Happy Test, Retire ${fundsAmount} SUFs from UserA2 (type 1 lock)`, async () => {
    try {
      const result = await userA2.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: fundsAmount,
          memo: "test string",
          actor: userA2.account,
        }
      })
  //    console.log(`Result: `, result);
      expect(result.status).to.equal('OK');
    } catch (err) {
     console.log(err.message);
     expect(err).to.equal(null);
    }
    //Verify userA2 balance is 0
    try {
      const result = await userA2.sdk.genericAction('getFioBalance', { fioPublicKey: userA2.publicKey } )
      //console.log('Result: ', result)
      expect(result.balance).to.equal(0);
      expect(result.available).to.equal(0);
    } catch (err) {
      console.log(err.message);
    }

    //verify userA2 remaining_locked_amount = 0
    try {
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
      lockedtokens = await callFioApi("get_table_rows", json);
      for (user in lockedtokens.rows) {
        if (lockedtokens.rows[user].owner == userA2.account) {
          break;
        }
      }
      expect(lockedtokens.rows[user].remaining_locked_amount).to.equal(0);
      //console.log(lockedtokens.rows[user]);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }

  })

  /*
  Retire 1000 FIO tokens from a FIP-6 locked account with “test string” memo,
  where some > 1000 tokens were unlocked and > 1000 are still locked.
  Observe:
  Account balance is updated
  Total tokens issued count is reduced by 1000
  Locks table is updated and unlocked tokens remain the same
  */

// Make the lock
  it(`Set FIP-6 lock for UserA5)`, async () => {
    try {
      const result = await userA4.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: userA5Keys.publicKey,
      	  can_vote: 0,
        	periods: [
        		{ // > 1000 are unlocked
        			"duration": 1,
        			"amount": 1100000000000
        		},
            { // > 1000 are still locked
              "duration": 10000,
              "amount": 1100000000000
            }
        	],
        	amount: 2200000000000,
          max_fee: 40000000000,
        	tpid: "",
        	actor: userA4.account
        }
      })
      //console.log(`Result: `, result);
      expect(result.status).to.equal('OK');

    } catch (err) {
     console.log(err.message);
     console.log(err.json);
    // expect(err).to.equal(null);
    }

      await timeout(1000); // let those SUFs unlock

  })

  it(`Happy Test, Retire ${fundsAmount} SUFs from UserA5 (FIP-6 Lock)`, async () => {
    try {
      //userA5 account is created on trnslocktoks to the new public key
      userA5 = await existingUser(userA5Keys.account, userA5Keys.privateKey, userA5Keys.publicKey,'','');
      const result = await userA5.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: fundsAmount,
          memo: "test string",
          actor: userA5.account,
        }
      })
  //  console.log(`Result: `, result);
      expect(result.status).to.equal('OK');
    } catch (err) {
     console.log(err.message);
     expect(err).to.equal(null);
    }

  })



  /*
  Retire 1000 FIO tokens from a FIP-6 locked account with “test string” memo,
  where some < 1000 tokens were unlocked and > 1000 are still locked.

  Observe:
  Account balance is updated
  Total tokens issued count is reduced by 1000
  Locks table is updated and both locked and unlocked tokens are adjusted
  */

  it(`Set FIP-6 lock for UserA6)`, async () => {
    try {
      const result = await userA4.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: userA6Keys.publicKey,
          can_vote: 0,
          periods: [
            { // < 1000 are unlocked
              "duration": 1,
              "amount": 900000000000
            },
            { // > 1000 are still locked
              "duration": 10000,
              "amount": 1100000000000
            }
          ],
          amount: 2000000000000,
          max_fee: 40000000000,
          tpid: "",
          actor: userA4.account
        }
      })
      //console.log(`Result: `, result);
      expect(result.status).to.equal('OK');
    } catch (err) {
     console.log(err.message);
     console.log(err.json);
    // expect(err).to.equal(null);
    }

      await timeout(1000); // let those SUFs unlock

  })

  it(`Happy Test, Retire ${fundsAmount} SUFs from UserA6 (FIP-6 Lock)`, async () => {
    try {
      //userA6 account is created on trnslocktoks to the new public key
      userA6 = await existingUser(userA6Keys.account, userA6Keys.privateKey, userA6Keys.publicKey,'','');
      const result = await userA6.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: fundsAmount,
          memo: "test string",
          actor: userA6.account,
        }
      })
  //  console.log(`Result: `, result);
      expect(result.status).to.equal('OK');
    } catch (err) {
     console.log(err.message);
     expect(err).to.equal(null);
    }

    try {
      const result = await userA6.sdk.genericAction('getFioBalance', { fioPublicKey: userA6.publicKey } )
      //console.log('Result: ', result)
      expect(result.balance).to.equal(1000000000000);
      expect(result.available).to.equal(0);
    } catch (err) {
      console.log(err.message);
    }


  })

//************ SAD TESTS *************/

      it(`Sad Test, Retire 1 FIO token from userA4`, async () => {
        try {
          const result = await userA4.sdk.genericAction('pushTransaction', {
            action: 'retire',
            account: 'fio.token',
            data: {
              quantity: 1000000000,
              memo: "test string",
              actor: userA4.account,
            }
          })
          expect(result).to.equal(null);
        } catch (err) {
        //  console.log(err.json)
          expect(err.json.fields[0].error).to.equal("Minimum 1000 FIO has to be retired");
        }
      })

      it(`Sad Test, Retire ${fundsAmount} SUFs from userA3 (Insufficient funds)`, async () => {
        try {
          const result = await userA3.sdk.genericAction('pushTransaction', {
            action: 'retire',
            account: 'fio.token',
            data: {
              quantity: fundsAmount*1000,
              memo: "test string",
              actor: userA3.account,
            }
          })
          expect(result).to.equal(null);
        } catch (err) {
         //console.log(err.json)
         expect(err.json.fields[0].error).to.equal("Insufficient balance");

        }
      })


      it(`Sad Test, Retire ${fundsAmount} SUFs from userA3 (memo > 256)`, async () => {
        try {
          const result = await userA3.sdk.genericAction('pushTransaction', {
            action: 'retire',
            account: 'fio.token',
            data: {
              quantity: fundsAmount,
              memo: "I am a really long string I am a really long string I am a really long string I am a really long string I am a really long string I am a really long string I am a really long string I am a really long string I am a really long string I am a really long string I am a really long string I am a really long string 123456789",
              actor: userA3.account,
            }
          })
          expect(result).to.equal(null);

        } catch (err) {
         //console.log(err)
          expect(err.json.fields[0].error).to.equal("memo has more than 256 bytes");
        }
      })


})
