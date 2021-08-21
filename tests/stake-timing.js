require('mocha')
const { expect } = require('chai')
const { create, all } = require('mathjs')
const {newUser, timeout, callFioApi, existingUser, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
const config = require('../config.js');
const Staker = require('./Helpers/staker.js');
const {getStakedTokenPool, getCombinedTokenPool, getRewardsTokenPool, getGlobalSrpCount, getDailyStakingRewards, getStakingRewardsReservesMinted, getStakingRewardsActivated } = require('./Helpers/token-pool.js');
let faucet, bp1

let prevStakedTokenPool, prevCombinedTokenPool, prevRewardsTokenPool, prevGlobalSrpCount, prevDailyStakingRewards, prevStakingRewardsReservesMinted, prevStakingRewardsActivated

function wait(ms){
  var start = new Date().getTime();
  var end = start;
  while(end < start + ms) {
    end = new Date().getTime();
  }
}

const mathconfig = {
  // Default type of number
  // Available options: 'number' (default), 'BigNumber', or 'Fraction'
  number: 'BigNumber',

  // Number of significant digits for BigNumbers
  precision: 20
}
const math = create(all, mathconfig)

/********************* setting up these tests
 *
 *
 * 1. In fio.staking.cpp
 *
 * 1.1 To update the activation date to be in the past, change:  (NOTE, this is already in the past in develop)
 *
 *    #define ENABLESTAKINGREWARDSEPOCHSEC  1627686000  //July 30 5:00PM MST 11:00PM GMT
 *
 *    to become a number that is in the past:
 *
 *    #define ENABLESTAKINGREWARDSEPOCHSEC  1627686000  //July 30 5:00PM MST 11:00PM GMT
 *
 * 1.2 To enable daily staking rewards, change:
 *
 *  int64_t UNSTAKELOCKDURATIONSECONDS = 604800;
 *
 *    to become
 *
 *  int64_t UNSTAKELOCKDURATIONSECONDS = 70;
 *
 * 1.3 Update both instances of SECONDSPERDAY in the unstakefio function to 10:
 *
 *   //the days since launch.
 *   uint32_t insertday = (lockiter->timestamp + insertperiod) / SECONDSPERDAY;
 *
 *     to become
 *
 *   //the days since launch.
 *   uint32_t insertday = (lockiter->timestamp + insertperiod) / 10;
 *
 * 
 *     and
 *
 * 
 *   daysforperiod = (lockiter->timestamp + lockiter->periods[i].duration)/SECONDSPERDAY;
 *
 *     to become
 *
 *   daysforperiod = (lockiter->timestamp + lockiter->periods[i].duration)/10;
 *
 * 
 *  2. To enable daily staking rewards, change the foundation account to be one of the accounts we use to test:
 *
 *    2.1 In fio.accounts.hpp
 *
 *      change the following line:
 *
 *      static const name FOUNDATIONACCOUNT = name("tw4tjkmo4eyd");
 *
 *      to become:
 *
 *     //must change foundation account for testing BPCLAIM...test change only!!
 *     static const name FOUNDATIONACCOUNT = name("htjonrkf1lgs");
 *
 *    2.2 In fio.treasury.cpp
 *
 *      change the following line:
 *
 *      #define PAYSCHEDTIME    86401                   //seconds per day + 1
 *
 *      to become:
 *
 *      //test only do not deliver!!!
 *      #define PAYSCHEDTIME    10
 * 
 * 
 *  3. Change the allowable BP claim time (usually 4 hours)
 * 
 *    In fio.common.hpp 
 *      
 *      change the following line:
 *  
 *      #define SECONDSBETWEENBPCLAIM (SECONDSPERHOUR * 4)
 * 
 *      to become
 * 
 *      #define SECONDSBETWEENBPCLAIM (5)
 * 
 * 
 *  3. Rebuild the contracts and restart your local chain.
 * 
 */

/********************* Calculations
 *
 * For getFioBalance:
 *   balance =
 *
 *   available = balance - staked - unstaked & locked
 *
 *   staked = Total staked. Changes when staking/unstaking.
 *
 *   srps =
 *     When Staking: srps = prevSrps + stakeAmount/roe
 *     When Unstaking: srps = prevSrps - (prevSrps * (unstakeAmount/totalStaked))
 *
 *   roe = Calculated (1 SRP = [ Tokens in Combined Token Pool / Global SRPs ] FIO)
 *       So, this is in FIO / SRP units (how many FIO you get for each SRP)
 *       You start with buying one SRP for 1 FIO, then as the rewards go up, you can sell an SRP for more than one FIO.
 *       So, ROE should always be greater than 1. 
 * 
 * Global variables:
 * 
 *   stakedTokenPool: Sum of all Account Tokens Staked
 *   combinedTokenPool: Staked Token Pool + Rewards Token Pool. (Fees go into this as collected. BP Claim should update this by the additional amount 25K - fees)
 *     unstaking: combinedTokenPool = prevcombinedTokenPool - unstakeAmount - 90% of payout from rewards token pool 
 *         // Note that 10% goes to the TPID if there is one, otherwise it just does not get allocated
 *   rewardsTokenPool: CUMULATIVE Fees + staking reward pool (never decrements)
 *   globalSrpCount:  
 *   dailyStakingRewards: Tracks rewards from the fees. At end of the day, if fees collected < 25,000, then the difference is minted.
 *   stakingRewardsReservesMinted:  Used for token pool accounting for rewards. Tracks total minted over time.
 *   stakingRewardsActivated:  binary flag indicating if ROE time and 1M stake threshold has been reached
 * 
 * Daily staking rewards:
 * 
 *    If Daily Staking Rewards is less than 25,000 FIO Tokens and Staking Rewards Reserves Minted is less than Staking Rewards Reserves Maximum:
 *      The difference between 25,000 FIO Tokens and Daily Staking Rewards (or difference between Staking Rewards Reserves Minted and Staking Rewards
 *      Reserves Maximum, whichever is smaller) is minted, transferred to treasury account and added to Staking Rewards Reserves Minted.
 */

async function setPrevGlobals(stakedTokenPool = 0, combinedTokenPool = 0, rewardsTokenPool = 0, globalSrpCount = 0, dailyStakingRewards = 0, stakingRewardsReservesMinted = 0, stakingRewardsActivated = 0) {
  prevStakedTokenPool = stakedTokenPool;
  prevCombinedTokenPool = combinedTokenPool;
  prevRewardsTokenPool = rewardsTokenPool;
  prevGlobalSrpCount = globalSrpCount;
  prevDailyStakingRewards = dailyStakingRewards;
  prevStakingRewardsReservesMinted = stakingRewardsReservesMinted;
  prevStakingRewardsActivated = stakingRewardsActivated;
}

async function printPrevGlobals() {
  console.log('\nPREVIOUS GLOBALS');
  console.log('   prevStakedTokenPool: ', prevStakedTokenPool);
  console.log('   prevCombinedTokenPool: ', prevCombinedTokenPool);
  console.log('   prevRewardsTokenPool: ', prevRewardsTokenPool);
  console.log('   prevGlobalSrpCount: ', prevGlobalSrpCount);
  console.log('   prevDailyStakingRewards: ', prevDailyStakingRewards);
  console.log('   prevStakingRewardsReservesMinted: ', prevStakingRewardsReservesMinted);
  console.log('   prevStakingRewardsActivated: ', prevStakingRewardsActivated);
}

async function printCurrentGlobals() {
  const stakedTokenPool = await getStakedTokenPool();
  const combinedTokenPool = await getCombinedTokenPool();
  const rewardsTokenPool = await getRewardsTokenPool();
  const globalSrpCount = await getGlobalSrpCount();
  const dailyStakingRewards = await getDailyStakingRewards();
  const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
  const stakingRewardsActivated = await getStakingRewardsActivated();

  console.log('\nCURRENT GLOBALS: ');
  console.log(`   stakedTokenPool: ${stakedTokenPool} (changed by ${(stakedTokenPool - prevStakedTokenPool) / 1000000000} FIO)`);
  console.log(`   combinedTokenPool: ${combinedTokenPool} (changed by ${(combinedTokenPool - prevCombinedTokenPool) / 1000000000} FIO)`);
  console.log(`   rewardsTokenPool: ${rewardsTokenPool} (changed by ${(rewardsTokenPool - prevRewardsTokenPool) / 1000000000} FIO)`);
  console.log(`   globalSrpCount: ${globalSrpCount} (changed by ${(globalSrpCount - prevGlobalSrpCount) / 1000000000} srps)`);
  console.log(`   dailyStakingRewards: ${dailyStakingRewards} (changed by ${(dailyStakingRewards - prevDailyStakingRewards) / 1000000000} FIO)`);
  console.log(`   stakingRewardsReservesMinted: ${stakingRewardsReservesMinted} (changed by ${(stakingRewardsReservesMinted - prevStakingRewardsReservesMinted) / 1000000000} FIO)`);
  console.log(`   stakingRewardsActivated: ${stakingRewardsActivated}`);
}

async function calcRoeString2(combinedTokenPool, globalSrpCount) {
  const stakingRewardsActivated = await getStakingRewardsActivated();
  let roe, roeString;

  roe = combinedTokenPool / globalSrpCount;
  roe *= 1000000000;
  roe = Math.round(roe) / 1000000000;
  roeString = roe.toString();
  roeStringLen = roeString.length;
  if (roeStringLen < 15) {
    for (let i = 0; i < 15 - roeStringLen; i++) {
      roeString += "0";
    }
  }
  if (stakingRewardsActivated == 0) {
    roeString = '1.000000000';
  }
  return roeString;
}

async function calcRoeString(prevRoeBig) {
  const stakingRewardsActivated = await getStakingRewardsActivated();
  let roeString;
  prevRoeBig = Math.round(prevRoeBig * 1000000000000000);  // 15 zeros
  prevRoeBig = prevRoeBig / 1000000000000000;
  roeString = prevRoeBig.toString();
  const roeStringLen = roeString.length;
  if (roeStringLen < 15) {
    for (let i = 0; i < 15 - roeStringLen; i++) {
      roeString += "0";
    }
  }
  if (stakingRewardsActivated == 0) {
    roeString = '1.00000000000000';
  }
  return roeString;
}

const UNSTAKELOCKDURATIONSECONDS = config.UNSTAKELOCKDURATIONSECONDS;
const STAKINGREWARDSPERCENT = 0.25;
const ACTIVATIONTHRESHOLD = 1000000000000000  // 1M FIO
const DAILYSTAKINGMINTTHRESHOLD = 25000000000000  // 25K FIO
const STAKINGREWARDSRESERVEMAXIMUM = 25000000000000000 // 25M FIO

// These need to add up to 10, otherwise the lock duration drifts over time
const WAIT1 = 1
const SECONDSPERDAY = config.SECONDSPERDAY - WAIT1;

let dailyRewards = {
  schedule: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
}

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
  bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
})

