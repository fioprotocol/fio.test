require('mocha')
const {expect} = require('chai')
const {printUserRam, setRam, user, generateFioDomain, generateFioAddress, fetchJson, randStr, timeout, createKeypair} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

let user1, user2

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
  await timeout(1000)
  keys = await createKeypair();
  user1 = new user(keys.account, keys.privateKey, keys.publicKey)
  user1sdk = new FIOSDK(user1.privateKey, user1.publicKey, config.BASE_URL, fetchJson)
  await timeout(1000)
  keys = await createKeypair();
  user2 = new user(keys.account, keys.privateKey, keys.publicKey)
  user2sdk = new FIOSDK(user2.privateKey, user2.publicKey, config.BASE_URL, fetchJson)
  await timeout(1000)
})


describe('************************** ram2.js ************************** \n A. Test RAM Consumption', () => {

  it(`Create ramuser public/private keys`, async () => {
    user1Domain = generateFioDomain(15)
    user1Address = generateFioAddress(user1Domain, 15)
    user1Domain2 = generateFioDomain(15)
    user1Address2 = generateFioAddress(user1Domain, 15)   
  })

  it(`Transfer FIO to ramuserPublicKey to fund account. Test: INITIALACCOUNTRAM`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: 2000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
    })  
    //console.log('Result', result)
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    await setRam(user1, 'INITIALACCOUNTRAM', 0)
  })

  it(`Test: REGDOMAINRAM`, async () => {
    const result = await user1sdk.genericAction('registerFioDomain', { 
      fioDomain: user1Domain, 
      maxFee: config.api.register_fio_domain.fee ,
      walletFioAddress: ''
    })
    //console.log('Result', result)
    expect(result.status).to.equal('OK')  
    await setRam(user1, 'REGDOMAINRAM', result.fee_collected)
  })
 
  it(`Test: REGADDRESSRAM`, async () => {
    const result = await user1sdk.genericAction('registerFioAddress', { 
      fioAddress: user1Address,
      maxFee: config.api.register_fio_address.fee,
      walletFioAddress: ''
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')  
    await setRam(user1, 'REGADDRESSRAM', result.fee_collected)
  })

  it(`Test: ADDADDRESSRAM`, async () => {
    const result = await user1sdk.genericAction('addPublicAddresses', {
      fioAddress: user1Address,
      publicAddresses: [
        {
          chain_code: 'FIO',
          token_code: 'FIO',
          public_address: '1PMycacnJaSqwwJqjawXBErnLsZadsfasdf7RkXUAg',
        },
        {
          chain_code: 'BTC',
          token_code: 'BTC',
          public_address: '1PMycacnJaSqwsdfsdfwJqjawXBErnLsZ7RkXUAg',
        }
      ],
      maxFee: config.api.add_pub_address.fee,
      walletFioAddress: ''
    })
    expect(result.status).to.equal('OK')  
    await setRam(user1, 'ADDADDRESSRAM', result.fee_collected)
  })

  it(`Register user1Domain2 using pushTransaction`, async () => {
    try {
      const result = await user1sdk.genericAction('pushTransaction', {
        action: 'regdomain',
        account: 'fio.address',
        data: {
          fio_domain: user1Domain2,
          owner_fio_public_key: user1.publicKey,
          max_fee: config.api.register_fio_domain.fee,
          tpid: ''
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')  
      await setRam(user1, 'REGDOMAINRAM', result.fee_collected)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Register user1Address2`, async () => {
    const result = await user1sdk.genericAction('registerFioAddress', { 
      fioAddress: user1Address2,
      maxFee: config.api.register_fio_address.fee,
      walletFioAddress: ''
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')  
    await setRam(user1, 'REGADDRESSRAM', result.fee_collected)
  })

  it(`Test: NEWFUNDSREQUESTRAM`, async () => {
    try {
      const result = await user1sdk.genericAction('requestFunds', { 
        payerFioAddress: user1Address2, 
        payeeFioAddress: user1Address,
        maxFee: config.api.new_funds_request.fee,
        walletFioAddress: '',
        payeeTokenPublicAddress: randStr(80),
        amount: 100000,
        chainCode: 'FIO',
        tokenCode: 'FIO',
        memo: randStr(15),
        hash: user1.account,
        offlineUrl: randStr(10)
      })    
      //console.log('Result: ', result)
      expect(result.status).to.equal('requested')  
      await setRam(user1, 'NEWFUNDSREQUESTRAM', result.fee_collected)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Test: SETDOMAINPUBRAM`, async () => {
    try {
      const result = await user1sdk.genericAction('setFioDomainVisibility', {
        fioDomain: user1Domain,
        isPublic: true,
        maxFee: config.api.set_fio_domain_public.fee,
        walletFioAddress: ''
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
      await setRam(user1, 'SETDOMAINPUBRAM', result.fee_collected)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  /*
  it.skip(`Print RAM Usage`, async () => {
    printUserRam(user1)
  })
  */
})

describe('B. Test add_pub_address RAM Consumption', () => {

  it(`Initialize domains and addresses`, async () => {
    user2Domain = generateFioDomain(12)
    user2Address = generateFioAddress(user2Domain, 12)
    user2Address2 = generateFioAddress(user2Domain, 12)
  })

  it(`Transfer FIO to ramuserPublicKey to fund account`, async () => {
    try {
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: user2.publicKey,
        amount: 2000000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
      })  
      //console.log('Result', result)
      expect(result.status).to.equal('OK')  
      await setRam(user2, 'INITIALACCOUNTRAM', 0)
    } catch (err) {
      console.log('user2Domain', user2Domain)
      console.log('user2.publicKey', user2.publicKey)
      console.log('Error: ', err)
    }
  })

  it(`Register domain: user2Domain`, async () => {
    try{
      const result = await user2sdk.genericAction('registerFioDomain', { 
        fioDomain: user2Domain, 
        maxFee: config.api.register_fio_domain.fee ,
        walletFioAddress: ''
      })
      //console.log('Result', result)
      expect(result.status).to.equal('OK')  
      await setRam(user2, 'REGDOMAINRAM', result.fee_collected)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Register address: user2Address`, async () => {
    const result = await user2sdk.genericAction('registerFioAddress', { 
      fioAddress: user2Address,
      maxFee: config.api.register_fio_address.fee,
      walletFioAddress: ''
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')  
    await setRam(user2, 'REGADDRESSRAM', result.fee_collected)
  })

  it(`Register address: user2Address2`, async () => {
    const result = await user2sdk.genericAction('registerFioAddress', { 
      fioAddress: user2Address2,
      maxFee: config.api.register_fio_address.fee,
      walletFioAddress: ''
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')  
    await setRam(user2, 'REGADDRESSRAM', result.fee_collected)
  })

  it(`Do 30 request funds`, async () => {
    for (i = 0; i < 30; i++) {
      try {
        const result = await user2sdk.genericAction('requestFunds', { 
          payerFioAddress: user2Address, 
          payeeFioAddress: user2Address,
          maxFee: config.api.new_funds_request.fee,
          walletFioAddress: user2Address,
          payeeTokenPublicAddress: randStr(80),
          amount: 100000,
          chainCode: 'FIO',
          tokenCode: 'FIO',
          memo: randStr(15),
          hash: user2.account,
          offlineUrl: randStr(10)
        })    
        //console.log('Result: ', result)
        expect(result.status).to.equal('requested')  
        await setRam(user2, 'NEWFUNDSREQUESTRAM', result.fee_collected)
      } catch (err) {
        console.log('Error: ', err)
      }
    }
  })

  it(`Then do 4 addaddress`, async () => {
    for (i = 0; i < 8; i++) {
      try {
        const result = await user2sdk.genericAction('addPublicAddresses', {
          fioAddress: user2Address,
          publicAddresses: [
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(127)
            },
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(127)
            },
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(127)
            },
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(127)
            },
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(127)
            },
          ],
          maxFee: config.api.add_pub_address.fee,
          walletFioAddress: ''
        })
        expect(result.status).to.equal('OK')  
        await setRam(user2, 'ADDADDRESSRAM', result.fee_collected)
      } catch (err) {
        console.log('Error: ', err.json)
      }
    }
    //console.log('Account: ', user2.account)
    //console.log('Pub Address: ', user2.publicKey)
  })

  it(`Use up most of the bundles with requestFunds`, async () => {
    for (i = 0; i < 15; i++) {
      try {
        const result = await user2sdk.genericAction('requestFunds', { 
          payerFioAddress: user2Address, 
          payeeFioAddress: user2Address,
          maxFee: config.api.new_funds_request.fee,
          walletFioAddress: user2Address,
          payeeTokenPublicAddress: randStr(80),
          amount: 100000,
          chainCode: 'FIO',
          tokenCode: 'FIO',
          memo: randStr(15),
          hash: user2.account,
          offlineUrl: randStr(10)
        })    
        //console.log('Result: ', result)
        expect(result.status).to.equal('requested')  
        await setRam(user2, 'NEWFUNDSREQUESTRAM', result.fee_collected)
      } catch (err) {
        console.log('Error: ', err.json)
      }
    }
  })

  it(`Add 15 public addresses, 10 bundled, 5 not, you get a bump of 8528`, async () => {
    for (i = 0; i < 6; i++) {
      try {
        const result = await user2sdk.genericAction('addPublicAddresses', {
          fioAddress: user2Address,
          publicAddresses: [
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(127)
            },
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(127)
            },
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(127)
            },
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(127)
            },
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(127)
            },
          ],
          maxFee: config.api.add_pub_address.fee,
          walletFioAddress: ''
        })
        expect(result.status).to.equal('OK')  
        await setRam(user2, 'ADDADDRESSRAM', result.fee_collected)
      } catch (err) {
        console.log('Error: ', err.json)
      }
    }
    //console.log('Account: ', user2.account)
    //console.log('Pub Address: ', user2.publicKey)
  })

  it(`See what happens when request funds continues after the zero addaddress`, async () => {
    for (i = 0; i < 6; i++) {
      try {
        const result = await user2sdk.genericAction('requestFunds', { 
          payerFioAddress: user2Address, 
          payeeFioAddress: user2Address,
          maxFee: config.api.new_funds_request.fee,
          walletFioAddress: user2Address,
          payeeTokenPublicAddress: randStr(80),
          amount: 100000,
          chainCode: 'FIO',
          tokenCode: 'FIO',
          memo: randStr(15),
          hash: user2.account,
          offlineUrl: randStr(10)
        })    
        //console.log('Result: ', result)
        expect(result.status).to.equal('requested')  
        await setRam(user2, 'NEWFUNDSREQUESTRAM', result.fee_collected)
      } catch (err) {
        console.log('Error: ', err.json)
      }
    }
  })

  it(`Add 50 more from same account to different fio address`, async () => {
    for (i = 0; i < 10; i++) {
      try {
        const result = await user2sdk.genericAction('addPublicAddresses', {
          fioAddress: user2Address2,
          publicAddresses: [
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(127)
            },
            /*
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(127)
            },
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(127)
            },
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(127)
            },
            {
              chain_code: randStr(10),
              token_code: randStr(10),
              public_address: randStr(127)
            },
            */
          ],
          maxFee: config.api.add_pub_address.fee,
          walletFioAddress: ''
        })
        expect(result.status).to.equal('OK')  
        await setRam(user2, 'ADDADDRESSRAM', result.fee_collected)
      } catch (err) {
        console.log('Error: ', err.json)
      }
    }
  })
/*
  it.skip(`Print RAM Usage`, async () => {
    printUserRam(user2)
  })
*/
})
