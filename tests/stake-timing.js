require('mocha')
const { expect } = require('chai')
const { create, all } = require('mathjs')
const { newUser, timeout, httpRequest, httpRequestBig, existingUser, createKeypair, getAccountFromKey, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
const config = require('../config.js');
const stakeTests = require('./Helpers/stake-timing-tests.js');
const Staker = require('./Helpers/staker.js');
const { getStakedTokenPool, getCombinedTokenPool, getLastCombinedTokenPool, getRewardsTokenPool, getGlobalSrpCount, getLastGlobalSrpCount, getDailyStakingRewards, getStakingRewardsReservesMinted, getStakedTokenPoolBig, getCombinedTokenPoolBig, getLastCombinedTokenPoolBig, getRewardsTokenPoolBig, getGlobalSrpCountBig, getLastGlobalSrpCountBig, getDailyStakingRewardsBig, getStakingRewardsReservesMintedBig } = require('./Helpers/token-pool.js');
const LosslessJSON = require('lossless-json');
let faucet, bp1

let prevStakedTokenPoolOld, prevCombinedTokenPoolOld, prevLastCombinedTokenPoolOld, prevRewardsTokenPoolOld, prevGlobalSrpCountOld, prevLastGlobalSrpCountOld, prevDailyStakingRewardsOld, prevStakingRewardsReservesMintedOld

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
 * 1.2 Change the unlock period:
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
 * 
 * Daily staking rewards:
 * 
 *    If Daily Staking Rewards is less than 25,000 FIO Tokens and Staking Rewards Reserves Minted is less than Staking Rewards Reserves Maximum:
 *      The difference between 25,000 FIO Tokens and Daily Staking Rewards (or difference between Staking Rewards Reserves Minted and Staking Rewards
 *      Reserves Maximum, whichever is smaller) is minted, transferred to treasury account and added to Staking Rewards Reserves Minted.
 */

async function setPrevGlobals(stakedTokenPool = 0, combinedTokenPool = 0, lastCombinedTokenPool = 0, rewardsTokenPool = 0, globalSrpCount = 0, lastGlobalSrpCount = 0, dailyStakingRewards = 0, stakingRewardsReservesMinted = 0) {
  prevStakedTokenPoolOld = stakedTokenPool;
  prevCombinedTokenPoolOld = combinedTokenPool;
  prevLastCombinedTokenPoolOld = lastCombinedTokenPool;
  prevRewardsTokenPoolOld = rewardsTokenPool;
  prevGlobalSrpCountOld = globalSrpCount;
  prevLastGlobalSrpCountOld = lastGlobalSrpCount;
  prevDailyStakingRewardsOld = dailyStakingRewards;
  prevStakingRewardsReservesMintedOld = stakingRewardsReservesMinted;
}

async function printPrevGlobals() {
  console.log('\nPREVIOUS GLOBALS');
  console.log('   prevStakedTokenPool: ', prevStakedTokenPoolOld);
  console.log('   prevCombinedTokenPool: ', prevCombinedTokenPoolOld);
  console.log('   prevRewardsTokenPool: ', prevRewardsTokenPoolOld);
  console.log('   prevGlobalSrpCount: ', prevGlobalSrpCountOld);
  console.log('   prevDailyStakingRewards: ', prevDailyStakingRewardsOld);
  console.log('   prevStakingRewardsReservesMinted: ', prevStakingRewardsReservesMintedOld);
}

async function printCurrentGlobals() {
  const stakedTokenPool = await getStakedTokenPool();
  const combinedTokenPool = await getCombinedTokenPool();
  const rewardsTokenPool = await getRewardsTokenPool();
  const globalSrpCount = await getGlobalSrpCount();
  const dailyStakingRewards = await getDailyStakingRewards();
  const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();

  console.log('\nCURRENT GLOBALS: ');
  console.log(`   stakedTokenPool: ${stakedTokenPool} (changed by ${(stakedTokenPool - prevStakedTokenPoolOld) / 1000000000} FIO)`);
  console.log(`   combinedTokenPool: ${combinedTokenPool} (changed by ${(combinedTokenPool - prevCombinedTokenPoolOld) / 1000000000} FIO)`);
  console.log(`   rewardsTokenPool: ${rewardsTokenPool} (changed by ${(rewardsTokenPool - prevRewardsTokenPoolOld) / 1000000000} FIO)`);
  console.log(`   globalSrpCount: ${globalSrpCount} (changed by ${(globalSrpCount - prevGlobalSrpCountOld) / 1000000000} srps)`);
  console.log(`   dailyStakingRewards: ${dailyStakingRewards} (changed by ${(dailyStakingRewards - prevDailyStakingRewardsOld) / 1000000000} FIO)`);
  console.log(`   stakingRewardsReservesMinted: ${stakingRewardsReservesMinted} (changed by ${(stakingRewardsReservesMinted - prevStakingRewardsReservesMintedOld) / 1000000000} FIO)`);
}

// convert LosslessNumber to Big
function reviver(key, value) {
  if (value && value.isLosslessNumber) {
    return math.bignumber(value.toString());
  }
  else {
    return value;
  }
}

async function printStakingTable() {
  const json = {
    json: true,               // Get the response as json
    code: 'fio.staking',      // Contract that we target
    scope: 'fio.staking',         // Account that owns the data
    table: 'staking',        // Table name
    limit: 10,                // Maximum number of rows that we want to get
    reverse: true,           // Optional: Get reversed data
    show_payer: false          // Optional: Show ram payer
  }
  //stakingTable = await callFioApi("get_table_rows", json);
  const stakingTable = await httpRequestBig("get_table_rows", json);
  const stakingJson = LosslessJSON.parse(stakingTable, reviver);
  //console.log('stakingTable: ', stakingTable);
  console.log('\nLossLessJson Staking Table: ', stakingJson);
  //console.log('Json: ', JSON.parse(stakingTable));
}

async function calcRoeBig(combinedTokenPool, globalSrpCount, precision, printCalc) {
  if (printCalc) { console.log('\nROE CALC: '); }

  const roePrecision = math.bignumber(Math.pow(10, precision));
  const combinedTokenPoolBig = math.bignumber(combinedTokenPool);
  const globalSrpCountBig = math.bignumber(globalSrpCount);

  roeBig1 = math.divide(combinedTokenPoolBig, globalSrpCountBig);
  if (printCalc) { console.log('   roeBig1 = combinedTokenPoolBig / globalSrpCountBig = ' + combinedTokenPoolBig + ' / ' + globalSrpCountBig + ' = ' + roeBig1); }
  roeBig2 = math.multiply(roeBig1, roePrecision);
  if (printCalc) { console.log('   roeBig2 = result * roePrecision = ' + roeBig1 + ' * ' + roePrecision + ' = ' + roeBig2); }

  roeRoundBig = math.round(roeBig2)
  if (printCalc) { console.log('   math.round(roeBig2) = ', roeRoundBig); }
  roeBig = math.divide(roeRoundBig, roePrecision);
  if (printCalc) { console.log('   roeBig = result / roePrecision = ' + roeRoundBig + ' / ' + roePrecision + ' = ' + roeBig); }

  if (printCalc) { console.log('   return '  + roeBig + '\n'); }
  return roeBig;
}

async function calcRoeBig2(combinedTokenPoolBig, globalSrpCountBig, precision, printCalc) {
  if (printCalc) { console.log('\nROE CALC: '); }

  const roePrecision = math.bignumber(Math.pow(10, precision));
  //const combinedTokenPoolBig = math.bignumber(combinedTokenPool);
  //const globalSrpCountBig = math.bignumber(globalSrpCount);

  roeBig1 = math.divide(combinedTokenPoolBig, globalSrpCountBig);
  if (printCalc) { console.log('   roeBig1 = combinedTokenPoolBig / globalSrpCountBig = ' + combinedTokenPoolBig + ' / ' + globalSrpCountBig + ' = ' + roeBig1); }
  roeBig2 = math.multiply(roeBig1, roePrecision);
  if (printCalc) { console.log('   roeBig2 = result * roePrecision = ' + roeBig1 + ' * ' + roePrecision + ' = ' + roeBig2); }

  roeRoundBig = math.round(roeBig2)
  if (printCalc) { console.log('   math.round(roeBig2) = ', roeRoundBig); }
  roeBig = math.divide(roeRoundBig, roePrecision);
  if (printCalc) { console.log('   roeBig = result / roePrecision = ' + roeRoundBig + ' / ' + roePrecision + ' = ' + roeBig); }

  if (printCalc) { console.log('   return ' + roeBig + '\n'); }
  return roeBig;
}

async function divideWithPrecision(numerator, denominator, precision, printCalc) {
  if (printCalc) { console.log('\nROE CALC: '); }

  const divPrecision = math.bignumber(Math.pow(10, precision));
  const numeratorBig = math.bignumber(numerator);
  const denominatorBig = math.bignumber(denominator);

  calcBig1 = math.divide(numeratorBig, globalSrpCountBig);
  if (printCalc) { console.log('   calcBig1 = numeratorBig / globalSrpCountBig = ' + numeratorBig + ' / ' + globalSrpCountBig + ' = ' + calcBig1); }
  calcBig2 = math.multiply(calcBig1, divPrecision);
  if (printCalc) { console.log('   calcBig2 = result * divPrecision = ' + calcBig1 + ' * ' + divPrecision + ' = ' + calcBig2); }

  calcRoundBig = math.round(calcBig2)
  if (printCalc) { console.log('   math.round(calcBig2) = ', calcRoundBig); }
  calcBig = math.divide(calcRoundBig, divPrecision);
  if (printCalc) { console.log('   calcBig = result / divPrecision = ' + calcRoundBig + ' / ' + divPrecision + ' = ' + calcBig); }

  if (printCalc) { console.log('   return ' + calcBig + '\n'); }
  return calcBig;
}

// Takes big numbers
async function divWithRoundingBig(numerator, denominator, printCalc) {
  if (printCalc) { console.log('\nDIVIDE WITH ROUNDING: '); }

  const numeratorBig = math.bignumber(numerator);
  const denominatorBig = math.bignumber(denominator);

  calcBig1 = math.divide(numerator, denominator);
  if (printCalc) { console.log('   calcBig1 = numerator / denominator = ' + numerator + ' / ' + denominator + ' = ' + calcBig1); }

  calcRoundBig = math.round(calcBig1)
  if (printCalc) { console.log('   math.round(calcBig1) = ', calcRoundBig); }

  if (printCalc) { console.log('   return ' + calcRoundBig + '\n'); }
  return calcRoundBig;
}

/**
 * Test constants that need to be set
 */
const UNSTAKELOCKDURATIONSECONDS = config.UNSTAKELOCKDURATIONSECONDS;
const STAKINGREWARDSPERCENT = 0.25;
const DAILYSTAKINGMINTTHRESHOLD = 25000000000000  // 25K FIO
const STAKINGREWARDSRESERVEMAXIMUM = 25000000000000000 // 25M FIO
const PRECISION = 18;
const ROEPRECISION = 15;
const ROETHRESHOLD = 1000000000000000;  // Threshold for using LAST combined token pool and srps to calculate ROE

const EPSILON = 10;  // The error we are willing to tolerate, in SUFs
const EPSILONBIG = math.bignumber(EPSILON);
const useEpsilon = true;  // Set to true if you want to allow for error in the results up to EPSILON

/**
 * Need to set. This is the list of tests from stake-timing-tests.js you want to run (separate tests with comma)
 *   Current list: activateChainStaker, zeroStaker, largeStaker, smallStaker, medStaker, largeSmallMedStaker, stakeUnstakeStaker, roeRatioLarge
 */
const stakeTestList = [stakeTests.activateChainStaker];  // First run this

// To enable debugging:
const printCalc = true;

// These need to add up to 10, otherwise the lock duration drifts over time
const WAIT1 = 1
const SECONDSPERDAY = config.SECONDSPERDAY - WAIT1;

// 1 = execute bpclaim which adds the 25K staking rewards
let dailyRewards = {
  schedule: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  //schedule: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
}
// If the number of days goes beyond the array, this default is used.
defaultDailyRewards = 0;

// If you want to use a tpid in the FIO action calls. should be '' or 'bp1@dapixdev'
const stakingTpid = 'bp1@dapixdev'

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
  bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
})

