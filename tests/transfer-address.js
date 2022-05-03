require('mocha')
const {expect} = require('chai')
const { newUser, generateFioAddress, createKeypair, callFioApi, getFees, callFioApiSigned, fetchJson, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

describe('************************** transfer-address.js ************************** \n    A. Transfer an address to FIO Public Key which maps to existing account on FIO Chain using new endpoint (not push action)', () => {

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

    it(`Add DASH and BCH addresses to walletA1.address2`, async () => {
        try {
          const result = await walletA1.sdk.genericAction('addPublicAddresses', {
            fioAddress: walletA1.address2,
            publicAddresses: [
              {
                chain_code: 'BCH',
                token_code: 'BCH',
                public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
              },
              {
                chain_code: 'DASH',
                token_code: 'DASH',
                public_address: 'XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv',
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

    it(`Wait a few seconds.`, async () => { await timeout(3000) })

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
            walletA2.address2 = walletA2FioNames.fio_addresses[1].fio_address
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

    it('confirm BCH address was removed', async () => {
        try {
          const result = await walletA2.sdk.genericAction('getPublicAddress', {
            fioAddress: walletA2.address2,
            chainCode: "BCH",
            tokenCode: "BCH"
          })
          //console.log('Result', result)
        } catch (err) {
          //console.log('Error', err)
          expect(err.json.message).to.equal(config.error.publicAddressFound)
        }
    })

    it('confirm DASH address was removed', async () => {
        try {
          const result = await walletA2.sdk.genericAction('getPublicAddress', {
            fioAddress: walletA2.address2,
            chainCode: "DASH",
            tokenCode: "DASH"
          })
          //console.log('Result', result)
        } catch (err) {
          //console.log('Error', err)
          expect(err.json.message).to.equal(config.error.publicAddressFound)
        }
    })

    it('confirm FIO address is mapped to walletA2 pub key', async () => {
        try {
          const result = await walletA2.sdk.genericAction('getPublicAddress', {
            fioAddress: walletA2.address2,
            chainCode: "FIO",
            tokenCode: "FIO"
          })
          //console.log('Result', result)
          expect(result.public_address).to.equal(walletA2.publicKey)
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
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

    it(`getFioNames for walletB2. Expect error type: ${config.error.noFioNames}`, async () => {
        try {
            const json = {
                "fio_public_key": walletB2.publicKey
            }
            result = await callFioApi("get_fio_names", json);
            //console.log('getFioNames', result)
        } catch (err) {
            //console.log('Error', err.error)
            expect(err.error.message).to.equal(config.error.noFioNames)
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

    it(`getFioNames for walletB1 and confirm it now only owns 1 address`, async () => {
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

    it(`getFioNames for walletB2 and confirm 1 address (the new address)`, async () => {
        try {
            walletB2FioNames = await walletB1.sdk.genericAction('getFioNames', {
                fioPublicKey: walletB2.publicKey
            })
            //console.log('getFioNames', walletB2FioNames)
            walletB2.address2 = walletB2FioNames.fio_addresses[0].fio_address
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

    it('confirm BCH address was removed', async () => {
        try {
          const result = await walletB1.sdk.genericAction('getPublicAddress', {
            fioAddress: walletB2.address2,
            chainCode: "BCH",
            tokenCode: "BCH"
          })
          //console.log('Result', result)
        } catch (err) {
          //console.log('Error', err)
          expect(err.json.message).to.equal(config.error.publicAddressFound)
        }
    })

    it('confirm DASH address was removed', async () => {
        try {
          const result = await walletB1.sdk.genericAction('getPublicAddress', {
            fioAddress: walletB2.address2,
            chainCode: "DASH",
            tokenCode: "DASH"
          })
          //console.log('Result', result)
        } catch (err) {
          //console.log('Error', err)
          expect(err.json.message).to.equal(config.error.publicAddressFound)
        }
    })

    it('confirm FIO address is mapped to walletB2 pub key', async () => {
        try {
          const result = await walletB1.sdk.genericAction('getPublicAddress', {
            fioAddress: walletB2.address2,
            chainCode: "FIO",
            tokenCode: "FIO"
          })
          //console.log('Result', result)
          expect(result.public_address).to.equal(walletB2.publicKey)
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
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

    it(`(push_transaction) Transfer address with invalid address format. Expect error code ${config.error2.invalidFioAddress.statusCode}: ${config.error2.invalidFioAddress.message}`, async () => {
        try{
            const result = await userD1.sdk.genericAction('pushTransaction', {
                action: 'xferaddress',
                account: 'fio.address',
                data: {
                    "fio_address": ']invid@domain',
                    "new_owner_fio_public_key": userD2.publicKey,
                    "max_fee": config.api.transfer_fio_address.fee,
                    "tpid": '',
                    "actor": userD1.account
                }
            })
            expect(result.status).to.equal(null);
        } catch (err) {
            //console.log('Error: ', err.json.fields[0].error)
            expect(err.json.fields[0].error).to.equal(config.error2.invalidFioAddress.message);
            expect(err.errorCode).to.equal(config.error2.invalidFioAddress.statusCode);
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
                    fioRequestId: '',
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
            for (fioname in fionames.rows) {
                if (fionames.rows[fioname].name == userD3.address) {
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
            //console.log('Error: ', err.json.fields[0])
            expect(err.json.fields[0].error).to.equal(config.error.insufficientFunds)
            expect(err.errorCode).to.equal(400);
        }
    })

})

describe('E. Confirm active producers and proxy cannot transfer address', () => {

    let user1, prod1, proxy1, transfer_fio_address_fee

    it(`Create users`, async () => {
        user1 =  await newUser(faucet);
        prod1 = await newUser(faucet);
        proxy1 = await newUser(faucet);
    })

    it('Get transfer_fio_address fee', async () => {
        try {
            result = await user1.sdk.getFee('transfer_fio_address', user1.address);
            transfer_fio_address_fee = result.fee;
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Register prod1 as producer`, async () => {
        try {
          const result = await prod1.sdk.genericAction('pushTransaction', {
            action: 'regproducer',
            account: 'eosio',
            data: {
              fio_address: prod1.address,
              fio_pub_key: prod1.publicKey,
              url: "https://mywebsite.io/",
              location: 80,
              actor: prod1.account,
              max_fee: config.api.register_producer.fee
            }
          })
          //console.log('Result: ', result)
          expect(result.status).to.equal('OK') 
        } catch (err) {
          console.log('Error: ', err.json);
          expect(err).to.equal(null);
        } 
    })

    it(`Wait a few seconds.`, async () => { await timeout(3000) })

    it(`Transfer prod1.address to user1. Expect error 400:  ${config.error.activeProducer}`, async () => {
        try {
            const result = await prod1.sdk.genericAction('transferFioAddress', {
                fioAddress: prod1.address,
                newOwnerKey: user1.publicKey,
                maxFee: transfer_fio_address_fee,
                technologyProviderId: ''
            })
            //console.log('Result: ', result)
            expect(result).to.equal(null)
        } catch (err) {
            //console.log('Error: ', err.json.fields)
            expect(err.json.fields[0].error).to.equal(config.error.activeProducer)
            expect(err.errorCode).to.equal(400)
        }
    })

    it(`Register proxy1 as a proxy`, async () => {
        try {
          const result = await proxy1.sdk.genericAction('pushTransaction', {
            action: 'regproxy',
            account: 'eosio',
            data: {
              fio_address: proxy1.address,
              actor: proxy1.account,
              max_fee: config.api.register_proxy.fee
            }
          })
          //console.log('Result: ', result)
          expect(result.status).to.equal('OK')
        } catch (err) {
          console.log('Error: ', err.json)
          expect(err).to.equal('null')
        }
    })

    it(`Wait a few seconds.`, async () => { await timeout(5000) })

    it('Confirm is_proxy = 1 for proxy1 ', async () => {
        try {
            const json = {
                json: true,
                code: 'eosio',
                scope: 'eosio',
                table: 'voters',
                limit: 1000,
                reverse: true,
                show_payer: false
            }
            voters = await callFioApi("get_table_rows", json);
            //console.log('voters: ', voters);
            for (voter in voters.rows) {
                if (voters.rows[voter].owner == proxy1.account) {
                  //console.log('voters.rows[voter]: ', voters.rows[voter]);
                  break;
                }
            }
            expect(voters.rows[voter].owner).to.equal(proxy1.account);
            expect(voters.rows[voter].is_proxy).to.equal(1);            
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
      })

    it(`Transfer proxy1.address to user1. Expect error 400:  ${config.error.activeProxy}`, async () => {
        try {
            const result = await proxy1.sdk.genericAction('transferFioAddress', {
                fioAddress: proxy1.address,
                newOwnerKey: user1.publicKey,
                maxFee: transfer_fio_address_fee,
                technologyProviderId: ''
            })
            console.log('Result: ', result)
            expect(result).to.equal(null)
        } catch (err) {
            //console.log('Error: ', err.json.fields)
            expect(err.json.fields[0].error).to.equal(config.error.activeProxy)
            expect(err.errorCode).to.equal(400)
        }
    })

})

describe('F. Confirm users with OBT records or Requests CAN transfer addresses (delta release FIP-1.b part 2)', () => {

    let user1, user2, user3, user4, transfer_fio_address_fee

    it(`Create users`, async () => {
        user1 =  await newUser(faucet);
        user2 = await newUser(faucet);
        user3 = await newUser(faucet);
        user4 = await newUser(faucet);
    })

    it('Get transfer_fio_address fee', async () => {
        try {
            result = await user1.sdk.getFee('transfer_fio_address', user1.address);
            transfer_fio_address_fee = result.fee;
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`user1 requests funds from user2`, async () => {
        try {
          const result = await user1.sdk.genericAction('requestFunds', { 
            payerFioAddress: user2.address, 
            payeeFioAddress: user1.address,
            payeeTokenPublicAddress: 'thisispayeetokenpublicaddress',
            amount: 1000,
            chainCode: 'BTC',
            tokenCode: 'BTC',
            memo: 'requestMemo',
            maxFee: config.maxFee,
            payerFioPublicKey: user2.publicKey,
            technologyProviderId: ''
          })    
          //console.log('Result: ', result)
          expect(result.status).to.equal('requested') 
        } catch (err) {
          console.log('Error: ', err)
          expect(err).to.equal(null)
        }
      })

      it(`Wait a few seconds.`, async () => { await timeout(5000) })

    it(`Transfer user1.address to user2. Expect success.`, async () => {
        try {
            const result = await user1.sdk.genericAction('transferFioAddress', {
                fioAddress: user1.address,
                newOwnerKey: user2.publicKey,
                maxFee: transfer_fio_address_fee,
                technologyProviderId: ''
            })
            //console.log('Result: ', result)
            expect(result.status).to.equal('OK')
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`Transfer user2.address to user1. Expect success.`, async () => {
        try {
            const result = await user2.sdk.genericAction('transferFioAddress', {
                fioAddress: user2.address,
                newOwnerKey: user1.publicKey,
                maxFee: transfer_fio_address_fee,
                technologyProviderId: ''
            })
            //console.log('Result: ', result)
            expect(result.status).to.equal('OK')
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

    it(`Create OBT for user3`, async () => {
        try {
          const result = await user3.sdk.genericAction('recordObtData', {
            fioRequestId: '',
            payerFioAddress: user3.address,
            payeeFioAddress: user1.address,
            payerTokenPublicAddress: user3.publicKey,
            payeeTokenPublicAddress: user1.publicKey,
            amount: 5000000000,
            chainCode: "BTC",
            tokenCode: "BTC",
            maxFee: config.api.record_obt_data.fee,
            technologyProviderId: '',
            payeeFioPublicKey: user3.publicKey,
            memo: 'this is a test'
          })
            //console.log('Result: ', result);
            expect(result.status).to.equal('sent_to_blockchain');
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
      })

      it(`Transfer user3.address to user4. Expect success.`, async () => {
        try {
            const result = await user3.sdk.genericAction('transferFioAddress', {
                fioAddress: user3.address,
                newOwnerKey: user4.publicKey,
                maxFee: transfer_fio_address_fee,
                technologyProviderId: ''
            })
            //console.log('Result: ', result)
            expect(result.status).to.equal('OK')
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })

})

describe('G. Transfer Addresses with NFTs.', () => {

    let user1, user2, nftburnqCount, addressHash, address2Hash, address3Hash

    it(`Create users`, async () => {
        user1 = await newUser(faucet);
        // user1.address has no NFTs
        user1.address2 = generateFioAddress(user1.domain, 5); // 1 NFT
        user1.address3 = generateFioAddress(user1.domain, 5); // Multiple NFTs

        user2 = await newUser(faucet);
    })

    it(`Get nftburnq table number of rows (in case there are existing entries)`, async () => {
        try {
            const json = {
                json: true,
                code: 'fio.address',
                scope: 'fio.address',
                table: 'nftburnq',
                limit: 1000,
                reverse: false,
                show_payer: false
            }
            result = await callFioApi("get_table_rows", json);
            nftburnqCount = result.rows.length;
            //console.log('result: ', result);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Create address with single NFT`, async () => {
        try {
            const result = await user1.sdk.genericAction('registerFioAddress', {
                fioAddress: user1.address2,
                maxFee: config.maxFee,
                technologyProviderId: ''
            })
            //console.log('Result: ', result)
            expect(result.status).to.equal('OK')


            const addnftResult = await user1.sdk.genericAction('pushTransaction', {
                action: 'addnft',
                account: 'fio.address',
                data: {
                    fio_address: user1.address2,
                    nfts: [{
                        "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "1", "url": "", "hash": "", "metadata": ""
                    }],
                    max_fee: config.maxFee,
                    actor: user1.account,
                    tpid: ""
                }
            })
            //console.log(`addnftResult: `, addnftResult)
            expect(addnftResult.status).to.equal('OK')

        } catch (err) {
            //console.log(err.message)
            expect(err).to.equal(null);
        }
    })

    it(`Create address with 6 NFTs`, async () => {
        try {
            const result = await user1.sdk.genericAction('registerFioAddress', {
                fioAddress: user1.address3,
                maxFee: config.maxFee,
                technologyProviderId: ''
            })
            //console.log('Result: ', result)
            expect(result.status).to.equal('OK')

            const addnftResult = await user1.sdk.genericAction('pushTransaction', {
                action: 'addnft',
                account: 'fio.address',
                data: {
                    fio_address: user1.address3,
                    nfts: [
                        { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF1", "token_id": "1", "url": "", "hash": "", "metadata": "" },
                        { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF2", "token_id": "2", "url": "", "hash": "", "metadata": "" },
                        { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF3", "token_id": "3", "url": "", "hash": "", "metadata": "" }
                    ],
                    max_fee: config.maxFee,
                    actor: user1.account,
                    tpid: ""
                }
            })
            //console.log(`addnftResult: `, addnftResult)
            expect(addnftResult.status).to.equal('OK')

            const addnftResult2 = await user1.sdk.genericAction('pushTransaction', {
                action: 'addnft',
                account: 'fio.address',
                data: {
                    fio_address: user1.address3,
                    nfts: [
                        { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF4", "token_id": "4", "url": "", "hash": "", "metadata": "" },
                        { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF5", "token_id": "5", "url": "", "hash": "", "metadata": "" },
                        { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF6", "token_id": "6", "url": "", "hash": "", "metadata": "" }
                    ],
                    max_fee: config.maxFee,
                    actor: user1.account,
                    tpid: ""
                }
            })
            //console.log(`addnftResult2: `, addnftResult2)
            expect(addnftResult2.status).to.equal('OK')

        } catch (err) {
            console.log(err.json)
            expect(err).to.equal(null);
        }
    })

    it(`Call get_table_rows from fionames. Collect Hashes.`, async () => {
        try {
            const json = {
                json: true,
                code: 'fio.address',
                scope: 'fio.address',
                table: 'fionames',
                limit: 1000,
                reverse: false,
                show_payer: false
            }
            fionames = await callFioApi("get_table_rows", json);
            //console.log('fionames: ', fionames);
            for (fioname in fionames.rows) {
                if (fionames.rows[fioname].name == user1.address) {
                    //console.log('fioname: ', fionames.rows[fioname]);
                    addressHash = fionames.rows[fioname].namehash;
                }
                if (fionames.rows[fioname].name == user1.address2) {
                    //console.log('fioname: ', fionames.rows[fioname]);
                    address2Hash = fionames.rows[fioname].namehash;
                }
                if (fionames.rows[fioname].name == user1.address3) {
                    //console.log('fioname: ', fionames.rows[fioname]);
                    address3Hash = fionames.rows[fioname].namehash;
                }
            }
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Transfer user1.address to user2`, async () => {
        try {
            const result = await user1.sdk.genericAction('transferFioAddress', {
                fioAddress: user1.address,
                newOwnerKey: user2.publicKey,
                maxFee: config.maxFee,
                technologyProviderId: ''
            })
            //console.log('Result: ', result);
            expect(result.status).to.equal('OK')
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })

    it(`Get burnnftq table. Confirm no additional entries.`, async () => {
        try {
            const json = {
                json: true,
                code: 'fio.address',
                scope: 'fio.address',
                table: 'nftburnq',
                limit: 1000,
                reverse: false,
                show_payer: false
            }
            result = await callFioApi("get_table_rows", json);
            //console.log('result: ', result);
            expect(result.rows.length).to.equal(nftburnqCount);  // No change
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Call get_table_rows from fionames. Verify user1.address is owned by user2.`, async () => {
        let addressOwner;
        try {
            const json = {
                json: true,
                code: 'fio.address',
                scope: 'fio.address',
                table: 'fionames',
                limit: 1000,
                reverse: false,
                show_payer: false
            }
            fionames = await callFioApi("get_table_rows", json);
            //console.log('fionames: ', fionames);
            for (fioname in fionames.rows) {
                if (fionames.rows[fioname].name == user1.address) {
                    //console.log('fioname: ', fionames.rows[fioname]);
                    addressOwner = fionames.rows[fioname].owner_account;
                }
            }
            expect(addressOwner).to.equal(user2.account);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Transfer user1.address2 to user2`, async () => {
        try {
            const result = await user1.sdk.genericAction('transferFioAddress', {
                fioAddress: user1.address2,
                newOwnerKey: user2.publicKey,
                maxFee: config.maxFee,
                technologyProviderId: ''
            })
            //console.log('Result: ', result);
            expect(result.status).to.equal('OK')
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })

    it(`Get burnnftq table. Confirm one additional entry with fio_address_hash = user1.address2.hash.`, async () => {
        try {
            const json = {
                json: true,
                code: 'fio.address',
                scope: 'fio.address',
                table: 'nftburnq',
                limit: 1000,
                reverse: false,
                show_payer: false
            }
            result = await callFioApi("get_table_rows", json);
            //console.log('result: ', result);
            nftburnqCount++;
            expect(result.rows[nftburnqCount - 1].fio_address_hash).to.equal(address2Hash);
            expect(result.rows.length).to.equal(nftburnqCount);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Call get_table_rows from fionames. Verify user1.address2 owned by user2.`, async () => {
        let addressOwner;
        try {
            const json = {
                json: true,
                code: 'fio.address',
                scope: 'fio.address',
                table: 'fionames',
                limit: 1000,
                reverse: false,
                show_payer: false
            }
            fionames = await callFioApi("get_table_rows", json);
            //console.log('fionames: ', fionames);
            for (fioname in fionames.rows) {
                if (fionames.rows[fioname].name == user1.address2) {
                    //console.log('fioname: ', fionames.rows[fioname]);
                    addressOwner = fionames.rows[fioname].owner_account;
                }
            }
            expect(addressOwner).to.equal(user2.account);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Transfer user1.address3 to user2`, async () => {
        try {
            const result = await user1.sdk.genericAction('transferFioAddress', {
                fioAddress: user1.address3,
                newOwnerKey: user2.publicKey,
                maxFee: config.maxFee,
                technologyProviderId: ''
            })
            //console.log('Result: ', result);
            expect(result.status).to.equal('OK')
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })

    it(`Get burnnftq table. Confirm one additional entry with fio_address_hash = user1.address3.hash.`, async () => {
        try {
            const json = {
                json: true,
                code: 'fio.address',
                scope: 'fio.address',
                table: 'nftburnq',
                limit: 1000,
                reverse: false,
                show_payer: false
            }
            result = await callFioApi("get_table_rows", json);
            //console.log('result: ', result);
            nftburnqCount++;
            expect(result.rows[nftburnqCount - 1].fio_address_hash).to.equal(address3Hash);
            expect(result.rows.length).to.equal(nftburnqCount);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Call get_table_rows from fionames. Verify user1.address3 owned by user2.`, async () => {
        let addressOwner;
        try {
            const json = {
                json: true,
                code: 'fio.address',
                scope: 'fio.address',
                table: 'fionames',
                limit: 1000,
                reverse: false,
                show_payer: false
            }
            fionames = await callFioApi("get_table_rows", json);
            //console.log('fionames: ', fionames);
            for (fioname in fionames.rows) {
                if (fionames.rows[fioname].name == user1.address3) {
                    //console.log('fioname: ', fionames.rows[fioname]);
                    addressOwner = fionames.rows[fioname].owner_account;
                }
            }
            expect(addressOwner).to.equal(user2.account);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Call burnnfts until burnnftq is empty`, async () => {
        let empty = false;
        try {
            while (!empty) {
                const result = await user1.sdk.genericAction('pushTransaction', {
                    action: 'burnnfts',
                    account: 'fio.address',
                    data: {
                        actor: user1.account,
                    }
                })
                //console.log(`Result: `, result)
                expect(result.status).to.equal('OK')
                await timeout(1000); // To avoid duplicate transaction
            }
        } catch (err) {
            //console.log(err.json);
            expect(err.errorCode).to.equal(400);
            expect(err.json.fields[0].error).to.equal('Nothing to burn');
        }
    })

    it(`Get burnnftq table. Confirm it is empty.`, async () => {
        try {
            const json = {
                json: true,
                code: 'fio.address',
                scope: 'fio.address',
                table: 'nftburnq',
                limit: 1000,
                reverse: false,
                show_payer: false
            }
            result = await callFioApi("get_table_rows", json);
            //console.log('result: ', result);
            expect(result.rows.length).to.equal(0);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

})

describe('H. Transfer Address with NFTs, confirm cannot add new NFT', () => {

    let user1, user2, addressHash

    it(`Create users`, async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
    })

    it(`Call get_table_rows from fionames. Collect Hashes.`, async () => {
        try {
            const json = {
                json: true,
                code: 'fio.address',
                scope: 'fio.address',
                table: 'fionames',
                lower_bound: user1.account,
                upper_bound: user1.account,
                key_type: 'i64',
                index_position: '4'
            }
            fionames = await callFioApi("get_table_rows", json);
            //console.log('fionames: ', fionames);
            for (fioname in fionames.rows) {
                if (fionames.rows[fioname].name == user1.address) {
                    //console.log('fioname: ', fionames.rows[fioname]);
                    addressHash = fionames.rows[fioname].namehash;
                }
            }
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Add NFT to user1.address`, async () => {
        try {
            const addnftResult = await user1.sdk.genericAction('pushTransaction', {
                action: 'addnft',
                account: 'fio.address',
                data: {
                    fio_address: user1.address,
                    nfts: [{
                        "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "1", "url": "", "hash": "", "metadata": ""
                    }],
                    max_fee: config.maxFee,
                    actor: user1.account,
                    tpid: ""
                }
            })
            //console.log(`addnftResult: `, addnftResult)
            expect(addnftResult.status).to.equal('OK')

        } catch (err) {
            //console.log(err.message)
            expect(err).to.equal(null);
        }
    })

    it(`Transfer user1.address to user2`, async () => {
        try {
            const result = await user1.sdk.genericAction('transferFioAddress', {
                fioAddress: user1.address,
                newOwnerKey: user2.publicKey,
                maxFee: config.maxFee,
                technologyProviderId: ''
            })
            //console.log('Result: ', result);
            expect(result.status).to.equal('OK')
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })


    it(`Get burnnftq table. Confirm user1.address in table.`, async () => {
        let inTable = false;
        try {
            const json = {
                json: true,
                code: 'fio.address',
                scope: 'fio.address',
                table: 'nftburnq',
                limit: 1000,
                reverse: false,
                show_payer: false
            }
            const addresses = await callFioApi("get_table_rows", json);
            //console.log('addresses: ', addresses);
            //console.log('addressHash: ', addressHash);
            for (address in addresses.rows) {
                if (addresses.rows[address].fio_address_hash == addressHash) {
                    //console.log('address: ', addresses.rows[address]);
                    inTable = true;
                }
            }
            expect(inTable).to.equal(true);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`user1 attempts to create NFT on address. Expect failure: Request signature is not valid`, async () => {
        try {
            const addnftResult = await user1.sdk.genericAction('pushTransaction', {
                action: 'addnft',
                account: 'fio.address',
                data: {
                    fio_address: user1.address,
                    nfts: [{
                        "chain_code": "ETH", "contract_address": "0x123456789ABCDEF2", "token_id": "2", "url": "", "hash": "", "metadata": ""
                    }],
                    max_fee: config.maxFee,
                    actor: user1.account,
                    tpid: ""
                }
            })
            expect(addnftResult).to.not.equal('OK');
        } catch (err) {
            //console.log('Error', err);
            expect(err.errorCode).to.equal(403);
            expect(err.json.message).to.equal('Request signature is not valid or this user is not allowed to sign this transaction.');
        }
    })

    it(`user2 attempts to create NFT on address. Expect failure: FIO Address NFTs are being burned`, async () => {
        try {
            const addnftResult = await user2.sdk.genericAction('pushTransaction', {
                action: 'addnft',
                account: 'fio.address',
                data: {
                    fio_address: user1.address,
                    nfts: [{
                        "chain_code": "ETH", "contract_address": "0x123456789ABCDEF2", "token_id": "2", "url": "", "hash": "", "metadata": ""
                    }],
                    max_fee: config.maxFee,
                    actor: user2.account,
                    tpid: ""
                }
            })
            expect(addnftResult).to.not.equal('OK');
        } catch (err) {
            //console.log(err);
            expect(err.errorCode).to.equal(400);
            expect(err.json.fields[0].error).to.equal('FIO Address NFTs are being burned');
        }
    })

    it(`Call burnnfts until burnnftq is empty`, async () => {
        let empty = false;
        try {
            while (!empty) {
                const result = await user1.sdk.genericAction('pushTransaction', {
                    action: 'burnnfts',
                    account: 'fio.address',
                    data: {
                        actor: user1.account,
                    }
                })
                //console.log(`Result: `, result)
                expect(result.status).to.equal('OK')
                await timeout(1000); // To avoid duplicate transaction
            }
        } catch (err) {
            //console.log(err.json);
            expect(err.errorCode).to.equal(400);
            expect(err.json.fields[0].error).to.equal('Nothing to burn');
        }
    })

    it(`Get burnnftq table. Confirm it is empty.`, async () => {
        try {
            const json = {
                json: true,
                code: 'fio.address',
                scope: 'fio.address',
                table: 'nftburnq',
                limit: 1000,
                reverse: false,
                show_payer: false
            }
            result = await callFioApi("get_table_rows", json);
            //console.log('result: ', result);
            expect(result.rows.length).to.equal(0);
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`user1 attempts to create NFT on address. Expect failure: Request signature is not valid`, async () => {
        try {
            const addnftResult = await user1.sdk.genericAction('pushTransaction', {
                action: 'addnft',
                account: 'fio.address',
                data: {
                    fio_address: user1.address,
                    nfts: [{
                        "chain_code": "ETH", "contract_address": "0x123456789ABCDEF2", "token_id": "2", "url": "", "hash": "", "metadata": ""
                    }],
                    max_fee: config.maxFee,
                    actor: user1.account,
                    tpid: ""
                }
            })
            expect(addnftResult).to.not.equal('OK');
        } catch (err) {
            //console.log('Error', err);
            expect(err.errorCode).to.equal(403);
            expect(err.json.message).to.equal('Request signature is not valid or this user is not allowed to sign this transaction.');
        }
    })

    it(`user2 attempts to create NFT on address. Expect success.`, async () => {
        try {
            const addnftResult = await user2.sdk.genericAction('pushTransaction', {
                action: 'addnft',
                account: 'fio.address',
                data: {
                    fio_address: user1.address,
                    nfts: [{
                        "chain_code": "ETH", "contract_address": "0x123456789ABCDEF2", "token_id": "2", "url": "", "hash": "", "metadata": ""
                    }],
                    max_fee: config.maxFee,
                    actor: user2.account,
                    tpid: ""
                }
            })
            expect(addnftResult.status).to.equal('OK');
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })
})

describe('E. transfer FIO Address with existing FIO Requests, test getters ', () => {
    let user1, user2, user3, requestId
    const payment = 5000000000 // 5 FIO
    const requestMemo = 'Memo in the initial request'
  
    it(`Create users`, async () => {
      user1 = await newUser(faucet);
      user2 = await newUser(faucet);
      user3 = await newUser(faucet);
    });
  
    it(`user1 requests funds from user2`, async () => {
      try {
        const result = await user1.sdk.genericAction('requestFunds', {
          payerFioAddress: user2.address,
          payeeFioAddress: user1.address,
          payeeTokenPublicAddress: 'thisispayeetokenpublicaddress',
          amount: payment,
          chainCode: 'BTC',
          tokenCode: 'BTC',
          memo: requestMemo,
          maxFee: config.maxFee,
          payerFioPublicKey: user2.publicKey,
          technologyProviderId: '',
          hash: '',
          offLineUrl: ''
        })
        //console.log('Result: ', result)
        requestId = result.fio_request_id
        expect(result.status).to.equal('requested')
      } catch (err) {
        console.log('Error: ', err)
        expect(err).to.equal(null)
      }
    });
  
    it(`get_sent_fio_requests for user1 (payee)`, async () => {
        try {
            const json = {
              "fio_public_key": user1.publicKey
            }
            result = await callFioApi("get_sent_fio_requests", json);
            //console.log('result: ', result);
            //console.log('content: ', result.requests[0].content);
            expect(result.requests[0].fio_request_id).to.equal(requestId);
            expect(result.requests[0].payer_fio_address).to.equal(user2.address);
            expect(result.requests[0].payee_fio_address).to.equal(user1.address);
            expect(result.requests[0].payer_fio_public_key).to.equal(user2.publicKey);
            expect(result.requests[0].payee_fio_public_key).to.equal(user1.publicKey);
            expect(result.requests[0].status).to.equal('requested');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        };
    });
  
    it(`get_pending_fio_requests for user2 (payer)`, async () => {
        try {
          const json = {
              "fio_public_key": user2.publicKey
            }
            result = await callFioApi("get_pending_fio_requests", json);
          //console.log('result: ', result)
          //console.log('content: ', result.requests[0].content)
          expect(result.requests[0].fio_request_id).to.equal(requestId);
          expect(result.requests[0].payer_fio_address).to.equal(user2.address);
          expect(result.requests[0].payee_fio_address).to.equal(user1.address);
          expect(result.requests[0].payer_fio_public_key).to.equal(user2.publicKey);
          expect(result.requests[0].payee_fio_public_key).to.equal(user1.publicKey);
        } catch (err) {
          console.log('Error: ', err)
          expect(err).to.equal(null)
        };
    });
  
    it(` Transfer user2 address to user3`, async () => {
      try{
        const result = await user2.sdk.genericAction('pushTransaction', {
          action: 'xferaddress',
          account: 'fio.address',
          data: {
            "fio_address": user2.address,
            "new_owner_fio_public_key": user3.publicKey,
            "max_fee": config.maxFee,
            "tpid": '',
            "actor": user2.account
          }
        })
        //console.log('result: ', result);
        expect(result.status).to.equal('OK');
      } catch (err) {
        console.log('Error: ', err)
        expect(err.errorCode).to.equal(null);
      };
    })

    it(`Call (get_fio_addresses for user2. Expect error type 404: ${config.error.noFioAddresses}`, async () => {
        try {
          const json = {
            "fio_public_key": user2.publicKey
          }
          result = await callFioApi("get_fio_addresses", json);
          //console.log('Result: ', result);
          expect(result.fio_domains.length).to.equal(0)
        } catch (err) {
          //console.log('Error', err.error.message)
          expect(err.error.message).to.equal(config.error.noFioAddresses)
          expect(err.statusCode).to.equal(404);
        };
    });
  
    it(`get_sent_fio_requests for user1 (payee)`, async () => {
        try {
            const json = {
              "fio_public_key": user1.publicKey
            }
            result = await callFioApi("get_sent_fio_requests", json);
            //console.log('result: ', result);
            //console.log('content: ', result.requests[0].content);
            expect(result.requests[0].fio_request_id).to.equal(requestId);
            expect(result.requests[0].payer_fio_address).to.equal(user2.address);
            expect(result.requests[0].payee_fio_address).to.equal(user1.address);
            expect(result.requests[0].payer_fio_public_key).to.equal(user2.publicKey);
            expect(result.requests[0].payee_fio_public_key).to.equal(user1.publicKey);
            expect(result.requests[0].status).to.equal('requested');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        };
    });
  
    it.skip(`Need to complete: get_pending_fio_requests for user2 (payer)`, async () => {
      try {
        const json = {
            "fio_public_key": user2.publicKey
          }
          result = await callFioApi("get_pending_fio_requests", json);
        //console.log('result: ', result)
        //console.log('content: ', result.requests[0].content)
        expect(result).to.equal(null);

      } catch (err) {
        console.log('Error: ', err)
        expect(err).to.equal(null)
      };
    });
  
  })