require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, timeout, callFioApi, callFioApiSigned } = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

//these are development tests for used in the development of FIPs36-40.

describe(`************************** addaddress.js ************************** \n    A. Add 2 addresses, then add 3 addresses including the original 2`, () => {

    let userA1,userA2,userA3

    //this account is used to test the get account for pub key.
    it(`Test get_account_fio_public_key`, async () => {
        userA1 = await newUser(faucet);
        userA2 = await newUser(faucet);
        userA3 = await newUser(faucet);
        console.log(" User created -- \n");
        console.log("      account --  ", userA1.account);
        console.log("      public key -- ", userA1.publicKey);
        console.log("USe the account above in postman call   http://localhost:8889/v1/chain/get_account_fio_public_key \n ");
        console.log(" set the body to be \"account\": \"accountfromabove\" \n");
    })

    //wait a bit
    //wait for unlock 1
    it(`Waiting for 15 sec`, async () => {
        console.log("            waiting 15 seconds \n ");
    });

    it('Wait for 15', async () => {
        await timeout(15000);
    });


    it(`FIP-37 development test. add multiple keys`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'updateauth',
                account: 'eosio',
                actor: userA1.account,
                privKey: userA1.privateKey,
                data: {
                    "account": userA1.account,
                    "permission": "active",
                    "parent": "owner",
                    "auth": {
                        "threshold": 2,
                        "keys": [{
                            "key": userA2.publicKey,
                            "weight": 1
                        },{
                            "key": userA3.publicKey,
                            "weight": 1
                        }],
                        "waits": [],
                        "accounts": [
                        ]
                    },
                    "max_fee": config.maxFee
                }
            })
            console.log('Result: ', result)

            expect(result.processed.receipt.status).to.equal('executed');
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Show permissions of modified account, visually verify multiple keys`, async () => {
        try {
            const json = {
                "account_name": userA1.account
            }
            result = await callFioApi("get_account", json);
            console.log('Result.permissions: ', result.permissions[0].required_auth);
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })


})
