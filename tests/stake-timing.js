require('mocha')
const { expect } = require('chai')
const { create, all } = require('mathjs')
const { newUser, timeout, callFioApi, existingUser, createKeypair, getAccountFromKey, generateFioDomain, generateFioAddress, fetchJson} = require('../utils.js');
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

async function calcRoeBig(stakingRewardsActivated, combinedTokenPool, globalSrpCount, precision, printCalc) {
  if (printCalc) { console.log('\nROE CALC: '); }

  const roePrecision = math.bignumber(Math.pow(10, precision));
  let roeBig = math.bignumber(0);

  if (stakingRewardsActivated == 0) {
    roeBig = '1.000000000000000';
  } else {
    combinedTokenPoolBig = math.bignumber(combinedTokenPool);
    globalSrpCountBig = math.bignumber(globalSrpCount);
    if (printCalc) {
      console.log('   combinedTokenPool: \t', combinedTokenPool);
      console.log('   combinedTokenPoolBig: ', combinedTokenPoolBig);
      console.log('   globalSrpCount: \t', globalSrpCount);
      console.log('   globalSrpCountBig: \t', globalSrpCountBig);
    }

    // ############## There is a bug where the combinedtokenpool in the contract has a different value than what is in the staking table... Throws everything off.

    let roeBig1 = math.bignumber(0);
    roeBig1 = math.divide(combinedTokenPoolBig, globalSrpCountBig);
    if (printCalc) { console.log('   combinedTokenPoolBig / globalSrpCountBig = ' + combinedTokenPool + ' / ' + globalSrpCountBig + ' = ' + roeBig1); }
    roeBig2 = math.multiply(roeBig1, roePrecision);
    if (printCalc) { console.log('   result * precision = ' + roeBig1 + ' * ' + precision + ' = ' + roeBig2); }
    //roeBig3 = math.floor(roeBig2);
    //if (printCalc) { console.log('   math.floor(result) = ' + roeBig3); }

    // math.floor and Math.trunc returns round (bug?), so just converting to a string and splitting to do the truncation.
    const roeStr = roeBig2.toString();
    const roeStrTrunc = roeStr.split('.')[0];
    console.log('   roeStrTrunc: ', roeStrTrunc);
    roeTruncBig = math.bignumber(roeStrTrunc)
    if (printCalc) { console.log('   math.bignumber(roeStrTruncBig) = ', roeTruncBig); }

    roeBig = math.divide(roeTruncBig, roePrecision);
    if (printCalc) { console.log('   result / roePrecision = ' + roeTruncBig + ' / ' + roePrecision + ' = ' + roeBig); }
    
  }
  if (printCalc) { console.log('   return ', roeBig); }
  return roeBig;
}

async function calcRoeString(stakingRewardsActivated, roeBig) {
  let roeString = roeBig.toString();
  const roeStringLen = roeBig.toString().length;

  if (stakingRewardsActivated == 0) {
    roeString = '1.00000000000000';
  } else {
    if (roeStringLen > ROEBALANCEPRECISION + 2) {  // The +2 is for the "1."
      //truncate
      sliceSize = roeStringLen - ROEBALANCEPRECISION + 2;
      roeString = roeString.slice(0, -sliceSize);
    } else {
      // add zeros
      for (let i = 0; i < ROEBALANCEPRECISION + 2 - roeStringLen; i++) {
        roeString += "0";
      }
    }
  }
  return roeString;
}

const UNSTAKELOCKDURATIONSECONDS = config.UNSTAKELOCKDURATIONSECONDS;
const STAKINGREWARDSPERCENT = 0.25;
const ACTIVATIONTHRESHOLD = 1000000000000000  // 1M FIO
const DAILYSTAKINGMINTTHRESHOLD = 25000000000000  // 25K FIO
const STAKINGREWARDSRESERVEMAXIMUM = 25000000000000000 // 25M FIO
const ROEPRECISION = 18;
const ROEBALANCEPRECISION = 15;
const ASSERTPRECISION = 100;

