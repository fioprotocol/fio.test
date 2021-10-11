require('mocha')
const {expect} = require('chai')
const {newUser, existingUser,callFioApi,fetchJson, generateFioDomain, getAccountFromKey, generateFioAddress, createKeypair} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

function wait(ms){
  var start = new Date().getTime();
  var end = start;
  while(end < start + ms) {
    end = new Date().getTime();
  }
}


/*
   these tests perform development level test of the staking rewards.

   the goal of these tests is to check that the mechanics of the staking rewards is
   working as intended.

   these tests DO NOT verify that the staking rewards is meeting the requirements of FIP-21!!


   these are the 2 tests performed

   Test that staking rewards calculations are firing as expected.
   First stake 1M tokens
Switch accounts,
Stake some number of tokens
       Register a domain
       Register an address
       Register a domain
       Register an address
       Register a domain
       Register an address
Note the balance on the account.
Unstake the tokens.
Note the balance increases.


test that daily staking rewards are firing as expected.

For daily staking rewards
First stake 1M tokens
Switch accounts,
Note global staking state daily staking rewards (save value)
Stake some number of tokens
       Now call bp claim as block producer,
       Wait one minute
       Check global staking state  daily staking rewards (note increase in saved value)
       Call BP claim as block producer
       Check global state note cleared daily staking rewards
       Wait one minute
       Call BP claim as block producer
       Wait one minute
        Calll BP claim as block producer.
Note the balance on the account.
Unstake the tokens.
Note the balance increases.


SETUP --

to setup these tests

first set the unstaking lock period to be shortened.


go to the contract fio.staking.cpp and change the following lines
 *
 *  change
 *
 *  int64_t UNSTAKELOCKDURATIONSECONDS = 604800;
 *
 *    to become
 *
 *  int64_t UNSTAKELOCKDURATIONSECONDS = 60;
 *
 *
 * next change the foundation account to be one of the accounts we use to test.
 *
go to contracts fio.accounts.hpp

   change the following line

    static const name FOUNDATIONACCOUNT = name("tw4tjkmo4eyd");

    to become

    //must change foundation account for testing BPCLAIM...test change only!!
    static const name FOUNDATIONACCOUNT = name("htjonrkf1lgs");

got to fio.treasury.cpp

     change the following line

    #define PAYSCHEDTIME    86401                   //seconds per day + 1

    to become

//test only do not deliver!!!
#define PAYSCHEDTIME    120                   //seconds per day + 1

now rebuild the contracts and you are ready to run these tests.

 */

