require('mocha')
const {expect} = require('chai')
const {newUser, existingUser, getTestType, generateFioAddress,getProdVoteTotal, timeout, getBundleCount, getAccountVoteWeight, getTotalVotedFio, callFioApi, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const { readBufferWithDetectedEncoding } = require('tslint/lib/utils');
const testType = getTestType();

let total_voted_fio, transfer_tokens_pub_key_fee, unregister_proxy_fee, register_proxy_fee

const eosio = {
  account: 'eosio',
  publicKey: 'FIO7isxEua78KPVbGzKemH4nj2bWE52gqj8Hkac3tc7jKNvpfWzYS',
  privateKey: '5KBX1dwHME4VyuUss2sYM25D5ZTDvyYrbEz37UJqwAVAsR4tGuY'
}

const fiotoken = {
  account: 'fio.token',
  publicKey: 'FIO7isxEua78KPVbGzKemH4nj2bWE52gqj8Hkac3tc7jKNvpfWzYS',
  privateKey: '5KBX1dwHME4VyuUss2sYM25D5ZTDvyYrbEz37UJqwAVAsR4tGuY'
}

before(async () => {
  console.log('************************** vote-power-regression.js **************************');

  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);

  result = await faucet.getFee('transfer_tokens_pub_key');
  transfer_tokens_pub_key_fee = result.fee;

  result = await faucet.getFee('unregister_proxy');
  unregister_proxy_fee = result.fee;

  result = await faucet.getFee('register_proxy');
  register_proxy_fee = result.fee;
})

