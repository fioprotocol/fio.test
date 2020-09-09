require('mocha')
const {expect} = require('chai')
const {callFioApi, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/FIOSDK');
config = require('../config.js');
const exec = require('child_process').exec;

//const proposer='5du5xkgkki5x'  // Bohdan testnet
const proposer='qbxn5zhw2ypw' // bp1 devtools
const proposalName='erictest'
const contractsFolder = '/Users/ericbutz/git/fio/fio.contracts/build/contracts'

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

describe('Create BP setcode msig', () => {

  let prodList, clioSetContract

  contractAccount = "fio.reqobt"
  contractName = "fio.request.obt"

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
      prodsTable = result.rows;
      prodList = "";
      prodCount = 0
      for (prod in prodsTable) { 
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

  it.skip(`Run set contract and get output`, async () => {
    try {
      cmd = config.CLIO + " set contract -s -j -d " + contractAccount + " " + contractsFolder + "/" + contractName + " -p " + contractAccount;
      proposalAction = await runCmd(cmd);
    } catch (err) {
      console.log('Error: ', err);
      expect(err).to.equal(null);
    }
  })

  it.skip(`Add 7 days (168 hours) to expire_date`, async () => {
    currentDate = new Date();
    currentDate.setHours( currentDate.getHours() + 168 );
    timeInISOString = currentDate.toISOString();
    newExpireDate = timeInISOString.substr(0, timeInISOString.length - 5);  // Chop off the trailing decimals
    proposalAction = JSON.parse(proposalAction);
    proposalAction.expiration = newExpireDate;
    proposalAction = JSON.stringify(proposalAction);
  })

  it(`createfee`, async () => {
    const endPoint = 'auth_link';
    type = '0';
    sufAmount = '1000000000';

    proposalAction = " push action -j fio.fee createfee " + "'" + '{"end_point":"' + endPoint + '","type":"' + type + '","suf_amount":"' + sufAmount + '}' + "'";
  })

  it(`Create msig`, async () => {
    const proposerPermission = '{"actor":"' + proposer + '","permission":"active"}'
    msigProposal = config.CLIO + " multisig propose_trx " + proposalName + " '[" + prodList + "]' " + "'[" + proposerPermission + "]' 0 " + proposalAction + " -p " + proposer + " " + proposer + "@active"
    console.log('msigProposal: ', msigProposal)
  })

  it('Output info', async () => {
  console.log('Proposer: ' + proposer);
  console.log('Proposal: ' + proposalName);
  console.log('\nReview: ./clio.sh multisig review ' + proposer +  " " + proposalName);
  console.log('\nTo approve:\n ./clio.sh multisig approve ' + proposer +  " " + proposalName + " '" + '{"actor": "APPROVER_ACC_NAME", "permission": "active"}' + "' " + "400000000 -p APPROVER_ACC_NAME");
  console.log('\nGet list approvals:\n ./clio.sh get table eosio.msig  ' + proposer +  " " + " approvals2 -L " + proposalName + " -l 1");
  })

})
