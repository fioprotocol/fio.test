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
    // expect(result[1]).to.be.a('object').with.property('_hex');
    // expect(result[1]).to.be.a('object').with.property('_isBigNumber');
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
    // expect(result[1]).to.be.a('object').with.property('_hex');
    // expect(result[1]).to.be.a('object').with.property('_isBigNumber');
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
      let result = await fioNft.connect(accounts[1]).regcust('0x0')
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
      await fioNft.connect(accounts[1]).regcust();
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
      let result = await fioNft.connect(accounts[1]).regcust(accounts[28].address);
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

  // unhappy paths
  it(`unregister a missing ETH address, expect error`, async function () {
    try {
      let result = await fioNft.connect(accounts[1]).unregcust()
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
      let result = await fioNft.connect(accounts[1]).unregcust('0x0')
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
      let result = await fioNft.connect(accounts[32]).unregcust(custodians[0])
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal(`VM Exception while processing transaction: reverted with reason string \'AccessControl: account ${accounts[32].address.toString().toLowerCase()} is missing role 0xe28434228950b641dbbc0178de89daa359a87c6ee0d8399aeace52a98fe902b9\'`);
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
    // expect(result[1]).to.be.a('object').with.property('_hex');
    // expect(result[1]).to.be.a('object').with.property('_isBigNumber');
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
      // expect(result[1]).to.be.a('object').with.property('_hex');
      // expect(result[1]).to.be.a('object').with.property('_isBigNumber');
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

  it(`call getOracles and expect to see all 3 new oracles`, async function () {
    const result = await fioNft.getOracles();
    expect(result).to.be.a('array');
    expect(result.length).to.equal(3);
    expect(result).to.contain(accounts[12].address);
    expect(result).to.contain(accounts[13].address);
    expect(result).to.contain(accounts[14].address);
  });

  it(`register oracle with an invalid eth address, expect Error 400`, async function () {
    try {
      let result = await fioNft.connect(accounts[1]).regoracle('0x0');
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
      let result = await fioNft.connect(accounts[1]).regoracle();
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
      let result = await fioNft.connect(accounts[1]).regoracle(accounts[18].address);
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

  it(`(Minimum 3 oracles required) Try to unregister oracle, expect Error`, async function () {
    try {
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
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Minimum 3 oracles required\'');
    }
  });

  it(`register 3 more oracles`, async function () {
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

    await fioNft.connect(accounts[1]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[14].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[14].address);
    result = await fioNft.getOracle(accounts[14].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(true);

    await fioNft.connect(accounts[1]).regoracle(accounts[15].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[15].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[15].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[15].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[15].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[15].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[15].address);
    result = await fioNft.getOracle(accounts[15].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(true);
  });

  it(`call getOracles and expect to see 3 new oracles`, async function () {
    const result = await fioNft.getOracles();
    expect(result).to.be.a('array');
    expect(result.length).to.equal(4);
    expect(result).to.contain(accounts[12].address);
    expect(result).to.contain(accounts[13].address);
    expect(result).to.contain(accounts[14].address);
    expect(result).to.contain(accounts[15].address);
  });

  it(`Try to unregister an oracle, expect OK - minimum 3 oracles met`, async function () {
    let result = await fioNft.getOracle(accounts[12].address);
    expect(result).to.be.a('array');
    expect(result[0]).to.be.a('boolean').and.equal(true);
    try {
      await fioNft.connect(accounts[1]).unregoracle(accounts[12].address);
      await fioNft.connect(accounts[2]).unregoracle(accounts[12].address);
      await fioNft.connect(accounts[3]).unregoracle(accounts[12].address);
      await fioNft.connect(accounts[4]).unregoracle(accounts[12].address);
      await fioNft.connect(accounts[5]).unregoracle(accounts[12].address);
      await fioNft.connect(accounts[6]).unregoracle(accounts[12].address);
      await fioNft.connect(accounts[7]).unregoracle(accounts[12].address);
      result = await fioNft.getOracle(accounts[12].address);
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
      let result = await fioNft.connect(accounts[1]).unregoracle();
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
      let result = await fioNft.connect(accounts[1]).unregoracle('0x0');
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
      let result = await fioNft.connect(accounts[36]).unregoracle(custodians[0])
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal(`VM Exception while processing transaction: reverted with reason string \'AccessControl: account ${accounts[36].address.toString().toLowerCase()} is missing role 0xe28434228950b641dbbc0178de89daa359a87c6ee0d8399aeace52a98fe902b9\'`);
    }
  });
});

describe(`H. [MATIC] (BD-4016) Register and unregister an oracle with different numbers of custodians`, function () {

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
    // expect(result[1]).to.be.a('object').with.property('_hex');
    // expect(result[1]).to.be.a('object').with.property('_isBigNumber');
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

  it(`(minimum 3 oracles required) new custodian tries to unregister an oracle, expect error`, async function () {
    try {
      await fioNft.connect(accounts[1]).unregoracle(accounts[11].address);
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Minimum 3 oracles required\'');
    }
  });
});

describe(`I. [MATIC] (BD-4016) Register a new oracle with more custodians designated`, function () {

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
        expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
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

describe(`J. [MATIC] FIONFT wrapping`, function () {

  let accounts;
  let custodians;
  let owner;
  let factory;
  let fioNft;
  let transactionId = '5efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';
  let transactionId2 = '6efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';
  let transactionId3 = '7efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';
  let testDomain = 'test-domain';
  let testDomain2 = 'test-domain-2';
  let testDomain3 = 'test-domain-3';

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
    // let fromStartingBal = await accounts[14].getBalance();
    // let toStartingfioNftBal = await fioNft.balanceOf(accounts[0].address);

    await fioNft.connect(accounts[12]).wrapnft(accounts[0].address, testDomain, transactionId);
    await fioNft.connect(accounts[13]).wrapnft(accounts[0].address, testDomain, transactionId);
    try {
      let tx = await fioNft.connect(accounts[14]).wrapnft(accounts[0].address, testDomain, transactionId);
      let result = await tx.wait();
      expect(result.events[2].event).to.equal('consensus_activity');
      expect(tx.from).to.equal(accounts[14].address);
      expect(tx.to).to.equal(fioNft.address);
      // let fromEndingBal = await accounts[14].getBalance();
      // let toEndingfioNftBal = await fioNft.balanceOf(accounts[0].address);
      // expect(fromStartingBal.gt(fromEndingBal)).to.be.true;
      // expect(toStartingfioNftBal.lt(toEndingfioNftBal)).to.be.true;
    } catch (err) {
      throw err;
    }
  });

  it(`Add 3 new oracles and wrap an fioNft`, async function () {//TODO: test text
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

    await fioNft.connect(accounts[15]).wrapnft(accounts[0].address, testDomain2, transactionId2);
    await fioNft.connect(accounts[16]).wrapnft(accounts[0].address, testDomain2, transactionId2);
    try {
      let tx = await fioNft.connect(accounts[17]).wrapnft(accounts[0].address, testDomain2, transactionId2);
      let result = await tx.wait();
      expect(result.events[0].event).to.equal('consensus_activity');
      expect(tx.from).to.equal(accounts[17].address);
      expect(tx.to).to.equal(fioNft.address);
    } catch (err) {
      throw err;
    }
  });

  it(`Add 10 new oracles and wrap an fioNft`, async function () {

    // register 10 more new oracles
    await fioNft.connect(accounts[1]).regoracle(accounts[18].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[18].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[18].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[18].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[18].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[18].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[18].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[19].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[19].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[19].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[19].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[19].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[19].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[19].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[20].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[20].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[20].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[20].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[20].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[20].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[20].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[21].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[21].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[21].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[21].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[21].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[21].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[21].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[22].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[22].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[22].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[22].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[22].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[22].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[22].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[23].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[23].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[23].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[23].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[23].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[23].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[23].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[24].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[24].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[24].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[24].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[24].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[24].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[24].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[25].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[25].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[25].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[25].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[25].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[25].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[25].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[26].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[26].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[26].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[26].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[26].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[26].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[26].address);
    await fioNft.connect(accounts[1]).regoracle(accounts[27].address);
    await fioNft.connect(accounts[2]).regoracle(accounts[27].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[27].address);
    await fioNft.connect(accounts[4]).regoracle(accounts[27].address);
    await fioNft.connect(accounts[5]).regoracle(accounts[27].address);
    await fioNft.connect(accounts[6]).regoracle(accounts[27].address);
    await fioNft.connect(accounts[7]).regoracle(accounts[27].address);

    let fromStartingBal = await accounts[27].getBalance();
    let toStartingfioNftBal = await fioNft.balanceOf(accounts[0].address);

    await fioNft.connect(accounts[12]).wrapnft(accounts[0].address, testDomain3, transactionId3);
    await fioNft.connect(accounts[13]).wrapnft(accounts[0].address, testDomain3, transactionId3);
    await fioNft.connect(accounts[14]).wrapnft(accounts[0].address, testDomain3, transactionId3);
    await fioNft.connect(accounts[15]).wrapnft(accounts[0].address, testDomain3, transactionId3);
    await fioNft.connect(accounts[16]).wrapnft(accounts[0].address, testDomain3, transactionId3);
    await fioNft.connect(accounts[17]).wrapnft(accounts[0].address, testDomain3, transactionId3);
    await fioNft.connect(accounts[18]).wrapnft(accounts[0].address, testDomain3, transactionId3);
    await fioNft.connect(accounts[19]).wrapnft(accounts[0].address, testDomain3, transactionId3);
    await fioNft.connect(accounts[20]).wrapnft(accounts[0].address, testDomain3, transactionId3);
    await fioNft.connect(accounts[21]).wrapnft(accounts[0].address, testDomain3, transactionId3);
    await fioNft.connect(accounts[22]).wrapnft(accounts[0].address, testDomain3, transactionId3);
    await fioNft.connect(accounts[23]).wrapnft(accounts[0].address, testDomain3, transactionId3);
    await fioNft.connect(accounts[24]).wrapnft(accounts[0].address, testDomain3, transactionId3);
    await fioNft.connect(accounts[25]).wrapnft(accounts[0].address, testDomain3, transactionId3);
    await fioNft.connect(accounts[26]).wrapnft(accounts[0].address, testDomain3, transactionId3);

    try {
      let tx = await fioNft.connect(accounts[27]).wrapnft(accounts[0].address, testDomain3, transactionId3);
      let result = await tx.wait();
      expect(result.events[2].event).to.equal('consensus_activity');
      expect(tx.from).to.equal(accounts[27].address);
      expect(tx.to).to.equal(fioNft.address);
    } catch (err) {
      throw err;
    }
  });

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

  it(`invalid domain - 1 char, expect Error 400`, async function () {
    try {
      let tx = await fioNft.connect(accounts[14]).wrapnft(accounts[0].address, "a", transactionId);
      let result = await tx.wait();
      expect(result.events[0].event).to.equal('consensus_activity');
    } catch (err) {
      throw err;
    }
  });

  it(`invalid domain - 2 char, expect Error 400`, async function () {
    try {
      let tx = await fioNft.connect(accounts[14]).wrapnft(accounts[0].address, "aa", transactionId);
      let result = await tx.wait();
      expect(result.events[0].event).to.equal('consensus_activity');
    } catch (err) {
      throw err;
    }
  });

  it(`invalid domain - > 63 char, expect Error 400`, async function () {
    try {
      let tx = await fioNft.connect(accounts[14]).wrapnft(accounts[0].address, "Aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", transactionId);
      let result = await tx.wait();
      expect(result.events[0]).to.be.empty;
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Invalid domain\'');
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
      let result = await fioNft.connect(accounts[32]).wrapnft(accounts[13].address, testDomain, transactionId);
      expect(result).to.be.undefined;
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('Array');
      expect(err).to.have.property('transactionHash').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string').and.equal(`VM Exception while processing transaction: reverted with reason string \'AccessControl: account ${accounts[32].address.toString().toLowerCase()} is missing role 0x68e79a7bf1e0bc45d0a330c573bc367f9cf464fd326078812f301165fbda4ef1\'`);
    }
  });
});

describe(`K. [MATIC] FIONFT unwrapping`, function () {

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
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Invalid FIO Handle\'');
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

describe(`L. [MATIC] Approval`, function () {

  let fioAccount;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let fioNft;
  let obtId = '5efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';
  let testDomain = 'test-domain';
  let approvalEvent;

  before(async function () {
    fioAccount = await newUser(faucet);

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

  it(`wrap a test domain`,async function () {
    let tx = await fioNft.connect(accounts[12]).wrapnft(accounts[15].address, testDomain, obtId);
    let result = await tx.wait();
    approvalEvent = result.events[0];
  });

  it(`(1 of 3 approvals) get approval by obtid, expect 1 approval`, async function () {
    try {
      let result = await fioNft.connect(accounts[1]).getApproval(approvalEvent.args[1]);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('number').and.equal(1);
      expect(result[1]).to.be.a('boolean').and.equal(false);
    } catch (err) {
      throw err;
    }
  });

  it(`wrap a test domain`,async function () {
    let tx = await fioNft.connect(accounts[13]).wrapnft(accounts[15].address, testDomain, obtId);
    let result = await tx.wait();
    approvalEvent = result.events[0];
  });

  it(`(2 of 3 approvals) get approval by obtid, expect 2 approvals`, async function () {
    try {
      let result = await fioNft.connect(accounts[1]).getApproval(approvalEvent.args[1]);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('number').and.equal(2);
      expect(result[1]).to.be.a('boolean').and.equal(false);
    } catch (err) {
      throw err;
    }
  });

  it(`wrap a test domain`,async function () {
    let tx = await fioNft.connect(accounts[14]).wrapnft(accounts[15].address, testDomain, obtId);
    let result = await tx.wait();
    approvalEvent = result.events[0];
  });

  it(`(3 of 3 approvals) get approval by obtid, expect 0 approvals - record has been deleted`, async function () {
    try {
      let result = await fioNft.connect(accounts[1]).getApproval(approvalEvent.args[1]);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('number').and.equal(0);
      expect(result[1]).to.be.a('boolean').and.equal(false);
    } catch (err) {
      throw err;
    }
  });

  it(`try to call regoracle as a new oracle and have 2 oracles approve it`, async function () {
    let tx = await fioNft.connect(accounts[1]).regoracle(accounts[32].address);
    let result = await tx.wait();
    approvalEvent = result.events[0];
  });

  it(`(1 approval) get approvals`, async function () {
    try {
      let result = await fioNft.connect(accounts[1]).getApproval(approvalEvent.args[1]);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('number').and.equal(1);
      expect(result[1]).to.be.a('boolean').and.equal(false);
    } catch (err) {
      throw err;
    }
  });

  it(`two other oracles approve`, async function () {
    await fioNft.connect(accounts[2]).regoracle(accounts[32].address);
    await fioNft.connect(accounts[3]).regoracle(accounts[32].address);
  });

  it(`(3 approvals) get approvals`, async function () {
    try {
      let result = await fioNft.connect(accounts[3]).getApproval(approvalEvent.args[1]);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('number').and.equal(3);
      expect(result[1]).to.be.a('boolean').and.equal(false);
    } catch (err) {
      throw err;
    }
  });

  it(`try to call regcust as an oracle and have the other oracles approve it`, async function () {
    let tx1 = await fioNft.connect(accounts[1]).regcust(accounts[33].address);
    let result1 = await tx1.wait();
    approvalEvent = result1.events[0];

    try {
      let result = await fioNft.connect(accounts[1]).getApproval(approvalEvent.args[1]);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('number').and.equal(1);
      expect(result[1]).to.be.a('boolean').and.equal(false);
    } catch (err) {
      throw err;
    }

    await fioNft.connect(accounts[2]).regcust(accounts[33].address);
    await fioNft.connect(accounts[3]).regcust(accounts[33].address);
    await fioNft.connect(accounts[4]).regcust(accounts[33].address);
    await fioNft.connect(accounts[5]).regcust(accounts[33].address);
    await fioNft.connect(accounts[6]).regcust(accounts[33].address);
    await fioNft.connect(accounts[7]).regcust(accounts[33].address);

    // try {
    //   let result = await fioNft.connect(accounts[7]).getApproval(approvalEvent.args[1]);
    //   expect(result).to.be.a('array');
    //   expect(result[0]).to.be.a('number').and.equal(7);
    //   expect(result[1]).to.be.a('boolean').and.equal(false);
    // } catch (err) {
    //   throw err;
    // }

    try {
      await fioNft.connect(accounts[8]).regcust(accounts[33].address);
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Already registered\'');
    }
  });

  it(`get approval by obtid, expect 7 approvals`, async function () {
    try {
      let result = await fioNft.connect(accounts[7]).getApproval(approvalEvent.args[1]);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('number').and.equal(7);
      expect(result[1]).to.be.a('boolean').and.equal(true);
    } catch (err) {
      throw err;
    }
  });

  it(`try to call unregcust as a new oracle and have 5 oracles approve it, but expect to unregister after 3 and error on the 4th attempt`, async function () {
    let tx = await fioNft.connect(accounts[1]).unregcust(accounts[33].address);
    let result = await tx.wait();
    approvalEvent = result.events[0];

    await fioNft.connect(accounts[2]).unregcust(accounts[33].address);
    await fioNft.connect(accounts[3]).unregcust(accounts[33].address);

    try {
      let result = await fioNft.connect(accounts[3]).getApproval(approvalEvent.args[1]);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('number').and.equal(3);
      expect(result[1]).to.be.a('boolean').and.equal(false);
    } catch (err) {
      throw err;
    }

    await fioNft.connect(accounts[4]).unregcust(accounts[33].address);
    await fioNft.connect(accounts[5]).unregcust(accounts[33].address);
    await fioNft.connect(accounts[6]).unregcust(accounts[33].address);
    await fioNft.connect(accounts[7]).unregcust(accounts[33].address);
    await fioNft.connect(accounts[8]).unregcust(accounts[33].address);

    try {
      tx = await fioNft.connect(accounts[9]).unregcust(accounts[33].address);
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Custodian not registered\'');
    }
  });

  it(`get approval by obtid, expect 8 approvals`, async function () {
    try {
      let result = await fioNft.connect(accounts[1]).getApproval(approvalEvent.args[1]);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('number').and.equal(8);
      expect(result[1]).to.be.a('boolean').and.equal(true);
    } catch (err) {
      throw err;
    }
  });

  // unhappy path
  it(`invalid obtid`, async function () {
    try {
      await fioNft.connect(accounts[2]).getApproval('!invalid@#');
    } catch (err) {
      expect(err.code).to.equal('INVALID_ARGUMENT');
      expect(err.value).to.equal('!invalid@#');
    }
  });

  it(`empty obtid`, async function () {
    try {
      await fioNft.connect(accounts[1]).getApproval('');
    } catch (err) {
      expect(err.code).to.equal('INVALID_ARGUMENT');
      expect(err.value).to.equal('');
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

describe(`M. [MATIC] Pausing`, function () {

  let fioAccount;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let fioNft;
  let testDomain = 'test-domain';
  let transactionId = '5efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';

  before(async function () {
    fioAccount = await newUser(faucet);

    // [owner, accounts, fioNft] = await setupFIONFTcontract(ethers);
    // await registerFioNftOracles(fioNft, accounts);
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

  it(`non-custodian users should not be able to pause`, async function () {
    try {
      await fioNft.connect(accounts[0]).pause()
    } catch (err) {
      expect(err.message).to.contain(`VM Exception while processing transaction: reverted with reason string 'AccessControl: account ${accounts[0].address.toString().toLowerCase()} is missing role 0xe28434228950b641dbbc0178de89daa359a87c6ee0d8399aeace52a98fe902b9'`);
    }

    try {
      await fioNft.connect(owner).pause()
    } catch (err) {
      expect(err.message).to.contain(`VM Exception while processing transaction: reverted with reason string 'AccessControl: account ${owner.address.toString().toLowerCase()} is missing role 0xe28434228950b641dbbc0178de89daa359a87c6ee0d8399aeace52a98fe902b9'`);
    }

    try {
      await fioNft.connect(accounts[14]).pause()
    } catch (err) {
      expect(err.message).to.contain(`VM Exception while processing transaction: reverted with reason string 'AccessControl: account ${accounts[14].address.toString().toLowerCase()} is missing role 0xe28434228950b641dbbc0178de89daa359a87c6ee0d8399aeace52a98fe902b9'`);
    }
  });

  it(`pause the FIONFT contract`, async function () {
    try {
      await fioNft.connect(accounts[1]).pause();
    } catch (err) {
      throw err;
    }
  });

  it(`should not be able to pause when already paused`, async function () {
    try {
      await fioNft.connect(accounts[1]).pause();
    } catch (err) {
      expect(err.message).to.contain('Pausable: paused');
    }
  });
  /**
   *     await fioNft.connect(accounts[12]).wrapnft(accounts[0].address, testDomain, transactionId);
   */
  it(`should not be able to wrap domains when paused`, async function () {
    try {
      // wrapping/unwrapping is prohibited when contract is paused
      await fioNft.connect(accounts[12]).wrapnft(accounts[0].address, testDomain, transactionId);
    } catch (err) {
      expect(err.message).to.contain('Pausable: paused');
    }
  });

  it(`should not be able to unwrap when paused`, async function () {
    try {
      // wrapping/unwrapping is prohibited when contract is paused
      await fioNft.connect(accounts[0]).unwrapnft(fioAccount.address, 1);
    } catch (err) {
      expect(err.message).to.contain('Pausable: paused');
    }
  });
});

describe(`N. [MATIC] Unpausing`, function () {

  let fioAccount;
  let fioTransaction;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let fioNft;
  let testDomain = 'test-domain';
  let transactionId = '5efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';

  before(async function () {

    fioAccount = await newUser(faucet);
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

  it(`non-custodian users should not be able to unpause`, async function () {
    try {
      await fioNft.connect(accounts[0]).unpause();
    } catch (err) {
      expect(err.message).to.contain(`VM Exception while processing transaction: reverted with reason string 'AccessControl: account ${accounts[0].address.toString().toLowerCase()} is missing role 0xe28434228950b641dbbc0178de89daa359a87c6ee0d8399aeace52a98fe902b9'`);
    }
  });

  it(`unpause the fioNft contract`, async function () {
    try {
      await fioNft.connect(accounts[1]).unpause();
    } catch (err) {
      throw err;
    }
  });

  it(`should not be able to unpause when already unpaused`, async function () {
    try {
      await fioNft.connect(accounts[1]).unpause()
    } catch (err) {
      expect(err.message).to.contain('Pausable: not paused');
    }
  });

  it(`should now be able to wrap tokens when unpaused`, async function () {
    try {
      // wrapping/unwrapping is prohibited only when contract is paused
      await fioNft.connect(accounts[12]).wrapnft(accounts[0].address, testDomain, transactionId);
    } catch (err) {
      throw err;
    }
  });
});

describe(`O. [MATIC] Burn an NFT`, function () {

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
      expect(err.message).to.equal(`VM Exception while processing transaction: reverted with reason string \'AccessControl: account ${accounts[0].address.toString().toLowerCase()} is missing role 0x68e79a7bf1e0bc45d0a330c573bc367f9cf464fd326078812f301165fbda4ef1\'`);
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

describe(`P. [MATIC] get domain names by owner using listDomainsOfOwner`, function () {
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
      expect(result[0]).to.contain(testDomain);
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
      expect(result[0]).to.contain(testDomain);
      expect(result[1]).to.contain(testDomain2);
    } catch (err) {
      throw err;
    }
  });
});

describe(`Q. [MATIC] Prevent domains from being wrapped to the contract address`, function () {

  let fioAccount;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let fioNft;
  let obtId = '5efdf70d4338b6ae60e3241ce9fb646f55306434c3ed070601bde98a75f4418f';
  let testDomain = 'test-domain';
  let tokenId = 1;
  let fioNftReceivedBalPre, fioNftReceivedBalPost, fromSentBalPre, fromSentBalPost;

  before(async function () {
    fioAccount = await newUser(faucet);
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
  });

  it("Should deploy the fioNft token successfully", async function() {
    factory = await ethers.getContractFactory('FIONFT', owner);
    fioNft = await factory.deploy(custodians);
    await fioNft.deployed();
    expect(fioNft).to.be.a('object');
    expect(fioNft).to.have.property('address').which.is.a('string');
    expect(fioNft).to.have.property('functions').which.is.a('object');
    expect(fioNft.signer.address).to.equal(owner.address);
  });

  it(`register 3 oracles`, async function () {
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

  it(`(expect Error: Cannot wrap to contract account) try to wrap a domain to the fioNft contract`, async function () {
    try {
      let result = await fioNft.connect(accounts[12]).wrapnft(fioNft.address, testDomain, obtId);
      expect(result).to.not.have.property('hash');
    } catch (err) {
      expect(err.message).to.equal('VM Exception while processing transaction: reverted with reason string \'Cannot wrap to contract account\'');
    }
  });
});
