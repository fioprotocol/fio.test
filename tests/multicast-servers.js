require('mocha')
const {expect} = require('chai')
const {newUser, createKeypair, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

let faucet;

before(async () => {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})

describe('************************** multicast-servers.js ************************** \n    A. Test use of multiple servers', () => {

    let user1, badUrlSdk;
    const amount = 1000000000000;

    const badUrl = 'http://badtesturl.io'
    const badUrlList = [badUrl, config.BASE_URL]

    it(`Create users`, async () => {
        user1 = await newUser(faucet);
        const keys = await createKeypair();
        badUrlSdk.sdk = new FIOSDK(keys.privateKey, keys.privateKey, badUrlList, fetchJson);
        badUrlSdk.privateKey = keys.privateKey;
        badUrlSdk.publicKey = keys.publicKey;
        badUrlSdk.account = keys.account;
    })

    it(`user1 transfers FIO to badUrlSdk`, async () => {
        try {
            const result = await user1.sdk.genericAction('transferTokens', {
                payeeFioPublicKey: badUrlSdk.publicKey,
                amount: amount,
                maxFee: config.maxFee,
            })
            console.log('Result: ', result);
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });

    it(`badUrlSdk transfers FIO to user1`, async () => {
        try {
            const result = await badUrlSdk.sdk.genericAction('transferTokens', {
                payeeFioPublicKey: user1.publicKey,
                amount: amount * 0.25,
                maxFee: config.maxFee,
            })
            console.log('Result: ', result);
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });
})