describe(`1.1 stake W auto proxy -- Test voters info when auto proxy then stake`, () => {

  let proxyA1, userA1
  let total_bp_votes_before, total_bp_votes_after
  let userA1Balance, proxyA1Balance
  let proxyA1_lastvoteweight_before, proxyA1_proxiedvoteweight_before
  let userA1_lastvoteweight_after, userA1_proxiedvoteweight_after

  it(`Create users`, async () => {
    proxyA1 = await newUser(faucet);
    userA1 = await newUser(faucet);

    //console.log('proxyA1.account: ', proxyA1.account)
    //console.log('proxyA1.publicKey: ', proxyA1.publicKey)
    //console.log('proxyA1.privateKey: ', proxyA1.privateKey)
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it('Confirm proxyA1: not in the voters table', async () => {
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
        if (voters.rows[voter].owner == proxyA1.account) {
          inVotersTable = true;
          break;
        }
      }
      console.log('                   validate voters table');
      expect(inVotersTable).to.equal(false)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Register proxyA1 as a proxy`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyA1.address,
          actor: proxyA1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      console.log('                   validate result');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it('Confirm proxyA1: is_proxy = 1, is_auto_proxy = 0', async () => {
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
        if (voters.rows[voter].owner == proxyA1.account) {
          inVotersTable = true;
          //console.log('voters.rows[voter].is_proxy: ', voters.rows[voter].is_proxy);
          //console.log('voters.rows[voter].is_auto_proxy: ', voters.rows[voter].is_auto_proxy);
          //console.log('voters.rows[voter].proxy: ', voters.rows[voter].proxy);
          break;
        }
      }
      console.log('                   validate is auto proxy');
      expect(voters.rows[voter].is_auto_proxy).to.equal(0);
      console.log('                   validate is proxy');
      expect(voters.rows[voter].is_proxy).to.equal(1);
      console.log('                   validate in voters table');
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
      console.log('                   validate in voters table');
      expect(inVotersTable).to.equal(false)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get userA1 FIO Balance`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {
        fioPublicKey: userA1.publicKey
      })
      userA1Balance = result.balance
      //console.log('proxyB1 getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`proxyA1 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: proxyA1.address,
          actor: proxyA1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      console.log('                   validate result status');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`Get proxyA1 FIO Balance`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('getFioBalance', {
        fioPublicKey: proxyA1.publicKey
      })
      proxyA1Balance = result.balance
      //console.log('proxyB1 getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes_before = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it('get proxyA1 voters record, record proxy and last vote weight before auto proxy:  ', async () => {
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
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voters);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == proxyA1.account) {
          //console.log('voters.rows[voter]: ', voters.rows[voter]);
          break;
        }
      }

      proxyA1_lastvoteweight_before = voters.rows[voter].last_vote_weight;
      proxyA1_proxiedvoteweight_before = voters.rows[voter].proxied_vote_weight;

     // console.log("proxyA1 proxied vote weight ",voters.rows[voter].proxied_vote_weight);
     // console.log("proxyA1 last vote weight ",voters.rows[voter].last_vote_weight);
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`userA1 stake fio using tpid and auto proxy`, async () => {
    try {
      // console.log("address used ",userA1.address)
      // console.log("account used ",userA1.account)
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: userA1.address,
          amount: 200000000000,
          actor: userA1.account,
          max_fee: config.maxFee,
          tpid: proxyA1.address
        }
      })
      console.log('                   validate result status');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err)
      // expect(err.json.fields[0].error).to.contain('has not voted')
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it('Confirm userA1: is in the voters table and is_auto_proxy = 1, proxy is proxyA1.account', async () => {
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
          console.log('                   validate is auto proxy');
          expect(voters.rows[voter].is_auto_proxy).to.equal(1)
          console.log('                   validate proxy account');
          expect(voters.rows[voter].proxy).to.equal(proxyA1.account)
          break;
        }
      }
      console.log('                   validate in voter table');
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('verify proxyA1 voters record, verify last vote weight and proxied vote weight:  ', async () => {
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
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voters);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == proxyA1.account) {
          //console.log('voters.rows[voter]: ', voters.rows[voter]);
          break;
        }
      }

      proxyA1_lastvoteweight_after = voters.rows[voter].last_vote_weight;
      proxyA1_proxiedvoteweight_after = voters.rows[voter].proxied_vote_weight;

      //console.log(voters.rows[voter]);

      //console.log("proxyA1 proxied vote weight ",voters.rows[voter].proxied_vote_weight);
      //console.log("proxyA1 last vote weight ",voters.rows[voter].last_vote_weight);


      /*
       expect that proxyA1
       proxied vote weight is equal to userA1 balance
       last vote weight is equal to userA1 balance + proxyA1 balance
       */
      console.log('                   validate proxied vote weight');
      expect(voters.rows[voter].proxied_vote_weight).to.equal('2160000000000.00000000000000000');
      console.log('                   validate last vote weight');
      expect(voters.rows[voter].last_vote_weight).to.equal('4300000000000.00000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('verify userA1 voters record, verify last vote weight and proxied vote weight:  ', async () => {
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
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voters);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == userA1.account) {
          //console.log('voters.rows[voter]: ', voters.rows[voter]);
          break;
        }
      }

      userA1_lastvoteweight_after = voters.rows[voter].last_vote_weight;
      userA1_proxiedvoteweight_after = voters.rows[voter].proxied_vote_weight;

      //console.log(voters.rows[voter]);

      //console.log(" userA1 proxied vote weight ",voters.rows[voter].proxied_vote_weight);
      //console.log(" userA1 last vote weight ",voters.rows[voter].last_vote_weight);


      /*
       expect that proxyA1
       proxied vote weight is equal to userA1 balance
       last vote weight is equal to userA1 balance + proxyA1 balance
       */
      console.log('                   validate proxied vote weight ');
      expect(voters.rows[voter].proxied_vote_weight).to.equal('0.00000000000000000');
      console.log('                   validate last vote weight');
      expect(voters.rows[voter].last_vote_weight).to.equal('2160000000000.00000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`verify producers total votes bp1@dapixdevafter auto proxy`, async () => {
    try {
      total_bp_votes_after = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)

      console.log('                   validate bp votes ');
      expect(total_bp_votes_after).to.equal(total_bp_votes_before + userA1Balance )
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })


})