describe(`************************** stake-regression.js ************************** \n    A. Stake timing test.`, () => {

  let user1, transfer_tokens_pub_key_fee

  let stakers = [];

  const existingUser = {
    privateKey: '5KAMg5GxX1MGUhRQRnG331GWs1HReXxZrAFrqQ8HzeNVzN3iy2X',
    publicKey: 'FIO8HiRhFAgUTvSKdbSsf7tvRtGWqboaVkf6JhByMG8nE1eGgy7Br',
    account: 'znfhu52wuuxz',
    domain: 'odwcjxcnry',
    address: 'ykyfh@odwcjxcnry'
  }

  const totalDays = 15
  activationDay = 100; // 0 = Immediately activate
  const testTransferAmount = 10000000000  // 10 FIO

  it('Create staking users', async () => {
    try {

      stakers[0] = new Staker();
      stakers[0].transferAmount = 9004000000000000  // 9,004,000 FIO
      stakers[0].stakeAmount = [1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000]
      stakers[0].unstakeAmount = [0, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000]
      await stakers[0].createSdk(faucet);
      //await stakers[0].createSdk(faucet, existingUser.privateKey, existingUser.publicKey, existingUser.account, existingUser.domain, existingUser.address);

      //stakers[0] = new Staker();
      //stakers[0].transferAmount = 1004000000000000  // 1,004,000 FIO
      //stakers[0].stakeAmount = [2000000000000, 0, 1000000000000000, 0, 1000000000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      //stakers[0].unstakeAmount = [0, 10000000000, 0, 0, 10000000000, 0, 310000000000, 0, 0, 0, 0, 0, 0, 0, 0]
      //await stakers[0].createSdk(faucet);
      //await stakers[0].createSdk(faucet, existingUser.privateKey, existingUser.publicKey, existingUser.account, existingUser.domain, existingUser.address);

      //stakers[1] = new Staker();
      //stakers[1].transferAmount = 2000000000000  // 2000 FIO
      //stakers[1].stakeAmount = [300000000000, 500000000000, 0, 0, 0, 0, 10000000000, 0, 0, 200000000000, 0, 0, 0, 0, 0]
      //stakers[1].unstakeAmount = [0, 0, 0, 0, 0, 0, 0, 0, 90000000000, 20000000000, 0, 0, 0, 0, 0]
      //await stakers[1].createSdk(faucet);

      //stakers[2] = new Staker();
      //stakers[2].transferAmount = 2000000000000000  // 2M FIO
      //stakers[2].stakeAmount = [2000000000000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      //stakers[2].unstakeAmount = [0, 1000000000000000, 20000000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      //await stakers[2].createSdk(faucet);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    };
    
  })

  it('Create test user', async () => {
    user1 = await newUser(faucet);
  })

  it('Get /transfer_tokens_pub_key fee', async () => {
    try {
      result = await user1.sdk.getFee('transfer_tokens_pub_key');
      transfer_tokens_pub_key_fee = result.fee;
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    };
  });

  it.skip(`Create staker SDK object and register domain/address.`, async () => {
    await staker.createSdk(faucet);
  })

  it.skip(`Transfer initial amount into staker accounts`, async () => {
    try {
      for (let i = 0; i < stakers.length; i++) {
        console.log('           ...for staker ', i);
        const result = await faucet.genericAction('transferTokens', {
          payeeFioPublicKey: stakers[i].publicKey,
          amount: stakers[i].transferAmount,
          maxFee: config.api.maxFee,
          technologyProviderId: ''
        });
        expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected');
      };
    } catch (err) {
      console.log("Error : ", err);
      expect(err).to.equal(null);
    };
  })

  it(`Transfer initial amount into staker accounts`, async () => {
    for (let i = 0; i < stakers.length; i++) {
      console.log('           ...for staker ', i);
      try {
        const result = await faucet.genericAction('pushTransaction', {
          action: 'trnsfiopubky',
          account: 'fio.token',
          data: {
            payee_public_key: stakers[i].publicKey,
            amount: stakers[i].transferAmount,
            max_fee: config.maxFee,
            tpid: '',
            actor: faucet.account
          }
        });
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK');
      } catch (err) {
        console.log("Error : ", err.json);
        expect(err).to.equal(null);
      }
    };
  })

  it(`Staker votes for BP so they can stake.`, async () => {
    for (let i = 0; i < stakers.length; i++) {
      console.log('           ...for staker ', i);
      try {
        const result = await stakers[i].sdk.genericAction('pushTransaction', {
          action: 'voteproducer',
          account: 'eosio',
          data: {
            producers: ["bp1@dapixdev"],
            fio_address: stakers[i].address,
            actor: stakers[i].account,
            max_fee: config.maxFee
          }
        });
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK');
      } catch (err) {
        console.log("Error : ", err.json);
        expect(err).to.equal(null);
      }
    };
  })

  it(`Set initial prev balances`, async () => {
    for (let i = 0; i < stakers.length; i++) {
      console.log('           ...for staker ', i);
      try {
        const result = await stakers[i].getUserBalance();

        await stakers[i].setPrevBalances(result.balance, result.available, result.staked, result.srps, result.roe, 0);
        //await stakers[i].printPrevBalances();
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    };
  })

  it(`Set initial previous lock periods (to be empty or zero)`, async () => {
    for (let i = 0; i < stakers.length; i++) {
      console.log('           ...for staker ', i);
      try {
        await stakers[i].setPrevLockPeriods();
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    };
  });

  // This updates the stakingRewardsReserveMinted and sets daily staking reserves
  it(`Call bpclaim to set initial rewards amount`, async () => {
    try {
      const result = await bp1.sdk.genericAction('pushTransaction', {
        action: 'bpclaim',
        account: 'fio.treasury',
        data: {
          fio_address: bp1.address,
          actor: bp1.account
        }
      })
      //console.log('BPCLAIM Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Set global variable values`, async () => {
    try {
      const stakedTokenPool = await getStakedTokenPool();
      const combinedTokenPool = await getCombinedTokenPool();
      const rewardsTokenPool = await getRewardsTokenPool();
      const globalSrpCount = await getGlobalSrpCount();
      const dailyStakingRewards = await getDailyStakingRewards();
      const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
      const stakingRewardsActivated = await getStakingRewardsActivated();

      await setPrevGlobals(stakedTokenPool, combinedTokenPool, rewardsTokenPool, globalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);
      //await printCurrentGlobals();
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`Wait a few seconds.`, async () => { await timeout(2000) })


  
  describe(`Daily loop`, () => {

    for (let dayNumber = 0; dayNumber < totalDays; dayNumber++) {

      it(`New day`, async () => {
        console.log("\n>>>>>>>>>> DAY #" +  dayNumber + " <<<<<<<<<<")
      })

      it(`If stake or unstake array has an empty value, set it to 0`, async () => {
        for (let i = 0; i < stakers.length; i++) {
          console.log('           ...for staker ', i);
          try {
            if (!stakers[i].stakeAmount[dayNumber]) { stakers[i].stakeAmount[dayNumber] = 0; };
            if (!stakers[i].unstakeAmount[dayNumber]) { stakers[i].unstakeAmount[dayNumber] = 0; };
          } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
          }
        };
      })

      it.skip(`If we are beyond target activate day, and if not activated, have user1 vote then stake ${ACTIVATIONTHRESHOLD / 1000000000} tokens to activate`, async () => {
        const stakingRewardsActivated = await getStakingRewardsActivated();
        if (dayNumber == activationDay && stakingRewardsActivated == 0) {
          try {
            const resultXfer = await faucet.genericAction('transferTokens', {
              payeeFioPublicKey: user1.publicKey,
              amount: ACTIVATIONTHRESHOLD,
              maxFee: config.maxFee,
              technologyProviderId: ''
            });
            expect(resultXfer.status).to.equal('OK')

            const resultVote = await user1.sdk.genericAction('pushTransaction', {
              action: 'voteproducer',
              account: 'eosio',
              data: {
                producers: ["bp1@dapixdev"],
                fio_address: user1.address,
                actor: user1.account,
                max_fee: config.maxFee
              }
            })
            expect(resultVote.status).to.equal('OK')

            const resultStake = await user1.sdk.genericAction('pushTransaction', {
              action: 'stakefio',
              account: 'fio.staking',
              data: {
                fio_address: user1.address,
                amount: ACTIVATIONTHRESHOLD,
                actor: user1.account,
                max_fee: config.maxFee,
                tpid: ''
              }
            })
            expect(resultStake.status).to.equal('OK')

            const stakedTokenPool = await getStakedTokenPool();
            const combinedTokenPool = await getCombinedTokenPool();
            const rewardsTokenPool = await getRewardsTokenPool();
            const globalSrpCount = await getGlobalSrpCount();
            const dailyStakingRewards = await getDailyStakingRewards();
            const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
            const stakingRewardsActivated = await getStakingRewardsActivated();

            //await printCurrentGlobals();

            // TODO: check that activation sets these variables as expected.
            
            await setPrevGlobals(stakedTokenPool, combinedTokenPool, rewardsTokenPool, globalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);


          } catch (err) {
            console.log('Error', err.json);
            expect(err).to.equal(null);
          };
        };
      });

      it(`transfer ${testTransferAmount} tokens from faucet to user1 to see if globals change...`, async () => {
        const result = await faucet.genericAction('transferTokens', {
          payeeFioPublicKey: user1.publicKey,
          amount: testTransferAmount,
          maxFee: config.maxFee,
          technologyProviderId: ''
        })
        //console.log('result: ', result)
      })

      it(`Check that global staking variables are correct after transfer`, async () => {
        try {
          const stakedTokenPool = await getStakedTokenPool();
          const combinedTokenPool = await getCombinedTokenPool();
          const rewardsTokenPool = await getRewardsTokenPool();
          const globalSrpCount = await getGlobalSrpCount();
          const dailyStakingRewards = await getDailyStakingRewards();
          const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
          const stakingRewardsActivated = await getStakingRewardsActivated();

          // FOR DEBUGGING
          //await printCurrentGlobals();

          expect(stakedTokenPool).to.equal(prevStakedTokenPool);
          expect(combinedTokenPool).to.equal(prevCombinedTokenPool + STAKINGREWARDSPERCENT * transfer_tokens_pub_key_fee);
          expect(rewardsTokenPool).to.equal(prevRewardsTokenPool + STAKINGREWARDSPERCENT * transfer_tokens_pub_key_fee);
          expect(globalSrpCount).to.equal(prevGlobalSrpCount);
          expect(dailyStakingRewards).to.equal(prevDailyStakingRewards + STAKINGREWARDSPERCENT * transfer_tokens_pub_key_fee);
          expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted);
          expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated);

          await setPrevGlobals(stakedTokenPool, combinedTokenPool, rewardsTokenPool, globalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      });

      //
      // For each user:
      //   For each unlocking event: check locks, check balance
      //   For each staking event: stake, check balance, update globals
      //   For each unstaking event: unstake, check balance, check locks, update globals
      // 
      // Then do a final check of globals at the end of the day.
      //
      
      it(`Check if any unlock occurred today `, async () => {
        for (let i = 0; i < stakers.length; i++) {
          let currentSecs = new Date().getTime() / 1000

          try {

            const json = {
              json: true,
              code: 'eosio',
              scope: 'eosio',
              table: 'locktokensv2',
              lower_bound: stakers[i].account,
              upper_bound: stakers[i].account,
              key_type: 'i64',
              index_position: '2'
            }
            const result = await callFioApi("get_table_rows", json);
            console.log('Result: ', result);

            if (result.rows.length > 0) { // If the table is not empty
              const lockinfo = result.rows[0];
              console.log('Result get_table_rows locktokensv2: ', result);
              console.log('periods : ', result.rows[0].periods);

              let expectedAvailable = stakers[i].prevAvailable;
              let unlockAmount = 0;
              for (period in lockinfo.periods) {
                // If an unlock has occurred update expected Available balance and capture the unlockAmount
                unlockSecs = lockinfo.timestamp + lockinfo.periods[period].duration;
                if ((currentSecs >= unlockSecs) && (currentSecs < unlockSecs + SECONDSPERDAY)) {  // Need the && so you do not double count if the lock is not removed next round. Just remove locks for this day.
                  expectedAvailable += lockinfo.periods[period].amount
                  unlockAmount += lockinfo.periods[period].amount
                }
              }

              console.log('           ...staker ' + i + ' unlocks ' + unlockAmount);

              // FOR DEBUGGING
              if (unlockAmount > 0) {
                await stakers[i].printPrevBalances();
                await stakers[i].printCurrentBalances();
              }

              const getBalance = await stakers[i].getUserBalance();
              expect(getBalance.balance).to.equal(stakers[i].prevBalance)
              expect(getBalance.available).to.equal(stakers[i].prevAvailable + unlockAmount)
              expect(getBalance.staked).to.equal(stakers[i].prevStaked)
              expect(getBalance.srps).to.equal(stakers[i].prevSrps)
            }

          } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
          }
        };
      })

      it(`Update prev balances to current balances`, async () => {
        for (let i = 0; i < stakers.length; i++) {
          console.log('           ...for staker ' + i);
          const getBalance = await stakers[i].getUserBalance();

          const combinedTokenPool = await getCombinedTokenPool();
          const globalSrpCount = await getGlobalSrpCount();
          const stakingRewardsActivated = await getStakingRewardsActivated();
          let currentRoe = combinedTokenPool / globalSrpCount;
          if (stakingRewardsActivated == 0) {
            currentRoe = '1.000000000';
          }
          await stakers[i].setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe, currentRoe);
         await stakers[i].printPrevBalances();
        }
      });

      it(`Update prev globals to current globals`, async () => {
        const stakedTokenPool = await getStakedTokenPool();
        const combinedTokenPool = await getCombinedTokenPool();
        const rewardsTokenPool = await getRewardsTokenPool();
        const globalSrpCount = await getGlobalSrpCount();
        const dailyStakingRewards = await getDailyStakingRewards();
        const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
        const stakingRewardsActivated = await getStakingRewardsActivated();

        await setPrevGlobals(stakedTokenPool, combinedTokenPool, rewardsTokenPool, globalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);
        await printPrevGlobals();
      });

      it(`Do staking.`, async () => {
        for (let i = 0; i < stakers.length; i++) {
          console.log('           ...staker ' + i + ' stakes ', stakers[i].stakeAmount[dayNumber]);
          if (stakers[i].stakeAmount[dayNumber] != 0) {
            try {
              const result = await stakers[i].sdk.genericAction('pushTransaction', {
                action: 'stakefio',
                account: 'fio.staking',
                data: {
                  fio_address: stakers[i].address,
                  amount: stakers[i].stakeAmount[dayNumber],
                  actor: stakers[i].account,
                  max_fee: config.maxFee,
                  tpid: ''
                }
              })
              expect(result.status).to.equal('OK')

              const stakedTokenPool = await getStakedTokenPool();
              const combinedTokenPool = await getCombinedTokenPool();
              const rewardsTokenPool = await getRewardsTokenPool();
              const globalSrpCount = await getGlobalSrpCount();
              const dailyStakingRewards = await getDailyStakingRewards();
              const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
              const stakingRewardsActivated = await getStakingRewardsActivated();

              // FOR DEBUGGING
              await printPrevGlobals();
              await stakers[i].printPrevBalances();
              await printCurrentGlobals();
              await stakers[i].printCurrentBalances();

              console.log('           ...Check that getFioBalance is correct after staking ');

              const getBalance = await stakers[i].getUserBalance();

              // We are using the ROE prior to staking to calculate all of the changes

              // The contract uses long doubles for Combined Token Pool and
              console.log('prevCombinedTokenPool: ', prevCombinedTokenPool)
              console.log('prevGlobalSrpCount: ', prevGlobalSrpCount)

              let prevRoeBig = math.divide(math.bignumber(prevCombinedTokenPool), math.bignumber(prevGlobalSrpCount));
              console.log('prevRoeBig: ', prevRoeBig)

              // We need to be looking at the state prior to staking
              if (prevStakingRewardsActivated == 0) {
                prevRoeBig = '1.000000000';
              }
              
              const srpsToAward = math.divide(math.bignumber(stakers[i].stakeAmount[dayNumber]), prevRoeBig);
              console.log('srpsToAward: ', srpsToAward);

              const srpsToAwardTrunc = Math.trunc(parseFloat(srpsToAward));  // Contract now does an explicit truncate
              console.log('srpsToAwardTrunc: ', srpsToAwardTrunc);

              const newSrps = parseInt(math.add(math.bignumber(stakers[i].prevSrps), math.bignumber(srpsToAwardTrunc)));
              console.log('newSrps: ', newSrps);

              expect(getBalance.balance).to.equal(stakers[i].prevBalance);
              expect(getBalance.available).to.equal(stakers[i].prevAvailable - stakers[i].stakeAmount[dayNumber]);
              expect(getBalance.staked).to.equal(stakers[i].prevStaked + stakers[i].stakeAmount[dayNumber]);
              //expect(getBalance.srps).to.equal(newSrps);

              //const currentRoeString = await calcRoeString(combinedTokenPool, globalSrpCount);
              const currentRoeString = await calcRoeString(prevRoeBig);
              //expect(getBalance.roe).to.equal(currentRoeString);
              
              console.log('           ...check that global staking variables are correct after staking ');

              newSrpGlobal = math.add(prevGlobalSrpCount, srpsToAwardTrunc);
              console.log('newSrpGlobal: ', newSrpGlobal);

              expect(stakedTokenPool).to.equal(prevStakedTokenPool + stakers[i].stakeAmount[dayNumber]);
              expect(combinedTokenPool).to.equal(prevCombinedTokenPool + stakers[i].stakeAmount[dayNumber]);
              expect(rewardsTokenPool).to.equal(prevRewardsTokenPool);
              //expect(globalSrpCount).to.equal(newSrpGlobal);  // used to be rounded
              expect(dailyStakingRewards).to.equal(prevDailyStakingRewards);
              expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted);
              if ((prevStakedTokenPool + stakers[i].stakeAmount[dayNumber]) > ACTIVATIONTHRESHOLD) {
                expect(stakingRewardsActivated).to.equal(1);
              } else {
                expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated);
              }

              // Need to set prev balances and globals for each user in the loop
              await stakers[i].setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe, prevRoeBig);
              await setPrevGlobals(stakedTokenPool, combinedTokenPool, rewardsTokenPool, globalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);

             } catch (err) {
              console.log('Do staking Error: ', err);
              expect(err).to.equal(null);
            }
          };  // if
        };  // for
      });

      it(`Wait a few seconds.`, async () => { await timeout(WAIT1 * 1005) })

      it(`Do unstaking.`, async () => {
        for (let i = 0; i < stakers.length; i++) {
          console.log('           ...staker ' + i + ' unstakes ', stakers[i].unstakeAmount[dayNumber]);

          if (stakers[i].unstakeAmount[dayNumber] != 0) {
            try { 
              const result = await stakers[i].sdk.genericAction('pushTransaction', {
                action: 'unstakefio',
                account: 'fio.staking',
                data: {
                  fio_address: stakers[i].address,
                  amount: stakers[i].unstakeAmount[dayNumber],
                  actor: stakers[i].account,
                  max_fee: config.maxFee,
                  tpid: ''
                }
              }); 
              //console.log('Result: ', result)
              expect(result.status).to.equal('OK')

              // Get the current (post stake) global variables
              
              const stakedTokenPool = await getStakedTokenPool();
              const combinedTokenPool = await getCombinedTokenPool();
              const rewardsTokenPool = await getRewardsTokenPool();
              const globalSrpCount = await getGlobalSrpCount();
              const dailyStakingRewards = await getDailyStakingRewards();
              const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
              const stakingRewardsActivated = await getStakingRewardsActivated();

              // FOR DEBUGGING
              await printPrevGlobals();
              await stakers[i].printPrevBalances();
              await printCurrentGlobals();
              await stakers[i].printCurrentBalances();
              
              console.log('           ...Check that getFioBalance is correct after unstake ');           

              const getBalance = await stakers[i].getUserBalance();
              //console.log("getBalance result: ", getBalance)

              let prevRoeBig = math.divide(math.bignumber(prevCombinedTokenPool), math.bignumber(prevGlobalSrpCount));
              console.log('prevRoeBig: ', prevRoeBig)

              if (stakingRewardsActivated == 0) {
                prevRoeBig = '1.000000000';
              }

              const srpsPercentToClaim = math.divide(math.bignumber(stakers[i].unstakeAmount[dayNumber]), math.bignumber(stakers[i].prevStaked));
              const srpsToClaim = Math.trunc(srpsPercentToClaim * stakers[i].prevSrps);
              console.log('srpsToClaim  trunc: ', srpsToClaim)

              const fioClaimed = math.multiply(srpsToClaim, prevRoeBig);
              console.log('fioClaimed: ', fioClaimed);

              // Contract now does an explicit truncate
              const fioClaimedTrunc = Math.trunc(parseFloat(fioClaimed));
              console.log('fioClaimedTrunc: ', fioClaimedTrunc);

              // Reward amount is the FIO paid out minus the unstakeAmount
              const rewardAmountTotal = fioClaimedTrunc - stakers[i].unstakeAmount[dayNumber]
              console.log('rewardAmountTotal: ', rewardAmountTotal);
              const rewardAmountTpid = Math.trunc(rewardAmountTotal  / 10);
              console.log('rewardAmountTpid: ', rewardAmountTpid);
              const rewardAmountStaker = 9 * rewardAmountTpid;
              console.log('rewardAmountStaker: ', rewardAmountStaker);

              stakers[i].prevRewardAmountStaker = rewardAmountStaker;

              // balance should increase by the 90% of reward amount based on the prevRoe (the roe prior to the unstaking)
              //expect(getBalance.balance).to.equal(stakers[i].prevBalance + rewardAmountStaker);
              expect(getBalance.available).to.equal(stakers[i].prevAvailable);
              expect(getBalance.staked).to.equal(stakers[i].prevStaked - stakers[i].unstakeAmount[dayNumber]);
              expect(getBalance.srps).to.equal(stakers[i].prevSrps - srpsToClaim);
              //expect(getBalance.srps).is.greaterThan(stakers[i].prevSrps - srpPayout - 6).and.lessThan(stakers[i].prevSrps - srpPayout + 6);

              const currentRoeString = await calcRoeString(prevRoeBig);
              //expect(getBalance.roe).to.equal(currentRoeString);

              console.log('           ...Check that global staking variables are correct after unstaking ');

              expect(stakedTokenPool).to.equal(prevStakedTokenPool - stakers[i].unstakeAmount[dayNumber]);
              // combinedTokenPool unstaking calculation: combinedTokenPool = prevcombinedTokenPool - unstakeAmount - payout from rewards token pool
              //expect(combinedTokenPool).to.equal(prevCombinedTokenPool - stakers[i].unstakeAmount[dayNumber] - rewardAmountStaker);
              expect(rewardsTokenPool).to.equal(prevRewardsTokenPool);  // This is cumulative. It never decrements
              //expect(globalSrpCount).to.equal(Math.trunc(prevGlobalSrpCount - srpsToClaim));
              expect(dailyStakingRewards).to.equal(prevDailyStakingRewards);
              expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted);
              expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated);

              // Need to set prev balances and globals for each user in the loop
              await stakers[i].setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe, getBalance.roe);
              await setPrevGlobals(stakedTokenPool, combinedTokenPool, rewardsTokenPool, globalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);

           } catch (err) {
              console.log('Do unstaking Error: ', err);
              expect(err).to.equal(null);
            }
          }; // if
        }; // for
      }); // it

      it(`Check that locktokensv2 locks are correct after unstake`, async () => {
        for (let i = 0; i < stakers.length; i++) {
          console.log('           ...for staker ', i);
          // Only run this if there was an unstake. 
          if (stakers[i].unstakeAmount[dayNumber] != 0) {
            try {
              const json = {
                json: true,
                code: 'eosio',
                scope: 'eosio',
                table: 'locktokensv2',
                lower_bound: stakers[i].account,
                upper_bound: stakers[i].account,
                key_type: 'i64',
                index_position: '2'
              }
              const result = await callFioApi("get_table_rows", json);
              const lockinfo = result.rows[0];
              //console.log('Result: ', result);
              //console.log('periods : ', result.rows[0].periods);
            

              // Only check locks if this account has an entry in locktokensv2
              if (stakers[i].prevOwnerAccount != '') {

                // These items should not change. 
                expect(lockinfo.owner_account).to.equal(stakers[i].prevOwnerAccount);
                expect(lockinfo.payouts_performed).to.equal(0);

                //
                // Compare the current number of periods to prev number of periods.
                // Case 1: currentNumberOfPeriods == stakers[i].prevNumberOfPeriods
                //  - We know only one unstake period was added, so this means one expired lock period was removed and one period was added.
                // Case 2: currentNumberOfPeriods > stakers[i].prevNumberOfPeriods
                //  - This means a single unstake period was added and none were removed
                // Case 3: currentNumberOfPeriods < stakers[i].prevNumberOfPeriods
                //  - This means 2 or more expired lock periods were removed, and one unstake period was added
                //

                const currentNumberOfPeriods = lockinfo.periods.length;

                if (currentNumberOfPeriods == stakers[i].prevNumberOfPeriods) {
                  //console.log('USE CASE 1')
                  // Add the new unstake amount and subtract the period=0 lock amount
                  for (period in lockinfo.periods) {
                    if (period == (currentNumberOfPeriods - 1)) {  // It is the final, just added, unstake lock period
                      expect(lockinfo.periods[period].amount).to.equal(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker);
                      durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY);
                      //expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 6).and.lessThan(durEstimate + 6);
                    } else {  // It is a previous lock that has a new period - 1
                      //console.log('typeof: ', typeof period);
                      newPeriod = parseInt(period) + 1;  // Hmmm, period is a string...
                      expect(lockinfo.periods[period].amount).to.equal(stakers[i].prevPeriods[newPeriod].amount);
                      expect(lockinfo.periods[period].duration).to.equal(stakers[i].prevPeriods[newPeriod].duration);
                    }
                  }
                  expect(lockinfo.lock_amount).to.equal(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - stakers[i].prevPeriods[0].amount);
                  expect(lockinfo.remaining_lock_amount).to.equal(stakers[i].prevRemainingLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - stakers[i].prevPeriods[0].amount);
                } else if (currentNumberOfPeriods > stakers[i].prevNumberOfPeriods) {
                  //console.log('USE CASE 2')
                  for (period in lockinfo.periods) {
                    if (period == (currentNumberOfPeriods - 1)) {  // It is the final, just added, unstake lock period
                      expect(lockinfo.periods[period].amount).to.equal(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker);
                      durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY);
                      //expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 6).and.lessThan(durEstimate + 6);
                    } else {  // It is a previous lock that has not changed
                      expect(lockinfo.periods[period].amount).to.equal(stakers[i].prevPeriods[period].amount);
                      expect(lockinfo.periods[period].duration).to.equal(stakers[i].prevPeriods[period].duration);
                    }
                  }
                  expect(lockinfo.lock_amount).to.equal(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker);
                  expect(lockinfo.remaining_lock_amount).to.equal(stakers[i].prevRemainingLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker);
                } else { // currentNumberOfPeriods < stakers[i].prevNumberOfPeriods
                  //console.log('USE CASE 3')
                  numberOfRemovedPeriods = stakers[i].prevNumberOfPeriods - currentNumberOfPeriods + 1
                  // Add up all the removed amounts
                  let totalAmount = 0;
                  for (let i = 0; i < numberOfRemovedPeriods; i++) {
                    totalAmount += stakers[i].prevPeriods[period].amount;
                  }
                  expect(lockinfo.lock_amount).to.equal(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - totalAmount);
                  expect(lockinfo.remaining_lock_amount).to.equal(stakers[i].prevRemainingLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - totalAmount);
                  for (period in lockinfo.periods) {
                    if (period == currentNumberOfPeriods - 1) { // It is the final, just added, unstake lock period
                      expect(lockinfo.periods[period].amount).to.equal(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker);
                      durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY);
                      //expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 6).and.lessThan(durEstimate + 6);
                    } else {  // It is a previous lock that has a new (period - numberOfRemovedPeriods)
                      //console.log('typeof: ', typeof period);
                      newPeriod = parseInt(period) + numberOfRemovedPeriods;  // Hmmm, period is a string...
                      expect(lockinfo.periods[period].amount).to.equal(stakers[i].prevPeriods[newPeriod].amount);
                      expect(lockinfo.periods[period].duration).to.equal(stakers[i].prevPeriods[newPeriod].duration);
                    }
                  }
                };
              }

              await stakers[i].setPrevLockPeriods(lockinfo.owner_account, lockinfo.lock_amount, lockinfo.payouts_performed, lockinfo.can_vote, lockinfo.periods, lockinfo.remaining_lock_amount, lockinfo.timestamp, lockinfo.periods.length);

            } catch (err) {
              console.log('Check that locktokensv2 Error', err);
              expect(err).to.equal(null);
            }
          }
        };
      })

      it(`Call bpclaim as bp1 to process 25K daily staking rewards`, async () => {
        if (dailyRewards.schedule[dayNumber] == 1) {
          try {
            const result = await bp1.sdk.genericAction('pushTransaction', {
              action: 'bpclaim',
              account: 'fio.treasury',
              data: {
                fio_address: bp1.address,
                actor: bp1.account
              }
            })
            //console.log('BPCLAIM Result: ', result)
            
            if (dayNumber != 0) {
              expect(result.status).to.equal('OK')
            }

            console.log('           ...Check that global staking variables are correct after daily staking rewards ');

            // FOR DEBUGGING
            await printCurrentGlobals();

            // Only the difference between DAILYSTAKINGMINTTHRESHOLD and prevDailyStakingRewards (from fees) is added since
            //   the fee rewards are added as they are received.
            let mintedAmount;

            if (prevDailyStakingRewards < DAILYSTAKINGMINTTHRESHOLD) {
              mintedAmount = DAILYSTAKINGMINTTHRESHOLD - prevDailyStakingRewards; 
            } else {
              rewardsAmount = prevDailyStakingRewards;
              mintedAmount = 0;  // No additional rewards minted
            }

            // Check to see if we have hit STAKINGREWARDSRESERVEMAXIMUM, If so, just mint the amount that remains in the rewards pool.
            if ((prevStakingRewardsReservesMinted + mintedAmount) >= STAKINGREWARDSRESERVEMAXIMUM) {
              mintedAmount = STAKINGREWARDSRESERVEMAXIMUM - prevStakingRewardsReservesMinted - prevDailyStakingRewards;
            }

            // If we do a claim on the first day, it will be zero because we did an initial claim above
            if (dayNumber == 0) {
              mintedAmount = 0;
            }

            const stakedTokenPool = await getStakedTokenPool();
            const combinedTokenPool = await getCombinedTokenPool();
            const rewardsTokenPool = await getRewardsTokenPool();
            const globalSrpCount = await getGlobalSrpCount();
            const dailyStakingRewards = await getDailyStakingRewards();
            const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
            const stakingRewardsActivated = await getStakingRewardsActivated();

            if (stakingRewardsReservesMinted < STAKINGREWARDSRESERVEMAXIMUM) {
              expect(stakedTokenPool).to.equal(prevStakedTokenPool);
              expect(combinedTokenPool).to.equal(prevCombinedTokenPool + mintedAmount);
              expect(rewardsTokenPool).to.equal(prevRewardsTokenPool);
              expect(globalSrpCount).to.equal(prevGlobalSrpCount);
              expect(dailyStakingRewards).to.equal(0);  // This gets reset when doing a bpclaim because the new tokens are minted
              expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted + mintedAmount);
              expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated);
            } else {  // STAKINGREWARDSRESERVEMAXIMUM has been hit
              expect(stakedTokenPool).to.equal(prevStakedTokenPool);
              expect(combinedTokenPool).to.equal(prevCombinedTokenPool);
              expect(rewardsTokenPool).to.equal(prevRewardsTokenPool);
              expect(globalSrpCount).to.equal(prevGlobalSrpCount);
              expect(dailyStakingRewards).to.equal(0);
              expect(stakingRewardsReservesMinted).to.equal(STAKINGREWARDSRESERVEMAXIMUM);
              expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated);
            }
          } catch (err) {
            if (dayNumber == 0) {
              expect(err.json.fields[0].error).to.equal('FIO Address not producer or nothing payable')
            } else {
              console.log('bpclaim Error', err);
              expect(err).to.equal(null);
            }
          }
        }; // if
      });

      it(`Update prev balances to current balances`, async () => {
        try {
          for (let i = 0; i < stakers.length; i++) {
            console.log('           ...staker ' + i + ' update prev balance');
            const getBalance = await stakers[i].getUserBalance();

            const combinedTokenPool = await getCombinedTokenPool();
            const globalSrpCount = await getGlobalSrpCount();
            const stakingRewardsActivated = await getStakingRewardsActivated();
            let currentRoe = combinedTokenPool / globalSrpCount;
            if (stakingRewardsActivated == 0) {
              currentRoe = '1.000000000';
            }

            await stakers[i].setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe, currentRoe);
            //await stakers[i].printPrevBalances();
          };
        } catch (err) {
          console.log('Error', err);
        };
      });

      it(`Update prev globals to current globals`, async () => {
        const stakedTokenPool = await getStakedTokenPool();
        const combinedTokenPool = await getCombinedTokenPool();
        const rewardsTokenPool = await getRewardsTokenPool();
        const globalSrpCount = await getGlobalSrpCount();
        const dailyStakingRewards = await getDailyStakingRewards();
        const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
        const stakingRewardsActivated = await getStakingRewardsActivated();

        await setPrevGlobals(stakedTokenPool, combinedTokenPool, rewardsTokenPool, globalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);
        //await printPrevGlobals();
      });

      it(`waiting ${SECONDSPERDAY} seconds for next day`, async () => {
        wait(SECONDSPERDAY * 1000)
      })

    }
  })

})

