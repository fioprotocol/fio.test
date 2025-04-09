
/*
this test will perform rollback tests for relic data pipeline
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
 /* client =  new Client({
    user: 'chronicle_user',
    host: '18.246.18.165',
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

describe.skip(`    A. Tests to setup rollback scenarios handles `, () => {

  let user1, user2, encryptKeys = {}, encryptKeys2 = {};
  let blockbeforefork, forkblock;
  
  before(async () => {
      user1 = await newUser(faucet);
      user2 = await newUser(faucet);
      const keypair = await createKeypair();
      encryptKeys = {
          publicKey: keypair.publicKey,
          privateKey: keypair.privateKey,
      }
      const keypair1 = await createKeypair();
      encryptKeys2 = {
          publicKey: keypair1.publicKey,
          privateKey: keypair1.privateKey,
      }
  });

  it(`Call get_table_rows for fionames. Verify FIO token_code, chain_code, public_address`, async () => {
      try {
          const json = {
              code: 'fio.address',
              scope: 'fio.address',
              table: 'fionames',
              lower_bound: user1.account,
              upper_bound: user1.account,
              key_type: 'i64',
              index_position: '4',
              json: true
          }
          result = await callFioApi("get_table_rows", json);
          //console.log(JSON.stringify(result, null, 4));
          expect(result.rows[0].addresses[0].token_code).to.equal('FIO');
          expect(result.rows[0].addresses[0].chain_code).to.equal('FIO');
          expect(result.rows[0].addresses[0].public_address).to.equal(user1.publicKey);
      } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
      }
  });

  it(`Call get_table_rows for fionames for user1. Get id.`, async () => {
      try {
        const json = {
          json: true,
          code: 'fio.address',
          scope: 'fio.address',
          table: 'fionames',
          lower_bound: user1.account,
          upper_bound: user1.account,
          key_type: 'i64',
          reverse: true,
          index_position: '4'
        }
          result = await callFioApi("get_table_rows", json);
          user1.id = result.rows[0].id;
          expect(user1.id).to.be.a('number');
      } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
      }
  });

  it(`Call get_table_rows for fionameinfo for user1`, async () => {
      try {
        const json = {
          json: true,
          code: 'fio.address',
          scope: 'fio.address',
          table: 'fionameinfo',
          lower_bound: user1.id,
          upper_bound: user1.id,
          key_type: 'i64',
          reverse: true,
          index_position: '2'
        }
          result = await callFioApi("get_table_rows", json);
          expect(result.rows[0].fionameid).to.equal(user1.id);
          expect(result.rows[0].datadesc).to.equal('FIO_REQUEST_CONTENT_ENCRYPTION_PUB_KEY');
          expect(result.rows[0].datavalue).to.equal(user1.publicKey);
      } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
      }
  });


  it(`Call get_encrypt_key. Verify encryption key same as user public key`, async () => {
      try {
          const json = {
              fio_address: user1.address
          }
          result = await callFioApi("get_encrypt_key", json);
          expect(result.encrypt_public_key).to.equal(user1.publicKey);
      } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
      }
  });

  it(`Add new encrypt key for user1`, async () => {
      try {
          const result = await user1.sdk.genericAction('pushTransaction', {
              action: 'updcryptkey',
              account: 'fio.address',
              data: {
                  fio_address: user1.address,
                  encrypt_public_key: encryptKeys.publicKey,
                  max_fee: config.maxFee,
                  tpid: user1.address
              }
          })
          expect(result.status).to.equal('OK');
          blockbeforefork = result.block_num;
          await timeout(2000);
      } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          expect(err).to.equal(null);
      }
  });

  it(`Add new encrypt key for user1`, async () => {
    try {
      
        const result = await user1.sdk.genericAction('pushTransaction', {
            action: 'updcryptkey',
            account: 'fio.address',
            data: {
                fio_address: user1.address,
                encrypt_public_key: encryptKeys2.publicKey,
                max_fee: config.maxFee,
                tpid: user1.address
            }
        })
        expect(result.status).to.equal('OK');
        forkblock = result.block_num;
        console.log(" block number before fork is ", blockbeforefork);
        console.log(" fork block is ",forkblock);
    } catch (err) {
        console.log(JSON.stringify(err, null, 4));
        expect(err).to.equal(null);
    }
});

  
  /*
  this is a manual test that should be run after the chain and relic are loaded
  for the deisred fork testing.
  fio.chronicle must be stopped,
  the rbblock number must be edited to the desired block to rollback to.
  this test verifies that there are no items in the relic db with block number
  greater than the rbblock, meaning the rollback occured successfully.
  */
  //run this test after running regaddress load the chain test, then stopping chronicle, then performing rbfork for block reported from the test'
  it.skip(`REQUIRES EDIT rbblock number, verify rollback to specified block`, async function () {
    try {
    
      //set the rbblock to the block used for rbfork before running this test.
      //EDIT this to be the block number.
      let rbblock = 1182;
  
      let qstr = 'SELECT rbfork('+ rbblock+')';
      let res = await client.query(qstr);
      console.log("verify rollback accounts table");
      expect(res.rowCount).to.equal(1);
  
      qstr = 'SELECT * FROM accounts WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback accounts table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM accountsaudit WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback accountsaudit table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM accountactivities WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback accountactivities table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM blocks WHERE pk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback blocks table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM pubaddresses WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback pubaddresses table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM domainactivities WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback domainactivities table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM domains WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback domains table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM domainsaudit WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback domainsaudit table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM handles WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback handles table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM handlesaudit WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback handlesaudit table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM handleactivities WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback handleactivities table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM pubaddresses WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback pubaddresses table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM pubaddressesaudit WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback pubaddressesaudit table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM pubaddressesaudit WHERE table_operation_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback of update block numbers pubaddressesaudit table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM traces WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback traces table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM transactions WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback transactions table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM tokentransfers WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback tokentransfers table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM nftsignatures WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback nftsignatures table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM fiodatas WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback fiodatas table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM fiodatasaudit WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback fiodatasaudit table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM fiorequests WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback fiorequests table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM fiorequestsaudit WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback fiorequestsaudit table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM tokenstakings WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback tokenstakings table");
      expect(res.rowCount).to.equal(0);
     
    } catch (err) {
      console.log(err);
      expect(err).to.equal(null);
    }
  });  
  
  
  })


