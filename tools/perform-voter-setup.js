require('mocha')
const {expect} = require('chai')
const {newUser, existingUser, getTestType, getProdVoteTotal, timeout, getBundleCount, getAccountVoteWeight, getTotalVotedFio, callFioApi, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const { readBufferWithDetectedEncoding } = require('tslint/lib/utils');
const testType = getTestType();

let calling_account;

/*
 This test tool will seed the voters in the voters table with 1 fio; a pre-req for
 performing the auditvote on the target environment.
*/

/* SETUP --
    onNetAccount is used when running on test net or main net, it should contain the
    keys and account for an account on the chain that is funded with enough
    FIO to cover the addition of 1 fio per voter in the voters table.

    onNetAccout is NOT used when running on a private test net, instead the faucet
    is used to create and fund the account used to call trnsfiopubky

    test net account that may be used (NOTE please verify account balance before running)
    account: 'wxrm1xzulbpy',
    publicKey: 'FIO57FuR9isLbaPemXopbh5oUxqgPGXr7k9wyinuwF6ZCDM1woB9H',
    privateKey: '5K2rhwLJptp1ycvJz58tzMUvVf2FHPCxBbSu5ejrRZBNLWqxRSH'

    for main net account info please contact the FIO release manager.
*/
const onNetAccount = {
  account: 'wxrm1xzulbpy',
  publicKey: 'FIO57FuR9isLbaPemXopbh5oUxqgPGXr7k9wyinuwF6ZCDM1woB9H',
  privateKey: '5K2rhwLJptp1ycvJz58tzMUvVf2FHPCxBbSu5ejrRZBNLWqxRSH'
}
const sdkAcc = {
  sdk: 'undefined',
  account: 'undefined'
}
  
/* SETUP
    for private test net use the following block

    //local private network setup
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
    calling_account = await newUser(faucet);

    for test net main net use use the following block

    //testnet main net setup
    let analysis_sdk = new FIOSDK(onNetAccount.privateKey, onNetAccount.publicKey, config.BASE_URL, fetchJson);
    let tacc = sdkAcc
    tacc.sdk = analysis_sdk
    calling_account = tacc;
    calling_account.account = onNetAccount.account;
 */
before(async () => {
    let analysis_sdk = new FIOSDK(onNetAccount.privateKey, onNetAccount.publicKey, config.BASE_URL, fetchJson);
    let tacc = sdkAcc
    tacc.sdk = analysis_sdk
    calling_account = tacc;
    calling_account.account = onNetAccount.account;
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

describe(' A. Send 1 FIO to all voters...', () => {
    it(`Sending...`, async () => {
        let voter_rows = Array();

        // Establish Voters
        console.log("Fetching voters and computing power...");
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
                    let voter_pub_key = await get_pub_key(voter.owner)
                    console.log("Sending funds to ", voter.owner);
                    await calling_account.sdk.genericAction('pushTransaction', {
                        action: 'trnsfiopubky',
                        account: 'fio.token',
                        data: {
                            payee_public_key: voter_pub_key,
                            amount: 1000000000,
                            max_fee: config.maxFee,
                            actor: calling_account.account,
                            tpid: ''
                        }
                    });
                } catch (error) {
                    console.log("unexpected error processing funding for voter " + voter.owner + " " + error)
                }
            }

            start = start + voters.rows.length;
            voters = await get_voters(start, limit);
            console.log("Fetched voters start limit," + start + " " + limit);
        }
    })
})

