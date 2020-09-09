require('mocha')
const {expect} = require('chai')
const {Ram, generateFioDomain, generateFioAddress, fetchJson, randStr, timeout, createKeypair} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/FIOSDK')
config = require('../config.js');

let user1

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
  await timeout(1000)
  user1 = await createKeypair();
  user1sdk = new FIOSDK(user1.privateKey, user1.publicKey, config.BASE_URL, fetchJson)
  await timeout(1000)
})

describe('************************** max-txn-size.js ************************** \n A. Test max txn sizes', () => {
  let fioDomain62, fioAddress64, walletDomain, walletAddress64

  it(`Create ramuser public/private keys`, async () => {
    fioDomain62 = generateFioDomain(62)
    fioAddress64 = generateFioAddress(fioDomain62, 64)
    walletDomain = generateFioDomain(31)
    walletAddress64 = generateFioAddress(walletDomain, 64)
  })

  it(`Transfer FIO to user1 to fund account`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: 8000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
    })  
    //console.log('Result', result)
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
  })

  it(`Register wallet domain`, async () => {
    const result = await user1sdk.genericAction('registerFioDomain', { 
      fioDomain: walletDomain, 
      maxFee: config.api.register_fio_domain.fee ,
      walletFioAddress: ''
    })
    //console.log('Result', result)
    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected')
  })
  
  it(`Register wallet address`, async () => {
    try {
      const result = await user1sdk.genericAction('registerFioAddress', { 
        fioAddress: walletAddress64,
        maxFee: config.api.register_fio_address.fee,
        walletFioAddress: ''
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }  
  })

  it(`Register domain max`, async () => {
    const result = await user1sdk.genericAction('registerFioDomain', { 
      fioDomain: fioDomain62, 
      maxFee: config.api.register_fio_domain.fee ,
      walletFioAddress: walletAddress64
    })
    //console.log('Result', result)
    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected')
  })
  
  it(`Register address max`, async () => {
    const result = await user1sdk.genericAction('registerFioAddress', { 
      fioAddress: fioAddress64,
      maxFee: config.api.register_fio_address.fee,
      walletFioAddress: walletAddress64
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')  
  })

  it(`Request funds max`, async () => {
    try {
      const result = await user1sdk.genericAction('requestFunds', { 
        payerFioAddress: walletAddress64, 
        payeeFioAddress: fioAddress64,
        maxFee: config.api.new_funds_request.fee,
        walletFioAddress: walletAddress64,
        actor: user1.account,
        payeeTokenPublicAddress: randStr(80),
        amount: 100000,
        chainCode: randStr(10),
        tokenCode: randStr(10),
        memo: randStr(20),
        hash: user1.account,
        offlineUrl: randStr(10)
      })    
      //console.log('Result: ', result)
      expect(result).to.have.all.keys('status', 'fio_request_id', 'fee_collected')
    } catch (err) {
      console.log('requestFunds Error: ', err.json)
    }
  })

  it(`Add pub address max`, async () => {
    try {
      const result = await user1sdk.genericAction('addPublicAddresses', {
        fioAddress: fioAddress64,
        publicAddresses: [
          {
            chain_code: randStr(10),
            token_code: randStr(10),
            public_address: randStr(128)
          },
          {
            chain_code: randStr(10),
            token_code: randStr(10),
            public_address: randStr(128)
          },
          {
            chain_code: randStr(10),
            token_code: randStr(10),
            public_address: randStr(128)
          },
          {
            chain_code: randStr(10),
            token_code: randStr(10),
            public_address: randStr(128)
          },
          {
            chain_code: randStr(10),
            token_code: randStr(10),
            public_address: randStr(128)
          },
        ],
        maxFee: config.api.add_pub_address.fee,
        walletFioAddress: walletAddress64
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('addPublicAddresses Error: ', err)
    }
  })

  it(`Use the bundles with requestFunds`, async () => {
    for (i = 0; i < 52; i++) {
      try {
        const result = await user1sdk.genericAction('requestFunds', { 
          payerFioAddress: fioAddress64, 
          payeeFioAddress: fioAddress64,
          maxFee: config.api.new_funds_request.fee,
          walletFioAddress: fioAddress64,
          payeeTokenPublicAddress: randStr(80),
          amount: 100,
          chainCode: randStr(10),
          tokenCode: randStr(10),
          memo: randStr(20),
          hash: user1.account,
          offlineUrl: randStr(10)
        })    
        //console.log('Result: ', result)
        //console.log(i + '. fee collected: ', result.fee_collected)
        expect(result).to.have.all.keys('status', 'fio_request_id', 'fee_collected')
      } catch (err) {
        console.log('Error: ', err.json)
      }
    }
  })

  it(`Do one add_pub_address call to use up a final single bundle if there is one`, async () => {
      try {
        const result = await user1sdk.genericAction('addPublicAddresses', {
          fioAddress: fioAddress64,
          publicAddresses: [
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(100)
            },
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(100)
            },
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(100)
            },
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(100)
            },
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(100)
            },
          ],
          maxFee: config.api.add_pub_address.fee,
          walletFioAddress: walletAddress64
        })
        //console.log('Result: ', result)
        //console.log(i + '. fee collected: ', result.fee_collected)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('addPublicAddresses Error: ', err.json)
      }
  })

  it(`No bundle: Add pub address max`, async () => {
    //for (i = 0; i < 10; i++) {
      try {
        const result = await user1sdk.genericAction('addPublicAddresses', {
          fioAddress: fioAddress64,
          publicAddresses: [
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(128)
            },
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(128)
            },
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(128)
            },
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(128)
            },
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(128)
            },
          ],
          maxFee: config.api.add_pub_address.fee,
          walletFioAddress: walletAddress64
        })
        //console.log('Result: ', result)
        //console.log(i + '. fee collected: ', result.fee_collected)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('addPublicAddresses Error: ', err.json)
      }
    //}
  })

  it(`No bundle: Request funds max`, async () => {
    try {
      const result = await user1sdk.genericAction('requestFunds', { 
        payerFioAddress: walletAddress64, 
        payeeFioAddress: fioAddress64,
        maxFee: config.api.new_funds_request.fee,
        walletFioAddress: walletAddress64,
        actor: user1.account,
        payeeTokenPublicAddress: randStr(80),
        amount: 100000,
        chainCode: randStr(10),
        tokenCode: randStr(10),
        memo: randStr(20),
        hash: user1.account,
        offlineUrl: randStr(10)
      })    
      //console.log('Result: ', result)
      expect(result).to.have.all.keys('status', 'fio_request_id', 'fee_collected')
    } catch (err) {
      console.log('requestFunds Error: ', err.json)
    }
  })

})
