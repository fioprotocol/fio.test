
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




describe(`    A. Test rollback for regaddress, handles, accounts, pubaddresses tables `, () => {


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
it.skip(`regaddress rollback, load the chain, report block for rollback,  actor is owner, verify handles, domainactivities accountactivities contents`, async function () {
  try {
    let rbblock = 0;
    let blockpreviouspubaddress = 0;

    for (let numits = 0; numits < 10; numits++) {

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
      action: 'remaddress',
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
    if(numits == 4){
      blockpreviouspubaddress = result.block_num;
    }

    await timeout(2000)

    result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'addaddress',
      account: 'fio.address',
      data: {
        fio_address: userA1.address,
        public_addresses:[
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
          }
        ],
        max_fee: config.maxFee,
        tpid: '',
        actor: userA1.account
      }
    })
    expect(result.status).to.equal('OK')
    if(numits == 4){
       rbblock = result.block_num;
    }

    /*
    const result1 = await userA1.sdk.genericAction('pushTransaction', {
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
    expect(result1.status).to.equal('OK');
    */
    console.log("iter ", numits);


  }//end loop

  // now stop relic after the test.

  console.log(" to complete test stop fio.chronicle then verify rollback block ", rbblock);
  console.log(" to complete test stop fio.chronicle then verify previous pub address value  block ", blockpreviouspubaddress);
 
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
    let rbblock = 460;

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

