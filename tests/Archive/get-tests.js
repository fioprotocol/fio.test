/**
 * Tests for FIO History node.
 *
 * You need both a TESTURL and a HISTORYURL for this test.
 * Enter the URL of the history node in: config.js > HISTORYURL
 */

require('mocha')
const {expect} = require('chai')
const {
  callFioHistoryApi, 
  callFioApi, 
  callFioApiSigned, 
  newUser, 
  existingUser, 
  generateFioDomain, 
  generateFioAddress, 
  createKeypair, 
  fetchJson,
  randStr
} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {getRamForUser} = require("../utils");
let faucet;

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

const endpoints = {
  get_fio_addresses: {
    parameters: [{
      name: 'fio_public_key',
      required: true
    },
    {
      name: 'fio_public_key',
      required: true
    }
  ]
  }
}

const testdata = [
  {
    parameter: 'account',
    testValues: ['', -1, '##invalidacct$']
  },  
  {
    parameter: 'fio_public_key',
    testValues: [
      {
        value: 'FIO67vV2RAMahTy3gqBfuFpctYmst9iz4TGLVjidejG9gcoW6JWb5', 
        error: 'asdfasdf'
      },
      {
        value: 'FIOXXXLGcmXLCw87pqNMFurd23SqqEDbCUirr7vwuwuzfaySxQ9w6', 
        error: 'asdfasdf'
      }
    ]
  },
]

describe('************************** get-tests.js ************************** \n A. Automated negative tests for FIO getters', () => {
  let user1, actionCount

  it(`Create users`, async () => {
    user1 = await newUser(faucet);

    console.log('user1 Account: ', user1.account)
    console.log('user1 Public: ', user1.publicKey)
    console.log('user1 Private: ', user1.privateKey)
  })



  it(`get_actions for user1`, async () => {
    let param, parameters;
    for (const endpoint in endpoints) {
      console.log(`${endpoint}: ${endpoints[endpoint]}`);
      parameters = endpoints[endpoint].parameters;

      parameters.forEach(item => {
        console.log(`element: ${JSON.stringify(item)}, name: ${item.name}`);
      });

      for (let i = 0; i < parameters.length; i++) {
        param = parameters[i];

        if (param) {
          console.log(`testdata: ${testdata.fio_public_key}`)
          console.log(`parameter: ${param.name}`);



          const element = testdata.filter(elem => (elem.parameter == param.name));
          paramTestData = element[0].testValues;

          for (let j = 0; j < paramTestData.length; j++) {
            
            console.log('values: ', paramTestData[j])

            input = `{ "${param.name}": "${paramTestData[j]}" }`
            console.log('input: ', input)
            const json = JSON.parse(input);
            
            const result = await callFioApi(endpoint, json);
            console.log('Result: ', result)
          }          
        }
      } 
    }
  })


  it.skip(`callfioapi`, async () => {
    try {
      const json = {
        limit: "string",
        offset: "string2"
      }
      actionList = await callFioApi("get_actions", json);
      expect(actionList.status).to.equal(null);
    } catch (err) {
      //console.log('Error', err.error.error);
      expect(err.error.error.what).to.equal(config.error.parseError);
      expect(err.error.code).to.equal(500);
    }
  })


})
