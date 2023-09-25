require('mocha')
const {expect} = require('chai')
const {
  newUser, 
  existingUser,
  generateFioAddress, 
  generateFioDomain, 
  createKeypair, 
  callFioApi, 
  getFees,
  getCurrencyBalance,
  consumeRemainingBundles,
  getRemainingLockAmount,
  timeout, 
  fetchJson
} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const { number } = require('mathjs');
config = require('../config.js');

const faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
const userCount = 1;
let globalTable, voterWithProd, voterWithProxy, voterWithAutoproxy, bp1, proxy, autoproxy, otherUser;

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
  // TBD
})

describe('************************** vote-action-tests.js ************************** \n    A. Testing generic actions', () => {
  const xferTo = 2000000000000;  // 2000 FIO
  const xferFrom = 20000000000;  // 20 FIO
  const retireAmount = 1000000000000;  // 1000 FIO (min amount)
  const amount = 10000000000; // 10 FIO

  describe('Setup: create bp1, proxy, autoproxy users', () => {
    
    it(`Other users`, async () => {
      otherUser = await newUser(faucet);
    });

    it(`Set up bp1@dapixdev as producer and initialize bp1.total_votes`, async () => {
      try {
        bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
        //console.log('bp1: ', bp1)
        bp1.total_votes = Number(await getProdVoteWeight(bp1.account)) / 1000000000;
      } catch (err) {
        console.log("ERROR: ", err);
        expect(err).to.equal(null);
      }
    });

    it(`Set up voterWithProd as voter for bp1`, async () => {
      try {
        voterWithProd = await newUser(faucet);
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
        expect(result.status).to.equal('OK');
        const voterWithProdInfo = await getVoterInfo(voterWithProd);
        voterWithProd.last_vote_weight = Number(voterWithProdInfo.last_vote_weight) / 1000000000;
      } catch (err) {
        console.log("ERROR: ", err);
        expect(err).to.equal(null);
      }
    });

    it(`Confirm vote totals.`, async () => {
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

      expect(bp1.diff_total_votes).to.equal(voterWithProd.diff_last_vote_weight);

    });

    it(`Set up proxy and vote for bp1`, async () => {
      try {
        // proxy
        proxy = await newUser(faucet);
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
        proxy.last_vote_weight = Number(proxyInfo.last_vote_weight) / 1000000000;
        proxy.proxied_vote_weight = Number(proxyInfo.proxied_vote_weight) / 1000000000;
        expect(proxy.last_vote_weight).to.be.a('number');
      } catch (err) {
        console.log("ERROR: ", err);
        expect(err).to.equal(null);
      }
    });

    it(`Confirm vote totals`, async () => {
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
      proxy.currency_balance = await getCurrencyBalance(proxy.account);

      expect(bp1.diff_total_votes).to.equal(voterWithProd.diff_last_vote_weight + proxy.diff_last_vote_weight);
    });


    it(`Set up voterWithProxy`, async () => {
      try {
        // voterWithProxy
        voterWithProxy = await newUser(faucet);
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
        voterWithProxy.last_vote_weight = Number(voterWithProxyInfo.last_vote_weight) / 1000000000;
        expect(voterWithProxy.last_vote_weight).to.be.a('number');
      } catch (err) {
        console.log("ERROR: ", err);
        expect(err).to.equal(null);
      }
    });

    it(`Confirm vote totals`, async () => {
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
      proxy.currency_balance = await getCurrencyBalance(proxy.account);

      // voterWithProxy
      voterWithProxy.prev_last_vote_weight = voterWithProxy.last_vote_weight;
      const voterWithProxyInfo = await getVoterInfo(proxy);
      voterWithProxy.last_vote_weight = Number(voterWithProxyInfo.last_vote_weight) / 1000000000;
      voterWithProxy.diff_last_vote_weight= voterWithProxy.last_vote_weight - voterWithProxy.prev_last_vote_weight;
  

      expect(bp1.diff_total_votes).to.equal(voterWithProd.diff_last_vote_weight + proxy.diff_last_vote_weight);
    });


    it(`Set up autoproxy`, async () => {
      try {
        // autoproxy
        autoproxy = await newUser(faucet);
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
        autoproxy.last_vote_weight = Number(result3.rows[0].last_vote_weight) / 1000000000;
        expect(autoproxy.last_vote_weight).to.be.a('number');
        expect(result3.rows[0].is_proxy).to.equal(1);
      } catch (err) {
        console.log("ERROR: ", err);
        expect(err).to.equal(null);
      }
    });

    it(`Confirm vote totals`, async () => {
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
      proxy.currency_balance = await getCurrencyBalance(proxy.account);

      // voterWithProxy
      voterWithProxy.prev_last_vote_weight = voterWithProxy.last_vote_weight;
      const voterWithProxyInfo = await getVoterInfo(proxy);
      voterWithProxy.last_vote_weight = Number(voterWithProxyInfo.last_vote_weight) / 1000000000;
      voterWithProxy.diff_last_vote_weight= voterWithProxy.last_vote_weight - voterWithProxy.prev_last_vote_weight;
  
      // autoproxy
      autoproxy.prev_last_vote_weight = autoproxy.last_vote_weight;
      const autoproxyInfo = await getVoterInfo(autoproxy);
      autoproxy.last_vote_weight = Number(autoproxyInfo.last_vote_weight) / 1000000000;
      autoproxy.proxied_vote_weight = Number(autoproxyInfo.proxied_vote_weight) / 1000000000;
      autoproxy.diff_last_vote_weight = autoproxy.last_vote_weight - autoproxy.prev_last_vote_weight;
      autoproxy.diff_proxied_vote_weight = autoproxy.proxied_vote_weight - autoproxy.prev_proxied_vote_weight;
      autoproxy.currency_balance = await getCurrencyBalance(autoproxy.account);

      // voterWithAutoproxy
      voterWithAutoproxy.prev_last_vote_weight = voterWithAutoproxy.last_vote_weight;
      const voterWithAutoproxyyInfo = await getVoterInfo(voterWithAutoproxy);
      voterWithAutoproxy.last_vote_weight = Number(voterWithAutoproxyyInfo.last_vote_weight) / 1000000000;
      voterWithAutoproxy.diff_last_vote_weight = voterWithAutoproxy.last_vote_weight - voterWithAutoproxy.prev_last_vote_weight;

      // Producer
      expect(bp1.diff_total_votes).to.equal(voterWithProd.diff_last_vote_weight + proxy.diff_last_vote_weight + autoproxy.diff_last_vote_weight);
    });

    it(`Set up voterWithAutoproxy`, async () => {
      try {
        voterWithAutoproxy = await newUser(faucet);
        //Transfer FIO using a TPID assigned to autoproxy. This makes the user an autoproxied user.
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
        voterWithAutoproxy.last_vote_weight = Number(result.rows[0].last_vote_weight) / 1000000000;
        expect(voterWithAutoproxy.last_vote_weight).to.be.a('number');
        expect(result.rows[0].is_proxy).to.equal(0);
        expect(result.rows[0].is_auto_proxy).to.equal(1);
      } catch (err) {
        console.log("ERROR: ", err);
        expect(err).to.equal(null);
      }
    });

    it(`Confirm vote totals`, async () => {
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

      // Producer
      expect(bp1.diff_total_votes).to.equal(voterWithProd.diff_last_vote_weight + proxy.diff_last_vote_weight + autoproxy.diff_last_vote_weight);
    });
  });  // end Setup

  describe.skip('fio.token actions', () => {

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
  });  

  describe('fio.address actions', () => {

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
        expect(result.status).to.equal('OK');
        await validateVotes();
      } catch (err) {
        console.log(JSON.stringify(err, null, 4));
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




  }); 
});

