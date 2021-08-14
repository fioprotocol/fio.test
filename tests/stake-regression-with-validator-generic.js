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
  console.log('PREVIOUS GLOBALS');
  console.log('prevStakedTokenPool: ', prevStakedTokenPool);
  console.log('prevCombinedTokenPool: ', prevCombinedTokenPool);
  console.log('prevRewardsTokenPool: ', prevRewardsTokenPool);
  console.log('prevGlobalSrpCount: ', prevGlobalSrpCount);
  console.log('prevDailyStakingRewards: ', prevDailyStakingRewards);
  console.log('prevStakingRewardsReservesMinted: ', prevStakingRewardsReservesMinted);
  console.log('prevStakingRewardsActivated: ', prevStakingRewardsActivated);
}

async function truncate9DecimalString(number) {
  number *= 1000000000;
  number = Math.trunc(number) / 1000000000;
  number = number.toString();
  console.log('number = ', number)
  console.log('number.length = ', number.length)
  if (number.length < 11) {
    for (let i = 0; i < 11 - number.length; i++)  // If the number had zeros at the end, the need to be added to the string up to 9 decimal places
      number += "0";
  }
  return number
}

/********************* setting up these tests
 *
 *
 * 1. In fio.staking.cpp
 *
 * 1.1 To update the activation date to be in the past, change:
 *
 *    #define ENABLESTAKINGREWARDSEPOCHSEC  1627686000  //July 30 5:00PM MST 11:00PM GMT
 *
 *    to become a number that is in the past:
 *
 *    #define ENABLESTAKINGREWARDSEPOCHSEC  1628806929  //Thu Aug 12 16:22:09 MDT 2021
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
 *  2. Rebuild the contracts and restart your local chain.
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
 *   stakedTokenPool:  
 *   combinedTokenPool:
 *   rewardsTokenPool:
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



const UNSTAKELOCKDURATIONSECONDS = config.UNSTAKELOCKDURATIONSECONDS;
const STAKINGREWARDSPERCENT = 0.25;
const ACTIVATIONTHRESHOLD = 1000000000000000  // 1M FIO
const DAILYSTAKINGMINTTHRESHOLD = 25000000000000  // 25K FIO
const STAKINGREWARDSRESERVEMAXIMUM = 25000000000000000 // 25M FIO

// These need to add up to 10, otherwise the lock duration drifts over time
const WAIT1 = 1
const SECONDSPERDAY = config.SECONDSPERDAY - WAIT1;


describe(`************************** stake-regression.js ************************** \n    A. Stake timing test.`, () => {

  let user1, transfer_tokens_pub_key_fee

  const stakeAmount =   [300000000000, 500000000000,           0,           0, 0, 0, 10000000000,           0,           0, 200000000000]
  const unstakeAmount = [ 10000000000, 200000000000, 30000000000, 40000000000, 0, 0, 70000000000, 80000000000, 90000000000, 200000000000]
  
  totalDays = 10
  numusers = 1
  activationDay = 100; // Immediately activate staking if zero

  let xfer = 10000000000  // 10 FIO

  

  const transferAmount1 = 2000000000000  // 2000 FIO

  let staker = new Staker();

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

  it(`Create staker SDK object and register domain/address.`, async () => {
    await staker.createSdk(faucet);
  })

  it(`Transfer initial amount into staker account`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: staker.publicKey,
      amount: transferAmount1,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected');
  })

  it(`Staker votes for BP so they can stake.`, async () => {
    try {
      const result = await staker.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: staker.address,
          actor: staker.account,
          max_fee: config.maxFee
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err.json)
      expect(err).to.equal(null)
    }
  })

  it(`Set initial prev balances`, async () => {
    try {
      const result = await staker.getUserBalance();
      expect(result.available).to.equal(result.balance)
      expect(result.staked).to.equal(0)
      await staker.setPrevBalances(result.balance, result.available, result.staked, result.srps, result.roe);

      //await staker.printPrevBalances();

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Set initial previous lock periods (to be empty or zero)`, async () => {
    try {
      await staker.setPrevLockPeriods();
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Set initial global variable values`, async () => {
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

      //if (stakedTokenPool) {
        await setPrevGlobals(stakedTokenPool, combinedTokenPool, rewardsTokenPool, globalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);
      //} else {
        //await setPrevGlobals(); // Initialize to zero if table is empty
      //}

      //await printPrevGlobals();

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  describe(`Daily loop`, () => {

    for (let dayNumber = 0; dayNumber < totalDays; dayNumber++) {

      it(`New day`, async () => {
        console.log("            DAY #", dayNumber)
      })

      it(`If stake or unstake array has an empty value, set it to 0`, async () => {
        if (!stakeAmount[dayNumber]) { stakeAmount[dayNumber] = 0 }
        if (!unstakeAmount[dayNumber]) { unstakeAmount[dayNumber] = 0 }
      })

      it(`If we are beyond target activate day, and if not activated, have user1 vote then stake ${ACTIVATIONTHRESHOLD / 1000000000} tokens to activate`, async () => {
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

            // Now reset the 'prev' variables
            const result = await staker.getUserBalance();
            await staker.setPrevBalances(result.balance, result.available, result.staked, result.srps, result.roe);

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

            // TODO: check that activation sets these variables as expected.
            
            await setPrevGlobals(stakedTokenPool, combinedTokenPool, rewardsTokenPool, globalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);


          } catch (err) {
            console.log('Error', err.json);
            expect(err).to.equal(null);
          };
        };
      });

      /**
       * For each user:
       *   For each unlocking event: check locks, check balance
       *   For each staking event: stake, check balance, update globals
       *   For each unstaking event: unstake, check balance, check locks, update globals
       * 
       * Then do a final check of globals at the end of the day.
      */
      
      it(`Check if any unlock occurred today `, async () => {
        let currentSecs = new Date().getTime() / 1000

        try {
          const json = {
            json: true,
            code: 'eosio',
            scope: 'eosio',
            table: 'locktokensv2',
            lower_bound: staker.account,
            upper_bound: staker.account,
            key_type: 'i64',
            index_position: '2'
          }
          const result = await callFioApi("get_table_rows", json);

          if (result.rows.length > 0) { // If the table is not empty
            const lockinfo = result.rows[0];
            //console.log('Result: ', result);

            let expectedAvailable = staker.prevAvailable;
            let unlockAmount = 0;
            for (period in lockinfo.periods) {
              // If an unlock has occurred update expected Available balance and capture the unlockAmount
              unlockSecs = lockinfo.timestamp + lockinfo.periods[period].duration;
              if ((currentSecs >= unlockSecs) && (currentSecs < unlockSecs + SECONDSPERDAY)) {  // Need the && so you do not double count if the lock is not removed next round. Just remove locks for this day.
                expectedAvailable += lockinfo.periods[period].amount
                unlockAmount += lockinfo.periods[period].amount
              }
            }

            const getBalance = await staker.getUserBalance();
            //console.log(getBalance)
            expect(getBalance.balance).to.equal(staker.prevBalance)
            expect(getBalance.available).to.equal(expectedAvailable)
            expect(getBalance.staked).to.equal(staker.prevStaked)
            expect(getBalance.srps).to.equal(staker.prevSrps)

            const stakingRewardsActivated = await getStakingRewardsActivated();
            if (stakingRewardsActivated == 1) {
              const combinedTokenPool = await getCombinedTokenPool();
              const globalSrpCount = await getGlobalSrpCount();
              currentRoe = await truncate9DecimalString(combinedTokenPool / globalSrpCount);
              expect(getBalance.roe).to.equal(currentRoe);
            } else {
              expect(getBalance.roe).to.equal('1.000000000');
            }

            await staker.setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe);

          }

        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      })

      it(`transfer ${xfer} tokens from faucet to user1 to see if globals change...`, async () => {
        const result = await faucet.genericAction('transferTokens', {
          payeeFioPublicKey: user1.publicKey,
          amount: xfer,
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

          //console.log('stakedTokenPool: ', stakedTokenPool);
          //console.log('combinedTokenPool: ', combinedTokenPool);
          //console.log('rewardsTokenPool: ', rewardsTokenPool);
          //console.log('globalSrpCount: ', globalSrpCount);
          //console.log('dailyStakingRewards: ', dailyStakingRewards);
          //console.log('stakingRewardsReservesMinted: ', stakingRewardsReservesMinted);
          //console.log('stakingRewardsActivated: ', stakingRewardsActivated);

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

      it(`Do staking. Staker #${1} stakes ${stakeAmount[dayNumber] / 1000000000}`, async () => {
        if (stakeAmount[dayNumber] != 0) {
          try {
            const result = await staker.sdk.genericAction('pushTransaction', {
              action: 'stakefio',
              account: 'fio.staking',
              data: {
                fio_address: staker.address,
                amount: stakeAmount[dayNumber],
                actor: staker.account,
                max_fee: config.maxFee,
                tpid: ''
              }
            })
            expect(result.status).to.equal('OK')
          } catch (err) {
            console.log("Error : ", err.json)
            expect(err).to.equal(null);
          }
        }
      })

      it(`Check that getFioBalance is correct after staking`, async () => {
        try {
          //await staker.printPrevBalances();
          const combinedTokenPool = await getCombinedTokenPool();
          //console.log('combinedTokenPool: ', combinedTokenPool)
          const globalSrpCount = await getGlobalSrpCount();
          //console.log('globalSrpCount: ', globalSrpCount)

          const getBalance = await staker.getUserBalance();
          // Needed for the check on global staking variables
          currentRoe = parseInt(getBalance.roe);

          //console.log("RESULT: ", getBalance)
          expect(getBalance.balance).to.equal(staker.prevBalance);
          expect(getBalance.available).to.equal(staker.prevAvailable - stakeAmount[dayNumber]);
          expect(getBalance.staked).to.equal(staker.prevStaked + stakeAmount[dayNumber]);
          expect(getBalance.srps).to.equal(Math.trunc(staker.prevSrps + (stakeAmount[dayNumber] / getBalance.roe)));

          const stakingRewardsActivated = await getStakingRewardsActivated();
          if (stakingRewardsActivated == 1) {
            const combinedTokenPool = await getCombinedTokenPool();
            const globalSrpCount = await getGlobalSrpCount();
            currentRoe = await truncate9DecimalString(combinedTokenPool / globalSrpCount);
            expect(getBalance.roe).to.equal(currentRoe);
          } else {
            expect(getBalance.roe).to.equal('1.000000000');
          }
        
          await staker.setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      })

      it(`Check that global staking variables are correct after staking`, async () => {
        try {
          const stakedTokenPool = await getStakedTokenPool();
          const combinedTokenPool = await getCombinedTokenPool();
          const rewardsTokenPool = await getRewardsTokenPool();
          const globalSrpCount = await getGlobalSrpCount();
          const dailyStakingRewards = await getDailyStakingRewards();
          const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
          const stakingRewardsActivated = await getStakingRewardsActivated();

          //console.log('stakedTokenPool: ', stakedTokenPool);
          //console.log('combinedTokenPool: ', combinedTokenPool);
          //console.log('rewardsTokenPool: ', rewardsTokenPool);
          //console.log('globalSrpCount: ', globalSrpCount);
          //console.log('dailyStakingRewards: ', dailyStakingRewards);
          //console.log('stakingRewardsReservesMinted: ', stakingRewardsReservesMinted);
          //console.log('stakingRewardsActivated: ', stakingRewardsActivated);

          expect(stakedTokenPool).to.equal(prevStakedTokenPool + stakeAmount[dayNumber]);
          expect(combinedTokenPool).to.equal(prevCombinedTokenPool + stakeAmount[dayNumber]);
          expect(rewardsTokenPool).to.equal(prevRewardsTokenPool);
          //console.log('currentRoe: ', currentRoe)
          expect(globalSrpCount).to.equal(Math.trunc(prevGlobalSrpCount + (stakeAmount[dayNumber] / currentRoe)));
          expect(dailyStakingRewards).to.equal(prevDailyStakingRewards);
          expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted);
          expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated);

          await setPrevGlobals(stakedTokenPool, combinedTokenPool, rewardsTokenPool, globalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      });

      it(`Wait a few seconds.`, async () => { await timeout(WAIT1 * 1000) })

      it(`Do unstaking. Staker #${1} unstakes ${unstakeAmount[dayNumber] / 1000000000}`, async () => {
        if (unstakeAmount[dayNumber] != 0) {
          try {
            const result = await staker.sdk.genericAction('pushTransaction', {
              action: 'unstakefio',
              account: 'fio.staking',
              data: {
                fio_address: staker.address,
                amount: unstakeAmount[dayNumber],
                actor: staker.account,
                max_fee: config.maxFee,
                tpid: ''
              }
            });
            //console.log('Result: ', result)
            expect(result.status).to.equal('OK')
          } catch (err) {
            console.log('Error', err.json);
            expect(err).to.equal(null);
          }
        }
      })

      it(`Check that getFioBalance is correct after unstake`, async () => {
        try {
          //await staker.printPrevBalances();

          const result = await staker.getUserBalance();
          //console.log("RESULT: ", result)
          expect(result.balance).to.equal(staker.prevBalance);
          expect(result.available).to.equal(staker.prevAvailable);
          expect(result.staked).to.equal(staker.prevStaked - unstakeAmount[dayNumber]);
          expect(result.srps).to.equal(Math.trunc(staker.prevSrps - (staker.prevSrps * (unstakeAmount[dayNumber] / staker.prevStaked))));
          expect(result.roe).to.equal(staker.prevRoe);

          await staker.setPrevBalances(result.balance, result.available, result.staked, result.srps, result.roe);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      })

      it(`Check that global staking variables are correct after unstaking`, async () => {
        try {
          const stakedTokenPool = await getStakedTokenPool();
          const combinedTokenPool = await getCombinedTokenPool();
          const rewardsTokenPool = await getRewardsTokenPool();
          const globalSrpCount = await getGlobalSrpCount();
          const dailyStakingRewards = await getDailyStakingRewards();
          const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
          const stakingRewardsActivated = await getStakingRewardsActivated();

          //console.log('stakedTokenPool: ', stakedTokenPool);
          //console.log('combinedTokenPool: ', combinedTokenPool);
          //console.log('rewardsTokenPool: ', rewardsTokenPool);
          //console.log('globalSrpCount: ', globalSrpCount);
          //console.log('dailyStakingRewards: ', dailyStakingRewards);
          //console.log('stakingRewardsReservesMinted: ', stakingRewardsReservesMinted);
          //console.log('stakingRewardsActivated: ', stakingRewardsActivated);

          expect(stakedTokenPool).to.equal(prevStakedTokenPool - unstakeAmount[dayNumber]);
          expect(combinedTokenPool).to.equal(prevCombinedTokenPool - unstakeAmount[dayNumber]);
          expect(rewardsTokenPool).to.equal(prevRewardsTokenPool);
          expect(globalSrpCount).to.equal(Math.trunc(prevGlobalSrpCount - (staker.prevSrps * (unstakeAmount[dayNumber] / staker.prevStaked))));
          expect(dailyStakingRewards).to.equal(prevDailyStakingRewards);
          expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted);
          expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated);

          //await printPrevGlobals();

          await setPrevGlobals(stakedTokenPool, combinedTokenPool, rewardsTokenPool, globalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      });

      it(`Check that locktokensv2 locks are correct after unstake`, async () => {
        // Only run this if there was an unstake. 
        if (unstakeAmount[dayNumber] != 0) {
          try {
            const json = {
              json: true,
              code: 'eosio',
              scope: 'eosio',
              table: 'locktokensv2',
              lower_bound: staker.account,
              upper_bound: staker.account,
              key_type: 'i64',
              index_position: '2'
            }
            const result = await callFioApi("get_table_rows", json);
            const lockinfo = result.rows[0];
            console.log('Result: ', result);
            console.log('periods : ', result.rows[0].periods);
            

            // Only check locks if this account has an entry in locktokensv2
            if (staker.prevOwnerAccount != '') {

              // These items should not change. 
              expect(lockinfo.owner_account).to.equal(staker.prevOwnerAccount);
              expect(lockinfo.payouts_performed).to.equal(0);

              /**
               * Compare the current number of periods to prev number of periods.
               * Case 1: currentNumberOfPeriods == staker.prevNumberOfPeriods
               *  - We know only one unstake period was added, so this means one expired lock period was removed and one period was added.
               * Case 2: currentNumberOfPeriods > staker.prevNumberOfPeriods
               *  - This means a single unstake period was added and none were removed
               * Case 3: currentNumberOfPeriods < staker.prevNumberOfPeriods
               *  - This means 2 or more expired lock periods were removed, and one unstake period was added
              */

              const currentNumberOfPeriods = lockinfo.periods.length;

              if (currentNumberOfPeriods == staker.prevNumberOfPeriods) {
                // Add the new unstake amount and subtract the period=0 lock amount
                for (period in lockinfo.periods) {
                  if (period == (currentNumberOfPeriods - 1)) {  // It is the final, just added, unstake lock period
                    expect(lockinfo.periods[period].amount).to.equal(unstakeAmount[dayNumber]);
                    durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY);
                    //expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 6).and.lessThan(durEstimate + 6);
                  } else {  // It is a previous lock that has a new period - 1
                    //console.log('typeof: ', typeof period);
                    newPeriod = parseInt(period) + 1;  // Hmmm, period is a string...
                    expect(lockinfo.periods[period].amount).to.equal(staker.prevPeriods[newPeriod].amount);
                    expect(lockinfo.periods[period].duration).to.equal(staker.prevPeriods[newPeriod].duration);
                  }
                }
                expect(lockinfo.lock_amount).to.equal(staker.prevLockAmount + unstakeAmount[dayNumber] - staker.prevPeriods[0].amount);
                expect(lockinfo.remaining_lock_amount).to.equal(staker.prevRemainingLockAmount + unstakeAmount[dayNumber] - staker.prevPeriods[0].amount);
              } else if (currentNumberOfPeriods > staker.prevNumberOfPeriods) {
                for (period in lockinfo.periods) {
                  if (period == (currentNumberOfPeriods - 1)) {  // It is the final, just added, unstake lock period
                    expect(lockinfo.periods[period].amount).to.equal(unstakeAmount[dayNumber]);
                    durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY);
                    //expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 6).and.lessThan(durEstimate + 6);
                  } else {  // It is a previous lock that has not changed
                    expect(lockinfo.periods[period].amount).to.equal(staker.prevPeriods[period].amount);
                    expect(lockinfo.periods[period].duration).to.equal(staker.prevPeriods[period].duration);
                  }
                }
                expect(lockinfo.lock_amount).to.equal(staker.prevLockAmount + unstakeAmount[dayNumber]);
                expect(lockinfo.remaining_lock_amount).to.equal(staker.prevRemainingLockAmount + unstakeAmount[dayNumber]);
              } else { // currentNumberOfPeriods < staker.prevNumberOfPeriods
                numberOfRemovedPeriods = staker.prevNumberOfPeriods - currentNumberOfPeriods + 1
                // Add up all the removed amounts
                let totalAmount = 0;
                for (let i = 0; i < numberOfRemovedPeriods; i++) {
                  totalAmount += staker.prevPeriods[period].amount;
                }
                expect(lockinfo.lock_amount).to.equal(staker.prevLockAmount + unstakeAmount[dayNumber] - totalAmount);
                expect(lockinfo.remaining_lock_amount).to.equal(staker.prevRemainingLockAmount + unstakeAmount[dayNumber] - totalAmount);
                for (period in lockinfo.periods) {
                  if (period == currentNumberOfPeriods - 1) { // It is the final, just added, unstake lock period
                    expect(lockinfo.periods[period].amount).to.equal(unstakeAmount[dayNumber]);
                    durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY);
                    //expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 6).and.lessThan(durEstimate + 6);
                  } else {  // It is a previous lock that has a new (period - numberOfRemovedPeriods)
                    //console.log('typeof: ', typeof period);
                    newPeriod = parseInt(period) + numberOfRemovedPeriods;  // Hmmm, period is a string...
                    expect(lockinfo.periods[period].amount).to.equal(staker.prevPeriods[newPeriod].amount);
                    expect(lockinfo.periods[period].duration).to.equal(staker.prevPeriods[newPeriod].duration);
                  } 
                }
              };
            }

            await staker.setPrevLockPeriods(lockinfo.owner_account, lockinfo.lock_amount, lockinfo.payouts_performed, lockinfo.can_vote, lockinfo.periods, lockinfo.remaining_lock_amount, lockinfo.timestamp, lockinfo.periods.length);

          } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
          }
        }
      })

      it.skip(`Call bpclaim as bp1 to process daily staking rewards`, async () => {

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

      it.skip(`Check that global staking variables are correct after executing daily staking rewards`, async () => {
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

          if ((dailyStakingRewards < DAILYSTAKINGMINTTHRESHOLD) && (stakingRewardsReservesMinted < STAKINGREWARDSRESERVEMAXIMUM)) {
            expect(stakedTokenPool).to.equal(prevStakedTokenPool);
            expect(combinedTokenPool).to.equal(prevCombinedTokenPool);
            expect(rewardsTokenPool).to.equal(prevRewardsTokenPool);
            expect(globalSrpCount).to.equal(prevGlobalSrpCount);
            expect(dailyStakingRewards).to.equal(prevDailyStakingRewards);
            expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted);
            expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated);     
          } else {
            expect(stakedTokenPool).to.equal(prevStakedTokenPool);
            expect(combinedTokenPool).to.equal(prevCombinedTokenPool);
            expect(rewardsTokenPool).to.equal(prevRewardsTokenPool);
            expect(globalSrpCount).to.equal(prevGlobalSrpCount);
            expect(dailyStakingRewards).to.equal(prevDailyStakingRewards);
            expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted);
            expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated);
          }

          //await printPrevGlobals();

          await setPrevGlobals(stakedTokenPool, combinedTokenPool, rewardsTokenPool, globalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      });

      it(`waiting ${SECONDSPERDAY} seconds for next day`, async () => {
        wait(SECONDSPERDAY * 1000)
      })

    }
  })

})

