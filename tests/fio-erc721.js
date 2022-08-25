const hre = require("hardhat");
const ethers = hre.ethers;
require("@nomiclabs/hardhat-ethers");
require("mocha");
const {expect} = require("chai");
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {newUser, fetchJson, timeout, callFioApiSigned} = require("../utils");
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
    await fioNft.connect(accounts[1]).unregcust(accounts[10].address);
    await fioNft.connect(accounts[2]).unregcust(accounts[10].address);
    await fioNft.connect(accounts[3]).unregcust(accounts[10].address);
    await fioNft.connect(accounts[4]).unregcust(accounts[10].address);
    await fioNft.connect(accounts[5]).unregcust(accounts[10].address);
    await fioNft.connect(accounts[6]).unregcust(accounts[10].address);
    await fioNft.connect(accounts[7]).unregcust(accounts[10].address);
    let result = await fioNft.getCustodian(accounts[10].address);
    expect(result[0]).to.be.a('boolean').and.equal(false);
  });

  // unhappy paths
  it(`(BD-4016) try to unregister 3 more custodians, expect minimum custodians required; Error`, async function () {
    let result = await fioNft.getCustodian(accounts[9].address);
    expect(result[0]).to.be.a('boolean').and.equal(true);

    await fioNft.connect(accounts[1]).unregcust(accounts[9].address);
    await fioNft.connect(accounts[2]).unregcust(accounts[9].address);
    await fioNft.connect(accounts[3]).unregcust(accounts[9].address);
    await fioNft.connect(accounts[4]).unregcust(accounts[9].address);
    await fioNft.connect(accounts[5]).unregcust(accounts[9].address);
    await fioNft.connect(accounts[6]).unregcust(accounts[9].address);
    await fioNft.connect(accounts[7]).unregcust(accounts[9].address);

    result = await fioNft.getCustodian(accounts[9].address);
    expect(result[0]).to.be.a('boolean').and.equal(false);

    result = await fioNft.getCustodian(accounts[8].address);
    expect(result[0]).to.be.a('boolean').and.equal(true);

    await fioNft.connect(accounts[1]).unregcust(accounts[8].address);
    await fioNft.connect(accounts[2]).unregcust(accounts[8].address);
    await fioNft.connect(accounts[3]).unregcust(accounts[8].address);
    await fioNft.connect(accounts[4]).unregcust(accounts[8].address);
    await fioNft.connect(accounts[5]).unregcust(accounts[8].address);
    await fioNft.connect(accounts[6]).unregcust(accounts[8].address);

    result = await fioNft.getCustodian(accounts[8].address);
    expect(result[0]).to.be.a('boolean').and.equal(false);

    result = await fioNft.getCustodian(accounts[7].address);
    expect(result[0]).to.be.a('boolean').and.equal(true);

    // error condition
    try {
      await fioNft.connect(accounts[1]).unregcust(accounts[7].address);
      await fioNft.connect(accounts[2]).unregcust(accounts[7].address);
      await fioNft.connect(accounts[3]).unregcust(accounts[7].address);
      await fioNft.connect(accounts[4]).unregcust(accounts[7].address);
      await fioNft.connect(accounts[5]).unregcust(accounts[7].address);
      await fioNft.connect(accounts[6]).unregcust(accounts[7].address);
      await fioNft.connect(accounts[7]).unregcust(accounts[7].address);

      result = await fioNft.getCustodian(accounts[7].address);
      expect(result[0]).to.be.a('boolean').and.equal(false);
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Must contain 7 custodians\'');
    }
  });

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

