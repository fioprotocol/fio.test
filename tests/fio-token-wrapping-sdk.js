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
  getRamForUser,
  randStr
} = require("../utils.js");
const {
  getOracleRecords,
  registerNewBp,
  registerNewOracle,
  setTestOracleFees,
  cleanUpOraclessTable,
  calculateOracleFeeFromOraclessTable
} = require("./Helpers/wrapping.js");
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
    console.log("          Cleaning up...");
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


describe(`************************** fio-token-wrapping-sdk.js ************************** \n   A. [FIO] Oracles (get_table_rows)`, function () {
  let userA, oracle1, oracle2, oracle3;

  it(`clean out oracless record with helper function`, async function () {
    try {
      await cleanUpOraclessTable(faucet, true);
    } catch (err) {
      console.log('Error: ', err)
      throw err;
    }
  });

  it(`confirm oracles table is empty`, async function () {
    try {
      let records = await getOracleRecords();
      //console.log('Records: ', records);
      expect(records.rows.length).to.equal(0);
    } catch (err) {
      console.log('Error: ', err)
      throw err;
    }
  });

  it('Add new oracles', async function () {
    oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    userA = await newUser(faucet);
  });

  it(`userA registers existing oracle1`, async function () {
    try {
      const result = await userA.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: oracle1.account,
          actor: oracle1.account
        }
      });
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('err: ', err.json.error);
      expect(err.json.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
    }
  });
  it(`userA registers existing oracle2`, async function () {
    try {
      const result = await userA.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: oracle2.account,
          actor: oracle2.account
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err.json.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
    }
  });
  it(`userA registers existing oracle3`, async function () {
    try {
      const result = await userA.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: oracle3.account,
          actor: oracle3.account
        }
      });
      expect(result.status).to.equal('OK');
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
});

describe(`B. [FIO] Oracles (register)`, function () {
  let user1, user2, user3, oracle1, oracle2, oracle3, newOracle1, newOracle2, newOracle3;

  before(async function () {
    oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    newOracle1 = await newUser(faucet);
    newOracle2 = await newUser(faucet);
    newOracle3 = await newUser(faucet);
    await registerNewBp(newOracle1);
    await registerNewBp(newOracle2);
    await registerNewBp(newOracle3);
  });

  it(`user1 registers as a new block producer`, async () => {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user1.address,
          fio_pub_key: user1.publicKey,
          url: "https://mywebsite.io/",
          location: 80,
          actor: user1.account,
          max_fee: config.api.register_producer.fee
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.register_producer.fee);
    } catch (err) {
      throw err;
    }
  });

  it(`user2 registers user1 as a new oracle, expect OK status`, async function () {
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: user1.account,
          actor: user2.account
        }
      });
      expect(result.status).to.equal('OK');
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

  // happy ish tests (SDK default values get injected into otherwise invalid requests)
  it(`(empty actor) user3 tries to register an oracle, expect SDK to inject default value`, async function () {
    try {
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: newOracle1.account,
          actor: "",
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      throw err;
    }
  });

  // unhappy tests
  it(`(non-bp user) user2 tries to register user3 as an oracle, expect Error`, async function () {
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: user3.account,
          actor: user2.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('Oracle not active producer');
    }
  });

  it(`(empty oracle_actor) user1 tries to register an oracle, expect Error`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: "",
          actor: user1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('Account is not bound on the fio chain');
    }
  });

  it(`(missing oracle_actor) user1 tries to register an oracle, expect Error`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          actor: user2.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing regoracle.oracle_actor (type=name)');
    }
  });

  it(`(invalid oracle_actor) user1 tries to register an oracle, expect Error`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: "!invalid!@$",
          actor: user2.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('Account is not bound on the fio chain');
    }
  });

  it(`(int oracle_actor) user1 tries to register an oracle, expect Error`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: 1234500000000,
          actor: user2.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });

  it(`(negative oracle_actor) user1 tries to register an oracle, expect Error`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: -1234500000000,
          actor: user3.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });

  it(`user2 registers as a new block producer`, async () => {
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'regproducer',
        account: 'eosio',
        data: {
          fio_address: user2.address,
          fio_pub_key: user2.publicKey,
          url: "https://mywebsite2.io/",
          location: 80,
          actor: user2.account,
          max_fee: config.api.register_producer.fee
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(config.api.register_producer.fee);
    } catch (err) {
      throw err;
    }
  });

  it(`(invalid actor) user3 tries to register user2 as an oracle, expect Error`, async function () {
    try {
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: user2.account,
          actor: "!invalid!@$",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('code', 'message', 'error');
      expect(err.json.error.what).to.equal('unknown key (eosio::chain::name): .invalid');
    }
  });

  it(`(int actor) user1 tries to register an oracle, expect Error`, async function () {
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: user3.account,
          actor: 1234500000000
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });

  it(`(negative actor) user1 tries to register an oracle, expect Error`, async function () {
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: user3.account,
          actor: -1234500000000
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });

  it(`(missing actor) user3 tries to register user2 as an oracle, expect SDK to inject default value`, async function () {
    try {
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: user2.account,
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      throw err;
    }
  });
});

