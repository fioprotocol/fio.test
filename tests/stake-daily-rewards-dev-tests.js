require('mocha')
const {expect} = require('chai')
const {newUser, existingUser,callFioApi,fetchJson, generateFioDomain, getAccountFromKey, generateFioAddress, createKeypair} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
const { getStakedTokenPool, getCombinedTokenPool, getRewardsTokenPool, getGlobalSrpCount, getDailyStakingRewards, getStakingRewardsReservesMinted } = require('./Helpers/token-pool.js');

/*

  This is a one off dev test that can only be run on a local dev box.

  This test will call bpclaim until the 25M limit for daily rewards is minted.
  This test tests that the 25M threshold is properly processed by the staking changes.

  Preconditions :

  the contracts must be built with the following changes.

  First, set the daily BP rewards to 1 FIO (this keeps the total supply from being exceeded in these tests.

   in the fio.treasury.cpp change this line
  #define BPMAXTOMINT     50000000000000          // 50,000  FIO
   to become
  #define BPMAXTOMINT     1000000000          // 50,000  FIO

  Second shorten the BP claim day to be 1 second

   in the fio.treasury.cpp change the following line
   #define PAYSCHEDTIME    86401                   //seconds per day + 1
   to become
   define PAYSCHEDTIME    1                   //DO NOT DELIVER!!!!

   Third shorten the time length permitted between BP claim calls

   in the fio.common.hpp file change the following line
   #define SECONDSBETWEENBPCLAIM (SECONDSPERHOUR * 4)
   to become
   #define SECONDSBETWEENBPCLAIM (1) //DO NOT DELIVER!!!

   fourth change the foundation account to a test account

   in the fio.accounts.hpp file change the following line
    static const name FOUNDATIONACCOUNT = name("tw4tjkmo4eyd");
    to become
    static const name FOUNDATIONACCOUNT = name("htjonrkf1lgs");

    FIFTH set the faucet number of FIO issued to a small value to avoid exceeding supply while running this test.

    in fio.devtools modify the file 08_token_issue.sh
    modify the faucet FIO issuance to become the following
    #Faucet
./clio -u http://localhost:8879 push action -j fio.token issue '["qhh25sqpktwh","10000000.000000000 FIO","memo"]' -p eosio@active


Next rebuild your contracts, restart the chain on a local dev box,
Then this test may be run,
This test takes about 30 minutes to execute..

expected results....

after this test is run, it should be noted that the staking rewards reserves minted is 25M
and remains at this amount, and no new rewards are minted..

NOTE only run this test on a newly started chain.


 */

async function printCurrentGlobals() {
  const stakedTokenPool = await getStakedTokenPool();
  const combinedTokenPool = await getCombinedTokenPool();
  const rewardsTokenPool = await getRewardsTokenPool();
  const globalSrpCount = await getGlobalSrpCount();
  const dailyStakingRewards = await getDailyStakingRewards();
  const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();

  let bp1, result, count
  let userA1, locksdk, keys, accountnm, newFioDomain, newFioAddress, lockDuration

  console.log('\nCURRENT GLOBALS: ');
  console.log(`   stakedTokenPool: ${stakedTokenPool}`);
  console.log(`   combinedTokenPool: ${combinedTokenPool}`);
  console.log(`   rewardsTokenPool: ${rewardsTokenPool}`);
  console.log(`   globalSrpCount: ${globalSrpCount}`);
  console.log(`   dailyStakingRewards: ${dailyStakingRewards}`);
  console.log(`   stakingRewardsReservesMinted: ${stakingRewardsReservesMinted}`);
}

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



