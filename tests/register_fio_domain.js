require('mocha')
config = require('../config.js');
const {expect} = require('chai')
const {newUser, fetchJson, generateFioDomain, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')


before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe(`************************** register_fio_domain.js ************************** \n A. Check valid and invalid domain and address formats`, () => {
    let userA1
    const fiftyfiveChars = "0123456789012345678901234567890123456789012345678901234"
    domain0Bad = ""
    domain1Good = generateFioDomain(1);
    domain2Good = generateFioDomain(2);
    domain62Good = fiftyfiveChars + Math.random().toString(26).substr(2, 7)
    domain63Bad = fiftyfiveChars + Math.random().toString(26).substr(2, 8)
    address1at62Good = Math.random().toString(26).substr(2, 1) + "@" + domain62Good
    address2at62Bad = Math.random().toString(26).substr(2, 2) + "@" + domain62Good
    address62at1Good = fiftyfiveChars + Math.random().toString(26).substr(2, 7) + "@" + domain1Good
    address62at2Bad = fiftyfiveChars + Math.random().toString(26).substr(2, 8) + "@" + domain2Good

    it(`Create users and domains`, async () => {
        userA1 = await newUser(faucet);
    })
    
    it(`Transfer in additional funds for domain registration`, async () => {
      try {
        const result = await faucet.genericAction('transferTokens', {
          payeeFioPublicKey: userA1.publicKey,
          amount: 8000000000000,
          maxFee: config.api.transfer_tokens_pub_key.fee,
        })  
        //console.log('Result', result)
        expect(result.status).to.equal('OK')  
      } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
      }
    })

    it(`Get balance for userA1`, async () => {
      try {
        const result = await userA1.sdk.genericAction('getFioBalance', {
          fioPublicKey: userA1.publicKey
        }) 
        //console.log('userA1 fio balance', result)
      } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
      }
  })
     
    it(`Register domain of length 0 returns ${config.error.fioDomainRequired}`, async () => {
        try {
          const result = await userA1.sdk.genericAction('registerFioDomain', { 
              fioDomain: domain0Bad, 
              maxFee: config.api.register_fio_domain.fee,
              technologyProviderId: ''
        })
          //console.log('Result: ', result)
        } catch (err) {
          //console.log('Error: ', err.list[0].message)
          expect(err.list[0].message).to.equal(config.error.fioDomainRequired)
        } 
    })
    
    it(`Register domain of length 1 succeeds: ${domain1Good}`, async () => {
        const result = await userA1.sdk.genericAction('registerFioDomain', { 
          fioDomain: domain1Good, 
          maxFee: config.api.register_fio_domain.fee,
          technologyProviderId: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
    })
    
    it(`Register domain of length 2 succeeds: ${domain2Good}`, async () => {
      try {
        const result = await userA1.sdk.genericAction('registerFioDomain', { 
          fioDomain: domain2Good, 
          maxFee: config.api.register_fio_domain.fee,
          technologyProviderId: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error: ', err.json.fields[0].error)
        expect(err).to.equal(null)
      } 
    })
    
    it(`Register domain of length 62 succeeds: ${domain62Good}`, async () => {
      try {
        const result = await userA1.sdk.genericAction('registerFioDomain', { 
          fioDomain: domain62Good, 
          maxFee: config.api.register_fio_domain.fee,
          technologyProviderId: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error: ', err.json.fields[0].error)
        expect(err).to.equal(null)
      } 
    })
    
    it(`Register domain of length 63 fails: ${domain63Bad}`, async () => {
      try {
        const result = await userA1.sdk.genericAction('registerFioDomain', { 
          fioDomain: domain63Bad, 
          maxFee: config.api.register_fio_domain.fee,
          technologyProviderId: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        //console.log('Error: ', err.list[0].message)
        expect(err.list[0].message).to.equal(config.error.fioDomainLengthErr)
      } 
    })
    
    it(`Register domain of fails: "##asdf#"`, async () => {
      try {
        const result = await userA1.sdk.genericAction('registerFioDomain', { 
            fioDomain: "##asdf#", 
            maxFee: config.api.register_fio_domain.fee,
            technologyProviderId: ''
        })
        console.log('Result: ', result)
      } catch (err) {
        //console.log('Error: ', err.list[0].message)
        expect(err.list[0].message).to.equal(config.error.fioDomainInvalidChar)
      } 
    })
    
    it(`Register address length 1@62 succeeds: ${address1at62Good} (fixed in 1.1.0)`, async () => {
      try {
        const result = await userA1.sdk.genericAction('registerFioAddress', {
          fioAddress: address1at62Good,
          maxFee: config.api.register_fio_domain.fee,
          technologyProviderId: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error: ', err.list[0])
        expect(err).to.equal(null)
      } 
    })
    
    it(`Register address length 2@62 fails: ${address2at62Bad}`, async () => {
      try {
        const result = await userA1.sdk.genericAction('registerFioAddress', {
          fioAddress: address2at62Bad,
          maxFee: config.api.register_fio_domain.fee,
          technologyProviderId: ''
        })
        console.log('Result: ', result)
        expect(result.status).to.equal('')
      } catch (err) {
        //console.log('Error: ', err.list[0])
        expect(err.list[0].message).to.equal(config.error.fioAddressLengthErr)
      } 
    })
    
    it(`Register address length 62@1 succeeds: ${address62at1Good} (fixed in 1.1.0)`, async () => {
      try {
        const result = await userA1.sdk.genericAction('registerFioAddress', {
          fioAddress: address62at1Good,
          maxFee: config.api.register_fio_domain.fee,
          technologyProviderId: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
      } catch (err) {
        console.log('Error: ', err.list[0])
        expect(err).to.equal(null)
      } 
    })
    
    it(`Register address length 62@2 fails: ${address62at2Bad}`, async () => {
      try {
        const result = await userA1.sdk.genericAction('registerFioAddress', {
          fioAddress: address62at2Bad,
          maxFee: config.api.register_fio_domain.fee,
          technologyProviderId: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('')
      } catch (err) {
        //console.log('Error: ', err.list[0])
        expect(err.list[0].message).to.equal(config.error.fioAddressLengthErr)
      } 
    })
    
})
    
describe('B. Test isAvailable using bad FIO addresses', () => {
    let userB1
    const badFioAddresses = ["-dash@notatstart", "two@at@isinvalid", "old:shouldntwork", "dash@notending-"]    

    it(`Create users`, async () => {
        userB1 = await newUser(faucet)
    })
    
    it(`isAvailable for address randomgoodaddress@randomdomain succeeds`, async () => {
      try {
          const result = await userB1.sdk.genericAction('isAvailable', {
              fioName: 'randomgoodaddress@randomdomain',
          })
          //console.log('Result: ', result)
          expect(result.is_registered).to.equal(0)
      } catch (err) {
          //console.log('Error: ', err.json)
          expect(err.json.fields[0].error).to.equal(null)
      } 
  })
    
    badFioAddresses.forEach(function (fioAddress, index) {
        it(`isAvailable for address ${fioAddress} fails`, async () => {
            try {
                const result = await userB1.sdk.genericAction('isAvailable', {
                    fioName: fioAddress,
                })
                //console.log('Result: ', result)
                expect(result.is_registered).to.equal(null)  // Should not get hit.
            } catch (err) {
                //console.log('Error: ', err.json.fields[0].error)
                expect(err.json.fields[0].error).to.equal(config.error.invalidFioName)
            } 
        })
    })
    
})


describe('C. Register domain for other user', () => {
  let userC1, userC2, newFioDomain

  it(`Create users`, async () => {
    userC1 = await newUser(faucet)
    userC2 = await newUser(faucet)

    newFioDomain = generateFioDomain(15)
  })
  
  it(`userC1 registers domain ${newFioDomain} for userC2`, async () => {
    const result = await userC1.sdk.genericAction('pushTransaction', {
      action: 'regdomain',
      account: 'fio.address',
      data: {
        fio_domain: newFioDomain,
        owner_fio_public_key: userC2.publicKey,
        max_fee: config.api.register_fio_domain.fee,
        tpid: ''
      }
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`get_fio_names for userC2; Confirm ${newFioDomain}`, async () => {
    const result = await userC1.sdk.genericAction('getFioNames', { fioPublicKey: userC2.publicKey })
    //console.log('Result: ', result)
    expect(result.fio_domains[1].fio_domain).to.equal(newFioDomain)
  })

})

describe('D. Try to re-register the same domain using different case', () => {
  let userD1, domainLowerCase, domainUpperCase

  it(`Create users`, async () => {
    userD1 = await newUser(faucet)

    domainLowerCase = generateFioDomain(15)
    domainUpperCase = domainLowerCase.charAt(0).toUpperCase() + domainLowerCase.slice(1)
  })

  it(`Domain is not registered: ${domainLowerCase}`, async () => {
    const result = await userD1.sdk.genericAction('isAvailable', {
      fioName: domainLowerCase,
    })
    //console.log('Result: ', result)
    expect(result.is_registered).to.equal(0)
  })

  it(`Register domain: ${domainLowerCase} succeeds`, async () => {
    const result = await userD1.sdk.genericAction('registerFioDomain', { 
      fioDomain: domainLowerCase, 
      maxFee: config.api.register_fio_domain.fee ,
      technologyProviderId: ''
    })
    //console.log('Result: ', result)
    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected')
  })

  
  it(`Register same domain with uppercase first letter: ${domainUpperCase} returns: ${config.error.domainRegistered}`, async () => {
    await timeout(2000) //To avoid this getting flagged as duplicate transaction
    try {
      const result = await userD1.sdk.genericAction('registerFioDomain', { 
        fioDomain: domainUpperCase, 
        maxFee: config.api.register_fio_domain.fee ,
        technologyProviderId: ''
      })
      //console.log('Result: ', result)
    } catch (err) {
      //console.log('Error: ', err)
      expect(err.json.fields[0].error).to.equal(config.error.domainRegistered)
    } 
  })

})
