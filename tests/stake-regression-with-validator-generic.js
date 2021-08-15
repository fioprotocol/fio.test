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
 * 
 * 
 * 
 * TBD********
 * 
 *  *  Next change the foundation account to be one of the accounts we use to test:
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


TODO: figure out greaterthan issue
TODO: check if unstake is greater than staking remaining and confirm correct error.
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

  const stakers = [];
  const totalDays = 10
  activationDay = 100; // 0 = Immediately activate
  const xfer = 10000000000  // 10 FIO
  const transferAmount1 = 2000000000000  // 2000 FIO

  it('Create staking users', async () => {
    stakers[0] = new Staker();
    stakers[0].stakeAmount = [300000000000, 500000000000, 0, 0, 0, 0, 10000000000, 0, 0, 200000000000]
    stakers[0].unstakeAmount = [10000000000, 20000000000, 30000000000, 40000000000, 50000000000, 60000000000, 70000000000, 80000000000, 90000000000, 20000000000]
    await stakers[0].createSdk(faucet);

    stakers[1] = new Staker();
    stakers[1].stakeAmount = [300000000000, 500000000000, 0, 0, 0, 0, 10000000000, 0, 0, 200000000000]
    stakers[1].unstakeAmount = [0, 0, 0, 0, 0, 0, 0, 0, 90000000000, 20000000000]
    await stakers[1].createSdk(faucet);
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

  it(`Transfer initial amount into staker accounts, and vote for BP so they can stake`, async () => {
    for (let i = 0; i < stakers.length; i++) {
      console.log('           ...for staker ', i);
      const result = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: stakers[i].publicKey,
        amount: transferAmount1,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      });
      expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected');
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
        // console.log('Result: ', result)
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
        expect(result.available).to.equal(result.balance);
        expect(result.staked).to.equal(0);
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
      console.log('           ...for staker ', i);
      try {
        await stakers[i].setPrevLockPeriods();
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
    };
  })

  it(`Set global variable values`, async () => {
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
          console.log('           ...for staker ', i);
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
              //console.log('Result: ', result);

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

              const getBalance = await stakers[i].getUserBalance();
              console.log(getBalance)
              expect(getBalance.balance).to.equal(stakers[i].prevBalance)
              expect(getBalance.available).to.equal(expectedAvailable)
              expect(getBalance.staked).to.equal(stakers[i].prevStaked)
              expect(getBalance.srps).to.equal(stakers[i].prevSrps)

              const stakingRewardsActivated = await getStakingRewardsActivated();
              if (stakingRewardsActivated == 1) {
                const combinedTokenPool = await getCombinedTokenPool();
                const globalSrpCount = await getGlobalSrpCount();
                currentRoe = await truncate9DecimalString(combinedTokenPool / globalSrpCount);
                expect(getBalance.roe).to.equal(currentRoe);
              } else {
                expect(getBalance.roe).to.equal('1.000000000');
              }

              await stakers[i].setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe);

            }

          } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
          }
        };
      })

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

              console.log('           ...Check that getFioBalance is correct after staking ');

              const stakedTokenPool = await getStakedTokenPool();
              const combinedTokenPool = await getCombinedTokenPool();
              const rewardsTokenPool = await getRewardsTokenPool();
              const globalSrpCount = await getGlobalSrpCount();
              const dailyStakingRewards = await getDailyStakingRewards();
              const stakingRewardsReservesMinted = await getStakingRewardsReservesMinted();
              const stakingRewardsActivated = await getStakingRewardsActivated();

              const getBalance = await stakers[i].getUserBalance();
              // Needed for the check on global staking variables
              currentRoe = parseInt(getBalance.roe);

              //console.log("RESULT: ", getBalance)
              expect(getBalance.balance).to.equal(stakers[i].prevBalance);
              expect(getBalance.available).to.equal(stakers[i].prevAvailable - stakers[i].stakeAmount[dayNumber]);
              expect(getBalance.staked).to.equal(stakers[i].prevStaked + stakers[i].stakeAmount[dayNumber]);
              expect(getBalance.srps).to.equal(Math.trunc(stakers[i].prevSrps + (stakers[i].stakeAmount[dayNumber] / getBalance.roe)));

              if (stakingRewardsActivated == 1) {
                currentRoe = await truncate9DecimalString(combinedTokenPool / globalSrpCount);
                expect(getBalance.roe).to.equal(currentRoe);
              } else {
                expect(getBalance.roe).to.equal('1.000000000');
              }
        
              await stakers[i].setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe);

              console.log('           ...check that global staking variables are correct after staking ');

              console.log('stakedTokenPool: ', stakedTokenPool);
              console.log('combinedTokenPool: ', combinedTokenPool);
              console.log('rewardsTokenPool: ', rewardsTokenPool);
              console.log('globalSrpCount: ', globalSrpCount);
              console.log('dailyStakingRewards: ', dailyStakingRewards);
              console.log('stakingRewardsReservesMinted: ', stakingRewardsReservesMinted);
              console.log('stakingRewardsActivated: ', stakingRewardsActivated);

              expect(stakedTokenPool).to.equal(prevStakedTokenPool + stakers[i].stakeAmount[dayNumber]);
              expect(combinedTokenPool).to.equal(prevCombinedTokenPool + stakers[i].stakeAmount[dayNumber]);
              expect(rewardsTokenPool).to.equal(prevRewardsTokenPool);
              //console.log('currentRoe: ', currentRoe)
              //expect(globalSrpCount).to.equal(Math.trunc(prevGlobalSrpCount + (stakers[i].stakeAmount[dayNumber] / currentRoe)));
              expect(dailyStakingRewards).to.equal(prevDailyStakingRewards);
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

      it(`Wait a few seconds.`, async () => { await timeout(WAIT1 * 1000) })

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

              console.log('           ...Check that getFioBalance is correct after unstake ');
              //await stakers[i].printPrevBalances();

              const getBalance = await stakers[i].getUserBalance();
              //console.log("RESULT: ", getBalance)
              expect(getBalance.balance).to.equal(stakers[i].prevBalance);
              expect(getBalance.available).to.equal(stakers[i].prevAvailable);
              expect(getBalance.staked).to.equal(stakers[i].prevStaked - stakers[i].unstakeAmount[dayNumber]);
              expect(getBalance.srps).to.equal(Math.trunc(stakers[i].prevSrps - (stakers[i].prevSrps * (stakers[i].unstakeAmount[dayNumber] / stakers[i].prevStaked))));
              expect(getBalance.roe).to.equal(stakers[i].prevRoe);

              await stakers[i].setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe);

              console.log('           ...Check that global staking variables are correct after unstaking ');
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

              expect(stakedTokenPool).to.equal(prevStakedTokenPool - stakers[i].unstakeAmount[dayNumber]);
              expect(combinedTokenPool).to.equal(prevCombinedTokenPool - stakers[i].unstakeAmount[dayNumber]);
              expect(rewardsTokenPool).to.equal(prevRewardsTokenPool);
              expect(globalSrpCount).to.equal(Math.trunc(prevGlobalSrpCount - (stakers[i].prevSrps * (stakers[i].unstakeAmount[dayNumber] / stakers[i].prevStaked))));
              expect(dailyStakingRewards).to.equal(prevDailyStakingRewards);
              expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted);
              expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated);

              //await printPrevGlobals();

              await setPrevGlobals(stakedTokenPool, combinedTokenPool, rewardsTokenPool, globalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);
            } catch (err) {
              console.log('Error', err.json);
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
              console.log('Result: ', result);
              console.log('periods : ', result.rows[0].periods);
            

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
                  // Add the new unstake amount and subtract the period=0 lock amount
                  for (period in lockinfo.periods) {
                    if (period == (currentNumberOfPeriods - 1)) {  // It is the final, just added, unstake lock period
                      expect(lockinfo.periods[period].amount).to.equal(stakers[i].unstakeAmount[dayNumber]);
                      durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY);
                      //expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 6).and.lessThan(durEstimate + 6);
                    } else {  // It is a previous lock that has a new period - 1
                      //console.log('typeof: ', typeof period);
                      newPeriod = parseInt(period) + 1;  // Hmmm, period is a string...
                      expect(lockinfo.periods[period].amount).to.equal(stakers[i].prevPeriods[newPeriod].amount);
                      expect(lockinfo.periods[period].duration).to.equal(stakers[i].prevPeriods[newPeriod].duration);
                    }
                  }
                  expect(lockinfo.lock_amount).to.equal(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] - stakers[i].prevPeriods[0].amount);
                  expect(lockinfo.remaining_lock_amount).to.equal(stakers[i].prevRemainingLockAmount + stakers[i].unstakeAmount[dayNumber] - stakers[i].prevPeriods[0].amount);
                } else if (currentNumberOfPeriods > stakers[i].prevNumberOfPeriods) {
                  for (period in lockinfo.periods) {
                    if (period == (currentNumberOfPeriods - 1)) {  // It is the final, just added, unstake lock period
                      expect(lockinfo.periods[period].amount).to.equal(stakers[i].unstakeAmount[dayNumber]);
                      durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY);
                      //expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 6).and.lessThan(durEstimate + 6);
                    } else {  // It is a previous lock that has not changed
                      expect(lockinfo.periods[period].amount).to.equal(stakers[i].prevPeriods[period].amount);
                      expect(lockinfo.periods[period].duration).to.equal(stakers[i].prevPeriods[period].duration);
                    }
                  }
                  expect(lockinfo.lock_amount).to.equal(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber]);
                  expect(lockinfo.remaining_lock_amount).to.equal(stakers[i].prevRemainingLockAmount + stakers[i].unstakeAmount[dayNumber]);
                } else { // currentNumberOfPeriods < stakers[i].prevNumberOfPeriods
                  numberOfRemovedPeriods = stakers[i].prevNumberOfPeriods - currentNumberOfPeriods + 1
                  // Add up all the removed amounts
                  let totalAmount = 0;
                  for (let i = 0; i < numberOfRemovedPeriods; i++) {
                    totalAmount += stakers[i].prevPeriods[period].amount;
                  }
                  expect(lockinfo.lock_amount).to.equal(stakers[i].prevLockAmount + stakers[i].unstakeAmount[dayNumber] - totalAmount);
                  expect(lockinfo.remaining_lock_amount).to.equal(stakers[i].prevRemainingLockAmount + stakers[i].unstakeAmount[dayNumber] - totalAmount);
                  for (period in lockinfo.periods) {
                    if (period == currentNumberOfPeriods - 1) { // It is the final, just added, unstake lock period
                      expect(lockinfo.periods[period].amount).to.equal(stakers[i].unstakeAmount[dayNumber]);
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
              console.log('Error', err);
              expect(err).to.equal(null);
            }
          }
        };
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