describe(`************************** stake-rewards-dev-test.js ************************** \n    A. stake 1M tokens, then stake some tokens on diff account, then register addresses, then unstake and check for rewards added`, () => {



  let userA1, prevFundsAmount, locksdk, locksdkbp2, keys, accountnm, userA2, keys2, locksdk2, accountnm2, newFioDomain, newFioAddress, result, result2
  const lockdurationseconds = 60


  it(`Create users`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();
    console.log("priv key ", keys.privateKey);
    console.log("pub key ", keys.publicKey);
    accountnm =  await getAccountFromKey(keys.publicKey);


    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys.publicKey,
      amount: 2000000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result.status).to.equal('OK')

    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

  })

  it(`Register domain for voting  `, async () => {
    try {
      newFioDomain = generateFioDomain(15)
      const result = await locksdk.genericAction('registerFioDomain', {
        fioDomain: newFioDomain,
        maxFee: 800000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Register address for voting `, async () => {
    try {
      newFioAddress = generateFioAddress(newFioDomain,15)
      const result = await locksdk.genericAction('registerFioAddress', {
        fioAddress: newFioAddress,
        maxFee: 400000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, vote for producers.`, async () => {

    try {
      const result = await locksdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: newFioAddress,
          actor: accountnm,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  })

  it(`Success, stake 1.5M tokens tokens, exceed the min combined so staking rewards are computed `, async () => {

      const result = await locksdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: newFioAddress,
          amount: 1500000000000000,
          actor: accountnm,
          max_fee: config.maxFee,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
  })

  it(`Success, create second account and add 200k fio to account `, async () => {

    userA2 = await newUser(faucet);

    keys2 = await createKeypair();
    console.log("priv key ", keys2.privateKey);
    console.log("pub key ", keys2.publicKey);
    accountnm2 =  await getAccountFromKey(keys2.publicKey);


    const result2 = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys2.publicKey,
      amount: 200000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result2.status).to.equal('OK')

    locksdk2 = new FIOSDK(keys2.privateKey, keys2.publicKey, config.BASE_URL, fetchJson);
  })

  it(`getFioBalance for userA2 `, async () => {
    const result = await locksdk2.genericAction('getFioBalance', { })
    prevFundsAmount = result.balance
    console.log(result)
   // expect(result.available).to.equal(0)
  })

  it(`Register domain for voting  `, async () => {
    try {
      newFioDomain = generateFioDomain(15)
      const result = await locksdk2.genericAction('registerFioDomain', {
        fioDomain: newFioDomain,
        maxFee: 800000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Register address for voting `, async () => {
    try {
      newFioAddress = generateFioAddress(newFioDomain,15)
      const result = await locksdk2.genericAction('registerFioAddress', {
        fioAddress: newFioAddress,
        maxFee: 400000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, vote for producers.`, async () => {

    try {
      const result = await locksdk2.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: newFioAddress,
          actor: accountnm2,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  })

  it(`Success, stake 150k tokens tokens `, async () => {

    const result = await locksdk2.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: newFioAddress,
        amount: 150000000000000,
        actor: accountnm2,
        max_fee: config.maxFee,
        tpid:''
      }
    })
     console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`Register domain for voting, fire fees for staking rewards  `, async () => {
    try {
      newFioDomain = generateFioDomain(15)
      const result = await locksdk2.genericAction('registerFioDomain', {
        fioDomain: newFioDomain,
        maxFee: 800000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Register domain for voting  `, async () => {
    try {
      newFioDomain = generateFioDomain(15)
      const result = await locksdk2.genericAction('registerFioDomain', {
        fioDomain: newFioDomain,
        maxFee: 800000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Register domain for voting  `, async () => {
    try {
      newFioDomain = generateFioDomain(15)
      const result = await locksdk2.genericAction('registerFioDomain', {
        fioDomain: newFioDomain,
        maxFee: 800000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Register domain for voting  `, async () => {
    try {
      newFioDomain = generateFioDomain(15)
      const result = await locksdk2.genericAction('registerFioDomain', {
        fioDomain: newFioDomain,
        maxFee: 800000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Register address for voting `, async () => {
    try {
      newFioAddress = generateFioAddress(newFioDomain,15)
      const result = await locksdk2.genericAction('registerFioAddress', {
        fioAddress: newFioAddress,
        maxFee: 400000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Register address for voting `, async () => {
    try {
      newFioAddress = generateFioAddress(newFioDomain,15)
      const result = await locksdk2.genericAction('registerFioAddress', {
        fioAddress: newFioAddress,
        maxFee: 400000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Register address for voting `, async () => {
    try {
      newFioAddress = generateFioAddress(newFioDomain,15)
      const result = await locksdk2.genericAction('registerFioAddress', {
        fioAddress: newFioAddress,
        maxFee: 400000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`getFioBalance for userA2 `, async () => {
    const result = await locksdk2.genericAction('getFioBalance', { })
    prevFundsAmount = result.balance
    console.log(result)
    // expect(result.available).to.equal(0)
  })

  it(`Success, unstake 150000 tokens `, async () => {

    const result = await locksdk2.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: newFioAddress,
        amount: 150000000000000,
        actor: accountnm2,
        max_fee: config.maxFee,
        tpid:''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`getFioBalance for userA2, should see tokens added to account from rewards `, async () => {
    const result = await locksdk2.genericAction('getFioBalance', { })
    prevFundsAmount = result.balance
    console.log(result)
    // expect(result.available).to.equal(0)
  })


 //add second test that will do a bpclaim and checks on the global state for the necessary changes.

  it(`Success, create second account and add 200k fio to account `, async () => {

    userA2 = await newUser(faucet);

    keys2 = await createKeypair();
    console.log("priv key ", keys2.privateKey);
    console.log("pub key ", keys2.publicKey);
    accountnm2 =  await getAccountFromKey(keys2.publicKey);


    const result2 = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: keys2.publicKey,
      amount: 200000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result2.status).to.equal('OK')

    locksdk2 = new FIOSDK(keys2.privateKey, keys2.publicKey, config.BASE_URL, fetchJson);
    locksdkbp2 = new FIOSDK('5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr',
        config.BASE_URL,fetchJson);
  })

  it(`getFioBalance for userA2 `, async () => {
    const result = await locksdk2.genericAction('getFioBalance', { })
    prevFundsAmount = result.balance
    console.log(result)
    // expect(result.available).to.equal(0)
  })

  it(`Register domain for voting  `, async () => {
    try {
      newFioDomain = generateFioDomain(15)
      const result = await locksdk2.genericAction('registerFioDomain', {
        fioDomain: newFioDomain,
        maxFee: 800000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Register address for voting `, async () => {
    try {
      newFioAddress = generateFioAddress(newFioDomain,15)
      const result = await locksdk2.genericAction('registerFioAddress', {
        fioAddress: newFioAddress,
        maxFee: 400000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, vote for producers.`, async () => {

    try {
      const result = await locksdk2.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: newFioAddress,
          actor: accountnm2,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("ERROR: ", err)
    }
  })

  it(`Success, stake 150k tokens tokens `, async () => {

    const result = await locksdk2.genericAction('pushTransaction', {
      action: 'stakefio',
      account: 'fio.staking',
      data: {
        fio_address: newFioAddress,
        amount: 150000000000000,
        actor: accountnm2,
        max_fee: config.maxFee,
        tpid:''
      }
    })
    console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`Register domain for voting, fire fees for staking rewards  `, async () => {
    try {
      newFioDomain = generateFioDomain(15)
      const result = await locksdk2.genericAction('registerFioDomain', {
        fioDomain: newFioDomain,
        maxFee: 800000000000,
        tpid: '',
      })
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, call bpclaim as bp1, fire daily staking rewards processing `, async () => {

    const result = await locksdk2.genericAction('pushTransaction', {
      action: 'bpclaim',
      account: 'fio.treasury',
      data: {
        fio_address: 'bp1@dapixdev',
        actor: 'qbxn5zhw2ypw'
      }
    })
     console.log('BPCLAIM Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`getFioBalance for userA2 `, async () => {
    const result = await locksdk2.genericAction('getFioBalance', { })
    prevFundsAmount = result.balance
    console.log(result)
    // expect(result.available).to.equal(0)
  })

  it(`Success, unstake 150000 tokens `, async () => {

    const result = await locksdk2.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: newFioAddress,
        amount: 150000000000000,
        actor: accountnm2,
        max_fee: config.maxFee,
        tpid:''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`getFioBalance for userA2, should see tokens added to account from rewards `, async () => {
    const result = await locksdk2.genericAction('getFioBalance', { })
    prevFundsAmount = result.balance
    console.log(result)
    // expect(result.available).to.equal(0)
  })

})
