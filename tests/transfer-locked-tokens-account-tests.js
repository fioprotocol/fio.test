require('mocha')
const {expect} = require('chai')
const {FIOSDK } = require('@fioprotocol/fiosdk')
const {newUser, fetchJson, timeout, generateFioDomain, generateFioAddress, createKeypair, getTestType, getTotalVotedFio, getAccountVoteWeight, getProdVoteTotal, callFioApi} = require('../utils.js');
const config = require('../config.js');
const testType = getTestType();

let transfer_tokens_pub_key_fee
let privateKey, publicKey, privateKey2, publicKey2, account, account2, testFioDomain, testFioAddressName, testFioAddressName2
let fioSdk, fioSdk2, fioSdkFaucet

const fioTokenCode = 'FIO'
const fioChainCode = 'FIO'
const ethTokenCode = 'ETH'
const ethChainCode = 'ETH'
const fundAmount = 800 * FIOSDK.SUFUnit
const defaultFee = 800 * FIOSDK.SUFUnit
const receiveTransferTimout = 5000
const lockedFundsAmount = 500000000000

const generateObtId = () => {
  return `${Date.now()}`
}

before(async () => {
  fioSdkFaucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);

  const keys = await createKeypair();
  privateKey = keys.privateKey
  publicKey = keys.publicKey
  account = keys.account
  fioSdk = new FIOSDK(privateKey, publicKey, config.BASE_URL, fetchJson);

  const keys2 = await createKeypair();
  privateKey2 = keys2.privateKey
  publicKey2 = keys2.publicKey
  account2 = keys2.account
  fioSdk2 = new FIOSDK(privateKey2, publicKey2, config.BASE_URL, fetchJson);

  result = await fioSdkFaucet.getFee('transfer_tokens_pub_key');
  transfer_tokens_pub_key_fee = result.fee;
})

