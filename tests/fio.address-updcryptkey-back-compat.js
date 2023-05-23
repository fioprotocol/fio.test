/**
 * This test requires setup:
 * 
 * 1. Using fio.contracts 2.8 and fio 3.5:
 *     - Uncomment "describe('*** SETUP ONLY ***')". This will set up existing accounts with NO encrypt key.
 * 2. Update chain to develop branch (fio.contracts 2.9) using fio.devtools > 7. Post Actions > 1. Update All Contracts. Do NOT restart chain.
 *     - SKIP "describe('*** SETUP ONLY ***')"
 *     - Run remainder of tests
 */

require('mocha')
const {expect} = require('chai')
const {
    newUser,
    fetchJson,
    callFioApi,
    randStr
} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
config = require('../config.js');
let faucet, user1 = {}, user2 = {}, user3 = {}, user4 = {};
const payment = 5000000000000;

before(async () => {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);

    user1.privateKey = '5JuUSG2fThsSGJMzAzaVrqGD6CSP5cbRYhZRJ186Emnduf7hnKu';
    user1.publicKey = 'FIO75VtHWqRftfGrRAX3NfVUngDPdhFjkqvQfM17JQQsdzPP5sKcR';
    user1.account = '3gdugsgkqqpq';
    user1.domain = 'testdomain1';
    user1.address = 'testaddress1@testdomain1';
    user1.sdk = new FIOSDK(user1.privateKey, user1.publicKey, config.BASE_URL, fetchJson);

    user2.privateKey = '5HsUXshPtFKLDAMfgxXdPVzmJ8uKfwiefX1gxVySjba5YE73TTk';
    user2.publicKey = 'FIO5B5WhGjzBrSUF5HwSKpincaaoJTaCeTs1cbNjGKaA426df2MGW';
    user2.account = '5ek31buihgc3';
    user2.domain = 'testdomain2';
    user2.address = 'testaddress2@testdomain2';
    user2.sdk = new FIOSDK(user2.privateKey, user2.publicKey, config.BASE_URL, fetchJson);

    user3.privateKey = '5J8gsCT6Wj14tNgwsCEmuy9wcD9tSzSKAxnoN6MfY5AXFAudQhg';
    user3.publicKey = 'FIO7Pyu5bCW8PVaobTuRRLpAuRrrmiDuu7HkYqrxDsrhCjJUrTK6U';
    user3.account = 'evopnvhhy2gl';
    user3.domain = 'testdomain3';
    user3.address = 'testaddress3@testdomain3';
    user3.sdk = new FIOSDK(user3.privateKey, user3.publicKey, config.BASE_URL, fetchJson);

    user4.privateKey = '5JpWAQ9GuvERjffGGEMmUB92inBxwpGt3S8Q7S5aWYMJKTSe9Jg';
    user4.publicKey = 'FIO5zJaCmPnrdYX1F96ERsvfbBEhnqBLs1dwYW1bo6NqtR7Wuoyx8';
    user4.account = 'k5pxoncd2ape';
    user4.domain = 'testdomain4';
    user4.address = 'testaddress4@testdomain4';
    user4.sdk = new FIOSDK(user4.privateKey, user4.publicKey, config.BASE_URL, fetchJson);
    
});

describe('************************** fio.address-updcryptkey-back-compat.js ************************** \n    A. Requires setup - Test backward compatibility of encryption key', () => {
});

