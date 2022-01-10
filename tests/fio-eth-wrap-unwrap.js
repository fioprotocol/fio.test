const hre = require("hardhat");
const ethers = hre.ethers;
require("@nomiclabs/hardhat-ethers");
// require("@nomiclabs/hardhat-ganache");
require("mocha");
const { expect } = require("chai");
const {FIOSDK } = require('@fioprotocol/fiosdk');

const config = require('../config.js');
const {newUser, fetchJson, timeout, callFioApi, createKeypair, getAccountFromKey, existingUser} = require('../utils.js');

const INIT_SUPPLY = 0;
let faucet;

// function wait (ms){
//     let start = new Date().getTime();
//     let end = start;
//     while(end < start + ms) {
//         end = new Date().getTime();
//     }
// }

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
});

// describe(`************************** fio-eth-wrap-unwrap.js ************************** \n   WFIO AND FIONFT QUICK TESTS`, () => {});

describe.skip(`B. (unhappy) Try to wrap FIO tokens, invalid input`, () => {
  let user1, fiosdk, keys, accountnm;

  let fioAccount;
  let fioBalance;
  let fioTransaction;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;
  let transactionId;

  // beforeEach(async () => {
  //   fioAccount = await newUser(faucet);
  //   fioBalance = await fioAccount.sdk.genericAction('getFioBalance', { });
  //   fioTransaction = await faucet.genericAction('transferTokens', {
  //     payeeFioPublicKey: fioAccount.publicKey,
  //     amount: 100,
  //     maxFee: config.api.transfer_tokens_pub_key.fee,
  //     technologyProviderId: ''
  //   })
  //   transactionId = fioTransaction.transaction_id;
  // });

  before(async () => {
    fioAccount = await newUser(faucet);
    fioBalance = await fioAccount.sdk.genericAction('getFioBalance', { });
    fioTransaction = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: fioAccount.publicKey,
      amount: 100,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    });
    transactionId = fioTransaction.transaction_id;
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('WFIO', owner);
    wfio = await factory.deploy(INIT_SUPPLY, custodians);
    await wfio.deployTransaction.wait();
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
  });

  before(async () => {
    user1 = await newUser(faucet);
    keys = await createKeypair();
    accountnm =  await getAccountFromKey(keys.publicKey);
    fiosdk = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson);
  });

  it(`(invalid amount) try to 100 wrap tokens, expect Error 400: Invalid Amount`, async function () {
    try {
      const result = await fiosdk.genericAction();
    } catch (err) {

    }
  });
  it(`(missing amount) try to 100 wrap tokens, expect Error 400: Invalid Amount`);

  it(`(invalid max_oracle_fee) try to wrap 100 tokens, expect Error 400: Invalid oracle fee value`);
  it(`(missing max_oracle_fee) try to wrap 100 tokens, expect Error 400: Invalid oracle fee value`);

  it(`(max_oracle_fee less than Oracle fee) try to wrap 100 tokens, expect Error 400: Oracle fee exceeds supplied maximum`);
  it(`(invalid max_oracle_fee) try to wrap 100 tokens, expect Error 400: Invalid fee value`);
  it(`(missing max_oracle_fee) try to wrap 100 tokens, expect Error 400: Invalid fee value`);
  it(`(max_fee less than fee) try to wrap 100 tokens, expect Error 400: fee exceeds supplied maximum`);

  it(`(insufficient balance) try to wrap 100 tokens, expect Error 400: Insufficient balance`);
  it(`(invalid tpid) try to wrap 100 tokens, expect Error 400: TPID must be empty or valid FIO address`);

});