describe(`************************** transfer-locked-tokens-account-tests.js ************************** \n    A. Create accounts for tests`, () => {

  /*
  it.skip(`Show keys`, async () => {
    console.log('privateKey: ', privateKey)
    console.log('publicKey: ', publicKey)
    console.log('privateKey2: ', privateKey2)
    console.log('publicKey2: ', publicKey2)
  })
  */

  it(`(${testType}) Create fioSdk account: transferLockedTokens ${lockedFundsAmount}, canvote false, (20,40%) and (40,60%)`, async () => {
    if (testType == 'sdk') {
      try {
        const result = await fioSdkFaucet.genericAction('transferLockedTokens', {
          payeePublicKey: publicKey,
          canVote: false,
          periods: [
            {
              duration: 3600,
              percent: 40.0,
            },
            {
              duration: 3640,
              percent: 60.0,
            }
          ],
          amount: lockedFundsAmount,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.equal('OK')
        expect(result).to.have.all.keys( 'status', 'fee_collected')
      } catch (err) {
        console.log('Error', err)
      }
    } else {  
      try {
        const result = await fioSdkFaucet.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: publicKey,
            can_vote: 0,
            periods: [
              {
                duration: 3600,
                percent: 40.0,
              },
              {
                duration: 3640,
                percent: 60.0,
              }
            ],
            amount: lockedFundsAmount,
            max_fee: 400000000000,
            tpid: '',
            actor: fioSdkFaucet.account,
          }

        })
        expect(result.status).to.equal('OK')
        expect(result).to.have.all.keys( 'status', 'fee_collected')
      } catch (err) {
        console.log(' Error', err)
      }
    }
  })

  it(`(${testType}) Create fioSdk account: transferLockedTokens ${lockedFundsAmount}, canvote false, (20,40%) and (40,60%)`, async () => {
    if (testType == 'sdk') {
      try {
        const result = await fioSdkFaucet.genericAction('transferLockedTokens', {
          payeePublicKey: publicKey2,
          canVote: false,
          periods: [
            {
              duration: 3600,
              percent: 30.0,
            },
            {
              duration: 3640,
              percent: 70.0,
            }
          ],
          amount: lockedFundsAmount,
          maxFee: 400000000000,
          tpid: '',

        })
        expect(result.status).to.equal('OK')
        expect(result).to.have.all.keys( 'status', 'fee_collected')
      } catch (err) {
        console.log('Error', err)
      }
    } else {  
      try {
        const result = await fioSdkFaucet.genericAction('pushTransaction', {
          action: 'trnsloctoks',
          account: 'fio.token',
          data: {
            payee_public_key: publicKey2,
            can_vote: 0,
            periods: [
              {
                duration: 3600,
                percent: 30.0,
              },
              {
                duration: 3640,
                percent: 70.0,
              }
            ],
            amount: lockedFundsAmount,
            max_fee: 400000000000,
            tpid: '',
            actor: fioSdkFaucet.account,
          }

        })
        expect(result.status).to.equal('OK')
        expect(result).to.have.all.keys( 'status', 'fee_collected')
      } catch (err) {
        console.log(' Error', err)
      }
    }
  })

  it(`getFioBalance for fioSdk and confirm 'available' = 0`, async () => {
    const result = await fioSdk.genericAction('getFioBalance', {})
    //console.log('Result: ', result)
    expect(result).to.have.all.keys('balance', 'available')
    expect(result.available).equal(0)
  })

  it(`Call get_table_rows from locktokens and confirm: lock_amount - remaining_lock_amount = 0`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio', 
        scope: 'eosio',   
        table: 'locktokens',   
        lower_bound: account,     
        upper_bound: account,
        key_type: 'i64',       
        index_position: '2' 
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  //try to transfer, fail.
  it(`FAIL Transfer 1 FIO from locked token account, no funds unlocked`, async () => {
    try{
      const result = await fioSdk.genericAction('transferTokens', {
        payeeFioPublicKey: publicKey2,
        amount: 1000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
    } catch (err) {
      var expected = `Error 400`
      expect(err.message).to.include(expected)
    }
  })

  it(`getFioBalance for fioSdk2 and confirm 'available' = 0`, async () => {
    const result = await fioSdk2.genericAction('getFioBalance', {})
    //console.log('Result: ', result)
    expect(result).to.have.all.keys('balance', 'available')
    expect(result.available).equal(0)
  })

  it(`Call get_table_rows from locktokens and confirm: lock_amount - remaining_lock_amount = 0`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio', 
        scope: 'eosio',   
        table: 'locktokens',   
        lower_bound: account2,     
        upper_bound: account2,
        key_type: 'i64',       
        index_position: '2' 
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);
      expect(result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

    //try to transfer, fail.
    it(`FAIL Transfer 1 FIO from locked token account, no funds unlocked`, async () => {
      try{
        const result = await fioSdk2.genericAction('transferTokens', {
          payeeFioPublicKey: publicKey,
          amount: 1000000000,
          maxFee: config.api.transfer_tokens_pub_key.fee,
          technologyProviderId: ''
        })
      } catch (err) {
        var expected = `Error 400`
        expect(err.message).to.include(expected)
      }
    })

  it(`Transfer additional tokens to account for testing`, async () => {
    // Then transfer additional non-locke tokens to the account for the tests
    await fioSdkFaucet.transferTokens(publicKey, fundAmount * 4, defaultFee)
    await fioSdkFaucet.transferTokens(publicKey2, fundAmount, defaultFee)

    await timeout(receiveTransferTimout)
  })

  let balance1, balance2;
  it(`[Fix for Bahamas release] getFioBalance for fioSdk and confirm 'available' > 0`, async () => {
    const result = await fioSdk.genericAction('getFioBalance', {})
    //console.log('Result: ', result)
    balance1 = result.balance;
    // Add back: expect(result).to.have.all.keys('balance', 'available')
    //expect(result.available).is.greaterThan(0)
  })

  it(`Call get_table_rows from locktokens and confirm: lock_amount - remaining_lock_amount > 0`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio', 
        scope: 'eosio',   
        table: 'locktokens',   
        lower_bound: account,     
        upper_bound: account,
        key_type: 'i64',       
        index_position: '2' 
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);
      expect(balance1 - result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).is.greaterThan(0)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`[Fix for Bahamas release] getFioBalance for fioSdk2 and confirm 'available' > 0`, async () => {
    const result = await fioSdk2.genericAction('getFioBalance', {})
    //console.log('Result: ', result)
    balance2 = result.balance
    // Add back: expect(result).to.have.all.keys('balance', 'available')
    //expect(result.available).is.greaterThan(0)
  })

  it(`Call get_table_rows from locktokens and confirm: lock_amount - remaining_lock_amount > 0`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio', 
        scope: 'eosio',   
        table: 'locktokens',   
        lower_bound: account2,     
        upper_bound: account2,
        key_type: 'i64',       
        index_position: '2' 
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);
      expect(balance2 - result.rows[0].lock_amount - result.rows[0].remaining_lock_amount).is.greaterThan(0)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Register domains and addresses`, async () => {
    testFioDomain = generateFioDomain(8)
    testFioAddressName = generateFioAddress(testFioDomain, 7)
    testFioAddressName2 = generateFioAddress(testFioDomain, 5)

    try {
      await fioSdkFaucet.genericAction('registerFioDomain', {
        fioDomain: testFioDomain,
        maxFee: defaultFee
      })

      await fioSdkFaucet.genericAction('setFioDomainVisibility', {
        fioDomain: testFioDomain,
        isPublic: true,
        maxFee: defaultFee
      })

      const isAvailableResult = await fioSdk.genericAction('isAvailable', {
        fioName: testFioAddressName
      })
      if (!isAvailableResult.is_registered) {
        await fioSdk.genericAction('registerFioAddress', {
          fioAddress: testFioAddressName,
          maxFee: defaultFee
        })
      }

      const isAvailableResult2 = await fioSdk2.genericAction('isAvailable', {
        fioName: testFioAddressName2
      })
      if (!isAvailableResult2.is_registered) {
        await fioSdk2.genericAction('registerFioAddress', {
          fioAddress: testFioAddressName2,
          maxFee: defaultFee
        })
      }

    } catch (e) {
      console.log(e);
    }
  })
})

describe('B. Testing generic actions', () => {
  let pubKeyForTransfer

  const newFioDomain = generateFioDomain(8)
  const newFioAddress = generateFioAddress(newFioDomain, 7)

  it(`FIO Key Generation Testing`, async () => {
    const keys = await createKeypair();
    pubKeyForTransfer = keys.publicKey
  })

  it(`FIO Key Generation Testing`, async () => {
    const testMnemonic = 'valley alien library bread worry brother bundle hammer loyal barely dune brave'
    const privateKeyRes = await FIOSDK.createPrivateKeyMnemonic(testMnemonic)
    expect(privateKeyRes.fioKey).to.equal('5Kbb37EAqQgZ9vWUHoPiC2uXYhyGSFNbL6oiDp24Ea1ADxV1qnu')
    const publicKeyRes = FIOSDK.derivedPublicKey(privateKeyRes.fioKey)
    expect(publicKeyRes.publicKey).to.equal('FIO5kJKNHwctcfUM5XZyiWSqSTM5HTzznJP9F3ZdbhaQAHEVq575o')
  })

  it(`FIO SUF Utilities - amountToSUF`, async () => {
    const sufa = FIOSDK.amountToSUF (100)
    expect(sufa).to.equal(100000000000)

    const sufb = FIOSDK.amountToSUF (500)
    expect(sufb).to.equal(500000000000)

    const sufc = FIOSDK.amountToSUF (506)
    expect(sufc).to.equal(506000000000)

    const sufd = FIOSDK.amountToSUF (1)
    expect(sufd).to.equal(1000000000)

    const sufe = FIOSDK.amountToSUF (2)
    expect(sufe).to.equal(2000000000)

    const suff = FIOSDK.amountToSUF (2.568)
    expect(suff).to.equal(2568000000)

    const sufg = FIOSDK.amountToSUF (2.123)
    expect(sufg).to.equal(2123000000)
  })

  it(`FIO SUF Utilities - SUFToAmount`, async () => {
    const sufa = FIOSDK.SUFToAmount (100000000000)
    expect(sufa).to.equal(100)

    const sufb = FIOSDK.SUFToAmount (500000000000)
    expect(sufb).to.equal(500)

    const sufc = FIOSDK.SUFToAmount (506000000000)
    expect(sufc).to.equal(506)

    const sufd = FIOSDK.SUFToAmount (1000000000)
    expect(sufd).to.equal(1)

    const sufe = FIOSDK.SUFToAmount (2000000000)
    expect(sufe).to.equal(2)

    const suff = FIOSDK.SUFToAmount (2568000000)
    expect(suff).to.equal(2.568)

    const sufg = FIOSDK.SUFToAmount (2123000000)
    expect(sufg).to.equal(2.123)
  })

  it(`Validation methods`, async () => {
    try {
      FIOSDK.isChainCodeValid('$%34')
    } catch (e) {
      expect(e.list[0].message).to.equal('chainCode must match /^[a-z0-9]+$/i.')
    }
    try {
      FIOSDK.isTokenCodeValid('')
    } catch (e) {
      expect(e.list[0].message).to.equal('tokenCode is required.')
    }
    try {
      FIOSDK.isFioAddressValid('f')
    } catch (e) {
      expect(e.list[0].message).to.equal('fioAddress must have a length between 3 and 64.')
    }
    try {
      FIOSDK.isFioDomainValid('$%FG%')
    } catch (e) {
      expect(e.list[0].message).to.equal('fioDomain must match /^[a-z0-9\\-]+$/i.')
    }
    try {
      FIOSDK.isFioPublicKeyValid('dfsd')
    } catch (e) {
      expect(e.list[0].message).to.equal('fioPublicKey must match /^FIO\\w+$/.')
    }
    try {
      FIOSDK.isPublicAddressValid('')
    } catch (e) {
      expect(e.list[0].message).to.equal('publicAddress is required.')
    }

    const chainCodeIsValid = FIOSDK.isChainCodeValid('FIO')
    expect(chainCodeIsValid).to.equal(true)

    const tokenCodeIsValid = FIOSDK.isTokenCodeValid('FIO')
    expect(tokenCodeIsValid).to.equal(true)

    const singleDigitFioAddressIsValid = FIOSDK.isFioAddressValid('f@2')
    expect(singleDigitFioAddressIsValid).to.equal(true)

    const fioAddressIsValid = FIOSDK.isFioAddressValid(newFioAddress)
    expect(fioAddressIsValid).to.equal(true)

    const fioDomainIsValid = FIOSDK.isFioDomainValid(newFioDomain)
    expect(fioDomainIsValid).to.equal(true)

    const privateKeyIsValid = FIOSDK.isFioPublicKeyValid(publicKey)
    expect(privateKeyIsValid).to.equal(true)

    const publicKeyIsValid = FIOSDK.isPublicAddressValid(publicKey)
    expect(publicKeyIsValid).to.equal(true)
  })

  it(`Getting fio public key`, async () => {
    const result = await fioSdk.genericAction('getFioPublicKey', {})
    expect(result).to.equal(publicKey)
  })

  it(`getFioBalance`, async () => {
    const result = await fioSdk.genericAction('getFioBalance', {})
    //console.log('Result: ', result)
    expect(result).to.have.all.keys('balance','available')
    expect(result.balance).to.be.a('number')
  })

  it(`Register fio domain`, async () => {
    const result = await fioSdk.genericAction('registerFioDomain', { fioDomain: newFioDomain, maxFee: defaultFee })

    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected')
    expect(result.status).to.be.a('string')
    expect(result.expiration).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`Renew fio domain`, async () => {
    const result = await fioSdk.genericAction('renewFioDomain', { fioDomain: newFioDomain, maxFee: defaultFee })

    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected')
    expect(result.status).to.be.a('string')
    expect(result.expiration).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`setFioDomainVisibility true`, async () => {
    const result = await fioSdk.genericAction('setFioDomainVisibility', {
      fioDomain: newFioDomain,
      isPublic: true,
      maxFee: defaultFee,
      technologyProviderId: ''
    })

    expect(result).to.have.all.keys('status', 'fee_collected')
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`Register fio address`, async () => {
    const result = await fioSdk.genericAction('registerFioAddress', {
      fioAddress: newFioAddress,
      maxFee: defaultFee
    })
    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected')
    expect(result.status).to.be.a('string')
    expect(result.expiration).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`Register owner fio address`, async () => {
    const newFioAddress2 = generateFioAddress(newFioDomain, 7)
    const result = await fioSdk.genericAction('registerFioAddress', {
      fioAddress: newFioAddress2,
      ownerPublicKey: publicKey2,
      maxFee: defaultFee
    })
    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected')
    expect(result.status).to.be.a('string')
    expect(result.expiration).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`Renew fio address`, async () => {
    const result = await fioSdk.genericAction('renewFioAddress', { fioAddress: newFioAddress, maxFee: defaultFee })
    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected')
    expect(result.status).to.be.a('string')
    expect(result.expiration).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`Push Transaction - renewaddress`, async () => {
    await timeout(2000)
    const result = await fioSdk.genericAction('pushTransaction', {
      action: 'renewaddress',
      account: 'fio.address',
      data: {
        fio_address: newFioAddress,
        max_fee: defaultFee,
        tpid: ''
      }
    })

    expect(result).to.have.all.keys('status', 'expiration', 'fee_collected')
    expect(result.status).to.be.a('string')
    expect(result.expiration).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`getFioNames`, async () => {
    const result = await fioSdk.genericAction('getFioNames', { fioPublicKey: publicKey })
    //console.log('Result: ', result)
    expect(result).to.have.all.keys('fio_domains', 'fio_addresses')
    expect(result.fio_domains).to.be.a('array')
    expect(result.fio_addresses).to.be.a('array')
  })

  it(`getFioDomains`, async () => {
    try{
      const result = await fioSdk.genericAction('getFioDomains', { fioPublicKey: fioSdk.publicKey })

      expect(result).to.have.all.keys('fio_domains','more')
      expect(result.fio_domains).to.be.a('array')
    } catch (e) {
      console.log(e);
    }
  })

  it(`setFioDomainVisibility false`, async () => {
    const result = await fioSdk.genericAction('setFioDomainVisibility', {
      fioDomain: newFioDomain,
      isPublic: false,
      maxFee: defaultFee,
      technologyProviderId: ''
    })

    expect(result).to.have.all.keys('status', 'fee_collected')
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`setFioDomainVisibility true`, async () => {
    const result = await fioSdk.genericAction('setFioDomainVisibility', {
      fioDomain: newFioDomain,
      isPublic: true,
      maxFee: defaultFee,
      technologyProviderId: ''
    })

    expect(result).to.have.all.keys('status', 'fee_collected')
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`getFee for transferFioDomain`, async () => {
    const result = await fioSdk.genericAction('getFeeForTransferFioDomain', {
      fioAddress: newFioAddress
    })

    expect(result).to.have.all.keys('fee')
    expect(result.fee).to.be.a('number')
  })

  it(`Transfer fio domain`, async () => {
    try {
      const result = await fioSdk.genericAction('transferFioDomain', {
        fioDomain: newFioDomain,
        newOwnerKey: pubKeyForTransfer,
        maxFee: defaultFee
      })
      //console.log('Result: ', result)
      expect(result).to.have.all.keys('status', 'fee_collected')
      expect(result.status).to.be.a('string')
      expect(result.fee_collected).to.be.a('number')
    } catch (err) {
      console.log('Err: ', err.json)
      expect(err).to.be.equal(null)
    }
  })

  it(`getFee for addPublicAddress`, async () => {
    const result = await fioSdk.genericAction('getFeeForAddPublicAddress', {
      fioAddress: newFioAddress
    })

    expect(result).to.have.all.keys('fee')
    expect(result.fee).to.be.a('number')
  })

  it(`Add public address`, async () => {
    const result = await fioSdk.genericAction('addPublicAddress', {
      fioAddress: newFioAddress,
      chainCode: fioChainCode,
      tokenCode: fioTokenCode,
      publicAddress: '1PMycacnJaSqwwJqjawXBErnLsZ7RkXUAs',
      maxFee: defaultFee,
      technologyProviderId: ''
    })

    expect(result).to.have.all.keys('status', 'fee_collected')
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`Add public addresses`, async () => {
    const result = await fioSdk.genericAction('addPublicAddresses', {
      fioAddress: newFioAddress,
      publicAddresses: [
        {
          chain_code: ethChainCode,
          token_code: ethTokenCode,
          public_address: 'xxxxxxyyyyyyzzzzzz',
        },
        {
          chain_code: fioChainCode,
          token_code: fioTokenCode,
          public_address: publicKey,
        }
      ],
      maxFee: defaultFee,
      technologyProviderId: ''
    })

    expect(result).to.have.all.keys('status', 'fee_collected')
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`getFee for removePublicAddresses`, async () => {
    const result = await fioSdk.genericAction('getFeeForRemovePublicAddresses', {
      fioAddress: newFioAddress
    })

    expect(result).to.have.all.keys('fee')
    expect(result.fee).to.be.a('number')
  })

  it(`Remove public addresses`, async () => {
    const result = await fioSdk.genericAction('removePublicAddresses', {
      fioAddress: newFioAddress,
      publicAddresses: [
        {
          chain_code: ethChainCode,
          token_code: ethTokenCode,
          public_address: 'xxxxxxyyyyyyzzzzzz',
        }
      ],
      maxFee: defaultFee,
      technologyProviderId: ''
    })

    expect(result).to.have.all.keys('status', 'fee_collected')
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`getFee for removeAllPublicAddresses`, async () => {

    const result = await fioSdk.genericAction('getFeeForRemoveAllPublicAddresses', {
      fioAddress: newFioAddress
    })

    expect(result).to.have.all.keys('fee')
    expect(result.fee).to.be.a('number')
  })

  it(`Remove all public addresses`, async () => {
    await fioSdk.genericAction('addPublicAddresses', {
      fioAddress: newFioAddress,
      publicAddresses: [
        {
          chain_code: ethChainCode,
          token_code: ethTokenCode,
          public_address: 'xxxxxxyyyyyyzzzzzz1',
        }
      ],
      maxFee: defaultFee,
      technologyProviderId: ''
    })

    const result = await fioSdk.genericAction('removeAllPublicAddresses', {
      fioAddress: newFioAddress,
      maxFee: defaultFee,
      technologyProviderId: ''
    })
    expect(result).to.have.all.keys('status', 'fee_collected')
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`isAvailable true`, async () => {
    const result = await fioSdk.genericAction('isAvailable', {
      fioName: generateFioAddress(testFioDomain, 7),
    })

    expect(result.is_registered).to.equal(0)
  })

  it(`isAvailable false`, async () => {
    const result = await fioSdk.genericAction('isAvailable', {
      fioName: testFioAddressName
    })

    expect(result.is_registered).to.equal(1)
  })

  it(`getFioBalance for custom fioPublicKey`, async () => {
    const result = await fioSdk.genericAction('getFioBalance', {
      fioPublicKey: publicKey2
    })
    //console.log('Result: ', result)
    expect(result).to.have.all.keys('balance', 'available')
    expect(result.balance).to.be.a('number')
  })

  it(`getFioNames`, async () => {
    const result = await fioSdk.genericAction('getFioNames', { fioPublicKey: publicKey })

    expect(result).to.have.all.keys('fio_domains', 'fio_addresses')
    expect(result.fio_domains).to.be.a('array')
    expect(result.fio_addresses).to.be.a('array')
  })

  it(`getPublicAddress`, async () => {
    const result = await fioSdk.genericAction('getPublicAddress', {
      fioAddress: newFioAddress, chainCode: fioChainCode, tokenCode: fioTokenCode
    })

    expect(result.public_address).to.be.a('string')
  })

  it(`getFee`, async () => {
    const result = await fioSdk.genericAction('getFee', {
      endPoint: 'register_fio_address',
      fioAddress: ''
    })

    expect(result).to.have.all.keys('fee')
    expect(result.fee).to.be.a('number')
  })

  it(`getMultiplier`, async () => {
    const result = await fioSdk.genericAction('getMultiplier', {})

    expect(result).to.be.a('number')
  })

})

describe('C. Request funds, approve and send', () => {
  const fundsAmount = 3
  let requestId
  const memo = 'testing fund request'

  it(`getFee for requestFunds`, async () => {
    const result = await fioSdk2.genericAction('getFeeForNewFundsRequest', {
      payeeFioAddress: testFioAddressName2
    })

    expect(result).to.have.all.keys('fee')
    expect(result.fee).to.be.a('number')
  })

  it(`getFioNames for fioSdk2 and confirm that one of them is testFioAddressName2`, async () => {
    try {
        const result = await fioSdk2.genericAction('getFioNames', {
            fioPublicKey: publicKey2
        })
        //console.log('Result', result)
        expect(result.fio_addresses[0].fio_address).to.equal(testFioAddressName2)
    } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
    }
})

  it(`fioSdk2 requests funds from fioSdk`, async () => {
    try {
      const result = await fioSdk2.genericAction('requestFunds', {
        payerFioAddress: testFioAddressName,
        payeeFioAddress: testFioAddressName2,
        payeeTokenPublicAddress: 'blahblahblah',
        amount: fundsAmount,
        chainCode: fioChainCode,
        tokenCode: fioTokenCode,
        memo: 'Send token',
        maxFee: defaultFee,
        payerFioPublicKey: publicKey
      })
      //console.log('Result: ', result)
      requestId = result.fio_request_id
      expect(result).to.have.all.keys('fio_request_id', 'status', 'fee_collected')
      expect(result.fio_request_id).to.be.a('number')
      expect(result.status).to.be.a('string')
      expect(result.fee_collected).to.be.a('number')
    } catch (err) {
      console.log('Err: ', err.json)
      expect(err).to.be.equal(null)
    }
  })

  it(`get_sent_fio_requests for fioSdk2`, async () => {
    try {
      const result = await fioSdk2.genericAction('getSentFioRequests', {
        limit: '',
        offset: ''
      })
      //console.log('result: ', result)
      //console.log('content: ', result.requests[0].content)
      expect(result.requests[0].fio_request_id).to.equal(requestId)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(5000) })

  it(`getPendingFioRequests`, async () => {
    const result = await fioSdk.genericAction('getPendingFioRequests', {})
    //console.log('Result: ', result)
    expect(result).to.have.all.keys('requests', 'more')
    expect(result.requests).to.be.a('array')
    expect(result.more).to.be.a('number')
    const pendingReq = result.requests.find(pr => parseInt(pr.fio_request_id) === parseInt(requestId))
    expect(pendingReq).to.have.all.keys('fio_request_id', 'payer_fio_address', 'payee_fio_address', 'payee_fio_public_key', 'payer_fio_public_key', 'time_stamp', 'content')
    expect(pendingReq.fio_request_id).to.be.a('number')
    expect(pendingReq.fio_request_id).to.equal(requestId)
    expect(pendingReq.payer_fio_address).to.be.a('string')
    expect(pendingReq.payer_fio_address).to.equal(testFioAddressName)
    expect(pendingReq.payee_fio_address).to.be.a('string')
    expect(pendingReq.payee_fio_address).to.equal(testFioAddressName2)
  })

  it(`recordObtData`, async () => {
    const result = await fioSdk.genericAction('recordObtData', {
      fioRequestId: requestId,
      payerFioAddress: testFioAddressName,
      payeeFioAddress: testFioAddressName2,
      payerTokenPublicAddress: publicKey,
      payeeTokenPublicAddress: publicKey2,
      amount: fundsAmount,
      chainCode: fioChainCode,
      tokenCode: fioTokenCode,
      status: 'sent_to_blockchain',
      obtId: '',
      maxFee: defaultFee,
    })
    expect(result).to.have.all.keys('status', 'fee_collected')
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`Wait a few seconds.`, async () => { await timeout(8000) })

  it(`getSentFioRequests for fioSdk2 (BD-2306)`, async () => {
    const result = await fioSdk2.genericAction('getSentFioRequests', {
      limit: '',
      offset: ''
    })
    //console.log('Result: ', result)
    expect(result).to.have.all.keys('requests', 'more')
    expect(result.requests).to.be.a('array')
    expect(result.more).to.be.a('number')
    const pendingReq = result.requests.find(pr => parseInt(pr.fio_request_id) === parseInt(requestId))
    //console.log('pendingReq: ', pendingReq)
    expect(pendingReq).to.have.all.keys('fio_request_id', 'payer_fio_address', 'payee_fio_address', 'payee_fio_public_key', 'payer_fio_public_key', 'status', 'time_stamp', 'content')
    expect(pendingReq.fio_request_id).to.be.a('number')
    expect(pendingReq.fio_request_id).to.equal(requestId)
    expect(pendingReq.payer_fio_address).to.be.a('string')
    expect(pendingReq.payer_fio_address).to.equal(testFioAddressName)
    expect(pendingReq.payee_fio_address).to.be.a('string')
    expect(pendingReq.payee_fio_address).to.equal(testFioAddressName2)
  })

  it(`Payer getObtData`, async () => {
    const result = await fioSdk.genericAction('getObtData', {})
    expect(result).to.have.all.keys('obt_data_records', 'more')
    expect(result.obt_data_records).to.be.a('array')
    expect(result.more).to.be.a('number')
    const obtData = result.obt_data_records.find(pr => parseInt(pr.fio_request_id) === parseInt(requestId))
    expect(obtData).to.have.all.keys('fio_request_id', 'payer_fio_address', 'payee_fio_address', 'payee_fio_public_key', 'payer_fio_public_key', 'status', 'time_stamp', 'content')
    expect(obtData.fio_request_id).to.be.a('number')
    expect(obtData.fio_request_id).to.equal(requestId)
    expect(obtData.payer_fio_address).to.be.a('string')
    expect(obtData.payer_fio_address).to.equal(testFioAddressName)
    expect(obtData.payee_fio_address).to.be.a('string')
    expect(obtData.payee_fio_address).to.equal(testFioAddressName2)
  })

  it(`Payee getObtData`, async () => {
    const result = await fioSdk2.genericAction('getObtData', {})
    expect(result).to.have.all.keys('obt_data_records', 'more')
    expect(result.obt_data_records).to.be.a('array')
    expect(result.more).to.be.a('number')
    const obtData = result.obt_data_records.find(pr => parseInt(pr.fio_request_id) === parseInt(requestId))
    expect(obtData).to.have.all.keys('fio_request_id', 'payer_fio_address', 'payee_fio_address', 'payee_fio_public_key', 'payer_fio_public_key', 'status', 'time_stamp', 'content')
    expect(obtData.fio_request_id).to.be.a('number')
    expect(obtData.fio_request_id).to.equal(requestId)
    expect(obtData.payer_fio_address).to.be.a('string')
    expect(obtData.payer_fio_address).to.equal(testFioAddressName)
    expect(obtData.payee_fio_address).to.be.a('string')
    expect(obtData.payee_fio_address).to.equal(testFioAddressName2)
  })

})

describe('D. Request funds, cancel funds request', () => {
  const fundsAmount = 3
  let requestId
  const memo = 'testing fund request'

  it(`requestFunds`, async () => {
    const result = await fioSdk2.genericAction('requestFunds', {
      payerFioAddress: testFioAddressName,
      payeeFioAddress: testFioAddressName2,
      payeePublicAddress: testFioAddressName2,
      amount: fundsAmount,
      chainCode: fioChainCode,
      tokenCode: fioTokenCode,
      memo,
      maxFee: defaultFee,
    })

    requestId = result.fio_request_id
    expect(result).to.have.all.keys('fio_request_id', 'status', 'fee_collected')
    expect(result.fio_request_id).to.be.a('number')
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`cancel request`, async () => {
    try{
      const result = await fioSdk2.genericAction('cancelFundsRequest', {
        fioRequestId: requestId,
        maxFee: defaultFee,
        tpid: ''
      })
      expect(result).to.have.all.keys('status', 'fee_collected')
      expect(result.status).to.be.a('string')
      expect(result.fee_collected).to.be.a('number')
    } catch (e) {
      console.log(e);
    }
  })


  it(`getCancelledFioRequests`, async () => {
    try{
      await timeout(4000)
      const result = await fioSdk2.genericAction('getCancelledFioRequests', {})
      expect(result).to.have.all.keys('requests', 'more')
      expect(result.requests).to.be.a('array')
      expect(result.more).to.be.a('number')
      const pendingReq = result.requests.find(pr => parseInt(pr.fio_request_id) === parseInt(requestId))
      expect(pendingReq).to.have.all.keys('fio_request_id', 'payer_fio_address', 'payee_fio_address', 'payee_fio_public_key', 'payer_fio_public_key', 'time_stamp', 'content', 'status')
      expect(pendingReq.fio_request_id).to.be.a('number')
      expect(pendingReq.fio_request_id).to.equal(requestId)
      expect(pendingReq.payer_fio_address).to.be.a('string')
      expect(pendingReq.payer_fio_address).to.equal(testFioAddressName)
      expect(pendingReq.payee_fio_address).to.be.a('string')
      expect(pendingReq.payee_fio_address).to.equal(testFioAddressName2)
    } catch (e) {
      console.log(e);
    }
  })

})

describe('E. Request funds, reject', () => {
  const fundsAmount = 4
  let requestId
  const memo = 'testing fund request'

  it(`requestFunds`, async () => {
    const result = await fioSdk2.genericAction('requestFunds', {
      payerFioAddress: testFioAddressName,
      payeeFioAddress: testFioAddressName2,
      payeePublicAddress: testFioAddressName2,
      amount: fundsAmount,
      chainCode: fioChainCode,
      tokenCode: fioTokenCode,
      memo,
      maxFee: defaultFee,
    })

    requestId = result.fio_request_id
    expect(result).to.have.all.keys('fio_request_id', 'status', 'fee_collected')
    expect(result.fio_request_id).to.be.a('number')
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`getPendingFioRequests`, async () => {
    await timeout(4000)
    const result = await fioSdk.genericAction('getPendingFioRequests', {})

    expect(result).to.have.all.keys('requests', 'more')
    expect(result.requests).to.be.a('array')
    expect(result.more).to.be.a('number')
    const pendingReq = result.requests.find(pr => parseInt(pr.fio_request_id) === parseInt(requestId))
    expect(pendingReq).to.have.all.keys('fio_request_id', 'payer_fio_address', 'payee_fio_address', 'payee_fio_public_key', 'payer_fio_public_key', 'time_stamp', 'content')
    expect(pendingReq.fio_request_id).to.be.a('number')
    expect(pendingReq.fio_request_id).to.equal(requestId)
    expect(pendingReq.payer_fio_address).to.be.a('string')
    expect(pendingReq.payer_fio_address).to.equal(testFioAddressName)
    expect(pendingReq.payee_fio_address).to.be.a('string')
    expect(pendingReq.payee_fio_address).to.equal(testFioAddressName2)
  })

  it(`getFee for rejectFundsRequest`, async () => {
    const result = await fioSdk.genericAction('getFeeForRejectFundsRequest', {
      payerFioAddress: testFioAddressName2
    })

    expect(result).to.have.all.keys('fee')
    expect(result.fee).to.be.a('number')
  })

  it(`rejectFundsRequest`, async () => {
    const result = await fioSdk.genericAction('rejectFundsRequest', {
      fioRequestId: requestId,
      maxFee: defaultFee,
    })

    expect(result).to.have.all.keys('status', 'fee_collected')
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

})

describe('F. Transfer tokens', () => {
  const fundsAmount = FIOSDK.SUFUnit
  let fioBalance = 0
  let fioBalanceAfter = 0

  it(`Check balance before transfer`, async () => {
    const result = await fioSdk2.genericAction('getFioBalance', {})

    fioBalance = result.balance
  })

  it(`Transfer tokens`, async () => {
    const result = await fioSdk.genericAction('transferTokens', {
      payeeFioPublicKey: publicKey2,
      amount: fundsAmount,
      maxFee: defaultFee,
    })

    expect(result).to.have.all.keys('status', 'fee_collected', 'transaction_id', 'block_num')
    expect(result.status).to.be.a('string')
    expect(result.transaction_id).to.be.a('string')
    expect(result.block_num).to.be.a('number')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`Check balance and balance change`, async () => {
    await timeout(10000)
    const result = await fioSdk2.genericAction('getFioBalance', {})
    fioBalanceAfter = result.balance
    expect(fundsAmount).to.equal(fioBalanceAfter - fioBalance)
  })
})

describe('G. Record obt data, check getObtData', () => {
  const obtId = generateObtId()
  const fundsAmount = 4.5

  it(`getFee for recordObtData`, async () => {
    const result = await fioSdk.genericAction('getFeeForRecordObtData', {
      payerFioAddress: testFioAddressName
    })

    expect(result).to.have.all.keys('fee')
    expect(result.fee).to.be.a('number')
  })

  it(`recordObtData`, async () => {
    const result = await fioSdk.genericAction('recordObtData', {
      fioRequestId: '',
      payerFioAddress: testFioAddressName,
      payeeFioAddress: testFioAddressName2,
      payerTokenPublicAddress: publicKey,
      payeeTokenPublicAddress: publicKey2,
      amount: fundsAmount,
      chainCode: fioChainCode,
      tokenCode: fioTokenCode,
      status: 'sent_to_blockchain',
      obtId,
      maxFee: defaultFee,
    })
    expect(result).to.have.all.keys('status', 'fee_collected')
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`Wait a few seconds.`, async () => { await timeout(5000) })

  it(`Payer getObtData`, async () => {
    await timeout(4000)
    const result = await fioSdk.genericAction('getObtData', { tokenCode: fioTokenCode })
    expect(result).to.have.all.keys('obt_data_records', 'more')
    expect(result.obt_data_records).to.be.a('array')
    expect(result.more).to.be.a('number')
    const obtData = result.obt_data_records.find(pr => pr.content.obt_id === obtId)
    expect(obtData).to.have.all.keys('fio_request_id', 'payer_fio_address', 'payee_fio_address', 'payee_fio_public_key', 'payer_fio_public_key', 'status', 'time_stamp', 'content')
    expect(obtData.content.obt_id).to.be.a('string')
    expect(obtData.content.obt_id).to.equal(obtId)
    expect(obtData.payer_fio_address).to.be.a('string')
    expect(obtData.payer_fio_address).to.equal(testFioAddressName)
    expect(obtData.payee_fio_address).to.be.a('string')
    expect(obtData.payee_fio_address).to.equal(testFioAddressName2)
  })

  it.skip(`BUG BD-2305 (not all results getting returned) Payee getObtData`, async () => {
    const result = await fioSdk2.genericAction('getObtData', { tokenCode: fioTokenCode })
    console.log('result: ', result)
    expect(result).to.have.all.keys('obt_data_records', 'more')
    expect(result.obt_data_records).to.be.a('array')
    expect(result.more).to.be.a('number')
    const obtData = result.obt_data_records.find(pr => pr.content.obt_id === obtId)
    console.log('obt_data_records[0]: ', result.obt_data_records[0])
    console.log('obtId: ', obtId)
    console.log('obtData: ', obtData)
    expect(obtData).to.have.all.keys('fio_request_id', 'payer_fio_address', 'payee_fio_address', 'payee_fio_public_key', 'payer_fio_public_key', 'status', 'time_stamp', 'content')
    expect(obtData.content.obt_id).to.be.a('string')
    expect(obtData.content.obt_id).to.equal(obtId)
    expect(obtData.payer_fio_address).to.be.a('string')
    expect(obtData.payer_fio_address).to.equal(testFioAddressName)
    expect(obtData.payee_fio_address).to.be.a('string')
    expect(obtData.payee_fio_address).to.equal(testFioAddressName2)
  })

})

describe(`H. Test locked token accounts with proxy voting`, () => {

  let total_voted_fio, total_bp_votes, user1

  it(`Create user`, async () => {
    user1 = await newUser(fioSdkFaucet);
  })

  it(`Get initial total_voted_fio`, async () => {
    total_voted_fio = await getTotalVotedFio();
    //console.log('total_voted_fio:', total_voted_fio)
  })

  it(`Get fioSdk last_vote_weight`, async () => {
    try {
      fioSdk.last_vote_weight = await getAccountVoteWeight(fioSdk.account);
      //console.log('fioSdk.last_vote_weight:', fioSdk.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Register fioSdk as a proxy`, async () => {
    try {
      const result = await fioSdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: testFioAddressName,
          actor: account,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json.error.details)
      expect(err).to.equal('null')
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(5000) })

  it(`Get total_voted_fio before fioSdk votes`, async () => {
    total_voted_fio = await getTotalVotedFio();
    //console.log('total_voted_fio:', total_voted_fio)
  })

  it(`fioSdk votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await fioSdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: testFioAddressName,
          actor: account,
          max_fee: config.api.vote_producer.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(5000) })

  it(`Get fioSdk last_vote_weight`, async () => {
    try {
      fioSdk.last_vote_weight = await getAccountVoteWeight(account);
      //console.log('fioSdk.last_vote_weight:', fioSdk.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`fioSdk last_vote_weight = FIO balance - ${lockedFundsAmount} `, async () => {
      try {
        const result = await fioSdk.genericAction('getFioBalance', {
          fioPublicKey: publicKey
        })
        //console.log('User 1 fio balance', result)
        expect(result.balance - lockedFundsAmount).to.equal(fioSdk.last_vote_weight)
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal('null')
      }
  })

  it(`total_voted_fio increased by fioSdk last_vote_weight`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio: ', total_voted_fio / config.BILLION)
      expect(total_voted_fio).to.equal(prev_total_voted_fio + fioSdk.last_vote_weight)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal('null')
    }
  })

  it(`bp1@dapixdev total_votes increased by fioSdk last_vote_weight`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + fioSdk.last_vote_weight)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })
  
  it('Transfer additional 500 FIO from user1 to fioSdk', async () => {
    const result = await user1.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: publicKey,
      amount: 500000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
    })
    //console.log('Result', result)
    expect(result.status).to.equal('OK')
  })

  it(`Wait a few seconds.`, async () => { await timeout(7000) })

  it(`Get fioSdk last_vote_weight (should be 500 more)`, async () => {
    try {
      prevVoteWeight = fioSdk.last_vote_weight
      fioSdk.last_vote_weight = await getAccountVoteWeight(account);
      //console.log('fioSdk.last_vote_weight:', fioSdk.last_vote_weight)
      expect(fioSdk.last_vote_weight).to.equal(prevVoteWeight + 500000000000)
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`total_voted_fio increased by 500 FIO`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio: ', total_voted_fio / config.BILLION)
      expect(total_voted_fio).to.equal(prev_total_voted_fio + 500000000000)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal('null')
    }
  })

  it(`bp1@dapixdev total_votes increased by 500 FIO`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes + 500000000000)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`Transfer 200 FIO from fioSdk back to user1 (to remove votes from the total)`, async () => {
    const result = await fioSdk.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: 200000000000,
      maxFee: config.maxFee,
    })
    //console.log('Result', result)
    expect(result.status).to.equal('OK')
  })

  it(`Wait a few seconds.`, async () => { await timeout(7000) })

  it(`Get fioSdk last_vote_weight (should be 200 + 2 fee = 202 less)`, async () => {
    try {
      prevVoteWeight = fioSdk.last_vote_weight
      fioSdk.last_vote_weight = await getAccountVoteWeight(account);
      //console.log('fioSdk.last_vote_weight:', fioSdk.last_vote_weight)
      expect(fioSdk.last_vote_weight).to.equal(prevVoteWeight- 200000000000 - transfer_tokens_pub_key_fee)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`total_voted_fio decreased by 200 - transfer_tokens_pub_key fee`, async () => {
    try {
      let prev_total_voted_fio = total_voted_fio
      total_voted_fio = await getTotalVotedFio();
      //console.log('total_voted_fio: ', total_voted_fio)
      expect(total_voted_fio).to.equal(prev_total_voted_fio - 200000000000 - transfer_tokens_pub_key_fee)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal('null')
    }
  })

  it(`bp1@dapixdev total_votes decreased by 200 - transfer_tokens_pub_key fee`, async () => {
    try {
      let prev_total_bp_votes = total_bp_votes;
      total_bp_votes = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
      expect(total_bp_votes).to.equal(prev_total_bp_votes - 200000000000 - transfer_tokens_pub_key_fee)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

})