describe.skip(`    A. Tests to setup rollback scenarios fiorequests fiodatas `, () => {

  const fundsAmount = 4;
  let requestId;
  let fioSdk, fioSdk2;
  let testFioAddressName, testFioAddressName2
  let blockbeforefork, forkblock;
  const memo = 'testing fund request';

  it(`requestFunds`, async () => {

    fioSdk = await newUser(faucet);
    fioSdk2 = await newUser(faucet);
    testFioAddressName = fioSdk.address;
    testFioAddressName2 = fioSdk2.address;


    const result = await fioSdk2.sdk.genericAction('requestFunds', {
      payerFioAddress: testFioAddressName,
      payeeFioAddress: testFioAddressName2,
      payeePublicAddress: testFioAddressName2,
      amount: fundsAmount,
      chainCode: 'FIO',
      tokenCode: 'FIO',
      memo,
      maxFee: 4000000000000,
    })

    requestId = result.fio_request_id
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.fio_request_id).to.be.a('number')
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
    blockbeforefork = result.block_num;
  })

  it(`getPendingFioRequests`, async () => {
    await timeout(4000)
    const result = await fioSdk.sdk.genericAction('getPendingFioRequests', {})

    expect(result).to.have.all.keys('requests', 'more')
    expect(result.requests).to.be.a('array')
    expect(result.more).to.be.a('number')
    const pendingReq = result.requests.find(pr => parseInt(pr.fio_request_id) === parseInt(requestId))
    expect(pendingReq).to.have.all.keys('fio_request_id', 'payer_fio_address', 'payee_fio_address', 'payee_fio_public_key', 'payer_fio_public_key', 'time_stamp', 'content')
    expect(pendingReq.fio_request_id).to.be.a('number')
    expect(pendingReq.fio_request_id).to.equal(requestId)
    expect(pendingReq.payer_fio_address).to.be.a('string')
    expect(pendingReq.payer_fio_address).to.equal(testFioAddressName)
    expect(pendingReq.payee_fio_address).to.be.a('string')
    expect(pendingReq.payee_fio_address).to.equal(testFioAddressName2)
  })

  it(`cancel request`, async () => {
    try{
    const result = await fioSdk2.sdk.genericAction('cancelFundsRequest', {
      fioRequestId: requestId,
      maxFee: 4000000000000,
      tpid: ''
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
    forkblock = result.block_num;

    console.log(" block number of last block before fork is ", blockbeforefork);
    console.log( "block number of forking block is ", forkblock);
    } catch (e) {
      console.log(e);
    }
  })

 
  
  
  
  /*
  this is a manual test that should be run after the chain and relic are loaded
  for the deisred fork testing.
  fio.chronicle must be stopped,
  the rbblock number must be edited to the desired block to rollback to.
  this test verifies that there are no items in the relic db with block number
  greater than the rbblock, meaning the rollback occured successfully.
  */
  //run this test after running regaddress load the chain test, then stopping chronicle, then performing rbfork for block reported from the test'
  it.skip(`REQUIRES EDIT rbblock number, verify rollback to specified block`, async function () {
    try {
    
      //set the rbblock to the block used for rbfork before running this test.
      //EDIT this to be the block number.
      let rbblock = 1182;
  
      let qstr = 'SELECT rbfork('+ rbblock+')';
      let res = await client.query(qstr);
      console.log("verify rollback accounts table");
      expect(res.rowCount).to.equal(1);
  
      qstr = 'SELECT * FROM accounts WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback accounts table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM accountsaudit WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback accountsaudit table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM accountactivities WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback accountactivities table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM blocks WHERE pk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback blocks table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM pubaddresses WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback pubaddresses table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM domainactivities WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback domainactivities table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM domains WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback domains table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM domainsaudit WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback domainsaudit table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM handles WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback handles table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM handlesaudit WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback handlesaudit table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM handleactivities WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback handleactivities table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM pubaddresses WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback pubaddresses table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM pubaddressesaudit WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback pubaddressesaudit table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM pubaddressesaudit WHERE table_operation_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback of update block numbers pubaddressesaudit table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM traces WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback traces table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM transactions WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback transactions table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM tokentransfers WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback tokentransfers table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM nftsignatures WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback nftsignatures table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM fiodatas WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback fiodatas table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM fiodatasaudit WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback fiodatasaudit table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM fiorequests WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback fiorequests table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM fiorequestsaudit WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback fiorequestsaudit table");
      expect(res.rowCount).to.equal(0);
  
      qstr = 'SELECT * FROM tokenstakings WHERE fk_block_number > '+ rbblock;
      res = await client.query(qstr);
      console.log("verify rollback tokenstakings table");
      expect(res.rowCount).to.equal(0);
     
    } catch (err) {
      console.log(err);
      expect(err).to.equal(null);
    }
  });  
  
  
  })



describe.skip(`    A. Tests to setup rollback scenarios `, () => {


  
/*
theres three test cases for rollback of pubaddresses,
the below code needs to be modified to set up each test case, 
then the relic db is manually examined before and after the rollback is performed
....
1) the block before the fork has an update performed on a pre-existing address, the forking blocks do not remove the address (update of a non deleted record in pubaddresses).
2) the block before the fork has a delete of the pub address that needs re-performed. the forking blocks did updates to the pub address. (delete any existing pub address record)
3) the block before the fork has an update performed, but the forking block does a remaddress (update of a deleted record in pub addresses, no existing record in the pubaddresses, record must be added though the operation was an update) 

*/
//register 10 new addresses,on different accounts
//be sure to do a regaddress and a remaddress for each 
//account. after the 4th capture the current block number.
//after all are created call rbfork()
//verify the handles, handleactivities, pubaddresses, accounts all
//have appropriate data removed.
//verify audit tables are cleared appropriately for handles

//this test loads the chain for rollback testing for handles.
//run this test, then stop relic data pipeline... 
//then run verify rollback handles test to check results.
it.skip(`regaddress rollback, load the chain, report block for rollback,  actor is owner`, async function () {
  try {
    let rbblock = 0;
    let blockpreviouspubaddress = 0;

   // for (let numits = 0; numits < 10; numits++) {

    let userA1 = await newUser(faucet);
   // console.log("made user");
    
    userA1.address1 = generateFioAddress(userA1.domain,8);
       
    let address2 = generateFioAddress(userA1.domain,8);

    let result = await userA1.sdk.genericAction('pushTransaction', {
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
    await timeout(2000);

    result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'regaddress',
      account: 'fio.address',
      data: {
          fio_address: address2,
          owner_fio_public_key: userA1.publicKey,
          max_fee: config.maxFee,
          tpid: '',
          actor: userA1.account
      }
    });
    //console.log(result);
    expect(result.status).to.equal('OK')
    await timeout(2000);

    result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addaddress',
      account: 'fio.address',
      data: {
        fio_address: userA1.address,
        public_addresses:[
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:edddzha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          }
        ],
        max_fee: config.maxFee,
        tpid: '',
        actor: userA1.account
      }
    })
    expect(result.status).to.equal('OK')

    await timeout(2000);

    result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addaddress',
      account: 'fio.address',
      data: {
        fio_address: userA1.address,
        public_addresses:[
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:e222zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          }
        ],
        max_fee: config.maxFee,
        tpid: '',
        actor: userA1.account
      }
    })
    expect(result.status).to.equal('OK')

  /*  result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'remaddress',
      account: 'fio.address',
      data: {
        fio_address: userA1.address,
        public_addresses:[
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:e222zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          }
        ],
        max_fee: config.maxFee,
        tpid: '',
        actor: userA1.account
      }
    })
    expect(result.status).to.equal('OK')
    */
   

    let domainGood = generateFioDomain(7);


    result = await userA1.sdk.genericAction('registerFioDomain', {
      fioDomain: domainGood,
      maxFee: config.api.register_fio_domain.fee,
      technologyProviderId: ''
    })
   // console.log('created domain: ', numdomains)
    expect(result.status).to.equal('OK')

    blockpreviouspubaddress = result.block_num;

    await timeout(2000);

    
   // if(numits == 4){
     //  rbblock = result.block_num;
   // }

   /* result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addaddress',
      account: 'fio.address',
      data: {
        "fio_address": userA1.address,
        "public_addresses": [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8eddd4ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          }
        ],
        "max_fee": 400000000000,
        "tpid": '',
        "actor": userA1.account
      }
    })
    expect(result.status).to.equal('OK');
*/
result = await userA1.sdk.genericAction('pushTransaction', {
  action: 'setdomainpub',
  account: 'fio.address',
  data: {
    fio_domain: domainGood,
    is_public: 1,
    max_fee: config.maxFee,
    tpid: '',
    actor: userA1.account
  }
})
expect(result.status).to.equal('OK');

    // if(numits == 4){
       rbblock = result.block_num;
   // }
   // console.log("iter ", numits);


  //}//end loop

  // now stop relic after the test.

  console.log(" to complete test stop fio.chronicle then verify rollback block ", rbblock);
  console.log(" to complete test stop fio.chronicle then verify previous pub address value  block ", blockpreviouspubaddress);
 
  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});

