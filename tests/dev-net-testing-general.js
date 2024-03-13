require('mocha')
require('fs')
const {expect} = require('chai')
const exec = require('child_process').exec;
const {newUser, existingUser, getTestType, getProdVoteTotal, timeout, getBundleCount, getAccountVoteWeight, getTotalVotedFio, appendAccountFile, readAccountFile, callFioApi, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const { readBufferWithDetectedEncoding } = require('tslint/lib/utils');
const testType = getTestType()

let producerdomain;

let boot1address, boot2address, boot3address, boot4address
let clusterA1address, clusterA2address, clusterA3address, clusterA4address, clusterA5address, clusterA6address
let clusterB1address, clusterB2address, clusterB3address, clusterB4address, clusterB5address, clusterB6address
let clusterC1address, clusterC2address, clusterC3address, clusterC4address, clusterC5address, clusterC6address

let boot1sdk, boot2sdk, boot3sdk, boot4sdk
let clusterA1sdk, clusterA2sdk, clusterA3sdk, clusterA4sdk, clusterA5sdk, clusterA6sdk
let clusterB1sdk, clusterB2sdk, clusterB3sdk, clusterB4sdk, clusterB5sdk, clusterB6sdk
let clusterC1sdk, clusterC2sdk, clusterC3sdk, clusterC4sdk, clusterC5sdk, clusterC6sdk

let boot1account, boot2account, boot3account, boot4account
let clusterA1account, clusterA2account, clusterA3account, clusterA4account, clusterA5account, clusterA6account
let clusterB1account, clusterB2account, clusterB3account, clusterB4account, clusterB5account, clusterB6account
let clusterC1account, clusterC2account, clusterC3account, clusterC4account, clusterC5account, clusterC6account

let actionprodlist = "";
let proposer;



/*
 NOTE-- this is a dev only file that can be used as an example of how to use a set of accounts across
 different runs of the js tests. account info can be stored to file and then loaded by the tests
 using it. this is for example/illustration only!!!!
 */


function runCmd(command) {
  return new Promise(function(resolve, reject) {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      if (stderr) {
        console.log('stderr: ', stderr);
      }
      resolve(stdout.trim());
    });
  });
}

