const hre = require("hardhat");
const ethers = hre.ethers;
require("@nomiclabs/hardhat-ethers");
require("mocha");
const {expect} = require("chai");
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {newUser, fetchJson, timeout} = require('../utils.js');
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

describe(`************************** fio-erc20.js ************************** \n   A. [ETH] WFIO quick tests`, function () {

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

describe(`B. [ETH] Custodians (get)`, function () {

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
    // expect(result[1]).to.be.a('object').with.property('_hex');
    // expect(result[1]).to.be.a('object').with.property('_isBigNumber');
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
    // expect(result[1]).to.be.a('object').with.property('_hex');
    // expect(result[1]).to.be.a('object').with.property('_isBigNumber');
  });
});

describe(`C. [ETH] Custodians (register)`, function () {

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

  // unhappy paths
  it(`register custodian with an invalid eth address, expect Error 400 `, async function () {
    try {
      let result = await wfio.connect(accounts[1]).regcust('0x0')
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
      await wfio.connect(accounts[1]).regcust();
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
      let result = await wfio.connect(accounts[26]).regcust(accounts[28].address);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal(`VM Exception while processing transaction: reverted with reason string \'AccessControl: account ${accounts[26].address.toString().toLowerCase()} is missing role 0xe28434228950b641dbbc0178de89daa359a87c6ee0d8399aeace52a98fe902b9\'`);
    }
  });

  it(`register custodian with an already-registered eth address, expect Error 400 `, async function () {
    try {
      let result = await wfio.connect(accounts[1]).regcust(accounts[2].address);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal(`VM Exception while processing transaction: reverted with reason string \'Already registered\'`);
    }
  });
});

describe(`D. [ETH] Custodians (unregister)`, function () {

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
      await wfio.connect(accounts[1]).unregcust()
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
      await wfio.connect(accounts[1]).unregcust('0x0')
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
      await wfio.connect(accounts[26]).unregcust(custodians[1]);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal(`VM Exception while processing transaction: reverted with reason string \'AccessControl: account ${accounts[26].address.toString().toLowerCase()} is missing role 0xe28434228950b641dbbc0178de89daa359a87c6ee0d8399aeace52a98fe902b9\'`);
    }
  });
});

describe(`E. [ETH] Oracles (get)`, function () {

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
    // expect(result[1]).to.be.a('object').with.property('_hex');
    // expect(result[1]).to.be.a('object').with.property('_isBigNumber');
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
      // expect(result[1]).to.be.a('object').with.property('_hex');
      // expect(result[1]).to.be.a('object').with.property('_isBigNumber');
    } catch (err) {
      throw err;
    }
  });
});

describe(`F. [ETH] Oracles (register)`, function () {

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
    // await wfio.connect(accounts[6]).regoracle(accounts[12].address);
    // await wfio.connect(accounts[5]).regoracle(accounts[12].address);
    // await wfio.connect(accounts[2]).regoracle(accounts[12].address);
    // await wfio.connect(accounts[3]).regoracle(accounts[12].address);
    // await wfio.connect(accounts[4]).regoracle(accounts[12].address);
    // await wfio.connect(accounts[1]).regoracle(accounts[12].address);
    // await wfio.connect(accounts[7]).regoracle(accounts[12].address);
  });

  /**
   * c1 > o1
   * c1 > o2
   * c1 > o3
   * c3 > o1
   * c3 > o2
   * c3 > o3
   * c4 > o1
   * c5 > o1
   * c6 > o1
   * c7 > o1
   * c8 > o1
   * c4 > o2
   * c5 > o2
   * c6 > o2
   * c7 > o2
   * c8 > o2
   * c4 > o3
   * c5 > o3
   * c6 > o3
   * c7 > o3
   * c8 > o3
   */

  it(`custodian 1 registers three new oracles`, async function () {
    await wfio.connect(accounts[1]).regoracle(accounts[12].address);
    await wfio.connect(accounts[1]).regoracle(accounts[13].address);
    await wfio.connect(accounts[1]).regoracle(accounts[14].address);
  });

  it(`custodian 3 registers three new oracles`, async function () {
    await wfio.connect(accounts[3]).regoracle(accounts[12].address);
    await wfio.connect(accounts[3]).regoracle(accounts[13].address);
    await wfio.connect(accounts[3]).regoracle(accounts[14].address);
  });

  it(`custodian 4 registers new oracle 1`, async function () {
    await wfio.connect(accounts[4]).regoracle(accounts[12].address);
  });

  it(`custodian 5 registers new oracle 1`, async function () {
    await wfio.connect(accounts[5]).regoracle(accounts[12].address);
  });

  it(`custodian 6 registers new oracle 1`, async function () {
    await wfio.connect(accounts[6]).regoracle(accounts[12].address);
  });

  it(`custodian 7 registers new oracle 1`, async function () {
    await wfio.connect(accounts[7]).regoracle(accounts[12].address);
  });

  it(`custodian 8 registers new oracle 1`, async function () {
    await wfio.connect(accounts[8]).regoracle(accounts[12].address);
  });

  it(`custodian 4 registers new oracle 2`, async function () {
    await wfio.connect(accounts[4]).regoracle(accounts[13].address);
  });

  it(`custodian 5 registers new oracle 2`, async function () {
    await wfio.connect(accounts[5]).regoracle(accounts[13].address);
  });

  it(`custodian 6 registers new oracle 2`, async function () {
    await wfio.connect(accounts[6]).regoracle(accounts[13].address);
  });

  it(`custodian 7 registers new oracle 2`, async function () {
    await wfio.connect(accounts[7]).regoracle(accounts[13].address);
  });

  it(`custodian 8 registers new oracle 2`, async function () {
    await wfio.connect(accounts[8]).regoracle(accounts[13].address);
  });

  it(`custodian 4 registers new oracle 3`, async function () {
    await wfio.connect(accounts[4]).regoracle(accounts[14].address);
  });

  it(`custodian 5 registers new oracle 3`, async function () {
    await wfio.connect(accounts[5]).regoracle(accounts[14].address);
  });

  it(`custodian 6 registers new oracle 3`, async function () {
    await wfio.connect(accounts[6]).regoracle(accounts[14].address);
  });

  it(`custodian 7 registers new oracle 3`, async function () {
    await wfio.connect(accounts[7]).regoracle(accounts[14].address);
  });

  it(`custodian 8 registers new oracle 3`, async function () {
    await wfio.connect(accounts[8]).regoracle(accounts[14].address);
  });

  it(`call getOracles and expect to see all 3 new oracles`, async function () {
    let result = await wfio.getOracles();
    expect(result).to.be.a('array');
    expect(result.length).to.equal(3);
    expect(result).to.contain(accounts[12].address);
    expect(result).to.contain(accounts[13].address);
    expect(result).to.contain(accounts[14].address);
  });

  // unhappy paths
  it(`(oracle already registered) try to register an existing oracle`, async function () {
    try {
      await wfio.connect(accounts[1]).regoracle(accounts[14].address);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Oracle already registered\'');
    }
  });

  it(`call getOracles and expect to see all 3 new oracles`, async function () {
    let result = await wfio.getOracles();
    expect(result).to.be.a('array');
    expect(result.length).to.equal(3);
    expect(result).to.contain(accounts[12].address);
    expect(result).to.contain(accounts[13].address);
    expect(result).to.contain(accounts[14].address);
  });

  it(`register accounts[12] as an oracle a second time, expect Error`, async function () {
    try {
      await wfio.connect(accounts[2]).regoracle(accounts[12].address);
      await wfio.connect(accounts[1]).regoracle(accounts[12].address);
      await wfio.connect(accounts[3]).regoracle(accounts[12].address);
      await wfio.connect(accounts[4]).regoracle(accounts[12].address);
      await wfio.connect(accounts[5]).regoracle(accounts[12].address);
      await wfio.connect(accounts[6]).regoracle(accounts[12].address);
      await wfio.connect(accounts[7]).regoracle(accounts[12].address);
      let result = await wfio.getOracle(accounts[12].address);
      expect(result).to.be.a('array');
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Oracle already registered\'');
    }
  });

  it(`register accounts[13] as an oracle a second time, expect Error`, async function () {
    try {
      await wfio.connect(accounts[2]).regoracle(accounts[13].address);
      await wfio.connect(accounts[1]).regoracle(accounts[13].address);
      await wfio.connect(accounts[3]).regoracle(accounts[13].address);
      await wfio.connect(accounts[4]).regoracle(accounts[13].address);
      await wfio.connect(accounts[5]).regoracle(accounts[13].address);
      await wfio.connect(accounts[6]).regoracle(accounts[13].address);
      await wfio.connect(accounts[7]).regoracle(accounts[13].address);
      let result = await wfio.getOracle(accounts[13].address);
      expect(result).to.be.a('array');
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Oracle already registered\'');
    }
  });

  it(`register oracle with an invalid eth address, expect Error 400`, async function () {
    try {
      let result = await wfio.connect(accounts[1]).regoracle('0x0');
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
      let result = await wfio.connect(accounts[1]).regoracle();
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
      await wfio.connect(accounts[26]).regoracle(accounts[18].address);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal(`VM Exception while processing transaction: reverted with reason string \'AccessControl: account ${accounts[26].address.toString().toLowerCase()} is missing role 0xe28434228950b641dbbc0178de89daa359a87c6ee0d8399aeace52a98fe902b9\'`);
    }
  });
});

