const hre = require("hardhat");
const ethers = hre.ethers;
require("@nomiclabs/hardhat-ethers");
require("mocha");
const {expect} = require("chai");
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {
  newUser,
  fetchJson,
  existingUser,
  callFioApi,
  callFioApiSigned,
  getAccountFromKey,
  randStr
} = require("../utils.js");
const {
  getOracleRecords,
  registerNewBp,
  registerNewOracle,
  setTestOracleFees,
  setupFIONFTcontract,
  registerFioNftOracles,
  cleanUpOraclessTable,
  calculateOracleFeeFromOraclessTable
} = require("./Helpers/wrapping");
let faucet;

/**
 * INSTRUCTIONS TO SET UP THESE TESTS
 *
 * 1) In fio.oracle.cpp, comment out the SYSTEMACCOUNT authentication in the regoracle and unregoracle methods
 *
 * e.g.
 * // require_auth(SYSTEMACCOUNT);
 *
 */

before(async function () {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
});

after(async function () {
  try{
    console.log("          cleaning up...");
    const fAcct = await getAccountFromKey(faucet.publicKey);
    const oracleRecords = await getOracleRecords();
    for (let row in oracleRecords.rows) {
      row = oracleRecords.rows[row]
      // hardcode the exclusion of default bp accounts
      if (row.actor === 'qbxn5zhw2ypw' || row.actor === 'hfdg2qumuvlc' || row.actor === 'wttywsmdmfew')
        continue
      let result = await callFioApiSigned('push_transaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: fAcct,
        privKey: faucet.privateKey,
        data: {
          oracle_actor: row.actor,
          actor: fAcct
        }
      });
      //console.log("deleted: ", row, result);
    }
  } catch (err){
    throw err;
  }
});

describe(`************************** fio-domain-wrapping-api.js ************************** \n   A. [FIO] Oracles (get_table_rows)`, function () {
  let userA, oracle1, oracle2, oracle3;

  before(async function () {
    oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    userA = await newUser(faucet);
  });

  it(`userA registers existing oracle1`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: userA.account,
        privKey: userA.privateKey,
        data: {
          oracle_actor: oracle1.account,
          actor: oracle1.account
        }
      });
      if (result.code === 500) {
        expect(result.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
      } else {
        expect(result).to.have.all.keys('transaction_id', 'processed');
      }
    } catch (err) {
      throw err;
    }
  });
  it(`userA registers existing oracle2`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: userA.account,
        privKey: userA.privateKey,
        data: {
          oracle_actor: oracle2.account,
          actor: oracle2.account
        }
      });
      if (result.code === 500) {
        expect(result.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
      } else {
        expect(result).to.have.all.keys('transaction_id', 'processed');
      }
    } catch (err) {
      throw err;
    }
  });
  it(`userA registers existing oracle3`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: userA.account,
        privKey: userA.privateKey,
        data: {
          oracle_actor: oracle3.account,
          actor: oracle3.account
        }
      });
      if (result.code === 500) {
        expect(result.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
      } else {
        expect(result).to.have.all.keys('transaction_id', 'processed');
      }
    } catch (err) {
      throw err;
    }
  });

  it(`userA queries the oracless table, expects results to contain oracle1`, async function () {
    try {
      const oracleRecords = await getOracleRecords();
      expect(oracleRecords.rows.length).to.be.greaterThanOrEqual(3);
      let existingOracles = [];
      for (let row in oracleRecords.rows) {
        row = oracleRecords.rows[row]
        if (row.actor === oracle1.account || row.actor === oracle2.account || row.actor === oracle3.account) {
          expect(row).to.have.all.keys('actor', 'fees');
          existingOracles.push(row);
        }
      }
      expect(existingOracles.length).to.equal(3);
    } catch (err) {
      throw err;
    }
  });
});

