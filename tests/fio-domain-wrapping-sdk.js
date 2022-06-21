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
  randStr,
  getRamForUser
} = require("../utils.js");
const {
  getOracleRecords,
  registerNewBp,
  registerNewOracle,
  setTestOracleFees,
  cleanUpOraclessTable,
  setupFIONFTcontract,
  registerFioNftOracles,
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
    console.log("          cleanup...");
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

describe(`************************** fio-domain-wrapping-sdk.js ************************** \n   A. [FIO] Oracles (get_table_rows)`, function () {
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

describe(`B. [FIO] Wrap FIO domains`, function () {

  let oracle1, oracle2, oracle3, newOracle1, newOracle2, newOracle3, newOracle4,
      user1, user2, user3, user4, user5, user6, user7, user8, user9, user10, user11, user12, user13, user14,
      custodians, factory, owner, fioNftAccts,
      OBT_ID, ORACLE_FEE, WRAP_FEE;

  let fioNft = {
    address: '0xpolygonaddress' + randStr(20)
  }

  before(async function () {
    // oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    // oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');

    // test users
    oracle1 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    user4 = await newUser(faucet);
    user5 = await newUser(faucet);
    user6 = await newUser(faucet);
    user7 = await newUser(faucet);
    user8 = await newUser(faucet);
    user9 = await newUser(faucet);
    user10 = await newUser(faucet);
    user11 = await newUser(faucet);
    user12 = await newUser(faucet);
    user13 = await newUser(faucet);
    user14 = await newUser(faucet);
    newOracle1 = await newUser(faucet);
    newOracle2 = await newUser(faucet);
    newOracle3 = await newUser(faucet);

    // register new oracles as bps
    await registerNewBp(newOracle1);
    await registerNewBp(newOracle2);
    await registerNewBp(newOracle3);

    // register oracles
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

    //[owner, fioNftAccts, fioNft] = await setupFIONFTcontract(ethers);
    //await registerFioNftOracles(fioNft, fioNftAccts);

    // try {
    //   const result = await callFioApiSigned('push_transaction', {
    //     action: 'wraptokens',
    //     account: 'fio.oracle',
    //     actor: user1.account,
    //     privKey: user1.privateKey,
    //     data: {
    //       amount: wrapAmt,
    //       chain_code: "ETH",
    //       public_address: fioNft.address,
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
    //
    // // call fioNft.wrap
    // let fromStartingBal = await fioNftAccts[14].getBalance();
    // let toStartingWfioBal = await fioNft.balanceOf(fioNftAccts[0].address);
    //
    // await fioNft.connect(fioNftAccts[12]).wrap(fioNftAccts[0].address, 100, OBT_ID);
    // await fioNft.connect(fioNftAccts[13]).wrap(fioNftAccts[0].address, 100, OBT_ID);
    // try {
    //   let result = await fioNft.connect(fioNftAccts[14]).wrap(fioNftAccts[0].address, 100, OBT_ID);
    //   let fromEndingBal = await fioNftAccts[14].getBalance();
    //   let toEndingWfioBal = await fioNft.balanceOf(fioNftAccts[0].address);
    //   expect(result.from).to.equal(fioNftAccts[14].address);
    //   expect(result.to).to.equal(fioNft.address);
    //   expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
    //   expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.true;
    //   expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(100)
    // } catch (err) {
    //   throw err;
    // }
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
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
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
  });

  // unhappy tests
  it(`(empty tpid) try to wrap a FIO domain, expect OK`, async function () {
    let domain = user10.domain;
    try {
      const result = await user10.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user10.account
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

  it(`(missing tpid) try to wrap a FIO domain, expect SDK to inject an empty value`, async function () {
    let domain = user11.domain;
    try {
      const result = await user11.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          actor: user11.account
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('TPID must be empty or valid FIO address');
    }
  });

  // // issues
  // it.skip(`(BUG?)(int chain_code) try to wrap a FIO domain`, async function () {
  //   let domain = user2.domain;
  //   try {
  //     const result = await user2.sdk.genericAction('pushTransaction', {
  //       action: 'wrapdomain',
  //       account: 'fio.oracle',
  //       data: {
  //         fio_domain: domain,
  //         chain_code: 12345,
  //         public_address: fioNft.address,
  //         max_oracle_fee: config.maxFee,
  //         max_fee: config.maxFee,
  //         tpid: "",
  //         actor: user2.account
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     // expect(err.message).to.equal('Invalid chain code format');
  //     expect(err.json.fields[0].error).to.equal('Invalid chain code format');
  //   }
  // });

  // it.skip(`(BUG?)(invalid public_address) try to wrap a FIO domain`, async function () {
  //   let domain = user3.domain;
  //   try {
  //     const result = await user3.sdk.genericAction('pushTransaction', {
  //       action: 'wrapdomain',
  //       account: 'fio.oracle',
  //       data: {
  //         fio_domain: domain,
  //         chain_code: "ETH",
  //         public_address: "!invalid@%^",
  //         max_oracle_fee: config.maxFee,
  //         max_fee: config.maxFee,
  //         tpid: "",
  //         actor: user3.account
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     // expect(err.message).to.equal('Invalid public address');
  //     expect(err.json.fields[0].error).to.equal('Invalid public address');
  //   }
  // });

  // it.skip(`(BUG?)(int public_address) try to wrap a FIO domain`, async function () {
  //   let domain = user4.domain;
  //   try {
  //     const result = await user4.sdk.genericAction('pushTransaction', {
  //       action: 'wrapdomain',
  //       account: 'fio.oracle',
  //       data: {
  //         fio_domain: domain,
  //         chain_code: "ETH",
  //         public_address: 12345,
  //         max_oracle_fee: config.maxFee,
  //         max_fee: config.maxFee,
  //         tpid: "",
  //         actor: user4.account
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     // expect(err.message).to.equal('Invalid public address');
  //     expect(err.json.fields[0].error).to.equal('Invalid public address');
  //   }
  // });

  // it.skip(`(BUG?)(negative public_address) try to wrap a FIO domain`, async function () {
  //   let domain = user5.domain;
  //   try {
  //     const result = await user5.sdk.genericAction('pushTransaction', {
  //       action: 'wrapdomain',
  //       account: 'fio.oracle',
  //       data: {
  //         fio_domain: domain,
  //         chain_code: "ETH",
  //         public_address: -12345,
  //         max_oracle_fee: config.maxFee,
  //         max_fee: config.maxFee,
  //         tpid: "",
  //         actor: user5.account
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     // expect(err.message).to.equal('Invalid public address');
  //     expect(err.json.fields[0].error).to.equal('Invalid public address');
  //   }
  // });

  // it.skip(`(BUG?)(int tpid) try to wrap a FIO domain`, async function () {
  //   let domain = user12.domain;
  //   try {
  //     const result = await user12.sdk.genericAction('pushTransaction', {
  //       action: 'wrapdomain',
  //       account: 'fio.oracle',
  //       data: {
  //         fio_domain: domain,
  //         chain_code: "ETH",
  //         public_address: fioNft.address,
  //         max_oracle_fee: config.maxFee,
  //         max_fee: config.maxFee,
  //         tpid: 12345,
  //         actor: user12.account
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     expect(err.json.fields[0].error).to.equal('TPID must be empty or valid FIO address');
  //   }
  // });

  it(`(negative max_oracle_fee) try to wrap a FIO domain`, async function () {
    let domain = user7.domain;
    try {
      const result = await user7.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
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
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      // expect(err.message).to.equal('Invalid oracle fee value');
      expect(err.json.fields[0].error).to.equal('Invalid oracle fee value');
    }
  });

  it(`(negative max_fee) try to wrap a FIO domain`, async function () {
    let domain = user9.domain;
    try {
      const result = await user9.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: -config.maxFee,
          tpid: "",
          actor: user9.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      // expect(err.message).to.equal('Invalid fee value');
      expect(err.json.fields[0].error).to.equal('Invalid fee value');
    }
  });

  it(`(empty max_oracle_fee) try to wrap a FIO domain`, async function () {
    let domain = user6.domain;
    try {
      const result = await user6.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: "",
          max_fee: config.maxFee,
          tpid: "",
          actor: user6.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid oracle fee value');
    }
  });

  it(`(empty max_fee) try to wrap a FIO domain`, async function () {
    let domain = user8.domain;
    try {
      const result = await user8.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: "",
          tpid: "",
          actor: user8.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Fee exceeds supplied maximum.');
    }
  });

  it(`(empty actor) try to wrap a FIO domain, expect SDK to use default value`, async function () {
    let domain = user13.domain;
    try {
      const result = await user13.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: ""
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      throw err;
    }
  });

  it(`(actor and domain owner mismatch) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Actor and domain owner mismatch.');
    }
  });

  it(`(empty fio_domain) try to wrap a FIO domain`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: "",
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('FIO Domain not registered');
    }
  });

  it(`(missing fio_domain) try to wrap a FIO domain`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing wrapdomain.fio_domain (type=string)');
    }
  });

  it(`(invalid fio_domain) try to wrap a FIO domain`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: "!invalid@$",
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid FIO domain');
    }
  });

  it(`(int fio_domain) try to wrap a FIO domain`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: 1234500000000,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('FIO Domain not registered');
    }
  });

  it(`(negative fio_domain) try to wrap a FIO domain`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: -12345,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('FIO Domain not registered');
    }
  });

  it(`(empty chain_code) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid chain code format');
    }
  });

  it(`(missing chain_code) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing wrapdomain.chain_code (type=string)');
    }
  });

  it(`(invalid chain_code) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "!invalid@$",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid chain code format');
    }
  });

  it(`(negative chain_code) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: -12345,
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid chain code format');
    }
  });

  it(`(empty public_address) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: "",
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid public address');
    }
  });

  it(`(missing public_address) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          //public_address: "",
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing wrapdomain.public_address (type=string)');
    }
  });

  it(`(missing max_oracle_fee) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing wrapdomain.max_oracle_fee (type=int64)');
    }
  });

  it(`(invalid max_oracle_fee) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: "!invalid@$%",
          max_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(missing max_fee) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing wrapdomain.max_fee (type=int64)');
    }
  });

  it(`(invalid max_fee) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: "!invalid@$%",
          tpid: "",
          actor: user1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(invalid tpid) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "!invalid@$%",
          actor: user1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('TPID must be empty or valid FIO address');
    }
  });

  it(`(negative tpid) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: -12345,
          actor: user1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('TPID must be empty or valid FIO address');
    }
  });

  it(`(missing actor) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          //actor: ""
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Actor and domain owner mismatch.');
    }
  });

  it(`(invalid actor) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: "!invalid@$%"
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.error.details[0].message).to.equal('missing authority of .invalid');
    }
  });

  it(`(int actor) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: 12345
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });

  it(`(negative actor) try to wrap a FIO domain`, async function () {
    let domain = user1.domain;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: -12345
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });
});

