require('mocha')
const {expect} = require('chai')
const {newUser, getProdVoteTotal, fetchJson, generateFioDomain, callFioApi,  generateFioAddress, createKeypair, getTestType} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');
const testType = getTestType();

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** register-domains-one-accounts-max-load.js ************************** \n    A. Create 21k domains on an account`, () => {

  //this test will create many domains on a single account.
  //SETUP -- modify the launch script 18_create_set_fees after genesis so that the reg domain fee looks like the below.
  //./clio -u http://localhost:8879 push action -f fio.fee createfee '{"end_point":"register_fio_domain","type":"0","suf_amount":"000000001"}' --permission fio.fee@active
  //then you can run this test to load the chain with the desired number of domains on a single account.

  let userA4, keys, locksdk,domaingood
  let accounts = [], privkeys = [], pubkeys = []
  let numdomains = 0
  const fundsAmount = 500000000000
  const maxTestFundsAmount = 5000000000
  const halfundsAmount = 220000000000

  it(`Create users`, async () => {

    userA4 = await newUser(faucet);
    console.log("user pub key ",userA4.publicKey);
    console.log("user private key ", userA4.privateKey);
    console.log("user account ", userA4.account);

    keys = await createKeypair();
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

  })

  //21k domains
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
            expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
      }
    catch
      (err)
      {
        console.log('Error', err)
      }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })


  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })

  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })

  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })

  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })

  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })

  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })

  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })

  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })

  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })
  it(`load the account with 700 domains`, async () => {
    try {


      for (let step = 0; step < 700; step++) {

        try {

          domainGood = generateFioDomain(7);


          const result = await userA4.sdk.genericAction('registerFioDomain', {
            fioDomain: domainGood,
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
          })
          numdomains = numdomains+1;
          console.log('created domain: ', numdomains)
          expect(result.status).to.equal('OK')

        }catch(err1){
          console.log('failed iteraton ', err1)
        }
      }
    }
    catch
        (err)
    {
      console.log('Error', err)
    }

  })

})




describe.skip(`************************** register-domains-one-accounts-max-load.js ************************** \n    B. read tests using get_fio_domains`, () => {

 //READ tests using get_fio_domains
  let userA4, keys, locksdk,domaingood
  let accounts = [], privkeys = [], pubkeys = []
  let numdomains = 0
  const fundsAmount = 500000000000
  const maxTestFundsAmount = 5000000000
  const halfundsAmount = 220000000000

  it(`Create users`, async () => {

    userA4 = await newUser(faucet);
    console.log("pub key ",userA4.publicKey);
    console.log("private key ", userA4.privateKey);
    console.log("account ", userA4.account);

    keys = await createKeypair();
    /*
    pub key  FIO7HL3DNGCT3n6DPABVCu6eJqxozbmEWY9bwQCyFYqdoNttMeKjQ
private key  5JC9b9EaXRANhY855kf6BtZ4893RrvLSvKhEay8wNa65TwY5Rjj
account  vtqxekjknjyp
     */
    /*
    pub key  FIO745D4Tj4UmobMesFkcVX4q4vJpjuL8pbjVDbMj9M8o2qSVTNJJ
    private key  5HygouZeqwssBQeM4huGuXNB9BaoLtnivyueQGH734CzGMHdej9
    account  xbq1dypvwlin
    */
    locksdk = new FIOSDK('5HygouZeqwssBQeM4huGuXNB9BaoLtnivyueQGH734CzGMHdej9', 'FIO745D4Tj4UmobMesFkcVX4q4vJpjuL8pbjVDbMj9M8o2qSVTNJJ', config.BASE_URL, fetchJson);

  })


  it(`get_fio_domains test 1`, async () => {
    try {
      const result = await locksdk.genericAction('getFioDomains', {
        fioPublicKey: locksdk.publicKey,
        limit: 10,
        offset: 100
      })
      console.log('Result: ', result);
      //expect(result.fio_domains.length).to.equal(0)
    } catch (err) {
      //console.log('Error', err)
      expect(err.json.message).to.equal(config.error.noFioDomains);
      expect(err.errorCode).to.equal(404);
    }
  })




})




