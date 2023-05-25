require('mocha')
const {expect} = require('chai')
const {newUser, callFioApi,fetchJson, callFioApiSigned,generateFioAddress,timeout,createKeypair} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
const config = require('../config.js');
let faucet;

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

/********************* setting up these tests
 *
 *no setup required
 *
 * these tests perform the dev testing described for FIP-39.
 *
 * QA note -- in addition to these tests is is very important to dev test regaddress, xferaddress, and burnaddress
 * as these are affected
 *
 * these tests perform the following dev testing
 *
 * regaddress after the registration, note an entry appears in the handleinfo table with the correct info.
 * transfer address,after transfer, note that the entry in the handleinfo is modified correctly to contain the new
 * public key.
 * burnaddress, perform the burn of an address, verify that all entries in the handleinfo for this fioname id are removed from the table.
 * 
 * 
 */




const UNSTAKELOCKDURATIONSECONDS = config.UNSTAKELOCKDURATIONSECONDS;
const SECONDSPERDAY = config.SECONDSPERDAY;
const INITIALROE = '0.500000000000000';


describe(`************************** FIP-39-dev-tests.js ************************** \n    A. Misc tests.`, () => {


  let userUpdateEncryptKey



  before(async () => {
    userUpdateEncryptKey = await newUser(faucet);

  })

  //begin updcryptkey success tests.
  //dev testing instructions,
  //run the updcryptkey1, updcryptkey2, updcryptkey3 sequence of tests
  //for these three tests, during the 30 second wait, do a get table manually at the prompt
  //and verify table contents match expected visually.
  //expected results, each get table should show the pub key value set in the test.
  it.skip(`fio.address updcryptkey1`, async () => {
    try {
      const result = await userUpdateEncryptKey.sdk.genericAction('pushTransaction', {
        action: 'updcryptkey',
        account: 'fio.address',
        data: {
          fio_address: userUpdateEncryptKey.address,
          encrypt_public_key: "FIO768m3RPvGbgTpnqxKy8jWPkxCKArwChTDnAiPVMxsQP2UPgW2P",
          max_fee : config.maxFee,
          actor: userUpdateEncryptKey.account,
          tpid: ''
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  //wait a bit
  it.skip(`Waiting for 30 sec`, async () => {
    console.log("            waiting 30 seconds \n ");
  });

  it.skip('Wait for 30', async () => {
    await timeout(30000);
  });


  it.skip(`fio.address updcryptkey2`, async () => {
    try {
      const result = await userUpdateEncryptKey.sdk.genericAction('pushTransaction', {
        action: 'updcryptkey',
        account: 'fio.address',
        data: {
          fio_address: userUpdateEncryptKey.address,
          encrypt_public_key: "FIO6oQ4mkezh9krzMJaGiwaZCHp3UsBHphEFhMBATS7VT4v9aGeLM",
          max_fee : config.maxFee,
          actor: userUpdateEncryptKey.account,
          tpid: ''
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  //wait a bit
  it(`Waiting for 30 sec`, async () => {
    console.log("            waiting 30 seconds \n ");
  });

  it.skip('Wait for 30', async () => {
    await timeout(30000);
  });

  it.skip(`fio.address updcryptkey3`, async () => {
    try {
      const result = await userUpdateEncryptKey.sdk.genericAction('pushTransaction', {
        action: 'updcryptkey',
        account: 'fio.address',
        data: {
          fio_address: userUpdateEncryptKey.address,
          encrypt_public_key: "FIO5fLPj977LQhbBd2qwuHz6c4io9zTt78bnVNrcCwZLsn3AzJwWv",
          max_fee : config.maxFee,
          actor: userUpdateEncryptKey.account,
          tpid: ''
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })
  //end updcryptkey success tests.

  //next we will test regaddress, xferaddress, and burnaddress
      /*
  * for regaddress after the reg note an entry appears in the handleinfo table.
  * for transfer address note that the entry in the handleinfo is modified correctly to contain the new
  * public key.
  * for burnaddress verify that all entries in the handleinfo for this fioname id are removed from the table.
  *
  * */

  let walletA1, walletA1FioNames,handleid, fionames, fioaddress, walletA1OrigBalance, walletA1OrigRam, walletA2, walletA2FioNames, walletA2OrigRam, transfer_fio_address_fee, origAddressExpire, feeCollected

  it(`Create users`, async () => {
    walletA1 = await newUser(faucet);
    walletA1.address2 = generateFioAddress(walletA1.domain, 5)

    walletA2 = await newUser(faucet);
    console.log("walletA2 pub key ",walletA2.publicKey);
  })


  //register an address
  it(`Register walletA1.address2`, async () => {
    const result = await walletA1.sdk.genericAction('registerFioAddress', {
      fioAddress: walletA1.address2,
      maxFee: config.api.register_fio_address.fee,
      technologyProviderId: ''
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  //get the index from fionames.
  it('Call get_table_rows on fionames, note entry', async () => {
    let bundleCount
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.address',      // Contract that we target
        scope: 'fio.address',         // Account that owns the data
        table: 'fionames',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      fionames = await callFioApi("get_table_rows", json);
      //console.log('fionames: ', fionames);
      for (fioname in fionames.rows) {
        if (fionames.rows[fioname].name == walletA1.address2) {
          console.log('id is : ', fionames.rows[fioname].id);
          handleid = fionames.rows[fioname].id;
        }
      }

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


  //find the entry in the handleinfo table
  it('Call get_table_rows on handleinfo, note entry', async () => {
    let bundleCount
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.address',      // Contract that we target
        scope: 'fio.address',         // Account that owns the data
        table: 'handleinfo',
        index_position: 2,
        key_type: 'i64',
        lower_bound: handleid,// Table name
        upper_bound: handleid,
        limit: 1,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      fionames = await callFioApi("get_table_rows", json);
      console.log('reply: ', fionames);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


  //transfer the address/handle
  it(`Transfer walletA1.address2 to walletA2`, async () => {
    try {
      fioaddress = walletA1.address2;
      console.log(" address to burn is ", fioaddress);
      const result = await walletA1.sdk.genericAction('transferFioAddress', {
        fioAddress: walletA1.address2,
        newOwnerKey: walletA2.publicKey,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      //feeCollected = result.fee_collected;
      console.log('Result: ', result);
     // expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err.json.error);
      expect(err).to.equal(null);
    }
  })

  //note the new id that has the address
  it('Call get_table_rows post transfer on fionames, note entry', async () => {
    let bundleCount
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.address',      // Contract that we target
        scope: 'fio.address',         // Account that owns the data
        table: 'fionames',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      fionames = await callFioApi("get_table_rows", json);
      //console.log('fionames: ', fionames);
      for (fioname in fionames.rows) {
        if (fionames.rows[fioname].name == walletA1.address2) {
          console.log('id is : ', fionames.rows[fioname].id);
          handleid = fionames.rows[fioname].id;
        }
      }

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Call get_table_rows on handleinfo, note entry', async () => {
    let bundleCount
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.address',      // Contract that we target
        scope: 'fio.address',         // Account that owns the data
        table: 'handleinfo',
        index_position: 2,
        key_type: 'i64',
        lower_bound: handleid,// Table name
        upper_bound: handleid,
        limit: 1,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      fionames = await callFioApi("get_table_rows", json);
      console.log('reply: ', fionames);
      //note the pub key is the same as in the output earlier in the tests.

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })



  it(`Burn the address. Expect status = 'OK'. Expect fee_collected = 0`, async () => {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'burnaddress',
        account: 'fio.address',
        actor: walletA2.account,
        privKey: walletA2.privateKey,
        data: {
          "fio_address": fioaddress,
          "max_fee": config.api.burn_fio_address.fee,
          "tpid": '',
          "actor": walletA2.account
        }
      })
      //console.log('Result: ', JSON.parse(result.processed.action_traces[0].receipt.response));
      expect(JSON.parse(result.processed.action_traces[0].receipt.response).status).to.equal('OK');
      expect(JSON.parse(result.processed.action_traces[0].receipt.response).fee_collected).to.equal(0);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`getFioNames for walletA1 and confirm it now only owns 1 address`, async () => {
    try {
      walletA1FioNames = await walletA2.sdk.genericAction('getFioNames', {
        fioPublicKey: walletA2.publicKey
      })
      //console.log('getFioNames', result)
      expect(walletA1FioNames.fio_addresses.length).to.equal(1)
      expect(walletA1FioNames.fio_domains[0].fio_domain).to.equal(walletA2.domain)
      expect(walletA1FioNames.fio_addresses[0].fio_address).to.equal(walletA2.address)
    } catch (err) {
      console.log('Error:', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call get_table_rows from fionames. Verify address not in table.`, async () => {
    let inTable = false;
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.address',      // Contract that we target
        scope: 'fio.address',         // Account that owns the data
        table: 'fionames',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      fionames = await callFioApi("get_table_rows", json);
      //console.log('fionames: ', fionames);
      for (fioname in fionames.rows) {
        if (fionames.rows[fioname].name == fioaddress) {
          //console.log('fioname: ', fionames.rows[fioname]);
          inTable = true;
        }
      }
      expect(inTable).to.equal(false);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //now look for the address in the handleinfo, it should no longer be there.

  it('Call get_table_rows on handleinfo, note entry', async () => {
    let bundleCount
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.address',      // Contract that we target
        scope: 'fio.address',         // Account that owns the data
        table: 'handleinfo',
        index_position: 2,
        key_type: 'i64',
        lower_bound: handleid,// Table name
        upper_bound: handleid,
        limit: 1,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      fionames = await callFioApi("get_table_rows", json);
      console.log('reply: ', fionames);
      //it shouldnt be there. look and verify that.

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })






})