describe(`B1. PROBLEM TESTS (wrapdomains)`, function () {

  let oracle1, oracle2, oracle3, newOracle1, newOracle2, newOracle3, newOracle4,
    user1, user2, user3, user4, user5, user6, ORACLE_FEE, WRAP_FEE;

  let fioNft = {
    address: '0xpolygonaddress' + randStr(20)
  }

  before(async function () {
    // oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    // oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');

    // test users
    oracle1 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    user4 = await newUser(faucet);
    user5 = await newUser(faucet);
    user6 = await newUser(faucet);
    newOracle1 = await newUser(faucet);
    newOracle2 = await newUser(faucet);
    newOracle3 = await newUser(faucet);

    // register new oracles as bps
    await registerNewBp(newOracle1);
    await registerNewBp(newOracle2);
    await registerNewBp(newOracle3);

    // register oracles
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

  it(`(11 digit int chain_code) try to wrap a FIO domain. Expect error.`, async function () {
    let domain = user2.domain;
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: 12345678901,
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user2.account
        }
      });
      //console.log('Result: ', result)
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid chain code format');
    }
  });

  it(`(11 digit string chain_code) try to wrap a FIO domain. Expect error.`, async function () {
    let domain = user2.domain;
    try {
      const result = await user2.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: '12345678901',
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: user2.account
        }
      });
      //console.log('Result: ', result)
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('Invalid chain code format');
    }
  });

   it(`(BUG BD-3878)(int tpid) try to wrap a FIO domain. Expect invalid format error since it is not a valid crypto handle.`, async function () {
    let domain = user6.domain;
    try {
      const result = await user6.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: 12345,
          actor: user6.account
        }
      });
      //console.log('Result: ', result)
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].error).to.equal('TPID must be empty or valid FIO address');
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