describe(`B. (unhappy) Try to wrap FIO tokens, invalid input`, () => {

  let fioAccount;
  let fioBalance;
  let fioTransaction;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;
  let transactionId;

  let bp1, bp2, bp3;
  let oracle1, oracle2, oracle3;

  let publicEthAddress;

  // beforeEach(async () => {
  //   fioAccount = await newUser(faucet);
  //   fioBalance = await fioAccount.sdk.genericAction('getFioBalance', { });
  //   fioTransaction = await faucet.genericAction('transferTokens', {
  //     payeeFioPublicKey: fioAccount.publicKey,
  //     amount: 100,
  //     maxFee: config.api.transfer_tokens_pub_key.fee,
  //     technologyProviderId: ''
  //   })
  //   transactionId = fioTransaction.transaction_id;
  // });

  before(async () => {
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    fioAccount = await newUser(faucet);
    fioBalance = await fioAccount.sdk.genericAction('getFioBalance', { });
    fioTransaction = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: fioAccount.publicKey,
      amount: 100,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    transactionId = fioTransaction.transaction_id;

    oracle1 = await newUser(faucet);
    oracle2 = await newUser(faucet);
    oracle3 = await newUser(faucet);

    //TODO: For now, comment out the require_auth in fio.oracle.cpp#regoracle so that any BP can be used
    try {
      const result1 = await fioAccount.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: bp1.account,
          actor: oracle1.account
        }
      });
      console.log(result1);

      const result2 = await fioAccount.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: bp2.account,
          actor: oracle1.account
        }
      });
      console.log(result2);

      const result3 = await fioAccount.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: bp3.account,
          actor: oracle1.account
        }
      });
      console.log(result3);


    } catch (err) {
      console.log('failed on oracle 1')
      expect(err.json.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
      // throw err;
    }


    try {
      let oracleRecords = await callFioApi("get_table_rows", {
        json: true,
        code: 'eosio',
        scope: 'eosio',
        table: 'oracles',
        reverse: true
      });
      console.log(oracleRecords);
    } catch (err) {
      throw err;
    }



    try {
      const result1 = await fioAccount.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: bp1.account,
          actor: oracle2.account
        }
      });
      console.log(result1);

      const result2 = await fioAccount.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: bp2.account,
          actor: oracle2.account
        }
      });
      console.log(result2);

      const result3 = await fioAccount.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: bp3.account,
          actor: oracle2.account
        }
      });
      console.log(result3);


    } catch (err) {
      console.log('failed on oracle 2')
      expect(err.json.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
      // throw err;
    }





    try {
      const result1 = await fioAccount.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: bp1.account,
          actor: oracle3.account
        }
      });
      console.log(result1);

      const result2 = await fioAccount.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: bp2.account,
          actor: oracle3.account
        }
      });
      console.log(result2);

      const result3 = await fioAccount.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: bp3.account,
          actor: oracle3.account
        }
      });
      console.log(result3);
    } catch (err) {
      console.log('failed on oracle 3')
      expect(err.json.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
      // throw err;
    }





    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('WFIO', owner);
    wfio = await factory.deploy(INIT_SUPPLY, custodians);
    await wfio.deployTransaction.wait();
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

    // regoracle on the FIO side?
    // await fioAccount
  });

  it(`Wrap 100 wFIO`, async () => {
    let fromStartingBal = await accounts[14].getBalance();
    let toStartingWfioBal = await wfio.balanceOf(accounts[0].address);
    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, transactionId);
    // try {
    let result = await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, transactionId);
    let fromEndingBal = await accounts[14].getBalance();
    let toEndingWfioBal = await wfio.balanceOf(accounts[0].address);
    expect(result.from).to.equal(accounts[14].address);
    expect(result.to).to.equal(wfio.address);
    expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
    expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.true;
    expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(100);
    // } catch (err) {
    //   throw err;
    // }
  });

  it(`Wrap 100 FIO tokens`, async () => {
    try {
      const result = await fioAccount.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: 100000000000,
          chain_code: "ETH",
          public_address: wfio.address,
          max_fee: config.maxFee,
          max_oracle_fee: config.maxFee,
          tpid: "",
          actor: fioAccount.account
        }
      });
      console.log(result);
    } catch (err) {
      console.log(err);
    }
  });

  // it(`Add 3 new oracles and wrap 100 wFIO`, async () => {
  //   // add 3 new oracles
  //   await wfio.connect(accounts[1]).regoracle(accounts[15].address);
  //   await wfio.connect(accounts[2]).regoracle(accounts[15].address);
  //   await wfio.connect(accounts[3]).regoracle(accounts[15].address);
  //   await wfio.connect(accounts[4]).regoracle(accounts[15].address);
  //   await wfio.connect(accounts[5]).regoracle(accounts[15].address);
  //   await wfio.connect(accounts[6]).regoracle(accounts[15].address);
  //   await wfio.connect(accounts[7]).regoracle(accounts[15].address);
  //   await wfio.connect(accounts[1]).regoracle(accounts[16].address);
  //   await wfio.connect(accounts[2]).regoracle(accounts[16].address);
  //   await wfio.connect(accounts[3]).regoracle(accounts[16].address);
  //   await wfio.connect(accounts[4]).regoracle(accounts[16].address);
  //   await wfio.connect(accounts[5]).regoracle(accounts[16].address);
  //   await wfio.connect(accounts[6]).regoracle(accounts[16].address);
  //   await wfio.connect(accounts[7]).regoracle(accounts[16].address);
  //   await wfio.connect(accounts[1]).regoracle(accounts[17].address);
  //   await wfio.connect(accounts[2]).regoracle(accounts[17].address);
  //   await wfio.connect(accounts[3]).regoracle(accounts[17].address);
  //   await wfio.connect(accounts[4]).regoracle(accounts[17].address);
  //   await wfio.connect(accounts[5]).regoracle(accounts[17].address);
  //   await wfio.connect(accounts[6]).regoracle(accounts[17].address);
  //   await wfio.connect(accounts[7]).regoracle(accounts[17].address);
  //
  //   let fromStartingBal = await accounts[17].getBalance();
  //   let toStartingWfioBal = await wfio.balanceOf(accounts[0].address);
  //
  //   await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[15]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[16]).wrap(accounts[0].address, 100, transactionId);
  //   try {
  //     let result = await wfio.connect(accounts[17]).wrap(accounts[0].address, 100, transactionId);
  //     let fromEndingBal = await accounts[17].getBalance();
  //     let toEndingWfioBal = await wfio.balanceOf(accounts[0].address);
  //     expect(result.from).to.equal(accounts[17].address);
  //     expect(result.to).to.equal(wfio.address);
  //     expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
  //     expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.true;
  //     expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(100)
  //   } catch (err) {
  //     throw err;
  //   }
  // });

  // it(`Add 10 new oracles and wrap 100 wFIO`, async () => {
  //
  //   // register 10 more new oracles
  //   await wfio.connect(accounts[1]).regoracle(accounts[18].address);
  //   await wfio.connect(accounts[2]).regoracle(accounts[18].address);
  //   await wfio.connect(accounts[3]).regoracle(accounts[18].address);
  //   await wfio.connect(accounts[4]).regoracle(accounts[18].address);
  //   await wfio.connect(accounts[5]).regoracle(accounts[18].address);
  //   await wfio.connect(accounts[6]).regoracle(accounts[18].address);
  //   await wfio.connect(accounts[7]).regoracle(accounts[18].address);
  //   await wfio.connect(accounts[1]).regoracle(accounts[19].address);
  //   await wfio.connect(accounts[2]).regoracle(accounts[19].address);
  //   await wfio.connect(accounts[3]).regoracle(accounts[19].address);
  //   await wfio.connect(accounts[4]).regoracle(accounts[19].address);
  //   await wfio.connect(accounts[5]).regoracle(accounts[19].address);
  //   await wfio.connect(accounts[6]).regoracle(accounts[19].address);
  //   await wfio.connect(accounts[7]).regoracle(accounts[19].address);
  //   await wfio.connect(accounts[1]).regoracle(accounts[20].address);
  //   await wfio.connect(accounts[2]).regoracle(accounts[20].address);
  //   await wfio.connect(accounts[3]).regoracle(accounts[20].address);
  //   await wfio.connect(accounts[4]).regoracle(accounts[20].address);
  //   await wfio.connect(accounts[5]).regoracle(accounts[20].address);
  //   await wfio.connect(accounts[6]).regoracle(accounts[20].address);
  //   await wfio.connect(accounts[7]).regoracle(accounts[20].address);
  //   await wfio.connect(accounts[1]).regoracle(accounts[21].address);
  //   await wfio.connect(accounts[2]).regoracle(accounts[21].address);
  //   await wfio.connect(accounts[3]).regoracle(accounts[21].address);
  //   await wfio.connect(accounts[4]).regoracle(accounts[21].address);
  //   await wfio.connect(accounts[5]).regoracle(accounts[21].address);
  //   await wfio.connect(accounts[6]).regoracle(accounts[21].address);
  //   await wfio.connect(accounts[7]).regoracle(accounts[21].address);
  //   await wfio.connect(accounts[1]).regoracle(accounts[22].address);
  //   await wfio.connect(accounts[2]).regoracle(accounts[22].address);
  //   await wfio.connect(accounts[3]).regoracle(accounts[22].address);
  //   await wfio.connect(accounts[4]).regoracle(accounts[22].address);
  //   await wfio.connect(accounts[5]).regoracle(accounts[22].address);
  //   await wfio.connect(accounts[6]).regoracle(accounts[22].address);
  //   await wfio.connect(accounts[7]).regoracle(accounts[22].address);
  //   await wfio.connect(accounts[1]).regoracle(accounts[23].address);
  //   await wfio.connect(accounts[2]).regoracle(accounts[23].address);
  //   await wfio.connect(accounts[3]).regoracle(accounts[23].address);
  //   await wfio.connect(accounts[4]).regoracle(accounts[23].address);
  //   await wfio.connect(accounts[5]).regoracle(accounts[23].address);
  //   await wfio.connect(accounts[6]).regoracle(accounts[23].address);
  //   await wfio.connect(accounts[7]).regoracle(accounts[23].address);
  //   await wfio.connect(accounts[1]).regoracle(accounts[24].address);
  //   await wfio.connect(accounts[2]).regoracle(accounts[24].address);
  //   await wfio.connect(accounts[3]).regoracle(accounts[24].address);
  //   await wfio.connect(accounts[4]).regoracle(accounts[24].address);
  //   await wfio.connect(accounts[5]).regoracle(accounts[24].address);
  //   await wfio.connect(accounts[6]).regoracle(accounts[24].address);
  //   await wfio.connect(accounts[7]).regoracle(accounts[24].address);
  //   await wfio.connect(accounts[1]).regoracle(accounts[25].address);
  //   await wfio.connect(accounts[2]).regoracle(accounts[25].address);
  //   await wfio.connect(accounts[3]).regoracle(accounts[25].address);
  //   await wfio.connect(accounts[4]).regoracle(accounts[25].address);
  //   await wfio.connect(accounts[5]).regoracle(accounts[25].address);
  //   await wfio.connect(accounts[6]).regoracle(accounts[25].address);
  //   await wfio.connect(accounts[7]).regoracle(accounts[25].address);
  //   await wfio.connect(accounts[1]).regoracle(accounts[26].address);
  //   await wfio.connect(accounts[2]).regoracle(accounts[26].address);
  //   await wfio.connect(accounts[3]).regoracle(accounts[26].address);
  //   await wfio.connect(accounts[4]).regoracle(accounts[26].address);
  //   await wfio.connect(accounts[5]).regoracle(accounts[26].address);
  //   await wfio.connect(accounts[6]).regoracle(accounts[26].address);
  //   await wfio.connect(accounts[7]).regoracle(accounts[26].address);
  //   await wfio.connect(accounts[1]).regoracle(accounts[27].address);
  //   await wfio.connect(accounts[2]).regoracle(accounts[27].address);
  //   await wfio.connect(accounts[3]).regoracle(accounts[27].address);
  //   await wfio.connect(accounts[4]).regoracle(accounts[27].address);
  //   await wfio.connect(accounts[5]).regoracle(accounts[27].address);
  //   await wfio.connect(accounts[6]).regoracle(accounts[27].address);
  //   await wfio.connect(accounts[7]).regoracle(accounts[27].address);
  //
  //   let fromStartingBal = await accounts[27].getBalance();
  //   let toStartingWfioBal = await wfio.balanceOf(accounts[0].address);
  //
  //   await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[15]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[16]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[17]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[18]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[19]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[20]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[21]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[22]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[23]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[24]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[25]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[26]).wrap(accounts[0].address, 100, transactionId);
  //
  //   try {
  //     let result = await wfio.connect(accounts[27]).wrap(accounts[0].address, 100, transactionId);
  //     let fromEndingBal = await accounts[27].getBalance();
  //     let toEndingWfioBal = await wfio.balanceOf(accounts[0].address);
  //     expect(result.from).to.equal(accounts[27].address);
  //     expect(result.to).to.equal(wfio.address);
  //     expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
  //     expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.true;
  //     expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(100)
  //   } catch (err) {
  //     throw err;
  //   }
  // });

  // unhappy paths
  // it(`invalid address, expect Error 400`, async () => {
  //   await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, transactionId);
  //   try {
  //     let result = await wfio.connect(accounts[14]).wrap("donkey", 100, transactionId);
  //   } catch (err) {
  //     expect(err).to.have.property('reason').which.is.a('string');
  //     expect(err).to.have.property('code').which.is.a('string');
  //     expect(err).to.have.property('argument').which.is.a('string');
  //     expect(err).to.have.property('value').which.is.a('string');
  //     expect(err).to.have.property('stack').which.is.a('string');
  //     expect(err).to.have.property('message').which.is.a('string');
  //     expect(err.reason).to.equal('resolver or addr is not configured for ENS name');
  //   }
  // });
  //
  // it(`missing address, expect Error 400`, async () => {
  //   await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, transactionId);
  //   try {
  //     let result = await wfio.connect(accounts[14]).wrap(100, transactionId);
  //   } catch (err) {
  //     expect(err).to.have.property('reason').which.is.a('string');
  //     expect(err).to.have.property('code').which.is.a('string');
  //     expect(err).to.have.property('count').which.is.a('number');
  //     expect(err).to.have.property('expectedCount').which.is.a('number');
  //     expect(err).to.have.property('stack').which.is.a('string');
  //     expect(err).to.have.property('message').which.is.a('string');
  //     expect(err.reason).to.equal('missing argument: passed to contract');
  //   }
  // });
  //
  // it(`invalid tx amount, expect Error 400`, async () => {
  //   try {
  //     let result = await wfio.wrap(custodians[0], "donkey", transactionId);
  //     expect(result.status).to.equal('OK');
  //   } catch (err) {
  //     expect(err).to.have.property('reason').which.is.a('string');
  //     expect(err).to.have.property('code').which.is.a('string');
  //     expect(err).to.have.property('argument').which.is.a('string');
  //     expect(err).to.have.property('value').which.is.a('string');
  //     expect(err).to.have.property('stack').which.is.a('string');
  //     expect(err).to.have.property('message').which.is.a('string');
  //     expect(err.reason).to.equal('invalid BigNumber string');
  //   }
  // });
  //
  // it(`missing tx amount, expect Error 400`, async () => {
  //   try {
  //     let result = await wfio.wrap(custodians[0], transactionId);
  //     expect(result.status).to.equal('OK');
  //   } catch (err) {
  //     expect(err).to.have.property('reason').which.is.a('string');
  //     expect(err).to.have.property('code').which.is.a('string');
  //     expect(err).to.have.property('count').which.is.a('number');
  //     expect(err).to.have.property('expectedCount').which.is.a('number');
  //     expect(err).to.have.property('stack').which.is.a('string');
  //     expect(err).to.have.property('message').which.is.a('string');
  //     expect(err.reason).to.equal('missing argument: passed to contract');
  //   }
  // });
  //
  // it(`invalid obtid, expect Error 400`, async () => {
  //   await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, "donkey");
  //   await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, "donkey");
  //   try {
  //     let result = await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, 1); // TODO: Should this third arg take any arbitrary string
  //     expect(result.status).to.equal('OK');
  //   } catch (err) {
  //     expect(err.message).to.contain('Invalid obtid');
  //   }
  // });
  //
  // it(`missing obtid, expect Error 400`, async () => {
  //   try {
  //     let result = await wfio.wrap(custodians[0], 1000);
  //     expect(result.status).to.equal('OK');
  //   } catch (err) {
  //     expect(err).to.have.property('reason').which.is.a('string');
  //     expect(err).to.have.property('code').which.is.a('string');
  //     expect(err).to.have.property('count').which.is.a('number');
  //     expect(err).to.have.property('expectedCount').which.is.a('number');
  //     expect(err).to.have.property('stack').which.is.a('string');
  //     expect(err).to.have.property('message').which.is.a('string');
  //     expect(err.reason).to.equal('missing argument: passed to contract');
  //   }
  // });
  //
  // it(`no authority, expect Error 403`, async () => {
  //   try {
  //     let result = await wfio.wrap(accounts[13].address, 100, transactionId);
  //     expect(result.status).to.equal('OK');
  //   } catch (err) {
  //     expect(err).to.have.property('stackTrace').which.is.a('array');
  //     expect(err).to.have.property('stack').which.is.a('string');
  //     expect(err).to.have.property('message').which.is.a('string');
  //     expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Only a wFIO oracle may call this function.\'');
  //   }
  // });
  //
  // it(`recipient account does not match prior approvals`, async () => {
  //
  //   let toStartingWfioBal = await wfio.balanceOf(accounts[0].address);
  //
  //   await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[15]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[16]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[17]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[18]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[19]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[20]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[21]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[22]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[23]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[24]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[25]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[26]).wrap(accounts[0].address, 100, transactionId);
  //
  //   try {
  //     let result = await wfio.connect(accounts[27]).wrap(accounts[1].address, 100, transactionId);
  //   } catch (err) {
  //     expect(err).to.have.property('stackTrace').which.is.a('array');
  //     expect(err).to.have.property('transactionHash').which.is.a('string');
  //     expect(err).to.have.property('stack').which.is.a('string');
  //     expect(err).to.have.property('message').which.is.a('string');
  //     expect(err.message).to.contain('account does not match prior approvals');
  //     let toEndingWfioBal = await wfio.balanceOf(accounts[0].address);
  //     expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.false;
  //     expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(0)
  //   }
  // });
  //
  // it(`amount does not match prior approvals`, async () => {
  //
  //   let toStartingWfioBal = await wfio.balanceOf(accounts[0].address);
  //
  //   await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[15]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[16]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[17]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[18]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[19]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[20]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[21]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[22]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[23]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[24]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[25]).wrap(accounts[0].address, 100, transactionId);
  //   await wfio.connect(accounts[26]).wrap(accounts[0].address, 100, transactionId);
  //
  //   try {
  //     let result = await wfio.connect(accounts[27]).wrap(accounts[0].address, 2500, transactionId);
  //   } catch (err) {
  //     expect(err).to.have.property('stackTrace').which.is.a('array');
  //     expect(err).to.have.property('transactionHash').which.is.a('string');
  //     expect(err).to.have.property('stack').which.is.a('string');
  //     expect(err).to.have.property('message').which.is.a('string');
  //     expect(err.message).to.contain('amount does not match prior approvals');
  //     let fromEndingBal = await accounts[27].getBalance();
  //     let toEndingWfioBal = await wfio.balanceOf(accounts[0].address);
  //     expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.false;
  //     expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(0)
  //   }
  // });
});
