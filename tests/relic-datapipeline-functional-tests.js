
/*
this test will perform trigger adata verfificatioins.
to run the test, you must have a fio local dev net, running state history,and also have
relic database and fio.chronicle running on the dev box.
this file hardcodes the relic database connection information,
edit the info to match your chronicle installation.
*/


require('mocha')
//NOTE -- to run these tests do npm install pg first.
const { Client } = require('pg');
const {expect} = require('chai')
const {newUser, existingUser, createKeypair, fetchJson, timeout, callFioApi} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');
let client;




before(async () => {
  try{
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
  client = new Client({
    user: 'chronicle_user',
    host: '35.82.73.97',
    database: 'relicdb',
    password: 'relicchronicle1@0@2',
    port: 5432, // Default PostgreSQL port
  });
  await client.connect();
  console.log("connected to relic db");
} catch (err) {
  console.log('Error', err);
}
})

after(async () => {
  // Disconnect from the database after all tests are done
  await client.end();
});

describe(`************************** relic-datapipeline-finctional-tests.js ************************** \n    A. Test all trigger actions, verify table contents updated to expected values`, () => {

    let userA1

    it(`Create users`, async () => {
      try{
        userA1 = await newUser(faucet);
        console.log("created user");
      }catch(err){
        console.log(err);
      }
    })

    it(`bind2eosio trigger verify accounts, and account_activity contents`, async () => {
      try {

          let userA2 = await newUser(faucet);

          //accounts info
          const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userA2.account + '\'';
          const resAccounts = await client.query(qstrAccounts);
          //console.log("res ",res);
          console.log("bind2eosio verify one row returned from accounts");
          expect(resAccounts.rowCount).to.equal(1);
          console.log("bind2eosio verify account name returned");
          expect(resAccounts.rows[0].account_name).equals(userA2.account);
          const json = {
            fio_address: userA2.address
           }
          let result = await callFioApi("get_encrypt_key", json);
          console.log("bind2eosio verify account pub key matches chain");
          expect(result.encrypt_public_key).to.equal(resAccounts.rows[0].public_key);
         
         
          //block info
          const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resAccounts.rows[0].fk_block_number ;
          const resBlocks = await client.query(qstrBlocks);
         // console.log(resBlocks);
          console.log("bind2eosio verify one row returned from blocks");
          expect(resBlocks.rowCount).to.equal(1);
          console.log("bind2eosio verify timestamp from blocks");
          expect(resBlocks.rows[0].stamp.getTime()).to.equal(resAccounts.rows[0].block_timestamp.getTime());
          
          
          //get transaction info.
          const qstrTransactionss = 'SELECT * FROM transactions WHERE fk_block_number = ' + resAccounts.rows[0].fk_block_number ;
          const resTransactions = await client.query(qstrTransactionss);
         // console.log(resTransactions);
          console.log("bind2eosio verify one row returned from transactions");
          expect(resTransactions.rowCount).to.equal(1);
          console.log("bind2eosio verify timestamp from transactions");
          expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resAccounts.rows[0].block_timestamp.getTime());
          console.log("bind2eosio verify that the transaction request_data contains the pub key for userA2");
          expect(resTransactions.rows[0].request_data).contains(resAccounts.rows[0].public_key);

      }catch(err){
        console.log(err);
        expect(err).to.equal(null);
      }
    })

    it(`trnsfiopubky trigger verify accounts, and account_activity contents`, async () => {
      try {

          let userA2 = await newUser(faucet);
          const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userA2.account + '\'';
          const resAccounts = await client.query(qstrAccounts);


          //account info
          //console.log("res ",res);
          console.log("trnsfiopubky verify one row returned from accounts");
          expect(resAccounts.rowCount).to.equal(1);
          console.log("trnsfiopubky verify account name returned");
          expect(resAccounts.rows[0].account_name).equals(userA2.account);

          //token transfers
          const qstrTransToks = 'SELECT * FROM tokentransfers WHERE fk_payee_account_id = ' + resAccounts.rows[0].pk_account_id ;
          const resTokTrans = await client.query(qstrTransToks);
          //console.log("resTokTrans ",resTokTrans);
          console.log("trnsfiopubky verify one row returned from tokentransfers");
          expect(resTokTrans.rowCount).to.equal(1);
          console.log("trnsfiopubky verify tokentransfers payee account name returned");
          expect(resTokTrans.rows[0].fk_payee_account_id).equals(resAccounts.rows[0].pk_account_id);
          console.log("trnsfiopubky verify tokentransfers type returned");
          expect(resTokTrans.rows[0].token_transfer_type).equals('transfer');
         
          //block info
          const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resTokTrans.rows[0].fk_block_number ;
          const resBlocks = await client.query(qstrBlocks);
          console.log("trnsfiopubky verify one row returned from blocks");
          expect(resBlocks.rowCount).to.equal(1);
          console.log("trnsfiopubky verify timestamp from blocks");
          expect(resBlocks.rows[0].stamp.getTime()).to.equal(resTokTrans.rows[0].block_timestamp.getTime());
          
          //transaction info
          const qstrTransactionss = 'SELECT * FROM transactions WHERE fk_block_number = ' + resAccounts.rows[0].fk_block_number ;
          const resTransactions = await client.query(qstrTransactionss);
         // console.log(resTransactions);
          console.log("trnsfiopubky verify one row returned from transactions");
          expect(resTransactions.rowCount).to.equal(1);
          console.log("trnsfiopubky verify timestamp from transactions");
          expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resAccounts.rows[0].block_timestamp.getTime());
          console.log("trnsfiopubky verify that the transaction request_data contains the pub key for userA2");
          expect(resTransactions.rows[0].request_data).contains(resAccounts.rows[0].public_key);
          console.log("trnsfiopubky verify that the transaction action_name contains the pub key for userA2");
          expect(resTransactions.rows[0].action_name).equals('trnsfiopubky');  
        
      }catch(err){
        console.log(err);
        expect(err).to.equal(null);
      }
    })

    it(`trnsloctoks trigger verify accounts, and account_activity contents`, async () => {
      try {

        userA1 = await newUser(faucet);
        let keys = await createKeypair();
        let locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
        let accountnm = await FIOSDK.accountHash(keys.publicKey)
       // console.log(accountnm);
       
        //call transfer locked tokens success case.
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: keys.publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 20,
                amount: 200000000000,
              },
              {
                duration: 40,
                amount: 300000000000,
              }
            ],
            amount: 500000000000,
            max_fee: config.maxFee,
            tpid: '',
            actor: userA1.account,
          }

        })
        expect(result.status).to.equal('OK');