/*
theres 3 test cases for rollback of nft signatures,
the below code needs to be modified to set up each test case, 
then the relic db is manually examined before and after the rollback is performed
....
1) the block before the fork has an update performed on a pre-existing nft signature, the forking blocks do not remove the signature, they update the signature (update of a non deleted record in pubaddresses).
2) the block before the fork has a delete of the nft signature that needs re-performed. the forking blocks did updates to the nft signature. (delete any existing pub address record)
3) the block before the fork has an update nft signature, but the forking block does a remnft (update of a deleted record in signaturews, no existing record in the signatures, record must be added though the operation was an update) 

*/

//this test loads the chain for rollback testing for nft signatures.
//run this test, then stop relic data pipeline... 
//examine db to verify the setup.
//run the rbfork() with desired block number for your scenario.
//examine the db to verify nft signatures are rolled back correctly for your scenario.
//then run verify rollback results test to check results.
it.skip(`nftsignatures rollback, load the chain, report block for rollback`, async function () {
  try {
    let rbblock = 0;
    let blockprevious = 0;

    let userA1 = await newUser(faucet);

    let result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: userA1.address,
        nfts: [
          {"chain_code":"bsc","contract_address":"0xF5db804101d8600c26598A1Ba465166c33CdAA4b","token_id":"271637","url":"https://airnfts.s1.amazonaws.com/nft-images/20220730/Nyiragongo_1659175463771.jpeg","hash":"5cbe0d8560850c17b4ffdb0ca8e91639dc32bfb0e2e13ea44530ab35c9e305a5","metadata":"{\"creator_url\":\"\"}"}
        ],
        max_fee: config.maxFee,
        actor: userA1.account,
        tpid: ""
      }
    })
    //console.log(`Result: `, result)
    expect(result.status).to.equal('OK')
    blockprevious = result.block_num;

    await timeout(2000)

    result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addnft',
      account: 'fio.address',
      data: {
        fio_address: userA1.address,
        nfts: [
          {"chain_code":"bsc","contract_address":"0xF5db804101d8600c26598A1Ba465166c33CdAA4b","token_id":"271637","url":"https://airnfts.s2.amazonaws.com/nft-images/20220730/Nyiragongo_1659175463771.jpeg","hash":"5cbe0d8560850c17b4ffdb0ca8e91639dc32bfb0e2e13ea44530ab35c9e305a5","metadata":"{\"creator_url\":\"\"}"}
        ],
        max_fee: config.maxFee,
        actor: userA1.account,
        tpid: ""
      }
    })
    //console.log(`Result: `, result)
    expect(result.status).to.equal('OK')

  
    blockprevious = result.block_num;

    await timeout(2000)


    result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'remnft',
      account: 'fio.address',
      data: {
        fio_address: userA1.address,
        nfts: [
          {"chain_code":"bsc","contract_address":"0xF5db804101d8600c26598A1Ba465166c33CdAA4b","token_id":"271637","url":"https://airnfts.s2.amazonaws.com/nft-images/20220730/Nyiragongo_1659175463771.jpeg","hash":"5cbe0d8560850c17b4ffdb0ca8e91639dc32bfb0e2e13ea44530ab35c9e305a5","metadata":"{\"creator_url\":\"\"}"}
        ],
        max_fee: config.maxFee,
        actor: userA1.account,
        tpid: ""
      }
    })
    //console.log(`Result: `, result)
    expect(result.status).to.equal('OK');

    await timeout(2000)

    rbblock = result.block_num;



  // now stop relic after the test.

  console.log(" to complete test stop fio.chronicle then verify rollback block ", rbblock);
  console.log(" to complete test stop fio.chronicle then verify previous pub address value  block ", blockprevious);
 
  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});



