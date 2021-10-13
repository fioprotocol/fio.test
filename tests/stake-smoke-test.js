require('mocha')
const {expect} = require('chai')
const {newUser, existingUser,callFioApi,fetchJson, generateFioDomain, generateFioAddress, createKeypair} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
const config = require('../config.js');
let faucet;

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


const UNSTAKELOCKDURATIONSECONDS = config.UNSTAKELOCKDURATIONSECONDS;
const SECONDSPERDAY = config.SECONDSPERDAY;

describe(`************************** stake-smoke-test.js ************************** \n    A. Stake tokens using auto proxy without voting first, \n Then do a full pull through unstaking including testing the locking period.`, () => {


  let userA1, proxy1, lockDuration, prevBalance, prevAvailable, prevStaked, prevSrps
  let durActual1, durActual2, durActual3, durActual4, durActual5
  let dayNumber = 0

  const transferAmount1 = 2000000000000  // 2000 FIO

  const stakeAmount1 = 3000000000000,  // 3000 FIO
    stakeAmount2 = 500000000000       // 500 FIO

  const unstake1 = 2000000000000,     // 2000 FIO
    unstake2 = 20000000000,          // 20 FIO
    unstake3 = 30000000000,          // 30 FIO
    unstake4 = 40000000000,          // 40 FIO
    unstake5 = 50000000000,          // 50 FIO
    unstake6 = 60000000000,          // 60 FIO
    unstake7 = 70000000000,          // 70 FIO
    unstake8 = 80000000000,          // 80 FIO
    unstake9 = 90000000000,          // 90 FIO
    unstake10 = 10000000000          // 10 FIO

  before(async () => {
    userA1 = await newUser(faucet);
    proxy1 = await newUser(faucet);

    //now transfer 1k fio from the faucet to this account
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: transferAmount1,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')

    console.log('userA1.publicKey: ', userA1.publicKey)

  })

  it('Confirm proxy1: not in the voters table', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == proxy1.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(inVotersTable).to.equal(false)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Register proxy1 as a proxy`, async () => {
    try {
      const result = await proxy1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxy1.address,
          actor: proxy1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it('Confirm proxy1: is_proxy = 1, is_auto_proxy = 0', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      inVotersTable = false;
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == proxy1.account) {
          inVotersTable = true;
          //console.log('voters.rows[voter].is_proxy: ', voters.rows[voter].is_proxy);
          //console.log('voters.rows[voter].is_auto_proxy: ', voters.rows[voter].is_auto_proxy);
          //console.log('voters.rows[voter].proxy: ', voters.rows[voter].proxy);
          break;
        }
      }
      expect(voters.rows[voter].is_auto_proxy).to.equal(0);
      expect(voters.rows[voter].is_proxy).to.equal(1);
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Confirm userA1: not in voters table', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voter);
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == userA1.account) {
          inVotersTable = true;
          break;
        }
      }
      expect(inVotersTable).to.equal(false)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`getFioBalance for userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {})
      console.log(result)
      prevBalance = result.balance
      expect(result.available).to.equal(result.balance)
      expect(result.staked).to.equal(0)
      prevSrps = result.srps
      //expect(result.roe).to.equal('1.000000000000000');
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Success userA1 stake ${stakeAmount1/1000000000} fio using tpid and auto proxy`, async () => {
    try {
     // console.log("address used ",userA1.address)
     // console.log("account used ",userA1.account)
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA1.address,
          amount: stakeAmount1,
          actor: userA1.account,
          max_fee: config.maxFee,
          tpid: proxy1.address
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
      const result = await userA1.sdk.genericAction('getFioBalance', {})
      console.log(result)
      expect(result.balance).to.equal(prevBalance)
      expect(result.available).to.equal(prevBalance - stakeAmount1)
      expect(result.staked).to.equal(stakeAmount1)
      expect(result.srps).to.equal(prevSrps + stakeAmount1 / result.roe)
      expect(result.roe).to.equal('0.500000000000000');
     // expect(result.roe).to.equal('1.000000000000000');

      prevBalance = result.balance
      prevAvailable = result.available
      prevStaked = result.staked
      prevSrps = result.srps
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('Confirm userA1: is in the voters table and is_auto_proxy = 1, proxy is proxy1.account', async () => {
    let inVotersTable;
    try {
      const json = {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'voters',
        limit: 1000,
        reverse: false,
        show_payer: false
      }
      const voters = await callFioApi("get_table_rows", json);
     // console.log('voters: ', voters.rows);
      inVotersTable = false;
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == userA1.account) {
          inVotersTable = true;
          expect(voters.rows[voter].is_auto_proxy).to.equal(1)
          expect(voters.rows[voter].proxy).to.equal(proxy1.account)
          break;
        }
      }
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Failure, userA1 try to stake again, stake 9000 tokens, insufficient balance `, async () => {
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

  it(`Failure , userA1 unstake 4000 FIO. Expect: cannot unstake more than staked `, async () => {
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

  it(`success , userA1 unstake ${unstake1/1000000000} tokens `, async () => {
    try {
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
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }

  })

  it(`getFioBalance for userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {})
      console.log(result)
      expect(result.balance).to.equal(prevBalance)
      expect(result.available).to.equal(prevBalance - stakeAmount1)
      expect(result.staked).to.equal(stakeAmount1 - unstake1)
      expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake1 / prevStaked)))
      expect(result.roe).to.equal('0.500000000000000');

      prevBalance = result.balance
      prevAvailable = result.available
      prevStaked = result.staked
      prevSrps = result.srps
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


  it(`Call get_table_rows from locktokensv2 and confirm: one staking lock period added correctly`, async () => {
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
      console.log('Result: ', result);
      console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(unstake1)
      console.log('lock amount check success ')
      expect(result.rows[0].remaining_lock_amount).to.equal(unstake1)
      console.log('remaining lock amount check success ')
      expect(result.rows[0].payouts_performed).to.equal(0)
      console.log('payouts performed check success ')
      expect(result.rows[0].periods[0].amount).to.equal(unstake1)
      console.log('period 1 amount check success ')
      expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(UNSTAKELOCKDURATIONSECONDS)  // Hard to know this. It is 7 days + the time that has elapsed since the original record was created (the timestamp)
      console.log('period 1 duration check success ')
      lockDuration = result.rows[0].periods[0].duration  // Grab this to make sure it does not change later
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })
})

