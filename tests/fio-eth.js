const hre = require("hardhat");
const ethers = hre.ethers;
require("@nomiclabs/hardhat-ethers");
// require("@nomiclabs/hardhat-ganache");
require("mocha");
const { expect } = require("chai");
const {FIOSDK } = require('@fioprotocol/fiosdk');

const config = require('../config.js');
const {newUser, fetchJson, timeout, callFioApi} = require('../utils.js');
const {existingUser} = require("../utils");

const INIT_SUPPLY = 0;
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

describe(`************************** fio-eth.js ************************** \n   WFIO AND FIONFT QUICK TESTS`, function () {

  let owner;
  let accounts;
  let custodians;
  let factory;
  let wfio;

  before(async function () {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
  });

  it("Should deploy the wFIO token successfully", async function() {
    factory = await ethers.getContractFactory('WFIO', owner);
    wfio = await factory.deploy(INIT_SUPPLY, custodians);
    await wfio.deployed();
    expect(wfio).to.be.a('object');
    expect(wfio).to.have.property('address').which.is.a('string');
    expect(wfio).to.have.property('functions').which.is.a('object');
    expect(wfio.signer.address).to.equal(owner.address);
  });
});

describe(`A1. [ETH] Custodians (get)`, function () {

  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;

  before(async function () {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('WFIO', owner);
    wfio = await factory.deploy(INIT_SUPPLY, custodians);
    await wfio.deployTransaction.wait();
  });

  it(`get a custodian by address`, async function () {
    let result = await wfio.getCustodian(custodians[0]);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(true);
    expect(result[1]).to.be.a('object').with.property('_hex');
    expect(result[1]).to.be.a('object').with.property('_isBigNumber');
  });

  // unhappy paths
  it(`invalid address`, async function () {
    try {
      let result = await wfio.getCustodian('0x0');
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string');
      expect(err).to.have.property('code').which.is.a('string');
      expect(err).to.have.property('argument').which.is.a('string');
      expect(err).to.have.property('value').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.reason).to.equal('invalid address');
    }
  });

  it(`missing address`, async function () {
    try {
      let result = await wfio.getCustodian();
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string');
      expect(err).to.have.property('code').which.is.a('string');
      expect(err).to.have.property('count').which.is.a('number');
      expect(err).to.have.property('expectedCount').which.is.a('number');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.reason).to.equal('missing argument: passed to contract');
    }
  });

  it(`non-custodian address`, async function () {
    let result = await wfio.getCustodian(accounts[15].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(false);
    expect(result[1]).to.be.a('object').with.property('_hex');
    expect(result[1]).to.be.a('object').with.property('_isBigNumber');
  });
});

describe(`A2. [ETH] Custodians (register)`, function () {

  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;

  before(async function () {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('WFIO', owner);
    wfio = await factory.deploy(INIT_SUPPLY, custodians);
    await wfio.deployTransaction.wait();
  });

  it(`register a new custodian`, async function () {
    await wfio.connect(accounts[1]).regcust(accounts[18].address);
    await wfio.connect(accounts[2]).regcust(accounts[18].address);
    await wfio.connect(accounts[3]).regcust(accounts[18].address);
    await wfio.connect(accounts[4]).regcust(accounts[18].address);
    await wfio.connect(accounts[5]).regcust(accounts[18].address);
    await wfio.connect(accounts[6]).regcust(accounts[18].address);
    await wfio.connect(accounts[7]).regcust(accounts[18].address);
    let result = await wfio.getCustodian(accounts[18].address);
    expect(result[0]).to.be.a('boolean').and.equal(true);
  });

  // TODO: Register some more new custodians and make sure they are where they should be

  // unhappy paths
  it(`register custodian with an invalid eth address, expect Error 400 `, async function () {
    try {
      let result = await wfio.regcust('0x0')
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string');
      expect(err).to.have.property('code').which.is.a('string');
      expect(err).to.have.property('argument').which.is.a('string');
      expect(err).to.have.property('value').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.reason).to.equal('invalid address');
    }
  });

  it(`register custodian with missing eth address, expect Error 400 `, async function () {
    try {
      await wfio.regcust();
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string');
      expect(err).to.have.property('code').which.is.a('string');
      expect(err).to.have.property('count').which.is.a('number');
      expect(err).to.have.property('expectedCount').which.is.a('number');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.reason).to.equal('missing argument: passed to contract')
    }
  });

  it(`register custodian with no authority, expect Error 403 `, async function () {
    try {
      let result = await wfio.regcust(accounts[18].address);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Only a wFIO custodian may call this function.\'');
    }
  });

  it(`register custodian with an already-registered eth address, expect Error 400 `, async function () {
    try {
      let result = await wfio.connect(accounts[1]).regcust(accounts[2].address);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('transactionHash').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.contain('Custodian is already registered');
    }
  });

  // TODO: Test with varying consensus among other custodians (different addresses, different amounts, etc)
  // TODO: Test with incorrect consensus (too few approvers, already approved address)
});

describe(`A3. [ETH] Custodians (unregister)`, function () {

  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;

  before(async function () {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('WFIO', owner);
    wfio = await factory.deploy(INIT_SUPPLY, custodians);
    await wfio.deployTransaction.wait();
  });

  it(`unregister a custodian`, async function () {
    await wfio.connect(accounts[1]).unregcust(accounts[9].address);
    await wfio.connect(accounts[2]).unregcust(accounts[9].address);
    await wfio.connect(accounts[3]).unregcust(accounts[9].address);
    await wfio.connect(accounts[4]).unregcust(accounts[9].address);
    await wfio.connect(accounts[5]).unregcust(accounts[9].address);
    await wfio.connect(accounts[6]).unregcust(accounts[9].address);
    await wfio.connect(accounts[7]).unregcust(accounts[9].address);
    let result = await wfio.getCustodian(accounts[9].address);
    expect(result[0]).to.be.a('boolean').and.equal(false);
  });

  // unhappy paths
  it(`unregister a missing ETH address, expect error`, async function () {
    try {
      let result = await wfio.unregcust()
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string');
      expect(err).to.have.property('code').which.is.a('string');
      expect(err).to.have.property('count').which.is.a('number');
      expect(err).to.have.property('expectedCount').which.is.a('number');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.reason).to.equal('missing argument: passed to contract');
    }
  });

  it(`unregister an invalid address, expect error.`, async function () {
    try {
      let result = await wfio.unregcust('0x0')
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string');
      expect(err).to.have.property('code').which.is.a('string');
      expect(err).to.have.property('argument').which.is.a('string');
      expect(err).to.have.property('value').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.reason).to.equal('invalid address');
    }
  });

  it(`unregister with no authority, expect error.`, async function () {
    try {
      let result = await wfio.unregcust(custodians[0])
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Only a wFIO custodian may call this function.\'');
    }
  });

  // TODO: Test with varying consensus among other custodians (different addresses, different amounts, etc)
  // TODO: Test with incorrect consensus (too few approvers, already approved address)
});