describe(`1.2 stake W registered proxy -- Test voters info when proxy then stake`, () => {

  let proxyA1, userA1
  let total_bp_votes_before, total_bp_votes_after
  let userA1Balance, proxyA1Balance
  let proxyA1_lastvoteweight_before, proxyA1_proxiedvoteweight_before
  let userA1_lastvoteweight_after, userA1_proxiedvoteweight_after

  it(`Create users`, async () => {
    proxyA1 = await newUser(faucet);
    userA1 = await newUser(faucet);

    //console.log('proxyA1.account: ', proxyA1.account)
    //console.log('proxyA1.publicKey: ', proxyA1.publicKey)
    //console.log('proxyA1.privateKey: ', proxyA1.privateKey)
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it('Confirm proxyA1: not in the voters table', async () => {
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
        if (voters.rows[voter].owner == proxyA1.account) {
          inVotersTable = true;
          break;
        }
      }
      console.log('                   validate in voters table');
      expect(inVotersTable).to.equal(false)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Register proxyA1 as a proxy`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyA1.address,
          actor: proxyA1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      console.log('                   validate result status');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it('Confirm proxyA1: is_proxy = 1, is_auto_proxy = 0', async () => {
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
        if (voters.rows[voter].owner == proxyA1.account) {
          inVotersTable = true;
          //console.log('voters.rows[voter].is_proxy: ', voters.rows[voter].is_proxy);
          //console.log('voters.rows[voter].is_auto_proxy: ', voters.rows[voter].is_auto_proxy);
          //console.log('voters.rows[voter].proxy: ', voters.rows[voter].proxy);
          break;
        }
      }
      console.log('                   validate  is auto proxy');
      expect(voters.rows[voter].is_auto_proxy).to.equal(0);
      console.log('                   validate  is proxy');
      expect(voters.rows[voter].is_proxy).to.equal(1);
      console.log('                   validate in voters table');
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
      console.log('                   validate in voters table');
      expect(inVotersTable).to.equal(false)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get userA1 FIO Balance`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {
        fioPublicKey: userA1.publicKey
      })
      userA1Balance = result.balance
      //console.log('proxyB1 getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`proxyA1 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: proxyA1.address,
          actor: proxyA1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      console.log('                   validate result status');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`Get proxyA1 FIO Balance`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('getFioBalance', {
        fioPublicKey: proxyA1.publicKey
      })
      proxyA1Balance = result.balance
      //console.log('proxyB1 getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`userA1 proxy votes to proxyA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxyA1.address,
          fio_address: userA1.address,
          actor: userA1.account,
          max_fee: config.api.proxy_vote.fee
        }
      })
      //console.log('Result: ', result)
      console.log('                   validate result status');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes_before = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it('get proxyA1 voters record, record proxy and last vote weight before auto proxy:  ', async () => {
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
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voters);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == proxyA1.account) {
          //console.log('voters.rows[voter]: ', voters.rows[voter]);
          break;
        }
      }

      proxyA1_lastvoteweight_before = voters.rows[voter].last_vote_weight;
      proxyA1_proxiedvoteweight_before = voters.rows[voter].proxied_vote_weight;

      //console.log(" proxyA1 proxied vote weight ",voters.rows[voter].proxied_vote_weight);
      //console.log(" proxyA1 last vote weight ",voters.rows[voter].last_vote_weight);
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`userA1 stake fio NO tpid, no address specified, collect the fee `, async () => {
    try {
      // console.log("address used ",userA1.address)
      // console.log("account used ",userA1.account)
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: '',
          amount: 200000000000,
          actor: userA1.account,
          max_fee: config.maxFee,
          tpid: ''
        }
      })

      console.log('                   validate result status ');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err)
      // expect(err.json.fields[0].error).to.contain('has not voted')
    }
  })

  it('Confirm userA1: is in the voters table and is_auto_proxy = 0, proxy is proxyA1.account', async () => {
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
          console.log('                   validate is auto proxy');
          expect(voters.rows[voter].is_auto_proxy).to.equal(0)
          console.log('                   validate proxy');
          expect(voters.rows[voter].proxy).to.equal(proxyA1.account)
          break;
        }
      }
      console.log('                   validate in voters table ');
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('verify proxyA1 voters record, verify last vote weight and proxied vote weight:  ', async () => {
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
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voters);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == proxyA1.account) {
          //console.log('voters.rows[voter]: ', voters.rows[voter]);
          break;
        }
      }

      proxyA1_lastvoteweight_after = voters.rows[voter].last_vote_weight;
      proxyA1_proxiedvoteweight_after = voters.rows[voter].proxied_vote_weight;

     // console.log(voters.rows[voter]);

     // console.log(" proxyA1 proxied vote weight ",voters.rows[voter].proxied_vote_weight);
     // console.log(" proxyA1 last vote weight ",voters.rows[voter].last_vote_weight);


      /*
       expect that proxyA1
       proxied vote weight is equal to userA1 balance
       last vote weight is equal to userA1 balance + proxyA1 balance
       */

      console.log('                   validate proxied vote weight');
      expect(voters.rows[voter].proxied_vote_weight).to.equal('2157000000000.00000000000000000');
      console.log('                   validate last vote weight');
      expect(voters.rows[voter].last_vote_weight).to.equal('4297000000000.00000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('verify userA1 voters record, verify last vote weight and proxied vote weight:  ', async () => {
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
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voters);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == userA1.account) {
          //console.log('voters.rows[voter]: ', voters.rows[voter]);
          break;
        }
      }

      userA1_lastvoteweight_after = voters.rows[voter].last_vote_weight;
      userA1_proxiedvoteweight_after = voters.rows[voter].proxied_vote_weight;

      //console.log(voters.rows[voter]);

      //console.log(" userA1 proxied vote weight ",voters.rows[voter].proxied_vote_weight);
      //console.log(" userA1 last vote weight ",voters.rows[voter].last_vote_weight);


      /*
       expect that proxyA1
       proxied vote weight is equal to userA1 balance
       last vote weight is equal to userA1 balance + proxyA1 balance
       */
      console.log('                   validate proxied vote weight ');
      expect(voters.rows[voter].proxied_vote_weight).to.equal('0.00000000000000000');
      console.log('                   validate last vote weight');
      expect(voters.rows[voter].last_vote_weight).to.equal('2157000000000.00000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`verify producers total votes bp1@dapixdevafter auto proxy`, async () => {
    try {
      total_bp_votes_after = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)

      console.log('                   validate bp votes');
      expect(total_bp_votes_after).to.equal(total_bp_votes_before - 3000000000)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })
})

