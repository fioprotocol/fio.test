/**
 * Helper function to set up a server for testing the autorenew bundle service
 */
require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson} = require('../../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
config = require('../../config.js');
let faucet;

const setup = async () => {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
};

const domainCount = 1;
const accountsWithBundles = 1;
const accountsNoBundles = 1;

const setupAutoBundle = async () => {

  setup();

  for (let i = 0; i < domainCount; i++) {
    try {
      const domain = "domain" + i;
      const result1 = await faucet.genericAction('registerFioDomain', {
          fioDomain: domain,
          maxFee: config.maxFee,
          technologyProviderId: ''
      })
      console.log('Result: ', result)

      //set domain public

    } catch (err) {
      console.log(err);
    }
  }

  for (let j = 0; j < accountsWithBundles; j++) {
    try {
        const user = await newUser(faucet);
        console.log(`User:  + ${user.account}, ${user.publicKey}, ${user.privateKey},`)

        const result2 = await user.sdk.genericAction('registerFioAddress', {
          fioAddress: "lowbundle" + j + "@" + domain,
          maxFee: config.maxFee,
          technologyProviderId: ''
        })
    } catch (err) {
      console.log(err);
    }
  }

}

setupAutoBundle();