describe(`** ORACLE TABLE CLEANUP **`, async function () {
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

describe(`B. [FIO][api] Wrap FIO domains`, function () {

  let oracle1, oracle2, oracle3, newOracle1, newOracle2, newOracle3,
      user1, user2, user3, user4, user5, user6, user7, user8,
      custodians, factory, owner,
      OBT_ID, ORACLE_FEE, WRAP_FEE;

  let fioNft = {
    address: '0xpolygonaddress' + randStr(20)
  };

  before(async function () {
    // oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    // oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');

    // test users
    oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    user4 = await newUser(faucet);
    user5 = await newUser(faucet);
    user6 = await newUser(faucet);
    user7 = await newUser(faucet);
    user8 = await newUser(faucet);
    newOracle1 = await newUser(faucet);
    newOracle2 = await newUser(faucet);
    newOracle3 = await newUser(faucet);

    // register new oracles as bps
    await registerNewBp(newOracle1);
    await registerNewBp(newOracle2);
    await registerNewBp(newOracle3);

    // await newOracles
    await registerNewOracle(newOracle1);
    await registerNewOracle(newOracle2);
    await registerNewOracle(newOracle3);

    // set oracle fees
    //await setTestOracleFees(oracle1, 11000000000, 11000000000);
    await setTestOracleFees(newOracle1, 11000000000, 11000000000);
    await setTestOracleFees(newOracle2, 11000000000, 11000000000);
    await setTestOracleFees(newOracle3, 11000000000, 11000000000);

    await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: 10000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
  });

  it(`query the oracless table, expects the three original new records`, async function () {
    try {
      let origOracles = [];
      const oracleRecords = await getOracleRecords();
      for (let row in oracleRecords.rows) {
        row = oracleRecords.rows[row]
        if (row.actor === 'qbxn5zhw2ypw' || row.actor === 'hfdg2qumuvlc' || row.actor === 'wttywsmdmfew') {
          expect(row).to.have.all.keys('actor', 'fees');
          origOracles.push(row);
        }
      }
      expect(origOracles.length).to.equal(0);
    } catch (err) {
      throw err;
    }
  });

  it(`get the oracle fee from the API`, async function () {
    let result = await callFioApi('get_oracle_fees', {});

    if (result.oracle_fees[0].fee_name === 'wrap_fio_domain')
      ORACLE_FEE = result.oracle_fees[0].fee_amount;
    else
      ORACLE_FEE = result.oracle_fees[1].fee_amount;
    let median_fee = await calculateOracleFeeFromOraclessTable('domain');
    expect(ORACLE_FEE).to.equal(median_fee);
  });

  it(`get wrap fee`, async function () {
    let result = await callFioApi('get_fee', {
      end_point: "wrap_fio_domain",
      fio_address: oracle1.address //"vote1@dapixdev"
    });
    WRAP_FEE = result.fee;
  });

  it(`try to wrap a FIO domain, expect OK`, async function () {
    let domain = user1.domain;
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: ORACLE_FEE,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].act.data.fio_domain).to.equal(domain);
      expect(result.processed.action_traces[0].act.data.public_address).to.equal(fioNft.address);
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK","oracle_fee_collected":"${ORACLE_FEE}","fee_collected":${WRAP_FEE}}`);
    } catch (err) {
      throw err;
    }
  });

  // unhappy tests
 
  it(`(actor and domain owner mismatch) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: ORACLE_FEE,
          max_fee: config.maxFee,
          tpid: "",
          actor: newOracle1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.fields[0].name).to.equal('fio_domain');
      expect(result.fields[0].value).to.equal(domain);
      expect(result.fields[0].error).to.equal('Actor and domain owner mismatch.');
    } catch (err) {
      throw err;
    }
  });

  it(`(empty chain_code) try to wrap a FIO domain`, async function () {
    let domain = user2.domain;
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_domain: domain,
          chain_code: "",
          public_address: fioNft.address,
          max_oracle_fee: ORACLE_FEE,
          max_fee: config.maxFee,
          tpid: "",
          actor: user2.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.fields[0].name).to.equal('chain_code');
      expect(result.fields[0].value).to.equal('');
      expect(result.fields[0].error).to.equal('Invalid chain code format');
    } catch (err) {
      throw err;
    }
  });

  it(`(missing chain_code) try to wrap a FIO domain`, async function () {
    let domain = user2.domain;
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_domain: domain,
          public_address: fioNft.address,
          max_oracle_fee: ORACLE_FEE,
          max_fee: config.maxFee,
          tpid: "",
          actor: user2.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing wrapdomain.chain_code (type=string)');
    }
  });

  it(`(negative max_oracle_fee) try to wrap a FIO domain`, async function () {
    let domain = user7.domain;
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        actor: user7.account,
        privKey: user7.privateKey,
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: -config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user7.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.fields[0].error).to.equal('Invalid oracle fee value');
    } catch (err) {
      throw err;
    }
  });

  it(`(empty max_fee) try to wrap a FIO domain`, async function () {
    let domain = user2.domain;
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: ORACLE_FEE,
          max_fee: "",
          tpid: "",
          actor: user2.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.fields[0].name).to.equal('max_fee');
      expect(result.fields[0].value).to.equal('0');
      // because supplied maximum empty string becomes 0 // ('Invalid fee value');
      expect(result.fields[0].error).to.equal('Fee exceeds supplied maximum.');
    } catch (err) {
      throw err;
    }
  });

  it(`(negative max_fee) try to wrap a FIO domain`, async function () {
    let domain = user8.domain;
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        actor: user8.account,
        privKey: user8.privateKey,
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: ORACLE_FEE,
          max_fee: -config.maxFee,
          tpid: "",
          actor: user8.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.fields[0].name).to.equal('max_fee');
      expect(result.fields[0].value).to.equal(`${-config.maxFee}`);
      expect(result.fields[0].error).to.equal('Invalid fee value');
    } catch (err) {
      throw err;
    }
  });

  it(`(negative chain_code) try to wrap a FIO domain`, async function () {
    let domain = user2.domain;
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_domain: domain,
          chain_code: -12345,
          public_address: fioNft.address,
          max_oracle_fee: ORACLE_FEE,
          max_fee: config.maxFee,
          tpid: "",
          actor: user2.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.fields[0].name).to.equal('chain_code');
      expect(result.fields[0].value).to.equal('-12345');
      expect(result.fields[0].error).to.equal('Invalid chain code format');
    } catch (err) {
      throw err;
    }
  });

  it(`(invalid chain_code) try to wrap a FIO domain`, async function () {
    let domain = user2.domain;
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_domain: domain,
          chain_code: "!invalid@$",
          public_address: fioNft.address,
          max_oracle_fee: ORACLE_FEE,
          max_fee: config.maxFee,
          tpid: "",
          actor: user2.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.fields[0].name).to.equal('chain_code');
      expect(result.fields[0].value).to.equal('!invalid@$');
      expect(result.fields[0].error).to.equal('Invalid chain code format');
    } catch (err) {
      throw err;
    }
  });

  it(`(empty max_oracle_fee) try to wrap a FIO domain`, async function () {
    let domain = user2.domain;
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: "",
          max_fee: config.maxFee,
          tpid: "",
          actor: user2.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.fields[0].name).to.equal('max_oracle_fee');
      expect(result.fields[0].value).to.equal('0');
      expect(result.fields[0].error).to.equal('Invalid oracle fee value');
    } catch (err) {
      throw err;
    }
  });

  it(`(missing tpid) try to wrap a FIO domain`, async function () {
    let domain = user2.domain;
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: ORACLE_FEE,
          max_fee: config.maxFee,
          actor: user2.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing wrapdomain.tpid (type=string)');
    }
  });

  it(`(empty actor) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: ORACLE_FEE,
          max_fee: config.maxFee,
          tpid: "",
          actor: ""
        }
      });
      expect(result.error.details[0].message).to.equal('missing authority of ');
    } catch (err) {
      throw err;
    }
  });
});