// These need to add up to 10, otherwise the lock duration drifts over time
const WAIT1 = 1
const SECONDSPERDAY = config.SECONDSPERDAY - WAIT1;

let dailyRewards = {
  schedule: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
}

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
  bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
})

describe(`************************** stake-regression.js ************************** \n    A. Stake timing test.`, () => {

  let user1, transfer_tokens_pub_key_fee, generalLockUser
  let stakingTableExists = 0;

  let stakers = [];

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
  activationDay = 100; // 0 = Immediately activate
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
            
      if (stakingRewardsActivated == 0) {
        stakers[0] = new Staker();
        stakers[0].transferAmount = 1004000000000000  // 1,004,000 FIO
        stakers[0].stakeAmount = [2000000000000, 0, 1000000000000000, 0, 1000000000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        stakers[0].unstakeAmount = [0, 10000000000, 0, 0, 10000000000, 0, 310000000000, 0, 0, 0, 0, 0, 0, 0, 0]
        stakers[0].transferToken = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        //stakers[0].transferToken = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        await stakers[0].createSdk(faucet);
        //await stakers[0].createSdk(faucet, existingUser1.privateKey, existingUser1.publicKey, existingUser1.account, existingUser1.domain, existingUser1.address);
      } else {
        stakers[0] = new Staker();
        stakers[0].transferAmount = 9004000000000000  // 9,004,000 FIO
        stakers[0].stakeAmount = [100000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000]
        stakers[0].unstakeAmount = [0, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000]
        stakers[0].transferToken = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        await stakers[0].createSdk(faucet);
        //await stakers[0].createSdk(faucet, existingUser1.privateKey, existingUser1.publicKey, existingUser1.account, existingUser1.domain, existingUser1.address);

        //stakers[0] = new Staker();
        //stakers[0].transferAmount = 19004000000000000  // 9,004,000 FIO
        //stakers[0].stakeAmount = [11000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        //stakers[0].unstakeAmount = [0, 8000000000000000, 0, 0, 2000000000000000, 1000000000000000, 1000000000000000, 1000000000000000, 0, 0, 0, 0, 0, 0, 0]
        //stakers[0].transferToken = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        //stakers[0].transferToken = [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        //await stakers[0].createSdk(faucet);
        //await stakers[0].createSdk(faucet, existingUser1.privateKey, existingUser1.publicKey, existingUser1.account, existingUser1.domain, existingUser1.address);

        //stakers[0] = new Staker();
        //stakers[0].transferAmount = 4000000000000  // 4000 FIO
        //stakers[0].stakeAmount = [300000000000, 500000000000, 0, 0, 0, 0, 10000000000, 0, 0, 0, 0, 0, 0, 0, 0]
        //stakers[0].unstakeAmount = [0, 200000000000, 100000000000, 100000000000, 0, 100000000000, 100000000000, 0, 0, 0, 0, 0, 0, 0, 0]
        //stakers[0].transferToken = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        //await stakers[0].createSdk(faucet);

        //stakers[2] = new Staker();
        //stakers[2].transferAmount = 2000000000000000  // 2M FIO
        //stakers[2].stakeAmount = [2000000000000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        //stakers[2].unstakeAmount = [0, 1000000000000000, 20000000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        //stakers[0].transferToken = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        //await stakers[2].createSdk(faucet);
      };
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    };
    
  })

  it('Create test user', async () => {
    user1 = await newUser(faucet);
  })

  it.skip(`Create general Lock user`, async () => {
    try {   
      generalLockUser = await createKeypair();
      generalLockUser.account = await getAccountFromKey(keys.publicKey);

      //generalLockUser.sdk = new FIOSDK(generalLockUser.privateKey, generalLockUser.publicKey, config.BASE_URL, fetchJson);



      console.log("generalLockUser.privateKey, ", generalLockUser.privateKey);
      console.log("generalLockUser.publicKey ", generalLockUser.publicKey);
      console.log("generalLockUser.account ", generalLockUser.account);
      console.log("generalLockUser.domain ", generalLockUser.domain);
      console.log("generalLockUser.address ", generalLockUser.address);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    };
  })

  it.skip(`for staker[0] trnsloctoks with three periods to locksdk: 5000 FIO - 6 days, 4000 FIO - 7 days, and 1000 - 10 days`, async () => {
    try {
      const result = await faucet.genericAction('pushTransaction', {
        action: 'trnsloctoks',
        account: 'fio.token',
        data: {
          payee_public_key: generalLockUser.publicKey,
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
    } catch (err) {
      console.log('Error', err.json);
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

  it.skip('For general lock testing, create sdk for staker after the general lock transfer', async () => {
    await stakers[0].createSdk(faucet, generalLockUser.privateKey, generalLockUser.publicKey, generalLockUser.account, '', '');
    generalLockUser.domain = stakers[0].domain;
    generalLockUser.address = stakers[0].address;
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
        console.log('initial prev balances: ', result)

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
      console.log('Error', err.json.error);
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

      it.skip(`PREVENTS SRPS > AMOUNT BUG FROM HAPPENING. Transfer ${testTransferAmount} tokens from faucet to user1 to see if globals change...`, async () => {
        for (let i = 0; i < stakers.length; i++) {
          try {
            console.log('           ...for staker ', i);
            const result = await faucet.genericAction('transferTokens', {
              payeeFioPublicKey: user1.publicKey,
              amount: testTransferAmount,
              maxFee: config.maxFee,
              technologyProviderId: ''
            })
            //console.log('result: ', result)

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
        };
      });

      it.skip(`transfer ${testTransferAmount} tokens from staker to user1 to update lock table`, async () => {
        for (let i = 0; i < stakers.length; i++) {
          console.log('           ...for staker ', i);
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
          };
        };
      });

      it(`Update prev balances to current balances`, async () => {
        for (let i = 0; i < stakers.length; i++) {
          console.log('           ...for staker ' + i);
          const printCalc = false;

          const getBalance = await stakers[i].getUserBalance();

          const combinedTokenPool = await getCombinedTokenPool();
          const globalSrpCount = await getGlobalSrpCount();
          const stakingRewardsActivated = await getStakingRewardsActivated();
          const currentRoeBig = await calcRoeBig(stakingRewardsActivated, combinedTokenPool, globalSrpCount, ROEPRECISION, printCalc);
          const currentRoeInt = parseInt(currentRoeBig);

          await stakers[i].setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe, currentRoeInt);
          //await stakers[i].printPrevBalances();
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

            const printCalc = true;

            if (result.rows.length > 0) { // If the table is not empty
              const lockinfo = result.rows[0];
              if (printCalc) { console.log('\nEXPECTED AVAILABLE CALC:'); };
              console.log('Result get_table_rows locktokensv2: ', result);
              console.log('periods : ', result.rows[0].periods);

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

                console.log('           ...staker ' + i + ' unlocks ' + parseInt(unlockAmountBig));

                // FOR DEBUGGING
                //await stakers[i].printPrevBalances();
                await stakers[i].printCurrentBalances();


                const getBalance = await stakers[i].getUserBalance();
                if (printCalc) { console.log('getBalance: ', getBalance); };
                expect(getBalance.balance).to.equal(stakers[i].prevBalance)

                expect(getBalance.available).to.equal(expectedAvaialbleInt)
                //expect(getBalance.available).is.greaterThan(stakers[i].prevAvailable + unlockAmount - ASSERTPRECISION);
                //expect(getBalance.available).is.lessThan(stakers[i].prevAvailable + unlockAmount + ASSERTPRECISION);

                expect(getBalance.staked).to.equal(stakers[i].prevStaked)
                expect(getBalance.srps).to.equal(stakers[i].prevSrps)
              }
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
          const printCalc = false;

          const getBalance = await stakers[i].getUserBalance();

          const combinedTokenPool = await getCombinedTokenPool();
          const globalSrpCount = await getGlobalSrpCount();
          const stakingRewardsActivated = await getStakingRewardsActivated();
          const currentRoeBig = await calcRoeBig(stakingRewardsActivated, combinedTokenPool, globalSrpCount, ROEPRECISION, printCalc);
          const currentRoeInt = parseInt(currentRoeBig);

          await stakers[i].setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe, currentRoeInt);
          //await stakers[i].printPrevBalances();
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
        //await printPrevGlobals();
      });

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
              //await printPrevGlobals();
              //await stakers[i].printPrevBalances();
              //await printCurrentGlobals();
              //await stakers[i].printCurrentBalances();

              console.log('           ...Check that getFioBalance is correct after staking ');

              const getBalance = await stakers[i].getUserBalance();

              // We are using the ROE prior to staking to calculate all of the changes

              const printCalc = false;

              // true at end prints out the full calculation
              const prevRoeBig = await calcRoeBig(prevStakingRewardsActivated, prevCombinedTokenPool, prevGlobalSrpCount, ROEPRECISION, printCalc);
              if (printCalc) { console.log('\nAWARDS CALC:'); };
              if (printCalc) { console.log('   prevRoeBig = ', prevRoeBig); };

              const stakeAmountBig = math.bignumber(stakers[i].stakeAmount[dayNumber])
              let srpsToAwardBig = math.bignumber(0);
              srpsToAwardBig = math.divide(stakeAmountBig, prevRoeBig);
              if (printCalc) { console.log('   srpsToAwardBig = stakeAmount / ROE = ' + stakeAmountBig + ' / ' + prevRoeBig + ' = ' + srpsToAwardBig); };
 
              // math.floor and Math.trunc returns round (bug?), so just converting to a string and splitting to do the truncation.
              const srpsToAwardStr = srpsToAwardBig.toString();
              const srpsToAwardStrTrunc = srpsToAwardStr.split('.')[0];
              if (printCalc) { console.log('   srpsToAwardStrTrunc: ', srpsToAwardStrTrunc); };

              let srpsToAwardTruncBig = math.bignumber(srpsToAwardStrTrunc)
              if (printCalc) { console.log('   srpsToAwardTruncBig = math.bignumber(srpsToAwardStrTrunc) = ', srpsToAwardTruncBig); };

              let prevSrpsBig = math.bignumber(stakers[i].prevSrps);
              const newSrpsBig = math.add(prevSrpsBig, srpsToAwardTruncBig);
              if (printCalc) { console.log('   newSrpsBig = prevSrpsBig + srpsToAwardTruncBig = ' + prevSrpsBig + ' + ' + srpsToAwardTruncBig + ' = ' + newSrpsBig); };

              expect(getBalance.balance).to.equal(stakers[i].prevBalance);
              expect(getBalance.available).to.equal(stakers[i].prevAvailable - stakers[i].stakeAmount[dayNumber]);
              expect(getBalance.staked).to.equal(stakers[i].prevStaked + stakers[i].stakeAmount[dayNumber]);

              const newSrpsInt = parseInt(newSrpsBig);
              if (printCalc) { console.log('   newSrpsInt = parseInt(newSrpsBig) ', newSrpsInt); };
              //expect(getBalance.srps).to.equal(newSrpsInt);
              expect(getBalance.srps).is.greaterThan(newSrpsInt - ASSERTPRECISION);
              expect(getBalance.srps).is.lessThan(newSrpsInt + ASSERTPRECISION);

              //const prevRoeString = await calcRoeString(prevStakingRewardsActivated, prevRoeBig);
              //console.log('prevRoeString: ', prevRoeString)
              //expect(getBalance.roe).to.equal(prevRoeString);
              expect(parseFloat(getBalance.roe)).to.be.greaterThanOrEqual(parseFloat(stakers[i].prevRoe));
              
              console.log('\n           ...check that global staking variables are correct after staking ');

              expect(stakedTokenPool).to.equal(prevStakedTokenPool + stakers[i].stakeAmount[dayNumber]);
              expect(combinedTokenPool).to.equal(prevCombinedTokenPool + stakers[i].stakeAmount[dayNumber]);
              expect(rewardsTokenPool).to.equal(prevRewardsTokenPool);

              if (printCalc) { console.log('\nAWARDS CALC:'); }
              const prevGlobalSrpCountBig = math.bignumber(prevGlobalSrpCount);
              newSrpGlobalBig = math.add(prevGlobalSrpCountBig, srpsToAwardTruncBig);
              if (printCalc) { console.log('   newSrpGlobalBig = prevGlobalSrpCountBig + srpsToAwardTruncBig = ' + prevGlobalSrpCountBig + ' + ' + srpsToAwardTruncBig + ' = ' + newSrpGlobalBig); };

              const newSrpGlobalInt = parseInt(newSrpGlobalBig);
              //console.log('   newSrpGlobalInt: ', newSrpGlobalInt);
              //expect(globalSrpCount.toString()).to.equal(newSrpGlobalBig.toString());
              expect(globalSrpCount).is.greaterThan(newSrpGlobalInt - ASSERTPRECISION);
              expect(globalSrpCount).is.lessThan(newSrpGlobalInt + ASSERTPRECISION);

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
              console.log('\nStaking Error: ', err);
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
              //await printPrevGlobals();
              //await stakers[i].printPrevBalances();
              await printCurrentGlobals();
              await stakers[i].printCurrentBalances();

              const printCalc = false;
              
              console.log('\n           ...Check that getFioBalance is correct after unstake ');           

              const getBalance = await stakers[i].getUserBalance();
              
              // true at end outputs the full calculation logic to console.log
              const prevRoeBig = await calcRoeBig(prevStakingRewardsActivated, prevCombinedTokenPool, prevGlobalSrpCount, ROEPRECISION, printCalc);
                          
              if (printCalc) { console.log('\nAWARDS CALC:'); };
              if (printCalc) { console.log('   prevRoeBig = ', prevRoeBig); };

              const srpsPercentToClaim = math.divide(math.bignumber(stakers[i].unstakeAmount[dayNumber]), math.bignumber(stakers[i].prevStaked));
              const srpsToClaim = Math.trunc(srpsPercentToClaim * stakers[i].prevSrps);
              if (printCalc) { console.log('   srpsToClaim  trunc: ', srpsToClaim) };

              const srpsToClaimBig = math.bignumber(srpsToClaim)

              const fioClaimed = math.multiply(srpsToClaimBig, prevRoeBig);
              if (printCalc) { console.log('   fioClaimed: ', fioClaimed); };

              // Contract now does an explicit truncate
              const fioClaimedTrunc = Math.trunc(parseFloat(fioClaimed));
              if (printCalc) { console.log('   fioClaimedTrunc: ', fioClaimedTrunc); };

              // Reward amount is the FIO paid out minus the unstakeAmount
              
              const rewardAmountTotal = fioClaimedTrunc - stakers[i].unstakeAmount[dayNumber]
              if (printCalc) { console.log('   rewardAmountTotal: ', rewardAmountTotal); };
              
              const rewardAmountTpid = Math.trunc(rewardAmountTotal / 10);
              if (printCalc) { console.log('   rewardAmountTpid: ', rewardAmountTpid); };
              
              const rewardAmountStaker = 9 * rewardAmountTpid;
              if (printCalc) { console.log('   rewardAmountStaker: ', rewardAmountStaker); };

              stakers[i].prevRewardAmountStaker = rewardAmountStaker;

              // balance should increase by the 90% of reward amount based on the prevRoe (the roe prior to the unstaking)
              //expect(getBalance.balance).to.equal(stakers[i].prevBalance + rewardAmountStaker);
              expect(getBalance.balance).is.greaterThan(stakers[i].prevBalance + rewardAmountStaker - ASSERTPRECISION);
              expect(getBalance.balance).is.lessThan(stakers[i].prevBalance + rewardAmountStaker + ASSERTPRECISION);
              expect(getBalance.available).to.equal(stakers[i].prevAvailable);
              expect(getBalance.staked).to.equal(stakers[i].prevStaked - stakers[i].unstakeAmount[dayNumber]);
              //expect(getBalance.srps).to.equal(stakers[i].prevSrps - srpsToClaim);
              expect(getBalance.srps).is.greaterThan(stakers[i].prevSrps - srpsToClaim - ASSERTPRECISION);
              expect(getBalance.srps).is.lessThan(stakers[i].prevSrps - srpsToClaim + ASSERTPRECISION);

              const currentRoeString = await calcRoeString(prevStakingRewardsActivated, prevRoeBig);
              //expect(getBalance.roe).to.equal(currentRoeString);
              expect(parseFloat(getBalance.roe)).to.be.greaterThanOrEqual(parseFloat(stakers[i].prevRoe));

              console.log('\n           ...Check that global staking variables are correct after unstaking ');

              expect(stakedTokenPool).to.equal(prevStakedTokenPool - stakers[i].unstakeAmount[dayNumber]);
              // combinedTokenPool unstaking calculation: combinedTokenPool = prevcombinedTokenPool - unstakeAmount - payout from rewards token pool
              //expect(combinedTokenPool).to.equal(prevCombinedTokenPool - stakers[i].unstakeAmount[dayNumber] - rewardAmountStaker);
              expect(combinedTokenPool).is.greaterThan(prevCombinedTokenPool - stakers[i].unstakeAmount[dayNumber] - rewardAmountStaker - ASSERTPRECISION);
              expect(combinedTokenPool).is.lessThan(prevCombinedTokenPool - stakers[i].unstakeAmount[dayNumber] - rewardAmountStaker + ASSERTPRECISION);
              expect(rewardsTokenPool).to.equal(prevRewardsTokenPool);  // This is cumulative. It never decrements
              //expect(globalSrpCount).to.equal(Math.trunc(prevGlobalSrpCount - srpsToClaim));
              expect(globalSrpCount).is.greaterThan(prevGlobalSrpCount - srpsToClaim - ASSERTPRECISION);
              expect(globalSrpCount).is.lessThan(prevGlobalSrpCount - srpsToClaim + ASSERTPRECISION);
              expect(dailyStakingRewards).to.equal(prevDailyStakingRewards);
              expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted);
              expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated);

              // Need to set prev balances and globals for each user in the loop
              await stakers[i].setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe, getBalance.roe);
              await setPrevGlobals(stakedTokenPool, combinedTokenPool, rewardsTokenPool, globalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);

           } catch (err) {
              //console.log('Do unstaking Error: ', err);
              if (err.errorCode) {
                console.log('Do unstaking Error: ', err.json.error);
              } else {
                console.log('Do unstaking Error: ', err);
              }
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

              const printCalc = true;
              if (printCalc) { };

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
                
                const remainingLockAmountBig = math.bignumber(lockinfo.remaining_lock_amount);
                if (printCalc) { console.log('remainingLockAmountBig: ', remainingLockAmountBig); };

                if (currentNumberOfPeriods == stakers[i].prevNumberOfPeriods) {
                  //console.log('USE CASE 1')
                  // Add the new unstake amount and subtract the period=0 lock amount
                  for (period in lockinfo.periods) {
                    if (period == (currentNumberOfPeriods - 1)) {  // It is the final, just added, unstake lock period
                      // prevRewardAmountStaker comes from unstake and depends on ROE, so use ASSERTPRECISION
                      //expect(lockinfo.periods[period].amount).to.equal(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker);
                      expect(lockinfo.periods[period].amount).is.greaterThan(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - ASSERTPRECISION);
                      expect(lockinfo.periods[period].amount).is.lessThan(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker + ASSERTPRECISION);
                      durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY);
                      //expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 6).and.lessThan(durEstimate + 6);
                    } else {  // It is a previous lock that has a new period - 1
                      //console.log('typeof: ', typeof period);
                      newPeriod = parseInt(period) + 1;  // Hmmm, period is a string...
                      expect(lockinfo.periods[period].amount).to.equal(stakers[i].prevPeriods[newPeriod].amount);
                      expect(lockinfo.periods[period].duration).to.equal(stakers[i].prevPeriods[newPeriod].duration);
                    }
                  }
                  // prevRewardAmountStaker comes from unstake and depends on ROE, so use ASSERTPRECISION
                  //expect(lockinfo.lock_amount).to.equal(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - stakers[i].prevPeriods[0].amount);
                  expect(lockinfo.lock_amount).is.greaterThan(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - stakers[i].prevPeriods[0].amount - ASSERTPRECISION);
                  expect(lockinfo.lock_amount).is.lessThan(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - stakers[i].prevPeriods[0].amount + ASSERTPRECISION);
                  expect(lockinfo.remaining_lock_amount).to.equal(stakers[i].prevRemainingLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - stakers[i].prevPeriods[0].amount);
                } else if (currentNumberOfPeriods > stakers[i].prevNumberOfPeriods) {
                  //console.log('USE CASE 2')
                  for (period in lockinfo.periods) {
                    if (period == (currentNumberOfPeriods - 1)) {  // It is the final, just added, unstake lock period
                      // prevRewardAmountStaker comes from unstake and depends on ROE, so use ASSERTPRECISION
                      //expect(lockinfo.periods[period].amount).to.equal(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker);
                      expect(lockinfo.periods[period].amount).is.greaterThan(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - ASSERTPRECISION);
                      expect(lockinfo.periods[period].amount).is.lessThan(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker + ASSERTPRECISION);
                      durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY);
                      //expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 6).and.lessThan(durEstimate + 6);
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

                  // prevRewardAmountStaker comes from unstake and depends on ROE, so use ASSERTPRECISION
                  //expect(lockAmountBig.toString()).to.equal(expectedLockAmountBig.toString());
                  expect(parseInt(lockAmountBig)).is.greaterThan(parseInt(expectedLockAmountBig) - ASSERTPRECISION);
                  expect(parseInt(lockAmountBig)).is.lessThan(parseInt(expectedLockAmountBig) + ASSERTPRECISION);
                  // prevRewardAmountStaker comes from unstake and depends on ROE, so use ASSERTPRECISION
                  //expect(lockinfo.lock_amount).to.equal(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker);
                  expect(lockinfo.lock_amount).is.greaterThan(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - ASSERTPRECISION);
                  expect(lockinfo.lock_amount).is.lessThan(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker + ASSERTPRECISION);
                  // prevRewardAmountStaker comes from unstake and depends on ROE, so use ASSERTPRECISION
                  //expect(lockinfo.remaining_lock_amount).to.equal(stakers[i].prevRemainingLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker);
                  expect(lockinfo.remaining_lock_amount).is.greaterThan(stakers[i].prevRemainingLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - ASSERTPRECISION);
                  expect(lockinfo.remaining_lock_amount).is.lessThan(stakers[i].prevRemainingLockAmount + stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker + ASSERTPRECISION);
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
                      // prevRewardAmountStaker comes from unstake and depends on ROE, so use ASSERTPRECISION
                      //expect(lockinfo.periods[period].amount).to.equal(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker);
                      expect(lockinfo.periods[period].amount).is.greaterThan(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker - ASSERTPRECISION);
                      expect(lockinfo.periods[period].amount).is.lessThan(stakers[i].unstakeAmount[dayNumber] + stakers[i].prevRewardAmountStaker + ASSERTPRECISION);
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
              console.log('bpclaim Error', err.json);
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