describe(`B1. [ETH] Oracles (get)`, function () {

  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;

  before(async function () {
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

  it(`get list of oracles`, async function () {
    let result = await wfio.getOracles();
    expect(result).to.be.a('array');
    expect(result.length).to.equal(3);
    expect(result).to.contain(accounts[12].address);
    expect(result).to.contain(accounts[13].address);
    expect(result).to.contain(accounts[14].address);
  });

  it(`get an oracle by address`, async function () {
    let result = await wfio.getOracle(accounts[12].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(true);
    expect(result[1]).to.be.a('object').with.property('_hex');
    expect(result[1]).to.be.a('object').with.property('_isBigNumber');
  });

  // unhappy paths
  it(`invalid address`, async function () {
    try {
      let result = await wfio.getOracle('0x0');
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string');
      expect(err).to.have.property('code').which.is.a('string');
      expect(err).to.have.property('argument').which.is.a('string');
      expect(err).to.have.property('value').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.reason).to.equal('invalid address');
    }
  });

  it(`missing address`, async function () {
    try {
      let result = await wfio.getOracle();
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string');
      expect(err).to.have.property('code').which.is.a('string');
      expect(err).to.have.property('count').which.is.a('number');
      expect(err).to.have.property('expectedCount').which.is.a('number');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.reason).to.equal('missing argument: passed to contract');
    }
  });

  it(`non-custodian address`, async function () {
    try {
      let result = await wfio.getOracle(accounts[15].address);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('boolean').and.equal(false);
      expect(result[1]).to.be.a('object').with.property('_hex');
      expect(result[1]).to.be.a('object').with.property('_isBigNumber');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  // TODO: Test with varying consensus among other custodians (different addresses, different amounts, etc)
  // TODO: Test with incorrect consensus (too few approvers, already approved address)
});

describe(`B2. [ETH] Oracles (register)`, function () {

  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;

  before(async function () {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('WFIO', owner);
    wfio = await factory.deploy(INIT_SUPPLY, custodians);
    await wfio.deployTransaction.wait();
    // register an oracle for testing
    await wfio.connect(accounts[1]).regoracle(accounts[12].address);
    await wfio.connect(accounts[2]).regoracle(accounts[12].address);
    await wfio.connect(accounts[3]).regoracle(accounts[12].address);
    await wfio.connect(accounts[4]).regoracle(accounts[12].address);
    await wfio.connect(accounts[5]).regoracle(accounts[12].address);
    await wfio.connect(accounts[6]).regoracle(accounts[12].address);
    await wfio.connect(accounts[7]).regoracle(accounts[12].address);
  });

  it(`register oracle`, async function () {
    await wfio.connect(accounts[1]).regoracle(accounts[13].address);
    await wfio.connect(accounts[2]).regoracle(accounts[13].address);
    await wfio.connect(accounts[3]).regoracle(accounts[13].address);
    await wfio.connect(accounts[4]).regoracle(accounts[13].address);
    await wfio.connect(accounts[5]).regoracle(accounts[13].address);
    await wfio.connect(accounts[6]).regoracle(accounts[13].address);
    await wfio.connect(accounts[7]).regoracle(accounts[13].address);
    let result = await wfio.getOracle(accounts[13].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(true);
    expect(result[1]).to.be.a('object').with.property('_hex');
    expect(result[1]).to.be.a('object').with.property('_isBigNumber');
  });

  // TODO: Register some more new custodians and make sure they are where they should be

  // unhappy paths
  it(`register oracle with an invalid eth address, expect Error 400`, async function () {
    try {
      let result = await wfio.regoracle('0x0');
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string');
      expect(err).to.have.property('code').which.is.a('string');
      expect(err).to.have.property('argument').which.is.a('string');
      expect(err).to.have.property('value').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.reason).to.equal('invalid address');
    }
  });

  it(`register oracle with a missing eth address, expect Error 400`, async function () {
    try {
      let result = await wfio.regoracle();
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string');
      expect(err).to.have.property('code').which.is.a('string');
      expect(err).to.have.property('count').which.is.a('number');
      expect(err).to.have.property('expectedCount').which.is.a('number');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.reason).to.equal('missing argument: passed to contract');
    }
  });

  it(`register oracle with no authority, expect Error 403 `, async function () {
    try {
      let result = await wfio.regoracle(accounts[18].address);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Only a wFIO custodian may call this function.\'');
    }
  });

  // TODO: Test with varying consensus among other custodians (different addresses, different amounts, etc)
  // TODO: Test with incorrect consensus (too few approvers, already approved address)
});

describe(`B3. [ETH] Oracles (unregister)`, function () {
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;

  before(async function () {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('WFIO', owner);
    wfio = await factory.deploy(INIT_SUPPLY, custodians);
    await wfio.deployTransaction.wait();
    // register an oracle for testing
    await wfio.connect(accounts[1]).regoracle(accounts[12].address);
    await wfio.connect(accounts[2]).regoracle(accounts[12].address);
    await wfio.connect(accounts[3]).regoracle(accounts[12].address);
    await wfio.connect(accounts[4]).regoracle(accounts[12].address);
    await wfio.connect(accounts[5]).regoracle(accounts[12].address);
    await wfio.connect(accounts[6]).regoracle(accounts[12].address);
    await wfio.connect(accounts[7]).regoracle(accounts[12].address);
  });

  it(`Unregister oracle`, async function () {
    await wfio.connect(accounts[1]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[2]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[3]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[4]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[5]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[6]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[7]).unregoracle(accounts[12].address);
    let result = await wfio.getOracle(accounts[12].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(false);
  });

  // unhappy paths
  it(`unregister a missing ETH address, expect error`, async function () {
    try {
      let result = await wfio.unregoracle();
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string');
      expect(err).to.have.property('code').which.is.a('string');
      expect(err).to.have.property('count').which.is.a('number');
      expect(err).to.have.property('expectedCount').which.is.a('number');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.reason).to.equal('missing argument: passed to contract');
    }
  });

  it(`unregister an invalid address, expect error.`, async function () {
    try {
      let result = await wfio.unregoracle('0x0');
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string');
      expect(err).to.have.property('code').which.is.a('string');
      expect(err).to.have.property('argument').which.is.a('string');
      expect(err).to.have.property('value').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.reason).to.equal('invalid address');
    }
  });

  it(`unregister with no authority, expect error.`, async function () {
    try {
      let result = await wfio.unregoracle(custodians[0])
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Only a wFIO custodian may call this function.\'');
    }
  });

  // TODO: Test with varying consensus among other custodians (different addresses, different amounts, etc)
  // TODO: Test with incorrect consensus (too few approvers, already approved address)
});

