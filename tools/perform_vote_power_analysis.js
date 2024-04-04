require('mocha')
const {expect} = require('chai')
const {newUser, existingUser, getTestType, getProdVoteTotal, timeout, getBundleCount, getAccountVoteWeight, getTotalVotedFio, callFioApi, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const { readBufferWithDetectedEncoding } = require('tslint/lib/utils');
const testType = getTestType();


/*
NOTE -- output files are removed and replaced every run....
This test will perform a comprehensive voting analysis and output files that
summarize the analysis as csv files in the specified output dir.
to run
1) create the desired output directory on your file system
2) modify the OUTPUTDIR as necessary for your chosen output directory
3) if running on testnet or main net perform the rest of the steps here.
4) if not running on testnet or main net, you may now set your config URL and index.js to run this file.
5) testnet main net only get a set of keys of an existing account on the network.
6) testnet main net only edit the onNetAccount to contain the accounts keys and account info.
7) testnet main net only modify the before as specified in the before to setup for testnet main net use
8) set config and index as necessary to run this test on your desired FIO network.
 */

let analysis_account;
let OUTPUTDIR = "../../voting_analysis_output";
let proxyFile = OUTPUTDIR + "/proxyParticipants.csv";
let totalFile = OUTPUTDIR + "/VoteTotals.csv";
let bpFile = OUTPUTDIR + "/bpTotals.csv";
let votersFile = OUTPUTDIR + "/voters.csv";

/* FOR test net and main net set the account public and privates keys in the onNetAccount struct
these get used in the before to setup the analysis account.
the before also needs changed for local or (testnet mainnet) uses, see comments on before
for the required setup in the before.
 */
/* testnet account key that may be used
privateKey = '5Jw78NzS2QMvjcyemCgJ9XQv8SMSEvTEuLxF8TcKf27xWcX5fmw',
    publicKey = 'FIO8k7N7jU9eyj57AfazGxMuvPGZG5hvXNUyxt9pBchnkXXx9KUuD',
    account = 'v2lgwcdkb5gn',
    */
//SETUP edit the account private and pub key for the pre existing account on main net or test net
//This is NOT USED if running local private network.
const onNetAccount = {
  account: 'v2lgwcdkb5gn',
  publicKey: 'FIO8k7N7jU9eyj57AfazGxMuvPGZG5hvXNUyxt9pBchnkXXx9KUuD',
  privateKey: '5Jw78NzS2QMvjcyemCgJ9XQv8SMSEvTEuLxF8TcKf27xWcX5fmw'
}
const sdkAcc = {
  sdk: 'somefin'
}

//SETUP the before as necessary for running local or testnet mainnet.
// if running a local private fio instance use ththis block in the before
/*
//local private network setup
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
  analysis_account = await newUser(faucet);
 */
//IF running testnet or main net use the following block in the before, and make sure you
// specify the keys from an account that pre-exists on the fio instance(main or test net)
/*
//testnet main net setup
let  analysis_sdk = new FIOSDK(onNetAccount.privateKey, onNetAccount.publicKey, config.BASE_URL, fetchJson);
let tacc = sdkAcc
tacc.sdk = analysis_sdk
analysis_account = tacc;
 */

before(async () => {
  //local private network setup
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
  analysis_account = await newUser(faucet);
})

async function get_voters(start,limit) {
  try {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'voters',
      upper_bound: start + limit - 1,
      lower_bound: start,
      reverse: false,
      show_payer: false
    }
   let  voters = await callFioApi("get_table_rows", json);
    return voters;
  }catch(error) {
    console.log("unexpected error getting voters " + error);
  }
}

async function get_pub_key(acc) {

  try {
    const json = {
      json: true,
      code: 'fio.address',
      scope: 'fio.address',
      table: 'accountmap',
      upper_bound: acc,
      lower_bound: acc,
      limit: 1,
      reverse: false,
      show_payer: false
    }
    let  res = await callFioApi("get_table_rows", json);
    if (res.rows[0]) {
      return res.rows[0].clientkey;
    } else return 0;

  }catch(error) {
    console.log("unexpected error getting voters " + error);
  }
}

async function get_producers() {
  try {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'producers',
      limit: 1000,
      reverse: false,
      show_payer: false
    }
    let res = await callFioApi("get_table_rows", json);
    return res;
  }catch (error){
    console.log("unexpected error getting producers "+error)
  }
}

async function appendFile(accountFile, csvContent) {
  return new Promise(function (appendfile, reject) {
    try {
      require('fs').appendFileSync(accountFile, csvContent  +
          '\r\n', 'utf-8', err => {
        if (err) {
          throw err;
        }
      })
      appendfile(accountFile, csvContent);
    } catch (err) {
      console.log('Error: ', err);
      reject(err);
    }
  });
}

async function get_globals() {
  try {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'global',
      limit: 10,
      lower_bound: 0,
      reverse: false,
      show_payer: false
    }
    let res = await callFioApi("get_table_rows", json);
    return res;
  }catch (error){
    console.log("unexpected error getting producers "+error)
  }
}