describe.skip('*** SETUP ONLY ***', () => { 
    it(`Set up accounts`, async () => {
        try {
            await faucet.genericAction('transferTokens', {
                payeeFioPublicKey: user1.publicKey,
                amount: payment,
                maxFee: config.maxFee
            });
              await user1.sdk.genericAction('registerFioDomain', {
                fioDomain: user1.domain,
                maxFee: config.maxFee
            });
            await user1.sdk.genericAction('registerFioAddress', {
                fioAddress: user1.address,
                ownerPublicKey: user1.publicKey,
                maxFee: config.maxFee
            });

          await faucet.genericAction('transferTokens', {
                payeeFioPublicKey: user2.publicKey,
                amount: payment,
                maxFee: config.maxFee
            });
            await user2.sdk.genericAction('registerFioDomain', {
                fioDomain: user2.domain,
                maxFee: config.maxFee
            });
            await user2.sdk.genericAction('registerFioAddress', {
                fioAddress: user2.address,
                ownerPublicKey: user2.publicKey,
                maxFee: config.maxFee
            });

            await faucet.genericAction('transferTokens', {
                payeeFioPublicKey: user3.publicKey,
                amount: payment,
                maxFee: config.maxFee
            });
            await user3.sdk.genericAction('registerFioDomain', {
                fioDomain: user3.domain,
                maxFee: config.maxFee
            });
            await user3.sdk.genericAction('registerFioAddress', {
                fioAddress: user3.address,
                ownerPublicKey: user3.publicKey,
                maxFee: config.maxFee
            });

            await faucet.genericAction('transferTokens', {
                payeeFioPublicKey: user4.publicKey,
                amount: payment,
                maxFee: config.maxFee
            });
            await user4.sdk.genericAction('registerFioDomain', {
                fioDomain: user4.domain,
                maxFee: config.maxFee
            });
            await user4.sdk.genericAction('registerFioAddress', {
                fioAddress: user4.address,
                ownerPublicKey: user4.publicKey,
                maxFee: config.maxFee
            }); 
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`Call get_table_rows for fionames. Verify public key. Get ID.`, async () => {
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
            user1.id = result.rows[0].id;
            expect(result.rows[0].addresses[0].token_code).to.equal('FIO');
            expect(result.rows[0].addresses[0].chain_code).to.equal('FIO');
            expect(result.rows[0].addresses[0].public_address).to.equal(user1.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`Call get_table_rows for fionameinfo for user1. Verify empty`, async () => {
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
            //console.log(JSON.stringify(result, null, 4));
            expect(result.rows.length).to.equal(0);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`Call get_encrypt_key. Expect key to be user1.publicKey`, async () => {
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

});

describe('A. FIO Request testing (no encrypt keys present in table) ', () => {
    let requestId;

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
            payerFioPublicKey: user2.publicKey,
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

      it(`Call get_table_rows for fiotrxtss for user2 (payer). Verify payer_key is user2.publicKey.`, async () => {
        try {
            const json = {
                code: 'fio.reqobt',
                scope: 'fio.reqobt',
                table: 'fiotrxtss',
                lower_bound: user2.account,
                upper_bound: user2.account,
                key_type: 'i64',
                index_position: '5',  // 5 is payer account and 6 is payee account
                json: true
            }
            result = await callFioApi("get_table_rows", json);
            //console.log(JSON.stringify(result, null, 4));
            expect(result.rows[result.rows.length - 1].payer_key).to.equal(user2.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it('(api) Call get_pending_fio_requests for user2 (payer). Verify addresses and keys.', async () => {
        try {
            const result = await callFioApi("get_pending_fio_requests", {
                fio_public_key: user2.publicKey
            });
            //console.log('result: ', result);
            expect(result.requests[result.requests.length - 1].fio_request_id).to.equal(requestId);
            expect(result.requests[result.requests.length - 1].payer_fio_address).to.equal(user2.address);
            expect(result.requests[result.requests.length - 1].payee_fio_address).to.equal(user1.address);
            expect(result.requests[result.requests.length - 1].payer_fio_public_key).to.equal(user2.publicKey);
            expect(result.requests[result.requests.length - 1].payee_fio_public_key).to.equal(user1.publicKey);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`(sdk) Call get_pending_fio_requests for user2 (payer)`, async () => {
        try {
          const result = await user2.sdk.genericAction('getPendingFioRequests', {  })
          //console.log('result: ', result)
          //console.log('content: ', result.requests[0].content)
          expect(result.requests[result.requests.length - 1].fio_request_id).to.equal(requestId);
          expect(result.requests[result.requests.length - 1].payer_fio_address).to.equal(user2.address);
          expect(result.requests[result.requests.length - 1].payee_fio_address).to.equal(user1.address);
          expect(result.requests[result.requests.length - 1].payer_fio_public_key).to.equal(user2.publicKey);
          expect(result.requests[result.requests.length - 1].payee_fio_public_key).to.equal(user1.publicKey);
          expect(result.requests[result.requests.length - 1].content.memo).to.equal("requestmemo");
        } catch (err) {
          console.log('Error: ', err)
          expect(err).to.equal(null);
        }
    });

    it('(api) Call get_sent_fio_requests for user1', async () => {
        try {
            const result = await callFioApi("get_sent_fio_requests", {
            fio_public_key: user1.publicKey,
            limit: 10,
            offset: 0
          })
          //console.log('Result', result)
          expect(result.requests[result.requests.length - 1].fio_request_id).to.equal(requestId);
          expect(result.requests[result.requests.length - 1].payer_fio_address).to.equal(user2.address);
          expect(result.requests[result.requests.length - 1].payee_fio_address).to.equal(user1.address);
          expect(result.requests[result.requests.length - 1].payer_fio_public_key).to.equal(user2.publicKey);
          expect(result.requests[result.requests.length - 1].payee_fio_public_key).to.equal(user1.publicKey);
          expect(result.requests[result.requests.length - 1].status).to.equal('requested');
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
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
          expect(result.requests[result.requests.length - 1].fio_request_id).to.equal(requestId);
          expect(result.requests[result.requests.length - 1].payer_fio_address).to.equal(user2.address);
          expect(result.requests[result.requests.length - 1].payee_fio_address).to.equal(user1.address);
          expect(result.requests[result.requests.length - 1].payer_fio_public_key).to.equal(user2.publicKey);
          expect(result.requests[result.requests.length - 1].payee_fio_public_key).to.equal(user1.publicKey);
          expect(result.requests[result.requests.length - 1].content.memo).to.equal("requestmemo");
        } catch (err) {
          console.log('Error: ', err)
          expect(err).to.equal(null)
        }
      });

});

describe('B. RecordObtData testing (no encrypt keys present in table)', () => {
    let txnId, cipherContent;
    const payment = 1000000000;
    const tokenCode = 'BTC';
    const chainCode = 'BTC';
    const payerTokenPublicAddress = 'user1BTCAddress';
    const payeeTokenPublicAddress = 'user2BTCAddress';
    requestMemo = randStr(15);
  
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

    it(`Call get_table_rows for fionameinfo for user2. Confirm empty.`, async () => {
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
            //console.log('Result: ', result);
            expect(result.rows.length).to.equal(0);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`Call get_encrypt_key for user1. Verify it ruturns user1.publicKey`, async () => {
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

    it(`Call get_encrypt_key for user2. Verify it ruturns user2.publicKey`, async () => {
        try {
            const json = {
                fio_address: user2.address
            }
            result = await callFioApi("get_encrypt_key", json);
            expect(result.encrypt_public_key).to.equal(user2.publicKey);
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
                payeeFioPublicKey: user2.publicKey,  // This should be ignored. Key used to encrypt should always be encryption key.
                memo: requestMemo
            })         
            //console.log('Result: ', result);
            expect(result.status).to.equal('sent_to_blockchain')
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
      });

      it(`Call get_table_rows for fiotrxtss for user1 (payer). Verify payer_key is user1.publicKey.`, async () => {
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
            expect(result.rows[0].payer_key).to.equal(user1.publicKey);
            expect(result.rows[0].payee_key).to.equal(user2.publicKey);
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
          cipherContent = result.obt_data_records[result.obt_data_records.length - 1].content;
          expect(result.obt_data_records[result.obt_data_records.length - 1].payer_fio_address).to.equal(user1.address);
          expect(result.obt_data_records[result.obt_data_records.length - 1].payee_fio_address).to.equal(user2.address);
          expect(result.obt_data_records[result.obt_data_records.length - 1].payer_fio_public_key).to.equal(user1.publicKey);
          expect(result.obt_data_records[result.obt_data_records.length - 1].payee_fio_public_key).to.equal(user2.publicKey);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
    });

    it(`Verify user1 and user2 public keys were used to encrypt content`, async () => {
        try {
            expect(cipherContent).to.be.a('string')
        
            const uncipherContent1 = user1.sdk.transactions.getUnCipherContent('record_obt_data_content', cipherContent, user1.privateKey, user2.publicKey)
            //console.log('uncipherContent1: ',uncipherContent1);
            expect(uncipherContent1.memo).to.equal(requestMemo);
        
            const uncipherContent2 = user2.sdk.transactions.getUnCipherContent('record_obt_data_content', cipherContent, user2.privateKey, user1.publicKey)
            //console.log('uncipherContent2: ',uncipherContent2);
            expect(uncipherContent2.memo).to.equal(requestMemo)
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    });

    it(`Call getObtData for user1 (payer) Verify content.`, async () => {
        try {
          const result = await user1.sdk.genericAction('getObtData', {  })
          //console.log('result: ', result)
          //console.log('content: ', result.obt_data_records[0].content)
          expect(result.obt_data_records[result.obt_data_records.length - 1].payer_fio_address).to.equal(user1.address);
          expect(result.obt_data_records[result.obt_data_records.length - 1].payee_fio_address).to.equal(user2.address);
          expect(result.obt_data_records[result.obt_data_records.length - 1].payer_fio_public_key).to.equal(user1.publicKey);
          expect(result.obt_data_records[result.obt_data_records.length - 1].payee_fio_public_key).to.equal(user2.publicKey);
          expect(result.obt_data_records[result.obt_data_records.length - 1].content.memo).to.equal(requestMemo);
        } catch (err) {
          console.log('Error: ', err)
          expect(err).to.equal(null);
        }
    });
});
