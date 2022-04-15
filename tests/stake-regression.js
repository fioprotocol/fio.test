require('mocha')
const {expect} = require('chai')
const {newUser, callFioApi,fetchJson, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
const config = require('../config.js');
let faucet;

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

/********************* setting up these tests
 *
 *
 * first you must shorten the unstake locking period
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
 * 
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
 */


const UNSTAKELOCKDURATIONSECONDS = config.UNSTAKELOCKDURATIONSECONDS;
const SECONDSPERDAY = config.SECONDSPERDAY;
const INITIALROE = '0.500000000000000';

describe(`************************** stake-regression.js ************************** \n    A. Stake tokens using auto proxy without voting first, \n Then do a full pull through unstaking including testing the locking period.`, () => {


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
      //console.log(result)
      prevBalance = result.balance
      expect(result.available).to.equal(result.balance)
      expect(result.staked).to.equal(0)
      prevSrps = result.srps
      expect(result.roe).to.equal(INITIALROE);
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
      //console.log(result)
      expect(result.balance).to.equal(prevBalance)
      expect(result.available).to.equal(prevBalance - stakeAmount1)
      expect(result.staked).to.equal(stakeAmount1)
      expect(result.srps).to.equal(prevSrps + stakeAmount1 / result.roe)
      expect(result.roe).to.equal(INITIALROE);

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

  it(`getFioBalance for userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {})
      //console.log(result)
      expect(result.balance).to.equal(prevBalance)
      expect(result.available).to.equal(prevBalance - stakeAmount1)
      expect(result.staked).to.equal(stakeAmount1 - unstake1)
      expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake1 / prevStaked)))
      expect(result.roe).to.equal(INITIALROE);

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

  it(`Failure, Transfer 3k FIO to proxy1 FIO public key from userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: proxy1.publicKey,
        amount: 3000000000000,
        maxFee: config.maxFee,
        technologyProviderId: ''
      })
      expect(result.status).to.not.equal('OK')
    }catch (err){
     // console.log("ERROR: ", err)
      expect(err.json.fields[0].error).to.contain('Funds locked')
    }
  })

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

  it(`getFioBalance for userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {})
      //console.log(result)
      expect(result.balance).to.equal(prevBalance)
      expect(result.available).to.equal(prevBalance - stakeAmount1)
      expect(result.staked).to.equal(prevStaked - unstake2)
      expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake2 / prevStaked)))
      expect(result.roe).to.equal(INITIALROE);

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
      //console.log('Result: ', result);
      //console.log('periods : ', result.rows[0].periods)
      expect(result.rows[0].lock_amount).to.equal(unstake1 + unstake2)
      expect(result.rows[0].remaining_lock_amount).to.equal(unstake1 + unstake2)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2)
      expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Waiting ${SECONDSPERDAY} seconds for unlock`, async () => {
    dayNumber++;
    console.log("            DAY #" + dayNumber + ": waiting " + SECONDSPERDAY + " seconds ")
  })

  it(`wait for ${SECONDSPERDAY} seconds for unlock`, async () => {
    await timeout(SECONDSPERDAY * 1000);
  })

  it(`Success. userA1 vote for producer to trigger locktokensv2 update.`, async () => {
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

  it(`Call get_table_rows from locktokensv2. Expect: No Change`, async () => {
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
      expect(result.rows[0].lock_amount).to.equal(unstake1 + unstake2)
      expect(result.rows[0].remaining_lock_amount).to.equal(unstake1 + unstake2)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2)
      expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

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

  it(`getFioBalance for userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {})
      //console.log(result)
      expect(result.balance).to.equal(prevBalance)
      expect(result.available).to.equal(prevAvailable)
      expect(result.staked).to.equal(prevStaked - unstake3)
      expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake3 / prevStaked)))
      expect(result.roe).to.equal(INITIALROE);

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
      expect(result.rows[0].lock_amount).to.equal(unstake1 + unstake2 + unstake3)
      expect(result.rows[0].remaining_lock_amount).to.equal(unstake1 + unstake2 + unstake3)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2)
      expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
      expect(result.rows[0].periods[1].amount).to.equal(unstake3)
      durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY)
      expect(result.rows[0].periods[1].duration).is.greaterThan(durEstimate - 3).and.lessThan(durEstimate + 3);  // Duration is approximate
      durActual1 = result.rows[0].periods[1].duration
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Success userA1 stake ${stakeAmount2 / 1000000000} fio using tpid and auto proxy`, async () => {
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
          tpid: proxy1.address
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
      const result = await userA1.sdk.genericAction('getFioBalance', {})
      //console.log(result)
      expect(result.balance).to.equal(prevBalance)
      expect(result.available).to.equal(prevAvailable - stakeAmount2)
      expect(result.staked).to.equal(prevStaked + stakeAmount2)
      expect(result.srps).to.equal(prevSrps + stakeAmount2 / result.roe)
      expect(result.roe).to.equal(INITIALROE);

      prevBalance = result.balance
      prevAvailable = result.available
      prevStaked = result.staked
      prevSrps = result.srps
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`success , userA1 unstake ${unstake4 / 1000000000} tokens `, async () => {
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

  it(`getFioBalance for userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {})
      //console.log(result)
      expect(result.balance).to.equal(prevBalance)
      expect(result.available).to.equal(prevAvailable)
      expect(result.staked).to.equal(prevStaked - unstake4)
      expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake4 / prevStaked)))
      expect(result.roe).to.equal(INITIALROE);

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
      expect(result.rows[0].lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4)
      expect(result.rows[0].remaining_lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2)
      expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
      expect(result.rows[0].periods[1].amount).to.equal(unstake3 + unstake4)
      expect(result.rows[0].periods[1].duration).to.equal(durActual1);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Waiting ${SECONDSPERDAY} seconds for unlock`, async () => {
    dayNumber++;
    console.log("            DAY #" + dayNumber + ": waiting " + SECONDSPERDAY + " seconds ")
  })

  it(`wait for ${SECONDSPERDAY} seconds`, async () => {
    await timeout(SECONDSPERDAY * 1000);
  })

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
      expect(result.roe).to.equal(INITIALROE);

      prevBalance = result.balance
      prevAvailable = result.available
      prevStaked = result.staked
      prevSrps = result.srps
    } catch (err) {
      //console.log('Error', err);
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
     // expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
      expect(result.rows[0].periods[1].amount).to.equal(unstake3 + unstake4)
      expect(result.rows[0].periods[1].duration).to.equal(durActual1);
      expect(result.rows[0].periods[2].amount).to.equal(unstake5)
      durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY)
      expect(result.rows[0].periods[2].duration).is.greaterThan(durEstimate - 5).and.lessThan(durEstimate + 5);
      durActual2 = result.rows[0].periods[2].duration
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


  it(`Waiting ${SECONDSPERDAY} seconds for unlock`, async () => {
    dayNumber++;
    console.log("            DAY #" + dayNumber + ": waiting " + SECONDSPERDAY + " seconds ")
  })

  it(`wait for ${SECONDSPERDAY} seconds`, async () => {
    await timeout(SECONDSPERDAY * 1000);
  })

  it(`success , userA1 unstake ${unstake6 / 1000000000} tokens `, async () => {
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

  it(`getFioBalance for userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {})
      //console.log(result)
      expect(result.balance).to.equal(prevBalance)
      expect(result.available).to.equal(prevAvailable)
      expect(result.staked).to.equal(prevStaked - unstake6)
      expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake6 / prevStaked)))
      expect(result.roe).to.equal(INITIALROE);

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
      expect(result.rows[0].lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5 + unstake6)
      expect(result.rows[0].remaining_lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5 + unstake6)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2)
      expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
      expect(result.rows[0].periods[1].amount).to.equal(unstake3 + unstake4)
      expect(result.rows[0].periods[1].duration).to.equal(durActual1);
      expect(result.rows[0].periods[2].amount).to.equal(unstake5)
      expect(result.rows[0].periods[2].duration).to.equal(durActual2);
      expect(result.rows[0].periods[3].amount).to.equal(unstake6)
      durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY)
      expect(result.rows[0].periods[3].duration).is.greaterThan(durEstimate - 5).and.lessThan(durEstimate + 5);
      durActual3 = result.rows[0].periods[3].duration
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })


  it(`Waiting ${SECONDSPERDAY} seconds for unlock`, async () => {
    dayNumber++;
    console.log("            DAY #" + dayNumber + ": waiting " + SECONDSPERDAY + " seconds ")
  })

  it(`wait for ${SECONDSPERDAY} seconds`, async () => {
    await timeout(SECONDSPERDAY * 1000);
  })

  it(`success , userA1 unstake ${unstake7 / 1000000000} tokens `, async () => {
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

  it(`getFioBalance for userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {})
      //console.log(result)
      expect(result.balance).to.equal(prevBalance)
      expect(result.available).to.equal(prevAvailable)
      expect(result.staked).to.equal(prevStaked - unstake7)
      expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake7 / prevStaked)))
      expect(result.roe).to.equal(INITIALROE);

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
      expect(result.rows[0].lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5 + unstake6 + unstake7)
      expect(result.rows[0].remaining_lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5 + unstake6 + unstake7)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2)
      expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
      expect(result.rows[0].periods[1].amount).to.equal(unstake3 + unstake4)
      expect(result.rows[0].periods[1].duration).to.equal(durActual1);
      expect(result.rows[0].periods[2].amount).to.equal(unstake5)
      expect(result.rows[0].periods[2].duration).to.equal(durActual2);
      expect(result.rows[0].periods[3].amount).to.equal(unstake6)
      expect(result.rows[0].periods[3].duration).to.equal(durActual3);
      expect(result.rows[0].periods[4].amount).to.equal(unstake7)
      durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY)
      expect(result.rows[0].periods[4].duration).is.greaterThan(durEstimate - 5).and.lessThan(durEstimate + 5);
      durActual4 = result.rows[0].periods[4].duration
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Waiting ${SECONDSPERDAY} seconds for unlock`, async () => {
    dayNumber++;
    console.log("            DAY #" + dayNumber + ": waiting " + SECONDSPERDAY + " seconds ")
  })

  it(`wait for ${SECONDSPERDAY} seconds`, async () => {
    await timeout(SECONDSPERDAY * 1000);
  })

  it(`success , userA1 unstake ${unstake8 / 1000000000} tokens `, async () => {
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

  it(`getFioBalance for userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {})
      //console.log(result)
      expect(result.balance).to.equal(prevBalance)
      expect(result.available).to.equal(prevAvailable)
      expect(result.staked).to.equal(prevStaked - unstake8)
      expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake8 / prevStaked)))
      expect(result.roe).to.equal(INITIALROE);

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
      expect(result.rows[0].lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5 + unstake6 + unstake7 + unstake8)
      expect(result.rows[0].remaining_lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5 + unstake6 + unstake7 + unstake8)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2)
      expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
      expect(result.rows[0].periods[1].amount).to.equal(unstake3 + unstake4)
      expect(result.rows[0].periods[1].duration).to.equal(durActual1);
      expect(result.rows[0].periods[2].amount).to.equal(unstake5)
      expect(result.rows[0].periods[2].duration).to.equal(durActual2);
      expect(result.rows[0].periods[3].amount).to.equal(unstake6)
      expect(result.rows[0].periods[3].duration).to.equal(durActual3);
      expect(result.rows[0].periods[4].amount).to.equal(unstake7)
      expect(result.rows[0].periods[4].duration).to.equal(durActual4);
      expect(result.rows[0].periods[5].amount).to.equal(unstake8)
      durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY)
      expect(result.rows[0].periods[5].duration).is.greaterThan(durEstimate - 5).and.lessThan(durEstimate + 5);
      durActual5 = result.rows[0].periods[5].duration
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Waiting ${SECONDSPERDAY} seconds for unlock`, async () => {
    dayNumber++;
    console.log("            DAY #" + dayNumber + ": waiting " + SECONDSPERDAY + " seconds ")
  })

  it(`wait for ${SECONDSPERDAY} seconds`, async () => {
    await timeout(SECONDSPERDAY * 1000);
  })

  it(`success , userA1 unstake ${unstake9 / 1000000000} tokens `, async () => {
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

  it(`getFioBalance for userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {})
      //console.log(result)
      expect(result.balance).to.equal(prevBalance)
      expect(result.available).to.equal(prevAvailable)
      expect(result.staked).to.equal(prevStaked - unstake9)
      expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake9 / prevStaked)))
      expect(result.roe).to.equal(INITIALROE);

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
      expect(result.rows[0].lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5 + unstake6 + unstake7 + unstake8 + unstake9)
      expect(result.rows[0].remaining_lock_amount).to.equal(unstake1 + unstake2 + unstake3 + unstake4 + unstake5 + unstake6 + unstake7 + unstake8 + unstake9)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].amount).to.equal(unstake1 + unstake2)
      expect(result.rows[0].periods[0].duration).is.greaterThanOrEqual(lockDuration)
      expect(result.rows[0].periods[1].amount).to.equal(unstake3 + unstake4)
      expect(result.rows[0].periods[1].duration).to.equal(durActual1);
      expect(result.rows[0].periods[2].amount).to.equal(unstake5)
      expect(result.rows[0].periods[2].duration).to.equal(durActual2);
      expect(result.rows[0].periods[3].amount).to.equal(unstake6)
      expect(result.rows[0].periods[3].duration).to.equal(durActual3);
      expect(result.rows[0].periods[4].amount).to.equal(unstake7)
      expect(result.rows[0].periods[4].duration).to.equal(durActual4);
      expect(result.rows[0].periods[5].amount).to.equal(unstake8)
      expect(result.rows[0].periods[5].duration).to.equal(durActual5);
      expect(result.rows[0].periods[6].amount).to.equal(unstake9)
      durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY)
      expect(result.rows[0].periods[6].duration).is.greaterThan(durEstimate - 5).and.lessThan(durEstimate + 5);
      durActual6 = result.rows[0].periods[6].duration
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Waiting ${SECONDSPERDAY} seconds for unlock`, async () => {
    dayNumber++;
    console.log("            DAY #" + dayNumber + ": waiting " + SECONDSPERDAY + " seconds ")
  })

  it(`wait for ${SECONDSPERDAY} seconds`, async () => {
    await timeout(SECONDSPERDAY * 1000);
  })

  it(`success , userA1 unstake ${unstake10 / 1000000000} tokens (BUG BD-2755)`, async () => {
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

  it(`getFioBalance for userA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {})
      //console.log(result)
      expect(result.balance).to.equal(prevBalance)
      //expect(result.available).to.equal(prevAvailable)
      expect(result.available).to.equal(prevAvailable + unstake1 + unstake2)
      expect(result.staked).to.equal(prevStaked - unstake10)
      expect(result.srps).to.equal(prevSrps - (prevSrps * (unstake10 / prevStaked)))
      expect(result.roe).to.equal(INITIALROE);

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
      expect(result.rows[0].lock_amount).to.equal(unstake3 + unstake4 + unstake5 + unstake6 + unstake7 + unstake8 + unstake9 + unstake10)  // Remove unstake1 and unstake2 since it was paid
      expect(result.rows[0].remaining_lock_amount).to.equal(unstake3 + unstake4 + unstake5 + unstake6 + unstake7 + unstake8 + unstake9 + unstake10)
      expect(result.rows[0].payouts_performed).to.equal(0)
      expect(result.rows[0].periods[0].amount).to.equal(unstake3 + unstake4)
      expect(result.rows[0].periods[0].duration).to.equal(durActual1);
      expect(result.rows[0].periods[1].amount).to.equal(unstake5)
      expect(result.rows[0].periods[1].duration).to.equal(durActual2);
      expect(result.rows[0].periods[2].amount).to.equal(unstake6)
      expect(result.rows[0].periods[2].duration).to.equal(durActual3);
      expect(result.rows[0].periods[3].amount).to.equal(unstake7)
      expect(result.rows[0].periods[3].duration).to.equal(durActual4);
      expect(result.rows[0].periods[4].amount).to.equal(unstake8)
      expect(result.rows[0].periods[4].duration).to.equal(durActual5);
      expect(result.rows[0].periods[5].amount).to.equal(unstake9)
      expect(result.rows[0].periods[5].duration).to.equal(durActual6);
      expect(result.rows[0].periods[6].amount).to.equal(unstake10)
      durEstimate = UNSTAKELOCKDURATIONSECONDS + (dayNumber * SECONDSPERDAY)
      expect(result.rows[0].periods[6].duration).is.greaterThan(durEstimate - 6).and.lessThan(durEstimate + 6);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })
})

