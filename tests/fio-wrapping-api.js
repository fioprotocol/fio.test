const hre = require("hardhat");
const ethers = hre.ethers;
require("@nomiclabs/hardhat-ethers");
require("mocha");
const {expect} = require("chai");
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {newUser, fetchJson} = require('../utils.js');
const {existingUser, callFioApiSigned, getAccountFromKey} = require("../utils.js");
const {getOracleRecords, registerNewBp, registerNewOracle, setTestOracleFees, setupWFIOontracts, registerWfioOracles, cleanUpOraclessTable} = require("./Helpers/wrapping.js");
const INIT_SUPPLY = 0;
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

describe(`************************** fio-wrapping-api.js ************************** \n   A. [FIO] Oracles (get_table_rows)`, function () {
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



      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
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



      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
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



      expect(result).to.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
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
  it(`** API Tests **`, async function () {});
});

describe(`B. [FIO][api] Oracles (register)`, function () {
  let user1, user2, user3, oracle1, oracle2, oracle3;

  before(async function () {
    oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);

    // await registerNewBp(oracle1);
    // await registerNewBp(oracle2);
    // await registerNewBp(oracle3);
    // await registerNewOracle(oracle1);
    // await registerNewOracle(oracle2);
    // await registerNewOracle(oracle3);
    await setTestOracleFees(oracle1, 10000000000, 11000000000);
    await setTestOracleFees(oracle2, 13000000000, 11000000000);

  });

  it(`user1 registers as a new block producer`, async () => {
    try {
      const result = await callFioApiSigned(
      'register_producer', {
        account: 'eosio',
        action: 'regproducer',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          fio_address: user1.address,
          fio_pub_key: user1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          actor: user1.account,
          max_fee: config.api.register_producer.fee
        }
      });

      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed).to.have.all.keys('id', 'block_num', 'block_time', 'producer_block_id', 'receipt', 'elapsed', 'net_usage', 'scheduled', 'action_traces', 'account_ram_delta', 'except', 'error_code');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces.length).to.equal(7);
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK","fee_collected":${config.api.register_producer.fee}}`);
      expect(result.processed.action_traces[0].act.data.max_fee).to.equal(config.api.register_producer.fee);
      expect(result.processed.action_traces[0].act.data.actor).to.equal(user1.account);
      expect(result.processed.action_traces[0].act.data.location).to.equal(80);
      expect(result.processed.action_traces[0].act.data.url).to.equal("https://mywebsite.io/");
      expect(result.processed.action_traces[0].act.data.fio_address).to.equal(user1.address);
      expect(result.processed.action_traces[0].act.data.fio_pub_key).to.equal(user1.publicKey);
    } catch (err) {
      throw err;
    }
  });



  // TODO: Query the oracles table to see if






  it(`user2 registers user1 as a new oracle, expect OK status`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          oracle_actor: user1.account,
          actor: user2.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed).to.have.all.keys('id', 'block_num', 'block_time', 'producer_block_id', 'receipt', 'elapsed', 'net_usage', 'scheduled', 'action_traces', 'account_ram_delta', 'except', 'error_code');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces.length).to.equal(1);
      expect(result.processed.action_traces[0].act.data.actor).to.equal(user2.account);
      expect(result.processed.action_traces[0].act.data.oracle_actor).to.equal(user1.account);
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK"}`);
    } catch (err) {
      throw err;
    }
  });

  it(`user2 queries the oracless table, expects results to contain user1`, async function () {
    try {
      const oracleRecords = await getOracleRecords(user1.account);
      expect(oracleRecords.rows.length).to.equal(1);
      expect(oracleRecords.rows[0]).to.have.all.keys('actor', 'fees');
      expect(oracleRecords.rows[0].actor).to.be.a('string').and.equal(user1.account);
    } catch (err) {
      throw err;
    }
  });

  // unhappy tests
  it(`(empty oracle_actor) user1 tries to register an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          oracle_actor: "",
          actor: user2.account
        }
      });
      expect(result.fields[0].name).to.equal('oracle_actor');
      expect(result.fields[0].error).to.equal('Account is not bound on the fio chain');
    } catch (err) {
      throw err;
    }
  });
  it(`(missing oracle_actor) user1 tries to register an oracle, expect Error`, async function () {
    try{
      const result = await callFioApiSigned('push_transaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          actor: user2.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing regoracle.oracle_actor (type=name)');
    }
  });

  it(`(invalid oracle_actor) user1 tries to register an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          oracle_actor: "!invalid!@$",
          actor: user1.account,
        }
      });
      expect(result.fields[0].name).to.equal('oracle_actor');
      expect(result.fields[0].value).to.equal('.invalid');
      expect(result.fields[0].error).to.equal('Account is not bound on the fio chain');
    } catch (err) {
      throw err;
    }
  });

  it(`(int oracle_actor) user1 tries to register an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          oracle_actor: 1234500000000,
          actor: user2.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });
  it(`(negative oracle_actor) user1 tries to register an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          oracle_actor: -1234500000000,
          actor: user3.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });
  it(`(empty actor) user1 tries to register an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          oracle_actor: user1.account,
          actor: "",
        }
      });
      expect(result.code).to.equal(500);
      expect(result.error.details[0].message).to.equal('must specify a valid account to pay for new record');
    } catch (err) {
      throw err;
    }
  });
  it(`(missing actor) user1 tries to register an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          oracle_actor: user1.account,
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing regoracle.actor (type=name)');
    }
  });

  it(`(empty actor) user1 tries to register user2 as an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          oracle_actor: user1.account,
          actor: ""
        }
      });
      expect(result.code).to.equal(500);
      expect(result.error.details[0].message).to.equal('must specify a valid account to pay for new record');
    } catch (err) {
      throw err;
    }
  });

  it(`(duplicate oracle) user3 tries to register user2 as an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: user3.account,
        privKey: user3.privateKey,
        data: {
          oracle_actor: user1.account,
          actor: user3.account,
        }
      });
      expect(result.error.details[0].message).to.equal('could not insert object, most likely a uniqueness constraint was violated: pending console output: ');
    } catch (err) {
      throw err;
    }
  });
  it(`(oracle not active producer) user3 tries to register user2 as an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: user3.account,
        privKey: user3.privateKey,
        data: {
          oracle_actor: user2.account,
          actor: user3.account,
        }
      });
      expect(result.fields[0].error).to.equal('Oracle not active producer');
    } catch (err) {
      throw err;
    }
  });
  it(`(empty actor) user3 tries to register user2 as an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: user3.account,
        privKey: user3.privateKey,
        data: {
          oracle_actor: user1.account,
          actor: "",
        }
      });
      expect(result.code).to.equal(500);
      expect(result.error.what).to.equal('The payer of the table data is invalid'); // TODO: ???
      expect(result.error.details[0].message).to.equal('must specify a valid account to pay for new record');
    } catch (err) {
      throw err;
    }
  });

  it(`(missing actor) user3 tries to register user2 as an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: user3.account,
        privKey: user3.privateKey,
        data: {
          oracle_actor: user1.account,
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing regoracle.actor (type=name)');
    }
  });

  it(`user2 registers as a new block producer`, async () => {
    try {
      const result = await callFioApiSigned(
        'register_producer', {
          account: 'eosio',
          action: 'regproducer',
          actor: user2.account,
          privKey: user2.privateKey,
          data: {
            fio_address: user2.address,
            fio_pub_key: user2.publicKey,
            url: "https://mywebsite-2.io/",
            location: 80,
            actor: user2.account,
            max_fee: config.api.register_producer.fee
          }
        });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed).to.have.all.keys('id', 'block_num', 'block_time', 'producer_block_id', 'receipt', 'elapsed', 'net_usage', 'scheduled', 'action_traces', 'account_ram_delta', 'except', 'error_code');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces.length).to.equal(7);
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK","fee_collected":${config.api.register_producer.fee}}`);
      expect(result.processed.action_traces[0].act.data.max_fee).to.equal(config.api.register_producer.fee);
      expect(result.processed.action_traces[0].act.data.actor).to.equal(user2.account);
      expect(result.processed.action_traces[0].act.data.location).to.equal(80);
      expect(result.processed.action_traces[0].act.data.url).to.equal("https://mywebsite-2.io/");
      expect(result.processed.action_traces[0].act.data.fio_address).to.equal(user2.address);
      expect(result.processed.action_traces[0].act.data.fio_pub_key).to.equal(user2.publicKey);
    } catch (err) {
      throw err;
    }
  });

  it(`(invalid actor) user3 tries to register user2 as an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: user3.account,
        privKey: user3.privateKey,
        data: {
          oracle_actor: user2.account,
          actor: "!invalid!@$",
        }
      });
      expect(result.code).to.equal(500);
      expect(result.error.details[0].message).to.equal('unknown key (eosio::chain::name): .invalid: pending console output: ');
    } catch (err) {
      throw err;
    }
  });
  it(`(int actor) user1 tries to register an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          oracle_actor: user3.account,
          actor: 1234500000000 //user3.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });
  it(`(negative actor) user1 tries to register an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          oracle_actor: user3.account,
          actor: -1234500000000 //user3.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });
});

describe(`C. [FIO][api] Oracles (unregister)`, function () {
  let user1, user2, user3, newOracle, oracle1, oracle2, oracle3;

  before(async function () {
    // oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    oracle1 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    // oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    // user1 = await newUser(faucet);
    // user2 = await newUser(faucet);
    // user3 = await newUser(faucet);
    newOracle = await newUser(faucet);

    // register a new oracle
    // try {
    //   // const result =
    //   await newOracle.sdk.genericAction('pushTransaction', {
    //     action: 'regproducer',
    //     account: 'eosio',
    //     data: {
    //       fio_address: newOracle.address,
    //       fio_pub_key: newOracle.publicKey,
    //       url: "https://mywebsite.io/",
    //       location: 80,
    //       actor: newOracle.account,
    //       max_fee: config.api.register_producer.fee
    //     }
    //   });
    // } catch (err) {
    //   console.log('Error: ', err.json);
    //   throw err;
    // }

    // try {
    //   await newOracle.sdk.genericAction('pushTransaction', {
    //     action: 'regoracle',
    //     account: 'fio.oracle',
    //     actor: 'eosio',
    //     data: {
    //       oracle_actor: newOracle.account,
    //       actor: newOracle.account
    //     }
    //   });
    // } catch (err) {
    //   throw err;
    // }

    await registerNewBp(newOracle);
    await registerNewOracle(newOracle);
    await setTestOracleFees(newOracle, 10000000000, 11000000000);
  });

  it(`query the oracless table, expects results to contain newOracle`, async function () {
    try {
      const oracleRecords = await getOracleRecords(newOracle.account);
      expect(oracleRecords.rows.length).to.equal(1);
      expect(oracleRecords.rows[0]).to.have.all.keys('actor', 'fees');
      expect(oracleRecords.rows[0].actor).to.be.a('string').and.equal(newOracle.account);
    } catch (err) {
      throw err;
    }
  });

  it(`(empty oracle_actor) newOracle tries to unregister an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          oracle_actor: "",
          actor: newOracle.account
        }
      });
      expect(result.fields[0].name).to.equal('oracle_actor');
      expect(result.fields[0].value).to.equal('');
      expect(result.fields[0].error).to.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('Oracle is not registered');
    }
  });
  it(`(missing oracle_actor) try to unregister an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          oracle_actor: "",
          actor: newOracle.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('Oracle is not registered');
    }
  });
  it(`(invalid oracle_actor) try to unregister an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('pushTransaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          oracle_actor: "!invalid!@$",
          actor: newOracle.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('Oracle is not registered');
    }
  });
  it(`(int oracle_actor) try to unregister an oracle, expect Error`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: 1234400000000,
          actor: newOracle.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });
  it(`(negative oracle_actor) try to unregister an oracle, expect Error`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: -1234400000000,
          actor: newOracle.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });

  it.skip(`(empty actor) try to unregister an oracle, expect Error`, async function () {
    // TODO: Bug - unregister successful when actor is empty
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          oracle_actor: newOracle.account,
          actor: ""
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });
  it.skip(`(invalid actor) try to unregister an oracle, expect Error`, async function () {
    // TODO: Bug - unregister successful when actor is invalid
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          oracle_actor: newOracle.account,
          actor: "!invalid@$%"
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      // expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      // expect(err.errorCode).to.equal(400);
      // expect(err.json).to.have.all.keys('type', 'message', 'fields');
      // expect(err.json.fields[0].error).to.equal('Oracle is not registered');
      throw err;
    }
  });

  it(`(missing actor) try to unregister an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          oracle_actor: newOracle.account,
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing unregoracle.actor (type=name)');
    }
  });

  it(`(int actor) try to unregister an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          oracle_actor: newOracle.account,
          actor: 1234500000000
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });
  it(`(negative actor) try to unregister an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          oracle_actor: newOracle.account,
          actor: -1234500000000
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });

  it(`(happy path) oracle1 tries to unregister newOracle, expect OK`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: oracle1.account,
        privKey: oracle1.privateKey,
        data: {
          oracle_actor: newOracle.account,
          actor: oracle1.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed).to.have.all.keys('id', 'block_num', 'block_time', 'producer_block_id', 'receipt', 'elapsed', 'net_usage', 'scheduled', 'action_traces', 'account_ram_delta', 'except', 'error_code');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces.length).to.equal(1);
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK"}`);
      expect(result.processed.action_traces[0].act.data.oracle_actor).to.equal(newOracle.account);
      expect(result.processed.action_traces[0].act.data.actor).to.equal(oracle1.account);
    } catch (err) {
      throw err;
    }
  });
});