describe(`C. [FIO] Unwrap FIO domains`, function () {

  let wrapAmt = 1000000000000;
  let // oracle1, oracle2, oracle3,
    user1, newOracle1, newOracle2, newOracle3,
    user2,
    user3;

  let fioNftOwner, fioNftAccts, custodians, factory;
  let OBT_ID, ORACLE_FEE, WRAP_FEE;

  let fioNft = {
    address: '0xpolygonaddress' + randStr(20),
    address2: '0xpolygonaddress2' + randStr(18)
  }

  before(async function () {
    // oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    // oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');

    // test users
    // oracle1 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
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

    // register oracles
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

    //[owner, fioNftAccts, fioNft] = await setupFIONFTcontract(ethers);
    //await registerFioNftOracles(fioNft, fioNftAccts);

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
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user1.domain,
          obt_id: OBT_ID,
          fio_address: user1.address,
        }
      });
      expect(result).to.have.all.keys('block_num', 'transaction_id', 'status');
      expect(result.status).to.equal('OK');
    } catch (err) {
      throw err;
    }
  });

  it(`second oracle: try to unwrap a FIO domain, expect OK`, async function () {
    try {
      const result = await newOracle2.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user1.domain,
          obt_id: OBT_ID,
          fio_address: user1.address,
        }
      });
      expect(result).to.have.all.keys('block_num', 'transaction_id', 'status');
      expect(result.status).to.equal('OK');
    } catch (err) {
      throw err;
    }
  });

  it(`third oracle: try to unwrap a FIO domain, expect OK`, async function () {
    try {
      const result = await newOracle3.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user1.domain,
          obt_id: OBT_ID,
          fio_address: user1.address,
        }
      });
      expect(result).to.have.all.keys('block_num', 'transaction_id', 'status');
      expect(result.status).to.equal('OK');
    } catch (err) {
      throw err;
    }
  });

  // unhappy tests
  it(`(empty fio_domain) try to unwrap a FIO domain`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: "",
          obt_id: OBT_ID,
          fio_address: user2.address,
          actor: newOracle1.account
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].name).to.equal('fio_domain');
      expect(err.json.fields[0].value).to.equal('');
      expect(err.json.fields[0].error).to.equal('FIO domain not found');
    }
  });

  it(`(missing fio_domain) try to unwrap a FIO domain`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          obt_id: OBT_ID,
          fio_address: user2.address,
          actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing unwrapdomain.fio_domain (type=string)');
    }
  });

  it(`(invalid fio_domain) try to unwrap a FIO domain`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: "!invalid@$",
          obt_id: OBT_ID,
          fio_address: user2.address,
          actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].name).to.equal('fio_domain');
      expect(err.json.fields[0].value).to.equal('!invalid@$');
      expect(err.json.fields[0].error).to.equal('Invalid FIO domain');
    }
  });

  it(`(int fio_domain) try to unwrap a FIO domain`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: 1234500000000,
          obt_id: OBT_ID,
          fio_address: user2.address,
          actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].name).to.equal('fio_domain');
      expect(err.json.fields[0].value).to.equal('1234500000000');
      expect(err.json.fields[0].error).to.equal('FIO domain not found');
    }
  });

  it(`(negative fio_domain) try to unwrap a FIO domain`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: -1234500000000,
          obt_id: OBT_ID,
          fio_address: user2.address,
          actor: newOracle1.account
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].name).to.equal('fio_domain');
      expect(err.json.fields[0].value).to.equal('-1234500000000');
      expect(err.json.fields[0].error).to.equal('FIO domain not found');
    }
  });

  it(`(empty obt_id) try to unwrap a FIO domain`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user2.domain,
          obt_id: "",
          fio_address: user2.address,
          actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.fields[0].name).to.equal('obt_id');
      expect(err.json.fields[0].value).to.equal('');
      expect(err.json.fields[0].error).to.equal('Invalid obt_id');
    }
  });

  it(`(missing obt_id) try to unwrap a FIO domain`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user2.domain,
          fio_address: user2.address,
          actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing unwrapdomain.obt_id (type=string)');
    }
  });

  // it(`(invalid obt_id) try to unwrap a FIO domain`, async function () {
  //   try {
  //     const result = await newOracle1.sdk.genericAction('pushTransaction', {
  //       action: 'unwrapdomain',
  //       account: 'fio.oracle',
  //       data: {
  //         fio_domain: user2.domain,
  //         obt_id: "!invalid@$",
  //         fio_address: user2.address,
  //         actor: newOracle1.account
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     expect(err.json.fields[0].name).to.equal('fio_domain');
  //     expect(err.json.fields[0].value).to.equal(user1.domain);
  //     expect(err.json.fields[0].error).to.equal('FIO domain not owned by Oracle contract.');//('FIO domain not found');
  //   }
  // });

  // it(`(int obt_id) try to unwrap a FIO domain`, async function () {
  //   try {
  //     const result = await newOracle1.sdk.genericAction('pushTransaction', {
  //       action: 'unwrapdomain',
  //       account: 'fio.oracle',
  //       data: {
  //         fio_domain: user2.domain,
  //         obt_id: 1234500000000,
  //         fio_address: user2.address,
  //         actor: newOracle1.account
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     expect(err.json.fields[0].name).to.equal('fio_domain');
  //     expect(err.json.fields[0].value).to.equal(user1.domain);
  //     expect(err.json.fields[0].error).to.equal('FIO domain not owned by Oracle contract.');//('FIO domain not found');
  //   }
  // });

  // it(`(negative obt_id) try to unwrap a FIO domain`, async function () {
  //   try {
  //     const result = await newOracle1.sdk.genericAction('pushTransaction', {
  //       action: 'unwrapdomain',
  //       account: 'fio.oracle',
  //       data: {
  //         fio_domain: user2.domain,
  //         obt_id: -1234500000000,
  //         fio_address: user2.address,
  //         actor: newOracle1.account
  //       }
  //     });
  //     expect(result.status).to.not.equal('OK');
  //   } catch (err) {
  //     expect(err.json.fields[0].name).to.equal('fio_domain');
  //     expect(err.json.fields[0].value).to.equal(user1.domain);
  //     expect(err.json.fields[0].error).to.equal('FIO domain not owned by Oracle contract.');//('FIO domain not found');
  //   }
  // });

  it(`wrap another domain`, async function () {
    let domain3 = user3.domain;
    try {
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: domain3,
          chain_code: "ETH",
          public_address: fioNft.address2,
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
      console.log('Error: ', err);
      throw err;
    }
  });

  it(`(empty fio_address) try to unwrap a FIO domain`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user3.domain,
          obt_id: OBT_ID,
          fio_address: "",
          actor: newOracle1.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.message).to.equal('FIO Address not found');
    }
  });

  it(`(missing fio_address) try to unwrap a FIO domain`, async function () {
    try {
      const result = await newOracle2.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user3.domain,
          obt_id: OBT_ID,
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('missing unwrapdomain.fio_address (type=string)');
    }
  });

  it(`(invalid fio_address) try to unwrap a FIO domain`, async function () {
    try {
      const result = await newOracle3.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user3.domain,
          obt_id: OBT_ID,
          fio_address: "!invalid@$",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.message).to.equal('FIO Address not found');
    }
  });

  it(`(int fio_address) try to unwrap a FIO domain`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user3.domain,
          obt_id: OBT_ID,
          fio_address: 1234500000000,
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.message).to.equal('FIO Address not found');
    }
  });

  it(`(negative fio_address) try to unwrap a FIO domain`, async function () {
    try {
      const result = await newOracle2.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user3.domain,
          obt_id: OBT_ID,
          fio_address: -1234500000000,
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.message).to.equal('FIO Address not found');
    }
  });

  it(`(invalid actor) try to unwrap a FIO domain`, async function () {
    try {
      const result = await newOracle3.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user3.domain,
          obt_id: OBT_ID,
          fio_address: user3.address,
          actor: "!invalid@$"
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.error.details[0].message).to.equal('missing authority of .invalid');
    }
  });

  it(`(int actor) try to unwrap a FIO domain`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user1.domain,
          obt_id: OBT_ID,
          fio_address: user1.address,
          actor: 1234500000000
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });

  it(`(negative actor) try to unwrap a FIO domain`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user1.domain,
          obt_id: OBT_ID,
          fio_address: user1.address,
          actor: -12345
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });
});

