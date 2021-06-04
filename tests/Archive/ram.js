require('mocha')
const {expect} = require('chai')
const {Ram, generateFioDomain, generateFioAddress, fetchJson, randStr, timeout, createKeypair} = require('../../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../../config.js');

let user1, user2

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
  await timeout(1000)
  user1 = await createKeypair();
  user1sdk = new FIOSDK(user1.privateKey, user1.publicKey, config.BASE_URL, fetchJson)
  user1Ram = new Ram(user1.account);
  await timeout(1000)
  user2 = await createKeypair();
  user2sdk = new FIOSDK(user2.privateKey, user2.publicKey, config.BASE_URL, fetchJson)
  user2Ram = new Ram(user2.account);
})


describe('Test RAM Consumption', () => {

  it(`Create ramuser public/private keys`, async () => {
    user1Domain = generateFioDomain(15)
    user1Address = generateFioAddress(user1Domain, 15)
    user1Domain2 = generateFioDomain(15)
    user1Address2 = generateFioAddress(user1Domain, 15)

    //console.log('ramuserAccount: ', user1.account)
    //console.log('ramuserPublicKey: ', user1.publicKey)
    //console.log('ramuserPrivateKey: ', user1.privateKey)
    //user1Ram = new Ram(user1.account);

  })

  it(`Transfer FIO to ramuserPublicKey to fund account. Test: INITIALACCOUNTRAM`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: 2000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
    })
    //console.log('Result', result)
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
  })

  it(`Set RAM info`, async () => {
    const result = await user1Ram.setRamData('INITIALACCOUNTRAM', user1)
    expect(result.txnQuota).to.equal(config.RAM.INITIALACCOUNTRAM)
  })

  it(`Test: REGDOMAINRAM`, async () => {
    const result = await user1sdk.genericAction('registerFioDomain', {
      fioDomain: user1Domain,
      maxFee: config.api.register_fio_domain.fee ,
      walletFioAddress: ''
    })
    //console.log('Result', result)
    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected')
  })

  it(`Set RAM info`, async () => {
    const result = await user1Ram.setRamData('REGDOMAINRAM', user1)
    expect(result.txnQuota).to.be.greaterThan(0)
  })

  it(`Test: REGADDRESSRAM`, async () => {
    const result = await user1sdk.genericAction('registerFioAddress', {
      fioAddress: user1Address,
      maxFee: config.api.register_fio_address.fee,
      walletFioAddress: ''
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`Set RAM info`, async () => {
    const result = await user1Ram.setRamData('REGADDRESSRAM', user1)
    expect(result.txnQuota).to.be.greaterThan(0)
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
    expect(result).to.have.all.keys('status', 'fee_collected')
  })

  it(`Set RAM info`, async () => {
    const result = await user1Ram.setRamData('ADDADDRESSRAM', user1)
    expect(result.txnQuota).to.be.greaterThan(0)
  })

  it(`Test REGDOMAINRAM using pushTransaction`, async () => {
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
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Set RAM info`, async () => {
    const result = await user1Ram.setRamData('REGDOMAINRAM', user1)
    expect(result.txnQuota).to.be.greaterThan(0)
  })


  it(`Test: NEWFUNDSREQUESTRAM`, async () => {
    try {
      const result = await user1sdk.genericAction('requestFunds', {
        payerFioAddress: user1Address,
        payeeFioAddress: user1Address,
        maxFee: config.api.new_funds_request.fee,
        walletFioAddress: user1Address,
        payeeTokenPublicAddress: randStr(80),
        amount: 100000,
        chainCode: randStr(10),
        tokenCode: randStr(10),
        memo: randStr(15),
        hash: ramuser.account,
        offlineUrl: randStr(10)
      })
      //console.log('Result: ', result)
      expect(result).to.have.all.keys('status', 'fio_request_id', 'fee_collected')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Set RAM info`, async () => {
    const result = await user1Ram.setRamData('NEWFUNDSREQUESTRAM', user1)
    expect(result.txnQuota).to.be.greaterThan(0)
  })

  it(`Test: SETDOMAINPUBRAM`, async () => {
    const result = await user1sdk.genericAction('setFioDomainVisibility', {
      fioDomain: user1Domain,
      isPublic: true,
      maxFee: fioData.api.set_fio_domain_public.fee,
      walletFioAddress: ''
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')
    //const result = await user1Ram.setRamData('SETDOMAINPUBRAM', user1Ram)
  })

  it(`Test: RECORDOBTRAM`, async () => {
    const result = await user1sdk.genericAction('recordObtData', {
      fioRequestId: requestId,
      payerFIOAddress: testFioAddressName,
      payeeFIOAddress: testFioAddressName2,
      payerTokenPublicAddress: publicKey,
      payeeTokenPublicAddress: publicKey2,
      amount: fundsAmount,
      chainCode: fioChainCode,
      tokenCode: fioTokenCode,
      status: 'sent_to_blockchain',
      obtId: '',
      maxFee: defaultFee,
    })
    expect(result.status).to.equal('OK')
    //const result = await user1Ram.setRamData('RECORDOBTRAM', user1)
  })

  it(`Print RAM Usage`, async () => {
    user1Ram.printRam()
  })
})

/*
        SETDOMAINPUBRAM: 256,
        BURNEXPIREDRAM: 0,
        RECORDOBTRAM: 1024,
        RENEWADDRESSRAM: 256,
        RENEWDOMAINRAM: 256,
        TPIDCLAIMRAM: 0,
        BPCLAIMRAM: 0,
        TRANSFERRAM: 0,
        TRANSFERPUBKEYRAM: 2560,
        REJECTFUNDSRAM: 512,
        UPDATEFEESRAM: 0,
        SETFEEVOTERAM: 512,
        SETFEEMULTRAM: 0
        */


describe('Test add_pub_address RAM Consumption', () => {

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
      console.log('Result', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('user2Domain', user2Domain)
      console.log('user2.publicKey', user2.publicKey)
      console.log('Error: ', err)
    }
    const result2 = await user2Ram.setRamData('INITIALACCOUNTRAM', result.fee_collected, user2)
  })

  it(`Register domain: user2Domain`, async () => {
    const result = await user2sdk.genericAction('registerFioDomain', {
      fioDomain: user2Domain,
      maxFee: config.api.register_fio_domain.fee ,
      walletFioAddress: ''
    })
    //console.log('Result', result)
    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected')
  })

  it(`Register address: user2Address`, async () => {
    const result = await user2sdk.genericAction('registerFioAddress', {
      fioAddress: user2Address,
      maxFee: config.api.register_fio_address.fee,
      walletFioAddress: ''
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`Register address: user2Address2`, async () => {
    const result = await user2sdk.genericAction('registerFioAddress', {
      fioAddress: user2Address2,
      maxFee: config.api.register_fio_address.fee,
      walletFioAddress: ''
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`do 30 request funds`, async () => {
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
          hash: ramuser.account,
          offlineUrl: randStr(10)
        })
        //console.log('Result: ', result)
        const result2 = await user2Ram.setRamData('NEWFUNDSREQUESTRAM', result.fee_collected, user2)
        //console.log(i + '. fee collected: ', result.fee_collected)
        expect(result).to.have.all.keys('status', 'fio_request_id', 'fee_collected')
      } catch (err) {
        console.log('Error: ', err.json)
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
        const result2 = await user2Ram.setRamData('ADDADDRESSRAM', result.fee_collected, user2)
        //console.log(i + '. fee collected: ', result.fee_collected)
      } catch (err) {
        console.log('Error: ', err.json)
      }
    }
    console.log('Account: ', user2.account)
    console.log('Pub Address: ', user2.publicKey)
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
          hash: ramuser.account,
          offlineUrl: randStr(10)
        })
        //console.log('Result: ', result)
        const result2 = await user2Ram.setRamData('NEWFUNDSREQUESTRAM', result.fee_collected, user2)
        //console.log(i + '. fee collected: ', result.fee_collected)
        expect(result).to.have.all.keys('status', 'fio_request_id', 'fee_collected')
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
        const result2 = await user2Ram.setRamData('ADDADDRESSRAM', result.fee_collected, user2)
        //console.log(i + '. fee collected: ', result.fee_collected)
      } catch (err) {
        console.log('Error: ', err.json)
      }
    }
    console.log('Account: ', user2.account)
    console.log('Pub Address: ', user2.publicKey)
  })

  it.skip(`See what happens when request funds continues after the zero addaddress`, async () => {
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
          hash: ramuser.account,
          offlineUrl: randStr(10)
        })
        //console.log('Result: ', result)
        const result2 = await user2Ram.setRamData('NEWFUNDSREQUESTRAM', result.fee_collected, user2)
        //console.log(i + '. fee collected: ', result.fee_collected)
        expect(result).to.have.all.keys('status', 'fio_request_id', 'fee_collected')
      } catch (err) {
        console.log('Error: ', err.json)
      }
    }
  })

  it.skip(`Add 50 more from same account to different fio address`, async () => {
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
        const result2 = await user2Ram.setRamData('ADDADDRESSRAM', result.fee_collected, user2)
        console.log(i + '. fee collected: ' + result.fee_collected)
      } catch (err) {
        console.log('Error: ', err.json)
      }
    }
  })

  it(`Print RAM Usage`, async () => {
    ramLog.printRam()
  })

})