describe(`D. [FIO][api] Oracles (setoraclefees)`, function () {

  let oracle1, newOracle, newOracle1, newOracle2, user1;

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

    // register a new oracle
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: newOracle.address,
          fio_pub_key: newOracle.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          actor: newOracle.account,
          max_fee: config.api.register_producer.fee
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.register_producer.fee);
    } catch (err) {
      console.log('Error: ', err.json)
      throw err;
    }

    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: newOracle1.address,
          fio_pub_key: newOracle1.publicKey,
          url: "https://mywebsite1.io/",
          location: 80,
          actor: newOracle1.account,
          max_fee: config.api.register_producer.fee
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.register_producer.fee);
    } catch (err) {
      console.log('Error: ', err.json)
      throw err;
    }

    try {
      const result = await newOracle2.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: newOracle2.address,
          fio_pub_key: newOracle2.publicKey,
          url: "https://mywebsite2.io/",
          location: 80,
          actor: newOracle2.account,
          max_fee: config.api.register_producer.fee
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.register_producer.fee);
    } catch (err) {
      console.log('Error: ', err.json)
      throw err;
    }

    try {
      await oracle1.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: newOracle.account,
          actor: oracle1.account
        }
      });
    } catch (err) {
      throw err;
    }

    try {
      await oracle1.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: newOracle1.account,
          actor: oracle1.account
        }
      });
    } catch (err) {
      throw err;
    }

    try {
      await oracle1.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: newOracle2.account,
          actor: oracle1.account
        }
      });
    } catch (err) {
      throw err;
    }
  });

  it(`newOracle tries to set oracle fee`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          wrap_fio_domain: 1000000000,
          wrap_fio_tokens: 1100000000,
          actor: newOracle.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces[0].act.data.actor).to.equal(newOracle.account);
      expect(result.processed.action_traces[0].receipt.response).to.equal('{"status": "OK"}');
    } catch (err) {
      throw err;
    }
  });

  it(`(empty wrap_fio_domain) try to set oracle fees, expect "" to be cast to 0`, async function () {
    //ok this is actually a bug
    //  TODO: log a bug for fee amount integer wraparound
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          wrap_fio_domain:  "", // 1,
          wrap_fio_tokens: 1,
          actor: newOracle.account
        }
      });

      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.action_traces[0].act.data.wrap_fio_domain).to.equal(0);
    } catch (err) {
      const oracleRecords = await getOracleRecords(newOracle.account);
      console.log(`${oracleRecords.rows[0].fees[0].fee_name}: ${oracleRecords.rows[0].fees[0].fee_amount}`);
      console.log(`${oracleRecords.rows[0].fees[1].fee_name}: ${oracleRecords.rows[0].fees[1].fee_amount}`);

      throw err;
    }
  });



  it(`(missing wrap_fio_domain) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          wrap_fio_tokens: 1,
          actor: newOracle.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing setoraclefee.wrap_fio_domain (type=int64)');
    }
  });
  it(`(invalid wrap_fio_domain) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          wrap_fio_domain:  "!invalid!@$",
          wrap_fio_tokens: 1,
          actor: newOracle.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });
  it(`(overflow wrap_fio_domain) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          wrap_fio_domain:  1234500000000000000000,
          wrap_fio_tokens: 1,
          actor: newOracle.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it.skip(`(negative wrap_fio_domain) try to set oracle fees, expect Error`, async function () {
    // TODO: log a bug for fee amount integer wraparound
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          wrap_fio_domain:  -1234500000000,
          wrap_fio_tokens: 1,
          actor: newOracle.account
        }
      });
      expect(result.status).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      const oracleRecords = await getOracleRecords(newOracle.account);
      console.log(`${oracleRecords.rows[0].fees[0].fee_name}: ${oracleRecords.rows[0].fees[0].fee_amount}`);
      console.log(`${oracleRecords.rows[0].fees[1].fee_name}: ${oracleRecords.rows[0].fees[1].fee_amount}`);
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(empty wrap_fio_tokens) try to set oracle fees, expect "" to be cast to 0`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: "",
          actor: newOracle.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.action_traces[0].act.data.wrap_fio_tokens).to.equal(0);
    } catch (err) {
      // const oracleRecords = await getOracleRecords(newOracle.account);
      // console.log(`${oracleRecords.rows[0].fees[0].fee_name}: ${oracleRecords.rows[0].fees[0].fee_amount}`);
      // console.log(`${oracleRecords.rows[0].fees[1].fee_name}: ${oracleRecords.rows[0].fees[1].fee_amount}`);

      throw err;
    }
  });

  it(`(missing wrap_fio_tokens) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          wrap_fio_domain: 1,
          actor: newOracle.actor
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing setoraclefee.wrap_fio_tokens (type=int64)');
    }
  });
  it(`(invalid wrap_fio_tokens) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: "!invalid!@$",
          actor: newOracle.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });
  it(`(overflow wrap_fio_tokens) try to set oracle fees, expect Error`, async function () {
    try{
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: 1234500000000000000000,
          actor: newOracle.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it.skip(`(negative wrap_fio_tokens) try to set oracle fees, expect Error`, async function () {
    //TODO: BUG - integer wraparound (again)
    try{
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: -1234500000000,
          actor: newOracle1.account
        }
      });

      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      let oracleRecords = await getOracleRecords(newOracle1.account);
      console.log(`${oracleRecords.rows[0].fees[0].fee_name}: ${oracleRecords.rows[0].fees[0].fee_amount}`);
      console.log(`${oracleRecords.rows[0].fees[1].fee_name}: ${oracleRecords.rows[0].fees[1].fee_amount}`);
      expect(oracleRecords.rows[0].fees[0].fee_amount).to.equal(1);
      expect(oracleRecords.rows[0].fees[1].fee_amount).to.equal(0);
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(empty actor) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: 1,
          actor: ""
        }
      });
      expect(result.code).to.equal(500);
      expect(result.error.details[0].message).to.equal('missing authority of ');
    } catch (err) {
      throw err;
    }
  });
  it.skip(`(missing actor) try to set oracle fees, expect Error`, async function () {
    //todo: bug - missing actor validation
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privKey,
        data: {
          wrap_fio_domain: 1000,
          wrap_fio_tokens: 1000,
          //actor: "!invalid!@$"
        }
      });



      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.error.details[0].message).to.equal('missing authority of .invalid');
    }
  });
  it(`(invalid actor) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: 1,
          actor: "!invalid!@$"
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.error.details[0].message).to.equal('missing authority of .invalid');
    }
  });
  it(`(int actor) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: 1,
          actor: 1234500000000000000000
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });
  it(`(negative actor) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: 1,
          actor: -1000000000000
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });
});

describe.skip(`E. [FIO] Oracles (getoraclefees)`, function () {
  //void setoraclefee(
  //    uint64_t &wrap_fio_domain,
  //    uint64_t &wrap_fio_tokens,
  //    name &actor
  //    )
  let oracle1, newOracle;

  before(async function () {
    // oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    // oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    // oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    // user1 = await newUser(faucet);
    // user2 = await newUser(faucet);
    // user3 = await newUser(faucet);
    try {
      newOracle = await newUser(faucet);
    } catch (err) {
      throw err;
    }

    // register a new oracle
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: newOracle.address,
          fio_pub_key: newOracle.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          actor: newOracle.account,
          max_fee: config.api.register_producer.fee
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.register_producer.fee);
    } catch (err) {
      console.log('Error: ', err.json)
      throw err;
    }

    try {
      await newOracle.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: newOracle.account,
          actor: newOracle.account
        }
      });
    } catch (err) {
      throw err;
    }
  });

  it('call get_oracle_fees from the API', async function () {
    //let user = await newUser(faucet);
    try {
      const result = await callFioApiSigned('get_oracle_fees', {
        actor: newOracle.account,
        pubKey: newOracle.publicKey
      });
      console.log(result);
    } catch (err) {
      throw err;
    }
  });

  it(`(empty wrap_fio_domain) try to get oracle fees, expect Error`);
  it(`(missing wrap_fio_domain) try to get oracle fees, expect Error`);
  it(`(invalid wrap_fio_domain) try to get oracle fees, expect Error`);
  it(`(overflow wrap_fio_domain) try to get oracle fees, expect Error`);
  it(`(negative wrap_fio_domain) try to get oracle fees, expect Error`);

  it(`(empty wrap_fio_tokens) try to get oracle fees, expect Error`);
  it(`(missing wrap_fio_tokens) try to get oracle fees, expect Error`);
  it(`(invalid wrap_fio_tokens) try to get oracle fees, expect Error`);
  it(`(overflow wrap_fio_tokens) try to get oracle fees, expect Error`);
  it(`(negative wrap_fio_tokens) try to get oracle fees, expect Error`);

  it(`(empty actor) try to get oracle fees, expect Error`);
  it(`(missing actor) try to get oracle fees, expect Error`);
  it(`(invalid actor) try to get oracle fees, expect Error`);
  it(`(int actor) try to get oracle fees, expect Error`);
  it(`(negative actor) try to get oracle fees, expect Error`);
});

describe(`** ORACLE TABLE CLEANUP **`, async function () {
  it(`clean out oracless record with helper function`, async function () {
    try {
      await cleanUpOraclessTable(true);
      let records = await getOracleRecords();
      expect(records.rows.length).to.be.oneOf([3, 0]);
    } catch (err) {
      throw err;
    }
  });
});

describe(`F. [FIO][api] Wrap FIO tokens`, function () {

  let wrapAmt = 1000000000000;
  let oracle1, oracle2, oracle3, user1, newOracle, newOracle1, newOracle2, custodians, factory, wfio, wfioAccts;

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
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: newOracle.address,
          fio_pub_key: newOracle.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          actor: newOracle.account,
          max_fee: config.api.register_producer.fee
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.register_producer.fee);
    } catch (err) {
      console.log('Error: ', err.json)
      throw err;
    }

    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: newOracle1.address,
          fio_pub_key: newOracle1.publicKey,
          url: "https://mywebsite1.io/",
          location: 80,
          actor: newOracle1.account,
          max_fee: config.api.register_producer.fee
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.register_producer.fee);
    } catch (err) {
      console.log('Error: ', err.json)
      throw err;
    }

    try {
      const result = await newOracle2.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: newOracle2.address,
          fio_pub_key: newOracle2.publicKey,
          url: "https://mywebsite2.io/",
          location: 80,
          actor: newOracle2.account,
          max_fee: config.api.register_producer.fee
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.register_producer.fee);
    } catch (err) {
      console.log('Error: ', err.json)
      throw err;
    }

    await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: 10000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    [wfioAccts, wfio] = await setupWFIOontracts(ethers, INIT_SUPPLY);
  });

  it(`query the oracless table, expects zero records`, async function () {
    try {
      const oracleRecords = await getOracleRecords();
      expect(oracleRecords.rows.length).to.equal(0);
      let existingOracles = [];
      for (let row in oracleRecords.rows) {
        row = oracleRecords.rows[row]
        if (row.actor === 'qbxn5zhw2ypw' || row.actor === 'hfdg2qumuvlc' || row.actor === 'wttywsmdmfew') {
          expect(row).to.have.all.keys('actor', 'fees');
          existingOracles.push(row);
        }
      }
      expect(existingOracles.length).to.equal(0);
    } catch (err) {
      throw err;
    }
  });

  it(`(not enough registered oracles) try to wrap 1000 FIO tokens, expect Error`, async function () {
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
      expect(result.fields[0].name).to.equal('actor');
      expect(result.fields[0].value).to.equal(user1.account);
      expect(result.fields[0].error).to.equal('Not enough registered oracles.');
    } catch (err) {
      throw err;
    }
  });

  it(`register newOracle to allow token wrapping`, async function () {
    try {
      const result1 = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: newOracle.account,
          actor: newOracle.account
        }
      });
      expect(result1).to.have.property('status').which.is.a('string').and.equals('OK');
    } catch (err) {
      throw err;
    }
  });

  it(`(not enough registered oracles) try to wrap 1000 FIO tokens, expect Error`, async function () {
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
          actor: user1.account,
        }
      });
      expect(result.fields[0].name).to.equal('actor');
      expect(result.fields[0].value).to.equal(user1.account);
      expect(result.fields[0].error).to.equal('Not enough registered oracles.');
    } catch (err) {
      throw err;
    }
  });

  it(`register newOracle1 oracle to allow token wrapping`, async function () {
    try {
      const result2 = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: newOracle1.account,
          actor: newOracle1.account
        }
      });
      expect(result2).to.have.property('status').which.is.a('string').and.equals('OK');
    } catch (err) {
      throw err;
    }
  });

  it(`(not enough registered oracles) try to wrap 1000 FIO tokens, expect Error`, async function () {
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
      expect(result.fields[0].name).to.equal('actor');
      expect(result.fields[0].value).to.equal(user1.account);
      expect(result.fields[0].error).to.equal('Not enough registered oracles.');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Not enough registered oracles.');
    }
  });

  it(`register newOracle2 to allow token wrapping`, async function () {
    try {
      const result3 = await newOracle2.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: newOracle2.account,
          actor: newOracle2.account
        }
      });
      expect(result3).to.have.property('status').which.is.a('string').and.equals('OK');
    } catch (err) {
      throw err;
    }
  });

  it(`set oracle fees for all new oracles`, async function () {
    console.log('[dbg] starting fee setting...');
    try {
      await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 10000000000,
          wrap_fio_tokens: 11000000000
        }
      });
      await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 11000000000,
          wrap_fio_tokens: 20000000000
        }
      });
      await newOracle2.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 20000000000,
          wrap_fio_tokens: 21000000000
        }
      });
    } catch (err) {
      throw err;
    }
  });

  it(`(empty amount) try to wrap FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          amount: "",
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.code).to.equal(500);
      expect(result.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');  // todo: ???
    } catch (err) {
      throw err;
    }
  });
  it(`(missing amount) try to wrap FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });

      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing wraptokens.amount (type=int64)');
    }
  });
  it(`(invalid amount) try to wrap FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          amount: "!invalid!@$",
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });
  it(`(negative amount) try to wrap FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          amount: -wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
    } catch (err) {
      throw err;
    }
  });

  it(`(empty chain_code) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          amount: wrapAmt,
          chain_code: "",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.fields[0].name).to.equal('chain_code');
      expect(result.fields[0].value).to.equal('');
      expect(result.fields[0].error).to.equal('Invalid chain code format');
    } catch (err) {
      throw err;
    }
  });
  it(`(missing chain_code) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          amount: wrapAmt,
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing wraptokens.chain_code (type=string)');
    }
  });
  it(`(invalid chain_code) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          amount: wrapAmt,
          chain_code: "!invalid!@$",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.fields[0].name).to.equal('chain_code');
      expect(result.fields[0].value).to.equal('!invalid!@$');
      expect(result.fields[0].error).to.equal('Invalid chain code format');
    } catch (err) {
      throw err
    }
  });
  it(`(int chain_code) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          amount: wrapAmt,
          chain_code: 1234500000000,
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.fields[0].name).to.equal('chain_code');
      expect(result.fields[0].value).to.equal('1234500000000');
      expect(result.fields[0].error).to.equal('Invalid chain code format');
    } catch (err) {
      throw err;
    }
  });
  it(`(negative chain_code) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          amount: wrapAmt,
          chain_code: -1234500000000,
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.fields[0].name).to.equal('chain_code');
      expect(result.fields[0].value).to.equal('-1234500000000');
      expect(result.fields[0].error).to.equal('Invalid chain code format');
    } catch (err) {
      throw err;
    }
  });

  it(`(empty public_address) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: "",
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.fields[0].name).to.equal('public_address');
      expect(result.fields[0].value).to.equal('');
      expect(result.fields[0].error).to.equal('Invalid public address');
    } catch (err) {
      throw err;
    }
  });
  it(`(missing public_address) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing wraptokens.public_address (type=string)');
    }
  });

  /**
   *
   * TODO: How much validation for public_address?
   *    validate negative values or conversion to unsigned int?
   *
   */

  it.skip(`(invalid public_address) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: "!invalid!@$",
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });

      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid public address');
    }
  });
  it.skip(`(int public_address) try to wrap 1000 FIO tokens`, async function () {
    //TODO: should a number or negative value be treated like a string?
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: 1234500000000,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid public address');
    }
  });
  it.skip(`(negative public_address) try to wrap 1000 FIO tokens`, async function () {
    //TODO: should a number or negative value be treated like a string?
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: -1234500000000,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid public address');
    }
  });

  it(`(empty max_oracle_fee) try to wrap 1000 FIO tokens`, async function () {
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
          max_oracle_fee: "",
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.fields[0].name).to.equal('max_oracle_fee');
      expect(result.fields[0].value).to.equal('0');
      expect(result.fields[0].error).to.equal('Invalid oracle fee value');
    } catch (err) {
      throw err;
    }
  });
  it(`(missing max_oracle_fee) try to wrap 1000 FIO tokens`, async function () {
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
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing wraptokens.max_oracle_fee (type=int64)');
    }
  });
  it(`(invalid max_oracle_fee) try to wrap 1000 FIO tokens`, async function () {
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
          max_oracle_fee: "!invalid!@$",
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it.skip(`(negative max_oracle_fee) try to wrap 1000 FIO tokens`, async function () {
    //TODO: Bug - improper negative value validation
    let newBal;
    let bal = await user1.sdk.genericAction('getFioBalance', {});
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
          max_oracle_fee: -config.maxFee, //TODO: Check expected assertion text for max_oracle_fee
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });

      let oracleRecords = await getOracleRecords(user1.account)
      newBal = await user1.sdk.genericAction('getFioBalance', {});

      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.fee_collected).to.equal(400000000);
      expect(parseInt(result.oracle_fee_collected)).to.equal(60000000000);
    } catch (err) {
      newBal = await user1.sdk.genericAction('getFioBalance', {});
      expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
    }
  });
  it(`(api)(negative max_oracle_fee) try to wrap 1000 FIO tokens, expect max_oracle_fee to cast to unsigned integer`, async function () {
    //TODO: incorrect error message - should

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
          max_oracle_fee: -config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed).to.have.all.keys('id', 'block_num', 'block_time', 'producer_block_id', 'receipt', 'elapsed', 'net_usage', 'scheduled', 'action_traces', 'account_ram_delta', 'except', 'error_code');
      //expect(result.processed.receipt).to.have.all.keys('status', 'cpu_usage_as', 'net_usage_words');
      expect(result.processed.action_traces.length).to.equal(1);
    } catch (err) {
      throw err;
    }
  });


  it(`(empty max_fee) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: "",
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Fee exceeds supplied maximum.');
    }
  });
  it(`(missing max_fee) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          //max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing wraptokens.max_fee (type=int64)');
    }
  });
  it(`(invalid max_fee) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: "!invalid!@$",
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(negative max_fee) try to wrap 1000 FIO tokens`, async function () {
    //TODO: Bug - negative value validation or conversion to unsigned int?
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: -config.maxFee,
          tpid: "",
        }
      });
      // expect(result).to.have.all.keys('transaction_id', 'processed');
      // expect(result.processed).to.have.all.keys('id', 'block_num', 'block_time', 'producer_block_id', 'receipt', 'elapsed', 'net_usage', 'scheduled', 'action_traces', 'account_ram_delta', 'except', 'error_code');
      // expect(result.processed.receipt).to.have.all.keys('status', 'cpu_usage_as', 'net_usage_words');
      // expect(result.processed.action_traces.length).to.equal(1);
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(400000000);
      expect(parseInt(result.oracle_fee_collected)).to.equal(60000000000);
    } catch (err) {
      // expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
      throw err;
    }
  });

  it(`(api)(negative max_fee) try to wrap 1000 FIO tokens, expect max_fee to cast to unsigned integer`, async function () {
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
          max_fee: -config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed).to.have.all.keys('id', 'block_num', 'block_time', 'producer_block_id', 'receipt', 'elapsed', 'net_usage', 'scheduled', 'action_traces', 'account_ram_delta', 'except', 'error_code');
      expect(result.processed.receipt).to.have.all.keys('status', 'cpu_usage_us', 'net_usage_words');
      expect(result.processed.action_traces.length).to.equal(1);
    } catch (err) {
      throw err;
    }
  });

  it(`(missing tpid) try to wrap 1000 FIO tokens, expect OK - SDK should use default value`, async function () {
    // skipping because the SDK adds a default value
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          //tpid: "",
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(400000000);
      expect(parseInt(result.oracle_fee_collected)).to.equal(60000000000);
    } catch (err) {
      // expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
      throw err;
    }
  });

  it(`(api)(missing tpid) try to wrap 1000 FIO tokens`, async function () {
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
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing wraptokens.tpid (type=string)');
    }
  });

  it(`(invalid tpid) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "!invalid!@",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('TPID must be empty or valid FIO address');
    }
  });
  it(`(int tpid) try to wrap 1000 FIO tokens`, async function () {
    //TODO: Bug - integer tpid
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: 1234500000000,
        }
      });
      expect(result.status).to.not.equal('OK');
      // expect(result.fee_collected).to.equal(400000000);
      // expect(parseInt(result.oracle_fee_collected)).to.equal(60000000000);
    } catch (err) {
      console.log(err);
      expect(err.json.error.details[0].message).to.equal('TPID must be empty or valid FIO address');
    }
  });
  it(`(api)(int tpid) try to wrap 1000 FIO tokens`, async function () {
    //TODO: Bug - integer tpid
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
          tpid: 1234500000000,
          actor: user1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      // expect(result.status).to.equal('OK');
      // expect(result.fee_collected).to.equal(400000000);
      // expect(parseInt(result.oracle_fee_collected)).to.equal(60000000000);
    } catch (err) {
      console.log(err);
      expect(err.json.error.details[0].message).to.equal('TPID must be empty or valid FIO address');
    }
  });

  it(`(negative tpid) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: -12345,
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('TPID must be empty or valid FIO address');
    }
  });

  it(`(invalid actor) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: "!invalid!@"
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.error.details[0].message).to.equal('missing authority of .invalid');
    }
  });
  it(`(int actor) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: 1234500000000
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });
  it(`(negative actor) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: -12345,
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });

  let preWrapBal, postWrapBal, wrappingFee, wrappingOracleFee;

  it(`get user1 balance, expect ???`, async function () {
    preWrapBal = await user1.sdk.genericAction('getFioBalance', {});
    console.log(preWrapBal);
  });

  it(`(happy w/ tpid) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: user1.address,
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(400000000);
      expect(parseInt(result.oracle_fee_collected)).to.equal(60000000000);
    } catch (err) {
      throw err;
    }
  });

  it(`(happy w/ tpid v2) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: [newOracle.address]
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(400000000);
      expect(parseInt(result.oracle_fee_collected)).to.equal(60000000000);
    } catch (err) {
      // expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
      throw err;
    }
  });

  it(`(happy w/o tpid) try to wrap FIO tokens, expect OK`, async function () {
    let postWrapBalDiff, postWrapAvailDiff;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(400000000);
      expect(parseInt(result.oracle_fee_collected)).to.equal(60000000000);
      wrappingFee = result.fee_collected;
      wrappingOracleFee = parseInt(result.oracle_fee_collected);

      //400000000
      //60000000000

      // postWrapBal = await user1.sdk.genericAction('getFioBalance', {});
      // postWrapBalDiff = preWrapBal.balance - postWrapBal.balance;
      // postWrapAvailDiff = preWrapBal.available - postWrapBal.available;
      // let expValue = wrapAmt + wrappingFee + wrappingOracleFee;
      // expect(postWrapBalDiff).to.equal(expValue); //(preWrapBal.balance - wrappingFee - parseInt(wrappingOracleFee));
      // expect(postWrapAvailDiff).to.equal(expValue); //(preWrapBal.balance - wrappingFee - parseInt(wrappingOracleFee));
    } catch (err) {
      throw err;
    }
  });
});