describe(`C1. PROBLEM TESTS (unwrapdomains)`, function () {
  let wrapAmt = 1000000000000;
  let // oracle1, oracle2, oracle3,
    user1, newOracle1, newOracle2, newOracle3, newOracle4;

  let fioNftOwner, fioNftAccts, custodians, factory;
  let OBT_ID, ORACLE_FEE, WRAP_FEE;

  let fioNft = {
    address: '0xpolygonaddress' + randStr(20)
  }

  before(async function () {
    // oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    // oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');

    // test users
    // oracle1 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    newOracle1 = await newUser(faucet);
    newOracle2 = await newUser(faucet);
    newOracle3 = await newUser(faucet);

    // register new oracles as bps
    await registerNewBp(newOracle1);
    await registerNewBp(newOracle2);
    await registerNewBp(newOracle3);

    // register oracles
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

    //[owner, fioNftAccts, fioNft] = await setupFIONFTcontract(ethers);
    //await registerFioNftOracles(fioNft, fioNftAccts);

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

  it.skip(`(Not a bug: We are not currently validating ETH addresses. It accepts any string.) (invalid obt_id) try to unwrap a FIO domain`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user2.domain,
          obt_id: "!invalid@$",
          fio_address: user2.address,
          actor: newOracle1.account
        }
      });
      //console.log('Result: ', result);
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      //console.log('Error: ', err.json.fields[0]);
      expect(err.json.fields[0].name).to.equal('fio_domain');
      expect(err.json.fields[0].value).to.equal(user1.domain);
      expect(err.json.fields[0].error).to.equal('FIO domain not owned by Oracle contract.');//('FIO domain not found');
    }
  });

  /*
  // Talked with casey, integers are converted to strings for the obt_id so only string validation is done. Not a bug.

  it(`(BUG BD-3879) (int obt_id) try to unwrap a FIO domain`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user2.domain,
          obt_id: 1234500000000,
          fio_address: user2.address,
          actor: newOracle1.account
        }
      });
      //console.log('Result: ', result);
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      //console.log('Error: ', err.json.fields[0]);
      expect(err.json.fields[0].name).to.equal('fio_domain');
      expect(err.json.fields[0].value).to.equal(user1.domain);
      expect(err.json.fields[0].error).to.equal('FIO domain not owned by Oracle contract.');//('FIO domain not found');
    }
  });

  it(`(BUG BD-3879) (negative obt_id) try to unwrap a FIO domain`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user2.domain,
          obt_id: -1234500000000,
          fio_address: user2.address,
          actor: newOracle1.account
        }
      });
      //console.log('Result: ', result);
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      //console.log('Error: ', err.json.fields[0]);
      expect(err.json.fields[0].name).to.equal('fio_domain');
      expect(err.json.fields[0].value).to.equal(user1.domain);
      expect(err.json.fields[0].error).to.equal('FIO domain not owned by Oracle contract.');//('FIO domain not found');
    }
  });
  */
});

