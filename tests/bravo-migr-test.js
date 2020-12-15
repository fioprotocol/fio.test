/*****
 This test loads up the chain with 1000 Requests and 10000 OBTs and then:
 - Calls migrtx 
 - After the first call, tests that new requests and OBTs are being added to both tables. 
 - Repeatedly calls migrtrx to complete migration.
 - Confirms migration and status updates are complete.
 *****/

require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, existingUser, callFioApiSigned, callFioApi, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

/*
  #bp1:dapix
  #Private key: 5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R
  #Public key: FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr
  #FIO Public Address (actor name): qbxn5zhw2ypw

  #bp2:dapix
  #Private key: 5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P
  #Public key: FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b
  #FIO Public Address (actor name): hfdg2qumuvlc

  #bp3:dapix
  #Private key: 5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU
  #Public key: FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc
  #FIO Public Address (actor name): wttywsmdmfew
*/

let bp1, bp2, bp3;
let amount = 5;

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);

  // Create sdk objects for the orinigal localhost BPs
  bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
  bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
  bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');

})

describe(`************************** bravo-migr-test.js.js ************************** \n Load Requests and OBTs`, () => {
    let user1, user2, user3;
    let payment = 3000000000;
    let requestMemo = 'asdf';
    let count = 5;

    it(`Create users`, async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
        user3 = await newUser(faucet);

        //console.log('user1: ' + user1.account + ', ' + user1.privateKey + ', ' + user1.publicKey)
        //console.log('user2: ' + user2.account + ', ' + user2.privateKey + ', ' + user2.publicKey)
        //console.log('user3: ' + user3.account + ', ' + user3.privateKey + ', ' + user3.publicKey)
    })

    it(`${count}x - user1 requests funds from user2`, async () => {
        for (i = 0; i < count; i++) {
          try {
            const result = await user1.sdk.genericAction('requestFunds', {
              payerFioAddress: user2.address,
              payeeFioAddress: user1.address,
              payeeTokenPublicAddress: user1.address,
              amount: payment,
              chainCode: 'FIO',
              tokenCode: 'FIO',
              memo: requestMemo,
              maxFee: config.api.new_funds_request.fee,
              payerFioPublicKey: user2.publicKey,
              technologyProviderId: '',
              hash: 'fmwazjvmenfz',  // This is the hash of off-chain data... ?
              offlineUrl: ''
            })
            //console.log('Result: ', result)
            expect(result.status).to.equal('requested')
          } catch (err) {
            console.log('Error', err.json)
            expect(err).to.equal(null)
          }
        }
    })

    it(`${count}x - user2 requests funds from user1`, async () => {
        for (i = 0; i < count; i++) {
          try {
            const result = await user2.sdk.genericAction('requestFunds', {
              payerFioAddress: user1.address,
              payeeFioAddress: user2.address,
              payeeTokenPublicAddress: user2.address,
              amount: payment,
              chainCode: 'FIO',
              tokenCode: 'FIO',
              memo: requestMemo,
              maxFee: config.api.new_funds_request.fee,
              payerFioPublicKey: user1.publicKey,
              technologyProviderId: '',
              hash: 'fmwazjvmenfz',  // This is the hash of off-chain data... ?
              offlineUrl: ''
            })
            //console.log('Result: ', result)
            expect(result.status).to.equal('requested')
          } catch (err) {
            console.log('Error', err.json)
            expect(err).to.equal(null)
          }
        }
    })

    it(`${count}x - user3 requests funds from user2, user2 rejects request`, async () => {
        let requestId;
        for (i = 0; i < count; i++) {
            try {
                const result = await user3.sdk.genericAction('requestFunds', {
                    payerFioAddress: user2.address,
                    payeeFioAddress: user3.address,
                    payeeTokenPublicAddress: user3.address,
                    amount: payment,
                    chainCode: 'FIO',
                    tokenCode: 'FIO',
                    memo: requestMemo,
                    maxFee: config.api.new_funds_request.fee,
                    payerFioPublicKey: user2.publicKey,
                    technologyProviderId: '',
                    hash: 'fmwazjvmenfz',  // This is the hash of off-chain data... ?
                    offlineUrl: ''
                })
                //console.log('Result: ', result)
                requestId = result.fio_request_id;
                expect(result.status).to.equal('requested')
            } catch (err) {
                console.log('Error', err.json)
                expect(err).to.equal(null)
            }

            try {
                const result = await user2.sdk.genericAction('pushTransaction', {
                    action: 'rejectfndreq',
                    account: 'fio.reqobt',
                    data: {
                        fio_request_id: requestId,
                        max_fee: config.api.cancel_funds_request.fee,
                        tpid: '',
                        actor: user2.account
                    }
                })
                //console.log('Result:', result)
                expect(result.status).to.equal('request_rejected') 
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        }
    })

    it(`${count}x - user2 requests funds from user1, user 1 records OBT response`, async () => {
        let requestId;
        for (i = 0; i < count; i++) {
            try {
                const result = await user2.sdk.genericAction('requestFunds', {
                    payerFioAddress: user1.address,
                    payeeFioAddress: user2.address,
                    payeeTokenPublicAddress: user2.address,
                    amount: payment,
                    chainCode: 'FIO',
                    tokenCode: 'FIO',
                    memo: requestMemo,
                    maxFee: config.api.new_funds_request.fee,
                    payerFioPublicKey: user1.publicKey,
                    technologyProviderId: '',
                    hash: 'fmwazjvmenfz',  // This is the hash of off-chain data... ?
                    offlineUrl: ''
                })
                //console.log('Result: ', result)
                requestId = result.fio_request_id;
                expect(result.status).to.equal('requested')
            } catch (err) {
                console.log('Error', err.json)
                expect(err).to.equal(null)
            }

          try {
                const result = await user1.sdk.genericAction('recordObtData', {
                    payerFioAddress: user1.address,
                    payeeFioAddress: user2.address,
                    payerTokenPublicAddress: user1.publicKey,
                    payeeTokenPublicAddress: user2.publicKey,
                    amount: payment,
                    chainCode: "FIO",
                    tokenCode: "FIO",
                    status: '',
                    obtId: requestId,
                    maxFee: config.api.record_obt_data.fee,
                    technologyProviderId: '',
                    payeeFioPublicKey: user2.publicKey,
                    memo: 'this is a test',
                    hash: '',
                    offLineUrl: ''
                })
                //console.log('Result: ', result)
                expect(result.status).to.equal('sent_to_blockchain')
            } catch (err) {
                console.log('Error', err.json)
                expect(err).to.equal(null)
            }
        }
    })

    it(`${count}x user3 creates BTC OBT send record to user1`, async () => {
        for (i = 0; i < count; i++) {
            try {
                const result = await user3.sdk.genericAction('recordObtData', {
                    payerFioAddress: user3.address,
                    payeeFioAddress: user1.address,
                    payerTokenPublicAddress: user3.publicKey,
                    payeeTokenPublicAddress: user1.publicKey,
                    amount: payment,
                    chainCode: "BTC",
                    tokenCode: "BTC",
                    status: '',
                    obtId: '',
                    maxFee: config.api.record_obt_data.fee,
                    technologyProviderId: '',
                    payeeFioPublicKey: user1.publicKey,
                    memo: 'this is a test',
                    hash: '',
                    offLineUrl: ''
                })
                //console.log('Result: ', result)
                expect(result.status).to.equal('sent_to_blockchain')
            } catch (err) {
                console.log('Error', err.json)
                expect(err).to.equal(null)
            }
        }
    })
})

