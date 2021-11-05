const hre = require("hardhat");
const ethers = hre.ethers;
require("@nomiclabs/hardhat-ethers");
// require("@nomiclabs/hardhat-ganache");
require("mocha");
const { expect } = require("chai");
const {FIOSDK } = require('@fioprotocol/fiosdk')

const config = require('../config.js');
const {newUser, fetchJson, timeout, callFioApi} = require('../utils.js');

const INIT_SUPPLY = 0;

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
});

describe(`************************** fio-eth.js ************************** \n   WFIO AND FIONFT QUICK TESTS`, () => {

  let owner;
  let accounts;
  let custodians;
  let factory;
  let wfio;

  before(async () => {
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

describe(`A1. Custodians (get)`, () => {

  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;

  before(async () => {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('WFIO', owner);
    wfio = await factory.deploy(INIT_SUPPLY, custodians);
    await wfio.deployTransaction.wait();
  });

  it(`get a custodian by address`, async () => {
    let result = await wfio.getCustodian(custodians[0]);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(true);
    expect(result[1]).to.be.a('object').with.property('_hex');
    expect(result[1]).to.be.a('object').with.property('_isBigNumber');
  });

  // unhappy paths
  it(`invalid address`, async () => {
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

  it(`missing address`, async () => {
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

  it(`non-custodian address`, async () => {
    let result = await wfio.getCustodian(accounts[15].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(false);
    expect(result[1]).to.be.a('object').with.property('_hex');
    expect(result[1]).to.be.a('object').with.property('_isBigNumber');
  });
});

describe(`A2. Custodians (register)`, () => {

  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;

  before(async () => {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('WFIO', owner);
    wfio = await factory.deploy(INIT_SUPPLY, custodians);
    await wfio.deployTransaction.wait();
  });

  it(`register a new custodian`, async () => {
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
  it(`register custodian with an invalid eth address, expect Error 400 `, async () => {
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

  it(`register custodian with missing eth address, expect Error 400 `, async () => {
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

  it(`register custodian with no authority, expect Error 403 `, async () => {
    try {
      let result = await wfio.regcust(accounts[18].address);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: revert Only a wFIO custodian may call this function.');
    }
  });

  it(`register custodian with an already-registered eth address, expect Error 400 `, async () => {
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

describe(`A3. Custodians (unregister)`, () => {

  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;

  before(async () => {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('WFIO', owner);
    wfio = await factory.deploy(INIT_SUPPLY, custodians);
    await wfio.deployTransaction.wait();
  });

  it(`unregister a custodian`, async () => {
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
  it(`unregister a missing ETH address, expect error`, async () => {
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

  it(`unregister an invalid address, expect error.`, async () => {
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

  it(`unregister with no authority, expect error.`, async () => {
    try {
      let result = await wfio.unregcust(custodians[0])
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: revert Only a wFIO custodian may call this function.');
    }
  });

  // TODO: Test with varying consensus among other custodians (different addresses, different amounts, etc)
  // TODO: Test with incorrect consensus (too few approvers, already approved address)
});

describe(`B1. Oracles (get)`, () => {

  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;

  before(async () => {
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

  it(`get list of oracles`, async () => {
    let result = await wfio.getOracles();
    expect(result).to.be.a('array');
    expect(result.length).to.equal(3);
    expect(result).to.contain(accounts[12].address);
    expect(result).to.contain(accounts[13].address);
    expect(result).to.contain(accounts[14].address);
  });

  it(`get an oracle by address`, async () => {
    let result = await wfio.getOracle(accounts[12].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(true);
    expect(result[1]).to.be.a('object').with.property('_hex');
    expect(result[1]).to.be.a('object').with.property('_isBigNumber');
  });

  // unhappy paths
  it(`invalid address`, async () => {
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

  it(`missing address`, async () => {
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

  it(`non-custodian address`, async () => {
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

describe(`B2. Oracles (register)`, () => {

  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;

  before(async () => {
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

  it(`register oracle`, async () => {
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
  it(`register oracle with an invalid eth address, expect Error 400`, async () => {
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

  it(`register oracle with a missing eth address, expect Error 400`, async () => {
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

  it(`register oracle with no authority, expect Error 403 `, async () => {
    try {
      let result = await wfio.regoracle(accounts[18].address);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: revert Only a wFIO custodian may call this function.');
    }
  });

  // TODO: Test with varying consensus among other custodians (different addresses, different amounts, etc)
  // TODO: Test with incorrect consensus (too few approvers, already approved address)
});

describe(`B3. Oracles (unregister)`, () => {
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;

  before(async () => {
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

  it(`Unregister oracle`, async () => {
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
  it(`unregister a missing ETH address, expect error`, async () => {
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

  it(`unregister an invalid address, expect error.`, async () => {
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

  it(`unregister with no authority, expect error.`, async () => {
    try {
      let result = await wfio.unregoracle(custodians[0])
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: revert Only a wFIO custodian may call this function.');
    }
  });

  // TODO: Test with varying consensus among other custodians (different addresses, different amounts, etc)
  // TODO: Test with incorrect consensus (too few approvers, already approved address)
});

describe(`C1. wFIO wrapping`, () => {

  let fioAccount;
  let fioBalance;
  let fioTransaction;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;
  let transactionId;

  beforeEach(async () => {
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

  before(async () => {
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

  it(`Wrap 100 wFIO`, async () => {
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

  it(`Add 3 new oracles and wrap 100 wFIO`, async () => {
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

  it(`Add 10 new oracles and wrap 100 wFIO`, async () => {

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
  it(`invalid address, expect Error 400`, async () => {
    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, transactionId);
    try {
      let result = await wfio.connect(accounts[14]).wrap("donkey", 100, transactionId);
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string');
      expect(err).to.have.property('code').which.is.a('string');
      expect(err).to.have.property('operation').which.is.a('string');
      expect(err).to.have.property('network').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.reason).to.equal('network does not support ENS');
    }
  });

  it(`missing address, expect Error 400`, async () => {
    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, transactionId);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, transactionId);
    try {
      let result = await wfio.connect(accounts[14]).wrap(100, transactionId);
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

  it(`invalid tx amount, expect Error 400`, async () => {
    try {
      let result = await wfio.wrap(custodians[0], "donkey", transactionId);
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string');
      expect(err).to.have.property('code').which.is.a('string');
      expect(err).to.have.property('argument').which.is.a('string');
      expect(err).to.have.property('value').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.reason).to.equal('invalid BigNumber string');
    }
  });

  it(`missing tx amount, expect Error 400`, async () => {
    try {
      let result = await wfio.wrap(custodians[0], transactionId);
      expect(result.status).to.equal('OK');
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

  it(`invalid obtid, expect Error 400`, async () => {
    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, "donkey");
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, "donkey");
    try {
      let result = await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, 1); // TODO: Should this third arg take any arbitrary string
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err.message).to.contain('Invalid obtid');
    }
  });

  it(`missing obtid, expect Error 400`, async () => {
    try {
      let result = await wfio.wrap(custodians[0], 1000);
      expect(result.status).to.equal('OK');
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

  it(`no authority, expect Error 403`, async () => {
    try {
      let result = await wfio.wrap(accounts[13].address, 100, transactionId);
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: revert Only a wFIO oracle may call this function.');
    }
  });

  it(`recipient account does not match prior approvals`, async () => {

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
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('transactionHash').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.contain('account does not match prior approvals');
      let toEndingWfioBal = await wfio.balanceOf(accounts[0].address);
      expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.false;
      expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(0)
    }
  });

  it(`amount does not match prior approvals`, async () => {

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
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.contain('amount does not match prior approvals');
      let fromEndingBal = await accounts[27].getBalance();
      let toEndingWfioBal = await wfio.balanceOf(accounts[0].address);
      expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.false;
      expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(0)
    }
  });
});

describe(`C2. wFIO unwrapping`, () => {

  let fioAccount;
  let fioTransaction;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;
  let TRANSACTIION_ID;

  beforeEach(async () => {
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

  before(async () => {
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

  it(`Unwrap 100 wFIO`, async () => {
    let fromStartingWfioBal = await wfio.balanceOf(accounts[0].address);
    await wfio.connect(accounts[0]).unwrap(fioAccount.address, 100);
    let fromEndingWfioBal = await wfio.balanceOf(accounts[0].address);
    expect(fromStartingWfioBal.gt(fromEndingWfioBal))
    expect(fromEndingWfioBal.toNumber()).to.equal(0);
  });

  // unwrap
  it(`invalid address, expect Error 400`, async () => {
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
      expect(err.message).to.contain('Invalid FIO Address');
    }
  });

  it(`missing address, expect Error 400`, async () => {
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

  it(`invalid tx amount, expect Error 400`, async () => {
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

  it(`missing tx amount, expect Error 400`, async () => {
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

describe(`D. Approval`, () => {

  let fioAccount;
  let fioTransaction;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;
  let TRANSACTIION_ID;

  beforeEach(async () => {
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

  before(async () => {
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

  it(`get approval by obtid`, async () => {
    let result = await wfio.connect(accounts[1]).getApproval(TRANSACTIION_ID);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('object');
    expect(result[1]).to.be.a('string');
    expect(result[2]).to.be.a('object');
  });

  // unhappy path
  it(`invalid obtid`, async () => {
    try {
      await wfio.connect(accounts[1]).getApproval('');
    } catch (err) {
      expect(err.message).to.contain('Invalid obtid');
    }
  });

  it(`missing obtid`, async () => {
    try {
      await wfio.connect(accounts[1]).getApproval();
    } catch (err) {
      expect(err.message).to.contain('missing argument: passed to contract');
    }
  });

});

describe(`E. Pausing`, () => {

  let fioAccount;
  let fioTransaction;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;
  let TRANSACTIION_ID;

  before(async () => {

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

  it(`pause the wFIO contract`, async () => {
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

  it(`non-custodian users should not be able to pause`, async () => {
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

  it(`should not be able to pause when already paused`, async () => {
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

describe(`F. Unpausing`, () => {

  let fioAccount;
  let fioTransaction;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;
  let TRANSACTIION_ID;

  before(async () => {

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

  it(`unpause the wFIO contract`, async () => {
    try {
      await wfio.connect(accounts[1]).unpause();
      // wrapping/unwrapping is prohibited when contract is paused
      await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, TRANSACTIION_ID);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`non-custodian users should not be able to unpause`, async () => {
    await wfio.connect(accounts[1]).pause();
    try {
      await wfio.connect(accounts[0]).unpause();
    } catch (err) {
      expect(err.message).to.contain('Only a wFIO custodian may call this function.');
    } finally {
      await wfio.connect(accounts[1]).unpause();
    }
  });

  it(`should not be able to unpause when already unpaused`, async () => {
    try {
      await wfio.connect(accounts[1]).unpause()
    } catch (err) {
      expect(err.message).to.contain('Pausable: not paused');
    }
  });
});
