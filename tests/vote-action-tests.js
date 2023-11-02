require('mocha')
const {expect} = require('chai')
const {
  newUser, 
  existingUser,
  generateFioAddress, 
  generateFioDomain, 
  createKeypair, 
  callFioApi,
  callFioApiSigned,
  getFees,
  getCurrencyBalance,
  consumeRemainingBundles,
  getRemainingLockAmount,
  getProdVoteTotal,
  getAccountVoteWeight,
  timeout, 
  randStr,
  fetchJson
} = require('../utils.js');
const {
  getOracleRecords,
  registerNewBp,
  registerNewOracle,
  setTestOracleFees,
  cleanUpOraclessTable,
  calculateOracleFeeFromOraclessTable
} = require("./Helpers/wrapping.js");
const {FIOSDK } = require('@fioprotocol/fiosdk');
const { number } = require('mathjs');
const { initParams } = require('request');
config = require('../config.js');

const faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);

let voterWithProd, voterWithProxy, voterWithAutoproxy, bp1, bp2, bp3, proxy, autoproxy, otherUser3;

async function getVoterInfo(user) {
  const json = {
    json: true,
    code: 'eosio',
    scope: 'eosio',
    table: 'voters',
    lower_bound: user.account,
    upper_bound: user.account,
    key_type: "name",
    index_position: "3",
    json: true
  }
  const result = await callFioApi("get_table_rows", json);
  return result.rows[0];
}
  
async function getProdVoteWeight(account) {
  const json = {
    json: true,
    code: 'eosio',
    scope: 'eosio',
    table: 'producers',
    lower_bound: account,
    upper_bound: account,
    key_type: "name",
    index_position: "4",
    json: true
  }
  const result = await callFioApi("get_table_rows", json);
  return result.rows[0].total_votes;
}

async function validateVotes() {
    // producer
    const bp1_prev_total_votes = bp1.total_votes;
    bp1.total_votes = await getProdVoteTotal(bp1.address) / 1000000000;
    bp1.diff_total_votes = bp1.total_votes - bp1_prev_total_votes;

    // voterWithProd
    const voterWithProd_prev_last_vote_weight = voterWithProd.last_vote_weight;
    voterWithProd.last_vote_weight = await getAccountVoteWeight(voterWithProd.account) / 1000000000;
    voterWithProd.diff_last_vote_weight = voterWithProd.last_vote_weight - voterWithProd_prev_last_vote_weight;
    voterWithProd.prev_currency_balance = voterWithProd.currency_balance;
    voterWithProd.currency_balance = await getCurrencyBalance(voterWithProd.account);
    voterWithProd.diff_currency_balance = voterWithProd.currency_balance - voterWithProd.prev_currency_balance;

    // proxy
    const proxy_prev_last_vote_weight = proxy.last_vote_weight;
    const proxy_prev_proxied_vote_weight = proxy.proxied_vote_weight;
    const proxyInfo = await getVoterInfo(proxy);
    proxy.last_vote_weight = Number(proxyInfo.last_vote_weight) / 1000000000;
    proxy.proxied_vote_weight = Number(proxyInfo.proxied_vote_weight) / 1000000000;
    proxy.diff_last_vote_weight = proxy.last_vote_weight - proxy_prev_last_vote_weight;
    proxy.diff_proxied_vote_weight = proxy.proxied_vote_weight - proxy_prev_proxied_vote_weight;
    proxy.prev_currency_balance = proxy.currency_balance;
    proxy.currency_balance = await getCurrencyBalance(proxy.account);
    proxy.diff_currency_balance = proxy.currency_balance - proxy.prev_currency_balance;

    // voterWithProxy
    const voterWithProxy_prev_last_vote_weight = voterWithProxy.last_vote_weight;
    voterWithProxy.last_vote_weight = await getAccountVoteWeight(voterWithProxy.account) / 1000000000;
    voterWithProxy.diff_last_vote_weight = voterWithProxy.last_vote_weight - voterWithProxy_prev_last_vote_weight;
    const voterWithProxy_prev_currency_balance = voterWithProxy.currency_balance;
    voterWithProxy.currency_balance = await getCurrencyBalance(voterWithProxy.account);
    voterWithProxy.diff_currency_balance = voterWithProxy.currency_balance - voterWithProxy_prev_currency_balance;

    // autoproxy
    const autoproxy_prev_last_vote_weight = autoproxy.last_vote_weight;
    const autoproxy_prev_proxied_vote_weight = autoproxy.prev_proxied_vote_weight;
    const autoproxyInfo = await getVoterInfo(autoproxy);
    autoproxy.last_vote_weight = Number(autoproxyInfo.last_vote_weight) / 1000000000;
    autoproxy.proxied_vote_weight = Number(autoproxyInfo.proxied_vote_weight) / 1000000000;
    autoproxy.diff_last_vote_weight = autoproxy.last_vote_weight - autoproxy_prev_last_vote_weight;
    autoproxy.diff_proxied_vote_weight = autoproxy.proxied_vote_weight - autoproxy_prev_proxied_vote_weight;
    const autoproxy_prev_currency_balance = autoproxy.currency_balance;
    autoproxy.currency_balance = await getCurrencyBalance(autoproxy.account);
    autoproxy.diff_currency_balance = autoproxy.currency_balance - autoproxy_prev_currency_balance;

    // voterWithAutoproxy
    const voterWithAutoproxy_prev_last_vote_weight = voterWithAutoproxy.last_vote_weight;
    voterWithAutoproxy.last_vote_weight = await getAccountVoteWeight(voterWithAutoproxy.account) / 1000000000;
    voterWithAutoproxy.diff_last_vote_weight = voterWithAutoproxy.last_vote_weight - voterWithAutoproxy_prev_last_vote_weight;
    const voterWithAutoproxy_prev_currency_balance = voterWithAutoproxy.currency_balance;
    voterWithAutoproxy.currency_balance = await getCurrencyBalance(voterWithAutoproxy.account);
    voterWithAutoproxy.diff_currency_balance = voterWithAutoproxy.currency_balance - voterWithAutoproxy_prev_currency_balance;

    // producer
    // try {
    expect(bp1.diff_total_votes).to.equal(voterWithProd.diff_last_vote_weight + proxy.diff_last_vote_weight + autoproxy.diff_last_vote_weight);
    // } catch (err) {
    //   console.log('producer error: ', err);
    //   expect(err).to.equal(null);
    // }
    
    // // voterWithProd
    expect(voterWithProd.diff_last_vote_weight).to.equal(voterWithProd.diff_currency_balance);
    
    // // proxy
    expect(proxy.diff_last_vote_weight).to.equal(proxy.diff_currency_balance + voterWithProxy.diff_last_vote_weight);
    expect(proxy.diff_proxied_vote_weight).to.equal(voterWithProxy.diff_last_vote_weight);

    // // voterWithProxy
    expect(voterWithProxy.diff_last_vote_weight).to.equal(voterWithProxy.diff_currency_balance);

    // // autoproxy
    expect(autoproxy.diff_last_vote_weight).to.equal(autoproxy.diff_currency_balance + voterWithAutoproxy.diff_last_vote_weight);
      //expect(autoproxy.diff_proxied_vote_weight).to.equal(voterWithAutoproxy.diff_last_vote_weight);

    // // voterWithAutoproxy
      //expect(voterWithAutoproxy.diff_last_vote_weight).to.equal(voterWithAutoproxy.diff_currency_balance);
}

async function validateVotesOrig() {
  // producer
  bp1.prev_total_votes = bp1.total_votes;
  bp1.total_votes = Number(await getProdVoteWeight(bp1.account)) / 1000000000;
  bp1.diff_total_votes = bp1.total_votes - bp1.prev_total_votes;

  // voterWithProd
  voterWithProd.prev_last_vote_weight = voterWithProd.last_vote_weight;
  const voterWithProdInfo = await getVoterInfo(voterWithProd);
  voterWithProd.last_vote_weight = Number(voterWithProdInfo.last_vote_weight) / 1000000000;
  voterWithProd.diff_last_vote_weight = voterWithProd.last_vote_weight - voterWithProd.prev_last_vote_weight;
  voterWithProd.prev_currency_balance = voterWithProd.currency_balance;
  voterWithProd.currency_balance = await getCurrencyBalance(voterWithProd.account);
  voterWithProd.diff_currency_balance = voterWithProd.currency_balance - voterWithProd.prev_currency_balance;

  // proxy
  proxy.prev_last_vote_weight = proxy.last_vote_weight;
  proxy.prev_proxied_vote_weight = proxy.proxied_vote_weight;
  const proxyInfo = await getVoterInfo(proxy);
  proxy.last_vote_weight = Number(proxyInfo.last_vote_weight) / 1000000000;
  proxy.proxied_vote_weight = Number(proxyInfo.proxied_vote_weight) / 1000000000;
  proxy.diff_last_vote_weight = proxy.last_vote_weight - proxy.prev_last_vote_weight;
  proxy.diff_proxied_vote_weight = proxy.proxied_vote_weight - proxy.prev_proxied_vote_weight;
  proxy.prev_currency_balance = proxy.currency_balance;
  proxy.currency_balance = await getCurrencyBalance(proxy.account);
  proxy.diff_currency_balance = proxy.currency_balance - proxy.prev_currency_balance;

  // voterWithProxy
  voterWithProxy.prev_last_vote_weight = voterWithProxy.last_vote_weight;
  const voterWithProxyInfo = await getVoterInfo(voterWithProxy);
  voterWithProxy.last_vote_weight = Number(voterWithProxyInfo.last_vote_weight) / 1000000000;
  voterWithProxy.diff_last_vote_weight = voterWithProxy.last_vote_weight - voterWithProxy.prev_last_vote_weight;

  voterWithProxy.prev_currency_balance = voterWithProxy.currency_balance;
  voterWithProxy.currency_balance = await getCurrencyBalance(voterWithProxy.account);
  voterWithProxy.diff_currency_balance = voterWithProxy.currency_balance - voterWithProxy.prev_currency_balance;

  // autoproxy
  autoproxy.prev_last_vote_weight = autoproxy.last_vote_weight;
  autoproxy.prev_proxied_vote_weight = autoproxy.proxied_vote_weight;
  const autoproxyInfo = await getVoterInfo(autoproxy);
  autoproxy.last_vote_weight = Number(autoproxyInfo.last_vote_weight) / 1000000000;
  autoproxy.proxied_vote_weight = Number(autoproxyInfo.proxied_vote_weight) / 1000000000;
  autoproxy.diff_last_vote_weight = autoproxy.last_vote_weight - autoproxy.prev_last_vote_weight;
  autoproxy.diff_proxied_vote_weight = autoproxy.proxied_vote_weight - autoproxy.prev_proxied_vote_weight;
  autoproxy.prev_currency_balance = autoproxy.currency_balance;
  autoproxy.currency_balance = await getCurrencyBalance(autoproxy.account);
  autoproxy.diff_currency_balance = autoproxy.currency_balance - autoproxy.prev_currency_balance;

  // voterWithAutoproxy
  voterWithAutoproxy.prev_last_vote_weight = voterWithAutoproxy.last_vote_weight;
  const voterWithAutoproxyyInfo = await getVoterInfo(voterWithAutoproxy);
  voterWithAutoproxy.last_vote_weight = Number(voterWithAutoproxyyInfo.last_vote_weight) / 1000000000;
  voterWithAutoproxy.diff_last_vote_weight = voterWithAutoproxy.last_vote_weight - voterWithAutoproxy.prev_last_vote_weight;
  voterWithAutoproxy.prev_currency_balance = voterWithAutoproxy.currency_balance;
  voterWithAutoproxy.currency_balance = await getCurrencyBalance(voterWithAutoproxy.account);
  voterWithAutoproxy.diff_currency_balance = voterWithAutoproxy.currency_balance - voterWithAutoproxy.prev_currency_balance;

  // producer
  try {
    expect(bp1.diff_total_votes).to.equal(voterWithProd.diff_last_vote_weight + proxy.diff_last_vote_weight + autoproxy.diff_last_vote_weight);
  } catch (err) {
    console.log('producer error: ', err);
    expect(err).to.equal(null);
  }
  
  // voterWithProd
    expect(voterWithProd.diff_last_vote_weight).to.equal(voterWithProd.diff_currency_balance);
  
  // proxy
    expect(proxy.diff_last_vote_weight).to.equal(proxy.diff_currency_balance + voterWithProxy.diff_last_vote_weight);
    expect(proxy.diff_proxied_vote_weight).to.equal(voterWithProxy.diff_last_vote_weight);

  // voterWithProxy
    expect(voterWithProxy.diff_last_vote_weight).to.equal(voterWithProxy.diff_currency_balance);

  // autoproxy
    expect(autoproxy.diff_last_vote_weight).to.equal(autoproxy.diff_currency_balance + voterWithAutoproxy.diff_last_vote_weight);
    expect(autoproxy.diff_proxied_vote_weight).to.equal(voterWithAutoproxy.diff_last_vote_weight);

  // voterWithAutoproxy
    expect(voterWithAutoproxy.diff_last_vote_weight).to.equal(voterWithAutoproxy.diff_currency_balance);
}