describe(`1.3 stake with fee from voting account -- Test voters info when vote then stake`, () => {

  let userA1
  let total_bp_votes_before, total_bp_votes_after
  let userA1Balance
  let userA1_lastvoteweight_after, userA1_proxiedvoteweight_after

  it(`Create users`, async () => {
    proxyA1 = await newUser(faucet);
    userA1 = await newUser(faucet);

    //console.log('proxyA1.account: ', proxyA1.account)
    //console.log('proxyA1.publicKey: ', proxyA1.publicKey)
    //console.log('proxyA1.privateKey: ', proxyA1.privateKey)
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

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
      console.log('                   validate in voters table');
      expect(inVotersTable).to.equal(false)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`userA1 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: userA1.address,
          actor: userA1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      console.log('                   validate result status');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`Get userA1 FIO Balance`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {
        fioPublicKey: userA1.publicKey
      })
      userA1Balance = result.balance
      //console.log('proxyB1 getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes_before = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`userA1 stake fio NO tpid, no address specified, collect the fee `, async () => {
    try {
      // console.log("address used ",userA1.address)
      // console.log("account used ",userA1.account)
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'stakefio',
        account: 'fio.staking',
        data: {
          fio_address: '',
          amount: 200000000000,
          actor: userA1.account,
          max_fee: config.maxFee,
          tpid: ''
        }
      })

      console.log('                   validate result status');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err)
      // expect(err.json.fields[0].error).to.contain('has not voted')
    }
  })

  it('Confirm userA1: is in the voters table and is_auto_proxy = 0, proxy is proxyA1.account', async () => {
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
          console.log('                   validate is auto proxy');
          expect(voters.rows[voter].is_auto_proxy).to.equal(0)
          console.log('                   validate proxy');
          expect(voters.rows[voter].proxy).to.equal('')
          break;
        }
      }
      console.log('                   validate in voters table ');
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('verify userA1 voters record, verify last vote weight and proxied vote weight:  ', async () => {
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
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voters);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == userA1.account) {
          //console.log('voters.rows[voter]: ', voters.rows[voter]);
          break;
        }
      }

      userA1_lastvoteweight_after = voters.rows[voter].last_vote_weight;
      userA1_proxiedvoteweight_after = voters.rows[voter].proxied_vote_weight;

      //console.log(voters.rows[voter]);

      //console.log(" userA1 proxied vote weight ",voters.rows[voter].proxied_vote_weight);
      //console.log(" userA1 last vote weight ",voters.rows[voter].last_vote_weight);


      /*
       expect that proxyA1
       proxied vote weight is equal to userA1 balance
       last vote weight is equal to userA1 balance + proxyA1 balance
       */

      console.log('                   validate proxied vote weight ');
      expect(voters.rows[voter].proxied_vote_weight).to.equal('0.00000000000000000');
      console.log('                   validate last vote weight ');
      expect(voters.rows[voter].last_vote_weight).to.equal('2157000000000.00000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`verify producers total votes bp1@dapixdevafter auto proxy`, async () => {
    try {
      total_bp_votes_after = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)

      console.log('                   validate bp votes');
      expect(total_bp_votes_after).to.equal(total_bp_votes_before  - 3000000000)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })
})

describe(`2.1 regaddress W auto proxy -- Test voters info when auto proxy then regaddress`, () => {

  let proxyA1, userA1
  let total_bp_votes_before, total_bp_votes_after
  let userA1Balance, proxyA1Balance
  let proxyA1_lastvoteweight_before, proxyA1_proxiedvoteweight_before
  let userA1_lastvoteweight_after, userA1_proxiedvoteweight_after

  it(`Create users`, async () => {
    proxyA1 = await newUser(faucet);
    userA1 = await newUser(faucet);

    //console.log('proxyA1.account: ', proxyA1.account)
    //console.log('proxyA1.publicKey: ', proxyA1.publicKey)
    //console.log('proxyA1.privateKey: ', proxyA1.privateKey)
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it('Confirm proxyA1: not in the voters table', async () => {
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
        if (voters.rows[voter].owner == proxyA1.account) {
          inVotersTable = true;
          break;
        }
      }
      console.log('                   validate voters table');
      expect(inVotersTable).to.equal(false)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Register proxyA1 as a proxy`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyA1.address,
          actor: proxyA1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      console.log('                   validate result');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it('Confirm proxyA1: is_proxy = 1, is_auto_proxy = 0', async () => {
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
        if (voters.rows[voter].owner == proxyA1.account) {
          inVotersTable = true;
          //console.log('voters.rows[voter].is_proxy: ', voters.rows[voter].is_proxy);
          //console.log('voters.rows[voter].is_auto_proxy: ', voters.rows[voter].is_auto_proxy);
          //console.log('voters.rows[voter].proxy: ', voters.rows[voter].proxy);
          break;
        }
      }
      console.log('                   validate is auto proxy');
      expect(voters.rows[voter].is_auto_proxy).to.equal(0);
      console.log('                   validate is proxy');
      expect(voters.rows[voter].is_proxy).to.equal(1);
      console.log('                   validate in voters table');
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
      console.log('                   validate in voters table');
      expect(inVotersTable).to.equal(false)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get userA1 FIO Balance`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {
        fioPublicKey: userA1.publicKey
      })
      userA1Balance = result.balance
      //console.log('proxyB1 getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`proxyA1 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: proxyA1.address,
          actor: proxyA1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      console.log('                   validate result status');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`Get proxyA1 FIO Balance`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('getFioBalance', {
        fioPublicKey: proxyA1.publicKey
      })
      proxyA1Balance = result.balance
      //console.log('proxyB1 getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes_before = await getProdVoteTotal('bp1@dapixdev');
     // console.log('bp1@dapixdev total_votes:', total_bp_votes_before)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it('get proxyA1 voters record, record proxy and last vote weight before auto proxy:  ', async () => {
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
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voters);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == proxyA1.account) {
          //console.log('voters.rows[voter]: ', voters.rows[voter]);
          break;
        }
      }

      proxyA1_lastvoteweight_before = voters.rows[voter].last_vote_weight;
      proxyA1_proxiedvoteweight_before = voters.rows[voter].proxied_vote_weight;

      // console.log("proxyA1 proxied vote weight ",voters.rows[voter].proxied_vote_weight);
      // console.log("proxyA1 last vote weight ",voters.rows[voter].last_vote_weight);
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`userA1 regaddress using tpid and auto proxy`, async () => {
    try {
      // console.log("address used ",userA1.address)
      // console.log("account used ",userA1.account)
      /*
      const string &fio_address, const string &owner_fio_public_key, const int64_t &max_fee,
                   const name &actor,
                   const string &tpid)
       */
      let address2 = generateFioAddress(userA1.domain, 5);

      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        data: {
          fio_address: address2,
          owner_fio_public_key: userA1.publicKey,
          max_fee: config.maxFee,
          actor: userA1.account,
          tpid: proxyA1.address
        }
      })
      console.log('                   validate result status');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err)
      // expect(err.json.fields[0].error).to.contain('has not voted')
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it('Confirm userA1: is in the voters table and is_auto_proxy = 1, proxy is proxyA1.account', async () => {
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
          console.log('                   validate is auto proxy');
          expect(voters.rows[voter].is_auto_proxy).to.equal(1)
          console.log('                   validate proxy account');
          expect(voters.rows[voter].proxy).to.equal(proxyA1.account)
          break;
        }
      }
      console.log('                   validate in voter table');
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('verify proxyA1 voters record, verify last vote weight and proxied vote weight:  ', async () => {
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
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voters);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == proxyA1.account) {
          //console.log('voters.rows[voter]: ', voters.rows[voter]);
          break;
        }
      }

      proxyA1_lastvoteweight_after = voters.rows[voter].last_vote_weight;
      proxyA1_proxiedvoteweight_after = voters.rows[voter].proxied_vote_weight;

     // console.log(voters.rows[voter]);

      //console.log("proxyA1 proxied vote weight ",voters.rows[voter].proxied_vote_weight);
      //console.log("proxyA1 last vote weight ",voters.rows[voter].last_vote_weight);


      /*
       expect that proxyA1
       proxied vote weight is equal to userA1 balance
       last vote weight is equal to userA1 balance + proxyA1 balance
       */
      console.log('                   validate proxied vote weight');
      expect(voters.rows[voter].proxied_vote_weight).to.equal('2120000000000.00000000000000000');
      console.log('                   validate last vote weight');
      expect(voters.rows[voter].last_vote_weight).to.equal('4260000000000.00000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('verify userA1 voters record, verify last vote weight and proxied vote weight:  ', async () => {
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
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voters);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == userA1.account) {
          //console.log('voters.rows[voter]: ', voters.rows[voter]);
          break;
        }
      }

      userA1_lastvoteweight_after = voters.rows[voter].last_vote_weight;
      userA1_proxiedvoteweight_after = voters.rows[voter].proxied_vote_weight;

      //console.log(voters.rows[voter]);

      //console.log(" userA1 proxied vote weight ",voters.rows[voter].proxied_vote_weight);
      //console.log(" userA1 last vote weight ",voters.rows[voter].last_vote_weight);


      /*
       expect that proxyA1
       proxied vote weight is equal to userA1 balance
       last vote weight is equal to userA1 balance + proxyA1 balance
       */
      console.log('                   validate proxied vote weight ');
      expect(voters.rows[voter].proxied_vote_weight).to.equal('0.00000000000000000');
      console.log('                   validate last vote weight');
      expect(voters.rows[voter].last_vote_weight).to.equal( '2120000000000.00000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`verify producers total votes bp1@dapixdevafter auto proxy`, async () => {
    try {
      total_bp_votes_after = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)

      console.log('                   validate bp votes ');
      expect(total_bp_votes_after).to.equal(total_bp_votes_before + userA1Balance -40000000000 )
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })


})

