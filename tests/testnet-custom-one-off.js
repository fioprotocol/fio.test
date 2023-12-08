/**
 * testnet-custom-one-ff.js is a js file used to facilitate testnet testing of releases. this file can be used to
 * perform various testing on test net for a given release.
 * NOTE -- this file is not intended to be run other than for one time test net testing....all
 * necessary logistics of funding accounts and account management to ensure success is NOT documented.
 * this file is included in the repo only to help facilitate the creation of any necssary tests for test net in the
 * future for a given release.
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
    getProdVoteTotal,
  stringToHash, 
  getAccountFromKey,
  fetchJson,
  generateFioDomain,
  generateFioAddress
} = require('../utils.js');
const config = require('../config.js');
const { EndPoint } = require('@fioprotocol/fiosdk/lib/entities/EndPoint');

let privateKey, publicKey, testFioAddressName, privateKey2, publicKey2, testFioAddressName2

/**
* Set to target = 'local' if running against devtools build. Leave blank if running against Testnet.
*/
const target = ''

/**
 * Set your testnet existing private/public keys and existing fioAddresses (not needed if running locally)
 */
privateKey = '5Jw78NzS2QMvjcyemCgJ9XQv8SMSEvTEuLxF8TcKf27xWcX5fmw',
    publicKey = 'FIO8k7N7jU9eyj57AfazGxMuvPGZG5hvXNUyxt9pBchnkXXx9KUuD',
    account = 'v2lgwcdkb5gn',
    privateKey2 = '5Hv1zRFa7XRo395dfHS8xrviszPiVYeBhQjJq4TsPv53NvAcfyU',
    publicKey2 = 'FIO7b3WHTsS1wTF2dAUvE9DoDXvxYUVA8FepLW6x9Bv5rPJnUW6ab',
    account2 = '3the3fevcz2u',
    testFioDomain = 'testing-domain-1651020465357',
    testFioAddressName = 'ebtest1@fiotestnet',
    testFioAddressName2 = 'ebtest3@fiotestnet'


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

/*
for testnet we have created 6 accounts and will use these for recursive proxy testing
this test will be run once only on test net.
Private key: 5KkrwiKsQm1hMG4J1vTaenjnk11Jqs8erFSZQNLFZzofcEUHMd6
Public key: FIO6r77qTepbYZQ7H8kSznrGi8BmUQuwvLmAdJ9jaLhDLaXScr2dp
1v4wnskej5ga
domain tojmryqo
address yjkngmp@tojmryqo

Private key: 5JQ9oAyLPzGw9H3mB4sPFk2hJ8wdKaRmspSCebodvpggj6AJwTW
Public key: FIO5A8QNKWjXxiDPv5RA4Ufcn2bmYtNVsYd47RtFssQ6jzJ1FBxgC
FIO Public Address (actor name): 321oie5zb1ls
domain  qagznezu
address : hknhtnk@qagznezu

Private key: 5JFXBwCv5zJ57dYNMqAZsNv5SVPZTMZ9xJRQp3kXHAmYkaQfXFY
Public key: FIO73yEGPu4kDuhYnEgiimcJPyzidgH8U4zwYrsN5feGGq6AeSU6k
FIO Public Address (actor name): wfdqqrjsq3mx
domain  bahhxjvq
address : okvioaz@bahhxjvq

Private key: 5Jbkwq8EvKNMcuw2sUFCatK8tELK9E6exMukBSAwzYeqMxTZYed
Public key: FIO7WNKLL9V3WE22EcrbThdFi8mZF81b1WKNYuoDqZrCSDjBB3ynN
FIO Public Address (actor name): svja4r4crjch
domain  xasszoah
address : peisnfr@xasszoah

Private key: 5K5y4LfMj4GZNdrAJtoYk2uEDHKXTc5BjE8RC25QGJLgLaQL3kN
Public key: FIO5Wnwtnnk9uk5jdRFWj3j8HuQ4hchxQ8hybbsvcowLDJytCSafJ
FIO Public Address (actor name): mi1esze4vfal
domain  maydwplwt
address : tenbhoerg@maydwplwt

Private key: 5JAKSYkDjjasvtH9Qu579m1Et3E12aXrYMrXwLmcfNb33qRAEBF
Public key: FIO6gPdqip3zUcSm8vHNqbTU5BSqboE42Xsv48QcBcZdxSqYS3yxY
FIO Public Address (actor name): ffzmhytd1lex
domain  tmoyamyv
address : umxmfbj@tmoyamyv

for each account we need to creat sdk then reg an address and domain.
 let fioSDKBob = new FIOSDK(
    bobPrivateKey,
    bobPublicKey,
    config.BASE_URL,
    fetchJson
  )

let domain1 = generateFioDomain(5);
  let domain2 = generateFioDomain(10);
  let domain3 = generateFioDomain(10);
  let address1 = generateFioAddress(domain1, 5);
  let address2 = generateFioAddress(domain2, 9);
  let address3 = generateFioAddress(domain3, 9);
*/