describe(`G. [ETH] Oracles (unregister)`, function () {
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

  it(`(Minimum 3 oracles required) Try to unregister oracle, expect Error`, async function () {
    try {
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
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Minimum 3 oracles required\'');
    }
  });

  it(`register 3 more oracles`, async function () {
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

    await wfio.connect(accounts[1]).regoracle(accounts[14].address);
    await wfio.connect(accounts[2]).regoracle(accounts[14].address);
    await wfio.connect(accounts[3]).regoracle(accounts[14].address);
    await wfio.connect(accounts[4]).regoracle(accounts[14].address);
    await wfio.connect(accounts[5]).regoracle(accounts[14].address);
    await wfio.connect(accounts[6]).regoracle(accounts[14].address);
    await wfio.connect(accounts[7]).regoracle(accounts[14].address);
    result = await wfio.getOracle(accounts[14].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(true);

    await wfio.connect(accounts[1]).regoracle(accounts[15].address);
    await wfio.connect(accounts[2]).regoracle(accounts[15].address);
    await wfio.connect(accounts[3]).regoracle(accounts[15].address);
    await wfio.connect(accounts[4]).regoracle(accounts[15].address);
    await wfio.connect(accounts[5]).regoracle(accounts[15].address);
    await wfio.connect(accounts[6]).regoracle(accounts[15].address);
    await wfio.connect(accounts[7]).regoracle(accounts[15].address);
    result = await wfio.getOracle(accounts[15].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(true);
  });

  it(`call getOracles and expect to see 3 new oracles`, async function () {
    let result = await wfio.getOracles();
    expect(result).to.be.a('array');
    expect(result.length).to.equal(4);
    expect(result).to.contain(accounts[12].address);
    expect(result).to.contain(accounts[13].address);
    expect(result).to.contain(accounts[14].address);
    expect(result).to.contain(accounts[15].address);
  });

  it(`Try to unregister an oracle, expect OK - minimum 3 oracles met`, async function () {
    let result = await wfio.getOracle(accounts[12].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(true);
    try {
      await wfio.connect(accounts[1]).unregoracle(accounts[12].address);
      await wfio.connect(accounts[2]).unregoracle(accounts[12].address);
      await wfio.connect(accounts[3]).unregoracle(accounts[12].address);
      await wfio.connect(accounts[4]).unregoracle(accounts[12].address);
      await wfio.connect(accounts[5]).unregoracle(accounts[12].address);
      await wfio.connect(accounts[6]).unregoracle(accounts[12].address);
      await wfio.connect(accounts[7]).unregoracle(accounts[12].address);
      result = await wfio.getOracle(accounts[12].address);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('boolean').and.equal(false);
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Minimum 3 oracles required\'');
      throw err;
    }
  });

  // unhappy paths
  it(`unregister a missing ETH address, expect error`, async function () {
    try {
      let result = await wfio.connect(accounts[1]).unregoracle();
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
      let result = await wfio.connect(accounts[1]).unregoracle('0x0');
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
      let result = await wfio.connect(accounts[36]).unregoracle(custodians[0])
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal(`VM Exception while processing transaction: reverted with reason string \'AccessControl: account ${accounts[36].address.toString().toLowerCase()} is missing role 0xe28434228950b641dbbc0178de89daa359a87c6ee0d8399aeace52a98fe902b9\'`);
    }
  });
});

describe(`H. [ETH] (BD-4016) Register and unregister an oracle with different numbers of custodians`, function () {

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

  it(`unregister 3 of 10 custodians`, async function () {
    let result = await wfio.getCustodian(accounts[10].address);
    expect(result[0]).to.be.a('boolean').and.equal(true);

    await wfio.connect(accounts[1]).unregcust(accounts[10].address);
    await wfio.connect(accounts[2]).unregcust(accounts[10].address);
    await wfio.connect(accounts[3]).unregcust(accounts[10].address);
    await wfio.connect(accounts[4]).unregcust(accounts[10].address);
    await wfio.connect(accounts[5]).unregcust(accounts[10].address);
    await wfio.connect(accounts[6]).unregcust(accounts[10].address);
    await wfio.connect(accounts[7]).unregcust(accounts[10].address);

    result = await wfio.getCustodian(accounts[10].address);
    expect(result[0]).to.be.a('boolean').and.equal(false);

    result = await wfio.getCustodian(accounts[9].address);
    expect(result[0]).to.be.a('boolean').and.equal(true);

    await wfio.connect(accounts[1]).unregcust(accounts[9].address);
    await wfio.connect(accounts[2]).unregcust(accounts[9].address);
    await wfio.connect(accounts[3]).unregcust(accounts[9].address);
    await wfio.connect(accounts[4]).unregcust(accounts[9].address);
    await wfio.connect(accounts[5]).unregcust(accounts[9].address);
    await wfio.connect(accounts[6]).unregcust(accounts[9].address);
    await wfio.connect(accounts[7]).unregcust(accounts[9].address);

    result = await wfio.getCustodian(accounts[9].address);
    expect(result[0]).to.be.a('boolean').and.equal(false);

    result = await wfio.getCustodian(accounts[8].address);
    expect(result[0]).to.be.a('boolean').and.equal(true);

    await wfio.connect(accounts[1]).unregcust(accounts[8].address);
    await wfio.connect(accounts[2]).unregcust(accounts[8].address);
    await wfio.connect(accounts[3]).unregcust(accounts[8].address);
    await wfio.connect(accounts[4]).unregcust(accounts[8].address);
    await wfio.connect(accounts[5]).unregcust(accounts[8].address);
    await wfio.connect(accounts[6]).unregcust(accounts[8].address);

    result = await wfio.getCustodian(accounts[8].address);
    expect(result[0]).to.be.a('boolean').and.equal(false);
  });

  it(`verify only 7 of the original custodians remain`, async function () {
    let count = 0;
    let result;
    for (let c=1; c<accounts.length; c++) {
      result = await wfio.getCustodian(accounts[c].address);
      if (result[0] === true) {
        count++;
      }
    }
    expect(count).to.equal(7);
  });

  it(`call getOracles, expect an empty list`, async function () {
    let result = await wfio.getOracles();
    expect(result).to.be.a('array');
    expect(result).to.be.empty;
  });

  it(`register a new oracle with three fewer custodians`, async function () {
    await wfio.connect(accounts[1]).regoracle(accounts[11].address);
    await wfio.connect(accounts[2]).regoracle(accounts[11].address);
    await wfio.connect(accounts[3]).regoracle(accounts[11].address);
    await wfio.connect(accounts[4]).regoracle(accounts[11].address);
    await wfio.connect(accounts[5]).regoracle(accounts[11].address);
    // await wfio.connect(accounts[6]).regoracle(accounts[11].address);
    // await wfio.connect(accounts[7]).regoracle(accounts[11].address);
    let result = await wfio.getOracle(accounts[11].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(true);
    // expect(result[1]).to.be.a('object').with.property('_hex');
    // expect(result[1]).to.be.a('object').with.property('_isBigNumber');
  });

  it(`call getOracles, expect a single oracle in the list`, async function () {
    let result = await wfio.getOracles();
    expect(result).to.be.a('array');
    expect(result.length).to.equal(1);
    expect(result).to.contain(accounts[11].address);
  });

  it(`register three new custodians`, async function () {
    let result;

    result = await wfio.getCustodian(accounts[18].address);
    expect(result[0]).to.be.a('boolean').and.equal(false);

    await wfio.connect(accounts[1]).regcust(accounts[18].address);
    await wfio.connect(accounts[2]).regcust(accounts[18].address);
    await wfio.connect(accounts[3]).regcust(accounts[18].address);
    await wfio.connect(accounts[4]).regcust(accounts[18].address);
    await wfio.connect(accounts[5]).regcust(accounts[18].address);
    // await wfio.connect(accounts[6]).regcust(accounts[18].address);
    // await wfio.connect(accounts[7]).regcust(accounts[18].address);
    result = await wfio.getCustodian(accounts[18].address);
    expect(result[0]).to.be.a('boolean').and.equal(true);

    result = await wfio.getCustodian(accounts[19].address);
    expect(result[0]).to.be.a('boolean').and.equal(false);

    await wfio.connect(accounts[1]).regcust(accounts[19].address);
    await wfio.connect(accounts[2]).regcust(accounts[19].address);
    await wfio.connect(accounts[3]).regcust(accounts[19].address);
    await wfio.connect(accounts[4]).regcust(accounts[19].address);
    await wfio.connect(accounts[5]).regcust(accounts[19].address);
    await wfio.connect(accounts[6]).regcust(accounts[19].address);
    // await wfio.connect(accounts[7]).regcust(accounts[19].address);
    result = await wfio.getCustodian(accounts[19].address);
    expect(result[0]).to.be.a('boolean').and.equal(true);

    result = await wfio.getCustodian(accounts[20].address);
    expect(result[0]).to.be.a('boolean').and.equal(false);

    await wfio.connect(accounts[1]).regcust(accounts[20].address);
    await wfio.connect(accounts[2]).regcust(accounts[20].address);
    await wfio.connect(accounts[3]).regcust(accounts[20].address);
    await wfio.connect(accounts[4]).regcust(accounts[20].address);
    await wfio.connect(accounts[5]).regcust(accounts[20].address);
    await wfio.connect(accounts[6]).regcust(accounts[20].address);
    await wfio.connect(accounts[7]).regcust(accounts[20].address);
    result = await wfio.getCustodian(accounts[20].address);
    expect(result[0]).to.be.a('boolean').and.equal(true);
  });

  it(`verify the 3 new custodians`, async function () {
    let count = 0;
    let result;
    for (let c = 1; c < accounts.length; c++) {
      result = await wfio.getCustodian(accounts[c].address);
      if (result[0] === true) {
        count++;
      }
    }
    expect(count).to.equal(10);
  });

  it(`(minimum 3 oracles required) new custodian tries to unregister an oracle, expect error`, async function () {
    try {
      await wfio.connect(accounts[18]).unregoracle(accounts[11].address);
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Minimum 3 oracles required\'');
    }
  });
});

describe(`I. [ETH] (BD-4016) Register a new oracle with more custodians designated`, function () {

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

  it(`register 10 new custodians`, async function () {
    let totalCustCount = custodians.length;
    let newCust;
    expect(totalCustCount).to.equal(10);

    // time to get it working one loop at a time, i guess, then refactor.....
    // first iteration of ten
    for (let a = 0; a < custodians.length; a++) {
      try {
        await wfio.connect(accounts[a + 1]).regcust(accounts[11].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await wfio.getCustodian(accounts[11].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[11].address);

    for (let a = 0; a < custodians.length; a++) {
      try {
        await wfio.connect(accounts[a + 1]).regcust(accounts[12].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await wfio.getCustodian(accounts[12].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[12].address);

    for (let a = 0; a < custodians.length; a++) {
      try {
        await wfio.connect(accounts[a + 1]).regcust(accounts[13].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await wfio.getCustodian(accounts[13].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[13].address);

    for (let a = 0; a < custodians.length; a++) {
      try {
        await wfio.connect(accounts[a + 1]).regcust(accounts[14].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await wfio.getCustodian(accounts[14].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[14].address);

    for (let a = 0; a < custodians.length; a++) {
      try {
        await wfio.connect(accounts[a + 1]).regcust(accounts[15].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await wfio.getCustodian(accounts[15].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[15].address);

    for (let a = 0; a < custodians.length; a++) {
      try {
        await wfio.connect(accounts[a + 1]).regcust(accounts[16].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await wfio.getCustodian(accounts[16].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[16].address);

    for (let a = 0; a < custodians.length; a++) {
      try {
        await wfio.connect(accounts[a + 1]).regcust(accounts[17].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await wfio.getCustodian(accounts[17].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[17].address);

    for (let a = 0; a < custodians.length; a++) {
      try {
        await wfio.connect(accounts[a + 1]).regcust(accounts[18].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await wfio.getCustodian(accounts[18].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[18].address);

    for (let a = 0; a < custodians.length; a++) {
      try {
        await wfio.connect(accounts[a + 1]).regcust(accounts[19].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await wfio.getCustodian(accounts[19].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[19].address);

    for (let a = 0; a < custodians.length; a++) {
      try {
        await wfio.connect(accounts[a + 1]).regcust(accounts[20].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await wfio.getCustodian(accounts[20].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[20].address);

    totalCustCount = custodians.length
    expect(totalCustCount).to.equal(20);
  });

  it(`call getOracles, expect an empty list`, async function () {
    let result = await wfio.getOracles();
    expect(result).to.be.a('array');
    expect(result).to.be.empty;
  });

  it(`register 1 new oracle`, async function () {
    for (let a = 0; a < custodians.length; a++) {
      try {
        await wfio.connect(accounts[a + 1]).regoracle(accounts[21].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Oracle already registered\'');
        expect(a).to.equal(14);
        console.log(`registered 1 new oracle with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
  });

  it(`call getOracles, expect to see 1 new oracle`, async function () {
    let result = await wfio.getOracles();
    expect(result).to.be.a('array');
    expect(result.length).to.equal(1);
    expect(result).to.contain(accounts[21].address);
  });
});

describe(`J. [ETH] wFIO wrapping`, function () {

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
      amount: 100000000000,
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

    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100000000000, transactionId);
    try {
      let result = await wfio.connect(accounts[14]).wrap(accounts[0].address, 100000000000, transactionId);
      let fromEndingBal = await accounts[14].getBalance();
      let toEndingWfioBal = await wfio.balanceOf(accounts[0].address);
      expect(result.from).to.equal(accounts[14].address);
      expect(result.to).to.equal(wfio.address);
      expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
      expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.true;
      expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(100000000000)
    } catch (err) {
      throw err;
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

    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[14]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[15]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[16]).wrap(accounts[0].address, 100000000000, transactionId);
    try {
      let result = await wfio.connect(accounts[17]).wrap(accounts[0].address, 100000000000, transactionId);
      let fromEndingBal = await accounts[17].getBalance();
      let toEndingWfioBal = await wfio.balanceOf(accounts[0].address);
      expect(result.from).to.equal(accounts[17].address);
      expect(result.to).to.equal(wfio.address);
      expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
      expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.true;
      expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(100000000000)
    } catch (err) {
      throw err;
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

    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[14]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[15]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[16]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[17]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[18]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[19]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[20]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[21]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[22]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[23]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[24]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[25]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[26]).wrap(accounts[0].address, 100000000000, transactionId);

    try {
      let result = await wfio.connect(accounts[27]).wrap(accounts[0].address, 100000000000, transactionId);
      let fromEndingBal = await accounts[27].getBalance();
      let toEndingWfioBal = await wfio.balanceOf(accounts[0].address);
      expect(result.from).to.equal(accounts[27].address);
      expect(result.to).to.equal(wfio.address);
      expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
      expect(toStartingWfioBal.lt(toEndingWfioBal)).to.be.true;
      expect(toEndingWfioBal.sub(toStartingWfioBal).toNumber()).to.equal(100000000000)
    } catch (err) {
      throw err;
    }
  });

  // unhappy paths
  it(`invalid address, expect Error 400`, async function () {
    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100000000000, transactionId);
    try {
      let result = await wfio.connect(accounts[14]).wrap("donkey", 100000000000, transactionId);
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string').and.equal('network does not support ENS');
      expect(err).to.have.property('code').which.is.a('string').and.equal('UNSUPPORTED_OPERATION');
      expect(err).to.have.property('operation').which.is.a('string').and.equal('getResolver');

      // expect(err).to.have.property('reason').which.is.a('string').and.equal('resolver or addr is not configured for ENS name');
      // expect(err).to.have.property('code').which.is.a('string').and.equal('INVALID_ARGUMENT');

      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
    }
  });

  it(`missing address, expect Error 400`, async function () {
    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100000000000, transactionId);
    try {
      let result = await wfio.connect(accounts[14]).wrap(100000000000, transactionId);
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
    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100000000000, "donkey");
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100000000000, "donkey");
    try {
      let result = await wfio.connect(accounts[14]).wrap(accounts[0].address, 100000000000, 1);
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
      await wfio.connect(accounts[12]).wrap(custodians[0], 1000);
      // expect(result.status).to.equal('OK');
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
      let result = await wfio.connect(accounts[32]).wrap(accounts[13].address, 100000000000, transactionId);
      // expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('Array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string').and.equal(`VM Exception while processing transaction: reverted with reason string \'AccessControl: account ${accounts[32].address.toString().toLowerCase()} is missing role 0x68e79a7bf1e0bc45d0a330c573bc367f9cf464fd326078812f301165fbda4ef1\'`);
    }
  });

  it(`recipient account does not match prior approvals`, async function () {

    let toStartingWfioBal = await wfio.balanceOf(accounts[0].address);

    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[14]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[15]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[16]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[17]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[18]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[19]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[20]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[21]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[22]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[23]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[24]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[25]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[26]).wrap(accounts[0].address, 100000000000, transactionId);

    try {
      let result = await wfio.connect(accounts[27]).wrap(accounts[1].address, 100000000000, transactionId);
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

    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[14]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[15]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[16]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[17]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[18]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[19]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[20]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[21]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[22]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[23]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[24]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[25]).wrap(accounts[0].address, 100000000000, transactionId);
    await wfio.connect(accounts[26]).wrap(accounts[0].address, 100000000000, transactionId);

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

describe(`K. [ETH] wFIO unwrapping`, function () {

  let fioAccount;
  let fioTransaction;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;
  let TRANSACTION_ID;

  beforeEach(async function () {
    let _bal = await wfio.balanceOf(accounts[0].address);
    if ( _bal.lt(100000000000)) {
      fioTransaction = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: fioAccount.publicKey,
        amount: 100000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      TRANSACTION_ID = fioTransaction.transaction_id;

      await wfio.connect(accounts[12]).wrap(accounts[0].address, 100000000000, TRANSACTION_ID);
      await wfio.connect(accounts[13]).wrap(accounts[0].address, 100000000000, TRANSACTION_ID);
      await wfio.connect(accounts[14]).wrap(accounts[0].address, 100000000000, TRANSACTION_ID);
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
    });
  });

  it(`Unwrap 100 wFIO`, async function () {
    let fromStartingWfioBal = await wfio.balanceOf(accounts[0].address);
    await wfio.connect(accounts[0]).unwrap(fioAccount.address, 100000000000);
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
      await wfio.connect(accounts[0]).unwrap("0x", 100000000000);
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
      await wfio.connect(accounts[0]).unwrap(100000000000);
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

describe(`L. [ETH] Approval`, function () {

  let fioAccount;
  let fioTransaction;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;
  let TRANSACTION_ID = '5efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';
  let approvalEvent;

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

  it(`wrap 1000 wFIO tokens for accounts[15]`,async function () {
    let tx = await wfio.connect(accounts[12]).wrap(accounts[15].address, 1000000000000, TRANSACTION_ID);
    let result = await tx.wait();
    approvalEvent = result.events[0];
  });

  it(`(1 of 3 approvals) get approval by obtid, expect 1 approval`, async function () {
    try {
      let result = await wfio.connect(accounts[1]).getApproval(approvalEvent.args[1]);
      expect(result).to.be.a('array')
      expect(result[0]).to.be.a('number').and.equal(1);
      expect(result[1]).to.be.a('string').and.equal('0x2546BcD3c84621e976D8185a91A922aE77ECEc30');
      expect(result[2]).to.be.a('object');
    } catch (err) {
      throw err;
    }
  });

  it(`wrap 1000 wFIO tokens for accounts[15]`,async function () {
    let tx = await wfio.connect(accounts[13]).wrap(accounts[15].address, 1000000000000, TRANSACTION_ID);
    let result = await tx.wait();
    approvalEvent = result.events[0];
  });

  it(`(2 of 3 approvals) get approval by obtid, expect 2 approvals`, async function () {
    try {
      let result = await wfio.connect(accounts[1]).getApproval(approvalEvent.args[1]);
      expect(result).to.be.a('array')
      expect(result[0]).to.be.a('number').and.equal(2);
      expect(result[1]).to.be.a('string').and.equal('0x2546BcD3c84621e976D8185a91A922aE77ECEc30');
      expect(result[2]).to.be.a('object');
    } catch (err) {
      throw err;
    }
  });

  it(`wrap 1000 wFIO tokens for accounts[15]`,async function () {
    let tx = await wfio.connect(accounts[14]).wrap(accounts[15].address, 1000000000000, TRANSACTION_ID);
    let result = await tx.wait();
    approvalEvent = result.events[0];
  });

  it(`(3 of 3 approvals) get approval by obtid, expect 0 approvals - record has been deleted`, async function () {
    try {
      let result = await wfio.connect(accounts[1]).getApproval(approvalEvent.args[1]);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('number').and.equal(0);
      expect(result[1]).to.be.a('string').and.equal('0x0000000000000000000000000000000000000000');
      expect(result[2]).to.be.a('object');
    } catch (err) {
      throw err;
    }
  });

  it(`try to call regoracle as a new oracle and have 2 oracles approve it`, async function () {
    let tx = await wfio.connect(accounts[1]).regoracle(accounts[32].address);
    let result = await tx.wait();
    approvalEvent = result.events[0];
  });

  it(`(1 approval) get approvals`, async function () {
    try {
      let result = await wfio.connect(accounts[1]).getApproval(approvalEvent.args[1]);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('number').and.equal(1);
      expect(result[1]).to.be.a('string').and.equal('0x86c53Eb85D0B7548fea5C4B4F82b4205C8f6Ac18');
      expect(result[2]).to.be.a('object');
    } catch (err) {
      throw err;
    }
  });

  it(`two other oracles approve`, async function () {
    await wfio.connect(accounts[2]).regoracle(accounts[32].address);
    await wfio.connect(accounts[3]).regoracle(accounts[32].address);
  });

  it(`(3 approvals) get approvals`, async function () {
    try {
      let result = await wfio.connect(accounts[3]).getApproval(approvalEvent.args[1]);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('number').and.equal(3);
      expect(result[1]).to.be.a('string').and.equal('0x86c53Eb85D0B7548fea5C4B4F82b4205C8f6Ac18');
      expect(result[2]).to.be.a('object');
    } catch (err) {
      throw err;
    }
  });

  it(`try to call regcust as an oracle and have the other oracles approve it`, async function () {
    let tx1 = await wfio.connect(accounts[1]).regcust(accounts[33].address);
    let result1 = await tx1.wait();
    approvalEvent = result1.events[0];

    try {
      let result = await wfio.connect(accounts[1]).getApproval(approvalEvent.args[1]);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('number').and.equal(1);
      expect(result[1]).to.be.a('string').and.equal('0x1aac82773CB722166D7dA0d5b0FA35B0307dD99D');
      expect(result[2]).to.be.a('object');
    } catch (err) {
      throw err;
    }

    await wfio.connect(accounts[2]).regcust(accounts[33].address);
    await wfio.connect(accounts[3]).regcust(accounts[33].address);
    await wfio.connect(accounts[4]).regcust(accounts[33].address);
    await wfio.connect(accounts[5]).regcust(accounts[33].address);
    await wfio.connect(accounts[6]).regcust(accounts[33].address);
    await wfio.connect(accounts[7]).regcust(accounts[33].address);

    try {
      await wfio.connect(accounts[8]).regcust(accounts[33].address);
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
    }
  });

  it(`get approval by obtid, expect 7 approvals`, async function () {
    try {
      let result = await wfio.connect(accounts[7]).getApproval(approvalEvent.args[1]);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('number').and.equal(7);
      expect(result[1]).to.be.a('string').and.equal('0x1aac82773CB722166D7dA0d5b0FA35B0307dD99D');
      expect(result[2]).to.be.a('object');
    } catch (err) {
      throw err;
    }
  });

  it(`try to call unregcust as a new oracle and have 5 oracles approve it, but expect to unregister after 3 and error on the 4th attempt`, async function () {
    let tx = await wfio.connect(accounts[1]).unregcust(accounts[33].address);
    let result = await tx.wait();
    approvalEvent = result.events[0];

    await wfio.connect(accounts[2]).unregcust(accounts[33].address);
    await wfio.connect(accounts[3]).unregcust(accounts[33].address);

    try {
      let result = await wfio.connect(accounts[3]).getApproval(approvalEvent.args[1]);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('number').and.equal(3);
      expect(result[1]).to.be.a('string').and.equal('0x1aac82773CB722166D7dA0d5b0FA35B0307dD99D');
      expect(result[2]).to.be.a('object');
    } catch (err) {
      throw err;
    }

    await wfio.connect(accounts[4]).unregcust(accounts[33].address);
    await wfio.connect(accounts[5]).unregcust(accounts[33].address);
    await wfio.connect(accounts[6]).unregcust(accounts[33].address);
    await wfio.connect(accounts[7]).unregcust(accounts[33].address);
    await wfio.connect(accounts[8]).unregcust(accounts[33].address);

    try {
      tx = await wfio.connect(accounts[9]).unregcust(accounts[33].address);
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Custodian not registered\'');
    }
  });

  it(`get approval by obtid, expect 8 approvals`, async function () {
    try {
      let result = await wfio.connect(accounts[9]).getApproval(approvalEvent.args[1]);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('number').and.equal(8);
      expect(result[1]).to.be.a('string').and.equal('0x1aac82773CB722166D7dA0d5b0FA35B0307dD99D');
      expect(result[2]).to.be.a('object');
    } catch (err) {
      throw err;
    }
  });

  // unhappy path
  it(`invalid obtid`, async function () {
    try {
      let result = await wfio.connect(accounts[1]).getApproval('xyz');
    } catch (err) {
      // expect(err.message).to.contain('Invalid obtid');
      expect(err.code).to.equal('INVALID_ARGUMENT');
      expect(err.value).to.equal('xyz');
    }
  });

  it(`empty obtid`, async function () {
    try {
      await wfio.connect(accounts[1]).getApproval('');
    } catch (err) {
      expect(err.code).to.equal('INVALID_ARGUMENT');
      expect(err.value).to.equal('');
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

describe(`M. [ETH] Pausing`, function () {

  let fioAccount;
  let fioTransaction;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;
  let TRANSACTION_ID;

  before(async function () {

    fioAccount = await newUser(faucet);
    fioTransaction = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: fioAccount.publicKey,
      amount: 100000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    TRANSACTION_ID = fioTransaction.transaction_id;
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

  it(`non-custodian users should not be able to pause`, async function () {
    try {
      await wfio.connect(accounts[0]).pause()
    } catch (err) {
      expect(err.message).to.contain(`VM Exception while processing transaction: reverted with reason string 'AccessControl: account ${accounts[0].address.toString().toLowerCase()} is missing role 0xe28434228950b641dbbc0178de89daa359a87c6ee0d8399aeace52a98fe902b9'`);
    }

    try {
      await wfio.connect(owner).pause()
    } catch (err) {
      expect(err.message).to.contain(`VM Exception while processing transaction: reverted with reason string 'AccessControl: account ${owner.address.toString().toLowerCase()} is missing role 0xe28434228950b641dbbc0178de89daa359a87c6ee0d8399aeace52a98fe902b9'`);
    }

    try {
      await wfio.connect(accounts[14]).pause()
    } catch (err) {
      expect(err.message).to.contain(`VM Exception while processing transaction: reverted with reason string 'AccessControl: account ${accounts[14].address.toString().toLowerCase()} is missing role 0xe28434228950b641dbbc0178de89daa359a87c6ee0d8399aeace52a98fe902b9'`);
    }
  });

  it(`pause the wFIO contract`, async function () {
    try {
      await wfio.connect(accounts[1]).pause();
    } catch (err) {
      throw err;
    }
  });

  it(`should not be able to pause when already paused`, async function () {
    try {
      await wfio.connect(accounts[1]).pause();
    } catch (err) {
      expect(err.message).to.contain('Pausable: paused');
    }
  });

  it(`should not be able to wrap tokens when paused`, async function () {
    try {
      // wrapping/unwrapping is prohibited when contract is paused
      await wfio.connect(accounts[12]).wrap(accounts[0].address, 100000000000, TRANSACTION_ID);
    } catch (err) {
      expect(err.message).to.contain('Pausable: paused');
    }
  });

  it(`should not be able to unwrap when paused`, async function () {
    try {
      // wrapping/unwrapping is prohibited when contract is paused
      await wfio.connect(accounts[12]).unwrap(accounts[0].address, 100000000000);
    } catch (err) {
      expect(err.message).to.contain('Pausable: paused');
    }
  });
});

describe(`N. [ETH] Unpausing`, function () {

  let fioAccount;
  let fioTransaction;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;
  let transactionId = '5efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';

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

  it(`non-custodian users should not be able to unpause`, async function () {
    try {
      await wfio.connect(accounts[0]).unpause();
    } catch (err) {
      expect(err.message).to.contain(`VM Exception while processing transaction: reverted with reason string 'AccessControl: account ${accounts[0].address.toString().toLowerCase()} is missing role 0xe28434228950b641dbbc0178de89daa359a87c6ee0d8399aeace52a98fe902b9'`);
    }
  });

  it(`unpause the wFIO contract`, async function () {
    try {
      await wfio.connect(accounts[1]).unpause();
    } catch (err) {
      throw err;
    }
  });

  it(`should not be able to unpause when already unpaused`, async function () {
    try {
      await wfio.connect(accounts[1]).unpause()
    } catch (err) {
      expect(err.message).to.contain('Pausable: not paused');
    }
  });

  it(`should now be able to wrap tokens when unpaused`, async function () {
    try {
      // wrapping/unwrapping is prohibited only when contract is paused
      await wfio.connect(accounts[12]).wrap(accounts[0].address, 100000000000, transactionId);
    } catch (err) {
      throw err;
    }
  });
});

describe(`O. [ETH] Prevent tokens from being sent to contract address`, function () {

  let fioAccount;
  let owner;
  let accounts;
  let custodians;
  let factory;
  let wfio;
  let fioTransaction;
  let TRANSACTION_ID;
  let wfioReceivedBalPre, wfioReceivedBalPost, fromSentBalPre, fromSentBalPost;

  before(async function () {
    fioAccount = await newUser(faucet);
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

  it(`register 3 oracles`, async function () {
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

  it(`wrap 1000 wFIO tokens for accounts[15]`,async function () {
    let _bal = await wfio.balanceOf(accounts[15].address);
    do {
      fioTransaction = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: fioAccount.publicKey,
        amount: 1000000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      TRANSACTION_ID = fioTransaction.transaction_id;

      await wfio.connect(accounts[12]).wrap(accounts[15].address, 1000000000000, TRANSACTION_ID);
      await wfio.connect(accounts[13]).wrap(accounts[15].address, 1000000000000, TRANSACTION_ID);
      await wfio.connect(accounts[14]).wrap(accounts[15].address, 1000000000000, TRANSACTION_ID);
      _bal = await wfio.balanceOf(accounts[15].address);
    } while ( _bal.lt(100000000000));
    console.log(`[DBG-account-15] wFIO wrapped: ${ethers.BigNumber.from(_bal).toString()}`);
  });

  it(`    wait`, async function () { await timeout(3000); });

  it(`wrap another 1000 wFIO tokens, this time for accounts[16]`,async function () {
    let _bal = await wfio.balanceOf(accounts[16].address);
    do {
      fioTransaction = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: fioAccount.publicKey,
        amount: 1000000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      TRANSACTION_ID = fioTransaction.transaction_id;

      await wfio.connect(accounts[12]).wrap(accounts[16].address, 1000000000000, TRANSACTION_ID);
      await wfio.connect(accounts[13]).wrap(accounts[16].address, 1000000000000, TRANSACTION_ID);
      await wfio.connect(accounts[14]).wrap(accounts[16].address, 1000000000000, TRANSACTION_ID);
      _bal = await wfio.balanceOf(accounts[16].address);
    } while ( _bal.lt(100000000000));
    console.log(`[DBG-account-16] wFIO wrapped: ${ethers.BigNumber.from(_bal).toString()}`);
  });

  it(`[test 1] pre transfer attempt balance display`, async function () {
    fromSentBalPre =  await accounts[15].getBalance();
    wfioReceivedBalPre = await wfio.balanceOf(wfio.address);
    fromSentBalPre = ethers.BigNumber.from(fromSentBalPre).toString();
    wfioReceivedBalPre = ethers.BigNumber.from(wfioReceivedBalPre).toString();
    console.log(`[DBG-pre-transfer] senderBal: ${fromSentBalPre} wfioBal: ${wfioReceivedBalPre}`);
  });

  it(`[test 1] (expect Error: Transaction reverted) try to send eth to the WFIO contract using the builtin Hardhat sendTransaction`, async function () {
    try {
      let result = await accounts[15].sendTransaction({
        to: wfio.address,
        value: ethers.utils.parseEther("1.0"), // Sends exactly 1.0 ether
      });
      expect(result).to.not.have.property('hash');
    } catch (err) {
      expect(err.message).to.contain('Transaction reverted');
    }
  });

  it(`[test 1] post transfer attempt balance display, WFIO eth balance should stay the same`, async function () {
    fromSentBalPost = await accounts[15].getBalance();
    wfioReceivedBalPost = await wfio.balanceOf(wfio.address);
    fromSentBalPost = ethers.BigNumber.from(fromSentBalPost).toString();
    wfioReceivedBalPost = ethers.BigNumber.from(wfioReceivedBalPost).toString();
    console.log(`[DBG-post-transfer] senderBal: ${fromSentBalPost} wfioBal: ${wfioReceivedBalPost}`);
    expect(fromSentBalPost).to.equal(fromSentBalPre);
    expect(wfioReceivedBalPost).to.equal(wfioReceivedBalPre);
    fromSentBalPre = await wfio.balanceOf(accounts[15].address);
    fromSentBalPre = ethers.BigNumber.from(fromSentBalPre).toString();
    wfioReceivedBalPre = wfioReceivedBalPost;
  });

  it(`[test 2] (expect transaction to be reverted: contract cannot receive tokens) try to send wFIO to the WFIO contract using wfio.trasnsfer`, async function () {
    try {
      let result = await wfio.connect(accounts[15]).transfer(wfio.address, 630000000000);
      expect(result).to.not.have.property('hash');
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Contract cannot receive tokens\'');
    }
  });

  it(`[test 2] post transfer attempt balance display, wfioBal should stay the same`, async function () {
    fromSentBalPost =  await wfio.balanceOf(accounts[15].address);//await accounts[15].getBalance();
    wfioReceivedBalPost = await wfio.balanceOf(wfio.address);
    fromSentBalPost = ethers.BigNumber.from(fromSentBalPost).toString();
    wfioReceivedBalPost = ethers.BigNumber.from(wfioReceivedBalPost).toString();
    console.log(`[DBG-post-transfer-2] senderBal: ${fromSentBalPost} wfioBal: ${wfioReceivedBalPost}`);
    expect(fromSentBalPost).to.equal(fromSentBalPre);
    expect(wfioReceivedBalPost).to.equal(wfioReceivedBalPre);
  });

  it(`    wait`, async function () { await timeout(3000); });

  it(`wrap another 1000 wFIO tokens, this time for accounts[17]`,async function () {
    let _bal = await wfio.balanceOf(accounts[17].address);
    do {
      fioTransaction = await faucet.genericAction('transferTokens', {
        payeeFioPublicKey: fioAccount.publicKey,
        amount: 1000000000000,
        maxFee: config.api.transfer_tokens_pub_key.fee,
        technologyProviderId: ''
      })
      TRANSACTION_ID = fioTransaction.transaction_id;

      await wfio.connect(accounts[12]).wrap(accounts[17].address, 1000000000000, TRANSACTION_ID);
      await wfio.connect(accounts[13]).wrap(accounts[17].address, 1000000000000, TRANSACTION_ID);
      await wfio.connect(accounts[14]).wrap(accounts[17].address, 1000000000000, TRANSACTION_ID);
      _bal = await wfio.balanceOf(accounts[17].address);
    } while ( _bal.lt(100000000000));
    console.log(`[DBG-account-17] wFIO wrapped: ${ethers.BigNumber.from(_bal).toString()}`);
  });

  it(`approve transferFrom recipient`, async function () {
    try {
      await wfio.connect(accounts[17]).approve(accounts[17].address, 1000000000000);
    } catch (err) {
      throw err;
    }
  });

  it(`[test 3] pre transfer attempt balance display`, async function () {
    fromSentBalPre =  await wfio.balanceOf(accounts[17].address);//await accounts[17].getBalance();
    wfioReceivedBalPre = await wfio.balanceOf(wfio.address);
    fromSentBalPre = ethers.BigNumber.from(fromSentBalPre).toString();
    wfioReceivedBalPre = ethers.BigNumber.from(wfioReceivedBalPre).toString();
    console.log(`[DBG-pre-transfer-3] senderBal: ${fromSentBalPre} wfioBal: ${wfioReceivedBalPre}`);
  });

  it(`[test 3] (expect transaction to be reverted: contract cannot receive tokens) try to send wFIO to the WFIO contract using wfio.trasnsferFrom`, async function () {
    try {
      let result = await wfio.connect(accounts[17]).transferFrom(accounts[17].address, wfio.address, 260000000000);
      expect(result).to.not.have.property('hash');
    } catch (err) {
      // expect(err.message).to.contain('Transaction reverted');
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Contract cannot receive tokens\'');
    }
  });

  it(`[test 3] post transfer attempt balance display, wfioBal should stay the same`, async function () {
    fromSentBalPost =  await wfio.balanceOf(accounts[17].address);//await accounts[15].getBalance();
    wfioReceivedBalPost = await wfio.balanceOf(wfio.address);
    fromSentBalPost = ethers.BigNumber.from(fromSentBalPost).toString();
    wfioReceivedBalPost = ethers.BigNumber.from(wfioReceivedBalPost).toString();
    console.log(`[DBG-post-transfer-3] senderBal: ${fromSentBalPost} wfioBal: ${wfioReceivedBalPost}`);
    expect(fromSentBalPost).to.equal(fromSentBalPre);
    expect(wfioReceivedBalPost).to.equal(wfioReceivedBalPre);
  });

  it(`[test 4] pre transfer attempt balance display`, async function () {
    // fromSentBalPre =  await wfio.balanceOf(accounts[17].address);//await accounts[17].getBalance();
    wfioReceivedBalPre = await wfio.balanceOf(wfio.address);
    // fromSentBalPre = ethers.BigNumber.from(fromSentBalPre).toString();
    wfioReceivedBalPre = ethers.BigNumber.from(wfioReceivedBalPre).toString();
    console.log(`[DBG-pre-transfer-4] wfioBal: ${wfioReceivedBalPre}`);
  });

  it(`[test 4] wrap another 1000 wFIO tokens, this time to wfio.address directly`,async function () {
    let _bal = await wfio.balanceOf(wfio.address);
    try {
      do {
        fioTransaction = await faucet.genericAction('transferTokens', {
          payeeFioPublicKey: fioAccount.publicKey,
          amount: 1000000000000,
          maxFee: config.api.transfer_tokens_pub_key.fee,
          technologyProviderId: ''
        })
        TRANSACTION_ID = fioTransaction.transaction_id;

        await wfio.connect(accounts[12]).wrap(wfio.address, 1000000000000, TRANSACTION_ID);
        await wfio.connect(accounts[13]).wrap(wfio.address, 1000000000000, TRANSACTION_ID);
        await wfio.connect(accounts[14]).wrap(wfio.address, 1000000000000, TRANSACTION_ID);
        _bal = await wfio.balanceOf(wfio.address);
      } while (_bal.lt(100000000000));
      // console.log(`[DBG-account-wfio] wFIO wrapped: ${ethers.BigNumber.from(_bal).toString()}`);
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Contract cannot receive tokens\'');
    }
  });

  it(`[test 4] post transfer attempt balance display, wfioBal should stay the same`, async function () {
    // fromSentBalPost =  await wfio.balanceOf(accounts[17].address);//await accounts[15].getBalance();
    wfioReceivedBalPost = await wfio.balanceOf(wfio.address);
    // fromSentBalPost = ethers.BigNumber.from(fromSentBalPost).toString();
    wfioReceivedBalPost = ethers.BigNumber.from(wfioReceivedBalPost).toString();
    console.log(`[DBG-post-transfer-4] wfioBal: ${wfioReceivedBalPost}`);
    // expect(fromSentBalPost).to.equal(fromSentBalPre);
    expect(wfioReceivedBalPost).to.equal(wfioReceivedBalPre);
  });
});