describe(`C1. [ETH] wFIO wrapping`, function () {

  let fioAccount;
  let fioBalance;
  let fioTransaction;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;
  let transactionId;

  beforeEach(async function () {
    fioAccount = await newUser(faucet);
    fioBalance = await fioAccount.sdk.genericAction('getFioBalance', { });
    fioTransaction = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: fioAccount.publicKey,
      amount: 100,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    transactionId = fioTransaction.transaction_id;
  });

  before(async function () {
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

  it(`Wrap 100 wFIO`, async function () {
    let fromStartingBal = await accounts[14].getBalance();
    let toStartingWfioBal = await wfio.balanceOf(accounts[0].address);

    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, transactionId);
    try {
      let result = await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, transactionId);
      let fromEndingBal = await accounts[14].getBalance();
      let toEndingWfioBal = await wfio.balanceOf(accounts[0].address);
      expect(result.from).to.equal(accounts[14].address);
      expect(result.to).to.equal(wfio.address);
      expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
      expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.true;
      expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(100)
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`Add 3 new oracles and wrap 100 wFIO`, async function () {
    // add 3 new oracles
    await wfio.connect(accounts[1]).regoracle(accounts[15].address);
    await wfio.connect(accounts[2]).regoracle(accounts[15].address);
    await wfio.connect(accounts[3]).regoracle(accounts[15].address);
    await wfio.connect(accounts[4]).regoracle(accounts[15].address);
    await wfio.connect(accounts[5]).regoracle(accounts[15].address);
    await wfio.connect(accounts[6]).regoracle(accounts[15].address);
    await wfio.connect(accounts[7]).regoracle(accounts[15].address);
    await wfio.connect(accounts[1]).regoracle(accounts[16].address);
    await wfio.connect(accounts[2]).regoracle(accounts[16].address);
    await wfio.connect(accounts[3]).regoracle(accounts[16].address);
    await wfio.connect(accounts[4]).regoracle(accounts[16].address);
    await wfio.connect(accounts[5]).regoracle(accounts[16].address);
    await wfio.connect(accounts[6]).regoracle(accounts[16].address);
    await wfio.connect(accounts[7]).regoracle(accounts[16].address);
    await wfio.connect(accounts[1]).regoracle(accounts[17].address);
    await wfio.connect(accounts[2]).regoracle(accounts[17].address);
    await wfio.connect(accounts[3]).regoracle(accounts[17].address);
    await wfio.connect(accounts[4]).regoracle(accounts[17].address);
    await wfio.connect(accounts[5]).regoracle(accounts[17].address);
    await wfio.connect(accounts[6]).regoracle(accounts[17].address);
    await wfio.connect(accounts[7]).regoracle(accounts[17].address);

    let fromStartingBal = await accounts[17].getBalance();
    let toStartingWfioBal = await wfio.balanceOf(accounts[0].address);

    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[15]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[16]).wrap(accounts[0].address, 100, transactionId);
    try {
      let result = await wfio.connect(accounts[17]).wrap(accounts[0].address, 100, transactionId);
      let fromEndingBal = await accounts[17].getBalance();
      let toEndingWfioBal = await wfio.balanceOf(accounts[0].address);
      expect(result.from).to.equal(accounts[17].address);
      expect(result.to).to.equal(wfio.address);
      expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
      expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.true;
      expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(100)
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`Add 10 new oracles and wrap 100 wFIO`, async function () {

    // register 10 more new oracles
    await wfio.connect(accounts[1]).regoracle(accounts[18].address);
    await wfio.connect(accounts[2]).regoracle(accounts[18].address);
    await wfio.connect(accounts[3]).regoracle(accounts[18].address);
    await wfio.connect(accounts[4]).regoracle(accounts[18].address);
    await wfio.connect(accounts[5]).regoracle(accounts[18].address);
    await wfio.connect(accounts[6]).regoracle(accounts[18].address);
    await wfio.connect(accounts[7]).regoracle(accounts[18].address);
    await wfio.connect(accounts[1]).regoracle(accounts[19].address);
    await wfio.connect(accounts[2]).regoracle(accounts[19].address);
    await wfio.connect(accounts[3]).regoracle(accounts[19].address);
    await wfio.connect(accounts[4]).regoracle(accounts[19].address);
    await wfio.connect(accounts[5]).regoracle(accounts[19].address);
    await wfio.connect(accounts[6]).regoracle(accounts[19].address);
    await wfio.connect(accounts[7]).regoracle(accounts[19].address);
    await wfio.connect(accounts[1]).regoracle(accounts[20].address);
    await wfio.connect(accounts[2]).regoracle(accounts[20].address);
    await wfio.connect(accounts[3]).regoracle(accounts[20].address);
    await wfio.connect(accounts[4]).regoracle(accounts[20].address);
    await wfio.connect(accounts[5]).regoracle(accounts[20].address);
    await wfio.connect(accounts[6]).regoracle(accounts[20].address);
    await wfio.connect(accounts[7]).regoracle(accounts[20].address);
    await wfio.connect(accounts[1]).regoracle(accounts[21].address);
    await wfio.connect(accounts[2]).regoracle(accounts[21].address);
    await wfio.connect(accounts[3]).regoracle(accounts[21].address);
    await wfio.connect(accounts[4]).regoracle(accounts[21].address);
    await wfio.connect(accounts[5]).regoracle(accounts[21].address);
    await wfio.connect(accounts[6]).regoracle(accounts[21].address);
    await wfio.connect(accounts[7]).regoracle(accounts[21].address);
    await wfio.connect(accounts[1]).regoracle(accounts[22].address);
    await wfio.connect(accounts[2]).regoracle(accounts[22].address);
    await wfio.connect(accounts[3]).regoracle(accounts[22].address);
    await wfio.connect(accounts[4]).regoracle(accounts[22].address);
    await wfio.connect(accounts[5]).regoracle(accounts[22].address);
    await wfio.connect(accounts[6]).regoracle(accounts[22].address);
    await wfio.connect(accounts[7]).regoracle(accounts[22].address);
    await wfio.connect(accounts[1]).regoracle(accounts[23].address);
    await wfio.connect(accounts[2]).regoracle(accounts[23].address);
    await wfio.connect(accounts[3]).regoracle(accounts[23].address);
    await wfio.connect(accounts[4]).regoracle(accounts[23].address);
    await wfio.connect(accounts[5]).regoracle(accounts[23].address);
    await wfio.connect(accounts[6]).regoracle(accounts[23].address);
    await wfio.connect(accounts[7]).regoracle(accounts[23].address);
    await wfio.connect(accounts[1]).regoracle(accounts[24].address);
    await wfio.connect(accounts[2]).regoracle(accounts[24].address);
    await wfio.connect(accounts[3]).regoracle(accounts[24].address);
    await wfio.connect(accounts[4]).regoracle(accounts[24].address);
    await wfio.connect(accounts[5]).regoracle(accounts[24].address);
    await wfio.connect(accounts[6]).regoracle(accounts[24].address);
    await wfio.connect(accounts[7]).regoracle(accounts[24].address);
    await wfio.connect(accounts[1]).regoracle(accounts[25].address);
    await wfio.connect(accounts[2]).regoracle(accounts[25].address);
    await wfio.connect(accounts[3]).regoracle(accounts[25].address);
    await wfio.connect(accounts[4]).regoracle(accounts[25].address);
    await wfio.connect(accounts[5]).regoracle(accounts[25].address);
    await wfio.connect(accounts[6]).regoracle(accounts[25].address);
    await wfio.connect(accounts[7]).regoracle(accounts[25].address);
    await wfio.connect(accounts[1]).regoracle(accounts[26].address);
    await wfio.connect(accounts[2]).regoracle(accounts[26].address);
    await wfio.connect(accounts[3]).regoracle(accounts[26].address);
    await wfio.connect(accounts[4]).regoracle(accounts[26].address);
    await wfio.connect(accounts[5]).regoracle(accounts[26].address);
    await wfio.connect(accounts[6]).regoracle(accounts[26].address);
    await wfio.connect(accounts[7]).regoracle(accounts[26].address);
    await wfio.connect(accounts[1]).regoracle(accounts[27].address);
    await wfio.connect(accounts[2]).regoracle(accounts[27].address);
    await wfio.connect(accounts[3]).regoracle(accounts[27].address);
    await wfio.connect(accounts[4]).regoracle(accounts[27].address);
    await wfio.connect(accounts[5]).regoracle(accounts[27].address);
    await wfio.connect(accounts[6]).regoracle(accounts[27].address);
    await wfio.connect(accounts[7]).regoracle(accounts[27].address);

    let fromStartingBal = await accounts[27].getBalance();
    let toStartingWfioBal = await wfio.balanceOf(accounts[0].address);

    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[15]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[16]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[17]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[18]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[19]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[20]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[21]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[22]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[23]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[24]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[25]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[26]).wrap(accounts[0].address, 100, transactionId);

    try {
      let result = await wfio.connect(accounts[27]).wrap(accounts[0].address, 100, transactionId);
      let fromEndingBal = await accounts[27].getBalance();
      let toEndingWfioBal = await wfio.balanceOf(accounts[0].address);
      expect(result.from).to.equal(accounts[27].address);
      expect(result.to).to.equal(wfio.address);
      expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
      expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.true;
      expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(100)
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  // unhappy paths
  it(`invalid address, expect Error 400`, async function () {
    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, transactionId);
    try {
      let result = await wfio.connect(accounts[14]).wrap("donkey", 100, transactionId);
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string').and.equal('network does not support ENS');
      expect(err).to.have.property('code').which.is.a('string').and.equal('UNSUPPORTED_OPERATION');
      expect(err).to.have.property('operation').which.is.a('string').and.equal('ENS');

      // expect(err).to.have.property('reason').which.is.a('string').and.equal('resolver or addr is not configured for ENS name');
      // expect(err).to.have.property('code').which.is.a('string').and.equal('INVALID_ARGUMENT');

      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
    }
  });

  it(`missing address, expect Error 400`, async function () {
    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, transactionId);
    try {
      let result = await wfio.connect(accounts[14]).wrap(100, transactionId);
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string').and.equal('missing argument: passed to contract');
      expect(err).to.have.property('code').which.is.a('string').and.equal('MISSING_ARGUMENT');
      expect(err).to.have.property('count').which.is.a('number').and.equal(2);
      expect(err).to.have.property('expectedCount').which.is.a('number').and.equal(3);
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
    }
  });

  it(`invalid tx amount, expect Error 400`, async function () {
    let invalidTxAmt = "invalid-tx-amt";
    try {
      let result = await wfio.wrap(custodians[0], invalidTxAmt, transactionId);
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string').and.equal('invalid BigNumber string');
      expect(err).to.have.property('code').which.is.a('string').and.equal('INVALID_ARGUMENT');
      expect(err).to.have.property('argument').which.is.a('string').and.equal('value');
      expect(err).to.have.property('value').which.is.a('string').and.equal(invalidTxAmt);
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
    }
  });

  it(`missing tx amount, expect Error 400`, async function () {
    try {
      let result = await wfio.wrap(custodians[0], transactionId);
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string').and.equal('missing argument: passed to contract');
      expect(err).to.have.property('code').which.is.a('string').and.equal('MISSING_ARGUMENT');
      expect(err).to.have.property('count').which.is.a('number').and.equal(2);
      expect(err).to.have.property('expectedCount').which.is.a('number').and.equal(3);
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
    }
  });

  it(`invalid obtid, expect Error 400`, async function () {
    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, "donkey");
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, "donkey");
    try {
      let result = await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, 1); // TODO: Should this third arg take any arbitrary string
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('Array');
      expect(err).to.have.property('message').which.is.a('string').and.contain('Invalid obtid');
      expect(err).to.have.property('transactionHash').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
    }
  });

  it(`missing obtid, expect Error 400`, async function () {
    try {
      let result = await wfio.wrap(custodians[0], 1000);
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string').and.equal('missing argument: passed to contract');
      expect(err).to.have.property('code').which.is.a('string').and.equal('MISSING_ARGUMENT');
      expect(err).to.have.property('count').which.is.a('number').and.equal(2);
      expect(err).to.have.property('expectedCount').which.is.a('number').and.equal(3);
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
    }
  });

  it(`no authority, expect Error 403`, async function () {
    try {
      let result = await wfio.wrap(accounts[13].address, 100, transactionId);
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('Array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string').and.equal('VM Exception while processing transaction: reverted with reason string \'Only a wFIO oracle may call this function.\'');
    }
  });

  it(`recipient account does not match prior approvals`, async function () {

    let toStartingWfioBal = await wfio.balanceOf(accounts[0].address);

    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[15]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[16]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[17]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[18]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[19]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[20]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[21]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[22]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[23]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[24]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[25]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[26]).wrap(accounts[0].address, 100, transactionId);

    try {
      let result = await wfio.connect(accounts[27]).wrap(accounts[1].address, 100, transactionId);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('Array');
      expect(err).to.have.property('transactionHash').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string').and.contain('account does not match prior approvals');
      let toEndingWfioBal = await wfio.balanceOf(accounts[0].address);
      expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.false;
      expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(0)
    }
  });

  it(`amount does not match prior approvals`, async function () {

    let toStartingWfioBal = await wfio.balanceOf(accounts[0].address);

    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[15]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[16]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[17]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[18]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[19]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[20]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[21]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[22]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[23]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[24]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[25]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[26]).wrap(accounts[0].address, 100, transactionId);

    try {
      let result = await wfio.connect(accounts[27]).wrap(accounts[0].address, 2500, transactionId);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('transactionHash').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string').and.contain('amount does not match prior approvals');
      let fromEndingBal = await accounts[27].getBalance();
      let toEndingWfioBal = await wfio.balanceOf(accounts[0].address);
      expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.false;
      expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(0)
    }
  });
});

