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

function wait (ms){
  let start = new Date().getTime();
  let end = start;
  while(end < start + ms) {
      end = new Date().getTime();
  }
}

const eosio = {
  account: 'eosio',
  publicKey: 'FIO7isxEua78KPVbGzKemH4nj2bWE52gqj8Hkac3tc7jKNvpfWzYS',
  privateKey: '5KBX1dwHME4VyuUss2sYM25D5ZTDvyYrbEz37UJqwAVAsR4tGuY'
}

before(async function () {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
});

describe(`************************** fio-eth-wrap-unwrap.js ************************** \n   Wrap and unwrap some FIO tokens`, function () {

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

  before(async function () {
    bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    bp2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    bp3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    fioAccount = await newUser(faucet);
    fioBalance = await fioAccount.sdk.genericAction('getFioBalance', { });
    fioTransaction = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: fioAccount.publicKey,
      amount: 100000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    transactionId = fioTransaction.transaction_id;

    oracle1 = await newUser(faucet);
    oracle2 = await newUser(faucet);
    oracle3 = await newUser(faucet);

    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('WFIO', owner);
    wfio = await factory.deploy(INIT_SUPPLY, custodians);
    await wfio.deployTransaction.wait();
  });

  it("Should deploy the wFIO token successfully", async function() {
    // factory = await ethers.getContractFactory('WFIO', owner);
    // wfio = await factory.deploy(INIT_SUPPLY, custodians);
    // await wfio.deployed();
    expect(wfio).to.be.a('object');
    expect(wfio).to.have.property('address').which.is.a('string');
    expect(wfio).to.have.property('functions').which.is.a('object');
    expect(wfio.signer.address).to.equal(owner.address);
  });

  it(`get oracle fees, expect Error: no registered oracles`, async function () {
    try {
      const result = await callFioApi('get_oracle_fees', {});
      console.log(result);
    } catch (err) {
      expect(err.statusCode).to.equal(404);
      expect(err.error.message).to.equal('No Registered Oracles');
    }
  });

  /**
   *
   * TODO: For now, comment out the require_auth in fio.oracle.cpp#regoracle so that any BP can be used
   *
   */
  it(`register oracles on the FIO chain`, async function () {
    //oracle 1
    try {
      const result = await bp1.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        data: {
          oracle_actor: bp1.account,
          actor: bp1.account
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('code', 'message', 'error');
      expect(err.json.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
      console.log('oracle 1 already registered');
    }
    try {
      const result = await bp2.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        data: {
          oracle_actor: bp2.account,
          actor: bp2.account
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('code', 'message', 'error');
      expect(err.json.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
      console.log('oracle 1 already registered');
    }
    try {
      const result = await bp3.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        data: {
          oracle_actor: bp3.account,
          actor: bp3.account
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
      expect(err.json).to.have.all.keys('code', 'message', 'error');
      expect(err.json.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
      console.log('oracle 1 already registered');
    }



    //oracle 2
    // try {
    //   const result = await bp1.sdk.genericAction('pushTransaction', {
    //     action: 'regoracle',
    //     account: 'fio.oracle',
    //     data :{
    //       oracle_actor: bp1.account,
    //       actor: oracle2.account
    //     }
    //   });
    //   expect(result.status).to.equal('OK');
    // } catch (err) {
    //   expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
    //   expect(err.json).to.have.all.keys('code', 'message', 'error');
    //   expect(err.json.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
    //   console.log('oracle 2 already registered');
    // }
    // try {
    //   const result = await bp2.sdk.genericAction('pushTransaction', {
    //     action: 'regoracle',
    //     account: 'fio.oracle',
    //     data :{
    //       oracle_actor: bp2.account,
    //       actor: oracle2.account
    //     }
    //   });
    //   expect(result.status).to.equal('OK');
    // } catch (err) {
    //   expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
    //   expect(err.json).to.have.all.keys('code', 'message', 'error');
    //   expect(err.json.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
    //   console.log('oracle 2 already registered');
    // }
    // try {
    //   const result = await bp3.sdk.genericAction('pushTransaction', {
    //     action: 'regoracle',
    //     account: 'fio.oracle',
    //     data :{
    //       oracle_actor: bp3.account,
    //       actor: oracle2.account
    //     }
    //   });
    //   expect(result.status).to.equal('OK');
    // } catch (err) {
    //   expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
    //   expect(err.json).to.have.all.keys('code', 'message', 'error');
    //   expect(err.json.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
    //   console.log('oracle 2 already registered');
    // }



    //oracle3
    // try {
    //   const result = await bp1.sdk.genericAction('pushTransaction', {
    //     action: 'regoracle',
    //     account: 'fio.oracle',
    //     data :{
    //       oracle_actor: bp1.account,
    //       actor: oracle3.account
    //     }
    //   });
    //   expect(result.status).to.equal('OK');
    // } catch (err) {
    //   expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
    //   expect(err.json).to.have.all.keys('code', 'message', 'error');
    //   expect(err.json.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
    //   console.log('oracle 3 already registered');
    // }
    // try {
    //   const result = await bp2.sdk.genericAction('pushTransaction', {
    //     action: 'regoracle',
    //     account: 'fio.oracle',
    //     data :{
    //       oracle_actor: bp2.account,
    //       actor: oracle3.account
    //     }
    //   });
    //   expect(result.status).to.equal('OK');
    // } catch (err) {
    //   expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
    //   expect(err.json).to.have.all.keys('code', 'message', 'error');
    //   expect(err.json.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
    //   console.log('oracle 3 already registered');
    // }
    // try {
    //   const result = await bp3.sdk.genericAction('pushTransaction', {
    //     action: 'regoracle',
    //     account: 'fio.oracle',
    //     data :{
    //       oracle_actor: bp3.account,
    //       actor: oracle3.account
    //     }
    //   });
    //   expect(result.status).to.equal('OK');
    // } catch (err) {
    //   expect(err).to.have.all.keys('json', 'errorCode', 'requestParams');
    //   expect(err.json).to.have.all.keys('code', 'message', 'error');
    //   expect(err.json.error.what).to.equal('could not insert object, most likely a uniqueness constraint was violated');
    //   console.log('oracle 3 already registered');
    // }
  });

  it(`wait a few arbitrary seconds`, async function () {
    await timeout(3000);
  });

  it(`oracle1 set its oracle fees`);  //TODO: Try setting fees BEFORE hitting the endpoint
  it(`oracle2 set its oracle fees`);
  it(`oracle3 set its oracle fees`);

  it(`verify RAM of signer has increased`);

  it(`get oracle fees, expect 3 registered oracles and fees`, async function () {
    try {
      const result = await callFioApi('get_oracle_fees', {});
      console.log(result);
    } catch (err) {
      expect(err.statusCode).to.equal(404);
      expect(err.error.message).to.equal('No Registered Oracles');
    }
  });

  it(`register oracles on the ETH chain`, async function () {
    //register 3 oracles for testing
    //oracle 1
    await wfio.connect(accounts[1]).regoracle(accounts[12].address);
    await wfio.connect(accounts[2]).regoracle(accounts[12].address);
    await wfio.connect(accounts[3]).regoracle(accounts[12].address);
    await wfio.connect(accounts[4]).regoracle(accounts[12].address);
    await wfio.connect(accounts[5]).regoracle(accounts[12].address);
    await wfio.connect(accounts[6]).regoracle(accounts[12].address);
    await wfio.connect(accounts[7]).regoracle(accounts[12].address);

    //oracle 2
    await wfio.connect(accounts[1]).regoracle(accounts[13].address);
    await wfio.connect(accounts[2]).regoracle(accounts[13].address);
    await wfio.connect(accounts[3]).regoracle(accounts[13].address);
    await wfio.connect(accounts[4]).regoracle(accounts[13].address);
    await wfio.connect(accounts[5]).regoracle(accounts[13].address);
    await wfio.connect(accounts[6]).regoracle(accounts[13].address);
    await wfio.connect(accounts[7]).regoracle(accounts[13].address);

    //oracle 3
    await wfio.connect(accounts[1]).regoracle(accounts[14].address);
    await wfio.connect(accounts[2]).regoracle(accounts[14].address);
    await wfio.connect(accounts[3]).regoracle(accounts[14].address);
    await wfio.connect(accounts[4]).regoracle(accounts[14].address);
    await wfio.connect(accounts[5]).regoracle(accounts[14].address);
    await wfio.connect(accounts[6]).regoracle(accounts[14].address);
    await wfio.connect(accounts[7]).regoracle(accounts[14].address);
  });

  it(`Wrap 100 wFIO`, async function () {
    let fromStartingBal = await accounts[14].getBalance();
    let toStartingWfioBal = await wfio.balanceOf(accounts[0].address);

    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, transactionId);

    let result = await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, transactionId);
    let fromEndingBal = await accounts[14].getBalance();
    let toEndingWfioBal = await wfio.balanceOf(accounts[0].address);

    expect(result.from).to.equal(accounts[14].address);
    expect(result.to).to.equal(wfio.address);
    expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
    expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.true;
    expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(100);
  });

  it(`Wrap 100 FIO tokens`, async function () {
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
          tpid: fioAccount.address,
          actor: fioAccount.account
        }
      });
      expect(result.status).to.equal('OK');
    } catch (err) {
      console.log(err);
    }
  });

  //TODO: Verify the wrapping before unwrapping

  it(`oracle1 executes - unwrap 100 FIO tokens, expect token not transferred, RAM of signer increased`);
  it(`oracle2 executes - unwrap 100 FIO tokens, expect token not transferred, RAM of signer increased`);
  it(`oracle3 executes - unwrap 100 FIO tokens, expect token transferred to designated addresses, RAM of signer increased`);
});

describe(`B. Unhappy token wrapping`, function () {

});
