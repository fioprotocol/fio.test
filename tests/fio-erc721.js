const hre = require("hardhat");
const ethers = hre.ethers;
require("@nomiclabs/hardhat-ethers");
require("mocha");
const {expect} = require("chai");
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {newUser, fetchJson, timeout, callFioApiSigned} = require("../utils");
const {setupFIONFTcontract, registerFioNftOracles, registerNewBp, registerNewOracle, setTestOracleFees} = require("./Helpers/wrapping");
let faucet;

before(async function () {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
});

describe(`************************** fio-erc721.js ************************** \n   A. [ETH] FIONFT quick tests`, function () {

  let owner;
  let accounts;
  let custodians;
  let factory;
  let fioNft;

  before(async function () {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
  });

  it("Should deploy the FIONFT token successfully", async function() {
    try {
      factory = await ethers.getContractFactory('FIONFT', owner);
      fioNft = await factory.deploy(custodians);
      await fioNft.deployed();
      expect(fioNft).to.be.a('object');
      expect(fioNft).to.have.property('address').which.is.a('string');
      expect(fioNft).to.have.property('functions').which.is.a('object');
      expect(fioNft.signer.address).to.equal(owner.address);
    } catch (err) {
      throw err;
    }
  });
});

describe(`B. [MATIC] Custodians (get)`, function () {

  let accounts;
  let custodians;
  let owner;
  let factory;
  let fioNft;

  before(async function () {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('FIONFT', owner);
    fioNft = await factory.deploy(custodians);
    await fioNft.deployTransaction.wait();
  });

  it(`get a custodian by address`, async function () {
    let result = await fioNft.getCustodian(custodians[0]);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(true);
    expect(result[1]).to.be.a('object').with.property('_hex');
    expect(result[1]).to.be.a('object').with.property('_isBigNumber');
  });

  // unhappy paths
  it(`invalid address`, async function () {
    try {
      let result = await fioNft.getCustodian('0x0');
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
      let result = await fioNft.getCustodian();
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
    let result = await fioNft.getCustodian(accounts[15].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(false);
    expect(result[1]).to.be.a('object').with.property('_hex');
    expect(result[1]).to.be.a('object').with.property('_isBigNumber');
  });
});

describe(`C. [MATIC] Custodians (register)`, function () {

  let accounts;
  let custodians;
  let owner;
  let factory;
  let fioNft;

  before(async function () {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('FIONFT', owner);
    fioNft = await factory.deploy(custodians);
    await fioNft.deployTransaction.wait();
  });

  it(`register a new custodian`, async function () {
    await fioNft.connect(accounts[1]).regcust(accounts[18].address);
    await fioNft.connect(accounts[2]).regcust(accounts[18].address);
    await fioNft.connect(accounts[3]).regcust(accounts[18].address);
    await fioNft.connect(accounts[4]).regcust(accounts[18].address);
    await fioNft.connect(accounts[5]).regcust(accounts[18].address);
    await fioNft.connect(accounts[6]).regcust(accounts[18].address);
    await fioNft.connect(accounts[7]).regcust(accounts[18].address);
    let result = await fioNft.getCustodian(accounts[18].address);
    expect(result[0]).to.be.a('boolean').and.equal(true);
  });

  // unhappy paths
  it(`register custodian with an invalid eth address, expect Error 400 `, async function () {
    try {
      let result = await fioNft.regcust('0x0')
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
      await fioNft.regcust();
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
      let result = await fioNft.regcust(accounts[18].address);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Only FIONFT custodian can call action.\'');
    }
  });

  it(`register custodian with an already-registered eth address, expect Error 400 `, async function () {
    try {
      let result = await fioNft.connect(accounts[1]).regcust(accounts[2].address);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('transactionHash').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.contain('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
    }
  });
});

describe(`D. [MATIC] Custodians (unregister)`, function () {

  let accounts;
  let custodians;
  let owner;
  let factory;
  let fioNft;

  before(async function () {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('FIONFT', owner);
    fioNft = await factory.deploy(custodians);
    await fioNft.deployTransaction.wait();
  });

  it(`unregister a custodian`, async function () {
    await fioNft.connect(accounts[1]).unregcust(accounts[9].address);
    await fioNft.connect(accounts[2]).unregcust(accounts[9].address);
    await fioNft.connect(accounts[3]).unregcust(accounts[9].address);
    await fioNft.connect(accounts[4]).unregcust(accounts[9].address);
    await fioNft.connect(accounts[5]).unregcust(accounts[9].address);
    await fioNft.connect(accounts[6]).unregcust(accounts[9].address);
    await fioNft.connect(accounts[7]).unregcust(accounts[9].address);
    let result = await fioNft.getCustodian(accounts[9].address);
    expect(result[0]).to.be.a('boolean').and.equal(false);
  });

  // unhappy paths
  it(`unregister a missing ETH address, expect error`, async function () {
    try {
      let result = await fioNft.unregcust()
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
      let result = await fioNft.unregcust('0x0')
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
      let result = await fioNft.unregcust(custodians[0])
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Only FIONFT custodian can call action.\'');
    }
  });
});

describe(`E. [MATIC] Oracles (get)`, function () {

  let accounts;
  let custodians;
  let owner;
  let factory;
  let fioNft;

  before(async function () {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('FIONFT', owner);
    fioNft = await factory.deploy(custodians);
    await fioNft.deployTransaction.wait();
    // register 3 oracles for testing
    await fioNft.connect(accounts[1]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[14].address);
  });

  it(`get list of oracles`, async function () {
    let result = await fioNft.getOracles();
    expect(result).to.be.a('array');
    expect(result.length).to.equal(3);
    expect(result).to.contain(accounts[12].address);
    expect(result).to.contain(accounts[13].address);
    expect(result).to.contain(accounts[14].address);
  });

  it(`get an oracle by address`, async function () {
    let result = await fioNft.getOracle(accounts[12].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(true);
    expect(result[1]).to.be.a('object').with.property('_hex');
    expect(result[1]).to.be.a('object').with.property('_isBigNumber');
  });

  // unhappy paths
  it(`invalid address`, async function () {
    try {
      let result = await fioNft.getOracle('0x0');
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
      let result = await fioNft.getOracle();
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
      let result = await fioNft.getOracle(accounts[15].address);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('boolean').and.equal(false);
      expect(result[1]).to.be.a('object').with.property('_hex');
      expect(result[1]).to.be.a('object').with.property('_isBigNumber');
    } catch (err) {
      throw err;
    }
  });

});

describe(`F. [MATIC] Oracles (register)`, function () {

  let accounts;
  let custodians;
  let owner;
  let factory;
  let fioNft;

  before(async function () {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('FIONFT', owner);
    fioNft = await factory.deploy(custodians);
    await fioNft.deployTransaction.wait();
    // register an oracle for testing
    await fioNft.connect(accounts[1]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[12].address);
  });

  it(`register oracle`, async function () {
    await fioNft.connect(accounts[1]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[13].address);
    let result = await fioNft.getOracle(accounts[13].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(true);
    expect(result[1]).to.be.a('object').with.property('_hex');
    expect(result[1]).to.be.a('object').with.property('_isBigNumber');
  });

  // unhappy paths
  it(`register oracle with an invalid eth address, expect Error 400`, async function () {
    try {
      let result = await fioNft.regoracle('0x0');
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
      let result = await fioNft.regoracle();
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
      let result = await fioNft.regoracle(accounts[18].address);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Only FIONFT custodian can call action.\'');
    }
  });
});

describe(`G. [MATIC] Oracles (unregister)`, function () {
  let accounts;
  let custodians;
  let owner;
  let factory;
  let fioNft;

  before(async function () {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('FIONFT', owner);
    fioNft = await factory.deploy(custodians);
    await fioNft.deployTransaction.wait();
    // register an oracle for testing
    await fioNft.connect(accounts[1]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[12].address);
  });

  it(`Unregister oracle`, async function () {
    await fioNft.connect(accounts[1]).unregoracle(accounts[12].address);
    await fioNft.connect(accounts[2]).unregoracle(accounts[12].address);
    await fioNft.connect(accounts[3]).unregoracle(accounts[12].address);
    await fioNft.connect(accounts[4]).unregoracle(accounts[12].address);
    await fioNft.connect(accounts[5]).unregoracle(accounts[12].address);
    await fioNft.connect(accounts[6]).unregoracle(accounts[12].address);
    await fioNft.connect(accounts[7]).unregoracle(accounts[12].address);
    let result = await fioNft.getOracle(accounts[12].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(false);
  });

  // unhappy paths
  it(`unregister a missing ETH address, expect error`, async function () {
    try {
      let result = await fioNft.unregoracle();
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
      let result = await fioNft.unregoracle('0x0');
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
      let result = await fioNft.unregoracle(custodians[0])
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Only FIONFT custodian can call action.\'');
    }
  });
});

describe(`H. [MATIC] FIONFT wrapping`, function () {

  let accounts;
  let custodians;
  let owner;
  let factory;
  let fioNft;
  let transactionId = '5efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';
  let transactionId2 = '6efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';
  let testDomain = 'test-domain';
  let testDomain2 = 'test-domain-2';

  before(async function () {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('FIONFT', owner);
    fioNft = await factory.deploy(custodians);
    await fioNft.deployTransaction.wait();
    // register 3 oracles for testing
    await fioNft.connect(accounts[1]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[14].address);
  });

  it(`Wrap fioNft`, async function () {
    let fromStartingBal = await accounts[14].getBalance();
    let toStartingfioNftBal = await fioNft.balanceOf(accounts[0].address);

    await fioNft.connect(accounts[12]).wrapnft(accounts[0].address, testDomain, transactionId);
    await fioNft.connect(accounts[13]).wrapnft(accounts[0].address, testDomain, transactionId);
    try {
      let result = await fioNft.connect(accounts[14]).wrapnft(accounts[0].address, testDomain, transactionId);
      let fromEndingBal = await accounts[14].getBalance();
      let toEndingfioNftBal = await fioNft.balanceOf(accounts[0].address);
      expect(result.from).to.equal(accounts[14].address);
      expect(result.to).to.equal(fioNft.address);
      expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
      expect(toStartingfioNftBal.lt(toEndingfioNftBal)).to.be.true;
    } catch (err) {
      throw err;
    }
  });

  it(`Add 3 new oracles and wrap 100 fioNft`, async function () {
    // add 3 new oracles
    await fioNft.connect(accounts[1]).regoracle(accounts[15].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[15].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[15].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[15].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[15].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[15].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[15].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[16].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[16].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[16].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[16].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[16].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[16].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[16].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[17].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[17].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[17].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[17].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[17].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[17].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[17].address);

    await fioNft.connect(accounts[15]).wrapnft(accounts[0].address, testDomain, transactionId);
    await fioNft.connect(accounts[16]).wrapnft(accounts[0].address, testDomain, transactionId);
    try {
      let result = await fioNft.connect(accounts[17]).wrapnft(accounts[0].address, testDomain, transactionId);
      expect(result.from).to.equal(accounts[17].address);
      expect(result.to).to.equal(fioNft.address);
    } catch (err) {
      throw err;
    }
  });

  // it.skip(`Add 10 new oracles and wrap 100 fioNft`, async function () {
  //
  //   // register 10 more new oracles
  //   await fioNft.connect(accounts[1]).regoracle(accounts[18].address);
  //   await fioNft.connect(accounts[2]).regoracle(accounts[18].address);
  //   await fioNft.connect(accounts[3]).regoracle(accounts[18].address);
  //   await fioNft.connect(accounts[4]).regoracle(accounts[18].address);
  //   await fioNft.connect(accounts[5]).regoracle(accounts[18].address);
  //   await fioNft.connect(accounts[6]).regoracle(accounts[18].address);
  //   await fioNft.connect(accounts[7]).regoracle(accounts[18].address);
  //   await fioNft.connect(accounts[1]).regoracle(accounts[19].address);
  //   await fioNft.connect(accounts[2]).regoracle(accounts[19].address);
  //   await fioNft.connect(accounts[3]).regoracle(accounts[19].address);
  //   await fioNft.connect(accounts[4]).regoracle(accounts[19].address);
  //   await fioNft.connect(accounts[5]).regoracle(accounts[19].address);
  //   await fioNft.connect(accounts[6]).regoracle(accounts[19].address);
  //   await fioNft.connect(accounts[7]).regoracle(accounts[19].address);
  //   await fioNft.connect(accounts[1]).regoracle(accounts[20].address);
  //   await fioNft.connect(accounts[2]).regoracle(accounts[20].address);
  //   await fioNft.connect(accounts[3]).regoracle(accounts[20].address);
  //   await fioNft.connect(accounts[4]).regoracle(accounts[20].address);
  //   await fioNft.connect(accounts[5]).regoracle(accounts[20].address);
  //   await fioNft.connect(accounts[6]).regoracle(accounts[20].address);
  //   await fioNft.connect(accounts[7]).regoracle(accounts[20].address);
  //   await fioNft.connect(accounts[1]).regoracle(accounts[21].address);
  //   await fioNft.connect(accounts[2]).regoracle(accounts[21].address);
  //   await fioNft.connect(accounts[3]).regoracle(accounts[21].address);
  //   await fioNft.connect(accounts[4]).regoracle(accounts[21].address);
  //   await fioNft.connect(accounts[5]).regoracle(accounts[21].address);
  //   await fioNft.connect(accounts[6]).regoracle(accounts[21].address);
  //   await fioNft.connect(accounts[7]).regoracle(accounts[21].address);
  //   await fioNft.connect(accounts[1]).regoracle(accounts[22].address);
  //   await fioNft.connect(accounts[2]).regoracle(accounts[22].address);
  //   await fioNft.connect(accounts[3]).regoracle(accounts[22].address);
  //   await fioNft.connect(accounts[4]).regoracle(accounts[22].address);
  //   await fioNft.connect(accounts[5]).regoracle(accounts[22].address);
  //   await fioNft.connect(accounts[6]).regoracle(accounts[22].address);
  //   await fioNft.connect(accounts[7]).regoracle(accounts[22].address);
  //   await fioNft.connect(accounts[1]).regoracle(accounts[23].address);
  //   await fioNft.connect(accounts[2]).regoracle(accounts[23].address);
  //   await fioNft.connect(accounts[3]).regoracle(accounts[23].address);
  //   await fioNft.connect(accounts[4]).regoracle(accounts[23].address);
  //   await fioNft.connect(accounts[5]).regoracle(accounts[23].address);
  //   await fioNft.connect(accounts[6]).regoracle(accounts[23].address);
  //   await fioNft.connect(accounts[7]).regoracle(accounts[23].address);
  //   await fioNft.connect(accounts[1]).regoracle(accounts[24].address);
  //   await fioNft.connect(accounts[2]).regoracle(accounts[24].address);
  //   await fioNft.connect(accounts[3]).regoracle(accounts[24].address);
  //   await fioNft.connect(accounts[4]).regoracle(accounts[24].address);
  //   await fioNft.connect(accounts[5]).regoracle(accounts[24].address);
  //   await fioNft.connect(accounts[6]).regoracle(accounts[24].address);
  //   await fioNft.connect(accounts[7]).regoracle(accounts[24].address);
  //   await fioNft.connect(accounts[1]).regoracle(accounts[25].address);
  //   await fioNft.connect(accounts[2]).regoracle(accounts[25].address);
  //   await fioNft.connect(accounts[3]).regoracle(accounts[25].address);
  //   await fioNft.connect(accounts[4]).regoracle(accounts[25].address);
  //   await fioNft.connect(accounts[5]).regoracle(accounts[25].address);
  //   await fioNft.connect(accounts[6]).regoracle(accounts[25].address);
  //   await fioNft.connect(accounts[7]).regoracle(accounts[25].address);
  //   await fioNft.connect(accounts[1]).regoracle(accounts[26].address);
  //   await fioNft.connect(accounts[2]).regoracle(accounts[26].address);
  //   await fioNft.connect(accounts[3]).regoracle(accounts[26].address);
  //   await fioNft.connect(accounts[4]).regoracle(accounts[26].address);
  //   await fioNft.connect(accounts[5]).regoracle(accounts[26].address);
  //   await fioNft.connect(accounts[6]).regoracle(accounts[26].address);
  //   await fioNft.connect(accounts[7]).regoracle(accounts[26].address);
  //   await fioNft.connect(accounts[1]).regoracle(accounts[27].address);
  //   await fioNft.connect(accounts[2]).regoracle(accounts[27].address);
  //   await fioNft.connect(accounts[3]).regoracle(accounts[27].address);
  //   await fioNft.connect(accounts[4]).regoracle(accounts[27].address);
  //   await fioNft.connect(accounts[5]).regoracle(accounts[27].address);
  //   await fioNft.connect(accounts[6]).regoracle(accounts[27].address);
  //   await fioNft.connect(accounts[7]).regoracle(accounts[27].address);
  //
  //   let fromStartingBal = await accounts[27].getBalance();
  //   let toStartingfioNftBal = await fioNft.balanceOf(accounts[0].address);
  //
  //   await fioNft.connect(accounts[12]).wrapnft(accounts[0].address, testDomain, transactionId);
  //   await fioNft.connect(accounts[13]).wrapnft(accounts[0].address, testDomain, transactionId);
  //   await fioNft.connect(accounts[14]).wrapnft(accounts[0].address, testDomain, transactionId);
  //   await fioNft.connect(accounts[15]).wrapnft(accounts[0].address, testDomain, transactionId);
  //   await fioNft.connect(accounts[16]).wrapnft(accounts[0].address, testDomain, transactionId);
  //   await fioNft.connect(accounts[17]).wrapnft(accounts[0].address, testDomain, transactionId);
  //   await fioNft.connect(accounts[18]).wrapnft(accounts[0].address, testDomain, transactionId);
  //   await fioNft.connect(accounts[19]).wrapnft(accounts[0].address, testDomain, transactionId);
  //   await fioNft.connect(accounts[20]).wrapnft(accounts[0].address, testDomain, transactionId);
  //   await fioNft.connect(accounts[21]).wrapnft(accounts[0].address, testDomain, transactionId);
  //   await fioNft.connect(accounts[22]).wrapnft(accounts[0].address, testDomain, transactionId);
  //   await fioNft.connect(accounts[23]).wrapnft(accounts[0].address, testDomain, transactionId);
  //   await fioNft.connect(accounts[24]).wrapnft(accounts[0].address, testDomain, transactionId);
  //   await fioNft.connect(accounts[25]).wrapnft(accounts[0].address, testDomain, transactionId);
  //   await fioNft.connect(accounts[26]).wrapnft(accounts[0].address, testDomain, transactionId);
  //
  //   try {
  //     let result = await fioNft.connect(accounts[27]).wrapnft(accounts[0].address, testDomain, transactionId);
  //     let fromEndingBal = await accounts[27].getBalance();
  //     let toEndingfioNftBal = await fioNft.balanceOf(accounts[0].address);
  //     expect(result.from).to.equal(accounts[27].address);
  //     expect(result.to).to.equal(fioNft.address);
  //     expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
  //     expect(toStartingfioNftBal.lt(toEndingfioNftBal)).to.be.true;
  //     expect(toEndingfioNftBal.sub(toStartingfioNftBal).toNumber()).to.equal(100000000000)
  //   } catch (err) {
  //     throw err;
  //   }
  // });

  // unhappy paths
  it(`invalid address, expect Error 400`, async function () {
    try {
      let result = await fioNft.connect(accounts[14]).wrapnft("donkey", testDomain, transactionId);
      expect(result).to.be.undefined;
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string').and.equal('network does not support ENS');
      expect(err).to.have.property('code').which.is.a('string').and.equal('UNSUPPORTED_OPERATION');
      expect(err).to.have.property('operation').which.is.a('string').and.equal('getResolver');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
    }
  });

  it(`missing address, expect Error 400`, async function () {
    try {
      let result = await fioNft.connect(accounts[14]).wrapnft(testDomain, transactionId);
      expect(result).to.be.undefined;
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string').and.equal('missing argument: passed to contract');
      expect(err).to.have.property('code').which.is.a('string').and.equal('MISSING_ARGUMENT');
      expect(err).to.have.property('count').which.is.a('number').and.equal(2);
      expect(err).to.have.property('expectedCount').which.is.a('number').and.equal(3);
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
    }
  });

  it(`empty domain, expect Error 400`, async function () {
    try {
      let result = await fioNft.connect(accounts[14]).wrapnft(accounts[0].address, '', transactionId);
      expect(result).to.be.undefined;
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('transactionHash').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string').and.equals('VM Exception while processing transaction: reverted with reason string \'Invalid domain\'');
    }
  });

  it(`missing domain, expect Error 400`, async function () {
    try {
      let result = await fioNft.connect(accounts[14]).wrapnft(accounts[0].address, transactionId);
      expect(result).to.be.undefined;
    } catch (err) {
      expect(err).to.have.property('reason').which.is.a('string').and.equal('missing argument: passed to contract');
      expect(err).to.have.property('code').which.is.a('string').and.equal('MISSING_ARGUMENT');
      expect(err).to.have.property('count').which.is.a('number').and.equal(2);
      expect(err).to.have.property('expectedCount').which.is.a('number').and.equal(3);
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
    }
  });

  it(`empty obtid, expect Error 400`, async function () {
    try {
      let result = await fioNft.connect(accounts[14]).wrapnft(accounts[0].address, testDomain, '');
      expect(result).to.be.undefined;
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('Array');
      expect(err).to.have.property('message').which.is.a('string').and.contain('Invalid obtid');
      expect(err).to.have.property('transactionHash').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
    }
  });

  it(`missing obtid, expect Error 400`, async function () {
    try {
      let result = await fioNft.connect(accounts[14]).wrapnft(accounts[0].address, testDomain);
      expect(result).to.be.undefined;
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
      let result = await fioNft.wrapnft(accounts[13].address, testDomain, transactionId);
      expect(result).to.be.undefined;
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('Array');
      expect(err).to.have.property('transactionHash').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string').and.equal('VM Exception while processing transaction: reverted with reason string \'Only FIONFT oracle can call action.\'');
    }
  });
});