describe.skip(`set up test net accounts`, () => {

  let accountA, accountB, accountC, accountD, accountE, accountF, accountG,total_voted_fio, start_bp_votes, proxied_weightC, proxied_weightB,  total_bp_votes,regproxyfee

  it.skip(`setup AccountA `, async () => {
    try{
      accountA = new FIOSDK('5KkrwiKsQm1hMG4J1vTaenjnk11Jqs8erFSZQNLFZzofcEUHMd6','FIO6r77qTepbYZQ7H8kSznrGi8BmUQuwvLmAdJ9jaLhDLaXScr2dp',config.BASE_URL,fetchJson);

      let domname = generateFioDomain(8);
      console.log("EDEDEDEDEDEDEDED dont run this action again!! record domain and address to test file and skip this IT!!!!")

      console.log("domain " ,domname);
      let result = await accountA.genericAction('pushTransaction', {
        action: 'regdomain',
        account: 'fio.address',
        data: {
          fio_domain: domname,
          owner_fio_public_key: 'FIO6r77qTepbYZQ7H8kSznrGi8BmUQuwvLmAdJ9jaLhDLaXScr2dp',
          max_fee: config.maxFee,
          tpid: '',
          actor: '1v4wnskej5ga'
        }
      })
      expect(result.status).to.equal('OK');

      let addaddress3 = generateFioAddress(domname, 7);
      console.log("address :",addaddress3);
      result = await accountA.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        data: {
          fio_address: addaddress3,
          owner_fio_public_key: 'FIO6r77qTepbYZQ7H8kSznrGi8BmUQuwvLmAdJ9jaLhDLaXScr2dp',
          max_fee: config.maxFee,
          tpid: '',
          actor: '1v4wnskej5ga'
        }
      });
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log("ERROR :" ,err);
      throw err;
    }
  })

  it.skip(`setup AccountB `, async () => {
    try{
      let privkey = '5JQ9oAyLPzGw9H3mB4sPFk2hJ8wdKaRmspSCebodvpggj6AJwTW';
      let pubkey = 'FIO5A8QNKWjXxiDPv5RA4Ufcn2bmYtNVsYd47RtFssQ6jzJ1FBxgC';
      let accountnm = '321oie5zb1ls';

      accountA = new FIOSDK(privkey,pubkey,config.BASE_URL,fetchJson);

      let domname = generateFioDomain(8);
      console.log("EDEDEDEDEDEDEDED dont run this action again!! record domain and address to test file and skip this IT!!!!")

      console.log("domain " ,domname);
      let result = await accountA.genericAction('pushTransaction', {
        action: 'regdomain',
        account: 'fio.address',
        data: {
          fio_domain: domname,
          owner_fio_public_key: pubkey,
          max_fee: config.maxFee,
          tpid: '',
          actor: accountnm
        }
      })
      expect(result.status).to.equal('OK');

      let addaddress3 = generateFioAddress(domname, 7);
      console.log("address :",addaddress3);
      result = await accountA.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        data: {
          fio_address: addaddress3,
          owner_fio_public_key: pubkey,
          max_fee: config.maxFee,
          tpid: '',
          actor: accountnm
        }
      });
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log("ERROR :" ,err);
      throw err;
    }
  })

  it.skip(`setup AccountC `, async () => {
    try{

      let privkey = '5JFXBwCv5zJ57dYNMqAZsNv5SVPZTMZ9xJRQp3kXHAmYkaQfXFY';
      let pubkey = 'FIO73yEGPu4kDuhYnEgiimcJPyzidgH8U4zwYrsN5feGGq6AeSU6k';
      let accountnm = 'wfdqqrjsq3mx';

      accountA = new FIOSDK(privkey,pubkey,config.BASE_URL,fetchJson);

      let domname = generateFioDomain(8);
      console.log("EDEDEDEDEDEDEDED dont run this action again!! record domain and address to test file and skip this IT!!!!")

      console.log("domain " ,domname);
      let result = await accountA.genericAction('pushTransaction', {
        action: 'regdomain',
        account: 'fio.address',
        data: {
          fio_domain: domname,
          owner_fio_public_key: pubkey,
          max_fee: config.maxFee,
          tpid: '',
          actor: accountnm
        }
      })
      expect(result.status).to.equal('OK');

      let addaddress3 = generateFioAddress(domname, 7);
      console.log("address :",addaddress3);
      result = await accountA.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        data: {
          fio_address: addaddress3,
          owner_fio_public_key: pubkey,
          max_fee: config.maxFee,
          tpid: '',
          actor: accountnm
        }
      });
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log("ERROR :" ,err);
      throw err;
    }
  })

  it.skip(`setup AccountD `, async () => {
    try{

      let privkey = '5Jbkwq8EvKNMcuw2sUFCatK8tELK9E6exMukBSAwzYeqMxTZYed';
      let pubkey = 'FIO7WNKLL9V3WE22EcrbThdFi8mZF81b1WKNYuoDqZrCSDjBB3ynN';
      let accountnm = 'svja4r4crjch';

      accountA = new FIOSDK(privkey,pubkey,config.BASE_URL,fetchJson);

      let domname = generateFioDomain(8);
      console.log("EDEDEDEDEDEDEDED dont run this action again!! record domain and address to test file and skip this IT!!!!")

      console.log("domain " ,domname);
      let result = await accountA.genericAction('pushTransaction', {
        action: 'regdomain',
        account: 'fio.address',
        data: {
          fio_domain: domname,
          owner_fio_public_key: pubkey,
          max_fee: config.maxFee,
          tpid: '',
          actor: accountnm
        }
      })
      expect(result.status).to.equal('OK');

      let addaddress3 = generateFioAddress(domname, 7);
      console.log("address :",addaddress3);
      result = await accountA.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        data: {
          fio_address: addaddress3,
          owner_fio_public_key: pubkey,
          max_fee: config.maxFee,
          tpid: '',
          actor: accountnm
        }
      });
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log("ERROR :" ,err);
      throw err;
    }
  })

  it.skip(`setup AccountE `, async () => {
    try{

      let privkey = '5K5y4LfMj4GZNdrAJtoYk2uEDHKXTc5BjE8RC25QGJLgLaQL3kN';
      let pubkey = 'FIO5Wnwtnnk9uk5jdRFWj3j8HuQ4hchxQ8hybbsvcowLDJytCSafJ';
      let accountnm = 'mi1esze4vfal';

      accountA = new FIOSDK(privkey,pubkey,config.BASE_URL,fetchJson);

      let domname = generateFioDomain(9);
      console.log("EDEDEDEDEDEDEDED dont run this action again!! record domain and address to test file and skip this IT!!!!")

      console.log("domain " ,domname);
      let result = await accountA.genericAction('pushTransaction', {
        action: 'regdomain',
        account: 'fio.address',
        data: {
          fio_domain: domname,
          owner_fio_public_key: pubkey,
          max_fee: config.maxFee,
          tpid: '',
          actor: accountnm
        }
      })
      expect(result.status).to.equal('OK');

      let addaddress3 = generateFioAddress(domname, 9);
      console.log("address :",addaddress3);
      result = await accountA.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        data: {
          fio_address: addaddress3,
          owner_fio_public_key: pubkey,
          max_fee: config.maxFee,
          tpid: '',
          actor: accountnm
        }
      });
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log("ERROR :" ,err);
      throw err;
    }
  })

  it.skip(`setup AccountF `, async () => {
    try{
      let privkey = '5JAKSYkDjjasvtH9Qu579m1Et3E12aXrYMrXwLmcfNb33qRAEBF';
      let pubkey = 'FIO6gPdqip3zUcSm8vHNqbTU5BSqboE42Xsv48QcBcZdxSqYS3yxY';
      let accountnm = 'ffzmhytd1lex';

      accountA = new FIOSDK(privkey,pubkey,config.BASE_URL,fetchJson);

      let domname = generateFioDomain(8);
      console.log("EDEDEDEDEDEDEDED dont run this action again!! record domain and address to test file and skip this IT!!!!")

      console.log("domain " ,domname);
      let result = await accountA.genericAction('pushTransaction', {
        action: 'regdomain',
        account: 'fio.address',
        data: {
          fio_domain: domname,
          owner_fio_public_key: pubkey,
          max_fee: config.maxFee,
          tpid: '',
          actor: accountnm
        }
      })
      expect(result.status).to.equal('OK');

      let addaddress3 = generateFioAddress(domname, 7);
      console.log("address :",addaddress3);
      result = await accountA.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        data: {
          fio_address: addaddress3,
          owner_fio_public_key: pubkey,
          max_fee: config.maxFee,
          tpid: '',
          actor: accountnm
        }
      });
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log("ERROR :" ,err);
      throw err;
    }
  })
})

