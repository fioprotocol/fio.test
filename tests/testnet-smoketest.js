/**
 * testnet-smoketest.js is the smoke test for high level regression testing of Testnet releases. 
 * It can be run against a local devtools build by setting the target = 'local' variable.
 * You must have two testnet accounts to run against testnet. 
 * 
 * All "describe" tests should be built to run independently. 
 */

require('mocha')
const {expect} = require('chai')
const {FIOSDK} = require('@fioprotocol/fiosdk')
const { 
  newUser, 
  existingUser, 
  createKeypair, 
  callFioApi, 
  stringToHash, 
  getAccountFromKey,
  fetchJson 
} = require('../utils.js');
const config = require('../config.js');
const { EndPoint } = require('@fioprotocol/fiosdk/lib/entities/EndPoint');

let privateKey, publicKey, testFioAddressName, privateKey2, publicKey2, testFioAddressName2

/**
* Set to target = 'local' if running against devtools build. Leave blank if running against Testnet.
*/
const target = 'local' 

/**
 * Set your testnet existing private/public keys and existing fioAddresses (not needed if running locally)
 */
 privateKey = '',
 publicKey = '',
 account = '',
 privateKey2 = '',
 publicKey2 = '',
 account2 = '',
 testFioDomain = '',
 testFioAddressName = '',
 testFioAddressName2 = ''


/**
 * Main Tests
 */

const fioTestnetDomain = 'fiotestnet'
const fioTokenCode = 'FIO'
const fioChainCode = 'FIO'
const ethTokenCode = 'ETH'
const ethChainCode = 'ETH'
const defaultBundledSets = 1
const defaultFee = 800 * FIOSDK.SUFUnit

let fioSdk, fioSdk2
let newFioDomain, newFioAddress, privateKeyExample, publicKeyExample, pubKeyForTransfer

const generateTestingFioAddress = (customDomain = fioTestnetDomain) => {
  return `testing${Date.now()}@${customDomain}`
}

const generateTestingFioDomain = () => {
  return `testing-domain-${Date.now()}`
}

const generateObtId = () => {
  return `${Date.now()}`
}