describe(`C2. [ETH] wFIO unwrapping`, function () {

  let fioAccount;
  let fioTransaction;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;
  let TRANSACTIION_ID;

  beforeEach(async function () {
    let _bal = await wfio.balanceOf(accounts[0].address);
    if ( _bal.lt(100)) {
      fioTransaction = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: fioAccount.publicKey,
        amount: 100,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      TRANSACTIION_ID = fioTransaction.transaction_id;

      await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, TRANSACTIION_ID);
      await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, TRANSACTIION_ID);
      await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, TRANSACTIION_ID);
      _bal = await wfio.balanceOf(accounts[0].address);
    }
  });

  before(async function () {
    fioAccount = await newUser(faucet);

    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('WFIO', owner);
    wfio = await factory.deploy(INIT_SUPPLY, custodians);
    await wfio.deployTransaction.wait();
    // register an oracle for testing
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

    // maybe I need to add the eth address to the fioAccount?
    await fioAccount.sdk.genericAction('addPublicAddresses', {
      fioAddress: fioAccount.address,
      publicAddresses: [
        {
          chain_code: 'ETH',
          token_code: 'ETH',
          public_address: accounts[0].address,
        }
      ],
      maxFee: config.api.add_pub_address.fee,
      technologyProviderId: ''
    });   // tests seem to pass either way...
  });

  it(`Unwrap 100 wFIO`, async function () {
    let fromStartingWfioBal = await wfio.balanceOf(accounts[0].address);
    await wfio.connect(accounts[0]).unwrap(fioAccount.address, 100);
    let fromEndingWfioBal = await wfio.balanceOf(accounts[0].address);
    expect(fromStartingWfioBal.gt(fromEndingWfioBal))
    expect(fromEndingWfioBal.toNumber()).to.equal(0);
    await timeout(3000);  // seems to keep subsequent tests from breaking
  });

  // unwrap
  it(`invalid address, expect Error 400`, async function () {
    let fromStartingWfioBal = await wfio.balanceOf(accounts[0].address);
    try {
      // TODO: what kind of checks are expected? this validation isn't enough for arbitrary strings
      await wfio.connect(accounts[0]).unwrap("0x", 100);
    } catch (err) {
      let fromEndingWfioBal = await wfio.balanceOf(accounts[0].address);
      expect(fromEndingWfioBal.eq(fromStartingWfioBal));
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('transactionHash').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Invalid FIO Address\'');
    }
  });

  it(`missing address, expect Error 400`, async function () {
    let fromStartingWfioBal = await wfio.balanceOf(accounts[0].address);
    try {
      await wfio.connect(accounts[0]).unwrap(100);
    } catch (err) {
      let fromEndingWfioBal = await wfio.balanceOf(accounts[0].address);
      expect(fromEndingWfioBal.eq(fromStartingWfioBal));
      expect(err).to.have.property('reason').which.is.a('string');
      expect(err).to.have.property('code').which.is.a('string');
      expect(err).to.have.property('count').which.is.a('number');
      expect(err).to.have.property('expectedCount').which.is.a('number');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.reason).to.equal('missing argument: passed to contract');
    }
  });

  it(`invalid tx amount, expect Error 400`, async function () {
    let fromStartingWfioBal = await wfio.balanceOf(accounts[0].address);
    try {
      let result = await wfio.connect(accounts[0]).unwrap(fioAccount.address, "text");
    } catch (err) {
      let fromEndingWfioBal = await wfio.balanceOf(accounts[0].address);
      expect(fromEndingWfioBal.eq(fromStartingWfioBal));
      expect(err).to.have.property('reason').which.is.a('string');
      expect(err).to.have.property('code').which.is.a('string');
      expect(err).to.have.property('argument').which.is.a('string');
      expect(err).to.have.property('value').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.reason).to.equal('invalid BigNumber string');
    }
  });

  it(`missing tx amount, expect Error 400`, async function () {
    let fromStartingWfioBal = await wfio.balanceOf(accounts[0].address);
    try {
      let result = await wfio.connect(accounts[0]).unwrap(fioAccount.address);
    } catch (err) {
      let fromEndingWfioBal = await wfio.balanceOf(accounts[0].address);
      expect(fromEndingWfioBal.eq(fromStartingWfioBal));
      expect(err).to.have.property('reason').which.is.a('string');
      expect(err).to.have.property('code').which.is.a('string');
      expect(err).to.have.property('count').which.is.a('number');
      expect(err).to.have.property('expectedCount').which.is.a('number');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.reason).to.equal('missing argument: passed to contract');
    }
  });
});