describe(`C. [FIO] Oracles (unregister)`, function () {
  let user1, user2, user3, newOracle1, newOracle2, newOracle3, oracle1, oracle2, oracle3;

  before(async function () {
    oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    // oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    // oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    // user1 = await newUser(faucet);
    // user2 = await newUser(faucet);
    // user3 = await newUser(faucet);
    newOracle1 = await newUser(faucet);
    newOracle2 = await newUser(faucet);
    newOracle3 = await newUser(faucet);
    await registerNewBp(newOracle1);
    await registerNewBp(newOracle2);
    await registerNewBp(newOracle3);
    await registerNewOracle(newOracle1);
    await registerNewOracle(newOracle2);
    await registerNewOracle(newOracle3);
    await setTestOracleFees(newOracle1, 1000000000, 1200000000);
    await setTestOracleFees(newOracle2, 1500000000, 2500000000);
    await setTestOracleFees(newOracle3, 1750000000, 2950000000);

    try {
      await registerNewOracle(oracle1);
    } catch (err) {
      expect(err.json.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
    }
  });

  it(`(empty oracle_actor) newOracle tries to unregister an oracle, expect Error`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: "",
          actor: newOracle1.account
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

  it(`(missing oracle_actor) try to unregister an oracle, expect Error`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: "",
          actor: newOracle1.account
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
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: "!invalid!@$",
          actor: newOracle1.account
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
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: 1234400000000,
          actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });

  it(`(negative oracle_actor) try to unregister an oracle, expect Error`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: -1234400000000,
          actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });

  let prevRecordIdx, currentRecordIdx;

  it(`get pre-unwrap oracle records`, async function () {
    prevRecordIdx = await getOracleRecords();
  });

  it(`(happy path) oracle1 tries to unregister newOracle, expect OK`, async function () {
    try {
      const result = await oracle1.sdk.genericAction('pushTransaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: newOracle3.account,
        }
      });
      currentRecordIdx = await getOracleRecords();
      expect(result.status).to.equal('OK');
      expect(currentRecordIdx.rows.length).to.equal(prevRecordIdx.rows.length - 1);
    } catch (err) {
      let oracleRecs = await getOracleRecords();
      throw err;
    }
  });
});

