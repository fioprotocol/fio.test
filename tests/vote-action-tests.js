require('mocha')
/*
NOTE -- these tests perform a validation of all the actions on the fio chain from a voting perspective
the tests are meant to be used for QA level testing, and are not meant as regression tests.

THESE TESTS ARE FOR VOTING QA ONLY
NOT FOR REGRRESSION.

These tests need to be run on a clenly started server to succeed...

 */
const {expect} = require('chai')
const {
  newUser, 
  existingUser,
  generateFioAddress, 
  generateFioDomain, 
  callFioApi,
  callFioApiSigned,
  getProdVoteTotal,
  getAccountVoteWeight,
  consumeRemainingBundles,
  timeout, 
  randStr,
  fetchJson
} = require('../utils.js');
const {
  getOracleRecords,
  registerNewBp,
  registerNewOracle,
  setTestOracleFees,
  cleanUpOraclessTable
} = require("./Helpers/wrapping.js");
const {FIOSDK } = require('@fioprotocol/fiosdk');
const { TextEncoder, TextDecoder } = require('text-encoding');
const ser = require("@fioprotocol/fiojs/dist/chain-serialize");
config = require('../config.js');

const { Api } = require('@fioprotocol/fiojs');
const { JsonRpc } = require('@fioprotocol/fiojs/dist/tests/chain-jsonrpc');
const { JsSignatureProvider } = require('@fioprotocol/fiojs/dist/chain-jssig'); 
const fetch = require('node-fetch');

const faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);

let newProxy = null, 
    //be sure to SET this if the mewproxy ever votes in ANY tests within the test doing the voting
    newProxyVoted = false, voterWithProd, voterWithProxy, voterWithAutoproxy, bp1, bp2, bp3, proxy, autoproxy, total_voted_fio,
    extraUser,extraUser2;

const consumeBundles = true;

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
  
async function getGlobalTotalVotedFio() {
  const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'global',
      limit: 1000,
      reverse: false,
      show_payer: false
  }
  const globalTable = await callFioApi("get_table_rows", json);
  return globalTable.rows[0].total_voted_fio;
}

async function getCurrencyBalanceSufs(account) {
  let currency_balance, newstring;
  try {
      const json = {
      code: 'fio.token',
      symbol: 'FIO',
      account: account
      }
      const result = await callFioApi("get_currency_balance", json);
      if (result.length > 0) {
          newstring = result[0].replace(' FIO','');
          newstring = newstring.replace('.', '');
          currency_balance = Number(newstring);
      } else {
          currency_balance = 0;
      }
      return currency_balance;
  } catch (err) {
      console.log('Error: ', err)
  }
}