describe(`I. [MATIC] wrapping mismatched accounts and domains`, function () {

  let accounts;
  let custodians;
  let owner;
  let factory;
  let fioNft;
  let transactionId = '5efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';
  let transactionId2 = '6efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';
  let testDomain = 'test-domain';
  let testDomain2 = 'test-domain-2';

  before(async function () {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('FIONFT', owner);
    fioNft = await factory.deploy(custodians);
    await fioNft.deployTransaction.wait();
    // register 3 oracles for testing
    await fioNft.connect(accounts[1]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[14].address);
  });

  it(`recipient account does not match prior approvals`, async function () {
    await fioNft.connect(accounts[12]).wrapnft(accounts[0].address, testDomain, transactionId);
    await fioNft.connect(accounts[13]).wrapnft(accounts[0].address, testDomain, transactionId);
    try {
      let result = await fioNft.connect(accounts[14]).wrapnft(accounts[8].address, testDomain, transactionId);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('Array');
      expect(err).to.have.property('transactionHash').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string').and.equal('VM Exception while processing transaction: reverted with reason string \'Account mismatch\'');
    }
  });

  it(`(BUG? this test should fail) domain does not match prior approvals`, async function () {
    await fioNft.connect(accounts[12]).wrapnft(accounts[2].address, testDomain2, transactionId2);
    await fioNft.connect(accounts[13]).wrapnft(accounts[2].address, testDomain2, transactionId2);
    try {
      let result = await fioNft.connect(accounts[14]).wrapnft(accounts[2].address, 'some-nonmatching-test-domain', transactionId2);
      console.log(`[DBG - should not see this] result = ${result.toString()}`);
      throw new Error("SHOULD NOT PASS");
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('transactionHash').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string').and.contain('amount does not match prior approvals');
    }
  });
});