describe(`D. [ETH] Approval`, function () {

  let fioAccount;
  let fioTransaction;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;
  let TRANSACTIION_ID;

  beforeEach(async function () {
    let _bal = await wfio.balanceOf(accounts[0].address);
    if ( _bal.lt(100)) {
      fioTransaction = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: fioAccount.publicKey,
        amount: 100,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      TRANSACTIION_ID = fioTransaction.transaction_id;

      await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, TRANSACTIION_ID);
      await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, TRANSACTIION_ID);
      await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, TRANSACTIION_ID);
      _bal = await wfio.balanceOf(accounts[0].address);
    }
  });

  before(async function () {
    fioAccount = await newUser(faucet);

    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('WFIO', owner);
    wfio = await factory.deploy(INIT_SUPPLY, custodians);
    await wfio.deployTransaction.wait();
    // register an oracle for testing
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

    // maybe I need to add the eth address to the fioAccount?
    await fioAccount.sdk.genericAction('addPublicAddresses', {
      fioAddress: fioAccount.address,
      publicAddresses: [
        {
          chain_code: 'ETH',
          token_code: 'ETH',
          public_address: accounts[0].address,
        }
      ],
      maxFee: config.api.add_pub_address.fee,
      technologyProviderId: ''
    });   // tests seem to pass either way...
  });

  it(`get approval by obtid`, async function () {
    let result = await wfio.connect(accounts[1]).getApproval(TRANSACTIION_ID);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('object');
    expect(result[1]).to.be.a('string');
    expect(result[2]).to.be.a('object');
  });

  // unhappy path
  it(`invalid obtid`, async function () {
    try {
      await wfio.connect(accounts[1]).getApproval('');
    } catch (err) {
      expect(err.message).to.contain('Invalid obtid');
    }
  });

  it(`missing obtid`, async function () {
    try {
      await wfio.connect(accounts[1]).getApproval();
    } catch (err) {
      expect(err.message).to.contain('missing argument: passed to contract');
    }
  });

});