async function validateVotes() {
    // global
    const prev_total_voted_fio = total_voted_fio;
    total_voted_fio = await getGlobalTotalVotedFio();
    const diff_total_voted_fio = Math.abs(total_voted_fio - prev_total_voted_fio);



    // voterWithProd
    const voterWithProd_prev_last_vote_weight = voterWithProd.last_vote_weight;
    voterWithProd.last_vote_weight = await getAccountVoteWeight(voterWithProd.account);
    //console.log(" voter with prod last vote weight ",voterWithProd.last_vote_weight);
    //console.log(" voter with prod prev last vote weight ",voterWithProd_prev_last_vote_weight);

    voterWithProd.diff_last_vote_weight = Math.abs(voterWithProd.last_vote_weight - voterWithProd_prev_last_vote_weight);
    voterWithProd.prev_currency_balance = voterWithProd.currency_balance;
    let tb = await getCurrencyBalanceSufs(voterWithProd.account);
    voterWithProd.currency_balance = tb
    //console.log("voterWithProd balance ",tb);
    //console.log(" voterWithProd prev balance ",voterWithProd.prev_currency_balance);
    let diff = voterWithProd.currency_balance - voterWithProd.prev_currency_balance;
    //console.log("voterWithProd diff ",diff);

    voterWithProd.diff_currency_balance = Math.abs(voterWithProd.currency_balance - voterWithProd.prev_currency_balance);
    // console.log('voterWithProd.diff_currency_balance: ',voterWithProd.diff_currency_balance)
    // console.log('voterWithProd.currency_balance: ',voterWithProd.currency_balance)
    // console.log('voterWithProd.prev_currency_balance: ',voterWithProd.prev_currency_balance)

    // proxy
    const proxy_prev_last_vote_weight = proxy.last_vote_weight;
    const proxy_prev_proxied_vote_weight = proxy.proxied_vote_weight;
    const proxyInfo = await getVoterInfo(proxy);
    proxy.last_vote_weight = Number(proxyInfo.last_vote_weight);
    proxy.proxied_vote_weight = Number(proxyInfo.proxied_vote_weight);
    proxy.diff_last_vote_weight = Math.abs( proxy.last_vote_weight - proxy_prev_last_vote_weight);
    proxy.diff_proxied_vote_weight = Math.abs(proxy.proxied_vote_weight - proxy_prev_proxied_vote_weight);
    proxy.prev_currency_balance = proxy.currency_balance;
    proxy.currency_balance = await getCurrencyBalanceSufs(proxy.account);
    proxy.diff_currency_balance = Math.abs(proxy.currency_balance - proxy.prev_currency_balance);

    // voterWithProxy
    const voterWithProxy_prev_last_vote_weight = voterWithProxy.last_vote_weight;
    voterWithProxy.last_vote_weight = await getAccountVoteWeight(voterWithProxy.account);
    voterWithProxy.diff_last_vote_weight = Math.abs(voterWithProxy.last_vote_weight - voterWithProxy_prev_last_vote_weight);
    const voterWithProxy_prev_currency_balance = voterWithProxy.currency_balance;
    voterWithProxy.currency_balance = await getCurrencyBalanceSufs(voterWithProxy.account);
    voterWithProxy.diff_currency_balance = Math.abs(voterWithProxy.currency_balance - voterWithProxy_prev_currency_balance);

    // autoproxy
    const autoproxy_prev_last_vote_weight = autoproxy.last_vote_weight;
    const autoproxy_prev_proxied_vote_weight = autoproxy.proxied_vote_weight;
    const autoproxyInfo = await getVoterInfo(autoproxy);
    autoproxy.last_vote_weight = Number(autoproxyInfo.last_vote_weight);
    autoproxy.proxied_vote_weight = Number(autoproxyInfo.proxied_vote_weight);
    autoproxy.diff_last_vote_weight = Math.abs(autoproxy.last_vote_weight - autoproxy_prev_last_vote_weight);
    autoproxy.diff_proxied_vote_weight = Math.abs(autoproxy.proxied_vote_weight - autoproxy_prev_proxied_vote_weight);
    const autoproxy_prev_currency_balance = autoproxy.currency_balance;
    autoproxy.currency_balance = await getCurrencyBalanceSufs(autoproxy.account);
    autoproxy.diff_currency_balance = Math.abs(autoproxy.currency_balance - autoproxy_prev_currency_balance);

    // voterWithAutoproxy
    const voterWithAutoproxy_prev_last_vote_weight = voterWithAutoproxy.last_vote_weight;
    voterWithAutoproxy.last_vote_weight = await getAccountVoteWeight(voterWithAutoproxy.account);
    voterWithAutoproxy.diff_last_vote_weight = Math.abs(voterWithAutoproxy.last_vote_weight - voterWithAutoproxy_prev_last_vote_weight);
    const voterWithAutoproxy_prev_currency_balance = voterWithAutoproxy.currency_balance;
    voterWithAutoproxy.currency_balance = await getCurrencyBalanceSufs(voterWithAutoproxy.account);
    voterWithAutoproxy.diff_currency_balance = Math.abs(voterWithAutoproxy.currency_balance - voterWithAutoproxy_prev_currency_balance);


    // newProxy
    if(newProxy != null) {
        const newProxy_prev_last_vote_weight = newProxy.last_vote_weight;
        newProxy.last_vote_weight = await getAccountVoteWeight(newProxy.account);
        newProxy.diff_last_vote_weight = Math.abs(newProxy.last_vote_weight - newProxy_prev_last_vote_weight);
        const newProxy_prev_currency_balance = newProxy.currency_balance;
        newProxy.currency_balance = await getCurrencyBalanceSufs(newProxy.account);
        if(newProxyVoted) {
            newProxy.diff_currency_balance = Math.abs(newProxy.currency_balance - newProxy_prev_currency_balance);
        }else{
            newProxy.diff_currency_balance = 0;
        }

        }

    // producer
    const bp1_prev_total_votes = bp1.total_votes;
    bp1.total_votes = await getProdVoteTotal(bp1.address);
    //console.log("bp1 prev total votes ",bp1_prev_total_votes);
    //console.log("bp1 total votes ", bp1.total_votes);
    bp1.diff_total_votes = Math.abs(bp1.total_votes - bp1_prev_total_votes);
    //console.log("bp1 diff total votes ",bp1.diff_total_votes)

     //console.log('bp1.diff_total_votes:', bp1.diff_total_votes)
     //console.log('voterWithProd.diff_last_vote_weight:', voterWithProd.diff_last_vote_weight)
    // console.log('voterWithAutoProxy.diff_last_vote_weight:', voterWithAutoproxy.diff_last_vote_weight)
     //console.log('proxy.diff_last_vote_weight :', proxy.diff_last_vote_weight )
    // console.log('proxy.diff_proxied_vote_weight:', proxy.diff_proxied_vote_weight)
    // console.log('autoproxy.diff_last_vote_weight:',autoproxy.diff_last_vote_weight )
    // console.log('autoproxy.diff_proxied_vote_weight:', autoproxy.diff_proxied_vote_weight)

    /*if(newProxy != null){
        console.log('newProxy.diff_last_vote_weight :', newProxy.diff_last_vote_weight )
    }*/

    //need to add newProxy
    //console.log("bp1.totalvotes");

    let diffbpt=  Math.abs(bp1.diff_total_votes - (voterWithProd.diff_last_vote_weight + proxy.diff_last_vote_weight + autoproxy.diff_last_vote_weight));

    //small differences creep into these calcs, the source is not fully understood but suspected to be resolution
    // of javascript vars vs blockchain. we accept differences in these calcs up to 99 SUFS WRT voting power integrity.
    //here we use 50 as an arbitrary small value.
    expect(diffbpt).lessThan(50);


    //console.log("voterWithProd.diff_last_vote_weight");
    // voterWithProd
    expect(voterWithProd.diff_last_vote_weight).to.equal(voterWithProd.diff_currency_balance);

    //console.log("proxy.diff_last_vote_weight");
    // proxy
    expect(proxy.diff_last_vote_weight).to.equal(proxy.diff_currency_balance + voterWithProxy.diff_last_vote_weight);
    //console.log("proxy.diff_proxied_vote_weight");
    expect(proxy.diff_proxied_vote_weight).to.equal(voterWithProxy.diff_last_vote_weight);

    //console.log("voterWithProxy.diff_last_vote_weight");
    // voterWithProxy
    expect(voterWithProxy.diff_last_vote_weight).to.equal(voterWithProxy.diff_currency_balance);

    //console.log("autoproxy.diff_last_vote_weight");
    // autoproxy
    expect(autoproxy.diff_last_vote_weight).to.equal(autoproxy.diff_currency_balance + voterWithAutoproxy.diff_last_vote_weight);
    //console.log("autoproxy.diff_proxied_vote_weight");
    expect(autoproxy.diff_proxied_vote_weight).to.equal(voterWithAutoproxy.diff_last_vote_weight);

    //console.log("voterWithAutoproxy.diff_last_vote_weight");
    // voterWithAutoproxy
    expect(voterWithAutoproxy.diff_last_vote_weight).to.equal(voterWithAutoproxy.diff_currency_balance);

    //console.log("global");

    //console.log( "total without newproxy ", voterWithProd.diff_currency_balance + proxy.diff_currency_balance + voterWithProxy.diff_currency_balance + autoproxy.diff_currency_balance + voterWithAutoproxy.diff_currency_balance);

   /* if(newProxy != null) {
        console.log(" newproxy diff ", newProxy.diff_currency_balance);
    }*/


    let difft = 0;
    if (newProxy == null) {
       difft =  Math.abs(diff_total_voted_fio - (voterWithProd.diff_currency_balance + proxy.diff_currency_balance + voterWithProxy.diff_currency_balance + autoproxy.diff_currency_balance + voterWithAutoproxy.diff_currency_balance));
    } else {
        console.log("newproxy stuff ");
        difft = Math.abs (diff_total_voted_fio - (newProxy.diff_currency_balance + voterWithProd.diff_currency_balance + proxy.diff_currency_balance + voterWithProxy.diff_currency_balance + autoproxy.diff_currency_balance + voterWithAutoproxy.diff_currency_balance))
    }
    //small differences creep into these calcs, the source is not fully understood but suspected to be resolution
    // of javascript vars vs blockchain. we accept differences in these calcs up to 99 SUFS WRT voting power integrity.
    //here we use 50 as an arbitrary small value.
    expect(difft).lessThan(50);

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
  const xferTo = 200000000000;  // 200 FIO
  const xferFrom = 20000000000;  // 20 FIO
  const retireAmount = 1000000000000;  // 1000 FIO (min amount)
  const initialFio = 8000000000000; // 8K FIO

  describe('Setup: create bp1, proxy, autoproxy users', () => {
 
    it(`Create users`, async () => {
      extraUser = await newUser(faucet);
      extraUser2 = await newUser(faucet);
      voterWithProd = await newUser(faucet);
      proxy = await newUser(faucet);
      voterWithProxy = await newUser(faucet);
      autoproxy = await newUser(faucet);
      voterWithAutoproxy = await newUser(faucet);
      otherUser = await newUser(faucet);

      // Send additional FIO
      await faucet.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
            payee_public_key: bp1.publicKey,
            amount: initialFio,
            max_fee: config.maxFee,
            tpid: '',
            actor: faucet.account
        }
      });

      await faucet.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
            payee_public_key: voterWithProd.publicKey,
            amount: initialFio,
            max_fee: config.maxFee,
            tpid: '',
            actor: faucet.account
        }
      });

      await faucet.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
            payee_public_key: proxy.publicKey,
            amount: initialFio,
            max_fee: config.maxFee,
            tpid: '',
            actor: faucet.account
        }
      });

      await faucet.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
            payee_public_key: voterWithProxy.publicKey,
            amount: initialFio,
            max_fee: config.maxFee,
            tpid: '',
            actor: faucet.account
        }
      });

      await faucet.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
            payee_public_key: autoproxy.publicKey,
            amount: initialFio,
            max_fee: config.maxFee,
            tpid: '',
            actor: faucet.account
        }
      });

      await faucet.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
            payee_public_key: voterWithAutoproxy.publicKey,
            amount: initialFio,
            max_fee: config.maxFee,
            tpid: '',
            actor: faucet.account
        }
      });

      // Consume all bundles so fees are used for every transaction
      if (consumeBundles) await consumeRemainingBundles(voterWithProd, extraUser);
      if (consumeBundles) await consumeRemainingBundles(proxy, extraUser);
      if (consumeBundles) await consumeRemainingBundles(voterWithProxy, extraUser);
      if (consumeBundles) await consumeRemainingBundles(autoproxy, extraUser);
      if (consumeBundles) await consumeRemainingBundles(voterWithAutoproxy, extraUser);
      if (consumeBundles) await consumeRemainingBundles(bp1, extraUser);
    })
  
    it(`Wait a few seconds.`, async () => { await timeout(3000) })

    it(`Initialize bp1.total_votes`, async () => {
      try {
        bp1.total_votes = await getProdVoteTotal(bp1.address);
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
      } catch (err) {
        console.log(JSON.stringify(err, null, 4));
      }
    })
  
    it(`Confirm vote totals.`, async () => {
      // producer
      const bp1_prev_total_votes = bp1.total_votes;
      bp1.total_votes = await getProdVoteTotal(bp1.address);
      bp1.diff_total_votes = bp1.total_votes - bp1_prev_total_votes;

      // voterWithProd
      const voterWithProd_prev_last_vote_weight = voterWithProd.last_vote_weight;
      voterWithProd.last_vote_weight = await getAccountVoteWeight(voterWithProd.account);
      voterWithProd.diff_last_vote_weight = voterWithProd.last_vote_weight - voterWithProd_prev_last_vote_weight;
      const voterWithProd_prev_currency_balance = voterWithProd.currency_balance;
      //voterWithProd.currency_balance = await getCurrencyBalance(voterWithProd.account) * 1000000000;
      voterWithProd.currency_balance = await getCurrencyBalanceSufs(voterWithProd.account);
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
      bp1.total_votes = await getProdVoteTotal(bp1.address);
      bp1.diff_total_votes = bp1.total_votes - bp1_prev_total_votes;

      // proxy
      const proxy_prev_last_vote_weight = proxy.last_vote_weight;
      const proxy_prev_proxied_vote_weight = proxy.proxied_vote_weight;
      const proxyInfo = await getVoterInfo(proxy);
      proxy.last_vote_weight = Number(proxyInfo.last_vote_weight);
      proxy.proxied_vote_weight = Number(proxyInfo.proxied_vote_weight);
      proxy.diff_last_vote_weight = proxy.last_vote_weight - proxy_prev_last_vote_weight;
      proxy.diff_proxied_vote_weight = proxy.proxied_vote_weight - proxy_prev_proxied_vote_weight;
      const proxy_prev_currency_balance = proxy.currency_balance;
      proxy.currency_balance = await getCurrencyBalanceSufs(proxy.account);
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
      bp1.total_votes = await getProdVoteTotal(bp1.address);
      bp1.diff_total_votes = bp1.total_votes - bp1_prev_total_votes;

      // proxy
      const proxy_prev_last_vote_weight = proxy.last_vote_weight;
      const proxy_prev_proxied_vote_weight = proxy.proxied_vote_weight;
      const proxyInfo = await getVoterInfo(proxy);
      proxy.last_vote_weight = Number(proxyInfo.last_vote_weight);
      proxy.proxied_vote_weight = Number(proxyInfo.proxied_vote_weight);
      proxy.diff_last_vote_weight = proxy.last_vote_weight - proxy_prev_last_vote_weight;
      proxy.diff_proxied_vote_weight = proxy.proxied_vote_weight - proxy_prev_proxied_vote_weight;
      const proxy_prev_currency_balance = proxy.currency_balance;
      proxy.currency_balance = await getCurrencyBalanceSufs(proxy.account);
      proxy.diff_currency_balance = proxy.currency_balance - proxy_prev_currency_balance;

      //proxy.currency_balance = await getCurrencyBalanceSufs(proxy.account);

      // voterWithProxy
      const voterWithProxy_prev_last_vote_weight = voterWithProxy.last_vote_weight;
      voterWithProxy.last_vote_weight = await getAccountVoteWeight(voterWithProxy.account);
      voterWithProxy.diff_last_vote_weight = voterWithProxy.last_vote_weight - voterWithProxy_prev_last_vote_weight;
      const voterWithProxy_prev_currency_balance = voterWithProxy.currency_balance;
      voterWithProxy.currency_balance = await getCurrencyBalanceSufs(voterWithProxy.account);
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
      bp1.total_votes = await getProdVoteTotal(bp1.address);
      bp1.diff_total_votes = bp1.total_votes - bp1_prev_total_votes;
    
      // autoproxy
      const autoproxy_prev_last_vote_weight = autoproxy.last_vote_weight;
      const autoproxy_prev_proxied_vote_weight = autoproxy.prev_proxied_vote_weight;
      const autoproxyInfo = await getVoterInfo(autoproxy);
      autoproxy.last_vote_weight = Number(autoproxyInfo.last_vote_weight);
      autoproxy.proxied_vote_weight = Number(autoproxyInfo.proxied_vote_weight);
      autoproxy.diff_last_vote_weight = autoproxy.last_vote_weight - autoproxy_prev_last_vote_weight;
      autoproxy.diff_proxied_vote_weight = autoproxy.proxied_vote_weight - autoproxy_prev_proxied_vote_weight;
      const autoproxy_prev_currency_balance = autoproxy.currency_balance;
      autoproxy.currency_balance = await getCurrencyBalanceSufs(autoproxy.account);
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
              payee_public_key: extraUser2.publicKey,
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

    it(`(vote totals deduct amount sent if autoproxying using xferfiopubky) Confirm vote totals`, async () => {
      // producer
      const bp1_prev_total_votes = bp1.total_votes;
      bp1.total_votes = await getProdVoteTotal(bp1.address);
      bp1.diff_total_votes = bp1.total_votes - bp1_prev_total_votes;

      // console.log('bp1.total_votes: ', bp1.total_votes)
      // console.log('bp1_prev_total_votes: ', bp1_prev_total_votes)
      // console.log('bp1.diff_total_votes: ', bp1.diff_total_votes)

      // autoproxy
      const autoproxy_prev_last_vote_weight = autoproxy.last_vote_weight;
      const autoproxy_prev_proxied_vote_weight = autoproxy.prev_proxied_vote_weight;
      const autoproxyInfo = await getVoterInfo(autoproxy);
      autoproxy.last_vote_weight = Number(autoproxyInfo.last_vote_weight);
      autoproxy.proxied_vote_weight = Number(autoproxyInfo.proxied_vote_weight);
      autoproxy.diff_last_vote_weight = autoproxy.last_vote_weight - autoproxy_prev_last_vote_weight;
      autoproxy.diff_proxied_vote_weight = autoproxy.proxied_vote_weight - autoproxy_prev_proxied_vote_weight;
      const autoproxy_prev_currency_balance = autoproxy.currency_balance;
      autoproxy.currency_balance = await getCurrencyBalanceSufs(autoproxy.account);
      autoproxy.diff_currency_balance = autoproxy.currency_balance - autoproxy_prev_currency_balance;

      // voterWithAutoproxy
      const voterWithAutoproxy_prev_last_vote_weight = voterWithAutoproxy.last_vote_weight;
      voterWithAutoproxy.last_vote_weight = await getAccountVoteWeight(voterWithAutoproxy.account);
      voterWithAutoproxy.diff_last_vote_weight = voterWithAutoproxy.last_vote_weight - voterWithAutoproxy_prev_last_vote_weight;
      const voterWithAutoproxy_prev_currency_balance = voterWithAutoproxy.currency_balance;
      voterWithAutoproxy.currency_balance = await getCurrencyBalanceSufs(voterWithAutoproxy.account);
      voterWithAutoproxy.diff_currency_balance = voterWithAutoproxy.currency_balance - voterWithAutoproxy_prev_currency_balance;

      // console.log('voterWithAutoproxy.last_vote_weight: ', voterWithAutoproxy.last_vote_weight)
      // console.log('voterWithAutoproxy_prev_last_vote_weight: ', voterWithAutoproxy_prev_last_vote_weight)
      // console.log('voterWithAutoproxy.diff_last_vote_weight: ', voterWithAutoproxy.diff_last_vote_weight)

      // Producer
      expect(bp1.diff_total_votes).to.equal(voterWithAutoproxy.diff_last_vote_weight);
    });

    it(`Init total_voted_fio`, async () => {
      total_voted_fio = await getGlobalTotalVotedFio();
    })
    
  });  // end Setup

  
  describe('fio.token actions', () => {
    const dur1 = 120;
    const dur2 = 240;
    const amount1 = 2000000000; // 2 FIO
    const amount2 = 3000000000; // 3 FIO
    const totalAmount = amount1 + amount2; 

    describe('Producer', () => {
      it(`token.trnsfiopubky (bp1) - Transfer from extraUser2 to bp1`, async () => {
        try {
            const result = await extraUser2.sdk.genericAction('pushTransaction', {
                action: 'trnsfiopubky',
                account: 'fio.token',
                data: {
                    payee_public_key: bp1.publicKey,
                    amount: xferTo,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: extraUser2.account
                }
            });
            expect(result.status).to.equal('OK')
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
                    payee_public_key: extraUser2.publicKey,
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

      it.skip(`(Skip for bp1 since it has staked tokens often) token.retire (bp1)`, async function () {
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

      it.skip(`(Skipping, special case. can_vote: 0 can only be sent to non-existant accounts.) token.trnsloctoks (bp1)`, async function () {
      });

      it(`token.trnsloctoks to self, can_vote: 1 (bp1)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'trnsloctoks',
            account: 'fio.token',
            data: {
              payee_public_key: bp1.publicKey,
              can_vote: 1,
              periods: [
                {
                  duration: dur1,
                  amount: amount1,
                },
                {
                  duration: dur2,
                  amount: amount2,
                }
              ],
              amount: totalAmount,
              max_fee: config.maxFee,
              tpid: ''
            }
  
          })
          //console.log('Result: ', result)
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });
    })

    describe('voterWithProd', () => {

      it(`token.trnsfiopubky (voterWithProd) - Transfer from extraUser2 to voterWithProd`, async () => {
        try {
            const result = await extraUser2.sdk.genericAction('pushTransaction', {
                action: 'trnsfiopubky',
                account: 'fio.token',
                data: {
                    payee_public_key: voterWithProd.publicKey,
                    amount: xferTo,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: extraUser2.account
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
                    payee_public_key: extraUser2.publicKey,
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

      it.skip(`(Skipping, special case. can_vote: 0 can only be sent to non-existant accounts.) token.trnsloctoks (voterWithProd)`, async function () {
      });
      
      it(`token.trnsloctoks to self, can_vote: 1 (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'trnsloctoks',
            account: 'fio.token',
            data: {
              payee_public_key: voterWithProd.publicKey,
              can_vote: 1,
              periods: [
                {
                  duration: dur1,
                  amount: amount1,
                },
                {
                  duration: dur2,
                  amount: amount2,
                }
              ],
              amount: totalAmount,
              max_fee: config.maxFee,
              tpid: ''
            }
  
          })
          //console.log('Result: ', result)
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

    })

    describe('proxy', () => {
      it(`token.trnsfiopubky (proxy) - Transfer from extraUser2 to proxy`, async () => {
        try {
            const result = await extraUser2.sdk.genericAction('pushTransaction', {
                action: 'trnsfiopubky',
                account: 'fio.token',
                data: {
                    payee_public_key: proxy.publicKey,
                    amount: xferTo,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: extraUser2.account
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
                    payee_public_key: extraUser2.publicKey,
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

      it.skip(`(Skipping, special case. can_vote: 0 can only be sent to non-existant accounts.) token.trnsloctoks (proxy)`, async function () {
      });
      
      it(`token.trnsloctoks to self, can_vote: 1 (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'trnsloctoks',
            account: 'fio.token',
            data: {
              payee_public_key: proxy.publicKey,
              can_vote: 1,
              periods: [
                {
                  duration: dur1,
                  amount: amount1,
                },
                {
                  duration: dur2,
                  amount: amount2,
                }
              ],
              amount: totalAmount,
              max_fee: config.maxFee,
              tpid: ''
            }
  
          })
          //console.log('Result: ', result)
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });
    })

    describe('voterWithProxy', () => {
      it(`token.trnsfiopubky (voterWithProxy) - Transfer from extraUser2 to voterWithProxy`, async () => {
        try {
            const result = await extraUser2.sdk.genericAction('pushTransaction', {
                action: 'trnsfiopubky',
                account: 'fio.token',
                data: {
                    payee_public_key: voterWithProxy.publicKey,
                    amount: xferTo,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: extraUser2.account
                }
            });
            expect(result.status).to.equal('OK');
            await validateVotes();
        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
      }); 

      it(`token.trnsfiopubky (voterWithProxy) - Transfer from voterWithProxy to extraUser`, async () => {
        try {
            const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
                action: 'trnsfiopubky',
                account: 'fio.token',
                data: {
                    payee_public_key: extraUser2.publicKey,
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

      it.skip(`(Skipping, special case. can_vote: 0 can only be sent to non-existant accounts.) token.trnsloctoks (voterWithProxy)`, async function () {
      });
      
      it(`token.trnsloctoks to self, can_vote: 1 (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'trnsloctoks',
            account: 'fio.token',
            data: {
              payee_public_key: voterWithProxy.publicKey,
              can_vote: 1,
              periods: [
                {
                  duration: dur1,
                  amount: amount1,
                },
                {
                  duration: dur2,
                  amount: amount2,
                }
              ],
              amount: totalAmount,
              max_fee: config.maxFee,
              tpid: ''
            }
  
          })
          //console.log('Result: ', result)
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });
    })

    describe('autoproxy', () => {
      it(`token.trnsfiopubky (autoproxy) - Transfer from extraUser2 to autoproxy`, async () => {
        try {
            const result = await extraUser2.sdk.genericAction('pushTransaction', {
                action: 'trnsfiopubky',
                account: 'fio.token',
                data: {
                    payee_public_key: autoproxy.publicKey,
                    amount: xferTo,
                    max_fee: config.maxFee,
                    tpid: '',
                    actor: extraUser2.account
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
                    payee_public_key: extraUser2.publicKey,
                    amount: xferTo,
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


      it.skip(`(Skipping, special case. can_vote: 0 can only be sent to non-existant accounts.) token.trnsloctoks (autoproxy)`, async function () {
      });
      
      it(`token.trnsloctoks to self, can_vote: 1 (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'trnsloctoks',
            account: 'fio.token',
            data: {
              payee_public_key: autoproxy.publicKey,
              can_vote: 1,
              periods: [
                {
                  duration: dur1,
                  amount: amount1,
                },
                {
                  duration: dur2,
                  amount: amount2,
                }
              ],
              amount: totalAmount,
              max_fee: config.maxFee,
              tpid: ''
            }
  
          })
          //console.log('Result: ', result)
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });
    })

    describe('voterWithAutoproxy', () => {

      it(`token.trnsfiopubky (voterWithAutoproxy) - Transfer from extraUser2 to voterWithAutoproxy`, async () => {
        try {
            const result = await extraUser2.sdk.genericAction('pushTransaction', {
                action: 'trnsfiopubky',
                account: 'fio.token',
                data: {
                    payee_public_key: voterWithAutoproxy.publicKey,
                    amount: xferFrom,
                    max_fee: config.maxFee,
                    tpid: ''
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
                    payee_public_key: extraUser2.publicKey,
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

      it.skip(`(Skipping, special case. can_vote: 0 can only be sent to non-existant accounts.) token.trnsloctoks (voterWithAutoproxy)`, async function () {
      });
      
      it(`token.trnsloctoks to self, can_vote: 1 (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'trnsloctoks',
            account: 'fio.token',
            data: {
              payee_public_key: voterWithAutoproxy.publicKey,
              can_vote: 1,
              periods: [
                {
                  duration: dur1,
                  amount: amount1,
                },
                {
                  duration: dur2,
                  amount: amount2,
                }
              ],
              amount: totalAmount,
              max_fee: config.maxFee,
              tpid: ''
            }
  
          })
          //console.log('Result: ', result)
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error: ', err)
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

    })
  });  // fio.token actions


  describe('fio.address actions', () => {

    describe('Producer', () => {

      it(`address.regaddress (Producer) x 3`, async function () {
        try {
          bp1.address1 = generateFioAddress(bp1.domain,8);
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'regaddress',
            account: 'fio.address',
            data: {
                fio_address: bp1.address1,
                owner_fio_public_key: bp1.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: bp1.account
            }
          });
          expect(result.status).to.equal('OK')
          bp1.address2 = generateFioAddress(bp1.domain,8);
          const result2 = await bp1.sdk.genericAction('pushTransaction', {
            action: 'regaddress',
            account: 'fio.address',
            data: {
                fio_address: bp1.address2,
                owner_fio_public_key: bp1.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: bp1.account
            }
          });
          expect(result2.status).to.equal('OK')
          bp1.address3 = generateFioAddress(bp1.domain,8);
          const result3 = await bp1.sdk.genericAction('pushTransaction', {
            action: 'regaddress',
            account: 'fio.address',
            data: {
                fio_address: bp1.address3,
                owner_fio_public_key: bp1.publicKey,
                max_fee: config.maxFee,
                tpid: '',
                actor: bp1.account
            }
          });
          expect(result3.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`address.renewaddress (Producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'renewaddress',
            account: 'fio.address',
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

      it(`address.xferaddress (Producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'xferaddress',
            account: 'fio.address',
            data: {
              fio_address: bp1.address2,
              new_owner_fio_public_key: otherUser.publicKey,
              max_fee: config.maxFee,
              actor: bp1.account,
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

      it.skip(`address.burnaddress (Producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('push_transaction', {
            action: 'burnaddress',
            account: 'fio.address',
            data: {
              fio_address: bp1.address3,
              max_fee: config.maxFee,
              tpid: '',
              actor: bp1.account
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

      it(`address.addbundles (Producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'addbundles',
            account: 'fio.address',
            data: {
              fio_address: bp1.address,
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

      it(`address.addaddress (Producer)`, async function () {
        try {
          bp1.mappedAddress1 = {chain_code: 'BCH', token_code: 'BCH', public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'};
          bp1.mappedAddress2 = {chain_code: 'BCH', token_code: 'BCH', public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'};
          bp1.mappedAddress3 = {chain_code: 'BCH', token_code: 'BCH', public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9'};
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'addaddress',
            account: 'fio.address',
            data: {
              fio_address: bp1.address,
              public_addresses:[bp1.mappedAddress1, bp1.mappedAddress2, bp1.mappedAddress3],
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

      it(`address.remaddress (Producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'remaddress',
            account: 'fio.address',
            data: {
              fio_address: bp1.address,
              public_addresses: [bp1.mappedAddress1],
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

      it.skip (`(Do NOT run this for bp1 producer) address.remalladdr (Producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'remalladdr',
            account: 'fio.address',
            data: {
              fio_address: bp1.address,
              max_fee: config.maxFee,
              tpid: "",
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

      it(`address.regdomain (Producer)`, async function () {
        try {
          bp1.domain2 = generateFioDomain(8);
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'regdomain',
            account: 'fio.address',
            data: {
                fio_domain: bp1.domain2,
                owner_fio_public_key: bp1.publicKey,
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

      it(`address.renewdomain (Producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'renewdomain',
            account: 'fio.address',
            data: {
              fio_domain: bp1.domain,
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

      it(`address.setdomainpub (Producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'setdomainpub',
            account: 'fio.address',
            data: {
              fio_domain: bp1.domain2,
              is_public: 1,
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

      it(`address.xferdomain (Producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'xferdomain',
            account: 'fio.address',
            data: {
              fio_domain: bp1.domain2,
              new_owner_fio_public_key: otherUser.publicKey,
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

      it.skip(`address.addnft (Producer)`, async function () {
        try {
          bp1.nft1 = { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF4", "token_id": "1", "url": "", "hash": "", "metadata": "" };
          bp1.nft2 = { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF4", "token_id": "2", "url": "", "hash": "", "metadata": "" };
          bp1.nft3 = { "chain_code": "ETH", "contract_address": "0x123456789ABCDEF4", "token_id": "3", "url": "", "hash": "", "metadata": "" };
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'addnft',
            account: 'fio.address',
            data: {
                fio_address: bp1.address,
                //nfts: [ bp1.nft1, bp1.nft2, bp1.nft3],
                nfts: [bp1.nft1, bp1.nft2, bp1.nft3],
                max_fee: config.maxFee,
                actor: bp1.account,
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

      it.skip(`address.remnft (Producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'remnft',
            account: 'fio.address',
            data: {
              fio_address: bp1.address,
              nfts: [bp1.nft1],
              max_fee: config.maxFee,
              actor: bp1.account,
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

      it.skip(`address.remallnfts (Producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'remallnfts',
            account: 'fio.address',
            data: {
              fio_address: bp1.address,
              max_fee: config.maxFee,
              actor: bp1.account,
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
    }); // Producer

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


  describe('fio.fee actions (Producer Only!)', () => {

    describe('producer', () => {

      it.skip(`(needed?) fee.createfee (producer)`, async function () {
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

      it.skip(`(needed?) fee.mandatoryfee (producer)`, async function () {
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

      it.skip(`(needed?) fee.bytemandfee (producer)`, async function () {
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

      it.skip(`(needed?) reqobt.migrtrx (producer)`, async function () {
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

      it(`reqobt.newfundsreq (voterWithProd)`, async function () {
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

      it(`reqobt.recordobt (voterWithProd)`, async function () {
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

      it(`reqobt.rejectfndreq (voterWithProd)`, async function () {
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

      it(`reqobt.cancelfndreq (voterWithProd)`, async function () {
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

      it(`reqobt.newfundsreq (proxy)`, async function () {
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

      it(`reqobt.recordobt (proxy)`, async function () {
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

      it(`reqobt.rejectfndreq (proxy)`, async function () {
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

      it(`reqobt.cancelfndreq (proxy)`, async function () {
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

      it(`reqobt.newfundsreq (voterWithProxy)`, async function () {
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

      it(`reqobt.recordobt (voterWithProxy)`, async function () {
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

      it(`reqobt.rejectfndreq (voterWithProxy)`, async function () {
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

      it(`reqobt.cancelfndreq (voterWithProxy)`, async function () {
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

      it(`reqobt.newfundsreq (autoproxy)`, async function () {
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

      it(`reqobt.recordobt (autoproxy)`, async function () {
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

      it(`reqobt.rejectfndreq (autoproxy)`, async function () {
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

      it(`reqobt.cancelfndreq (autoproxy)`, async function () {
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

      it(`reqobt.newfundsreq (voterWithAutoproxy)`, async function () {
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

      it(`reqobt.recordobt (voterWithAutoproxy)`, async function () {
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

      it(`reqobt.rejectfndreq (voterWithAutoproxy)`, async function () {
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

      it(`reqobt.cancelfndreq (voterWithAutoproxy)`, async function () {
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
    const lockAmount = 10000000000; // 10 FIO
    const AddActionAction = randStr(10);
    const addActionContract = "fio.token";
    const parent = 'active';
    const newPerm = randStr(10);


    it(`register a new proxy`, async function () {
      try {
        newProxy = await newUser(faucet);
        newProxy.last_vote_weight = 0;
        newProxy.currency_balance = 0;

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

      it.skip(`(This is not needed. Testing action only.) eosio.addlocked  (producer)`, async function () {
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

      it.skip(`(Skip: tested in proxy vote tests) eosio.regproxy (producer)`, async function () {
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

      it.skip(`(Skip: tested in proxy vote tests) eosio.unregproxy (producer)`, async function () {
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

      it.skip(`(Skip: should be tested in separate test) eosio.voteproducer (producer)`, async function () {
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

      it.skip(`(Skip: should be tested in separate test) eosio.voteproxy (producer)`, async function () {
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

    describe('voterWithProd', () => {
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

      it.skip(`(needed?) eosio.addaction (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
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

      it.skip(`(needed?) eosio.remaction (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'remaction',
            account: 'eosio',
            data: {
              action: AddActionAction,
              actor: voterWithProd.account
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

      it.skip(`(needed?) eosio.burnaction (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
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

      it.skip(`(needed?) eosio.addgenlocked (voterWithProd)`, async function () {
      });

      it.skip(`(This is not needed. Testing action only.) eosio.addlocked  (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.canceldelay (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.clrgenlocked (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.crautoproxy (voterWithProd)`, async function () {
      });

      it(`eosio.updateauth (voterWithProd)`, async function () {
        try{
          const result = await callFioApiSigned('push_transaction', {
            action: 'updateauth',
            account: 'eosio',
            actor: voterWithProd.account,
            privKey: voterWithProd.privateKey,
            data: {
              permission: newPerm,
              parent: parent,
              auth: newAuth,
              max_fee: config.maxFee,
              account: voterWithProd.account
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

      it(`eosio.linkauth (voterWithProd)`, async function () {
        try {
          const result = await callFioApiSigned('push_transaction', {
            action: 'linkauth',
            account: 'eosio',
            actor: voterWithProd.account,
            privKey: voterWithProd.privateKey,
            data: {
              account: voterWithProd.account,                 // the owner of the permission to be linked, this account will sign the transaction
              code: 'fio.address',                    // the contract owner of the action to be linked
              type: 'regaddress',                     // the action to be linked
              requirement: newPerm,                   // the name of the custom permission (created by updateauth)
              max_fee: config.maxFee,
              account: voterWithProd.account
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

      it(`eosio.unlinkauth (voterWithProd)`, async function () {
        try {
          const result = await callFioApiSigned('push_transaction', {
            action: 'unlinkauth',
            account: 'eosio',
            actor: voterWithProd.account,
            privKey: voterWithProd.privateKey,
            data: {
              account: voterWithProd.account,                 // the owner of the permission to be linked, this account will sign the transaction
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

      it(`eosio.deleteauth (voterWithProd)`, async function () {
        try {
          const result = await callFioApiSigned('push_transaction', {
            action: 'deleteauth',
            account: 'eosio',
            actor: voterWithProd.account,
            privKey: voterWithProd.privateKey,
            data: {
              permission: newPerm,
              max_fee: config.maxFee,
              account: voterWithProd.account
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

      it.skip(`(needed?) eosio.incram (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.inhibitunlck (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.initParams (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.modgenlocked (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.newaccount (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.onblock (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.onerror (voterWithProd)`, async function () {
      });

      it.skip(`(Skip: should be tested in separate test) eosio.regproducer (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'regproducer',
            account: 'eosio',
            data: {
              fio_address: voterWithProd.address,
              fio_pub_key: voterWithProd.publicKey,
              url: "https://mywebsite.io/",
              location: 80,
              actor: voterWithProd.account,
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

      it.skip(`(Skip: should be tested in separate test) eosio.unregprod (voterWithProd)`, async function () {
        try {
        const result = await voterWithProd.sdk.genericAction('pushTransaction', {
          action: 'unregprod',
          account: 'eosio',
          data: {
            fio_address: voterWithProd.address,
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

      it.skip(`(Skip: tested in proxy vote tests) eosio.regproxy (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'regproxy',
            account: 'eosio',
            data: {
              fio_address: voterWithProd.address,
              actor: voterWithProd.account,
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

      it.skip(`(Skip: tested in proxy vote tests) eosio.unregproxy (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'unregproxy',
            account: 'eosio',
            data: {
              fio_address: voterWithProd.address,
              actor: voterWithProd.account,
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

      it.skip(`(needed?) eosio.resetclaim (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.rmvproducer (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.setabi (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.setautoproxy (voterWithProd)`, async function () {
      });

      it.skip(`eosio.setcode (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.setnolimits (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.setparams (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.setpriv (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.unlocktokens (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.updatepower (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.updlbpclaim (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.updlocked (voterWithProd)`, async function () {
      });

      it.skip(`(needed?) eosio.updtrevision (voterWithProd)`, async function () {
      });

      it.skip(`(Skip: should be tested in separate test)  eosio.voteproducer (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'voteproducer',
            account: 'eosio',
            data: {
              "producers": [
                bp1.address
              ],
              fio_address: voterWithProd.address,
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

      it.skip(`(Skip: tested in proxy vote tests) eosio.voteproxy (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'voteproxy',
            account: 'eosio',
            data: {
              proxy: newProxy.address,
              fio_address: voterWithProd.address,
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

    }); // voterWithProd

    describe('proxy', () => {
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

      it(`eosio.updateauth (proxy)`, async function () {
        try{
          const result = await callFioApiSigned('push_transaction', {
            action: 'updateauth',
            account: 'eosio',
            actor: proxy.account,
            privKey: proxy.privateKey,
            data: {
              permission: newPerm,
              parent: parent,
              auth: newAuth,
              max_fee: config.maxFee,
              account: proxy.account
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

      it(`eosio.linkauth (proxy)`, async function () {
        try {
          const result = await callFioApiSigned('push_transaction', {
            action: 'linkauth',
            account: 'eosio',
            actor: proxy.account,
            privKey: proxy.privateKey,
            data: {
              account: proxy.account,                 // the owner of the permission to be linked, this account will sign the transaction
              code: 'fio.address',                    // the contract owner of the action to be linked
              type: 'regaddress',                     // the action to be linked
              requirement: newPerm,                   // the name of the custom permission (created by updateauth)
              max_fee: config.maxFee,
              account: proxy.account
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

      it(`eosio.unlinkauth (proxy)`, async function () {
        try {
          const result = await callFioApiSigned('push_transaction', {
            action: 'unlinkauth',
            account: 'eosio',
            actor: proxy.account,
            privKey: proxy.privateKey,
            data: {
              account: proxy.account,                 // the owner of the permission to be linked, this account will sign the transaction
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

      it(`eosio.deleteauth (proxy)`, async function () {
        try {
          const result = await callFioApiSigned('push_transaction', {
            action: 'deleteauth',
            account: 'eosio',
            actor: proxy.account,
            privKey: proxy.privateKey,
            data: {
              permission: newPerm,
              max_fee: config.maxFee,
              account: proxy.account
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

      it.skip(`(Skip: should be tested in separate test) eosio.regproducer (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'regproducer',
            account: 'eosio',
            data: {
              fio_address: proxy.address,
              fio_pub_key: proxy.publicKey,
              url: "https://mywebsite.io/",
              location: 80,
              actor: proxy.account,
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

      it.skip(`(Skip: should be tested in separate test) eosio.unregprod (proxy)`, async function () {
        try {
        const result = await proxy.sdk.genericAction('pushTransaction', {
          action: 'unregprod',
          account: 'eosio',
          data: {
            fio_address: proxy.address,
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

      it.skip(`(Skip: tested in proxy vote tests) eosio.regproxy (proxy)`, async function () {
        try {
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
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it.skip(`(Skip: tested in proxy vote tests) eosio.unregproxy (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'unregproxy',
            account: 'eosio',
            data: {
              fio_address: proxy.address,
              actor: proxy.account,
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

      it.skip(`(Skip: should be tested in separate test) eosio.voteproducer (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'voteproducer',
            account: 'eosio',
            data: {
              "producers": [
                bp1.address
              ],
              fio_address: proxy.address,
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

      it.skip(`(Skip: tested in proxy vote tests) eosio.voteproxy (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'voteproxy',
            account: 'eosio',
            data: {
              proxy: newProxy.address,
              fio_address: proxy.address,
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

    }); // proxy

    describe('voterWithProxy', () => {
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

      it(`eosio.updateauth (voterWithProxy)`, async function () {
        try{
          const result = await callFioApiSigned('push_transaction', {
            action: 'updateauth',
            account: 'eosio',
            actor: voterWithProxy.account,
            privKey: voterWithProxy.privateKey,
            data: {
              permission: newPerm,
              parent: parent,
              auth: newAuth,
              max_fee: config.maxFee,
              account: voterWithProxy.account
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

      it(`eosio.linkauth (voterWithProxy)`, async function () {
        try {
          const result = await callFioApiSigned('push_transaction', {
            action: 'linkauth',
            account: 'eosio',
            actor: voterWithProxy.account,
            privKey: voterWithProxy.privateKey,
            data: {
              account: voterWithProxy.account,                 // the owner of the permission to be linked, this account will sign the transaction
              code: 'fio.address',                    // the contract owner of the action to be linked
              type: 'regaddress',                     // the action to be linked
              requirement: newPerm,                   // the name of the custom permission (created by updateauth)
              max_fee: config.maxFee,
              account: voterWithProxy.account
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

      it(`eosio.unlinkauth (voterWithProxy)`, async function () {
        try {
          const result = await callFioApiSigned('push_transaction', {
            action: 'unlinkauth',
            account: 'eosio',
            actor: voterWithProxy.account,
            privKey: voterWithProxy.privateKey,
            data: {
              account: voterWithProxy.account,                 // the owner of the permission to be linked, this account will sign the transaction
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

      it(`eosio.deleteauth (voterWithProxy)`, async function () {
        try {
          const result = await callFioApiSigned('push_transaction', {
            action: 'deleteauth',
            account: 'eosio',
            actor: voterWithProxy.account,
            privKey: voterWithProxy.privateKey,
            data: {
              permission: newPerm,
              max_fee: config.maxFee,
              account: voterWithProxy.account
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

      it.skip(`(Skip: should be tested in separate test) eosio.regproducer (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'regproducer',
            account: 'eosio',
            data: {
              fio_address: voterWithProxy.address,
              fio_pub_key: voterWithProxy.publicKey,
              url: "https://mywebsite.io/",
              location: 80,
              actor: voterWithProxy.account,
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

      it.skip(`(Skip: should be tested in separate test) eosio.unregprod (voterWithProxy)`, async function () {
        try {
        const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
          action: 'unregprod',
          account: 'eosio',
          data: {
            fio_address: voterWithProxy.address,
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

      it.skip(`(Skip: tested in voterWithProxy vote tests) eosio.regvoterWithProxy (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'regvoterWithProxy',
            account: 'eosio',
            data: {
              fio_address: voterWithProxy.address,
              actor: voterWithProxy.account,
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

      it.skip(`(Skip: tested in proxy vote tests) eosio.unregproxy (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'unregproxy',
            account: 'eosio',
            data: {
              fio_address: voterWithProxy.address,
              actor: voterWithProxy.account,
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

      it.skip(`(Skip: should be tested in separate test) eosio.voteproducer (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'voteproducer',
            account: 'eosio',
            data: {
              "producers": [
                bp1.address
              ],
              fio_address: voterWithProxy.address,
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

      it.skip(`(Skip: tested in proxy vote tests) eosio.voteproxy (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'voteproxy',
            account: 'eosio',
            data: {
              voterWithProxy: newProxy.address,
              fio_address: voterWithProxy.address,
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

    }); // voterWithProxy

    describe('autoproxy', () => {
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

      it(`eosio.updateauth (autoproxy)`, async function () {
        try{
          const result = await callFioApiSigned('push_transaction', {
            action: 'updateauth',
            account: 'eosio',
            actor: autoproxy.account,
            privKey: autoproxy.privateKey,
            data: {
              permission: newPerm,
              parent: parent,
              auth: newAuth,
              max_fee: config.maxFee,
              account: autoproxy.account
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

      it(`eosio.linkauth (autoproxy)`, async function () {
        try {
          const result = await callFioApiSigned('push_transaction', {
            action: 'linkauth',
            account: 'eosio',
            actor: autoproxy.account,
            privKey: autoproxy.privateKey,
            data: {
              account: autoproxy.account,                 // the owner of the permission to be linked, this account will sign the transaction
              code: 'fio.address',                    // the contract owner of the action to be linked
              type: 'regaddress',                     // the action to be linked
              requirement: newPerm,                   // the name of the custom permission (created by updateauth)
              max_fee: config.maxFee,
              account: autoproxy.account
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

      it(`eosio.unlinkauth (autoproxy)`, async function () {
        try {
          const result = await callFioApiSigned('push_transaction', {
            action: 'unlinkauth',
            account: 'eosio',
            actor: autoproxy.account,
            privKey: autoproxy.privateKey,
            data: {
              account: autoproxy.account,                 // the owner of the permission to be linked, this account will sign the transaction
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

      it(`eosio.deleteauth (autoproxy)`, async function () {
        try {
          const result = await callFioApiSigned('push_transaction', {
            action: 'deleteauth',
            account: 'eosio',
            actor: autoproxy.account,
            privKey: autoproxy.privateKey,
            data: {
              permission: newPerm,
              max_fee: config.maxFee,
              account: autoproxy.account
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

      it.skip(`(Skip: should be tested in separate test) eosio.regproducer (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'regproducer',
            account: 'eosio',
            data: {
              fio_address: autoproxy.address,
              fio_pub_key: autoproxy.publicKey,
              url: "https://mywebsite.io/",
              location: 80,
              actor: autoproxy.account,
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

      it.skip(`(Skip: should be tested in separate test) eosio.unregprod (autoproxy)`, async function () {
        try {
        const result = await autoproxy.sdk.genericAction('pushTransaction', {
          action: 'unregprod',
          account: 'eosio',
          data: {
            fio_address: autoproxy.address,
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

      it.skip(`(Skip: tested in proxy vote tests) eosio.regproxy (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'regproxy',
            account: 'eosio',
            data: {
              fio_address: autoproxy.address,
              actor: autoproxy.account,
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

      it.skip(`(Skip: tested in proxy vote tests) eosio.unregproxy (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'unregproxy',
            account: 'eosio',
            data: {
              fio_address: autoproxy.address,
              actor: autoproxy.account,
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

      it.skip(`(Skip: should be tested in separate test) eosio.voteproducer (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'voteproducer',
            account: 'eosio',
            data: {
              "producers": [
                bp1.address
              ],
              fio_address: autoproxy.address,
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

      it.skip(`(Skip: tested in proxy vote tests) eosio.voteproxy (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'voteproxy',
            account: 'eosio',
            data: {
              autoproxy: newProxy.address,
              fio_address: autoproxy.address,
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

    }); // voterWithProxy

    describe('voterWithAutoproxy', () => {
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

      it(`eosio.updateauth (voterWithAutoproxy)`, async function () {
        try{
          const result = await callFioApiSigned('push_transaction', {
            action: 'updateauth',
            account: 'eosio',
            actor: voterWithAutoproxy.account,
            privKey: voterWithAutoproxy.privateKey,
            data: {
              permission: newPerm,
              parent: parent,
              auth: newAuth,
              max_fee: config.maxFee,
              account: voterWithAutoproxy.account
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

      it(`eosio.linkauth (voterWithAutoproxy)`, async function () {
        try {
          const result = await callFioApiSigned('push_transaction', {
            action: 'linkauth',
            account: 'eosio',
            actor: voterWithAutoproxy.account,
            privKey: voterWithAutoproxy.privateKey,
            data: {
              account: voterWithAutoproxy.account,                 // the owner of the permission to be linked, this account will sign the transaction
              code: 'fio.address',                    // the contract owner of the action to be linked
              type: 'regaddress',                     // the action to be linked
              requirement: newPerm,                   // the name of the custom permission (created by updateauth)
              max_fee: config.maxFee,
              account: voterWithAutoproxy.account
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

      it(`eosio.unlinkauth (voterWithAutoproxy)`, async function () {
        try {
          const result = await callFioApiSigned('push_transaction', {
            action: 'unlinkauth',
            account: 'eosio',
            actor: voterWithAutoproxy.account,
            privKey: voterWithAutoproxy.privateKey,
            data: {
              account: voterWithAutoproxy.account,                 // the owner of the permission to be linked, this account will sign the transaction
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

      it(`eosio.deleteauth (voterWithAutoproxy)`, async function () {
        try {
          const result = await callFioApiSigned('push_transaction', {
            action: 'deleteauth',
            account: 'eosio',
            actor: voterWithAutoproxy.account,
            privKey: voterWithAutoproxy.privateKey,
            data: {
              permission: newPerm,
              max_fee: config.maxFee,
              account: voterWithAutoproxy.account
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

      it.skip(`(Skip: should be tested in separate test) eosio.regproducer (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'regproducer',
            account: 'eosio',
            data: {
              fio_address: voterWithAutoproxy.address,
              fio_pub_key: voterWithAutoproxy.publicKey,
              url: "https://mywebsite.io/",
              location: 80,
              actor: voterWithAutoproxy.account,
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

      it.skip(`(Skip: should be tested in separate test) eosio.unregprod (voterWithAutoproxy)`, async function () {
        try {
        const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
          action: 'unregprod',
          account: 'eosio',
          data: {
            fio_address: voterWithAutoproxy.address,
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

      it.skip(`(Skip: tested in proxy vote tests) eosio.regproxy (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'regproxy',
            account: 'eosio',
            data: {
              fio_address: voterWithAutoproxy.address,
              actor: voterWithAutoproxy.account,
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

      it.skip(`(Skip: tested in proxy vote tests) eosio.unregproxy (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'unregproxy',
            account: 'eosio',
            data: {
              fio_address: voterWithAutoproxy.address,
              actor: voterWithAutoproxy.account,
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

      it.skip(`(Skip: should be tested in separate test) eosio.voteproducer (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'voteproducer',
            account: 'eosio',
            data: {
              "producers": [
                bp1.address
              ],
              fio_address: voterWithAutoproxy.address,
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

      it.skip(`(Skip: tested in proxy vote tests) eosio.voteproxy (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'voteproxy',
            account: 'eosio',
            data: {
              voterWithAutoproxy: newProxy.address,
              fio_address: voterWithAutoproxy.address,
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

    }); // voterWithProxy

  }); // eosio actions);


  describe.skip('TODO: eosio.msig actions', () => {
    describe('producer', () => {
      const proposalName = randStr(12);
      let serializedActions;
      const privateKeys = ['5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R'];
      const signatureProvider = new JsSignatureProvider(privateKeys);
      const rpc = new JsonRpc('http://35.82.73.97:8889', { fetch }); //required to read blockchain state
      const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() }); //required to submit transactions

      it('test', async function () {
        const actions = [
          {
            account: 'fio.address',
            name: 'addaddress',
            authorization: [
              {
                actor: bp1.account,
                permission: 'active',
              }
            ], 
            data: {
              fio_address: bp1.address,
              public_addresses: [
                {
                  chain_code: 'BCH',
                  token_code: 'BCH',
                  public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
                }
              ],
              max_fee: config.maxFee,
              tpid: '',
              actor: bp1.account,
           },
          }
        ];
        try {
          const serialized_actions = await api.serializeActions(actions)
          console.log('serialized: ', serialized_actions)
        
          // BUILD THE MULTISIG PROPOSE TRANSACTION
          // proposeInput = {
          //   proposer: bp1.account,
          //   proposal_name: proposalName,
          //   requested: [
          //     {
          //       actor: bp1.account,
          //       permission: 'active'
          //     }
          //   ],
          //   trx: {
          //     expiration: '2019-09-16T16:39:15',
          //     ref_block_num: 0,
          //     ref_block_prefix: 0,
          //     max_net_usage_words: 0,
          //     max_cpu_usage_ms: 0,
          //     delay_sec: 0,
          //     context_free_actions: [],
          //     actions: serialized_actions,
          //     transaction_extensions: []
          //   }
          // };

          //PROPOSE THE TRANSACTION
          // const result = await api.transact({
          //   actions: [{
          //     account: 'eosio.msig',
          //     name: 'propose',
          //     authorization: [{
          //       actor: bp1.account,
          //       permission: 'active',
          //     }],
          //     data: proposeInput,
          //   }]
          // }, {
          //   blocksBehind: 3,
          //   expireSeconds: 30,
          //   broadcast: true,
          //   sign: true
          // });
          // console.log('result: ', result)
        } catch (err) {
          console.log('Error: ', err);
          //console.log('Error: ', JSON.stringify(err, null, 4));
        }

      })

      it.skip(`Serialize action`, async function () {
        const textDecoder = new TextDecoder();
        const textEncoder = new TextEncoder();
        //const { serializeActions } = require('@fioprotocol/fiojs/dist/chain-api'); 

        const actions = [
          {
            account: 'fio.address',
            name: 'addaddress',
            authorization: [
              {
                actor: bp1.account,
                permission: 'active',
              }
            ], 
            data: {
              fio_address: bp1.address,
              public_addresses: [
                {
                  chain_code: 'BCH',
                  token_code: 'BCH',
                  public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
                }
              ],
              max_fee: config.maxFee,
              tpid: '',
              actor: bp1.account,
           },
          }
        ];

        //const serializedActions = await serializeActions(actions)
        const serializedActions = ser.serializeAction('fio.address', 'fio.address', 'addaddress', actions[0].authorization, actions[0].data, textEncoder, textDecoder)

        //console.log('serialized actions: ', serializedActions)
      });

      it.skip(`Serialize action`, async function () {
        const textDecoder = new TextDecoder();
        const textEncoder = new TextEncoder();

        const actions = [
          {
            account: 'fio.address',
            name: 'addaddress',
            authorization: [
              {
                actor: bp1.account,
                permission: 'active',
              }
            ], 
            data: {
              fio_address: bp1.address,
              public_addresses: [
                {
                  chain_code: 'BCH',
                  token_code: 'BCH',
                  public_address: 'bitcoincash:qzf8zha74ahdh9j0xnwlffdn0zuyaslx3c90q7n9g9',
                }
              ],
              max_fee: config.maxFee,
              tpid: '',
              actor: bp1.account,
           },
          }
        ];

        const abiFioAddress = await callFioApi("get_abi", {
          account_name: "fio.address"
        })
        //const abiFioAddress = await (await fetch(httpEndpoint + '/v1/chain/get_abi', { body: `{"account_name": "fio.address"}`, method: 'POST' })).json();


        // const rawAbi = await (await fetch(httpEndpoint + '/v1/chain/get_raw_abi', { body: `{"account_name": "fio.address"}`, method: 'POST' })).json()
        // const abi = await Buffer.from(rawAbi.abi, 'base64');
        //console.log('abi: ', abi)
      
        // Get a Map of all the types from fio.address
        var typesFioAddress = ser.getTypesFromAbi(ser.createInitialTypes(), abiFioAddress.abi);
      
        // Get the addaddress action type
        const actionAddaddress = typesFioAddress.get('addaddress');
        
        // Serialize the actions[] "data" field (This example assumes a single action, though transactions may hold an array of actions.)
        const buffer = new ser.SerialBuffer({ textEncoder, textDecoder });
        actionAddaddress.serialize(buffer, actions[0].data);
        serializedData = ser.arrayToHex(buffer.asUint8Array())

        serializedActions = actions[0]
        serializedActions = {
          ...serializedActions,
          data: serializedData
        };

        console.log('serialized actions: ', serializedActions)
      });

      it.skip(`msig.propose (producer)`, async function () {

        try {
          const result = await callFioApiSigned('push_transaction', {
            action: 'propose',
            account: 'eosio.msig',
            actor: bp1.account,
            privKey: bp1.privateKey,
            data: {
              proposer: bp1.account,
              proposal_name: proposalName,
              requested: [
                {
                  actor: bp1.account,
                  permission: 'active'
                }
              ],
              trx: {
                expiration: '2023-11-12T16:39:15',
                ref_block_num: 0,
                ref_block_prefix: 0,
                max_net_usage_words: 0,
                max_cpu_usage_ms: 0,
                delay_sec: 0,
                context_free_actions: [],
                actions: serializedActions,
                transaction_extensions: []
              },
              max_fee: config.maxFee
            }
          })
          console.log('Result: ', result);
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error: ', err);
          //console.log('Error: ', JSON.stringify(err, null, 4));
        }
      });

      it.skip(`msig.propose (producer)`, async function () {

        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'propose',
            account: 'eosio.msig',
            data: {
              proposer: bp1.account,
              proposal_name: proposalName,
              requested: [
                {
                  actor: bp1.account,
                  permission: 'active'
                }
              ],
              trx: {
                expiration: '2023-11-12T16:39:15',
                ref_block_num: 0,
                ref_block_prefix: 0,
                max_net_usage_words: 0,
                max_cpu_usage_ms: 0,
                delay_sec: 0,
                context_free_actions: [],
                actions: serializedActions,
                transaction_extensions: []
              },
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

      it.skip(`msig.approve (producer)`, async function () {
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

      it(`msig.unapprove (producer)`, async function () {
      });

      it.skip(`msig.approve (producer)`, async function () {
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

      it(`msig.exec (producer)`, async function () {
      });

      it(`msig.propose (producer)`, async function () {
      });

      it(`msig.cancel (producer)`, async function () {
      });

      it(`msig.propose (producer)`, async function () {
      });

      it(`msig.invalidate (producer)`, async function () {
      });

    });
  }); // eosio.msig


  describe('fio.perms actions', () => {

    describe('producer', () => {
      let tempUser;
      const newDomain = randStr(8);

      it(`Create users`, async () => {
        tempUser = await newUser(faucet);
        validateVotes();
      })

      it(`register new domain`, async () => {
        try {
            const result = await bp1.sdk.genericAction('pushTransaction', {
                action: 'regdomain',
                account: 'fio.address',
                data: {
                    fio_domain: newDomain,
                    owner_fio_public_key: bp1.publicKey,
                    max_fee: config.maxFee,
                    tpid: ''
                }
            })
            expect(result.status).to.equal('OK');
            await validateVotes();
        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
      });

      it(`perms.addperm (producer)`, async function () {
        try {

          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'addperm',
            account: 'fio.perms',
            data: {
                grantee_account: tempUser.account,
                permission_name: "register_address_on_domain",
                permission_info: "",
                object_name: newDomain,
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

      it(`perms.remperm (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'remperm',
            account: 'fio.perms',
            data: {
                grantee_account: tempUser.account,
                permission_name: "register_address_on_domain",
                object_name: newDomain,
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

      it.skip(`(needed?) perms.clearperm (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'clearperm',
            account: 'fio.perms',
            data: {
                grantor_account: bp1.account,
                permission_name: "register_address_on_domain",
                object_name: newDomain,
            }
        })
          expect(result.status).to.equal('OK');
          //await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

    });

    describe('voterWithProd', () => {
      let tempUser;
      const newDomain = randStr(8);

      it(`Create users`, async () => {
        tempUser = await newUser(faucet);
      })

      it(`register new domain`, async () => {
        try {
            const result = await voterWithProd.sdk.genericAction('pushTransaction', {
                action: 'regdomain',
                account: 'fio.address',
                data: {
                    fio_domain: newDomain,
                    owner_fio_public_key: voterWithProd.publicKey,
                    max_fee: config.maxFee,
                    tpid: ''
                }
            })
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
      });

      it(`perms.addperm (voterWithProd)`, async function () {
        try {

          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'addperm',
            account: 'fio.perms',
            data: {
                grantee_account: tempUser.account,
                permission_name: "register_address_on_domain",
                permission_info: "",
                object_name: newDomain,
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

      it.skip(`perms.remperm (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'remperm',
            account: 'fio.perms',
            data: {
                grantee_account: tempUser.account,
                permission_name: "register_address_on_domain",
                object_name: newDomain,
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

      it.skip(`(needed?) perms.clearperm (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'clearperm',
            account: 'fio.perms',
            data: {
                grantor_account: voterWithProd.account,
                permission_name: "register_address_on_domain",
                object_name: newDomain,
            }
        })
          expect(result.status).to.equal('OK');
          //await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

    });

    describe('proxy', () => {
      let tempUser;
      const newDomain = randStr(8);

      it(`Create users`, async () => {
        tempUser = await newUser(faucet);
      })

      it(`register new domain`, async () => {
        try {
            const result = await proxy.sdk.genericAction('pushTransaction', {
                action: 'regdomain',
                account: 'fio.address',
                data: {
                    fio_domain: newDomain,
                    owner_fio_public_key: proxy.publicKey,
                    max_fee: config.maxFee,
                    tpid: ''
                }
            })
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
      });

      it(`perms.addperm (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'addperm',
            account: 'fio.perms',
            data: {
                grantee_account: tempUser.account,
                permission_name: "register_address_on_domain",
                permission_info: "",
                object_name: newDomain,
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

      it(`perms.remperm (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'remperm',
            account: 'fio.perms',
            data: {
                grantee_account: tempUser.account,
                permission_name: "register_address_on_domain",
                object_name: newDomain,
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

      it.skip(`(needed?) perms.clearperm (proxy)`, async function () {
        try {proxy
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'clearperm',
            account: 'fio.perms',
            data: {
                grantor_account: proxy.account,
                permission_name: "register_address_on_domain",
                object_name: newDomain,
            }
        })
          expect(result.status).to.equal('OK');
          //await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

    });

    describe('voterWithProxy', () => {
      let tempUser;
      const newDomain = randStr(8);

      it(`Create users`, async () => {
        tempUser = await newUser(faucet);
      })

      it(`register new domain`, async () => {
        try {
            const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
                action: 'regdomain',
                account: 'fio.address',
                data: {
                    fio_domain: newDomain,
                    owner_fio_public_key: voterWithProxy.publicKey,
                    max_fee: config.maxFee,
                    tpid: ''
                }
            })
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
      });

      it(`perms.addperm (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'addperm',
            account: 'fio.perms',
            data: {
                grantee_account: tempUser.account,
                permission_name: "register_address_on_domain",
                permission_info: "",
                object_name: newDomain,
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

      it(`perms.remperm (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'remperm',
            account: 'fio.perms',
            data: {
                grantee_account: tempUser.account,
                permission_name: "register_address_on_domain",
                object_name: newDomain,
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

      it.skip(`(needed?) perms.clearperm (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'clearperm',
            account: 'fio.perms',
            data: {
                grantor_account: voterWithProxy.account,
                permission_name: "register_address_on_domain",
                object_name: newDomain,
            }
        })
          expect(result.status).to.equal('OK');
          //await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

    });

    describe('autoproxy', () => {
      let tempUser;
      const newDomain = randStr(8);

      it(`Create users`, async () => {
        tempUser = await newUser(faucet);
      })

      it(`register new domain`, async () => {
        try {
            const result = await autoproxy.sdk.genericAction('pushTransaction', {
                action: 'regdomain',
                account: 'fio.address',
                data: {
                    fio_domain: newDomain,
                    owner_fio_public_key: autoproxy.publicKey,
                    max_fee: config.maxFee,
                    tpid: ''
                }
            })
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
      });

      it(`perms.addperm (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'addperm',
            account: 'fio.perms',
            data: {
                grantee_account: tempUser.account,
                permission_name: "register_address_on_domain",
                permission_info: "",
                object_name: newDomain,
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

      it(`perms.remperm (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'remperm',
            account: 'fio.perms',
            data: {
                grantee_account: tempUser.account,
                permission_name: "register_address_on_domain",
                object_name: newDomain,
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

      it.skip(`(needed?) perms.clearperm (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'clearperm',
            account: 'fio.perms',
            data: {
                grantor_account: autoproxy.account,
                permission_name: "register_address_on_domain",
                object_name: newDomain,
            }
        })
          expect(result.status).to.equal('OK');
          //await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

    });

    describe('voterWithAutoproxy', () => {
      let tempUser;
      const newDomain = randStr(8);

      it(`Create users`, async () => {
        tempUser = await newUser(faucet);
      })

      it(`register new domain`, async () => {
        try {
            const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
                action: 'regdomain',
                account: 'fio.address',
                data: {
                    fio_domain: newDomain,
                    owner_fio_public_key: voterWithAutoproxy.publicKey,
                    max_fee: config.maxFee,
                    tpid: ''
                }
            })
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log(err);
            expect(err).to.equal(null);
        }
      });

      it(`perms.addperm (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'addperm',
            account: 'fio.perms',
            data: {
                grantee_account: tempUser.account,
                permission_name: "register_address_on_domain",
                permission_info: "",
                object_name: newDomain,
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

      it(`perms.remperm (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'remperm',
            account: 'fio.perms',
            data: {
                grantee_account: tempUser.account,
                permission_name: "register_address_on_domain",
                object_name: newDomain,
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

      it.skip(`(needed?) perms.clearperm (producer)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'clearperm',
            account: 'fio.perms',
            data: {
                grantor_account: voterWithAutoproxy.account,
                permission_name: "register_address_on_domain",
                object_name: newDomain,
            }
        })
          expect(result.status).to.equal('OK');
          //await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

    });

  }); // fio.perms


  describe('fio.tpid actions', () => {

    describe('producer', () => {

      it.skip(`(needed?) tpid.updatetpid (producer)`, async function () {
      });

      it.skip(`(needed?) tpid.rewardspaid (producer)`, async function () {
      });

      it.skip(`(needed?) tpid.updatebounty (producer)`, async function () {
      });

    });
  }); // fio.tpid


  describe('fio.treasury actions', () => {

    describe('producer', () => {

      it.skip(`(needed?) treasury.tpidclaim (producer)`, async function () {
      });

      it.skip(`(needed?) treasury.bpclaim (producer)`, async function () {
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

    describe('marketplace owner', () => {
      const MARKETPLACE_PRIV_KEY = '5KePj5qMF7xvXZwY4Tnxy7KbDCdUe7cyZtYv2rsTgaZ7LBuVpUc';
      const MARKETPLACE_PUB_KEY  = 'FIO77rFFByyLycsrbC5tH1CXqddZdgkDuTYDbCc2BoGp5hdnU59f7';
      const marketplaceOwner = new FIOSDK(MARKETPLACE_PRIV_KEY, MARKETPLACE_PUB_KEY, config.BASE_URL, fetchJson);

      it(`escrow.setmrkplcfg (marketplace owner only)`, async function () {
        try {   
          const result = await marketplaceOwner.genericAction('pushTransaction', {
            action: 'setmrkplcfg',
            account: 'fio.escrow',
            data: {
              listing_fee: 5000000000,
              commission_fee: 10,
              e_break: 0,
              max_fee: config.maxFee
            }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err.json);
          expect(err).to.equal(null);
        };
      });

    })

    describe('producer', () => {
      let saleId, saleIdUser, user;
      const newDomain = randStr(8);
      const salePrice = 2000000000; // 2 FIO
      const maxBuyPrice = 8000000000; // 8 FIO

      it(`Create users`, async () => {
        user = await newUser(faucet);
      })

      it(`register new domain`, async () => {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
              action: 'regdomain',
              account: 'fio.address',
              data: {
                  fio_domain: newDomain,
                  owner_fio_public_key: bp1.publicKey,
                  max_fee: config.maxFee,
                  tpid: ''
              }
          })
          expect(result.status).to.equal('OK');
        } catch (err) {
          console.log(err);
          expect(err).to.equal(null);
        }
      });

      it(`escrow.listdomain (producer)`, async function () {
        try {   
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'listdomain',
            account: 'fio.escrow',
            data: {
              actor: bp1.account,
              fio_domain: newDomain,
              sale_price: salePrice,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          saleId = result.domainsale_id;
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it(`escrow.cxlistdomain (producer)`, async function () {
        try {   
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'cxlistdomain',
            account: 'fio.escrow',
            data: {
              actor: bp1.account,
              fio_domain: newDomain,
              sale_id: saleId,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          domainID = result.domainsale_id;
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it(`User lists domain (producer)`, async function () {
        try {   
          const result = await user.sdk.genericAction('pushTransaction', {
            action: 'listdomain',
            account: 'fio.escrow',
            data: {
              actor: user.account,
              fio_domain: user.domain,
              sale_price: salePrice,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          saleIdUser = result.domainsale_id;
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it(`escrow.buydomain (producer)`, async function () {
        try {   
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'buydomain',
            account: 'fio.escrow',
            data: {
              actor: bp1.account,
              fio_domain: user.domain,
              sale_id: saleIdUser,
              max_buy_price: salePrice - 1000000000,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it.skip(`(needed?) escrow.cxburned (producer)`, async function () {
      });

    });

    describe('voterWithProd', () => {
      let saleId, saleIdUser, user;
      const newDomain = randStr(8);
      const salePrice = 2000000000; // 2 FIO
      const maxBuyPrice = 8000000000; // 8 FIO

      it(`Create users`, async () => {
        user = await newUser(faucet);
      })

      it(`register new domain`, async () => {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
              action: 'regdomain',
              account: 'fio.address',
              data: {
                  fio_domain: newDomain,
                  owner_fio_public_key: voterWithProd.publicKey,
                  max_fee: config.maxFee,
                  tpid: ''
              }
          })
          expect(result.status).to.equal('OK');
        } catch (err) {
          console.log(err);
          expect(err).to.equal(null);
        }
      });

      it(`escrow.listdomain (producer)`, async function () {
        try {   
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'listdomain',
            account: 'fio.escrow',
            data: {
              actor: voterWithProd.account,
              fio_domain: newDomain,
              sale_price: salePrice,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          saleId = result.domainsale_id;
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it(`escrow.cxlistdomain (producer)`, async function () {
        try {   
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'cxlistdomain',
            account: 'fio.escrow',
            data: {
              actor: voterWithProd.account,
              fio_domain: newDomain,
              sale_id: saleId,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          domainID = result.domainsale_id;
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it(`User lists domain (producer)`, async function () {
        try {   
          const result = await user.sdk.genericAction('pushTransaction', {
            action: 'listdomain',
            account: 'fio.escrow',
            data: {
              actor: user.account,
              fio_domain: user.domain,
              sale_price: salePrice,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          saleIdUser = result.domainsale_id;
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it(`escrow.buydomain (producer)`, async function () {
        try {   
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'buydomain',
            account: 'fio.escrow',
            data: {
              actor: voterWithProd.account,
              fio_domain: user.domain,
              sale_id: saleIdUser,
              max_buy_price: salePrice - 1000000000,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it.skip(`(needed?) escrow.cxburned (producer)`, async function () {
      });

    });

    describe('proxy', () => {
      let saleId, saleIdUser, user;
      const newDomain = randStr(8);
      const salePrice = 2000000000; // 2 FIO
      const maxBuyPrice = 8000000000; // 8 FIO

      it(`Create users`, async () => {
        user = await newUser(faucet);
      })

      it(`register new domain`, async () => {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
              action: 'regdomain',
              account: 'fio.address',
              data: {
                  fio_domain: newDomain,
                  owner_fio_public_key: proxy.publicKey,
                  max_fee: config.maxFee,
                  tpid: ''
              }
          })
          expect(result.status).to.equal('OK');
        } catch (err) {
          console.log(err);
          expect(err).to.equal(null);
        }
      });

      it(`escrow.listdomain (proxy)`, async function () {
        try {   
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'listdomain',
            account: 'fio.escrow',
            data: {
              actor: proxy.account,
              fio_domain: newDomain,
              sale_price: salePrice,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          saleId = result.domainsale_id;
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it(`escrow.cxlistdomain (proxy)`, async function () {
        try {   
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'cxlistdomain',
            account: 'fio.escrow',
            data: {
              actor: proxy.account,
              fio_domain: newDomain,
              sale_id: saleId,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          domainID = result.domainsale_id;
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it(`User lists domain (proxy)`, async function () {
        try {   
          const result = await user.sdk.genericAction('pushTransaction', {
            action: 'listdomain',
            account: 'fio.escrow',
            data: {
              actor: user.account,
              fio_domain: user.domain,
              sale_price: salePrice,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          saleIdUser = result.domainsale_id;
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it(`escrow.buydomain (proxy)`, async function () {
        try {   
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'buydomain',
            account: 'fio.escrow',
            data: {
              actor: proxy.account,
              fio_domain: user.domain,
              sale_id: saleIdUser,
              max_buy_price: salePrice - 1000000000,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it.skip(`(needed?) escrow.cxburned (proxy)`, async function () {
      });

    });

    describe('voterWithProxy', () => {
      let saleId, saleIdUser, user;
      const newDomain = randStr(8);
      const salePrice = 2000000000; // 2 FIO
      const maxBuyPrice = 8000000000; // 8 FIO

      it(`Create users`, async () => {
        user = await newUser(faucet);
      })

      it(`register new domain`, async () => {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
              action: 'regdomain',
              account: 'fio.address',
              data: {
                  fio_domain: newDomain,
                  owner_fio_public_key: voterWithProxy.publicKey,
                  max_fee: config.maxFee,
                  tpid: ''
              }
          })
          expect(result.status).to.equal('OK');
        } catch (err) {
          console.log(err);
          expect(err).to.equal(null);
        }
      });

      it(`escrow.listdomain (voterWithProxy)`, async function () {
        try {   
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'listdomain',
            account: 'fio.escrow',
            data: {
              actor: voterWithProxy.account,
              fio_domain: newDomain,
              sale_price: salePrice,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          saleId = result.domainsale_id;
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it(`escrow.cxlistdomain (voterWithProxy)`, async function () {
        try {   
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'cxlistdomain',
            account: 'fio.escrow',
            data: {
              actor: voterWithProxy.account,
              fio_domain: newDomain,
              sale_id: saleId,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          domainID = result.domainsale_id;
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it(`User lists domain (voterWithProxy)`, async function () {
        try {   
          const result = await user.sdk.genericAction('pushTransaction', {
            action: 'listdomain',
            account: 'fio.escrow',
            data: {
              actor: user.account,
              fio_domain: user.domain,
              sale_price: salePrice,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          saleIdUser = result.domainsale_id;
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it(`escrow.buydomain (voterWithProxy)`, async function () {
        try {   
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'buydomain',
            account: 'fio.escrow',
            data: {
              actor: voterWithProxy.account,
              fio_domain: user.domain,
              sale_id: saleIdUser,
              max_buy_price: salePrice - 1000000000,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it.skip(`(needed?) escrow.cxburned (voterWithProxy)`, async function () {
      });

    });

    describe('autoproxy', () => {
      let saleId, saleIdUser, user;
      const newDomain = randStr(8);
      const salePrice = 2000000000; // 2 FIO
      const maxBuyPrice = 8000000000; // 8 FIO

      it(`Create users`, async () => {
        user = await newUser(faucet);
      })

      it(`register new domain`, async () => {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
              action: 'regdomain',
              account: 'fio.address',
              data: {
                  fio_domain: newDomain,
                  owner_fio_public_key: autoproxy.publicKey,
                  max_fee: config.maxFee,
                  tpid: ''
              }
          })
          expect(result.status).to.equal('OK');
        } catch (err) {
          console.log(err);
          expect(err).to.equal(null);
        }
      });

      it(`escrow.listdomain (autoproxy)`, async function () {
        try {   
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'listdomain',
            account: 'fio.escrow',
            data: {
              actor: autoproxy.account,
              fio_domain: newDomain,
              sale_price: salePrice,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          saleId = result.domainsale_id;
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it(`escrow.cxlistdomain (autoproxy)`, async function () {
        try {   
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'cxlistdomain',
            account: 'fio.escrow',
            data: {
              actor: autoproxy.account,
              fio_domain: newDomain,
              sale_id: saleId,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          domainID = result.domainsale_id;
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it(`User lists domain (autoproxy)`, async function () {
        try {   
          const result = await user.sdk.genericAction('pushTransaction', {
            action: 'listdomain',
            account: 'fio.escrow',
            data: {
              actor: user.account,
              fio_domain: user.domain,
              sale_price: salePrice,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          saleIdUser = result.domainsale_id;
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it(`escrow.buydomain (autoproxy)`, async function () {
        try {   
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'buydomain',
            account: 'fio.escrow',
            data: {
              actor: autoproxy.account,
              fio_domain: user.domain,
              sale_id: saleIdUser,
              max_buy_price: salePrice - 1000000000,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it.skip(`(needed?) escrow.cxburned (autoproxy)`, async function () {
      });

    });

    describe('voterWithAutoproxy', () => {
      let saleId, saleIdUser, user;
      const newDomain = randStr(8);
      const salePrice = 2000000000; // 2 FIO
      const maxBuyPrice = 8000000000; // 8 FIO

      it(`Create users`, async () => {
        user = await newUser(faucet);
      })

      it(`register new domain`, async () => {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
              action: 'regdomain',
              account: 'fio.address',
              data: {
                  fio_domain: newDomain,
                  owner_fio_public_key: voterWithAutoproxy.publicKey,
                  max_fee: config.maxFee,
                  tpid: ''
              }
          })
          expect(result.status).to.equal('OK');
        } catch (err) {
          console.log(err);
          expect(err).to.equal(null);
        }
      });

      it(`escrow.listdomain (voterWithAutoproxy)`, async function () {
        try {   
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'listdomain',
            account: 'fio.escrow',
            data: {
              actor: voterWithAutoproxy.account,
              fio_domain: newDomain,
              sale_price: salePrice,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          saleId = result.domainsale_id;
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it(`escrow.cxlistdomain (voterWithAutoproxy)`, async function () {
        try {   
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'cxlistdomain',
            account: 'fio.escrow',
            data: {
              actor: voterWithAutoproxy.account,
              fio_domain: newDomain,
              sale_id: saleId,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          domainID = result.domainsale_id;
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it(`User lists domain (voterWithAutoproxy)`, async function () {
        try {   
          const result = await user.sdk.genericAction('pushTransaction', {
            action: 'listdomain',
            account: 'fio.escrow',
            data: {
              actor: user.account,
              fio_domain: user.domain,
              sale_price: salePrice,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          saleIdUser = result.domainsale_id;
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it(`escrow.buydomain (voterWithAutoproxy)`, async function () {
        try {   
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'buydomain',
            account: 'fio.escrow',
            data: {
              actor: voterWithAutoproxy.account,
              fio_domain: user.domain,
              sale_id: saleIdUser,
              max_buy_price: salePrice - 1000000000,
              max_fee: config.maxFee,
              tpid: ""
            }
          });
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log('Error', err);
          expect(err).to.equal(null);
        };
      });

      it.skip(`(needed?) escrow.cxburned (voterWithAutoproxy)`, async function () {
      });

    });

  }); // fio.escrow


  describe('fio.staking actions', () => {
    const stakeAmount = 2000000000; // 2 FIO
    const unstakeAmount = 1000000000; // 1 FIO

    describe('producer', () => {

      it.skip(`staking.stakefio (producer)`, async function () {
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

      it.skip(`staking.unstakefio (producer)`, async function () {
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

    describe('voterWithProd', () => {

      it(`staking.stakefio (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'stakefio',
            account: 'fio.staking',
            data: {
              fio_address: voterWithProd.address,
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

      it(`staking.unstakefio (voterWithProd)`, async function () {
        try {
          const result = await voterWithProd.sdk.genericAction('pushTransaction', {
            action: 'unstakefio',
            account: 'fio.staking',
            data: {
              fio_address: voterWithProd.address,
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

    describe('proxy', () => {

      it(`staking.stakefio (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'stakefio',
            account: 'fio.staking',
            data: {
              fio_address: proxy.address,
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

      it(`staking.unstakefio (proxy)`, async function () {
        try {
          const result = await proxy.sdk.genericAction('pushTransaction', {
            action: 'unstakefio',
            account: 'fio.staking',
            data: {
              fio_address: proxy.address,
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

    describe('voterWithProxy', () => {

      it(`staking.stakefio (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'stakefio',
            account: 'fio.staking',
            data: {
              fio_address: voterWithProxy.address,
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

      it(`staking.unstakefio (voterWithProxy)`, async function () {
        try {
          const result = await voterWithProxy.sdk.genericAction('pushTransaction', {
            action: 'unstakefio',
            account: 'fio.staking',
            data: {
              fio_address: voterWithProxy.address,
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

    describe('autoproxy', () => {

      it(`staking.stakefio (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'stakefio',
            account: 'fio.staking',
            data: {
              fio_address: autoproxy.address,
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

      it(`staking.unstakefio (autoproxy)`, async function () {
        try {
          const result = await autoproxy.sdk.genericAction('pushTransaction', {
            action: 'unstakefio',
            account: 'fio.staking',
            data: {
              fio_address: autoproxy.address,
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

    describe('voterWithAutoproxy', () => {

      it(`staking.stakefio (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'stakefio',
            account: 'fio.staking',
            data: {
              fio_address: voterWithAutoproxy.address,
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

      it(`staking.unstakefio (voterWithAutoproxy)`, async function () {
        try {
          const result = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
            action: 'unstakefio',
            account: 'fio.staking',
            data: {
              fio_address: voterWithAutoproxy.address,
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


  /**
   * INSTRUCTIONS TO SET UP THESE TESTS
   *
   * 1) In fio.oracle.cpp, comment out the SYSTEMACCOUNT authentication in the regoracle AND unregoracle methods
   *
   * e.g.
   * // require_auth(SYSTEMACCOUNT);
   *
   */
  describe.skip('fio.oracle actions (REQUIRES PERMISSION UPDATES ON CHAIN)', () => {
    const wrapAmt = 10000000000; // 10 FIO
    const unwrapAmt = 5000000000; // 5 FIO
    const obtID = '0xobtidetcetcetc' + randStr(20);
    const obtIdDomain = obtID + 'exex';

    describe('producer', () => {
      let newOracle1, newOracle2, newOracle3, newDomain;

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

      it(`register three oracles`, async function () {
        try {
          newOracle1 = await newUser(faucet);
          newOracle2 = await newUser(faucet);
          newOracle3 = await newUser(faucet); 

          await timeout(3000);
    
          await registerNewBp(newOracle1);
          await registerNewOracle(newOracle1);
          await setTestOracleFees(newOracle1, 500000000, 1000000000);
    
          await registerNewBp(newOracle2);
          await registerNewOracle(newOracle2);
          await setTestOracleFees(newOracle2, 1000000000, 1200000000);

          await registerNewBp(newOracle3);
          await registerNewOracle(newOracle3);
          await setTestOracleFees(newOracle3, 1000000000, 1200000000);
        } catch (err) {
          console.log('Error: ', err);
          throw err;
        }
      });

      it(`oracle.wraptokens (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'wraptokens',
            account: 'fio.oracle',
            data: {
              amount: wrapAmt,
              chain_code: "ETH",
              public_address: obtID,
              max_oracle_fee: config.maxFee,
              max_fee: config.maxFee,
              tpid: "",
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`Register new domain`, async function () {
        try {
          newDomain = generateFioDomain(8);
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'regdomain',
            account: 'fio.address',
            data: {
                fio_domain: newDomain,
                owner_fio_public_key: bp1.publicKey,
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

      it(`Wait 2 seconds.`, async () => { await timeout(2000) })

      it(`oracle.wrapdomain (producer)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'wrapdomain',
            account: 'fio.oracle',
            data: {
              fio_domain: newDomain,
              chain_code: "POLY",
              public_address: obtIdDomain,
              max_oracle_fee: 500000000000,
              max_fee: config.maxFee,
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

      it(`oracle.regoracle (producer ONLY)`, async function () {
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
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`oracle.setoraclefee (producer ONLY)`, async function () {
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
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`oracle.unwraptokens (producer as oracle ONLY)`, async function () {
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
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`oracle.unwrapdomain (producer as oracle ONLY)`, async function () {
        try {
          const result = await bp1.sdk.genericAction('pushTransaction', {
            action: 'unwrapdomain',
            account: 'fio.oracle',
            data: {
              fio_domain: newDomain,
              obt_id: obtIdDomain,
              fio_address: bp1.address,
            }
          })
          expect(result.status).to.equal('OK');
          await validateVotes();
        } catch (err) {
          console.log(JSON.stringify(err, null, 4));
          throw err;
        }
      });

      it(`oracle.unregoracle (producer ONLY)`, async function () {
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
          await validateVotes();
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


});