describe(`J. [MATIC] FIONFT unwrapping`, function () {

  let user1;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let fioNft;
  let transactionId = '5efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';
  let transactionId2 = '6efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';
  let testDomain = 'test-domain';
  let testDomain2 = 'test-domain-2';
  let TOKEN_ID;

  before(async function () {
    user1 = await newUser(faucet);

    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('FIONFT', owner);
    fioNft = await factory.deploy(custodians);
    await fioNft.deployTransaction.wait();
    // register 3 oracles for testing
    await fioNft.connect(accounts[1]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[14].address);

    // Wrap a test domain
    let fromStartingBal = await accounts[14].getBalance();
    let toStartingfioNftBal = await fioNft.balanceOf(accounts[0].address);

    await fioNft.connect(accounts[12]).wrapnft(accounts[0].address, testDomain, transactionId);
    await fioNft.connect(accounts[13]).wrapnft(accounts[0].address, testDomain, transactionId);

    try {
      let result = await fioNft.connect(accounts[14]).wrapnft(accounts[0].address, testDomain, transactionId);

      // cannot figure out how to get JUST this return value from the hardhat promise, so I'm setting it here because I know what it is for this block...
      TOKEN_ID = 1;

      let fromEndingBal = await accounts[14].getBalance();
      let toEndingfioNftBal = await fioNft.balanceOf(accounts[0].address);
      expect(result.from).to.equal(accounts[14].address);
      expect(result.to).to.equal(fioNft.address);
      expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
      expect(toStartingfioNftBal.lt(toEndingfioNftBal)).to.be.true;
    } catch (err) {
      throw err;
    }
  });

  it(`Unwrap a domain`, async function () {
    let fromStartingfioNftBal = await fioNft.balanceOf(accounts[0].address);
    try {
      await fioNft.connect(accounts[0]).unwrapnft(user1.address, 1);
      let fromEndingfioNftBal = await fioNft.balanceOf(accounts[0].address);
      expect(fromStartingfioNftBal.gt(fromEndingfioNftBal));
      expect(fromEndingfioNftBal.toNumber()).to.equal(0);
      await timeout(3000);  // seems to keep subsequent tests from breaking}
    } catch (err) {
      throw err;
    }
  });

  // unwrap
  it(`invalid address, expect Error 400`, async function () {
    let fromStartingfioNftBal = await fioNft.balanceOf(accounts[0].address);
    try {
      // TODO: what kind of checks are expected? this validation isn't enough for arbitrary strings
      await fioNft.connect(accounts[0]).unwrapnft("0x", 1);
    } catch (err) {
      let fromEndingfioNftBal = await fioNft.balanceOf(accounts[0].address);
      expect(fromEndingfioNftBal.eq(fromStartingfioNftBal));
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('transactionHash').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Invalid FIO Address\'');
    }
  });

  it(`missing address, expect Error 400`, async function () {
    let fromStartingfioNftBal = await fioNft.balanceOf(accounts[0].address);
    try {
      await fioNft.connect(accounts[0]).unwrapnft(1);
    } catch (err) {
      let fromEndingfioNftBal = await fioNft.balanceOf(accounts[0].address);
      expect(fromEndingfioNftBal.eq(fromStartingfioNftBal));
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

// TODO: Approval needs updated for tokenId
describe(`K. [MATIC] Approval`, function () {

  let user1;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let fioNft;
  let transactionId = '5efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';
  let testDomain = 'test-domain';
  let TOKEN_ID = 1; // cannot figure out how to get JUST this return value from the hardhat promise, so I'm setting it here because I know what it is for this block...

  before(async function () {
    user1 = await newUser(faucet);

    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('FIONFT', owner);
    fioNft = await factory.deploy(custodians);
    await fioNft.deployTransaction.wait();
    // register 3 oracles for testing
    await fioNft.connect(accounts[1]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[14].address);

    // Wrap a test domain
    let fromStartingBal = await accounts[14].getBalance();
    let toStartingfioNftBal = await fioNft.balanceOf(accounts[0].address);

    await fioNft.connect(accounts[12]).wrapnft(accounts[0].address, testDomain, transactionId);
    await fioNft.connect(accounts[13]).wrapnft(accounts[0].address, testDomain, transactionId);

    try {
      let result = await fioNft.connect(accounts[14]).wrapnft(accounts[0].address, testDomain, transactionId);
      let fromEndingBal = await accounts[14].getBalance();
      let toEndingfioNftBal = await fioNft.balanceOf(accounts[0].address);
      expect(result.from).to.equal(accounts[14].address);
      expect(result.to).to.equal(fioNft.address);
      expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
      expect(toStartingfioNftBal.lt(toEndingfioNftBal)).to.be.true;
    } catch (err) {
      throw err;
    }
  });

  it(`Unwrap a domain`, async function () {
    let fromStartingfioNftBal = await fioNft.balanceOf(accounts[0].address);
    try {
      await fioNft.connect(accounts[0]).unwrapnft(user1.address, TOKEN_ID);
      let fromEndingfioNftBal = await fioNft.balanceOf(accounts[0].address);
      expect(fromStartingfioNftBal.gt(fromEndingfioNftBal));
      expect(fromEndingfioNftBal.toNumber()).to.equal(0);
      await timeout(3000);  // seems to keep subsequent tests from breaking}
    } catch (err) {
      throw err;
    }
  });

  it(`get approval by obtid`, async function () {
    try {
      let result = await fioNft.connect(accounts[1]).getApproval(transactionId);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('object');
      expect(result[0]).to.have.all.keys('_hex', '_isBigNumber');
    } catch (err) {
      throw err;
    }
  });

  // unhappy path
  it(`invalid obtid`, async function () {
    try {
      await fioNft.connect(accounts[1]).getApproval('');
    } catch (err) {
      expect(err.message).to.contain('Invalid obtid');
    }
  });

  it(`missing obtid`, async function () {
    try {
      await fioNft.connect(accounts[1]).getApproval();
    } catch (err) {
      expect(err.message).to.contain('missing argument: passed to contract');
    }
  });
});

describe(`L. [MATIC] Pause`, function () {

  let fioAccount;
  let owner;
  let ercAccts;
  let fioNft;
  let transactionId = '5efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';

  before(async function () {
    fioAccount = await newUser(faucet);

    [owner, ercAccts, fioNft] = await setupFIONFTcontract(ethers);
    await registerFioNftOracles(fioNft, ercAccts);
  });

  it(`pause the contract`, async function () {
    await fioNft.connect(ercAccts[1]).pause();
    try {
      // wrapping/unwrapping is prohibited when contract is paused
      await fioNft.connect(ercAccts[12]).wrapnft(ercAccts[0].address, fioAccount.domain, transactionId);
    } catch (err) {
      expect(err.message).to.contain('Pausable: paused');
    } finally {
      await fioNft.connect(ercAccts[1]).unpause();
      await fioNft.connect(ercAccts[12]).wrapnft(ercAccts[0].address, fioAccount.domain, transactionId);
    }
  });
});

describe(`M. [MATIC] Unpause`, function () {

  let fioAccount;
  let owner;
  let ercAccts;
  let fioNft;
  let transactionId = '5efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';

  before(async function () {
    fioAccount = await newUser(faucet);

    [owner, ercAccts, fioNft] = await setupFIONFTcontract(ethers);
    await registerFioNftOracles(fioNft, ercAccts);

    await fioNft.connect(ercAccts[1]).pause();
  });

  it(`unpause the fioNft contract`, async function () {
    try {
      await fioNft.connect(ercAccts[1]).unpause();
      // wrapping/unwrapping is prohibited when contract is paused
      await fioNft.connect(ercAccts[12]).wrapnft(ercAccts[0].address, fioAccount.domain, transactionId);
    } catch (err) {
      throw err;
    }
  });

});

describe(`N. [MATIC] Burn an NFT`, function () {

  let user1;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let fioNft;
  let transactionId = '5efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';
  let transactionId2 = '6efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';
  let testDomain = 'test-domain';
  let testDomain2 = 'test-domain-2';
  let TOKEN_ID = 1;

  before(async function () {
    user1 = await newUser(faucet);

    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('FIONFT', owner);
    fioNft = await factory.deploy(custodians);
    await fioNft.deployTransaction.wait();
    // register 3 oracles for testing
    await fioNft.connect(accounts[1]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[14].address);

    // Wrap a test domain
    let fromStartingBal = await accounts[14].getBalance();
    let toStartingfioNftBal = await fioNft.balanceOf(accounts[0].address);

    await fioNft.connect(accounts[12]).wrapnft(accounts[0].address, testDomain, transactionId);
    await fioNft.connect(accounts[13]).wrapnft(accounts[0].address, testDomain, transactionId);
    try {
      let result = await fioNft.connect(accounts[14]).wrapnft(accounts[0].address, testDomain, transactionId);
      let fromEndingBal = await accounts[14].getBalance();
      let toEndingfioNftBal = await fioNft.balanceOf(accounts[0].address);
      expect(result.from).to.equal(accounts[14].address);
      expect(result.to).to.equal(fioNft.address);
      expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
      expect(toStartingfioNftBal.lt(toEndingfioNftBal)).to.be.true;
    } catch (err) {
      throw err;
    }
  });

  it(`(non-oracle caller) try to burn a domain`, async function () {
    try {
      await fioNft.connect(accounts[0]).burnnft(TOKEN_ID, transactionId);
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Only FIONFT oracle can call action.\'');
    }
  });

  it(`(empty tokenID) burn a domain`, async function () {
    try {
      let result = await fioNft.connect(accounts[12]).burnnft("", transactionId2);
      expect(result).to.have.property('hash').which.is.a('string')
      expect(result.from).to.be.a('string').and.equal(accounts[12].address);
    } catch (err) {
      expect(err.reason).to.equal('invalid BigNumber string');
    }
  });

  it(`(missing tokenID) burn a domain`, async function () {
    try {
      let result = await fioNft.connect(accounts[12]).burnnft(transactionId2);
      expect(result).to.have.property('hash').which.is.a('string')
      expect(result.from).to.be.a('string').and.equal(accounts[12].address);
    } catch (err) {
      expect(err.reason).to.equal('missing argument: passed to contract');
    }
  });

  it(`(empty obtID) burn a domain`, async function () {
    try {
      let result = await fioNft.connect(accounts[12]).burnnft(TOKEN_ID, "");
      expect(result).to.have.property('hash').which.is.a('string')
      expect(result.from).to.be.a('string').and.equal(accounts[12].address);
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Invalid obtid\'');
    }
  });

  it(`(missing obtID) burn a domain`, async function () {
    try {
      let result = await fioNft.connect(accounts[12]).burnnft(TOKEN_ID);
      expect(result).to.have.property('hash').which.is.a('string')
      expect(result.from).to.be.a('string').and.equal(accounts[12].address);
    } catch (err) {
      expect(err.reason).to.equal('missing argument: passed to contract');
    }
  });

  it(`(happy path) burn a domain`, async function () {
    try {
      let result = await fioNft.connect(accounts[12]).burnnft(TOKEN_ID, transactionId2);
      expect(result).to.have.property('hash').which.is.a('string')
      expect(result.from).to.be.a('string').and.equal(accounts[12].address);
    } catch (err) {
      throw err;
    }
  });
});

describe(`O. [MATIC] get domain names by owner using listDomainsOfOwner`, function () {
  let accounts;
  let custodians;
  let owner;
  let factory;
  let fioNft;
  let transactionId = '5efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';
  let transactionId2 = '6efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';
  let testDomain = 'test-domain';
  let testDomain2 = 'test-domain-2';

  before(async function () {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('FIONFT', owner);
    fioNft = await factory.deploy(custodians);
    await fioNft.deployTransaction.wait();
    // register 3 oracles for testing
    await fioNft.connect(accounts[1]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[14].address);


    // wrap a domain for testing
    await fioNft.connect(accounts[12]).wrapnft(accounts[0].address, testDomain, transactionId);
    await fioNft.connect(accounts[13]).wrapnft(accounts[0].address, testDomain, transactionId);
    try {
      let result = await fioNft.connect(accounts[14]).wrapnft(accounts[0].address, testDomain, transactionId);
      expect(result.from).to.equal(accounts[14].address);
      expect(result.to).to.equal(fioNft.address);
    } catch (err) {
      throw err;
    }
  });

  it(`(no domains wrapped) try to call listDomainsOfOwner on account with no domains`, async function () {
    try {
      let result = await fioNft.listDomainsOfOwner(accounts[1].address);
      expect(result).to.be.an('array').and.be.empty;
    } catch (err) {
      throw err;
    }
  });

  it(`(invalid owner) try to call listDomainsOfOwner`, async function () {
    try {
      let result = await fioNft.listDomainsOfOwner('invalid!@#');
      expect(result).to.be.an('array').and.be.empty;
    } catch (err) {
      expect(err).to.have.all.keys('reason', 'code', 'operation', 'network');
      expect(err.reason).to.equal('network does not support ENS');
    }
  });

  it(`(empty owner) try to call listDomainsOfOwner`, async function () {
    try {
      let result = await fioNft.listDomainsOfOwner('');
      expect(result).to.be.an('array').and.be.empty;
    } catch (err) {
      expect(err.reason).to.equal('resolver or addr is not configured for ENS name');
    }
  });

  it(`(missing owner) try to call listDomainsOfOwner`, async function () {
    try {
      let result = await fioNft.listDomainsOfOwner();
      expect(result).to.be.an('array').and.be.empty;
    } catch (err) {
      expect(err.reason).to.equal('missing argument: passed to contract');
    }
  });

  it(`call listDomainsOfOwner on wrapped token holder, expect 1 wrapped domain with value of ${testDomain}`, async function () {
    try {
      let result = await fioNft.listDomainsOfOwner(accounts[0].address);
      expect(result.length).to.equal(1);
      expect(result[0]).to.equal(testDomain);
    } catch (err) {
      throw err;
    }
  });

  it(`Wrap another test domain`, async function () {
    let fromStartingBal = await accounts[14].getBalance();
    let toStartingfioNftBal = await fioNft.balanceOf(accounts[0].address);

    await fioNft.connect(accounts[12]).wrapnft(accounts[0].address, testDomain2, transactionId2);
    await fioNft.connect(accounts[13]).wrapnft(accounts[0].address, testDomain2, transactionId2);
    try {
      let result = await fioNft.connect(accounts[14]).wrapnft(accounts[0].address, testDomain2, transactionId2);
      let fromEndingBal = await accounts[14].getBalance();
      let toEndingfioNftBal = await fioNft.balanceOf(accounts[0].address);
      expect(result.from).to.equal(accounts[14].address);
      expect(result.to).to.equal(fioNft.address);
      expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
      expect(toStartingfioNftBal.lt(toEndingfioNftBal)).to.be.true;
    } catch (err) {
      throw err;
    }
  });

  it(`call listDomainsOfOwner on wrapped token holder, expect 2 wrapped domains with value of ${testDomain} and ${testDomain2}`, async function () {
    try {
      let result = await fioNft.listDomainsOfOwner(accounts[0].address);
      expect(result.length).to.equal(2);
      expect(result[0]).to.equal(testDomain);
      expect(result[1]).to.equal(testDomain2);
    } catch (err) {
      throw err;
    }
  });
});
