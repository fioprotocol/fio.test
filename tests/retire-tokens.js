require('mocha')
const {expect} = require('chai')
const {newUser, existingUser, fetchJson, generateFioDomain, generateFioAddress, createKeypair, callFioApi} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe.only(`************************** retire-tokens.js ************************** \n    A. Retire FIO Tokens`, () => {
  let userA1, userA2, userA3, userA4, prevFundsAmount
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

  const fundsAmount = 1000000000000

  it(`Create users`, async () => {
    userA1 = await newUser(faucet);
    userA2 = await existingUser(RETIRETEST1.account, RETIRETEST1.privateKey, RETIRETEST1.publicKey,'','');
    userA3 = await newUser(faucet);
    userA4 = await existingUser(RETIRETEST2.account, RETIRETEST2.privateKey, RETIRETEST2.publicKey,'','');
  })

  it(`getFioBalance for userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', { })
      //console.log('Result: ', result)
      prevFundsAmount = result.balance
    } catch (err) {
      expect(err.json.message).to.equal(null)
    }
  })

  it(`Transfer ${fundsAmount} FIO to userA1 FIO public key`, async () => {
      const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: fundsAmount,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    //console.log('Result: ', result)
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
  })

  it(`Happy Test, Retire ${fundsAmount} tokens from userA1 (empty memo)`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: fundsAmount,
          memo: "",
          actor: userA1.account,
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK')

    } catch (err) {
     console.log(err.message)
    }
  })


// Lock set in fio.devtools 17_emplace_test_grants_into_locked_tokens.sh
  it(`Happy Test, Retire ${fundsAmount} tokens from RETIRETEST1 jbx4oaspu1h1 (type 1 lock)`, async () => {
    try {
      const result = await userA2.sdk.genericAction('pushTransaction', {
        action: 'retire',
        account: 'fio.token',
        data: {
          quantity: fundsAmount,
          memo: "test string",
          actor: RETIRETEST1.account,
        }
      })
      console.log(`Result: `, result);
      expect(result.status).to.equal('OK');
    } catch (err) {
     console.log(err.message);
     expect(err).to.equal(null);
    }
  })

  it(`Verify userA2 balance is 0`, async () => {
    try {
      const result = await userA2.sdk.genericAction('getFioBalance', { })
      //console.log('Result: ', result)
      expect(result.balance).to.equal(0);
      expect(result.available).to.equal(0);
    } catch (err) {
      console.log(err.message);
    }
  })

it('Confirm userA2 remaining_locked_amount = 0', async () => {
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

  it(`Sad Test, Retire ${fundsAmount} tokens from userA3 (Insufficient funds)`, async () => {
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


  it(`Sad Test, Retire ${fundsAmount} tokens from userA3 (memo > 256)`, async () => {
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
