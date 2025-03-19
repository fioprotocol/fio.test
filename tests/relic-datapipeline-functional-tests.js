
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
const {newUser, existingUser, callFioApiSigned, getAccountFromKey, generateFioDomain, generateFioAddress, createKeypair, fetchJson, timeout, callFioApi} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');
let client;


before(async () => {
  try{
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
 client =  new Client({
    user: 'chronicle_user',
    host: '35.82.73.97',
    database: 'relicdb',
    password: 'relicchronicle1@0@2',
    port: 5432, // Default PostgreSQL port
  });
  /*client =  new Client({
    user: 'chronicle_user',
    host: '18.246.18.161',
    database: 'relicdb',
    password: 'password123!'
    //port: 5432, // Default PostgreSQL port
  });*/
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

    it(`trnsloctoks with tpid, verify tpid in relic db, trigger verify accounts, and account_activity contents`, async () => {
      try {

        userA1 = await newUser(faucet);
        let tpidUser = await newUser(faucet);

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
            tpid: tpidUser.address,
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
          console.log("trnsloctoks verify that the transaction tpid");
          expect(resTransactions.rows[0].tpid).equals(tpidUser.address);  
        
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

        await timeout(2000)
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
       
        await timeout(2000)
       
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
        
await timeout(2000); //make sure it goes into a distinct block

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
            memo: "ed'tst",
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

        const qstrEmptyAccounts = 'SELECT * FROM accounts WHERE account_name = \'fio.token\'';
        const resEmptyAccounts = await client.query(qstrEmptyAccounts);

        console.log("retire verify one row returned from accounts");
        expect(resEmptyAccounts.rowCount).to.equal(1);
        console.log("retire verify account name returned");
        expect(resEmptyAccounts.rows[0].account_name).equals('fio.token');

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
        expect(resTokTrans.rows[0].transfer_memo).equals('ed\'tst');
        

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

    //issue -- the local dev net does issues of tokens, verify the issue
    //at startup is recorded with this data inside.
    //./clio -u http://localhost:8879 push action fio.token issue '["fio.token","999.000000000 FIO","memo"]' -p eosio@active
    it(`issue tokens verify tokentransfers contents for local dev net`, async function () {
      try {
        
        const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'fio.token\'';
        const resAccounts = await client.query(qstrAccounts);

        console.log("issue verify one row returned from accounts");
        expect(resAccounts.rowCount).to.equal(1);
        console.log("issue verify account name returned");
        expect(resAccounts.rows[0].account_name).equals('fio.token');

        const qstrPayeeAccounts = 'SELECT * FROM accounts WHERE account_name = \'eosio\'';
        const resPayeeAccounts = await client.query(qstrPayeeAccounts);

        console.log("issue verify one row returned from accounts");
        expect(resPayeeAccounts.rowCount).to.equal(1);
        console.log("issue verify account name returned");
        expect(resPayeeAccounts.rows[0].account_name).equals('eosio');

        //token transfers
        const qstrTokTrans = 'SELECT * FROM tokentransfers WHERE fk_payer_account_id = ' + resAccounts.rows[0].pk_account_id +
        ' AND  fk_payee_account_id = ' + resPayeeAccounts.rows[0].pk_account_id +
         ' AND token_transfer_type = \'token_mint\'' ;
        const resTokTrans = await client.query(qstrTokTrans);

      
        console.log("issue verify tokentransfers payer account name returned");
        expect(resTokTrans.rows[0].fk_payer_account_id).equals(resAccounts.rows[0].pk_account_id);
        console.log("issue verify tokentransfers payee account name returned");
        expect(resTokTrans.rows[0].fk_payee_account_id).equals(resPayeeAccounts.rows[0].pk_account_id);
        console.log("issue verify tokentransfers suf amount");
        expect(resTokTrans.rows[0].fio_suf_amount).equals('1000000000000');
        console.log("issue verify tokentransfers memo");
        expect(resTokTrans.rows[0].transfer_memo).equals('memo');
        

        //block info
        const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resTokTrans.rows[0].fk_block_number ;
        const resBlocks = await client.query(qstrBlocks);
      
        console.log("issue verify timestamp from blocks");
        expect(resBlocks.rows[0].stamp.getTime()).to.equal(resTokTrans.rows[0].block_timestamp.getTime());

                  
        //transaction info
        const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resTokTrans.rows[0].fk_block_number +
        ' AND request_data LIKE \'%1000.000000000%\' ';
      
        const resTransactions = await client.query(qstrTransactions);
      
        console.log("issue verify timestamp from transactions");
        expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
        console.log("issue verify that the transaction request_data contains amount used");
        expect(resTransactions.rows[0].request_data).contains('1000.000000000');
        console.log("issue verify that the transaction action_name contains issue");
        expect(resTransactions.rows[0].action_name).equals('issue');  

      } catch (err) {
        console.log(err);
        expect(err).to.equal(null);
      }
    });



it(`regdomain, actor is owner, verify domains, domainactivities accountactivities contents`, async function () {
  try {
    let userA1 = await newUser(faucet);
    let domainGood = await generateFioDomain(7);


    const result = await userA1.sdk.genericAction('registerFioDomain', {
      fioDomain: domainGood,
      maxFee: config.api.register_fio_domain.fee,
      technologyProviderId: ''
    })
    
      expect(result.status).to.equal('OK')

    await timeout(2000)

    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userA1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("regdomain verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("regdomain verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userA1.account);

    
    const qstrDomains = 'SELECT * FROM domains WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND domain_name = \'' + domainGood + '\'' ;
    const resDomains = await client.query(qstrDomains);

    console.log("regdomain verify one row returned from domains");
    expect(resDomains.rowCount).to.equal(1);
    console.log("regdomain verify domains owner account returned");
    expect(resDomains.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("regdomain verify domains public");
    expect(resDomains.rows[0].is_public).equals(false);
    console.log("regdomain verify domain_status ");
    expect(resDomains.rows[0].domain_status).equals('active');
    
    
    const qstrDomainActivities = 'SELECT * FROM domainactivities WHERE fk_domain_id = ' + resDomains.rows[0].pk_domain_id + ' AND fk_block_number = ' + resDomains.rows[0].fk_block_number  ;
    const resDomainActivities = await client.query(qstrDomainActivities);

    console.log("regdomain verify one row returned from DomainActivities");
    expect(resDomainActivities.rowCount).to.equal(1);
    console.log("regdomain verify DomainActivities expiration returned");
    expect(resDomainActivities.rows[0].expiration_stamp.getTime()).equals(resDomains.rows[0].expiration_timestamp.getTime());
    console.log("regdomain verify DomainActivities activity type");
    expect(resDomainActivities.rows[0].domain_activity_type).equals('register');
  

    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resDomains.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("regdomain verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
    console.log("regdomain verify timestamp from blocks");
    expect(resBlocks.rows[0].stamp.getTime()).to.equal(resDomainActivities.rows[0].block_timestamp.getTime());

    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resDomains.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("regdomain verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("regdomain verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("regdomain verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userA1.account);
    console.log("regdomain verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(domainGood);
    console.log("regdomain verify that the transaction action_name contains regdomain");
    expect(resTransactions.rows[0].action_name).equals('regdomain');  
    console.log("regdomain verify that the domainactivity transaction id contains regdomain");
    expect(resTransactions.rows[0].pk_transaction_id).equals(resDomainActivities.rows[0].fk_transaction_id);  

    const qstrAccountActivities = 'SELECT * FROM accountactivities WHERE fk_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND fk_block_number = ' + resDomains.rows[0].fk_block_number +
      ' AND fk_transaction_id = ' + resTransactions.rows[0].pk_transaction_id ;
    const resAccountActivities = await client.query(qstrAccountActivities);

    //console.log(qstrAccountActivities);
    console.log("regdomain verify no record added to AccountActivities");
    expect(resAccountActivities.rowCount).to.equal(0);
    //console.log("regdomain verify AccountActivities activity type");
    //expect(resAccountActivities.rows[0].activity_type).equals('sender');

  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});

it(`regdomain, actor is other than owner, verify domains, domainactivities accountactivities contents`, async function () {
  try {
    let userC1 = await newUser(faucet);
    let keys = await createKeypair();
    let accountnm = await getAccountFromKey(keys.publicKey);
    
    let domainGood = await generateFioDomain(7);


    const result = await userC1.sdk.genericAction('pushTransaction', {
      action: 'regdomain',
      account: 'fio.address',
      data: {
        fio_domain: domainGood,
        owner_fio_public_key: keys.publicKey,
        max_fee: config.api.register_fio_domain.fee,
        tpid: ''
      }
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')

    await timeout(2000)

    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + accountnm + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("regdomain verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("regdomain verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(accountnm);

    
    const qstrDomains = 'SELECT * FROM domains WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND domain_name = \'' + domainGood + '\'' ;
    const resDomains = await client.query(qstrDomains);

    console.log("regdomain verify one row returned from domains");
    expect(resDomains.rowCount).to.equal(1);
    console.log("regdomain verify domains owner account returned");
    expect(resDomains.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("regdomain verify domains public");
    expect(resDomains.rows[0].is_public).equals(false);
    console.log("regdomain verify domain_status ");
    expect(resDomains.rows[0].domain_status).equals('active');
    
    const qstrDomainActivities = 'SELECT * FROM domainactivities WHERE fk_domain_id = ' + resDomains.rows[0].pk_domain_id + ' AND fk_block_number = ' + resDomains.rows[0].fk_block_number  ;
    const resDomainActivities = await client.query(qstrDomainActivities);

    console.log("regdomain verify one row returned from DomainActivities");
    expect(resDomainActivities.rowCount).to.equal(1);
    console.log("regdomain verify DomainActivities expiration returned");
    expect(resDomainActivities.rows[0].expiration_stamp.getTime()).equals(resDomains.rows[0].expiration_timestamp.getTime());
    console.log("regdomain verify DomainActivities activity type");
    expect(resDomainActivities.rows[0].domain_activity_type).equals('register');
  

    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resDomains.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("regdomain verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
    console.log("regdomain verify timestamp from blocks");
    expect(resBlocks.rows[0].stamp.getTime()).to.equal(resDomainActivities.rows[0].block_timestamp.getTime());

    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resDomains.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("regdomain verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("regdomain verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("regdomain verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("regdomain verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(domainGood);
    console.log("regdomain verify that the transaction action_name contains regdomain");
    expect(resTransactions.rows[0].action_name).equals('regdomain');  
    console.log("regdomain verify that the domainactivity transaction id contains regdomain");
    expect(resTransactions.rows[0].pk_transaction_id).equals(resDomainActivities.rows[0].fk_transaction_id);  

    const qstrAccountActivities = 'SELECT * FROM accountactivities WHERE fk_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND fk_block_number = ' + resDomains.rows[0].fk_block_number +
      ' AND fk_transaction_id = ' + resTransactions.rows[0].pk_transaction_id ;
    const resAccountActivities = await client.query(qstrAccountActivities);

    //console.log(qstrAccountActivities);
    console.log("regdomain verify no record added to AccountActivities");
    expect(resAccountActivities.rowCount).to.equal(1);
    console.log("regdomain verify AccountActivities activity type");
    expect(resAccountActivities.rows[0].activity_type).equals('receiver');

  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});

it(`renewdomain,  verify domains, domainactivities contents`, async function () {
  try {
    let userC1 = await newUser(faucet);

    await timeout(2000)
    
    const result = await userC1.sdk.genericAction('pushTransaction', {
      action: 'renewdomain',
      account: 'fio.address',
      data: {
          "fio_domain": userC1.domain,
          "max_fee": config.maxFee,
          "tpid": '',
          "actor": userC1.account
      }
    })
    //console.log('Result: ', result);
    expect(result.status).to.equal('OK');

    await timeout(2000)

    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("renewdomain verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("renewdomain verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC1.account);

    
    const qstrDomains = 'SELECT * FROM domains WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND domain_name = \'' + userC1.domain + '\'' ;
    const resDomains = await client.query(qstrDomains);

    console.log("renewdomain verify one row returned from domains");
    expect(resDomains.rowCount).to.equal(1);
    console.log("renewdomain verify domains owner account returned");
    expect(resDomains.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("renewdomain verify domains public");
    expect(resDomains.rows[0].is_public).equals(false);
    console.log("renewdomain verify domain_status ");
    expect(resDomains.rows[0].domain_status).equals('active');
    
    const qstrDomainActivities = 'SELECT * FROM domainactivities WHERE fk_domain_id = ' + resDomains.rows[0].pk_domain_id + ' AND domain_activity_type = \'renew\'';
    const resDomainActivities = await client.query(qstrDomainActivities);

    console.log("renewdomain verify one row returned from DomainActivities");
    expect(resDomainActivities.rowCount).to.equal(1);
    console.log("renewdomain verify DomainActivities expiration returned");
    expect(resDomainActivities.rows[0].expiration_stamp.getTime()).equals(resDomains.rows[0].expiration_timestamp.getTime());
    console.log("renewdomain verify DomainActivities activity type");
    expect(resDomainActivities.rows[0].domain_activity_type).equals('renew');


    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resDomainActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("renewdomain verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
    console.log("renewdomain verify timestamp from blocks");
    expect(resBlocks.rows[0].stamp.getTime()).to.equal(resDomainActivities.rows[0].block_timestamp.getTime());

    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resDomainActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("renewdomain verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("renewdomain verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("renewdomain verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("renewdomain verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("renewdomain verify that the transaction action_name contains renewdomain");
    expect(resTransactions.rows[0].action_name).equals('renewdomain');  
    console.log("renewdomain verify that the domainactivity transaction id contains renewdomain");
    expect(resTransactions.rows[0].pk_transaction_id).equals(resDomainActivities.rows[0].fk_transaction_id);  

  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});
    

it(`xferdomain, verify domains, domainactivities accountactivities contents`, async function () {
  try {
    let userC1 = await newUser(faucet);
    let userC2 = await newUser(faucet);
    
    const result = await userC1.sdk.genericAction('transferFioDomain', {
      fioDomain: userC1.domain,
      newOwnerKey: userC2.publicKey,
      maxFee: 400000000000,
      technologyProviderId: ''
    })
    feeCollected = result.fee_collected;
    //console.log('Result: ', result);
    expect(result.status).to.equal('OK');

    await timeout(2000)

    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC2.account + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("xferdomain verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("xferdomain verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC2.account);

    
    const qstrDomains = 'SELECT * FROM domains WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND domain_name = \'' + userC1.domain + '\'' ;
    const resDomains = await client.query(qstrDomains);

    console.log("xferdomain verify one row returned from domains");
    expect(resDomains.rowCount).to.equal(1);
    console.log("xferdomain verify domains owner account returned");
    expect(resDomains.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("xferdomain verify domains public");
    expect(resDomains.rows[0].is_public).equals(false);
    console.log("xferdomain verify domain_status ");
    expect(resDomains.rows[0].domain_status).equals('active');
    
    const qstrDomainActivities = 'SELECT * FROM domainactivities WHERE fk_domain_id = ' + resDomains.rows[0].pk_domain_id + ' AND domain_activity_type = \'transfer\''  ;
    const resDomainActivities = await client.query(qstrDomainActivities);

    console.log("xferdomain verify one row returned from DomainActivities");
    expect(resDomainActivities.rowCount).to.equal(1);
    console.log("xferdomain verify DomainActivities expiration returned");
    expect(resDomainActivities.rows[0].expiration_stamp.getTime()).equals(resDomains.rows[0].expiration_timestamp.getTime());
    console.log("xferdomain verify DomainActivities activity type");
    expect(resDomainActivities.rows[0].domain_activity_type).equals('transfer');


    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resDomainActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("xferdomain verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
    console.log("xferdomain verify timestamp from blocks");
    expect(resBlocks.rows[0].stamp.getTime()).to.equal(resDomainActivities.rows[0].block_timestamp.getTime());

   
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resDomainActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
   // console.log(resTransactions);
    console.log("xferdomain verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("xferdomain verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("xferdomain verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("xferdomain verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("xferdomain verify that the transaction action_name contains xferdomain");
    expect(resTransactions.rows[0].action_name).equals('xferdomain');  
    console.log("xferdomain verify that the domainactivity transaction id contains xferdomain");
    expect(resTransactions.rows[0].pk_transaction_id).equals(resDomainActivities.rows[0].fk_transaction_id);  

    const qstrAccountActivities = 'SELECT * FROM accountactivities WHERE fk_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND fk_block_number = ' + resDomainActivities.rows[0].fk_block_number +
    ' AND fk_transaction_id = ' + resTransactions.rows[0].pk_transaction_id ;
    const resAccountActivities = await client.query(qstrAccountActivities);

    //console.log(qstrAccountActivities);
    console.log("xferdomain verify no record added to AccountActivities");
    expect(resAccountActivities.rowCount).to.equal(1);
    console.log("xferdomain verify AccountActivities activity type");
    expect(resAccountActivities.rows[0].activity_type).equals('receiver');

  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});

it(`xferdomain, create new account, verify domains, domainactivities accountactivities contents`, async function () {
  try {
    let userC1 = await newUser(faucet);
    let keys = await createKeypair();
    let accountnm = await getAccountFromKey(keys.publicKey);
    
    const result = await userC1.sdk.genericAction('transferFioDomain', {
      fioDomain: userC1.domain,
      newOwnerKey: keys.publicKey,
      maxFee: 400000000000,
      technologyProviderId: ''
    })
    feeCollected = result.fee_collected;
    //console.log('Result: ', result);
    expect(result.status).to.equal('OK');

    await timeout(2000)

    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + accountnm + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("xferdomain verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("xferdomain verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(accountnm);

    
    const qstrDomains = 'SELECT * FROM domains WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND domain_name = \'' + userC1.domain + '\'' ;
    const resDomains = await client.query(qstrDomains);

    console.log("xferdomain verify one row returned from domains");
    expect(resDomains.rowCount).to.equal(1);
    console.log("xferdomain verify domains owner account returned");
    expect(resDomains.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("xferdomain verify domains public");
    expect(resDomains.rows[0].is_public).equals(false);
    console.log("xferdomain verify domain_status ");
    expect(resDomains.rows[0].domain_status).equals('active');
    
    const qstrDomainActivities = 'SELECT * FROM domainactivities WHERE fk_domain_id = ' + resDomains.rows[0].pk_domain_id + ' AND domain_activity_type = \'transfer\''  ;
    const resDomainActivities = await client.query(qstrDomainActivities);

    console.log("xferdomain verify one row returned from DomainActivities");
    expect(resDomainActivities.rowCount).to.equal(1);
    console.log("xferdomain verify DomainActivities expiration returned");
    expect(resDomainActivities.rows[0].expiration_stamp.getTime()).equals(resDomains.rows[0].expiration_timestamp.getTime());
    console.log("xferdomain verify DomainActivities activity type");
    expect(resDomainActivities.rows[0].domain_activity_type).equals('transfer');


    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resDomainActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("xferdomain verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
    console.log("xferdomain verify timestamp from blocks");
    expect(resBlocks.rows[0].stamp.getTime()).to.equal(resDomainActivities.rows[0].block_timestamp.getTime());

   
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resDomainActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
   // console.log(resTransactions);
    console.log("xferdomain verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("xferdomain verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("xferdomain verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("xferdomain verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("xferdomain verify that the transaction action_name contains xferdomain");
    expect(resTransactions.rows[0].action_name).equals('xferdomain');  
    console.log("xferdomain verify that the domainactivity transaction id contains xferdomain");
    expect(resTransactions.rows[0].pk_transaction_id).equals(resDomainActivities.rows[0].fk_transaction_id);  

    const qstrAccountActivities = 'SELECT * FROM accountactivities WHERE fk_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND fk_block_number = ' + resDomainActivities.rows[0].fk_block_number +
    ' AND fk_transaction_id = ' + resTransactions.rows[0].pk_transaction_id ;
    const resAccountActivities = await client.query(qstrAccountActivities);

    //console.log(qstrAccountActivities);
    console.log("xferdomain verify no record added to AccountActivities");
    expect(resAccountActivities.rowCount).to.equal(1);
    console.log("xferdomain verify AccountActivities activity type");
    expect(resAccountActivities.rows[0].activity_type).equals('receiver');

  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});

it(`setdomainpub,  verify domains, domainactivities contents`, async function () {
  try {
    let userC1 = await newUser(faucet);

    await timeout(2000);

    const result = await userC1.sdk.genericAction('pushTransaction', {
      action: 'setdomainpub',
      account: 'fio.address',
      data: {
        fio_domain: userC1.domain,
        is_public: 1,
        max_fee: config.maxFee,
        tpid: '',
        actor: userC1.account
      }
    })
    expect(result.status).to.equal('OK');

    await timeout(2000)

    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("setdomainpub verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("setdomainpub verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC1.account);

    
    const qstrDomains = 'SELECT * FROM domains WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND domain_name = \'' + userC1.domain + '\'' ;
    const resDomains = await client.query(qstrDomains);

    console.log("setdomainpub verify one row returned from domains");
    expect(resDomains.rowCount).to.equal(1);
    console.log("setdomainpub verify domains owner account returned");
    expect(resDomains.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("setdomainpub verify domains public");
    expect(resDomains.rows[0].is_public).equals(true);
    console.log("setdomainpub verify domain_status ");
    expect(resDomains.rows[0].domain_status).equals('active');
    
    const qstrDomainActivities = 'SELECT * FROM domainactivities WHERE fk_domain_id = ' + resDomains.rows[0].pk_domain_id + ' AND domain_activity_type = \'public\'';
    const resDomainActivities = await client.query(qstrDomainActivities);

    console.log("setdomainpub verify one row returned from DomainActivities");
    expect(resDomainActivities.rowCount).to.equal(1);
    console.log("setdomainpub verify DomainActivities expiration returned");
    expect(resDomainActivities.rows[0].expiration_stamp.getTime()).equals(resDomains.rows[0].expiration_timestamp.getTime());
    console.log("setdomainpub verify DomainActivities activity type");
    expect(resDomainActivities.rows[0].domain_activity_type).equals('public');


    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resDomainActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("setdomainpub verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
    console.log("setdomainpub verify timestamp from blocks");
    expect(resBlocks.rows[0].stamp.getTime()).to.equal(resDomainActivities.rows[0].block_timestamp.getTime());

    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resDomainActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("setdomainpub verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("setdomainpub verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("setdomainpub verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("setdomainpub verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("setdomainpub verify that the transaction action_name contains setdomainpub");
    expect(resTransactions.rows[0].action_name).equals('setdomainpub');  
    console.log("setdomainpub verify that the domainactivity transaction id contains setdomainpub");
    expect(resTransactions.rows[0].pk_transaction_id).equals(resDomainActivities.rows[0].fk_transaction_id);  

  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});

it(`regaddress, actor is owner, verify handles, domainactivities accountactivities contents`, async function () {
  try {
    let userA1 = await newUser(faucet);
    
    userA1.address1 = generateFioAddress(userA1.domain,8);
       

    const result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'regaddress',
      account: 'fio.address',
      data: {
          fio_address: userA1.address1,
          owner_fio_public_key: userA1.publicKey,
          max_fee: config.maxFee,
          tpid: '',
          actor: userA1.account
      }
    });
    expect(result.status).to.equal('OK')

    await timeout(2000)

   

    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userA1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("regaddress verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("regaddress verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userA1.account);

    const qstrDomains = 'SELECT * FROM domains WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND domain_name = \'' + userA1.domain + '\'' ;
    const resDomains = await client.query(qstrDomains);

    console.log("regaddress verify one row returned from domains");
    expect(resDomains.rowCount).to.equal(1);
    console.log("regaddress verify domains owner account returned");
    expect(resDomains.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("regaddress verify domains public");
    expect(resDomains.rows[0].is_public).equals(false);
    console.log("regaddress verify domain_status ");
    expect(resDomains.rows[0].domain_status).equals('active');

    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userA1.address1 + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("regaddress verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
    console.log("regaddress verify Handles owner account returned");
    expect(resHandles.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("regaddress verify Handles domain returned");
    expect(resHandles.rows[0].fk_domain_id).equals(resDomains.rows[0].pk_domain_id);
    console.log("regaddress verify Handles status returned");
    expect(resHandles.rows[0].handle_status).equals('active');
    
    
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND fk_block_number = ' + resHandles.rows[0].fk_block_number  ;
    const resHandleActivities = await client.query(qstrHandleActivities);

    console.log("regaddress verify one row returned from HandleActivities");
    expect(resHandleActivities.rowCount).to.equal(1);
    console.log("regaddress verify HandleActivities activity type");
    expect(resHandleActivities.rows[0].handle_activity_type).equals('register');
  

    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandles.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("regaddress verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
    console.log("regaddress verify timestamp from blocks");
    expect(resBlocks.rows[0].stamp.getTime()).to.equal(resHandleActivities.rows[0].block_timestamp.getTime());

    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandles.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("regaddress verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("regaddress verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("regaddress verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userA1.account);
    console.log("regaddress verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userA1.address1);
    console.log("regaddress verify that the transaction action_name contains regaddress");
    expect(resTransactions.rows[0].action_name).equals('regaddress');  
    console.log("regaddress verify that the handleactivities transaction id contains regaddress");
    expect(resTransactions.rows[0].pk_transaction_id).equals(resHandleActivities.rows[0].fk_transaction_id);  

    const qstrAccountActivities = 'SELECT * FROM accountactivities WHERE fk_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND fk_block_number = ' + resHandles.rows[0].fk_block_number +
      ' AND fk_transaction_id = ' + resTransactions.rows[0].pk_transaction_id ;
    const resAccountActivities = await client.query(qstrAccountActivities);

    //console.log(qstrAccountActivities);
    console.log("regaddress verify no record added to AccountActivities");
    expect(resAccountActivities.rowCount).to.equal(0);
    //console.log("regaddress verify AccountActivities activity type");
    //expect(resAccountActivities.rows[0].activity_type).equals('sender');

  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});

it(`regaddress, actor is owner, owner pub key empty verify handles, domainactivities accountactivities contents`, async function () {
  try {
    let userA1 = await newUser(faucet);
    
    userA1.address1 = generateFioAddress(userA1.domain,8);
       

    const result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'regaddress',
      account: 'fio.address',
      data: {
          fio_address: userA1.address1,
          owner_fio_public_key: '',
          max_fee: config.maxFee,
          tpid: '',
          actor: userA1.account
      }
    });
    expect(result.status).to.equal('OK')

    await timeout(2000)

   

    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userA1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("regaddress verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("regaddress verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userA1.account);

    const qstrDomains = 'SELECT * FROM domains WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND domain_name = \'' + userA1.domain + '\'' ;
    const resDomains = await client.query(qstrDomains);

    console.log("regaddress verify one row returned from domains");
    expect(resDomains.rowCount).to.equal(1);
    console.log("regaddress verify domains owner account returned");
    expect(resDomains.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("regaddress verify domains public");
    expect(resDomains.rows[0].is_public).equals(false);
    console.log("regaddress verify domain_status ");
    expect(resDomains.rows[0].domain_status).equals('active');

    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userA1.address1 + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("regaddress verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
    console.log("regaddress verify Handles owner account returned");
    expect(resHandles.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("regaddress verify Handles domain returned");
    expect(resHandles.rows[0].fk_domain_id).equals(resDomains.rows[0].pk_domain_id);
    console.log("regaddress verify Handles status returned");
    expect(resHandles.rows[0].handle_status).equals('active');
    
    
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND fk_block_number = ' + resHandles.rows[0].fk_block_number  ;
    const resHandleActivities = await client.query(qstrHandleActivities);

    console.log("regaddress verify one row returned from HandleActivities");
    expect(resHandleActivities.rowCount).to.equal(1);
    console.log("regaddress verify HandleActivities activity type");
    expect(resHandleActivities.rows[0].handle_activity_type).equals('register');
  

    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandles.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("regaddress verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
    console.log("regaddress verify timestamp from blocks");
    expect(resBlocks.rows[0].stamp.getTime()).to.equal(resHandleActivities.rows[0].block_timestamp.getTime());

    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandles.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("regaddress verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("regaddress verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("regaddress verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userA1.account);
    console.log("regaddress verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userA1.address1);
    console.log("regaddress verify that the transaction action_name contains regaddress");
    expect(resTransactions.rows[0].action_name).equals('regaddress');  
    console.log("regaddress verify that the handleactivities transaction id contains regaddress");
    expect(resTransactions.rows[0].pk_transaction_id).equals(resHandleActivities.rows[0].fk_transaction_id);  

    const qstrAccountActivities = 'SELECT * FROM accountactivities WHERE fk_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND fk_block_number = ' + resHandles.rows[0].fk_block_number +
      ' AND fk_transaction_id = ' + resTransactions.rows[0].pk_transaction_id ;
    const resAccountActivities = await client.query(qstrAccountActivities);

    //console.log(qstrAccountActivities);
    console.log("regaddress verify no record added to AccountActivities");
    expect(resAccountActivities.rowCount).to.equal(0);
    //console.log("regaddress verify AccountActivities activity type");
    //expect(resAccountActivities.rows[0].activity_type).equals('sender');

  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});

it(`regaddress, actor is not owner, verify handles, domainactivities accountactivities contents`, async function () {
  try {
    let userA1 = await newUser(faucet);
    let keys = await createKeypair();
    let accountnm = await getAccountFromKey(keys.publicKey);
    
    let address1 = generateFioAddress(userA1.domain,8);
       

    const result2 = await userA1.sdk.genericAction('pushTransaction', {
      action: 'regaddress',
      account: 'fio.address',
      data: {
          fio_address: address1,
          owner_fio_public_key: keys.publicKey,
          max_fee: config.maxFee,
          tpid: '',
          actor: userA1.account
      }
    });
    expect(result2.status).to.equal('OK')

    await timeout(2000)

   

    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + accountnm + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("regaddress verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("regaddress verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(accountnm);

    const qstrDomains = 'SELECT * FROM domains WHERE domain_name = \'' + userA1.domain + '\'' ;
    const resDomains = await client.query(qstrDomains);

    console.log("regaddress verify one row returned from domains");
    expect(resDomains.rowCount).to.equal(1);
    console.log("regaddress verify domains public");
    expect(resDomains.rows[0].is_public).equals(false);
    console.log("regaddress verify domain_status ");
    expect(resDomains.rows[0].domain_status).equals('active');

    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + address1 + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("regaddress verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
    console.log("regaddress verify Handles owner account returned");
    expect(resHandles.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("regaddress verify Handles domain returned");
    expect(resHandles.rows[0].fk_domain_id).equals(resDomains.rows[0].pk_domain_id);
    console.log("regaddress verify Handles status returned");
    expect(resHandles.rows[0].handle_status).equals('active');
    
    
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND fk_block_number = ' + resHandles.rows[0].fk_block_number  ;
    const resHandleActivities = await client.query(qstrHandleActivities);

    console.log("regaddress verify one row returned from HandleActivities");
    expect(resHandleActivities.rowCount).to.equal(1);
    console.log("regaddress verify HandleActivities activity type");
    expect(resHandleActivities.rows[0].handle_activity_type).equals('register');
  

    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandles.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("regaddress verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
    console.log("regaddress verify timestamp from blocks");
    expect(resBlocks.rows[0].stamp.getTime()).to.equal(resHandleActivities.rows[0].block_timestamp.getTime());

    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandles.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("regaddress verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("regaddress verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("regaddress verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userA1.account);
    console.log("regaddress verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(address1);
    console.log("regaddress verify that the transaction action_name contains regaddress");
    expect(resTransactions.rows[0].action_name).equals('regaddress');  
    console.log("regaddress verify that the handleactivities transaction id contains regaddress");
    expect(resTransactions.rows[0].pk_transaction_id).equals(resHandleActivities.rows[0].fk_transaction_id);  

    const qstrAccountActivities = 'SELECT * FROM accountactivities WHERE fk_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND fk_block_number = ' + resHandles.rows[0].fk_block_number +
      ' AND fk_transaction_id = ' + resTransactions.rows[0].pk_transaction_id ;
    const resAccountActivities = await client.query(qstrAccountActivities);

    //console.log(qstrAccountActivities);
    console.log("regaddress verify no record added to AccountActivities");
    expect(resAccountActivities.rowCount).to.equal(1);
    console.log("regaddress verify AccountActivities activity type");
    expect(resAccountActivities.rows[0].activity_type).equals('receiver');

  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});

it(`renewaddress,  verify handles, handleacitivity contents`, async function () {
  try {
    let userC1 = await newUser(faucet);

    await timeout(2000)


    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("renewaddress verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("renewaddress verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC1.account);


    const qstrHandlesbefore = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandlesbefore = await client.query(qstrHandlesbefore);
    console.log("renewaddress verify one row returned from Handles");
    expect(resHandlesbefore.rowCount).to.equal(1);

    const result = await callFioApiSigned('push_transaction', {
      action: 'renewaddress',
      account: 'fio.address',
      actor: userC1.account,
      privKey: userC1.privateKey,
      data: {
          fio_address: userC1.address,
          max_fee: config.maxFee,
          tpid: '',
          actor: userC1.account
      }
  })
  //console.log('Result: ', result)
  expect(result.transaction_id).to.exist

    await timeout(2000)

    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("renewaddress verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
    console.log("renewaddress verify Handles owner account returned");
    expect(resHandles.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("renewaddress verify Handles status returned");
    expect(resHandles.rows[0].handle_status).equals('active');
    console.log("renewaddress verify Handles expiration returned");
    expect(resHandles.rows[0].expiration_stamp.getTime()).equals(resHandlesbefore.rows[0].expiration_stamp.getTime());
    console.log("renewaddress verify Handles bundled_tx_count returned");
    expect(resHandles.rows[0].bundled_tx_count).equals(resHandlesbefore.rows[0].bundled_tx_count + 100);

    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'renew\'';
    const resHandleActivities = await client.query(qstrHandleActivities);

    console.log("renewaddress verify one row returned from DomainActivities");
    expect(resHandleActivities.rowCount).to.equal(1);
   console.log("renewaddress verify DomainActivities activity type");
    expect(resHandleActivities.rows[0].handle_activity_type).equals('renew');


    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("renewaddress verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
    console.log("renewaddress verify timestamp from blocks");
    expect(resBlocks.rows[0].stamp.getTime()).to.equal(resHandleActivities.rows[0].block_timestamp.getTime());

    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("renewaddress verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("renewaddress verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("renewaddress verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("renewaddress verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("renewaddress verify that the transaction action_name contains renewaddress");
    expect(resTransactions.rows[0].action_name).equals('renewaddress');  
    console.log("renewaddress verify that the handleactivities transaction id contains renewaddress");
    expect(resTransactions.rows[0].pk_transaction_id).equals(resHandleActivities.rows[0].fk_transaction_id);  

  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});   

it(`xferaddress, not owner verify domains, domainactivities accountactivities contents`, async function () {
  try {
    let userC1 = await newUser(faucet);
    let keys = await createKeypair();
    let accountnm = await getAccountFromKey(keys.publicKey);
   
    await timeout(2000)

    const qstrAccountsbefore = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccountsbefore = await client.query(qstrAccountsbefore);

    console.log("xferaddress verify one row returned from accounts");
    expect(resAccountsbefore.rowCount).to.equal(1);
    console.log("xferaddress verify account name returned");
    expect(resAccountsbefore.rows[0].account_name).equals(userC1.account);

    const qstrHandlesbefore = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccountsbefore.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandlesbefore = await client.query(qstrHandlesbefore);

    console.log("xferaddress verify one row returned from handles");
    expect(resHandlesbefore.rowCount).to.equal(1);
    console.log("xferaddress verify handles owner account returned");
    expect(resHandlesbefore.rows[0].fk_owner_account_id).equals(resAccountsbefore.rows[0].pk_account_id);
    console.log("xferaddress verify handle_status ");
    expect(resHandlesbefore.rows[0].handle_status).equals('active');

     //check pub addresses, see that only one FIO pub address is present after trnsfer
     const qstrPubAddressesbefore = 'SELECT * FROM pubaddresses WHERE fk_handle_id = ' + resHandlesbefore.rows[0].pk_handle_id +
     ' AND chain_code = \'FIO\'' ;
     const resPubAddressesbefore = await client.query(qstrPubAddressesbefore);
     //console.log(resPubAddresses);
     console.log("xferaddress verify 1 row returned from pubaddresses");
     expect(resPubAddressesbefore.rowCount).to.equal(1);
    console.log("xferaddress verify one row returned from pubaddresses");
     expect(resPubAddressesbefore.rows[0].token_code).to.equal('FIO');
    
    const result = await userC1.sdk.genericAction('transferFioAddress', {
      fioAddress: userC1.address,
      newOwnerKey: keys.publicKey,
      maxFee: 400000000000,
      technologyProviderId: ''
  })

  //console.log('Result: ', result);
  expect(result.status).to.equal('OK');

    await timeout(2000)

    
    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + accountnm + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("xferaddress verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("xferaddress verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(accountnm);
    
    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("xferaddress verify one row returned from handles");
    expect(resHandles.rowCount).to.equal(1);
    console.log("xferaddress verify handle owner account returned");
    expect(resHandles.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("xferaddress verify handle ");
    expect(resHandles.rows[0].handle_status).equals('active');
    
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'transfer\''  ;
    const resHandleActivities = await client.query(qstrHandleActivities);

    console.log("xferaddress verify one row returned from DomainActivities");
    expect(resHandleActivities.rowCount).to.equal(1);
    console.log("xferaddress verify DomainActivities activity type");
    expect(resHandleActivities.rows[0].handle_activity_type).equals('transfer');


    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("xferaddress verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
    console.log("xferaddress verify timestamp from blocks");
    expect(resBlocks.rows[0].stamp.getTime()).to.equal(resHandleActivities.rows[0].block_timestamp.getTime());

   
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
   // console.log(resTransactions);
    console.log("xferaddress verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("xferaddress verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("xferaddress verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("xferaddress verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.address);
    console.log("xferaddress verify that the transaction action_name contains xferaddress");
    expect(resTransactions.rows[0].action_name).equals('xferaddress');  
    console.log("xferaddress verify that the handleactivities transaction id contains xferaddress");
    expect(resTransactions.rows[0].pk_transaction_id).equals(resHandleActivities.rows[0].fk_transaction_id);  

    const qstrAccountActivities = 'SELECT * FROM accountactivities WHERE fk_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND fk_block_number = ' + resHandleActivities.rows[0].fk_block_number +
    ' AND fk_transaction_id = ' + resTransactions.rows[0].pk_transaction_id ;
    const resAccountActivities = await client.query(qstrAccountActivities);

    //console.log(qstrAccountActivities);
    console.log("xferaddress verify no record added to AccountActivities");
    expect(resAccountActivities.rowCount).to.equal(1);
    console.log("xferaddress verify AccountActivities activity type");
    expect(resAccountActivities.rows[0].activity_type).equals('receiver');

     //check pub addresses, see that only one FIO pub address is present after trnsfer
     const qstrPubAddresses = 'SELECT * FROM pubaddresses WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id +
     ' AND chain_code = \'FIO\'' ;
     const resPubAddresses = await client.query(qstrPubAddresses);
     //console.log(resPubAddresses);
     console.log("xferaddress verify 1 row returned from pubaddresses");
     expect(resPubAddresses.rowCount).to.equal(1);
       console.log("xferaddress verify one row returned from pubaddresses");
     expect(resPubAddresses.rows[0].token_code).to.equal('FIO');
     console.log("xferaddress verify FIO pubaddress pubaddresses");
     expect(resPubAddresses.rows[0].pub_address).to.equal(keys.publicKey);
  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});

it(`xferaddress, verify domains, domainactivities accountactivities contents`, async function () {
  try {
    let userC1 = await newUser(faucet);
    let userC2 = await newUser(faucet);

    const qstrAccountsbefore = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccountsbefore = await client.query(qstrAccountsbefore);

    console.log("xferaddress verify one row returned from accounts");
    expect(resAccountsbefore.rowCount).to.equal(1);
    console.log("xferaddress verify account name returned");
    expect(resAccountsbefore.rows[0].account_name).equals(userC1.account);

    const qstrHandlesbefore = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccountsbefore.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandlesbefore = await client.query(qstrHandlesbefore);

    console.log("xferaddress verify one row returned from domains");
    expect(resHandlesbefore.rowCount).to.equal(1);
    console.log("xferaddress verify domains owner account returned");
    expect(resHandlesbefore.rows[0].fk_owner_account_id).equals(resAccountsbefore.rows[0].pk_account_id);
    console.log("xferaddress verify domain_status ");
    expect(resHandlesbefore.rows[0].handle_status).equals('active');

     //check pub addresses, see that only one FIO pub address is present after trnsfer
     const qstrPubAddressesbefore = 'SELECT * FROM pubaddresses WHERE fk_handle_id = ' + resHandlesbefore.rows[0].pk_handle_id +
     ' AND chain_code = \'FIO\'' ;
     const resPubAddressesbefore = await client.query(qstrPubAddressesbefore);
     //console.log(resPubAddresses);
     console.log("xferaddress verify 1 row returned from pubaddresses");
     expect(resPubAddressesbefore.rowCount).to.equal(1);
    console.log("xferaddress verify one row returned from pubaddresses");
     expect(resPubAddressesbefore.rows[0].token_code).to.equal('FIO');
    
    const result = await userC1.sdk.genericAction('transferFioAddress', {
      fioAddress: userC1.address,
      newOwnerKey: userC2.publicKey,
      maxFee: 400000000000,
      technologyProviderId: ''
  })

  //console.log('Result: ', result);
  expect(result.status).to.equal('OK');

    await timeout(2000)

    
    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC2.account + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("xferaddress verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("xferaddress verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC2.account);
    
    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("xferaddress verify one row returned from domains");
    expect(resHandles.rowCount).to.equal(1);
    console.log("xferaddress verify domains owner account returned");
    expect(resHandles.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("xferaddress verify domain_status ");
    expect(resHandles.rows[0].handle_status).equals('active');
    
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'transfer\''  ;
    const resHandleActivities = await client.query(qstrHandleActivities);

    console.log("xferaddress verify one row returned from DomainActivities");
    expect(resHandleActivities.rowCount).to.equal(1);
    console.log("xferaddress verify DomainActivities activity type");
    expect(resHandleActivities.rows[0].handle_activity_type).equals('transfer');


    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("xferaddress verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
    console.log("xferaddress verify timestamp from blocks");
    expect(resBlocks.rows[0].stamp.getTime()).to.equal(resHandleActivities.rows[0].block_timestamp.getTime());

   
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
   // console.log(resTransactions);
    console.log("xferaddress verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("xferaddress verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("xferaddress verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("xferaddress verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.address);
    console.log("xferaddress verify that the transaction action_name contains xferaddress");
    expect(resTransactions.rows[0].action_name).equals('xferaddress');  
    console.log("xferaddress verify that the handleactivities transaction id contains xferaddress");
    expect(resTransactions.rows[0].pk_transaction_id).equals(resHandleActivities.rows[0].fk_transaction_id);  

    const qstrAccountActivities = 'SELECT * FROM accountactivities WHERE fk_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND fk_block_number = ' + resHandleActivities.rows[0].fk_block_number +
    ' AND fk_transaction_id = ' + resTransactions.rows[0].pk_transaction_id ;
    const resAccountActivities = await client.query(qstrAccountActivities);

    //console.log(qstrAccountActivities);
    console.log("xferaddress verify no record added to AccountActivities");
    expect(resAccountActivities.rowCount).to.equal(1);
    console.log("xferaddress verify AccountActivities activity type");
    expect(resAccountActivities.rows[0].activity_type).equals('receiver');

     //check pub addresses, see that only one FIO pub address is present after trnsfer
     const qstrPubAddresses = 'SELECT * FROM pubaddresses WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id +
     ' AND chain_code = \'FIO\'' ;
     const resPubAddresses = await client.query(qstrPubAddresses);
     //console.log(resPubAddresses);
     console.log("xferaddress verify 1 row returned from pubaddresses");
     expect(resPubAddresses.rowCount).to.equal(1);
       console.log("xferaddress verify one row returned from pubaddresses");
     expect(resPubAddresses.rows[0].token_code).to.equal('FIO');
     console.log("xferaddress verify FIO pubaddress pubaddresses");
     expect(resPubAddresses.rows[0].pub_address).to.equal(userC2.publicKey);
  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});

it(`addbundles,  verify handles, handleacitivity contents`, async function () {
  try {
    let userC1 = await newUser(faucet);

    await timeout(2000)


    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("addbundles verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("addbundles verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC1.account);


    const qstrHandlesbefore = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandlesbefore = await client.query(qstrHandlesbefore);
    console.log("addbundles verify one row returned from Handles");
    expect(resHandlesbefore.rowCount).to.equal(1);

    const result = await userC1.sdk.genericAction('pushTransaction', {
      action: 'addbundles',
      account: 'fio.address',
      data: {
          fio_address: userC1.address,
          bundle_sets: 1,
          max_fee: 400000000000,
          technologyProviderId: ''
      }
    })
    feeCollected = result.fee_collected;
    //console.log('Result: ', result);
    expect(result.status).to.equal('OK');

    await timeout(2000)

    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("addbundles verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
    console.log("addbundles verify Handles owner account returned");
    expect(resHandles.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("addbundles verify Handles status returned");
    expect(resHandles.rows[0].handle_status).equals('active');
    console.log("addbundles verify Handles expiration returned");
    expect(resHandles.rows[0].expiration_stamp.getTime()).equals(resHandlesbefore.rows[0].expiration_stamp.getTime());
    console.log("addbundles verify Handles bundled_tx_count returned");
    expect(resHandles.rows[0].bundled_tx_count).equals(resHandlesbefore.rows[0].bundled_tx_count + 100);

    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'add_bundles\'';
    const resHandleActivities = await client.query(qstrHandleActivities);

    console.log("addbundles verify one row returned from handleactivities");
    expect(resHandleActivities.rowCount).to.equal(1);
   console.log("addbundles verify handleactivities activity type");
    expect(resHandleActivities.rows[0].handle_activity_type).equals('add_bundles');


    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("addbundles verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
    console.log("addbundles verify timestamp from blocks");
    expect(resBlocks.rows[0].stamp.getTime()).to.equal(resHandleActivities.rows[0].block_timestamp.getTime());

    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("addbundles verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("addbundles verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("addbundles verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("addbundles verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("addbundles verify that the transaction action_name contains addbundles");
    expect(resTransactions.rows[0].action_name).equals('addbundles');  
    console.log("addbundles verify that the handleacitvities transaction id");
    expect(resTransactions.rows[0].pk_transaction_id).equals(resHandleActivities.rows[0].fk_transaction_id);  

  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});  

it(`addaddress, set fio pub key, set one pubkey with single quote verify handles, handleacitivity contents`, async function () {
  try {
    let userC1 = await newUser(faucet);

    await timeout(2000)


    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);
    // console.log(resAccounts);
    console.log("addaddress verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("addaddress verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC1.account);
    const qstrHandlesbefore = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
   // console.log(qstrHandlesbefore);
    const resHandlesbefore = await client.query(qstrHandlesbefore);
    console.log("addaddress verify one row returned from Handles");
    expect(resHandlesbefore.rowCount).to.equal(1);

    //console.log(userC1);
    const result = await userC1.sdk.genericAction('pushTransaction', {
      action: 'addaddress',
      account: 'fio.address',
      data: {
        fio_address: userC1.address,
        public_addresses:[
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: "bitcoincash:qzf8zha7'4ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9",
          },
          {
            chain_code: 'FIO',
            token_code: 'FIO',
            public_address: "XyCyPKzTWvW2Xdc'YjPaPXGQDCGk946ywEv",
          }
        ],
        max_fee: config.maxFee,
        tpid: '',
        actor: userC1.account
      }
    })

    expect(result.status).to.equal('OK');

    await timeout(2000)

    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("addaddress verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
    console.log("addaddress verify Handles owner account returned");
    expect(resHandles.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("addaddress verify Handles status returned");
    expect(resHandles.rows[0].handle_status).equals('active');
    console.log("addaddress verify Handles expiration returned");
    expect(resHandles.rows[0].expiration_stamp.getTime()).equals(resHandlesbefore.rows[0].expiration_stamp.getTime());
    console.log("addaddress verify Handles expiration returned");
    expect(resHandles.rows[0].expiration_stamp.getTime()).equals(resHandlesbefore.rows[0].expiration_stamp.getTime());
    console.log("addaddress verify Handles encrypt key set is false returned");
    expect(resHandles.rows[0].is_encrypt_key_set).equals(false);
    console.log("addaddress verify Handles encrypt key returned");
    expect(resHandles.rows[0].encryption_key).equals('XyCyPKzTWvW2Xdc\'YjPaPXGQDCGk946ywEv');
    

    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'add_pubadd\'';
    const resHandleActivities = await client.query(qstrHandleActivities);

    console.log("addaddress verify 2 row returned from handleactivities");
    expect(resHandleActivities.rowCount).to.equal(2);
   console.log("addaddress verify handleactivities activity type");
    expect(resHandleActivities.rows[0].handle_activity_type).equals('add_pubadd');


    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("addaddress verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
   
    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("addaddress verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("addaddress verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("addaddress verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("addaddress verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("addaddress verify that the transaction action_name contains addaddress");
    expect(resTransactions.rows[0].action_name).equals('addaddress');  
    
  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});  

it(`addaddress, set fio pub key using *, verify handles, handleacitivity contents`, async function () {
  try {
    let userC1 = await newUser(faucet);

    await timeout(2000)


    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("addaddress verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("addaddress verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC1.account);

    const qstrHandlesbefore = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandlesbefore = await client.query(qstrHandlesbefore);
    console.log("addaddress verify one row returned from Handles");
    expect(resHandlesbefore.rowCount).to.equal(1);

    const result = await userC1.sdk.genericAction('pushTransaction', {
      action: 'addaddress',
      account: 'fio.address',
      data: {
        fio_address: userC1.address,
        public_addresses:[
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          },
          {
            chain_code: 'FIO',
            token_code: '*',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          }
        ],
        max_fee: config.maxFee,
        tpid: '',
        actor: userC1.account
      }
    })
    expect(result.status).to.equal('OK');

    await timeout(2000)

    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("addaddress verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
    console.log("addaddress verify Handles owner account returned");
    expect(resHandles.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("addaddress verify Handles status returned");
    expect(resHandles.rows[0].handle_status).equals('active');
    console.log("addaddress verify Handles expiration returned");
    expect(resHandles.rows[0].expiration_stamp.getTime()).equals(resHandlesbefore.rows[0].expiration_stamp.getTime());
    console.log("addaddress verify Handles expiration returned");
    expect(resHandles.rows[0].expiration_stamp.getTime()).equals(resHandlesbefore.rows[0].expiration_stamp.getTime());
    console.log("addaddress verify Handles encrypt key set is false returned");
    expect(resHandles.rows[0].is_encrypt_key_set).equals(false);
    console.log("addaddress verify Handles encrypt key returned");
    expect(resHandles.rows[0].encryption_key).equals('XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv');
    

    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'add_pubadd\'';
    const resHandleActivities = await client.query(qstrHandleActivities);

    console.log("addaddress verify 2 row returned from handleactivities");
    expect(resHandleActivities.rowCount).to.equal(2);
   console.log("addaddress verify handleactivities activity type");
    expect(resHandleActivities.rows[0].handle_activity_type).equals('add_pubadd');


    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("addaddress verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
   
    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("addaddress verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("addaddress verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("addaddress verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("addaddress verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("addaddress verify that the transaction action_name contains addaddress");
    expect(resTransactions.rows[0].action_name).equals('addaddress');  
    
    //check pub addresses, see that only one FIO pub address is present
    const qstrPubAddresses = 'SELECT * FROM pubaddresses WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id +
    ' AND chain_code = \'FIO\'' ;
    const resPubAddresses = await client.query(qstrPubAddresses);
   // console.log(resPubAddresses);
    console.log("addaddress verify 2 row returned from pubaddresses");
    expect(resPubAddresses.rowCount).to.equal(2);
    //TODO we have both token FIO and token * in the pub addresses table for chain FIO.
    console.log("addaddress verify one row returned from pubaddresses");
    expect(resPubAddresses.rows[1].token_code).to.equal('*');
  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});  

it(`addaddress, do not set fio pub key, verify handles, handleacitivity contents`, async function () {
  try {
    let userC1 = await newUser(faucet);

    await timeout(2000)


    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("addaddress verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("addaddress verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC1.account);

    const qstrHandlesbefore = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandlesbefore = await client.query(qstrHandlesbefore);
    console.log("addaddress verify one row returned from Handles");
    expect(resHandlesbefore.rowCount).to.equal(1);

    const result = await userC1.sdk.genericAction('pushTransaction', {
      action: 'addaddress',
      account: 'fio.address',
      data: {
        fio_address: userC1.address,
        public_addresses:[
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          }
        ],
        max_fee: config.maxFee,
        tpid: '',
        actor: userC1.account
      }
    })
    expect(result.status).to.equal('OK');

    await timeout(2000)

    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("addaddress verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
    console.log("addaddress verify Handles owner account returned");
    expect(resHandles.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("addaddress verify Handles status returned");
    expect(resHandles.rows[0].handle_status).equals('active');
    console.log("addaddress verify Handles expiration returned");
    expect(resHandles.rows[0].expiration_stamp.getTime()).equals(resHandlesbefore.rows[0].expiration_stamp.getTime());
    console.log("addaddress verify Handles expiration returned");
    expect(resHandles.rows[0].expiration_stamp.getTime()).equals(resHandlesbefore.rows[0].expiration_stamp.getTime());
    console.log("addaddress verify Handles encrypt key set is false returned");
    expect(resHandles.rows[0].is_encrypt_key_set).equals(false);
    console.log("addaddress verify Handles encrypt key returned");
    expect(resHandles.rows[0].encryption_key).equals(resHandlesbefore.rows[0].encryption_key);
    
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'add_pubadd\'';
    const resHandleActivities = await client.query(qstrHandleActivities);

    console.log("addaddress verify 1 row returned from handleactivities");
    expect(resHandleActivities.rowCount).to.equal(1);
   console.log("addaddress verify handleactivities activity type");
    expect(resHandleActivities.rows[0].handle_activity_type).equals('add_pubadd');


    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("addaddress verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
   
    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("addaddress verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("addaddress verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("addaddress verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("addaddress verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);

    console.log("addaddress verify that the transaction action_name contains addaddress");
    expect(resTransactions.rows[0].action_name).equals('addaddress');  
    
  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
}); 

it(`remaddress, set fio pub key using *, verify handles, handleacitivity contents`, async function () {
  try {
    let userC1 = await newUser(faucet);

    await timeout(2000)


    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("remaddress verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("remaddress verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC1.account);

    const result = await userC1.sdk.genericAction('pushTransaction', {
      action: 'addaddress',
      account: 'fio.address',
      data: {
        fio_address: userC1.address,
        public_addresses:[
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          },
          {
            chain_code: 'FIO',
            token_code: '*',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          }
        ],
        max_fee: config.maxFee,
        tpid: '',
        actor: userC1.account
      }
    })
    expect(result.status).to.equal('OK');

    await timeout(2000)

    const result1 = await userC1.sdk.genericAction('pushTransaction', {
      action: 'remaddress',
      account: 'fio.address',
      data: {
        "fio_address": userC1.address,
        "public_addresses": [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          },
          {
            chain_code: 'FIO',
            token_code: '*',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          }
        ],
        "max_fee": 400000000000,
        "tpid": '',
        "actor": userC1.account
      }
    })
    expect(result1.status).to.equal('OK');

    await timeout(2000);

    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("remaddress verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
   
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'rem_pubadd\'';
    const resHandleActivities = await client.query(qstrHandleActivities);

    console.log("remaddress verify 2 row returned from handleactivities");
    expect(resHandleActivities.rowCount).to.equal(2);
    

    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("remaddress verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
   
    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("remaddress verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("remaddress verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("remaddress verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("remaddress verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("remaddress verify that the transaction action_name contains remaddress");
    expect(resTransactions.rows[0].action_name).equals('remaddress');  
    
    //check pub addresses, see that only one FIO pub address is present
    const qstrPubAddresses = 'SELECT * FROM pubaddresses WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id  ;
    const resPubAddresses = await client.query(qstrPubAddresses);
   // console.log(resPubAddresses);
    console.log("remaddress verify 1 row returned from pubaddresses");
    expect(resPubAddresses.rowCount).to.equal(1);
     console.log("remaddress verify one row returned from pubaddresses");
    expect(resPubAddresses.rows[0].token_code).not.equal('*');
  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});  


it(`updcryptkey, set fio pub key using *, verify handles, handleacitivity contents`, async function () {
  try {
    let userC1 = await newUser(faucet);

    await timeout(2000)


    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("updcryptkey verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("updcryptkey verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC1.account);

    const keypair = await createKeypair();

     const result = await userC1.sdk.genericAction('pushTransaction', {
                action: 'updcryptkey',
                account: 'fio.address',
                data: {
                    fio_address: userC1.address,
                    encrypt_public_key: keypair.publicKey,
                    max_fee: config.maxFee,
                    tpid: ''
                }
            })
            expect(result.status).to.equal('OK');

            await timeout(2000)


    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("updcryptkey verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
    console.log("updcryptkey verify encrypt key set Handles");
    expect(resHandles.rows[0].is_encrypt_key_set).to.equal(true);
    console.log("updcryptkey verify encrypt key  Handles");
    expect(resHandles.rows[0].encryption_key).to.equal(keypair.publicKey);
   
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'upd_encryptkey\'';
    const resHandleActivities = await client.query(qstrHandleActivities);

    console.log("updcryptkey verify 1 row returned from handleactivities");
    expect(resHandleActivities.rowCount).to.equal(1);
    

    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("updcryptkey verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
   
    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("updcryptkey verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("updcryptkey verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("updcryptkey verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("updcryptkey verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("updcryptkey verify that the transaction action_name contains updcryptkey");
    expect(resTransactions.rows[0].action_name).equals('updcryptkey');  
    
  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});  

it(`remaddress, set encrypt key, then set fio pub key using *, verify handles, handleacitivity contents`, async function () {
  try {
    let userC1 = await newUser(faucet);

    await timeout(2000)


    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("remaddress verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("remaddress verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC1.account);

    const result = await userC1.sdk.genericAction('pushTransaction', {
      action: 'addaddress',
      account: 'fio.address',
      data: {
        fio_address: userC1.address,
        public_addresses:[
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          },
          {
            chain_code: 'FIO',
            token_code: '*',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          }
        ],
        max_fee: config.maxFee,
        tpid: '',
        actor: userC1.account
      }
    })
    expect(result.status).to.equal('OK');

    await timeout(2000)

   
    const keypair = await createKeypair();

    const result2 = await userC1.sdk.genericAction('pushTransaction', {
               action: 'updcryptkey',
               account: 'fio.address',
               data: {
                   fio_address: userC1.address,
                   encrypt_public_key: keypair.publicKey,
                   max_fee: config.maxFee,
                   tpid: ''
               }
           })
    expect(result2.status).to.equal('OK');

    await timeout(2000);

    const qstrHandlesbefore = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandlesbefore = await client.query(qstrHandlesbefore);

    console.log("remaddress verify one row returned from Handles");
    expect(resHandlesbefore.rowCount).to.equal(1);
  
    const result1 = await userC1.sdk.genericAction('pushTransaction', {
      action: 'remaddress',
      account: 'fio.address',
      data: {
        "fio_address": userC1.address,
        "public_addresses": [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          },
          {
            chain_code: 'FIO',
            token_code: '*',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          }
        ],
        "max_fee": 400000000000,
        "tpid": '',
        "actor": userC1.account
      }
    })
    expect(result1.status).to.equal('OK');

    await timeout(2000);

    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("remaddress verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);

    console.log("remaddress verify encrypt key unchanged from Handles");
    expect(resHandles.rowCount).to.equal(1);
   
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'rem_pubadd\'';
    const resHandleActivities = await client.query(qstrHandleActivities);

    console.log("remaddress verify 2 row returned from handleactivities");
    expect(resHandleActivities.rowCount).to.equal(2);
    

    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("remaddress verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
   
    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("remaddress verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("remaddress verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("remaddress verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("remaddress verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("remaddress verify that the transaction action_name contains remaddress");
    expect(resTransactions.rows[0].action_name).equals('remaddress');  
    
    //check pub addresses, see that only one FIO pub address is present
    const qstrPubAddresses = 'SELECT * FROM pubaddresses WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id  ;
    const resPubAddresses = await client.query(qstrPubAddresses);
   // console.log(resPubAddresses);
    console.log("remaddress verify 1 row returned from pubaddresses");
    expect(resPubAddresses.rowCount).to.equal(1);
     console.log("remaddress verify one row returned from pubaddresses");
    expect(resPubAddresses.rows[0].token_code).not.equal('*');
  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
}); 


it(`remalladdr, set fio pub key using *, verify handles, handleacitivity contents`, async function () {
  try {
    let userC1 = await newUser(faucet);

    await timeout(2000)


    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);



    console.log("remalladdr verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("remalladdr verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC1.account);

    const result = await userC1.sdk.genericAction('pushTransaction', {
      action: 'addaddress',
      account: 'fio.address',
      data: {
        fio_address: userC1.address,
        public_addresses:[
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          }
        ],
        max_fee: config.maxFee,
        tpid: '',
        actor: userC1.account
      }
    })
    expect(result.status).to.equal('OK');

    await timeout(2000)

    const result1 = await userC1.sdk.genericAction('pushTransaction', {
      action: 'remalladdr',
      account: 'fio.address',
      data: {
        fio_address: userC1.address,
        max_fee: config.maxFee,
        tpid: "",
        actor: userC1.account
      }
    })
    expect(result1.status).to.equal('OK');

    await timeout(2000);

    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("remalladdr verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
   
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'rem_all_pubadd\'';
    const resHandleActivities = await client.query(qstrHandleActivities);

    //console.log(qstrHandleActivities);
    console.log("remalladdr verify 1 row returned from handleactivities");
    expect(resHandleActivities.rowCount).to.equal(1);
    

    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("remalladdr verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
   
    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("remalladdr verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("remalladdr verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("remalladdr verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("remalladdr verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("remalladdr verify that the transaction action_name contains remalladdr");
    expect(resTransactions.rows[0].action_name).equals('remalladdr');  
    
    //check pub addresses, see that only one FIO pub address is present
    const qstrPubAddresses = 'SELECT * FROM pubaddresses WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id  ;
    const resPubAddresses = await client.query(qstrPubAddresses);
   // console.log(resPubAddresses);
    console.log("remalladdr verify 1 row returned from pubaddresses");
    expect(resPubAddresses.rowCount).to.equal(1);
    console.log("remalladdr verify 1 row returned from pubaddresses");
    expect(resPubAddresses.rows[0].token_code).to.equal("FIO");
    console.log("remalladdr verify 1 row returned from pubaddresses");
    expect(resPubAddresses.rows[0].chain_code).to.equal("FIO");
  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});  

it(`addnft, verify handles, handleacitivity, nftsignuatures contents`, async function () {
  try {
    let userC1 = await newUser(faucet);

    await timeout(2000)


    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);



    console.log("addnft verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("addnft verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC1.account);

    const result = await userC1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: userC1.address,
        nfts: [
          {"chain_code":"bsc","contract_address":"0xF5db804101d8600c26598A1Ba465166c33CdAA4b","token_id":"271637","url":"https://airnfts.s3.amazonaws.com/nft-images/20220730/Nyiragongo_1659175463771.jpeg","hash":"5cbe0d8560850c17b4ffdb0ca8e91639dc32bfb0e2e13ea44530ab35c9e305a5","metadata":"{\"creator_url\":\"\"}"}
        ],
        max_fee: config.maxFee,
        actor: userC1.account,
        tpid: ""
      }
    })
    //console.log(`Result: `, result)
    expect(result.status).to.equal('OK')

    await timeout(2000)

    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("addnft verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
   
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'add_nft\'';
    const resHandleActivities = await client.query(qstrHandleActivities);

    //console.log(qstrHandleActivities);
    console.log("addnft verify 1 row returned from handleactivities");
    expect(resHandleActivities.rowCount).to.equal(1);
    

    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("addnft verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
   
    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("addnft verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("addnft verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("addnft verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("addnft verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("addnft verify that the transaction action_name contains addnft");
    expect(resTransactions.rows[0].action_name).equals('addnft');  
    
    //check pub addresses, see that only one FIO pub address is present
    const qstrNFTSignatures = 'SELECT * FROM nftsignatures WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id  ;
    const resNFTSignatures = await client.query(qstrNFTSignatures);
   // console.log(resNFTSignatures);
    console.log("addnft verify 1 row returned from nftsignatures");
    expect(resNFTSignatures.rowCount).to.equal(1);
    console.log("addnft verify block numberfrom nftsignatures");
    expect(resNFTSignatures.rows[0].fk_block_number).to.equal(resBlocks.rows[0].pk_block_number);
    console.log("addnft verify contract address from nftsignatures");
    expect(resNFTSignatures.rows[0].contract_address).to.equal('0xF5db804101d8600c26598A1Ba465166c33CdAA4b');
    console.log("addnft verify chain_code from nftsignatures");
    expect(resNFTSignatures.rows[0].chain_code).to.equal('bsc');
    console.log("addnft verify token_id from nftsignatures");
    expect(resNFTSignatures.rows[0].token_id).to.equal('271637');
    console.log("addnft verify nft_url from nftsignatures");
    expect(resNFTSignatures.rows[0].nft_url).to.equal('https://airnfts.s3.amazonaws.com/nft-images/20220730/Nyiragongo_1659175463771.jpeg');
    console.log("addnft verify nft hash from nftsignatures");
    expect(resNFTSignatures.rows[0].nft_hash).to.equal('5cbe0d8560850c17b4ffdb0ca8e91639dc32bfb0e2e13ea44530ab35c9e305a5');
    console.log("addnft verify nft meta data from nftsignatures");
    expect(resNFTSignatures.rows[0].nft_meta_data).to.equal('{\"creator_url\":\"\"}');

    
  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});  


it(`remnft, verify handles, handleacitivity, nftsignuatures contents`, async function () {
  try {
    let userC1 = await newUser(faucet);

    await timeout(2000)


    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);



    console.log("remnft verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("remnft verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC1.account);

    const result = await userC1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: userC1.address,
        nfts: [{
            "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"1", "url":"", "hash":"","metadata":""
          }],
        max_fee: config.maxFee,
        actor: userC1.account,
        tpid: ""
      }
    })
    //console.log(`Result: `, result)
    expect(result.status).to.equal('OK')

    await timeout(2000)

    const result1 = await userC1.sdk.genericAction('pushTransaction', {
      action: 'remnft',
      account: 'fio.address',
      data: {
        fio_address: userC1.address,
        nfts: [{
            "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"1", "url":"", "hash":"","metadata":""
          }],
        max_fee: 500000000000,
        actor: userC1.account,
        tpid: ""
      }
    })
    //console.log(`Result: `, result)
    expect(result1.status).to.equal('OK')
    await timeout(2000)

    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("remnft verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
   
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'rem_nft\'';
    const resHandleActivities = await client.query(qstrHandleActivities);

    //console.log(qstrHandleActivities);
    console.log("remnft verify 1 row returned from handleactivities");
    expect(resHandleActivities.rowCount).to.equal(1);
    

    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("remnft verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
   
    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("remnft verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("remnft verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("remnft verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("remnft verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("remnft verify that the transaction action_name contains remnft");
    expect(resTransactions.rows[0].action_name).equals('remnft');  
    
    
    const qstrNFTSignatures = 'SELECT * FROM nftsignatures WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id  ;
    const resNFTSignatures = await client.query(qstrNFTSignatures);
   // console.log(resNFTSignatures);
    console.log("remnft verify 0 row returned from nftsignatures");
    expect(resNFTSignatures.rowCount).to.equal(0);
   
    
  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});  

it(`remallnft, verify handles, handleacitivity, nftsignuatures contents`, async function () {
  try {
    let userC1 = await newUser(faucet);

    await timeout(2000)


    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);



    console.log("remallnfts verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("remallnfts verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC1.account);

    const result = await userC1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: userC1.address,
        nfts: [{
            "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"1", "url":"", "hash":"","metadata":""
          }],
        max_fee: config.maxFee,
        actor: userC1.account,
        tpid: ""
      }
    })
    //console.log(`Result: `, result)
    expect(result.status).to.equal('OK')

    await timeout(2000)

    const result2 = await userC1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: userC1.address,
        nfts: [{
            "chain_code":"ETH","contract_address":"0x12389ABCDEF", "token_id":"1", "url":"", "hash":"","metadata":""
          }],
        max_fee: config.maxFee,
        actor: userC1.account,
        tpid: ""
      }
    })
    //console.log(`Result: `, result)
    expect(result2.status).to.equal('OK')


    await timeout(2000)

    const result1 = await userC1.sdk.genericAction('pushTransaction', {
      action: 'remallnfts',
      account: 'fio.address',
      data: {
        fio_address: userC1.address,
        max_fee: 500000000000,
        actor: userC1.account,
        tpid: ""
      }
    })
    //console.log(`Result: `, result)
    expect(result1.status).to.equal('OK')
    await timeout(2000)

    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("remallnfts verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
   
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'rem_all_nft\'';
    const resHandleActivities = await client.query(qstrHandleActivities);

    //console.log(qstrHandleActivities);
    console.log("remallnfts verify 1 row returned from handleactivities");
    expect(resHandleActivities.rowCount).to.equal(1);
    

    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("remallnfts verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
   
    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("remallnfts verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("remallnfts verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("remallnfts verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("remallnfts verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("remallnfts verify that the transaction action_name contains remallnfts");
    expect(resTransactions.rows[0].action_name).equals('remallnfts');  
    
    
    const qstrNFTSignatures = 'SELECT * FROM nftsignatures WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id  ;
    const resNFTSignatures = await client.query(qstrNFTSignatures);
   // console.log(resNFTSignatures);
    console.log("remallnfts verify 0 row returned from nftsignatures");
    expect(resNFTSignatures.rowCount).to.equal(0);
   
    
  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});  

it(`updcryptkey, verify handles, handleacitivity contents`, async function () {
  try {
    let userC1 = await newUser(faucet);

    await timeout(2000)


    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("updcryptkey verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("updcryptkey verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC1.account);

    const result = await userC1.sdk.genericAction('pushTransaction', {
      action: 'addaddress',
      account: 'fio.address',
      data: {
        fio_address: userC1.address,
        public_addresses:[
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          },
          {
            chain_code: 'FIO',
            token_code: '*',
            public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
          }
        ],
        max_fee: config.maxFee,
        tpid: '',
        actor: userC1.account
      }
    })
    expect(result.status).to.equal('OK');

    await timeout(2000)

   
    const keypair = await createKeypair();

    const result2 = await userC1.sdk.genericAction('pushTransaction', {
               action: 'updcryptkey',
               account: 'fio.address',
               data: {
                   fio_address: userC1.address,
                   encrypt_public_key: keypair.publicKey,
                   max_fee: config.maxFee,
                   tpid: ''
               }
           })
    expect(result2.status).to.equal('OK');

    await timeout(2000);

    const qstrHandlesbefore = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandlesbefore = await client.query(qstrHandlesbefore);

    console.log("updcryptkey verify one row returned from Handles");
    expect(resHandlesbefore.rowCount).to.equal(1);

    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("updcryptkey verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
    console.log("updcryptkey verify encrypt key unchanged from Handles");
    expect(resHandles.rows[0].encryption_key).to.equal(keypair.publicKey);
   
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'upd_encryptkey\'';
    const resHandleActivities = await client.query(qstrHandleActivities);

    console.log("updcryptkey verify 1 row returned from handleactivities");
    expect(resHandleActivities.rowCount).to.equal(1);
    

    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("updcryptkey verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
   
    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("updcryptkey verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("updcryptkey verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("updcryptkey verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("updcryptkey verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("updcryptkey verify that the transaction action_name contains updcryptkey");
    expect(resTransactions.rows[0].action_name).equals('updcryptkey');  
    
  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
}); 


it(`regdomadd, actor is owner, verify domains, domainactivities accountactivities contents`, async function () {
  try {
    let userA1 = await newUser(faucet);

    await timeout(2000)

    let domain1 = await generateFioDomain(5);
    let address1 = await generateFioAddress(domain1, 5);

//console.log(userA1);
    const result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'regdomadd',
      account: 'fio.address',
      data: {
        fio_address: address1,
        is_public: 1,
        owner_fio_public_key: userA1.publicKey,
        max_fee: 1000000000000,
        tpid: '',
        actor: userA1.account
      }
    })
    //console.log(`Result: `, result)
    expect(result.status).to.equal('OK')


    await timeout(2000)

    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userA1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("regdomadd verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("regdomadd verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userA1.account);

    
    const qstrDomains = 'SELECT * FROM domains WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND domain_name = \'' + domain1 + '\'' ;
    //console.log(qstrDomains);
    const resDomains = await client.query(qstrDomains);

    console.log("regdomadd verify one row returned from domains");
    expect(resDomains.rowCount).to.equal(1);
    console.log("regdomadd verify domains owner account returned");
    expect(resDomains.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("regdomadd verify domains public");
    expect(resDomains.rows[0].is_public).equals(false);
    console.log("regdomadd verify domain_status ");
    expect(resDomains.rows[0].domain_status).equals('active');
    
    
    const qstrDomainActivities = 'SELECT * FROM domainactivities WHERE fk_domain_id = ' + resDomains.rows[0].pk_domain_id + ' AND fk_block_number = ' + resDomains.rows[0].fk_block_number  ;
   // console.log(qstrDomainActivities);
    const resDomainActivities = await client.query(qstrDomainActivities);

    console.log("regdomadd verify one row returned from DomainActivities");
    expect(resDomainActivities.rowCount).to.equal(1);
    console.log("regdomadd verify DomainActivities expiration returned");
    expect(resDomainActivities.rows[0].expiration_stamp.getTime()).equals(resDomains.rows[0].expiration_timestamp.getTime());
    console.log("regdomadd verify DomainActivities activity type");
    expect(resDomainActivities.rows[0].domain_activity_type).equals('register');
  
    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + address1 + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("regdomadd verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
    console.log("regdomadd verify Handles owner account returned");
    expect(resHandles.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("regdomadd verify Handles domain returned");
    expect(resHandles.rows[0].fk_domain_id).equals(resDomains.rows[0].pk_domain_id);
    console.log("regdomadd verify Handles status returned");
    expect(resHandles.rows[0].handle_status).equals('active');
    
    
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND fk_block_number = ' + resHandles.rows[0].fk_block_number  ;
    const resHandleActivities = await client.query(qstrHandleActivities);

    console.log("regdomadd verify one row returned from HandleActivities");
    expect(resHandleActivities.rowCount).to.equal(1);
    console.log("regdomadd verify HandleActivities activity type");
    expect(resHandleActivities.rows[0].handle_activity_type).equals('register');
  

    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resDomains.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("regdomadd verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
    console.log("regdomadd verify timestamp from blocks");
    expect(resBlocks.rows[0].stamp.getTime()).to.equal(resDomainActivities.rows[0].block_timestamp.getTime());

    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resDomains.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("regdomadd verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("regdomadd verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("regdomadd verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userA1.account);
    console.log("regdomadd verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(domain1);
    console.log("regdomadd verify that the transaction action_name contains regdomadd");
    expect(resTransactions.rows[0].action_name).equals('regdomadd');  
    console.log("regdomadd verify that the domainactivity transaction id contains regdomadd");
    expect(resTransactions.rows[0].pk_transaction_id).equals(resDomainActivities.rows[0].fk_transaction_id);  

    const qstrAccountActivities = 'SELECT * FROM accountactivities WHERE fk_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND fk_block_number = ' + resDomains.rows[0].fk_block_number +
      ' AND fk_transaction_id = ' + resTransactions.rows[0].pk_transaction_id ;
    const resAccountActivities = await client.query(qstrAccountActivities);

    //console.log(qstrAccountActivities);
    console.log("regdomadd verify no record added to AccountActivities");
    expect(resAccountActivities.rowCount).to.equal(0);
    //console.log("regdomadd verify AccountActivities activity type");
    //expect(resAccountActivities.rows[0].activity_type).equals('receiver');

  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});


it(`regdomadd, actor is not owner, verify domains, domainactivities accountactivities contents`, async function () {
  try {
    let userA1 = await newUser(faucet);
    let keys = await createKeypair();
    let accountnm = await getAccountFromKey(keys.publicKey);

    let domain1 = await generateFioDomain(5);
    let address1 = await generateFioAddress(domain1, 5);


    const result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'regdomadd',
      account: 'fio.address',
      data: {
        fio_address: address1,
        is_public: 1,
        owner_fio_public_key: keys.publicKey,
        max_fee: 1000000000000,
        tpid: '',
        actor: userA1.account
      }
    })
    //console.log(`Result: `, result)
    expect(result.status).to.equal('OK')


    await timeout(2000)

    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + accountnm + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("regdomadd verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("regdomadd verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(accountnm);

    
    const qstrDomains = 'SELECT * FROM domains WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND domain_name = \'' + domain1 + '\'' ;
   // console.log(qstrDomains);
    const resDomains = await client.query(qstrDomains);

    console.log("regdomadd verify one row returned from domains");
    expect(resDomains.rowCount).to.equal(1);
    console.log("regdomadd verify domains owner account returned");
    expect(resDomains.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("regdomadd verify domains public");
    expect(resDomains.rows[0].is_public).equals(false);
    console.log("regdomadd verify domain_status ");
    expect(resDomains.rows[0].domain_status).equals('active');
    
    
    const qstrDomainActivities = 'SELECT * FROM domainactivities WHERE fk_domain_id = ' + resDomains.rows[0].pk_domain_id + ' AND fk_block_number = ' + resDomains.rows[0].fk_block_number  ;
    //console.log(qstrDomainActivities);
    const resDomainActivities = await client.query(qstrDomainActivities);

    console.log("regdomadd verify one row returned from DomainActivities");
    expect(resDomainActivities.rowCount).to.equal(1);
    console.log("regdomadd verify DomainActivities expiration returned");
    expect(resDomainActivities.rows[0].expiration_stamp.getTime()).equals(resDomains.rows[0].expiration_timestamp.getTime());
    console.log("regdomadd verify DomainActivities activity type");
    expect(resDomainActivities.rows[0].domain_activity_type).equals('register');
  
    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + address1 + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("regdomadd verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
    console.log("regdomadd verify Handles owner account returned");
    expect(resHandles.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("regdomadd verify Handles domain returned");
    expect(resHandles.rows[0].fk_domain_id).equals(resDomains.rows[0].pk_domain_id);
    console.log("regdomadd verify Handles status returned");
    expect(resHandles.rows[0].handle_status).equals('active');
    
    
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND fk_block_number = ' + resHandles.rows[0].fk_block_number  ;
    const resHandleActivities = await client.query(qstrHandleActivities);

    console.log("regdomadd verify one row returned from HandleActivities");
    expect(resHandleActivities.rowCount).to.equal(1);
    console.log("regdomadd verify HandleActivities activity type");
    expect(resHandleActivities.rows[0].handle_activity_type).equals('register');
  

    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resDomains.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("regdomadd verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
    console.log("regdomadd verify timestamp from blocks");
    expect(resBlocks.rows[0].stamp.getTime()).to.equal(resDomainActivities.rows[0].block_timestamp.getTime());

    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resDomains.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("regdomadd verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("regdomadd verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("regdomadd verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userA1.account);
    console.log("regdomadd verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(domain1);
    console.log("regdomadd verify that the transaction action_name contains regdomadd");
    expect(resTransactions.rows[0].action_name).equals('regdomadd');  
    console.log("regdomadd verify that the domainactivity transaction id contains regdomadd");
    expect(resTransactions.rows[0].pk_transaction_id).equals(resDomainActivities.rows[0].fk_transaction_id);  

    const qstrAccountActivities = 'SELECT * FROM accountactivities WHERE fk_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND fk_block_number = ' + resDomains.rows[0].fk_block_number +
      ' AND fk_transaction_id = ' + resTransactions.rows[0].pk_transaction_id ;
    const resAccountActivities = await client.query(qstrAccountActivities);

    //console.log(qstrAccountActivities);
    console.log("regdomadd verify record added to AccountActivities");
    expect(resAccountActivities.rowCount).to.equal(1);
    console.log("regdomadd verify AccountActivities activity type");
    expect(resAccountActivities.rows[0].activity_type).equals('receiver');

  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});

it(`newfundsreq, verify handles, handleacitivity, accountactivities, requests contents`, async function () {
  try {
    let userC1 = await newUser(faucet);
    let keys = await createKeypair();
    let accountnm = await getAccountFromKey(keys.publicKey);
   
    let result1 = await userC1.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: 1000000000000,
      maxFee: 100000000000,
      technologyProviderId: ''
    })
    //console.log('Result: ', result)
    expect(result1).to.have.any.keys('status');
    expect(result1).to.have.any.keys('fee_collected');
    expect(result1).to.have.any.keys('block_num');
    expect(result1).to.have.any.keys('transaction_id');
   

    await timeout(2000)

    let user1 = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    let domain = generateFioDomain(8)
    let user1Address = generateFioAddress(domain, 7)

    result1 = await user1.genericAction('pushTransaction', {
      action: 'regdomain',
      account: 'fio.address',
      data: {
        fio_domain: domain,
        owner_fio_public_key: keys.publicKey,
        max_fee: config.maxFee,
        tpid: '',
        actor: accountnm
      }
    })
    //console.log('Result: ', result)
    expect(result1.status).to.equal('OK')

    await timeout(2000)

    result1 = await user1.genericAction('pushTransaction', {
      action: 'regaddress',
      account: 'fio.address',
      data: {
        fio_address: user1Address,
        owner_fio_public_key: keys.publicKey,
        max_fee: config.maxFee,
        tpid: '',
        actor: accountnm
      }
    });
    //console.log('Result: ', result)
    expect(result1.status).to.equal('OK');

    await timeout(2000)

    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("newfundsreq verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("newfundsreq verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC1.account);

    const qstrAccountspayer = 'SELECT * FROM accounts WHERE account_name = \'' + accountnm + '\'';
    const resAccountspayer = await client.query(qstrAccountspayer);

    console.log("newfundsreq verify one row returned from accounts");
    expect(resAccountspayer.rowCount).to.equal(1);
    console.log("newfundsreq verify account name returned");
    expect(resAccountspayer.rows[0].account_name).equals(accountnm);


    const result = await userC1.sdk.genericAction('pushTransaction', {
      action: 'newfundsreq',
      account: 'fio.reqobt',
      data: {
        payer_fio_address: user1Address,
        payee_fio_address: userC1.address,
        tpid: '',
        content: {
          payee_public_address: 'thisispayeetokenpublicaddress',
          amount: 2000000000,
          chain_code: 'BTC',
          token_code: 'BTC',
          memo: "need B'TC.",
          hash:'',
          offline_url: ''
        },
        max_fee: config.maxFee
      }
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('requested')

    await timeout(2000)

    const qstrHandlespayer = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccountspayer.rows[0].pk_account_id + ' AND handle = \'' + user1Address + '\'' ;
    const resHandlespayer = await client.query(qstrHandlespayer);
    console.log("newfundsreq verify one row returned from Handles");
    expect(resHandlespayer.rowCount).to.equal(1);

    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("newfundsreq verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
    console.log("newfundsreq verify Handles owner account returned");
    expect(resHandles.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("newfundsreq verify Handles status returned");
    expect(resHandles.rows[0].handle_status).equals('active');
    
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'new_request\'';
    const resHandleActivities = await client.query(qstrHandleActivities);

    console.log("newfundsreq verify one row returned from handleactivities");
    expect(resHandleActivities.rowCount).to.equal(1);
   console.log("newfundsreq verify handleactivities activity type");
    expect(resHandleActivities.rows[0].handle_activity_type).equals('new_request');


    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("newfundsreq verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
    console.log("newfundsreq verify timestamp from blocks");
    expect(resBlocks.rows[0].stamp.getTime()).to.equal(resHandleActivities.rows[0].block_timestamp.getTime());

    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("newfundsreq verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("newfundsreq verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("newfundsreq verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("newfundsreq verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("newfundsreq verify that the transaction action_name contains newfundsreq");
    expect(resTransactions.rows[0].action_name).equals('newfundsreq');  
    console.log("newfundsreq verify that the handleactivities transaction id contains newfundsreq");
    expect(resTransactions.rows[0].pk_transaction_id).equals(resHandleActivities.rows[0].fk_transaction_id);  

    //add acount activities and requests.
    const qstrAccountActivities = 'SELECT * FROM accountactivities WHERE fk_account_id = ' + resAccountspayer.rows[0].pk_account_id +
    ' AND fk_transaction_id = ' + resTransactions.rows[0].pk_transaction_id ;
  const resAccountActivities = await client.query(qstrAccountActivities);

  //console.log(qstrAccountActivities);
  console.log("newfundsreq verify 1 record added to AccountActivities");
  expect(resAccountActivities.rowCount).to.equal(1);
  console.log("newfundsreq verify AccountActivities activity type");
  expect(resAccountActivities.rows[0].activity_type).equals('receiver');


  const qstrFIORequests = 'SELECT * FROM fiorequests WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number +
  " AND fk_payee_handle_id = " + resHandles.rows[0].pk_handle_id +
  " AND fk_payer_handle_id = " + resHandlespayer.rows[0].pk_handle_id +
   ' AND fk_transaction_id = ' + resTransactions.rows[0].pk_transaction_id ;
 ;
    const resFIORequests = await client.query(qstrFIORequests);
    //console.log(resFIORequests);
    console.log("newfundsreq verify one row returned from FIORequests");
    expect(resFIORequests.rowCount).to.equal(1);
    console.log("newfundsreq verify timestamp from FIORequests");
    expect(resFIORequests.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("newfundsreq verify payee pub key from FIORequests");
    expect(resFIORequests.rows[0].payee_pub_key).to.equal(resHandles.rows[0].encryption_key);
    console.log("newfundsreq verify payer pub key from FIORequests");
    expect(resFIORequests.rows[0].payer_pub_key).to.equal(resHandlespayer.rows[0].encryption_key);
  
    console.log("newfundsreq verify request status from FIORequests");
    expect(resFIORequests.rows[0].request_status).to.equal('pending');
   

  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});   

it(`cancelfndreq,  verify handles, handleacitivity, accountactivities, requests contents`, async function () {
  try {
    let userC1 = await newUser(faucet);
    let userC2 = await newUser(faucet);

    await timeout(2000)


    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("cancelfndreq verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("cancelfndreq verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC1.account);

    const qstrAccountspayer = 'SELECT * FROM accounts WHERE account_name = \'' + userC2.account + '\'';
    const resAccountspayer = await client.query(qstrAccountspayer);

    console.log("cancelfndreq verify one row returned from accounts");
    expect(resAccountspayer.rowCount).to.equal(1);
    console.log("cancelfndreq verify account name returned");
    expect(resAccountspayer.rows[0].account_name).equals(userC2.account);


    const result = await userC1.sdk.genericAction('pushTransaction', {
      action: 'newfundsreq',
      account: 'fio.reqobt',
      data: {
        payer_fio_address: userC2.address,
        payee_fio_address: userC1.address,
        tpid: '',
        content: {
          payee_public_address: 'thisispayeetokenpublicaddress',
          amount: 2000000000,
          chain_code: 'BTC',
          token_code: 'BTC',
          memo: "need B'TC.",
          hash:'',
          offline_url: ''
        },
        max_fee: config.maxFee
      }
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('requested')

    await timeout(2000)

    const qstrHandlespayer = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccountspayer.rows[0].pk_account_id + ' AND handle = \'' + userC2.address + '\'' ;
    const resHandlespayer = await client.query(qstrHandlespayer);
    console.log("cancelfndreq verify one row returned from Handles");
    expect(resHandlespayer.rowCount).to.equal(1);

    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("cancelfndreq verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
    console.log("cancelfndreq verify Handles owner account returned");
    expect(resHandles.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("cancelfndreq verify Handles status returned");
    expect(resHandles.rows[0].handle_status).equals('active');
    
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'new_request\'';
    const resHandleActivities = await client.query(qstrHandleActivities);

    console.log("cancelfndreq verify one row returned from handleactivities");
    expect(resHandleActivities.rowCount).to.equal(1);
   console.log("cancelfndreq verify handleactivities activity type");
    expect(resHandleActivities.rows[0].handle_activity_type).equals('new_request');


    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("cancelfndreq verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
    console.log("cancelfndreq verify timestamp from blocks");
    expect(resBlocks.rows[0].stamp.getTime()).to.equal(resHandleActivities.rows[0].block_timestamp.getTime());

    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("cancelfndreq verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("cancelfndreq verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("cancelfndreq verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("cancelfndreq verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("cancelfndreq verify that the transaction action_name contains newfundsreq");
    expect(resTransactions.rows[0].action_name).equals('newfundsreq');  
    console.log("cancelfndreq verify that the handleactivities transaction id contains cancelfndreq");
    expect(resTransactions.rows[0].pk_transaction_id).equals(resHandleActivities.rows[0].fk_transaction_id);  

    //add acount activities and requests.
    const qstrAccountActivities = 'SELECT * FROM accountactivities WHERE fk_account_id = ' + resAccountspayer.rows[0].pk_account_id + 
    ' AND fk_transaction_id = ' + resTransactions.rows[0].pk_transaction_id ;
  const resAccountActivities = await client.query(qstrAccountActivities);

  //console.log(qstrAccountActivities);
  console.log("cancelfndreq verify 1 record added to AccountActivities");
  expect(resAccountActivities.rowCount).to.equal(1);
  console.log("cancelfndreq verify AccountActivities activity type");
  expect(resAccountActivities.rows[0].activity_type).equals('receiver');


  const qstrFIORequests = 'SELECT * FROM fiorequests WHERE ' +
  " fk_payee_handle_id = " + resHandles.rows[0].pk_handle_id +
  " AND fk_payer_handle_id = " + resHandlespayer.rows[0].pk_handle_id +
   ' AND fk_transaction_id = ' + resTransactions.rows[0].pk_transaction_id ;
 ;
    const resFIORequests = await client.query(qstrFIORequests);
    //console.log(resFIORequests);
    console.log("cancelfndreq verify one row returned from FIORequests");
    expect(resFIORequests.rowCount).to.equal(1);
    console.log("cancelfndreq verify timestamp from FIORequests");
    expect(resFIORequests.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("cancelfndreq verify payee pub key from FIORequests");
    expect(resFIORequests.rows[0].payee_pub_key).to.equal(userC1.publicKey);
    console.log("cancelfndreq verify payer pub key from FIORequests");
    expect(resFIORequests.rows[0].payer_pub_key).to.equal(userC2.publicKey);
  
    console.log("cancelfndreq verify request status from FIORequests");
    expect(resFIORequests.rows[0].request_status).to.equal('pending');
   
    //now cancel and check handle activities and requests tables

    const result1 = await userC1.sdk.genericAction('pushTransaction', {
      action: 'cancelfndreq',
      account: 'fio.reqobt',
      data: {
        fio_request_id: resFIORequests.rows[0].fio_chain_request_id,
        max_fee: 400000000000,
        tpid: '',
        actor: userC1.account
      }
    })
    //console.log('Result: ', result);
    expect(result1.status).to.equal('cancelled');
    await timeout(2000)

    const qstrHandleActivitiesafter = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'cancel_request\'';
    const resHandleActivitiesafter = await client.query(qstrHandleActivitiesafter);
//console.log(qstrHandleActivitiesafter);
    console.log("cancelfndreq verify one row returned from handleactivities");
    expect(resHandleActivitiesafter.rowCount).to.equal(1);
   console.log("cancelfndreq verify handleactivities activity type");
    expect(resHandleActivitiesafter.rows[0].handle_activity_type).equals('cancel_request');

    const qstrFIORequestsafter = 'SELECT * FROM fiorequests WHERE pk_fio_requests_id = ' + resFIORequests.rows[0].pk_fio_requests_id ;
   ;
      const resFIORequestsafter = await client.query(qstrFIORequestsafter);
      //console.log(resFIORequests);
      console.log("cancelfndreq verify one row returned from FIORequests");
      expect(resFIORequestsafter.rowCount).to.equal(1);
      console.log("cancelfndreq verify timestamp from FIORequests");
      expect(resFIORequestsafter.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
      console.log("cancelfndreq verify payee pub key from FIORequests");
      expect(resFIORequestsafter.rows[0].payee_pub_key).to.equal(userC1.publicKey);
      console.log("cancelfndreq verify payer pub key from FIORequests");
      expect(resFIORequestsafter.rows[0].payer_pub_key).to.equal(userC2.publicKey);
    
      console.log("cancelfndreq verify request status from FIORequests");
      expect(resFIORequestsafter.rows[0].request_status).to.equal('cancelled');


  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});   

it(`recordobt,  verify handles, handleacitivity, accountactivities, fiodatas contents`, async function () {
  try {
    let userC1 = await newUser(faucet);
    let userC2 = await newUser(faucet);

    await timeout(2000)


    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC2.account + '\'';
    const resAccounts = await client.query(qstrAccounts);

    console.log("recordobt verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("recordobt verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC2.account);

    const qstrAccountspayer = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccountspayer = await client.query(qstrAccountspayer);

    console.log("recordobt verify one row returned from accounts");
    expect(resAccountspayer.rowCount).to.equal(1);
    console.log("recordobt verify account name returned");
    expect(resAccountspayer.rows[0].account_name).equals(userC1.account);


    const result = await userC1.sdk.genericAction('recordObtData', {
      payerFioAddress: userC1.address,
      payeeFioAddress: userC2.address,
      payerTokenPublicAddress: userC1.publicKey,
      payeeTokenPublicAddress: userC2.publicKey,
      amount: 1000000000000,
      chainCode: "FIO",
      tokenCode: "FIO",
      status: '',
      obtId: '',
      maxFee: config.api.record_obt_data.fee,
      technologyProviderId: '',
      payeeFioPublicKey: userC2.publicKey,
      memo: "obtM'emo",
      hash: '',
      offLineUrl: ''
  })
  //console.log('Result: ', result)
  timeStamp = result.time_stamp
  expect(result.status).to.equal('sent_to_blockchain')

    await timeout(2000)

    const qstrHandlespayer = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccountspayer.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandlespayer = await client.query(qstrHandlespayer);
    console.log("recordobt verify one row returned from Handles");
    expect(resHandlespayer.rowCount).to.equal(1);

    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC2.address + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("recordobt verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
    console.log("recordobt verify Handles owner account returned");
    expect(resHandles.rows[0].fk_owner_account_id).equals(resAccounts.rows[0].pk_account_id);
    console.log("recordobt verify Handles status returned");
    expect(resHandles.rows[0].handle_status).equals('active');
    
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandlespayer.rows[0].pk_handle_id + ' AND handle_activity_type = \'record_obt\'';
    const resHandleActivities = await client.query(qstrHandleActivities);

    console.log("recordobt verify one row returned from handleactivities");
    expect(resHandleActivities.rowCount).to.equal(1);
   console.log("recordobt verify handleactivities activity type");
    expect(resHandleActivities.rows[0].handle_activity_type).equals('record_obt');


    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("recordobt verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
    console.log("recordobt verify timestamp from blocks");
    expect(resBlocks.rows[0].stamp.getTime()).to.equal(resHandleActivities.rows[0].block_timestamp.getTime());

    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("recordobt verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("recordobt verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("recordobt verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("recordobt verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("recordobt verify that the transaction action_name contains recordobt");
    expect(resTransactions.rows[0].action_name).equals('recordobt');  
    console.log("recordobt verify that the handleactivities transaction id contains recordobt");
    expect(resTransactions.rows[0].pk_transaction_id).equals(resHandleActivities.rows[0].fk_transaction_id);  

    //add acount activities and requests.
    const qstrAccountActivities = 'SELECT * FROM accountactivities WHERE fk_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND fk_block_number = ' + resHandleActivities.rows[0].fk_block_number +
    ' AND fk_transaction_id = ' + resTransactions.rows[0].pk_transaction_id ;
  const resAccountActivities = await client.query(qstrAccountActivities);

  //console.log(qstrAccountActivities);
  console.log("recordobt verify 1 record added to AccountActivities");
  expect(resAccountActivities.rowCount).to.equal(1);
  console.log("recordobt verify AccountActivities activity type");
  expect(resAccountActivities.rows[0].activity_type).equals('receiver');


  const qstrFIORequests = 'SELECT * FROM fiodatas WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number +
  " AND fk_payee_handle_id = " + resHandles.rows[0].pk_handle_id +
  " AND fk_payer_handle_id = " + resHandlespayer.rows[0].pk_handle_id +
   ' AND fk_transaction_id = ' + resTransactions.rows[0].pk_transaction_id ;
 ;
    const resFIORequests = await client.query(qstrFIORequests);
   // console.log(resFIORequests);
    console.log("recordobt verify one row returned from FIORequests");
    expect(resFIORequests.rowCount).to.equal(1);
    console.log("recordobt verify timestamp from FIORequests");
    expect(resFIORequests.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("recordobt verify payee pub key from FIORequests");
    expect(resFIORequests.rows[0].payee_pub_key).to.equal(userC2.publicKey);
    console.log("recordobt verify payer pub key from FIORequests");
    expect(resFIORequests.rows[0].payer_pub_key).to.equal(userC1.publicKey);
  
    console.log("recordobt verify request status from FIORequests");
    expect(resFIORequests.rows[0].data_status).to.equal('sent_to_blockchain');
   

  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});   


it(`burnaddress, verify handles, handleacitivity, nftsignuatures contents`, async function () {
  try {
    let userC1 = await newUser(faucet);

    await timeout(2000)


    const qstrAccounts = 'SELECT * FROM accounts WHERE account_name = \'' + userC1.account + '\'';
    const resAccounts = await client.query(qstrAccounts);



    console.log("burnaddress verify one row returned from accounts");
    expect(resAccounts.rowCount).to.equal(1);
    console.log("burnaddress verify account name returned");
    expect(resAccounts.rows[0].account_name).equals(userC1.account);

    const result = await userC1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: userC1.address,
        nfts: [{
            "chain_code":"ETH","contract_address":"0x123456789ABCDEF", "token_id":"1", "url":"", "hash":"","metadata":""
          }],
        max_fee: config.maxFee,
        actor: userC1.account,
        tpid: ""
      }
    })
    //console.log(`Result: `, result)
    expect(result.status).to.equal('OK')

    await timeout(2000)

    const qstrHandles = 'SELECT * FROM handles WHERE fk_owner_account_id = ' + resAccounts.rows[0].pk_account_id + ' AND handle = \'' + userC1.address + '\'' ;
    const resHandles = await client.query(qstrHandles);

    console.log("burnaddress verify one row returned from Handles");
    expect(resHandles.rowCount).to.equal(1);
    
    const qstrHandleActivities = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'add_nft\'';
    const resHandleActivities = await client.query(qstrHandleActivities);

    //console.log(qstrHandleActivities);
    console.log("burnaddress verify 1 row returned from handleactivities");
    expect(resHandleActivities.rowCount).to.equal(1);
    

    //block info
    const qstrBlocks = 'SELECT * FROM blocks WHERE pk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resBlocks = await client.query(qstrBlocks);
    console.log("burnaddress verify one row returned from blocks");
    expect(resBlocks.rowCount).to.equal(1);
   
    
              
    //transaction info
    const qstrTransactions = 'SELECT * FROM transactions WHERE fk_block_number = ' + resHandleActivities.rows[0].fk_block_number ;
    const resTransactions = await client.query(qstrTransactions);
    // console.log(resTransactions);
    console.log("burnaddress verify one row returned from transactions");
    expect(resTransactions.rowCount).to.equal(1);
    console.log("burnaddress verify timestamp from transactions");
    expect(resTransactions.rows[0].block_timestamp.getTime()).to.equal(resBlocks.rows[0].stamp.getTime());
    console.log("burnaddress verify that the transaction request_data contains userA1.account");
    expect(resTransactions.rows[0].request_data).contains(userC1.account);
    console.log("burnaddress verify that the transaction request_data contains domain name");
    expect(resTransactions.rows[0].request_data).contains(userC1.domain);
    console.log("burnaddress verify that the transaction action_name contains burnaddress");
    expect(resTransactions.rows[0].action_name).equals('addnft');  
    
    
    const qstrNFTSignatures = 'SELECT * FROM nftsignatures WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id  ;
    const resNFTSignatures = await client.query(qstrNFTSignatures);
   // console.log(resNFTSignatures);
    console.log("burnaddress verify 1 row returned from nftsignatures");
    expect(resNFTSignatures.rowCount).to.equal(1);
    console.log("burnaddress verify block numberfrom nftsignatures");
    expect(resNFTSignatures.rows[0].fk_block_number).to.equal(resBlocks.rows[0].pk_block_number);
    console.log("burnaddress verify contract address from nftsignatures");
    expect(resNFTSignatures.rows[0].contract_address).to.equal('0x123456789ABCDEF');
    console.log("burnaddress verify chain_code from nftsignatures");
    expect(resNFTSignatures.rows[0].chain_code).to.equal('ETH');
    console.log("burnaddress verify token_id from nftsignatures");
    expect(resNFTSignatures.rows[0].token_id).to.equal('1');
    console.log("burnaddress verify nft_url from nftsignatures");
    expect(resNFTSignatures.rows[0].nft_url).to.equal('');
    console.log("burnaddress verify nft hash from nftsignatures");
    expect(resNFTSignatures.rows[0].nft_hash).to.equal('');
    console.log("burnaddress verify nft meta data from nftsignatures");
    expect(resNFTSignatures.rows[0].nft_meta_data).to.equal('');

    //now burn the address
    const result2 = await callFioApiSigned('push_transaction', {
      action: 'burnaddress',
      account: 'fio.address',
      actor: userC1.account,
      privKey: userC1.privateKey,
      data: {
          "fio_address": userC1.address,
          "max_fee": config.maxFee,
          "tpid": '',
          "actor": userC1.account
      }
  })
  //console.log('Result: ', JSON.parse(result.processed.action_traces[0].receipt.response));
  expect(JSON.parse(result2.processed.action_traces[0].receipt.response).status).to.equal('OK');
  expect(JSON.parse(result2.processed.action_traces[0].receipt.response).fee_collected).to.equal(0);

  await timeout(2000)

  const qstrNFTSignatures1 = 'SELECT * FROM nftsignatures WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id  ;
 
  const resNFTSignatures1 = await client.query(qstrNFTSignatures1);
 // console.log(resNFTSignatures);
  console.log("burnaddress verify 0 row returned from nftsignatures");
  expect(resNFTSignatures1.rowCount).to.equal(0);
 
   //check pub addresses, see that only one FIO pub address is present after trnsfer
   const qstrPubAddresses = 'SELECT * FROM pubaddresses WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id  ;
  // console.log(qstrPubAddresses);
   const resPubAddresses = await client.query(qstrPubAddresses);
  // console.log(resPubAddresses);
   console.log("burnaddress verify 0 row returned from pubaddresses");
   expect(resPubAddresses.rowCount).to.equal(0);

   const qstrHandleActivities1 = 'SELECT * FROM handleactivities WHERE fk_handle_id = ' + resHandles.rows[0].pk_handle_id + ' AND handle_activity_type = \'self_burn\'';
   const resHandleActivities1 = await client.query(qstrHandleActivities1);

   //console.log(qstrHandleActivities);
   console.log("burnaddress verify 1 row returned from handleactivities");
   expect(resHandleActivities1.rowCount).to.equal(1);

   const qstrHandles1 = 'SELECT * FROM handles WHERE handle = \'' + userC1.address + '\'' ;
   const resHandles1 = await client.query(qstrHandles1);

   console.log("burnaddress verify one row returned from Handles");
   expect(resHandles1.rowCount).to.equal(1);
   console.log("burnaddress verify burnt Handlesstatus");
   expect(resHandles1.rows[0].handle_status).to.equal('burnt');
   console.log("burnaddress verify one row returned from Handles has owner null");
    expect(resHandles1.rows[0].fk_owner_account_id).to.equal(null);
    console.log("burnaddress verify one row returned from Handles encrypt key set false");
    expect(resHandles1.rows[0].is_encrypt_key_set).to.equal(false);
    console.log("burnaddress verify one row returned from Handles encrypt key cleared");
    expect(resHandles1.rows[0].encryption_key).to.equal('');
   
  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});  

})


describe.skip(`    A. Test all table triggers burn domain, address using burnexpired`, () => {


//burn tests special setup considerations
const expireDate = 1527686000;  // May, 2018
let user = [];
let address = [];
let totaddresses = 0;
let domainBlockCount = 2;
let addressBlockCount = 3;
let burnexpiredStepSize = 5; // Offset gets incremented by this number in the while loop. Also index is set to this number.
const retryLimit = 5; // Number of times to call burnexpired with the same offset/limit when hitting a CPU limit error


/**
* This test requires the "modexpire" action
* This test must be run on a cleanly started local dev testnet (developer net)
*
* This test also requires a cleanly started chain to ensure all tests run successfully.
*
*
* In fio.address.abi:
*
*   Add modexpire struct:

{
      "name": "modexpire",
      "base": "",
      "fields": [
        {
          "name": "fio_address",
          "type": "string"
        },
        {
          "name": "expire",
          "type": "int64"
        }
      ]
    },

*
*  Add modexpire action:
*

{
    "name": "modexpire",
    "type": "modexpire",
    "ricardian_contract": ""
  },
*
*
* In fio.address.cpp
*
*   Add modexpire action: (beware of autoformattig of the "byname"_n>)
*

 [[eosio::action]]
      void modexpire(const string &fio_address, const int64_t &expire) {
          FioAddress fa;
          getFioAddressStruct(fio_address, fa);
          name actor = name{"eosio"};
          const uint128_t domainHash = string_to_uint128_hash(fa.fiodomain.c_str());
          auto domsbyname = domains.get_index<"byname"_n>();
          auto doms_iter = domsbyname.find(domainHash);

          domsbyname.modify(doms_iter, actor, [&](struct domain &a) {
              a.expiration = expire;
          });
      }
*
*
*   Add modexpire to EOSIO_DISPATCH, e.g.:
*
*      EOSIO_DISPATCH(FioNameLookup, (regaddress)(addaddress)(remaddress)(remalladdr)(regdomain)(renewdomain)(renewaddress)(
*          setdomainpub)(burnexpired)(modexpire)(decrcounter)
*
*
*  Rebuild contracts
*
*  be sure to start the chain without many other CPU intensive things on the local dev box, exit clion etc etc.
*/

//the following test blocks will test burn of domain and addresses
it(`#1 - Create domain block: ${domainBlockCount} domains, ${addressBlockCount} addresses`, async () => {
try {

    for (let i = 0; i < domainBlockCount; i++) {
        console.log('          (Adding Domain) #' + i);
        user[i] = await newUser(faucet);
        // console.log('user[i].privateKey: ', user[i].privateKey);
        // console.log('user[i].privateKey: ', user[i].publicKey);


        //console.log('          (Adding ' + addressBlockCount + ' Addresses with ' + nftBlockCount + ' NFTs)');
        for (let j = 0; j < addressBlockCount; j++) {
            address[totaddresses] = await generateFioAddress(user[i].domain, 10);
            console.log('address[j]: ', address[totaddresses]);
           
              

            const addressResult = await user[i].sdk.genericAction('registerFioAddress', {
                fioAddress: address[totaddresses],
                maxFee: config.maxFee,
                technologyProviderId: ''
            })
            // console.log('addressResult: ', addressResult)
            expect(addressResult.status).to.equal('OK')
            totaddresses++;

        }  // j - addresses
    } // i - domains

} catch (err) {
    console.log(err.json)
    expect(err).to.equal(null);
}
});

it(`(Expire the domains using modexpire)`, async () => {

for (let i = 0; i < domainBlockCount; i++) {
    try {
        const result = await callFioApiSigned('push_transaction', {
            action: 'modexpire',
            account: 'fio.address',
            actor: user[i].account,
            privKey: user[i].privateKey,
            data: {
                "fio_address": user[i].domain,
                "expire": expireDate,
                "actor": user[i].account
            }
        })
        //console.log('Result: ', result);
        expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
        console.log('Error: ', err);
        // expect(err).to.equal(null);
    }
}

});

//now burn til no more burned.
it(`Call burnexpired until empty`, async () => {
let offset, limit;
let retryCount = 0;
let empty = false;
let workDoneThisRound = true;
let workDoneThisOffset = false;
let count = 1;
let burnUser = await newUser(faucet);

while (!empty) {
offset = burnexpiredStepSize * (count-1);
limit = burnexpiredStepSize;

try {
    const result = await burnUser.sdk.genericAction('pushTransaction', {
        action: 'burnexpired',
        account: 'fio.address',
        data: {
            actor: burnUser.account,
            offset: offset,
            limit: limit
        }
    })
    console.log('Offset = ' + offset + ', Limit = ' + limit + ', Result: {status: ' + result.status + ', items_burned: ' + result.items_burned + ' }');
    expect(result.status).to.equal('OK');
    workDoneThisOffset = true;
    workDoneThisRound = true;
    retryCount = 0;
    //log the tx and traces.
   // console.log(result);
    await timeout(1000); // To avoid duplicate transaction
} catch (err) {
    workDoneThisOffset = false;
    console.log('Error: ', err.message);
    retryCount = 0;
    expect(err.message).to.equal('No work.');

}

const json = {
    json: true,
    code: 'fio.address',
    scope: 'fio.address',
    table: 'domains',
    limit: burnexpiredStepSize,
    lower_bound: burnexpiredStepSize * count,
    reverse: false,
    show_payer: false
}
result = await callFioApi("get_table_rows", json);
//console.log('Table lookup: ', result);

if (result.rows.length == 0) {
    console.log("DONE");
    count = 1;  // Start again
    // If this is the first round, or work was done during the round, reset
    if (workDoneThisRound) {
        workDoneThisRound = false;
    } else {
        empty = true;  // No work was done this round and we are at the end of the domains
    }
} else {
    // Only increment the offset if no work was done
    if (!workDoneThisOffset) {
        // If you have done several retries, move to next offset
        if (retryCount == 0) {
            count++;
        } else if (retryCount >= retryLimit) {
            retryCount = 0;
            count++;
        }
    }
}
}

});

//next check relic tables, check domains and addresses are listed burnt.
it(`Check burned domains and addresses: ${domainBlockCount} domains, ${addressBlockCount} addresses`, async () => {

try {
  let iaddr = 0;

    for (let i = 0; i < domainBlockCount; i++) {
       console.log("verify domain "+ user[i].domain);
        //select from domains by domain name, verify domain burnt
        let qstrDomains = 'SELECT * FROM domains WHERE domain_name = \'' + user[i].domain + '\'' ;
        // console.log(qstrDomains);
         let resDomains = await client.query(qstrDomains);
    // console.log(resDomains);
         console.log("regdomadd verify one row returned from domains");
         expect(resDomains.rowCount).to.equal(1);
         console.log("regdomadd verify domains owner account returned");
         expect(resDomains.rows[0].domain_status).equals('burnt');

         //check domain activity.
         let qstrDomainActivities = 'SELECT * FROM domainactivities WHERE fk_domain_id = ' + resDomains.rows[0].pk_domain_id + 
         ' AND domain_activity_type = \'auto_burn\''  ;
         console.log(qstrDomainActivities);
         let resDomainActivities = await client.query(qstrDomainActivities);
     
         console.log("regdomain verify one row returned from DomainActivities");
         expect(resDomainActivities.rowCount).to.equal(1);
         
        for (let j = 0; j < addressBlockCount; j++) {
            console.log('verify address '+ address[iaddr]);
            //select from handles by handle verify handle burnt.  
            iaddr++;

        }  // j - addresses
    } // i - domains

} catch (err) {
    console.log(err)
    expect(err).to.equal(null);
}
});



})

