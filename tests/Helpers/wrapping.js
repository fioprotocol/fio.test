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
  return [owner, accounts, wfio];
}

async function setupFIONFTcontract (ethersObj) {
  let [owner, ...accounts] = await ethersObj.getSigners();
  let custodians = [];
  for (let i = 1; i < 11; i++) {
    custodians.push(accounts[i].address);
  }
  let factory = await ethersObj.getContractFactory('FIONFT', owner);
  let fioNft = await factory.deploy(custodians);
  await fioNft.deployTransaction.wait();
  return [owner, accounts, fioNft];
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
  // register 3 oracles for testing
  await fioNft.connect(accounts[1]).regoracle(accounts[12].address);
  await fioNft.connect(accounts[2]).regoracle(accounts[12].address);
  await fioNft.connect(accounts[3]).regoracle(accounts[12].address);
  await fioNft.connect(accounts[4]).regoracle(accounts[12].address);
  await fioNft.connect(accounts[5]).regoracle(accounts[12].address);
  await fioNft.connect(accounts[6]).regoracle(accounts[12].address);
  await fioNft.connect(accounts[7]).regoracle(accounts[12].address);
  await fioNft.connect(accounts[1]).regoracle(accounts[13].address);
  await fioNft.connect(accounts[2]).regoracle(accounts[13].address);
  await fioNft.connect(accounts[3]).regoracle(accounts[13].address);
  await fioNft.connect(accounts[4]).regoracle(accounts[13].address);
  await fioNft.connect(accounts[5]).regoracle(accounts[13].address);
  await fioNft.connect(accounts[6]).regoracle(accounts[13].address);
  await fioNft.connect(accounts[7]).regoracle(accounts[13].address);
  await fioNft.connect(accounts[1]).regoracle(accounts[14].address);
  await fioNft.connect(accounts[2]).regoracle(accounts[14].address);
  await fioNft.connect(accounts[3]).regoracle(accounts[14].address);
  await fioNft.connect(accounts[4]).regoracle(accounts[14].address);
  await fioNft.connect(accounts[5]).regoracle(accounts[14].address);
  await fioNft.connect(accounts[6]).regoracle(accounts[14].address);
  await fioNft.connect(accounts[7]).regoracle(accounts[14].address);
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

async function calculateOracleFee(feeType = 'token') {
  if (feeType !== 'token' && feeType !== 'domain') throw new Error('unknown feeType');
  const oracleRecords = await getOracleRecords();
  let totalFee = 0, medianFee = 0;
  let fees = [];
  for (let row in oracleRecords.rows) {
    let _fee;
    if (feeType === 'domain') {
      _fee = oracleRecords.rows[row].fees[0].fee_amount;
      totalFee += _fee;
      fees.push(_fee);
    }
    else if (feeType === 'token') {
      _fee = oracleRecords.rows[row].fees[1].fee_amount;
      totalFee += _fee;
      fees.push(_fee);
    }
  }
  // medianFee = median(fees);
  // const rezzz = medianFee * oracleRecords.rows.length;
  let rezzz;
  fees.sort((a, b) => {
    return a - b;
  });
  let half = Math.floor(fees.length / 2);
  if (fees.length % 2)
    rezzz = fees[half];
  else
    rezzz = (fees[half -1] + fees[half]) / 2.0;
  return rezzz * oracleRecords.rows.length;
}

async function getOracleVotes(account = null) {
  let json = {
    json: true,
    code: 'fio.oracle',
    scope: 'fio.oracle',
    table: 'oravotes',
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

module.exports = {
  getOracleRecords,
  registerNewBp,
  registerWfioOracles,
  registerNewOracle,
  setTestOracleFees,
  setupWFIOontract,
  setupFIONFTcontract,
  registerFioNftOracles,
  cleanUpOraclessTable,
  calculateOracleFee,
  getOracleVotes
}