describe(`D. setoraclefees and simple wrap - confirm ram bump on wrap and validate fee distribution`, function () {
  let user1, newOracle1, oracle1Balance, oracle2Balance, oracle3Balance, user1Balance, newOracle2, newOracle3, wrapFee, userRam;
  const chainCode = "MATIC";
  const ethAddress = '0xblahblahblah' + randStr(20);
  const obtID = '0xobtidetcetcetc' + randStr(20);
  const oracle1DomainFee = 2000000000;
  const oracle2DomainFee = 5000000000;
  const oracle3DomainFee = 9000000000;
  const oracleFeeTotal = oracle2DomainFee * 3;
  const tokenFee = 1000000000;

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

  //
  //Begin wrapdomain
  //

  it(`newOracle1 sets wraptokens fee`, async function () {
    try {
      await setTestOracleFees(newOracle1, oracle1DomainFee, tokenFee);
    } catch (err) {
      throw err;
    }
  });

  it(`(Bug BD-3874) (Failure) Try to wrap FIO domain, expect: "All registered oracles have not set fees"`, async function () {
    let postWrapBalDiff, postWrapAvailDiff;
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user1.domain,
          chain_code: chainCode,
          public_address: ethAddress,
          max_oracle_fee: config.maxOracleFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      //console.log('Result: ', result);
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      //console.log('Error: ', err.json.error);
      expect(err.json.error.details[0].message).to.equal('All registered oracles have not set fees')
    }
  });

  it(`newOracle2 sets wrapdomain fee`, async function () {
    try {
      await setTestOracleFees(newOracle2, oracle2DomainFee, tokenFee);
    } catch (err) {
      throw err;
    }
  });

  it(`newOracle3 sets wraptokens fee`, async function () {
    try {
      await setTestOracleFees(newOracle3, oracle3DomainFee, tokenFee);
    } catch (err) {
      throw err;
    }
  });

  it('Confirm oracle fee is median * 3`', async function () {
    try {
      result = await callFioApi('get_oracle_fees', {});
      //console.log('Result: ', result);
      expect(result.oracle_fees[0].fee_name).to.equal('wrap_fio_domain');
      expect(result.oracle_fees[0].fee_amount).to.equal(oracleFeeTotal);
    } catch (err) {
      console.log('Error: ', err);
      throw err;
    }
  });

  it(`get wrapdomain fee`, async function () {
    let result = await callFioApi('get_fee', {
      end_point: "wrap_fio_domain",
      fio_address: newOracle1.address //"vote1@dapixdev"
    });
    wrapFee = result.fee;
  });

  it(`Get original balances for user1 and oracles`, async () => {
    try {
      let result;
      result = await user1.sdk.genericAction('getFioBalance', { fioPublicKey: user1.publicKey });
      user1Balance = result.balance;
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

  it(`get user1 RAM before wrap`, async function () {
    userRam = await getRamForUser(user1);
  });

  it(`(Success) Try to wrap FIO tokens after all oracles have set fees. Expect OK`, async function () {
    try {
      const result = await user1.sdk.genericAction('pushTransaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user1.domain,
          chain_code: chainCode,
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

  it(`get user1 RAM after wrap. Confirm RAM bump.`, async function () {
    const userRamPrev = userRam;
    userRam = await getRamForUser(user1);
    expect(userRam).to.equal(userRamPrev + config.RAM.WRAPDOMAINRAM);  // wraptoken and wrapdomain are the same RAM
  });

  it(`Get balances for user1 and oracles after wrap: Confirm fee distribution`, async () => {
    try {
      const user1BalancePrev = user1Balance;
      const oracle1BalancePrev = oracle1Balance;
      const oracle2BalancePrev = oracle2Balance;
      const oracle3BalancePrev = oracle3Balance;
      let result;
      result = await user1.sdk.genericAction('getFioBalance', { fioPublicKey: user1.publicKey });
      user1Balance = result.balance;
      result = await newOracle1.sdk.genericAction('getFioBalance', { fioPublicKey: newOracle1.publicKey });
      oracle1Balance = result.balance;
      result = await newOracle2.sdk.genericAction('getFioBalance', { fioPublicKey: newOracle2.publicKey });
      oracle2Balance = result.balance;
      result = await newOracle3.sdk.genericAction('getFioBalance', { fioPublicKey: newOracle3.publicKey });
      oracle3Balance = result.balance;
      expect(user1Balance).to.equal(user1BalancePrev - wrapFee - oracleFeeTotal);
      expect(oracle1Balance).to.equal(oracle1BalancePrev + oracleFeeTotal / 3);
      expect(oracle2Balance).to.equal(oracle2BalancePrev + oracleFeeTotal / 3);
      expect(oracle3Balance).to.equal(oracle3BalancePrev + oracleFeeTotal / 3);
      //console.log('user1 fio balance', result)
    } catch (err) {
        //console.log('Error', err)
        expect(err).to.equal(null)
    }
  });

  //
  // Begin unwrapdomain
  //

  it(`(Success) newOracle1 calls unwrapdomain after all oracles have set fees. Expect OK`, async function () {
    try {
      const result = await newOracle1.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user1.domain,
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

  it(`(Failure) get_fio_domains for user1 after 1 oracle has called unwrapdomain. Expect: `, async () => {
    try {
      const json = {
        "fio_public_key": user1.publicKey
      }
      result = await callFioApi("get_fio_domains", json);
      console.log('Result: ', result);
      expect(result.fio_domains.length).to.equal(0)
    } catch (err) {
      //console.log('Error', err)
      expect(err.error.message).to.equal(config.error.noFioDomains);
      expect(err.statusCode).to.equal(404);
    }
  })

  it(`(Success) newOracle2 calls unwrapdomain. Expect OK`, async function () {
    try {
      const result = await newOracle2.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user1.domain,
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

  it(`(Failure) get_fio_domains for user1 after 2 oracles has called unwrapdomain: Confirm NO domain transfer`, async () => {
    try {
      const json = {
        "fio_public_key": user1.publicKey
      }
      result = await callFioApi("get_fio_domains", json);
      console.log('Result: ', result);
      expect(result.fio_domains.length).to.equal(0)
    } catch (err) {
      //console.log('Error', err)
      expect(err.error.message).to.equal(config.error.noFioDomains);
      expect(err.statusCode).to.equal(404);
    }
  })

  it(`(Success) newOracle3 calls unwrapdomain. Expect OK`, async function () {
    try {
      const result = await newOracle3.sdk.genericAction('pushTransaction', {
        action: 'unwrapdomain',
        account: 'fio.oracle',
        data: {
          fio_domain: user1.domain,
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

  it(`get_fio_domains for user1 after all 3 oracles have called unwrap: Confirm domain was transferred`, async () => {
    try {
      const json = {
        "fio_public_key": user1.publicKey
      }
      result = await callFioApi("get_fio_domains", json);
      //console.log('Result: ', result);
      expect(result.fio_domains[0].fio_domain).to.equal(user1.domain);
      expect(result.fio_domains.length).to.equal(1);
    } catch (err) {
      console.log('Error', err)
      expect(err).to.equal(null)
    }
  })

});