describe.skip(`recursive proxy tests`, () => {
  let accountA, accountB, accountC, accountD, accountE, accountF, total_voted_fio, start_bp_votes, proxied_weightC, proxied_weightB,  total_bp_votes,regproxyfee
  let accountAnm, accountBnm, accountCnm, accountDnm, accountEnm, accountFnm;
  let accountAdom, accountBdom, accountCdom, accountDdom, accountEdom, accountFdom;
  let accountAaddr, accountBaddr, accountCaddr, accountDaddr, accountEaddr, accountFaddr;
  let transfer_tokens_pub_key_fee = 2000000000;

  it(`setup accounts `, async () => {
    try {
      accountA = new FIOSDK('5KkrwiKsQm1hMG4J1vTaenjnk11Jqs8erFSZQNLFZzofcEUHMd6',
          'FIO6r77qTepbYZQ7H8kSznrGi8BmUQuwvLmAdJ9jaLhDLaXScr2dp',config.BASE_URL,fetchJson);
      accountAnm = '1v4wnskej5ga';
      accountAdom = 'tojmryqo';
      accountAaddr = 'yjkngmp@tojmryqo';

      let privkey = '5JQ9oAyLPzGw9H3mB4sPFk2hJ8wdKaRmspSCebodvpggj6AJwTW';
      let pubkey = 'FIO5A8QNKWjXxiDPv5RA4Ufcn2bmYtNVsYd47RtFssQ6jzJ1FBxgC';
      accountBnm = '321oie5zb1ls';
      accountBdom = 'qagznezu';
      accountBaddr = 'hknhtnk@qagznezu';

      accountB = new FIOSDK(privkey,pubkey,config.BASE_URL,fetchJson);

      privkey = '5JFXBwCv5zJ57dYNMqAZsNv5SVPZTMZ9xJRQp3kXHAmYkaQfXFY';
      pubkey = 'FIO73yEGPu4kDuhYnEgiimcJPyzidgH8U4zwYrsN5feGGq6AeSU6k';
      accountCnm = 'wfdqqrjsq3mx';
      accountCdom = 'bahhxjvq';
      accountCaddr = 'okvioaz@bahhxjvq';

      accountC = new FIOSDK(privkey,pubkey,config.BASE_URL,fetchJson);

      privkey = '5Jbkwq8EvKNMcuw2sUFCatK8tELK9E6exMukBSAwzYeqMxTZYed';
      pubkey = 'FIO7WNKLL9V3WE22EcrbThdFi8mZF81b1WKNYuoDqZrCSDjBB3ynN';
      accountDnm = 'svja4r4crjch';
      accountDdom = 'xasszoah';
      accountDaddr = 'peisnfr@xasszoah';

      accountD = new FIOSDK(privkey,pubkey,config.BASE_URL,fetchJson);

      privkey = '5K5y4LfMj4GZNdrAJtoYk2uEDHKXTc5BjE8RC25QGJLgLaQL3kN';
      pubkey = 'FIO5Wnwtnnk9uk5jdRFWj3j8HuQ4hchxQ8hybbsvcowLDJytCSafJ';
      accountEnm = 'mi1esze4vfal';
      accountEdom = 'maydwplwt';
      accountEaddr = 'tenbhoerg@maydwplwt';

      accountE = new FIOSDK(privkey,pubkey,config.BASE_URL,fetchJson);

      privkey = '5JAKSYkDjjasvtH9Qu579m1Et3E12aXrYMrXwLmcfNb33qRAEBF';
      pubkey = 'FIO6gPdqip3zUcSm8vHNqbTU5BSqboE42Xsv48QcBcZdxSqYS3yxY';
      accountFnm = 'ffzmhytd1lex';
      accountFdom = 'tmoyamyv';
      accountFaddr = 'umxmfbj@tmoyamyv';

      accountF = new FIOSDK(privkey,pubkey,config.BASE_URL,fetchJson);
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(5000) })

  //unregproxy B,C,Dto start test.

  //send some funds to A,B,C,D from F
  it(`transfer from F to A`, async () => {
    try {
      const result = await accountA.genericAction('getFioBalance', { })
      console.log('Result: ', result)
      if(result.balance < 2000000000000) {

        console.log("SENDING FUNDS");
        let result1 = await accountF.genericAction('transferTokens', {
          payeeFioPublicKey: accountA.publicKey,
          amount: 2000000000000,
          maxFee: config.maxFee,
        })
      }
      //console.log('Result balance: ', result2.balance);
    } catch (err) {
      expect(err.json.message).to.equal(null)
    }
  })

  it(`transfer from F to B`, async () => {
    try {
      const result = await accountB.genericAction('getFioBalance', { })
      console.log('Result: ', result)
      if(result.balance < 50000000000) {

        console.log("SENDING FUNDS");
        let result1 = await accountF.genericAction('transferTokens', {
          payeeFioPublicKey: accountB.publicKey,
          amount: 50000000000,
          maxFee: config.maxFee,
        })
      }
      //console.log('Result balance: ', result2.balance);
    } catch (err) {
      expect(err.json.message).to.equal(null)
    }
  })

  it(`transfer from F to C`, async () => {
    try {
      const result = await accountC.genericAction('getFioBalance', { })
      console.log('Result: ', result)
      if(result.balance < 50000000000) {

        console.log("SENDING FUNDS");
        let result1 = await accountF.genericAction('transferTokens', {
          payeeFioPublicKey: accountC.publicKey,
          amount: 50000000000,
          maxFee: config.maxFee,
        })
      }
      //console.log('Result balance: ', result2.balance);
    } catch (err) {
      expect(err.json.message).to.equal(null)
    }
  })

  it(`transfer from F to D`, async () => {
    try {
      const result = await accountD.genericAction('getFioBalance', { })
      console.log('Result: ', result)
      if(result.balance < 50000000000) {

        console.log("SENDING FUNDS");
        let result1 = await accountF.genericAction('transferTokens', {
          payeeFioPublicKey: accountD.publicKey,
          amount: 50000000000,
          maxFee: config.maxFee,
        })
      }
      //console.log('Result balance: ', result2.balance);
    } catch (err) {
      expect(err.json.message).to.equal(null)
    }
  })

  it(`unregproxy A`, async function () {
    try {
      const result = await accountA.genericAction('pushTransaction', {
        action: 'unregproxy',
        account: 'eosio',
        data: {
          fio_address: accountAaddr,
          actor: accountAnm,
          max_fee: 40000000000
        }
      })
      expect(result.status).to.equal('OK');
      await validateVotes();
    } catch (err) {
      console.log(JSON.stringify(err, null, 4));
      throw err;
    }
  });

  it(`unregproxy B`, async function () {
    try {
      const result = await accountB.genericAction('pushTransaction', {
        action: 'unregproxy',
        account: 'eosio',
        data: {
          fio_address: accountBaddr,
          actor: accountBnm,
          max_fee: 40000000000
        }
      })
      expect(result.status).to.equal('OK');
      await validateVotes();
    } catch (err) {
      console.log(JSON.stringify(err, null, 4));
      throw err;
    }
  });

  it(`unregproxy C`, async function () {
    try {
      const result = await accountC.genericAction('pushTransaction', {
        action: 'unregproxy',
        account: 'eosio',
        data: {
          fio_address: accountCaddr,
          actor: accountCnm,
          max_fee: 40000000000
        }
      })
      expect(result.status).to.equal('OK');
      await validateVotes();
    } catch (err) {
      console.log(JSON.stringify(err, null, 4));
      throw err;
    }
  });

  it(`unregproxy D`, async function () {
    try {
      const result = await accountD.genericAction('pushTransaction', {
        action: 'unregproxy',
        account: 'eosio',
        data: {
          fio_address: accountDaddr,
          actor: accountDnm,
          max_fee: 40000000000
        }
      })
      expect(result.status).to.equal('OK');
      await validateVotes();
    } catch (err) {
      console.log(JSON.stringify(err, null, 4));
      throw err;
    }
  });

  it(`Register A as a proxy`, async () => {
    try {
      const result = await accountA.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountAaddr,
          actor: accountAnm,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`A votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await accountA.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'eosbarcelona@fiotestnet'
          ],
          fio_address: accountAaddr,
          actor: accountAnm,
          max_fee: config.api.vote_producer.fee
        }
      })
      console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  //proxy b votes to A
  it(`B proxies votes to A`, async () => {
    try {
      const result = await accountB.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: accountAaddr,
          fio_address: accountBaddr,
          actor: accountBnm,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Get eosbarcelona@fiotestnet votes at this time`, async () => {
    try {
      total_bp_votes = await getProdVoteTotal('eosbarcelona@fiotestnet');
      start_bp_votes = total_bp_votes;
      console.log("start BP votes ",start_bp_votes);
      //  console.log('eosbarcelona@fiotestnet total_votes:', total_bp_votes);
      //  console.log('change in bp votes is ',total_bp_votes - start_bp_votes);
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Register B as a proxy`, async () => {
    try {
      const result = await accountB.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountBaddr,
          actor: accountBnm,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`B votes for eosbarcelona@fiotestnet using address #1`, async () => {
    try {
      const result = await accountB.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'eosbarcelona@fiotestnet'
          ],
          fio_address: accountBaddr,
          actor: accountBnm,
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

  it(`Verify eosbarcelona@fiotestnet total_votes`, async () => {
    try {
      total_bp_votes = await getProdVoteTotal('eosbarcelona@fiotestnet');
      expect(start_bp_votes).greaterThan(total_bp_votes);
      //console.log('eosbarcelona@fiotestnet total_votes:', total_bp_votes);
      // console.log('change in bp votes is ',total_bp_votes - start_bp_votes);
    } catch (err) {
      console.log('Error: ', err)
      throw err;
    }
  })

  //empty account C,D,E,F into G so they are empty.
  //repeatedly send funds from B to C,D,E,F, proxy the vote to A, then regProxy then forward funds to next.
  it(`empty account C`, async () => {
    try {
      const result = await accountC.genericAction('getFioBalance', { })
      //console.log('Result: ', result)
      let tamount = result.balance - transfer_tokens_pub_key_fee;
      if(tamount > 0) {

        let result1 = await accountC.genericAction('transferTokens', {
          payeeFioPublicKey: accountF.publicKey,
          amount: tamount,
          maxFee: config.maxFee,
        })

      }
      //const result2 = await accountC.sdk.genericAction('getFioBalance', { })
      //console.log('Result balance: ', result2.balance);
    } catch (err) {
      expect(err.json.message).to.equal(null)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it('Transfer funds from accountB to accountC', async () => {
    try {
      const result = await accountB.genericAction('getFioBalance', {})
      // console.log('Result: ', result)
      let tamount = result.balance - transfer_tokens_pub_key_fee;
      if (tamount > 0) {
        const result1 = await accountB.genericAction('transferTokens', {
          payeeFioPublicKey: accountC.publicKey,
          amount: tamount,
          maxFee: config.maxFee,
        })
        // console.log('Result', result1)
        expect(result1.status).to.equal('OK')
      }
    }catch(err){
      console.log(err);
    }
  })

  it(`C proxies votes to A`, async () => {
    try {
      const result = await accountC.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: accountAaddr,
          fio_address: accountCaddr,
          actor: accountCnm,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Register C as a proxy`, async () => {
    try {
      const result = await accountC.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountCaddr,
          actor: accountCnm,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`C votes for eosbarcelona@fiotestnet using address #1`, async () => {
    try {
      const result = await accountC.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'eosbarcelona@fiotestnet'
          ],
          fio_address: accountCaddr,
          actor: accountCnm,
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

  it(`Verify eosbarcelona@fiotestnet total_votes`, async () => {
    try {
      total_bp_votes = await getProdVoteTotal('eosbarcelona@fiotestnet');
      //console.log('eosbarcelona@fiotestnet total_votes:', total_bp_votes);
      // console.log('change in bp votes is ',total_bp_votes - start_bp_votes);
      expect(start_bp_votes).greaterThan(total_bp_votes);
    } catch (err) {
      console.log('Error: ', err)
      throw err
    }
  })

  //use D as account
  it(`empty account D`, async () => {
    try {
      const result = await accountD.genericAction('getFioBalance', { })
      //console.log('Result: ', result)
      prevFundsAmount = result.balance
      let tamount = result.balance - transfer_tokens_pub_key_fee;

      if (tamount > 0) {
        let result1 = await accountD.genericAction('transferTokens', {
          payeeFioPublicKey: accountF.publicKey,
          amount: tamount,
          maxFee: config.maxFee,
        })
        const result2 = await accountD.genericAction('getFioBalance', {})
      }
      //console.log('Result balance: ', result2.balance);
    } catch (err) {
      expect(err.json.message).to.equal(null)
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it('Transfer funds from accountC to accountD', async () => {
    const result = await accountC.genericAction('getFioBalance', { })
    //console.log('Result: ', result)
    let tamount = result.balance - transfer_tokens_pub_key_fee;


    const result1 = await accountC.genericAction('transferTokens', {
      payeeFioPublicKey: accountD.publicKey,
      amount: tamount,
      maxFee: config.maxFee,
    })
    //console.log('Result', result)
    expect(result1.status).to.equal('OK')
  })

  it(`D proxies votes to A`, async () => {
    try {
      const result = await accountD.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: accountAaddr,
          fio_address: accountDaddr,
          actor: accountDnm,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Register D as a proxy`, async () => {
    try {
      const result = await accountD.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: accountDaddr,
          actor: accountDnm,
          max_fee: config.api.register_proxy.fee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`D votes for eosbarcelona@fiotestnet using address #1`, async () => {
    try {
      const result = await accountD.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'eosbarcelona@fiotestnet'
          ],
          fio_address: accountDaddr,
          actor: accountDnm,
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

  it(`Verify eosbarcelona@fiotestnet total_votes `, async () => {
    try {
      total_bp_votes = await getProdVoteTotal('eosbarcelona@fiotestnet');
      //console.log('eosbarcelona@fiotestnet total_votes:', total_bp_votes);
      //console.log('change in bp votes is ',total_bp_votes - start_bp_votes);
      expect(start_bp_votes).greaterThan(total_bp_votes);
    } catch (err) {
      console.log('Error: ', err)
      throw err
    }
  })
})