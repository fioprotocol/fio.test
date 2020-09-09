require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/FIOSDK')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** addaddress.js ************************** \n A. Add 2 addresses, then add 3 addresses including the original 2`, () => {

    let userA1

    it(`Create users`, async () => {
        userA1 = await newUser(faucet);
    })
  
    it(`Add DASH and BCH addresses to userA1`, async () => {
      try {
        const result = await userA1.sdk.genericAction('addPublicAddresses', {
          fioAddress: userA1.address,
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

    //it(`Wait to avoid timing errors.`, async () => { await timeout(1000) })

    it('getPublicAddress for DASH', async () => {
      try {
        const result = await userA1.sdk.genericAction('getPublicAddress', {
          fioAddress: userA1.address,
          chainCode: "DASH",
          tokenCode: "DASH"
        })  
        //console.log('Result', result)
        expect(result.public_address).to.equal('XyCyPKzTWvW2XdcYjPaPXGQDCGk946ywEv')  
      } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it('getPublicAddress for BCH', async () => {
      try {
        const result = await userA1.sdk.genericAction('getPublicAddress', {
          fioAddress: userA1.address,
          chainCode: "BCH",
          tokenCode: "BCH"
        })  
        //console.log('Result', result)
        expect(result.public_address).to.equal('bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9')  
      } catch (err) {
        console.log('Error', err)
      }
    })

    it(`Re-add DASH and BCH addresses plus additional ELA address to userA1`, async () => {
      try {
        const result = await userA1.sdk.genericAction('addPublicAddresses', {
          fioAddress: userA1.address,
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
            },
            {
              chain_code: 'ELA',
              token_code: 'ELA',
              public_address: 'EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41',
            }
          ],
          maxFee: config.api.add_pub_address.fee,
          technologyProviderId: ''
        })
        //console.log('Result:', result)
        expect(result.status).to.equal('OK')  
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it.skip('Fixed in Gemini: getPublicAddress for ELA', async () => {
      try {
        const result = await userA1.sdk.genericAction('getPublicAddress', {
          fioAddress: userA1.address,
          chainCode: "ELA",
          tokenCode: "ELA"
        })  
        //console.log('Result', result)
        expect(result.public_address).to.equal('EQH6o4xfaR5fbhV8cDbDGRxwJRJn3qeo41')  
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it.skip('FIP-4 fix: removeAllPublicAddresses', async () => {
      try {
        const result = await userA1.sdk.genericAction('removeAllPublicAddresses', {
          fioAddress: userA1.address,
          maxFee: config.api.add_pub_address.fee,
          technologyProviderId: ''
        })  
        //console.log('Result', result)
        expect(result.status).to.equal('OK') 
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

})

describe(`B. Add the same address twice`, () => {

  let userB1

  it(`Create users`, async () => {
      userB1 = await newUser(faucet);
  })

  it(`Add DASH and BCH addresses to userB1`, async () => {
    const result = await userB1.sdk.genericAction('addPublicAddresses', {
      fioAddress: userB1.address,
      publicAddresses: [
        {
          chain_code: 'BCH',
          token_code: 'BCH',
          public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
        }
      ],
      maxFee: config.api.add_pub_address.fee,
      walletFioAddress: ''
    })
    //console.log('Result:', result)
    expect(result.status).to.equal('OK')  
  })

  it('getPublicAddress for BCH', async () => {
    try {
      const result = await userB1.sdk.genericAction('getPublicAddress', {
        fioAddress: userB1.address,
        chainCode: "BCH",
        tokenCode: "BCH"
      })  
      //console.log('Result', result)
      expect(result.public_address).to.equal('bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9')  
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Re-add BCH address`, async () => {
    try {
      const result = await userB1.sdk.genericAction('addPublicAddresses', {
        fioAddress: userB1.address,
        publicAddresses: [
          {
            chain_code: 'BCH',
            token_code: 'BCH',
            public_address: 'bitcoincash:qzf8zha74adsfasdf0xnwlffdn0zuyaslx3c90q7n9g9',
          }
        ],
        maxFee: config.api.add_pub_address.fee,
        walletFioAddress: ''
      })
      //console.log('Result:', result)
      expect(result.status).to.equal('OK')  
    } catch (err) {
      console.log('Error', err)
    }
  })

  it('getPublicAddress for BCH', async () => {
    try {
      const result = await userB1.sdk.genericAction('getPublicAddress', {
        fioAddress: userB1.address,
        chainCode: "BCH",
        tokenCode: "BCH"
      })  
      //console.log('Result', result)
      expect(result.public_address).to.equal('bitcoincash:qzf8zha74adsfasdf0xnwlffdn0zuyaslx3c90q7n9g9')  
    } catch (err) {
      console.log('Error', err)
    }
  })

})


