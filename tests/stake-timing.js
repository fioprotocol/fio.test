require('mocha')
const { expect } = require('chai')
const { create, all } = require('mathjs')
const { newUser, timeout, callFioApi, existingUser, createKeypair, getAccountFromKey, generateFioDomain, generateFioAddress, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
const config = require('../config.js');
const stakeTests = require('./Helpers/stake-timing-tests.js');
const Staker = require('./Helpers/staker.js');
const { getStakedTokenPool, getCombinedTokenPool, getLastCombinedTokenPool, getRewardsTokenPool, getGlobalSrpCount, getLastGlobalSrpCount, getDailyStakingRewards, getStakingRewardsReservesMinted, getStakingRewardsActivated } = require('./Helpers/token-pool.js');
let faucet, bp1

let prevStakedTokenPool, prevCombinedTokenPool, prevLastCombinedTokenPool, prevRewardsTokenPool, prevGlobalSrpCount, prevLastGlobalSrpCount, prevDailyStakingRewards, prevStakingRewardsReservesMinted, prevStakingRewardsActivated

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

async function setPrevGlobals(stakedTokenPool = 0, combinedTokenPool = 0, lastCombinedTokenPool = 0, rewardsTokenPool = 0, globalSrpCount = 0, lastGlobalSrpCount = 0, dailyStakingRewards = 0, stakingRewardsReservesMinted = 0, stakingRewardsActivated = 0) {
  prevStakedTokenPool = stakedTokenPool;
  prevCombinedTokenPool = combinedTokenPool;
  prevLastCombinedTokenPool = lastCombinedTokenPool;
  prevRewardsTokenPool = rewardsTokenPool;
  prevGlobalSrpCount = globalSrpCount;
  prevLastGlobalSrpCount = lastGlobalSrpCount;
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

async function calcRoeBig(combinedTokenPool, globalSrpCount, precision, roeCalcMethod, printCalc) {
  if (printCalc) { console.log('\nROE CALC: '); }

  const roePrecision = math.bignumber(Math.pow(10, precision));
  //let roeBig = math.bignumber(0);

  const combinedTokenPoolBig = math.bignumber(combinedTokenPool);
  const globalSrpCountBig = math.bignumber(globalSrpCount);

  if (printCalc) {
    //console.log('   combinedTokenPool: \t', combinedTokenPool);
    //console.log('   lastCombinedTokenPool: ', lastCombinedTokenPool);
    //console.log('   globalSrpCount: \t', globalSrpCount);
    //console.log('   lastGlobalSrpCount: \t', lastGlobalSrpCount);
  }

  //let roeBig1 = math.bignumber(0);
  roeBig1 = math.divide(combinedTokenPoolBig, globalSrpCountBig);
  if (printCalc) { console.log('   roeBig1 = combinedTokenPoolBig / globalSrpCountBig = ' + combinedTokenPoolBig + ' / ' + globalSrpCountBig + ' = ' + roeBig1); }
  roeBig2 = math.multiply(roeBig1, roePrecision);
  if (printCalc) { console.log('   roeBig2 = result * precision = ' + roeBig1 + ' * ' + precision + ' = ' + roeBig2); }

  if (roeCalcMethod == "trunc") {
    const roeStr = roeBig2.toString();
    const roeStrTrunc = roeStr.split('.')[0];
    if (printCalc) { console.log('   roeStrTrunc: ', roeStrTrunc); }
    roeTruncBig = math.bignumber(roeStrTrunc)
    if (printCalc) { console.log('   math.bignumber(roeStrTruncBig) = ', roeTruncBig); }
    roeBig = math.divide(roeTruncBig, roePrecision);
    if (printCalc) { console.log('   result / roePrecision = ' + roeTruncBig + ' / ' + roePrecision + ' = ' + roeBig); }
  } else {  // round
    roeRoundBig = math.round(roeBig2)
    if (printCalc) { console.log('   math.round(roeBig2) = ', roeRoundBig); }
    roeBig = math.divide(roeRoundBig, roePrecision);
    if (printCalc) { console.log('   roeBig = result / roePrecision = ' + roeRoundBig + ' / ' + roePrecision + ' = ' + roeBig); }
  }
    
  if (printCalc) { console.log('   return '  + roeBig + '\n'); }
  return roeBig;
}



/**
 * Test constants that need to be set
 */
const UNSTAKELOCKDURATIONSECONDS = config.UNSTAKELOCKDURATIONSECONDS;
const STAKINGREWARDSPERCENT = 0.25;
const ACTIVATIONTHRESHOLD = 1000000000000000  // 1M FIO
const DAILYSTAKINGMINTTHRESHOLD = 2500000000000000  // 25K FIO
const STAKINGREWARDSRESERVEMAXIMUM = 25000000000000000 // 25M FIO
const ROEPRECISION = 18;
const ROETHRESHOLD = 1000000000000000;  // Threshold for using LAST combined token pool and srps to calculate ROE

const ROECALCMETHOD = "round";  // round or trunc
const EPSILON = 0;  // The error we are willing to tolerate, in SUFs
const useEpsilon = false;  // Set to true if you want to allow for error in the results up to EPSILON

/**
 * Need to set. This is the list of tests from stake-timing-tests.js you want to run.
 *   Current list: zeroStaker, largeStaker, smallStaker, medStaker, largeSmallMedStaker, stakeUnstakeStaker, roeRatioLarge
 */
const stakeTestList = [stakeTests.stakeUnstakeStaker];

// To enable debugging:
const printCalc = true;

// These need to add up to 10, otherwise the lock duration drifts over time
const WAIT1 = 1
const SECONDSPERDAY = config.SECONDSPERDAY - WAIT1;

// 1 = execute bpclaim which adds the 25K staking rewards
let dailyRewards = {
  //schedule: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  schedule: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
}
// If the number of days goes beyond the array, this default is used.
defaultDailyRewards = 0;

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
  bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
})

