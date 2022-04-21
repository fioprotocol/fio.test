require('mocha')
const {expect} = require('chai')
const { newUser, getTestType, callFioApiSigned, generateFioAddress, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const testType = getTestType();


before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** register-fio-address.js ************************** \n    A. Renew address on private domain`, () => {
    let user1, user2, expirationYear

    it(`Create users`, async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
        
    })

    it(`set_fio_domain_public = true for user1.domain`, async () => {
        try {
            const result = await user1.sdk.genericAction('setFioDomainVisibility', {
                fioDomain: user1.domain,
                isPublic: true,
                maxFee: config.maxFee,
                technologyProviderId: ''
            })
            //console.log('Result: ', result);
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null);
        }
    })

    it(`user2 registers user2.address2 on user1.domain`, async () => {
        user2.address2 = generateFioAddress(user1.domain, 5)
        const result = await user2.sdk.genericAction('registerFioAddress', {
            fioAddress: user2.address2,
            maxFee: config.maxFee,
            technologyProviderId: ''
        })
        //console.log('Result: ', result)
        expirationYear = parseInt(result.expiration.split('-',1));
        expect(result.status).to.equal('OK')
    })

    it(`set_fio_domain_public = false for user1.domain`, async () => {
        try {
            const result = await user1.sdk.genericAction('setFioDomainVisibility', {
                fioDomain: user1.domain,
                isPublic: false,
                maxFee: config.maxFee,
                technologyProviderId: ''
            })
            //console.log('Result: ', result);
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })

    it(`user2 renews user2.address2 which is on user1's domain which is now private`, async () => {
        const result = await user2.sdk.genericAction('renewFioAddress', { 
            fioAddress: user2.address2, 
            maxFee: config.maxFee 
        })
        //console.log('Result: ', result)
        expect(parseInt(result.expiration.split('-',1))).to.equal(expirationYear)
        expect(result.status).to.be.a('string')
        expect(result.expiration).to.be.a('string')
        expect(result.fee_collected).to.be.a('number')
      })

})

describe(`B. Renew address`, () => {
    let user1, user2, user3

    it(`Create users`, async () => {
        user1 = await newUser(faucet);
        user2 = await newUser(faucet);
        user3 = await newUser(faucet);

    })

    it(`user1 renewaddress - SDK renewFioAddress`, async () => {
        try {
                const result = await user1.sdk.genericAction('renewFioAddress', {
                    fioAddress: user1.address,
                    maxFee: config.maxFee
                })
            //console.log('Result: ', result)
            expect(result.status).to.equal('OK');
            expect(result.status).to.be.a('string')
            expect(result.expiration).to.be.a('string')
            expect(result.fee_collected).to.be.a('number')
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })

    it(`user2 renewaddress - pushTransaction`, async () => {
        try {
            const result = await user2.sdk.genericAction('pushTransaction', {
                action: 'renewaddress',
                account: 'fio.address',
                data: {
                    "fio_address": user2.address,
                    "max_fee": config.maxFee,
                    "tpid": '',
                    "actor": user2.account
                }
            })
            //console.log('Result: ', result);
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    })

    it(`user3 renewaddress - callFioApiSigned`, async () => {
        try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'renewaddress',
                account: 'fio.address',
                actor: user3.account,
                privKey: user3.privateKey,
                data: {
                    fio_address: user3.address,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: user3.account
                }
            })
            //console.log('Result: ', result)
            expect(result.transaction_id).to.exist
        } catch (err) {
            console.log('Error: ', err)
            expect(err).to.equal(null)
        }
    })
})