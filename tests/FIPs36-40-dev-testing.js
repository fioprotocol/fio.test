require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, timeout, callFioApi} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

//these are development tests for used in the development of FIPs36-40.

describe(`************************** addaddress.js ************************** \n    A. Add 2 addresses, then add 3 addresses including the original 2`, () => {

    let userA1

    //this account is used to test the get account for pub key.
    it(`Create users`, async () => {
        userA1 = await newUser(faucet);
        console.log(" User created -- \n");
        console.log("      account --  ", userA1.account);
        console.log("      public key -- ", userA1.publicKey);
        console.log("USe the account above in postman call   http://localhost:8889/v1/chain/get_account_fio_public_key \n ");
        console.log(" set the body to be \"account\": \"accountfromabove\" \n");
    })


})