describe(`G. [FIO][api] Unwrap FIO tokens`, function () {
  //TODO: Write / move API unwrapping tests here

});

describe(`H. [FIO][api] Wrap FIO domains`, function () {

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
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: newOracle.address,
          fio_pub_key: newOracle.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          actor: newOracle.account,
          max_fee: config.api.register_producer.fee
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.register_producer.fee);
    } catch (err) {
      console.log('Error: ', err.json)
      throw err;
    }

    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: newOracle1.address,
          fio_pub_key: newOracle1.publicKey,
          url: "https://mywebsite1.io/",
          location: 80,
          actor: newOracle1.account,
          max_fee: config.api.register_producer.fee
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.register_producer.fee);
    } catch (err) {
      console.log('Error: ', err.json)
      throw err;
    }

    try {
      const result = await newOracle2.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: newOracle2.address,
          fio_pub_key: newOracle2.publicKey,
          url: "https://mywebsite2.io/",
          location: 80,
          actor: newOracle2.account,
          max_fee: config.api.register_producer.fee
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.register_producer.fee);
    } catch (err) {
      console.log('Error: ', err.json)
      throw err;
    }

    // await newOracle
    try {
      const result1 = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: newOracle.account,
          actor: newOracle.account
        }
      });
      expect(result1).to.have.property('status').which.is.a('string').and.equals('OK');
    } catch (err) {
      throw err;
    }

    // await newOracle1
    try {
      const result2 = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: newOracle1.account,
          actor: newOracle1.account
        }
      });
      expect(result2).to.have.property('status').which.is.a('string').and.equals('OK');
    } catch (err) {
      throw err;
    }

    // await newOracle2
    try {
      const result3 = await newOracle2.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: newOracle2.account,
          actor: newOracle2.account
        }
      });
      expect(result3).to.have.property('status').which.is.a('string').and.equals('OK');
    } catch (err) {
      throw err;
    }

    // set oracle fees
    try {
      await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 10000000000,
          wrap_fio_tokens: 11000000000
        }
      });
      await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 11000000000,
          wrap_fio_tokens: 20000000000
        }
      });
      await newOracle2.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 20000000000,
          wrap_fio_tokens: 21000000000
        }
      });
    } catch (err) {
      console.log('error setting fees for new oracles: ', err);
      throw err;
    }

    await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: 10000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

    [wfioAccts, wfio] = await setupWFIOontracts(ethers, INIT_SUPPLY);
    await registerWfioOracles(wfio, wfioAccts);

    try {
      //const result = await user1.sdk.genericAction('pushTransaction', {
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
      // wrappingFee = result.fee_collected;
      // wrappingOracleFee = parseInt(result.oracle_fee_collected);
      // expect(result.status).to.equal('OK');

      //400000000
      //60000000000

      // postWrapBal = await user1.sdk.genericAction('getFioBalance', {});
      // postWrapBalDiff = preWrapBal.balance - postWrapBal.balance;
      // postWrapAvailDiff = preWrapBal.available - postWrapBal.available;
      // let expValue = wrapAmt + wrappingFee + wrappingOracleFee;
      // expect(postWrapBalDiff).to.equal(expValue); //(preWrapBal.balance - wrappingFee - parseInt(wrappingOracleFee));
      // expect(postWrapAvailDiff).to.equal(expValue); //(preWrapBal.balance - wrappingFee - parseInt(wrappingOracleFee));
    } catch (err) {
      console.log('error wrapping test tokens: ', err);
      throw err;
    }

    // call wfio.wrap
    let fromStartingBal = await accounts[14].getBalance();
    let toStartingWfioBal = await wfio.balanceOf(accounts[0].address);

    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, OBT_ID);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, OBT_ID);
    try {
      let result = await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, OBT_ID);
      let fromEndingBal = await accounts[14].getBalance();
      let toEndingWfioBal = await wfio.balanceOf(accounts[0].address);
      expect(result.from).to.equal(accounts[14].address);
      expect(result.to).to.equal(wfio.address);
      expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
      expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.true;
      expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(100)
    } catch (err) {
      throw err;
    }
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
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
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
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Actor and domain owner mismatch.');
    }
  });

  it(`(int chain_code) try to wrap a FIO domain`, async function () {
    //todo: bug - chain_code validation
    //  test with the API, verify whether SDK is using default values
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
    } catch (err) {
      // expect(err.message).to.equal('Invalid chain code format');
      expect(err.json.fields[0].error).to.equal('Invalid chain code format');
    }
  });

  it(`(invalid public_address) try to wrap a FIO domain`, async function () {
    // todo: test with the API, verify whether SDK is using default values
    //  appears to be a BUG
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
      expect(result.fields[0].error).to.equal('Invalid public address');
      //expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      // expect(err.message).to.equal('Invalid public address');
      // expect(err.json.fields[0].error).to.equal('Invalid public address');
      throw err;
    }
  });
  it(`(int public_address) try to wrap a FIO domain`, async function () {
    // todo: test with the API, verify whether SDK is using default values
    //    appears to be a BUG
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
    // todo: test with the API, verify whether SDK is using default values
    //    appears to be a BUG
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
    //TODO: test with API, see if SDK is using default values
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
    //TODO: test with API
    //  also verify if signed int is being cast to uint
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
    //TODO: test with API for default values
    //    verify any casting issues
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
    //TODO: test with API for default values or int to uint casting
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

  it(`(int tpid) try to wrap a FIO domain`, async function () {
    // todo: invalid tpid validation producing wrong exception
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

// describe(`H. [FIO] Unwrap FIO domains`, function () {
//
//   let wrapAmt = 1000000000000;
//   let oracle1, oracle2, oracle3, user1, newOracle1, newOracle2, newOracle3, newOracle4,
//       user2,
//       user3,
//       user4,
//       user5,
//       user6,
//       user7,
//       user8,
//       user9,
//       user10,
//       user11,
//       user12,
//       user13,
//       user14;
//
//   let wfioOwner, wfioAccts, custodians, factory, wfio;
//   let OBT_ID;
//
//   before(async function () {
//     // oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
//     // oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
//
//     // test users
//     oracle1 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
//     user1 = await newUser(faucet);
//     user2 = await newUser(faucet);
//     // user3 = await newUser(faucet);
//     // user4 = await newUser(faucet);
//     // user5 = await newUser(faucet);
//     // user6 = await newUser(faucet);
//     // user7 = await newUser(faucet);
//     // user8 = await newUser(faucet);
//     // user9 = await newUser(faucet);
//     // user10 = await newUser(faucet);
//     // user11 = await newUser(faucet);
//     // user12 = await newUser(faucet);
//     // user13 = await newUser(faucet);
//     // user14 = await newUser(faucet);
//     newOracle1 = await newUser(faucet);
//     newOracle2 = await newUser(faucet);
//     newOracle3 = await newUser(faucet);
//     newOracle4 = await newUser(faucet);
//
//     // register new oracles as bps
//     await registerNewBp(newOracle1);
//     await registerNewBp(newOracle2);
//     await registerNewBp(newOracle3);
//     await registerNewBp(newOracle4);
//
//     // register oracles
//     await registerNewOracle(newOracle1);
//     await registerNewOracle(newOracle2);
//     await registerNewOracle(newOracle3);
//     await registerNewOracle(newOracle4);
//
//     // set oracle fees
//     await setTestOracleFees(newOracle1, 10000000000, 11000000000);
//     await setTestOracleFees(newOracle2, 11000000000, 20000000000);
//     await setTestOracleFees(newOracle3, 20000000000, 21000000000);
//     await setTestOracleFees(newOracle4, 20000000000, 21500000000);
//
//     await faucet.genericAction('transferTokens', {
//       payeeFioPublicKey: user1.publicKey,
//       amount: 10000000000000,
//       maxFee: config.api.transfer_tokens_pub_key.fee,
//       technologyProviderId: ''
//     });
//
//     [wfioAccts, wfio] = await setupWFIOontracts();
//     await registerWfioOracles(wfio, wfioAccts);
//
//     try {
//       const result = await callFioApiSigned('push_transaction', {
//         action: 'wraptokens',
//         account: 'fio.oracle',
//         actor: user1.account,
//         privKey: user1.privateKey,
//         data: {
//           amount: wrapAmt,
//           chain_code: "ETH",
//           public_address: wfio.address,
//           max_oracle_fee: config.maxFee,
//           max_fee: config.maxFee,
//           tpid: "",
//           actor: user1.account
//         }
//       });
//       OBT_ID = result.transaction_id;
//     } catch (err) {
//       console.log('error wrapping test tokens: ', err);
//       throw err;
//     }
//
//     // call wfio.wrap
//     // let fromStartingBal = await wfioAccts[14].getBalance();
//     // let toStartingWfioBal = await wfio.balanceOf(wfioAccts[0].address);
//
//     await wfio.connect(wfioAccts[12]).wrap(wfioAccts[0].address, 100, OBT_ID);
//     await wfio.connect(wfioAccts[13]).wrap(wfioAccts[0].address, 100, OBT_ID);
//     try {
//       // let result =
//       await wfio.connect(wfioAccts[14]).wrap(wfioAccts[0].address, 100, OBT_ID);
//       // let fromEndingBal = await wfioAccts[14].getBalance();
//       // let toEndingWfioBal = await wfio.balanceOf(wfioAccts[0].address);
//       // expect(result.from).to.equal(wfioAccts[14].address);
//       // expect(result.to).to.equal(wfio.address);
//       // expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
//       // expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.true;
//       // expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(100)
//     } catch (err) {
//       throw err;
//     }
//
//     // finally, wrap our domain
//     let domain = user1.domain;
//     try {
//       const result = await user1.sdk.genericAction('pushTransaction', {
//         action: 'wrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: domain,
//           chain_code: "ETH",
//           public_address: wfio.address,
//           max_oracle_fee: config.maxFee,
//           max_fee: config.maxFee,
//           tpid: "",
//           actor: user1.account
//         }
//       });
//     } catch (err) {
//       throw err;
//     }
//   });
//
//   // happy tests
//   it(`try to unwrap a FIO domain, expect OK`, async function () {
//     try {
//       const result = await newOracle3.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: user1.domain,
//           obt_id: OBT_ID,
//           fio_address: user1.address,
//           actor: newOracle3.account
//         }
//       });
//       expect(result.status).to.equal('OK');
//     } catch (err) {
//       throw err;
//     }
//   });
//
//   // happy ish tests (SDK default values get injected into otherwise invalid requests)
//   it(`(empty actor) try to unwrap a FIO domain, expect SDK to use default actor value`, async function () {
//     try {
//       const result = await newOracle1.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: user1.domain,
//           obt_id: OBT_ID,
//           fio_address: user1.address,
//           actor: "" // SDK default?
//         }
//       });
//       expect(result.status).to.equal('OK');
//     } catch (err) {
//       throw err;
//     }
//   });
//   it(`(missing actor) try to unwrap a FIO domain, expect SDK to use default actor value`, async function () {
//     try {
//       const result = await newOracle2.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: user1.domain,
//           obt_id: OBT_ID,
//           fio_address: user1.address,
//         }
//       });
//       expect(result.status).to.equal('OK');
//     } catch (err) {
//       throw err;
//     }
//   });
//
//
//   // unhappy tests
//   it(`(empty fio_domain) try to unwrap a FIO domain`, async function () {
//     try {
//       const result = await newOracle1.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: "",
//           obt_id: OBT_ID,
//           fio_address: user1.address,
//           actor: newOracle1.account
//         }
//       });
//       expect(result.status).to.equal('OK');
//     } catch (err) {
//       expect(err.json.fields[0].name).to.equal('fio_domain');
//       expect(err.json.fields[0].value).to.equal('');
//       expect(err.json.fields[0].error).to.equal('FIO domain not found');
//     }
//   });
//
//
//
//
//
//
//
//   it(`(missing fio_domain) try to unwrap a FIO domain`, async function () {
//     try {
//       const result = await newOracle1.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           obt_id: OBT_ID,
//           fio_address: user1.address,
//           actor: newOracle1.account
//         }
//       });
//       expect(result.status).to.not.equal('OK');
//     } catch (err) {
//       expect(err.message).to.equal('missing unwrapdomain.fio_domain (type=string)');
//     }
//   });
//   it(`(invalid fio_domain) try to unwrap a FIO domain`, async function () {
//     try {
//       const result = await newOracle1.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: "!invalid@$",
//           obt_id: OBT_ID,
//           fio_address: user1.address,
//           actor: newOracle1.account
//         }
//       });
//       expect(result.status).to.not.equal('OK');
//     } catch (err) {
//       expect(err.json.fields[0].name).to.equal('fio_domain');
//       expect(err.json.fields[0].value).to.equal('!invalid@$');
//       expect(err.json.fields[0].error).to.equal('Invalid FIO domain');
//     }
//   });
//   it(`(int fio_domain) try to unwrap a FIO domain`, async function () {
//     try {
//       const result = await newOracle1.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: 1234500000000,
//           obt_id: OBT_ID,
//           fio_address: user1.address,
//           actor: newOracle1.account
//         }
//       });
//       expect(result.status).to.not.equal('OK');
//     } catch (err) {
//       expect(err.json.fields[0].name).to.equal('fio_domain');
//       expect(err.json.fields[0].value).to.equal('1234500000000');
//       expect(err.json.fields[0].error).to.equal('FIO domain not found');
//     }
//   });
//   it(`(negative fio_domain) try to unwrap a FIO domain`, async function () {
//     try {
//       const result = await newOracle1.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: -1234500000000,
//           obt_id: OBT_ID,
//           fio_address: user1.address,
//           actor: newOracle1.account
//         }
//       });
//       expect(result.status).to.equal('OK');
//     } catch (err) {
//       expect(err.json.fields[0].name).to.equal('fio_domain');
//       expect(err.json.fields[0].value).to.equal('-1234500000000');
//       expect(err.json.fields[0].error).to.equal('FIO domain not found');
//     }
//   });
//
//   it(`(empty obt_id) try to unwrap a FIO domain`, async function () {
//     // TODO: Bug - improper obt_id validation
//     try {
//       const result = await user1.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: user1.domain,
//           obt_id: "",
//           fio_address: user1.address,
//           actor: newOracle4.account
//         }
//       });
//       expect(result.status).to.not.equal('OK');
//     } catch (err) {
//       expect(err.json.fields[0].name).to.equal('obt_id');
//       expect(err.json.fields[0].value).to.equal('');
//       expect(err.json.fields[0].error).to.equal('FIO domain not found');
//     }
//   });
//   it(`(missing obt_id) try to unwrap a FIO domain`, async function () {
//     try {
//       const result = await newOracle1.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: user1.domain,
//           fio_address: user1.address,
//           actor: newOracle1.account
//         }
//       });
//       expect(result.status).to.not.equal('OK');
//     } catch (err) {
//       expect(err.message).to.equal('missing unwrapdomain.obt_id (type=string)');
//     }
//   });
//   it(`(invalid obt_id) try to unwrap a FIO domain`, async function () {
//     try {
//       const result = await newOracle1.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: user1.domain,
//           obt_id: "!invalid@$",
//           fio_address: user1.address,
//           actor: newOracle1.account
//         }
//       });
//       expect(result.status).to.equal('OK');
//     } catch (err) {
//       expect(err.json.fields[0].name).to.equal('fio_domain');
//       expect(err.json.fields[0].value).to.equal('');
//       expect(err.json.fields[0].error).to.equal('FIO domain not found');
//     }
//   });
//   it(`(int obt_id) try to unwrap a FIO domain`, async function () {
//     try {
//       const result = await newOracle1.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: user1.domain,
//           obt_id: 1234500000000,
//           fio_address: user1.address,
//           actor: newOracle1.account
//         }
//       });
//       expect(result.status).to.equal('OK');
//     } catch (err) {
//       expect(err.json.fields[0].name).to.equal('fio_domain');
//       expect(err.json.fields[0].value).to.equal('');
//       expect(err.json.fields[0].error).to.equal('FIO domain not found');
//     }
//   });
//   it(`(negative obt_id) try to unwrap a FIO domain`, async function () {
//     try {
//       const result = await newOracle1.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: user1.domain,
//           obt_id: -1234500000000,
//           fio_address: user1.address,
//           actor: newOracle1.account
//         }
//       });
//       expect(result.status).to.equal('OK');
//     } catch (err) {
//       expect(err.json.fields[0].name).to.equal('fio_domain');
//       expect(err.json.fields[0].value).to.equal('');
//       expect(err.json.fields[0].error).to.equal('FIO domain not found');
//     }
//   });
//
//   it(`(empty fio_address) try to unwrap a FIO domain`, async function () {
//     try {
//       const result = await newOracle1.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: user1.domain,
//           obt_id: 1234500000000,
//           fio_address: "",
//           actor: newOracle1.account
//         }
//       });
//       expect(result.status).to.equal('OK');
//     } catch (err) {
//       expect(err.json.fields[0].name).to.equal('fio_domain');
//       expect(err.json.fields[0].value).to.equal('');
//       expect(err.json.fields[0].error).to.equal('FIO domain not found');
//     }
//   });
//   it(`(missing fio_address) try to unwrap a FIO domain`, async function () {
//     try {
//       const result = await newOracle1.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: user1.domain,
//           obt_id: OBT_ID,
//           actor: newOracle1.account
//         }
//       });
//       expect(result.status).to.equal('OK');
//     } catch (err) {
//       expect(err.json.fields[0].name).to.equal('fio_domain');
//       expect(err.json.fields[0].value).to.equal('');
//       expect(err.json.fields[0].error).to.equal('FIO domain not found');
//     }
//   });
//   it(`(invalid fio_address) try to unwrap a FIO domain`, async function () {
//     try {
//       const result = await newOracle1.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: user1.domain,
//           obt_id: OBT_ID,
//           fio_address: "!invalid@$",
//           actor: newOracle1.account
//         }
//       });
//       expect(result.status).to.equal('OK');
//     } catch (err) {
//       expect(err.json.fields[0].name).to.equal('fio_domain');
//       expect(err.json.fields[0].value).to.equal('');
//       expect(err.json.fields[0].error).to.equal('FIO domain not found');
//     }
//   });
//   it(`(int fio_address) try to unwrap a FIO domain`, async function () {
//     try {
//       const result = await newOracle1.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: user1.domain,
//           obt_id: OBT_ID,
//           fio_address: 1234500000000,
//           actor: newOracle1.account
//         }
//       });
//       expect(result.status).to.equal('OK');
//     } catch (err) {
//       expect(err.json.fields[0].name).to.equal('fio_domain');
//       expect(err.json.fields[0].value).to.equal('');
//       expect(err.json.fields[0].error).to.equal('FIO domain not found');
//     }
//   });
//   it(`(negative fio_address) try to unwrap a FIO domain`, async function () {
//     try {
//       const result = await newOracle1.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: user1.domain,
//           obt_id: OBT_ID,
//           fio_address: -1234500000000,
//           actor: newOracle1.account
//         }
//       });
//       expect(result.status).to.equal('OK');
//     } catch (err) {
//       expect(err.json.fields[0].name).to.equal('fio_domain');
//       expect(err.json.fields[0].value).to.equal('');
//       expect(err.json.fields[0].error).to.equal('FIO domain not found');
//     }
//   });
//
//   it(`(invalid actor) try to unwrap a FIO domain`, async function () {
//     try {
//       const result = await newOracle1.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: user1.domain,
//           obt_id: OBT_ID,
//           fio_address: user1.address,
//           actor: "!invalid@$"
//         }
//       });
//       expect(result.status).to.not.equal('OK');
//     } catch (err) {
//       expect(err.json.error.details[0].message).to.equal('missing authority of .invalid');
//     }
//   });
//   it(`(int actor) try to unwrap a FIO domain`, async function () {
//     try {
//       const result = await newOracle1.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: user1.domain,
//           obt_id: OBT_ID,
//           fio_address: user1.address,
//           actor: 1234500000000
//         }
//       });
//       expect(result.status).to.not.equal('OK');
//     } catch (err) {
//       expect(err.message).to.equal('Expected string containing name');
//     }
//   });
//   it(`(negative actor) try to unwrap a FIO domain`, async function () {
//     try {
//       const result = await newOracle1.sdk.genericAction('pushTransaction', {
//         action: 'unwrapdomain',
//         account: 'fio.oracle',
//         data: {
//           fio_domain: user1.domain,
//           obt_id: OBT_ID,
//           fio_address: user1.address,
//           actor: -12345
//         }
//       });
//       expect(result.status).to.not.equal('OK');
//     } catch (err) {
//       expect(err.message).to.equal('Expected string containing name');
//     }
//   });
// });
describe(`I. [FIO] Unwrap FIO domains`, function () {
  //void unwrapdomain(
  //    string &fio_domain,
  //    string &obt_id,
  //    string &fio_address,
  //    name &actor
  //    )
  // unhappy tests
  it(`(empty fio_domain) try to unwrap a FIO domain`);
  it(`(missing fio_domain) try to unwrap a FIO domain`);
  it(`(invalid fio_domain) try to unwrap a FIO domain`);
  it(`(int fio_domain) try to unwrap a FIO domain`);
  it(`(negative fio_domain) try to unwrap a FIO domain`);

  it(`(empty obt_id) try to unwrap a FIO domain`);
  it(`(missing obt_id) try to unwrap a FIO domain`);
  it(`(invalid obt_id) try to unwrap a FIO domain`);
  it(`(int obt_id) try to unwrap a FIO domain`);
  it(`(negative obt_id) try to unwrap a FIO domain`);

  it(`(empty fio_address) try to unwrap a FIO domain`);
  it(`(missing fio_address) try to unwrap a FIO domain`);
  it(`(invalid fio_address) try to unwrap a FIO domain`);
  it(`(int fio_address) try to unwrap a FIO domain`);
  it(`(negative fio_address) try to unwrap a FIO domain`);

  it(`(empty actor) try to unwrap a FIO domain`);
  it(`(missing actor) try to unwrap a FIO domain`);
  it(`(invalid actor) try to unwrap a FIO domain`);
  it(`(int actor) try to unwrap a FIO domain`);
  it(`(negative actor) try to unwrap a FIO domain`);
});
