require('mocha')
const {expect} = require('chai')
const { newUser, getTestType, callFioApiSigned, createKeypair, generateFioDomain, generateFioAddress, callFioApi, fetchJson} = require('../utils.js');
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
        expect(result).to.have.all.keys('status', 'expiration', 'fee_collected')
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
            expect(result).to.have.all.keys('status', 'expiration', 'fee_collected')
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

describe(`C. Register Address for other user and confirm get_fio_balance returns correct amount (BD-3236)`, () => {
    let user1, domain, user1Address;

    it(`Create user keys and Crypto Handle`, async () => {
        user1Keys = await createKeypair();
        user1 = new FIOSDK(user1Keys.privateKey, user1Keys.publicKey, config.BASE_URL, fetchJson);

        domain = generateFioDomain(8)
        user1Address = generateFioAddress(domain, 7)
    })

    it(`faucet regdomain`, async () => {
        try {
          const result = await faucet.genericAction('pushTransaction', {
            action: 'regdomain',
            account: 'fio.address',
            data: {
              fio_domain: domain,
              owner_fio_public_key: config.FAUCET_PUB_KEY,
              max_fee: config.maxFee,
              tpid: '',
              actor: config.FAUCET_ACCOUNT
            }
          })
          //console.log('Result: ', result)
          expect(result.status).to.equal('OK')
        } catch (err) {
          console.log('Error: ', err.json.error)
          expect(err).to.equal('null')
        }
      })

    it(`faucet regaddress for user1 on domain`, async () => {
        try {
          const result = await faucet.genericAction('pushTransaction', {
            action: 'regaddress',
            account: 'fio.address',
            data: {
              fio_address: user1Address,
              owner_fio_public_key: user1Keys.publicKey,
              max_fee: config.maxFee,
              tpid: '',
              actor: config.FAUCET_ACCOUNT
            }
          });
          //console.log('Result: ', result)
          expect(result.status).to.equal('OK');
        } catch (err) {
          console.log('Error: ', err.json.error);
          expect(err).to.equal('null');
        }
      })
    
      it(`Get balance for user1`, async () => {
        try {
            const json = {
                "fio_public_key": user1Keys.publicKey
            }
            result = await callFioApi("get_fio_balance", json);
            console.log('user1 balance', result);
        } catch (err) {
            //console.log('Error', err);
            expect(err).to.equal(null);
        }
      })
});