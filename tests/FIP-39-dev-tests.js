require('mocha')
const {expect} = require('chai')
const {newUser, callFioApi,fetchJson, createKeypair} = require('../utils.js');
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
 * these tests perform the testing described in BD-3552
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



  //updcryptkey(const string &fio_address, const string &encrypt_public_key, const int64_t &max_fee,
  //                    const name &actor,
  //                    const string &tpid) {

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

})
