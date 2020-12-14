require('mocha')
const {expect} = require('chai')
const {newUser, generateFioAddress, createKeypair, callFioApi, getFees, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

describe('************************** transfer-address.js ************************** \n A. Transfer an address to FIO Public Key which maps to existing account on FIO Chain using new endpoint (not push action)', () => {

    let walletA1, walletA1FioNames, walletA1OrigBalance, walletA1OrigRam, walletA2, walletA2FioNames, walletA2OrigRam, transfer_fio_address_fee, origAddressExpire, feeCollected

    it(`Create users`, async () => {
        walletA1 = await newUser(faucet);
        walletA1.address2 = generateFioAddress(walletA1.domain, 5)

        walletA2 = await newUser(faucet);
    })

    it('Get transfer_fio_address fee', async () => {
        try {
            result = await walletA1.sdk.getFee('transfer_fio_address', walletA1.address);
            transfer_fio_address_fee = result.fee;
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Register walletA1.address2`, async () => {
        const result = await walletA1.sdk.genericAction('registerFioAddress', {
            fioAddress: walletA1.address2,
            maxFee: config.api.register_fio_address.fee,
            technologyProviderId: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
    })

    it(`getFioNames for walletA1 and confirm it owns 2 addresses and that one of them is walletA1.address2`, async () => {
        try {
            const result = await walletA1.sdk.genericAction('getFioNames', {
                fioPublicKey: walletA1.publicKey
            })
            //console.log('getFioNames', result)
            origAddressExpire = result.fio_addresses[1].expiration
            expect(result.fio_addresses.length).to.equal(2)
            expect(result.fio_domains[0].fio_domain).to.equal(walletA1.domain)
            expect(result.fio_addresses[0].fio_address).to.equal(walletA1.address)
            expect(result.fio_addresses[1].fio_address).to.equal(walletA1.address2)
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })


    it(`Get balance for walletA1`, async () => {
        try {
            const result = await walletA1.sdk.genericAction('getFioBalance', {
                fioPublicKey: walletA1.publicKey
            })
            walletA1OrigBalance = result.balance
            //console.log('userA1 fio balance', result)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get RAM quota for walletA1`, async () => {
        try {
            const json = {
                "account_name": walletA1.account
            }
            result = await callFioApi("get_account", json);
            walletA1OrigRam = result.ram_quota;
            //console.log('Ram quota: ', result.ram_quota);
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get RAM quota for walletA2`, async () => {
        try {
            const json = {
                "account_name": walletA2.account
            }
            result = await callFioApi("get_account", json);
            walletA2OrigRam = result.ram_quota;
            //console.log('Ram quota: ', result.ram_quota);
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Transfer walletA1.address2 to walletA2`, async () => {
        try {
            const result = await walletA1.sdk.genericAction('transferFioAddress', {
                fioAddress: walletA1.address2,
                newOwnerKey: walletA2.publicKey,
                maxFee: transfer_fio_address_fee,
                technologyProviderId: ''
            })
            feeCollected = result.fee_collected;
            //console.log('Result: ', result);
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log('Error: ', err.json.error);
            expect(err).to.equal(null);
        }
    })

    it('Confirm proper fee was collected', async () => {
        expect(feeCollected).to.equal(transfer_fio_address_fee)
    })

    it('Confirm fee was deducted from walletA1 account', async () => {
        try {
            const result = await walletA1.sdk.genericAction('getFioBalance', {
                fioPublicKey: walletA1.publicKey
            })
            expect(result.balance).to.equal(walletA1OrigBalance - transfer_fio_address_fee)
            //console.log('userA1 fio balance', result)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Confirm RAM quota for walletA1 was incremented by ${config.RAM.XFERADDRESSRAM}`, async () => {
        try {
            const json = {
                "account_name": walletA1.account
            }
            result = await callFioApi("get_account", json);
            //console.log('Ram quota: ', result.ram_quota);
            expect(result.ram_quota).to.equal(walletA1OrigRam + config.RAM.XFERADDRESSRAM);
        } catch (err) {
            //console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Confirm RAM quota for walletA2 did not change`, async () => {
        try {
            const json = {
                "account_name": walletA2.account
            }
            result = await callFioApi("get_account", json);
            //console.log('Ram quota: ', result.ram_quota);
            expect(result.ram_quota).to.equal(walletA2OrigRam);
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`getFioNames for walletA1 and confirm it now only owns 1 address`, async () => {
        try {
            walletA1FioNames = await walletA1.sdk.genericAction('getFioNames', {
                fioPublicKey: walletA1.publicKey
            })
            //console.log('getFioNames', result)
            expect(walletA1FioNames.fio_addresses.length).to.equal(1)
            expect(walletA1FioNames.fio_domains[0].fio_domain).to.equal(walletA1.domain)
            expect(walletA1FioNames.fio_addresses[0].fio_address).to.equal(walletA1.address)
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`getFioNames for walletA2 and confirm 2 addresses`, async () => {
        try {
            walletA2FioNames = await walletA2.sdk.genericAction('getFioNames', {
                fioPublicKey: walletA2.publicKey
            })
            //console.log('getFioNames', walletA2FioNames)
            expect(walletA2FioNames.fio_addresses.length).to.equal(2)
            expect(walletA2FioNames.fio_domains[0].fio_domain).to.equal(walletA2.domain)
            expect(walletA2FioNames.fio_addresses[0].fio_address).to.equal(walletA2.address)
            expect(walletA2FioNames.fio_addresses[1].fio_address).to.equal(walletA1.address2)
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it('Confirm expiration date was not changed', async () => {
        expect(walletA2FioNames.fio_addresses[1].expiration).to.equal(origAddressExpire)
    })

})

describe('B. Transfer an address to FIO Public Key which does not map to existing account on FIO Chain using new endpoint (not push action)', () => {

    let walletB1, walletB1FioNames, walletB1OrigBalance, walletB1OrigRam, walletB2, walletB2FioNames, transfer_fio_address_fee, origAddressExpire, feeCollected

    it(`Create users`, async () => {
        walletB1 = await newUser(faucet);
        walletB1.address2 = generateFioAddress(walletB1.domain, 5)

        let keys = await createKeypair();
        walletB2 = {
            account: keys.account,
            privateKey: keys.privateKey,
            publicKey: keys.publicKey
        }
    })

    it(`getFioBalance for non-existent walletB1 account. Expect error type 500: ${config.error.keyNotFound}`, async () => {
        try {
            const result = await faucet.genericAction('getFioBalance', {
                fioPublicKey: walletB1.publicKey
            })
        } catch (err) {
            console.log('Error: ', err.json)
            expect(err.json.message).to.equal(config.error.keyNotFound)
            expect(err.errorCode).to.equal(500);
        }
    })

    it('Get transfer_fio_address fee', async () => {
        try {
            result = await walletB1.sdk.getFee('transfer_fio_address', walletB1.address);
            transfer_fio_address_fee = result.fee;
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it('Register walletB1.address2', async () => {
        const result = await walletB1.sdk.genericAction('registerFioAddress', {
            fioAddress: walletB1.address2,
            maxFee: config.api.register_fio_address.fee,
            technologyProviderId: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
    })

    it('getFioNames for walletB1 and confirm it owns 2 addresses and one of them is walletB1.address2', async () => {
        try {
            const result = await walletB1.sdk.genericAction('getFioNames', {
                fioPublicKey: walletB1.publicKey
            })
            //console.log('getFioNames', result)
            origAddressExpire = result.fio_addresses[1].expiration
            expect(result.fio_addresses.length).to.equal(2)
            expect(result.fio_domains[0].fio_domain).to.equal(walletB1.domain)
            expect(result.fio_addresses[0].fio_address).to.equal(walletB1.address)
            expect(result.fio_addresses[1].fio_address).to.equal(walletB1.address2)
        } catch (err) {
            console.log('Error', err.json)
            expect(err).to.equal(null)
        }
    })

    it(`getFioNames for walletB2. Expect error type ${config.error2.noFioNames.statusCode}: ${config.error.noFioNames}`, async () => {
        try {
            const json = {
                "fio_public_key": walletB2.publicKey
            }
            result = await callFioApi("get_fio_names", json);
            console.log('getFioNames', result)
        } catch (err) {
            //console.log('Error', err)
            expect(err.error.message).to.equal(config.error2.noFioNames.message)
            expect(err.statusCode).to.equal(config.error2.noFioNames.statusCode);
        }
    })

    it(`Get balance for walletB1`, async () => {
        try {
            const result = await walletB1.sdk.genericAction('getFioBalance', {
                fioPublicKey: walletB1.publicKey
            })
            walletB1OrigBalance = result.balance
            //console.log('userA1 fio balance', result)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Get RAM quota for walletB1`, async () => {
        try {
            const json = {
                "account_name": walletB1.account
            }
            result = await callFioApi("get_account", json);
            walletB1OrigRam = result.ram_quota;
            //console.log('Ram quota: ', result.ram_quota);
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it('Transfer walletB1.address2 to walletB2', async () => {
        try {
            const result = await walletB1.sdk.genericAction('transferFioAddress', {
                fioAddress: walletB1.address2,
                newOwnerKey: walletB2.publicKey,
                maxFee: transfer_fio_address_fee,
                technologyProviderId: ''
            })
            //console.log('Result: ', result)
            feeCollected = result.fee_collected;
            expect(result.status).to.equal('OK')
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it('Confirm proper fee was collected', async () => {
        expect(feeCollected).to.equal(transfer_fio_address_fee)
    })

    it('Confirm fee was deducted from walletB1 account', async () => {
        try {
            const result = await walletB1.sdk.genericAction('getFioBalance', {
                fioPublicKey: walletB1.publicKey
            })
            expect(result.balance).to.equal(walletB1OrigBalance - transfer_fio_address_fee)
            //console.log('Result', result)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`Confirm new walletB2 account exists and confirm getFioBalance for newly created walletB2 account returns 0 balance`, async () => {
        try {
            const result = await faucet.genericAction('getFioBalance', {
                fioPublicKey: walletB2.publicKey
            })
            //console.log('Result: ', result)
            expect(result.balance).to.equal(0)
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`Confirm RAM quota for walletB1 was incremented by ${config.RAM.XFERADDRESSRAM}`, async () => {
        try {
            const json = {
                "account_name": walletB1.account
            }
            result = await callFioApi("get_account", json);
            //console.log('Ram quota: ', result.ram_quota);
            expect(result.ram_quota).to.equal(walletB1OrigRam + config.RAM.XFERADDRESSRAM);
        } catch (err) {
            //console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Confirm RAM quota for walletB2 is INITIALACCOUNTRAM = ${config.RAM.INITIALACCOUNTRAM}`, async () => {
        try {
            const json = {
                "account_name": walletB2.account
            }
            result = await callFioApi("get_account", json);
            //console.log('Ram quota: ', result.ram_quota);
            expect(result.ram_quota).to.equal(config.RAM.INITIALACCOUNTRAM);
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`getFioNames for walletA1 and confirm it now only owns 1 address`, async () => {
        try {
            walletB1FioNames = await walletB1.sdk.genericAction('getFioNames', {
                fioPublicKey: walletB1.publicKey
            })
            //console.log('getFioNames', result)
            expect(walletB1FioNames.fio_addresses.length).to.equal(1)
            expect(walletB1FioNames.fio_domains[0].fio_domain).to.equal(walletB1.domain)
            expect(walletB1FioNames.fio_addresses[0].fio_address).to.equal(walletB1.address)
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it(`getFioNames for walletA2 and confirm 2 addresses`, async () => {
        try {
            walletB2FioNames = await walletB1.sdk.genericAction('getFioNames', {
                fioPublicKey: walletB2.publicKey
            })
            //console.log('getFioNames', walletB2FioNames)
            expect(walletB2FioNames.fio_addresses.length).to.equal(1)
            expect(walletB2FioNames.fio_addresses[0].fio_address).to.equal(walletB1.address2)
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it('Confirm address owner changed from walletB1 to walletB2', async () => {
        expect(walletB2FioNames.fio_addresses[0].fio_address).to.equal(walletB1.address2)
    })

    it('Confirm expiration date was not changed', async () => {
        expect(walletB2FioNames.fio_addresses[0].expiration).to.equal(origAddressExpire)
    })

})

describe('C. Run get_fee on transfer_fio_address', () => {

    let walletC1, feeFromTable, feeFromApi

    it('Create users', async () => {
        walletC1 = await newUser(faucet);
    })

    it('Get transfer_fio_address fee directly from fiofees table', async () => {
        try {
            fees = await getFees();
            //console.log('Result: ', fees['transfer_fio_domain']);
            feeFromTable = fees['transfer_fio_address'];
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })

    it('Call sdk getFee on transfer_fio_address endpoint for walletC1 and verify the fee is equal to the fee from the table', async () => {
        try {
            result = await walletC1.sdk.getFee('transfer_fio_address', walletC1.address);
            feeFromApi = result.fee;
            expect(feeFromApi).to.equal(feeFromTable);
        } catch (err) {
            //console.log('Error', err);
            expect(err).to.equal(null);
        }
    })
})

describe('D. transferFioAddress Error testing', () => {
    let userD1, userD2, userD3

    it(`Create users`, async () => {
        userD1 = await newUser(faucet);
        userD2 = await newUser(faucet);
        userD3 = await newUser(faucet);
    })

    it(`(SDK) Transfer address with invalid address format. SDK rejects with no type and error: ${config.error.fioAddressInvalidChar}`, async () => {
        try {
            const result = await userD1.sdk.genericAction('transferFioAddress', {
                fioAddress: ']invid@domain',
                newOwnerKey: userD2.publicKey,
                maxFee: config.api.transfer_fio_address.fee,
                technologyProviderId: ''
            })
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err)
            expect(err.list[0].message).to.equal(config.error.fioAddressInvalidChar)
        }
    })

    it(`Transfer address with invalid public key. Expect error type 400: ${config.error.invalidKey}`, async () => {
        try {
            const result = await userD1.sdk.genericAction('transferFioAddress', {
                fioAddress: userD1.address,
                newOwnerKey: 'FIOinvalidfiopublickey',
                maxFee: config.api.transfer_fio_address.fee,
                technologyProviderId: ''
            })
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err)
            expect(err.json.fields[0].error).to.equal(config.error.invalidKey)
            expect(err.errorCode).to.equal(400);
        }
    })

    it(`Transfer address with invalid max_fee format (-33000000000). Expect error type 400: ${config.error.invalidFeeValue}`, async () => {
        try {
            const result = await userD1.sdk.genericAction('transferFioAddress', {
                fioAddress: userD1.address,
                newOwnerKey: userD2.publicKey,
                maxFee: -33000000000,
                technologyProviderId: ''
            })
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err)
            expect(err.json.fields[0].error).to.equal(config.error.invalidFeeValue)
            expect(err.errorCode).to.equal(400);
        }
    })

    it(`(SDK) Transfer domain with invalid tpid. SDK rejects with no type and error:  ${config.error.invalidTpidSdk}`, async () => {
        try {
            const result = await userD1.sdk.genericAction('transferFioAddress', {
                fioAddress: userD1.address,
                newOwnerKey: userD2.publicKey,
                maxFee: config.api.transfer_fio_address.fee,
                technologyProviderId: 'invalidtpid'
            })
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err)
            expect(err.list[0].message).to.equal(config.error.invalidTpidSdk)
        }
    })

    it(`(Push transaction) Transfer address with invalid tpid. Expect error type 400: ${config.error.invalidTpid}`, async () => {
        try{
            const result = await userD1.sdk.genericAction('pushTransaction', {
                action: 'xferaddress',
                account: 'fio.address',
                data: {
                    "fio_address": userD1.address,
                    "new_owner_fio_public_key": userD2.publicKey,
                    "max_fee": config.api.transfer_fio_address.fee,
                    "tpid": '##invalidtpid##',
                    "actor": userD1.account
                }
            })
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err)
            expect(err.json.fields[0].error).to.equal(config.error.invalidTpid);
            expect(err.errorCode).to.equal(400);
        }
    })

    it(`Transfer address with insufficient max fee. Expect error type 400: ${config.error.feeExceedsMax}`, async () => {
        try {
            const result = await userD1.sdk.genericAction('transferFioAddress', {
                fioAddress: userD1.address,
                newOwnerKey: userD2.publicKey,
                maxFee: config.api.transfer_fio_address.fee - 100000000,
                technologyProviderId: ''
            })
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err)
            expect(err.json.fields[0].error).to.equal(config.error.feeExceedsMax)
            expect(err.errorCode).to.equal(400);
        }
    })

    it(`Transfer address not owned by actor. Expect error type 403: ${config.error.signatureError}`, async () => {
        try {
            const result = await userD1.sdk.genericAction('transferFioAddress', {
                fioAddress: userD3.address,
                newOwnerKey: userD1.publicKey,
                maxFee: config.api.transfer_fio_address.fee,
                technologyProviderId: ''
            })
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err)
            expect(err.json.message).to.equal(config.error.signatureError);
            expect(err.errorCode).to.equal(403);
        }
    })

    it(`userD1 transfers address to userD2`, async () => {
        try {
            const result = await userD1.sdk.genericAction('transferFioAddress', {
                fioAddress: userD1.address,
                newOwnerKey: userD2.publicKey,
                maxFee: config.api.transfer_fio_address.fee,
                technologyProviderId: ''
            })
            expect(result.status).to.equal('OK');
        } catch (err) {
            //console.log('Error: ', err)
            expect(err).to.equal(null);
        }
    })

    it(`userD1 tries to transfer address to userD3 after already transferring it to userD2. Expect error type 403: ${config.error.signatureError}`, async () => {
        try {
            const result = await userD1.sdk.genericAction('transferFioAddress', {
                fioAddress: userD1.address,
                newOwnerKey: userD3.publicKey,
                maxFee: config.api.transfer_fio_address.fee,
                technologyProviderId: ''
            })
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err)
            expect(err.json.message).to.equal(config.error.signatureError);
            expect(err.errorCode).to.equal(403);
        }
    })

    it(`Transfer address that is not registered. Expect error type 400: ${config.error.fioAddressNotRegistered}`, async () => {
        try {
            const result = await userD1.sdk.genericAction('transferFioAddress', {
                fioAddress: 'sdaewrewfa@dkahsdk',
                newOwnerKey: userD2.publicKey,
                maxFee: config.api.transfer_fio_address.fee,
                technologyProviderId: ''
            })
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err)
            expect(err.json.fields[0].error).to.equal(config.error.fioAddressNotRegistered)
            expect(err.errorCode).to.equal(400);
        }
    })

    it(`Use up all of userD3's bundles with 51 record_obt_data transactions`, async () => {
        for (i = 0; i < 51; i++) {
            try {
                const result = await userD3.sdk.genericAction('recordObtData', {
                    payerFioAddress: userD3.address,
                    payeeFioAddress: userD2.address,
                    payerTokenPublicAddress: userD3.publicKey,
                    payeeTokenPublicAddress: userD2.publicKey,
                    amount: 5000000000,
                    chainCode: "BTC",
                    tokenCode: "BTC",
                    status: '',
                    obtId: '',
                    maxFee: config.api.record_obt_data.fee,
                    technologyProviderId: '',
                    payeeFioPublicKey: userD2.publicKey,
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

    it(`Get balance for userD3`, async () => {
        try {
            const result = await userD3.sdk.genericAction('getFioBalance', {
                fioPublicKey: userD3.publicKey
            })
            userC1Balance = result.balance
            //console.log('userD3 fio balance', result)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it('Transfer entire balance for userD3 to userD2', async () => {
        try {
            const result = await userD3.sdk.genericAction('transferTokens', {
                payeeFioPublicKey: userD2.publicKey,
                amount: userC1Balance - config.api.transfer_tokens_pub_key.fee,
                maxFee: config.api.transfer_tokens_pub_key.fee,
                technologyProviderId: ''
            })
            //console.log('Result: ', result)
            expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })

    it(`Verify balance for userD3 = 0`, async () => {
        try {
            const result = await userD3.sdk.genericAction('getFioBalance', {
                fioPublicKey: userD3.publicKey
            })
            //console.log('userD3 fio balance', result)
            expect(result.balance).to.equal(0)
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    })

    it('Call get_table_rows from fionames to get bundles remaining for userD3. Verify 0 bundles', async () => {
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
                if (fionames.rows[name].name == userD3.address) {
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

    it(`Transfer address with insufficient funds and no bundled transactions. Expect error type 400: ${config.error.insufficientFunds}`, async () => {
        try {
            const result = await userD3.sdk.genericAction('transferFioAddress', {
                fioAddress: userD3.address,
                newOwnerKey: userD2.publicKey,
                maxFee: config.api.transfer_fio_address.fee,
                technologyProviderId: ''
            })
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err.json)
            expect(err.json.fields[0].error).to.equal(config.error.insufficientFunds)
            expect(err.errorCode).to.equal(400);
        }
    })

})