before(async () => {
  bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
  bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
  bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');

  // Send some FIO to bp1
  await faucet.genericAction('pushTransaction', {
    action: 'trnsfiopubky',
    account: 'fio.token',
    data: {
        payee_public_key: bp1.publicKey,
        amount: 5000000000000,
        max_fee: config.maxFee,
        tpid: '',
        actor: faucet.account
    }
  });
})

describe('************************** vote-action-tests.js ************************** \n    A. Testing generic actions', () => {
  const xferTo = 2000000000000;  // 2000 FIO
  const xferFrom = 20000000000;  // 20 FIO
  const retireAmount = 1000000000000;  // 1000 FIO (min amount)
  const amount = 10000000000; // 10 FIO

  describe('Setup: create bp1, proxy, autoproxy users', () => {
 
    it(`Create users`, async () => {
      voterWithProd = await newUser(faucet);
      proxy = await newUser(faucet);
      voterWithProxy = await newUser(faucet);
      autoproxy = await newUser(faucet);
      voterWithAutoproxy = await newUser(faucet);
      otherUser = await newUser(faucet);
    })
  
    it(`Wait a few seconds.`, async () => { await timeout(3000) })

    it(`Initialize bp1.total_votes`, async () => {
      try {
        bp1.total_votes = await getProdVoteTotal(bp1.address) / 1000000000;
      } catch (err) {
        console.log("ERROR: ", err);
        expect(err).to.equal(null);
      }
    });
   
    it(`voterWithProd votes for bp1`, async () => {
      voterWithProd.last_vote_weight = 0;
      try {
        const result = await voterWithProd.sdk.genericAction('pushTransaction', {
          action: 'voteproducer',
          account: 'eosio',
          data: {
            "producers": [
              bp1.address
            ],
            fio_address: voterWithProd.address,
            actor: voterWithProd.account,
            max_fee: config.maxFee
          }
        })
        //console.log('Result: ', result)
        expect(result.status).to.equal('OK')
        expect(result.fee_collected).to.equal(0)
      } catch (err) {
        console.log(JSON.stringify(err, null, 4));
      }
    })
  
    it(`Confirm vote totals.`, async () => {
      // producer
      const bp1_prev_total_votes = bp1.total_votes;
      bp1.total_votes = await getProdVoteTotal(bp1.address) / 1000000000;
      bp1.diff_total_votes = bp1.total_votes - bp1_prev_total_votes;

      // voterWithProd
      const voterWithProd_prev_last_vote_weight = voterWithProd.last_vote_weight;
      voterWithProd.last_vote_weight = await getAccountVoteWeight(voterWithProd.account) / 1000000000;
      voterWithProd.diff_last_vote_weight = voterWithProd.last_vote_weight - voterWithProd_prev_last_vote_weight;
      const voterWithProd_prev_currency_balance = voterWithProd.currency_balance;
      voterWithProd.currency_balance = await getCurrencyBalance(voterWithProd.account);
      voterWithProd.diff_currency_balance = voterWithProd.currency_balance - voterWithProd_prev_currency_balance;

      expect(bp1.diff_total_votes).to.equal(voterWithProd.diff_last_vote_weight);
      //expect(bp1.total_votes).to.equal(bp1_prev_total_votes + voterWithProd.last_vote_weight)

    });

    it(`proxy votes for bp1`, async () => {
      try {
        // proxy
        proxy.last_vote_weight = 0;
        proxy.proxied_vote_weight = 0;
        const result = await proxy.sdk.genericAction('pushTransaction', {
          action: 'regproxy',
          account: 'eosio',
          data: {
            fio_address: proxy.address,
            actor: proxy.account,
            max_fee: config.maxFee
          }
        })
        expect(result.status).to.equal('OK');
        const result2 = await proxy.sdk.genericAction('pushTransaction', {
          action: 'voteproducer',
          account: 'eosio',
          data: {
            "producers": [
              bp1.address
            ],
            fio_address: proxy.address,
            actor: proxy.account,
            max_fee: config.maxFee
          }
        })
        expect(result.status).to.equal('OK');
        const proxyInfo = await getVoterInfo(proxy);
        expect(proxy.last_vote_weight).to.be.a('number');
      } catch (err) {
        console.log("ERROR: ", err);
        expect(err).to.equal(null);
      }
    });

    it(`Confirm vote totals`, async () => {
      // producer
      const bp1_prev_total_votes = bp1.total_votes;
      bp1.total_votes = await getProdVoteTotal(bp1.address) / 1000000000;
      bp1.diff_total_votes = bp1.total_votes - bp1_prev_total_votes;

      // proxy
      const proxy_prev_last_vote_weight = proxy.last_vote_weight;
      const proxy_prev_proxied_vote_weight = proxy.proxied_vote_weight;
      const proxyInfo = await getVoterInfo(proxy);
      proxy.last_vote_weight = Number(proxyInfo.last_vote_weight) / 1000000000;
      proxy.proxied_vote_weight = Number(proxyInfo.proxied_vote_weight) / 1000000000;
      proxy.diff_last_vote_weight = proxy.last_vote_weight - proxy_prev_last_vote_weight;
      proxy.diff_proxied_vote_weight = proxy.proxied_vote_weight - proxy_prev_proxied_vote_weight;
      const proxy_prev_currency_balance = proxy.currency_balance;
      proxy.currency_balance = await getCurrencyBalance(proxy.account);
      proxy.diff_currency_balance = proxy.currency_balance - proxy_prev_currency_balance;

      expect(bp1.diff_total_votes).to.equal(proxy.diff_last_vote_weight);
    });

    it(`Set up voterWithProxy`, async () => {
      try {
        // voterWithProxy
        voterWithProxy.last_vote_weight = 0;
        const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
          action: 'voteproxy',
          account: 'eosio',
          data: {
            proxy: proxy.address,
            fio_address: voterWithProxy.address,
            actor: voterWithProxy.account,
            max_fee: config.maxFee
          }
        })
        expect(result.status).to.equal('OK');
        const voterWithProxyInfo = await getVoterInfo(proxy);
        expect(voterWithProxy.last_vote_weight).to.be.a('number');
      } catch (err) {
        console.log("ERROR: ", err);
        expect(err).to.equal(null);
      }
    });

    it(`Confirm vote totals`, async () => {
      // producer
      const bp1_prev_total_votes = bp1.total_votes;
      bp1.total_votes = await getProdVoteTotal(bp1.address) / 1000000000;
      bp1.diff_total_votes = bp1.total_votes - bp1_prev_total_votes;

      // proxy
      const proxy_prev_last_vote_weight = proxy.last_vote_weight;
      const proxy_prev_proxied_vote_weight = proxy.proxied_vote_weight;
      const proxyInfo = await getVoterInfo(proxy);
      proxy.last_vote_weight = Number(proxyInfo.last_vote_weight) / 1000000000;
      proxy.proxied_vote_weight = Number(proxyInfo.proxied_vote_weight) / 1000000000;
      proxy.diff_last_vote_weight = proxy.last_vote_weight - proxy_prev_last_vote_weight;
      proxy.diff_proxied_vote_weight = proxy.proxied_vote_weight - proxy_prev_proxied_vote_weight;
      const proxy_prev_currency_balance = proxy.currency_balance;
      proxy.currency_balance = await getCurrencyBalance(proxy.account);
      proxy.diff_currency_balance = proxy.currency_balance - proxy_prev_currency_balance;

      //proxy.currency_balance = await getCurrencyBalance(proxy.account);

      // voterWithProxy
      const voterWithProxy_prev_last_vote_weight = voterWithProxy.last_vote_weight;
      voterWithProxy.last_vote_weight = await getAccountVoteWeight(voterWithProxy.account) / 1000000000;
      voterWithProxy.diff_last_vote_weight = voterWithProxy.last_vote_weight - voterWithProxy_prev_last_vote_weight;
      const voterWithProxy_prev_currency_balance = voterWithProxy.currency_balance;
      voterWithProxy.currency_balance = await getCurrencyBalance(voterWithProxy.account);
      voterWithProxy.diff_currency_balance = voterWithProxy.currency_balance - voterWithProxy_prev_currency_balance;
  
      expect(bp1.diff_total_votes).to.equal(voterWithProxy.diff_last_vote_weight);
    });

    it(`Set up autoproxy`, async () => {
      try {
        // autoproxy
        autoproxy.last_vote_weight = 0;
        const result = await autoproxy.sdk.genericAction('pushTransaction', {
          action: 'regproxy',
          account: 'eosio',
          data: {
            fio_address: autoproxy.address,
            actor: autoproxy.account,
            max_fee: config.maxFee
          }
        });
        expect(result.status).to.equal('OK');
        const result2 = await autoproxy.sdk.genericAction('pushTransaction', {
          action: 'voteproducer',
          account: 'eosio',
          data: {
            "producers": [
              bp1.address
            ],
            fio_address: autoproxy.address,
            actor: autoproxy.account,
            max_fee: config.maxFee
          }
        })
        expect(result2.status).to.equal('OK');
        const json = {
          json: true,
          code: 'eosio',
          scope: 'eosio',
          table: 'voters',
          lower_bound: autoproxy.account,
          upper_bound: autoproxy.account,
          key_type: "name",
          index_position: "3",
          json: true
        }
        const result3 = await callFioApi("get_table_rows", json);
        //autoproxy.last_vote_weight = Number(result3.rows[0].last_vote_weight) / 1000000000;
        //expect(autoproxy.last_vote_weight).to.be.a('number');
        expect(result3.rows[0].is_proxy).to.equal(1);
      } catch (err) {
        console.log("ERROR: ", err);
        expect(err).to.equal(null);
      }
    });

    it(`Confirm vote totals`, async () => {
      // producer
      const bp1_prev_total_votes = bp1.total_votes;
      bp1.total_votes = await getProdVoteTotal(bp1.address) / 1000000000;
      bp1.diff_total_votes = bp1.total_votes - bp1_prev_total_votes;
    
      // autoproxy
      const autoproxy_prev_last_vote_weight = autoproxy.last_vote_weight;
      const autoproxy_prev_proxied_vote_weight = autoproxy.prev_proxied_vote_weight;
      const autoproxyInfo = await getVoterInfo(autoproxy);
      autoproxy.last_vote_weight = Number(autoproxyInfo.last_vote_weight) / 1000000000;
      autoproxy.proxied_vote_weight = Number(autoproxyInfo.proxied_vote_weight) / 1000000000;
      autoproxy.diff_last_vote_weight = autoproxy.last_vote_weight - autoproxy_prev_last_vote_weight;
      autoproxy.diff_proxied_vote_weight = autoproxy.proxied_vote_weight - autoproxy_prev_proxied_vote_weight;
      const autoproxy_prev_currency_balance = autoproxy.currency_balance;
      autoproxy.currency_balance = await getCurrencyBalance(autoproxy.account);
      autoproxy.diff_currency_balance = autoproxy.currency_balance - autoproxy_prev_currency_balance;

      // Producer
      expect(bp1.diff_total_votes).to.equal(autoproxy.diff_last_vote_weight);
    });

    it(`Set up voterWithAutoproxy`, async () => {
      try {
        //Transfer FIO using a TPID assigned to autoproxy. This makes the user an autoproxied user.
        voterWithAutoproxy.last_vote_weight = 0;
        const transfer = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
          action: 'trnsfiopubky',
          account: 'fio.token',
          data: {
              payee_public_key: faucet.publicKey,
              amount: 1000000000,
              max_fee: config.maxFee,
              tpid: autoproxy.address,
              actor: voterWithAutoproxy.account
          }
        });
        const json = {
          json: true,
          code: 'eosio',
          scope: 'eosio',
          table: 'voters',
          lower_bound: voterWithAutoproxy.account,
          upper_bound: voterWithAutoproxy.account,
          key_type: "name",
          index_position: "3",
          json: true
        }
        const result = await callFioApi("get_table_rows", json);
        //voterWithAutoproxy.last_vote_weight = Number(result.rows[0].last_vote_weight) / 1000000000;
        //expect(voterWithAutoproxy.last_vote_weight).to.be.a('number');
        expect(result.rows[0].is_proxy).to.equal(0);
        expect(result.rows[0].is_auto_proxy).to.equal(1);
      } catch (err) {
        console.log("ERROR: ", err);
        expect(err).to.equal(null);
      }
    });

    it(`(BUG: Does not seem to deduct amount sent if autoproxying using xferfiopubky) Confirm vote totals`, async () => {
      // producer
      const bp1_prev_total_votes = bp1.total_votes;
      bp1.total_votes = await getProdVoteTotal(bp1.address) / 1000000000;
      bp1.diff_total_votes = bp1.total_votes - bp1_prev_total_votes;

      // console.log('bp1.total_votes: ', bp1.total_votes)
      // console.log('bp1_prev_total_votes: ', bp1_prev_total_votes)
      // console.log('bp1.diff_total_votes: ', bp1.diff_total_votes)

      // autoproxy
      const autoproxy_prev_last_vote_weight = autoproxy.last_vote_weight;
      const autoproxy_prev_proxied_vote_weight = autoproxy.prev_proxied_vote_weight;
      const autoproxyInfo = await getVoterInfo(autoproxy);
      autoproxy.last_vote_weight = Number(autoproxyInfo.last_vote_weight) / 1000000000;
      autoproxy.proxied_vote_weight = Number(autoproxyInfo.proxied_vote_weight) / 1000000000;
      autoproxy.diff_last_vote_weight = autoproxy.last_vote_weight - autoproxy_prev_last_vote_weight;
      autoproxy.diff_proxied_vote_weight = autoproxy.proxied_vote_weight - autoproxy_prev_proxied_vote_weight;
      const autoproxy_prev_currency_balance = autoproxy.currency_balance;
      autoproxy.currency_balance = await getCurrencyBalance(autoproxy.account);
      autoproxy.diff_currency_balance = autoproxy.currency_balance - autoproxy_prev_currency_balance;

      // voterWithAutoproxy
      const voterWithAutoproxy_prev_last_vote_weight = voterWithAutoproxy.last_vote_weight;
      voterWithAutoproxy.last_vote_weight = await getAccountVoteWeight(voterWithAutoproxy.account) / 1000000000;
      voterWithAutoproxy.diff_last_vote_weight = voterWithAutoproxy.last_vote_weight - voterWithAutoproxy_prev_last_vote_weight;
      const voterWithAutoproxy_prev_currency_balance = voterWithAutoproxy.currency_balance;
      voterWithAutoproxy.currency_balance = await getCurrencyBalance(voterWithAutoproxy.account);
      voterWithAutoproxy.diff_currency_balance = voterWithAutoproxy.currency_balance - voterWithAutoproxy_prev_currency_balance;

      // console.log('voterWithAutoproxy.last_vote_weight: ', voterWithAutoproxy.last_vote_weight)
      // console.log('voterWithAutoproxy_prev_last_vote_weight: ', voterWithAutoproxy_prev_last_vote_weight)
      // console.log('voterWithAutoproxy.diff_last_vote_weight: ', voterWithAutoproxy.diff_last_vote_weight)

      // Producer
      expect(bp1.diff_total_votes).to.equal(voterWithAutoproxy.diff_last_vote_weight);
    });
    
  });  // end Setup

  describe('fio.token actions', () => {

    // afterEach(async () => {
    //   // producer
    //   bp1.prev_total_votes = bp1.total_votes;
    //   bp1.total_votes = Number(await getProdVoteWeight(bp1.account)) / 1000000000;
    //   bp1.diff_total_votes = bp1.total_votes - bp1.prev_total_votes;

    //   // voterWithProd
    //   voterWithProd.prev_last_vote_weight = voterWithProd.last_vote_weight;
    //   const voterWithProdInfo = await getVoterInfo(voterWithProd);
    //   voterWithProd.last_vote_weight = Number(voterWithProdInfo.last_vote_weight) / 1000000000;
    //   voterWithProd.diff_last_vote_weight = voterWithProd.last_vote_weight - voterWithProd.prev_last_vote_weight;
    //   voterWithProd.prev_currency_balance = voterWithProd.currency_balance;
    //   voterWithProd.currency_balance = await getCurrencyBalance(voterWithProd.account);
    //   voterWithProd.diff_currency_balance = voterWithProd.currency_balance - voterWithProd.prev_currency_balance;

    //   // proxy
    //   proxy.prev_last_vote_weight = proxy.last_vote_weight;
    //   proxy.prev_proxied_vote_weight = proxy.proxied_vote_weight;
    //   const proxyInfo = await getVoterInfo(proxy);
    //   proxy.last_vote_weight = Number(proxyInfo.last_vote_weight) / 1000000000;
    //   proxy.proxied_vote_weight = Number(proxyInfo.proxied_vote_weight) / 1000000000;
    //   proxy.diff_last_vote_weight = proxy.last_vote_weight - proxy.prev_last_vote_weight;
    //   proxy.diff_proxied_vote_weight = proxy.proxied_vote_weight - proxy.prev_proxied_vote_weight;
    //   proxy.prev_currency_balance = proxy.currency_balance;
    //   proxy.currency_balance = await getCurrencyBalance(proxy.account);
    //   proxy.diff_currency_balance = proxy.currency_balance - proxy.prev_currency_balance;

    //   // voterWithProxy
    //   voterWithProxy.prev_last_vote_weight = voterWithProxy.last_vote_weight;
    //   const voterWithProxyInfo = await getVoterInfo(voterWithProxy);
    //   voterWithProxy.last_vote_weight = Number(voterWithProxyInfo.last_vote_weight) / 1000000000;
    //   voterWithProxy.diff_last_vote_weight = voterWithProxy.last_vote_weight - voterWithProxy.prev_last_vote_weight;

    //   voterWithProxy.prev_currency_balance = voterWithProxy.currency_balance;
    //   voterWithProxy.currency_balance = await getCurrencyBalance(voterWithProxy.account);
    //   voterWithProxy.diff_currency_balance = voterWithProxy.currency_balance - voterWithProxy.prev_currency_balance;
  
    //   // autoproxy
    //   autoproxy.prev_last_vote_weight = autoproxy.last_vote_weight;
    //   autoproxy.prev_proxied_vote_weight = autoproxy.proxied_vote_weight;
    //   const autoproxyInfo = await getVoterInfo(autoproxy);
    //   autoproxy.last_vote_weight = Number(autoproxyInfo.last_vote_weight) / 1000000000;
    //   autoproxy.proxied_vote_weight = Number(autoproxyInfo.proxied_vote_weight) / 1000000000;
    //   autoproxy.diff_last_vote_weight = autoproxy.last_vote_weight - autoproxy.prev_last_vote_weight;
    //   autoproxy.diff_proxied_vote_weight = autoproxy.proxied_vote_weight - autoproxy.prev_proxied_vote_weight;
    //   autoproxy.prev_currency_balance = autoproxy.currency_balance;
    //   autoproxy.currency_balance = await getCurrencyBalance(autoproxy.account);
    //   autoproxy.diff_currency_balance = autoproxy.currency_balance - autoproxy.prev_currency_balance;

    //   // voterWithAutoproxy
    //   voterWithAutoproxy.prev_last_vote_weight = voterWithAutoproxy.last_vote_weight;
    //   const voterWithAutoproxyyInfo = await getVoterInfo(voterWithAutoproxy);
    //   voterWithAutoproxy.last_vote_weight = Number(voterWithAutoproxyyInfo.last_vote_weight) / 1000000000;
    //   voterWithAutoproxy.diff_last_vote_weight = voterWithAutoproxy.last_vote_weight - voterWithAutoproxy.prev_last_vote_weight;
    //   voterWithAutoproxy.prev_currency_balance = voterWithAutoproxy.currency_balance;
    //   voterWithAutoproxy.currency_balance = await getCurrencyBalance(voterWithAutoproxy.account);
    //   voterWithAutoproxy.diff_currency_balance = voterWithAutoproxy.currency_balance - voterWithAutoproxy.prev_currency_balance;

    //   // producer
    //   try {
    //     expect(bp1.diff_total_votes).to.equal(voterWithProd.diff_last_vote_weight + proxy.diff_last_vote_weight + autoproxy.diff_last_vote_weight);
    //   } catch (err) {
    //     console.log('producer error: ', err);
    //     expect(err).to.equal(null);
    //   }
      
    //   // voterWithProd
    //   try {
    //     expect(voterWithProd.diff_last_vote_weight).to.equal(voterWithProd.diff_currency_balance);
    //   } catch (err) {
    //     console.log('voterWithProd error: ', err);
    //     expect(err).to.equal(null);
    //   }
      
    //   // proxy
    //   try {
    //     expect(proxy.diff_last_vote_weight).to.equal(proxy.diff_currency_balance + voterWithProxy.diff_last_vote_weight);
    //     expect(proxy.diff_proxied_vote_weight).to.equal(voterWithProxy.diff_last_vote_weight);
    //   } catch (err) {
    //     console.log('proxy error: ', err);
    //     expect(err).to.equal(null);
    //   }

    //   // voterWithProxy
    //   try {
    //     expect(voterWithProxy.diff_last_vote_weight).to.equal(voterWithProxy.diff_currency_balance);
    //   } catch (err) {
    //     console.log('proxy error: ', err);
    //     expect(err).to.equal(null);
    //   }

    //   // autoproxy
    //   try {
    //     expect(autoproxy.diff_last_vote_weight).to.equal(autoproxy.diff_currency_balance + voterWithAutoproxy.diff_last_vote_weight);
    //     expect(autoproxy.diff_proxied_vote_weight).to.equal(voterWithAutoproxy.diff_last_vote_weight);
    //   } catch (err) {
    //     console.log('autoproxy error: ', err);
    //     expect(err).to.equal(null);
    //   }

    //   // voterWithAutoproxy
    //   try {
    //     expect(voterWithAutoproxy.diff_last_vote_weight).to.equal(voterWithAutoproxy.diff_currency_balance);
    //   } catch (err) {
    //     console.log('proxy error: ', err);
    //     expect(err).to.equal(null);
    //   }
    // });


    it(`token.trnsfiopubky (bp1) - Transfer from faucet to bp1`, async () => {
      try {
          const result = await faucet.genericAction('pushTransaction', {
              action: 'trnsfiopubky',
              account: 'fio.token',
              data: {
                  payee_public_key: bp1.publicKey,
                  amount: xferTo,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: faucet.account
              }
          });
          expect(result.status).to.equal('OK')
          await validateVotes();
      } catch (err) {
          console.log(err);
          expect(err).to.equal(null);
      }
    }); 

    it(`token.trnsfiopubky (voterWithProd) - Transfer from faucet to voterWithProd`, async () => {
      try {
          const result = await faucet.genericAction('pushTransaction', {
              action: 'trnsfiopubky',
              account: 'fio.token',
              data: {
                  payee_public_key: voterWithProd.publicKey,
                  amount: xferTo,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: faucet.account
              }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
      } catch (err) {
          console.log(err);
          expect(err).to.equal(null);
      }
    }); 

    it(`token.trnsfiopubky (proxy) - Transfer from faucet to proxy`, async () => {
      try {
          const result = await faucet.genericAction('pushTransaction', {
              action: 'trnsfiopubky',
              account: 'fio.token',
              data: {
                  payee_public_key: proxy.publicKey,
                  amount: xferTo,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: faucet.account
              }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
      } catch (err) {
          console.log(err);
          expect(err).to.equal(null);
      }
    }); 

    it(`token.trnsfiopubky (voterWithProxy) - Transfer from faucet to voterWithProxy`, async () => {
      try {
          const result = await faucet.genericAction('pushTransaction', {
              action: 'trnsfiopubky',
              account: 'fio.token',
              data: {
                  payee_public_key: voterWithProxy.publicKey,
                  amount: xferTo,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: faucet.account
              }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
      } catch (err) {
          console.log(err);
          expect(err).to.equal(null);
      }
    }); 

    it(`token.trnsfiopubky (autoproxy) - Transfer from faucet to autoproxy`, async () => {
      try {
          const result = await faucet.genericAction('pushTransaction', {
              action: 'trnsfiopubky',
              account: 'fio.token',
              data: {
                  payee_public_key: autoproxy.publicKey,
                  amount: xferTo,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: faucet.account
              }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
      } catch (err) {
          console.log(err);
          expect(err).to.equal(null);
      }
    }); 

    it(`token.trnsfiopubky (voterWithAutoproxy) - Transferfrom faucet to voterWithAutoproxy`, async () => {
      try {
          const result = await faucet.genericAction('pushTransaction', {
              action: 'trnsfiopubky',
              account: 'fio.token',
              data: {
                  payee_public_key: voterWithAutoproxy.publicKey,
                  amount: xferTo,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: faucet.account
              }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
      } catch (err) {
          console.log(err);
          expect(err).to.equal(null);
      }
    }); 

    it(`token.trnsfiopubky (bp1) - Transfer from bp1`, async () => {
      try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
              action: 'trnsfiopubky',
              account: 'fio.token',
              data: {
                  payee_public_key: faucet.publicKey,
                  amount: xferFrom,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: bp1.account
              }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
      } catch (err) {
          console.log(err);
          expect(err).to.equal(null);
      }
    }); 

    it(`token.trnsfiopubky (voterWithProd) - Transfer from voterWithProd`, async () => {
      try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
              action: 'trnsfiopubky',
              account: 'fio.token',
              data: {
                  payee_public_key: faucet.publicKey,
                  amount: xferFrom,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: voterWithProd.account
              }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
      } catch (err) {
          console.log(err);
          expect(err).to.equal(null);
      }
    }); 

    it(`token.trnsfiopubky (proxy) - Transfer from proxy`, async () => {
      try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
              action: 'trnsfiopubky',
              account: 'fio.token',
              data: {
                  payee_public_key: faucet.publicKey,
                  amount: xferFrom,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: proxy.account
              }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
      } catch (err) {
          console.log(err);
          expect(err).to.equal(null);
      }
    }); 

    it(`token.trnsfiopubky (voterWithProxy) - Transfer from voterWithProxy`, async () => {
      try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
              action: 'trnsfiopubky',
              account: 'fio.token',
              data: {
                  payee_public_key: faucet.publicKey,
                  amount: xferFrom,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: voterWithProxy.account
              }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
      } catch (err) {
          console.log(err);
          expect(err).to.equal(null);
      }
    }); 

    it(`token.trnsfiopubky (autoproxy) - Transfer from autoproxy`, async () => {
      try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
              action: 'trnsfiopubky',
              account: 'fio.token',
              data: {
                  payee_public_key: faucet.publicKey,
                  amount: xferFrom,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: autoproxy.account
              }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
      } catch (err) {
          console.log(err);
          expect(err).to.equal(null);
      }
    }); 

    it(`token.trnsfiopubky (voterWithAutoproxy) - Transfer from voterWithAutoproxy`, async () => {
      try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
              action: 'trnsfiopubky',
              account: 'fio.token',
              data: {
                  payee_public_key: faucet.publicKey,
                  amount: xferFrom,
                  max_fee: config.maxFee,
                  tpid: '',
                  actor: voterWithAutoproxy.account
              }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
      } catch (err) {
          console.log(err);
          expect(err).to.equal(null);
      }
    }); 

    it(`token.retire (bp1)`, async function () {
      try {
        const result = await bp1.sdk.genericAction('pushTransaction', {
          action: 'retire',
          account: 'fio.token',
          data: {
            quantity: retireAmount,
            memo: "test",
            actor: bp1.account,
          }
        });
        expect(result.status).to.equal('OK');
        await validateVotes();
      } catch (err) {
        console.log(JSON.stringify(err, null, 4));
        throw err;
      }
    });

    it(`token.retire (voterWithProd)`, async function () {
      try {
        const result = await voterWithProd.sdk.genericAction('pushTransaction', {
          action: 'retire',
          account: 'fio.token',
          data: {
            quantity: retireAmount,
            memo: "test",
            actor: voterWithProd.account,
          }
        });
        expect(result.status).to.equal('OK');
        await validateVotes();
      } catch (err) {
        console.log(JSON.stringify(err, null, 4));
        throw err;
      }
    });

    it(`token.retire (proxy)`, async function () {
      try {
        const result = await proxy.sdk.genericAction('pushTransaction', {
          action: 'retire',
          account: 'fio.token',
          data: {
            quantity: retireAmount,
            memo: "test",
            actor: proxy.account,
          }
        });
        expect(result.status).to.equal('OK');
        await validateVotes();
      } catch (err) {
        console.log(JSON.stringify(err, null, 4));
        throw err;
      }
    });

    it(`token.retire (voterWithProxy)`, async function () {
      try {
        const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
          action: 'retire',
          account: 'fio.token',
          data: {
            quantity: retireAmount,
            memo: "test",
            actor: voterWithProxy.account,
          }
        });
        expect(result.status).to.equal('OK');
        await validateVotes();
      } catch (err) {
        console.log(JSON.stringify(err, null, 4));
        throw err;
      }
    });

    it(`token.retire (autoproxy)`, async function () {
      try {
        const result = await autoproxy.sdk.genericAction('pushTransaction', {
          action: 'retire',
          account: 'fio.token',
          data: {
            quantity: retireAmount,
            memo: "test",
            actor: autoproxy.account,
          }
        });
        expect(result.status).to.equal('OK');
        await validateVotes();
      } catch (err) {
        console.log(JSON.stringify(err, null, 4));
        throw err;
      }
    });

    it(`token.retire (voterWithAutoproxy)`, async function () {
      try {
        const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
          action: 'retire',
          account: 'fio.token',
          data: {
            quantity: retireAmount,
            memo: "test",
            actor: voterWithAutoproxy.account,
          }
        });
        expect(result.status).to.equal('OK');
        await validateVotes();
      } catch (err) {
        console.log(JSON.stringify(err, null, 4));
        throw err;
      }
    });
  });  // fio.token actions


  describe('fio.address actions', () => {
    describe('voterWithProd', () => {

      it(`address.regaddress (voterWithProd) x 3`, async function () {
        try {
          voterWithProd.address1 = generateFioAddress(voterWithProd.domain,8);
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'regaddress',
            account: 'fio.address',
            data: {
                fio_address: voterWithProd.address1,
                owner_fio_public_key: voterWithProd.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: voterWithProd.account
            }
          });
          expect(result.status).to.equal('OK')
          voterWithProd.address2 = generateFioAddress(voterWithProd.domain,8);
          const result2 = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'regaddress',
            account: 'fio.address',
            data: {
                fio_address: voterWithProd.address2,
                owner_fio_public_key: voterWithProd.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: voterWithProd.account
            }
          });
          expect(result2.status).to.equal('OK')
          voterWithProd.address3 = generateFioAddress(voterWithProd.domain,8);
          const result3 = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'regaddress',
            account: 'fio.address',
            data: {
                fio_address: voterWithProd.address3,
                owner_fio_public_key: voterWithProd.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: voterWithProd.account
            }
          });
          expect(result3.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.renewaddress (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'renewaddress',
            account: 'fio.address',
            data: {
              fio_address: voterWithProd.address,
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithProd.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.xferaddress (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'xferaddress',
            account: 'fio.address',
            data: {
              fio_address: voterWithProd.address2,
              new_owner_fio_public_key: otherUser.publicKey,
              max_fee: config.maxFee,
              actor: voterWithProd.account,
              tpid: ""
            }
          })
          //console.log('result: ', result)
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error: ', err);
          console.log('Error: ', JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it.skip(`address.burnaddress (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('push_transaction', {
            action: 'burnaddress',
            account: 'fio.address',
            data: {
              fio_address: voterWithProd.address3,
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithProd.account
            }
          })
          console.log('result: ', result);
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.addbundles (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'addbundles',
            account: 'fio.address',
            data: {
              fio_address: voterWithProd.address,
              bundle_sets: 1,
              max_fee: config.maxFee,
              tpid: ''
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.addaddress (voterWithProd)`, async function () {
        try {
          voterWithProd.mappedAddress1 = {chain_code: 'BCH', token_code: 'BCH', public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'};
          voterWithProd.mappedAddress2 = {chain_code: 'BCH', token_code: 'BCH', public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'};
          voterWithProd.mappedAddress3 = {chain_code: 'BCH', token_code: 'BCH', public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'};
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'addaddress',
            account: 'fio.address',
            data: {
              fio_address: voterWithProd.address,
              public_addresses:[voterWithProd.mappedAddress1, voterWithProd.mappedAddress2, voterWithProd.mappedAddress3],
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithProd.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remaddress (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'remaddress',
            account: 'fio.address',
            data: {
              fio_address: voterWithProd.address,
              public_addresses: [voterWithProd.mappedAddress1],
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithProd.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remalladdr (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'remalladdr',
            account: 'fio.address',
            data: {
              fio_address: voterWithProd.address,
              max_fee: config.maxFee,
              tpid: "",
              actor: voterWithProd.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.regdomain (voterWithProd)`, async function () {
        try {
          voterWithProd.domain2 = generateFioDomain(8);
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'regdomain',
            account: 'fio.address',
            data: {
                fio_domain: voterWithProd.domain2,
                owner_fio_public_key: voterWithProd.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: voterWithProd.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.renewdomain (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'renewdomain',
            account: 'fio.address',
            data: {
              fio_domain: voterWithProd.domain,
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithProd.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.setdomainpub (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'setdomainpub',
            account: 'fio.address',
            data: {
              fio_domain: voterWithProd.domain2,
              is_public: 1,
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithProd.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.xferdomain (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'xferdomain',
            account: 'fio.address',
            data: {
              fio_domain: voterWithProd.domain2,
              new_owner_fio_public_key: otherUser.publicKey,
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithProd.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.addnft (voterWithProd)`, async function () {
        try {
          voterWithProd.nft1 = { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF4", "token_id": "1", "url": "", "hash": "", "metadata": "" };
          voterWithProd.nft2 = { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF4", "token_id": "2", "url": "", "hash": "", "metadata": "" };
          voterWithProd.nft3 = { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF4", "token_id": "3", "url": "", "hash": "", "metadata": "" };
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'addnft',
            account: 'fio.address',
            data: {
                fio_address: voterWithProd.address,
                //nfts: [ voterWithProd.nft1, voterWithProd.nft2, voterWithProd.nft3],
                nfts: [voterWithProd.nft1, voterWithProd.nft2, voterWithProd.nft3],
                max_fee: config.maxFee,
                actor: voterWithProd.account,
                tpid: ''
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remnft (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'remnft',
            account: 'fio.address',
            data: {
              fio_address: voterWithProd.address,
              nfts: [voterWithProd.nft1],
              max_fee: config.maxFee,
              actor: voterWithProd.account,
              tpid: ""
            }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remallnfts (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'remallnfts',
            account: 'fio.address',
            data: {
              fio_address: voterWithProd.address,
              max_fee: config.maxFee,
              actor: voterWithProd.account,
              tpid: ""
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });
    }); // voterWithProd

    describe('proxy', () => {

      it(`address.regaddress (proxy) x 3`, async function () {
        try {
          proxy.address1 = generateFioAddress(proxy.domain,8);
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'regaddress',
            account: 'fio.address',
            data: {
                fio_address: proxy.address1,
                owner_fio_public_key: proxy.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: proxy.account
            }
          });
          expect(result.status).to.equal('OK')
          proxy.address2 = generateFioAddress(proxy.domain,8);
          const result2 = await proxy.sdk.genericAction('pushTransaction', {
            action: 'regaddress',
            account: 'fio.address',
            data: {
                fio_address: proxy.address2,
                owner_fio_public_key: proxy.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: proxy.account
            }
          });
          expect(result2.status).to.equal('OK')
          proxy.address3 = generateFioAddress(proxy.domain,8);
          const result3 = await proxy.sdk.genericAction('pushTransaction', {
            action: 'regaddress',
            account: 'fio.address',
            data: {
                fio_address: proxy.address3,
                owner_fio_public_key: proxy.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: proxy.account
            }
          });
          expect(result3.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('err: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.renewaddress (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'renewaddress',
            account: 'fio.address',
            data: {
              fio_address: proxy.address,
              max_fee: config.maxFee,
              tpid: '',
              actor: proxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.xferaddress (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'xferaddress',
            account: 'fio.address',
            data: {
              fio_address: proxy.address2,
              new_owner_fio_public_key: otherUser.publicKey,
              max_fee: config.maxFee,
              actor: proxy.account,
              tpid: ""
            }
          })
          //console.log('result: ', result)
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error: ', err);
          console.log('Error: ', JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it.skip(`address.burnaddress (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('push_transaction', {
            action: 'burnaddress',
            account: 'fio.address',
            data: {
              fio_address: proxy.address3,
              max_fee: config.maxFee,
              tpid: '',
              actor: proxy.account
            }
          })
          console.log('result: ', result);
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.addbundles (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'addbundles',
            account: 'fio.address',
            data: {
              fio_address: proxy.address,
              bundle_sets: 1,
              max_fee: config.maxFee,
              tpid: ''
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.addaddress (proxy)`, async function () {
        try {
          proxy.mappedAddress1 = {chain_code: 'BCH', token_code: 'BCH', public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'};
          proxy.mappedAddress2 = {chain_code: 'BCH', token_code: 'BCH', public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'};
          proxy.mappedAddress3 = {chain_code: 'BCH', token_code: 'BCH', public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'};
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'addaddress',
            account: 'fio.address',
            data: {
              fio_address: proxy.address,
              public_addresses:[proxy.mappedAddress1, proxy.mappedAddress2, proxy.mappedAddress3],
              max_fee: config.maxFee,
              tpid: '',
              actor: proxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remaddress (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'remaddress',
            account: 'fio.address',
            data: {
              fio_address: proxy.address,
              public_addresses: [proxy.mappedAddress1],
              max_fee: config.maxFee,
              tpid: '',
              actor: proxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remalladdr (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'remalladdr',
            account: 'fio.address',
            data: {
              fio_address: proxy.address,
              max_fee: config.maxFee,
              tpid: "",
              actor: proxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.regdomain (proxy)`, async function () {
        try {
          proxy.domain2 = generateFioDomain(8);
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'regdomain',
            account: 'fio.address',
            data: {
                fio_domain: proxy.domain2,
                owner_fio_public_key: proxy.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: proxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.renewdomain (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'renewdomain',
            account: 'fio.address',
            data: {
              fio_domain: proxy.domain,
              max_fee: config.maxFee,
              tpid: '',
              actor: proxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.setdomainpub (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'setdomainpub',
            account: 'fio.address',
            data: {
              fio_domain: proxy.domain2,
              is_public: 1,
              max_fee: config.maxFee,
              tpid: '',
              actor: proxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.xferdomain (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'xferdomain',
            account: 'fio.address',
            data: {
              fio_domain: proxy.domain2,
              new_owner_fio_public_key: otherUser.publicKey,
              max_fee: config.maxFee,
              tpid: '',
              actor: proxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.addnft (proxy)`, async function () {
        try {
          proxy.nft1 = { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF4", "token_id": "1", "url": "", "hash": "", "metadata": "" };
          proxy.nft2 = { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF4", "token_id": "2", "url": "", "hash": "", "metadata": "" };
          proxy.nft3 = { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF4", "token_id": "3", "url": "", "hash": "", "metadata": "" };
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'addnft',
            account: 'fio.address',
            data: {
                fio_address: proxy.address,
                //nfts: [ proxy.nft1, proxy.nft2, proxy.nft3],
                nfts: [proxy.nft1, proxy.nft2, proxy.nft3],
                max_fee: config.maxFee,
                actor: proxy.account,
                tpid: ''
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remnft (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'remnft',
            account: 'fio.address',
            data: {
              fio_address: proxy.address,
              nfts: [proxy.nft1],
              max_fee: config.maxFee,
              actor: proxy.account,
              tpid: ""
            }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remallnfts (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'remallnfts',
            account: 'fio.address',
            data: {
              fio_address: proxy.address,
              max_fee: config.maxFee,
              actor: proxy.account,
              tpid: ""
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });
    }); // proxy

    describe('voterWithProxy', () => {

      it(`address.regaddress (voterWithProxy) x 3`, async function () {
        try {
          voterWithProxy.address1 = generateFioAddress(voterWithProxy.domain,8);
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'regaddress',
            account: 'fio.address',
            data: {
                fio_address: voterWithProxy.address1,
                owner_fio_public_key: voterWithProxy.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: voterWithProxy.account
            }
          });
          expect(result.status).to.equal('OK')
          voterWithProxy.address2 = generateFioAddress(voterWithProxy.domain,8);
          const result2 = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'regaddress',
            account: 'fio.address',
            data: {
                fio_address: voterWithProxy.address2,
                owner_fio_public_key: voterWithProxy.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: voterWithProxy.account
            }
          });
          expect(result2.status).to.equal('OK')
          voterWithProxy.address3 = generateFioAddress(voterWithProxy.domain,8);
          const result3 = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'regaddress',
            account: 'fio.address',
            data: {
                fio_address: voterWithProxy.address3,
                owner_fio_public_key: voterWithProxy.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: voterWithProxy.account
            }
          });
          expect(result3.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('err: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.renewaddress (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'renewaddress',
            account: 'fio.address',
            data: {
              fio_address: voterWithProxy.address,
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithProxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.xferaddress (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'xferaddress',
            account: 'fio.address',
            data: {
              fio_address: voterWithProxy.address2,
              new_owner_fio_public_key: otherUser.publicKey,
              max_fee: config.maxFee,
              actor: voterWithProxy.account,
              tpid: ""
            }
          })
          //console.log('result: ', result)
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error: ', err);
          console.log('Error: ', JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it.skip(`address.burnaddress (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('push_transaction', {
            action: 'burnaddress',
            account: 'fio.address',
            data: {
              fio_address: voterWithProxy.address3,
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithProxy.account
            }
          })
          console.log('result: ', result);
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.addbundles (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'addbundles',
            account: 'fio.address',
            data: {
              fio_address: voterWithProxy.address,
              bundle_sets: 1,
              max_fee: config.maxFee,
              tpid: ''
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.addaddress (voterWithProxy)`, async function () {
        try {
          voterWithProxy.mappedAddress1 = {chain_code: 'BCH', token_code: 'BCH', public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'};
          voterWithProxy.mappedAddress2 = {chain_code: 'BCH', token_code: 'BCH', public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'};
          voterWithProxy.mappedAddress3 = {chain_code: 'BCH', token_code: 'BCH', public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'};
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'addaddress',
            account: 'fio.address',
            data: {
              fio_address: voterWithProxy.address,
              public_addresses:[voterWithProxy.mappedAddress1, voterWithProxy.mappedAddress2, voterWithProxy.mappedAddress3],
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithProxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remaddress (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'remaddress',
            account: 'fio.address',
            data: {
              fio_address: voterWithProxy.address,
              public_addresses: [voterWithProxy.mappedAddress1],
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithProxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remalladdr (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'remalladdr',
            account: 'fio.address',
            data: {
              fio_address: voterWithProxy.address,
              max_fee: config.maxFee,
              tpid: "",
              actor: voterWithProxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.regdomain (voterWithProxy)`, async function () {
        try {
          voterWithProxy.domain2 = generateFioDomain(8);
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'regdomain',
            account: 'fio.address',
            data: {
                fio_domain: voterWithProxy.domain2,
                owner_fio_public_key: voterWithProxy.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: voterWithProxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.renewdomain (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'renewdomain',
            account: 'fio.address',
            data: {
              fio_domain: voterWithProxy.domain,
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithProxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.setdomainpub (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'setdomainpub',
            account: 'fio.address',
            data: {
              fio_domain: voterWithProxy.domain2,
              is_public: 1,
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithProxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.xferdomain (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'xferdomain',
            account: 'fio.address',
            data: {
              fio_domain: voterWithProxy.domain2,
              new_owner_fio_public_key: otherUser.publicKey,
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithProxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.addnft (voterWithProxy)`, async function () {
        try {
          voterWithProxy.nft1 = { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF4", "token_id": "1", "url": "", "hash": "", "metadata": "" };
          voterWithProxy.nft2 = { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF4", "token_id": "2", "url": "", "hash": "", "metadata": "" };
          voterWithProxy.nft3 = { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF4", "token_id": "3", "url": "", "hash": "", "metadata": "" };
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'addnft',
            account: 'fio.address',
            data: {
                fio_address: voterWithProxy.address,
                //nfts: [ voterWithProxy.nft1, voterWithProxy.nft2, voterWithProxy.nft3],
                nfts: [voterWithProxy.nft1, voterWithProxy.nft2, voterWithProxy.nft3],
                max_fee: config.maxFee,
                actor: voterWithProxy.account,
                tpid: ''
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remnft (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'remnft',
            account: 'fio.address',
            data: {
              fio_address: voterWithProxy.address,
              nfts: [voterWithProxy.nft1],
              max_fee: config.maxFee,
              actor: voterWithProxy.account,
              tpid: ""
            }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remallnfts (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'remallnfts',
            account: 'fio.address',
            data: {
              fio_address: voterWithProxy.address,
              max_fee: config.maxFee,
              actor: voterWithProxy.account,
              tpid: ""
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });
    }); // voterWithProxy

    describe('autoproxy', () => {

      it(`address.regaddress (autoproxy) x 3`, async function () {
        try {
          autoproxy.address1 = generateFioAddress(autoproxy.domain,8);
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'regaddress',
            account: 'fio.address',
            data: {
                fio_address: autoproxy.address1,
                owner_fio_public_key: autoproxy.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: autoproxy.account
            }
          });
          expect(result.status).to.equal('OK')
          autoproxy.address2 = generateFioAddress(autoproxy.domain,8);
          const result2 = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'regaddress',
            account: 'fio.address',
            data: {
                fio_address: autoproxy.address2,
                owner_fio_public_key: autoproxy.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: autoproxy.account
            }
          });
          expect(result2.status).to.equal('OK')
          autoproxy.address3 = generateFioAddress(autoproxy.domain,8);
          const result3 = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'regaddress',
            account: 'fio.address',
            data: {
                fio_address: autoproxy.address3,
                owner_fio_public_key: autoproxy.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: autoproxy.account
            }
          });
          expect(result3.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('err: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.renewaddress (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'renewaddress',
            account: 'fio.address',
            data: {
              fio_address: autoproxy.address,
              max_fee: config.maxFee,
              tpid: '',
              actor: autoproxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.xferaddress (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'xferaddress',
            account: 'fio.address',
            data: {
              fio_address: autoproxy.address2,
              new_owner_fio_public_key: otherUser.publicKey,
              max_fee: config.maxFee,
              actor: autoproxy.account,
              tpid: ""
            }
          })
          //console.log('result: ', result)
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error: ', err);
          console.log('Error: ', JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it.skip(`address.burnaddress (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('push_transaction', {
            action: 'burnaddress',
            account: 'fio.address',
            data: {
              fio_address: autoproxy.address3,
              max_fee: config.maxFee,
              tpid: '',
              actor: autoproxy.account
            }
          })
          console.log('result: ', result);
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.addbundles (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'addbundles',
            account: 'fio.address',
            data: {
              fio_address: autoproxy.address,
              bundle_sets: 1,
              max_fee: config.maxFee,
              tpid: ''
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.addaddress (autoproxy)`, async function () {
        try {
          autoproxy.mappedAddress1 = {chain_code: 'BCH', token_code: 'BCH', public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'};
          autoproxy.mappedAddress2 = {chain_code: 'BCH', token_code: 'BCH', public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'};
          autoproxy.mappedAddress3 = {chain_code: 'BCH', token_code: 'BCH', public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'};
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'addaddress',
            account: 'fio.address',
            data: {
              fio_address: autoproxy.address,
              public_addresses:[autoproxy.mappedAddress1, autoproxy.mappedAddress2, autoproxy.mappedAddress3],
              max_fee: config.maxFee,
              tpid: '',
              actor: autoproxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remaddress (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'remaddress',
            account: 'fio.address',
            data: {
              fio_address: autoproxy.address,
              public_addresses: [autoproxy.mappedAddress1],
              max_fee: config.maxFee,
              tpid: '',
              actor: autoproxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remalladdr (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'remalladdr',
            account: 'fio.address',
            data: {
              fio_address: autoproxy.address,
              max_fee: config.maxFee,
              tpid: "",
              actor: autoproxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.regdomain (autoproxy)`, async function () {
        try {
          autoproxy.domain2 = generateFioDomain(8);
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'regdomain',
            account: 'fio.address',
            data: {
                fio_domain: autoproxy.domain2,
                owner_fio_public_key: autoproxy.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: autoproxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.renewdomain (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'renewdomain',
            account: 'fio.address',
            data: {
              fio_domain: autoproxy.domain,
              max_fee: config.maxFee,
              tpid: '',
              actor: autoproxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.setdomainpub (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'setdomainpub',
            account: 'fio.address',
            data: {
              fio_domain: autoproxy.domain2,
              is_public: 1,
              max_fee: config.maxFee,
              tpid: '',
              actor: autoproxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.xferdomain (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'xferdomain',
            account: 'fio.address',
            data: {
              fio_domain: autoproxy.domain2,
              new_owner_fio_public_key: otherUser.publicKey,
              max_fee: config.maxFee,
              tpid: '',
              actor: autoproxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.addnft (autoproxy)`, async function () {
        try {
          autoproxy.nft1 = { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF4", "token_id": "1", "url": "", "hash": "", "metadata": "" };
          autoproxy.nft2 = { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF4", "token_id": "2", "url": "", "hash": "", "metadata": "" };
          autoproxy.nft3 = { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF4", "token_id": "3", "url": "", "hash": "", "metadata": "" };
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'addnft',
            account: 'fio.address',
            data: {
                fio_address: autoproxy.address,
                //nfts: [ autoproxy.nft1, autoproxy.nft2, autoproxy.nft3],
                nfts: [autoproxy.nft1, autoproxy.nft2, autoproxy.nft3],
                max_fee: config.maxFee,
                actor: autoproxy.account,
                tpid: ''
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remnft (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'remnft',
            account: 'fio.address',
            data: {
              fio_address: autoproxy.address,
              nfts: [autoproxy.nft1],
              max_fee: config.maxFee,
              actor: autoproxy.account,
              tpid: ""
            }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remallnfts (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'remallnfts',
            account: 'fio.address',
            data: {
              fio_address: autoproxy.address,
              max_fee: config.maxFee,
              actor: autoproxy.account,
              tpid: ""
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });
    }); // autoproxy

    describe('voterWithAutoproxy', () => {

      it(`address.regaddress (voterWithAutoproxy) x 3`, async function () {
        try {
          voterWithAutoproxy.address1 = generateFioAddress(voterWithAutoproxy.domain,8);
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'regaddress',
            account: 'fio.address',
            data: {
                fio_address: voterWithAutoproxy.address1,
                owner_fio_public_key: voterWithAutoproxy.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: voterWithAutoproxy.account
            }
          });
          expect(result.status).to.equal('OK')
          voterWithAutoproxy.address2 = generateFioAddress(voterWithAutoproxy.domain,8);
          const result2 = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'regaddress',
            account: 'fio.address',
            data: {
                fio_address: voterWithAutoproxy.address2,
                owner_fio_public_key: voterWithAutoproxy.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: voterWithAutoproxy.account
            }
          });
          expect(result2.status).to.equal('OK')
          voterWithAutoproxy.address3 = generateFioAddress(voterWithAutoproxy.domain,8);
          const result3 = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'regaddress',
            account: 'fio.address',
            data: {
                fio_address: voterWithAutoproxy.address3,
                owner_fio_public_key: voterWithAutoproxy.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: voterWithAutoproxy.account
            }
          });
          expect(result3.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('err: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.renewaddress (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'renewaddress',
            account: 'fio.address',
            data: {
              fio_address: voterWithAutoproxy.address,
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithAutoproxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.xferaddress (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'xferaddress',
            account: 'fio.address',
            data: {
              fio_address: voterWithAutoproxy.address2,
              new_owner_fio_public_key: otherUser.publicKey,
              max_fee: config.maxFee,
              actor: voterWithAutoproxy.account,
              tpid: ""
            }
          })
          //console.log('result: ', result)
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error: ', err);
          console.log('Error: ', JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it.skip(`address.burnaddress (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('push_transaction', {
            action: 'burnaddress',
            account: 'fio.address',
            data: {
              fio_address: voterWithAutoproxy.address3,
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithAutoproxy.account
            }
          })
          console.log('result: ', result);
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.addbundles (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'addbundles',
            account: 'fio.address',
            data: {
              fio_address: voterWithAutoproxy.address,
              bundle_sets: 1,
              max_fee: config.maxFee,
              tpid: ''
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.addaddress (voterWithAutoproxy)`, async function () {
        try {
          voterWithAutoproxy.mappedAddress1 = {chain_code: 'BCH', token_code: 'BCH', public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'};
          voterWithAutoproxy.mappedAddress2 = {chain_code: 'BCH', token_code: 'BCH', public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'};
          voterWithAutoproxy.mappedAddress3 = {chain_code: 'BCH', token_code: 'BCH', public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'};
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'addaddress',
            account: 'fio.address',
            data: {
              fio_address: voterWithAutoproxy.address,
              public_addresses:[voterWithAutoproxy.mappedAddress1, voterWithAutoproxy.mappedAddress2, voterWithAutoproxy.mappedAddress3],
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithAutoproxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remaddress (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'remaddress',
            account: 'fio.address',
            data: {
              fio_address: voterWithAutoproxy.address,
              public_addresses: [voterWithAutoproxy.mappedAddress1],
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithAutoproxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remalladdr (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'remalladdr',
            account: 'fio.address',
            data: {
              fio_address: voterWithAutoproxy.address,
              max_fee: config.maxFee,
              tpid: "",
              actor: voterWithAutoproxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.regdomain (voterWithAutoproxy)`, async function () {
        try {
          voterWithAutoproxy.domain2 = generateFioDomain(8);
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'regdomain',
            account: 'fio.address',
            data: {
                fio_domain: voterWithAutoproxy.domain2,
                owner_fio_public_key: voterWithAutoproxy.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: voterWithAutoproxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.renewdomain (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'renewdomain',
            account: 'fio.address',
            data: {
              fio_domain: voterWithAutoproxy.domain,
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithAutoproxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.setdomainpub (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'setdomainpub',
            account: 'fio.address',
            data: {
              fio_domain: voterWithAutoproxy.domain2,
              is_public: 1,
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithAutoproxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.xferdomain (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'xferdomain',
            account: 'fio.address',
            data: {
              fio_domain: voterWithAutoproxy.domain2,
              new_owner_fio_public_key: otherUser.publicKey,
              max_fee: config.maxFee,
              tpid: '',
              actor: voterWithAutoproxy.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.addnft (voterWithAutoproxy)`, async function () {
        try {
          voterWithAutoproxy.nft1 = { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF4", "token_id": "1", "url": "", "hash": "", "metadata": "" };
          voterWithAutoproxy.nft2 = { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF4", "token_id": "2", "url": "", "hash": "", "metadata": "" };
          voterWithAutoproxy.nft3 = { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF4", "token_id": "3", "url": "", "hash": "", "metadata": "" };
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'addnft',
            account: 'fio.address',
            data: {
                fio_address: voterWithAutoproxy.address,
                //nfts: [ voterWithAutoproxy.nft1, voterWithAutoproxy.nft2, voterWithAutoproxy.nft3],
                nfts: [voterWithAutoproxy.nft1, voterWithAutoproxy.nft2, voterWithAutoproxy.nft3],
                max_fee: config.maxFee,
                actor: voterWithAutoproxy.account,
                tpid: ''
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remnft (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'remnft',
            account: 'fio.address',
            data: {
              fio_address: voterWithAutoproxy.address,
              nfts: [voterWithAutoproxy.nft1],
              max_fee: config.maxFee,
              actor: voterWithAutoproxy.account,
              tpid: ""
            }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.remallnfts (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'remallnfts',
            account: 'fio.address',
            data: {
              fio_address: voterWithAutoproxy.address,
              max_fee: config.maxFee,
              actor: voterWithAutoproxy.account,
              tpid: ""
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });
    }); // voterWithAutoproxy

  }); // fio.address actions


  describe('fio.fee actions', () => {

    describe('producer', () => {

      it.skip(`NEED TO DO? fee.createfee (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'createfee',
            account: 'fio.fee',
            data: {
              end_point: "fake_endpoint",
              type: 0,
              suf_amount: 1000000000,
              actor: bp1.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`fee.setfeevote (producer) Note that this can only be re-sent after a period of time.`, async function () {
        try {
          const fee_ratios = [
            {
              "end_point": "add_bundled_transactions",
              "value": 2000000000
            },
            {
              "end_point": "add_nft",
              "value": 30000000
            }
          ] 
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'setfeevote',
            account: 'fio.fee',
            data: {
              fee_ratios: fee_ratios,
              max_fee: config.maxFee,
              actor: bp1.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`fee.bundlevote (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'bundlevote',
            account: 'fio.fee',
            data: {
              bundled_transactions: 100,
              max_fee: config.maxFee,
              tpid: '',
              actor: bp1.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`fee.setfeemult (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'setfeemult',
            account: 'fio.fee',
            data: {
              multiplier: 20,
              max_fee: config.maxFee,
              actor: bp1.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it.skip(`NEED TO DO? fee.mandatoryfee (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'mandatoryfee',
            account: 'fio.fee',
            data: {
              fio_address: bp1.address,
              max_fee: config.maxFee,
              tpid: '',
              actor: bp1.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`NEED TO DO? fee.bytemandfee (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'bytemandfee',
            account: 'fio.fee',
            data: {
              fio_address: bp1.address,
              max_fee: config.maxFee,
              tpid: '',
              actor: bp1.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`fee.computefees (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'computefees',
            account: 'fio.fee',
            data: {
              actor: bp1.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

    });

  }); // fio.fee actions


  describe('fio.reqobt actions', () => {

    describe('producer', () => {

      let otherUserReqId, bp1ReqId;

      it.skip(`NEED TO DO? (Admin call) reqobt.migrtrx (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'migrtrx',
            account: 'fio.fee',
            data: {
              amount: 100,
              actor: bp1.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`reqobt.newfundsreq (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'newfundsreq',
            account: 'fio.reqobt',
            data: {
              payer_fio_address: otherUser.address,
              payee_fio_address: bp1.address,
              tpid: '',
              content: {
                payee_public_address: 'thisispayeetokenpublicaddress',
                amount: 2000000000,
                chain_code: 'BTC',
                token_code: 'BTC',
                memo: 'Request memo',
                hash:'',
                offline_url: ''
              },
              max_fee: config.maxFee
            }
          })
          //console.log('Result: ', result);
          bp1ReqId = result.fio_request_id;
          expect(result.status).to.equal('requested');
          await validateVotes();
        } catch (err) {
          console.log('Err: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });      
      
      it(`reqobt.newfundsreq (otherUser)`, async function () {
        try {
          const result = await otherUser.sdk.genericAction('pushTransaction', {
            action: 'newfundsreq',
            account: 'fio.reqobt',
            data: {
              payer_fio_address: bp1.address,
              payee_fio_address: otherUser.address,
              tpid: '',
              content: {
                payee_public_address: 'thisispayeetokenpublicaddress',
                amount: 2000000000,
                chain_code: 'BTC',
                token_code: 'BTC',
                memo: 'Request memo',
                hash:'',
                offline_url: ''
              },
              max_fee: config.maxFee
            }
          })
          //console.log('Result: ', result);
          otherUserReqId = result.fio_request_id;
          expect(result.status).to.equal('requested');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`reqobt.recordobt (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('recordObtData', {
            payerFioAddress: bp1.address,
            payeeFioAddress: otherUser.address,
            payerTokenPublicAddress: bp1.publicKey,
            payeeTokenPublicAddress: otherUser.publicKey,
            amount: 2000000000,
            chainCode: "FIO",
            tokenCode: "FIO",
            status: '',
            obtId: otherUserReqId,
            maxFee: config.maxFee,
            technologyProviderId: '',
            payeeFioPublicKey: otherUser.publicKey,
            memo: 'this is a test',
            hash: '',
            offLineUrl: ''
          })
          expect(result.status).to.equal('sent_to_blockchain');
          await validateVotes();
        } catch (err) {
          console.log('Err: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`reqobt.rejectfndreq (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'rejectfndreq',
            account: 'fio.reqobt',
            data: {
              "fio_request_id": otherUserReqId,
              "max_fee": config.maxFee,
              "tpid": '',
              "actor": bp1.account
            }
          })
          expect(result.status).to.equal('request_rejected');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`reqobt.cancelfndreq (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'cancelfndreq',
            account: 'fio.reqobt',
            data: {
              "fio_request_id": bp1ReqId,
              "max_fee": config.maxFee,
              "tpid": '',
              "actor": bp1.account
            }
          })
          expect(result.status).to.equal('cancelled');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

    });

    describe('voterWithProd', () => {

      let otherUserReqId, bp1ReqId;

      it(`reqobt.newfundsreq (producer)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'newfundsreq',
            account: 'fio.reqobt',
            data: {
              payer_fio_address: otherUser.address,
              payee_fio_address: voterWithProd.address,
              tpid: '',
              content: {
                payee_public_address: 'thisispayeetokenpublicaddress',
                amount: 2000000000,
                chain_code: 'BTC',
                token_code: 'BTC',
                memo: 'Request memo',
                hash:'',
                offline_url: ''
              },
              max_fee: config.maxFee
            }
          })
          //console.log('Result: ', result);
          bp1ReqId = result.fio_request_id;
          expect(result.status).to.equal('requested');
          await validateVotes();
        } catch (err) {
          console.log('Err: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });      
      
      it(`reqobt.newfundsreq (otherUser)`, async function () {
        try {
          const result = await otherUser.sdk.genericAction('pushTransaction', {
            action: 'newfundsreq',
            account: 'fio.reqobt',
            data: {
              payer_fio_address: voterWithProd.address,
              payee_fio_address: otherUser.address,
              tpid: '',
              content: {
                payee_public_address: 'thisispayeetokenpublicaddress',
                amount: 2000000000,
                chain_code: 'BTC',
                token_code: 'BTC',
                memo: 'Request memo',
                hash:'',
                offline_url: ''
              },
              max_fee: config.maxFee
            }
          })
          //console.log('Result: ', result);
          otherUserReqId = result.fio_request_id;
          expect(result.status).to.equal('requested');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`reqobt.recordobt (producer)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('recordObtData', {
            payerFioAddress: voterWithProd.address,
            payeeFioAddress: otherUser.address,
            payerTokenPublicAddress: voterWithProd.publicKey,
            payeeTokenPublicAddress: otherUser.publicKey,
            amount: 2000000000,
            chainCode: "FIO",
            tokenCode: "FIO",
            status: '',
            obtId: otherUserReqId,
            maxFee: config.maxFee,
            technologyProviderId: '',
            payeeFioPublicKey: otherUser.publicKey,
            memo: 'this is a test',
            hash: '',
            offLineUrl: ''
          })
          expect(result.status).to.equal('sent_to_blockchain');
          await validateVotes();
        } catch (err) {
          console.log('Err: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`reqobt.rejectfndreq (producer)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'rejectfndreq',
            account: 'fio.reqobt',
            data: {
              "fio_request_id": otherUserReqId,
              "max_fee": config.maxFee,
              "tpid": '',
              "actor": voterWithProd.account
            }
          })
          expect(result.status).to.equal('request_rejected');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`reqobt.cancelfndreq (producer)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'cancelfndreq',
            account: 'fio.reqobt',
            data: {
              "fio_request_id": bp1ReqId,
              "max_fee": config.maxFee,
              "tpid": '',
              "actor": voterWithProd.account
            }
          })
          expect(result.status).to.equal('cancelled');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

    });

    describe('proxy', () => {

      let otherUserReqId, bp1ReqId;

      it(`reqobt.newfundsreq (producer)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'newfundsreq',
            account: 'fio.reqobt',
            data: {
              payer_fio_address: otherUser.address,
              payee_fio_address: proxy.address,
              tpid: '',
              content: {
                payee_public_address: 'thisispayeetokenpublicaddress',
                amount: 2000000000,
                chain_code: 'BTC',
                token_code: 'BTC',
                memo: 'Request memo',
                hash:'',
                offline_url: ''
              },
              max_fee: config.maxFee
            }
          })
          //console.log('Result: ', result);
          bp1ReqId = result.fio_request_id;
          expect(result.status).to.equal('requested');
          await validateVotes();
        } catch (err) {
          console.log('Err: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });      
      
      it(`reqobt.newfundsreq (otherUser)`, async function () {
        try {
          const result = await otherUser.sdk.genericAction('pushTransaction', {
            action: 'newfundsreq',
            account: 'fio.reqobt',
            data: {
              payer_fio_address: proxy.address,
              payee_fio_address: otherUser.address,
              tpid: '',
              content: {
                payee_public_address: 'thisispayeetokenpublicaddress',
                amount: 2000000000,
                chain_code: 'BTC',
                token_code: 'BTC',
                memo: 'Request memo',
                hash:'',
                offline_url: ''
              },
              max_fee: config.maxFee
            }
          })
          //console.log('Result: ', result);
          otherUserReqId = result.fio_request_id;
          expect(result.status).to.equal('requested');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`reqobt.recordobt (producer)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('recordObtData', {
            payerFioAddress: proxy.address,
            payeeFioAddress: otherUser.address,
            payerTokenPublicAddress: proxy.publicKey,
            payeeTokenPublicAddress: otherUser.publicKey,
            amount: 2000000000,
            chainCode: "FIO",
            tokenCode: "FIO",
            status: '',
            obtId: otherUserReqId,
            maxFee: config.maxFee,
            technologyProviderId: '',
            payeeFioPublicKey: otherUser.publicKey,
            memo: 'this is a test',
            hash: '',
            offLineUrl: ''
          })
          expect(result.status).to.equal('sent_to_blockchain');
          await validateVotes();
        } catch (err) {
          console.log('Err: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`reqobt.rejectfndreq (producer)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'rejectfndreq',
            account: 'fio.reqobt',
            data: {
              "fio_request_id": otherUserReqId,
              "max_fee": config.maxFee,
              "tpid": '',
              "actor": proxy.account
            }
          })
          expect(result.status).to.equal('request_rejected');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`reqobt.cancelfndreq (producer)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'cancelfndreq',
            account: 'fio.reqobt',
            data: {
              "fio_request_id": bp1ReqId,
              "max_fee": config.maxFee,
              "tpid": '',
              "actor": proxy.account
            }
          })
          expect(result.status).to.equal('cancelled');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

    });

    describe('voterWithProxy', () => {

      let otherUserReqId, bp1ReqId;

      it(`reqobt.newfundsreq (producer)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'newfundsreq',
            account: 'fio.reqobt',
            data: {
              payer_fio_address: otherUser.address,
              payee_fio_address: voterWithProxy.address,
              tpid: '',
              content: {
                payee_public_address: 'thisispayeetokenpublicaddress',
                amount: 2000000000,
                chain_code: 'BTC',
                token_code: 'BTC',
                memo: 'Request memo',
                hash:'',
                offline_url: ''
              },
              max_fee: config.maxFee
            }
          })
          //console.log('Result: ', result);
          bp1ReqId = result.fio_request_id;
          expect(result.status).to.equal('requested');
          await validateVotes();
        } catch (err) {
          console.log('Err: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });      
      
      it(`reqobt.newfundsreq (otherUser)`, async function () {
        try {
          const result = await otherUser.sdk.genericAction('pushTransaction', {
            action: 'newfundsreq',
            account: 'fio.reqobt',
            data: {
              payer_fio_address: voterWithProxy.address,
              payee_fio_address: otherUser.address,
              tpid: '',
              content: {
                payee_public_address: 'thisispayeetokenpublicaddress',
                amount: 2000000000,
                chain_code: 'BTC',
                token_code: 'BTC',
                memo: 'Request memo',
                hash:'',
                offline_url: ''
              },
              max_fee: config.maxFee
            }
          })
          //console.log('Result: ', result);
          otherUserReqId = result.fio_request_id;
          expect(result.status).to.equal('requested');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`reqobt.recordobt (producer)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('recordObtData', {
            payerFioAddress: voterWithProxy.address,
            payeeFioAddress: otherUser.address,
            payerTokenPublicAddress: voterWithProxy.publicKey,
            payeeTokenPublicAddress: otherUser.publicKey,
            amount: 2000000000,
            chainCode: "FIO",
            tokenCode: "FIO",
            status: '',
            obtId: otherUserReqId,
            maxFee: config.maxFee,
            technologyProviderId: '',
            payeeFioPublicKey: otherUser.publicKey,
            memo: 'this is a test',
            hash: '',
            offLineUrl: ''
          })
          expect(result.status).to.equal('sent_to_blockchain');
          await validateVotes();
        } catch (err) {
          console.log('Err: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`reqobt.rejectfndreq (producer)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'rejectfndreq',
            account: 'fio.reqobt',
            data: {
              "fio_request_id": otherUserReqId,
              "max_fee": config.maxFee,
              "tpid": '',
              "actor": voterWithProxy.account
            }
          })
          expect(result.status).to.equal('request_rejected');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`reqobt.cancelfndreq (producer)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'cancelfndreq',
            account: 'fio.reqobt',
            data: {
              "fio_request_id": bp1ReqId,
              "max_fee": config.maxFee,
              "tpid": '',
              "actor": voterWithProxy.account
            }
          })
          expect(result.status).to.equal('cancelled');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

    });

    describe('autoproxy', () => {

      let otherUserReqId, bp1ReqId;

      it(`reqobt.newfundsreq (producer)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'newfundsreq',
            account: 'fio.reqobt',
            data: {
              payer_fio_address: otherUser.address,
              payee_fio_address: autoproxy.address,
              tpid: '',
              content: {
                payee_public_address: 'thisispayeetokenpublicaddress',
                amount: 2000000000,
                chain_code: 'BTC',
                token_code: 'BTC',
                memo: 'Request memo',
                hash:'',
                offline_url: ''
              },
              max_fee: config.maxFee
            }
          })
          //console.log('Result: ', result);
          bp1ReqId = result.fio_request_id;
          expect(result.status).to.equal('requested');
          await validateVotes();
        } catch (err) {
          console.log('Err: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });      
      
      it(`reqobt.newfundsreq (otherUser)`, async function () {
        try {
          const result = await otherUser.sdk.genericAction('pushTransaction', {
            action: 'newfundsreq',
            account: 'fio.reqobt',
            data: {
              payer_fio_address: autoproxy.address,
              payee_fio_address: otherUser.address,
              tpid: '',
              content: {
                payee_public_address: 'thisispayeetokenpublicaddress',
                amount: 2000000000,
                chain_code: 'BTC',
                token_code: 'BTC',
                memo: 'Request memo',
                hash:'',
                offline_url: ''
              },
              max_fee: config.maxFee
            }
          })
          //console.log('Result: ', result);
          otherUserReqId = result.fio_request_id;
          expect(result.status).to.equal('requested');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`reqobt.recordobt (producer)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('recordObtData', {
            payerFioAddress: autoproxy.address,
            payeeFioAddress: otherUser.address,
            payerTokenPublicAddress: autoproxy.publicKey,
            payeeTokenPublicAddress: otherUser.publicKey,
            amount: 2000000000,
            chainCode: "FIO",
            tokenCode: "FIO",
            status: '',
            obtId: otherUserReqId,
            maxFee: config.maxFee,
            technologyProviderId: '',
            payeeFioPublicKey: otherUser.publicKey,
            memo: 'this is a test',
            hash: '',
            offLineUrl: ''
          })
          expect(result.status).to.equal('sent_to_blockchain');
          await validateVotes();
        } catch (err) {
          console.log('Err: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`reqobt.rejectfndreq (producer)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'rejectfndreq',
            account: 'fio.reqobt',
            data: {
              "fio_request_id": otherUserReqId,
              "max_fee": config.maxFee,
              "tpid": '',
              "actor": autoproxy.account
            }
          })
          expect(result.status).to.equal('request_rejected');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`reqobt.cancelfndreq (producer)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'cancelfndreq',
            account: 'fio.reqobt',
            data: {
              "fio_request_id": bp1ReqId,
              "max_fee": config.maxFee,
              "tpid": '',
              "actor": autoproxy.account
            }
          })
          expect(result.status).to.equal('cancelled');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

    });

    describe('voterWithAutoproxy', () => {

      let otherUserReqId, bp1ReqId;

      it(`reqobt.newfundsreq (producer)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'newfundsreq',
            account: 'fio.reqobt',
            data: {
              payer_fio_address: otherUser.address,
              payee_fio_address: voterWithAutoproxy.address,
              tpid: '',
              content: {
                payee_public_address: 'thisispayeetokenpublicaddress',
                amount: 2000000000,
                chain_code: 'BTC',
                token_code: 'BTC',
                memo: 'Request memo',
                hash:'',
                offline_url: ''
              },
              max_fee: config.maxFee
            }
          })
          //console.log('Result: ', result);
          bp1ReqId = result.fio_request_id;
          expect(result.status).to.equal('requested');
          await validateVotes();
        } catch (err) {
          console.log('Err: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });      
      
      it(`reqobt.newfundsreq (otherUser)`, async function () {
        try {
          const result = await otherUser.sdk.genericAction('pushTransaction', {
            action: 'newfundsreq',
            account: 'fio.reqobt',
            data: {
              payer_fio_address: voterWithAutoproxy.address,
              payee_fio_address: otherUser.address,
              tpid: '',
              content: {
                payee_public_address: 'thisispayeetokenpublicaddress',
                amount: 2000000000,
                chain_code: 'BTC',
                token_code: 'BTC',
                memo: 'Request memo',
                hash:'',
                offline_url: ''
              },
              max_fee: config.maxFee
            }
          })
          //console.log('Result: ', result);
          otherUserReqId = result.fio_request_id;
          expect(result.status).to.equal('requested');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`reqobt.recordobt (producer)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('recordObtData', {
            payerFioAddress: voterWithAutoproxy.address,
            payeeFioAddress: otherUser.address,
            payerTokenPublicAddress: voterWithAutoproxy.publicKey,
            payeeTokenPublicAddress: otherUser.publicKey,
            amount: 2000000000,
            chainCode: "FIO",
            tokenCode: "FIO",
            status: '',
            obtId: otherUserReqId,
            maxFee: config.maxFee,
            technologyProviderId: '',
            payeeFioPublicKey: otherUser.publicKey,
            memo: 'this is a test',
            hash: '',
            offLineUrl: ''
          })
          expect(result.status).to.equal('sent_to_blockchain');
          await validateVotes();
        } catch (err) {
          console.log('Err: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`reqobt.rejectfndreq (producer)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'rejectfndreq',
            account: 'fio.reqobt',
            data: {
              "fio_request_id": otherUserReqId,
              "max_fee": config.maxFee,
              "tpid": '',
              "actor": voterWithAutoproxy.account
            }
          })
          expect(result.status).to.equal('request_rejected');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`reqobt.cancelfndreq (producer)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'cancelfndreq',
            account: 'fio.reqobt',
            data: {
              "fio_request_id": bp1ReqId,
              "max_fee": config.maxFee,
              "tpid": '',
              "actor": voterWithAutoproxy.account
            }
          })
          expect(result.status).to.equal('cancelled');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

    });

  });  // fio.reqobt


  describe('eosio actions (system, voting, producer)', () => {
    let newProxy;
    const lockAmount = 10000000000; // 10 FIO
    const AddActionAction = randStr(10);
    const addActionContract = "fio.token";
    const parent = 'active';
    const newPerm = randStr(10);


    it(`register a new proxy`, async function () {
      try {
        newProxy = await newUser(faucet);

        const result = await newProxy.sdk.genericAction('pushTransaction', {
          action: 'regproxy',
          account: 'eosio',
          data: {
            fio_address: newProxy.address,
            max_fee: config.maxFee
          }
        })
        expect(result.status).to.equal('OK');
        await validateVotes();
      } catch (err) {
        console.log(JSON.stringify(err, null, 4));
        throw err;
      }
    });

    describe('producer', () => {
      let newAuth, tempUser;

      it(`Create users and authorization`, async () => {
        tempUser = await newUser(faucet);

        newAuth = {
          threshold: 1,
          accounts: [
            {
              permission: {
                actor: tempUser.account,
                permission: 'active'
              },
              weight: 1
            }
          ],
          keys: [],
          waits: [],
        };
      })

      it.skip(`(needed?) eosio.addaction (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'addaction',
            account: 'eosio',
            data: {
              action: AddActionAction,
              contract: addActionContract,
              max_fee: config.maxFee,
            }
          });
          expect(result.status).to.equal('OK');
          expect(result.processed.receipt.status).to.equal('executed');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it.skip(`(needed?) eosio.remaction (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'remaction',
            account: 'eosio',
            data: {
              action: AddActionAction,
              actor: bp1.account
            }
          });
          expect(result.status).to.equal('OK');
          expect(result.processed.receipt.status).to.equal('executed');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it.skip(`(needed?) eosio.burnaction (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'burnaction',
            account: 'eosio',
            data: {
              action: AddActionAction,
              contract: addActionContract,
              max_fee: config.maxFee,
            }
          });
          expect(result.processed.receipt.status).to.equal('executed');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it.skip(`(needed?) eosio.addgenlocked (producer)`, async function () {
      });

      it(`eosio.addlocked (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'addlocked',
            account: 'eosio',
            data: {
              owner: otherUser.account,
              amount: lockAmount,
              locktype: 1
            }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it.skip(`(needed?) eosio.canceldelay (producer)`, async function () {
      });

      it.skip(`(needed?) eosio.clrgenlocked (producer)`, async function () {
      });

      it.skip(`(needed?) eosio.crautoproxy (producer)`, async function () {
      });

      it(`eosio.updateauth (producer)`, async function () {
        try{
          const result = await callFioApiSigned('push_transaction', {
            action: 'updateauth',
            account: 'eosio',
            actor: bp1.account,
            privKey: bp1.privateKey,
            data: {
              permission: newPerm,
              parent: parent,
              auth: newAuth,
              max_fee: config.maxFee,
              account: bp1.account
            }
          });
          //console.log('Result: ', result);
          expect(result.processed.receipt.status).to.equal('executed');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`eosio.linkauth (producer)`, async function () {
        try {
          const result = await callFioApiSigned('push_transaction', {
            action: 'linkauth',
            account: 'eosio',
            actor: bp1.account,
            privKey: bp1.privateKey,
            data: {
              account: bp1.account,                 // the owner of the permission to be linked, this account will sign the transaction
              code: 'fio.address',                    // the contract owner of the action to be linked
              type: 'regaddress',                     // the action to be linked
              requirement: newPerm,                   // the name of the custom permission (created by updateauth)
              max_fee: config.maxFee,
              account: bp1.account
            }
          });
          //console.log('Result: ', result);
          expect(result.processed.receipt.status).to.equal('executed');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`eosio.unlinkauth (producer)`, async function () {
        try {
          const result = await callFioApiSigned('push_transaction', {
            action: 'unlinkauth',
            account: 'eosio',
            actor: bp1.account,
            privKey: bp1.privateKey,
            data: {
              account: bp1.account,                 // the owner of the permission to be linked, this account will sign the transaction
              code: 'fio.address',                    // the contract owner of the action to be linked
              type: 'regaddress',                     // the action to be linked
              max_fee: config.maxFee
            }
          });
          //console.log('Result: ', result);
          expect(result.processed.receipt.status).to.equal('executed');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`eosio.deleteauth (producer)`, async function () {
        try {
          const result = await callFioApiSigned('push_transaction', {
            action: 'deleteauth',
            account: 'eosio',
            actor: bp1.account,
            privKey: bp1.privateKey,
            data: {
              permission: newPerm,
              max_fee: config.maxFee,
              account: bp1.account
            }
          });
          //console.log('Result: ', result);
          expect(result.processed.receipt.status).to.equal('executed');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it.skip(`(needed?) eosio.incram (producer)`, async function () {
      });

      it.skip(`(needed?) eosio.inhibitunlck (producer)`, async function () {
      });

      it.skip(`(needed?) eosio.initParams (producer)`, async function () {
      });

      it.skip(`(needed?) eosio.modgenlocked (producer)`, async function () {
      });

      it.skip(`(needed?) eosio.newaccount (producer)`, async function () {
      });

      it.skip(`(needed?) eosio.onblock (producer)`, async function () {
      });

      it.skip(`(needed?) eosio.onerror (producer)`, async function () {
      });

      it.skip(`(skip this for producer) eosio.unregprod (producer)`, async function () {
        try {
        const result = await bp1.sdk.genericAction('pushTransaction', {
          action: 'unregprod',
          account: 'eosio',
          data: {
            fio_address: bp1.address,
            max_fee: config.maxFee
          }
        })
        expect(result.status).to.equal('OK');
        await validateVotes();
      } catch (err) {
        console.log(JSON.stringify(err, null, 4));
        throw err;
      }
      });

      it.skip(`(skip this for producer) eosio.regproducer (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'regproducer',
            account: 'eosio',
            data: {
              fio_address: bp1.address,
              fio_pub_key: bp1.publicKey,
              url: "https://mywebsite.io/",
              location: 80,
              actor: bp1.account,
              max_fee: config.maxFee
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`eosio.regproxy (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'regproxy',
            account: 'eosio',
            data: {
              fio_address: bp1.address,
              actor: bp1.account,
              max_fee: config.maxFee
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`eosio.unregproxy (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'unregproxy',
            account: 'eosio',
            data: {
              fio_address: bp1.address,
              actor: bp1.account,
              max_fee: config.maxFee
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it.skip(`(needed?) eosio.resetclaim (producer)`, async function () {
      });

      it.skip(`(needed?) eosio.rmvproducer (producer)`, async function () {
      });

      it.skip(`eosio.setabi (producer)`, async function () {
      });

      it.skip(`(needed?) eosio.setautoproxy (producer)`, async function () {
      });

      it.skip(`eosio.setcode (producer)`, async function () {
      });

      it.skip(`(needed?) eosio.setnolimits (producer)`, async function () {
      });

      it.skip(`(needed?) eosio.setparams (producer)`, async function () {
      });

      it.skip(`(needed?) eosio.setpriv (producer)`, async function () {
      });

      it.skip(`(needed?) eosio.unlocktokens (producer)`, async function () {
      });

      it.skip(`(needed?) eosio.updatepower (producer)`, async function () {
      });

      it.skip(`(needed?) eosio.updlbpclaim (producer)`, async function () {
      });

      it.skip(`(needed?) eosio.updlocked (producer)`, async function () {
      });

      it.skip(`(needed?) eosio.updtrevision (producer)`, async function () {
      });

      it(`eosio.voteproducer (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'voteproducer',
            account: 'eosio',
            data: {
              "producers": [
                bp2.address
              ],
              fio_address: bp1.address,
              max_fee: config.api.vote_producer.fee
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`eosio.voteproxy (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'voteproxy',
            account: 'eosio',
            data: {
              proxy: newProxy.address,
              fio_address: bp1.address,
              max_fee: config.maxFee
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

    }); // producer

  }); // eosio actions);


  describe('eosio.msig actions', () => {
    describe('producer', () => {

      it(`msig.approve (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'approve',
            account: 'eosio.msig',
            data: {
              // amount: 100,
              // actor: bp1.account
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`msig.cancel (producer)`, async function () {
      });

      it(`msig.exec (producer)`, async function () {
      });

      it(`msig.invalidate (producer)`, async function () {
      });

      it(`msig.propose (producer)`, async function () {
      });

      it(`msig.unapprove (producer)`, async function () {
      });

    });
  }); // eosio.msig


  describe('fio.perms actions', () => {
    describe('producer', () => {

      it(`perms.addperm (producer)`, async function () {
      });

      it(`perms.remperm (producer)`, async function () {
      });

      it(`perms.clearperm (producer)`, async function () {
      });

    });
  }); // fio.perms


  describe('fio.tpid actions', () => {
    describe('producer', () => {

      it(`tpid.updatetpid (producer)`, async function () {
      });

      it(`tpid.rewardspaid (producer)`, async function () {
      });

      it(`tpid.updatebounty (producer)`, async function () {
      });

    });
  }); // fio.tpid


  describe('fio.treasury actions', () => {
    describe('producer', () => {

      it(`treasury.tpidclaim (producer)`, async function () {
      });

      it(`treasury.bpclaim (producer)`, async function () {
      });

      it.skip(`(needed?) treasury.paystake (producer)`, async function () {
      });

      it.skip(`(needed?) treasury.startclock (producer)`, async function () {
      });

      it.skip(`(needed?) treasury.fdtnrwdupdat (producer)`, async function () {
      });

      it.skip(`(needed?) treasury.bprewdupdate (producer)`, async function () {
      });

      it.skip(`(needed?) treasury.bppoolupdate (producer)`, async function () {
      });

    });
  }); // fio.treasury


  describe('fio.escrow actions', () => {
    describe('producer', () => {

      it(`escrow.listdomain (producer)`, async function () {
      });

      it(`escrow.cxlistdomain (producer)`, async function () {
      });

      it(`escrow.buydomain (producer)`, async function () {
      });

      it(`escrow.setmrkplcfg (producer)`, async function () {
      });

      it(`escrow.cxburned (producer)`, async function () {
      });

    });
  }); // fio.escrow


  /**
   * INSTRUCTIONS TO SET UP THESE TESTS
   *
   * 1) In fio.oracle.cpp, comment out the SYSTEMACCOUNT authentication in the regoracle and unregoracle methods
   *
   * e.g.
   * // require_auth(SYSTEMACCOUNT);
   *
   */
  describe.skip('INCOMPLETE: REQUIRES PERMISSION UPDATE ON CHAIN fio.oracle actions', () => {
    const wrapAmt = 10000000000; // 10 FIO
    const unwrapAmt = 5000000000; // 5 FIO
    const obtID = '0xobtidetcetcetc' + randStr(20);
    let wfio = {
      address: '0xblahblahblah' + randStr(20)
    }

    describe('producer', () => {

      it(`clean out oracless record with helper function`, async function () {
        try {
          await cleanUpOraclessTable(faucet, false);
        } catch (err) {
          console.log('Error: ', err)
          throw err;
        }
      });

      it(`confirm oracles table is empty or has 3 default bp accounts`, async function () {
        try {
          let records = await getOracleRecords();
          //console.log('Records: ', records);
          expect(records.rows.length).to.be.oneOf([0,3]);
        } catch (err) {
          console.log('Error: ', err)
          throw err;
        }
      });

      it(`register two oracles (no checks on voting changes)`, async function () {
        try {
          // newOracle1 = await newUser(faucet);
          // newOracle2 = await newUser(faucet);
          // newOracle3 = await newUser(faucet); 
    
          //await registerNewBp(newOracle1);
          await registerNewOracle(bp2);
          await setTestOracleFees(bp2, 500000000, 1000000000);
    
          // await registerNewBp(newOracle2);
          await registerNewOracle(bp3);
          await setTestOracleFees(bp3, 1000000000, 1200000000);

          // await registerNewBp(newOracle3);
          // await registerNewOracle(newOracle3);
          // await setTestOracleFees(newOracle3, 1000000000, 1200000000);
        } catch (err) {
          console.log('Error: ', err);
          throw err;
        }
      });

      it.skip(`oracle.regoracle (producer ONLY)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'regoracle',
            account: 'fio.oracle',
            actor: 'eosio',
            data: {
              oracle_actor: bp1.account,
              actor: bp1.account
            }
          });
          expect(result.status).to.equal('OK')
          //await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it.skip(`oracle.setoraclefee (producer ONLY)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'setoraclefee',
            account: 'fio.oracle',
            actor: 'eosio',
            data: {
              wrap_fio_domain: 1000000000,
              wrap_fio_tokens: 1100000000
            }
          });
          expect(result.status).to.equal('OK')
          //await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it.skip(`oracle.wraptokens (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'wraptokens',
            account: 'fio.oracle',
            data: {
              amount: wrapAmt,
              chain_code: "ETH",
              public_address: wfio.address,
              max_oracle_fee: config.maxFee,
              max_fee: config.maxFee,
              tpid: "",
            }
          })
          expect(result.status).to.equal('OK');
          //await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it.skip(`oracle.unwraptokens (producer as oracle ONLY)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'unwraptokens',
            account: 'fio.oracle',
            data: {
              amount: unwrapAmt,
              obt_id: obtID,
              fio_address: bp1.address,
            }
          })
          expect(result.status).to.equal('OK');
          //await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`oracle.wrapdomain (producer)`, async function () {
      });

      it(`oracle.unwrapdomain (producer as oracle ONLY)`, async function () {
      });

      it.skip(`oracle.unregoracle (producer ONLY)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'unregoracle',
            account: 'fio.oracle',
            actor: 'eosio',
            data: {
              oracle_actor: bp1.account,
              actor: bp1.account
            }
          });
          expect(result.status).to.equal('OK');
          //await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`clean out oracless record with helper function`, async function () {
        try {
          await cleanUpOraclessTable(faucet, true);
          let records = await getOracleRecords();
          expect(records.rows.length).to.be.oneOf([3, 0]);
        } catch (err) {
          throw err;
        }
      });

    });
  }); // fio.oracle


  describe('fio.staking actions', () => {
    const stakeAmount = 2000000000; // 2 FIO
    const unstakeAmount = 1000000000; // 1 FIO

    describe('producer', () => {

      it(`staking.stakefio (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'stakefio',
            account: 'fio.staking',
            data: {
              fio_address: bp1.address,
              amount: stakeAmount,
              max_fee: config.maxFee,
              tpid: ''
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`staking.unstakefio (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'unstakefio',
            account: 'fio.staking',
            data: {
              fio_address: bp1.address,
              amount: unstakeAmount,
              max_fee: config.maxFee,
              tpid: ''
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

    });
  }); // fio.staking

});