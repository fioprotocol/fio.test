require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, timeout, callFioApi} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`*********************** record-obt-data.js *********************** \n`, () => {

    let userA1, userA2, userA2Balance
    const payment = 5000000000 // 5 FIO
    const requestMemo = 'Memo Test'
    const obtMemo = 'Memo in OBT response to request'

    it(`Create users`, async () => {
        userA1 = await newUser(faucet);
        userA2 = await newUser(faucet);
    })

    it(`userA1 sends obt data to userA2`, async () => {
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
            expect(result.status).to.equal('sent_to_blockchain')
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`Confirm get_obt_data returns correct record for payee and payer`, async () => {
        try {
            const result = await userA1.sdk.genericAction('getObtData', {
                limit: '',
                offset: ''
            })
            //console.log('result: ', result)
            //console.log('content: ', result.requests[0].content)
            expect(result.obt_data_records[0].content.memo).to.equal(obtMemo)
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
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
            for (name in fionames.rows) {
                if (fionames.rows[name].name == userA2.address) {
                    //console.log('bundleeligiblecountdown: ', fionames.rows[name].bundleeligiblecountdown);
                    bundleCount = fionames.rows[name].bundleeligiblecountdown;
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
            for (name in fionames.rows) {
                if (fionames.rows[name].name == userA1.address) {
                    //console.log('bundleeligiblecountdown: ', fionames.rows[name].bundleeligiblecountdown);
                    bundleCount = fionames.rows[name].bundleeligiblecountdown;
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
            for (name in fionames.rows) {
                if (fionames.rows[name].name == userA2.address) {
                    //console.log('bundleeligiblecountdown: ', fionames.rows[name].bundleeligiblecountdown);
                    bundleCount = fionames.rows[name].bundleeligiblecountdown;
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

describe(`******************** Error Check ******************** \n`, () => {

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

describe.skip(`********************** record-obt-data.js ********************** \n Records Performance Testing`, () => {

    let userA1, userA2, userB1, userB2, userC1, userC2
    const payment = 5000000000 // 5 FIO
    const requestMemo = 'Memo in the initial request'
    const obtMemo = 'Memo in OBT response to request'

    it(`Create users`, async () => {
        userA1 = await newUser(faucet);
        userA2 = await newUser(faucet);

        userB1 = await newUser(faucet);
        userB2 = await newUser(faucet);

        userC1 = await newUser(faucet);
        userC2 = await newUser(faucet);
    })

    it(`userA1 requests funds from userA2 5000 times`, async () => {
        for (i = 0; i < 1000; i++) {
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
                    payeeFioPublicKey: userA1.publicKey,
                    memo: obtMemo,
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

        for (i = 0; i < 1000; i++) {
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
                    payeeFioPublicKey: userA2.publicKey,
                    memo: obtMemo,
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

        for (i = 0; i < 1000; i++) {
            try {
                const result = await userC1.sdk.genericAction('recordObtData', {
                    payerFioAddress: userC1.address,
                    payeeFioAddress: userC2.address,
                    payerTokenPublicAddress: userC1.publicKey,
                    payeeTokenPublicAddress: userC2.publicKey,
                    amount: payment,
                    chainCode: "FIO",
                    tokenCode: "FIO",
                    status: '',
                    obtId: '',
                    maxFee: config.api.record_obt_data.fee,
                    technologyProviderId: '',
                    payeeFioPublicKey: userC1.publicKey,
                    memo: obtMemo,
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

        for (i = 0; i < 1000; i++) {
            try {
                const result = await userC2.sdk.genericAction('recordObtData', {
                    payerFioAddress: userC2.address,
                    payeeFioAddress: userC1.address,
                    payerTokenPublicAddress: userC2.publicKey,
                    payeeTokenPublicAddress: userC1.publicKey,
                    amount: payment,
                    chainCode: "FIO",
                    tokenCode: "FIO",
                    status: '',
                    obtId: '',
                    maxFee: config.api.record_obt_data.fee,
                    technologyProviderId: '',
                    payeeFioPublicKey: userC2.publicKey,
                    memo: obtMemo,
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

        for (i = 0; i < 1000; i++) {
            try {
                const result = await userB2.sdk.genericAction('recordObtData', {
                    payerFioAddress: userB2.address,
                    payeeFioAddress: userB1.address,
                    payerTokenPublicAddress: userB2.publicKey,
                    payeeTokenPublicAddress: userB1.publicKey,
                    amount: payment,
                    chainCode: "FIO",
                    tokenCode: "FIO",
                    status: '',
                    obtId: '',
                    maxFee: config.api.record_obt_data.fee,
                    technologyProviderId: '',
                    payeeFioPublicKey: userB2.publicKey,
                    memo: obtMemo,
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