describe(`E. [ETH] Pausing`, function () {

  let fioAccount;
  let fioTransaction;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;
  let TRANSACTIION_ID;

  before(async function () {

    fioAccount = await newUser(faucet);
    fioTransaction = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: fioAccount.publicKey,
      amount: 100,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    TRANSACTIION_ID = fioTransaction.transaction_id;
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

  it(`pause the wFIO contract`, async function () {
    await wfio.connect(accounts[1]).pause();
    try {
      // wrapping/unwrapping is prohibited when contract is paused
      await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, TRANSACTIION_ID);
    } catch (err) {
      expect(err.message).to.contain('Pausable: paused');
    } finally {
      await wfio.connect(accounts[1]).unpause();
    }
  });

  it(`non-custodian users should not be able to pause`, async function () {
    try {
      await wfio.connect(accounts[0]).pause()
    } catch (err) {
      expect(err.message).to.contain('Only a wFIO custodian may call this function.');
    }

    try {
      await wfio.connect(owner).pause()
    } catch (err) {
      expect(err.message).to.contain('Only a wFIO custodian may call this function.');
    }

    try {
      await wfio.connect(accounts[14]).pause()
    } catch (err) {
      expect(err.message).to.contain('Only a wFIO custodian may call this function.');
    }
  });

  it(`should not be able to pause when already paused`, async function () {
    await wfio.connect(accounts[1]).pause();
    try {
      await wfio.connect(accounts[1]).pause();
    } catch (err) {
      expect(err.message).to.contain('Pausable: paused');
    } finally {
      await wfio.connect(accounts[1]).unpause();
    }
  });
});

describe(`F. [ETH] Unpausing`, function () {

  let fioAccount;
  let fioTransaction;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;
  let TRANSACTIION_ID;

  before(async function () {

    fioAccount = await newUser(faucet);
    fioTransaction = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: fioAccount.publicKey,
      amount: 100,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    TRANSACTIION_ID = fioTransaction.transaction_id;
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
    await wfio.connect(accounts[1]).pause();
  });

  it(`unpause the wFIO contract`, async function () {
    try {
      await wfio.connect(accounts[1]).unpause();
      // wrapping/unwrapping is prohibited when contract is paused
      await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, TRANSACTIION_ID);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`non-custodian users should not be able to unpause`, async function () {
    await wfio.connect(accounts[1]).pause();
    try {
      await wfio.connect(accounts[0]).unpause();
    } catch (err) {
      expect(err.message).to.contain('Only a wFIO custodian may call this function.');
    } finally {
      await wfio.connect(accounts[1]).unpause();
    }
  });

  it(`should not be able to unpause when already unpaused`, async function () {
    try {
      await wfio.connect(accounts[1]).unpause()
    } catch (err) {
      expect(err.message).to.contain('Pausable: not paused');
    }
  });
});

describe(`G. [FIO] Oracles (get_table_rows)`, function () {
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
      const oracleRecords = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.oracle',
        scope: 'fio.oracle',
        table: 'oracless',
        reverse: true,
        limit: 1000
      });
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

//TODO: should regoracle and unregoracle do any empty or missing actor validation? Because they aren't
describe(`H. [FIO] Oracles (register)`, function () {
  let user1, user2, user3, oracle1, oracle2, oracle3;

  before(async function () {
    oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    user1 = await newUser(faucet);
    user2 = await newUser(faucet);
    user3 = await newUser(faucet);
    //
    // await oracle1.sdk.genericAction('pushTransaction', {
    //   action: 'regoracle',
    //   account: 'fio.oracle',
    //   actor: 'eosio',
    //   data: {
    //     oracle_actor: oracle1.account,
    //     actor: oracle1.account
    //   }
    // });
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
      console.log('Error: ', err.json)
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
      const oracleRecords = await callFioApi("get_table_rows", {
        json: true,
        code: 'fio.oracle',
        scope: 'fio.oracle',
        table: 'oracless',
        lower_bound: user1.account,
        upper_bound: user1.account,
        reverse: true,
        limit: 1000
      });
      expect(oracleRecords.rows.length).to.equal(1);
      expect(oracleRecords.rows[0]).to.have.all.keys('actor', 'fees');
      expect(oracleRecords.rows[0].actor).to.be.a('string').and.equal(user1.account);
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
          oracle_actor: "", //user3.account,
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
          // oracle_actor: user3.account,
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
          oracle_actor: "!invalid!@$", //user3.account,
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
          oracle_actor: 1234500000000, //user3.account,
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
          oracle_actor: -1234500000000, //user3.account,
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
      console.log('Error: ', err.json)
      throw err;
    }
  });

  it.skip(`(empty actor) user3 tries to register user2 as an oracle, expect Error`, async function () {
    try {
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: user2.account,
          actor: "", //user3.account
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
  it.skip(`(missing actor) user3 tries to register user2 as an oracle, expect Error`, async function () {
    try {
      const result = await user3.sdk.genericAction('pushTransaction', {
        action: 'regoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: user2.account,
          //actor: user3.account
        }
      });
      expect(result.status).to.not.equal('OK');
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
          actor: "!invalid!@$", //user3.account
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
          actor: 1234500000000 //user3.account
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
          actor: -1234500000000 //user3.account
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });
});

describe(`I. [FIO] Oracles (unregister)`, function () {
  let user1, user2, user3, newOracle, oracle1, oracle2, oracle3;

  before(async function () {
    oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    // oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    // oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    // user1 = await newUser(faucet);
    // user2 = await newUser(faucet);
    // user3 = await newUser(faucet);
    newOracle = await newUser(faucet);

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
      await oracle1.sdk.genericAction('pushTransaction', {
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

  it(`(empty oracle_actor) newOracle tries to unregister an oracle, expect Error`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: 'eosio',
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
  it(`(missing oracle_actor) try to unregister an oracle, expect Error`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: 'eosio',
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
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: 'eosio',
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
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: newOracle.account,
          actor: ""
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
  it.skip(`(missing actor) try to unregister an oracle, expect Error`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: newOracle.account,
          // actor: ""
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
  it.skip(`(invalid actor) try to unregister an oracle, expect Error`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: newOracle.account,
          actor: "!invalid!@$"
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
  it(`(int actor) try to unregister an oracle, expect Error`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: newOracle.account,
          actor: 1234500000000
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });
  it(`(negative actor) try to unregister an oracle, expect Error`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'unregoracle',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          oracle_actor: newOracle.account,
          actor: -1234500000000
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('Expected string containing name');
    }
  });
});

describe(`J. [FIO] Oracles (setoraclefees)`, function () {
  //void setoraclefee(
  //    uint64_t &wrap_fio_domain,
  //    uint64_t &wrap_fio_tokens,
  //    name &actor
  //    )

  let oracle1, newOracle;

  before(async function () {
    oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    // oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    // oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    // user1 = await newUser(faucet);
    // user2 = await newUser(faucet);
    // user3 = await newUser(faucet);
    newOracle = await newUser(faucet);

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
      await oracle1.sdk.genericAction('pushTransaction', {
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

  it(`newOracle tries to set oracle fee`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: 1
        }
      });
      expect(result).to.have.property('status').which.is.a('string').and.equals('OK');
    } catch (err) {
      throw err;
    }
  });

  //more missing empty string validation?
  it.skip(`(empty wrap_fio_domain) try to set oracle fees, expect Error`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain:  "", // 1,
          wrap_fio_tokens: 1
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      throw err;
    }
  });
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
  // TODO: does a negative not get handled appropriately here either?
  it.skip(`(negative wrap_fio_domain) try to set oracle fees, expect Error`, async function () {
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
      expect(err.message).to.equal('invalid number');
    }
  });

  it.skip(`(empty wrap_fio_tokens) try to set oracle fees, expect Error`, async function () {
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
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      throw err;
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
  it.skip(`(negative wrap_fio_tokens) try to set oracle fees, expect Error`, async function () {
    try{
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'setoraclefee',
        account: 'fio.oracle',
        actor: 'eosio',
        data: {
          wrap_fio_domain: 1,
          wrap_fio_tokens: -1234500000000
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.message).to.equal('invalid number');
    }
  });

  it(`(empty actor) try to set oracle fees, expect Error`, async function () {

  });
  it(`(missing actor) try to set oracle fees, expect Error`, async function () {

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

describe.skip(`K. [FIO] Oracles (getoraclefees)`, function () {
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
      await oracle1.sdk.genericAction('pushTransaction', {
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
    let user = await newUser(faucet);
    try {
      const result = await callFioApi('get_oracle_fees', {fioPublicKey: user.publicKey});
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

describe(`L. [FIO] Wrap FIO tokens`, function () {
  //void wraptokens(
  //    uint64_t &amount,
  //    string &chain_code,
  //    string &public_address,
  //    uint64_t &max_oracle_fee,
  //    uint64_t &max_fee,
  //    string &tpid,
  //    name &actor
  //    )
  let wrapAmt = 1000000000000;

  let oracle1, newOracle, custodians, factory, wfio;

  before(async function () {
    oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    // oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    // oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');
    // user1 = await newUser(faucet);
    // user2 = await newUser(faucet);
    // user3 = await newUser(faucet);
    newOracle = await newUser(faucet);

    // register a new oracle as a bp
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
      await oracle1.sdk.genericAction('pushTransaction', {
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

    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('WFIO', owner);
    wfio = await factory.deploy(INIT_SUPPLY, custodians);
    await wfio.deployTransaction.wait();
  });



  // unhappy tests
  it(`(empty amount) try to wrap FIO tokens`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: "!invalid!@$", //wrapAmt,
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
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
      expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
    }
  });

  it(`(empty chain_code) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: "", //wfio.address,
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
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          // public_address: "", //wfio.address,
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

  /**
   * TODO: assertion failure with message: must transfer positive quantity
   *  - this message doesn't make any sense here
   */
  it.skip(`(invalid public_address) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
  it.skip(`(int public_address) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
  it(`(negative public_address) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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

  it(`(empty max_oracle_fee) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: "", //config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
    }
  });
  it(`(missing max_oracle_fee) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          //max_oracle_fee: config.maxFee,
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
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
  it(`(negative max_oracle_fee) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: -config.maxFee, //TODO: Check expected assertion text for max_oracle_fee
          max_fee: config.maxFee,
          tpid: "",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
      // throw err;
    }
  });

  it(`(empty max_fee) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
    } catch (err) {
      expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
      //throw err;
    }
  });

  // it(`(empty tpid) try to wrap 1000 FIO tokens`);

  it(`(missing tpid) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
    }
  });
  it(`(empty tpid) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
      expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
    }
  });
  it(`(populated tpid) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "bp1@dapixdev",
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
    }
  });
  it(`(populated v2 tpid) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
        action: 'wraptokens',
        account: 'fio.oracle',
        data: {
          amount: wrapAmt,
          chain_code: "ETH",
          public_address: wfio.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: ["bp1@dapixdev"],
        }
      });
      expect(result.status).to.not.equal('OK');
    } catch (err) {
      expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
    }
  });

  it(`(invalid tpid) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
    } catch (err) {
      expect(err.json.error.details[0].message).to.equal('assertion failure with message: must transfer positive quantity');
    }
  });
  it(`(negative tpid) try to wrap 1000 FIO tokens`, async function () {
    try {
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
      const result = await newOracle.sdk.genericAction('pushTransaction', {
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
});

describe(`M. [FIO] Unwrap FIO tokens`, function () {
  //void unwraptokens(
  //    uint64_t &amount,
  //    string &obt_id,
  //    string &fio_address,
  //    name &actor
  //    )
  let wrapAmt = 1000000000000;
  let unwrapAmt1 = 500000000000;
  let unwrapAmt2 = 250000000000;

  // unhappy tests
  it(`(empty amount) try to unwrap 500 FIO tokens`);
  it(`(missing amount) try to unwrap 500 FIO tokens`);
  it(`(invalid amount) try to unwrap 500 FIO tokens`);
  it(`(negative amount) try to unwrap 500 FIO tokens`);
  it(`(greater amount than wrapped) try to unwrap 1500 FIO tokens`);

  it(`(empty obt_id) try to unwrap 500 FIO tokens`);
  it(`(missing obt_id) try to unwrap 500 FIO tokens`);
  it(`(invalid obt_id) try to unwrap 500 FIO tokens`);
  it(`(int obt_id) try to unwrap 500 FIO tokens`);
  it(`(negative obt_id) try to unwrap 500 FIO tokens`);

  it(`(empty fio_address) try to unwrap 500 FIO tokens`);
  it(`(missing fio_address) try to unwrap 500 FIO tokens`);
  it(`(invalid fio_address) try to unwrap 500 FIO tokens`);
  it(`(int fio_address) try to unwrap 500 FIO tokens`);
  it(`(negative fio_address) try to unwrap 500 FIO tokens`);

  it(`(empty actor) try to unwrap 500 FIO tokens`);
  it(`(missing actor) try to unwrap 500 FIO tokens`);
  it(`(invalid actor) try to unwrap 500 FIO tokens`);
  it(`(int actor) try to unwrap 500 FIO tokens`);
  it(`(negative actor) try to unwrap 500 FIO tokens`);
});

describe(`N. [FIO] Wrap FIO domains`, function () {
  //void wrapdomain(
  //    string &fio_domain,
  //    string &chain_code,
  //    string &public_address,
  //    uint64_t &max_oracle_fee,
  //    uint64_t &max_fee,
  //    string &tpid,
  //    name &actor
  //    )
  // unhappy tests
  it(`(empty fio_domain) try to wrap a FIO domain`);
  it(`(missing fio_domain) try to wrap a FIO domain`);
  it(`(invalid fio_domain) try to wrap a FIO domain`);
  it(`(int fio_domain) try to wrap a FIO domain`);
  it(`(negative fio_domain) try to wrap a FIO domain`);

  it(`(empty chain_code) try to wrap a FIO domain`);
  it(`(missing chain_code) try to wrap a FIO domain`);
  it(`(invalid chain_code) try to wrap a FIO domain`);
  it(`(int chain_code) try to wrap a FIO domain`);
  it(`(negative chain_code) try to wrap a FIO domain`);

  it(`(empty public_address) try to wrap a FIO domain`);
  it(`(missing public_address) try to wrap a FIO domain`);
  it(`(invalid public_address) try to wrap a FIO domain`);
  it(`(int public_address) try to wrap a FIO domain`);
  it(`(negative public_address) try to wrap a FIO domain`);

  it(`(empty max_oracle_fee) try to wrap a FIO domain`);
  it(`(missing max_oracle_fee) try to wrap a FIO domain`);
  it(`(invalid max_oracle_fee) try to wrap a FIO domain`);
  it(`(negative max_oracle_fee) try to wrap a FIO domain`);

  it(`(empty max_fee) try to wrap a FIO domain`);
  it(`(missing max_fee) try to wrap a FIO domain`);
  it(`(invalid max_fee) try to wrap a FIO domain`);
  it(`(negative max_fee) try to wrap a FIO domain`);

  it(`(empty tpid) try to wrap a FIO domain`);
  it(`(missing tpid) try to wrap a FIO domain`);
  it(`(invalid tpid) try to wrap a FIO domain`);
  it(`(int tpid) try to wrap a FIO domain`);
  it(`(negative tpid) try to wrap a FIO domain`);

  it(`(empty actor) try to wrap a FIO domain`);
  it(`(missing actor) try to wrap a FIO domain`);
  it(`(invalid actor) try to wrap a FIO domain`);
  it(`(int actor) try to wrap a FIO domain`);
  it(`(negative actor) try to wrap a FIO domain`);
});

describe(`O. [FIO] Unwrap FIO domains`, function () {
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
