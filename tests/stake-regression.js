require('mocha')
const {expect} = require('chai')
const {newUser, existingUser,callFioApi,fetchJson, generateFioDomain, generateFioAddress, createKeypair} = require('../utils.js');
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
 *  int64_t UNSTAKELOCKDURATIONSECONDS = 60;
 *
 *
 *  rebuild the contracts and restart your local chain.
 *
 *  you are now ready to run these staking tests!!!
 */



describe(`************************** stake-regression.js ************************** \n    A. Stake tokens using auto proxy without voting first, \n Then do a full pull through unstaking including testing the locking period.`, () => {


  let userA1, proxy1, prevFundsAmount, locksdk
  const fundsAmount = 1000000000000


  it(`Create users`, async () => {
    userA1 = await newUser(faucet);
    proxy1 = await newUser(faucet);

    //now transfer 1k fio from the faucet to this account
    const result = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: userA1.publicKey,
      amount: 1000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    expect(result).to.have.all.keys('transaction_id', 'block_num', 'status', 'fee_collected')

   // locksdk = await existingUser('ni1eyydbdpht', '5Ke8oZdtefgVEC6GDUeo7FW9xC7WgdxC9Fi92b3YmTrPynWb4Rb', 'FIO6ydLCnUfsEMpbp35kF8oaUbHvcmLEyswMUF75C4FQAm78DUhAi', 'dapixdev', 'stake@dapixdev');

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

  it(`Success userA1 stake 3k fio using tpid and auto proxy`, async () => {
    try {
     // console.log("address used ",userA1.address)
     // console.log("account used ",userA1.account)
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA1.address,
          amount: 3000000000000,
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

  it(`Failure, userA1 try to stake again, stake 900 tokens, insufficient balance `, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA1.address,
          amount: 900000000000,
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

  it(`Failure , userA1 unstake 4k tokens, cannot unstake more than staked `, async () => {

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

  it(`success , userA1 unstake 2k tokens `, async () => {

    const result = await userA1.sdk.genericAction('pushTransaction', {
      action: 'unstakefio',
      account: 'fio.staking',
      data: {
        fio_address: userA1.address,
        amount: 2000000000000,
        actor: userA1.account,
        max_fee: config.maxFee,
        tpid:''
      }
    })
    // console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  })

  it(`Failure, Transfer 2k FIO to proxy1 FIO public key from userA1`, async () => {

    try {
      const result = await userA1.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: proxy1.publicKey,
        amount: 2000000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.not.equal('OK')
    }catch (err){
     // console.log("ERROR: ", err)
      expect(err.json.fields[0].error).to.contain('Funds locked')
    }
  })


  it(`Waiting 1 minute for unlock`, async () => {
    console.log("            waiting 60 seconds ")
  })

  it(` wait 60 seconds`, async () => {
    try {
      wait(60000)
    } catch (err) {
      console.log('Error', err)
    }
  })

  it(`Success, Transfer 2000 FIO to proxy1 FIO public key from userA1`, async () => {

    try {
      const result = await userA1.sdk.genericAction('transferTokens', {
        payeeFioPublicKey: proxy1.publicKey,
        amount: 2000000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      expect(result.status).to.equal('OK')
    }catch (err){
      console.log("ERROR: ", err)
    }
  })
})