async function get_locks_vote(acc) {
  try {
    const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'locktokensv2',
      upper_bound: acc,
      lower_bound: acc,
      index_position: 2,
      key_type: 'i64',
      limit: 1,
      reverse: false,
      show_payer: false
    }
    let  res = await callFioApi("get_table_rows", json);
    if (res.rows.length > 0 && res.rows[0] != undefined) {
      return res.rows[0].can_vote;
    } else {
      return 1;
    }

  }catch(error) {
    console.log("unexpected error getting voters " + error);
  }
}



async function get_fio_balance_key(acc, publicKey) {

  try {
    const result = await acc.sdk.genericAction('getFioBalance', {
        fioPublicKey: publicKey
      })

    return result;
  } catch(err) {
    console.log(err)
    throw err
  }
}


async function get_fio_balance_acc(account) {
  let currency_balance, newstring;
  try {
    const json = {
      code: 'fio.token',
      symbol: 'FIO',
      account: account
    }
    const result = await callFioApi("get_currency_balance", json);
    return result
  } catch (err) {
    console.log('Error: ', err)
  }
}

async function get_csv_obj(t1) {
  let tv = Object.values(t1);
  let tp = ""
  for (let p = 0; p < tv.length; p++) {
    if (p < (tv.length - 1)) {
      tp += tv[p] + ","
    } else {
      tp += tv[p]
    }
  }
  return tp;
}