before(async () => {


  faucet = await new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);


  //read the account file and set up producer accounts and addresses.
  //this is order dependant on the order in the accounts file, we index in the same order as what is in the file.

  let accounts = [];
  //use account names to create an alpha sorted list of account names for msig approvers list
  let accountNames = [];
  //note before running devnet tests, be sure to get a copy of this file from Ed!!!!!!
  accounts =  await readAccountFile('../edscripts/devnetProducerAccountInfo.csv');


  //all producers have same domain in dev net.
  producerdomain = accounts[0].domain;



  //get boot node info
  boot1sdk = await new FIOSDK(accounts[0].privateKey,accounts[0].publicKey, config.BASE_URL, fetchJson);
  boot1address = accounts[0].address;
  boot1account = accounts[0].account;
  accountNames.push(boot1account);


  boot2sdk = await new FIOSDK(accounts[1].privateKey,accounts[1].publicKey, config.BASE_URL, fetchJson);
  boot2address = accounts[1].address;
  boot2account = accounts[1].account;
  accountNames.push(boot2account);

  boot3sdk = await new FIOSDK(accounts[2].privateKey,accounts[2].publicKey, config.BASE_URL, fetchJson);
  boot3address = accounts[2].address;
  boot3account = accounts[2].account;
  accountNames.push(boot3account);

  boot4sdk = await new FIOSDK(accounts[3].privateKey,accounts[3].publicKey, config.BASE_URL, fetchJson);
  boot4address = accounts[3].address;
  boot4account = accounts[3].account;
  accountNames.push(boot4account);

  //get cluster a info
  clusterA1sdk = await new FIOSDK(accounts[4].privateKey,accounts[4].publicKey, config.BASE_URL, fetchJson);
  clusterA1address = accounts[4].address;
  clusterA1account = accounts[4].account;
  accountNames.push(clusterA1account);

  clusterA2sdk = await new FIOSDK(accounts[5].privateKey,accounts[5].publicKey, config.BASE_URL, fetchJson);
  clusterA2address = accounts[5].address;
  clusterA2account = accounts[5].account;

  clusterA3sdk = await new FIOSDK(accounts[6].privateKey,accounts[6].publicKey, config.BASE_URL, fetchJson);
  clusterA3address = accounts[6].address;
  clusterA3account = accounts[6].account;
  accountNames.push(clusterA3account);

  clusterA4sdk = await new FIOSDK(accounts[7].privateKey,accounts[7].publicKey, config.BASE_URL, fetchJson);
  clusterA4address = accounts[7].address;
  clusterA4account = accounts[7].account;
  accountNames.push(clusterA4account);

  clusterA5sdk = await new FIOSDK(accounts[8].privateKey,accounts[8].publicKey, config.BASE_URL, fetchJson);
  clusterA5address = accounts[8].address;
  clusterA5account = accounts[8].account;
  accountNames.push(clusterA5account);

  clusterA6sdk = await new FIOSDK(accounts[9].privateKey,accounts[9].publicKey, config.BASE_URL, fetchJson);
  clusterA6address = accounts[9].address;
  clusterA6account = accounts[9].account;
  accountNames.push(clusterA6account);

  //get cluster b info

  clusterB1sdk = await new FIOSDK(accounts[10].privateKey,accounts[10].publicKey, config.BASE_URL, fetchJson);
  clusterB1address = accounts[10].address;
  clusterB1account = accounts[10].account;
  accountNames.push(clusterB1account);

  clusterB2sdk = await  new FIOSDK(accounts[11].privateKey,accounts[11].publicKey, config.BASE_URL, fetchJson);
  clusterB2address = accounts[11].address;
  clusterB2account = accounts[11].account;
  accountNames.push(clusterB2account);

  clusterB3sdk = new FIOSDK(accounts[12].privateKey,accounts[12].publicKey, config.BASE_URL, fetchJson);
  clusterB3address = accounts[12].address;
  clusterB3account = accounts[12].account;
  accountNames.push(clusterB3account);

  clusterB4sdk = await new FIOSDK(accounts[13].privateKey,accounts[13].publicKey, config.BASE_URL, fetchJson);
  clusterB4address = accounts[13].address;
  clusterB4account = accounts[13].account;
  accountNames.push(clusterB4account);

  clusterB5sdk = await new FIOSDK(accounts[14].privateKey,accounts[14].publicKey, config.BASE_URL, fetchJson);
  clusterB5address = accounts[14].address;
  clusterB5account = accounts[14].account;
  accountNames.push(clusterB5account);

  clusterB6sdk = await new FIOSDK(accounts[15].privateKey,accounts[15].publicKey, config.BASE_URL, fetchJson);
  clusterB6address = accounts[15].address;
  clusterB6account = accounts[15].account;
  accountNames.push(clusterB6account);


  //get cluster c info

  clusterC1sdk = await new FIOSDK(accounts[16].privateKey,accounts[16].publicKey, config.BASE_URL, fetchJson);
  clusterC1address = accounts[16].address;
  clusterC1account = accounts[16].account;
  accountNames.push(clusterC1account);

  clusterC2sdk = await new FIOSDK(accounts[17].privateKey,accounts[17].publicKey, config.BASE_URL, fetchJson);
  clusterC2address = accounts[17].address;
  clusterC2account = accounts[17].account;
  accountNames.push(clusterC2account);

  clusterC3sdk = await new FIOSDK(accounts[18].privateKey,accounts[18].publicKey, config.BASE_URL, fetchJson);
  clusterC3address = accounts[18].address;
  clusterC3account = accounts[18].account;
  accountNames.push(clusterC3account);

  clusterC4sdk = await new FIOSDK(accounts[19].privateKey,accounts[19].publicKey, config.BASE_URL, fetchJson);
  clusterC4address = accounts[19].address;
  clusterC4account = accounts[19].account;
  accountNames.push(clusterC4account);

  clusterC5sdk = await new FIOSDK(accounts[20].privateKey,accounts[20].publicKey, config.BASE_URL, fetchJson);
  clusterC5address = accounts[20].address;
  clusterC5account = accounts[20].account;
  accountNames.push(clusterC5account);

  clusterC6sdk = await new FIOSDK(accounts[21].privateKey,accounts[21].publicKey, config.BASE_URL, fetchJson);
  clusterC6address = accounts[21].address;
  clusterC6account = accounts[21].account;
  accountNames.push(clusterC6account);


  //note now we have all the info on devnet accounts in local vars we can do what we want to test
  //various BP dynamics.




  //TODO!!!!!!!!
  // The list of accounts needs to be placed in alphabetical order in the actionprodlist before it will
  //work correctly on our dev net!!!!!!
  //TODO
  //TODO


  accountNames.sort();
  //msig participants list for devnet, note that the account names are in alpha order by intention.



  //todo loop over sorted account names and make action prod list instead of whats below
  /*
  actionprodlist =
      "{\"actor\":\"' + clusterA1account + '\",\"permission\":\"active\"}, " +
      "{\"actor\":\"' + clusterA2account + '\",\"permission\":\"active\"}, " +
      "{\"actor\":\"' + clusterA3account + '\",\"permission\":\"active\"}, " +
      "{\"actor\":\"' + clusterA4account + '\",\"permission\":\"active\"}, " +
      "{\"actor\":\"' + clusterA5account + '\",\"permission\":\"active\"}, " +
      "{\"actor\":\"' + clusterA6account + '\",\"permission\":\"active\"}, " +
      "{\"actor\":\"' + clusterB1account + '\",\"permission\":\"active\"}, " +
      "{\"actor\":\"' + clusterB2account + '\",\"permission\":\"active\"}, " +
      "{\"actor\":\"' + clusterB3account + '\",\"permission\":\"active\"}, " +
      "{\"actor\":\"' + clusterB4account + '\",\"permission\":\"active\"}, " +
      "{\"actor\":\"' + clusterB5account + '\",\"permission\":\"active\"}, " +
      "{\"actor\":\"' + clusterB6account + '\",\"permission\":\"active\"}, " +
      "{\"actor\":\"' + clusterC1account + '\",\"permission\":\"active\"}, " +
      "{\"actor\":\"' + clusterC2account + '\",\"permission\":\"active\"}, " +
      "{\"actor\":\"' + clusterC3account + '\",\"permission\":\"active\"}, " +
      "{\"actor\":\"' + clusterC4account + '\",\"permission\":\"active\"}, " +
      "{\"actor\":\"' + clusterC5account + '\",\"permission\":\"active\"}, " +
      "{\"actor\":\"' + clusterC6account + '\",\"permission\":\"active\"} " ;
      */




})

