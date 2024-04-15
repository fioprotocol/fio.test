
/*
 MANUAL CONFIGURATION REQUIRED TO RUN to run these TESTS

 add the following changes to fio.address.cpp

//TESTINGONLY DO NOT DELIVER
        [[eosio::action]]
        void
        fmtepochtm(const int64_t &epochtmseconds) {



            struct tm timeinfo;
            fioio::convertfiotime(epochtmseconds, &timeinfo);
            std::string timebuffer = fioio::tmstringformat(timeinfo);

            const string response_string = string("{\"status\": \"OK\",\"timeresult\":\"") +
                                           timebuffer + string("\"")  + string("}");

            send_response(response_string.c_str());
        }
        //TESTINGONLY DO NOT DELIVER


to the serialization EOSIO_DISPATCH at the bottom add
//TESTING ONLY DO NOT DELIVER
            (fmtepochtm)
            //TESTING ONLY DO NOT deliver

to fio.address.abi structs add

         ,{
           "name": "fmtepochtm",
           "base": "",
           "fields": [
             {
               "name": "epochtmseconds",
               "type": "int64"
             }
           ]
         }

         to actions struct add

         ,{
           "name": "fmtepochtm",
           "type": "fmtepochtm",
           "ricardian_contract": ""
         }

to fio.devtools 12_add_acitons.js add
#fmtepochtm is for testing only DO NOT DELIVER!!!!!
./clio -u http://$host push action eosio addaction '{"action":"fmtepochtm","contract":"fio.address","actor":"eosio"}' --permission eosio

rebuild the contracts and restart the chain, you may now run these formatting tests.

*/

require('mocha');
const {expect} = require('chai');
const {newUser, existingUser, fetchJson, createKeypair,getAccountFromKey,callFioApi, timeout} = require('../utils.js');
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
let faucet;

before(async function () {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
  });


describe(`************************** BD-4612-epoc-formatting-tests.js ************************** \n    A. TESTING`, function () {
    let userA1;

    //create the users for the testing
    it(`Create Users`, async function () {
        //userA2 used to transfer funds
        userA1 = await newUser(faucet);
    });


    it(`testing. `, async () => {
        try {
            const result = await userA1.sdk.genericAction('pushTransaction', {
                action: 'fmtepochtm',
                account: 'fio.address',
                data: {
                    epochtmseconds: '1713204629'
                }
            })
            console.log('Result: ', result)
            expect(result.timeresult).to.equal('2024-04-15T18:10:29')
        } catch (err) {
            console.log('Error: ', err)
        }
    })


    it(`testing. `, async () => {

            const result = await userA1.sdk.genericAction('pushTransaction', {
                action: 'fmtepochtm',
                account: 'fio.address',
                data: {
                    epochtmseconds: '1708017860'
                }
            })
            console.log('Result: ', result)
            expect(result.timeresult).to.equal('2024-02-15T17:24:20')
    })

});


