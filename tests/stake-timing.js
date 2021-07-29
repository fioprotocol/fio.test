require('mocha')
const {expect} = require('chai')
const {newUser, callFioApi, fetchJson} = require('../utils.js');
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
 *  rebuild the contracts and restart your local chain.
 *
 *  you are now ready to run these staking tests!!!
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


let users = []

const UNSTAKELOCKDURATIONSECONDS = 70;
const SECONDSPERDAY = 10;


/**
 * Additions to User object:
 *   prevBalance
 *   prevAvailable
 *   prevStaked
 *   srps
 */

const userSchedule = [
  {
    alice: {
      funding: { 
        1: 2000,  // day: amount
        3: 2000 
      },
      staking: { 1: 100 },
      unstaking: { 1: 50 }
    }
  },
  {
    bob: {
      funding: { 1: 2000 },
      staking: { 1: 100 },
      unstaking: { 1: 50 }
    }
  }
]



describe(`************************** stake-timing.js ************************** \n    A. General staking test.`, () => {

  // For ever user:

  it(`Create user`, async () => {
    users[0] = await newUser(faucet);
    users[1] = await newUser(faucet);
  })

  it(`Have user vote so they can participate in staking`, async () => {

    try {
      const result = await users[0].sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          producers: ["bp1@dapixdev"],
          fio_address: users[0].address,
          actor: users[0].account,
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

  // Set values in user object (current FIO, staking, etc. ). Use the user object already created by newUser.

})

describe(`B. Begin`, () => {

  // For each day

  it(`Waiting ${SECONDSPERDAY} seconds for unlock`, async () => {
    dayNumber++;
    console.log("            DAY #" + dayNumber + ": waiting " + SECONDSPERDAY + " seconds ")
  })

  it(` wait ${SECONDSPERDAY} seconds`, async () => {
    try {
      //wait(SECONDSPERDAY * 1000)
    } catch (err) {
      console.log('Error', err)
    }
  })

   //for each user
  
  // Process funding

  it(`Transfer FIO`, async () => {
    //now transfer 1k fio from the faucet to this account
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: transferAmount1,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')

  })

  // Process staking

   it(`Success userA1 stake ${stakeAmount1 / 1000000000} fio using tpid and auto proxy`, async () => {
    try {
      // console.log("address used ",userA1.address)
      // console.log("account used ",userA1.account)
      const result = await users[0].sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: users[0].address,
          amount: stakeAmount1,
          actor: users[0].account,
          max_fee: config.maxFee,
          tpid: ''
        }
      })

      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err)
      // expect(err.json.fields[0].error).to.contain('has not voted')
    }
  })

  it(`Check getFioBalance for userA1`, async () => {
    try {
      const result = await users[0].sdk.genericAction('getFioBalance', {})
      //console.log(result)
      expect(result.balance).to.equal(prevBalance)
      expect(result.available).to.equal(prevBalance - stakeAmount1)
      expect(result.staked).to.equal(stakeAmount1)
      expect(result.srps).to.equal(prevSrps + stakeAmount1 / result.roe)
      expect(result.roe).to.equal(1)

      prevBalance = result.balance
      prevAvailable = result.available
      prevStaked = result.staked
      prevSrps = result.srps
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  // Check changes to lock table and set new user values. Function Params: user, stake/unstake, amount

  it(`Call get_table_rows from locktokensv2`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: users[0].account,
        upper_bound: users[0].account,
        key_type: 'i64',
        index_position: '2'
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(unstake1)
      expect(result.rows[0].remaining_lock_amount).to.equal(unstake1)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].amount).to.equal(unstake1)
      expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(UNSTAKELOCKDURATIONSECONDS)  // Hard to know this. It is 7 days + the time that has elapsed since the original record was created (the timestamp)
      lockDuration = result.rows[0].periods[0].duration  // Grab this to make sure it does not change later
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  // Process unstaking

  it(`success , userA1 unstake ${unstake5 / 1000000000} tokens `, async () => {
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

  it(`getFioBalance for userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {})
      //console.log(result)
      expect(result.balance).to.equal(prevBalance)
      expect(result.available).to.equal(prevAvailable)
      expect(result.staked).to.equal(prevStaked - unstake5)
      expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake5 / prevStaked)))
      expect(result.roe).to.equal(1)

      prevBalance = result.balance
      prevAvailable = result.available
      prevStaked = result.staked
      prevSrps = result.srps
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Call get_table_rows from locktokensv2 and confirm: lock_amount and remaining_lock_amount updated, 2nd staking lock period added correctly`, async () => {
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'locktokensv2',
        lower_bound: userA1.account,
        upper_bound: userA1.account,
        key_type: 'i64',
        index_position: '2'
      }
      result = await callFioApi("get_table_rows", json);
      //console.log('Result: ', result);
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5)
      expect(result.rows[0].remaining_lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2)
      expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
      expect(result.rows[0].periods[1].amount).to.equal(unstake3 + unstake4)
      expect(result.rows[0].periods[1].duration).to.equal(durActual1);
      expect(result.rows[0].periods[2].amount).to.equal(unstake5)
      durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY)
      expect(result.rows[0].periods[2].duration).is.greaterThan(durEstimate - 3).and.lessThan(durEstimate + 3);
      durActual2 = result.rows[0].periods[2].duration
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})