/*
this is a manual test that should be run after the chain and relic are loaded
for the deisred fork testing.
fio.chronicle must be stopped,
the rbblock number must be edited to the desired block to rollback to.
this test verifies that there are no items in the relic db with block number
greater than the rbblock, meaning the rollback occured successfully.
*/
//run this test after running regaddress load the chain test, then stopping chronicle, then performing rbfork for block reported from the test'
it.skip(`REQUIRES EDIT rbblock number, verify rollback to specified block`, async function () {
  try {
  
    //set the rbblock to the block used for rbfork before running this test.
    //EDIT this to be the block number.
    let rbblock = 1182;

    let qstr = 'SELECT rbfork('+ rbblock+')';
    let res = await client.query(qstr);
    console.log("verify rollback accounts table");
    expect(res.rowCount).to.equal(1);

    qstr = 'SELECT * FROM accounts WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback accounts table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM accountsaudit WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback accountsaudit table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM accountactivities WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback accountactivities table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM blocks WHERE pk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback blocks table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM pubaddresses WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback pubaddresses table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM domainactivities WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback domainactivities table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM domains WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback domains table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM domainsaudit WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback domainsaudit table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM handles WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback handles table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM handlesaudit WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback handlesaudit table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM handleactivities WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback handleactivities table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM pubaddresses WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback pubaddresses table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM pubaddressesaudit WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback pubaddressesaudit table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM pubaddressesaudit WHERE table_operation_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback of update block numbers pubaddressesaudit table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM traces WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback traces table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM transactions WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback transactions table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM tokentransfers WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback tokentransfers table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM nftsignatures WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback nftsignatures table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM fiodatas WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback fiodatas table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM fiodatasaudit WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback fiodatasaudit table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM fiorequests WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback fiorequests table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM fiorequestsaudit WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback fiorequestsaudit table");
    expect(res.rowCount).to.equal(0);

    qstr = 'SELECT * FROM tokenstakings WHERE fk_block_number > '+ rbblock;
    res = await client.query(qstr);
    console.log("verify rollback tokenstakings table");
    expect(res.rowCount).to.equal(0);
   
  } catch (err) {
    console.log(err);
    expect(err).to.equal(null);
  }
});  


})

