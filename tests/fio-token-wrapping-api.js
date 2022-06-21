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

describe(`************************** fio-token-wrapping-api.js ************************** \n   A. [FIO] Oracles (get_table_rows)`, function () {
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

describe(`B. [FIO][api] Oracles (register)`, function () {
  let user1, user2, user3, newOracle1, newOracle2, newOracle3, oracle1, oracle2, oracle3;

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
    // await setTestOracleFees(oracle1, 10000000000, 11000000000);
    // await setTestOracleFees(oracle2, 13000000000, 11000000000);
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
      expect(result.processed.action_traces.length).to.equal(8);
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
      expect(result.fields[0].value).to.equal('');
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
      expect(result.processed.action_traces.length).to.equal(8);
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
  let user1, user2, user3, newOracle1, newOracle2, newOracle3, newOracle4, oracle1, oracle2, oracle3;

  before(async function () {
    // oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    oracle1 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    // oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    // user1 = await newUser(faucet);
    // user2 = await newUser(faucet);
    // user3 = await newUser(faucet);
    newOracle1 = await newUser(faucet);
    newOracle2 = await newUser(faucet);
    newOracle3 = await newUser(faucet);
    newOracle4 = await newUser(faucet);

    // register a new oracle
    await registerNewBp(newOracle1);
    await registerNewBp(newOracle2);
    await registerNewBp(newOracle3);
    await registerNewBp(newOracle4);

    await registerNewOracle(newOracle1);
    await registerNewOracle(newOracle2);
    await registerNewOracle(newOracle3);
    await registerNewOracle(newOracle4);

    await setTestOracleFees(newOracle1, 10000000000, 11000000000);
    await setTestOracleFees(newOracle2, 11000000000, 11500000000);
    await setTestOracleFees(newOracle3, 12000000000, 12500000000);
    await setTestOracleFees(newOracle4, 13000000000, 13500000000);
  });

  it(`query the oracless table, expects results to contain newOracle`, async function () {
    try {
      const oracleRecords = await getOracleRecords(newOracle1.account);
      expect(oracleRecords.rows.length).to.equal(1);
      expect(oracleRecords.rows[0]).to.have.all.keys('actor', 'fees');
      expect(oracleRecords.rows[0].actor).to.be.a('string').and.equal(newOracle1.account);
    } catch (err) {
      throw err;
    }
  });

  // unhappy tests
  // it(`(empty actor) try to unregister an oracle, expect OK`, async function () {
  //   try {
  //     const result = await callFioApiSigned('push_transaction', {
  //       action: 'unregoracle',
  //       account: 'fio.oracle',
  //       actor: newOracle2.account,
  //       privKey: newOracle2.privateKey,
  //       data: {
  //         oracle_actor: newOracle2.account,
  //         actor: ""
  //       }
  //     });
  //     expect(result).to.have.all.keys('transaction_id', 'processed');
  //   } catch (err) {
  //     throw err;
  //   }
  // });

  // it(`(invalid actor) try to unregister an oracle, expect Error`, async function () {
  //   try {
  //     const result = await callFioApiSigned('push_transaction', {
  //       action: 'unregoracle',
  //       account: 'fio.oracle',
  //       actor: newOracle1.account,
  //       privKey: newOracle1.privateKey,
  //       data: {
  //         oracle_actor: newOracle1.account,
  //         actor: "!invalid@$%"
  //       }
  //     });
  //     expect(result).to.not.have.all.keys('transaction_id', 'processed');
  //   } catch (err) {
  //     throw err;
  //   }
  // });

  it(`(empty oracle_actor) newOracle tries to unregister an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          oracle_actor: "",
          actor: newOracle1.account
        }
      });
      expect(result.fields[0].name).to.equal('oracle_actor');
      expect(result.fields[0].value).to.equal('');
      expect(result.fields[0].error).to.equal('Oracle is not registered');
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
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          oracle_actor: "",
          actor: newOracle1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
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
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          oracle_actor: "!invalid!@$",
          actor: newOracle1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.errorCode).to.equal(400);
      expect(err.json).to.have.all.keys('type', 'message', 'fields');
      expect(err.json.fields[0].error).to.equal('Oracle is not registered');
    }
  });

  it(`(int oracle_actor) try to unregister an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          oracle_actor: 1234400000000,
          actor: newOracle1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });

  it(`(negative oracle_actor) try to unregister an oracle, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          oracle_actor: -1234400000000,
          actor: newOracle1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });

  // it.skip(`(missing actor) try to unregister an oracle, expect Error`, async function () {
  //   try {
  //     const result = await callFioApiSigned('push_transaction', {
  //       action: 'unregoracle',
  //       account: 'fio.oracle',
  //       actor: newOracle1.account,
  //       privKey: newOracle1.privateKey,
  //       data: {
  //         oracle_actor: newOracle1.account,
  //       }
  //     });
  //     expect(result).to.not.have.all.keys('transaction_id', 'processed');
  //   } catch (err) {
  //     expect(err.message).to.equal('missing unregoracle.actor (type=name)');
  //   }
  // });
  //
  // it.skip(`(int actor) try to unregister an oracle, expect Error`, async function () {
  //   try {
  //     const result = await callFioApiSigned('push_transaction', {
  //       action: 'unregoracle',
  //       account: 'fio.oracle',
  //       actor: newOracle1.account,
  //       privKey: newOracle1.privateKey,
  //       data: {
  //         oracle_actor: newOracle1.account,
  //         actor: 1234500000000
  //       }
  //     });
  //     expect(result).to.not.have.all.keys('transaction_id', 'processed');
  //   } catch (err) {
  //     expect(err.message).to.equal('Expected string containing name');
  //   }
  // });
  //
  // it.skip(`(negative actor) try to unregister an oracle, expect Error`, async function () {
  //   try {
  //     const result = await callFioApiSigned('push_transaction', {
  //       action: 'unregoracle',
  //       account: 'fio.oracle',
  //       actor: newOracle1.account,
  //       privKey: newOracle1.privateKey,
  //       data: {
  //         oracle_actor: newOracle1.account,
  //         actor: -1234500000000
  //       }
  //     });
  //     expect(result).to.not.have.all.keys('transaction_id', 'processed');
  //   } catch (err) {
  //     expect(err.message).to.equal('Expected string containing name');
  //   }
  // });

  it(`(happy path) oracle1 tries to unregister newOracle, expect OK`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: oracle1.account,
        privKey: oracle1.privateKey,
        data: {
          oracle_actor: newOracle3.account,
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed).to.have.all.keys('id', 'block_num', 'block_time', 'producer_block_id', 'receipt', 'elapsed', 'net_usage', 'scheduled', 'action_traces', 'account_ram_delta', 'except', 'error_code');
      expect(result.processed.receipt.status).to.equal('executed');
      expect(result.processed.action_traces.length).to.equal(1);
      expect(result.processed.action_traces[0].receipt.response).to.equal(`{"status": "OK"}`);
      expect(result.processed.action_traces[0].act.data.oracle_actor).to.equal(newOracle3.account);
    } catch (err) {
      throw err;
    }
  });
});

describe(`D. [FIO][api] Oracles (setoraclefee)`, function () {

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

  it(`newOracle tries to set oracle fee, expect OK`, async function () {
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

  //unhappy tests
  it(`(BD- fixed)(negative wrap_fio_domain) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle5.account,
        privKey: newOracle5.privateKey,
        data: {
          wrap_fio_domain:  -1234500000000,
          wrap_fio_tokens: 1,
          actor: newOracle5.account
        }
      });
      expect(result).to.have.all.keys('type', 'message', 'fields');
      expect(result.fields[0].name).to.equal('wrap_fio_domain');
      expect(result.fields[0].value).to.equal('-1234500000000');
      expect(result.fields[0].error).to.equal('Invalid fee value');
      const oracleRecords = await getOracleRecords(newOracle5.account);
      expect(oracleRecords.rows[0].fees).to.be.empty;
    } catch (err) {
      throw err;
    }
  });

  it(`(BD-3406 fixed)(negative wrap_fio_tokens) try to set oracle fees, expect Error`, async function () {
    try{
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle5.account,
        privKey: newOracle5.privateKey,
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: -1234500000000,
          actor: newOracle5.account
        }
      });
      expect(result).to.have.all.keys('type', 'message', 'fields');
      expect(result.fields[0].name).to.equal('wrap_fio_tokens');
      expect(result.fields[0].value).to.equal('-1234500000000');
      expect(result.fields[0].error).to.equal('Invalid fee value');
      const oracleRecords = await getOracleRecords(newOracle5.account);
      expect(oracleRecords.rows[0].fees).to.be.empty;
    } catch (err) {
      throw err;
    }
  });

  it(`(empty wrap_fio_domain) try to set oracle fees, expect "" to be converted to 0`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle.account,
        privKey: newOracle.privateKey,
        data: {
          wrap_fio_domain:  "",
          wrap_fio_tokens: 1,
          actor: newOracle.account
        }
      });

      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.action_traces[0].act.data.wrap_fio_domain).to.equal(0);
      expect(result.processed.action_traces[0].act.data.wrap_fio_tokens).to.equal(1);
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

  it(`(missing actor) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle2.account,
        privKey: newOracle2.privateKey,
        data: {
          wrap_fio_domain: 1000,
          wrap_fio_tokens: 1000,
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing setoraclefee.actor (type=name)');
    }
  });

  it(`(invalid actor) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: newOracle3.account,
        privKey: newOracle3.privateKey,
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
        actor: newOracle4.account,
        privKey: newOracle4.privateKey,
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
        actor: newOracle5.account,
        privKey: newOracle5.privateKey,
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

describe(`** ORACLE TABLE CLEANUP **`, async function () {
  it(`clean out oracless record with helper function`, async function () {
    try {
      await cleanUpOraclessTable(faucet, true);
      let records = await getOracleRecords();
      expect(records.rows.length).to.equal(3);
    } catch (err) {
      throw err;
    }
  });
});

describe.skip(`E. (BD-3788)[FIO] Oracles (getoraclefees)`, function () {

  let oracle1, newOracle, newOracle2, newOracle3,  user1;
  let ORACLE_FEE, WRAP_FEE;

  before(async function () {
    user1 = await newUser(faucet);
  });

  it('try to get the wrapping fees from the API, expect no registered oracles', async function () {
    try {
      await callFioApi('get_oracle_fees', {});
    } catch (err) {
      expect(err.error.message).to.equal('Not Enough Registered Oracles');
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
    expect(result.oracle_fees[0].fee_amount).to.equal(3000000000);
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

describe(`F. [FIO][api] Wrap FIO tokens`, function () {

  let wrapAmt = 1000000000000;
  let oracle1, oracle2, oracle3, user1, user2, newOracle, newOracle1, newOracle2, custodians, factory, owner, wfio, wfioAccts;
  let ORACLE_FEE, WRAP_FEE;

  wfio = {
    address: '0xblahblahblah'
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
    oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    // oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    // oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    user1 = await newUser(faucet);
    // user2 = await newUser(faucet);
    // user3 = await newUser(faucet);
    newOracle = await newUser(faucet);
    newOracle1 = await newUser(faucet);
    newOracle2 = await newUser(faucet);
    // await registerNewOracle(oracle1);

    // register new oracles as bps
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
    await registerNewOracle(newOracle);
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
    await registerNewOracle(newOracle1);
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
    await registerNewOracle(newOracle2);
  });

  it(`set oracle fees for all oracles`, async function () {
    //console.log('[dbg] starting fee setting...');
    await setTestOracleFees(newOracle, 10000000000, 11000000000);
    await setTestOracleFees(newOracle1, 11000000000, 20000000000);
    await setTestOracleFees(newOracle2, 20000000000, 21000000000);
    // await setTestOracleFees(oracle1, 25000000000, 25000000000);
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
  it(`(BD-3408)(int tpid) try to wrap 1000 FIO tokens`, async function () {
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
          // tpid: "donkey 123",    // does not replicate - space seems to trigger expected error
          // tpid: "donkey123",
          // tpid: "donkey-123",
          // tpid: "donkey@123",
          // tpid: "donkey",
          actor: user1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.error.details[0].message).to.equal('TPID must be empty or valid FIO address');
    }
  });

  it(`(negative max_fee) try to wrap 1000 FIO tokens, expect max_fee to cast to unsigned integer`, async function () {
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
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.fields[0].name).to.equal('max_fee');
      expect(result.fields[0].value).to.equal(`${-config.maxFee}`);
      expect(result.fields[0].error).to.equal('Invalid fee value');
    } catch (err) {
      throw err;
    }
  });

  it(`(negative max_oracle_fee) try to wrap 1000 FIO tokens`, async function () {
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
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.fields[0].name).to.equal('max_oracle_fee');
      expect(result.fields[0].value).to.equal(`${-config.maxFee}`);
      expect(result.fields[0].error).to.equal('Invalid oracle fee value');
    } catch (err) {
      throw err;
    }
  });

  it(`(empty amount) try to wrap FIO tokens, expect Error`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          amount: 0,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.code).to.equal(500);
      expect(result.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
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
      expect(result.fields[0].name).to.equal('amount');
      expect(result.fields[0].value).to.equal(`${-wrapAmt}`);
      expect(result.fields[0].error).to.equal('Invalid amount');
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

  it(`(empty max_fee) try to wrap 1000 FIO tokens`, async function () {
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
          max_fee: "",
          tpid: "",
          actor: user1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.fields[0].error).to.equal('Fee exceeds supplied maximum.')
    } catch (err) {
      throw err;
    }
  });

  it(`(missing max_fee) try to wrap 1000 FIO tokens`, async function () {
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
          tpid: "",
          actor: user1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing wraptokens.max_fee (type=int64)');
    }
  });

  it(`(invalid max_fee) try to wrap 1000 FIO tokens`, async function () {
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
          max_fee: "!invalid!@$",
          tpid: "",
          actor: user1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(missing tpid) try to wrap 1000 FIO tokens`, async function () {
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
          actor: user1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing wraptokens.tpid (type=string)');
    }
  });

  it(`(invalid tpid) try to wrap 1000 FIO tokens`, async function () {
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
          tpid: "!invalid!@",
          actor: user1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.fields[0].name).to.equal('tpid');
      expect(result.fields[0].value).to.equal('!invalid!@');
      expect(result.fields[0].error).to.equal('TPID must be empty or valid FIO address');
    } catch (err) {
      throw err;
    }
  });

  it(`(negative tpid) try to wrap 1000 FIO tokens`, async function () {
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
          tpid: -12345,
          actor: user1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('TPID must be empty or valid FIO address');
    }
  });

  it(`(invalid actor) try to wrap 1000 FIO tokens`, async function () {
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
          actor: "!invalid!@"
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.json.error.details[0].message).to.equal('missing authority of .invalid');
    }
  });

  it(`(int actor) try to wrap 1000 FIO tokens`, async function () {
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
          actor: 1234500000000
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });

  it(`(negative actor) try to wrap 1000 FIO tokens`, async function () {
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
          actor: -12345,
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });

  let preWrapBal, postWrapBal, wrappingFee, wrappingOracleFee;

  it(`get user1 balance`, async function () {
    preWrapBal = await user1.sdk.genericAction('getFioBalance', {});
  });

  it(`(Bug BD-3869) (happy w/ tpid) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          // public_address: wfio.address,
          public_address: wfio.address,
          // public_address: wfioAccts[0].address,
          max_oracle_fee: config.maxOracleFee,
          max_fee: config.maxFee,
          tpid: 'eosio',
          actor: user1.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
    } catch (err) {
      throw err;
    }
  });

  it(`(happy w/o tpid) try to wrap FIO tokens, expect OK`, async function () {
    let postWrapBalDiff, postWrapAvailDiff;
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        actor: user1.account,
        privKey: user1.privateKey,
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address + "moreethaddress",
          max_oracle_fee: config.maxOracleFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
      expect(result.processed.receipt.status).to.equal('executed');
      wrappingFee = result.fee_collected;
      wrappingOracleFee = parseInt(result.oracle_fee_collected);
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
      expect(records.rows.length).to.equal(0);//be.oneOf([3, 0]);
    } catch (err) {
      throw err;
    }
  });
});

