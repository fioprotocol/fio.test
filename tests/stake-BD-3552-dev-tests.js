require('mocha')
const {expect} = require('chai')
const {newUser, callFioApi,fetchJson, createKeypair} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
const config = require('../config.js');
let faucet;

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

/********************* setting up these tests
 *
 *no setup required
 *
 * these tests perform the testing described in BD-3552
 * 
 * 
 */




const UNSTAKELOCKDURATIONSECONDS = config.UNSTAKELOCKDURATIONSECONDS;
const SECONDSPERDAY = config.SECONDSPERDAY;
const INITIALROE = '0.500000000000000';


describe(`************************** stake-BD-3552-dev-tests.js ************************** \n    A. Stake tokens using auto proxy without voting first.`, () => {


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
    
    //console.log("TPId account is ",proxy1.account)

    //now transfer 1k fio from the faucet to accounts
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: transferAmount1,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')

    //console.log('userA1.publicKey: ', userA1.publicKey);

  })

  it('Confirm TPID account: not in the voters table', async () => {
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

  it(`Register TPID account as a proxy`, async () => {
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

  it('Confirm TPID account: is_proxy = 1, is_auto_proxy = 0', async () => {
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
           //console.log('TPID INFO from voters for account ', proxy1.account)
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

  it('Confirm staking account: not in voters table', async () => {
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

  it(`getFioBalance for staking account`, async () => {
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

  it(`Success -- stake from staking account fio using tpid and auto proxy`, async () => {
    try {
      //console.log("stake address used ",userA1.address)
      //console.log("stake account used ",userA1.account)
      let paramsstr = "action: 'stakefio',"+
          "fio_address: "+ userA1.address+
            "amount: "+ stakeAmount1 +
           " actor: "+ userA1.account +
           " max_fee:" + config.maxFee +
            " tpid: "+ proxy1.address ;
      //console.log("stake params ",paramsstr)
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
      console.log("Error : ", err);
      expect(err).to.equal(null);
     // expect(err.json.fields[0].error).to.contain('has not voted')
    }
  })

  it(`getFioBalance for staking account`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {})
      //console.log(result)
      prevBalance = result.balance
      expect(result.available).to.equal(result.balance - stakeAmount1)
      expect(result.staked).to.equal(stakeAmount1)
      prevSrps = result.srps
      expect(result.roe).to.equal(INITIALROE);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get handles for staking account `, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioAddresses', {
        fioPublicKey: userA1.publicKey
      })
      //console.log('staking account fio addresses: ', result);
      expect(result.fio_addresses.length).to.equal(1)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }


  })

  it('Confirm staking account: is now in voters table', async () => {
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
          //console.log('staking account info from voters for account ', userA1.account)
          //console.log('voters.rows[voter].is_proxy: ', voters.rows[voter].is_proxy);
          //console.log('voters.rows[voter].is_auto_proxy: ', voters.rows[voter].is_auto_proxy);
          //console.log('voters.rows[voter].proxy: ', voters.rows[voter].proxy);
          inVotersTable = true;
          break;
        }
      }
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})


describe(`B. Stake with empty FIO Address. Confirm autoproxy and staking works.`, () => {

  let proxy1, staker1

  const stakeAmount2 = 500000000000       // 500 FIO
  const transferAmount1 = 2000000000000  // 2000 FIO

  before(async () => {
    proxy1 = await newUser(faucet);

    keys = await createKeypair();
    staker1 = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);

    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: staker1.publicKey,
      amount: transferAmount1,
      maxFee: config.maxFee,
      technologyProviderId: ''
    })
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')
    
  })

  it('Confirm TPID account: not in the voters table', async () => {
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

  it(`Register TPID account as a proxy`, async () => {
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

  it('Confirm TPID account: is_proxy = 1, is_auto_proxy = 0', async () => {
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
          //console.log('TPID INFO from voters for account ', proxy1.account)
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

  it(`staker1 has no FIO Address (and thus no bundles). Confirm stake with autoproxy succeeds.`, async () => {
    try {
      const result = await staker1.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: '',
          amount: stakeAmount2,
          actor: staker1.account,
          max_fee: config.maxFee,
          tpid: proxy1.address
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err.json.error);
      expect(err).to.equal(null);
    }
  })

})

describe(`C. User has FIO address with NO bundles. Confirm autoproxy and staking works.`, () => {

  let proxy1, staker2, user2;

  const stakeAmount2 = 500000000000       // 500 FIO

  before(async () => {
    proxy1 = await newUser(faucet);
    staker2 = await newUser(faucet);
    user2 = await newUser(faucet);
  })

  it('Confirm TPID account: not in the voters table', async () => {
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

  it(`Register TPID account as a proxy`, async () => {
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

  it('Confirm TPID account: is_proxy = 1, is_auto_proxy = 0', async () => {
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
          //console.log('TPID INFO from voters for account ', proxy1.account)
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

  it(`Using up staker2 bundles...`, async () => { });

  it(`Use up all of staker2's bundles with 51 record_obt_data transactions`, async () => {
    for (i = 0; i < 51; i++) {
      try {
        const result = await staker2.sdk.genericAction('recordObtData', {
          payerFioAddress: staker2.address,
          payeeFioAddress: user2.address,
          payerTokenPublicAddress: staker2.publicKey,
          payeeTokenPublicAddress: user2.publicKey,
          amount: 5000000000,
          chainCode: "BTC",
          tokenCode: "BTC",
          status: '',
          obtId: '',
          maxFee: config.maxFee,
          technologyProviderId: '',
          payeeFioPublicKey: staker2.publicKey,
          memo: '',
          hash: '',
          offLineUrl: ''
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('sent_to_blockchain')
      } catch (err) {
        console.log('Error', err)
        expect(err).to.equal(null)
      }
    }
  })

  it('Call get_table_rows from fionames to get bundles remaining for staker2. Verify 0 bundles', async () => {
    try {
      const json = {
        json: true,
        code: 'fio.address',
        scope: 'fio.address',
        table: 'fionames',
        lower_bound: staker2.account,
        upper_bound: staker2.account,
        key_type: "i64",
        index_position: "4"
      }
      fionames = await callFioApi("get_table_rows", json);
      //console.log('fionames: ', fionames);
      const bundleCount = fionames.rows[0].bundleeligiblecountdown;
      expect(bundleCount).to.equal(0);
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`staker2 has a FIO Address with NO bundles. Verify staker2 can stake with autoproxy`, async () => {
    try {
      const result = await staker2.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: staker2.address,
          amount: stakeAmount2,
          actor: staker2.account,
          max_fee: config.maxFee,
          tpid: proxy1.address
        }
      })
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err.json.error);
      expect(err).to.equal(null);
    }
  })


})