describe(`E. [MATIC] (BD-4016) Register and unregister an oracle with different numbers of custodians`, function () {

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

  it(`unregister 3 of 10 custodians`, async function () {
    let result = await fioNft.getCustodian(accounts[10].address);
    expect(result[0]).to.be.a('boolean').and.equal(true);

    await fioNft.connect(accounts[1]).unregcust(accounts[10].address);
    await fioNft.connect(accounts[2]).unregcust(accounts[10].address);
    await fioNft.connect(accounts[3]).unregcust(accounts[10].address);
    await fioNft.connect(accounts[4]).unregcust(accounts[10].address);
    await fioNft.connect(accounts[5]).unregcust(accounts[10].address);
    await fioNft.connect(accounts[6]).unregcust(accounts[10].address);
    await fioNft.connect(accounts[7]).unregcust(accounts[10].address);

    result = await fioNft.getCustodian(accounts[10].address);
    expect(result[0]).to.be.a('boolean').and.equal(false);

    result = await fioNft.getCustodian(accounts[9].address);
    expect(result[0]).to.be.a('boolean').and.equal(true);

    await fioNft.connect(accounts[1]).unregcust(accounts[9].address);
    await fioNft.connect(accounts[2]).unregcust(accounts[9].address);
    await fioNft.connect(accounts[3]).unregcust(accounts[9].address);
    await fioNft.connect(accounts[4]).unregcust(accounts[9].address);
    await fioNft.connect(accounts[5]).unregcust(accounts[9].address);
    await fioNft.connect(accounts[6]).unregcust(accounts[9].address);
    await fioNft.connect(accounts[7]).unregcust(accounts[9].address);

    result = await fioNft.getCustodian(accounts[9].address);
    expect(result[0]).to.be.a('boolean').and.equal(false);

    result = await fioNft.getCustodian(accounts[8].address);
    expect(result[0]).to.be.a('boolean').and.equal(true);

    await fioNft.connect(accounts[1]).unregcust(accounts[8].address);
    await fioNft.connect(accounts[2]).unregcust(accounts[8].address);
    await fioNft.connect(accounts[3]).unregcust(accounts[8].address);
    await fioNft.connect(accounts[4]).unregcust(accounts[8].address);
    await fioNft.connect(accounts[5]).unregcust(accounts[8].address);
    await fioNft.connect(accounts[6]).unregcust(accounts[8].address);

    result = await fioNft.getCustodian(accounts[8].address);
    expect(result[0]).to.be.a('boolean').and.equal(false);
  });

  it(`verify only 7 of the original custodians remain`, async function () {
    let count = 0;
    let result;
    for (let c=1; c<accounts.length; c++) {
      // console.log(`[DBG] Custodian ${c}: ${accounts[c].address}`);
      result = await fioNft.getCustodian(accounts[c].address);
      if (result[0] === true) {
        count++;
      }
    }
    expect(count).to.equal(7);
  });

  it(`call getOracles, expect an empty list`, async function () {
    let result = await fioNft.getOracles();
    expect(result).to.be.a('array');
    expect(result).to.be.empty;
    // expect(result).to.contain(accounts[12].address);
    // expect(result).to.contain(accounts[13].address);
    // expect(result).to.contain(accounts[14].address);
  });

  it(`register a new oracle with three fewer custodians`, async function () {
    await fioNft.connect(accounts[1]).regoracle(accounts[11].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[11].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[11].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[11].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[11].address);
    // await fioNft.connect(accounts[6]).regoracle(accounts[11].address);
    // await fioNft.connect(accounts[7]).regoracle(accounts[11].address);
    let result = await fioNft.getOracle(accounts[11].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(true);
    expect(result[1]).to.be.a('object').with.property('_hex');
    expect(result[1]).to.be.a('object').with.property('_isBigNumber');
  });

  it(`call getOracles, expect a single oracle in the list`, async function () {
    let result = await fioNft.getOracles();
    expect(result).to.be.a('array');
    expect(result.length).to.equal(1);
    expect(result).to.contain(accounts[11].address);
  });

  it(`register three new custodians`, async function () {
    let result;

    result = await fioNft.getCustodian(accounts[18].address);
    expect(result[0]).to.be.a('boolean').and.equal(false);

    await fioNft.connect(accounts[1]).regcust(accounts[18].address);
    await fioNft.connect(accounts[2]).regcust(accounts[18].address);
    await fioNft.connect(accounts[3]).regcust(accounts[18].address);
    await fioNft.connect(accounts[4]).regcust(accounts[18].address);
    await fioNft.connect(accounts[5]).regcust(accounts[18].address);
    // await fioNft.connect(accounts[6]).regcust(accounts[18].address);
    // await fioNft.connect(accounts[7]).regcust(accounts[18].address);
    result = await fioNft.getCustodian(accounts[18].address);
    expect(result[0]).to.be.a('boolean').and.equal(true);

    result = await fioNft.getCustodian(accounts[19].address);
    expect(result[0]).to.be.a('boolean').and.equal(false);

    await fioNft.connect(accounts[1]).regcust(accounts[19].address);
    await fioNft.connect(accounts[2]).regcust(accounts[19].address);
    await fioNft.connect(accounts[3]).regcust(accounts[19].address);
    await fioNft.connect(accounts[4]).regcust(accounts[19].address);
    await fioNft.connect(accounts[5]).regcust(accounts[19].address);
    await fioNft.connect(accounts[6]).regcust(accounts[19].address);
    // await fioNft.connect(accounts[7]).regcust(accounts[19].address);
    result = await fioNft.getCustodian(accounts[19].address);
    expect(result[0]).to.be.a('boolean').and.equal(true);

    result = await fioNft.getCustodian(accounts[20].address);
    expect(result[0]).to.be.a('boolean').and.equal(false);

    await fioNft.connect(accounts[1]).regcust(accounts[20].address);
    await fioNft.connect(accounts[2]).regcust(accounts[20].address);
    await fioNft.connect(accounts[3]).regcust(accounts[20].address);
    await fioNft.connect(accounts[4]).regcust(accounts[20].address);
    await fioNft.connect(accounts[5]).regcust(accounts[20].address);
    await fioNft.connect(accounts[6]).regcust(accounts[20].address);
    await fioNft.connect(accounts[7]).regcust(accounts[20].address);
    result = await fioNft.getCustodian(accounts[20].address);
    expect(result[0]).to.be.a('boolean').and.equal(true);
  });

  it(`verify the 3 new custodians`, async function () {
    let count = 0;
    let result;
    for (let c = 1; c < accounts.length; c++) {
      // console.log(`[DBG] Custodian ${c}: ${accounts[c].address}`);
      result = await fioNft.getCustodian(accounts[c].address);
      if (result[0] === true) {
        count++;
      }
    }
    expect(count).to.equal(10);
  });

  it(`Unregister oracle`, async function () {
    await fioNft.connect(accounts[1]).unregoracle(accounts[11].address);
    await fioNft.connect(accounts[2]).unregoracle(accounts[11].address);
    await fioNft.connect(accounts[3]).unregoracle(accounts[11].address);
    await fioNft.connect(accounts[4]).unregoracle(accounts[11].address);
    await fioNft.connect(accounts[5]).unregoracle(accounts[11].address);
    await fioNft.connect(accounts[6]).unregoracle(accounts[11].address);
    await fioNft.connect(accounts[7]).unregoracle(accounts[11].address);
    let result = await fioNft.getOracle(accounts[11].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(false);
  });
});

describe(`F. [MATIC] Oracles (get)`, function () {

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

describe(`G. [MATIC] Oracles (register)`, function () {

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
    // await fioNft.connect(accounts[1]).regoracle(accounts[12].address);
    // await fioNft.connect(accounts[2]).regoracle(accounts[12].address);
    // await fioNft.connect(accounts[3]).regoracle(accounts[12].address);
    // await fioNft.connect(accounts[4]).regoracle(accounts[12].address);
    // await fioNft.connect(accounts[5]).regoracle(accounts[12].address);
    // await fioNft.connect(accounts[6]).regoracle(accounts[12].address);
    // await fioNft.connect(accounts[7]).regoracle(accounts[12].address);
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
    await fioNft.connect(accounts[1]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[14].address);
  });
  it(`custodian 3 registers three new oracles`, async function () {
    await fioNft.connect(accounts[3]).regoracle(accounts[12].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[13].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[14].address);
  });

  it(`custodian 4 registers new oracle 1`, async function () {
    await fioNft.connect(accounts[4]).regoracle(accounts[12].address);
  });
  it(`custodian 5 registers new oracle 1`, async function () {
    await fioNft.connect(accounts[5]).regoracle(accounts[12].address);
  });
  it(`custodian 6 registers new oracle 1`, async function () {
    await fioNft.connect(accounts[6]).regoracle(accounts[12].address);
  });
  it(`custodian 7 registers new oracle 1`, async function () {
    await fioNft.connect(accounts[7]).regoracle(accounts[12].address);
  });
  it(`custodian 8 registers new oracle 1`, async function () {
    await fioNft.connect(accounts[8]).regoracle(accounts[12].address);
  });

  it(`custodian 4 registers new oracle 2`, async function () {
    await fioNft.connect(accounts[4]).regoracle(accounts[13].address);
  });
  it(`custodian 5 registers new oracle 2`, async function () {
    await fioNft.connect(accounts[5]).regoracle(accounts[13].address);
  });
  it(`custodian 6 registers new oracle 2`, async function () {
    await fioNft.connect(accounts[6]).regoracle(accounts[13].address);
  });
  it(`custodian 7 registers new oracle 2`, async function () {
    await fioNft.connect(accounts[7]).regoracle(accounts[13].address);
  });
  it(`custodian 8 registers new oracle 2`, async function () {
    await fioNft.connect(accounts[8]).regoracle(accounts[13].address);
  });

  it(`custodian 4 registers new oracle 3`, async function () {
    await fioNft.connect(accounts[4]).regoracle(accounts[14].address);
  });
  it(`custodian 5 registers new oracle 3`, async function () {
    await fioNft.connect(accounts[5]).regoracle(accounts[14].address);
  });
  it(`custodian 6 registers new oracle 3`, async function () {
    await fioNft.connect(accounts[6]).regoracle(accounts[14].address);
  });
  it(`custodian 7 registers new oracle 3`, async function () {
    await fioNft.connect(accounts[7]).regoracle(accounts[14].address);
  });
  it(`custodian 8 registers new oracle 3`, async function () {
    await fioNft.connect(accounts[8]).regoracle(accounts[14].address);
  });


  it(`(Bug - only accounds[12] was added as an oracle) call getOracles and expect to see all 3 new oracles`, async function () {
    const result = await fioNft.getOracles();
    expect(result).to.be.a('array');
    expect(result.length).to.equal(3);
    expect(result).to.contain(accounts[12].address);
    expect(result).to.contain(accounts[13].address);
    expect(result).to.contain(accounts[14].address);
  });

  it(`(Bug - accounts[14] should already be registered, but this test only throws the 'already registered' error after accounts[4] calls regoracle) register another oracle`, async function () {
    await fioNft.connect(accounts[1]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[8]).regoracle(accounts[14].address);
    let result = await fioNft.getOracle(accounts[14].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(true);
    expect(result[1]).to.be.a('object').with.property('_hex');
    expect(result[1]).to.be.a('object').with.property('_isBigNumber');
  });

  it(`(Bug - expect to have seen all 3 oracles in the first place, but only after accounts[1] and accounts[3] call regoracle on accounts[14] above is there a second oracle record) call getOracles and expect to see all 3 new oracles`, async function () {
    const result = await fioNft.getOracles();
    expect(result).to.be.a('array');
    expect(result.length).to.equal(3);
    expect(result).to.contain(accounts[12].address);
    expect(result).to.contain(accounts[13].address);
    expect(result).to.contain(accounts[14].address);
  });

  // unhappy paths
  it(`register accounts[12] as an oracle a second time, expect Error`, async function () {
    try {
      await fioNft.connect(accounts[2]).regoracle(accounts[12].address);
      await fioNft.connect(accounts[1]).regoracle(accounts[12].address);
      await fioNft.connect(accounts[3]).regoracle(accounts[12].address);
      await fioNft.connect(accounts[4]).regoracle(accounts[12].address);
      await fioNft.connect(accounts[5]).regoracle(accounts[12].address);
      await fioNft.connect(accounts[6]).regoracle(accounts[12].address);
      await fioNft.connect(accounts[7]).regoracle(accounts[12].address);
      // let result = await fioNft.getOracle(accounts[12].address);
      // expect(result).to.be.a('array');
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Oracle already registered\'');
    }
  });

  it(`(Bug - account should already be an oracle) register accounts[13] as an oracle a second time, expect Error`, async function () {
    try {
      await fioNft.connect(accounts[2]).regoracle(accounts[13].address);
      await fioNft.connect(accounts[1]).regoracle(accounts[13].address);
      await fioNft.connect(accounts[3]).regoracle(accounts[13].address);
      await fioNft.connect(accounts[4]).regoracle(accounts[13].address);
      await fioNft.connect(accounts[5]).regoracle(accounts[13].address);
      await fioNft.connect(accounts[6]).regoracle(accounts[13].address);
      await fioNft.connect(accounts[7]).regoracle(accounts[13].address);
      throw new Error('accounts[13] should already be an oracle - regoracle should have failed on the first call')
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Oracle already registered\'');
    }
  });

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

describe(`H. [MATIC] (BD-4016) Register a new oracle with more custodians designated`, function () {

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

  it(`register 10 new custodians`, async function () {
    let totalCustCount = custodians.length;
    let newCust;
    expect(totalCustCount).to.equal(10);

    // time to get it working one loop at a time, i guess, then refactor.....
    // first iteration of ten
    for (let a = 0; a < custodians.length; a++) {
      try {
        await fioNft.connect(accounts[a + 1]).regcust(accounts[11].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await fioNft.getCustodian(accounts[11].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[11].address);

    for (let a = 0; a < custodians.length; a++) {
      try {
        await fioNft.connect(accounts[a + 1]).regcust(accounts[12].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await fioNft.getCustodian(accounts[12].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[12].address);

    for (let a = 0; a < custodians.length; a++) {
      try {
        await fioNft.connect(accounts[a + 1]).regcust(accounts[13].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await fioNft.getCustodian(accounts[13].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[13].address);

    for (let a = 0; a < custodians.length; a++) {
      try {
        await fioNft.connect(accounts[a + 1]).regcust(accounts[14].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await fioNft.getCustodian(accounts[14].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[14].address);

    for (let a = 0; a < custodians.length; a++) {
      try {
        await fioNft.connect(accounts[a + 1]).regcust(accounts[15].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await fioNft.getCustodian(accounts[15].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[15].address);

    for (let a = 0; a < custodians.length; a++) {
      try {
        await fioNft.connect(accounts[a + 1]).regcust(accounts[16].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await fioNft.getCustodian(accounts[16].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[16].address);

    for (let a = 0; a < custodians.length; a++) {
      try {
        await fioNft.connect(accounts[a + 1]).regcust(accounts[17].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await fioNft.getCustodian(accounts[17].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[17].address);

    for (let a = 0; a < custodians.length; a++) {
      try {
        await fioNft.connect(accounts[a + 1]).regcust(accounts[18].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await fioNft.getCustodian(accounts[18].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[18].address);

    for (let a = 0; a < custodians.length; a++) {
      try {
        await fioNft.connect(accounts[a + 1]).regcust(accounts[19].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await fioNft.getCustodian(accounts[19].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[19].address);

    for (let a = 0; a < custodians.length; a++) {
      try {
        await fioNft.connect(accounts[a + 1]).regcust(accounts[20].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
        console.log(`registered 1 new custodian with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
    newCust = await fioNft.getCustodian(accounts[20].address);
    expect(newCust[0]).to.be.a('boolean').and.equal(true);
    custodians.push(accounts[20].address);

    totalCustCount = custodians.length
    expect(totalCustCount).to.equal(20);
  });

  it(`call getOracles, expect an empty list`, async function () {
    let result = await fioNft.getOracles();
    expect(result).to.be.a('array');
    expect(result).to.be.empty;
  });

  it(`register 1 new oracle`, async function () {
    for (let a = 0; a < custodians.length; a++) {
      try {
        await fioNft.connect(accounts[a + 1]).regoracle(accounts[21].address);
      } catch (err) {
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Oracle already registered\'');
        expect(a).to.equal(14);
        console.log(`registered 1 new oracle with ${a} votes from ${custodians.length} custodians.`);
        break;
      }
    }
  });

  it(`call getOracles, expect to see 1 new oracle`, async function () {
    let result = await fioNft.getOracles();
    expect(result).to.be.a('array');
    expect(result.length).to.equal(1);
    expect(result).to.contain(accounts[21].address);
  });
});

describe(`I. [MATIC] Oracles (unregister)`, function () {
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

describe(`J. [MATIC] FIONFT wrapping`, function () {

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

describe(`K. [MATIC] wrapping mismatched accounts and domains`, function () {

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

  it(`(BUG? this test should fail) domain does not match prior approvals`, async function () {    await fioNft.connect(accounts[12]).wrapnft(accounts[2].address, testDomain2, transactionId2);
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

describe(`L. [MATIC] FIONFT unwrapping`, function () {

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

describe(`M. [MATIC] Approval`, function () {

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

describe(`N. [MATIC] Pause`, function () {

  let fioAccount;
  let owner;
  let accounts;
  let fioNft;
  let transactionId = '5efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';

  before(async function () {
    // fioAccount = await newUser(faucet);
    //
    // [owner, accounts, fioNft] = await setupFIONFTcontract(ethers);
    // await registerFioNftOracles(fioNft, accounts);

    fioAccount = await newUser(faucet);
    fioTransaction = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: fioAccount.publicKey,
      amount: 100000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    TRANSACTIION_ID = fioTransaction.transaction_id;
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

  it(`pause the contract`, async function () {
    await fioNft.connect(accounts[1]).pause();
    try {
      // wrapping/unwrapping is prohibited when contract is paused
      await fioNft.connect(accounts[12]).wrapnft(accounts[0].address, fioAccount.domain, transactionId);
    } catch (err) {
      expect(err.message).to.contain('Pausable: paused');
    } finally {
      await fioNft.connect(accounts[1]).unpause();
      await fioNft.connect(accounts[12]).wrapnft(accounts[0].address, fioAccount.domain, transactionId);
    }
  });
});

describe(`O. [MATIC] Unpause`, function () {

  let fioAccount;
  let owner;
  let accounts;
  let fioNft;
  let transactionId = '5efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';

  before(async function () {
    fioAccount = await newUser(faucet);
    fioTransaction = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: fioAccount.publicKey,
      amount: 100000000000,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    TRANSACTIION_ID = fioTransaction.transaction_id;
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

    await fioNft.connect(accounts[1]).pause();
  });

  it(`unpause the fioNft contract`, async function () {
    try {
      await fioNft.connect(accounts[1]).unpause();
      // wrapping/unwrapping is prohibited when contract is paused
      await fioNft.connect(accounts[12]).wrapnft(accounts[0].address, fioAccount.domain, transactionId);
    } catch (err) {
      throw err;
    }
  });

});

describe(`P. [MATIC] Prevent tokens from being sent to contract address`, function () {

  let fioAccount;
  let owner;
  let accounts;
  let custodians;
  let factory;
  let wfio;
  let fioNft;
  let fioTransaction;
  let TRANSACTION_ID;
  let fioNftReceivedBalPre, fioNftReceivedBalPost, fromSentBalPre, fromSentBalPost;

  before(async function () {
    fioAccount = await newUser(faucet);
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
  });

  it("Should deploy the fioNft token successfully", async function () {
    factory = await ethers.getContractFactory('FIONFT', owner);
    fioNft = await factory.deploy(custodians);
    await fioNft.deployed();
    expect(fioNft).to.be.a('object');
    expect(fioNft).to.have.property('address').which.is.a('string');
    expect(fioNft).to.have.property('functions').which.is.a('object');
    expect(fioNft.signer.address).to.equal(owner.address);
  });

  it(`deploy a wfio for testing token wraps to the FIONFT contract`, async function () {
    factory = await ethers.getContractFactory('WFIO', owner);
    wfio = await factory.deploy(0, custodians);
    await wfio.deployed();
    expect(wfio).to.be.a('object');
    expect(wfio).to.have.property('address').which.is.a('string');
    expect(wfio).to.have.property('functions').which.is.a('object');
    expect(wfio.signer.address).to.equal(owner.address);
  });

  it(`register 3 oracles on both WFIO and FIONFT contracts`, async function () {
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

    // fioNft
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

  it(`wrap some wFIO tokens for accounts[15] for testing`,async function () {
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

  it(`[test 1] (expect Error: Contract cannot receive tokens) try to send eth to the WFIO contract using the builtin Hardhat sendTransaction`, async function () {
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

  it(`[test 2] (expect Error: Contract cannot receive tokens) try to send wFIO to the WFIO contract using wfio.trasnsfer`, async function () {
    try {
      await wfio.connect(accounts[15]).transfer(wfio.address, 630000000000);
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

  it(`[test 3] (expect Error: Contract cannot receive tokens) try to send wFIO to the WFIO contract using wfio.trasnsferFrom`, async function () {
    try {
      await wfio.connect(accounts[17]).transferFrom(accounts[17].address, wfio.address, 260000000000);
    } catch (err) {
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
    fromSentBalPre =  await wfio.balanceOf(accounts[17].address);//await accounts[17].getBalance();
    wfioReceivedBalPre = await wfio.balanceOf(wfio.address);
    fromSentBalPre = ethers.BigNumber.from(fromSentBalPre).toString();
    wfioReceivedBalPre = ethers.BigNumber.from(wfioReceivedBalPre).toString();
    console.log(`[DBG-pre-transfer-4] wfioBal: ${wfioReceivedBalPre}`);
  });

  it(`[test 4] (expect Error: Contract cannot receive tokens) wrap another 1000 wFIO tokens, this time to wfio.address directly`,async function () {
    let _bal = await wfio.balanceOf(wfio.address);
    try {
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
      throw new Error('wrap should not have been successful')
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Contract cannot receive tokens\'');
    }
  });

  it(`[test 4] post transfer attempt balance display, wfioBal should stay the same`, async function () {
    fromSentBalPost =  await wfio.balanceOf(accounts[17].address);//await accounts[15].getBalance();
    wfioReceivedBalPost = await wfio.balanceOf(wfio.address);
    fromSentBalPost = ethers.BigNumber.from(fromSentBalPost).toString();
    wfioReceivedBalPost = ethers.BigNumber.from(wfioReceivedBalPost).toString();
    console.log(`[DBG-post-transfer-4] wfioBal: ${wfioReceivedBalPost}`);
    expect(fromSentBalPost).to.equal(fromSentBalPre);
    expect(wfioReceivedBalPost).to.equal(wfioReceivedBalPre);
  });
});

describe(`P. [MATIC] Burn an NFT`, function () {

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

describe(`Q. [MATIC] get domain names by owner using listDomainsOfOwner`, function () {
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