/* this example demonstrates an MSIG to setcode on the fio.request.obt contract.
   to perform this test please modify the fio.request.obt contract, add a print("hello"); to fio.request.obt.cpp
   and build locally, DO NOT RESTART the chain. run this test to propose the msig to update the contract.
   note, new tests can be made for a release to provide rollout testing that can be performed on a local chain or dev net.


   make sure your wallet is unlocked before running this test.
 */
//modify this to be the location of your built contracts to be deployed.
const contractsFolder = '/Users/edr/repos/fio.contracts/build/contracts';
describe.only('three node local net, Create BP setcode msig, approve and execute on 3 node local dev net.', () => {

  // bp1 devtools
  let proposalAction;

  contractAccount = "fio.reqobt"
  contractName = "fio.request.obt"

  it('set up MSIG producer, and proposer info', async () => {
    try {
      actionprodlist =
          //there is only 3 bps on our local dev net, sp put these into the list of permissions in alpha order!!!
          //numbers come before the letter a in the ordering.
          //NOTE -- if you do get account on eosio.prods you will see the producer list for the net, this is the auth
          //         that must be met for msigs on the given FIO network....
          "{\"actor\":\"" + boot2account + "\",\"permission\":\"active\"}," +
          "{\"actor\":\"" + boot1account + "\",\"permission\":\"active\"}," +
          "{\"actor\":\"" + boot3account + "\",\"permission\":\"active\"}"
      ;

      console.log(" proposer account ",boot2account);

      //we pick the second boot node... any would work
      proposer = boot2account;

    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })


  it(`Run set contract on fio.request.obt and get output, note you must be sure to make a mod to fio.request.obt and rebuild contracts before running this test for this test to work.`, async () => {
    try {
      cmd = config.CLIO + " set contract -s -j -d " + contractAccount + " " + contractsFolder + "/" + contractName + " fio.request.obt.wasm fio.request.obt.abi --permission eosio.prods" + "@active" ;

      proposalAction = await runCmd(cmd);
      console.log(cmd);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Add 7 days (168 hours) to expire_date on the resulting tx`, async () => {
    try {
      currentDate = new Date();
      currentDate.setHours(currentDate.getHours() + 168);
      timeInISOString = currentDate.toISOString();
      newExpireDate = timeInISOString.substr(0, timeInISOString.length - 5);  // Chop off the trailing decimals
      proposalAction = JSON.parse(proposalAction);
      proposalAction.expiration = newExpireDate;
      proposalAction = JSON.stringify(proposalAction);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }

  })

  it('Get top 30 producers and put them into prodList string', async () => {
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'eosio',      // Contract that we target
        scope: 'eosio',         // Account that owns the data
        table: 'producers',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      result = await callFioApi("get_table_rows", json);

      // NOTE sorting code added without testing the it statement, so this is still needing verified to work properly.
      let sortlist = [];

      prodsTable = result.rows;

      console.log(prodsTable);

      for (let i = 0; i<result.rows.length; i++) {
        sortlist.push(prodsTable[i].owner);
      }
      sortlist.sort();


      prodList = "";
      prodCount = 0
      for (prod in sortlist) {
        if (prodCount != 0) { prodList = prodList + ',' }
        nextprod = '{"actor":"' + sortlist[prod] + '","permission":"active"}'
        prodList = prodList + nextprod
        prodCount++;
        if (prodCount==30) { break; }
      }
      console.log('prodList: ', prodList)

      actionprodlist = prodList;
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  let  proposalName;
  it(`Create msig to update contract`, async () => {
    try {

      let newfioacct = await newUser(faucet);
      //this is a hack. we just need a unique msig name, so we use an account name generated by the javascript API.
      proposalName= newfioacct.account;

      console.log("proposal name ",newfioacct.account);

      msigProposal = config.CLIO + " multisig propose_trx " + proposalName + " '[" + actionprodlist + "]'   400000000000   '"  + proposalAction + "' " + proposer;

      // console.log('msigProposal: ', msigProposal)

      proposalAction = await runCmd(msigProposal);

    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it('Output info', async () => {
    console.log('Proposer: ' + proposer);
    console.log('Proposal: ' + proposalName);
    console.log('\nReview: ./clio.sh multisig review ' + proposer +  " " + proposalName);
    console.log('\nTo approve:\n ./clio.sh multisig approve ' + proposer +  " proposalnameabove " + '{"actor": "APPROVER_ACC_NAME", "permission": "active"}' + "' " + "400000000 -p APPROVER_ACC_NAME");
    console.log('\nGet list approvals:\n ./clio.sh get table eosio.msig  ' + proposer +  " " + " approvals2 -L proposalnameabove -l 1");
  })

  it('Verify the proposal and its approvals in state', async () => {

    try {
      const json = {
        json: true,
        code: 'eosio.msig',
        scope: proposer,
        table: 'proposal',
        upper_bound   : proposalName,
        lower_bound   : proposalName,
        key_type      : 'name',
        index_position: 1,
        reverse: false,
        show_payer: false
      }

      let  proposal = await callFioApi("get_table_rows", json);
      console.log('check proposal is in the msig proposals');
      expect(proposal.rows[0].proposal_name).to.equal(proposalName);

      const json1 = {
        json: true,
        code: 'eosio.msig',
        scope: proposer,
        table: 'approvals2',
        upper_bound   : proposalName,
        lower_bound   : proposalName,
        key_type      : 'name',
        index_position: 1,
        reverse: false,
        show_payer: false
      }

      let  approvals = await callFioApi("get_table_rows", json1);
      console.log("approvals ",approvals);
      console.log('check approvals is empty');
      expect(approvals.rows[0].proposal_name).to.equal(proposalName);
      console.log("approvals ", approvals.rows[0].requested_approvals);
      expect(approvals.rows[0].provided_approvals.length).to.equal(0);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  it(`approve the msig.`, async () => {
    try {
      let approver1 = " '{\"actor\":\"qbxn5zhw2ypw\",\"permission\":\"active\"}'";

      // multisig approve hfdg2qumuvlc d2bu2ld11ya4 '{"actor":"qbxn5zhw2ypw","permission":"active"}' 400000000000 --permission qbxn5zhw2ypw@active
      let msigapproval1 = config.CLIO + " multisig approve " + proposer + " " + proposalName + approver1 + " 400000000000 --permission qbxn5zhw2ypw@active";


      let res1 = await runCmd(msigapproval1);

      let approver2 = " '{\"actor\":\"wttywsmdmfew\",\"permission\":\"active\"}'";

      // multisig approve hfdg2qumuvlc d2bu2ld11ya4 '{"actor":"wttywsmdmfew","permission":"active"}' 400000000000 --permission wttywsmdmfew@active
      let msigapproval2 = config.CLIO + " multisig approve " + proposer + " " + proposalName + approver2 + " 400000000000 --permission wttywsmdmfew@active";


      let res2 = await runCmd(msigapproval2);

      let approver3 = " '{\"actor\":\"hfdg2qumuvlc\",\"permission\":\"active\"}'";

      // multisig approve hfdg2qumuvlc d2bu2ld11ya4 '{"actor":"wttywsmdmfew","permission":"active"}' 400000000000 --permission wttywsmdmfew@active
      let msigapproval3 = config.CLIO + " multisig approve " + proposer + " " + proposalName + approver3 + " 400000000000 --permission hfdg2qumuvlc@active";


      let res3 = await runCmd(msigapproval3);

    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  // get the status. verify approved by two signers.
  it('Verify the proposal approvals in state', async () => {

    try {

      const json1 = {
        json: true,
        code: 'eosio.msig',
        scope: proposer,
        table: 'approvals2',
        upper_bound   : proposalName,
        lower_bound   : proposalName,
        key_type      : 'name',
        index_position: 1,
        reverse: false,
        show_payer: false
      }

      let  approvals = await callFioApi("get_table_rows", json1);
      console.log("approvals ",approvals);
      console.log('check approvals is empty');
      expect(approvals.rows[0].proposal_name).to.equal(proposalName);
      console.log("remaining requested approvals ", approvals.rows[0].requested_approvals);

      expect(approvals.rows[0].provided_approvals.length).to.equal(3);
      console.log("provided approvals ",approvals.rows[0].provided_approvals);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

  // execute the msig.

  it(`execute the msig.`, async () => {
    try {


      // multisig approve hfdg2qumuvlc d2bu2ld11ya4 '{"actor":"qbxn5zhw2ypw","permission":"active"}' 400000000000 --permission qbxn5zhw2ypw@active
      let msigexec = config.CLIO + " multisig exec " + proposer + " " + proposalName + " 400000000000 --permission qbxn5zhw2ypw@active";


      let res1 = await runCmd(msigexec);

    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it('Verify the proposal is gone from the proposals and approvals, also verify hashes of newly set contract on chain, check api node logs if hashes are not as expected', async () => {

    try {
      const json = {
        json: true,
        code: 'eosio.msig',
        scope: proposer,
        table: 'proposal',
        upper_bound   : proposalName,
        lower_bound   : proposalName,
        key_type      : 'name',
        index_position: 1,
        reverse: false,
        show_payer: false
      }

      let  proposal = await callFioApi("get_table_rows", json);
      console.log('check proposal is in the msig proposals');
      expect(proposal.rows.length).to.equal(0);

      const json1 = {
        json: true,
        code: 'eosio.msig',
        scope: proposer,
        table: 'approvals2',
        upper_bound   : proposalName,
        lower_bound   : proposalName,
        key_type      : 'name',
        index_position: 1,
        reverse: false,
        show_payer: false
      }

      let  approvals = await callFioApi("get_table_rows", json1);
      console.log("approvals ",approvals);
      console.log('check approvals is empty');
      expect(approvals.rows.length).to.equal(0);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
  })

})




describe.skip(`output devnet producer info`, () => {
  it(`visually verify info from dev net producers file`, async () => {
    console.log(" boot 1 ", boot1address, " ", boot1sdk.privateKey, " ", boot1sdk.publicKey, " ", boot1account,"\n");
    console.log(" boot 2 ", boot2address, " ", boot2sdk.privateKey, " ", boot2sdk.publicKey, " ", boot2account,"\n");
    console.log(" boot 3 ", boot3address, " ", boot3sdk.privateKey, " ", boot3sdk.publicKey, " ", boot3account,"\n");
    console.log(" boot 4 ", boot4address, " ", boot4sdk.privateKey, " ", boot4sdk.publicKey, " ", boot4account,"\n");

    console.log(" cluster A1 ", clusterA1address, " ", clusterA1sdk.privateKey, " ", clusterA1sdk.publicKey, " ", clusterA1account,"\n");
    console.log(" cluster A2 ", clusterA2address, " ", clusterA2sdk.privateKey, " ", clusterA2sdk.publicKey, " ", clusterA2account,"\n");
    console.log(" cluster A3 ", clusterA3address, " ", clusterA3sdk.privateKey, " ", clusterA3sdk.publicKey, " ", clusterA3account,"\n");
    console.log(" cluster A4 ", clusterA4address, " ", clusterA4sdk.privateKey, " ", clusterA4sdk.publicKey, " ", clusterA4account,"\n");
    console.log(" cluster A5 ", clusterA5address, " ", clusterA5sdk.privateKey, " ", clusterA5sdk.publicKey, " ", clusterA5account,"\n");
    console.log(" cluster A6 ", clusterA6address, " ", clusterA6sdk.privateKey, " ", clusterA6sdk.publicKey, " ", clusterA6account,"\n");

    console.log(" cluster B1 ", clusterB1address, " ", clusterB1sdk.privateKey, " ", clusterB1sdk.publicKey, " ", clusterB1account,"\n");
    console.log(" cluster B2 ", clusterB2address, " ", clusterB2sdk.privateKey, " ", clusterB2sdk.publicKey, " ", clusterB2account,"\n");
    console.log(" cluster B3 ", clusterB3address, " ", clusterB3sdk.privateKey, " ", clusterB3sdk.publicKey, " ", clusterB3account,"\n");
    console.log(" cluster B4 ", clusterB4address, " ", clusterB4sdk.privateKey, " ", clusterB4sdk.publicKey, " ", clusterB4account,"\n");
    console.log(" cluster B5 ", clusterB5address, " ", clusterB5sdk.privateKey, " ", clusterB5sdk.publicKey, " ", clusterB5account,"\n");
    console.log(" cluster B6 ", clusterB6address, " ", clusterB6sdk.privateKey, " ", clusterB6sdk.publicKey, " ", clusterB6account,"\n");

    console.log(" cluster C1 ", clusterC1address, " ", clusterC1sdk.privateKey, " ", clusterC1sdk.publicKey, " ", clusterC1account,"\n");
    console.log(" cluster C2 ", clusterC2address, " ", clusterC2sdk.privateKey, " ", clusterC2sdk.publicKey, " ", clusterC2account,"\n");
    console.log(" cluster C3 ", clusterC3address, " ", clusterC3sdk.privateKey, " ", clusterC3sdk.publicKey, " ", clusterC3account,"\n");
    console.log(" cluster C4 ", clusterC4address, " ", clusterC4sdk.privateKey, " ", clusterC4sdk.publicKey, " ", clusterC4account,"\n");
    console.log(" cluster C5 ", clusterC5address, " ", clusterC5sdk.privateKey, " ", clusterC5sdk.publicKey, " ", clusterC5account,"\n");
    console.log(" cluster C6 ", clusterC6address, " ", clusterC6sdk.privateKey, " ", clusterC6sdk.publicKey, " ", clusterC6account,"\n");

  })
})


describe.skip('This action is for dev of testing steps only....', () => {

    // bp1 devtools
  let proposalAction;

  contractAccount = "fio.reqobt"
  contractName = "fio.request.obt"

  it.skip('Get top 30 producers and put them into prodList string', async () => {
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'eosio',      // Contract that we target
        scope: 'eosio',         // Account that owns the data
        table: 'producers',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      result = await callFioApi("get_table_rows", json);

      // NOTE sorting code added without testing the it statement, so this is still needing verified to work properly.
      let sortlist = [];

      prodsTable = result.rows;

      for (prod in prodsTable) {
        sortlist.push(prod);
      }
      sortlist.sort;


      prodList = "";
      prodCount = 0
      for (prod in sortlist) {
        if (prodCount != 0) { prodList = prodList + ',' }
        nextprod = '{"actor":"' + prodsTable[prod].owner + '","permission":"active"}'
        prodList = prodList + nextprod
        prodCount++;
        if (prodCount==30) { break; }
      }
      //console.log('prodList: ', prodList)
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it.skip(`set up auth for msig participant accounts, use only for testing MSIG on non-producer accounts`, async () => {
    try {

      //NOTE auth account order in permission must be in aphabetical order, accounts starting with numbers then a-z as the order
      cmd = config.CLIO + " push action eosio updateauth '{\"account\": \"qbxn5zhw2ypw\",\"max_fee\":400000000000, \"permission\": \"active\",  \"parent\": \"owner\",  \"auth\": { \"threshold\": 3, \"keys\": [], \"waits\": [], \"accounts\":[{\"permission\":{\"actor\":\"3ddowwxs11ss\",\"permission\":\"active\"},\"weight\":1},{\"permission\":{\"actor\":\"hfdg2qumuvlc\",\"permission\":\"active\"},\"weight\":1},{\"permission\":{\"actor\":\"wttywsmdmfew\",\"permission\":\"active\"},\"weight\":1}] } } ' -p qbxn5zhw2ypw@active";
      // cmd = config.CLIO + " set contract -s -j -d " + contractAccount + " " + contractsFolder + "/" + contractName + " fio.request.obt.wasm fio.request.obt.abi --permission fio.reqobt@active" ;
      //cmd = config.CLIO  + " push action -s -j -d fio.token trnsfiopubky '{\"payee_public_key\": \"'FIO6ruJ5qLeaa6VtYVpkcU4AeWVaL2QvViyQqjxjpAWYRFsYaSbBN'\", \"amount\": 1000000000, \"max_fee\": \"40000000000\", \"actor\": \"qbxn5zhw2ypw\",\"tpid\":\"\"}' -p qbxn5zhw2ypw@active" ;



      proposalAction = await runCmd(cmd);
      console.log(cmd);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Run set contract and get output, note you must be sure to make a mod to fio.request.obt and rebuild contracts before running this test for this test to work.`, async () => {
    try {
     cmd = config.CLIO + " set contract -s -j -d " + contractAccount + " " + contractsFolder + "/" + contractName + " fio.request.obt.wasm fio.request.obt.abi --permission eosio.prods@active" ;
    //  cmd = config.CLIO  + " push action -s -j -d fio.token trnsfiopubky '{\"payee_public_key\": \"'FIO6ruJ5qLeaa6VtYVpkcU4AeWVaL2QvViyQqjxjpAWYRFsYaSbBN'\", \"amount\": 1000000000, \"max_fee\": \"40000000000\", \"actor\": \"qbxn5zhw2ypw\",\"tpid\":\"\"}' -p qbxn5zhw2ypw@active" ;

      proposalAction = await runCmd(cmd);
         console.log(cmd);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Add 7 days (168 hours) to expire_date`, async () => {
    try {
      currentDate = new Date();
      currentDate.setHours(currentDate.getHours() + 168);
      timeInISOString = currentDate.toISOString();
      newExpireDate = timeInISOString.substr(0, timeInISOString.length - 5);  // Chop off the trailing decimals
      proposalAction = JSON.parse(proposalAction);
      proposalAction.expiration = newExpireDate;
      proposalAction = JSON.stringify(proposalAction);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }

  })

  it('Get top 30 producers and put them into prodList string', async () => {
    try {
      const json = {
        json: true,               // Get the response as json
        code: 'eosio',      // Contract that we target
        scope: 'eosio',         // Account that owns the data
        table: 'producers',        // Table name
        limit: 1000,                // Maximum number of rows that we want to get
        reverse: false,           // Optional: Get reversed data
        show_payer: false          // Optional: Show ram payer
      }
      result = await callFioApi("get_table_rows", json);

      // NOTE sorting code added without testing the it statement, so this is still needing verified to work properly.
      let sortlist = [];

      prodsTable = result.rows;

      for (prod in prodsTable) {
        sortlist.push(prod);
      }
      sortlist.sort;


      prodList = "";
      prodCount = 0
      for (prod in sortlist) {
        if (prodCount != 0) { prodList = prodList + ',' }
        nextprod = '{"actor":"' + prodsTable[prod].owner + '","permission":"active"}'
        prodList = prodList + nextprod
        prodCount++;
        if (prodCount==30) { break; }
      }
      console.log('prodList: ', prodList)

      actionprodlist = prodList;
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  let  proposalName;
  it(`Create msig`, async () => {
    try {

      let newfioacct = await newUser(faucet);
      proposalName= newfioacct.account;

      console.log("proposal name ",newfioacct.account);

    msigProposal = config.CLIO + " multisig propose_trx " + proposalName + " '[" + actionprodlist + "]'   400000000000   '"  + proposalAction + "' " + proposer;

      console.log('msigProposal: ', msigProposal)

      proposalAction = await runCmd(msigProposal);

  } catch (err) {
    console.log('Error: ', err);
    expect(err).to.equal(null);
  }
  })


  it('Output info', async () => {
    console.log('Proposer: ' + proposer);
    console.log('Proposal: ' + proposalName);
    console.log('\nReview: ./clio.sh multisig review ' + proposer +  " " + proposalName);
    console.log('\nTo approve:\n ./clio.sh multisig approve ' + proposer +  " proposalnameabove " + '{"actor": "APPROVER_ACC_NAME", "permission": "active"}' + "' " + "400000000 -p APPROVER_ACC_NAME");
    console.log('\nGet list approvals:\n ./clio.sh get table eosio.msig  ' + proposer +  " " + " approvals2 -L proposalnameabove -l 1");
  })

  it('Verify the proposal and its approvals in state', async () => {

    try {
      const json = {
        json: true,
        code: 'eosio.msig',
        scope: proposalName,
        table: proposal,
        limit: 1000,
        reverse: false,
        show_payer: false
      }

      proposal = await callFioApi("get_table_rows", json);
      console.log('proposal: ', proposal);
      expect(proposal.proposal_name).to.equal(proposalName);

    } catch (err) {
      console.log('Error', err);
      expect(err).to.equal(null);
    }
     })



  /*
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
          if (voters.rows[voter].owner == bp1.account) {
            inVotersTable = true;
            console.log('voters.rows[voter].last_vote_weight: ', voters.rows[voter]);
            //console.log('voters.rows[voter].is_auto_proxy: ', voters.rows[voter].is_auto_proxy);
            //console.log('voters.rows[voter].proxy: ', voters.rows[voter].proxy);
            break;
          }
        }
      } catch (err) {
        console.log('Error', err);
        expect(err).to.equal(null);
      }
   */

})







describe.skip('three node local net, Create BP setcode msig, approve and execute on 3 node local dev net.', () => {

  // bp1 devtools
  let proposalAction;

  contractAccount = "fio.reqobt"
  contractName = "fio.request.obt"

  it('set up MSIG producer, and proposer info', async () => {
    try {
      actionprodlist =
          //there is only 3 bps on our local dev net, sp put these into the list of permissions in alpha order!!!
          //numbers come before the letter a in the ordering.
          //NOTE -- if you do get account on eosio.prods you will see the producer list for the net, this is the auth
          //         that must be met for msigs on the given FIO network....
          "{\"actor\":\"" + boot2account + "\",\"permission\":\"active\"}," +
          "{\"actor\":\"" + boot1account + "\",\"permission\":\"active\"}," +
          "{\"actor\":\"" + boot3account + "\",\"permission\":\"active\"}"
      ;

      console.log(" proposer account ",boot2account);

      //we pick the second boot node... any would work
      proposer = boot2account;

    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it(`Run set contract on fio.request.obt and get output, note you must be sure to make a mod to fio.request.obt and rebuild contracts before running this test for this test to work.`, async () => {
    try {
      cmd = config.CLIO + " set contract -s -j -d " + contractAccount + " " + contractsFolder + "/" + contractName + " fio.request.obt.wasm fio.request.obt.abi --permission eosio.prods@active" ;

      proposalAction = await runCmd(cmd);
      console.log(cmd);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })


  it(`Run set contract on fio.request.obt and get output, note you must be sure to make a mod to fio.request.obt and rebuild contracts before running this test for this test to work.`, async () => {
    try {
      cmd = config.CLIO + " set contract -j " + contractAccount + " " + contractsFolder + "/" + contractName + " fio.request.obt.wasm fio.request.obt.abi --permission eosio.prods@active" ;

      proposalAction = await runCmd(cmd);
      console.log(cmd);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })



})