const timeout = async (ms) => {
  await new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

before(async () => {

  if (target == 'local') { 
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
    fioSdk = await newUser(faucet);
    fioSdk2 = await newUser(faucet);
    privateKey = fioSdk.privateKey,
    publicKey = fioSdk.publicKey,
    testFioAddressName = fioSdk.address,
    privateKey2 = fioSdk2.privateKey,
    publicKey2 = fioSdk2.publicKey,
    testFioAddressName2 = fioSdk2.address
  } else {
    fioSdk = await existingUser(account, privateKey, publicKey, testFioDomain, testFioAddressName);
    fioSdk2 = await existingUser(account2, privateKey2, publicKey2, testFioDomain, testFioAddressName2);
  }

  try {
    const isAvailableResult = await fioSdk.sdk.genericAction('isAvailable', {
      fioName: testFioAddressName
    })
    if (!isAvailableResult.is_registered) {
      await fioSdk.sdk.genericAction('registerFioAddress', {
        fioAddress: testFioAddressName,
        maxFee: defaultFee
      })
    }
  } catch (e) {
    console.log(e);
  }
  try {
    const isAvailableResult2 = await fioSdk2.sdk.genericAction('isAvailable', {
      fioName: testFioAddressName2
    })
    if (!isAvailableResult2.is_registered) {
      await fioSdk2.sdk.genericAction('registerFioAddress', {
        fioAddress: testFioAddressName2,
        maxFee: defaultFee
      })
    }
  } catch (e) {
    console.log(e);
  }

  await timeout(4000)

  newFioDomain = generateTestingFioDomain()

  newFioAddress = generateTestingFioAddress(newFioDomain)
  privateKeyExample = '5Kbb37EAqQgZ9vWUHoPiC2uXYhyGSFNbL6oiDp24Ea1ADxV1qnu'
  publicKeyExample = 'FIO5kJKNHwctcfUM5XZyiWSqSTM5HTzznJP9F3ZdbhaQAHEVq575o'
  pubKeyForTransfer = 'FIO7isxEua78KPVbGzKemH4nj2bWE52gqj8Hkac3tc7jKNvpfWzYS'
})

describe('************************** testnet-smoketest.js ************************** \n    A. Testing generic actions', () => {

  it(`FIO Key Generation Testing`, async () => {
    const testMnemonic = 'valley alien library bread worry brother bundle hammer loyal barely dune brave'
    const privateKeyRes = await FIOSDK.createPrivateKeyMnemonic(testMnemonic)
    expect(privateKeyRes.fioKey).to.equal(privateKeyExample)
    const publicKeyRes = FIOSDK.derivedPublicKey(privateKeyRes.fioKey)
    expect(publicKeyRes.publicKey).to.equal(publicKeyExample)
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
    const result = await fioSdk.sdk.genericAction('getFioPublicKey', {})

    expect(result).to.equal(publicKey)
  })

  it(`getFioBalance`, async () => {
    const result = await fioSdk.sdk.genericAction('getFioBalance', {})

    expect(result).to.have.all.keys('balance','available','staked','srps','roe')
    expect(result.balance).to.be.a('number')
  })
})

describe('B. Testing domain actions', () => {

  it(`Register fio domain`, async () => {
    const result = await fioSdk2.sdk.genericAction('registerFioDomain', { fioDomain: newFioDomain, maxFee: defaultFee })
    //console.log('New Domain: ', newFioDomain)
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result).to.have.any.keys('expiration');
    expect(result.status).to.be.a('string')
    expect(result.expiration).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`Renew fio domain`, async () => {
    const result = await fioSdk2.sdk.genericAction('renewFioDomain', { fioDomain: newFioDomain, maxFee: defaultFee })

    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result).to.have.any.keys('expiration');
    expect(result.status).to.be.a('string')
    expect(result.expiration).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`setFioDomainVisibility true`, async () => {
    const result = await fioSdk2.sdk.genericAction('setFioDomainVisibility', {
      fioDomain: newFioDomain,
      isPublic: true,
      maxFee: defaultFee,
      technologyProviderId: ''
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result).to.have.any.keys('block_time');
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`Register fio address`, async () => {
    const result = await fioSdk2.sdk.genericAction('registerFioAddress', {
      fioAddress: newFioAddress,
      maxFee: defaultFee
    })

    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result).to.have.any.keys('expiration');
    expect(result.status).to.be.a('string')
    expect(result.expiration).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`getFioNames`, async () => {
    const result = await fioSdk2.sdk.genericAction('getFioNames', { fioPublicKey: publicKey })

    expect(result).to.have.all.keys('fio_domains', 'fio_addresses')
    expect(result.fio_domains).to.be.a('array')
    expect(result.fio_addresses).to.be.a('array')
  })

  it(`getFioDomains`, async () => {
    try{
      const result = await fioSdk2.sdk.genericAction('getFioDomains', { fioPublicKey: fioSdk.publicKey })

      expect(result).to.have.all.keys('fio_domains','more')
      expect(result.fio_domains).to.be.a('array')
    } catch (e) {
      console.log(e);
    }
  })

  it(`Register owner fio address`, async () => {
    const newFioAddress2 = generateTestingFioAddress(newFioDomain)
    const result = await fioSdk2.sdk.genericAction('registerFioAddress', {
      fioAddress: newFioAddress2,
      ownerPublicKey: publicKey2,
      maxFee: defaultFee
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result).to.have.any.keys('expiration');
    expect(result.status).to.be.a('string')
    expect(result.expiration).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`setFioDomainVisibility false`, async () => {
    const result = await fioSdk2.sdk.genericAction('setFioDomainVisibility', {
      fioDomain: newFioDomain,
      isPublic: false,
      maxFee: defaultFee,
      technologyProviderId: ''
    })

    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`setFioDomainVisibility true`, async () => {
    const result = await fioSdk2.sdk.genericAction('setFioDomainVisibility', {
      fioDomain: newFioDomain,
      isPublic: true,
      maxFee: defaultFee,
      technologyProviderId: ''
    })

    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`getFee for transferFioDomain`, async () => {
    const result = await fioSdk2.sdk.genericAction('getFeeForTransferFioDomain', {
      fioAddress: newFioAddress
    })

    expect(result).to.have.all.keys('fee')
    expect(result.fee).to.be.a('number')
  })

  it(`Transfer fio domain`, async () => {
    const result = await fioSdk2.sdk.genericAction('transferFioDomain', {
      fioDomain: newFioDomain,
      newOwnerKey: fioSdk.publicKey,
      maxFee: defaultFee
    })

    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`getFee for addBundledTransactions`, async () => {
    try {
      const result = await fioSdk2.sdk.genericAction('getFeeForAddBundledTransactions', {
        fioAddress: newFioAddress
      })
      //console.log('Result: ', result)
      expect(result).to.have.all.keys('fee')
      expect(result.fee).to.be.a('number')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null)
    }
  })

  it(`add Bundled Transactions`, async () => {
    try {
      const result = await fioSdk2.sdk.genericAction('addBundledTransactions', {
        fioAddress: newFioAddress,
        bundleSets: defaultBundledSets,
        maxFee: defaultFee
      })
      //console.log('Result: ', result)
      expect(result).to.have.any.keys('status');
      expect(result).to.have.any.keys('fee_collected');
      expect(result).to.have.any.keys('block_num');
      expect(result).to.have.any.keys('transaction_id');
      expect(result.status).to.be.a('string')
      expect(result.fee_collected).to.be.a('number')
    } catch (err) {
      console.log('Error: ', err.json.fields)
      expect(err).to.equal(null)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`(push_transaction) fioSdk2 run addbundles with sets for FIO Address owned by fioSdk2`, async () => {
    try {
        const result = await fioSdk2.sdk.genericAction('pushTransaction', {
            action: 'addbundles',
            account: 'fio.address',
            data: {
              fio_address: newFioAddress,
              bundle_sets: defaultBundledSets,
              max_fee: defaultFee,
              technologyProviderId: ''
            }
        })
        //console.log('Result: ', result);
        expect(result.status).to.equal('OK');
    } catch (err) {
        console.log('Error: ', err);
        expect(err).to.equal(null);
    }
})

  it(`Renew fio address`, async () => {
    const result = await fioSdk2.sdk.genericAction('renewFioAddress', { fioAddress: newFioAddress, maxFee: defaultFee })

    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result).to.have.any.keys('expiration');
    expect(result.status).to.be.a('string')
    expect(result.expiration).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`Push Transaction - renewaddress`, async () => {
    await timeout(2000)
    const result = await fioSdk2.sdk.genericAction('pushTransaction', {
      action: 'renewaddress',
      account: 'fio.address',
      data: {
        fio_address: newFioAddress,
        max_fee: defaultFee,
        tpid: ''
      }
    })

    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result).to.have.any.keys('expiration');
    expect(result.status).to.be.a('string')
    expect(result.expiration).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`getFee for addPublicAddress`, async () => {
    try {
      const result = await fioSdk2.sdk.genericAction('getFeeForAddPublicAddress', {
        fioAddress: newFioAddress
      })

      expect(result).to.have.all.keys('fee')
      expect(result.fee).to.be.a('number')
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Add public address`, async () => {
    try {
    const result = await fioSdk2.sdk.genericAction('addPublicAddress', {
      fioAddress: newFioAddress,
      chainCode: 'ABC',
      tokenCode: 'ABC',
      publicAddress: '1PMycacnJaSqwwJqjawXBErnLsZ7RkXUAs',
      maxFee: defaultFee,
      technologyProviderId: ''
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  } catch (err) {
    console.log('Error: ', err);
    expect(err).to.equal(null);
  }
  })

  it(`Add public addresses`, async () => {
    const result = await fioSdk2.sdk.genericAction('addPublicAddresses', {
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

    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`getFee for removePublicAddresses`, async () => {
    const result = await fioSdk2.sdk.genericAction('getFeeForRemovePublicAddresses', {
      fioAddress: newFioAddress
    })

    expect(result).to.have.all.keys('fee')
    expect(result.fee).to.be.a('number')
  })

  it(`Remove public addresses`, async () => {

    const result = await fioSdk2.sdk.genericAction('removePublicAddresses', {
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
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`getFee for removeAllPublicAddresses`, async () => {

    const result = await fioSdk2.sdk.genericAction('getFeeForRemoveAllPublicAddresses', {
      fioAddress: newFioAddress
    })

    expect(result).to.have.all.keys('fee')
    expect(result.fee).to.be.a('number')
  })

  it(`Remove all public addresses`, async () => {
    await fioSdk2.sdk.genericAction('addPublicAddresses', {
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

    const result = await fioSdk2.sdk.genericAction('removeAllPublicAddresses', {
      fioAddress: newFioAddress,
      maxFee: defaultFee,
      technologyProviderId: ''
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`isAvailable true`, async () => {
    const result = await fioSdk2.sdk.genericAction('isAvailable', {
      fioName: generateTestingFioAddress(),
    })

    expect(result.is_registered).to.equal(0)
  })

  it(`isAvailable false`, async () => {
    const result = await fioSdk2.sdk.genericAction('isAvailable', {
      fioName: testFioAddressName
    })

    expect(result.is_registered).to.equal(1)
  })

  it(`getFioBalance for custom fioPublicKey`, async () => {
    const result = await fioSdk2.sdk.genericAction('getFioBalance', {
      fioPublicKey: publicKey2
    })

    expect(result).to.have.all.keys('balance','available','staked','srps','roe')
    expect(result.balance).to.be.a('number')
  })


  it(`getFioAddresses`, async () => {
    try {
    const result = await fioSdk2.sdk.genericAction('getFioAddresses', { fioPublicKey: publicKey })

    expect(result).to.have.all.keys('fio_addresses','more')
    expect(result.fio_addresses).to.be.a('array')
    } catch (e) {
      console.log(e);
    }
  })


  it(`getPublicAddress`, async () => {
    const result = await fioSdk2.sdk.genericAction('getPublicAddress', {
      fioAddress: newFioAddress, chainCode: fioChainCode, tokenCode: fioTokenCode
    })

    expect(result.public_address).to.be.a('string')
  })

  it(`getFee for register_fio_address`, async () => {
    const result = await fioSdk2.sdk.genericAction('getFee', {
      endPoint: 'register_fio_address',
      fioAddress: ''
    })

    expect(result).to.have.all.keys('fee')
    expect(result.fee).to.be.a('number')
  })

  it(`getMultiplier`, async () => {
    const result = await fioSdk2.sdk.genericAction('getMultiplier', {})

    expect(result).to.be.a('number')
  })

  it(`getFee for transferFioAddress`, async () => {
    const result = await fioSdk2.sdk.genericAction('getFeeForTransferFioAddress', {
      fioAddress: newFioAddress
    })

    expect(result).to.have.all.keys('fee')
    expect(result.fee).to.be.a('number')
  })

  it(`Need to move: Transfer fio address to fioSdk`, async () => {
    const result = await fioSdk2.sdk.genericAction('transferFioAddress', {
      fioAddress: newFioAddress,
      newOwnerKey: fioSdk.publicKey,
      maxFee: defaultFee
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.status).to.equal('OK')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`getFee for BurnFioAddress`, async () => {
    const result = await fioSdk.sdk.genericAction('getFeeForBurnFioAddress', {
      fioAddress: newFioAddress
    })

    expect(result).to.have.all.keys('fee')
    expect(result.fee).to.be.a('number')
  })

  it(`Burn fio address`, async () => {
    try {
      const result = await fioSdk.sdk.genericAction('burnFioAddress', {
          fioAddress: newFioAddress,
          maxFee: defaultFee
      })
      expect(result).to.have.any.keys('status');
      expect(result).to.have.any.keys('fee_collected');
      expect(result).to.have.any.keys('block_num');
      expect(result).to.have.any.keys('transaction_id');
      expect(result.status).to.be.a('string')
      expect(result.fee_collected).to.be.a('number')
    } catch (e) {
      console.log(e);
      expect(err).to.equal(null);
    }
  })

})

describe('C. Request funds, approve and send', () => {
  const fundsAmount = 3
  let requestId
  const memo = 'testing fund request'

  it(`getFee for requestFunds`, async () => {
    const result = await fioSdk2.sdk.genericAction('getFeeForNewFundsRequest', {
      payeeFioAddress: testFioAddressName2
    })

    expect(result).to.have.all.keys('fee')
    expect(result.fee).to.be.a('number')
  })

  it(`requestFunds`, async () => {
    try {
      const result = await fioSdk2.sdk.genericAction('requestFunds', {
        payerFioAddress: testFioAddressName,
        payeeFioAddress: testFioAddressName2,
        payeeTokenPublicAddress: publicKey2,
        amount: fundsAmount,
        chainCode: fioChainCode,
        tokenCode: fioTokenCode,
        memo: '',
        maxFee: defaultFee,
        payerFioPublicKey: publicKey,
        technologyProviderId: '',
        hash: '',
        offLineUrl: ''
      })
      //console.log('requestFunds: ', result)
      requestId = result.fio_request_id
      expect(result).to.have.any.keys('status');
      expect(result).to.have.any.keys('fee_collected');
      expect(result).to.have.any.keys('block_num');
      expect(result).to.have.any.keys('transaction_id');
      expect(result).to.have.any.keys('fio_request_id');
      expect(result.fio_request_id).to.be.a('number')
      expect(result.status).to.be.a('string')
      expect(result.fee_collected).to.be.a('number')
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(10000) })

  it(`getPendingFioRequests`, async () => {
    try {
      const result = await fioSdk.sdk.genericAction('getPendingFioRequests', {})
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
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`recordObtData`, async () => {
    const result = await fioSdk.sdk.genericAction('recordObtData', {
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
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`getSentFioRequests`, async () => {
    const result = await fioSdk2.sdk.genericAction('getSentFioRequests', {})
    expect(result).to.have.all.keys('requests', 'more')
    expect(result.requests).to.be.a('array')
    expect(result.more).to.be.a('number')
    /* const pendingReq = result.requests.find(pr => parseInt(pr.fio_request_id) === parseInt(requestId))
    expect(pendingReq).to.have.all.keys('fio_request_id', 'payer_fio_address', 'payee_fio_address', 'payee_fio_public_key', 'payer_fio_public_key', 'status', 'time_stamp', 'content')
    expect(pendingReq.fio_request_id).to.be.a('number')
    expect(pendingReq.fio_request_id).to.equal(requestId)
    expect(pendingReq.payer_fio_address).to.be.a('string')
    expect(pendingReq.payer_fio_address).to.equal(testFioAddressName)
    expect(pendingReq.payee_fio_address).to.be.a('string')
    expect(pendingReq.payee_fio_address).to.equal(testFioAddressName2) */
  })

  it(`Payer getObtData`, async () => {
    await timeout(10000)
    const result = await fioSdk.sdk.genericAction('getObtData', {})
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
    const result = await fioSdk2.sdk.genericAction('getObtData', {})
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
    const result = await fioSdk2.sdk.genericAction('requestFunds', {
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
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result).to.have.any.keys('fio_request_id');
    expect(result.fio_request_id).to.be.a('number')
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`cancel request`, async () => {
    try{
    const result = await fioSdk2.sdk.genericAction('cancelFundsRequest', {
      fioRequestId: requestId,
      maxFee: defaultFee,
      tpid: ''
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
    } catch (e) {
      console.log(e);
    }
  })


  it(`getCancelledFioRequests`, async () => {
    try{
    await timeout(4000)
    const result = await fioSdk2.sdk.genericAction('getCancelledFioRequests', {})
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
    const result = await fioSdk2.sdk.genericAction('requestFunds', {
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
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.fio_request_id).to.be.a('number')
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`getPendingFioRequests`, async () => {
    await timeout(4000)
    const result = await fioSdk.sdk.genericAction('getPendingFioRequests', {})

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
    const result = await fioSdk2.sdk.genericAction('getFeeForRejectFundsRequest', {
      payerFioAddress: testFioAddressName2
    })

    expect(result).to.have.all.keys('fee')
    expect(result.fee).to.be.a('number')
  })

  it(`rejectFundsRequest`, async () => {
    const result = await fioSdk.sdk.genericAction('rejectFundsRequest', {
      fioRequestId: requestId,
      maxFee: defaultFee,
    })

    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

})

describe('F. Transfer tokens', () => {
  const fundsAmount = FIOSDK.SUFUnit
  let fioBalance = 0
  let fioBalanceAfter = 0

  it(`Check balance before transfer`, async () => {
    const result = await fioSdk2.sdk.genericAction('getFioBalance', {})
    fioBalance = result.balance
  })

  it(`Transfer tokens`, async () => {
    const result = await fioSdk.sdk.genericAction('transferTokens', {
      payeeFioPublicKey: publicKey2,
      amount: fundsAmount,
      maxFee: defaultFee,
    })
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.status).to.be.a('string')
    expect(result.transaction_id).to.be.a('string')
    expect(result.block_num).to.be.a('number')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`Check balance and balance change`, async () => {
    await timeout(10000)
    const result = await fioSdk2.sdk.genericAction('getFioBalance', {})
    fioBalanceAfter = result.balance
    expect(fundsAmount).to.equal(fioBalanceAfter - fioBalance)
  })
})

describe('G. Record obt data, check', () => {
  const obtId = generateObtId()
  const fundsAmount = 4.5

  it(`getFee for recordObtData`, async () => {
    const result = await fioSdk.sdk.genericAction('getFeeForRecordObtData', {
      payerFioAddress: testFioAddressName
    })

    expect(result).to.have.all.keys('fee')
    expect(result.fee).to.be.a('number')
  })

  it(`recordObtData`, async () => {
    const result = await fioSdk.sdk.genericAction('recordObtData', {
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
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('fee_collected');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.status).to.be.a('string')
    expect(result.fee_collected).to.be.a('number')
  })

  it(`Payer getObtData`, async () => {
    await timeout(4000)
    const result = await fioSdk.sdk.genericAction('getObtData', { tokenCode: fioTokenCode })
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

  it(`Payee getObtData`, async () => {
    const result = await fioSdk2.sdk.genericAction('getObtData', { tokenCode: fioTokenCode })
    expect(result).to.have.all.keys('obt_data_records', 'more')
    expect(result.obt_data_records).to.be.a('array')
    expect(result.more).to.be.a('number')
    /* const obtData = result.obt_data_records.find(pr => pr.content.obt_id === obtId)
    expect(obtData).to.have.all.keys('fio_request_id', 'payer_fio_address', 'payee_fio_address', 'payee_fio_public_key', 'payer_fio_public_key', 'status', 'time_stamp', 'content')
    expect(obtData.content.obt_id).to.be.a('string')
    expect(obtData.content.obt_id).to.equal(obtId)
    expect(obtData.payer_fio_address).to.be.a('string')
    expect(obtData.payer_fio_address).to.equal(testFioAddressName)
    expect(obtData.payee_fio_address).to.be.a('string')
    expect(obtData.payee_fio_address).to.equal(testFioAddressName2) */
  })
})

describe('H. Encrypting/Decrypting', () => {
  const alicePrivateKey = '5J35xdLtcPvDASxpyWhNrR2MfjSZ1xjViH5cvv15VVjqyNhiPfa'
  const alicePublicKey = 'FIO6NxZ7FLjjJuHGByJtNJQ1uN1P5X9JJnUmFW3q6Q7LE7YJD4GZs'
  const bobPrivateKey = '5J37cXw5xRJgE869B5LxC3FQ8ZJECiYnsjuontcHz5cJsz5jhb7'
  const bobPublicKey = 'FIO4zUFC29aq8uA4CnfNSyRZCnBPya2uQk42jwevc3UZ2jCRtepVZ'

  const nonPartyPrivateKey = '5HujRtqceTPo4awwHAEdHRTWdMTgA6s39dJjwWcjhNdSjVWUqMk'
  const nonPartyPublicKey = 'FIO5mh1UqE5v9TKdYm2Ro6JXCXpSxj1Sm4vKUeydaLd7Cu5aqiSSp'
  const NEW_FUNDS_CONTENT = 'new_funds_content'
  const RECORD_OBT_DATA_CONTENT = 'record_obt_data_content'

  let fioSDKBob = new FIOSDK(
    bobPrivateKey,
    bobPublicKey,
    config.BASE_URL,
    fetchJson
  )

  it(`Encrypt/Decrypt - Request New Funds`, async () => {
    const payeeTokenPublicAddress = bobPublicKey
    const amount = 1.57
    const chainCode = 'FIO'
    const tokenCode = 'FIO'
    const memo = 'testing encryption does it work?'
    const hash = ''
    const offlineUrl = ''

    const content = {
      payee_public_address: payeeTokenPublicAddress,
      amount: amount,
      chain_code: chainCode,
      token_code: tokenCode,
      memo,
      hash,
      offline_url: offlineUrl
    }

    const cipherContent = fioSDKBob.transactions.getCipherContent(NEW_FUNDS_CONTENT, content, bobPrivateKey, alicePublicKey)
    expect(cipherContent).to.be.a('string')

    const uncipherContent = fioSDKBob.transactions.getUnCipherContent(NEW_FUNDS_CONTENT, cipherContent, alicePrivateKey, bobPublicKey)
    expect(uncipherContent.payee_public_address).to.equal(bobPublicKey)

    // same party, ensure cannot decipher
    try {
      const uncipherContentSameParty = fioSDKBob.transactions.getUnCipherContent(NEW_FUNDS_CONTENT, cipherContent, alicePrivateKey, alicePublicKey)
      expect(uncipherContentSameParty.payee_public_address).to.notequal(bobPublicKey)
    } catch (e) {

    }

    // non party, ensure cannot decipher
    try {
      const uncipherContentNonParty = fioSDKBob.transactions.getUnCipherContent(NEW_FUNDS_CONTENT, cipherContent, nonPartyPrivateKey, bobPublicKey)
      expect(uncipherContentNonParty.payee_public_address).to.notequal(bobPublicKey)
    } catch (e) {

    }

    try {
      const uncipherContentNonPartyA = fioSDKBob.transactions.getUnCipherContent(NEW_FUNDS_CONTENT, cipherContent, bobPrivateKey, nonPartyPublicKey)
      expect(uncipherContentNonPartyA.payee_public_address).to.notequal(bobPublicKey)
    } catch (e) {

    }

  })

  it(`Decrypt from iOS SDK - Request New Funds`, async () => {
    const cipherContent = 'iNz623p8SjbFG3rNbxLeVzQhs7n4aB8UGHvkF08HhBXD3X9g6bVFJl93j/OqYdkiycxShF64uc9OHFc/qbOeeS8+WVL2YRpd9JaRqdTUE9XKFPZ6lETQ7MTbGT+qppMoJ0tWCP6mWL4M9V1xu6lE3lJkuRS4kXnwtOUJOcBDG7ddFyHaV1LnLY/jnOJHJhm8'
    expect(cipherContent).to.be.a('string')

    const uncipherContent = fioSDKBob.transactions.getUnCipherContent(NEW_FUNDS_CONTENT, cipherContent, alicePrivateKey, bobPublicKey)
    expect(uncipherContent.payee_public_address).to.equal(bobPublicKey)

    const uncipherContentA = fioSDKBob.transactions.getUnCipherContent(NEW_FUNDS_CONTENT, cipherContent, bobPrivateKey, alicePublicKey)
    expect(uncipherContentA.payee_public_address).to.equal(bobPublicKey)

  })

  it(`Decrypt from Kotlin SDK - Request New Funds`, async () => {
    const cipherContent = 'PUEe6pA4HAl7EHA1XFRqJPMjrugD0ZT09CDx4/rH3ktwqo+WaoZRIuqXR4Xvr6ki1XPp7KwwSy6GqPUuBRuBS8Z8c0/xGgcDXQHJuYSsaV3d9Q61W1JeCDvsSIOdd3MTzObNJNcMj3gad+vPcOvJ7BojeufUoe0HQvxjXO+Gpp20UPdQnljLVsir+XuFmreZwMLWfggIovd0A9t438o+DA=='
    expect(cipherContent).to.be.a('string')

    const uncipherContent = fioSDKBob.transactions.getUnCipherContent(NEW_FUNDS_CONTENT, cipherContent, alicePrivateKey, bobPublicKey)
    expect(uncipherContent.payee_public_address).to.equal(bobPublicKey)

    const uncipherContentA = fioSDKBob.transactions.getUnCipherContent(NEW_FUNDS_CONTENT, cipherContent, bobPrivateKey, alicePublicKey)
    expect(uncipherContentA.payee_public_address).to.equal(bobPublicKey)

  })

  it(`Encrypt/Decrypt - RecordObtData`, async () => {
    const payerTokenPublicAddress = alicePublicKey
    const payeeTokenPublicAddress = bobPublicKey
    const amount = 1.57
    const chainCode = 'FIO'
    const tokenCode = 'FIO'
    const memo = 'testing TypeScript SDK encryption does it work?'
    const hash = ''
    const offlineUrl = ''

    const content = {
      payer_public_address: payerTokenPublicAddress,
      payee_public_address: payeeTokenPublicAddress,
      amount: amount,
      chain_code: chainCode,
      token_code: tokenCode,
      status: '',
      obt_id: '',
      memo: memo,
      hash: hash,
      offline_url: offlineUrl
    }

    const cipherContent = fioSDKBob.transactions.getCipherContent(RECORD_OBT_DATA_CONTENT, content, bobPrivateKey, alicePublicKey)
    expect(cipherContent).to.be.a('string')

    const uncipherContent = fioSDKBob.transactions.getUnCipherContent(RECORD_OBT_DATA_CONTENT, cipherContent, alicePrivateKey, bobPublicKey)
    expect(uncipherContent.payee_public_address).to.equal(bobPublicKey)

    // same party, ensure cannot decipher
    try {
      const uncipherContentSameParty = fioSDKBob.transactions.getUnCipherContent(RECORD_OBT_DATA_CONTENT, cipherContent, alicePrivateKey, alicePublicKey)
      expect(uncipherContentSameParty.payee_public_address).to.notequal(bobPublicKey)
    } catch (e) {
      // successful, on failure.  Should not decrypt
    }

    // non party, ensure cannot decipher
    try {
      const uncipherContentNonParty = fioSDKBob.transactions.getUnCipherContent(RECORD_OBT_DATA_CONTENT, cipherContent, nonPartyPrivateKey, bobPublicKey)
      expect(uncipherContentNonParty.payee_public_address).to.notequal(bobPublicKey)
    } catch (e) {

    }

    try {
      const uncipherContentNonPartyA = fioSDKBob.transactions.getUnCipherContent(RECORD_OBT_DATA_CONTENT, cipherContent, bobPrivateKey, nonPartyPublicKey)
      expect(uncipherContentNonPartyA.payee_public_address).to.notequal(bobPublicKey)
    } catch (e) {

    }

  })

  it(`Decrypt from iOS SDK - RecordObtData`, async () => {
    const cipherContent = 'XJqqkHspW0zp+dHKj9TZMn5mZzdMQrdIAXNOlKPekeEpbjyeh92hO+lB9gA6wnNuq8YNLcGA1s0NPGzb+DlHzXT2tCulgk5fiQy6+8AbThPzB0N6xICmVV3Ontib8FVlTrVrqg053PK9JeHUsg0Sb+vG/dz9+ovcSDHaByxybRNhZOVBe8jlg91eakaU1H8XKDxYOtI3+jYESK02g2Rw5Ya9ec+/PnEBQ6DjkHruKDorEF1D+nDT/0CK46VsfdYzYK8IV0T9Nal4H6Bf4wrMlQ=='
    expect(cipherContent).to.be.a('string')

    const uncipherContent = fioSDKBob.transactions.getUnCipherContent(RECORD_OBT_DATA_CONTENT, cipherContent, alicePrivateKey, bobPublicKey)
    expect(uncipherContent.payee_public_address).to.equal(bobPublicKey)

    const uncipherContentA = fioSDKBob.transactions.getUnCipherContent(RECORD_OBT_DATA_CONTENT, cipherContent, bobPrivateKey, alicePublicKey)
    expect(uncipherContentA.payee_public_address).to.equal(bobPublicKey)

  })

  it(`Decrypt from Kotlin SDK - RecordObtData`, async () => {
    const cipherContent = '4IVNiV3Vg0/ZwkBywOWjSgER/aBzHypmfYoljA7y3Qf04mI/IkwPwO9+yj7EISTdRb2LEPgEDg1RsWBdAFmm6AE9ZXG1W5qPrtFNZuZw3qhCJbisnTLCPA2pEcAGKxBhhTaIx74/+OLXTNq5Z7RWWB+OUIa3bBJLHyhO79BUQ9dIsfiDVGmlRL5yq57uqRfb8FWoQraK31As/OFJ5Gj7KEYehzviJnMX7pYhE4CJkkfYYGfB4AHmHllFSMaLCrkY8BvDViQZTuniqDOua6Po51muyCaJLF5rdMSS0Za5F9U='
    expect(cipherContent).to.be.a('string')

    const uncipherContent = fioSDKBob.transactions.getUnCipherContent(RECORD_OBT_DATA_CONTENT, cipherContent, alicePrivateKey, bobPublicKey)
    expect(uncipherContent.payee_public_address).to.equal(bobPublicKey)

    const uncipherContentA = fioSDKBob.transactions.getUnCipherContent(RECORD_OBT_DATA_CONTENT, cipherContent, bobPrivateKey, alicePublicKey)
    expect(uncipherContentA.payee_public_address).to.equal(bobPublicKey)

  })

})

describe('I. Check prepared transaction', () => {

  it(`requestFunds prepared transaction`, async () => {
    try {
      fioSdk2.sdk.setSignedTrxReturnOption(true);
      const preparedTrx = await fioSdk2.sdk.genericAction('requestFunds', {
        payerFioAddress: testFioAddressName,
        payeeFioAddress: testFioAddressName2,
        payeePublicAddress: testFioAddressName2,
        amount: 200000,
        chainCode: fioChainCode,
        tokenCode: fioTokenCode,
        memo: 'prepared transaction',
        maxFee: defaultFee,
      })
      //console.log('preparedTrx: ', preparedTrx)
      const result = await fioSdk2.sdk.executePreparedTrx(EndPoint.newFundsRequest, preparedTrx)
      //console.log('transaction_id: ', result.transaction_id)
      expect(result).to.have.any.keys('status');
      expect(result).to.have.any.keys('fee_collected');
      expect(result).to.have.any.keys('block_num');
      expect(result).to.have.any.keys('transaction_id');
      expect(result).to.have.any.keys('fio_request_id');
      expect(result.fio_request_id).to.be.a('number')
      expect(result.status).to.be.a('string')
      expect(result.fee_collected).to.be.a('number')
      fioSdk2.sdk.setSignedTrxReturnOption(false);

    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal(null);
    }
  })
})

describe('J. Test transfer_tokens_pub_key fee distribution', () => {
  let tpid,
    foundationBalance, foundationBalancePrev,
    tpidBalance, tpidBalancePrev,
    stakingBalance, stakingBalancePrev,
    bpBalance, bpBalancePrev,
    endpoint_fee,
    feeCollected
  
  // v2.6.x
  const foundationRewardPercent = '0.05',
    tpidRewardPercent = '0.1',
    tpidNewuserbountyPercent = '0.4',
    bpRewardPercent = '0.6',
    stakingRewardPercent = 0.25   // Staking returns a number, not a string... ?

  const endpoint = "transfer_tokens_pub_key"

  const transferAmount = 1000000000   // 1 FIO

  if (target == 'local') {
    tpid = 'bp1@dapixdev'
  } else {
    tpid = 'blockpane@fiotestnet'
  }

  it(`Get balance for fioSdk`, async () => {
    try {
      const result = await fioSdk.sdk.genericAction('getFioBalance', {
        fioPublicKey: fioSdk.publicKey
      })
      fioSdkPrevBalance = result.balance
      //console.log('fioSdk fio balance', result)
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

  it(`Get current foundation rewards`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'fdtnrewards',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      foundationBalance = result.rows[0].rewards;
      //console.log('foundationBalance: ', foundationBalance);
      expect(foundationBalance).to.greaterThan(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get current bprewards`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'bprewards',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      bpBalance = result.rows[0].rewards;
      //console.log('bpBalance: ', bpBalance);
      expect(bpBalance).to.greaterThan(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get current tpid rewards`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.tpid',
        scope: 'fio.tpid',
        table: 'bounties',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      tpidBalance = result.rows[0].tokensminted;
      //console.log('tpidBalance: ', tpidBalance);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get current staking rewards`, async () => {
    try {
      const json = {
        json: true,
        code: 'fio.staking',
        scope: 'fio.staking',
        table: 'staking',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      stakingBalance = result.rows[0].rewards_token_pool;
      //console.log('stakingBalance: ', stakingBalance);
      expect(stakingBalance).to.greaterThan(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Get endpoint fee', async () => {
    try {
      result = await fioSdk.sdk.getFee(endpoint);
      endpoint_fee = result.fee;
      //console.log('endpoint_fee: ', endpoint_fee)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Test: transferTokens. Transfer FIO from fioSdk to fioSdk2', async () => {
    try {
      const result = await fioSdk.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: fioSdk2.publicKey,
        amount: transferAmount,
        maxFee: endpoint_fee,
        technologyProviderId: tpid
      })
      //console.log('Result: ', result)
      feeCollected = result.fee_collected;
      expect(result).to.have.any.keys('status');
      expect(result).to.have.any.keys('fee_collected');
      expect(result).to.have.any.keys('block_num');
      expect(result).to.have.any.keys('transaction_id');
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(5000) })

  it(`Confirm fee collected > 0`, async () => {
    expect(feeCollected).to.greaterThan(0)
  })

  it(`Get updated foundation rewards. Expect increase of ${foundationRewardPercent} * fee`, async () => {
    foundationBalancePrev = foundationBalance;
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'fdtnrewards',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      foundationBalance = result.rows[0].rewards;
      //console.log('foundationBalance: ', foundationBalance);
      percentDiff = (foundationBalance - foundationBalancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(2);
      //console.log('foundation Rewards percent diff rnd: ', percentDiffRnd);
      expect(percentDiffRnd).to.equal(foundationRewardPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get updated bprewards. Expect increase of ${bpRewardPercent} * fee`, async () => {
    bpBalancePrev = bpBalance;
    try {
      const json = {
        json: true,
        code: 'fio.treasury',
        scope: 'fio.treasury',
        table: 'bprewards',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      bpBalance = result.rows[0].rewards;
      //console.log('bpBalance: ', bpBalance);
      percentDiff = (bpBalance - bpBalancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(1);
      //console.log('bpBalance percent diff round: ', percentDiffRnd);
      expect(percentDiffRnd).to.equal(bpRewardPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`BUG: Get updated tpid balance. Expect increase of ${tpidNewuserbountyPercent} * fee`, async () => {
    tpidBalancePrev = tpidBalance;
    try {
      const json = {
        json: true,
        code: 'fio.tpid',
        scope: 'fio.tpid',
        table: 'bounties',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      tpidBalance = result.rows[0].tokensminted;
      //console.log('tpidBalance: ', tpidBalance);
      percentDiff = (tpidBalance - tpidBalancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(1);
      //console.log('tpidBalance percent diff round: ', percentDiffRnd);
      expect(percentDiffRnd).to.equal(tpidNewuserbountyPercent);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get updated staking rewards. Expect increase of ${stakingRewardPercent} * fee`, async () => {
    stakingBalancePrev = stakingBalance;
    try {
      const json = {
        json: true,
        code: 'fio.staking',
        scope: 'fio.staking',
        table: 'staking',
        limit: 10,
        reverse: false
      }
      result = await callFioApi("get_table_rows", json);
      stakingBalance = result.rows[0].rewards_token_pool;
      //console.log('stakingBalance: ', stakingBalance);
      percentDiff = (stakingBalance - stakingBalancePrev) / endpoint_fee;
      percentDiffRnd = percentDiff.toFixed(2);
      //console.log('stakingBalance percent diff: ', (stakingBalance - stakingBalancePrev) / endpoint_fee);
      expect(percentDiffRnd).to.equal(stakingRewardPercent.toString());
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})

describe(`Domain Marketplace: List domain and cancel domain listing`, async () => {
  let domain1, list_domain_fee, cancel_list_domain_fee, fioSdkBalance, domainID;
  const salePrice = 20000000000;

  it(`Get user balance`, async () => {
    const userBalanceResult = await fioSdk2.sdk.genericAction('getFioBalance', {
      fioPublicKey: fioSdk2.publicKey
    })
    fioSdkBalance = userBalanceResult.balance;
    //console.log('userBalanceResult: ', userBalanceResult);
  });

  it(`getFee for listdomain`, async () => {
    const result = await fioSdk2.sdk.getFee('list_domain');
    list_domain_fee = result.fee;

    expect(result).to.have.all.keys('fee')
    expect(result.fee).to.be.a('number')
  });

  it(`Call getFioDomains for fioSdk to get one of its domains`, async () => {
    try{
      const result = await fioSdk.sdk.genericAction('getFioDomains', { fioPublicKey: fioSdk.publicKey })
      domain1 = result.fio_domains[0].fio_domain;

      expect(result).to.have.all.keys('fio_domains','more')
      expect(result.fio_domains).to.be.a('array')
    } catch (e) {
      console.log(e);
    }
  })

  it(`List domain1`, async () => {
    try {
      let data = {
        "actor": fioSdk.account,
        "fio_domain": domain1,
        "sale_price": salePrice,
        "max_fee": config.maxFee,
        "tpid": ""
      };

      const result = await fioSdk.sdk.genericAction('pushTransaction', {
        action: 'listdomain',
        account: 'fio.escrow',
        data
      });
      domainID = result.domainsale_id;
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error', err.json);
      expect(err).to.equal(null);
    };
  });

  it(`Get listing from domainsales table for domain1. Expect status = 1 (listed).`, async () => {
    await timeout(500)

    const domainHash = stringToHash(domain1);
    const domainSaleRow = await callFioApi("get_table_rows", {
      json: true,
      code: 'fio.escrow',
      scope: 'fio.escrow',
      table: 'domainsales',
      upper_bound: domainHash.toString(),
      lower_bound: domainHash.toString(),
      key_type: 'i128',
      index_position: 2,
      reverse: true,
      show_payer: false
    });

    //console.log('domainSaleRow: ', domainSaleRow);
    expect(domainSaleRow.rows[0].status).to.equal(1); // cancelled listing
  });

  it(`Get user balance`, async () => {
    await timeout(500);
    const userBalanceResult = await fioSdk.sdk.genericAction('getFioBalance', {
      fioPublicKey: fioSdk.publicKey
    })
    fioSdkBalance = userBalanceResult.balance;
  });

  it(`getFee for cxlistdomain`, async () => {
    const result = await fioSdk.sdk.getFee('cancel_list_domain');
    cancel_list_domain_fee = result.fee;

    expect(result).to.have.all.keys('fee')
    expect(result.fee).to.be.a('number')
  });

  it.skip(`BUG?? Cancel domain1 listing. Returns error if the domain was already listed and cancelled`, async () => {
    try {
    let data = {
      "actor": fioSdk.account,
      "fio_domain": domain1,
      "max_fee": cancel_list_domain_fee,
      "tpid": ""
    };
      const result = await fioSdk.sdk.genericAction('pushTransaction', {
      action: 'cxlistdomain',
      account: 'fio.escrow',
      data: data
    });
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error', err.json);
      expect(err).to.equal(null);
    };
  });

  it.skip(`Get listing from domainsales table. Expect status = 3 (cancelled).`, async () => {
    await timeout(500)

    const domainHash = stringToHash(domain1);
    const domainSaleRow = await callFioApi("get_table_rows", {
      json: true,
      code: 'fio.escrow',
      scope: 'fio.escrow',
      table: 'domainsales',
      upper_bound: domainHash.toString(),
      lower_bound: domainHash.toString(),
      key_type: 'i128',
      index_position: 2,
      reverse: true,
      show_payer: false
    });

    //console.log('domainSaleRow: ', domainSaleRow);
    expect(domainSaleRow.rows[0].status).to.equal(3); // cancelled listing
    expect(domainSaleRow.rows[0].date_listed).to.not.equal(domainSaleRow.rows[0].date_updated);

    const userBalanceResultAfter = await fioSdk.sdk.genericAction('getFioBalance', {
      fioPublicKey: fioSdk.publicKey
    });

    expect(userBalanceResultAfter.balance).to.equal(fioSdkBalance - cancel_list_domain_fee)
  });

})

describe(`FIPs 36-39`, async () => {
  let newAccount = {};

  before(async () => {
    const keypair = await createKeypair();
    newAccount = {
      publicKey: keypair.publicKey,
      privateKey: keypair.privateKey,
      account: await getAccountFromKey(keypair.publicKey)
    };
  });

  it(`FIP-36 - get_account_fio_public_key`, async () => {
    try {
      const json = {
        account: fioSdk.account
      }
      result = await callFioApi("get_account_fio_public_key", json);
      //console.log('Result: ', result);
      expect(result.fio_public_key).to.equal(fioSdk.publicKey);
    } catch (err) {
      //console.log(err);
      console.log(JSON.stringify(err.error, null, 4));
      expect(err).to.equal(null);
    }
  });

  it(`FIP-38 - newfioacc - Create new account with active and owner perms`, async () => {
    try {
      const result = await fioSdk.sdk.genericAction('pushTransaction', {
        action: 'newfioacc',
        account: 'eosio',
        actor: fioSdk.account,
        data: {
            "fio_public_key": newAccount.publicKey,
            "owner": {
                "threshold": 1,
                "keys": [],
                "waits": [],
                "accounts": [{
                    "permission": {
                        "actor": fioSdk2.account,
                        "permission": "active"
                    },
                    "weight": 1
                }]
            },
            "active": {
                "threshold": 1,
                "keys": [],
                "waits": [],
                "accounts": 
                [
                    {
                        "permission": {
                            "actor": fioSdk2.account,
                            "permission": "active"
                        },
                        "weight": 1
                    }
                ]
            },
            "max_fee": config.maxFee,
            "actor": fioSdk.account,
            "tpid": fioSdk.address
        }
      })
      expect(result.status).to.equal('OK');
    } catch (err) {
        console.log(err);
        expect(err).to.equal(null);
    }
  });

  it(`FIP-38 - get_account for new account. Confirm permissions.`, async function () {
    try {
        const json = {
            "account_name": newAccount.account
        }
        result = await callFioApi("get_account", json);
        //console.log(JSON.stringify(result, null, 4));
        expect(result.permissions[0].perm_name).to.equal('active');
        expect(result.permissions[0].parent).to.equal('owner');
        expect(result.permissions[0].required_auth.accounts[0].permission.actor).to.equal(fioSdk2.account);
        expect(result.permissions[0].required_auth.accounts[0].weight).to.equal(1);
        expect(result.permissions[0].required_auth.keys.length).to.equal(0);
        expect(result.permissions[0].required_auth.waits.length).to.equal(0);
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
  });
  
});