describe(`Perform single migrtrx to initialize migration`, () => {
    it(`Call single migrtrx (bp1) and confirm you can still do Requests and OBTs`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'migrtrx',
                account: 'fio.reqobt',
                actor: bp1.account,
                privKey: bp1.privateKey,
                data: {
                    amount: 1,
                    actor: bp1.account
                }
            })
            //console.log('Result: ', result)
            expect(result.transaction_id).to.exist
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it.skip('Call get_table_rows from fiotrxts (NEW table) and display', async () => {
      try {
        const json = {
          json: true,               // Get the response as json
          code: 'fio.reqobt',      // Contract that we target
          scope: 'fio.reqobt',         // Account that owns the data
          table: 'fiotrxts',        // Table name
          limit: 1000,                // Maximum number of rows that we want to get
          reverse: false,           // Optional: Get reversed data
          show_payer: false          // Optional: Show ram payer
        }
        requests = await callFioApi("get_table_rows", json);
        console.log('requests: ', requests); 
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    })
})

describe.skip(`Confirm the number of records in old tables aligns with `, () => {
  let obtCount = 0

  it('Get the number of OBT records in recordobts', async () => {
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.reqobt',      // Contract that we target
        scope: 'fio.reqobt',         // Account that owns the data
        table: 'recordobts',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      obts = await callFioApi("get_table_rows", json);
      obtCount = obts.length;
      console.log('obts: ', obts);
      console.log('Number of records in recordobts: ', obts.length);
      for (request in obts.rows) {
        if (obts.rows[request].payer_fio_addr == user3.address) {
          console.log('payer_fio_addr: ', obts.rows[request].payer_fio_addr); 
          break;
        }
      }
      expect(obts.rows[request].payer_fio_addr).to.equal(user3.address);  
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })
})

