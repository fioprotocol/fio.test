require('mocha')
const {expect} = require('chai')
const { newUser, callFioApi, generateFioDomain, generateFioAddress, createKeypair, fetchJson, randStr} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
const config = require('../config.js');



before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
})


describe('************************** ram.js ************************** \n    A. Test RAM Consumption', () => {
  let user1, user1Domain, user1Address, user1Ram, user1Domain2, user1Address2, user2;

  before(async () => {
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
  })

  it(`Create ramuser public/private keys`, async () => {
    user1Domain = generateFioDomain(15)
    user1Address = generateFioAddress(user1Domain, 15)
    user1Domain2 = generateFioDomain(15)
    user1Address2 = generateFioAddress(user1Domain, 15)
  })

  it(`Get RAM quota for user1`, async () => {
    try {
      const json = {
        "account_name": user1.account
      }
      result = await callFioApi("get_account", json);
      user1Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Test: REGDOMAINRAM`, async () => {
    const result = await user1.sdk.genericAction('registerFioDomain', {
      fioDomain: user1Domain,
      maxFee: config.maxFee,
      walletFioAddress: ''
    })
    //console.log('Result', result)
    expect(result.status).to.equal('OK')
  })

  it(`Confirm RAM quota for user1 was incremented by ${config.RAM.REGDOMAINRAM}`, async () => {
    try {
      let prevRam = user1Ram;
      const json = {
        "account_name": user1.account
      }
      result = await callFioApi("get_account", json);
      user1Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(user1Ram).to.equal(prevRam + config.RAM.REGDOMAINRAM);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Test: REGADDRESSRAM`, async () => {
    const result = await user1.sdk.genericAction('registerFioAddress', {
      fioAddress: user1Address,
      maxFee: config.api.register_fio_address.fee,
      walletFioAddress: ''
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`Confirm RAM quota for user1 was incremented by ${config.RAM.REGADDRESSRAM}`, async () => {
    try {
      let prevRam = user1Ram;
      const json = {
        "account_name": user1.account
      }
      result = await callFioApi("get_account", json);
      user1Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(user1Ram).to.equal(prevRam + config.RAM.REGADDRESSRAM);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Test: ADDADDRESSRAM`, async () => {
    const result = await user1.sdk.genericAction('addPublicAddresses', {
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
  })

  it(`Confirm RAM quota for user1 was incremented by ${config.RAM.ADDADDRESSRAM}`, async () => {
    try {
      let prevRam = user1Ram;
      const json = {
        "account_name": user1.account
      }
      result = await callFioApi("get_account", json);
      user1Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(user1Ram).to.equal(prevRam + config.RAM.ADDADDRESSRAM);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Register user1Domain2 using pushTransaction`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
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
      console.log('Error: ', err)
    }
  })

  it(`Confirm RAM quota for user1 was incremented by ${config.RAM.REGDOMAINRAM}`, async () => {
    try {
      let prevRam = user1Ram;
      const json = {
        "account_name": user1.account
      }
      result = await callFioApi("get_account", json);
      user1Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(user1Ram).to.equal(prevRam + config.RAM.REGDOMAINRAM);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Register user1Address2`, async () => {
    const result = await user1.sdk.genericAction('registerFioAddress', {
      fioAddress: user1Address2,
      maxFee: config.api.register_fio_address.fee,
      walletFioAddress: ''
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`Confirm RAM quota for user1 was incremented by ${config.RAM.REGADDRESSRAM}`, async () => {
    try {
      let prevRam = user1Ram;
      const json = {
        "account_name": user1.account
      }
      result = await callFioApi("get_account", json);
      user1Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(user1Ram).to.equal(prevRam + config.RAM.REGADDRESSRAM);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Test: NEWFUNDSREQUESTRAM`, async () => {
    try {
      const result = await user1.sdk.genericAction('requestFunds', {
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
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Confirm RAM quota for user1 was incremented by ${config.RAM.NEWFUNDSREQUESTRAM}`, async () => {
    try {
      let prevRam = user1Ram;
      const json = {
        "account_name": user1.account
      }
      result = await callFioApi("get_account", json);
      user1Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(user1Ram).to.equal(prevRam + config.RAM.NEWFUNDSREQUESTRAM);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Test: SETDOMAINPUBRAM`, async () => {
    try {
      const result = await user1.sdk.genericAction('setFioDomainVisibility', {
        fioDomain: user1Domain,
        isPublic: true,
        maxFee: config.api.set_fio_domain_public.fee,
        walletFioAddress: ''
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Confirm RAM quota for user1 was incremented by ${config.RAM.SETDOMAINPUBRAM}`, async () => {
    try {
      let prevRam = user1Ram;
      const json = {
        "account_name": user1.account
      }
      result = await callFioApi("get_account", json);
      user1Ram = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(user1Ram).to.equal(prevRam + config.RAM.SETDOMAINPUBRAM);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Test: ADDNFTRAM - Add 1 NFT`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [{
            "chain_code": "ETH", "contract_address": "0x123456789ABCDEF", "token_id": "1", "url": "", "hash": "", "metadata": ""
          }],
          max_fee: config.maxFee,
          actor: user1.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK')

    } catch (err) {
      console.log(err.message)
      expect(err).to.equal(null);
    }
  })

  it(`Confirm RAM quota for user1 was incremented by ${config.RAM.ADDNFTRAMBASE + (1 * config.RAM.ADDNFTRAM)}`, async () => {
    try {
      let prevRam = user1Ram;
      const json = {
        "account_name": user1.account
      }
      result = await callFioApi("get_account", json);
      user1Ram = result.ram_quota;
      expect(user1Ram).to.equal(prevRam + config.RAM.ADDNFTRAMBASE + (1 * config.RAM.ADDNFTRAM));
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Test: ADDNFTRAM - Add 2 NFTs`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'addnft',
        account: 'fio.address',
        data: {
          fio_address: user1.address,
          nfts: [
            {"chain_code": "TEST1", "contract_address": "0x123456789ABCDEF", "token_id": "1", "url": "", "hash": "", "metadata": ""},
            {"chain_code": "TEST2", "contract_address": "0x123456789ABCDEFHIJK", "token_id": "2", "url": "", "hash": "", "metadata": ""}
          ],
          max_fee: config.maxFee,
          actor: user1.account,
          tpid: ""
        }
      })
      //console.log(`Result: `, result)
      expect(result.status).to.equal('OK')

    } catch (err) {
      console.log(err.message)
      expect(err).to.equal(null);
    }
  })

  it(`Confirm RAM quota for user1 was incremented by ${config.RAM.ADDNFTRAMBASE + (2 * config.RAM.ADDNFTRAM)}`, async () => {
    try {
      let prevRam = user1Ram;
      const json = {
        "account_name": user1.account
      }
      result = await callFioApi("get_account", json);
      user1Ram = result.ram_quota;
      expect(user1Ram).to.equal(prevRam + config.RAM.ADDNFTRAMBASE + (2 * config.RAM.ADDNFTRAM));
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})

describe('B. Test add_pub_address RAM Consumption', () => {

  let user2, user2Domain, user2Address, userRam, user2Address2

  before(async () => {
    user2 = await newUser(faucet);
  })

  it(`Initialize domains and addresses`, async () => {
    user2Domain = generateFioDomain(12)
    user2Address = generateFioAddress(user2Domain, 12)
    user2Address2 = generateFioAddress(user2Domain, 12)
  })

  it(`Register domain: user2Domain`, async () => {
    try{
      const result = await user2.sdk.genericAction('registerFioDomain', {
        fioDomain: user2Domain,
        maxFee: config.api.register_fio_domain.fee ,
        walletFioAddress: ''
      })
      //console.log('Result', result)
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Register address: user2Address`, async () => {
    const result = await user2.sdk.genericAction('registerFioAddress', {
      fioAddress: user2Address,
      maxFee: config.api.register_fio_address.fee,
      walletFioAddress: ''
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK');
  })

  it(`Register address: user2Address2`, async () => {
    const result = await user2.sdk.genericAction('registerFioAddress', {
      fioAddress: user2Address2,
      maxFee: config.api.register_fio_address.fee,
      walletFioAddress: ''
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK');
  })

  it(`Get RAM quota for user2`, async () => {
    try {
      const json = {
        "account_name": user2.account
      }
      result = await callFioApi("get_account", json);
      userRam = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Do 30 request funds`, async () => {
    for (i = 0; i < 30; i++) {
      try {
        const result = await user2.sdk.genericAction('requestFunds', {
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
        expect(result.status).to.equal('requested');
      } catch (err) {
        console.log('Error: ', err)
      }
    }
  })

  it(`Confirm RAM quota for user2 was incremented by ${config.RAM.NEWFUNDSREQUESTRAM * 30}`, async () => {
    try {
      let prevRam = userRam;
      const json = {
        "account_name": user2.account
      }
      result = await callFioApi("get_account", json);
      userRam = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(userRam).to.equal(prevRam + config.RAM.NEWFUNDSREQUESTRAM * 30);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Then do 8 addaddress (each with 4 new addresses)`, async () => {
    for (i = 0; i < 8; i++) {
      try {
        const result = await user2.sdk.genericAction('addPublicAddresses', {
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
      } catch (err) {
        console.log('Error: ', err.json)
      }
    }
    //console.log('Account: ', user2.account)
    //console.log('Pub Address: ', user2.publicKey)
  })

  it(`Confirm RAM quota for user2 was incremented by ${config.RAM.ADDADDRESSRAM} * 8`, async () => {
    try {
      let prevRam = userRam;
      const json = {
        "account_name": user2.account
      }
      result = await callFioApi("get_account", json);
      userRam = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(userRam).to.equal(prevRam + config.RAM.ADDADDRESSRAM * 8);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Use up most of the bundles with requestFunds`, async () => {
    for (i = 0; i < 15; i++) {
      try {
        const result = await user2.sdk.genericAction('requestFunds', {
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
      } catch (err) {
        console.log('Error: ', err.json)
      }
    }
  })

  it(`Get updated RAM quota for user2`, async () => {
    try {
      const json = {
        "account_name": user2.account
      }
      result = await callFioApi("get_account", json);
      userRam = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Call addaddress 6 times. Adds 15 public addresses, 10 bundled, 5 not.`, async () => {
    for (i = 0; i < 6; i++) {
      try {
        const result = await user2.sdk.genericAction('addPublicAddresses', {
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
      } catch (err) {
        console.log('Error: ', err.json)
      }
    }
    //console.log('Account: ', user2.account)
    //console.log('Pub Address: ', user2.publicKey)
  })

  it(`Confirm RAM quota for user2 was incremented by ${config.RAM.ADDADDRESSRAM} * 6`, async () => {
    try {
      let prevRam = userRam;
      const json = {
        "account_name": user2.account
      }
      result = await callFioApi("get_account", json);
      userRam = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(userRam).to.equal(prevRam + config.RAM.ADDADDRESSRAM * 6);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Call requestFunds 6 times`, async () => {
    for (i = 0; i < 6; i++) {
      try {
        const result = await user2.sdk.genericAction('requestFunds', {
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
      } catch (err) {
        console.log('Error: ', err.json)
      }
    }
  })

  it(`Confirm RAM quota for user2 was incremented by ${config.RAM.NEWFUNDSREQUESTRAM} * 6`, async () => {
    try {
      let prevRam = userRam;
      const json = {
        "account_name": user2.account
      }
      result = await callFioApi("get_account", json);
      userRam = result.ram_quota;
      //console.log('Ram quota: ', result.ram_quota);
      expect(userRam).to.equal(prevRam + config.RAM.NEWFUNDSREQUESTRAM * 6);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})
