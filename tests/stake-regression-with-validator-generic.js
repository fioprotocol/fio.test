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

  it('Get /transfer_tokens_pub_key fee', async () => {
    try {
      result = await user1.sdk.getFee('transfer_tokens_pub_key');
      transfer_tokens_pub_key_fee = result.fee;
      console.log('Transfer Fee: ', transfer_tokens_pub_key_fee)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it.skip(`Stake 1M tokens to activate`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: 1000000000000000,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
  })

  it(`Create staker SDK object and register domain/address.`, async () => {
    await staker.createSdk(faucet);
  })

  it(`Transfer initial amount into staker account`, async () => {
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: staker.publicKey,
      amount: transferAmount1,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
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

      await staker.printPrevBalances();

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

      if (stakedTokenPool) {
        console.log('here')
        await setPrevGlobals(stakedTokenPool, combinedTokenPool, rewardsTokenPool, globalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);
      } else {
        console.log('herexxx')
        await setPrevGlobals(); // Initialize to zero if table is empty
      }

      await printPrevGlobals();

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

      expect(stakedTokenPool).to.equal(prevStakedTokenPool);
      expect(combinedTokenPool).to.equal(prevCombinedTokenPool + STAKINGREWARDSPERCENT * transfer_tokens_pub_key_fee);
      expect(rewardsTokenPool).to.equal(prevRewardsTokenPool + STAKINGREWARDSPERCENT * transfer_tokens_pub_key_fee);
      expect(globalSrpCount).to.equal(prevGlobalSrpCount);
      expect(dailyStakingRewards).to.equal(prevDailyStakingRewards);
      expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted);
      expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated);

      await setPrevGlobals(stakedTokenPool, combinedTokenPool, rewardsTokenPool, globalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);
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

      expect(stakedTokenPool).to.equal(prevStakedTokenPool);
      expect(combinedTokenPool).to.equal(prevCombinedTokenPool + STAKINGREWARDSPERCENT * transfer_tokens_pub_key_fee);
      expect(rewardsTokenPool).to.equal(prevRewardsTokenPool + STAKINGREWARDSPERCENT * transfer_tokens_pub_key_fee);
      expect(globalSrpCount).to.equal(prevGlobalSrpCount);
      expect(dailyStakingRewards).to.equal(prevDailyStakingRewards);
      expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted);
      expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated);

      await setPrevGlobals(stakedTokenPool, combinedTokenPool, rewardsTokenPool, globalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  });


  describe(`Daily loop`, () => {

    for (let dayNumber = 0; dayNumber < totalDays; dayNumber++) {

      it(`New day`, async () => {
        console.log("            DAY #", dayNumber)
      })

      it(`If stake or unstake array has an empty value, set it to 0`, async () => {
        if (!stakeAmount[dayNumber]) { stakeAmount[dayNumber] = 0 }
        if (!unstakeAmount[dayNumber]) { unstakeAmount[dayNumber] = 0 }
      })

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
            console.log(getBalance)
            expect(getBalance.balance).to.equal(staker.prevBalance)
            expect(getBalance.available).to.equal(expectedAvailable)
            expect(getBalance.staked).to.equal(staker.prevStaked)
            expect(getBalance.srps).to.equal(staker.prevSrps)
            expect(getBalance.roe).to.equal('1.00000000000000000')

            await staker.setPrevBalances(getBalance.balance, getBalance.available, getBalance.staked, getBalance.srps, getBalance.roe);

          }

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

          expect(stakedTokenPool).to.equal(prevStakedTokenPool);
          expect(combinedTokenPool).to.equal(prevCombinedTokenPool + STAKINGREWARDSPERCENT * transfer_tokens_pub_key_fee);
          expect(rewardsTokenPool).to.equal(prevRewardsTokenPool + STAKINGREWARDSPERCENT * transfer_tokens_pub_key_fee);
          expect(globalSrpCount).to.equal(prevGlobalSrpCount);
          expect(dailyStakingRewards).to.equal(prevDailyStakingRewards);
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
          const result = await staker.getUserBalance(); 
          //console.log(result)
          expect(result.balance).to.equal(staker.prevBalance)
          expect(result.available).to.equal(staker.prevAvailable - stakeAmount[dayNumber])
          expect(result.staked).to.equal(staker.prevStaked + stakeAmount[dayNumber])
          expect(result.srps).to.equal(staker.prevSrps + stakeAmount[dayNumber] / result.roe)
          expect(result.roe).to.equal('1.00000000000000000')
          currentRoe = result.roe;

          await staker.printPrevBalances();

          await staker.setPrevBalances(result.balance, result.available, result.staked, result.srps, result.roe);
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

          console.log('stakedTokenPool: ', stakedTokenPool);
          console.log('combinedTokenPool: ', combinedTokenPool);
          console.log('rewardsTokenPool: ', rewardsTokenPool);
          console.log('globalSrpCount: ', globalSrpCount);
          console.log('dailyStakingRewards: ', dailyStakingRewards);
          console.log('stakingRewardsReservesMinted: ', stakingRewardsReservesMinted);
          console.log('stakingRewardsActivated: ', stakingRewardsActivated);

          expect(stakedTokenPool).to.equal(prevStakedTokenPool + stakeAmount[dayNumber]);
          expect(combinedTokenPool).to.equal(prevCombinedTokenPool + stakeAmount[dayNumber]);
          //expect(rewardsTokenPool).to.equal(prevRewardsTokenPool);
          expect(globalSrpCount).to.equal(prevGlobalSrpCount + stakeAmount[dayNumber] / currentRoe);
          //expect(dailyStakingRewards).to.equal(prevDailyStakingRewards);
          //expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted);
          //expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated);

          

          await setPrevGlobals(stakedTokenPool, combinedTokenPool, rewardsTokenPool, globalSrpCount, dailyStakingRewards, stakingRewardsReservesMinted, stakingRewardsActivated);
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        }
      });

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
            })
            //console.log('Result: ', result)
            expect(result.status).to.equal('OK')
          } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
          }
        }
      })

      it(`Check that getFioBalance is correct after unstake`, async () => {
        try {
          const result = await staker.getUserBalance();
          //console.log(result)
          expect(result.balance).to.equal(staker.prevBalance)
          expect(result.available).to.equal(staker.prevAvailable)
          expect(result.staked).to.equal(staker.prevStaked - unstakeAmount[dayNumber])
          expect(result.srps).to.equal(staker.prevSrps - (staker.prevSrps * (unstakeAmount[dayNumber] / staker.prevStaked)))
          expect(result.roe).to.equal('1.00000000000000000')
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

          console.log('stakedTokenPool: ', stakedTokenPool);
          console.log('combinedTokenPool: ', combinedTokenPool);
          console.log('rewardsTokenPool: ', rewardsTokenPool);
          console.log('globalSrpCount: ', globalSrpCount);
          console.log('dailyStakingRewards: ', dailyStakingRewards);
          console.log('stakingRewardsReservesMinted: ', stakingRewardsReservesMinted);
          console.log('stakingRewardsActivated: ', stakingRewardsActivated);

          expect(stakedTokenPool).to.equal(prevStakedTokenPool - unstakeAmount[dayNumber]);
          expect(combinedTokenPool).to.equal(prevCombinedTokenPool - unstakeAmount[dayNumber]);
          //expect(rewardsTokenPool).to.equal(prevRewardsTokenPool);
          expect(globalSrpCount).to.equal(prevGlobalSrpCount - (staker.prevSrps * (unstakeAmount[dayNumber] / staker.prevStaked)));
          //expect(dailyStakingRewards).to.equal(prevDailyStakingRewards);
          //expect(stakingRewardsReservesMinted).to.equal(prevStakingRewardsReservesMinted);
          //expect(stakingRewardsActivated).to.equal(prevStakingRewardsActivated);

          await printPrevGlobals();

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
            //console.log('Result: ', result);
            //console.log('periods : ', result.rows[0].periods);
            

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
                    expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 5).and.lessThan(durEstimate + 5);
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
                    expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 5).and.lessThan(durEstimate + 5);
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
                    expect(lockinfo.periods[period].duration).is.greaterThan(durEstimate - 5).and.lessThan(durEstimate + 5);
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

      it(`waiting ${SECONDSPERDAY} seconds for next day`, async () => {
        wait(SECONDSPERDAY * 1000)
      })

    }
  })

  /*

      it(`success staker stakes ${stakeAmount2 / 1000000000} fio using tpid and auto proxy`, async () => {
        try {
          // console.log("address used ",staker.fiosdk.address)
          // console.log("account used ",staker.fiosdk.account)
          const result = await staker.sdk.genericAction('pushTransaction', {
            action: 'stakefio',
            account: 'fio.staking',
            data: {
              fio_address: staker.address,
              amount: stakeAmount2,
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
      })

  it(`validate unstake lock periods`, async () => {
    console.log(`[dbg] debug: 1, dayNumber: ${dayNumber}`);
    let expectedBalance = prevBalance;
    let expectedAvailable = prevBalance - stakeAmount1;
    let expectedStaked = stakeAmount1;
    let expectedSrps = prevSrps + stakeAmount1 / prevRoe;

    userA1 = await validator.validateStakingBalances(userA1, expectedBalance, expectedAvailable, expectedStaked, expectedSrps);
    // const result = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstake1, unstake1, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
    // expect(result.validUnlockPeriods).to.equal(false);
    prevBalance = userA1.balance.balance;
    prevAvailable = userA1.balance.available;
    prevStaked = userA1.balance.staked;
    prevSrps = userA1.balance.srps;
  });

  // it(`check getFioBalance for userA1`, async () => {
  //   try {
  //     const result = await userA1.sdk.genericAction('getFioBalance', {})
  //     //console.log(result)
  //     expect(result.balance).to.equal(prevBalance)
  //     expect(result.available).to.equal(prevBalance - stakeAmount1)
  //     expect(result.staked).to.equal(stakeAmount1)
  //     expect(result.srps).to.equal(prevSrps + stakeAmount1 / result.roe)
  //     expect(result.roe).to.equal('1.00000000000000000')
  //
  //     prevBalance = result.balance
  //     prevAvailable = result.available
  //     prevStaked = result.staked
  //     prevSrps = result.srps
  //
  //     // console.log(`[dbg] dayNumber: ${dayNumber}`);
  //     // let validPeriods = (await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstake1, unstake1, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps)).validUnlockPeriods;
  //     // expect(validPeriods).to.equal(false);
  //     // console.log(`[framework] init test: ${validPeriods}`);
  //
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })


  it(`failure, userA1 try to stake again, stake 9000 tokens, insufficient balance `, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA1.address,
          amount: 9000000000000,
          actor: userA1.account,
          max_fee: config.maxFee,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //  console.log('Error: ', err)
      expect(err.json.fields[0].error).to.contain('Insufficient balance')
    }
  })

  it(`failure, userA1 unstake 4000 FIO. Expect: cannot unstake more than staked `, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA1.address,
          amount: 4000000000000,
          actor: userA1.account,
          max_fee: config.maxFee,
          tpid:''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.not.equal('OK')
    } catch (err) {
      //console.log('Error: ', err)
      expect(err.json.fields[0].error).to.contain('Cannot unstake more than staked')
    }
  })

  it(`success, userA1 unstake ${unstake1/1000000000} tokens `, async () => {
    const result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA1.address,
        amount: unstake1,
        actor: userA1.account,
        max_fee: config.maxFee,
        tpid:''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`validate unstake lock periods`, async () => {
    console.log(`[dbg] debug: 2, dayNumber: ${dayNumber}`);
    let expectedBalance = prevBalance;
    let expectedAvailable = prevBalance - stakeAmount1;
    let expectedStaked = stakeAmount1 - unstake1;
    let expectedSrps = prevSrps - (prevSrps + (unstake1 / prevStaked));

    userA1 = await validator.validateStakingBalances(userA1, expectedBalance, expectedAvailable, expectedStaked, expectedSrps);
    // const result = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstake1, unstake1, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
    // expect(result.validUnlockPeriods).to.equal(true);
    prevBalance = userA1.balance.balance;
    prevAvailable = userA1.balance.available;
    prevStaked = userA1.balance.staked;
    prevSrps = userA1.balance.srps;
    // const validBals = await validator.validateStakingBalances(userA1, stakeAmount1, unstake1, unstake1, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
    // const result = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstake1, unstake1, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
    // expect(result.validUnlockPeriods).to.equal(true);
    // prevBalance = result.balance
    // prevAvailable = result.available
    // prevStaked = result.staked
    // prevSrps = result.srps
  });

  // it(`Call get_table_rows from locktokensv2 and confirm: one staking lock period added correctly`, async () => {
  //   try {
  //     const json = {
  //       json: true,
  //       code: 'eosio',
  //       scope: 'eosio',
  //       table: 'locktokensv2',
  //       lower_bound: userA1.account,
  //       upper_bound: userA1.account,
  //       key_type: 'i64',
  //       index_position: '2'
  //     }
  //     result = await callFioApi("get_table_rows", json);
  //     //console.log('Result: ', result);
  //     //console.log('periods : ', result.rows[0].periods)
  //     expect(result.rows[0].lock_amount).to.equal(unstake1)
  //     expect(result.rows[0].remaining_lock_amount).to.equal(unstake1)
  //     expect(result.rows[0].payouts_performed).to.equal(0)
  //     expect(result.rows[0].periods[0].amount).to.equal(unstake1)
  //     expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(UNSTAKELOCKDURATIONSECONDS)  // Hard to know this. It is 7 days + the time that has elapsed since the original record was created (the timestamp)
  //     lockDuration = result.rows[0].periods[0].duration  // Grab this to make sure it does not change later
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })


  it(`success , userA1 unstake ${unstake2 / 1000000000} tokens `, async () => {
    const result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA1.address,
        amount: unstake2,
        actor: userA1.account,
        max_fee: config.maxFee,
        tpid: ''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`validate unstake lock periods`, async () => {
    console.log(`[dbg] debug: 3, dayNumber: ${dayNumber}`);
    let expectedBalance = prevBalance;
    let expectedAvailable = prevBalance - stakeAmount1;
    let expectedStaked = prevStaked - unstake2;
    let expectedSrps = prevSrps - (prevSrps * (unstake2 / prevStaked));

    userA1 = await validator.validateStakingBalances(userA1, expectedBalance, expectedAvailable, expectedStaked, expectedSrps);
    let expectedLockAmt = unstake1 + unstake2;
    let expectedRemainingLockAmt = unstake1 + unstake2;
    let expectedPayouts = 0;
    let expectedDuration = lockDuration;
    let periodAmounts = [unstake1, unstake2];

    //TODO: some calls to validateStakingLockPeriods in this test suite may still have incorrect args,
    // make these match the new method signature by setting expected test values (above) and passing them as args
    const result = await validator.validateStakingLockPeriods(expectedLockAmt, expectedRemainingLockAmt, expectedPayouts, expectedDuration, periodAmounts);   //(userA1, stakeAmount1, unstake1, unstake1, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
    expect(result.validUnlockPeriods).to.equal(true);
    prevBalance = result.balance.balance;
    prevAvailable = result.balance.available;
    prevStaked = result.balance.staked;
    prevSrps = result.balance.srps;

    // let unstakeTotal = unstake1+unstake2;
    // const validBals = await validator.validateStakingBalances(userA1, stakeAmount1, unstakeTotal, unstake1, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
    // const result = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake2, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
    // expect(result).to.equal(true);
    // prevBalance = result.balance
    // prevAvailable = result.available
    // prevStaked = result.staked
    // prevSrps = result.srps
  });

  // it(`getFioBalance for userA1`, async () => {
  //   try {
  //     const result = await userA1.sdk.genericAction('getFioBalance', {})
  //     //console.log(result)
  //     expect(result.balance).to.equal(prevBalance)
  //     expect(result.available).to.equal(prevBalance - stakeAmount1)
  //     expect(result.staked).to.equal(prevStaked - unstake2)
  //     expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake2 / prevStaked)))
  //     expect(result.roe).to.equal('1.00000000000000000')
  //
  //     prevBalance = result.balance
  //     prevAvailable = result.available
  //     prevStaked = result.staked
  //     prevSrps = result.srps
  //
  //     // let unstakeTotal = unstake1+unstake2;
  //     // let testytest = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake2, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
  //     // console.log(`[framework] test #2: ${testytest}`);
  //
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })

  // it(`call get_table_rows from locktokensv2 and confirm: one staking lock period added correctly`, async () => {
  //   try {
  //     const json = {
  //       json: true,
  //       code: 'eosio',
  //       scope: 'eosio',
  //       table: 'locktokensv2',
  //       lower_bound: userA1.account,
  //       upper_bound: userA1.account,
  //       key_type: 'i64',
  //       index_position: '2'
  //     }
  //     result = await callFioApi("get_table_rows", json);
  //     //console.log('Result: ', result);
  //     //console.log('periods : ', result.rows[0].periods)
  //     expect(result.rows[0].lock_amount).to.equal(unstake1 + unstake2)
  //     expect(result.rows[0].remaining_lock_amount).to.equal(unstake1 + unstake2)
  //     expect(result.rows[0].payouts_performed).to.equal(0)
  //     expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2)
  //     expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })

  it(`waiting ${SECONDSPERDAY} seconds for unlock`, async () => {
    dayNumber++;
    console.log("            DAY #" + dayNumber + ": waiting " + SECONDSPERDAY + " seconds ")
  })

  it(`wait ${SECONDSPERDAY} seconds`, async () => {
    try {
      wait(SECONDSPERDAY * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`success. userA1 vote for producer to trigger locktokensv2 update.`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: userA1.address,
          actor: userA1.account,
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

  it(`validate unstake lock periods`, async () => {
    console.log(`[dbg] debug: 4, dayNumber: ${dayNumber}`);   //this seems to be day 1
    let unstakeTotal = unstake1+unstake2;
    // let expectedBalance = prevBalance;
    // let expectedAvailable = prevBalance - stakeAmount1;
    // let expectedStaked = prevStaked - unstake1;
    // let expectedSrps = prevSrps - (prevSrps * (unstake2 / prevStaked));

    // userA1 = await validator.validateStakingBalances(userA1, expectedBalance, expectedAvailable, expectedStaked, expectedSrps);
    const result = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake2, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
    expect(result.validUnlockPeriods).to.equal(true);
    prevBalance = result.balance.balance;
    prevAvailable = result.balance.available;
    prevStaked = result.balance.staked;
    prevSrps = result.balance.srps;
    // let unstakeTotal = unstake1+unstake2;
    // const result = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake2, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
    // expect(result.validUnlockPeriods).to.equal(true);
    // prevBalance = result.balance
    // prevAvailable = result.available
    // prevStaked = result.staked
    // prevSrps = result.srps
  });

  // it(`call get_table_rows from locktokensv2. Expect: No Change`, async () => {
  //   try {
  //     const json = {
  //       json: true,
  //       code: 'eosio',
  //       scope: 'eosio',
  //       table: 'locktokensv2',
  //       lower_bound: userA1.account,
  //       upper_bound: userA1.account,
  //       key_type: 'i64',
  //       index_position: '2'
  //     }
  //     result = await callFioApi("get_table_rows", json);
  //     //console.log('Result: ', result);
  //     //console.log('periods : ', result.rows[0].periods)
  //     expect(result.rows[0].lock_amount).to.equal(unstake1 + unstake2)
  //     expect(result.rows[0].remaining_lock_amount).to.equal(unstake1 + unstake2)
  //     expect(result.rows[0].payouts_performed).to.equal(0)
  //     expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2)
  //     expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })

  it(`success , userA1 unstake ${unstake3 / 1000000000} tokens `, async () => {
    const result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA1.address,
        amount: unstake3,
        actor: userA1.account,
        max_fee: config.maxFee,
        tpid: ''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`validate unstake lock periods`, async () => {
    console.log(`[dbg] debug: 5, dayNumber: ${dayNumber}`);
    let expectedBalance = prevBalance;
    let expectedAvailable = prevAvailable;
    let expectedStaked = prevStaked - unstake3;
    let expectedSrps = prevSrps - (prevSrps * (unstake3 / prevStaked));
    let unstakeTotal = unstake1+unstake2+unstake3;

    userA1 = await validator.validateStakingBalances(userA1, expectedBalance, expectedAvailable, expectedStaked, expectedSrps);
    const result = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake3, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
    expect(result.validUnlockPeriods).to.equal(true);
    prevBalance = result.balance.balance;
    prevAvailable = result.balance.available;
    prevStaked = result.balance.staked;
    prevSrps = result.balance.srps;
    // let unstakeTotal = unstake1+unstake2+unstake3;
    // const result = (await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake3, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps)).validUnlockPeriods;
    // expect(result.validUnlockPeriods).to.equal(true);
    // prevBalance = result.balance
    // prevAvailable = result.available
    // prevStaked = result.staked
    // prevSrps = result.srps
  });

  // it(`getFioBalance for userA1`, async () => {
  //   try {
  //     const result = await userA1.sdk.genericAction('getFioBalance', {})
  //     //console.log(result)
  //     expect(result.balance).to.equal(prevBalance)
  //     expect(result.available).to.equal(prevAvailable)
  //     expect(result.staked).to.equal(prevStaked - unstake3)
  //     expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake3 / prevStaked)))
  //     expect(result.roe).to.equal('1.00000000000000000')
  //
  //     prevBalance = result.balance
  //     prevAvailable = result.available
  //     prevStaked = result.staked
  //     prevSrps = result.srps
  //
  //     // let unstakeTotal = unstake1+unstake2+unstake3;
  //     // let testytest = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake3, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
  //     // console.log(`[framework] test #3: ${testytest}`);
  //
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })

  // it(`call get_table_rows from locktokensv2 and confirm: lock_amount and remaining_lock_amount updated, 2nd staking lock period added correctly`, async () => {
  //   try {
  //     const json = {
  //       json: true,
  //       code: 'eosio',
  //       scope: 'eosio',
  //       table: 'locktokensv2',
  //       lower_bound: userA1.account,
  //       upper_bound: userA1.account,
  //       key_type: 'i64',
  //       index_position: '2'
  //     }
  //     result = await callFioApi("get_table_rows", json);
  //     //console.log('Result: ', result);
  //     //console.log('periods : ', result.rows[0].periods)
  //     expect(result.rows[0].lock_amount).to.equal(unstake1 + unstake2 + unstake3)
  //     expect(result.rows[0].remaining_lock_amount).to.equal(unstake1 + unstake2 + unstake3)
  //     expect(result.rows[0].payouts_performed).to.equal(0)
  //     expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2)
  //     expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
  //     expect(result.rows[0].periods[1].amount).to.equal(unstake3)
  //     durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY)
  //     expect(result.rows[0].periods[1].duration).is.greaterThan(durEstimate - 3).and.lessThan(durEstimate + 3);  // Duration is approximate
  //     durActual1 = result.rows[0].periods[1].duration
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })

  it(`success userA1 stake ${stakeAmount2 / 1000000000} fio using tpid and auto proxy`, async () => {
    try {
      // console.log("address used ",userA1.address)
      // console.log("account used ",userA1.account)
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA1.address,
          amount: stakeAmount2,
          actor: userA1.account,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err)
      expect(err).to.equal(null);
    }
  })

  it(`getFioBalance for userA1`, async () => {
    try {
      const result = await validator.getUserBalance(userA1); //userA1.sdk.genericAction('getFioBalance', {})
      //console.log(result)
      expect(result.balance).to.equal(prevBalance)
      expect(result.available).to.equal(prevAvailable - stakeAmount2)
      expect(result.staked).to.equal(prevStaked + stakeAmount2)
      expect(result.srps).to.equal(prevSrps + stakeAmount2 / result.roe)
      expect(result.roe).to.equal('1.00000000000000000')

      prevBalance = result.balance
      prevAvailable = result.available
      prevStaked = result.staked
      prevSrps = result.srps
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`success, userA1 unstake ${unstake4 / 1000000000} tokens `, async () => {
    const result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA1.address,
        amount: unstake4,
        actor: userA1.account,
        max_fee: config.maxFee,
        tpid: ''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`validate unstake lock periods`, async () => {
    console.log(`[dbg] debug: 6, dayNumber: ${dayNumber}`);
    let expectedBalance = prevBalance;
    let expectedAvailable = prevAvailable;
    let expectedStaked = prevStaked - unstake4;
    let expectedSrps = prevSrps - (prevSrps * (unstake4 / prevStaked));
    let unstakeTotal = unstake1+unstake2+unstake3+unstake4;

    userA1 = await validator.validateStakingBalances(userA1, expectedBalance, expectedAvailable, expectedStaked, expectedSrps);
    const result = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake4, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
    expect(result.validUnlockPeriods).to.equal(true);
    prevBalance = result.balance.balance;
    prevAvailable = result.balance.available;
    prevStaked = result.balance.staked;
    prevSrps = result.balance.srps;
    // const result = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake4, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
    // expect(result.validUnlockPeriods).to.equal(true);
    // prevBalance = result.balance
    // prevAvailable = result.available
    // prevStaked = result.staked
    // prevSrps = result.srps
  });

  // it(`getFioBalance for userA1`, async () => {
  //   try {
  //     const result = await userA1.sdk.genericAction('getFioBalance', {})
  //     //console.log(result)
  //     expect(result.balance).to.equal(prevBalance)
  //     expect(result.available).to.equal(prevAvailable)
  //     expect(result.staked).to.equal(prevStaked - unstake4)
  //     expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake4 / prevStaked)))
  //     expect(result.roe).to.equal('1.00000000000000000')
  //
  //     prevBalance = result.balance
  //     prevAvailable = result.available
  //     prevStaked = result.staked
  //     prevSrps = result.srps
  //
  //     // let unstakeTotal = unstake1+unstake2+unstake3+unstake4;
  //     // let testytest = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake4, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
  //     // console.log(`[framework] test #4: ${testytest}`);
  //
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })

  // it(`call get_table_rows from locktokensv2 and confirm: lock_amount and remaining_lock_amount updated, 2nd staking lock period added correctly`, async () => {
  //   try {
  //     const json = {
  //       json: true,
  //       code: 'eosio',
  //       scope: 'eosio',
  //       table: 'locktokensv2',
  //       lower_bound: userA1.account,
  //       upper_bound: userA1.account,
  //       key_type: 'i64',
  //       index_position: '2'
  //     }
  //     result = await callFioApi("get_table_rows", json);
  //     //console.log('Result: ', result);
  //     //console.log('periods : ', result.rows[0].periods)
  //     expect(result.rows[0].lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4)
  //     expect(result.rows[0].remaining_lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4)
  //     expect(result.rows[0].payouts_performed).to.equal(0)
  //     expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2)
  //     expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
  //     expect(result.rows[0].periods[1].amount).to.equal(unstake3 + unstake4)
  //     expect(result.rows[0].periods[1].duration).to.equal(durActual1);
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })

  it(`waiting ${SECONDSPERDAY} seconds for unlock`, async () => {
    dayNumber++;
    console.log("            DAY #" + dayNumber + ": waiting " + SECONDSPERDAY + " seconds ")
  })

  it(`wait ${SECONDSPERDAY} seconds`, async () => {
    try {
      wait(SECONDSPERDAY * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`success, userA1 unstake ${unstake5 / 1000000000} tokens `, async () => {
    const result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA1.address,
        amount: unstake5,
        actor: userA1.account,
        max_fee: config.maxFee,
        tpid: ''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`validate unstake lock periods`, async () => {
    console.log(`[dbg] debug: 7, dayNumber: ${dayNumber}`);
    let expectedBalance = prevBalance;
    let expectedAvailable = prevAvailable;
    let expectedStaked = prevStaked - unstake5;
    let expectedSrps = prevSrps - (prevSrps * (unstake5 / prevStaked));
    let unstakeTotal = unstake1+unstake2+unstake3+unstake4+unstake5;

    userA1 = await validator.validateStakingBalances(userA1, expectedBalance, expectedAvailable, expectedStaked, expectedSrps);
    const result = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake5, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
    expect(result.validUnlockPeriods).to.equal(true);
    prevBalance = result.balance.balance;
    prevAvailable = result.balance.available;
    prevStaked = result.balance.staked;
    prevSrps = result.balance.srps;
  });

  // it(`getFioBalance for userA1`, async () => {
  //   try {
  //     const result = await userA1.sdk.genericAction('getFioBalance', {})
  //     //console.log(result)
  //     expect(result.balance).to.equal(prevBalance)
  //     expect(result.available).to.equal(prevAvailable)
  //     expect(result.staked).to.equal(prevStaked - unstake5)
  //     expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake5 / prevStaked)))
  //     expect(result.roe).to.equal('1.00000000000000000')
  //
  //     prevBalance = result.balance
  //     prevAvailable = result.available
  //     prevStaked = result.staked
  //     prevSrps = result.srps
  //
  //     // let unstakeTotal = unstake1+unstake2+unstake3+unstake4+unstake5;
  //     // let testytest = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake5, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
  //     // console.log(`[framework] test #5: ${testytest}`);
  //
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })

  // it(`call get_table_rows from locktokensv2 and confirm: lock_amount and remaining_lock_amount updated, 2nd staking lock period added correctly`, async () => {
  //   try {
  //     const json = {
  //       json: true,
  //       code: 'eosio',
  //       scope: 'eosio',
  //       table: 'locktokensv2',
  //       lower_bound: userA1.account,
  //       upper_bound: userA1.account,
  //       key_type: 'i64',
  //       index_position: '2'
  //     }
  //     result = await callFioApi("get_table_rows", json);
  //     //console.log('Result: ', result);
  //     //console.log('periods : ', result.rows[0].periods)
  //     expect(result.rows[0].lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5)
  //     expect(result.rows[0].remaining_lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5)
  //     expect(result.rows[0].payouts_performed).to.equal(0)
  //     expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2)
  //     expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
  //     expect(result.rows[0].periods[1].amount).to.equal(unstake3 + unstake4)
  //     expect(result.rows[0].periods[1].duration).to.equal(durActual1);
  //     expect(result.rows[0].periods[2].amount).to.equal(unstake5)
  //     durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY)
  //     expect(result.rows[0].periods[2].duration).is.greaterThan(durEstimate - 3).and.lessThan(durEstimate + 3);
  //     durActual2 = result.rows[0].periods[2].duration
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })

  it(`waiting ${SECONDSPERDAY} seconds for unlock`, async () => {
    dayNumber++;
    console.log("            DAY #" + dayNumber + ": waiting " + SECONDSPERDAY + " seconds ")
  })

  it(`wait ${SECONDSPERDAY} seconds`, async () => {
    try {
      wait(SECONDSPERDAY * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`success, userA1 unstake ${unstake6 / 1000000000} tokens `, async () => {
    const result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA1.address,
        amount: unstake6,
        actor: userA1.account,
        max_fee: config.maxFee,
        tpid: ''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`validate unstake lock periods`, async () => {
    console.log(`[dbg] debug: 8, dayNumber: ${dayNumber}`);
    let expectedBalance = prevBalance;
    let expectedAvailable = prevAvailable;
    let expectedStaked = prevStaked - unstake6;
    let expectedSrps = prevSrps - (prevSrps * (unstake6 / prevStaked));
    let unstakeTotal = unstake1+unstake2+unstake3+unstake4+unstake5+unstake6;

    userA1 = await validator.validateStakingBalances(userA1, expectedBalance, expectedAvailable, expectedStaked, expectedSrps);
    const result = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake6, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
    expect(result.validUnlockPeriods).to.equal(true);
    prevBalance = result.balance.balance;
    prevAvailable = result.balance.available;
    prevStaked = result.balance.staked;
    prevSrps = result.balance.srps;
  });

  // it(`getFioBalance for userA1`, async () => {
  //   try {
  //     const result = await userA1.sdk.genericAction('getFioBalance', {})
  //     //console.log(result)
  //     expect(result.balance).to.equal(prevBalance)
  //     expect(result.available).to.equal(prevAvailable)
  //     expect(result.staked).to.equal(prevStaked - unstake6)
  //     expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake6 / prevStaked)))
  //     expect(result.roe).to.equal('1.00000000000000000')
  //
  //     prevBalance = result.balance
  //     prevAvailable = result.available
  //     prevStaked = result.staked
  //     prevSrps = result.srps
  //
  //     // let unstakeTotal = unstake1+unstake2+unstake3+unstake4+unstake5+unstake6;
  //     // let testytest = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake6, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
  //     // console.log(`[framework] test #6: ${testytest}`);
  //
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })

  // it(`call get_table_rows from locktokensv2 and confirm: lock_amount and remaining_lock_amount updated, 2nd staking lock period added correctly`, async () => {
  //   try {
  //     const json = {
  //       json: true,
  //       code: 'eosio',
  //       scope: 'eosio',
  //       table: 'locktokensv2',
  //       lower_bound: userA1.account,
  //       upper_bound: userA1.account,
  //       key_type: 'i64',
  //       index_position: '2'
  //     }
  //     result = await callFioApi("get_table_rows", json);
  //     //console.log('Result: ', result);
  //     //console.log('periods : ', result.rows[0].periods)
  //     expect(result.rows[0].lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5 + unstake6)
  //     expect(result.rows[0].remaining_lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5 + unstake6)
  //     expect(result.rows[0].payouts_performed).to.equal(0)
  //     expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2)
  //     expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
  //     expect(result.rows[0].periods[1].amount).to.equal(unstake3 + unstake4)
  //     expect(result.rows[0].periods[1].duration).to.equal(durActual1);
  //     expect(result.rows[0].periods[2].amount).to.equal(unstake5)
  //     expect(result.rows[0].periods[2].duration).to.equal(durActual2);
  //     expect(result.rows[0].periods[3].amount).to.equal(unstake6)
  //     durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY)
  //     expect(result.rows[0].periods[3].duration).is.greaterThan(durEstimate - 3).and.lessThan(durEstimate + 3);
  //     durActual3 = result.rows[0].periods[3].duration
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })

  it(`waiting ${SECONDSPERDAY} seconds for unlock`, async () => {
    dayNumber++;
    console.log("            DAY #" + dayNumber + ": waiting " + SECONDSPERDAY + " seconds ")
  })

  it(`wait ${SECONDSPERDAY} seconds`, async () => {
    try {
      wait(SECONDSPERDAY * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`success, userA1 unstake ${unstake7 / 1000000000} tokens `, async () => {
    const result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA1.address,
        amount: unstake7,
        actor: userA1.account,
        max_fee: config.maxFee,
        tpid: ''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`validate unstake lock periods`, async () => {
    console.log(`[dbg] debug: 9, dayNumber: ${dayNumber}`);
    let expectedBalance = prevBalance;
    let expectedAvailable = prevAvailable;
    let expectedStaked = prevStaked - unstake7;
    let expectedSrps = prevSrps - (prevSrps * (unstake7 / prevStaked));
    let unstakeTotal = unstake1+unstake2+unstake3+unstake4+unstake5+unstake6+unstake7;

    userA1 = await validator.validateStakingBalances(userA1, expectedBalance, expectedAvailable, expectedStaked, expectedSrps);
    const result = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake7, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
    expect(result.validUnlockPeriods).to.equal(true);
    prevBalance = result.balance.balance;
    prevAvailable = result.balance.available;
    prevStaked = result.balance.staked;
    prevSrps = result.balance.srps;
  });

  // it(`getFioBalance for userA1`, async () => {
  //   try {
  //     const result = await userA1.sdk.genericAction('getFioBalance', {})
  //     //console.log(result)
  //     expect(result.balance).to.equal(prevBalance)
  //     expect(result.available).to.equal(prevAvailable)
  //     expect(result.staked).to.equal(prevStaked - unstake7)
  //     expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake7 / prevStaked)))
  //     expect(result.roe).to.equal('1.00000000000000000')
  //
  //     prevBalance = result.balance
  //     prevAvailable = result.available
  //     prevStaked = result.staked
  //     prevSrps = result.srps
  //
  //     // let unstakeTotal = unstake1+unstake2+unstake3+unstake4+unstake5+unstake6+unstake7;
  //     // let testytest = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake7, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
  //     // console.log(`[framework] test #7: ${testytest}`);
  //
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })

  // it(`call get_table_rows from locktokensv2 and confirm: lock_amount and remaining_lock_amount updated, 2nd staking lock period added correctly`, async () => {
  //   try {
  //     const json = {
  //       json: true,
  //       code: 'eosio',
  //       scope: 'eosio',
  //       table: 'locktokensv2',
  //       lower_bound: userA1.account,
  //       upper_bound: userA1.account,
  //       key_type: 'i64',
  //       index_position: '2'
  //     }
  //     result = await callFioApi("get_table_rows", json);
  //     //console.log('Result: ', result);
  //     //console.log('periods : ', result.rows[0].periods)
  //     expect(result.rows[0].lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5 + unstake6 + unstake7)
  //     expect(result.rows[0].remaining_lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5 + unstake6 + unstake7)
  //     expect(result.rows[0].payouts_performed).to.equal(0)
  //     expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2)
  //     expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
  //     expect(result.rows[0].periods[1].amount).to.equal(unstake3 + unstake4)
  //     expect(result.rows[0].periods[1].duration).to.equal(durActual1);
  //     expect(result.rows[0].periods[2].amount).to.equal(unstake5)
  //     expect(result.rows[0].periods[2].duration).to.equal(durActual2);
  //     expect(result.rows[0].periods[3].amount).to.equal(unstake6)
  //     expect(result.rows[0].periods[3].duration).to.equal(durActual3);
  //     expect(result.rows[0].periods[4].amount).to.equal(unstake7)
  //     durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY)
  //     expect(result.rows[0].periods[4].duration).is.greaterThan(durEstimate - 3).and.lessThan(durEstimate + 3);
  //     durActual4 = result.rows[0].periods[4].duration
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })

  it(`waiting ${SECONDSPERDAY} seconds for unlock`, async () => {
    dayNumber++;
    console.log("            DAY #" + dayNumber + ": waiting " + SECONDSPERDAY + " seconds ")
  })

  it(`wait ${SECONDSPERDAY} seconds`, async () => {
    try {
      wait(SECONDSPERDAY * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`success, userA1 unstake ${unstake8 / 1000000000} tokens `, async () => {
    const result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA1.address,
        amount: unstake8,
        actor: userA1.account,
        max_fee: config.maxFee,
        tpid: ''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`validate unstake lock periods`, async () => {
    console.log(`[dbg] debug: 10, dayNumber: ${dayNumber}`);
    let expectedBalance = prevBalance;
    let expectedAvailable = prevAvailable;
    let expectedStaked = prevStaked - unstake8;
    let expectedSrps = prevSrps - (prevSrps * (unstake8 / prevStaked));
    let unstakeTotal = unstake1+unstake2+unstake3+unstake4+unstake5+unstake6+unstake7+unstake8;

    userA1 = await validator.validateStakingBalances(userA1, expectedBalance, expectedAvailable, expectedStaked, expectedSrps);
    const result = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake8, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
    expect(result.validUnlockPeriods).to.equal(true);
    prevBalance = result.balance.balance;
    prevAvailable = result.balance.available;
    prevStaked = result.balance.staked;
    prevSrps = result.balance.srps;
  });

  // it(`getFioBalance for userA1`, async () => {
  //   try {
  //     const result = await userA1.sdk.genericAction('getFioBalance', {})
  //     //console.log(result)
  //     expect(result.balance).to.equal(prevBalance)
  //     expect(result.available).to.equal(prevAvailable)
  //     expect(result.staked).to.equal(prevStaked - unstake8)
  //     expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake8 / prevStaked)))
  //     expect(result.roe).to.equal('1.00000000000000000')
  //
  //     prevBalance = result.balance
  //     prevAvailable = result.available
  //     prevStaked = result.staked
  //     prevSrps = result.srps
  //
  //     // let unstakeTotal = unstake1+unstake2+unstake3+unstake4+unstake5+unstake6+unstake7+unstake8;
  //     // let testytest = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake8, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
  //     // console.log(`[framework] test #8: ${testytest}`);
  //
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })

  // it(`call get_table_rows from locktokensv2 and confirm: lock_amount and remaining_lock_amount updated, 2nd staking lock period added correctly`, async () => {
  //   try {
  //     const json = {
  //       json: true,
  //       code: 'eosio',
  //       scope: 'eosio',
  //       table: 'locktokensv2',
  //       lower_bound: userA1.account,
  //       upper_bound: userA1.account,
  //       key_type: 'i64',
  //       index_position: '2'
  //     }
  //     result = await callFioApi("get_table_rows", json);
  //     //console.log('Result: ', result);
  //     //console.log('periods : ', result.rows[0].periods)
  //     expect(result.rows[0].lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5 + unstake6 + unstake7 + unstake8)
  //     expect(result.rows[0].remaining_lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5 + unstake6 + unstake7 + unstake8)
  //     expect(result.rows[0].payouts_performed).to.equal(0)
  //     expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2)
  //     expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
  //     expect(result.rows[0].periods[1].amount).to.equal(unstake3 + unstake4)
  //     expect(result.rows[0].periods[1].duration).to.equal(durActual1);
  //     expect(result.rows[0].periods[2].amount).to.equal(unstake5)
  //     expect(result.rows[0].periods[2].duration).to.equal(durActual2);
  //     expect(result.rows[0].periods[3].amount).to.equal(unstake6)
  //     expect(result.rows[0].periods[3].duration).to.equal(durActual3);
  //     expect(result.rows[0].periods[4].amount).to.equal(unstake7)
  //     expect(result.rows[0].periods[4].duration).to.equal(durActual4);
  //     expect(result.rows[0].periods[5].amount).to.equal(unstake8)
  //     durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY)
  //     expect(result.rows[0].periods[5].duration).is.greaterThan(durEstimate - 3).and.lessThan(durEstimate + 3);
  //     durActual5 = result.rows[0].periods[5].duration
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })

  it(`waiting ${SECONDSPERDAY} seconds for unlock`, async () => {
    dayNumber++;
    console.log("            DAY #" + dayNumber + ": waiting " + SECONDSPERDAY + " seconds ")
  })

  it(`wait ${SECONDSPERDAY} seconds`, async () => {
    try {
      wait(SECONDSPERDAY * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`success, userA1 unstake ${unstake9 / 1000000000} tokens `, async () => {
    const result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA1.address,
        amount: unstake9,
        actor: userA1.account,
        max_fee: config.maxFee,
        tpid: ''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`validate unstake lock periods`, async () => {
    console.log(`[dbg] debug: 11, dayNumber: ${dayNumber}`);
    let expectedBalance = prevBalance;
    let expectedAvailable = prevAvailable;
    let expectedStaked = prevStaked - unstake8;
    let expectedSrps = prevSrps - (prevSrps * (unstake8 / prevStaked));
    let unstakeTotal = unstake1+unstake2+unstake3+unstake4+unstake5+unstake6+unstake7+unstake8+unstake9;

    userA1 = await validator.validateStakingBalances(userA1, expectedBalance, expectedAvailable, expectedStaked, expectedSrps);
    const result = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake9, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
    expect(result.validUnlockPeriods).to.equal(true);
    prevBalance = result.balance.balance;
    prevAvailable = result.balance.available;
    prevStaked = result.balance.staked;
    prevSrps = result.balance.srps;
  });

  // it(`getFioBalance for userA1`, async () => {
  //   try {
  //     const result = await userA1.sdk.genericAction('getFioBalance', {})
  //     //console.log(result)
  //     expect(result.balance).to.equal(prevBalance)
  //     expect(result.available).to.equal(prevAvailable)
  //     expect(result.staked).to.equal(prevStaked - unstake9)
  //     expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake9 / prevStaked)))
  //     expect(result.roe).to.equal('1.00000000000000000')
  //
  //     prevBalance = result.balance
  //     prevAvailable = result.available
  //     prevStaked = result.staked
  //     prevSrps = result.srps
  //
  //     // let unstakeTotal = unstake1+unstake2+unstake3+unstake4+unstake5+unstake6+unstake7+unstake8+unstake9;
  //     // let testytest = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake9, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
  //     // console.log(`[framework] test #9: ${testytest}`);
  //
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })

  // it(`call get_table_rows from locktokensv2 and confirm: lock_amount and remaining_lock_amount updated, 2nd staking lock period added correctly`, async () => {
  //   try {
  //     const json = {
  //       json: true,
  //       code: 'eosio',
  //       scope: 'eosio',
  //       table: 'locktokensv2',
  //       lower_bound: userA1.account,
  //       upper_bound: userA1.account,
  //       key_type: 'i64',
  //       index_position: '2'
  //     }
  //     result = await callFioApi("get_table_rows", json);
  //     //console.log('Result: ', result);
  //     //console.log('periods : ', result.rows[0].periods)
  //     expect(result.rows[0].lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5 + unstake6 + unstake7 + unstake8 + unstake9)
  //     expect(result.rows[0].remaining_lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5 + unstake6 + unstake7 + unstake8 + unstake9)
  //     expect(result.rows[0].payouts_performed).to.equal(0)
  //     expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2)
  //     expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
  //     expect(result.rows[0].periods[1].amount).to.equal(unstake3 + unstake4)
  //     expect(result.rows[0].periods[1].duration).to.equal(durActual1);
  //     expect(result.rows[0].periods[2].amount).to.equal(unstake5)
  //     expect(result.rows[0].periods[2].duration).to.equal(durActual2);
  //     expect(result.rows[0].periods[3].amount).to.equal(unstake6)
  //     expect(result.rows[0].periods[3].duration).to.equal(durActual3);
  //     expect(result.rows[0].periods[4].amount).to.equal(unstake7)
  //     expect(result.rows[0].periods[4].duration).to.equal(durActual4);
  //     expect(result.rows[0].periods[5].amount).to.equal(unstake8)
  //     expect(result.rows[0].periods[5].duration).to.equal(durActual5);
  //     expect(result.rows[0].periods[6].amount).to.equal(unstake9)
  //     durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY)
  //     expect(result.rows[0].periods[6].duration).is.greaterThan(durEstimate - 3).and.lessThan(durEstimate + 3);
  //     durActual6 = result.rows[0].periods[6].duration
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })

  it(`waiting ${SECONDSPERDAY} seconds for unlock`, async () => {
    dayNumber++;
    console.log("            DAY #" + dayNumber + ": waiting " + SECONDSPERDAY + " seconds ")
  })

  it(`wait ${SECONDSPERDAY} seconds`, async () => {
    try {
      wait(SECONDSPERDAY * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`success, userA1 unstake ${unstake10 / 1000000000} tokens `, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'unstakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA1.address,
          amount: unstake10,
          actor: userA1.account,
          max_fee: config.maxFee,
          tpid: ''
        }
      })
      // console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error', err.json.error)
      expect(err).to.equal(null)
    }
  })

  it(`validate unstake lock periods`, async () => {
    console.log(`[dbg] debug: 12, dayNumber: ${dayNumber}`);
    let expectedBalance = prevBalance;
    let expectedAvailable = prevAvailable + unstake1 + unstake2;
    let expectedStaked = prevStaked - unstake10;
    let expectedSrps = prevSrps - (prevSrps * (unstake10 / prevStaked));
    let unstakeTotal = unstake1+unstake2+unstake3+unstake4+unstake5+unstake6+unstake7+unstake8+unstake9+unstake10;

    userA1 = await validator.validateStakingBalances(userA1, expectedBalance, expectedAvailable, expectedStaked, expectedSrps);
    const result = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake10, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
    expect(result.validUnlockPeriods).to.equal(true);
    prevBalance = result.balance.balance;
    prevAvailable = result.balance.available;
    prevStaked = result.balance.staked;
    prevSrps = result.balance.srps;
  });

  // it(`getFioBalance for userA1`, async () => {
  //   try {
  //     const result = await userA1.sdk.genericAction('getFioBalance', {})
  //     //console.log(result)
  //     expect(result.balance).to.equal(prevBalance)
  //     expect(result.available).to.equal(prevAvailable)
  //     expect(result.staked).to.equal(prevStaked - unstake10)
  //     expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake10 / prevStaked)))
  //     expect(result.roe).to.equal('1.00000000000000000')
  //
  //     prevBalance = result.balance
  //     prevAvailable = result.available
  //     prevStaked = result.staked
  //     prevSrps = result.srps
  //
  //     // let unstakeTotal = unstake1+unstake2+unstake3+unstake4+unstake5+unstake6+unstake7+unstake8+unstake9+unstake10;
  //     // let testytest = await validator.validateStakingLockPeriods(userA1, stakeAmount1, unstakeTotal, unstake10, dayNumber, prevBalance, prevAvailable, prevStaked, prevSrps);
  //     // console.log(`[framework] test #10: ${testytest}`);
  //
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })

  // it(`call get_table_rows from locktokensv2 and confirm: lock_amount and remaining_lock_amount updated, 2nd staking lock period added correctly`, async () => {
  //   try {
  //     const json = {
  //       json: true,
  //       code: 'eosio',
  //       scope: 'eosio',
  //       table: 'locktokensv2',
  //       lower_bound: userA1.account,
  //       upper_bound: userA1.account,
  //       key_type: 'i64',
  //       index_position: '2'
  //     }
  //     result = await callFioApi("get_table_rows", json);
  //     //console.log('Result: ', result);
  //     //console.log('periods : ', result.rows[0].periods)
  //     expect(result.rows[0].lock_amount).to.equal(unstake3 + unstake4 + unstake5 + unstake6 + unstake7 + unstake8 + unstake9 + unstake10)  // Remove unstake1 and unstake2 since it was paid
  //     expect(result.rows[0].remaining_lock_amount).to.equal(unstake3 + unstake4 + unstake5 + unstake6 + unstake7 + unstake8 + unstake9 + unstake10)
  //     expect(result.rows[0].payouts_performed).to.equal(0)
  //     expect(result.rows[0].periods[0].amount).to.equal(unstake3 + unstake4)
  //     expect(result.rows[0].periods[0].duration).to.equal(durActual1);
  //     expect(result.rows[0].periods[1].amount).to.equal(unstake5)
  //     expect(result.rows[0].periods[1].duration).to.equal(durActual2);
  //     expect(result.rows[0].periods[2].amount).to.equal(unstake6)
  //     expect(result.rows[0].periods[2].duration).to.equal(durActual3);
  //     expect(result.rows[0].periods[3].amount).to.equal(unstake7)
  //     expect(result.rows[0].periods[3].duration).to.equal(durActual4);
  //     expect(result.rows[0].periods[4].amount).to.equal(unstake8)
  //     expect(result.rows[0].periods[4].duration).to.equal(durActual5);
  //     expect(result.rows[0].periods[5].amount).to.equal(unstake9)
  //     expect(result.rows[0].periods[5].duration).to.equal(durActual6);
  //     expect(result.rows[0].periods[6].amount).to.equal(unstake10)
  //     durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY)
  //     expect(result.rows[0].periods[6].duration).is.greaterThan(durEstimate - 3).and.lessThan(durEstimate + 3);
  //   } catch (err) {
  //     console.log('Error', err);
  //     expect(err).to.equal(null);
  //   }
  // })
  */
})