describe(`G. [FIO][api] Unwrap FIO tokens`, function () {
  let wrapAmt = 1000000000000;
  let unwrapAmt = 500000000000;
  let oracle1, oracle2, oracle3, newOracle1, newOracle2, newOracle3,
    user1, user2, user3, custodians, factory, owner, wfio, wfioAccts;

  let OBT_ID_1, OBT_ID_2;

  wfio = {
    address: '0xblahblahblah'
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

  // unhappy tests
  it(`(negative amount) try to unwrap -${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          amount: -wrapAmt,
          obt_id: OBT_ID_1,
          fio_address: user1.address,
          actor: newOracle1.account
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
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          amount: wrapAmt,
          obt_id: "",
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  it(`(BD-3409?)(invalid obt_id) try to unwrap ${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          amount: wrapAmt,
          obt_id: "!invalid@#$",
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  it(`(BD-3409?)(int obt_id) try to unwrap ${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          amount: wrapAmt,
          obt_id: 1000000000000,
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  it(`(BD-3409?)(negative obt_id) try to unwrap ${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          amount: wrapAmt,
          obt_id: -12345,
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      throw err;
    }
  });

  // Need to skip unitl bug is fixed or it messes up future happy pay unwraps

  // it(`(BUG BD-3866) (empty amount) try to unwrap FIO tokens, Expect failure`, async function () {
  //   try {
  //     const result = await callFioApiSigned('push_transaction', {
  //       action: 'unwraptokens',
  //       account: 'fio.oracle',
  //       actor: newOracle1.account,
  //       privKey: newOracle1.privateKey,
  //       data: {
  //         amount: "",
  //         obt_id: OBT_ID_1,
  //         fio_address: user3.address,
  //         actor: newOracle1.account
  //       }
  //     });
  //     expect(result).to.have.all.keys('transaction_id', 'processed');
  //   } catch (err) {
  //     expect(err.message).to.equal('missing unwraptokens.amount (type=int64)');
  //   }
  // });

  it(`(missing amount) try to unwrap FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          obt_id: OBT_ID_1,
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing unwraptokens.amount (type=int64)');
    }
  });

  it(`(invalid amount) try to unwrap FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          amount: "!invalid@#$",
          obt_id: OBT_ID_1,

          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(missing obt_id) try to unwrap ${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          amount: wrapAmt,
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing unwraptokens.obt_id (type=string)');
    }
  });

  it(`(empty fio_address) try to unwrap ${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          amount: wrapAmt,
          obt_id: OBT_ID_1,
          fio_address: "",
          actor: newOracle1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.fields[0].name).to.equal('fio_address');
      expect(result.fields[0].value).to.equal('');
      expect(result.fields[0].error).to.equal('Invalid FIO Address');
    } catch (err) {
      throw err;
    }
  });

  it(`(missing fio_address) try to unwrap ${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          amount: wrapAmt,
          obt_id: OBT_ID_1,
          actor: newOracle1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
    } catch (err) {
      expect(err.message).to.equal('missing unwraptokens.fio_address (type=string)');
    }
  });

  it(`(invalid fio_address) try to unwrap ${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          amount: wrapAmt,
          obt_id: OBT_ID_1,
          fio_address: "!invalid@$",
          actor: newOracle1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.fields[0].name).to.equal('fio_address');
      expect(result.fields[0].value).to.equal('!invalid@$');
      expect(result.fields[0].error).to.equal('Invalid FIO Address');
    } catch (err) {
      throw err;
    }
  });

  it(`(int fio_address) try to unwrap ${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          amount: wrapAmt,
          obt_id: OBT_ID_1,
          fio_address: 1234500000000,
          actor: newOracle1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.message).to.equal('FIO Address not found');
    } catch (err) {
      throw err;
    }
  });

  it(`(negative fio_address) try to unwrap ${wrapAmt} FIO tokens`, async function () {
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          amount: wrapAmt,
          obt_id: OBT_ID_1,
          fio_address: -12345,
          actor: newOracle1.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.fields[0].name).to.equal('fio_address');
      expect(result.fields[0].value).to.equal('-12345');
      expect(result.fields[0].error).to.equal('Invalid FIO Address');
    } catch (err) {
      throw err;
    }
  });

  it(`query the oracless table, expect 6 records`, async function () {
    try {
      const oracleRecords = await getOracleRecords();
      expect(oracleRecords.rows.length).to.equal(3);
    } catch (err) {
      throw err;
    }
  });

  it(`(happy path) first oracle tries to unwrap OBT_ID_1 ${wrapAmt} FIO tokens`, async function () {
    // let preWrapBal = await newOracle1.sdk.genericAction('getFioBalance', {});
    // let wrappingFee, wrappingOracleFee, postWrapBal, postWrapBalDiff, postWrapAvailDiff;
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        actor: newOracle1.account,
        privKey: newOracle1.privateKey,
        data: {
          amount: wrapAmt,
          // obt_id: wfio.address,
          obt_id: OBT_ID_1,
          fio_address: user1.address,
          actor: newOracle1.account
        }
      });
      //console.log('Result: ', result);
      expect(result).to.have.all.keys('transaction_id', 'processed');
      // wrappingFee = result.fee_collected;
      // wrappingOracleFee = parseInt(result.oracle_fee_collected);
      // postWrapBal = await newOracle1.sdk.genericAction('getFioBalance', {});
      // postWrapBalDiff = preWrapBal.balance - postWrapBal.balance;
      // postWrapAvailDiff = preWrapBal.available - postWrapBal.available;
      // let expValue = wrapAmt + wrappingFee + wrappingOracleFee;
      // expect(postWrapBalDiff).to.equal(expValue); //(preWrapBal.balance - wrappingFee - parseInt(wrappingOracleFee));
      // expect(postWrapAvailDiff).to.equal(expValue); //(preWrapBal.balance - wrappingFee - parseInt(wrappingOracleFee));

    } catch (err) {
      console.log('Error: ', err);
      throw err;
    }
  });

  it(`(Amount mismatch) second oracle tries to unwrap OBT_ID_1 using a different amount than first oracle`, async function () {
    let preWrapBal = await newOracle2.sdk.genericAction('getFioBalance', {});
    let wrappingFee, wrappingOracleFee, postWrapBal, postWrapBalDiff, postWrapAvailDiff;
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        actor: newOracle2.account,
        privKey: newOracle2.privateKey,
        data: {
          amount: wrapAmt + 300,
          obt_id: OBT_ID_1,
          fio_address: user1.address,
          actor: newOracle2.account
        }
      });
      expect(result).to.not.have.all.keys('transaction_id', 'processed');
      expect(result.fields[0].name).to.equal('amount');
      expect(result.fields[0].error).to.equal('Token amount mismatch.');
    } catch (err) {
      throw err;
    }
  });

  it(`(happy path) second oracle tries to unwrap OBT_ID_1 ${wrapAmt} FIO tokens`, async function () {
    let preWrapBal = await newOracle2.sdk.genericAction('getFioBalance', {});
    let wrappingFee, wrappingOracleFee, postWrapBal, postWrapBalDiff, postWrapAvailDiff;
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        actor: newOracle2.account,
        privKey: newOracle2.privateKey,
        data: {
          amount: wrapAmt,
          // obt_id: wfio.address,
          obt_id: OBT_ID_1,
          fio_address: user1.address,
          actor: newOracle2.account
        }
      });

      expect(result).to.have.all.keys('transaction_id', 'processed');
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
      console.log('Error: ', err);
      throw err;
    }
  });

  it(`(happy path) third oracle tries to unwrap OBT_ID_1 ${wrapAmt} FIO tokens`, async function () {
    let preWrapBal = await newOracle3.sdk.genericAction('getFioBalance', {});
    let wrappingFee, wrappingOracleFee, postWrapBal, postWrapBalDiff, postWrapAvailDiff;
    try {
      const result = await callFioApiSigned('push_transaction', {
        action: 'unwraptokens',
        account: 'fio.oracle',
        actor: newOracle3.account,
        privKey: newOracle3.privateKey,
        data: {
          amount: wrapAmt,
          // obt_id: wfio.address,
          obt_id: OBT_ID_1,
          fio_address: user1.address,
          actor: newOracle3.account
        }
      });
      expect(result).to.have.all.keys('transaction_id', 'processed');
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
