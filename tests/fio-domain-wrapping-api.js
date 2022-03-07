const hre = require("hardhat");
const ethers = hre.ethers;
require("@nomiclabs/hardhat-ethers");
require("mocha");
const {expect} = require("chai");
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {newUser, fetchJson} = require('../utils.js');
const {existingUser, callFioApi, callFioApiSigned, getAccountFromKey} = require("../utils.js");
const {getOracleRecords, registerNewBp, registerNewOracle, setTestOracleFees, setupWFIOontract, registerWfioOracles, cleanUpOraclessTable} = require("./Helpers/wrapping.js");
let INIT_SUPPLY = 0;
let faucet;

/**
 * If trouble with the after() hook in the global scope, cherrypick individual nested hooks
 *
 * commit: 1a9fa73ca6f731279b54553aea56cc90bf9f4aa3
 */

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
      console.log("deleted: ", row, result);
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

describe(`B. [FIO][api] Wrap FIO domains`, function () {

  let wrapAmt = 1000000000000;
  let oracle1, oracle2, oracle3, user1, newOracle, newOracle1, newOracle2, custodians, factory, wfio, wfioAccts;

  let OBT_ID;

  before(async function () {
    oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    // oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    // oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    user1 = await newUser(faucet);
    // user2 = await newUser(faucet);
    // user3 = await newUser(faucet);
    newOracle = await newUser(faucet);
    newOracle1 = await newUser(faucet);
    newOracle2 = await newUser(faucet);

    // register new oracles as bps
    await registerNewBp(newOracle);
    await registerNewBp(newOracle1);
    await registerNewBp(newOracle2);

    // await newOracles
    await registerNewOracle(newOracle);
    await registerNewOracle(newOracle1);
    await registerNewOracle(newOracle2);

    // set oracle fees
    await setTestOracleFees(newOracle, 10000000000, 11000000000);
    await setTestOracleFees(newOracle1, 11000000000, 20000000000);
    await setTestOracleFees(newOracle2, 20000000000, 21000000000);

    await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: 10000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    // [wfioAccts, wfio] = await setupWFIOontract(ethers, INIT_SUPPLY);
    // await registerWfioOracles(wfio, wfioAccts);

    // try {
    //   const result = await callFioApiSigned('push_transaction', {
    //     action: 'wraptokens',
    //     account: 'fio.oracle',
    //     actor: user1.account,
    //     privKey: user1.privateKey,
    //     data: {
    //       amount: wrapAmt,
    //       chain_code: "ETH",
    //       public_address: wfio.address,
    //       max_oracle_fee: config.maxFee,
    //       max_fee: config.maxFee,
    //       tpid: "",
    //       actor: user1.account
    //     }
    //   });
    //   OBT_ID = result.transaction_id;
    // } catch (err) {
    //   console.log('error wrapping test tokens: ', err);
    //   throw err;
    // }

    // call wfio.wrap
    // let fromStartingBal = await wfioAccts[14].getBalance();
    // let toStartingWfioBal = await wfio.balanceOf(wfioAccts[0].address);
    //
    // await wfio.connect(wfioAccts[12]).wrap(wfioAccts[0].address, 100, OBT_ID);
    // await wfio.connect(wfioAccts[13]).wrap(wfioAccts[0].address, 100, OBT_ID);
    // try {
    //   let result = await wfio.connect(wfioAccts[14]).wrap(wfioAccts[0].address, 100, OBT_ID);
    //   let fromEndingBal = await wfioAccts[14].getBalance();
    //   let toEndingWfioBal = await wfio.balanceOf(wfioAccts[0].address);
    //   expect(result.from).to.equal(wfioAccts[14].address);
    //   expect(result.to).to.equal(wfio.address);
    //   expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
    //   expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.true;
    //   expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(100)
    // } catch (err) {
    //   throw err;
    // }
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
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].act.data.fio_domain).to.equal(domain);
      expect(result.processed.action_traces[0].act.data.public_address).to.equal(wfio.address);
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
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: newOracle.account
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

  /**
   * TODO: Bug - improper chain_code validation throws wrong error
   */
  it(`(int chain_code) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          fio_domain: domain,
          chain_code: 12345,
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.fields[0].name).to.equal('chain_code');
      expect(result.fields[0].value).to.equal('12345');
      expect(result.fields[0].error).to.equal('Invalid chain code format');
    } catch (err) {
      throw err;
    }
  });

  /**
   * TODO: Bug - improper public_address validation allows wrapdomain to execute with an invalid address
   */
  it(`(invalid public_address) try to wrap a FIO domain`, async function () {
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
          public_address: "!invalid@%^",
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.fields[0].error).to.equal('Invalid public address');
    } catch (err) {
      throw err;
    }
  });

  it(`(int public_address) try to wrap a FIO domain`, async function () {
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
          public_address: 12345,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.fields[0].error).to.equal('Invalid public address');
    } catch (err) {
      // expect(err.message).to.equal('Invalid public address');
      // expect(err.json.fields[0].error).to.equal('Invalid public address');
      throw err;
    }
  });

  it(`(negative public_address) try to wrap a FIO domain`, async function () {
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
          public_address: -12345,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.fields[0].error).to.equal('Invalid public address');
    } catch (err) {
      // expect(err.message).to.equal('Invalid public address');
      // expect(err.json.fields[0].error).to.equal('Invalid public address');
      throw err;
    }
  });

  it(`(empty max_oracle_fee) try to wrap a FIO domain`, async function () {
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
          public_address: wfio.address,
          max_oracle_fee: "",
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.fields[0].error).to.equal('Invalid oracle fee value');
    } catch (err) {
      // expect(err.message).to.equal('Invalid oracle fee value');
      // expect(err.json.fields[0].error).to.equal('Invalid oracle fee value');
      throw err;
    }
  });

  it(`(negative max_oracle_fee) try to wrap a FIO domain`, async function () {
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
          public_address: wfio.address,
          max_oracle_fee: -config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.fields[0].error).to.equal('Invalid oracle fee value');
    } catch (err) {
      // expect(err.message).to.equal('Invalid oracle fee value');
      // expect(err.json.fields[0].error).to.equal('Invalid oracle fee value');
      throw err;
    }
  });

  it(`(empty max_fee) try to wrap a FIO domain`, async function () {
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
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: "",
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.fields[0].error).to.equal('Invalid fee value');
    } catch (err) {
      // expect(err.message).to.equal('Invalid fee value');
      // expect(err.json.fields[0].error).to.equal('Invalid fee value');
      throw err;
    }
  });

  it(`(negative max_fee) try to wrap a FIO domain`, async function () {
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
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: -config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.fields[0].error).to.equal('Invalid fee value');
    } catch (err) {
      // expect(err.message).to.equal('Invalid fee value');
      // expect(err.json.fields[0].error).to.equal('Invalid fee value');
      throw err;
    }
  });

  it(`(missing tpid) try to wrap a FIO domain`, async function () {
    //todo - validation for missing TPID - test with API
    //  make sure SDK is not injecting a default
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
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          actor: user1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing wrapdomain.tpid (type=string)');
    }
  });

  /**
   * TODO: Bug - invalid tpid validation producing wrong exception
   */
  it(`(int tpid) try to wrap a FIO domain`, async function () {
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
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: 12345,
          actor: user1.account
        }
      });
      expect(result.fields[0].error).to.equal('TPID must be empty or valid FIO address');
    } catch (err) {
      // expect(err.json.fields[0].error).to.equal('TPID must be empty or valid FIO address');
      throw err;
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
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
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

describe(`C. [FIO][api] Unwrap FIO domains`, function () {

  let wrapAmt = 1000000000000;
  let oracle1, oracle2, oracle3, user1, newOracle1, newOracle2, newOracle3, newOracle4,
      user2,
      user3,
      user4,
      user5,
      user6,
      user7,
      user8,
      user9,
      user10,
      user11,
      user12,
      user13,
      user14;

  let wfioOwner, wfioAccts, custodians, factory, wfio;
  let OBT_ID;

  before(async function () {
    // oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    // oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');

    // test users
    oracle1 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    // user3 = await newUser(faucet);
    // user4 = await newUser(faucet);
    // user5 = await newUser(faucet);
    // user6 = await newUser(faucet);
    // user7 = await newUser(faucet);
    // user8 = await newUser(faucet);
    // user9 = await newUser(faucet);
    // user10 = await newUser(faucet);
    // user11 = await newUser(faucet);
    // user12 = await newUser(faucet);
    // user13 = await newUser(faucet);
    // user14 = await newUser(faucet);
    newOracle1 = await newUser(faucet);
    newOracle2 = await newUser(faucet);
    newOracle3 = await newUser(faucet);
    newOracle4 = await newUser(faucet);

    // register new oracles as bps
    await registerNewBp(newOracle1);
    await registerNewBp(newOracle2);
    await registerNewBp(newOracle3);
    await registerNewBp(newOracle4);

    // register oracles
    await registerNewOracle(newOracle1);
    await registerNewOracle(newOracle2);
    await registerNewOracle(newOracle3);
    await registerNewOracle(newOracle4);

    // set oracle fees
    await setTestOracleFees(newOracle1, 10000000000, 11000000000);
    await setTestOracleFees(newOracle2, 11000000000, 20000000000);
    await setTestOracleFees(newOracle3, 20000000000, 21000000000);
    await setTestOracleFees(newOracle4, 20000000000, 21500000000);

    await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: 10000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    [wfioAccts, wfio] = await setupWFIOontract(ethers, INIT_SUPPLY);
    await registerWfioOracles(wfio, wfioAccts);

    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      OBT_ID = result.transaction_id;
    } catch (err) {
      console.log('error wrapping test tokens: ', err);
      throw err;
    }

    await wfio.connect(wfioAccts[12]).wrap(wfioAccts[0].address, 100, OBT_ID);
    await wfio.connect(wfioAccts[13]).wrap(wfioAccts[0].address, 100, OBT_ID);
    try {
      await wfio.connect(wfioAccts[14]).wrap(wfioAccts[0].address, 100, OBT_ID);
    } catch (err) {
      throw err;
    }

    // finally, wrap our domain
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
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
    } catch (err) {
      throw err;
    }
  });

  // happy tests
  it(`try to unwrap a FIO domain, expect OK`, async function () {
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
    // TODO: Bug - improper obt_id validation
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle4.account,
        privKey: newOracle4.privateKey,
        data: {
          fio_domain: user1.domain,
          obt_id: "",
          fio_address: user1.address,
          actor: newOracle4.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.fields[0].name).to.equal('obt_id');
      expect(err.json.fields[0].value).to.equal('');
      expect(err.json.fields[0].error).to.equal('FIO domain not found');
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

  it(`(invalid obt_id) try to unwrap a FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          fio_domain: user1.domain,
          obt_id: "!invalid@$",
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result.fields[0].name).to.equal('obt_id');
      expect(result.fields[0].value).to.equal('');
      expect(result.fields[0].error).to.equal('FIO domain not found');
    } catch (err) {
      throw err;
    }
  });

  it(`(int obt_id) try to unwrap a FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          fio_domain: user1.domain,
          obt_id: 1234500000000,
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.fields[0].name).to.equal('fio_domain');
      expect(err.json.fields[0].value).to.equal('');
      expect(err.json.fields[0].error).to.equal('FIO domain not found');
    }
  });

  it(`(negative obt_id) try to unwrap a FIO domain`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          fio_domain: user1.domain,
          obt_id: -1234500000000,
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.fields[0].name).to.equal('fio_domain');
      expect(err.json.fields[0].value).to.equal('');
      expect(err.json.fields[0].error).to.equal('FIO domain not found');
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
          fio_domain: user1.domain,
          obt_id: 1234500000000,
          fio_address: "",
          actor: newOracle1.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.fields[0].name).to.equal('fio_domain');
      expect(err.json.fields[0].value).to.equal('');
      expect(err.json.fields[0].error).to.equal('FIO domain not found');
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
          fio_domain: user1.domain,
          obt_id: OBT_ID,
          actor: newOracle1.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.fields[0].name).to.equal('fio_domain');
      expect(err.json.fields[0].value).to.equal('');
      expect(err.json.fields[0].error).to.equal('FIO domain not found');
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
          fio_domain: user1.domain,
          obt_id: OBT_ID,
          fio_address: "!invalid@$",
          actor: newOracle1.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.fields[0].name).to.equal('fio_domain');
      expect(err.json.fields[0].value).to.equal('');
      expect(err.json.fields[0].error).to.equal('FIO domain not found');
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
          fio_domain: user1.domain,
          obt_id: OBT_ID,
          fio_address: 1234500000000,
          actor: newOracle1.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.fields[0].name).to.equal('fio_domain');
      expect(err.json.fields[0].value).to.equal('');
      expect(err.json.fields[0].error).to.equal('FIO domain not found');
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
          fio_domain: user1.domain,
          obt_id: OBT_ID,
          fio_address: -1234500000000,
          actor: newOracle1.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.fields[0].name).to.equal('fio_domain');
      expect(err.json.fields[0].value).to.equal('');
      expect(err.json.fields[0].error).to.equal('FIO domain not found');
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
