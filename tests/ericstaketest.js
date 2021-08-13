require('mocha')
const {expect} = require('chai')
const { newUser, timeout,callFioApi,fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
const config = require('../config.js');
const Staker = require('./Helpers/staker.js');
const { getStakedTokenPool, getCombinedTokenPool, getRewardsTokenPool, getGlobalSrpCount, getDailyStakingRewards, getStakingRewardsReservesMinted, getStakingRewardsActivated } = require('./Helpers/token-pool.js');
let faucet;

let prevStakedTokenPool, prevCombinedTokenPool, prevRewardsTokenPool, prevGlobalSrpCount, prevDailyStakingRewards, prevStakingRewardsReservesMinted, prevStakingRewardsActivated
let currentRoe

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
  console.log('prevStakedTokenPool: ', prevStakedTokenPool);
  console.log('prevCombinedTokenPool: ', prevCombinedTokenPool);
  console.log('prevRewardsTokenPool: ', prevRewardsTokenPool);
  console.log('prevGlobalSrpCount: ', prevGlobalSrpCount);
  console.log('prevDailyStakingRewards: ', prevDailyStakingRewards);
  console.log('prevStakingRewardsReservesMinted: ', prevStakingRewardsReservesMinted);
  console.log('prevStakingRewardsActivated: ', prevStakingRewardsActivated);
}

/********************* setting up these tests
 *
 *
 * first you must shorten the unstake locking period to become 1 minute
 *
 *  go to the contract fio.staking.cpp and change the following lines
 *
 *  change
 *
 *  int64_t UNSTAKELOCKDURATIONSECONDS = 604800;
 *
 *    to become
 *
 *  int64_t UNSTAKELOCKDURATIONSECONDS = 70;
 *
 * Next, update both instances of SECONDSPERDAY in the unstakefio function to 10:
 *
 *   //the days since launch.
 *   uint32_t insertday = (lockiter->timestamp + insertperiod) / SECONDSPERDAY;
 *
 *     to become
 *
 *   //the days since launch.
 *   uint32_t insertday = (lockiter->timestamp + insertperiod) / 10;
 *
 *     and
 *
 *   daysforperiod = (lockiter->timestamp + lockiter->periods[i].duration)/SECONDSPERDAY;
 *
 *     to become
 *
 *   daysforperiod = (lockiter->timestamp + lockiter->periods[i].duration)/10;
 *
 *
 * 
 *  Next change the foundation account to be one of the accounts we use to test:
 *
 *    In fio.contracts > fio.accounts.hpp
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
 *    In fio.contracts > fio.treasury.cpp
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
 *  Next, change the activation time for ROE to start being calculated
 * 
 *  In fio.contracts > fio.staking.cpp
 * 
 *    change the following line:
 * 
 *    #define ENABLESTAKINGREWARDSEPOCHSEC  1627686000  //July 30 5:00PM MST 11:00PM GMT
 * 
 *    to become a number that is in the past:
 * 
 *    #define ENABLESTAKINGREWARDSEPOCHSEC  1628806929  //Thu Aug 12 16:22:09 MDT 2021
 * 
 *  Rebuild the contracts and restart your local chain.
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
 */



const UNSTAKELOCKDURATIONSECONDS = config.UNSTAKELOCKDURATIONSECONDS;
const SECONDSPERDAY = config.SECONDSPERDAY;
const STAKINGREWARDSPERCENT = 0.25;


describe(`************************** stake-regression.js ************************** \n    A. Stake timing test.`, () => {

  let user1, transfer_tokens_pub_key_fee

  const stakeAmount = [300000000000, 500000000000, 0, 0, 0, 0, 10000000000, 0, 0, 200000000000]
  const unstakeAmount = [10000000000, 200000000000, 30000000000, 40000000000, 0, 0, 70000000000, 80000000000, 90000000000, 200000000000]
  
  totalDays = 10
  numusers = 1

  let xfer = 10000000000  // 10 FIO

  const transferAmount1 = 2000000000000  // 2000 FIO

  let staker = new Staker();

  it('Create test user', async () => {
    user1 = await newUser(faucet);
  })

  it(`Show initial global variable values`, async () => {
    try {
      const stakedTokenPool = await getStakedTokenPool();
      const combinedTokenPool = await getCombinedTokenPool();
      const rewardsTokenPool = await getRewardsTokenPool();
      const globalSrpCount = await getGlobalSrpCount();
      const dailyStakingRewards = await getDailyStakingRewards();
      const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
      const stakingRewardsActivated = await getStakingRewardsActivated();

      console.log('stakedTokenPool: ', stakedTokenPool);
      console.log('combinedTokenPool: ', combinedTokenPool);
      console.log('rewardsTokenPool: ', rewardsTokenPool);
      console.log('globalSrpCount: ', globalSrpCount);
      console.log('dailyStakingRewards: ', dailyStakingRewards);
      console.log('stakingRewardsReservesMinted: ', stakingRewardsReservesMinted);
      console.log('stakingRewardsActivated: ', stakingRewardsActivated);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`transfer ${xfer} tokens from faucet to user1 to see if globals change...`, async () => {
    user1 = await newUser(faucet);
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: xfer,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    console.log('result: ', result)
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

      console.log('stakedTokenPool: ', stakedTokenPool);
      console.log('combinedTokenPool: ', combinedTokenPool);
      console.log('rewardsTokenPool: ', rewardsTokenPool);
      console.log('globalSrpCount: ', globalSrpCount);
      console.log('dailyStakingRewards: ', dailyStakingRewards);
      console.log('stakingRewardsReservesMinted: ', stakingRewardsReservesMinted);
      console.log('stakingRewardsActivated: ', stakingRewardsActivated);

      //expect(stakedTokenPool).to.equal(prevStakedTokenPool);
      //expect(combinedTokenPool).to.equal(prevCombinedTokenPool + STAKINGREWARDSPERCENT * transfer_tokens_pub_key_fee);
      //expect(rewardsTokenPool).to.equal(prevRewardsTokenPool + STAKINGREWARDSPERCENT * transfer_tokens_pub_key_fee);
      //expect(globalSrpCount).to.equal(prevGlobalSrpCount);
      //expect(dailyStakingRewards).to.equal(prevDailyStakingRewards);
      //expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted);
      //expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it(`transfer ${xfer} tokens from faucet to user1 to see if globals change...`, async () => {
    user1 = await newUser(faucet);
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: xfer,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    console.log('result: ', result)
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

      console.log('stakedTokenPool: ', stakedTokenPool);
      console.log('combinedTokenPool: ', combinedTokenPool);
      console.log('rewardsTokenPool: ', rewardsTokenPool);
      console.log('globalSrpCount: ', globalSrpCount);
      console.log('dailyStakingRewards: ', dailyStakingRewards);
      console.log('stakingRewardsReservesMinted: ', stakingRewardsReservesMinted);
      console.log('stakingRewardsActivated: ', stakingRewardsActivated);

      //expect(stakedTokenPool).to.equal(prevStakedTokenPool);
      //expect(combinedTokenPool).to.equal(prevCombinedTokenPool + STAKINGREWARDSPERCENT * transfer_tokens_pub_key_fee);
      //expect(rewardsTokenPool).to.equal(prevRewardsTokenPool + STAKINGREWARDSPERCENT * transfer_tokens_pub_key_fee);
      //expect(globalSrpCount).to.equal(prevGlobalSrpCount);
      //expect(dailyStakingRewards).to.equal(prevDailyStakingRewards);
      //expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted);
      //expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

});