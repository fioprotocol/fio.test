require('mocha')
const {expect} = require('chai')
const {
    newUser,
    fetchJson,
    createKeypair,
    generateFioDomain,
    generateFioAddress,
    callFioApi,
    callFioApiSigned,
    timeout
} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
config = require('../config.js');
let faucet;

before(async () => {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
});

describe('************************** fio.address-updcryptkey.js ************************** \n    A. updcryptkey - add new encrypt key, confirm RAM, fees', () => {
    let user1, encryptKeys = {}, update_encrypt_key_fee;
  
    before(async () => {
      user1 = await newUser(faucet);
      const keypair = await createKeypair();
      encryptKeys = {
        publicKey: keypair.publicKey,
        privateKey: keypair.privateKey,
      }
    });

    it('Get fee for wrap_fio_tokens', async () => {
        try {
            result = await user1.sdk.getFee('update_encrypt_key', user1.address);
            update_encrypt_key_fee = result.fee;            
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`get user1 original balance`, async function () {
        result = await user1.sdk.genericAction('getFioBalance', {});
        user1.balance = result.available;
    });

    it(`Get RAM quota for user1`, async () => {
        try {
            const json = {
                "account_name": user1.account
            }
            result = await callFioApi("get_account", json);
            user1.ram = result.ram_quota;
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
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
        } catch (err) {
            console.log(JSON.stringify(err, null, 4));
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
            expect(result.rows[0].datavalue).to.equal(encryptKeys.publicKey);
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
            expect(result.encrypt_public_key).to.equal(encryptKeys.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`confirm fee deducted from user1 account`, async function () {
        user1.prevBalance = user1.balance;
        result = await user1.sdk.genericAction('getFioBalance', {});
        user1.balance = result.available;
        expect(user1.balance).to.equal(user1.prevBalance - update_encrypt_key_fee);
    });

    it(`Confirm RAM quota for user1 was incremented by UPDENCRYPTKEYRAM = ${config.RAM.UPDENCRYPTKEYRAM}`, async () => {
        try {
            const json = {
                "account_name": user1.account
            }
            result = await callFioApi("get_account", json);
            expect(result.ram_quota).to.equal(user1.ram + config.RAM.UPDENCRYPTKEYRAM);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

});

describe('B. updcryptkey - confirm keys', () => {
    let user1, user2, encryptKeys = {};
  
    before(async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
        const keypair = await createKeypair();
        encryptKeys = {
            publicKey: keypair.publicKey,
            privateKey: keypair.privateKey,
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
        } catch (err) {
            console.log(JSON.stringify(err, null, 4));
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
            expect(result.rows[0].datavalue).to.equal(encryptKeys.publicKey);
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
            expect(result.encrypt_public_key).to.equal(encryptKeys.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

});

describe('C. (user1 no encrypt key, user2 encrypt key) Add encryption key, encrypt with encryption key using fio request, decrypt fio request', () => {
    let user1, user2, encryptKeys = {}, requestId;
  
    before(async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
        const keypair = await createKeypair();
        encryptKeys = {
            publicKey: keypair.publicKey,
            privateKey: keypair.privateKey,
        };
    });

    it(`Add new encrypt key for user2`, async () => {
        try {
            const result = await user2.sdk.genericAction('pushTransaction', {
                action: 'updcryptkey',
                account: 'fio.address',
                data: {
                    fio_address: user2.address,
                    encrypt_public_key: encryptKeys.publicKey,
                    max_fee: config.maxFee,
                    tpid: user2.address
                }
            })
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log(JSON.stringify(err, null, 4));
            expect(err).to.equal(null);
        }
    });

    it(`Call get_table_rows for fionames for user2. Get id.`, async () => {
        try {
          const json = {
            json: true,
            code: 'fio.address',
            scope: 'fio.address',
            table: 'fionames',
            lower_bound: user2.account,
            upper_bound: user2.account,
            key_type: 'i64',
            reverse: true,
            index_position: '4'
          }
            result = await callFioApi("get_table_rows", json);
            user2.id = result.rows[0].id;
            expect(user2.id).to.be.a('number');
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`Call get_table_rows for fionameinfo for user2. Confirm encryption key.`, async () => {
        try {
          const json = {
            json: true,
            code: 'fio.address',
            scope: 'fio.address',
            table: 'fionameinfo',
            lower_bound: user2.id,
            upper_bound: user2.id,
            key_type: 'i64',
            reverse: true,
            index_position: '2'
          }
            result = await callFioApi("get_table_rows", json);
            expect(result.rows[0].fionameid).to.equal(user2.id);
            expect(result.rows[0].datadesc).to.equal('FIO_REQUEST_CONTENT_ENCRYPTION_PUB_KEY');
            expect(result.rows[0].datavalue).to.equal(encryptKeys.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });


    it(`Call get_encrypt_key for user2. Verify it ruturns the encryption key and not the original public key`, async () => {
        try {
            const json = {
                fio_address: user2.address
            }
            result = await callFioApi("get_encrypt_key", json);
            expect(result.encrypt_public_key).to.equal(encryptKeys.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`requestFunds - user2.address as payer and user1.address as payee`, async () => {
        try {
          const result = await user1.sdk.genericAction('requestFunds', {
            payerFioAddress: user2.address,
            payeeFioAddress: user1.address,
            payeeTokenPublicAddress: 'thisispayeetokenpublicaddress',
            amount: 1000000000,
            chainCode: 'BTC',
            tokenCode: 'BTC',
            memo: "requestmemo",
            maxFee: config.maxFee,
            payerFioPublicKey: encryptKeys.publicKey,
            technologyProviderId: '',
          })
          //console.log('Result: ', result);
          requestId = result.fio_request_id;
          expect(result.status).to.equal('requested')
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
      });

      it(`Call get_table_rows for fiotrxtss for user2. Verify payer_key is encryption key.`, async () => {
        try {
            const json = {
                code: 'fio.reqobt',
                scope: 'fio.reqobt',
                table: 'fiotrxtss',
                lower_bound: user2.account,
                upper_bound: user2.account,
                key_type: 'i64',
                index_position: '9',
                json: true
            }
            result = await callFioApi("get_table_rows", json);
            //console.log(JSON.stringify(result, null, 4));
            expect(result.rows[0].payer_key).to.equal(encryptKeys.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it('(api) Call get_pending_fio_requests for user2 (payer)', async () => {
        try {
            const result = await callFioApi("get_pending_fio_requests", {
            fio_public_key: user2.publicKey
          })
          //console.log('user2.publicKey', user2.publicKey);
          expect(result.requests[0].fio_request_id).to.equal(requestId);
          expect(result.requests[0].payer_fio_address).to.equal(user2.address);
          expect(result.requests[0].payee_fio_address).to.equal(user1.address);
          expect(result.requests[0].payer_fio_public_key).to.equal(encryptKeys.publicKey);
          expect(result.requests[0].payee_fio_public_key).to.equal(user1.publicKey);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
    });

    it.skip(`(sdk DASH-625) Call get_pending_fio_requests for user2 (payer) (uses encryption key)`, async () => {
        try {
          const result = await user2.sdk.genericAction('getPendingFioRequests', {  })
          //console.log('result: ', result)
          //console.log('content: ', result.requests[0].content)
          expect(result.requests[0].fio_request_id).to.equal(requestId);
          expect(result.requests[0].payer_fio_address).to.equal(user2.address);
          expect(result.requests[0].payee_fio_address).to.equal(user1.address);
          expect(result.requests[0].payer_fio_public_key).to.equal(encryptKeys.publicKey);
          expect(result.requests[0].payee_fio_public_key).to.equal(user1.publicKey);
          expect(result.requests[0].content.memo).to.equal("requestmemo");
        } catch (err) {
          console.log('Error: ', err)
          expect(err).to.equal(null);
        }
    });

    it('(api) Call get_sent_fio_requests for user1 (no encryption key)', async () => {
        try {
            const result = await callFioApi("get_sent_fio_requests", {
            fio_public_key: user1.publicKey,
            limit: 10,
            offset: 0
          })
          //console.log('Result', result)
          expect(result.requests[0].fio_request_id).to.equal(requestId);
          expect(result.requests[0].payer_fio_address).to.equal(user2.address);
          expect(result.requests[0].payee_fio_address).to.equal(user1.address);
          expect(result.requests[0].payer_fio_public_key).to.equal(encryptKeys.publicKey);
          expect(result.requests[0].payee_fio_public_key).to.equal(user1.publicKey);
          expect(result.requests[0].status).to.equal('requested');
        } catch (err) {
          console.log('Error', err)
        }
    });

    it(`(sdk) get_sent_fio_requests for user1 (payee). Expect `, async () => {
        try {
          const result = await user1.sdk.genericAction('getSentFioRequests', {
            limit: '',
            offset: ''
          })
          //console.log('result: ', result)
          //console.log('content: ', result.requests[0].content)
          expect(result.requests[0].fio_request_id).to.equal(requestId);
          expect(result.requests[0].payer_fio_address).to.equal(user2.address);
          expect(result.requests[0].payee_fio_address).to.equal(user1.address);
          expect(result.requests[0].payer_fio_public_key).to.equal(encryptKeys.publicKey);
          expect(result.requests[0].payee_fio_public_key).to.equal(user1.publicKey);
          expect(result.requests[0].content.memo).to.equal("requestmemo");
        } catch (err) {
          console.log('Error: ', err)
          expect(err).to.equal(null)
        }
      });

});

describe('C.2. RequestNewFunds SDK testing (user1 and user2 encrypt key) Add encryption key, encrypt with encryption key using fio request, decrypt fio request', () => {
    let user1, user2, encryptKeys1 = {}, encryptKeys2 = {}, requestId, cipherContent;
    const payeeTokenPublicAddress = 'thisispayeetokenpublicaddress';
  
    before(async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
        const keypair1 = await createKeypair();
        encryptKeys1 = {
            publicKey: keypair1.publicKey,
            privateKey: keypair1.privateKey,
        };
        const keypair2 = await createKeypair();
        encryptKeys2 = {
            publicKey: keypair2.publicKey,
            privateKey: keypair2.privateKey,
        };
    });

    it(`Add new encrypt key for user1`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'updcryptkey',
                account: 'fio.address',
                data: {
                    fio_address: user1.address,
                    encrypt_public_key: encryptKeys1.publicKey,
                    max_fee: config.maxFee,
                    tpid: user1.address
                }
            })
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log(JSON.stringify(err, null, 4));
            expect(err).to.equal(null);
        }
    });

    it(`Add new encrypt key for user2`, async () => {
        try {
            const result = await user2.sdk.genericAction('pushTransaction', {
                action: 'updcryptkey',
                account: 'fio.address',
                data: {
                    fio_address: user2.address,
                    encrypt_public_key: encryptKeys2.publicKey,
                    max_fee: config.maxFee,
                    tpid: user2.address
                }
            })
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log(JSON.stringify(err, null, 4));
            expect(err).to.equal(null);
        }
    });

    it(`Call get_table_rows for fionames for user2. Get id.`, async () => {
        try {
          const json = {
            json: true,
            code: 'fio.address',
            scope: 'fio.address',
            table: 'fionames',
            lower_bound: user2.account,
            upper_bound: user2.account,
            key_type: 'i64',
            reverse: true,
            index_position: '4'
          }
            result = await callFioApi("get_table_rows", json);
            user2.id = result.rows[0].id;
            expect(user2.id).to.be.a('number');
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`Call get_table_rows for fionameinfo for user2. Confirm encryption key.`, async () => {
        try {
          const json = {
            json: true,
            code: 'fio.address',
            scope: 'fio.address',
            table: 'fionameinfo',
            lower_bound: user2.id,
            upper_bound: user2.id,
            key_type: 'i64',
            reverse: true,
            index_position: '2'
          }
            result = await callFioApi("get_table_rows", json);
            expect(result.rows[0].fionameid).to.equal(user2.id);
            expect(result.rows[0].datadesc).to.equal('FIO_REQUEST_CONTENT_ENCRYPTION_PUB_KEY');
            expect(result.rows[0].datavalue).to.equal(encryptKeys2.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });


    it(`Call get_encrypt_key for user2. Verify it ruturns the encryption key and not the original public key`, async () => {
        try {
            const json = {
                fio_address: user2.address
            }
            result = await callFioApi("get_encrypt_key", json);
            expect(result.encrypt_public_key).to.equal(encryptKeys2.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`requestFunds - user2.address as payer and user1.address as payee`, async () => {
        try {
          const result = await user1.sdk.genericAction('requestFunds', {
            payerFioAddress: user2.address,
            payeeFioAddress: user1.address,
            payeeTokenPublicAddress: payeeTokenPublicAddress,
            amount: 1000000000,
            chainCode: 'BTC',
            tokenCode: 'BTC',
            memo: "requestmemo",
            maxFee: config.maxFee,
            payerFioPublicKey: encryptKeys2.publicKey,
            technologyProviderId: '',
          })
          //console.log('Result: ', result);
          requestId = result.fio_request_id;
          expect(result.status).to.equal('requested')
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
      });

      it(`Call get_table_rows for fiotrxtss for user2. Verify payer_key is encryption key.`, async () => {
        try {
            const json = {
                code: 'fio.reqobt',
                scope: 'fio.reqobt',
                table: 'fiotrxtss',
                lower_bound: user2.account,
                upper_bound: user2.account,
                key_type: 'i64',
                index_position: '9',
                json: true
            }
            result = await callFioApi("get_table_rows", json);
            //console.log(JSON.stringify(result, null, 4));
            expect(result.rows[0].payer_key).to.equal(encryptKeys2.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it('(api) Call get_pending_fio_requests for user2 (payer)', async () => {
        try {
            const result = await callFioApi("get_pending_fio_requests", {
            fio_public_key: user2.publicKey
          })
          //console.log('result', result);
          cipherContent = result.requests[0].content;
          expect(result.requests[0].fio_request_id).to.equal(requestId);
          expect(result.requests[0].payer_fio_address).to.equal(user2.address);
          expect(result.requests[0].payee_fio_address).to.equal(user1.address);
          expect(result.requests[0].payer_fio_public_key).to.equal(encryptKeys2.publicKey);
          expect(result.requests[0].payee_fio_public_key).to.equal(encryptKeys1.publicKey);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
    });


    // Right now, it is possible to pass in payerFioPublicKey and that is used as the encrypt key
    // This will cause problems since the keys in the table might be set to something different from the encrypt key
    // DASH-624 will update the SDK to ALWAYS override payerFioPublicKey and will use the encrypt key for encryption (if one exists)
    it.skip(`(Waiting on DASH-624) Verify user1 and user2 encryption keys were used to encrypt content`, async () => {
        try {
            expect(cipherContent).to.be.a('string')
        
            const uncipherContent1 = user1.sdk.transactions.getUnCipherContent('new_funds_content', cipherContent, user1.privateKey, encryptKeys2.publicKey)
            console.log('uncipherContent1: ',uncipherContent1);
            expect(uncipherContent1.payee_public_address).to.equal(payeeTokenPublicAddress);
        
            const uncipherContent2 = user2.sdk.transactions.getUnCipherContent('new_funds_content', cipherContent, encryptKeys2.privateKey, encryptKeys1.publicKey)
            console.log('uncipherContent2: ',uncipherContent2);
            expect(uncipherContent2.payee_public_address).to.equal(payeeTokenPublicAddress)
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it.skip(`(sdk waiting on DASH-625) Call getPendingFioRequests for user2 (payer) (uses encryption key)`, async () => {
        try {
          const result = await user2.sdk.genericAction('getPendingFioRequests', {  })
          console.log('result: ', result)
          console.log('content: ', result.requests[0].content)
          expect(result.requests[0].fio_request_id).to.equal(requestId);
          expect(result.requests[0].payer_fio_address).to.equal(user2.address);
          expect(result.requests[0].payee_fio_address).to.equal(user1.address);
          expect(result.requests[0].payer_fio_public_key).to.equal(encryptKeys2.publicKey);
          expect(result.requests[0].payee_fio_public_key).to.equal(encryptKeys1.publicKey);
          expect(result.requests[0].content.memo).to.equal("requestmemo");
        } catch (err) {
          console.log('Error: ', err)
          expect(err).to.equal(null);
        }
    });

    it('(api) Call get_received_fio_requests for user2 (payer)', async () => {
        try {
            const result = await callFioApi("get_received_fio_requests", {
            fio_public_key: user2.publicKey
          })
          console.log('user2.publicKey', user2.publicKey);
          expect(result.requests[0].fio_request_id).to.equal(requestId);
          expect(result.requests[0].payer_fio_address).to.equal(user2.address);
          expect(result.requests[0].payee_fio_address).to.equal(user1.address);
          expect(result.requests[0].payer_fio_public_key).to.equal(encryptKeys2.publicKey);
          expect(result.requests[0].payee_fio_public_key).to.equal(encryptKeys1.publicKey);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
    });

    it.skip(`(sdk waiting on DASH-625) Call getReceivedFioRequests for user2 (payer) (uses encryption key)`, async () => {
        try {
          const result = await user2.sdk.genericAction('getReceivedFioRequests', {  })
          console.log('result: ', result)
          console.log('content: ', result.requests[0].content)
          expect(result.requests[0].fio_request_id).to.equal(requestId);
          expect(result.requests[0].payer_fio_address).to.equal(user2.address);
          expect(result.requests[0].payee_fio_address).to.equal(user1.address);
          expect(result.requests[0].payer_fio_public_key).to.equal(encryptKeys2.publicKey);
          expect(result.requests[0].payee_fio_public_key).to.equal(encryptKeys1.publicKey);
          expect(result.requests[0].content.memo).to.equal("requestmemo");
        } catch (err) {
          console.log('Error: ', err)
          expect(err).to.equal(null);
        }
    });

    it('(api) Call get_sent_fio_requests for user1 (no encryption key)', async () => {
        try {
            const result = await callFioApi("get_sent_fio_requests", {
            fio_public_key: user1.publicKey,
            limit: 10,
            offset: 0
          })
          //console.log('Result', result)
          expect(result.requests[0].fio_request_id).to.equal(requestId);
          expect(result.requests[0].payer_fio_address).to.equal(user2.address);
          expect(result.requests[0].payee_fio_address).to.equal(user1.address);
          expect(result.requests[0].payer_fio_public_key).to.equal(encryptKeys2.publicKey);
          expect(result.requests[0].payee_fio_public_key).to.equal(encryptKeys1.publicKey);
          expect(result.requests[0].status).to.equal('requested');
        } catch (err) {
          console.log('Error', err)
        }
    });

    it.skip(`(sdk waiting on DASH-625) getSentFioRequests for user1 (payee). Expect `, async () => {
        try {
          const result = await user1.sdk.genericAction('getSentFioRequests', {
            limit: '',
            offset: ''
          })
          //console.log('result: ', result)
          //console.log('content: ', result.requests[0].content)
          expect(result.requests[0].fio_request_id).to.equal(requestId);
          expect(result.requests[0].payer_fio_address).to.equal(user2.address);
          expect(result.requests[0].payee_fio_address).to.equal(user1.address);
          expect(result.requests[0].payer_fio_public_key).to.equal(encryptKeys2.publicKey);
          expect(result.requests[0].payee_fio_public_key).to.equal(encryptKeys1.publicKey);
          expect(result.requests[0].content.memo).to.equal("requestmemo");
        } catch (err) {
          console.log('Error: ', err)
          expect(err).to.equal(null)
        }
      });

});

describe('C.3. RecordObtData testing (user1 and user2 encrypt key) Add encryption key, encrypt with encryption key using fio request, decrypt fio request', () => {
    let user1, user2, encryptKeys1 = {}, encryptKeys2 = {}, txnId, cipherContent;
    const payment = 1000000000;
    const tokenCode = 'BTC';
    const chainCode = 'BTC';
    const payerTokenPublicAddress = 'user1BTCAddress';
    const payeeTokenPublicAddress = 'user2BTCAddress';
  
    before(async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
        const keypair1 = await createKeypair();
        encryptKeys1 = {
            publicKey: keypair1.publicKey,
            privateKey: keypair1.privateKey,
        };
        const keypair2 = await createKeypair();
        encryptKeys2 = {
            publicKey: keypair2.publicKey,
            privateKey: keypair2.privateKey,
        };
    });

    it(`Add new encrypt key for user1`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'updcryptkey',
                account: 'fio.address',
                data: {
                    fio_address: user1.address,
                    encrypt_public_key: encryptKeys1.publicKey,
                    max_fee: config.maxFee,
                    tpid: user1.address
                }
            })
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log(JSON.stringify(err, null, 4));
            expect(err).to.equal(null);
        }
    });

    it(`Add new encrypt key for user2`, async () => {
        try {
            const result = await user2.sdk.genericAction('pushTransaction', {
                action: 'updcryptkey',
                account: 'fio.address',
                data: {
                    fio_address: user2.address,
                    encrypt_public_key: encryptKeys2.publicKey,
                    max_fee: config.maxFee,
                    tpid: user2.address
                }
            })
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log(JSON.stringify(err, null, 4));
            expect(err).to.equal(null);
        }
    });

    it(`Call get_table_rows for fionames for user2. Get id.`, async () => {
        try {
          const json = {
            json: true,
            code: 'fio.address',
            scope: 'fio.address',
            table: 'fionames',
            lower_bound: user2.account,
            upper_bound: user2.account,
            key_type: 'i64',
            reverse: true,
            index_position: '4'
          }
            result = await callFioApi("get_table_rows", json);
            user2.id = result.rows[0].id;
            expect(user2.id).to.be.a('number');
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`Call get_table_rows for fionameinfo for user2. Confirm encryption key.`, async () => {
        try {
          const json = {
            json: true,
            code: 'fio.address',
            scope: 'fio.address',
            table: 'fionameinfo',
            lower_bound: user2.id,
            upper_bound: user2.id,
            key_type: 'i64',
            reverse: true,
            index_position: '2'
          }
            result = await callFioApi("get_table_rows", json);
            expect(result.rows[0].fionameid).to.equal(user2.id);
            expect(result.rows[0].datadesc).to.equal('FIO_REQUEST_CONTENT_ENCRYPTION_PUB_KEY');
            expect(result.rows[0].datavalue).to.equal(encryptKeys2.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });


    it(`Call get_encrypt_key for user1. Verify it ruturns the encryption key and not the original public key`, async () => {
        try {
            const json = {
                fio_address: user1.address
            }
            result = await callFioApi("get_encrypt_key", json);
            expect(result.encrypt_public_key).to.equal(encryptKeys1.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`Call get_encrypt_key for user2. Verify it ruturns the encryption key and not the original public key`, async () => {
        try {
            const json = {
                fio_address: user2.address
            }
            result = await callFioApi("get_encrypt_key", json);
            expect(result.encrypt_public_key).to.equal(encryptKeys2.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`user1 transferTokens to user2`, async () => {
        const result = await user1.sdk.genericAction('transferTokens', {
            payeeFioPublicKey: user2.publicKey,
            amount: payment,
            maxFee: config.maxFee
        });
        //console.log('Result: ', result);
        txnId = result.transaction_id;
        expect(result).to.have.any.keys('status');
        expect(result).to.have.any.keys('fee_collected');
        expect(result).to.have.any.keys('block_num');
        expect(result).to.have.any.keys('transaction_id');
    });

    it(`recordObtData - user1.address as payer and user2.address as payee`, async () => {
        try {
            const result = await user1.sdk.genericAction('recordObtData', {
                payerFioAddress: user1.address,
                payeeFioAddress: user2.address,
                payerTokenPublicAddress: payerTokenPublicAddress,  // BTC address
                payeeTokenPublicAddress: payeeTokenPublicAddress,  // BTC address
                amount: payment,
                chainCode: chainCode,
                tokenCode: tokenCode,
                obtId: txnId,
                maxFee: config.maxFee,
                technologyProviderId: '',
                //payeeFioPublicKey: user2.publicKey,  // This should be ignored. Key used to encrypt should always be encryption key.
                memo: 'requestmemo'
            })         
            //console.log('Result: ', result);
            expect(result.status).to.equal('sent_to_blockchain')
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
      });

      it(`Call get_table_rows for fiotrxtss for user1 (payer). Verify payer_key is encryption key.`, async () => {
        try {
            const json = {
                code: 'fio.reqobt',
                scope: 'fio.reqobt',
                table: 'fiotrxtss',
                lower_bound: user1.account,
                upper_bound: user1.account,
                key_type: 'i64',
                index_position: '5',  // 5 is payer account and 6 is payee account
                json: true
            }
            result = await callFioApi("get_table_rows", json);
            //console.log(JSON.stringify(result, null, 4));
            expect(result.rows[0].payer_key).to.equal(encryptKeys1.publicKey);
            expect(result.rows[0].payee_key).to.equal(encryptKeys2.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it('(api) Call get_obt_data for user1 (payer)', async () => {
        try {
            const result = await callFioApi("get_obt_data", {
            fio_public_key: user1.publicKey
          })
          //console.log('result', result);
          cipherContent = result.obt_data_records[0].content;
          expect(result.obt_data_records[0].payer_fio_address).to.equal(user1.address);
          expect(result.obt_data_records[0].payee_fio_address).to.equal(user2.address);
          expect(result.obt_data_records[0].payer_fio_public_key).to.equal(encryptKeys1.publicKey);
          expect(result.obt_data_records[0].payee_fio_public_key).to.equal(encryptKeys2.publicKey);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
    });


    // Right now, it is possible to pass in payerFioPublicKey and that is used as the encrypt key
    // This will cause problems since the keys in the table might be set to something different from the encrypt key
    // DASH-624 will update the SDK to ALWAYS override payerFioPublicKey and will use the encrypt key for encryption (if one exists)
    it.skip(`(Waiting on DASH-624, currently still uses user1.privateKey, etc. ) Verify user1 and user2 encryption keys were used to encrypt content`, async () => {
        try {
            expect(cipherContent).to.be.a('string')
        
            const uncipherContent1 = user1.sdk.transactions.getUnCipherContent('record_obt_data_content', cipherContent, encryptKeys1.privateKey, encryptKeys2.publicKey)
            console.log('uncipherContent1: ',uncipherContent1);
            expect(uncipherContent1.payee_public_address).to.equal(payeeTokenPublicAddress);
        
            const uncipherContent2 = user2.sdk.transactions.getUnCipherContent('record_obt_data_content', cipherContent, encryptKeys2.privateKey, encryptKeys1.publicKey)
            console.log('uncipherContent2: ',uncipherContent2);
            expect(uncipherContent2.payee_public_address).to.equal(payeeTokenPublicAddress)
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it.skip(`(sdk waiting on DASH-625, not decrypting content) Call getObtData for user1 (payer) (uses encryption key)`, async () => {
        try {
          const result = await user1.sdk.genericAction('getObtData', {  })
          console.log('result: ', result)
          console.log('content: ', result.obt_data_records[0].content)
          expect(result.obt_data_records[0].payer_fio_address).to.equal(user1.address);
          expect(result.obt_data_records[0].payee_fio_address).to.equal(user2.address);
          expect(result.obt_data_records[0].payer_fio_public_key).to.equal(encryptKeys1.publicKey);
          expect(result.obt_data_records[0].payee_fio_public_key).to.equal(encryptKeys2.publicKey);
          expect(result.obt_data_records[0].content.memo).to.equal("requestmemo");
        } catch (err) {
          console.log('Error: ', err)
          expect(err).to.equal(null);
        }
    });
});

describe('D. Modified actions - regaddress. Confirm addition of encrypt key', () => {
    let user1, user2;
  
    before(async () => {
        user1 = await newUser(faucet);
        const keys = await createKeypair();
        user2 = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson)
        user2.account = FIOSDK.accountHash(user2.publicKey).accountnm;
        user2.address = generateFioAddress(user1.domain, 10);
    });

    it(`user1 registers address for user2`, async () => {
        try {
          const result = await user1.sdk.genericAction('registerFioAddress', {
            fioAddress: user2.address,
            ownerPublicKey: user2.publicKey,
            maxFee: config.maxFee,
          })
          expect(result.status).to.equal('OK')
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          expect(err).to.equal('null');
        }
    });

    it('Wait a few seconds.', async () => {await timeout(2000);})

    it(`Call get_table_rows for fionames. Verify FIO token_code, chain_code, public_address`, async () => {
        try {
            const json = {
                code: 'fio.address',
                scope: 'fio.address',
                table: 'fionames',
                lower_bound: user2.account,
                upper_bound: user2.account,
                key_type: 'i64',
                index_position: '4',
                json: true
            }
            result = await callFioApi("get_table_rows", json);
            //console.log(JSON.stringify(result, null, 4));
            expect(result.rows[0].addresses[0].token_code).to.equal('FIO');
            expect(result.rows[0].addresses[0].chain_code).to.equal('FIO');
            expect(result.rows[0].addresses[0].public_address).to.equal(user2.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`Call get_table_rows for fionames for user2. Get id.`, async () => {
        try {
          const json = {
            json: true,
            code: 'fio.address',
            scope: 'fio.address',
            table: 'fionames',
            lower_bound: user2.account,
            upper_bound: user2.account,
            key_type: 'i64',
            reverse: true,
            index_position: '4'
          }
            result = await callFioApi("get_table_rows", json);
            user2.id = result.rows[0].id;
            expect(user2.id).to.be.a('number');
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`Call get_table_rows for fionameinfo for user2`, async () => {
        try {
          const json = {
            json: true,
            code: 'fio.address',
            scope: 'fio.address',
            table: 'fionameinfo',
            lower_bound: user2.id,
            upper_bound: user2.id,
            key_type: 'i64',
            reverse: true,
            index_position: '2'
          }
            result = await callFioApi("get_table_rows", json);
            expect(result.rows[0].fionameid).to.equal(user2.id);
            expect(result.rows[0].datadesc).to.equal('FIO_REQUEST_CONTENT_ENCRYPTION_PUB_KEY');
            expect(result.rows[0].datavalue).to.equal(user2.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });


    it(`Call get_encrypt_key. Verify encryption key same as user public key`, async () => {
        try {
            const json = {
                fio_address: user2.address
            }
            result = await callFioApi("get_encrypt_key", json);
            expect(result.encrypt_public_key).to.equal(user2.publicKey);
        } catch (err) {
            console.log('Error', err.error);
            expect(err).to.equal(null);
        }
    });
});

describe('E. xferaddress. Confirm addition of encrypt key when tranferring to empty account', () => {
    let user1, user2;
  
    before(async () => {
        user1 = await newUser(faucet);
        const keys = await createKeypair();
        user2 = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson)
        user2.account = FIOSDK.accountHash(user2.publicKey).accountnm;
    });

    it(`user1 transfers address to user2`, async () => {
        try {
            const result = await user1.sdk.genericAction('transferFioAddress', {
                fioAddress: user1.address,
                newOwnerKey: user2.publicKey,
                maxFee: config.maxFee,
                technologyProviderId: ''
            })
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`Call get_table_rows for fionames. Verify FIO token_code, chain_code, public_address`, async () => {
        try {
            const json = {
                code: 'fio.address',
                scope: 'fio.address',
                table: 'fionames',
                lower_bound: user2.account,
                upper_bound: user2.account,
                key_type: 'i64',
                index_position: '4',
                json: true
            }
            result = await callFioApi("get_table_rows", json);
            //console.log(JSON.stringify(result, null, 4));
            expect(result.rows[0].addresses[0].token_code).to.equal('FIO');
            expect(result.rows[0].addresses[0].chain_code).to.equal('FIO');
            expect(result.rows[0].addresses[0].public_address).to.equal(user2.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`Call get_table_rows for fionames for user2. Get id.`, async () => {
        try {
          const json = {
            json: true,
            code: 'fio.address',
            scope: 'fio.address',
            table: 'fionames',
            lower_bound: user2.account,
            upper_bound: user2.account,
            key_type: 'i64',
            reverse: true,
            index_position: '4'
          }
            result = await callFioApi("get_table_rows", json);
            user2.id = result.rows[0].id;
            expect(user2.id).to.be.a('number');
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`Call get_table_rows for fionameinfo for user2. Verify encrypt key same as user2 public key`, async () => {
        try {
          const json = {
            json: true,
            code: 'fio.address',
            scope: 'fio.address',
            table: 'fionameinfo',
            lower_bound: user2.id,
            upper_bound: user2.id,
            key_type: 'i64',
            reverse: true,
            index_position: '2'
          }
            result = await callFioApi("get_table_rows", json);
            expect(result.rows[0].fionameid).to.equal(user2.id);
            expect(result.rows[0].datadesc).to.equal('FIO_REQUEST_CONTENT_ENCRYPTION_PUB_KEY');
            expect(result.rows[0].datavalue).to.equal(user2.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });


    it(`Call get_encrypt_key for transferred. Verify encryption key same as user2 public key`, async () => {
        try {
            const json = {
                fio_address: user1.address
            }
            result = await callFioApi("get_encrypt_key", json);
            expect(result.encrypt_public_key).to.equal(user2.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });
});

describe('F. Modified actions - burnaddress. Confirm removal of encrypt key', () => {
    let user1, user2, encryptKeys = {};
  
    before(async () => {
        user1 = await newUser(faucet);
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

    it(`Call get_table_rows for fionames for user2. Get id.`, async () => {
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

    it(`Burn user1.address. Expect status = 'OK'`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'burnaddress',
                account: 'fio.address',
                actor: user1.account,
                privKey: user1.privateKey,
                data: {
                    "fio_address": user1.address,
                    "max_fee": config.maxFee,
                    "tpid": '',
                    "actor": user1.account
                }
            })
            expect(JSON.parse(result.processed.action_traces[0].receipt.response).status).to.equal('OK');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });

    it(`Call get_table_rows for fionames for user1. Expect empty array.`, async () => {
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
            expect(result.rows.length).to.equal(0);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`Call get_table_rows for fionameinfo for user1. Expect empty array.`, async () => {
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
            expect(result.rows.length).to.equal(0);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`Call get_encrypt_key. Verify encryption key same as user public key. Expect: ${config.error2.noEncryptionAddress.statusCode} ${config.error2.noEncryptionAddress.message}`, async () => {
        try {
            const json = {
                fio_address: user1.address
            }
            result = await callFioApi("get_encrypt_key", json);
            expect(result.encrypt_public_key).to.equal(user1.publicKey);
        } catch (err) {
            //console.log(JSON.stringify(err.error, null, 4));
            expect(err.error.fields[0].error).to.equal(config.error2.noEncryptionAddress.message);
            expect(err.statusCode).to.equal(config.error2.noEncryptionAddress.statusCode);
        }
    });
});

describe('G. Set encryption key to empty string', () => {
    let user1;
  
    before(async () => {
        user1 = await newUser(faucet);
    });

    it(`Add new encrypt key for user1`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'updcryptkey',
                account: 'fio.address',
                data: {
                    fio_address: user1.address,
                    encrypt_public_key: '',
                    max_fee: config.maxFee,
                    tpid: user1.address
                }
            })
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log(JSON.stringify(err, null, 4));
            expect(err).to.equal(null);
        }
    });

    it(`Call get_table_rows for fionames for user2. Get id.`, async () => {
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

    it(`Call get_table_rows for fionameinfo for user1. Verify encryption key is empty`, async () => {
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
            expect(result.rows[0].datavalue).to.equal('');
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });


    it(`Call get_encrypt_key. Verify encryption key is empty`, async () => {
        try {
            const json = {
                fio_address: user1.address
            }
            result = await callFioApi("get_encrypt_key", json);
            expect(result.encrypt_public_key).to.equal('');
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

});

describe('H. Test newfioacc - Sad Path', () => {
    let user1, user2, userNoFunds = {}, encryptKeys = {};
  
    before(async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
        const keypair = await createKeypair();
        encryptKeys = {
            publicKey: keypair.publicKey,
            privateKey: keypair.privateKey,
        };
        const keys = await createKeypair();
        userNoFunds.publicKey = keys.publicKey;
        userNoFunds = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
        userNoFunds.account = FIOSDK.accountHash(userNoFunds.publicKey).accountnm;
        userNoFunds.domain = generateFioDomain(10);
        userNoFunds.address = generateFioAddress(userNoFunds.domain, 10);

        //console.log('user1.publicKey: ', user1.publicKey);
        //console.log('encryptKeys.publicKey: ', encryptKeys.publicKey);
    });

    it(`(failure) actor - Not owner of FIO Address. Expect: ${config.error2.invalidSignature.statusCode} ${config.error2.invalidSignature.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'updcryptkey',
                account: 'fio.address',
                data: {
                    fio_address: user2.address,
                    encrypt_public_key: encryptKeys.publicKey,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            console.log('Result: ', result)
            expect(result).to.equal('null');
        } catch (err) {
            //console.log('Error: ', err);
            expect(err.json.message).to.equal(config.error2.invalidSignature.message);
            expect(err.errorCode).to.equal(config.error2.invalidSignature.statusCode);
        }
    });

    it(`(failure) fio_address - Nonexistent FIO Address on user1 domain. Expect: ${config.error2.fioAddressNotExist.statusCode} ${config.error2.fioAddressNotExist.message} (BD-4573)`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'updcryptkey',
                account: 'fio.address',
                data: {
                    fio_address: 'nonexistentaddress@' + user1.domain,
                    encrypt_public_key: encryptKeys.publicKey,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            console.log('Result: ', result)
            expect(result).to.equal(null);
        } catch (err) {
            //console.log(JSON.stringify(err, null, 4));
            expect(err.json.fields[0].error).to.equal(config.error2.fioAddressNotExist.message);
            expect(err.errorCode).to.equal(config.error2.fioAddressNotExist.statusCode);
        }
    });

    it(`(failure) encrypt_public_key - Invalid encrypt key. Expect: ${config.error2.invalidEncryptKey.statusCode} ${config.error2.invalidEncryptKey.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'updcryptkey',
                account: 'fio.address',
                data: {
                    fio_address: user1.address,
                    encrypt_public_key: 'notakey',
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result).to.equal(null);
        } catch (err) {
            //console.log(JSON.stringify(err, null, 4));
            expect(err.json.fields[0].error).to.equal(config.error2.invalidEncryptKey.message);
            expect(err.errorCode).to.equal(config.error2.invalidEncryptKey.statusCode);
        }
    });

    it(`(failure) max_fee - Invalid Fee Value. Expect: ${config.error2.invalidFeeValue.message}`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'updcryptkey',
                account: 'fio.address',
                actor: user1.account,
                privKey: user1.privateKey,
                data: {
                    fio_address: user1.address,
                    encrypt_public_key: encryptKeys.publicKey,
                    max_fee: -100,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result).to.equal(null);
        } catch (err) {
            //console.log(JSON.stringify(err, null, 4));
            expect(err.actual.fields[0].error).to.equal(config.error2.invalidFeeValue.message);
        }
    });

    it(`(failure) tpid - Invalid TPID. Expect: ${config.error2.invalidTpid.statusCode} ${config.error2.invalidTpid.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'updcryptkey',
                account: 'fio.address',
                data: {
                    fio_address: user1.address,
                    encrypt_public_key: encryptKeys.publicKey,
                    max_fee: config.maxFee,
                    tpid: -100,
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log(JSON.stringify(err, null, 4));
            expect(err.json.fields[0].error).to.equal(config.error2.invalidTpid.message);
            expect(err.errorCode).to.equal(config.error2.invalidTpid.statusCode);
        }
    });

    it(`Use up all of user1's bundles with 51 record_obt_data transactions`, async () => {
        try {
            for (i = 0; i < 51; i++) {
                const result = await user1.sdk.genericAction('recordObtData', {
                    payerFioAddress: user1.address,
                    payeeFioAddress: user2.address,
                    payerTokenPublicAddress: user1.publicKey,
                    payeeTokenPublicAddress: user2.publicKey,
                    amount: 5000000000,
                    chainCode: "BTC",
                    tokenCode: "BTC",
                    status: '',
                    obtId: '',
                    maxFee: config.api.record_obt_data.fee,
                    technologyProviderId: '',
                    payeeFioPublicKey: user2.publicKey,
                    memo: ''
                })
            }
            const result2 = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey });
            //console.log('result2: ', result2);
            expect(result2.fio_addresses[0].remaining_bundled_tx).to.equal(0);
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    });

    it(`(failure) max_fee - Low fee. Expect: ${config.error2.feeExceedsMax.statusCode} ${config.error2.feeExceedsMax.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'updcryptkey',
                account: 'fio.address',
                data: {
                    fio_address: user1.address,
                    encrypt_public_key: encryptKeys.publicKey,
                    max_fee: 100,
                    tpid: '',
                    actor: user1.account
                }
            });
            console.log('Result: ', result);
            expect(result).to.equal(null);
        } catch (err) {
            //console.log(JSON.stringify(err, null, 4));
            expect(err.json.fields[0].error).to.equal(config.error2.feeExceedsMax.message);
            expect(err.errorCode).to.equal(config.error2.feeExceedsMax.statusCode);
        }
    });

    // Insufficient balance test

    it(`get balance for user1`, async function () {
        result = await user1.sdk.genericAction('getFioBalance', {});
        user1.balance = result.available;
        //console.log('Result: ', result)
    });

    it(`Transfer all tokens for user1`, async () => {
        try {
            const result = await user1.sdk.genericAction('transferTokens', {
                payeeFioPublicKey: user2.publicKey,
                amount: user1.balance - 5000000000,
                maxFee: config.maxFee
            });
            //console.log('Result: ', result);
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log(JSON.stringify(err, null, 4));
            expect(err).to.equal('null');
        }
    });

    it(`(failure) Insufficient balance. Expect: ${config.error2.insufficientFunds.statusCode} ${config.error2.insufficientFunds.message}`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'updcryptkey',
                account: 'fio.address',
                data: {
                    fio_address: user1.address,
                    encrypt_public_key: encryptKeys.publicKey,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log(JSON.stringify(err, null, 4));
            expect(err.json.fields[0].error).to.equal(config.error2.insufficientFunds.message);
            expect(err.errorCode).to.equal(config.error2.insufficientFunds.statusCode);
        }
    });

});

describe('I. user2 tries to add encryption key for user1 (BD-4538)', () => {
    let user1, user2, encryptKeys = {};
  
    before(async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
        const keypair = await createKeypair();
        encryptKeys = {
            publicKey: keypair.publicKey,
            privateKey: keypair.privateKey,
        };
    });

    it(`(failure) actor - Signer not actor. Expect: ${config.error2.invalidActorAuth.statusCode} ${config.error2.invalidActorAuth.message}`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'updcryptkey',
                account: 'fio.address',
                actor: user2.account,
                privKey: user2.privateKey,
                data: {
                    fio_address: user1.address,
                    encrypt_public_key: encryptKeys.publicKey,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user1.account
                }
            });
            //console.log(JSON.stringify(result, null, 4));
            expect(result.code).to.equal(config.error2.invalidActorAuth.statusCode);
            expect(result.error.what).to.equal(config.error2.invalidActorAuth.message);
        } catch (err) {
            console.log(JSON.stringify(err, null, 4));
            expect(err).to.equal('null');
        }
    });

    it(`Call get_encrypt_key for user1. Verify same as user1.publicKey (no key was added)`, async () => {
        try {
            const json = {
                fio_address: user1.address
            }
            result = await callFioApi("get_encrypt_key", json);
            //console.log('Result: ', result);
            expect(result.encrypt_public_key).to.equal(user1.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

});
