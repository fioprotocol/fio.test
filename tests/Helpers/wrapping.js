const {callFioApi, getAccountFromKey, callFioApiSigned} = require("../../utils");
const config = require("../../config");

async function getOracleRecords (account = null) {
  let json = {
    json: true,
    code: 'fio.oracle',
    scope: 'fio.oracle',
    table: 'oracless',
    reverse: true,
    limit: 1000
  };
  try {
    if (account !== null) {
      json['lower_bound'] = account;
      json['upper_bound'] = account;
    }
    return callFioApi("get_table_rows", json);
  } catch (err) {
    throw err;
  }
}

async function registerNewBp (account) {
  try {
    return  account.sdk.genericAction('pushTransaction', {
      action: 'regproducer',
      account: 'eosio',
      data: {
        fio_address: account.address,
        fio_pub_key: account.publicKey,
        url: "https://mywebsite.io/",
        location: 80,
        actor: account.account,
        max_fee: config.api.register_producer.fee
      }
    });
  } catch (err) {
    console.log('Error: ', err.json);
    throw err;
  }
}

async function registerNewOracle (account) {
  try {
    return account.sdk.genericAction('pushTransaction', {
      action: 'regoracle',
      account: 'fio.oracle',
      actor: 'eosio',
      data: {
        oracle_actor: account.account,
        actor: account.account
      }
    });
  } catch (err) {
    console.log('Error: ', err.json);
    throw err;
  }
}

async function setTestOracleFees (account, domainFeeAmt, tokenFeeAmt) {
  try {
    return account.sdk.genericAction('pushTransaction', {
      action: 'setoraclefee',
      account: 'fio.oracle',
      actor: 'eosio',
      data: {
        wrap_fio_domain: domainFeeAmt,
        wrap_fio_tokens: tokenFeeAmt
      }
    });
  } catch (err) {
    console.log('Error: ', err.json);
    throw err;
  }
}

async function setupWFIOontract (ethersObj, supply) {
  let [owner, ...accounts] = await ethersObj.getSigners();
  let custodians = [];
  for (let i = 1; i < 11; i++) {
    custodians.push(accounts[i].address);
  }
  let factory = await ethersObj.getContractFactory('WFIO', owner);
  let wfio = await factory.deploy(supply, custodians);
  await wfio.deployTransaction.wait();
  return [accounts, wfio];
}

async function setupFIONFTcontract (ethersObj) {
  let [owner, ...accounts] = await ethersObj.getSigners();
  let custodians = [];
  for (let i = 1; i < 11; i++) {
    custodians.push(accounts[i].address);
  }
  let factory = await ethersObj.getContractFactory('FIONFT', owner);
  let fioNft = await factory.deploy(custodians);
  await fioNft.deployed();
  return [accounts, fioNft];
}

async function registerWfioOracles (wfio, accounts) {
  // register 3 oracles for testing
  await wfio.connect(accounts[1]).regoracle(accounts[12].address);
  await wfio.connect(accounts[2]).regoracle(accounts[12].address);
  await wfio.connect(accounts[3]).regoracle(accounts[12].address);
  await wfio.connect(accounts[4]).regoracle(accounts[12].address);
  await wfio.connect(accounts[5]).regoracle(accounts[12].address);
  await wfio.connect(accounts[6]).regoracle(accounts[12].address);
  await wfio.connect(accounts[7]).regoracle(accounts[12].address);
  await wfio.connect(accounts[1]).regoracle(accounts[13].address);
  await wfio.connect(accounts[2]).regoracle(accounts[13].address);
  await wfio.connect(accounts[3]).regoracle(accounts[13].address);
  await wfio.connect(accounts[4]).regoracle(accounts[13].address);
  await wfio.connect(accounts[5]).regoracle(accounts[13].address);
  await wfio.connect(accounts[6]).regoracle(accounts[13].address);
  await wfio.connect(accounts[7]).regoracle(accounts[13].address);
  await wfio.connect(accounts[1]).regoracle(accounts[14].address);
  await wfio.connect(accounts[2]).regoracle(accounts[14].address);
  await wfio.connect(accounts[3]).regoracle(accounts[14].address);
  await wfio.connect(accounts[4]).regoracle(accounts[14].address);
  await wfio.connect(accounts[5]).regoracle(accounts[14].address);
  await wfio.connect(accounts[6]).regoracle(accounts[14].address);
  await wfio.connect(accounts[7]).regoracle(accounts[14].address);
}

async function registerFioNftOracles (fioNft, accounts) {

}

async function cleanUpOraclessTable (faucetAcct, originals = false) {
  try {
    const fAcct = await getAccountFromKey(faucetAcct.publicKey);
    const oracleRecords = await getOracleRecords();
    for (let row in oracleRecords.rows) {
      row = oracleRecords.rows[row]
      // hardcode the exclusion of default bp accounts
      if (!originals) {
        if (row.actor === 'qbxn5zhw2ypw' || row.actor === 'hfdg2qumuvlc' || row.actor === 'wttywsmdmfew')
          continue
      }
      let result = await callFioApiSigned('push_transaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: fAcct,
        privKey: faucetAcct.privateKey,
        data: {
          oracle_actor: row.actor,
          actor: fAcct
        }
      });
      console.log("deleted: ", row, result);
    }
  } catch (err) {
    throw err;
  }
}

module.exports = {
  getOracleRecords,
  registerNewBp,
  registerWfioOracles,
  registerNewOracle,
  setTestOracleFees,
  setupWFIOontract,
  setupFIONFTcontract,
  cleanUpOraclessTable
}
