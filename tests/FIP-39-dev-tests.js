require('mocha')
const {expect} = require('chai')
const {newUser, callFioApi,fetchJson, timeout,createKeypair} = require('../utils.js');
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
 * in addition to these tests is is very important to dev test regaddress, xferaddress, and burnaddress
 * as these are affected
 *
 * for regaddress after the reg note an entry appears in the handleinfo table.
 * for transfer address note that the entry in the handleinfo is modified correctly to contain the new
 * public key.
 * for burnaddress verify that all entries in the handleinfo for this fioname id are removed from the table.
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

  it.skip('updcryptkey -- table check todo, use this', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'fio.addres',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == proxy1.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(inVotersTable).to.equal(false)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


  //begin updcryptkey success tests.
  //for these next three tests, during the 30 second wait, do a get table manually
  //and verify table contents manually.
  it(`fio.address updcryptkey`, async () => {
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
  it(`Waiting for 30 sec`, async () => {
    console.log("            waiting 30 seconds \n ");
  });

  it('Wait for 30', async () => {
    await timeout(30000);
  });


  it(`fio.address updcryptkey`, async () => {
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

  it('Wait for 30', async () => {
    await timeout(30000);
  });

  it(`fio.address updcryptkey`, async () => {
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

      

})