describe(`** ORACLE TABLE CLEANUP **`, async function () {
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

describe(`C. [FIO][api] Unwrap FIO domains`, function () {

  let wrapAmt = 1000000000000;
  let //oracle1, oracle2, oracle3,
    user1, newOracle1, newOracle2, newOracle3,
    user2,
    user3,
    user4;

  let OBT_ID, ORACLE_FEE, WRAP_FEE;

  let fioNft = {
    address: '0xpolygonaddress' + randStr(20)
  };

  before(async function () {
    // oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    // oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');

    // test users
    // oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    user4 = await newUser(faucet);
    newOracle1 = await newUser(faucet);
    newOracle2 = await newUser(faucet);
    newOracle3 = await newUser(faucet);

    // register new oracles as bps
    await registerNewBp(newOracle1);
    await registerNewBp(newOracle2);
    await registerNewBp(newOracle3);

    // await newOracles
    await registerNewOracle(newOracle1);
    await registerNewOracle(newOracle2);
    await registerNewOracle(newOracle3);

    // set oracle fees
    //await setTestOracleFees(oracle1, 11000000000, 11000000000);
    await setTestOracleFees(newOracle1, 11000000000, 11000000000);
    await setTestOracleFees(newOracle2, 11000000000, 11000000000);
    await setTestOracleFees(newOracle3, 11000000000, 11000000000);

    await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: 10000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    let feeObj = await callFioApi('get_oracle_fees', {});
    if (feeObj.oracle_fees[0].fee_name === 'wrap_fio_domain')
      ORACLE_FEE = feeObj.oracle_fees[0].fee_amount;
    else
      ORACLE_FEE = feeObj.oracle_fees[1].fee_amount;

    let result = await callFioApi('get_fee', {
      end_point: "wrap_fio_domain",
      fio_address: newOracle1.address //"vote1@dapixdev"
    });
    WRAP_FEE = result.fee;

    OBT_ID = `0x${randStr(64)}`

    let domain1 = user1.domain;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain1,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "", //oracle1.address,
          actor: user1.account
        }
      });
      expect(result).to.have.all.keys('block_num', 'transaction_id', 'status', 'oracle_fee_collected', 'fee_collected');
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(WRAP_FEE);
      expect(parseInt(result.oracle_fee_collected)).to.equal(ORACLE_FEE);
    } catch (err) {
      throw err;
    }

    let domain2 = user2.domain;
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain2,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "", //oracle1.address,
          actor: user2.account
        }
      });
      expect(result).to.have.all.keys('block_num', 'transaction_id', 'status', 'oracle_fee_collected', 'fee_collected');
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(WRAP_FEE);
      expect(parseInt(result.oracle_fee_collected)).to.equal(ORACLE_FEE);
    } catch (err) {
      throw err;
    }
  });

  // happy tests
  it(`first oracle: try to unwrap a FIO domain, expect OK`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          fio_domain: user1.domain,
          obt_id: OBT_ID,
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  it(`second oracle: try to unwrap a FIO domain, expect OK`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle2.account,
        privKey: newOracle2.privateKey,
        data: {
          fio_domain: user1.domain,
          obt_id: OBT_ID,
          fio_address: user1.address,
          actor: newOracle2.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  it(`third oracle: try to unwrap a FIO domain, expect OK`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle3.account,
        privKey: newOracle3.privateKey,
        data: {
          fio_domain: user1.domain,
          obt_id: OBT_ID,
          fio_address: user1.address,
          actor: newOracle3.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  // todo: check if user has their funds back
  // todo: can same oracle vote twice?

  it(`(empty actor) try to unwrap a FIO domain, expect SDK to use default actor value`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          fio_domain: user1.domain,
          obt_id: OBT_ID,
          fio_address: user1.address,
          actor: "" // SDK default?
        }
      });
      expect(result.error.details[0].message).to.equal('missing authority of ');
    } catch (err) {
      throw err;
    }
  });

  it(`(missing actor) try to unwrap a FIO domain, expect SDK to use default actor value`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle2.account,
        privKey: newOracle2.privateKey,
        data: {
          fio_domain: user1.domain,
          obt_id: OBT_ID,
          fio_address: user1.address,
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing unwrapdomain.actor (type=name)');
    }
  });

  // unhappy tests
  it(`(empty fio_domain) try to unwrap a FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          fio_domain: "",
          obt_id: OBT_ID,
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result.fields[0].name).to.equal('fio_domain');
      expect(result.fields[0].value).to.equal('');
      expect(result.fields[0].error).to.equal('FIO domain not found');
    } catch (err) {
      throw err;
    }
  });

  it(`(missing fio_domain) try to unwrap a FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          obt_id: OBT_ID,
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing unwrapdomain.fio_domain (type=string)');
    }
  });

  it(`(invalid fio_domain) try to unwrap a FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          fio_domain: "!invalid@$",
          obt_id: OBT_ID,
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result.fields[0].name).to.equal('fio_domain');
      expect(result.fields[0].value).to.equal('!invalid@$');
      expect(result.fields[0].error).to.equal('Invalid FIO domain');
    } catch (err) {
      throw err;
    }
  });

  it(`(int fio_domain) try to unwrap a FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          fio_domain: 1234500000000,
          obt_id: OBT_ID,
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result.fields[0].name).to.equal('fio_domain');
      expect(result.fields[0].value).to.equal('1234500000000');
      expect(result.fields[0].error).to.equal('FIO domain not found');
    } catch (err) {
      throw err;
    }
  });

  it(`(negative fio_domain) try to unwrap a FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          fio_domain: -1234500000000,
          obt_id: OBT_ID,
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result.fields[0].name).to.equal('fio_domain');
      expect(result.fields[0].value).to.equal('-1234500000000');
      expect(result.fields[0].error).to.equal('FIO domain not found');
    } catch (err) {
      throw err;
    }
  });

  it(`(empty obt_id) try to unwrap a FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle2.account,
        privKey: newOracle2.privateKey,
        data: {
          fio_domain: user1.domain,
          obt_id: "",
          fio_address: user1.address,
          actor: newOracle2.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.fields[0].name).to.equal('obt_id');
      expect(err.json.fields[0].value).to.equal('');
      expect(err.json.fields[0].error).to.equal('Invalid obt_id');
    }
  });

  it(`(missing obt_id) try to unwrap a FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          fio_domain: user1.domain,
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing unwrapdomain.obt_id (type=string)');
    }
  });

  it(`wrap another domain`, async function () {
    let domain3 = user3.domain;
    try {
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain3,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "", //oracle1.address,
        }
      });
      expect(result).to.have.all.keys('block_num', 'transaction_id', 'status', 'oracle_fee_collected', 'fee_collected');
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(WRAP_FEE);
      expect(parseInt(result.oracle_fee_collected)).to.equal(ORACLE_FEE);
    } catch (err) {
      throw err;
    }
  });

  it(`(empty fio_address) try to unwrap a FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          fio_domain: user3.domain,
          obt_id: OBT_ID,
          fio_address: "",
          actor: newOracle1.account
        }
      });
      expect(result.message).to.equal('FIO Address not found');
    } catch (err) {
      throw err;
    }
  });

  it(`(missing fio_address) try to unwrap a FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          fio_domain: user3.domain,
          obt_id: OBT_ID,
          actor: newOracle1.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing unwrapdomain.fio_address (type=string)');
    }
  });

  it(`(invalid fio_address) try to unwrap a FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          fio_domain: user3.domain,
          obt_id: OBT_ID,
          fio_address: "!invalid@$",
          actor: newOracle1.account
        }
      });
      expect(result.message).to.equal('FIO Address not found');
    } catch (err) {
      throw err;
    }
  });

  it(`(int fio_address) try to unwrap a FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          fio_domain: user2.domain,
          obt_id: OBT_ID,
          fio_address: 1234500000000,
          actor: newOracle1.account
        }
      });
      expect(result.message).to.equal('FIO Address not found');
    } catch (err) {
      throw err;
    }
  });

  it(`(negative fio_address) try to unwrap a FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          fio_domain: user2.domain,
          obt_id: OBT_ID,
          fio_address: -1234500000000,
          actor: newOracle1.account
        }
      });
      expect(result.message).to.equal('FIO Address not found');
    } catch (err) {
      throw err;
    }
  });

  it(`(invalid actor) try to unwrap a FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          fio_domain: user1.domain,
          obt_id: OBT_ID,
          fio_address: user1.address,
          actor: "!invalid@$"
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.error.details[0].message).to.equal('missing authority of .invalid');
    }
  });

  it(`(int actor) try to unwrap a FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          fio_domain: user1.domain,
          obt_id: OBT_ID,
          fio_address: user1.address,
          actor: 1234500000000
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });

  it(`(negative actor) try to unwrap a FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          fio_domain: user1.domain,
          obt_id: OBT_ID,
          fio_address: user1.address,
          actor: -12345
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });
});