describe(`************************** stake-timing.js ************************** \n    A. Stake timing test.`, () => {

  let user1, transfer_tokens_pub_key_fee, generalLockStaker

  let stakers = [];

  // TODO: General lock tests are not yet working...
  const genLock1Dur = 60, genLock1Amount = 5000000000000,  // 6 days, 5000 FIO
    genLock2Dur = 70, genLock2Amount = 4000000000000,     // 7 days, 4000 FIO
    genLock3Dur = 100, genLock3Amount = 1000000000000  // 10 days, 1000 FIO
  
  const genLockTotal = genLock1Amount + genLock2Amount + genLock3Amount

  const totalDays = 15
  activationDay = 0; // 0 = Immediately activate
  const testTransferAmount = 1000000000  // 1 FIO


  it('Create staking users', async () => {
    try {
      
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
          tpid: stakingTpid,
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
          tpid: stakingTpid,
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
    const result = await httpRequest("get_table_rows", json);
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
            tpid: stakingTpid,
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

  it.skip(`Set global variable values`, async () => {
    try {
      const stakedTokenPool = await getStakedTokenPool();
      const combinedTokenPool = await getCombinedTokenPool();
      const lastCombinedTokenPool = await getLastCombinedTokenPool();
      const rewardsTokenPool = await getRewardsTokenPool();
      const globalSrpCount = await getGlobalSrpCount();
      const lastGlobalSrpCount = await getLastGlobalSrpCount();
      const dailyStakingRewards = await getDailyStakingRewards();
      const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();

      await setPrevGlobals(stakedTokenPool, combinedTokenPool, lastCombinedTokenPool, rewardsTokenPool, globalSrpCount, lastGlobalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted);
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

      it(`Check if any unlock occurred today `, async () => {
        for (let i = 0; i < stakers.length; i++) {
          let currentSecs = Math.trunc(new Date().getTime() / 1000);
          let unlockSecs;

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
            const result = await httpRequest("get_table_rows", json);

            if (result.rows.length > 0) { // If the table is not empty
              const lockinfo = result.rows[0];
              if (printCalc) { console.log('\nEXPECTED AVAILABLE CALC:'); };
              if (printCalc) { console.log('currentSecs: ', currentSecs); };
              if (printCalc) { console.log('Result get_table_rows locktokensv2: ', result); }
              if (printCalc) { console.log('periods : ', result.rows[0].periods); }

              const lockTable = await stakers[i].sdk.genericAction('getLocks', { fioPublicKey: stakers[i].publicKey })
              console.log('\nLocktable: ', lockTable);

              let unlockHappened = false;
              let unlockAmountBig = math.bignumber(0);
              for (period in lockinfo.periods) {
                // If an unlock has occurred update expected Available balance and capture the unlockAmount
                unlockSecs = lockinfo.timestamp + lockinfo.periods[period].duration;
                //if (printCalc) { console.log('currentSecs: ', currentSecs); };
                //if (printCalc) { console.log('unlockSecs: ', unlockSecs); };
                //if (printCalc) { console.log('unlockSecs + SECONDSPERDAY: ', unlockSecs + SECONDSPERDAY); };
                if ((currentSecs >= unlockSecs) && (currentSecs < unlockSecs + SECONDSPERDAY)) {  // Need the && so you do not double count if the lock is not removed. Just remove locks for this day.
                  unlockAmountBig = math.add(unlockAmountBig, math.bignumber(lockinfo.periods[period].amount));
                  if (printCalc) { console.log('unlockAmountBig (period ' + period + ') = unlockAmountBig + lockinfo.periods[period].amount = ' + unlockAmountBig + ' + ' + lockinfo.periods[period].amount + ' = ' + unlockAmountBig); };
                  unlockHappened = true;
                }
              }

              if (unlockHappened) {
                if (printCalc) { console.log('unlockAmountBig: ', unlockAmountBig); };
                const expectedAvailableBig = math.add(math.bignumber(stakers[i].prevAvailable), unlockAmountBig);
                if (printCalc) { console.log('expectedAvailableBig = stakers[i].prevAvailable + unlockAmountBig = ' + math.bignumber(stakers[i].prevAvailable) + ' + ' + unlockAmountBig + ' = ' + expectedAvailableBig); };
                const expectedAvailable = math.number(expectedAvailableBig);
                if (printCalc) { console.log('expectedAvailable: ', expectedAvailable); };

                console.log('           ...' + stakers[i].name + ' unlocks ' + parseInt(unlockAmountBig));


                const getBalance = await stakers[i].getUserBalance();
                if (printCalc) { console.log('getBalance: ', getBalance); };
                expect(getBalance.balance).to.equal(stakers[i].prevBalance)

                if (useEpsilon) {
                  expect(getBalance.available).is.greaterThan(expectedAvailable - EPSILON);
                  expect(getBalance.available).is.lessThan(expectedAvailable + EPSILON);
                } else {
                  expect(getBalance.available).to.equal(expectedAvailable);
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

      it(`Do staking.`, async () => {

        for (let i = 0; i < stakers.length; i++) {

          //const getBalance = await stakers[i].getUserBalance();
          //if (printCalc) { console.log('getBalance: ', getBalance); };

          console.log('           ...' + stakers[i].name + ' stakes ', stakers[i].stakeAmount[dayNumber]);
          if (stakers[i].stakeAmount[dayNumber] != 0) {
            try {
              const userStakeAmount = stakers[i].stakeAmount[dayNumber];

              // Get global and user vars BEFORE staking

              const prevStakedTokenPool = await getStakedTokenPool();
              const prevCombinedTokenPool = await getCombinedTokenPool();
              const prevLastCombinedTokenPool = await getLastCombinedTokenPool();
              const prevRewardsTokenPool = await getRewardsTokenPool();
              const prevGlobalSrpCount = await getGlobalSrpCount();
              const prevLastGlobalSrpCount = await getLastGlobalSrpCount();
              const prevDailyStakingRewards = await getDailyStakingRewards();
              const prevStakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
              if (printCalc) { await printStakingTable(); };

              const prevStakedTokenPoolB = math.bignumber(await getStakedTokenPoolBig());
              const prevCombinedTokenPoolB = math.bignumber(await getCombinedTokenPoolBig());
              const prevLastCombinedTokenPoolB = math.bignumber(await getLastCombinedTokenPoolBig());
              const prevRewardsTokenPoolB = math.bignumber(await getRewardsTokenPoolBig());
              const prevGlobalSrpCountB = math.bignumber(await getGlobalSrpCountBig());
              const prevLastGlobalSrpCountB = math.bignumber(await getLastGlobalSrpCountBig());
              const prevDailyStakingRewardsB = math.bignumber(await getDailyStakingRewardsBig());
              const prevStakingRewardsReservesMintedB = math.bignumber(await getStakingRewardsReservesMintedBig());

              const prevGetBalance = await stakers[i].getUserBalance();
              const prevBalance = prevGetBalance.balance;
              const prevAvailable = prevGetBalance.available;
              const prevStaked = prevGetBalance.staked;
              const prevSrps = prevGetBalance.srps;
              const prevRoe = prevGetBalance.roe;
              if (printCalc) { console.log('\nprevGetBalance = ', prevGetBalance); };

              // Do the staking

              const result = await stakers[i].sdk.genericAction('pushTransaction', {
                action: 'stakefio',
                account: 'fio.staking',
                data: {
                  fio_address: stakers[i].address,
                  amount: stakers[i].stakeAmount[dayNumber],
                  actor: stakers[i].account,
                  max_fee: config.maxFee,
                  tpid: stakingTpid
                }
              })
              expect(result.status).to.equal('OK')
              console.log('\nStaking result: ', result)

              // Get global and user vars AFTER staking

              const stakedTokenPool = await getStakedTokenPool();
              const combinedTokenPool = await getCombinedTokenPool();
              const lastCombinedTokenPool = await getLastCombinedTokenPool();
              const rewardsTokenPool = await getRewardsTokenPool();
              const globalSrpCount = await getGlobalSrpCount();
              const lastGlobalSrpCount = await getLastGlobalSrpCount();
              const dailyStakingRewards = await getDailyStakingRewards();
              const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
              if (printCalc) { await printStakingTable(); };

              const stakedTokenPoolB = math.bignumber(await getStakedTokenPoolBig());
              const combinedTokenPoolB = math.bignumber(await getCombinedTokenPoolBig());
              const lastCombinedTokenPoolB = math.bignumber(await getLastCombinedTokenPoolBig());
              const rewardsTokenPoolB = math.bignumber(await getRewardsTokenPoolBig());
              const globalSrpCountB = math.bignumber(await getGlobalSrpCountBig());
              const lastGlobalSrpCountB = math.bignumber(await getLastGlobalSrpCountBig());
              const dailyStakingRewardsB = math.bignumber(await getDailyStakingRewardsBig());
              const stakingRewardsReservesMintedB = math.bignumber(await getStakingRewardsReservesMintedBig());

              const getBalance = await stakers[i].getUserBalance();
              const userBalance = getBalance.balance;
              const userAvailable = getBalance.available;
              const userStaked = getBalance.staked;
              const userSrps = getBalance.srps;
              const userRoe = getBalance.roe;
              if (printCalc) { console.log('\ngetBalance = ', getBalance); };

              // Calculate ROE

              let prevRoeBig;
              if (prevStakedTokenPool >= ROETHRESHOLD) {
                //prevRoeBig = await calcRoeBig(prevCombinedTokenPool, prevGlobalSrpCount, PRECISION, printCalc);
                prevRoeBig = await calcRoeBig2(prevLastCombinedTokenPoolB, prevGlobalSrpCountB, PRECISION, printCalc);
              } else {
                //prevRoeBig = await calcRoeBig(prevLastCombinedTokenPool, prevLastGlobalSrpCount, PRECISION, printCalc);
                prevRoeBig = await calcRoeBig2(prevLastCombinedTokenPoolB, prevLastGlobalSrpCountB, PRECISION, printCalc);
              }

              // Do the staking calculations

              if (printCalc) { console.log('\nSTAKING CALCS:'); };

              if (printCalc) { console.log('   prevRoeBig = ', prevRoeBig); };

              const stakeAmountBig = math.bignumber(userStakeAmount)
              let srpsToAwardBig = math.bignumber(0);
              srpsToAwardBig = math.divide(stakeAmountBig, prevRoeBig);
              if (printCalc) { console.log('   srpsToAwardBig = stakeAmountBig / prevRoeBig = ' + stakeAmountBig + ' / ' + prevRoeBig + ' = ' + srpsToAwardBig); };

              //const prevGlobalSrpCountBig = math.bignumber(prevGlobalSrpCount);
              const prevGlobalSrpCountBig = prevGlobalSrpCountB;
              newSrpGlobalBig = math.add(prevGlobalSrpCountBig, srpsToAwardBig);
              if (printCalc) { console.log('   newSrpGlobalBig = prevGlobalSrpCountBig + srpsToAwardBig = ' + prevGlobalSrpCountBig + ' + ' + srpsToAwardBig + ' = ' + newSrpGlobalBig); };
              const newSrpGlobalRnd = math.round(newSrpGlobalBig);
              if (printCalc) { console.log('   newSrpGlobalRnd: ', newSrpGlobalRnd); }
              const newSrpGlobal = math.number(newSrpGlobalRnd);
              if (printCalc) { console.log('   newSrpGlobal: ', newSrpGlobal); }

              let srpsToAwardRndBig = math.round(srpsToAwardBig);
              if (printCalc) { console.log('   srpsToAwardRndBig = ' + srpsToAwardRndBig); };

              let prevSrpsBig = math.bignumber(prevSrps);
              const newSrpsBig = math.add(prevSrpsBig, srpsToAwardBig);
              if (printCalc) { console.log('   newSrpsBig = prevSrpsBig + srpsToAwardBig = ' + prevSrpsBig + ' + ' + srpsToAwardBig + ' = ' + newSrpsBig); };

              newSrpsRnd = math.round(newSrpsBig)
              newSrpsInt = parseInt(newSrpsRnd);
              if (printCalc) { console.log('   newSrpsInt = parseInt(newSrpsBig) = ', newSrpsInt); };


              console.log('\n           ...Check that getFioBalance parameters are correct after unstake ');

              expect(userBalance).to.equal(prevBalance);
              expect(userAvailable).to.equal(prevAvailable - userStakeAmount);
              expect(userStaked).to.equal(prevStaked + userStakeAmount);

              if (useEpsilon) {
                expect(userSrps).is.greaterThan(newSrpsInt - EPSILON);
                expect(userSrps).is.lessThan(newSrpsInt + EPSILON);
              } else {
                expect(userSrps).to.equal(newSrpsInt);
              }

              let roeBig;
              if (prevStakedTokenPool >= ROETHRESHOLD) {
                //roeBig = await calcRoeBig(combinedTokenPool, globalSrpCount, PRECISION, false);
                roeBig = await calcRoeBig2(combinedTokenPoolB, globalSrpCountB, PRECISION, false);
              } else {
                //roeBig = await calcRoeBig(lastCombinedTokenPool, lastGlobalSrpCount, PRECISION, false);
                roeBig = await calcRoeBig2(lastCombinedTokenPoolB, lastGlobalSrpCountB, PRECISION, false);
              }
              const precision = math.bignumber(Math.pow(10, ROEPRECISION));
              const roeLarge = math.multiply(roeBig, precision);
              const roeRnd = math.round(roeLarge);
              const roeDecimal = math.divide(roeRnd, precision);
              console.log('parseFloat(userRoe): ', parseFloat(userRoe));
              console.log('roeDecimal: ', roeDecimal);
              expect(parseFloat(userRoe)).to.equal(math.number(roeDecimal));


              console.log('\n           ...check that global staking variables are correct after staking ');

              expect(stakedTokenPool).to.equal(prevStakedTokenPool + userStakeAmount);

              if (useEpsilon) {
                expect(combinedTokenPool).is.greaterThan(prevCombinedTokenPool + userStakeAmount - EPSILON);
                expect(combinedTokenPool).is.lessThan(prevCombinedTokenPool + userStakeAmount + EPSILON);
              } else {
                expect(combinedTokenPool).to.equal(prevCombinedTokenPool + userStakeAmount);
              }

              if (stakedTokenPool >= ROETHRESHOLD) {
                expect(lastCombinedTokenPool).to.equal(prevCombinedTokenPool + userStakeAmount);
              } else {
                expect(lastCombinedTokenPool).to.equal(prevLastCombinedTokenPool);
              }

              expect(rewardsTokenPool).to.equal(prevRewardsTokenPool);

              if (useEpsilon) {
                expect(globalSrpCount).is.greaterThan(newSrpGlobal - EPSILON);
                expect(globalSrpCount).is.lessThan(newSrpGlobal + EPSILON);
              } else {
                expect(globalSrpCount).to.equal(newSrpGlobal);
              }

              if (stakedTokenPool >= ROETHRESHOLD) {
                expect(lastGlobalSrpCount).to.equal(newSrpGlobal);
              } else {
                expect(lastGlobalSrpCount).to.equal(prevLastGlobalSrpCount);
              }

              expect(dailyStakingRewards).to.equal(prevDailyStakingRewards);
              expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted);


              // ONLY update prev balance and globals if an event happens and you have checked the results.
              await stakers[i].setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe);
              await setPrevGlobals(stakedTokenPool, combinedTokenPool, lastCombinedTokenPool, rewardsTokenPool, globalSrpCount, lastGlobalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted);

             } catch (err) {
              if (err.code == 400) {
                console.log('\nStaking Error 400: ', err.json);
              } else if (err.code == 500) {
                console.log('\nStaking Error 500: ', err.json.error);
              } else {
                console.log('\nStaking Error: ', err);
              }
              expect(err).to.equal(null);
            }
          };  // if
        };  // for
      });

      it(`Wait a few seconds.`, async () => { await timeout(WAIT1 * 1000) })

      it(`Do unstaking.`, async () => {
        for (let i = 0; i < stakers.length; i++) {
          console.log('           ...' + stakers[i].name + ' unstakes ', stakers[i].unstakeAmount[dayNumber]);

          //const getBalancetest = await stakers[i].getUserBalance();
          //if (printCalc) { console.log('getBalancetest: ', getBalancetest); };

          if (stakers[i].unstakeAmount[dayNumber] != 0) {
            try {
              const userUnstakeAmount = stakers[i].unstakeAmount[dayNumber];

              // Get global and user vars BEFORE staking

              const prevStakedTokenPool = await getStakedTokenPool();
              const prevCombinedTokenPool = await getCombinedTokenPool();
              const prevLastCombinedTokenPool = await getLastCombinedTokenPool();
              const prevRewardsTokenPool = await getRewardsTokenPool();
              const prevGlobalSrpCount = await getGlobalSrpCount();
              const prevLastGlobalSrpCount = await getLastGlobalSrpCount();
              const prevDailyStakingRewards = await getDailyStakingRewards();
              const prevStakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
              if (printCalc) { await printStakingTable(); };

              const prevStakedTokenPoolB = math.bignumber(await getStakedTokenPoolBig());
              const prevCombinedTokenPoolB = math.bignumber(await getCombinedTokenPoolBig());
              const prevLastCombinedTokenPoolB = math.bignumber(await getLastCombinedTokenPoolBig());
              const prevRewardsTokenPoolB = math.bignumber(await getRewardsTokenPoolBig());
              const prevGlobalSrpCountB = math.bignumber(await getGlobalSrpCountBig());
              const prevLastGlobalSrpCountB = math.bignumber(await getLastGlobalSrpCountBig());
              const prevDailyStakingRewardsB = math.bignumber(await getDailyStakingRewardsBig());
              const prevStakingRewardsReservesMintedB = math.bignumber(await getStakingRewardsReservesMintedBig());

              const prevGetBalance = await stakers[i].getUserBalance();
              const prevBalance = prevGetBalance.balance;
              const prevAvailable = prevGetBalance.available;
              const prevStaked = prevGetBalance.staked;
              const prevSrps = prevGetBalance.srps;
              const prevRoe = prevGetBalance.roe;
              if (printCalc) { console.log('\nprevGetBalance = ', prevGetBalance); };

              const prevBalanceBig = math.bignumber(prevBalance);

              // Do the unstaking

              const result = await stakers[i].sdk.genericAction('pushTransaction', {
                action: 'unstakefio',
                account: 'fio.staking',
                data: {
                  fio_address: stakers[i].address,
                  amount: stakers[i].unstakeAmount[dayNumber],
                  actor: stakers[i].account,
                  max_fee: config.maxFee,
                  tpid: stakingTpid
                }
              }); 
              expect(result.status).to.equal('OK');
              console.log('\nStaking result: ', result)

              // Get global and user vars AFTER staking
              
              const stakedTokenPool = await getStakedTokenPool();
              const combinedTokenPool = await getCombinedTokenPool();
              const lastCombinedTokenPool = await getLastCombinedTokenPool();
              const rewardsTokenPool = await getRewardsTokenPool();
              const globalSrpCount = await getGlobalSrpCount();
              const lastGlobalSrpCount = await getLastGlobalSrpCount();
              const dailyStakingRewards = await getDailyStakingRewards();
              const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
              if (printCalc) { await printStakingTable(); };

              const stakedTokenPoolB = math.bignumber(await getStakedTokenPoolBig());
              const combinedTokenPoolB = math.bignumber(await getCombinedTokenPoolBig());
              const lastCombinedTokenPoolB = math.bignumber(await getLastCombinedTokenPoolBig());
              const rewardsTokenPoolB = math.bignumber(await getRewardsTokenPoolBig());
              const globalSrpCountB = math.bignumber(await getGlobalSrpCountBig());
              const lastGlobalSrpCountB = math.bignumber(await getLastGlobalSrpCountBig());
              const dailyStakingRewardsB = math.bignumber(await getDailyStakingRewardsBig());
              const stakingRewardsReservesMintedB = math.bignumber(await getStakingRewardsReservesMintedBig());

              const getBalance = await stakers[i].getUserBalance();
              const userBalance = getBalance.balance;
              const userAvailable = getBalance.available;
              const userStaked = getBalance.staked;
              const userSrps = getBalance.srps;
              const userRoe = getBalance.roe;
              if (printCalc) { console.log('\ngetBalance = ', getBalance); };

              const userBalanceBig = math.bignumber(userBalance);

              // Calculate ROE

              let prevRoeBig;
              if (prevStakedTokenPool >= ROETHRESHOLD) {
                prevRoeBig = await calcRoeBig(prevCombinedTokenPool, prevGlobalSrpCount, PRECISION, printCalc);
              } else {
                prevRoeBig = await calcRoeBig(prevLastCombinedTokenPool, prevLastGlobalSrpCount, PRECISION, printCalc);
              }

              // Do the unstaking calculations
                          
              if (printCalc) { console.log('\nUNSTAKING CALCS:'); };
              if (printCalc) { console.log('   prevRoeBig = ', prevRoeBig); };

              const userUnstakeAmountBig = math.bignumber(userUnstakeAmount);
              const prevStakedBig = math.bignumber(prevStaked);
              const srpsPercentToClaimBig = math.divide(userUnstakeAmountBig, prevStakedBig);
              if (printCalc) { console.log('   srpsPercentToClaimBig = userUnstakeAmount / prevStaked = ' + userUnstakeAmount + ' / ' + prevStaked + ' = ' + srpsPercentToClaimBig) };

              const prevSrpsBig = math.bignumber(prevSrps)
              const srpsToClaimBig = math.multiply(srpsPercentToClaimBig, prevSrpsBig);
              if (printCalc) { console.log('   srpsToClaimBig = srpsPercentToClaimBig * prevSrps = ' + srpsPercentToClaimBig + ' * ' + prevSrps + ' = ' + srpsToClaimBig) };

              const srpsToClaimRndBig = math.round(srpsToClaimBig);
              if (printCalc) { console.log('   srpsToClaimRndBig = ', srpsToClaimRndBig); };

              const srpsToClaim = parseInt(srpsToClaimRndBig);
              if (printCalc) { console.log('   srpsToClaim = ', srpsToClaim); };

              const remainingSrps = prevSrps - srpsToClaim;
              if (printCalc) { console.log('   remainingSrps (for user) = prevSrps - srpsToClaim = ' + prevSrps + ' - ' + srpsToClaim + ' = ' + remainingSrps); };

              const remainingSrpsBig = math.subtract(prevSrpsBig, srpsToClaimBig);
              if (printCalc) { console.log('   remainingSrpsBig (for user) = math.bignumber(prevSrps) - srpsToClaimBig = ' + math.bignumber(prevSrps) + ' - ' + srpsToClaimBig + ' = ' + remainingSrpsBig); };



              const remainingGlobalSrps = prevGlobalSrpCount - srpsToClaim;
              if (printCalc) { console.log('   remainingGlobalSrps = prevGlobalSrpCount - srpsToClaim = ' + prevGlobalSrpCount + ' - ' + srpsToClaim + ' = ' + remainingGlobalSrps); };


              prevGlobalSrpCountBig = math.bignumber(prevGlobalSrpCount);
              const remainingGlobalSrpsBig = math.subtract(prevGlobalSrpCountBig, srpsToClaimBig);
              if (printCalc) { console.log('   remainingGlobalSrpsBig = prevGlobalSrpCountBig - srpsToClaim = ' + prevGlobalSrpCountBig + ' - ' + srpsToClaimBig + ' = ' + remainingGlobalSrpsBig); };
              //const remainingGlobalSrpsRndBig = math.round(remainingGlobalSrpsBig);
              //if (printCalc) { console.log('   remainingGlobalSrpsRndBig = math.round(remainingGlobalSrpsBig) = ' + remainingGlobalSrpsRndBig); };
              //const remainingGlobalSrps = math.number(remainingGlobalSrpsRndBig);
              //if (printCalc) { console.log('   remainingGlobalSrps = math.number(remainingGlobalSrpsRndBig) = ' + remainingGlobalSrps); };



              const sufsClaimedBig = math.multiply(srpsToClaimBig, prevRoeBig);
              if (printCalc) { console.log('   sufsClaimedBig = srpsToClaimBig * prevRoeBig = ' + srpsToClaimBig + ' * ' + prevRoeBig + ' = ' + sufsClaimedBig); };

              const sufsClaimedRndBig = math.round(sufsClaimedBig);
              if (printCalc) { console.log('   sufsClaimedRndBig = ', sufsClaimedRndBig); };



              const rewardAmountTotal = math.number(sufsClaimedRndBig) - userUnstakeAmount;
              const rewardAmountTotalBig = math.subtract(sufsClaimedRndBig, userUnstakeAmountBig)
              if (printCalc) { console.log('   rewardAmountTotal = sufsClaimedRndBig - userUnstakeAmount = ' + sufsClaimedRndBig + ' - ' + userUnstakeAmount + ' = ' + rewardAmountTotal); };
              
              const rewardAmountTpidBig = math.round(math.divide(rewardAmountTotalBig, 10));
              const rewardAmountTpid = Math.round(rewardAmountTotal / 10);
              if (printCalc) { console.log('   rewardAmountTpid: ', rewardAmountTpid); };
              
              const rewardAmountStakerBig = math.subtract(rewardAmountTotalBig, rewardAmountTpidBig);
              const rewardAmountStaker = rewardAmountTotal - rewardAmountTpid;
              if (printCalc) { console.log('   rewardAmountStaker: ', rewardAmountStaker); };
              if (printCalc) { console.log('   stakers[i].prevBalance: ', stakers[i].prevBalance); };

              const calculatedUserBalanceBig = math.add(prevBalanceBig, rewardAmountStakerBig);

              stakers[i].prevRewardAmountStaker = rewardAmountStaker;

              if (printCalc) { console.log('   expect combinedTokenPool = prevCombinedTokenPool - userUnstakeAmount - rewardAmountStaker = ' + prevCombinedTokenPool + ' - ' + userUnstakeAmount + ' - ' + rewardAmountStaker + ' = ' + combinedTokenPool); };

              console.log('\n           ...Check that getFioBalance parameters are correct after unstaking ');

              if (useEpsilon) {
                expect(userSrps).is.greaterThan(remainingSrps - EPSILON);
                expect(userSrps).is.lessThan(remainingSrps + EPSILON);
              } else {
                expect(userSrps).to.equal(remainingSrps);
              }

              if (useEpsilon) {
                const calculatedUserBalanceBigLow = math.subtract(calculatedUserBalanceBig, EPSILONBIG)
                expect(math.number(userBalanceBig)).is.greaterThan(math.number(calculatedUserBalanceBigLow));
                const calculatedUserBalanceBigHigh = math.add(calculatedUserBalanceBig, EPSILONBIG)
                expect(math.number(userBalanceBig)).is.lessThan(math.number(calculatedUserBalanceBigHigh));
              } else {
                expect(userBalanceBig).to.equal(calculatedUserBalanceBig);
              }

              expect(userAvailable).to.equal(prevAvailable);
              expect(userStaked).to.equal(prevStaked - userUnstakeAmount);

              let roeBig;
              if (prevStakedTokenPool >= ROETHRESHOLD) {
                roeBig = await calcRoeBig(combinedTokenPool, globalSrpCount, PRECISION, false);
              } else {
                roeBig = await calcRoeBig(lastCombinedTokenPool, lastGlobalSrpCount, PRECISION, false);
              }
              const precision = math.bignumber(Math.pow(10, ROEPRECISION));
              const roeLarge = math.multiply(roeBig, precision);
              const roeRnd = math.round(roeLarge);
              const roeDecimal = math.divide(roeRnd, precision);
              console.log('parseFloat(userRoe): ', parseFloat(userRoe));
              console.log('roeDecimal: ', roeDecimal);

              if (useEpsilon) {
                expect(parseFloat(userRoe)).is.greaterThan(math.number(roeDecimal) - EPSILON);
                expect(parseFloat(userRoe)).is.lessThan(math.number(roeDecimal)+ EPSILON);
              } else {
                expect(parseFloat(userRoe)).to.equal(math.number(roeDecimal));
              }

              console.log('\n           ...Check that global staking variables are correct after unstaking ');

              expect(stakedTokenPool).to.equal(prevStakedTokenPool - userUnstakeAmount);

              // combinedTokenPool unstaking calculation: combinedTokenPool = prevcombinedTokenPool - unstakeAmount - payout from rewards token pool
              if (useEpsilon) {
                expect(combinedTokenPool).is.greaterThan(prevCombinedTokenPool - userUnstakeAmount - rewardAmountStaker - rewardAmountTpid - EPSILON);
                expect(combinedTokenPool).is.lessThan(prevCombinedTokenPool - userUnstakeAmount - rewardAmountStaker - rewardAmountTpid + EPSILON);
              } else {
                expect(combinedTokenPool).to.equal(prevCombinedTokenPool - userUnstakeAmount - rewardAmountStaker - rewardAmountTpid);
              }

              if (prevStakedTokenPool >= ROETHRESHOLD) {
                if (useEpsilon) {
                  expect(lastCombinedTokenPool).is.greaterThan(prevLastCombinedTokenPool - userUnstakeAmount - rewardAmountStaker - rewardAmountTpid - EPSILON);
                  expect(lastCombinedTokenPool).is.lessThan(prevLastCombinedTokenPool - userUnstakeAmount - rewardAmountStaker - rewardAmountTpid + EPSILON);
                } else {
                  expect(lastCombinedTokenPool).to.equal(prevLastCombinedTokenPool - userUnstakeAmount - rewardAmountStaker - rewardAmountTpid);
                }
              } else {
                expect(lastCombinedTokenPool).to.equal(prevLastCombinedTokenPool);
              }
              
              expect(rewardsTokenPool).to.equal(prevRewardsTokenPool);  // This is cumulative. It never decrements

              if (useEpsilon) {
                expect(globalSrpCount).is.greaterThan(prevGlobalSrpCount - srpsToClaim - EPSILON);
                expect(globalSrpCount).is.lessThan(prevGlobalSrpCount - srpsToClaim + EPSILON);
              } else { //remainingGlobalSrpsBig
                //expect(globalSrpCount).to.equal(prevGlobalSrpCount - srpsToClaim);
                //expect(globalSrpCount).to.equal(remainingGlobalSrps);
                console.log('globalSrpCountB: ', globalSrpCountB)
                console.log('remainingGlobalSrpsBig: ', remainingGlobalSrpsBig)
                console.log('remainingGlobalSrps: ', remainingGlobalSrps)
                globalSrpCountBStr = globalSrpCountB.toString();
                remainingGlobalSrpsBigStr = remainingGlobalSrpsBig.toString();
                //expect(globalSrpCountBStr).to.equal(remainingGlobalSrpsBigStr);
              }

              if (prevStakedTokenPool >= ROETHRESHOLD) {
                if (useEpsilon) {
                  expect(lastGlobalSrpCount).is.greaterThan(prevLastGlobalSrpCount - srpsToClaim - EPSILON);
                  expect(lastGlobalSrpCount).is.lessThan(prevLastGlobalSrpCount - srpsToClaim + EPSILON);
                } else {
                  expect(lastGlobalSrpCount).to.equal(prevLastGlobalSrpCount - srpsToClaim);
                }
              } else {
                expect(lastGlobalSrpCount).to.equal(prevLastGlobalSrpCount);
              }

              expect(dailyStakingRewards).to.equal(prevDailyStakingRewards);
              expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted);


              if (printCalc) { await printStakingTable(); };

              // ONLY update prev balance and globals if an event happens and you have checked the results.
              await stakers[i].setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe);
              await setPrevGlobals(stakedTokenPool, combinedTokenPool, lastCombinedTokenPool, rewardsTokenPool, globalSrpCount, lastGlobalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted);

           } catch (err) {
              if (err.code == 400) {
                console.log('\nUnstaking Error 400: ', err.json);
              } else if (err.code == 500) {
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
              const result = await httpRequest("get_table_rows", json);
              const lockinfo = result.rows[0];

              if (printCalc) { console.log('Result: ', result); };
              if (printCalc) { console.log('periods : ', result.rows[0].periods); };

              if (printCalc) { await printStakingTable(); };

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
                      expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 9);
                      expect(lockinfo.periods[period].duration).is.lessThan(durEstimate + 9);
                    } else {  // It is a previous lock that has a new period - 1
                      newPeriod = parseInt(period) + 1;  // Hmmm, period is a string...
                      expect(lockinfo.periods[period].amount).to.equal(stakers[i].prevPeriods[newPeriod].amount);
                      expect(lockinfo.periods[period].duration).to.equal(stakers[i].prevPeriods[newPeriod].duration);
                    }
                  }

                  // prevRewardAmountStaker comes from unstake and depends on ROE, so use EPSILON
                  if (useEpsilon) {
                    expect(lockinfo.lock_amount).is.greaterThan(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - stakers[i].prevPeriods[0].amount - EPSILON);
                    expect(lockinfo.lock_amount).is.lessThan(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - stakers[i].prevPeriods[0].amount + EPSILON);

                    expect(lockinfo.remaining_lock_amount).is.greaterThan(stakers[i].prevRemainingLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - stakers[i].prevPeriods[0].amount - EPSILON);
                    expect(lockinfo.remaining_lock_amount).is.lessThan(stakers[i].prevRemainingLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - stakers[i].prevPeriods[0].amount + EPSILON);
                  } else {
                    expect(lockinfo.lock_amount).to.equal(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - stakers[i].prevPeriods[0].amount);

                    expect(lockinfo.remaining_lock_amount).to.equal(stakers[i].prevRemainingLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - stakers[i].prevPeriods[0].amount);
                  }

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
                      expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 9);
                      expect(lockinfo.periods[period].duration).is.lessThan(durEstimate + 9);
                    } else {  // It is a previous lock that has not changed
                      console.log('period: ', period)
                      console.log('lockinfo.periods[period]: ', lockinfo.periods[period])
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

            // Get global vars BEFORE staking

            const prevStakedTokenPool = await getStakedTokenPool();
            const prevCombinedTokenPool = await getCombinedTokenPool();
            const prevLastCombinedTokenPool = await getLastCombinedTokenPool();
            const prevRewardsTokenPool = await getRewardsTokenPool();
            const prevGlobalSrpCount = await getGlobalSrpCount();
            const prevLastGlobalSrpCount = await getLastGlobalSrpCount();
            const prevDailyStakingRewards = await getDailyStakingRewards();
            const prevStakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
            if (printCalc) { await printCurrentGlobals(); };

            // Do the bpclaim

            const result = await bp1.sdk.genericAction('pushTransaction', {
              action: 'bpclaim',
              account: 'fio.treasury',
              data: {
                fio_address: bp1.address,
                actor: bp1.account
              }
            })
            if (dayNumber != 0) {
              expect(result.status).to.equal('OK')
            }
            if (printCalc) { console.log('\nBPCLAIM Result: ', result) };

            // Get global vars AFTER staking

            const stakedTokenPool = await getStakedTokenPool();
            const combinedTokenPool = await getCombinedTokenPool();
            const lastCombinedTokenPool = await getLastCombinedTokenPool();
            const rewardsTokenPool = await getRewardsTokenPool();
            const globalSrpCount = await getGlobalSrpCount();
            const lastGlobalSrpCount = await getLastGlobalSrpCount();
            const dailyStakingRewards = await getDailyStakingRewards();
            const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
            if (printCalc) { await printCurrentGlobals(); };


            // Do the bpclaim calculations

            if (printCalc) { console.log('\nBPCLAIM CALCS:'); };

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

            console.log('           ...Check that global staking variables are correct after daily staking rewards ');

            if (stakingRewardsReservesMinted < STAKINGREWARDSRESERVEMAXIMUM) {
              expect(stakedTokenPool).to.equal(prevStakedTokenPool);
              if (printCalc) { console.log('combinedTokenPool: ', combinedTokenPool) };
              if (printCalc) { console.log('prevCombinedTokenPool: ', prevCombinedTokenPool) };
              if (printCalc) { console.log('mintedAmount: ', mintedAmount) };

              if (printCalc) { console.log('prevCombinedTokenPool + mintedAmount = ', prevCombinedTokenPool + mintedAmount) };
              expect(combinedTokenPool).to.equal(prevCombinedTokenPool + mintedAmount);
              expect(rewardsTokenPool).to.equal(prevRewardsTokenPool);
              expect(globalSrpCount).to.equal(prevGlobalSrpCount);
              expect(dailyStakingRewards).to.equal(0);  // This gets reset when doing a bpclaim because the new tokens are minted
              expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted + mintedAmount);
            } else {  // STAKINGREWARDSRESERVEMAXIMUM has been hit
              if (printCalc) { console.log('STAKINGREWARDSRESERVEMAXIMUM Reached'); };
              expect(stakedTokenPool).to.equal(prevStakedTokenPool);
              expect(combinedTokenPool).to.equal(prevCombinedTokenPool);
              expect(rewardsTokenPool).to.equal(prevRewardsTokenPool);
              expect(globalSrpCount).to.equal(prevGlobalSrpCount);
              expect(dailyStakingRewards).to.equal(0);
              expect(stakingRewardsReservesMinted).to.equal(STAKINGREWARDSRESERVEMAXIMUM);
            }


            // ONLY update globals if an event happens and you have checked the results.
            await setPrevGlobals(stakedTokenPool, combinedTokenPool, lastCombinedTokenPool, rewardsTokenPool, globalSrpCount, lastGlobalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, 0);

          } catch (err) {
            //console.log('Err: ', err)
            if (dayNumber == 0) {
              expect(err.json.fields[0].error).to.equal('FIO Address not producer or nothing payable')             
            } else {
              if (err.code == 400) {
                console.log('\bpclaim Error 400: ', err.json);
              } else if (err.code == 500) {
                console.log('\nbpclaim Error  500: ', err.json.error);
              } else {
                console.log('\nbpclaim Error  ', err);
              }
              expect(err).to.equal(null);
            }
          }
        }; // if
      });

      // Note that only unstaking updates the lock table.
      it.skip(`transfer ${testTransferAmount} tokens from staker to user1 to update lock table`, async () => {
        for (let i = 0; i < stakers.length; i++) {
          console.log('           ...for ', stakers[i].name);
          // Only run this if there was an unstake. 
          if (stakers[i].transferToken[dayNumber] == 1) {
            try {

              const prevStakedTokenPool = await getStakedTokenPool();
              const prevCombinedTokenPool = await getCombinedTokenPool();
              const prevLastCombinedTokenPool = await getLastCombinedTokenPool();
              const prevRewardsTokenPool = await getRewardsTokenPool();
              const prevGlobalSrpCount = await getGlobalSrpCount();
              const prevLastGlobalSrpCount = await getLastGlobalSrpCount();
              const prevDailyStakingRewards = await getDailyStakingRewards();
              const prevStakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
              if (printCalc) { await printCurrentGlobals(); };


              const result = await stakers[i].sdk.genericAction('transferTokens', {
                payeeFioPublicKey: user1.publicKey,
                amount: testTransferAmount,
                maxFee: config.maxFee,
                technologyProviderId: ''
              })
              console.log('Transfer Tokens: ', result)

              const result2 = await stakers[i].sdk.genericAction('pushTransaction', {
                action: 'voteproducer',
                account: 'eosio',
                data: {
                  producers: ["bp1@dapixdev"],
                  fio_address: '',
                  actor: stakers[i].account,
                  max_fee: config.maxFee
                }
              })
              console.log('BP Claim: ', result2)

              const stakedTokenPool = await getStakedTokenPool();
              const combinedTokenPool = await getCombinedTokenPool();
              const lastCombinedTokenPool = await getLastCombinedTokenPool();
              const rewardsTokenPool = await getRewardsTokenPool();
              const globalSrpCount = await getGlobalSrpCount();
              const lastGlobalSrpCount = await getLastGlobalSrpCount();
              const dailyStakingRewards = await getDailyStakingRewards();
              const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();


              expect(stakedTokenPool).to.equal(prevStakedTokenPool);
              expect(combinedTokenPool).to.equal(prevCombinedTokenPool + STAKINGREWARDSPERCENT * transfer_tokens_pub_key_fee);
              expect(rewardsTokenPool).to.equal(prevRewardsTokenPool + STAKINGREWARDSPERCENT * transfer_tokens_pub_key_fee);
              expect(globalSrpCount).to.equal(prevGlobalSrpCount);
              expect(dailyStakingRewards).to.equal(prevDailyStakingRewards + STAKINGREWARDSPERCENT * transfer_tokens_pub_key_fee);
              expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted);

              // TODO: Need to check new balance for staker. 
              const getBalance = await stakers[i].getUserBalance();

              // ONLY update prev balance and globals if an event happens and you have checked the results.
              await stakers[i].setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe);
              await setPrevGlobals(stakedTokenPool, combinedTokenPool, lastCombinedTokenPool, rewardsTokenPool, globalSrpCount, lastGlobalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted);

            } catch (err) {
              console.log('Error', err);
              expect(err).to.equal(null);
            }
          };
        };
      });

      it(`Set prev balances (Clean up)`, async () => {
        if (printCalc) { await printCurrentGlobals(); };
        for (let i = 0; i < stakers.length; i++) {
          try {
            const result = await stakers[i].getUserBalance();
            console.log('Set prev balances: ', result)
            await stakers[i].setPrevBalances(result.balance, result.available, result.staked, result.srps, result.roe);
          } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
          }
        };
      })

      it(`wait for ${SECONDSPERDAY} seconds`, async () => {
        await timeout(SECONDSPERDAY * 1000);
      })

    }
  })

})