describe(`************************** perform_vote_analysis.js ************************** \n    A. (this takes a while) analyze voters table, bp vote, and global vote and report results to csv`, () => {

  it(`Wait a few seconds.`, async () => { await timeout(3000) })

  it(`Analyze vote power and save results to local csv files`, async () => {
/*
NOTE this is a one off test that performs a comprehensive voting analysis of the specified api node
it will output several csv files, it will remove and overwrite the files if they are present.

 */
    let voter_rows = Array();
    let bp_votes = Array();
    let proxy_rows = Array();
    let bp_rows = Array();
    let proxy_summary = Array();
    // Establish Voters
    console.log("Fetching voters and computing power, this may take a while...");
    let limit = 900;
    let start = 0;
    let ix = 0;

    let voters = await get_voters(start,limit);
    console.log("Fetched voters start limit,"+start+" "+limit);
    while (voters.rows.length > 0) {
      console.log("the number of rows is " + voters.rows.length);
      for (let i=0;i<voters.rows.length;i++) {
        let voter = voters.rows[i]
        ix++;

        try {
          if (ix % 100 == 0) {
            console.log(ix)
          }
          let balanceacc = await get_fio_balance_acc(voter.owner);
          let balanceaccnum;
          let balancekey = {balance: 0, available: 0, staked: 0};
          let owner_pub_key = await get_pub_key(voter.owner)

          let proxyitem = null;
          if(voter.is_proxy){
            proxyitem = {proxynm: voter.owner,num_participants: 0};
          }
          if(voter.proxy){
            proxyitem = {proxynm: voter.proxy, num_participants: 0};
          }

          if (proxyitem) {
            const found = await proxy_summary.find((proxyitem) => proxyitem.proxynm == voter.proxy);

            if (found) {
              found.num_participants++;
              console.log("increase num participants " + proxyitem.proxynm)
            } else {
              proxy_summary.push(proxyitem)
              console.log("add proxy " + proxyitem.proxynm)
            }
          }

          if (balanceacc.length == 0) {
            balanceaccnum = 0;
            balancekey.balance = 0;
            balancekey.available = 0;
            balancekey.staked = 0;
          } else {
            balanceaccnum = balanceacc[0].replace(" FIO", "");
            balancekey = await get_fio_balance_key(analysis_account,owner_pub_key);
          }

          // Calculate votable power
          var token_power = balanceaccnum;
          if (token_power < 0) token_power = 0;
          if (balancekey.balance != balancekey.available) {
            var can_vote = await get_locks_vote(voter.owner);
            if (can_vote == 0) {
              token_power = balancekey.available;
            }
          }
          console.log(" VOTER ID ",voter.id)
          let tp = ""
          for (let p=0;p<voter.producers.length;p++){
            if (p<(voter.producers.length-1)){
              tp += voter.producers[p]+"|"
            }else{
              tp += voter.producers[p]
            }
          }
          var voteritem = {
            owner: voter.owner,
            proxied_vote_weight: voter.proxied_vote_weight / 1000000000,
            last_vote_weight: voter.last_vote_weight / 1000000000,
            is_proxy: voter.is_proxy,
            is_auto_proxy: voter.is_auto_proxy,
            currency_balance: balanceaccnum,
            balance: balancekey.balance / 1000000000,
            available: balancekey.available / 1000000000,
            staked: balancekey.staked / 1000000000,
            proxy: voter.proxy,
            producers: tp,
            token_power: token_power
          };
          voter_rows.push(voteritem);
          // Establish proxies
          if (voter.is_proxy == 1) proxy_rows[voter.owner] = 0;
          //end insert
        } catch (error) {
          console.log("unexpected error processing item " + voter + " " + error)
        }
      }
        start = start + voters.rows.length;
        voters = await get_voters(start, limit);
        console.log("Fetched voters start limit," + start + " " + limit);

    }

    // Calculate proxy power
    console.log("Calculating proxy power, total voters "+ ix);
    for (const voter of voter_rows) {
      if (voter.proxy) {
        if (proxy_rows[voter.proxy]) {
          proxy_rows[voter.proxy] = parseFloat(proxy_rows[voter.proxy]) + parseFloat(voter.token_power);
        } else proxy_rows[voter.proxy] = parseFloat(voter.token_power);
      }
    }


    // Calculate proxied and total power + diff
    var a=0;
    for (const voter of voter_rows) {
      if (typeof voter_rows[a] === 'undefined') continue;
      if (proxy_rows[voter.owner]) {
        voter_rows[a].proxied_power = parseFloat(proxy_rows[voter.owner]);
      } else voter_rows[a].proxied_power = 0;
      if (voter.is_proxy == 1) {
        voter_rows[a].total_power = parseFloat(voter_rows[a].proxied_power) + parseFloat(voter_rows[a].token_power);
      } else voter_rows[a].total_power = parseFloat(voter_rows[a].token_power);
      voter_rows[a].proxied_power_diff = parseFloat(voter_rows[a].proxied_power) - parseFloat(voter_rows[a].proxied_vote_weight);
      voter_rows[a].total_power_diff = parseFloat(voter_rows[a].total_power) - parseFloat(voter_rows[a].last_vote_weight);
      a++;
    }

    // Calculate BP votes, total voted
    let total_voted_fio = 0.0;
    console.log("Calculating BP votes");
    var a=0;

    for (const voter of voter_rows) {
      var bp_arr = voter.producers.split("|");
      if(voter.producers.length > 0){
        total_voted_fio = total_voted_fio + parseFloat(voter.total_power);
      }

      for (const bp of bp_arr) {
        // BP data
        if (bp_votes.hasOwnProperty(bp)) {
          bp_votes[bp] = bp_votes[bp] + (voter.total_power);
        } else { bp_votes[bp] = voter.total_power;}
      }
      a++;
    }

    // Process BPs

    console.log("Fetching actual BPs");
    let producers = await get_producers();
    for (let p=0;p<producers.rows.length;p++){
      let producer = producers.rows[p];
      if (!bp_votes[producer.owner]) {
        bp_votes[producer.owner] = 0;
      }
      var bpitem = {
        bp: producer.owner,
        is_active: producer.is_active,
        bp_handle: producer.fio_address,
        state_total_votes: producer.total_votes / 1000000000,
        real_total_votes: bp_votes[producer.owner]
      }
      bp_rows.push(bpitem);
    }

    console.log("cleaning output directory of old files")
    const fs = require('fs');
    if (fs.existsSync(proxyFile)) {
      fs.unlinkSync(proxyFile)
    }
    if (fs.existsSync(totalFile)) {
      fs.unlinkSync(totalFile)
    }
    if (fs.existsSync(bpFile)) {
      fs.unlinkSync(bpFile)
    }
    if (fs.existsSync(votersFile)) {
      fs.unlinkSync(votersFile)
    }

    // Insert proxy summary
    console.log("Writing proxy summary");
    appendFile(proxyFile,"proxyAccount,numParticipants");

    for (var i = 0; i < proxy_summary.length; i++) {
      let tv = await get_csv_obj(proxy_summary[i]);
       appendFile(proxyFile,tv);
      }

    // Insert BPs
    console.log("Writing BPs");
    let bp

   appendFile(bpFile,"bp,is_active,bp_handle,state_total_votes,expected_total_votes");
    let total_bp_votes = 0;
    for (var i = 0; i < bp_rows.length; i++) {
      total_bp_votes += bp_rows[i].real_total_votes;
      let tv = await get_csv_obj(bp_rows[i]);
      appendFile(bpFile,tv);
    }

    // Insert Totals
    console.log("Fetching Totals");
    appendFile(totalFile,"name,stateValue,expectedValue");
    var globals = await get_globals();
    console.log(globals)
    console.log("Writing Totals");
    appendFile(totalFile,"total_producer_vote_weight,"+globals.rows[0].total_producer_vote_weight/1000000000+","+total_bp_votes)
    appendFile(totalFile,"total_voted_fio,"+globals.rows[0].total_voted_fio/1000000000+","+total_voted_fio)



    // Insert Voters
    console.log("Writing Voters");
    appendFile(votersFile,"voter,proxied_vote_weight,last_vote_weight,is_proxy,is_auto_proxy,currency_balance,getter_balance,getter_available,getter_staked,proxy,producers,token_power,proxied_power,total_power,proxied_power_diff,total_power_diff");

    for (var i = 0; i < voter_rows.length; i++) {
      let tv = await get_csv_obj(voter_rows[i]);
      appendFile(votersFile,tv);
    }
    console.log("analysis completed!!! output dir is "+OUTPUTDIR);

  })



})
