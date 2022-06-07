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
  getAccountFromKey
} = require("../utils.js");
const {
  getOracleVotes,
  getOracleRecords,
  registerNewBp,
  registerNewOracle,
  setTestOracleFees,
  setupWFIOontract,
  registerWfioOracles,
  cleanUpOraclessTable,
  calculateOracleFeeFromOraclessTable
} = require("./Helpers/wrapping.js");
let INIT_SUPPLY = 0;
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

//TODO: confirm the amount of validation required for contract inputs


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

describe(`************************** fio-token-wrapping-sdk.js ************************** \n   A. [FIO] Oracles (get_table_rows)`, function () {
  let userA, oracle1, oracle2, oracle3;

  before(async function () {
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
      expect(result.status).to.equal('OK');
    } catch (err) {
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

  // it.skip(`(BUG)(int actor) try to unregister an oracle, expect Error`, async function () {
  //   try {
  //     const result = await newOracle1.sdk.genericAction('pushTransaction', {
  //       action: 'unregoracle',
  //       account: 'fio.oracle',
  //       actor: 'eosio',
  //       data: {
  //         oracle_actor: newOracle1.account,
  //         actor: 1234500000000
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     expect(err.message).to.equal('Expected string containing name');
  //   }
  // });
  //
  // it.skip(`(BUG)(negative actor) try to unregister an oracle, expect Error`, async function () {
  //   try {
  //     const result = await newOracle2.sdk.genericAction('pushTransaction', {
  //       action: 'unregoracle',
  //       account: 'fio.oracle',
  //       actor: 'eosio',
  //       data: {
  //         oracle_actor: newOracle2.account,
  //         actor: -1234500000000
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     expect(err.message).to.equal('Expected string containing name');
  //   }
  // });

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
describe.skip(`C1. PROBLEM TESTS (unregoracle)`, function () {
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

  it(`(BUG)(int actor) try to unregister an oracle, expect Error`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: newOracle1.account,
          actor: 1234500000000
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });

  it(`(BUG)(negative actor) try to unregister an oracle, expect Error`, async function () {
    try {
      const result = await newOracle2.sdk.genericAction('pushTransaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: newOracle2.account,
          actor: -1234500000000
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
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

  // // issues
  // it(`(BD-3406)(negative wrap_fio_domain) try to set oracle fees, expect Error`, async function () {
  //   try {
  //     const result = await newOracle.sdk.genericAction('pushTransaction', {
  //       action: 'setoraclefee',
  //       account: 'fio.oracle',
  //       actor: 'eosio',
  //       data: {
  //         wrap_fio_domain:  -1234500000000,
  //         wrap_fio_tokens: 1
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     const oracleRecords = await getOracleRecords(newOracle.account);
  //     expect(err.message).to.equal('invalid number');
  //   }
  // });
  //
  // it(`(BD-3406)(negative wrap_fio_tokens) try to set oracle fees, expect Error`, async function () {
  //   try{
  //     const result = await newOracle.sdk.genericAction('pushTransaction', {
  //       action: 'setoraclefee',
  //       account: 'fio.oracle',
  //       actor: 'eosio',
  //       data: {
  //         wrap_fio_domain: 1,
  //         wrap_fio_tokens: -1234500000000,
  //         actor: newOracle.account
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     const oracleRecords = await getOracleRecords(newOracle.account);
  //     expect(oracleRecords.rows[0].fees[0].fee_amount).to.equal(1);
  //     expect(oracleRecords.rows[0].fees[1].fee_amount).to.equal(0);
  //     //expect(err.message).to.equal('invalid number');
  //   }
  // });

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
describe.skip(`D1. PROBLEM TESTS (setoraclefees)`, function () {

  let oracle1, newOracle, newOracle1, newOracle2, newOracle3, newOracle4, newOracle5, user1;

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

  // issues
  it(`(BD-3406)(negative wrap_fio_domain) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
      const oracleRecords = await getOracleRecords(newOracle.account);
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(BD-3406)(negative wrap_fio_tokens) try to set oracle fees, expect Error`, async function () {
    try{
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: -1234500000000,
          actor: newOracle.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      const oracleRecords = await getOracleRecords(newOracle.account);
      expect(oracleRecords.rows[0].fees[0].fee_amount).to.equal(1);
      expect(oracleRecords.rows[0].fees[1].fee_amount).to.equal(0);
      //expect(err.message).to.equal('invalid number');
    }
  });
});

describe.skip(`** ORACLE TABLE CLEANUP **`, async function () {
  it(`clean out oracless record with helper function`, async function () {
    try {
      await cleanUpOraclessTable(faucet, false);
      let records = await getOracleRecords();
      expect(records.rows.length).to.equal(0);
    } catch (err) {
      throw err;
    }
  });
  let oracle1, oracle2, oracle3;
  it.skip(`set oracle fees for all remaining oracles`, async function () {
    oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');

    console.log('[dbg] starting fee setting...')
    //now set oracle fees
    try {
      await oracle1.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 10000000000,
          wrap_fio_tokens: 11000000000
        }
      });
      await oracle2.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 11000000000,
          wrap_fio_tokens: 20000000000
        }
      });
      await oracle3.sdk.genericAction('pushTransaction', {
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
});

describe.skip(`E. (BD-3788)[FIO] Oracles (getoraclefees)`, function () {

  let oracle1, newOracle, newOracle2, newOracle3,  user1;
  let ORACLE_FEE;

  before(async function () {
    user1 = await newUser(faucet);
  });

  it('try to get the wrapping fees from the API, expect no registered oracles', async function () {
    try {
      await callFioApi('get_oracle_fees', {});
    } catch (err) {
      expect(err.error.message).to.equal('Not enough registered oracles.');
    }
  });

  it(`register new oracles for testing`, async function () {
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
    await setTestOracleFees(newOracle3, 3000000000, 3200000000);
  });

  it('get the wrapping fees from the API', async function () {
    const result = await callFioApi('get_oracle_fees', {});
    expect(result.oracle_fees.length).to.equal(2);
    expect(result.oracle_fees[0].fee_name).to.equal('wrap_fio_domain');
    expect(result.oracle_fees[0].fee_amount).to.equal(36000000000);//(3000000000);
    expect(result.oracle_fees[1].fee_name).to.equal('wrap_fio_tokens');
    expect(result.oracle_fees[1].fee_amount).to.equal(3600000000);
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
  let oracle1, oracle2, oracle3, user1, newOracle, newOracle1, newOracle2, custodians, factory, owner, wfioAccts, wfio;
  let ORACLE_FEE, WRAP_FEE;

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

    await registerNewBp(newOracle);
    await registerNewBp(newOracle1);
    await registerNewBp(newOracle2);

    await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: 10000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    [owner, wfioAccts, wfio] = await setupWFIOontract(ethers, INIT_SUPPLY);
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
      expect(result.status).to.not.equal('OK');
    } catch (err) {
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
    console.log('[dbg] starting fee setting...')
    //now set oracle fees
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
      expect(result.fee_collected).to.equal(WRAP_FEE);
      expect(parseInt(result.oracle_fee_collected)).to.equal(ORACLE_FEE);
    } catch (err) {
      // expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
      throw err;
    }
  });

  // // issues
  // it(`(BD-3408)(invalid public_address) try to wrap 1000 FIO tokens`, async function () {
  //   try {
  //     const result = await user1.sdk.genericAction('pushTransaction', {
  //       action: 'wraptokens',
  //       account: 'fio.oracle',
  //       data: {
  //         amount: wrapAmt,
  //         chain_code: "ETH",
  //         public_address: "!invalid!@$",
  //         max_oracle_fee: config.maxFee,
  //         max_fee: config.maxFee,
  //         tpid: "",
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     expect(err.json.fields[0].error).to.equal('Invalid public address');
  //   }
  // });
  //
  // it(`(BD-3408)(int public_address) try to wrap 1000 FIO tokens`, async function () {
  //   try {
  //     const result = await user1.sdk.genericAction('pushTransaction', {
  //       action: 'wraptokens',
  //       account: 'fio.oracle',
  //       data: {
  //         amount: wrapAmt,
  //         chain_code: "ETH",
  //         public_address: 1234500000000,
  //         max_oracle_fee: config.maxFee,
  //         max_fee: config.maxFee,
  //         tpid: "",
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     expect(err.json.fields[0].error).to.equal('Invalid public address');
  //   }
  // });
  //
  // it(`(BD-3408)(negative public_address) try to wrap 1000 FIO tokens`, async function () {
  //   try {
  //     const result = await user1.sdk.genericAction('pushTransaction', {
  //       action: 'wraptokens',
  //       account: 'fio.oracle',
  //       data: {
  //         amount: wrapAmt,
  //         chain_code: "ETH",
  //         public_address: -1234500000000,
  //         max_oracle_fee: config.maxFee,
  //         max_fee: config.maxFee,
  //         tpid: "",
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
  //   }
  // });
  //
  // it(`(BD-3408)(negative max_fee) try to wrap 1000 FIO tokens`, async function () {
  //   try {
  //     const result = await user1.sdk.genericAction('pushTransaction', {
  //       action: 'wraptokens',
  //       account: 'fio.oracle',
  //       data: {
  //         amount: wrapAmt,
  //         chain_code: "ETH",
  //         public_address: wfio.address,
  //         max_oracle_fee: config.maxFee,
  //         max_fee: -config.maxFee,
  //         tpid: "",
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //     // expect(result.fee_collected).to.equal(400000000);
  //     // expect(parseInt(result.oracle_fee_collected)).to.equal(60000000000);
  //   } catch (err) {
  //     // expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
  //     throw err;
  //   }
  // });
  //
  // it(`(BD-3408)(negative max_oracle_fee) try to wrap 1000 FIO tokens`, async function () {
  //   try {
  //     const result = await user1.sdk.genericAction('pushTransaction', {
  //       action: 'wraptokens',
  //       account: 'fio.oracle',
  //       data: {
  //         amount: wrapAmt,
  //         chain_code: "ETH",
  //         public_address: wfio.address,
  //         max_oracle_fee: -config.maxFee,
  //         max_fee: config.maxFee,
  //         tpid: "",
  //       }
  //     });
  //     expect(result.status).to.equal('OK');
  //     expect(result.fee_collected).to.equal(400000000);
  //     expect(parseInt(result.oracle_fee_collected)).to.equal(60000000000);
  //   } catch (err) {
  //     expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
  //   }
  // });
  //
  // it(`(BD-3408)(int tpid) try to wrap 1000 FIO tokens`, async function () {
  //   try {
  //     const result = await user1.sdk.genericAction('pushTransaction', {
  //       action: 'wraptokens',
  //       account: 'fio.oracle',
  //       data: {
  //         amount: wrapAmt,
  //         chain_code: "ETH",
  //         public_address: wfio.address,
  //         max_oracle_fee: config.maxFee,
  //         max_fee: config.maxFee,
  //         tpid: 1234500000000,
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //     // expect(result.fee_collected).to.equal(400000000);
  //     // expect(parseInt(result.oracle_fee_collected)).to.equal(60000000000);
  //   } catch (err) {
  //     console.log(err);
  //     expect(err.json.error.details[0].message).to.equal('TPID must be empty or valid FIO address');
  //   }
  // });

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
    //console.log(preWrapBal);
  });

  it.skip(`(happy w/ tpid) try to wrap 1000 FIO tokens`, async function () {
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
      expect(result.fee_collected).to.equal(ORACLE_FEE);
      expect(parseInt(result.oracle_fee_collected)).to.equal(60000000000);
    } catch (err) {
      throw err;
    }
  });

  it.skip(`(happy w/ tpid v2) try to wrap 1000 FIO tokens`, async function () {
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
      expect(result.fee_collected).to.equal(ORACLE_FEE);
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
      throw err;
    }
  });
});
describe.skip(`F1. PROBLEM TESTS (wraptokens)`, function () {

  let wrapAmt = 1000000000000;
  let oracle1, oracle2, oracle3, user1, newOracle, newOracle1, newOracle2, custodians, factory, owner, wfioAccts, wfio;
  let ORACLE_FEE, WRAP_FEE;

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

    await registerNewBp(newOracle);
    await registerNewBp(newOracle1);
    await registerNewBp(newOracle2);

    await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: user1.publicKey,
      amount: 10000000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    [owner, wfioAccts, wfio] = await setupWFIOontract(ethers, INIT_SUPPLY);
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
    console.log('[dbg] starting fee setting...')
    //now set oracle fees
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

  // issues
  it(`(BD-3408)(invalid public_address) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: "!invalid!@$",
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

  it(`(BD-3408)(int public_address) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: 1234500000000,
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

  it(`(BD-3408)(negative public_address) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: -1234500000000,
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

  it(`(BD-3408)(negative max_fee) try to wrap 1000 FIO tokens`, async function () {
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
      expect(result.status).to.not.equal('OK');
      // expect(result.fee_collected).to.equal(400000000);
      // expect(parseInt(result.oracle_fee_collected)).to.equal(60000000000);
    } catch (err) {
      // expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
      throw err;
    }
  });

  it(`(BD-3408)(negative max_oracle_fee) try to wrap 1000 FIO tokens`, async function () {
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
      expect(result.status).to.equal('OK');
      expect(result.fee_collected).to.equal(400000000);
      expect(parseInt(result.oracle_fee_collected)).to.equal(60000000000);
    } catch (err) {
      expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
    }
  });

  it(`(BD-3408)(int tpid) try to wrap 1000 FIO tokens`, async function () {
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
      user1, user2, user3, factory, owner, wfio, wfioAccts;

  let OBT_ID_1, OBT_ID_2;

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

    [owner, wfioAccts, wfio] = await setupWFIOontract(ethers, INIT_SUPPLY);
    await registerWfioOracles(wfio, wfioAccts);

    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          amount: wrapAmt + 333,
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
          amount: wrapAmt + 666,
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

    // call wfio.wrap
    let fromStartingBal = await wfioAccts[14].getBalance();
    let toStartingWfioBal = await wfio.balanceOf(wfioAccts[0].address);

    await wfio.connect(wfioAccts[12]).wrap(wfioAccts[0].address, 100, OBT_ID_1);
    await wfio.connect(wfioAccts[13]).wrap(wfioAccts[0].address, 100, OBT_ID_1);
    try {
      let result = await wfio.connect(wfioAccts[14]).wrap(wfioAccts[0].address, 100, OBT_ID_1);
      let fromEndingBal = await wfioAccts[14].getBalance();
      let toEndingWfioBal = await wfio.balanceOf(wfioAccts[0].address);
      expect(result.from).to.equal(wfioAccts[14].address);
      expect(result.to).to.equal(wfio.address);
      expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
      expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.true;
      expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(100)
    } catch (err) {
      throw err;
    }

    await wfio.connect(wfioAccts[12]).wrap(wfioAccts[1].address, 100, OBT_ID_2);
    await wfio.connect(wfioAccts[13]).wrap(wfioAccts[1].address, 100, OBT_ID_2);
    try {
      let result = await wfio.connect(wfioAccts[14]).wrap(wfioAccts[1].address, 100, OBT_ID_2);
      let fromEndingBal = await wfioAccts[14].getBalance();
      let toEndingWfioBal = await wfio.balanceOf(wfioAccts[1].address);
      expect(result.from).to.equal(wfioAccts[14].address);
      expect(result.to).to.equal(wfio.address);
      expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
      expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.true;
      expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(100)
    } catch (err) {
      throw err;
    }
  });

  // issues
  it(`(empty amount) try to unwrap FIO tokens, expect "" to be converted to 0`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: "",
          //obt_id: wfio.address,
          obt_id: OBT_ID_2,
          fio_address: user2.address,
          // actor: newOracle1.account
        }
      });
      // postWrapBal = await newOracle1.sdk.genericAction('getFioBalance', {});
      // postWrapBalDiff = preWrapBal.balance - postWrapBal.balance;
      // postWrapAvailDiff = preWrapBal.available - postWrapBal.available;
      expect(result.status).to.equal('OK');
      // expect(postWrapBalDiff).to.equal(0);
      // expect(postWrapAvailDiff).to.equal(0);
    } catch (err) {
      // expect(err.json.fields[0].name).to.equal('amount');
      // expect(err.json.fields[0].value).to.equal('0');
      throw err;
      // expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
    }
  });

  it(`(negative amount) try to unwrap -${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: -wrapAmt,
          obt_id: OBT_ID_1, //wfio.address,
          fio_address: user1.address,
          // actor: newOracle1.account
        }
      });
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
      expect(err.json.fields[0].name).to.equal('obt_it');
      expect(err.json.fields[0].value).to.equal('');
      expect(err.json.fields[0].error).to.equal('Invalid obt_id');
    }
  });

  // it(`(BD-3409)(invalid obt_id) try to unwrap ${wrapAmt} FIO tokens`, async function () {
  //   try {
  //     const result = await newOracle1.sdk.genericAction('pushTransaction', {
  //       action: 'unwraptokens',
  //       account: 'fio.oracle',
  //       data: {
  //         amount: wrapAmt,
  //         obt_id: "!invalid@#$",
  //         fio_address: user1.address,
  //         actor: newOracle1.account
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     throw err;
  //   }
  // });
  //
  // it(`(BD-3409)(int obt_id) try to unwrap ${wrapAmt} FIO tokens`, async function () {
  //   try {
  //     const result = await newOracle1.sdk.genericAction('pushTransaction', {
  //       action: 'unwraptokens',
  //       account: 'fio.oracle',
  //       data: {
  //         amount: wrapAmt,
  //         obt_id: 1000000000000,
  //         fio_address: user1.address,
  //         actor: newOracle1.account
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     throw err;
  //   }
  // });
  //
  // it(`(BD-3409)(negative obt_id) try to unwrap ${wrapAmt} FIO tokens`, async function () {
  //   try {
  //     const result = await newOracle1.sdk.genericAction('pushTransaction', {
  //       action: 'unwraptokens',
  //       account: 'fio.oracle',
  //       data: {
  //         amount: wrapAmt,
  //         obt_id: -12345,
  //         fio_address: user1.address,
  //         actor: newOracle1.account
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     throw err;
  //   }
  // });

  // unhappy tests
  it(`(greater amount than wrapped) try to unwrap 1500 FIO tokens`, async function () {
    let amt = wrapAmt + 333;
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: amt,
          obt_id: OBT_ID_1, //wfio.address,
          fio_address: user3.address,
          // actor: newOracle1.account
        }
      });
      // expect(result.status).to.not.equal('OK');
    } catch (err) {
      // expect(err.json.fields[0].error).to.equal('Token amount mismatch.');
      throw err;
    }

    amt = wrapAmt + 333;
    try {
      const result = await newOracle2.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: amt,
          obt_id: OBT_ID_1, //wfio.address,
          fio_address: user3.address,
          // actor: newOracle2.account
        }
      });
      // expect(result.status).to.not.equal('OK');
    } catch (err) {
      // expect(err.json.fields[0].error).to.equal('Token amount mismatch.');
      throw err;
    }

    amt = wrapAmt * 10;
    try {
      const result = await newOracle3.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: amt,
          obt_id: OBT_ID_1, //wfio.address,
          fio_address: user3.address,
          // actor: newOracle3.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Token amount mismatch.');
    }
  });

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

  it(`(token amount mismatch) try to unwrap ${unwrapAmt} FIO tokens`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: unwrapAmt,
          obt_id: OBT_ID_1, //wfio.address,
          fio_address: user1.address,
          // actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Token amount mismatch.');
    }
  });

  it(`query the oracless table, expect 3 records`, async function () {
    try {
      const oracleRecords = await getOracleRecords();
      expect(oracleRecords.rows.length).to.equal(3);
    } catch (err) {
      throw err;
    }
  });

  it.skip(`(happy path) first oracle tries to unwrap ${wrapAmt} FIO tokens`, async function () {
    // let preWrapBal = await newOracle1.sdk.genericAction('getFioBalance', {});
    // let wrappingFee, wrappingOracleFee, postWrapBal, postWrapBalDiff, postWrapAvailDiff;
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        // const result = await callFioApiSigned('push_transaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        // actor: newOracle1.account,
        // privKey: newOracle1.privateKey,
        data: {
          amount: wrapAmt + 666,
          // obt_id: wfio.address,
          obt_id: OBT_ID_2,
          fio_address: user2.address,
          // actor: newOracle1.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'status', 'block_num');
      expect(result.status).to.equal('OK');
      // wrappingFee = result.fee_collected;
      // wrappingOracleFee = parseInt(result.oracle_fee_collected);
      //
      // postWrapBal = await newOracle1.sdk.genericAction('getFioBalance', {});
      // postWrapBalDiff = preWrapBal.balance - postWrapBal.balance;
      // postWrapAvailDiff = preWrapBal.available - postWrapBal.available;
      // let expValue = wrapAmt + wrappingFee + wrappingOracleFee;
      // expect(postWrapBalDiff).to.equal(expValue); //(preWrapBal.balance - wrappingFee - parseInt(wrappingOracleFee));
      // expect(postWrapAvailDiff).to.equal(expValue); //(preWrapBal.balance - wrappingFee - parseInt(wrappingOracleFee));

    } catch (err) {
      throw err;
    }
  });

  it.skip(`(happy path) second oracle tries to unwrap ${wrapAmt} FIO tokens`, async function () {
    // let preWrapBal = await newOracle2.sdk.genericAction('getFioBalance', {});
    // let wrappingFee, wrappingOracleFee, postWrapBal, postWrapBalDiff, postWrapAvailDiff;
    try {
      const result = await newOracle2.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt + 666,
          // obt_id: wfio.address,
          obt_id: OBT_ID_2,
          fio_address: user2.address,
          // actor: newOracle2.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'status', 'block_num');
      expect(result.status).to.equal('OK');
      // wrappingFee = result.fee_collected;
      // wrappingOracleFee = parseInt(result.oracle_fee_collected);
      //
      // postWrapBal = await newOracle2.sdk.genericAction('getFioBalance', {});
      // postWrapBalDiff = preWrapBal.balance - postWrapBal.balance;
      // postWrapAvailDiff = preWrapBal.available - postWrapBal.available;
      // let expValue = wrapAmt + wrappingFee + wrappingOracleFee;
      // expect(postWrapBalDiff).to.equal(expValue); //(preWrapBal.balance - wrappingFee - parseInt(wrappingOracleFee));
      // expect(postWrapAvailDiff).to.equal(expValue); //(preWrapBal.balance - wrappingFee - parseInt(wrappingOracleFee));

    } catch (err) {
      throw err;
    }
  });

  it.skip(`(happy path) third oracle tries to unwrap ${wrapAmt} FIO tokens`, async function () {
    // let preWrapBal = await newOracle3.sdk.genericAction('getFioBalance', {});
    // let wrappingFee, wrappingOracleFee, postWrapBal, postWrapBalDiff, postWrapAvailDiff;
    try {
      const result = await newOracle3.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt + 666,
          // obt_id: wfio.address,
          obt_id: OBT_ID_2,
          fio_address: user2.address,
          // actor: newOracle3.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'status', 'block_num');
      expect(result.status).to.equal('OK');
      // wrappingFee = result.fee_collected;
      // wrappingOracleFee = parseInt(result.oracle_fee_collected);
      //
      // postWrapBal = await newOracle3.sdk.genericAction('getFioBalance', {});
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
describe.skip(`G1. PROBLEM TESTS (unwraptokens)`, function () {
  let wrapAmt = 1000000000000;
  let unwrapAmt = 500000000000;
  let oracle1, oracle2, oracle3, newOracle1, newOracle2, newOracle3,
    user1, user2, user3, factory, owner, wfio, wfioAccts;

  let OBT_ID_1, OBT_ID_2;

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

    [owner, wfioAccts, wfio] = await setupWFIOontract(ethers, INIT_SUPPLY);
    await registerWfioOracles(wfio, wfioAccts);

    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          amount: wrapAmt + 333,
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
          amount: wrapAmt + 666,
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

    // call wfio.wrap
    let fromStartingBal = await wfioAccts[14].getBalance();
    let toStartingWfioBal = await wfio.balanceOf(wfioAccts[0].address);

    await wfio.connect(wfioAccts[12]).wrap(wfioAccts[0].address, 100, OBT_ID_1);
    await wfio.connect(wfioAccts[13]).wrap(wfioAccts[0].address, 100, OBT_ID_1);
    try {
      let result = await wfio.connect(wfioAccts[14]).wrap(wfioAccts[0].address, 100, OBT_ID_1);
      let fromEndingBal = await wfioAccts[14].getBalance();
      let toEndingWfioBal = await wfio.balanceOf(wfioAccts[0].address);
      expect(result.from).to.equal(wfioAccts[14].address);
      expect(result.to).to.equal(wfio.address);
      expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
      expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.true;
      expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(100)
    } catch (err) {
      throw err;
    }

    await wfio.connect(wfioAccts[12]).wrap(wfioAccts[1].address, 100, OBT_ID_2);
    await wfio.connect(wfioAccts[13]).wrap(wfioAccts[1].address, 100, OBT_ID_2);
    try {
      let result = await wfio.connect(wfioAccts[14]).wrap(wfioAccts[1].address, 100, OBT_ID_2);
      let fromEndingBal = await wfioAccts[14].getBalance();
      let toEndingWfioBal = await wfio.balanceOf(wfioAccts[1].address);
      expect(result.from).to.equal(wfioAccts[14].address);
      expect(result.to).to.equal(wfio.address);
      expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
      expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.true;
      expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(100)
    } catch (err) {
      throw err;
    }
  });

  it(`(BD-3409)(invalid obt_id) try to unwrap ${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          obt_id: "!invalid@#$",
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      throw err;
    }
  });

  it(`(BD-3409)(int obt_id) try to unwrap ${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          obt_id: 1000000000000,
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      throw err;
    }
  });

  it(`(BD-3409)(negative obt_id) try to unwrap ${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          obt_id: -12345,
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      throw err;
    }
  });
});