describe(`************************** stake-regression.js ************************** \n    A. Stake timing test.`, () => {

  let user1, transfer_tokens_pub_key_fee, generalLockStaker
  let stakingTableExists = 0;

  let stakers = [];

  // TODO: General lock tests are not yet working...
  const genLock1Dur = 60, genLock1Amount = 5000000000000,  // 6 days, 5000 FIO
    genLock2Dur = 70, genLock2Amount = 4000000000000,     // 7 days, 4000 FIO
    genLock3Dur = 100, genLock3Amount = 1000000000000  // 10 days, 1000 FIO
  
  const genLockTotal = genLock1Amount + genLock2Amount + genLock3Amount

  const existingUser1 = {
    privateKey: '5KAMg5GxX1MGUhRQRnG331GWs1HReXxZrAFrqQ8HzeNVzN3iy2X',
    publicKey: 'FIO8HiRhFAgUTvSKdbSsf7tvRtGWqboaVkf6JhByMG8nE1eGgy7Br',
    account: 'znfhu52wuuxz',
    domain: 'odwcjxcnry',
    address: 'ykyfh@odwcjxcnry'
  }

  const totalDays = 15
  activationDay = 0; // 0 = Immediately activate
  const testTransferAmount = 1000000000000  // 1000 FIO

  it('See if staking table exists', async () => {
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'fio.staking',      // Contract that we target
        scope: 'fio.staking',         // Account that owns the data
        table: 'staking',        // Table name
        limit: 10,                // Maximum number of rows that we want to get
        reverse: true,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      stakingTable = await callFioApi("get_table_rows", json);
      if (stakingTable.rows.length != 0) {
        stakingTableExists = 1;
      }
      console.log('stakingTable: ', stakingTable);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });

  it('Create staking users', async () => {
    try {
      
      let stakingRewardsActivated = 0;
      if (stakingTableExists) {
        stakingRewardsActivated = await getStakingRewardsActivated();
      }
      
      // The initial run is used to test activation of the chain. More testing could be done here. 
      // The remaining post - activation runs are for different edge cases.
      if (stakingRewardsActivated == 0) {
        let stakeTest = stakeTests.activateChainStaker;

        stakers[0] = new Staker();
        stakers[0].transferAmount = stakeTest.transferAmount;
        stakers[0].stakeAmount = stakeTest.stakeAmount;
        stakers[0].unstakeAmount = stakeTest.unstakeAmount;
        stakers[0].transferToken = stakeTest.transferToken;
        await stakers[0].createSdk(faucet);

      } else {
        for (let i = 0; i < stakeTestList.length; i++) {
          let stakeTest = stakeTestList[i];

          stakers[i] = new Staker();
          stakers[i].name = stakeTest.name;
          stakers[i].transferAmount = stakeTest.transferAmount;
          stakers[i].stakeAmount = stakeTest.stakeAmount;
          stakers[i].unstakeAmount = stakeTest.unstakeAmount;
          stakers[i].transferToken = stakeTest.transferToken;
          await stakers[i].createSdk(faucet);
        }

      };
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    };
    
  })

  it('Create test user', async () => {
    user1 = await newUser(faucet);
  })

  it.skip(`Create staker with general lock`, async () => {
    try {   
      generalLockStaker = await createKeypair();
      generalLockStaker.account = await getAccountFromKey(generalLockStaker.publicKey);

      console.log("generalLockStaker.privateKey, ", generalLockStaker.privateKey);
      console.log("generalLockStaker.publicKey ", generalLockStaker.publicKey);
      console.log("generalLockStaker.account ", generalLockStaker.account);

      const result = await faucet.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: generalLockStaker.publicKey,
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

      // Transfer in FIO to register domain and address
      const transfer = await faucet.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
          payee_public_key: generalLockStaker.publicKey,
          amount: 1000000000000,  //1000 FIO
          max_fee: config.maxFee,
          tpid: '',
          actor: faucet.account
        }
      });
      expect(transfer.status).to.equal('OK')
    
      // override the 0 staker
      await stakers[0].createSdk(faucet, generalLockStaker.privateKey, generalLockStaker.publicKey, generalLockStaker.account);

      generalLockStaker.domain = stakers[0].domain;
      generalLockStaker.address = stakers[0].address;

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    };
  })

  it.skip(`print table`, async () => {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      lower_bound: generalLockStaker.account,
      upper_bound: generalLockStaker.account,
      key_type: 'i64',
      index_position: '2'
    }
    const result = await callFioApi("get_table_rows", json);
    console.log('loctokensv2 table for staker: ', result);
  })


  it(`Transfer initial amount into staker accounts`, async () => {
    for (let i = 0; i < stakers.length; i++) {
      console.log('           ...for ', stakers[i].name);
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

  it('Get /transfer_tokens_pub_key fee', async () => {
    try {
      result = await user1.sdk.getFee('transfer_tokens_pub_key');
      transfer_tokens_pub_key_fee = result.fee;
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    };
  });


  it(`Staker votes for BP so they can stake.`, async () => {
    for (let i = 0; i < stakers.length; i++) {
      console.log('           ...for ', stakers[i].name);
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

  it(`Wait a few seconds.`, async () => { await timeout(2000) })

  it(`Set initial prev balances`, async () => {
    for (let i = 0; i < stakers.length; i++) {
      console.log('           ...for ', stakers[i].name);
      try {
        const result = await stakers[i].getUserBalance();
        console.log('initial prev balances: ', result)

        await stakers[i].setPrevBalances(result.balance, result.available, result.staked, result.srps, result.roe);
        await stakers[i].printPrevBalances();
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    };
  })

  it(`Set initial previous lock periods (to be empty or zero)`, async () => {
    for (let i = 0; i < stakers.length; i++) {
      console.log('           ...for ', stakers[i].name);
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
      console.log('Error', err.json.error);
      expect(err).to.equal(null);
    }
  });

  it(`Set global variable values`, async () => {
    try {
      const stakedTokenPool = await getStakedTokenPool();
      const combinedTokenPool = await getCombinedTokenPool();
      const lastCombinedTokenPool = await getLastCombinedTokenPool();
      const rewardsTokenPool = await getRewardsTokenPool();
      const globalSrpCount = await getGlobalSrpCount();
      const lastGlobalSrpCount = await getLastGlobalSrpCount();
      const dailyStakingRewards = await getDailyStakingRewards();
      const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
      const stakingRewardsActivated = await getStakingRewardsActivated();

      await setPrevGlobals(stakedTokenPool, combinedTokenPool, lastCombinedTokenPool, rewardsTokenPool, globalSrpCount, lastGlobalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);
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
            if (!stakers[i].transferToken[dayNumber]) { stakers[i].transferToken[dayNumber] = 0; };
            if (!dailyRewards.schedule[dayNumber]) { dailyRewards.schedule[dayNumber] = defaultDailyRewards; };
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
            const lastCombinedTokenPool = await getLastCombinedTokenPool();
            const rewardsTokenPool = await getRewardsTokenPool();
            const globalSrpCount = await getGlobalSrpCount();
            const lastGlobalSrpCount = await getLastGlobalSrpCount();
            const dailyStakingRewards = await getDailyStakingRewards();
            const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
            const stakingRewardsActivated = await getStakingRewardsActivated();

            //await printCurrentGlobals();

            // TODO: check that activation sets these variables as expected.
            
            await setPrevGlobals(stakedTokenPool, combinedTokenPool, lastCombinedTokenPool, rewardsTokenPool, globalSrpCount, lastGlobalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);


          } catch (err) {
            console.log('Error', err.json);
            expect(err).to.equal(null);
          };
        };
      });

      it.skip(`PREVENTS SRPS > AMOUNT BUG FROM HAPPENING. Transfer ${testTransferAmount} tokens from faucet to user1 to see if globals change...`, async () => {
        try {
          const result = await faucet.genericAction('transferTokens', {
            payeeFioPublicKey: user1.publicKey,
            amount: testTransferAmount,
            maxFee: config.maxFee,
            technologyProviderId: ''
          })
          //console.log('result: ', result)

          const stakedTokenPool = await getStakedTokenPool();
          const combinedTokenPool = await getCombinedTokenPool();
          const lastCombinedTokenPool = await getLastCombinedTokenPool();
          const rewardsTokenPool = await getRewardsTokenPool();
          const globalSrpCount = await getGlobalSrpCount();
          const lastGlobalSrpCount = await getLastGlobalSrpCount();
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

          await setPrevGlobals(stakedTokenPool, combinedTokenPool, lastCombinedTokenPool, rewardsTokenPool, globalSrpCount, lastGlobalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      });
     
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

            if (result.rows.length > 0) { // If the table is not empty
              const lockinfo = result.rows[0];
              if (printCalc) { console.log('\nEXPECTED AVAILABLE CALC:'); };
              if (printCalc) { console.log('currentSecs: ', currentSecs); };
              if (printCalc) { console.log('Result get_table_rows locktokensv2: ', result); }
              if (printCalc) { console.log('periods : ', result.rows[0].periods); }

              const lockTable = await stakers[i].sdk.genericAction('getLocks', { fioPublicKey: stakers[i].publicKey })
              console.log('Locktable: ', lockTable);

              let unlockHappened = false;
              let unlockAmountBig = math.bignumber(0);
              for (period in lockinfo.periods) {
                // If an unlock has occurred update expected Available balance and capture the unlockAmount
                unlockSecs = lockinfo.timestamp + lockinfo.periods[period].duration;
                if ((currentSecs >= unlockSecs) && (currentSecs < unlockSecs + SECONDSPERDAY)) {  // Need the && so you do not double count if the lock is not removed next round. Just remove locks for this day.
                  unlockAmountBig = math.add(unlockAmountBig, math.bignumber(lockinfo.periods[period].amount));
                  unlockHappened = true;
                }
              }

              if (unlockHappened) {
                if (printCalc) { console.log('unlockAmountBig: ', unlockAmountBig); };
                const expectedAvailableBig = math.add(math.bignumber(stakers[i].prevAvailable), unlockAmountBig);
                if (printCalc) { console.log('expectedAvailableBig = stakers[i].prevAvailable + unlockAmountBig = ' + math.bignumber(stakers[i].prevAvailable) + ' + ' + unlockAmountBig + ' = ' + expectedAvailableBig); };
                const expectedAvaialbleInt = parseInt(expectedAvailableBig);
                if (printCalc) { console.log('expectedAvaialbleInt: ', expectedAvaialbleInt); };

                console.log('           ...' + stakers[i].name + ' unlocks ' + parseInt(unlockAmountBig));

                // FOR DEBUGGING
                if (printCalc) { await stakers[i].printPrevBalances(); }
                if (printCalc) { await stakers[i].printCurrentBalances(); }


                const getBalance = await stakers[i].getUserBalance();
                if (printCalc) { console.log('getBalance: ', getBalance); };
                expect(getBalance.balance).to.equal(stakers[i].prevBalance)

                if (useEpsilon) {
                  expect(getBalance.available).is.greaterThan(expectedAvaialbleInt - EPSILON);
                  expect(getBalance.available).is.lessThan(expectedAvaialbleInt + EPSILON);
                } else {
                  expect(getBalance.available).to.equal(expectedAvaialbleInt);
                }

                expect(getBalance.staked).to.equal(stakers[i].prevStaked)
                expect(getBalance.srps).to.equal(stakers[i].prevSrps)

                // ONLY update prev balance if an event happens and you have checked the results.
                // We do NOT need to update globals here because an unlock does not change any staked token pool or srp count. It just changes balance.
                await stakers[i].setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe);
              }
            }
          } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
          }
        };
      })

      it('Print staking table', async () => {
        try {
          const json = {
            json: true,               // Get the response as json
            code: 'fio.staking',      // Contract that we target
            scope: 'fio.staking',         // Account that owns the data
            table: 'staking',        // Table name
            limit: 10,                // Maximum number of rows that we want to get
            reverse: true,           // Optional: Get reversed data
            show_payer: false          // Optional: Show ram payer
          }
          stakingTable = await callFioApi("get_table_rows", json);
          if (printCalc) { console.log('stakingTable: ', stakingTable); }
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      });

      it(`Do staking.`, async () => {
        for (let i = 0; i < stakers.length; i++) {
          console.log('           ...' + stakers[i].name + ' stakes ', stakers[i].stakeAmount[dayNumber]);
          if (stakers[i].stakeAmount[dayNumber] != 0) {
            try {
              const userStakeAmount = stakers[i].stakeAmount[dayNumber];

              const prevStakedTokenPool2 = await getStakedTokenPool();
              const prevCombinedTokenPool2 = await getCombinedTokenPool();
              const prevLastCombinedTokenPool2 = await getLastCombinedTokenPool();
              const prevRewardsTokenPool2 = await getRewardsTokenPool();
              const prevGlobalSrpCount2 = await getGlobalSrpCount();
              const prevLastGlobalSrpCount2 = await getLastGlobalSrpCount();
              const prevDailyStakingRewards2 = await getDailyStakingRewards();
              const prevStakingRewardsReservesMinted2 = await getStakingRewardsReservesMinted();
              const prevStakingRewardsActivated2 = await getStakingRewardsActivated();

              const prevGetBalance = await stakers[i].getUserBalance();
              const prevBalance = prevGetBalance.balance;
              const prevAvailable = prevGetBalance.available;
              const prevStaked = prevGetBalance.staked;
              const prevSrps = prevGetBalance.srps;
              const prevRoe = prevGetBalance.roe;
              if (printCalc) { console.log('prevGetBalance = ', prevGetBalance); };

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
              console.log('Staking result: ', result)

              const stakedTokenPool = await getStakedTokenPool();
              const combinedTokenPool = await getCombinedTokenPool();
              const lastCombinedTokenPool = await getLastCombinedTokenPool();
              const rewardsTokenPool = await getRewardsTokenPool();
              const globalSrpCount = await getGlobalSrpCount();
              const lastGlobalSrpCount = await getLastGlobalSrpCount();
              const dailyStakingRewards = await getDailyStakingRewards();
              const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
              const stakingRewardsActivated = await getStakingRewardsActivated();

              const getBalance = await stakers[i].getUserBalance();
              const userBalance = getBalance.balance;
              const userAvailable = getBalance.available;
              const userStaked = getBalance.staked;
              const userSrps = getBalance.srps;
              const userRoe = getBalance.roe;
              if (printCalc) { console.log('getBalance = ', getBalance); };


              console.log('\n           ...check that global staking variables are correct after staking ');

              expect(stakedTokenPool).to.equal(prevStakedTokenPool2 + userStakeAmount);
              expect(combinedTokenPool).to.equal(prevCombinedTokenPool2 + userStakeAmount);
              expect(rewardsTokenPool).to.equal(prevRewardsTokenPool2);


              // FOR DEBUGGING
              //await printPrevGlobals();
              //await stakers[i].printPrevBalances();
              //await printCurrentGlobals();
              //await stakers[i].printCurrentBalances();

              console.log('           ...Check that getFioBalance is correct after staking ');

              expect(userBalance).to.equal(prevBalance);
              expect(userAvailable).to.equal(prevAvailable - userStakeAmount);
              expect(userStaked).to.equal(prevStaked + userStakeAmount);

              let roeBig;
              if (stakedTokenPool >= ROETHRESHOLD) {
                roeBig = await calcRoeBig(prevCombinedTokenPool2, prevGlobalSrpCount2, ROEPRECISION, ROECALCMETHOD, printCalc);
              } else {
                roeBig = await calcRoeBig(prevLastCombinedTokenPool2, prevLastGlobalSrpCount2, ROEPRECISION, ROECALCMETHOD, printCalc);
              }

              if (printCalc) { console.log('\nAWARDS CALC:'); };

              if (printCalc) { console.log('   roeBig = ', roeBig); };

              const stakeAmountBig = math.bignumber(userStakeAmount)
              let srpsToAwardBig = math.bignumber(0);
              srpsToAwardBig = math.divide(stakeAmountBig, roeBig);
              if (printCalc) { console.log('   srpsToAwardBig = stakeAmountBig / roeBig = ' + stakeAmountBig + ' / ' + roeBig + ' = ' + srpsToAwardBig); };

              // math.floor and Math.trunc returns round (bug?), so just converting to a string and splitting to do the truncation.
              //const srpsToAwardStr = srpsToAwardBig.toString();
              //const srpsToAwardStrTrunc = srpsToAwardStr.split('.')[0];
              //if (printCalc) { console.log('   srpsToAwardStrTrunc: ', srpsToAwardStrTrunc); };

              //let srpsToAwardTruncBig = math.bignumber(srpsToAwardStrTrunc)
              //if (printCalc) { console.log('   srpsToAwardTruncBig = math.bignumber(srpsToAwardStrTrunc) = ', srpsToAwardTruncBig); };

              let srpsToAwardRndBig = math.round(srpsToAwardBig);
              if (printCalc) { console.log('   srpsToAwardRndBig = ' + srpsToAwardRndBig); };

              let prevSrpsBig = math.bignumber(prevSrps);

              //XXXXXX  const newSrpsBig = math.add(prevSrpsBig, srpsToAwardTruncBig);
              const newSrpsBig = math.add(prevSrpsBig, srpsToAwardRndBig);
              if (printCalc) { console.log('   newSrpsBig = prevSrpsBig + srpsToAwardRndBig = ' + prevSrpsBig + ' + ' + srpsToAwardRndBig + ' = ' + newSrpsBig); };

              //XXXXX const newSrpsInt = parseInt(newSrpsBig);
              newSrpsRnd = math.round(newSrpsBig)
              newSrpsInt = parseInt(newSrpsRnd);
              if (printCalc) { console.log('   newSrpsInt = parseInt(newSrpsBig) = ', newSrpsInt); };

              if (useEpsilon) {
                expect(userSrps).is.greaterThan(newSrpsInt - EPSILON);
                expect(userSrps).is.lessThan(newSrpsInt + EPSILON);
              } else {
                expect(userSrps).to.equal(newSrpsInt);
              }

              expect(parseFloat(userRoe)).to.be.greaterThanOrEqual(parseFloat(prevRoe));

              if (printCalc) { console.log('\nAWARDS CALC:'); }
              const prevGlobalSrpCountBig = math.bignumber(prevGlobalSrpCount);
              newSrpGlobalBig = math.add(prevGlobalSrpCountBig, srpsToAwardRndBig);
              if (printCalc) { console.log('   newSrpGlobalBig = prevGlobalSrpCountBig + srpsToAwardRndBig = ' + prevGlobalSrpCountBig + ' + ' + srpsToAwardRndBig + ' = ' + newSrpGlobalBig); };

              const newSrpGlobalRnd = math.round(newSrpGlobalBig);
              const newSrpGlobalInt = parseInt(newSrpGlobalRnd);
              if (printCalc) { console.log('   newSrpGlobalInt: ', newSrpGlobalInt); }

              if (useEpsilon) {
                expect(globalSrpCount).is.greaterThan(newSrpGlobalInt - EPSILON);
                expect(globalSrpCount).is.lessThan(newSrpGlobalInt + EPSILON);
              } else {
                expect(newSrpGlobalInt).to.equal(globalSrpCount);
              }       

              expect(dailyStakingRewards).to.equal(prevDailyStakingRewards2);
              expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted2);
              if ((prevStakedTokenPool2 + stakers[i].stakeAmount[dayNumber]) > ACTIVATIONTHRESHOLD) {
                //XXXXX expect(stakingRewardsActivated).to.equal(1);
              } else {
                //XXXXX expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated2);
              }

              // ONLY update prev balance and globals if an event happens and you have checked the results.
              await stakers[i].setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe);
              await setPrevGlobals(stakedTokenPool, combinedTokenPool, lastCombinedTokenPool, rewardsTokenPool, globalSrpCount, lastGlobalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);

             } catch (err) {
              if (err.errorCode == 400) {
                console.log('\nStaking Error 400: ', err.json);
              } else if (err.errorCode == 500) {
                console.log('\nStaking Error 500: ', err.json.error);
              } else {
                console.log('\nStaking Error: ', err);
              }
              expect(err).to.equal(null);
            }
          };  // if
        };  // for
      });

      it(`Wait a few seconds.`, async () => { await timeout(WAIT1 * 1005) })

      it('Print staking table', async () => {
        try {
          const json = {
            json: true,               // Get the response as json
            code: 'fio.staking',      // Contract that we target
            scope: 'fio.staking',         // Account that owns the data
            table: 'staking',        // Table name
            limit: 10,                // Maximum number of rows that we want to get
            reverse: true,           // Optional: Get reversed data
            show_payer: false          // Optional: Show ram payer
          }
          stakingTable = await callFioApi("get_table_rows", json);
          console.log('stakingTable: ', stakingTable);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      });

      it(`Do unstaking.`, async () => {
        for (let i = 0; i < stakers.length; i++) {
          console.log('           ...' + stakers[i].name + ' unstakes ', stakers[i].unstakeAmount[dayNumber]);

          if (stakers[i].unstakeAmount[dayNumber] != 0) {
            try {
              const userUnstakeAmount = stakers[i].unstakeAmount[dayNumber];

              const prevStakedTokenPool2 = await getStakedTokenPool();
              const prevCombinedTokenPool2 = await getCombinedTokenPool();
              const prevLastCombinedTokenPool2 = await getLastCombinedTokenPool();
              const prevRewardsTokenPool2 = await getRewardsTokenPool();
              const prevGlobalSrpCount2 = await getGlobalSrpCount();
              const prevLastGlobalSrpCount2 = await getLastGlobalSrpCount();
              const prevDailyStakingRewards2 = await getDailyStakingRewards();
              const prevStakingRewardsReservesMinted2 = await getStakingRewardsReservesMinted();
              const prevStakingRewardsActivated2 = await getStakingRewardsActivated();
      
              const prevGetBalance = await stakers[i].getUserBalance();
              const prevBalance = prevGetBalance.balance;
              const prevAvailable = prevGetBalance.available;
              const prevStaked = prevGetBalance.staked;
              const prevSrps = prevGetBalance.srps;
              const prevRoe = prevGetBalance.roe;
              if (printCalc) { console.log('   prevGetBalance = ', prevGetBalance); };

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
              expect(result.status).to.equal('OK');
              console.log('Staking result: ', result)
              
              const stakedTokenPool = await getStakedTokenPool();
              const combinedTokenPool = await getCombinedTokenPool();
              const lastCombinedTokenPool = await getLastCombinedTokenPool();
              const rewardsTokenPool = await getRewardsTokenPool();
              const globalSrpCount = await getGlobalSrpCount();
              const lastGlobalSrpCount = await getLastGlobalSrpCount();
              const dailyStakingRewards = await getDailyStakingRewards();
              const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
              const stakingRewardsActivated = await getStakingRewardsActivated();

              const getBalance = await stakers[i].getUserBalance();
              const userBalance = getBalance.balance;
              const userAvailable = getBalance.available;
              const userStaked = getBalance.staked;
              const userSrps = getBalance.srps;
              const userRoe = getBalance.roe;
              if (printCalc) { console.log('   getBalance = ', getBalance); };

              // FOR DEBUGGING
              //await printPrevGlobals();
              //await stakers[i].printPrevBalances();
              //await printCurrentGlobals();
              //await stakers[i].printCurrentBalances();   
              
              let roeBig;
              if (stakedTokenPool >= ROETHRESHOLD) {
                roeBig = await calcRoeBig(prevCombinedTokenPool2, prevGlobalSrpCount2, ROEPRECISION, ROECALCMETHOD, printCalc);
              } else {
                roeBig = await calcRoeBig(prevLastCombinedTokenPool2, prevLastGlobalSrpCount2, ROEPRECISION, ROECALCMETHOD, printCalc);
              }
                          
              if (printCalc) { console.log('\nAWARDS CALC:'); };
              if (printCalc) { console.log('   roeBig = ', roeBig); };

              const srpsPercentToClaimBig = math.divide(math.bignumber(userUnstakeAmount), math.bignumber(prevStaked));
              if (printCalc) { console.log('   srpsPercentToClaimBig = userUnstakeAmount / prevStaked = ' + userUnstakeAmount + ' / ' + prevStaked + ' = ' + srpsPercentToClaimBig) };
              const srpsToClaimBig = math.multiply(srpsPercentToClaimBig, math.bignumber(prevSrps));
              if (printCalc) { console.log('   srpsToClaimBig = srpsPercentToClaimBig * prevSrps = ' + srpsPercentToClaimBig + ' * ' + prevSrps + ' = ' + srpsToClaimBig) };

              // srps is a int64 so fits in Excel int
              const srpsToClaim = parseInt(srpsToClaimBig);

              if (printCalc) { console.log('   userSrps = prevSrps - srpsToClaim = ' + prevSrps + ' - ' + srpsToClaim + ' = ' + userSrps) };

              if (useEpsilon) {
                expect(userSrps).is.greaterThan(prevSrps - srpsToClaim - EPSILON);
                expect(userSrps).is.lessThan(prevSrps - srpsToClaim + EPSILON);
              } else {
                expect(userSrps).to.equal(prevSrps - srpsToClaim);
              }

              //let globalSrpCountBig = math.bignumber(globalSrpCount);
              //let prevGlobalSrpCountBig = math.bignumber(prevGlobalSrpCount);
              //const newGlobalSrpsBig = math.subtract(prevGlobalSrpCountBig, srpsToClaimBig);


              //srpsToClaimRndBig = math.round(srpsToClaimBig);
              //if (printCalc) { console.log('   srpsToClaimRndBig = ', srpsToClaimRndBig); };
              //const srpsToClaimBig = math.bignumber(srpsToClaim)

              const sufsClaimedBig = math.multiply(srpsToClaimBig, roeBig);
              if (printCalc) { console.log('   sufsClaimedBig = srpsToClaimBig * roeBig = ' + srpsToClaimBig + ' * ' + roeBig + ' = ' + sufsClaimedBig); };

              const sufsClaimedRndBig = math.round(parseFloat(sufsClaimedBig));
              if (printCalc) { console.log('   sufsClaimedRndBig = ', sufsClaimedRndBig); };

              // Contract now does an explicit truncate
              //const fioClaimedTrunc = Math.trunc(parseFloat(fioClaimed));
              //if (printCalc) { console.log('   fioClaimedTrunc: ', fioClaimedTrunc); };

              // Reward amount is the FIO paid out minus the unstakeAmount
              
              const rewardAmountTotal = sufsClaimedRndBig - userUnstakeAmount;
              if (printCalc) { console.log('   rewardAmountTotal = sufsClaimedRndBig - userUnstakeAmount = ' + sufsClaimedRndBig + ' - ' + userUnstakeAmount + ' = ' + rewardAmountTotal); };
              
              const rewardAmountTpid = Math.trunc(rewardAmountTotal / 10);
              if (printCalc) { console.log('   rewardAmountTpid: ', rewardAmountTpid); };
              
              const rewardAmountStaker = 9 * rewardAmountTpid;
              if (printCalc) { console.log('   rewardAmountStaker: ', rewardAmountStaker); };
              if (printCalc) { console.log('   stakers[i].prevBalance: ', stakers[i].prevBalance); };

              stakers[i].prevRewardAmountStaker = rewardAmountStaker;


              console.log('\n           ...Check that getFioBalance is correct after unstake ');

              if (useEpsilon) {
                expect(userBalance).is.greaterThan(prevBalance + rewardAmountStaker - EPSILON);
                expect(userBalance).is.lessThan(prevBalance + rewardAmountStaker + EPSILON);
              } else {
                expect(userBalance).to.equal(prevBalance + rewardAmountStaker);
              }
              
              expect(userAvailable).to.equal(prevAvailable);
              expect(userStaked).to.equal(prevStaked - userUnstakeAmount);

              expect(parseFloat(userRoe)).to.be.greaterThanOrEqual(parseFloat(stakers[i].prevRoe));

              console.log('\n           ...Check that global staking variables are correct after unstaking ');

              if (printCalc) { console.log('   globalSrpCount = prevGlobalSrpCount2 - srpsToClaim = ' + prevGlobalSrpCount2 + ' - ' + srpsToClaim + ' = ' + globalSrpCount) };

              if (useEpsilon) {
                expect(globalSrpCount).is.greaterThan(prevGlobalSrpCount2 - srpsToClaim - EPSILON);
                expect(globalSrpCount).is.lessThan(prevGlobalSrpCount2 - srpsToClaim + EPSILON);
              } else {
                expect(globalSrpCount).to.equal(prevGlobalSrpCount2 - srpsToClaim);
              }

              expect(stakedTokenPool).to.equal(prevStakedTokenPool2 - userUnstakeAmount);

              // combinedTokenPool unstaking calculation: combinedTokenPool = prevcombinedTokenPool2 - unstakeAmount - payout from rewards token pool
              if (useEpsilon) {
                expect(combinedTokenPool).is.greaterThan(prevCombinedTokenPool2 - userUnstakeAmount - rewardAmountStaker - EPSILON);
                expect(combinedTokenPool).is.lessThan(prevCombinedTokenPool2 - userUnstakeAmount - rewardAmountStaker + EPSILON);
              } else {
                expect(combinedTokenPool).to.equal(prevCombinedTokenPool2 - userUnstakeAmount - rewardAmountStaker);
              }
              
              expect(rewardsTokenPool).to.equal(prevRewardsTokenPool2);  // This is cumulative. It never decrements
              
              expect(dailyStakingRewards).to.equal(prevDailyStakingRewards2);
              expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted2);
              //expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated2);

              // ONLY update prev balance and globals if an event happens and you have checked the results.
              await stakers[i].setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe);
              await setPrevGlobals(stakedTokenPool, combinedTokenPool, lastCombinedTokenPool, rewardsTokenPool, globalSrpCount, lastGlobalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);

           } catch (err) {
              if (err.errorCode == 400) {
                console.log('\nUnstaking Error 400: ', err.json);
              } else if (err.errorCode == 500) {
                console.log('\nUnstaking Error 500: ', err.json.error);
              } else {
                console.log('\nUnstaking Error: ', err);
              }
              expect(err).to.equal(null);
            }
          }; // if
        }; // for
      }); // it

      it(`Check that locktokensv2 locks are correct after unstake`, async () => {
        for (let i = 0; i < stakers.length; i++) {
          console.log('           ...for ', stakers[i].name);
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

              if (printCalc) { console.log('Result: ', result); };
              if (printCalc) { console.log('periods : ', result.rows[0].periods); };

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

                const lockAmountBig = math.bignumber(lockinfo.lock_amount);
                if (printCalc) { console.log('lockAmountBig: ', lockAmountBig); };

                const lockAmountInt = parseInt(lockAmountBig);
                
                const remainingLockAmountBig = math.bignumber(lockinfo.remaining_lock_amount);
                if (printCalc) { console.log('remainingLockAmountBig: ', remainingLockAmountBig); };

                if (currentNumberOfPeriods == stakers[i].prevNumberOfPeriods) {
                  //console.log('USE CASE 1')
                  // Add the new unstake amount and subtract the period=0 lock amount
                  for (period in lockinfo.periods) {
                    if (period == (currentNumberOfPeriods - 1)) {  // It is the final, just added, unstake lock period

                      // prevRewardAmountStaker comes from unstake and depends on ROE, so use EPSILON
                      if (useEpsilon) {
                        expect(lockinfo.periods[period].amount).is.greaterThan(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - EPSILON);
                        expect(lockinfo.periods[period].amount).is.lessThan(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker + EPSILON);
                      } else {
                        expect(lockinfo.periods[period].amount).to.equal(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker);
                      }
                      
                      durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY);
                      //expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 6).and.lessThan(durEstimate + 6);
                      expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 9);
                      expect(lockinfo.periods[period].duration).is.lessThan(durEstimate + 9);
                    } else {  // It is a previous lock that has a new period - 1
                      //console.log('typeof: ', typeof period);
                      newPeriod = parseInt(period) + 1;  // Hmmm, period is a string...
                      expect(lockinfo.periods[period].amount).to.equal(stakers[i].prevPeriods[newPeriod].amount);
                      expect(lockinfo.periods[period].duration).to.equal(stakers[i].prevPeriods[newPeriod].duration);
                    }
                  }

                  // prevRewardAmountStaker comes from unstake and depends on ROE, so use EPSILON
                  if (useEpsilon) {
                    expect(lockinfo.lock_amount).is.greaterThan(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - stakers[i].prevPeriods[0].amount - EPSILON);
                    expect(lockinfo.lock_amount).is.lessThan(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - stakers[i].prevPeriods[0].amount + EPSILON);
                  } else {
                    expect(lockinfo.lock_amount).to.equal(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - stakers[i].prevPeriods[0].amount);
                  }
                  expect(lockinfo.remaining_lock_amount).to.equal(stakers[i].prevRemainingLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - stakers[i].prevPeriods[0].amount);
                } else if (currentNumberOfPeriods > stakers[i].prevNumberOfPeriods) {
                  //console.log('USE CASE 2')
                  for (period in lockinfo.periods) {
                    if (period == (currentNumberOfPeriods - 1)) {  // It is the final, just added, unstake lock period

                      // prevRewardAmountStaker comes from unstake and depends on ROE, so use EPSILON
                      if (useEpsilon) {
                        expect(lockinfo.periods[period].amount).is.greaterThan(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - EPSILON);
                        expect(lockinfo.periods[period].amount).is.lessThan(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker + EPSILON);
                      } else {
                        expect(lockinfo.periods[period].amount).to.equal(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker);
                      }
                      
                      durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY);
                      //expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 6).and.lessThan(durEstimate + 6);
                      expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 9);
                      expect(lockinfo.periods[period].duration).is.lessThan(durEstimate + 9);
                    } else {  // It is a previous lock that has not changed
                      expect(lockinfo.periods[period].amount).to.equal(stakers[i].prevPeriods[period].amount);
                      expect(lockinfo.periods[period].duration).to.equal(stakers[i].prevPeriods[period].duration);
                    }
                  }
                  const stakerPrevLockAmountBig = math.bignumber(stakers[i].prevLockAmount);
                  if (printCalc) { console.log('stakerPrevLockAmountBig: ', stakerPrevLockAmountBig); };

                  const stakerUnstakeAmountBig = math.bignumber(stakers[i].unstakeAmount[dayNumber]);
                  if (printCalc) { console.log('stakerUnstakeAmountBig: ', stakerUnstakeAmountBig); };

                  const prevRewardAmountStakerBig = math.bignumber(stakers[i].prevRewardAmountStaker);
                  if (printCalc) { console.log('prevRewardAmountStakerBig: ', prevRewardAmountStakerBig); };

                  const expectedLockAmountBig = math.add(stakerPrevLockAmountBig, stakerUnstakeAmountBig, prevRewardAmountStakerBig);
                  if (printCalc) { console.log('expectedLockAmountBig = stakerPrevLockAmountBig + stakerUnstakeAmountBig + prevRewardAmountStakerBig = ', expectedLockAmountBig); };

                  const expectedLockAmountInt = parseInt(expectedLockAmountBig);

                  // prevRewardAmountStaker comes from unstake and depends on ROE, so use EPSILON
                  if (useEpsilon) {
                    expect(lockAmountInt).is.greaterThan(expectedLockAmountInt - EPSILON);
                    expect(lockAmountInt).is.lessThan(expectedLockAmountInt + EPSILON);
                  } else {
                    expect(lockAmountInt).to.equal(expectedLockAmountInt);
                  }

                  // prevRewardAmountStaker comes from unstake and depends on ROE, so use EPSILON
                  if (useEpsilon) {
                    expect(lockinfo.lock_amount).is.greaterThan(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - EPSILON);
                    expect(lockinfo.lock_amount).is.lessThan(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker + EPSILON);
                  } else {
                    expect(lockinfo.lock_amount).to.equal(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker);
                  }

                  // prevRewardAmountStaker comes from unstake and depends on ROE, so use EPSILON
                  if (useEpsilon) {
                    expect(lockinfo.remaining_lock_amount).is.greaterThan(stakers[i].prevRemainingLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - EPSILON);
                    expect(lockinfo.remaining_lock_amount).is.lessThan(stakers[i].prevRemainingLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker + EPSILON);
                  } else {
                    expect(lockinfo.remaining_lock_amount).to.equal(stakers[i].prevRemainingLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker);
                  }

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
                      // prevRewardAmountStaker comes from unstake and depends on ROE, so use EPSILON
                      if (useEpsilon) {
                        expect(lockinfo.periods[period].amount).is.greaterThan(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - EPSILON);
                        expect(lockinfo.periods[period].amount).is.lessThan(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker + EPSILON);
                      } else {
                        expect(lockinfo.periods[period].amount).to.equal(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker);
                      }

                      durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY);
                      //expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 6).and.lessThan(durEstimate + 6);
                      expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 9);
                      expect(lockinfo.periods[period].duration).is.lessThan(durEstimate + 9);
                    } else {  // It is a previous lock that has a new (period - numberOfRemovedPeriods)
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

            if (printCalc) { console.log('BPCLAIM Result: ', result) };
            
            if (dayNumber != 0) {
              expect(result.status).to.equal('OK')
            }

            console.log('           ...Check that global staking variables are correct after daily staking rewards ');

            // FOR DEBUGGING
            if (true) { await printCurrentGlobals(); }

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

            if (printCalc) { console.log('mintedAmount: ', mintedAmount) };

            const stakedTokenPool = await getStakedTokenPool();
            const combinedTokenPool = await getCombinedTokenPool();
            const lastCombinedTokenPool = await getLastCombinedTokenPool();
            const rewardsTokenPool = await getRewardsTokenPool();
            const globalSrpCount = await getGlobalSrpCount();
            const lastGlobalSrpCount = await getLastGlobalSrpCount();
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
              if (printCalc) { console.log('STAKINGREWARDSRESERVEMAXIMUM Reached'); };
              expect(stakedTokenPool).to.equal(prevStakedTokenPool);
              expect(combinedTokenPool).to.equal(prevCombinedTokenPool);
              expect(rewardsTokenPool).to.equal(prevRewardsTokenPool);
              expect(globalSrpCount).to.equal(prevGlobalSrpCount);
              expect(dailyStakingRewards).to.equal(0);
              expect(stakingRewardsReservesMinted).to.equal(STAKINGREWARDSRESERVEMAXIMUM);
              expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated);
            }
            // ONLY update globals if an event happens and you have checked the results.
            await setPrevGlobals(stakedTokenPool, combinedTokenPool, lastCombinedTokenPool, rewardsTokenPool, globalSrpCount, lastGlobalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);

          } catch (err) {
            if (dayNumber == 0) {
              expect(err.json.fields[0].error).to.equal('FIO Address not producer or nothing payable')             
            } else {
              if (err.errorCode == 400) {
                console.log('\bpclaim Error 400: ', err.json);
              } else if (err.errorCode == 500) {
                console.log('\nbpclaim Error  500: ', err.json.error);
              } else {
                console.log('\nbpclaim Error  ', err);
              }
              expect(err).to.equal(null);
            }
          }
        }; // if
      });

      it(`transfer ${testTransferAmount} tokens from staker to user1 to update lock table`, async () => {
        for (let i = 0; i < stakers.length; i++) {
          console.log('           ...for ', stakers[i].name);
          // Only run this if there was an unstake. 
          if (stakers[i].transferToken[dayNumber] == 1) {
            try {
              const result = await stakers[i].sdk.genericAction('transferTokens', {
                payeeFioPublicKey: user1.publicKey,
                amount: testTransferAmount,
                maxFee: config.maxFee,
                technologyProviderId: ''
              })
              //console.log('result: ', result)

              const stakedTokenPool = await getStakedTokenPool();
              const combinedTokenPool = await getCombinedTokenPool();
              const lastCombinedTokenPool = await getLastCombinedTokenPool();
              const rewardsTokenPool = await getRewardsTokenPool();
              const globalSrpCount = await getGlobalSrpCount();
              const lastGlobalSrpCount = await getLastGlobalSrpCount();
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

              // TODO: Need to check new balance for staker. 
              const getBalance = await stakers[i].getUserBalance();

              // ONLY update prev balance and globals if an event happens and you have checked the results.
              await stakers[i].setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe);
              await setPrevGlobals(stakedTokenPool, combinedTokenPool, lastCombinedTokenPool, rewardsTokenPool, globalSrpCount, lastGlobalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);

            } catch (err) {
              console.log('Error', err);
              expect(err).to.equal(null);
            }
          };
        };
      });


      it(`waiting ${SECONDSPERDAY} seconds for next day`, async () => {
        wait(SECONDSPERDAY * 1000)
      })

    }
  })

})