describe(`2.2 regaddress W registered proxy -- Test voters info when proxy then regaddress`, () => {

  let proxyA1, userA1
  let total_bp_votes_before, total_bp_votes_after
  let userA1Balance, proxyA1Balance
  let proxyA1_lastvoteweight_before, proxyA1_proxiedvoteweight_before
  let userA1_lastvoteweight_after, userA1_proxiedvoteweight_after


  it(`Create users`, async () => {
    proxyA1 = await newUser(faucet);
    userA1 = await newUser(faucet);

    //console.log('proxyA1.account: ', proxyA1.account)
    //console.log('proxyA1.publicKey: ', proxyA1.publicKey)
    //console.log('proxyA1.privateKey: ', proxyA1.privateKey)
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it('Confirm proxyA1: not in the voters table', async () => {
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
        if (voters.rows[voter].owner == proxyA1.account) {
          inVotersTable = true;
          break;
        }
      }
      console.log('                   validate voters table');
      expect(inVotersTable).to.equal(false)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Register proxyA1 as a proxy`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxyA1.address,
          actor: proxyA1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      console.log('                   validate result');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it('Confirm proxyA1: is_proxy = 1, is_auto_proxy = 0', async () => {
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
        if (voters.rows[voter].owner == proxyA1.account) {
          inVotersTable = true;
          //console.log('voters.rows[voter].is_proxy: ', voters.rows[voter].is_proxy);
          //console.log('voters.rows[voter].is_auto_proxy: ', voters.rows[voter].is_auto_proxy);
          //console.log('voters.rows[voter].proxy: ', voters.rows[voter].proxy);
          break;
        }
      }
      console.log('                   validate is auto proxy');
      expect(voters.rows[voter].is_auto_proxy).to.equal(0);
      console.log('                   validate is proxy');
      expect(voters.rows[voter].is_proxy).to.equal(1);
      console.log('                   validate in voters table');
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
      console.log('                   validate in voters table');
      expect(inVotersTable).to.equal(false)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`Get userA1 FIO Balance`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {
        fioPublicKey: userA1.publicKey
      })
      userA1Balance = result.balance
      //console.log('proxyB1 getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`proxyA1 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: proxyA1.address,
          actor: proxyA1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      console.log('                   validate result status');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`Get proxyA1 FIO Balance`, async () => {
    try {
      const result = await proxyA1.sdk.genericAction('getFioBalance', {
        fioPublicKey: proxyA1.publicKey
      })
      proxyA1Balance = result.balance
      //console.log('proxyB1 getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`userA1 proxy votes to proxyA1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxyA1.address,
          fio_address: userA1.address,
          actor: userA1.account,
          max_fee: config.api.proxy_vote.fee
        }
      })
      //console.log('Result: ', result)
      console.log('                   validate result status');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
    }
  })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes_before = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it('get proxyA1 voters record, record proxy and last vote weight before auto proxy:  ', async () => {
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
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voters);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == proxyA1.account) {
          //console.log('voters.rows[voter]: ', voters.rows[voter]);
          break;
        }
      }

      proxyA1_lastvoteweight_before = voters.rows[voter].last_vote_weight;
      proxyA1_proxiedvoteweight_before = voters.rows[voter].proxied_vote_weight;

      //console.log(" proxyA1 proxied vote weight ",voters.rows[voter].proxied_vote_weight);
      //console.log(" proxyA1 last vote weight ",voters.rows[voter].last_vote_weight);
      //expect(voters.rows[voter].addresshash).to.equal('0x00000000000000000000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`userA1 regaddress using no tpid `, async () => {
    try {
      // console.log("address used ",userA1.address)
      // console.log("account used ",userA1.account)
      /*
      const string &fio_address, const string &owner_fio_public_key, const int64_t &max_fee,
                   const name &actor,
                   const string &tpid)
       */
      let address2 = generateFioAddress(userA1.domain, 5);

      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        data: {
          fio_address: address2,
          owner_fio_public_key: userA1.publicKey,
          max_fee: config.maxFee,
          actor: userA1.account,
          tpid: ''
        }
      })
      console.log('                   validate result status');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err)
      // expect(err.json.fields[0].error).to.contain('has not voted')
    }
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it('Confirm userA1: is in the voters table and is_auto_proxy = 0, proxy is proxyA1.account', async () => {
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
          console.log('                   validate is auto proxy');
          expect(voters.rows[voter].is_auto_proxy).to.equal(0)
          console.log('                   validate proxy account');
          expect(voters.rows[voter].proxy).to.equal(proxyA1.account)
          break;
        }
      }
      console.log('                   validate in voter table');
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('verify proxyA1 voters record, verify last vote weight and proxied vote weight:  ', async () => {
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
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voters);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == proxyA1.account) {
          //console.log('voters.rows[voter]: ', voters.rows[voter]);
          break;
        }
      }

      proxyA1_lastvoteweight_after = voters.rows[voter].last_vote_weight;
      proxyA1_proxiedvoteweight_after = voters.rows[voter].proxied_vote_weight;

      // console.log(voters.rows[voter]);

      //console.log("proxyA1 proxied vote weight ",voters.rows[voter].proxied_vote_weight);
      //console.log("proxyA1 last vote weight ",voters.rows[voter].last_vote_weight);


      /*
       expect that proxyA1
       proxied vote weight is equal to userA1 balance
       last vote weight is equal to userA1 balance + proxyA1 balance
       */
      console.log('                   validate proxied vote weight');
      expect(voters.rows[voter].proxied_vote_weight).to.equal('2120000000000.00000000000000000');
      console.log('                   validate last vote weight');
      expect(voters.rows[voter].last_vote_weight).to.equal('4260000000000.00000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('verify userA1 voters record, verify last vote weight and proxied vote weight:  ', async () => {
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
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voters);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == userA1.account) {
          //console.log('voters.rows[voter]: ', voters.rows[voter]);
          break;
        }
      }

      userA1_lastvoteweight_after = voters.rows[voter].last_vote_weight;
      userA1_proxiedvoteweight_after = voters.rows[voter].proxied_vote_weight;

      //console.log(voters.rows[voter]);

      //console.log(" userA1 proxied vote weight ",voters.rows[voter].proxied_vote_weight);
      //console.log(" userA1 last vote weight ",voters.rows[voter].last_vote_weight);


      /*
       expect that proxyA1
       proxied vote weight is equal to userA1 balance
       last vote weight is equal to userA1 balance + proxyA1 balance
       */
      console.log('                   validate proxied vote weight ');
      expect(voters.rows[voter].proxied_vote_weight).to.equal('0.00000000000000000');
      console.log('                   validate last vote weight');
      expect(voters.rows[voter].last_vote_weight).to.equal( '2120000000000.00000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`verify producers total votes bp1@dapixdevafter auto proxy`, async () => {
    try {
      total_bp_votes_after = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)

      console.log('                   validate bp votes ');
      expect(total_bp_votes_after).to.equal(total_bp_votes_before  -40000000000 )
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

})

