require('mocha')
const {expect} = require('chai')
const { newUser, fetchJson, timeout, callFioApi, randStr, consumeRemainingBundles, getBundleCount} = require('../utils.js');
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

    it('Confirm bundles remaining', async () => {
        const bundleCount = await getBundleCount(userA2.sdk);
        expect(bundleCount).to.equal(100);
    })

    it('Confirm bundles remaining', async () => {
        const bundleCount = await getBundleCount(userA1.sdk);
        expect(bundleCount).to.equal(98);
    })

    it(`Use up all of userA2's bundles with 50 record_obt_data transactions`, async () => {
        for (i = 0; i < 50; i++) {
            try {
                const result = await userA2.sdk.genericAction('recordObtData', {
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

    it('Confirm bundles remaining', async () => {
        const bundleCount = await getBundleCount(userA2.sdk);
        expect(bundleCount).to.equal(0);
    })

    it(`userA2 requests funds from userA1 with no bundles`, async () => {
        try {
            const result = await userA2.sdk.genericAction('recordObtData', {
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
            expect(result).to.have.any.keys('status');
            expect(result).to.have.any.keys('fee_collected');
            expect(result).to.have.any.keys('block_num');
            expect(result).to.have.any.keys('transaction_id');
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

describe(`D. Test bundles, fees, and RAM for dynamic content size`, () => {

    /**
     * FIO Requests now have the following logic:
     * 
     *   BASECONTENTAMOUNT = 1000
     * 
     *   if(content.size() >= BASECONTENTAMOUNT){ feeMultiplier = ( content.size() / BASECONTENTAMOUNT) + 1; }
     *   uint64_t bundleAmount = 2 * feeMultiplier;
     * 
     *   RAM Increment =                 
     *    if (feeMultiplier > 1) {
     *        newFundsFee = RECORDOBTRAM + ((RECORDOBTRAM * feeMultiplier) / 2);
     *    }
     * 
     * NOTE: This tests calculates content size using getCipherContent. This is different from how the Contracts calculate size.
     * So, if you get to close to the 1000 byte number, you may get a false failure. So, the test adds some buffer above and below
     * the 1000 byte cutoffs.
     */

    let user1, bundleCount, userBalance, user1Ram, user2, user2Ram, user3, requestId, contentSize, feeMultiplier, new_funds_request_fee
    const payment = 1000000000; // 1 FIO

    const BASECONTENTAMOUNT = 1000;
    const bundleBase = 2;

    const requestMemoBase = randStr(620);  // A memo field of 620 chars (bytes) makes the total Content Field of approx 940 bytes
    const requestMemoBaseOver = randStr(680);            // Content = 1004, multiplier = 2
    const requestMemoBaseMid = randStr(1350);        // Content = 1920, multiplier = 2
    const requestMemoBaseMidOver = randStr(1600);        // Content = 2240, multiplier = 3
    const requestMemoBaseLarge = randStr(5700);    // Content = 7724, multiplier = 8
    const requestMemoBaseLargeOver = randStr(5900);    // Content = 7980, multiplier = 8  = Transaction too large

    payeeTokenPublicAddressMin = '1';

    it(`Create users`, async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
        user3 = await newUser(faucet);
    })

    it(`Get bundle count for user1 `, async () => {
        const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey })
        bundleCount = result.fio_addresses[0].remaining_bundled_tx;
        expect(bundleCount).to.be.greaterThan(0)
    })

    it(`Get RAM quota for user1`, async () => {
        try {
            const json = {
                "account_name": user1.account
            }
            result = await callFioApi("get_account", json);
            user1Ram = result.ram_quota;
            //console.log('Ram quota: ', result.ram_quota);
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`user1 sends recordObtData to user2 with memo of length ${requestMemoBase.length}`, async () => {
        try {
            const content = {
                payer_public_address: payeeTokenPublicAddressMin,
                payee_public_address: payeeTokenPublicAddressMin,
                amount: payment,
                chain_code: 'FIO',
                token_code: 'FIO',
                status: '',
                obt_id: '',
                memo: requestMemoBase,
                hash: '',
                offline_url: ''
            }

            const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user1.privateKey, user1.publicKey);
            feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
            //console.log('           Content length: ', cipherContent.length);

            const result = await user1.sdk.genericAction('recordObtData', {
                payerFioAddress: user1.address,
                payeeFioAddress: user2.address,
                payerTokenPublicAddress: content.payer_public_address,
                payeeTokenPublicAddress: content.payee_public_address,
                amount: content.amount,
                chainCode: content.chain_code,
                tokenCode: content.token_code,
                status: content.status,
                obtId: content.obt_id,
                maxFee: config.maxFee,
                technologyProviderId: '',
                payeeFioPublicKey: user2.publicKey,
                memo: content.memo,
                hash: '',
                offLineUrl: ''
            })
            //console.log('result: ', result)
            requestId = result.fio_request_id;
            expect(result.status).to.equal('sent_to_blockchain');
            expect(feeMultiplier).to.equal(1);
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get bundle count for user1.`, async () => {
        let bundleCountPrev = bundleCount;
        const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey })
        //console.log('Result: ', result)
        bundleCount = result.fio_addresses[0].remaining_bundled_tx;
        expect(bundleCount).to.equal(bundleCountPrev - (bundleBase * feeMultiplier))
    })

    it(`Confirm RAM quota for user1 was incremented by multiplier`, async () => {
        try {
            let prevRam = user1Ram;
            const json = {
                "account_name": user1.account
            }
            result = await callFioApi("get_account", json);
            user1Ram = result.ram_quota;
            expect(user1Ram).to.equal(prevRam + (config.RAM.RECORDOBTRAM * feeMultiplier));
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`user1 sends recordObtData to user2 with memo of length ${requestMemoBaseOver.length}`, async () => {
        try {
            const content = {
                payer_public_address: payeeTokenPublicAddressMin,
                payee_public_address: payeeTokenPublicAddressMin,
                amount: payment,
                chain_code: 'FIO',
                token_code: 'FIO',
                status: '',
                obt_id: '',
                memo: requestMemoBaseOver,
                hash: '',
                offline_url: ''
            }

            const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user1.privateKey, user1.publicKey);
            feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
            console.log('           Content length: ', cipherContent.length);

            const result = await user1.sdk.genericAction('recordObtData', {
                payerFioAddress: user1.address,
                payeeFioAddress: user2.address,
                payerTokenPublicAddress: content.payer_public_address,
                payeeTokenPublicAddress: content.payee_public_address,
                amount: content.amount,
                chainCode: content.chain_code,
                tokenCode: content.token_code,
                status: content.status,
                obtId: content.obt_id,
                maxFee: config.maxFee,
                technologyProviderId: '',
                payeeFioPublicKey: user2.publicKey,
                memo: content.memo,
                hash: '',
                offLineUrl: ''
            })
            //console.log('result: ', result)
            requestId = result.fio_request_id;
            expect(result.status).to.equal('sent_to_blockchain');
            expect(feeMultiplier).to.equal(2);
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get bundle count for user1.`, async () => {
        let bundleCountPrev = bundleCount;
        const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey })
        //console.log('Result: ', result)
        bundleCount = result.fio_addresses[0].remaining_bundled_tx;
        expect(bundleCount).to.equal(bundleCountPrev - (bundleBase * 2))
    })

    it(`Confirm RAM quota for user1 was incremented by multiplier`, async () => {
        try {
            let prevRam = user1Ram;
            const json = {
                "account_name": user1.account
            }
            result = await callFioApi("get_account", json);
            user1Ram = result.ram_quota;
            //console.log('Ram quota: ', result.ram_quota);
            expect(user1Ram).to.equal(prevRam + config.RAM.RECORDOBTRAM + (config.RAM.RECORDOBTRAM * feeMultiplier) / 2);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`user1 sends recordObtData to user2 with memo of length ${requestMemoBaseMid.length}`, async () => {
        try {
            const content = {
                payer_public_address: payeeTokenPublicAddressMin,
                payee_public_address: payeeTokenPublicAddressMin,
                amount: payment,
                chain_code: 'FIO',
                token_code: 'FIO',
                status: '',
                obt_id: '',
                memo: requestMemoBaseMid,
                hash: '',
                offline_url: ''
            }

            const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user1.privateKey, user1.publicKey);
            feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
            console.log('           Content length: ', cipherContent.length);

            const result = await user1.sdk.genericAction('recordObtData', {
                payerFioAddress: user1.address,
                payeeFioAddress: user2.address,
                payerTokenPublicAddress: content.payer_public_address,
                payeeTokenPublicAddress: content.payee_public_address,
                amount: content.amount,
                chainCode: content.chain_code,
                tokenCode: content.token_code,
                status: content.status,
                obtId: content.obt_id,
                maxFee: config.maxFee,
                technologyProviderId: '',
                payeeFioPublicKey: user2.publicKey,
                memo: content.memo,
                hash: '',
                offLineUrl: ''
            })
            //console.log('result: ', result)
            requestId = result.fio_request_id;
            expect(result.status).to.equal('sent_to_blockchain');
            expect(feeMultiplier).to.equal(2);
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get bundle count for user1.`, async () => {
        let bundleCountPrev = bundleCount;
        const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey })
        //console.log('Result: ', result)
        bundleCount = result.fio_addresses[0].remaining_bundled_tx;
        expect(bundleCount).to.equal(bundleCountPrev - (bundleBase * feeMultiplier))
    })

    it(`Confirm RAM quota for user1 was incremented by multiplier`, async () => {
        try {
            let prevRam = user1Ram;
            const json = {
                "account_name": user1.account
            }
            result = await callFioApi("get_account", json);
            user1Ram = result.ram_quota;
            //console.log('Ram quota: ', result.ram_quota);
            expect(user1Ram).to.equal(prevRam + config.RAM.RECORDOBTRAM + (config.RAM.RECORDOBTRAM * feeMultiplier) / 2);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`user1 sends recordObtData to user2 with memo of length ${requestMemoBaseMidOver.length}`, async () => {
        try {
            const content = {
                payer_public_address: payeeTokenPublicAddressMin,
                payee_public_address: payeeTokenPublicAddressMin,
                amount: payment,
                chain_code: 'FIO',
                token_code: 'FIO',
                status: '',
                obt_id: '',
                memo: requestMemoBaseMidOver,
                hash: '',
                offline_url: ''
            }

            const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user1.privateKey, user1.publicKey);
            feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
            console.log('           Content length: ', cipherContent.length);

            const result = await user1.sdk.genericAction('recordObtData', {
                payerFioAddress: user1.address,
                payeeFioAddress: user2.address,
                payerTokenPublicAddress: content.payer_public_address,
                payeeTokenPublicAddress: content.payee_public_address,
                amount: content.amount,
                chainCode: content.chain_code,
                tokenCode: content.token_code,
                status: content.status,
                obtId: content.obt_id,
                maxFee: config.maxFee,
                technologyProviderId: '',
                payeeFioPublicKey: user2.publicKey,
                memo: content.memo,
                hash: '',
                offLineUrl: ''
            })
            //console.log('result: ', result)
            requestId = result.fio_request_id;
            expect(result.status).to.equal('sent_to_blockchain');
            expect(feeMultiplier).to.equal(3);
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get bundle count for user1.`, async () => {
        let bundleCountPrev = bundleCount;
        const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey })
        //console.log('Result: ', result)
        bundleCount = result.fio_addresses[0].remaining_bundled_tx;
        expect(bundleCount).to.equal(bundleCountPrev - (bundleBase * feeMultiplier))
    })

    it(`Confirm RAM quota for user1 was incremented by multiplier`, async () => {
        try {
            let prevRam = user1Ram;
            const json = {
                "account_name": user1.account
            }
            result = await callFioApi("get_account", json);
            user1Ram = result.ram_quota;
            //console.log('Ram quota: ', result.ram_quota);
            expect(user1Ram).to.equal(prevRam + config.RAM.RECORDOBTRAM + (config.RAM.RECORDOBTRAM * feeMultiplier) / 2);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`(push_transaction) Add 100 * 5 = 500 bundles to user1`, async () => {
        try {
            const result = await user1.sdk.genericAction('pushTransaction', {
                action: 'addbundles',
                account: 'fio.address',
                data: {
                    fio_address: user1.address,
                    bundle_sets: 5,
                    max_fee: config.maxFee,
                    technologyProviderId: ''
                }
            })
            //console.log('Result: ', result);
            bundleCount = bundleCount + 500;
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })

    it(`user1 sends recordObtData to user2 with memo of length ${requestMemoBaseLarge.length}`, async () => {
        try {
            const content = {
                payer_public_address: payeeTokenPublicAddressMin,
                payee_public_address: payeeTokenPublicAddressMin,
                amount: payment,
                chain_code: 'FIO',
                token_code: 'FIO',
                status: '',
                obt_id: '',
                memo: requestMemoBaseLarge,
                hash: '',
                offline_url: ''
            }

            const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user1.privateKey, user1.publicKey);
            feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
            console.log('           Content length: ', cipherContent.length);

            const result = await user1.sdk.genericAction('recordObtData', {
                payerFioAddress: user1.address,
                payeeFioAddress: user2.address,
                payerTokenPublicAddress: content.payer_public_address,
                payeeTokenPublicAddress: content.payee_public_address,
                amount: content.amount,
                chainCode: content.chain_code,
                tokenCode: content.token_code,
                status: content.status,
                obtId: content.obt_id,
                maxFee: config.maxFee,
                technologyProviderId: '',
                payeeFioPublicKey: user2.publicKey,
                memo: content.memo,
                hash: '',
                offLineUrl: ''
            })
            //console.log('result: ', result)
            requestId = result.fio_request_id;
            expect(result.status).to.equal('sent_to_blockchain');
            expect(feeMultiplier).to.equal(8);
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get bundle count for user1.`, async () => {
        let bundleCountPrev = bundleCount;
        const result = await user1.sdk.genericAction('getFioNames', { fioPublicKey: user1.publicKey })
        //console.log('Result: ', result)
        bundleCount = result.fio_addresses[0].remaining_bundled_tx;
        expect(bundleCount).to.equal(bundleCountPrev - (bundleBase * feeMultiplier))
    })

    it(`Confirm RAM quota for user1 was incremented by multiplier`, async () => {
        try {
            let prevRam = user1Ram;
            const json = {
                "account_name": user1.account
            }
            result = await callFioApi("get_account", json);
            user1Ram = result.ram_quota;
            //console.log('Ram quota: ', result.ram_quota);
            expect(user1Ram).to.equal(prevRam + config.RAM.RECORDOBTRAM + (config.RAM.RECORDOBTRAM * feeMultiplier) / 2);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`user1 sends recordObtData to user2 with memo of length ${requestMemoBaseLargeOver.length}. Expect 'Transaction is too large`, async () => {
        try {
            const content = {
                payer_public_address: payeeTokenPublicAddressMin,
                payee_public_address: payeeTokenPublicAddressMin,
                amount: payment,
                chain_code: 'FIO',
                token_code: 'FIO',
                status: '',
                obt_id: '',
                memo: requestMemoBaseLargeOver,
                hash: '',
                offline_url: ''
            }

            const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user1.privateKey, user1.publicKey);
            feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
            console.log('           Content length: ', cipherContent.length);

            const result = await user1.sdk.genericAction('recordObtData', {
                payerFioAddress: user1.address,
                payeeFioAddress: user2.address,
                payerTokenPublicAddress: content.payer_public_address,
                payeeTokenPublicAddress: content.payee_public_address,
                amount: content.amount,
                chainCode: content.chain_code,
                tokenCode: content.token_code,
                status: content.status,
                obtId: content.obt_id,
                maxFee: config.maxFee,
                technologyProviderId: '',
                payeeFioPublicKey: user2.publicKey,
                memo: content.memo,
                hash: '',
                offLineUrl: ''
            })
            //console.log('result: ', result)
            requestId = result.fio_request_id;
            expect(result.status).to.equal(null)
        } catch (err) {
            //console.log('Error: ', err)
            expect(err.json.fields[0].error).to.equal('Transaction is too large')
        }
    })

    it(`consume user2's remaining bundled transactions`, async () => {
        try {
            await consumeRemainingBundles(user2, user3);
        } catch (err) {
            expect(err).to.equal(null);
        } finally {
            let bundleCount = await getBundleCount(user2.sdk);
            expect(bundleCount).to.equal(0);
        }
    });

    it('Get new_funds_request fee', async () => {
        try {
            result = await user2.sdk.getFee('new_funds_request', user2.address);
            new_funds_request_fee = result.fee;
            //console.log('new_funds_request_fee: ', new_funds_request_fee);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Get balance for user2`, async () => {
        try {
            const result = await user2.sdk.genericAction('getFioBalance', {
                fioPublicKey: user2.publicKey
            })
            userBalance = result.balance
            //console.log('userBalance: ', userBalance);
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get RAM quota for user2`, async () => {
        try {
            const json = {
                "account_name": user2.account
            }
            result = await callFioApi("get_account", json);
            user2Ram = result.ram_quota;
            //console.log('Ram quota: ', result.ram_quota);
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`user2 sends recordObtData to user3 with memo of length ${requestMemoBase.length}`, async () => {
        try {
            const content = {
                payer_public_address: payeeTokenPublicAddressMin,
                payee_public_address: payeeTokenPublicAddressMin,
                amount: payment,
                chain_code: 'FIO',
                token_code: 'FIO',
                status: '',
                obt_id: '',
                memo: requestMemoBase,
                hash: '',
                offline_url: ''
            }

            const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user2.privateKey, user2.publicKey);
            feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
            //console.log('           Content length: ', cipherContent.length);

            const result = await user2.sdk.genericAction('recordObtData', {
                payerFioAddress: user2.address,
                payeeFioAddress: user3.address,
                payerTokenPublicAddress: content.payer_public_address,
                payeeTokenPublicAddress: content.payee_public_address,
                amount: content.amount,
                chainCode: content.chain_code,
                tokenCode: content.token_code,
                status: content.status,
                obtId: content.obt_id,
                maxFee: config.maxFee,
                technologyProviderId: '',
                payeeFioPublicKey: user3.publicKey,
                memo: content.memo,
                hash: '',
                offLineUrl: ''
            })
            //console.log('result: ', result)
            requestId = result.fio_request_id;
            expect(result.status).to.equal('sent_to_blockchain');
            expect(feeMultiplier).to.equal(1);
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get balance for user2`, async () => {
        let userBalancePrev = userBalance;
        try {
            const result = await user2.sdk.genericAction('getFioBalance', {
                fioPublicKey: user2.publicKey
            })
            userBalance = result.balance
            //console.log('userBalance: ', userBalance);
            expect(userBalance).to.equal(userBalancePrev - (new_funds_request_fee * feeMultiplier))
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Confirm RAM quota for user2 was incremented by multiplier`, async () => {
        try {
            let prevRam = user2Ram;
            const json = {
                "account_name": user2.account
            }
            result = await callFioApi("get_account", json);
            user2Ram = result.ram_quota;
            //console.log('Ram quota: ', result.ram_quota);
            expect(user2Ram).to.equal(prevRam + (config.RAM.RECORDOBTRAM * feeMultiplier));
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`user2 sends recordObtData to user3 with memo of length ${requestMemoBaseOver.length}`, async () => {
        try {
            const content = {
                payer_public_address: payeeTokenPublicAddressMin,
                payee_public_address: payeeTokenPublicAddressMin,
                amount: payment,
                chain_code: 'FIO',
                token_code: 'FIO',
                status: '',
                obt_id: '',
                memo: requestMemoBaseOver,
                hash: '',
                offline_url: ''
            }

            const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user2.privateKey, user2.publicKey);
            feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
            //console.log('           Content length: ', cipherContent.length);

            const result = await user2.sdk.genericAction('recordObtData', {
                payerFioAddress: user2.address,
                payeeFioAddress: user3.address,
                payerTokenPublicAddress: content.payer_public_address,
                payeeTokenPublicAddress: content.payee_public_address,
                amount: content.amount,
                chainCode: content.chain_code,
                tokenCode: content.token_code,
                status: content.status,
                obtId: content.obt_id,
                maxFee: config.maxFee,
                technologyProviderId: '',
                payeeFioPublicKey: user3.publicKey,
                memo: content.memo,
                hash: '',
                offLineUrl: ''
            })
            //console.log('result: ', result)
            requestId = result.fio_request_id;
            expect(result.status).to.equal('sent_to_blockchain');
            expect(feeMultiplier).to.equal(2);
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get balance for user2`, async () => {
        let userBalancePrev = userBalance;
        try {
            const result = await user2.sdk.genericAction('getFioBalance', {
                fioPublicKey: user2.publicKey
            })
            userBalance = result.balance
            //console.log('userBalance: ', userBalance);
            expect(userBalance).to.equal(userBalancePrev - (new_funds_request_fee * feeMultiplier))
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Confirm RAM quota for user2 was incremented by multiplier`, async () => {
        try {
            let prevRam = user2Ram;
            const json = {
                "account_name": user2.account
            }
            result = await callFioApi("get_account", json);
            user2Ram = result.ram_quota;
            //console.log('Ram quota: ', result.ram_quota);
            expect(user2Ram).to.equal(prevRam + config.RAM.RECORDOBTRAM + (config.RAM.RECORDOBTRAM * feeMultiplier) / 2)
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`user2 sends recordObtData to user3 with memo of length ${requestMemoBaseMid.length}`, async () => {
        try {
            const content = {
                payer_public_address: payeeTokenPublicAddressMin,
                payee_public_address: payeeTokenPublicAddressMin,
                amount: payment,
                chain_code: 'FIO',
                token_code: 'FIO',
                status: '',
                obt_id: '',
                memo: requestMemoBaseMid,
                hash: '',
                offline_url: ''
            }

            const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user2.privateKey, user2.publicKey);
            feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
            //console.log('           Content length: ', cipherContent.length);

            const result = await user2.sdk.genericAction('recordObtData', {
                payerFioAddress: user2.address,
                payeeFioAddress: user3.address,
                payerTokenPublicAddress: content.payer_public_address,
                payeeTokenPublicAddress: content.payee_public_address,
                amount: content.amount,
                chainCode: content.chain_code,
                tokenCode: content.token_code,
                status: content.status,
                obtId: content.obt_id,
                maxFee: config.maxFee,
                technologyProviderId: '',
                payeeFioPublicKey: user3.publicKey,
                memo: content.memo,
                hash: '',
                offLineUrl: ''
            })
            //console.log('result: ', result)
            requestId = result.fio_request_id;
            expect(result.status).to.equal('sent_to_blockchain');
            expect(feeMultiplier).to.equal(2);
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get balance for user2`, async () => {
        let userBalancePrev = userBalance;
        try {
            const result = await user2.sdk.genericAction('getFioBalance', {
                fioPublicKey: user2.publicKey
            })
            userBalance = result.balance
            //console.log('userBalance: ', userBalance);
            expect(userBalance).to.equal(userBalancePrev - (new_funds_request_fee * feeMultiplier))
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Confirm RAM quota for user2 was incremented by multiplier`, async () => {
        try {
            let prevRam = user2Ram;
            const json = {
                "account_name": user2.account
            }
            result = await callFioApi("get_account", json);
            user2Ram = result.ram_quota;
            //console.log('Ram quota: ', result.ram_quota);
            expect(user2Ram).to.equal(prevRam + config.RAM.RECORDOBTRAM + (config.RAM.RECORDOBTRAM * feeMultiplier) / 2)
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`user2 sends recordObtData to user3 with memo of length ${requestMemoBaseMidOver.length}`, async () => {
        try {
            const content = {
                payer_public_address: payeeTokenPublicAddressMin,
                payee_public_address: payeeTokenPublicAddressMin,
                amount: payment,
                chain_code: 'FIO',
                token_code: 'FIO',
                status: '',
                obt_id: '',
                memo: requestMemoBaseMidOver,
                hash: '',
                offline_url: ''
            }

            const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user2.privateKey, user2.publicKey);
            feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
            //console.log('           Content length: ', cipherContent.length);

            const result = await user2.sdk.genericAction('recordObtData', {
                payerFioAddress: user2.address,
                payeeFioAddress: user3.address,
                payerTokenPublicAddress: content.payer_public_address,
                payeeTokenPublicAddress: content.payee_public_address,
                amount: content.amount,
                chainCode: content.chain_code,
                tokenCode: content.token_code,
                status: content.status,
                obtId: content.obt_id,
                maxFee: config.maxFee,
                technologyProviderId: '',
                payeeFioPublicKey: user3.publicKey,
                memo: content.memo,
                hash: '',
                offLineUrl: ''
            })
            //console.log('result: ', result)
            requestId = result.fio_request_id;
            expect(result.status).to.equal('sent_to_blockchain');
            expect(feeMultiplier).to.equal(3);
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get balance for user2`, async () => {
        let userBalancePrev = userBalance;
        try {
            const result = await user2.sdk.genericAction('getFioBalance', {
                fioPublicKey: user2.publicKey
            })
            userBalance = result.balance
            //console.log('userBalance: ', userBalance);
            expect(userBalance).to.equal(userBalancePrev - (new_funds_request_fee * feeMultiplier))
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Confirm RAM quota for user2 was incremented by multiplier`, async () => {
        try {
            let prevRam = user2Ram;
            const json = {
                "account_name": user2.account
            }
            result = await callFioApi("get_account", json);
            user2Ram = result.ram_quota;
            //console.log('Ram quota: ', result.ram_quota);
            expect(user2Ram).to.equal(prevRam + config.RAM.RECORDOBTRAM + (config.RAM.RECORDOBTRAM * feeMultiplier) / 2)
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`user2 sends recordObtData to user3 with memo of length ${requestMemoBaseLarge.length}`, async () => {
        try {
            const content = {
                payer_public_address: payeeTokenPublicAddressMin,
                payee_public_address: payeeTokenPublicAddressMin,
                amount: payment,
                chain_code: 'FIO',
                token_code: 'FIO',
                status: '',
                obt_id: '',
                memo: requestMemoBaseLarge,
                hash: '',
                offline_url: ''
            }

            const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user2.privateKey, user2.publicKey);
            feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
            //console.log('           Content length: ', cipherContent.length);

            const result = await user2.sdk.genericAction('recordObtData', {
                payerFioAddress: user2.address,
                payeeFioAddress: user3.address,
                payerTokenPublicAddress: content.payer_public_address,
                payeeTokenPublicAddress: content.payee_public_address,
                amount: content.amount,
                chainCode: content.chain_code,
                tokenCode: content.token_code,
                status: content.status,
                obtId: content.obt_id,
                maxFee: config.maxFee,
                technologyProviderId: '',
                payeeFioPublicKey: user3.publicKey,
                memo: content.memo,
                hash: '',
                offLineUrl: ''
            })
            //console.log('result: ', result)
            requestId = result.fio_request_id
            expect(result.status).to.equal('sent_to_blockchain');
            expect(feeMultiplier).to.equal(8);
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get balance for user2`, async () => {
        let userBalancePrev = userBalance;
        try {
            const result = await user2.sdk.genericAction('getFioBalance', {
                fioPublicKey: user2.publicKey
            })
            userBalance = result.balance
            //console.log('userBalance: ', userBalance);
            expect(userBalance).to.equal(userBalancePrev - (new_funds_request_fee * feeMultiplier))
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Confirm RAM quota for user2 was incremented by multiplier`, async () => {
        try {
            let prevRam = user2Ram;
            const json = {
                "account_name": user2.account
            }
            result = await callFioApi("get_account", json);
            user2Ram = result.ram_quota;
            //console.log('Ram quota: ', result.ram_quota);
            expect(user2Ram).to.equal(prevRam + config.RAM.RECORDOBTRAM + (config.RAM.RECORDOBTRAM * feeMultiplier) / 2)
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`user2 sends recordObtData to user3 with memo of length ${requestMemoBaseLargeOver.length}. Expect 'Transaction is too large`, async () => {
        try {
            const content = {
                payer_public_address: payeeTokenPublicAddressMin,
                payee_public_address: payeeTokenPublicAddressMin,
                amount: payment,
                chain_code: 'FIO',
                token_code: 'FIO',
                status: '',
                obt_id: '',
                memo: requestMemoBaseLargeOver,
                hash: '',
                offline_url: ''
            }

            const cipherContent = faucet.transactions.getCipherContent('new_funds_content', content, user2.privateKey, user2.publicKey);
            feeMultiplier = Math.trunc(cipherContent.length / BASECONTENTAMOUNT) + 1;
            //console.log('           Content length: ', cipherContent.length);

            const result = await user2.sdk.genericAction('recordObtData', {
                payerFioAddress: user2.address,
                payeeFioAddress: user3.address,
                payerTokenPublicAddress: content.payer_public_address,
                payeeTokenPublicAddress: content.payee_public_address,
                amount: content.amount,
                chainCode: content.chain_code,
                tokenCode: content.token_code,
                status: content.status,
                obtId: content.obt_id,
                maxFee: config.maxFee,
                technologyProviderId: '',
                payeeFioPublicKey: user3.publicKey,
                memo: content.memo,
                hash: '',
                offLineUrl: ''
            })
            //console.log('result: ', result)
            requestId = result.fio_request_id;
            expect(result.status).to.equal(null);
            expect(feeMultiplier).to.equal(8);
        } catch (err) {
            //console.log('Error: ', err)
            expect(err.json.fields[0].error).to.equal('Transaction is too large')
        }
    })

})