describe(`D. [FIO] Oracles (setoraclefees)`, function () {

  let oracle1, newOracle, user1, newOracle1, newOracle2, newOracle3, newOracle4, newOracle5;

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
    newOracle3 = await newUser(faucet);
    newOracle4 = await newUser(faucet);
    newOracle5 = await newUser(faucet);

    // register new oracles
    await registerNewBp(newOracle);
    await registerNewBp(newOracle1);
    await registerNewBp(newOracle2);
    await registerNewBp(newOracle3);
    await registerNewBp(newOracle4);
    await registerNewBp(newOracle5);

    await registerNewOracle(newOracle);
    await registerNewOracle(newOracle1);
    await registerNewOracle(newOracle2);
    await registerNewOracle(newOracle3);
    await registerNewOracle(newOracle4);
    await registerNewOracle(newOracle5);
  });

  it(`newOracle tries to set oracle fee, expect OK`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 1000000000,
          wrap_fio_tokens: 1100000000
        }
      });
      expect(result).to.have.property('status').which.is.a('string').and.equals('OK');
    } catch (err) {
      throw err;
    }
  });

  // happy ish tests (SDK default values get injected into otherwise invalid requests)
  it(`(empty wrap_fio_domain) try to set oracle fees, expect SDK to replace "" with 0`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain:  "",
          wrap_fio_tokens: 1
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      const oracleRecords = await getOracleRecords(newOracle.account);
      expect(oracleRecords.rows[0].fees[0].fee_amount).to.equal(0);
      expect(oracleRecords.rows[0].fees[1].fee_amount).to.equal(1);
    }
  });

  it(`(empty wrap_fio_tokens) try to set oracle fees, expect SDK to replace "" with 0`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: ""
        }
      });
      // expect(result.status).to.not.equal('OK');
      expect(result.status).to.equal('OK');
    } catch (err) {
      const oracleRecords = await getOracleRecords(newOracle.account);
      throw err;
    }
  });

  it(`(empty actor) try to set oracle fees, expect SDK to replace "" with 0`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 10000000000,
          wrap_fio_tokens: 12000000000,
          actor: ""
        }
      });
      expect(result.status).to.equal('OK');
      const oracleRecords = await getOracleRecords(newOracle.account);
      expect(oracleRecords.rows[0].fees[0].fee_amount).to.equal(10000000000);
      expect(oracleRecords.rows[0].fees[1].fee_amount).to.equal(12000000000);
    } catch (err) {
      expect(err.json.error.details[0].message).to.equal('missing authority of .invalid');
    }
  });

  it(`(missing actor) try to set oracle fees, expect SDK to inject default value`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: 1,
          //actor: "!invalid!@$"
        }
      });
      const oracleRecords = await getOracleRecords(newOracle.account);


      expect(result.status).to.equal('OK');
    } catch (err) {

      expect(err.json.error.details[0].message).to.equal('missing authority of .invalid');
    }
  });

  // issues
  it(`(negative wrap_fio_domain) try to set oracle fees, expect Error(BD-3406 Fixed)`, async function () {
    try {
      const result = await newOracle5.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain:  -1234500000000,
          wrap_fio_tokens: 1
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      const oracleRecords = await getOracleRecords(newOracle5.account);
      expect(oracleRecords.rows[0].fees).to.be.empty
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json.fields[0].name).to.equal('wrap_fio_domain');
      expect(err.json.fields[0].value).to.equal('-1234500000000');
      expect(err.json.fields[0].error).to.equal('Invalid fee value');
    }
  });

  it(`(negative wrap_fio_tokens) try to set oracle fees, expect Error (BD-3406 fixed)`, async function () {
    try{
      const result = await newOracle5.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: -1234500000000,
          actor: newOracle5.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      const oracleRecords = await getOracleRecords(newOracle5.account);
      expect(oracleRecords.rows[0].fees).to.be.empty
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json.fields[0].name).to.equal('wrap_fio_tokens');
      expect(err.json.fields[0].value).to.equal('-1234500000000');
      expect(err.json.fields[0].error).to.equal('Invalid fee value');
    }
  });

  //unhappy tests
  it(`(missing wrap_fio_domain) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_tokens: 1
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing setoraclefee.wrap_fio_domain (type=int64)');
    }
  });

  it(`(invalid wrap_fio_domain) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain:  "!invalid!@$",
          wrap_fio_tokens: 1
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(overflow wrap_fio_domain) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain:  1234500000000000000000,
          wrap_fio_tokens: 1
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(missing wrap_fio_tokens) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 1,
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing setoraclefee.wrap_fio_tokens (type=int64)');
    }
  });

  it(`(invalid wrap_fio_tokens) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: "!invalid!@$"
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(overflow wrap_fio_tokens) try to set oracle fees, expect Error`, async function () {
    try{
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: 1234500000000000000000
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(invalid actor) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: 1,
          actor: "!invalid!@$"
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.error.details[0].message).to.equal('missing authority of .invalid');
    }
  });

  it(`(int actor) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: 1,
          actor: 1234500000000000000000
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });

  it(`(negative actor) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: 1,
          actor: -1000000000000
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
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

describe(`E. Register 3 oracles, only have 2 oracles set fees, call get_oracle_fees (BD-3788 - fixed)`, function () {

  let oracle1, newOracle, newOracle2, newOracle3,  user1;
  let ORACLE_FEE;

  before(async function () {
    user1 = await newUser(faucet);
  });

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

  it('try to get the wrapping fees from the API, expect:Not enough registered oracles.', async function () {
    try {
      ORACLE_FEE = await callFioApi('get_oracle_fees', {});
    } catch (err) {
      //console.log('Error: ', err);
      expect(err.error.message).to.equal('Not enough registered oracles.');
    }
  });

  it(`register new oracles for testing`, async function () {
    try {
      newOracle = await newUser(faucet);
      newOracle2 = await newUser(faucet);
      newOracle3 = await newUser(faucet);

      // register a new oracle
      await registerNewBp(newOracle);
      await registerNewOracle(newOracle);
      await setTestOracleFees(newOracle, 1000000000, 1200000000);

      await registerNewBp(newOracle2);
      await registerNewOracle(newOracle2);
      await setTestOracleFees(newOracle2, 1000000000, 1200000000);

      await registerNewBp(newOracle3);
      await registerNewOracle(newOracle3);
      //await setTestOracleFees(newOracle3, 3000000000, 3200000000);  // Comment out this line to cause crash
    } catch (err) {
      console.log('Error: ', err);
      throw err;
    }
  });

  it('get oracles', async function () {
    const oracleRecords = await getOracleRecords();
    //console.log('Oracles: ', oracleRecords);
  });

  it('try to get the wrapping fees from the API, expect 404 error: Not enough oracle fee votes.', async function () {
    try {
      ORACLE_FEE = await callFioApi('get_oracle_fees', {});
    } catch (err) {
      //console.log('Error: ', err);
      expect(err.error.message).to.equal('Not enough oracle fee votes.');
      expect(err.statusCode).to.equal(404);
    }
  });
});

describe(`E.2 Register 3 oracles, set all fees, call get_oracle_fees.`, function () {

  let oracle1, newOracle, newOracle2, newOracle3,  user1;
  let ORACLE_FEE;

  before(async function () {
    user1 = await newUser(faucet);
  });

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

  it('try to get the wrapping fees from the API, expect no registered oracles', async function () {
    try {
      ORACLE_FEE = await callFioApi('get_oracle_fees', {});
    } catch (err) {
      //console.log('Error: ', err);
      expect(err.error.message).to.equal('Not enough registered oracles.');
    }
  });

  it(`register new oracles for testing`, async function () {
    try {
      newOracle = await newUser(faucet);
      newOracle2 = await newUser(faucet);
      newOracle3 = await newUser(faucet);

      // register a new oracle
      await registerNewBp(newOracle);
      await registerNewOracle(newOracle);
      await setTestOracleFees(newOracle, 500000000, 1000000000);

      await registerNewBp(newOracle2);
      await registerNewOracle(newOracle2);
      await setTestOracleFees(newOracle2, 1000000000, 1200000000);

      await registerNewBp(newOracle3);
      await registerNewOracle(newOracle3);
      await setTestOracleFees(newOracle3, 3000000000, 3200000000);  // Comment out this line to cause crash
    } catch (err) {
      console.log('Error: ', err);
      throw err;
    }
  });

  it('get oracles', async function () {
    const oracleRecords = await getOracleRecords();
    //console.log('Oracles: ', oracleRecords);
  });

  it('get the wrapping fees from the API', async function () {
    const result = await callFioApi('get_oracle_fees', {});
    //console.log('Result: ', result);
    expect(result.oracle_fees.length).to.equal(2);
    expect(result.oracle_fees[0].fee_name).to.equal('wrap_fio_domain');
    expect(result.oracle_fees[0].fee_amount).to.equal(3000000000);  // Should be median * 3 = 3000000000
    expect(result.oracle_fees[1].fee_name).to.equal('wrap_fio_tokens');
    expect(result.oracle_fees[1].fee_amount).to.equal(3600000000);  // Should be median * 3 = 3600000000
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

describe(`F. [FIO] Wrap FIO tokens`, function () {

  let wrapAmt = 1000000000000;
  let oracle1, oracle2, oracle3, user1, user2, newOracle, newOracle1, newOracle2, custodians, factory, owner, wfioAccts;
  let ORACLE_FEE, WRAP_FEE;
  let wfio = {
    address: '0xblahblahblah' + randStr(20)
  }

  it(`clean out oracless record with helper function`, async function () {
    try {
      await cleanUpOraclessTable(faucet, true);
    } catch (err) {
      console.log('Error: ', err)
      throw err;
    }
  });

  it(`confirm oracles table is empty`, async function () {
    try {
      let records = await getOracleRecords();
      //console.log('Records: ', records);
      expect(records.rows.length).to.equal(0);
    } catch (err) {
      console.log('Error: ', err)
      throw err;
    }
  });

  it('Add users and oracles', async function () {
    try {

      oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
      // oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
      // oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
      user1 = await newUser(faucet);
      user2 = await newUser(faucet);
      // user3 = await newUser(faucet);
      newOracle = await newUser(faucet);
      newOracle1 = await newUser(faucet);
      newOracle2 = await newUser(faucet);

      await registerNewBp(newOracle);
      await registerNewBp(newOracle1);
      await registerNewBp(newOracle2);

      await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: user1.publicKey,
        amount: 10000000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      });
      //[owner, wfioAccts, wfio] = await setupWFIOontract(ethers, INIT_SUPPLY);
    } catch (err) {
      console.log('Error: ', err);
      throw err;
    }
  });

  it(`query the oracless table, expects zero records`, async function () {
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

  it(`(not enough registered oracles) try to wrap 1000 FIO tokens, expect Error`, async function () {
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
      console.log('Result: ', result);
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      //console.log('Error: ', err.json);
      expect(err.json.fields[0].error).to.equal('Not enough registered oracles.');
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
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Not enough registered oracles.');
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
      expect(result.status).to.not.equal('OK');
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

  it(`get the oracle fee from the API`, async function () {
    let result = await callFioApi('get_oracle_fees', {});

    if (result.oracle_fees[0].fee_name === 'wrap_fio_token')
      ORACLE_FEE = result.oracle_fees[0].fee_amount;
    else
      ORACLE_FEE = result.oracle_fees[1].fee_amount;
    let median_fee = await calculateOracleFeeFromOraclessTable();
    expect(ORACLE_FEE).to.equal(median_fee);
  });

  it(`get wrap fee`, async function () {
    let result = await callFioApi('get_fee', {
      end_point: "wrap_fio_tokens",
      fio_address: oracle1.address //"vote1@dapixdev"
    });
    WRAP_FEE = result.fee;
  });

  it(`(missing tpid) try to wrap 1000 FIO tokens, expect OK - SDK should use default value`, async function () {
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
      expect(result.fee_collected).to.equal(WRAP_FEE);
      expect(parseInt(result.oracle_fee_collected)).to.equal(ORACLE_FEE);
    } catch (err) {
      // expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
      throw err;
    }
  });

  it(`(negative max_fee) try to wrap 1000 FIO tokens (BD-3408 fixed)`, async function () {
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
      expect(result.status).to.equal(null);
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json.fields[0].name).to.equal('max_fee');
      expect(err.json.fields[0].value).to.equal('-800000000000');
      expect(err.json.fields[0].error).to.equal('Invalid fee value');
    }
  });

  it(`(negative max_oracle_fee) try to wrap 1000 FIO tokens (BD-3408 fixed)`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: -config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.equal(null);
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json.fields[0].name).to.equal('max_oracle_fee');
      expect(err.json.fields[0].value).to.equal('-800000000000');
      expect(err.json.fields[0].error).to.equal('Invalid oracle fee value');    }
  });

  it.skip(`(BD-3878)(int tpid) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
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
      //console.log(err);
      expect(err.json.error.details[0].message).to.equal('TPID must be empty or valid FIO address');
    }
  });

  // unhappy tests
  it(`(empty amount) try to wrap FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: "", //wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
    }
  });

  it(`(public_address with extra space at end) try to wrap 1000 FIO tokens, expect OK - SDK should use default value`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: "addresswithaspaceatend ",
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          //tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      //console.log('Error: ', err.json);
      expect(err.json.fields[0].error).to.equal('Invalid public address');
    }
  });

  it(`(missing amount) try to wrap FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing wraptokens.amount (type=int64)');
    }
  });

  it(`(invalid amount) try to wrap FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: "!invalid!@$",
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(negative amount) try to wrap FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: -wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].name).to.equal('amount');
      expect(err.json.fields[0].value).to.equal(`${-wrapAmt}`);
      expect(err.json.fields[0].error).to.equal('Invalid amount');
    }
  });

  it(`(empty chain_code) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid chain code format');
    }
  });

  it(`(missing chain_code) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing wraptokens.chain_code (type=string)');
    }
  });

  it(`(invalid chain_code) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "!invalid!@$",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid chain code format');
    }
  });

  it(`(int chain_code) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: 1234500000000,
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid chain code format');
    }
  });

  it(`(negative chain_code) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: -1234500000000,
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid chain code format');
    }
  });

  it(`(empty public_address) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: "",
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid public address');
    }
  });

  it(`(missing public_address) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing wraptokens.public_address (type=string)');
    }
  });

  it(`(empty max_oracle_fee) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: "",
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid oracle fee value');
    }
  });

  it(`(small max_oracle_fee) try to wrap with oracle_fee less than Oracle Fee`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: 100000000,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid oracle fee value');
    }
  });

  it(`(missing max_oracle_fee) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing wraptokens.max_oracle_fee (type=int64)');
    }
  });

  it(`(invalid max_oracle_fee) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: "!invalid!@$",
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
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

  it(`store user1 balance`, async function () {
    preWrapBal = await user1.sdk.genericAction('getFioBalance', {});
  });

  it(`(insufficient balance 1) try to wrap: balance = wrapamount`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: preWrapBal.balance,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Insufficient funds to cover fee');
    }
  });

  it(`(insufficient balance 2) try to wrap: balance = wrapamount + FIO fee`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: preWrapBal.balance - WRAP_FEE,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Insufficient funds to cover fee');
    }
  });

  it(`(insufficient balance 3) try to wrap: balance = wrapamount + Oracle fee`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: preWrapBal.balance - ORACLE_FEE,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Insufficient funds to cover fee');
    }
  });

  it(`(insufficient balance 4) try to wrap: balance = wrapamount + Oracle fee + FIO fee + 0.5 FIO`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: preWrapBal.balance - ORACLE_FEE - WRAP_FEE + 500000000,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Insufficient funds to cover fee');
    }
  });

  it(`(happy w/ tpid) try to wrap 1000 FIO tokens (Bug BD-3869 fixed)`, async function () {
    /**
     * In fio-token-wrapping-api, this test is repeated with the tpid set to 'eosio', and it passes.
     */
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
          tpid: oracle1.address,
        }
      });
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(WRAP_FEE);
      expect(parseInt(result.oracle_fee_collected)).to.equal(ORACLE_FEE);
    } catch (err) {
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
      expect(result.fee_collected).to.equal(WRAP_FEE);
      expect(parseInt(result.oracle_fee_collected)).to.equal(ORACLE_FEE);
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
      console.log('Error: ', err.json.error);
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

describe(`G. [FIO] Unwrap FIO tokens`, function () {
  let wrapAmt = 1000000000000;
  let unwrapAmt = 500000000000;
  let oracle1, oracle2, oracle3, newOracle1, newOracle2, newOracle3,
      user1, user2, user3, preWrapBal, postWrapBal, postWrapBalDiff, postWrapAvailDiff;

  let OBT_ID_1, OBT_ID_2, ORACLE_FEE, WRAP_FEE;

  let wfio = {
    address: '0xblahblahblah' + randStr(20)
  }

  before(async function () {
    oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    // oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    // oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
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
    await setTestOracleFees(newOracle1, 10000000000, 11000000000);
    await setTestOracleFees(newOracle2, 11000000000, 20000000000);
    await setTestOracleFees(newOracle3, 20000000000, 21000000000);

    await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: 10000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });

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
      OBT_ID_1 = result.transaction_id;
    } catch (err) {
      console.log('error wrapping test tokens: ', err);
      throw err;
    }

    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user2.account,
        privKey: user2.privateKey,
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user2.account
        }
      });
      OBT_ID_2 = result.transaction_id;
    } catch (err) {
      console.log('error wrapping test tokens: ', err);
      throw err;
    }
  });

  it(`get the oracle fee from the API`, async function () {
    let result = await callFioApi('get_oracle_fees', {});

    if (result.oracle_fees[0].fee_name === 'wrap_fio_token')
      ORACLE_FEE = result.oracle_fees[0].fee_amount;
    else
      ORACLE_FEE = result.oracle_fees[1].fee_amount;
    let median_fee = await calculateOracleFeeFromOraclessTable();
    expect(ORACLE_FEE).to.equal(median_fee);
  });

  it(`get wrap fee`, async function () {
    let result = await callFioApi('get_fee', {
      end_point: "wrap_fio_tokens",
      fio_address: oracle1.address //"vote1@dapixdev"
    });
    WRAP_FEE = result.fee;
  });


  it(`(happy path) first oracle tries to unwrap ${unwrapAmt} FIO tokens`, async function () {
    const result = await newOracle1.sdk.genericAction('pushTransaction', {
      action: 'unwraptokens',
      account: 'fio.oracle',
      data: {
        amount: unwrapAmt,
        obt_id: OBT_ID_2,
        fio_address: user2.address,
      }
    });
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.status).to.equal('OK');
  });

  it(`assert one voter record in oravotes table`, async function () {
    let result = await callFioApi('get_table_rows', {
      code: "fio.oracle",
      scope: "fio.oracle",
      table: "oravotes",
      limit: 10,
      index_position: "1",
      json: true,
      reverse: true
    });
    expect(result.rows[0].fio_address).to.equal(user2.address);
    expect(result.rows[0].voters.length).to.equal(1);
    expect(result.rows[0].voters[0]).to.equal(newOracle1.account);
  });

  it(`(happy path) second oracle tries to unwrap ${unwrapAmt} FIO tokens`, async function () {
    const result = await newOracle2.sdk.genericAction('pushTransaction', {
      action: 'unwraptokens',
      account: 'fio.oracle',
      data: {
        amount: unwrapAmt,
        obt_id: OBT_ID_2,
        fio_address: user2.address,
      }
    });
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.status).to.equal('OK');
  });

  it(`assert two voter records in oravotes table`, async function () {
    let result = await callFioApi('get_table_rows', {
      code: "fio.oracle",
      scope: "fio.oracle",
      table: "oravotes",
      limit: 10,
      index_position: "1",
      json: true,
      reverse: true
    });
    expect(result.rows[0].fio_address).to.equal(user2.address);
    expect(result.rows[0].voters.length).to.equal(2);
    expect(result.rows[0].voters[0]).to.equal(newOracle1.account);
    expect(result.rows[0].voters[1]).to.equal(newOracle2.account);
  });

  it(`(happy path) third oracle tries to unwrap ${unwrapAmt} FIO tokens`, async function () {
    const result = await newOracle3.sdk.genericAction('pushTransaction', {
      action: 'unwraptokens',
      account: 'fio.oracle',
      data: {
        amount: unwrapAmt,
        obt_id: OBT_ID_2,
        fio_address: user2.address,
      }
    });
    expect(result).to.have.any.keys('status');
    expect(result).to.have.any.keys('block_num');
    expect(result).to.have.any.keys('transaction_id');
    expect(result.status).to.equal('OK');
  });

  it(`assert three voter records in oravotes table`, async function () {
    let result = await callFioApi('get_table_rows', {
      code: "fio.oracle",
      scope: "fio.oracle",
      table: "oravotes",
      limit: 10,
      index_position: "1",
      json: true,
      reverse: true
    });
    expect(result.rows[0].fio_address).to.equal(user2.address);
    expect(result.rows[0].voters.length).to.equal(3);
    expect(result.rows[0].voters[0]).to.equal(newOracle1.account);
    expect(result.rows[0].voters[1]).to.equal(newOracle2.account);
    expect(result.rows[0].voters[2]).to.equal(newOracle3.account);
  });

  // issues
  it(`(amount: "") try to unwrap FIO tokens (BUG BD-3866 fixed)`, async function () {
    preWrapBal = await newOracle1.sdk.genericAction('getFioBalance', {});
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: "",
          obt_id: OBT_ID_1,
          fio_address: user1.address
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      //console.log('Error: ', err.json.fields[0])
      expect(err.json.fields[0].name).to.equal('amount');
      expect(err.json.fields[0].error).to.equal('Invalid amount');
    }
  });

  it(`(negative amount) Expect error: try to unwrap -${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: -wrapAmt,
          obt_id: OBT_ID_1,
          fio_address: user1.address,
        }
      });
      console.log('Result: ', result);
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].name).to.equal('amount');
      expect(err.json.fields[0].value).to.equal(`${-wrapAmt}`);
      expect(err.json.fields[0].error).to.equal('Invalid amount');
    }
  });

  it(`(empty obt_id) try to unwrap ${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          obt_id: "", // wfio.address,
          fio_address: user1.address,
          // actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].name).to.equal('obt_id');
      expect(err.json.fields[0].value).to.equal('');
      expect(err.json.fields[0].error).to.equal('Invalid obt_id');
    }
  });

  // unhappy tests
  it(`(missing amount) try to unwrap FIO tokens`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          // amount: wrapAmt,
          obt_id: OBT_ID_1, //wfio.address,
          fio_address: user1.address,
          // actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing unwraptokens.amount (type=int64)');
    }
  });

  it(`(invalid amount) try to unwrap FIO tokens`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: "!invalid@#$",
          obt_id: OBT_ID_1, //wfio.address,
          fio_address: user1.address,
          // actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(missing obt_id) try to unwrap ${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          fio_address: user1.address,
          // actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing unwraptokens.obt_id (type=string)');
    }
  });

  it(`(empty fio_address) try to unwrap ${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          obt_id: OBT_ID_1, //wfio.address,
          fio_address: "",
          // actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid FIO Address');
    }
  });

  it(`(missing fio_address) try to unwrap ${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          obt_id: OBT_ID_1, //wfio.address,
          // actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing unwraptokens.fio_address (type=string)');
    }
  });

  it(`(invalid fio_address) try to unwrap ${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          obt_id: OBT_ID_1, //wfio.address,
          fio_address: "!invalid@$",
          // actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid FIO Address');
    }
  });

  it(`(int fio_address) try to unwrap ${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          obt_id: OBT_ID_1, //wfio.address,
          fio_address: 1234500000000,
          // actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.message).to.equal('FIO Address not found');
    }
  });

  it(`(negative fio_address) try to unwrap ${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          obt_id: OBT_ID_1, //wfio.address,
          fio_address: -12345,
          // actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid FIO Address');
    }
  });

  it(`(invalid permissions) try to unwrap as a non-oracle`, async function () {
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          obt_id: OBT_ID_1,
          fio_address: user1.address,
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Not a registered Oracle');
    }
  });

  it(`query the oracless table, expect 3 records`, async function () {
    try {
      const oracleRecords = await getOracleRecords();
      //console.log('oracleRecords: ', oracleRecords);
      expect(oracleRecords.rows.length).to.equal(3);
    } catch (err) {
      throw err;
    }
  });
});

describe(`G.2. unwraptokens - simple happy path`, function () {
  let user1, user1Balance, newOracle1, newOracle2, newOracle3;
  const obtID = '0xobtidetcetcetc' + randStr(20);
  const unwrapAmt = 2000000000;

  it(`clean out oracless fees table with helper function`, async function () {
    try {
      await cleanUpOraclessTable(faucet, true);
    } catch (err) {
      console.log('Error: ', err)
      throw err;
    }
  });

  it(`confirm oracles table is empty`, async function () {
    try {
      let records = await getOracleRecords();
      //console.log('Records: ', records);
      expect(records.rows.length).to.equal(0);
    } catch (err) {
      console.log('Error: ', err)
      throw err;
    }
  });

  it(`Register users and oracles`, async function () {
    try {
      user1 = await newUser(faucet);
      newOracle1 = await newUser(faucet);
      newOracle2 = await newUser(faucet);
      newOracle3 = await newUser(faucet);
      await registerNewBp(newOracle1);
      await registerNewBp(newOracle2);
      await registerNewBp(newOracle3);
      await registerNewOracle(newOracle1);
      await registerNewOracle(newOracle2);
      await registerNewOracle(newOracle3);
    } catch (err) {
      console.log('Error: ', err.json);
      throw err;
    }
  });

  it(`(failure) get unwrap_fio_tokens fee. Expect: Invalid endpoint`, async function () {
    try {
      let result = await callFioApi('get_fee', {
        end_point: "unwrap_fio_tokens",
        fio_address: newOracle1.address //"vote1@dapixdev"
      });
      expect(result.status).to.equal(null);
    } catch (err) {
      //console.log('Error: ', err.error.fields[0]);
      expect(err.statusCode).to.equal(400);
      expect(err.error.fields[0].error).to.equal('Invalid end point');
    }
  });

  it(`Get original balance for user1`, async () => {
    try {
      const result = await user1.sdk.genericAction('getFioBalance', { fioPublicKey: user1.publicKey });
      user1Balance = result.balance;
      //console.log('user1 fio balance', result)
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  });

  it(`(Success) newOracle1 calls unwraptokens after all oracles have set fees. Expect OK`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: unwrapAmt,
          obt_id: obtID,
          fio_address: user1.address,
        }
      });
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err);
      throw err;
    }
  });

  it(`(Failure) Get balance for user1 after 1 oracle has called unwrap: Confirm NO token distribution`, async () => {
    try {
      const user1BalancePrev = user1Balance;
      const result = await user1.sdk.genericAction('getFioBalance', { fioPublicKey: user1.publicKey });
      user1Balance = result.balance;
      expect(user1Balance).to.equal(user1BalancePrev);
      //console.log('user1 fio balance', result)
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  });

  it(`(Success) newOracle2 calls unwraptokens. Expect OK`, async function () {
    try {
      const result = await newOracle2.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: unwrapAmt,
          obt_id: obtID,
          fio_address: user1.address,
        }
      });
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err);
      throw err;
    }
  });

  it(`(Failure) Get balance for user1 after 2 oracles has called unwrap: Confirm NO token distribution`, async () => {
    try {
      const user1BalancePrev = user1Balance;
      const result = await user1.sdk.genericAction('getFioBalance', { fioPublicKey: user1.publicKey });
      user1Balance = result.balance;
      expect(user1Balance).to.equal(user1BalancePrev);
      //console.log('user1 fio balance', result)
    } catch (err) {
      //console.log('Error', err)
      expect(err).to.equal(null)
    }
  });

  it(`(Success) newOracle3 calls unwraptokens. Expect OK`, async function () {
    try {
      const result = await newOracle3.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: unwrapAmt,
          obt_id: obtID,
          fio_address: user1.address,
        }
      });
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log('Error: ', err);
      throw err;
    }
  });

  it(`Get balance for user1 after all 3 oracles have called unwrap: Confirm token distribution`, async () => {
    try {
      const user1BalancePrev = user1Balance;
      const result = await user1.sdk.genericAction('getFioBalance', { fioPublicKey: user1.publicKey });
      user1Balance = result.balance;
      expect(user1Balance).to.equal(user1BalancePrev + unwrapAmt);
      //console.log('user1 fio balance', result)
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  });

});

describe(`H. setoraclefees and simple wrap - confirm ram bump on wrap and validate fee distribution`, function () {
  let user1, user2, newOracle1, oracle1Balance, oracle2Balance, oracle3Balance, user2Balance, newOracle2, newOracle3, wrapFee, userRam;
  const ethAddress = '0xblahblahblah' + randStr(20);
  const wrapAmt = 2000000000;
  const oracle1Fee = 2000000000;
  const oracle2Fee = 5000000000;
  const oracle3Fee = 9000000000;
  const oracleFeeTotal = oracle2Fee * 3;

  it(`clean out oracless fees table with helper function`, async function () {
    try {
      await cleanUpOraclessTable(faucet, true);
    } catch (err) {
      console.log('Error: ', err)
      throw err;
    }
  });

  it(`confirm oracles table is empty`, async function () {
    try {
      let records = await getOracleRecords();
      //console.log('Records: ', records);
      expect(records.rows.length).to.equal(0);
    } catch (err) {
      console.log('Error: ', err)
      throw err;
    }
  });

  it(`Register users and oracles`, async function () {
    try {
      user1 = await newUser(faucet);
      user2 = await newUser(faucet);
      newOracle1 = await newUser(faucet);
      newOracle2 = await newUser(faucet);
      newOracle3 = await newUser(faucet);
      await registerNewBp(newOracle1);
      await registerNewBp(newOracle2);
      await registerNewBp(newOracle3);
      await registerNewOracle(newOracle1);
      await registerNewOracle(newOracle2);
      await registerNewOracle(newOracle3);
    } catch (err) {
      console.log('Error: ', err.json);
      throw err;
    }
  });

  it(`newOracle1 sets wraptokens fee`, async function () {
    try {
      await setTestOracleFees(newOracle1, 1000000000, oracle1Fee);
      //await setTestOracleFees(newOracle2, 1000000000, oracle2Fee);
    } catch (err) {
      throw err;
    }
  });

  it('get oracles', async function () {
    const oracleRecords = await getOracleRecords();
    //console.log('Oracles: ', oracleRecords);
  });

  it(`(Bug BD-3874) (Failure) Try to wrap FIO tokens, expect: All registered oracles have not set fees`, async function () {
    let postWrapBalDiff, postWrapAvailDiff;
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: ethAddress,
          max_oracle_fee: config.maxOracleFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      console.log('Result: ', result);
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      //console.log('Error: ', err);
      expect(err.json.fields[0].error).to.equal('All registered oracles have not set fees')
    }
  });

  it(`newOracle2 sets wraptokens fee`, async function () {
    try {
      await setTestOracleFees(newOracle2, 1000000000, oracle2Fee);
    } catch (err) {
      throw err;
    }
  });

  it(`newOracle3 sets wraptokens fee`, async function () {
    try {
      await setTestOracleFees(newOracle3, 1000000000, oracle3Fee);
    } catch (err) {
      throw err;
    }
  });

  it('Confirm oracle fee is median * 3`', async function () {
    try {
      result = await callFioApi('get_oracle_fees', {});
      //console.log('Result: ', result);
      expect(result.oracle_fees[1].fee_name).to.equal('wrap_fio_tokens');
      expect(result.oracle_fees[1].fee_amount).to.equal(oracleFeeTotal);
    } catch (err) {
      console.log('Error: ', err);
      throw err;
    }
  });

  it(`get wrap fee`, async function () {
    let result = await callFioApi('get_fee', {
      end_point: "wrap_fio_tokens",
      fio_address: newOracle1.address //"vote1@dapixdev"
    });
    wrapFee = result.fee;
  });

  it(`Get original balances for user2 and oracles`, async () => {
    try {
      let result;
      result = await user2.sdk.genericAction('getFioBalance', { fioPublicKey: user2.publicKey });
      user2Balance = result.balance;
      result = await newOracle1.sdk.genericAction('getFioBalance', { fioPublicKey: newOracle1.publicKey });
      oracle1Balance = result.balance;
      result = await newOracle2.sdk.genericAction('getFioBalance', { fioPublicKey: newOracle2.publicKey });
      oracle2Balance = result.balance;
      result = await newOracle3.sdk.genericAction('getFioBalance', { fioPublicKey: newOracle3.publicKey });
      oracle3Balance = result.balance;
      //console.log('user1 fio balance', result)
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
  });

  it(`get user2 RAM before wrap`, async function () {
    userRam = await getRamForUser(user2);
  });

  it(`(Success) Try to wrap FIO tokens after all oracles have set fees. Expect OK`, async function () {
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: ethAddress,
          max_oracle_fee: config.maxOracleFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      //console.log('Result: ', result);
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(wrapFee);
      expect(parseInt(result.oracle_fee_collected)).to.equal(oracleFeeTotal);
    } catch (err) {
      console.log('Error: ', err);
      throw err;
    }
  });

  it(`get user2 RAM after wrap. Confirm RAM bump.`, async function () {
    const userRamPrev = userRam;
    userRam = await getRamForUser(user2);
    expect(userRam).to.equal(userRamPrev + config.RAM.WRAPTOKENRAM);
  });

  it(`Get balances for user2 and oracles after wrap: Confirm fee distribution`, async () => {
    try {
      const user2BalancePrev = user2Balance;
      const oracle1BalancePrev = oracle1Balance;
      const oracle2BalancePrev = oracle2Balance;
      const oracle3BalancePrev = oracle3Balance;
      let result;
      result = await user2.sdk.genericAction('getFioBalance', { fioPublicKey: user2.publicKey });
      user2Balance = result.balance;
      result = await newOracle1.sdk.genericAction('getFioBalance', { fioPublicKey: newOracle1.publicKey });
      oracle1Balance = result.balance;
      result = await newOracle2.sdk.genericAction('getFioBalance', { fioPublicKey: newOracle2.publicKey });
      oracle2Balance = result.balance;
      result = await newOracle3.sdk.genericAction('getFioBalance', { fioPublicKey: newOracle3.publicKey });
      oracle3Balance = result.balance;
      expect(user2Balance).to.equal(user2BalancePrev - wrapAmt - wrapFee - oracleFeeTotal);
      expect(oracle1Balance).to.equal(oracle1BalancePrev + oracleFeeTotal / 3);
      expect(oracle2Balance).to.equal(oracle2BalancePrev + oracleFeeTotal / 3);
      expect(oracle3Balance).to.equal(oracle3BalancePrev + oracleFeeTotal / 3);
      //console.log('user1 fio balance', result)
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
  });

});