describe(`2.3 regaddress with fee from voting account -- Test voters info when vote then stake`, () => {

  let userA1
  let total_bp_votes_before, total_bp_votes_after
  let userA1Balance
  let userA1_lastvoteweight_after, userA1_proxiedvoteweight_after

  it(`Create users`, async () => {
    proxyA1 = await newUser(faucet);
    userA1 = await newUser(faucet);

    //console.log('proxyA1.account: ', proxyA1.account)
    //console.log('proxyA1.publicKey: ', proxyA1.publicKey)
    //console.log('proxyA1.privateKey: ', proxyA1.privateKey)
  })

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

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
      console.log('                   validate in voters table');
      expect(inVotersTable).to.equal(false)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`userA1 votes for bp1@dapixdev using address #1`, async () => {
    try {
      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            'bp1@dapixdev'
          ],
          fio_address: userA1.address,
          actor: userA1.account,
          max_fee: config.maxFee
        }
      })
      //console.log('Result: ', result)
      console.log('                   validate result status');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log('Error: ', err.json)
      expect(err).to.equal('null')
    }
  })

  it(`Get userA1 FIO Balance`, async () => {
    try {
      const result = await userA1.sdk.genericAction('getFioBalance', {
        fioPublicKey: userA1.publicKey
      })
      userA1Balance = result.balance
      //console.log('proxyB1 getFioBalance: ', result.balance)
    } catch (err) {
      console.log('Error: ', err)
    }
  })

  it(`Get bp1@dapixdev total_votes`, async () => {
    try {
      total_bp_votes_before = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })

  it(`userA1 regaddress using no tpid `, async () => {
    try {
      // console.log("address used ",userA1.address)
      // console.log("account used ",userA1.account)
      /*
      const string &fio_address, const string &owner_fio_public_key, const int64_t &max_fee,
                   const name &actor,
                   const string &tpid)
       */
      let address2 = generateFioAddress(userA1.domain, 5);

      const result = await userA1.sdk.genericAction('pushTransaction', {
        action: 'regaddress',
        account: 'fio.address',
        data: {
          fio_address: address2,
          owner_fio_public_key: userA1.publicKey,
          max_fee: config.maxFee,
          actor: userA1.account,
          tpid: ''
        }
      })
      console.log('                   validate result status');
      expect(result.status).to.equal('OK')
    } catch (err) {
      console.log("Error : ", err)
      // expect(err.json.fields[0].error).to.contain('has not voted')
    }
  })

  it('Confirm userA1: is in the voters table and is_auto_proxy = 0, proxy is proxyA1.account', async () => {
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
          console.log('                   validate is auto proxy');
          expect(voters.rows[voter].is_auto_proxy).to.equal(0)
          console.log('                   validate proxy');
          expect(voters.rows[voter].proxy).to.equal('')
          break;
        }
      }
      console.log('                   validate in voters table ');
      expect(inVotersTable).to.equal(true)
    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it('verify userA1 voters record, verify last vote weight and proxied vote weight:  ', async () => {
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
      voters = await callFioApi("get_table_rows", json);
      //console.log('voters: ', voters);
      for (voter in voters.rows) {
        if (voters.rows[voter].owner == userA1.account) {
          //console.log('voters.rows[voter]: ', voters.rows[voter]);
          break;
        }
      }

      userA1_lastvoteweight_after = voters.rows[voter].last_vote_weight;
      userA1_proxiedvoteweight_after = voters.rows[voter].proxied_vote_weight;

      //console.log(voters.rows[voter]);

      //console.log(" userA1 proxied vote weight ",voters.rows[voter].proxied_vote_weight);
      //console.log(" userA1 last vote weight ",voters.rows[voter].last_vote_weight);


      /*
       expect that proxyA1
       proxied vote weight is equal to userA1 balance
       last vote weight is equal to userA1 balance + proxyA1 balance
       */
      console.log('                   validate proxied vote weight ');
      expect(voters.rows[voter].proxied_vote_weight).to.equal('0.00000000000000000');
      console.log('                   validate last vote weight');
      expect(voters.rows[voter].last_vote_weight).to.equal( '2120000000000.00000000000000000');

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`verify producers total votes bp1@dapixdevafter auto proxy`, async () => {
    try {
      total_bp_votes_after = await getProdVoteTotal('bp1@dapixdev');
      //console.log('bp1@dapixdev total_votes:', total_bp_votes)

      console.log('                   validate bp votes');
      expect(total_bp_votes_after).to.equal(total_bp_votes_before  - 40000000000)
    } catch (err) {
      console.log('Error: ', err)
      expect(err).to.equal('null')
    }
  })
})