describe(`************************** stake-daily-ewards-dev-test.js ************************** \n`, () => {

  const genLock1Dur = 60, genLock1Amount = 5000000000000,  // 1 minute, 5000 FIO
      genLock2Dur = 120, genLock2Amount = 4000000000000,     // 2 minutes, 4000 FIO
      genLock3Dur = 1204800, genLock3Amount = 1000000000000  // 20080 minuteS, 1000 FIO

  const genLockTotal = genLock1Amount + genLock2Amount + genLock3Amount

  const fundsAmount = 1000000000000
  const stakeAmount = 1000000000000 // 1000 FIO
  const unstake1 = 100000000000     // 100 FIO
  const unstake2 = 2000000000       // 2 FIO
  const unstake3 = 2000000000       // 2 FIO

  it(`Create users`, async () => {
    userA1 = await newUser(faucet);

    keys = await createKeypair();
    accountnm = await getAccountFromKey(keys.publicKey);
    locksdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    //console.log("locksdk priv key ", keys.privateKey);
    //console.log("locksdk pub key ", keys.publicKey);
    //console.log("locksdk Account name ", accountnm);
  })

  it(`trnsloctoks with three periods to locksdk: 5000 FIO - 1 min, 4000 FIO - 2 min, and 1000 FIO - 20080 minutes`, async () => {
    const result = await faucet.genericAction('pushTransaction', {
      action: 'trnsloctoks',
      account: 'fio.token',
      data: {
        payee_public_key: keys.publicKey,
        can_vote: 0,
        periods: [
          {
            duration: genLock1Dur,
            amount: genLock1Amount,
          },
          {
            duration: genLock2Dur,
            amount: genLock2Amount,
          },
          {
            duration: genLock3Dur,
            amount: genLock3Amount,
          }
        ],
        amount: genLockTotal,
        max_fee: config.maxFee,
        tpid: '',
        actor: config.FAUCET_ACCOUNT,
      }
    })
    expect(result.status).to.equal('OK')
  })



  it(`do first set of 200 bpclaim`, async () => {
    count =1
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');

    let previousstakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
    let stakingRewardsReservesMinted1;

    for (let step = 0; step < 200; step++) {



      console.log('\nBPCLAIM number : ', count);
      console.log('\n state before BP claim : ');
      await printCurrentGlobals();

      const tdailyStakingRewards = await getDailyStakingRewards();

      try{
      const result = await bp1.sdk.genericAction('pushTransaction', {
        action: 'bpclaim',
        account: 'fio.treasury',
        data: {
          fio_address: bp1.address,
          actor: bp1.account
        }
      })
        if (count != 0) {
          expect(result.status).to.equal('OK')
        }
        console.log('\nBPCLAIM Result: ', result);
    } catch (err) {
      console.log('Error doing BPCLAIM ', err)
    }

      count++

      const stakingRewardsReservesMinted1 = await getStakingRewardsReservesMinted();

      console.log('\ntdailystakingrewards : ', tdailyStakingRewards);
      expect((stakingRewardsReservesMinted1 + tdailyStakingRewards) - previousstakingRewardsReservesMinted).to.equal(25000000000000)

      previousstakingRewardsReservesMinted = stakingRewardsReservesMinted1
      console.log('\n state after BP claim : ');
      await printCurrentGlobals();
      wait(2000)
    }
  })
  it(`do second set of 200 bpclaim`, async () => {
    count =1
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');

    let previousstakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
    let stakingRewardsReservesMinted1;

    for (let step = 0; step < 200; step++) {



      console.log('\nBPCLAIM number : ', count);
      console.log('\n state before BP claim : ');
      await printCurrentGlobals();

      const tdailyStakingRewards = await getDailyStakingRewards();

      try{
        const result = await bp1.sdk.genericAction('pushTransaction', {
          action: 'bpclaim',
          account: 'fio.treasury',
          data: {
            fio_address: bp1.address,
            actor: bp1.account
          }
        })
        if (count != 0) {
          expect(result.status).to.equal('OK')
        }
        console.log('\nBPCLAIM Result: ', result);
      } catch (err) {
        console.log('Error doing BPCLAIM', err)
      }

      count++

      const stakingRewardsReservesMinted1 = await getStakingRewardsReservesMinted();

      console.log('\ntdailystakingrewards : ', tdailyStakingRewards);
      expect((stakingRewardsReservesMinted1 + tdailyStakingRewards) - previousstakingRewardsReservesMinted).to.equal(25000000000000)

      previousstakingRewardsReservesMinted = stakingRewardsReservesMinted1
      console.log('\n state after BP claim : ');
      await printCurrentGlobals();
      wait(2000)
    }
  })
  it(`do third set of 200 bpclaim`, async () => {
    count =1
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');

    let previousstakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
    let stakingRewardsReservesMinted1;

    for (let step = 0; step < 200; step++) {



      console.log('\nBPCLAIM number : ', count);
      console.log('\n state before BP claim : ');
      await printCurrentGlobals();

      const tdailyStakingRewards = await getDailyStakingRewards();

      try{
        const result = await bp1.sdk.genericAction('pushTransaction', {
          action: 'bpclaim',
          account: 'fio.treasury',
          data: {
            fio_address: bp1.address,
            actor: bp1.account
          }
        })
        if (count != 0) {
          expect(result.status).to.equal('OK')
        }
        console.log('\nBPCLAIM Result: ', result);
      } catch (err) {
        console.log('Error doing BPCLAIM', err)
      }

      count++

      const stakingRewardsReservesMinted1 = await getStakingRewardsReservesMinted();

      console.log('\ntdailystakingrewards : ', tdailyStakingRewards);
      expect((stakingRewardsReservesMinted1 + tdailyStakingRewards) - previousstakingRewardsReservesMinted).to.equal(25000000000000)

      previousstakingRewardsReservesMinted = stakingRewardsReservesMinted1
      console.log('\n state after BP claim : ');
      await printCurrentGlobals();
      wait(2000)
    }
  })
  it(`do fourth set of 200 bpclaim`, async () => {
    count =1
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');

    let previousstakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
    let stakingRewardsReservesMinted1;

    for (let step = 0; step < 200; step++) {



      console.log('\nBPCLAIM number : ', count);
      console.log('\n state before BP claim : ');
      await printCurrentGlobals();

      const tdailyStakingRewards = await getDailyStakingRewards();

      try{
        const result = await bp1.sdk.genericAction('pushTransaction', {
          action: 'bpclaim',
          account: 'fio.treasury',
          data: {
            fio_address: bp1.address,
            actor: bp1.account
          }
        })
        if (count != 0) {
          expect(result.status).to.equal('OK')
        }
        console.log('\nBPCLAIM Result: ', result);
      } catch (err) {
        console.log('Error doing BPCLAIM', err)
      }

      count++

      const stakingRewardsReservesMinted1 = await getStakingRewardsReservesMinted();

      console.log('\ntdailystakingrewards : ', tdailyStakingRewards);
      expect((stakingRewardsReservesMinted1 + tdailyStakingRewards) - previousstakingRewardsReservesMinted).to.equal(25000000000000)

      previousstakingRewardsReservesMinted = stakingRewardsReservesMinted1
      console.log('\n state after BP claim : ');
      await printCurrentGlobals();
      wait(2000)
    }
  })
  it(`do fifth set of 200 bpclaim`, async () => {
    count =1
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');

    let previousstakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
    let stakingRewardsReservesMinted1;

    for (let step = 0; step < 200; step++) {



      console.log('\nBPCLAIM number : ', count);
      console.log('\n state before BP claim : ');
      await printCurrentGlobals();

      const tdailyStakingRewards = await getDailyStakingRewards();

      try{
        const result = await bp1.sdk.genericAction('pushTransaction', {
          action: 'bpclaim',
          account: 'fio.treasury',
          data: {
            fio_address: bp1.address,
            actor: bp1.account
          }
        })
        if (count != 0) {
          expect(result.status).to.equal('OK')
        }
        console.log('\nBPCLAIM Result: ', result);
      } catch (err) {
        console.log('Error doing BPCLAIM', err)
      }

      count++

      const stakingRewardsReservesMinted1 = await getStakingRewardsReservesMinted();

      console.log('\ntdailystakingrewards : ', tdailyStakingRewards);
      expect((stakingRewardsReservesMinted1 + tdailyStakingRewards) - previousstakingRewardsReservesMinted).to.equal(25000000000000)

      previousstakingRewardsReservesMinted = stakingRewardsReservesMinted1
      console.log('\n state after BP claim : ');
      await printCurrentGlobals();
      wait(2000)
    }
  })
  it(`do sixth set of 200 bpclaim`, async () => {
    count =1
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');

    let previousstakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
    let stakingRewardsReservesMinted1;

    for (let step = 0; step < 200; step++) {



      console.log('\nBPCLAIM number : ', count);
      console.log('\n state before BP claim : ');
      await printCurrentGlobals();

      const tdailyStakingRewards = await getDailyStakingRewards();

      try{
        const result = await bp1.sdk.genericAction('pushTransaction', {
          action: 'bpclaim',
          account: 'fio.treasury',
          data: {
            fio_address: bp1.address,
            actor: bp1.account
          }
        })
        if (count != 0) {
          expect(result.status).to.equal('OK')
        }
        console.log('\nBPCLAIM Result: ', result);
      } catch (err) {
        console.log('Error doing BPCLAIM', err)
      }

      count++

      const stakingRewardsReservesMinted1 = await getStakingRewardsReservesMinted();

      console.log('\ntdailystakingrewards : ', tdailyStakingRewards);
      expect((stakingRewardsReservesMinted1 + tdailyStakingRewards) - previousstakingRewardsReservesMinted).to.equal(25000000000000)

      previousstakingRewardsReservesMinted = stakingRewardsReservesMinted1
      console.log('\n state after BP claim : ');
      await printCurrentGlobals();
      wait(2000)
    }
  })
})
