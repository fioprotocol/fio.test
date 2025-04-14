/**
 * Helper function to set up a server for testing the autorenew bundle service
 */
require('mocha')
const {expect} = require('chai')
const {newUser, 
  fetchJson,
  randStr,
  timeout
} = require('../../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
config = require('../../config.js');

let faucet;

const setup = async () => {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
};

const domainCount = 2;
const accountsWithBundles = 10;

const setupAutoBundle = async () => {

  let domain = [];

  setup();

  const payee = await newUser(faucet);

  for (let i = 0; i < domainCount; i++) {
    try {
      domain[i] = "domain" + i + randStr(4);
      console.log(`Domain: ${domain[i]}\n`)
      const result1 = await faucet.genericAction('registerFioDomain', {
          fioDomain: domain[i],
          maxFee: config.maxFee,
          technologyProviderId: ''
      })
      //console.log('Result1: ', result1);

      await timeout(3000);

      //set domain public
      const result2 = await faucet.genericAction('setFioDomainVisibility', {
        fioDomain: domain[i],
        isPublic: true,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      //console.log('Result2: ', result2);

      await timeout(3000);

      // set up accounts with zero bundles
      for (let j = 0; j < accountsWithBundles; j++) {
        let user = await newUser(faucet);
        user.address2 = "lowbundle" + j + "@" + domain[i];
        console.log(`User ${j}: \n   Account: ${user.account}, \n   Pub key: ${user.publicKey}, \n   Priv key: ${user.privateKey}, \n   Address with bundles: ${user.address}, \n   Address no bundles: ${user.address2}\n`)
    
        const result3 = await user.sdk.genericAction('registerFioAddress', {
          fioAddress: user.address2,
          maxFee: config.maxFee,
          technologyProviderId: ''
        })
        //console.log('Result3: ', result3);
        await timeout(3000);

        // Use up bundles with 51 record_obt_data transactions
        //console.log('Using up bundles...');
        for (let k = 0; k < 51; k++) {
          const result = await user.sdk.genericAction('recordObtData', {
              payerFioAddress: user.address2,
              payeeFioAddress: payee.address,
              payerTokenPublicAddress: user.publicKey,
              payeeTokenPublicAddress: payee.publicKey,
              amount: 5000000000,
              chainCode: "BTC",
              tokenCode: "BTC",
              status: '',
              obtId: '',
              maxFee: config.maxFee,
              technologyProviderId: '',
              payeeFioPublicKey: payee.publicKey,
              memo: ''
          })
          
        }
        const bundleCount = await user.sdk.genericAction('getFioNames', { fioPublicKey: user.publicKey });
        //console.log('Bundle count: ', bundleCount)
      }

    } catch (err) {
      console.log(err);
    }
  }



}

setupAutoBundle();