//
//wait
await timeout(2000)


          const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + accountnm.accountnm + '\'';
          const resAccounts = await client.query(qstrAccounts);

          //console.log("query ",qstrAccounts);
          //account info
          //console.log("res ",resAccounts);
          console.log("trnsloctoks verify one row returned from accounts");
          expect(resAccounts.rowCount).to.equal(1);
          console.log("trnsloctoks verify account name returned");
          expect(resAccounts.rows[0].account_name).equals(accountnm.accountnm);

          //token transfers
          const qstrTransToks = 'SELECT * FROM tokentransfers WHERE fk_payee_account_id = ' + resAccounts.rows[0].pk_account_id ;
          const resTokTrans = await client.query(qstrTransToks);
         // console.log("tokenTransfers ", qstrTransToks);
         // console.log("resTokTrans ",resTokTrans);
          console.log("trnsloctoks verify one row returned from tokentransfers");
          expect(resTokTrans.rowCount).to.equal(1);
          console.log("trnsloctoks verify tokentransfers payee account name returned");
          expect(resTokTrans.rows[0].fk_payee_account_id).equals(resAccounts.rows[0].pk_account_id);
          console.log("trnsloctoks verify tokentransfers type returned");
          expect(resTokTrans.rows[0].token_transfer_type).equals('transfer_locked');
         
          //block info
          const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resTokTrans.rows[0].fk_block_number ;
          const resBlocks = await client.query(qstrBlocks);
          console.log("trnsloctoks verify one row returned from blocks");
          expect(resBlocks.rowCount).to.equal(1);
          console.log("trnsloctoks verify timestamp from blocks");
          expect(resBlocks.rows[0].stamp.getTime()).to.equal(resTokTrans.rows[0].block_timestamp.getTime());
          
          //transaction info
          const qstrTransactionss = 'SELECT * FROM transactions WHERE fk_block_number = ' + resAccounts.rows[0].fk_block_number ;
          const resTransactions = await client.query(qstrTransactionss);
         // console.log(resTransactions);
          console.log("trnsloctoks verify one row returned from transactions");
          expect(resTransactions.rowCount).to.equal(1);
          console.log("trnsloctoks verify timestamp from transactions");
          expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resAccounts.rows[0].block_timestamp.getTime());
          console.log("trnsloctoks verify that the transaction request_data contains the pub key for userA2");
          expect(resTransactions.rows[0].request_data).contains(resAccounts.rows[0].public_key);
          console.log("trnsloctoks verify that the transaction action_name contains the pub key for userA2");
          expect(resTransactions.rows[0].action_name).equals('trnsloctoks');  
        
      }catch(err){
        console.log(err);
        expect(err).to.equal(null);
      }
    })

    //note stake unstake tests must be run, both of them sequentially.
    let userstake;
    it(`stakefio trigger tokenstaking contents`, async () => {
      try {

        userstake = await newUser(faucet);

        //vote for producers
        let result = await userstake.sdk.genericAction('pushTransaction', {
          action: 'voteproducer',
          account: 'eosio',
          data: {
            producers: ["bp1@dapixdev"],
            fio_address: userstake.address,
            actor: userstake.account,
            max_fee: config.maxFee
          }
        })
        expect(result.status).to.equal('OK')
       
       
       
        result = await userstake.sdk.genericAction('pushTransaction', {
          action: 'stakefio',
          account: 'fio.staking',
          data: {
            fio_address: userstake.address,
            amount: 111111111111,
            actor: userstake.account,
            max_fee: config.maxFee,
            tpid:''
          }
        })
        // console.log('Result: ', result)
        expect(result.status).to.equal('OK')

//
//wait
await timeout(2000)


          const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userstake.account + '\'';
          const resAccounts = await client.query(qstrAccounts);

          //console.log("query ",qstrAccounts);
          //account info
          //console.log("res ",resAccounts);
          console.log("stakefio verify one row returned from accounts");
          expect(resAccounts.rowCount).to.equal(1);
          console.log("stakefio verify account name returned");
          expect(resAccounts.rows[0].account_name).equals(userstake.account);

          //token transfers
          const qstrTokenStakings = 'SELECT * FROM tokenstakings WHERE fk_staker_account_id = ' + resAccounts.rows[0].pk_account_id ;
          const resTokenStakings = await client.query(qstrTokenStakings);
         // console.log("tokenstakings ", qstrTokenStakings);
         // console.log("resTokenStakings ",resTokenStakings);
          console.log("stakefio verify one row returned from tokenstakings");
          expect(resTokenStakings.rowCount).to.equal(1);
          console.log("stakefio verify tokenstakings payee account name returned");
          expect(resTokenStakings.rows[0].fk_staker_account_id).equals(resAccounts.rows[0].pk_account_id);
          
          console.log("stakefio verify tokenstakings fio_suf_amount returned");
          expect(resTokenStakings.rows[0].fio_suf_amount).equals('111111111111');
         
          //block info
          const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resTokenStakings.rows[0].fk_block_number ;
          const resBlocks = await client.query(qstrBlocks);
          console.log("stakefio verify one row returned from blocks");
          expect(resBlocks.rowCount).to.equal(1);
           
          //transaction info
          const qstrTransactionss = 'SELECT * FROM transactions WHERE fk_block_number = ' + resTokenStakings.rows[0].fk_block_number ;
          const resTransactions = await client.query(qstrTransactionss);
        // console.log(resTransactions);
          console.log("stakefio verify one row returned from transactions");
          expect(resTransactions.rowCount).to.equal(1);
          console.log("stakefio verify timestamp from transactions");
          expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
          console.log("stakefio verify that the transaction request_data contains userstake.account");
          expect(resTransactions.rows[0].request_data).contains(userstake.account);
          console.log("stakefio verify that the transaction request_data contains amount used");
          expect(resTransactions.rows[0].request_data).contains('111111111111');
          console.log("stakefio verify that the transaction action_name contains the pub key for userA2");
          expect(resTransactions.rows[0].action_name).equals('stakefio');  
        
      }catch(err){
        console.log(err);
        expect(err).to.equal(null);
      }
    })

    it(`unstakefio trigger tokenstaking contents`, async () => {
      try {

        const result = await userstake.sdk.genericAction('pushTransaction', {
          action: 'unstakefio',
          account: 'fio.staking',
          data: {
            fio_address: userstake.address,
            amount: 55555555555,
            actor: userstake.account,
            max_fee: config.maxFee,
            tpid:''
          }
        })
        // console.log('Result: ', result)
        expect(result.status).to.equal('OK')

//
//wait
await timeout(2000)


          const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userstake.account + '\'';
          const resAccounts = await client.query(qstrAccounts);

          //console.log("query ",qstrAccounts);
          //account info
          //console.log("res ",resAccounts);
          console.log("unstakefio verify one row returned from accounts");
          expect(resAccounts.rowCount).to.equal(1);
          console.log("unstakefio verify account name returned");
          expect(resAccounts.rows[0].account_name).equals(userstake.account);

          //token transfers
          const qstrTokenStakings = 'SELECT * FROM tokenstakings WHERE fk_staker_account_id = ' + resAccounts.rows[0].pk_account_id  ;
          const resTokenStakings = await client.query(qstrTokenStakings);
         // console.log("tokenstakings ", qstrTokenStakings);
         // console.log("resTokenStakings ",resTokenStakings);
          console.log("unstakefio verify one row returned from tokenstakings");
          expect(resTokenStakings.rowCount).to.equal(2);
          console.log("unstakefio verify tokenstakings payee account name returned");
          expect(resTokenStakings.rows[1].fk_staker_account_id).equals(resAccounts.rows[0].pk_account_id);
          
          console.log("unstakefio verify tokenstakings fio_suf_amount returned");
          expect(resTokenStakings.rows[1].fio_suf_amount).equals('-55555555555');
         
          //block info
          const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resTokenStakings.rows[1].fk_block_number ;
          const resBlocks = await client.query(qstrBlocks);
          console.log("unstakefio verify one row returned from blocks");
          expect(resBlocks.rowCount).to.equal(1);
           
          //transaction info
          const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resTokenStakings.rows[1].fk_block_number ;
          const resTransactions = await client.query(qstrTransactions);
         //console.log(resTransactions);
          console.log("unstakefio verify one row returned from transactions");
          expect(resTransactions.rowCount).to.equal(1);
          console.log("unstakefio verify timestamp from transactions");
          expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
          console.log("unstakefio verify that the transaction request_data contains userstake.account");
          expect(resTransactions.rows[0].request_data).contains(userstake.account);
          console.log("unstakefio verify that the transaction request_data contains amount used");
          expect(resTransactions.rows[0].request_data).contains('55555555555');
          console.log("unstakefio verify that the transaction action_name contains the pub key for userA2");
          expect(resTransactions.rows[0].action_name).equals('unstakefio');  
        
      }catch(err){
        console.log(err);
        expect(err).to.equal(null);
      }
    })

    it(`retire tokens verify tokentransfers contents`, async function () {
      try {
        let userA1 = await newUser(faucet);
        const result = await userA1.sdk.genericAction('pushTransaction', {
          action: 'retire',
          account: 'fio.token',
          data: {
            quantity: 1000000000000,
            memo: "edtst",
            actor: userA1.account,
          }
        });
        expect(result.status).to.equal('OK');

        await timeout(2000)

        const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userA1.account + '\'';
        const resAccounts = await client.query(qstrAccounts);

        console.log("retire verify one row returned from accounts");
        expect(resAccounts.rowCount).to.equal(1);
        console.log("retire verify account name returned");
        expect(resAccounts.rows[0].account_name).equals(userA1.account);

        const qstrEmptyAccounts = 'SELECT * FROM accounts WHERE account_name = \'\'';
        const resEmptyAccounts = await client.query(qstrEmptyAccounts);

        console.log("retire verify one row returned from accounts");
        expect(resEmptyAccounts.rowCount).to.equal(1);
        console.log("retire verify account name returned");
        expect(resEmptyAccounts.rows[0].account_name).equals('');

        //token transfers
        const qstrTokTrans = 'SELECT * FROM tokentransfers WHERE fk_payer_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND token_transfer_type = \'retire\'' ;
        const resTokTrans = await client.query(qstrTokTrans);

        console.log("retire verify one row returned from tokentransfers");
        expect(resTokTrans.rowCount).to.equal(1);
        console.log("retire verify tokentransfers payee account name returned");
        expect(resTokTrans.rows[0].fk_payee_account_id).equals(resEmptyAccounts.rows[0].pk_account_id);
        console.log("retire verify tokentransfers suf amount");
        expect(resTokTrans.rows[0].fio_suf_amount).equals('1000000000000');
        console.log("retire verify tokentransfers memo");
        expect(resTokTrans.rows[0].transfer_memo).equals('edtst');
        

        //block info
        const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resTokTrans.rows[0].fk_block_number ;
        const resBlocks = await client.query(qstrBlocks);
        console.log("retire verify one row returned from blocks");
        expect(resBlocks.rowCount).to.equal(1);
        console.log("retire verify timestamp from blocks");
        expect(resBlocks.rows[0].stamp.getTime()).to.equal(resTokTrans.rows[0].block_timestamp.getTime());

                  
        //transaction info
        const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resTokTrans.rows[0].fk_block_number ;
        const resTransactions = await client.query(qstrTransactions);
        //console.log(resTransactions);
        console.log("retire verify one row returned from transactions");
        expect(resTransactions.rowCount).to.equal(1);
        console.log("retire verify timestamp from transactions");
        expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
        console.log("retire verify that the transaction request_data contains userA1.account");
        expect(resTransactions.rows[0].request_data).contains(userA1.account);
        console.log("retire verify that the transaction request_data contains amount used");
        expect(resTransactions.rows[0].request_data).contains('1000000000000');
        console.log("retire verify that the transaction action_name contains retire");
        expect(resTransactions.rows[0].action_name).equals('retire');  

      } catch (err) {
        console.log(err);
        expect(err).to.equal(null);
      }
    });
    
  
/*
list of items for relic yet to be tested.


Retire
Regdomain
Renewdomain
Xferdomain
Setdomainpub
Wrapdomain
Xferescrow
Readdress
Renewaddress
Xferaddress
Addbundles
Addaddress
Remaddress
remalladdr
addnft
remnft
rmallnfts
updcryptkey
regdomadd
burnaddress
newfundsreq
cancelfndreq
recordobt
Burn domain (domains table delta)
Burn address (fionames table delta)

Transfer
Issue
Wraptokens

*/


})