describe(`Initial OBT record. Confirm new OBT Sends are going into both tables`, () => {
  let user1, user2, user3
  let payment = 3000000000;

  it(`Create users`, async () => {
      user1 = await newUser(faucet);
      user2 = await newUser(faucet);
      user3 = await newUser(faucet);

      //console.log('user1: ' + user1.account + ', ' + user1.privateKey + ', ' + user1.publicKey)
      //console.log('user2: ' + user2.account + ', ' + user2.privateKey + ', ' + user2.publicKey)
      //console.log('user3: ' + user3.account + ', ' + user3.privateKey + ', ' + user3.publicKey)
  })


  it(`user3 creates BTC OBT send record to user1`, async () => {
    try {
        const result = await user3.sdk.genericAction('recordObtData', {
            payerFioAddress: user3.address,
            payeeFioAddress: user1.address,
            payerTokenPublicAddress: user3.publicKey,
            payeeTokenPublicAddress: user1.publicKey,
            amount: payment,
            chainCode: "BTC",
            tokenCode: "BTC",
            status: '',
            obtId: '',
            maxFee: config.api.record_obt_data.fee,
            technologyProviderId: '',
            payeeFioPublicKey: user1.publicKey,
            memo: 'this is a test',
            hash: '',
            offLineUrl: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('sent_to_blockchain')
    } catch (err) {
        console.log('Error', err.json)
        expect(err).to.equal(null)
    }
  })

  it('Call get_table_rows from recordobts (old table) and confirm OBT is in table', async () => {
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.reqobt',      // Contract that we target
        scope: 'fio.reqobt',         // Account that owns the data
        table: 'recordobts',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      obts = await callFioApi("get_table_rows", json);
      //console.log('obts: ', obts);
      for (request in obts.rows) {
        if (obts.rows[request].payer_fio_addr == user3.address) {
          //console.log('payer_fio_addr: ', obts.rows[request].payer_fio_addr); 
          break;
        }
      }
      expect(obts.rows[request].payer_fio_addr).to.equal(user3.address);  
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Call get_table_rows from fiotrxts (NEW table) and confirm request is in table', async () => {
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.reqobt',      // Contract that we target
        scope: 'fio.reqobt',         // Account that owns the data
        table: 'fiotrxts',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      requests = await callFioApi("get_table_rows", json);
      //console.log('requests: ', requests);
      for (request in requests.rows) {
        if (requests.rows[request].payer_fio_addr == user3.address) {
          //console.log('payer_fio_addr: ', requests.rows[request].payer_fio_addr); 
          break;
        }
      }
      expect(requests.rows[request].payer_fio_addr).to.equal(user3.address);  
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})

describe(`Initial FIO Request record. Confirm NEW Requests are going into both tables`, () => {
  let user1, user2, user3, requestId, obtId
  let payment = 3000000000;
  let requestMemo = 'asdf';

  it(`Create users`, async () => {
      user1 = await newUser(faucet);
      user2 = await newUser(faucet);
      user3 = await newUser(faucet);

      //console.log('user1: ' + user1.account + ', ' + user1.privateKey + ', ' + user1.publicKey)
      //console.log('user2: ' + user2.account + ', ' + user2.privateKey + ', ' + user2.publicKey)
      //console.log('user3: ' + user3.account + ', ' + user3.privateKey + ', ' + user3.publicKey)
  })

  it(`user1 requests funds from user2`, async () => {
    try {
        const result = await user1.sdk.genericAction('requestFunds', {
            payerFioAddress: user2.address,
            payeeFioAddress: user1.address,
            payeeTokenPublicAddress: user1.address,
            amount: payment,
            chainCode: 'FIO',
            tokenCode: 'FIO',
            memo: requestMemo,
            maxFee: config.api.new_funds_request.fee,
            payerFioPublicKey: user2.publicKey,
            technologyProviderId: '',
            hash: 'fmwazjvmenfz',  // This is the hash of off-chain data... ?
            offlineUrl: ''
        })
        //console.log('Result: ', result)
        requestId = result.fio_request_id;
        expect(result.status).to.equal('requested')
    } catch (err) {
        console.log('Error', err.json)
        expect(err).to.equal(null)
    }
  })

  it('Requests: Call get_table_rows from fioreqctxts (old table) and confirm request is in table', async () => {
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.reqobt',      // Contract that we target
        scope: 'fio.reqobt',         // Account that owns the data
        table: 'fioreqctxts',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      requests = await callFioApi("get_table_rows", json);
      //console.log('requests: ', requests);
      for (request in requests.rows) {
        if (requests.rows[request].fio_request_id == requestId) {
          //console.log('payer_fio_addr: ', requests.rows[request].payer_fio_addr); 
          break;
        }
      }
      expect(requests.rows[request].payer_fio_addr).to.equal(user2.address);  
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Call get_table_rows from fiotrxts (NEW table) and confirm request is in table', async () => {
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.reqobt',      // Contract that we target
        scope: 'fio.reqobt',         // Account that owns the data
        table: 'fiotrxts',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      requests = await callFioApi("get_table_rows", json);
      //console.log('requests: ', requests);
      for (request in requests.rows) {
        if (requests.rows[request].fio_request_id == requestId) {
          //console.log('payer_fio_addr: ', requests.rows[request].payer_fio_addr); 
          break;
        }
      }
      expect(requests.rows[request].payer_fio_addr).to.equal(user2.address);  
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})

describe.skip(`Confirm REJECTED Requests are going into both tables`, () => {
    let user1, user2, user3, requestId
    let payment = 3000000000;
    let requestMemo = 'asdf';

    it(`Create users`, async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
        user3 = await newUser(faucet);
    })


    it(`user3 requests funds from user2, user2 rejects request`, async () => {
        let requestId;
        for (i = 0; i < count; i++) {
            try {
                const result = await user3.sdk.genericAction('requestFunds', {
                    payerFioAddress: user2.address,
                    payeeFioAddress: user3.address,
                    payeeTokenPublicAddress: user3.address,
                    amount: payment,
                    chainCode: 'FIO',
                    tokenCode: 'FIO',
                    memo: requestMemo,
                    maxFee: config.api.new_funds_request.fee,
                    payerFioPublicKey: user2.publicKey,
                    technologyProviderId: '',
                    hash: 'fmwazjvmenfz',  // This is the hash of off-chain data... ?
                    offlineUrl: ''
                })
                //console.log('Result: ', result)
                requestId = result.fio_request_id;
                expect(result.status).to.equal('requested')
            } catch (err) {
                console.log('Error', err.json)
                expect(err).to.equal(null)
            }

            try {
                const result = await user2.sdk.genericAction('pushTransaction', {
                    action: 'rejectfndreq',
                    account: 'fio.reqobt',
                    data: {
                        fio_request_id: requestId,
                        max_fee: config.api.cancel_funds_request.fee,
                        tpid: '',
                        actor: user2.account
                    }
                })
                //console.log('Result:', result)
                expect(result.status).to.equal('request_rejected') 
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        }
    })

        it('Requests: Call get_table_rows from fioreqctxts (old table) and confirm request is in table', async () => {
        try {
            const json = {
            json: true,               // Get the response as json
            code: 'fio.reqobt',      // Contract that we target
            scope: 'fio.reqobt',         // Account that owns the data
            table: 'fioreqctxts',        // Table name
            limit: 1000,                // Maximum number of rows that we want to get
            reverse: false,           // Optional: Get reversed data
            show_payer: false          // Optional: Show ram payer
            }
            requests = await callFioApi("get_table_rows", json);
            console.log('requests: ', requests);
            for (request in requests.rows) {
            if (requests.rows[request].fio_request_id == requestId) {
                console.log('payer_fio_addr: ', requests.rows[request].payer_fio_addr); 
                break;
            }
            }
            expect(requests.rows[request].payer_fio_addr).to.equal(user2.address);  
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
        })

        it('Call get_table_rows from fiotrxts (NEW table) and confirm request is in table', async () => {
        try {
            const json = {
            json: true,               // Get the response as json
            code: 'fio.reqobt',      // Contract that we target
            scope: 'fio.reqobt',         // Account that owns the data
            table: 'fiotrxts',        // Table name
            limit: 1000,                // Maximum number of rows that we want to get
            reverse: false,           // Optional: Get reversed data
            show_payer: false          // Optional: Show ram payer
            }
            requests = await callFioApi("get_table_rows", json);
            console.log('requests: ', requests);
            for (request in requests.rows) {
            if (requests.rows[request].fio_request_id == requestId) {
                console.log('payer_fio_addr: ', requests.rows[request].payer_fio_addr); 
                break;
            }
            }
            expect(requests.rows[request].payer_fio_addr).to.equal(user2.address);  
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
        })

})

describe.skip(`Confirm paid OBT response Requests are going into both tables`, () => {
    let user1, user2, user3, requestId
    let payment = 3000000000;
    let requestMemo = 'asdf';

    it(`Create users`, async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
        user3 = await newUser(faucet);

        console.log('user1: ' + user1.account + ', ' + user1.privateKey + ', ' + user1.publicKey)
        console.log('user2: ' + user2.account + ', ' + user2.privateKey + ', ' + user2.publicKey)
        console.log('user3: ' + user3.account + ', ' + user3.privateKey + ', ' + user3.publicKey)
    })


    it(`user2 requests funds from user1, user 1 records OBT response`, async () => {
        let requestId;
            try {
                const result = await user2.sdk.genericAction('requestFunds', {
                    payerFioAddress: user1.address,
                    payeeFioAddress: user2.address,
                    payeeTokenPublicAddress: user2.address,
                    amount: payment,
                    chainCode: 'FIO',
                    tokenCode: 'FIO',
                    memo: requestMemo,
                    maxFee: config.api.new_funds_request.fee,
                    payerFioPublicKey: user1.publicKey,
                    technologyProviderId: '',
                    hash: 'fmwazjvmenfz',  // This is the hash of off-chain data... ?
                    offlineUrl: ''
                })
                //console.log('Result: ', result)
                requestId = result.fio_request_id;
                expect(result.status).to.equal('requested')
            } catch (err) {
                console.log('Error', err.json)
                expect(err).to.equal(null)
            }

          try {
                const result = await user1.sdk.genericAction('recordObtData', {
                    payerFioAddress: user1.address,
                    payeeFioAddress: user2.address,
                    payerTokenPublicAddress: user1.publicKey,
                    payeeTokenPublicAddress: user2.publicKey,
                    amount: payment,
                    chainCode: "FIO",
                    tokenCode: "FIO",
                    status: '',
                    obtId: requestId,
                    maxFee: config.api.record_obt_data.fee,
                    technologyProviderId: '',
                    payeeFioPublicKey: user2.publicKey,
                    memo: 'this is a test',
                    hash: '',
                    offLineUrl: ''
                })
                //console.log('Result: ', result)
                expect(result.status).to.equal('sent_to_blockchain')
            } catch (err) {
                console.log('Error', err.json)
                expect(err).to.equal(null)
            }
    })

    it('Call get_table_rows from recordobts (old table) and confirm OBT is in table', async () => {
        try {
          const json = {
            json: true,               // Get the response as json
            code: 'fio.reqobt',      // Contract that we target
            scope: 'fio.reqobt',         // Account that owns the data
            table: 'recordobts',        // Table name
            limit: 1000,                // Maximum number of rows that we want to get
            reverse: false,           // Optional: Get reversed data
            show_payer: false          // Optional: Show ram payer
          }
          obts = await callFioApi("get_table_rows", json);
          console.log('obts: ', obts);
          for (request in obts.rows) {
            if (obts.rows[request].id == user1.address) {
              console.log('payer_fio_addr: ', obts.rows[request].requestId); 
              break;
            }
          }
          expect(obts.rows[request].payer_fio_addr).to.equal(user1.address);  
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      })

      it.skip('Requests: Call get_table_rows from fioreqctxts (old table) and confirm request is in table', async () => {
        try {
          const json = {
            json: true,               // Get the response as json
            code: 'fio.reqobt',      // Contract that we target
            scope: 'fio.reqobt',         // Account that owns the data
            table: 'fioreqctxts',        // Table name
            limit: 1000,                // Maximum number of rows that we want to get
            reverse: false,           // Optional: Get reversed data
            show_payer: false          // Optional: Show ram payer
          }
          requests = await callFioApi("get_table_rows", json);
          console.log('requests: ', requests);
          for (request in requests.rows) {
            if (requests.rows[request].fio_request_id == requestId) {
              console.log('payer_fio_addr: ', requests.rows[request].payer_fio_addr); 
              break;
            }
          }
          expect(requests.rows[request].payer_fio_addr).to.equal(user2.address);  
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      })

      it('Call get_table_rows from fiotrxts (NEW table) and confirm request is in table', async () => {
        try {
          const json = {
            json: true,               // Get the response as json
            code: 'fio.reqobt',      // Contract that we target
            scope: 'fio.reqobt',         // Account that owns the data
            table: 'fiotrxts',        // Table name
            limit: 1000,                // Maximum number of rows that we want to get
            reverse: false,           // Optional: Get reversed data
            show_payer: false          // Optional: Show ram payer
          }
          requests = await callFioApi("get_table_rows", json);
          console.log('requests: ', requests);
          for (request in requests.rows) {
            if (requests.rows[request].fio_request_id == requestId) {
              console.log('payer_fio_addr: ', requests.rows[request].payer_fio_addr); 
              break;
            }
          }
          expect(requests.rows[request].payer_fio_addr).to.equal(user2.address);  
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      })

})

describe(`Migrate remaining requests and OBTs`, () => {
  let isFinished = 0

  it('Echo initial migrledgers table', async () => {
    try {
      const json = {
        json: true,
        code: 'fio.reqobt', 
        scope: 'fio.reqobt', 
        table: 'migrledgers', 
        limit: 10,               
        reverse: false,         
        show_payer: false  
      }
      ledger = await callFioApi("get_table_rows", json);
      console.log('migrledgers: ', ledger);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Call migrtrx (bp1) with amount = 5 until migrledgers isFinished = 1`, async () => {
    while (!isFinished) {
      try {
          const result = await callFioApiSigned('push_transaction', {
              action: 'migrtrx',
              account: 'fio.reqobt',
              actor: bp1.account,
              privKey: bp1.privateKey,
              data: {
                  amount: 5,
                  actor: bp1.account
              }
          })
          //console.log('Result: ', result)
          expect(result.transaction_id).to.exist
      } catch (err) {
          console.log('Error: ', err)
          expect(err).to.equal(null)
      }
      await timeout(2000);
      try {
        const json = {
          json: true,
          code: 'fio.reqobt', 
          scope: 'fio.reqobt', 
          table: 'migrledgers', 
          limit: 10,               
          reverse: false,         
          show_payer: false  
        }
        ledger = await callFioApi("get_table_rows", json);
        isFinished = ledger.rows[0].isFinished
        //console.log('isFinished: ', isFinished);
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    }
  })

  it('Echo final migrledgers table', async () => {
    try {
      const json = {
        json: true,
        code: 'fio.reqobt', 
        scope: 'fio.reqobt', 
        table: 'migrledgers', 
        limit: 10,               
        reverse: false,         
        show_payer: false  
      }
      ledger = await callFioApi("get_table_rows", json);
      console.log('migrledgers: ', ledger);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})

describe.skip(`Go through recordobts (old table) and confirm each entry is in fiotrxts (NEW table)`, () => {
  let obtCount = 0

  it('Get the number of OBT records in recordobts', async () => {
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.reqobt',      // Contract that we target
        scope: 'fio.reqobt',         // Account that owns the data
        table: 'recordobts',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      obts = await callFioApi("get_table_rows", json);
      obtCount = obts.length;
      console.log('obts: ', obts);
      console.log('Number of records in recordobts: ', obts.length);
      for (request in obts.rows) {
        if (obts.rows[request].payer_fio_addr == user3.address) {
          console.log('payer_fio_addr: ', obts.rows[request].payer_fio_addr); 
          break;
        }
      }
      expect(obts.rows[request].payer_fio_addr).to.equal(user3.address);  
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Call get_table_rows from recordobts (old table) and confirm every entry OBT is in table', async () => {
    let count = 0;
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.reqobt',      // Contract that we target
        scope: 'fio.reqobt',         // Account that owns the data
        table: 'recordobts',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      obts = await callFioApi("get_table_rows", json);
      console.log('obts: ', obts);
      console.log('Number of records in recordobts: ', obts);
      for (request in obts.rows) {
        if (obts.rows[request].payer_fio_addr == user3.address) {
          console.log('payer_fio_addr: ', obts.rows[request].payer_fio_addr); 
          expect(obts.rows[request].payer_fio_addr).to.equal(user3.address); 

          // Call get_table_rows from fiotrxts (NEW table) and confirm request is in table
          try {
            const json = {
              json: true,               // Get the response as json
              code: 'fio.reqobt',      // Contract that we target
              scope: 'fio.reqobt',         // Account that owns the data
              table: 'fiotrxts',        // Table name
              limit: 1000,                // Maximum number of rows that we want to get
              reverse: false,           // Optional: Get reversed data
              show_payer: false          // Optional: Show ram payer
            }
            requests = await callFioApi("get_table_rows", json);
            console.log('requests: ', requests);
            for (request in requests.rows) {
              if (requests.rows[request].payer_fio_addr == user3.address) {
                console.log('payer_fio_addr: ', requests.rows[request].payer_fio_addr); 
                break;
              }
            }
            expect(requests.rows[request].payer_fio_addr).to.equal(user3.address);  
          } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
          }

        }
        count++;
      } 
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it.skip('Call get_table_rows from fiotrxts (NEW table) and confirm request is in table', async () => {
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.reqobt',      // Contract that we target
        scope: 'fio.reqobt',         // Account that owns the data
        table: 'fiotrxts',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      requests = await callFioApi("get_table_rows", json);
      console.log('requests: ', requests);
      for (request in requests.rows) {
        if (requests.rows[request].payer_fio_addr == user3.address) {
          console.log('payer_fio_addr: ', requests.rows[request].payer_fio_addr); 
          break;
        }
      }
      expect(requests.rows[request].payer_fio_addr).to.equal(user3.address);  
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


})