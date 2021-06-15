require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, timeout, callFioApi} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`*********************** record-obt-data.js *********************** \n    A. Test OBT Data`, () => {

    let userA1, userA2, userA2Balance, timeStamp
    const payment = 5000000000 // 5 FIO
    const requestMemo = 'Memo Test'
    const obtMemo = 'Memo in OBT payment'

    it(`Create users`, async () => {
        userA1 = await newUser(faucet);
        userA2 = await newUser(faucet);
    })

    it(`userA1 sends recordObtData to userA2`, async () => {
        try {
            const result = await userA1.sdk.genericAction('recordObtData', {
                fioRequestId: '',
                payerFioAddress: userA1.address,
                payeeFioAddress: userA2.address,
                payerTokenPublicAddress: userA1.publicKey,
                payeeTokenPublicAddress: userA2.publicKey,
                amount: payment,
                chainCode: "FIO",
                tokenCode: "FIO",
                status: '',
                obtId: '',
                maxFee: config.api.record_obt_data.fee,
                technologyProviderId: '',
                payeeFioPublicKey: userA2.publicKey,
                memo: obtMemo,
                hash: '',
                offLineUrl: ''
            })
            //console.log('Result: ', result)
            timeStamp = result.time_stamp
            expect(result.status).to.equal('sent_to_blockchain')
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`Wait a few seconds.`, async () => { await timeout(5000) })

    it(`get_obt_data for userA1 (payer)`, async () => {
        try {
            const result = await userA1.sdk.genericAction('getObtData', {
                limit: '',
                offset: ''
            })
            //console.log('result: ', result);
            //console.log('content: ', result.obt_data_records[0].content);
            expect(result.obt_data_records[0].fio_request_id).to.equal(0);
            expect(result.obt_data_records[0].payer_fio_address).to.equal(userA1.address);
            expect(result.obt_data_records[0].payee_fio_address).to.equal(userA2.address);
            expect(result.obt_data_records[0].payer_fio_public_key).to.equal(userA1.publicKey);
            expect(result.obt_data_records[0].payee_fio_public_key).to.equal(userA2.publicKey);
            expect(result.obt_data_records[0].status).to.equal('sent_to_blockchain');
            expect(result.obt_data_records[0].content.memo).to.equal(obtMemo);
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`get_obt_data for userA2 (payee)`, async () => {
        try {
            const result = await userA2.sdk.genericAction('getObtData', {
                limit: '',
                offset: ''
            })
            //console.log('result: ', result);
            //console.log('content: ', result.obt_data_records[0].content);
            expect(result.obt_data_records[0].fio_request_id).to.equal(0);
            expect(result.obt_data_records[0].payer_fio_address).to.equal(userA1.address);
            expect(result.obt_data_records[0].payee_fio_address).to.equal(userA2.address);
            expect(result.obt_data_records[0].payer_fio_public_key).to.equal(userA1.publicKey);
            expect(result.obt_data_records[0].payee_fio_public_key).to.equal(userA2.publicKey);
            expect(result.obt_data_records[0].status).to.equal('sent_to_blockchain');
            expect(result.obt_data_records[0].content.memo).to.equal(obtMemo);
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it('Echo fiotrxtss table (need to uncomment)', async () => {
        try {
          const json = {
            json: true,
            code: 'fio.reqobt', 
            scope: 'fio.reqobt', 
            table: 'fiotrxtss', 
            limit: 5,               
            reverse: true,         
            show_payer: false  
          }
          fiotrxtss = await callFioApi("get_table_rows", json);
          //console.log('fiotrxtss: ', fiotrxtss);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      })

    it('Call get_table_rows from fionames to get bundles remaining for userA2. Verify 100 bundles', async () => {
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
                if (fionames.rows[fioname].name == userA2.address) {
                    //console.log('bundleeligiblecountdown: ', fionames.rows[fioname].bundleeligiblecountdown);
                    bundleCount = fionames.rows[fioname].bundleeligiblecountdown;
                }
            }
            expect(bundleCount).to.equal(100);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it('Call get_table_rows from fionames to get bundles remaining for userA1. Verify 98 bundles', async () => {
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
                if (fionames.rows[fioname].name == userA1.address) {
                    //console.log('bundleeligiblecountdown: ', fionames.rows[fioname].bundleeligiblecountdown);
                    bundleCount = fionames.rows[fioname].bundleeligiblecountdown;
                }
            }
            expect(bundleCount).to.equal(98);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Use up all of userA2's bundles with 50 record_obt_data transactions`, async () => {
        for (i = 0; i < 50; i++) {
            try {
                const result = await userA2.sdk.genericAction('recordObtData', {
                    fioRequestId: '',
                    payerFioAddress: userA2.address,
                    payeeFioAddress: userA1.address,
                    payerTokenPublicAddress: userA2.publicKey,
                    payeeTokenPublicAddress: userA1.publicKey,
                    amount: 5000000000,
                    chainCode: "FIO",
                    tokenCode: "FIO",
                    status: '',
                    obtId: '',
                    maxFee: config.api.record_obt_data.fee,
                    technologyProviderId: '',
                    payeeFioPublicKey: userA2.publicKey,
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

    it('Call get_table_rows from fionames to get bundles remaining for userA2. Verify 0 bundles', async () => {
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
                if (fionames.rows[fioname].name == userA2.address) {
                    //console.log('bundleeligiblecountdown: ', fionames.rows[fioname].bundleeligiblecountdown);
                    bundleCount = fionames.rows[fioname].bundleeligiblecountdown;
                }
            }
            expect(bundleCount).to.equal(0);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`userA2 requests funds from userA1 with no bundles`, async () => {
        try {
            const result = await userA2.sdk.genericAction('recordObtData', {
                fioRequestId: '',
                payerFioAddress: userA2.address,
                payeeFioAddress: userA1.address,
                payerTokenPublicAddress: userA2.publicKey,
                payeeTokenPublicAddress: userA1.publicKey,
                amount: payment,
                chainCode: "FIO",
                tokenCode: "FIO",
                status: '',
                obtId: '',
                maxFee: config.api.record_obt_data.fee,
                technologyProviderId: '',
                payeeFioPublicKey: userA1.publicKey,
                memo: obtMemo,
                hash: '',
                offLineUrl: ''
            })
            //console.log('Result: ', result)
            expect(result.status).to.equal('sent_to_blockchain')
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get balance for userA2`, async () => {
        try {
            const result = await userA2.sdk.genericAction('getFioBalance', {
                fioPublicKey: userA2.publicKey
            })
            userA2Balance = result.balance
            //console.log('userB1 fio balance', result)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it('Transfer entire balance for userA2 to userA1 to register address', async () => {
        try {
            const result = await userA2.sdk.genericAction('transferTokens', {
                payeeFioPublicKey: userA1.publicKey,
                amount: userA2Balance - config.api.transfer_tokens_pub_key.fee,
                maxFee: config.api.transfer_tokens_pub_key.fee,
                walletFioAddress: ''
            })
            //console.log('Result: ', result)
            expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })

    it(`Verify balance for userA2 = 0`, async () => {
        try {
            const result = await userA2.sdk.genericAction('getFioBalance', {
                fioPublicKey: userA2.publicKey
            })
            //console.log('userB1 fio balance', result)
            expect(result.balance).to.equal(0)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`userA2 requests funds from userA1 with no bundles and no FIO`, async () => {
        try {
            const result = await userA2.sdk.genericAction('recordObtData', {
                fioRequestId: '',
                payerFioAddress: userA2.address,
                payeeFioAddress: userA1.address,
                payerTokenPublicAddress: userA2.publicKey,
                payeeTokenPublicAddress: userA1.publicKey,
                amount: payment,
                chainCode: "FIO",
                tokenCode: "FIO",
                status: '',
                obtId: '',
                maxFee: config.api.record_obt_data.fee,
                technologyProviderId: '',
                payeeFioPublicKey: userA1.publicKey,
                memo: obtMemo,
                hash: '',
                offLineUrl: ''
            })
            console.log('Result: ', result);
            expect(result).to.equal(null);
        } catch (err) {
            //console.log('Error', err.json);
            expect(err.json.fields[0].error).to.equal(config.error.insufficientFunds);
        }
    })
})

describe(`B. OBT Data Error Check`, () => {

    let userA1, userA2, userA3
    const payment = 5000000000 // 5 FIO
    const requestMemo = 'Memo Test'
    const obtMemo = 'Memo in OBT response to request'

    it(`Create users`, async () => {
        userA1 = await newUser(faucet);
        userA2 = await newUser(faucet);
        userA3 = await newUser(faucet);
    })

    it(`badly formatted payer_fio_address`, async () => {
        try {
            const result = await userA1.sdk.genericAction('recordObtData', {
                fioRequestId: '',
                payerFioAddress: 'userA1.address',
                payeeFioAddress: userA2.address,
                payerTokenPublicAddress: userA1.publicKey,
                payeeTokenPublicAddress: userA2.publicKey,
                amount: payment,
                chainCode: "FIO",
                tokenCode: "FIO",
                status: '',
                obtId: '',
                maxFee: config.api.record_obt_data.fee,
                technologyProviderId: '',
                payeeFioPublicKey: userA2.publicKey,
                memo: obtMemo,
                hash: '',
                offLineUrl: ''
            })
            //console.log('Result: ', result)
            expect(result).to.equal(null)
        } catch (err) {
            expect(err.list[0].message).to.equal(config.error.invalidPayerFioAddress)
        }
    })

    it(`badly formatted payee_fio_address`, async () => {
        try {
            const result = await userA1.sdk.genericAction('recordObtData', {
                fioRequestId: '',
                payerFioAddress: userA1.address,
                payeeFioAddress: 'userA2.address',
                payerTokenPublicAddress: userA1.publicKey,
                payeeTokenPublicAddress: userA2.publicKey,
                amount: payment,
                chainCode: "FIO",
                tokenCode: "FIO",
                status: '',
                obtId: '',
                maxFee: config.api.record_obt_data.fee,
                technologyProviderId: '',
                payeeFioPublicKey: userA2.publicKey,
                memo: obtMemo,
                hash: '',
                offLineUrl: ''
            })
            //console.log('Result: ', result)
            expect(result).to.equal(null)
        } catch (err) {
            expect(err.list[0].message).to.equal(config.error.invalidPayeeFioAddress)
        }
    })

    it(`Add new FIO Address to userA1`, async () => {
        try {
            const result = await userA1.sdk.genericAction('addPublicAddresses', {
                fioAddress: userA1.address,
                publicAddresses: [
                    {
                        chain_code: 'FIO',
                        token_code: 'FIO',
                        public_address: userA3.publicKey,
                    }
                ],
                maxFee: config.api.add_pub_address.fee,
                technologyProviderId: ''
            })
            //console.log('Result:', result)
            expect(result.status).to.equal('OK')
        } catch (err) {
            console.log('Error', err)
            //expect(err).to.equal(null)
        }
    })

    it(`payee_fio_public_key that does not own the the payee_fio_address`, async () => {
        try {
            const result = await userA2.sdk.genericAction('recordObtData', {
                fioRequestId: '',
                payerFioAddress: userA2.address,
                payeeFioAddress: userA1.address,
                payerTokenPublicAddress: userA2.publicKey,
                payeeTokenPublicAddress: userA1.publicKey,
                amount: payment,
                chainCode: "FIO",
                tokenCode: "FIO",
                status: '',
                obtId: '',
                maxFee: config.api.record_obt_data.fee,
                technologyProviderId: '',
                payeeFioPublicKey: userA1.publicKey,
                memo: obtMemo,
                hash: '',
                offLineUrl: ''
            })
            //console.log('Result: ', result)
            expect(result.status).to.equal('sent_to_blockchain')
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })
})

describe(`C. Test get_obt_data`, () => {

    let userA1, userA2, timeStamp
    const payment = 5000000000 // 5 FIO
    const obtMemo = 'Memo in OBT payment'

    it(`Create users`, async () => {
        userA1 = await newUser(faucet);
        userA2 = await newUser(faucet);
    })

    it(`Wait a few seconds.`, async () => { await timeout(3000) })

    it(`get_obt_data for userA1 (payer) when no records exist. limit = '', offset = ''. Expect: ${config.error.noFioRequests}`, async () => {
        try {
            const result = await userA1.sdk.genericAction('getObtData', {
                limit: '',
                offset: ''
            })
            console.log('result: ', result);
            expect(result).to.equal(null)
        } catch (err) {
            //console.log('Error: ', err.json)
            expect(err.json.message).to.equal(config.error.noFioRequests)
        }
    })

    it(`get_obt_data for userA1 (payer) when no records exist. limit = 0, offset = 100. Expect: ${config.error.noFioRequests}`, async () => {
        try {
            const result = await userA1.sdk.genericAction('getObtData', {
                limit: 0,
                offset: 100
            })
            console.log('result: ', result);
            expect(result).to.equal(null)
        } catch (err) {
            //console.log('Error: ', err.json)
            expect(err.json.message).to.equal(config.error.noFioRequests)
        }
    })

    it(`get_obt_data for userA1 (payer) when no records exist. limit = -1, offset = 0. Expect: ${config.error.invalidLimit}`, async () => {
        try {
            const result = await userA1.sdk.genericAction('getObtData', {
                limit: -1,
                offset: 0
            })
            console.log('result: ', result);
            //console.log('content: ', result.obt_data_records[0].content);
            expect(result.obt_data_records.length).to.equal(2);
        } catch (err) {
            //console.log('Error: ', err.json)
            expect(err.json.fields[0].error).to.equal(config.error.invalidLimit)
        }
    })

    it(`userA1 sends recordObtData to userA2`, async () => {
        try {
            const result = await userA1.sdk.genericAction('recordObtData', {
                fioRequestId: '',
                payerFioAddress: userA1.address,
                payeeFioAddress: userA2.address,
                payerTokenPublicAddress: userA1.publicKey,
                payeeTokenPublicAddress: userA2.publicKey,
                amount: payment,
                chainCode: "FIO",
                tokenCode: "FIO",
                status: '',
                obtId: '',
                maxFee: config.api.record_obt_data.fee,
                technologyProviderId: '',
                payeeFioPublicKey: userA2.publicKey,
                memo: obtMemo,
            })
            //console.log('Result: ', result)
            timeStamp = result.time_stamp
            expect(result.status).to.equal('sent_to_blockchain')
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`userA1 sends second recordObtData to userA2`, async () => {
        try {
            const result = await userA1.sdk.genericAction('recordObtData', {
                fioRequestId: '',
                payerFioAddress: userA1.address,
                payeeFioAddress: userA2.address,
                payerTokenPublicAddress: userA1.publicKey,
                payeeTokenPublicAddress: userA2.publicKey,
                amount: payment,
                chainCode: "FIO",
                tokenCode: "FIO",
                status: '',
                obtId: '',
                maxFee: config.api.record_obt_data.fee,
                technologyProviderId: '',
                payeeFioPublicKey: userA2.publicKey,
                memo: "second obt",
            })
            //console.log('Result: ', result)
            timeStamp = result.time_stamp
            expect(result.status).to.equal('sent_to_blockchain')
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`Wait a few seconds.`, async () => { await timeout(5000) })

    it(`get_obt_data for userA1 (payer)`, async () => {
        try {
            const result = await userA1.sdk.genericAction('getObtData', {
                limit: '',
                offset: ''
            })
            //console.log('result: ', result);
            //console.log('content: ', result.obt_data_records[0].content);
            expect(result.obt_data_records.length).to.equal(2);
            expect(result.obt_data_records[0].fio_request_id).to.equal(0);
            expect(result.obt_data_records[0].payer_fio_address).to.equal(userA1.address);
            expect(result.obt_data_records[0].payee_fio_address).to.equal(userA2.address);
            expect(result.obt_data_records[0].payer_fio_public_key).to.equal(userA1.publicKey);
            expect(result.obt_data_records[0].payee_fio_public_key).to.equal(userA2.publicKey);
            expect(result.obt_data_records[0].status).to.equal('sent_to_blockchain');
            expect(result.obt_data_records[0].content.memo).to.equal(obtMemo);
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`get_obt_data for userA2 (payee) (BD-2305)`, async () => {
        try {
            const result = await userA2.sdk.genericAction('getObtData', {
                limit: '',
                offset: ''
            })
            //console.log('result: ', result);
            //console.log('content: ', result.obt_data_records[0].content);
            expect(result.obt_data_records.length).to.equal(2);
            expect(result.obt_data_records[0].fio_request_id).to.equal(0);
            expect(result.obt_data_records[0].payer_fio_address).to.equal(userA1.address);
            expect(result.obt_data_records[0].payee_fio_address).to.equal(userA2.address);
            expect(result.obt_data_records[0].payer_fio_public_key).to.equal(userA1.publicKey);
            expect(result.obt_data_records[0].payee_fio_public_key).to.equal(userA2.publicKey);
            expect(result.obt_data_records[0].status).to.equal('sent_to_blockchain');
            expect(result.obt_data_records[0].content.memo).to.equal(obtMemo);
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

})