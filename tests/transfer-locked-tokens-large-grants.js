require('mocha')
const {expect} = require('chai')
const {newUser, getProdVoteTotal, fetchJson, existingUser, generateFioDomain, getAccountFromKey, callFioApi,  generateFioAddress, createKeypair} = require('../utils.js');
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

let userA1, userA2, userA3, userA4, keys, keys1, keys2, keys3, locksdk,
    locksdk1, locksdk2, locksdk3, newFioAddress, newFioDomain, newFioDomain2, newFioAddress2,
    total_bp_votes_before, total_bp_votes_after
const fundsAmount = 500000000000
const maxTestFundsAmount = 5000000000
const halfundsAmount = 220000000000
const largeGrantAmount = 100000000000000000

describe(`************************** transfer-locked-tokens.js ************************** \n A. Create accounts for tests`, () => {


  it.skip(`Create users`, async () => {
    try {
      //NOTE -- these tests must be run on the local 3 node test net.
      //        they use the account htjonrkf1lgs
      //        furthermore, these tests require that the fio.devtools startup file be modified
      //        modify the 08_token_issue.sh and modify the issue amount for htjonrkf1lgs to
      //        become 120000000.000000000 also modify the account euwdcp13zlrj to become 2000000.000000000
      //        with these values the chain will init, and then this set of tests can be run.
    //create SDK for the  htjonrkf1lgs account.
    keys = await createKeypair();
    console.log("priv key ", keys.privateKey);
    console.log("pub key ", keys.privateKey);

    userA1 = await newUser(faucet);

    locksdk = await existingUser('htjonrkf1lgs', '5JCpqkvsrCzrAC3YWhx7pnLodr3Wr9dNMULYU8yoUrPRzu269Xz', 'FIO7uRvrLVrZCbCM2DtCgUMospqUMnP3JUC1sKHA8zNoF835kJBvN', 'dapixdev', 'adam@dapixdev');
    } catch (err) {
      console.log(err.message)
    }
  })
})



describe(`A. Large grant tests`, () => {



  it.skip(`Success Test, Transfer locked tokens,  create grant of 100M`, async () => {
    try {
      const result = await locksdk.sdk.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: keys.publicKey,
          can_vote: 0,
          periods: [
            {
              duration: 20,
              percent: 50.0,
            },
            {
              duration: 40,
              percent: 50.0,
            }
          ],
          amount: largeGrantAmount,
          max_fee: 400000000000,
          tpid: '',
          actor: 'htjonrkf1lgs',
        }
      })
      expect(result.status).to.equal('OK')

    } catch (err) {
     console.log(err.message)
    }
  })

  it.skip(`Waiting 25 seconds`, async () => {
    console.log("            waiting 25 seconds ")
  })

  it.skip(` wait 25 seconds`, async () => {
    try {
      wait(25000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  //one half should get unlocked
  it.skip(`Transfer 4900000 FIO to another account`, async () => {
    try {
    locksdk2 = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
    console.log("priv key: ",locksdk2.privateKey);
      console.log("pub key: ",locksdk2.publicKey);
      console.log("account: ",locksdk2.accountHash);
    const result = await locksdk2.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 4900000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
  } catch (err) {
    console.log(err.message)
  }
  })

  it('Show lock amount for user', async () => {
    let timestamp
    let accountnm =  await getAccountFromKey('FIO7Zq2qUduoQsQxmTvHTvKif8wMm7tX4XWKbQm59rAsU54GZPnSL');

    console.log("account is ",accountnm)
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'eosio',      // Contract that we target
        scope: 'eosio',         // Account that owns the data
        table: 'locktokens',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      lockedAccounts = await callFioApi("get_table_rows", json);
      //console.log('lockedAccounts: ', lockedAccounts)
      for (lockedAccount in lockedAccounts.rows) {
        //if (lockedAccounts.rows[lockedAccount].owner == accounts[0].account) {
       if (lockedAccounts.rows[lockedAccount].owner_account == accountnm) {
          console.log('Count: ', lockedAccount)
          console.log('lockedAccounts.rows[lockedAccount].owner_account: ', lockedAccounts.rows[lockedAccount].owner_account);
          console.log('lockedAccounts.rows[lockedAccount].lock_amount: ', lockedAccounts.rows[lockedAccount].lock_amount);
          console.log('lockedAccounts.rows[lockedAccount].payouts_performed: ', lockedAccounts.rows[lockedAccount].payouts_performed);
          console.log('lockedAccounts.rows[lockedAccount].remaining_lock_amount: ', lockedAccounts.rows[lockedAccount].remaining_lock_amount);
          break;
        }
      }
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})





