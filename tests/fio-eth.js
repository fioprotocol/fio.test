const hre = require("hardhat");
const ethers = hre.ethers;
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-ganache");
require("mocha");
const { expect } = require("chai");
const {FIOSDK } = require('@fioprotocol/fiosdk')

const config = require('../config.js');
const {newUser, fetchJson, timeout, callFioApi} = require('../utils.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
});

describe(`************************** fio-eth-ben.js ************************** \n   WFIO AND FIONFT QUICK TESTS`, () => {

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
    try {
      factory = await ethers.getContractFactory('WFIO', owner);
      wfio = await factory.deploy(1000, custodians);
      await wfio.deployed();
      expect(wfio).to.be.a('object');
      expect(wfio).to.have.property('address').which.is.a('string');
      expect(wfio).to.have.property('functions').which.is.a('object');
      expect(wfio.signer.address).to.equal(owner.address);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });
});

describe(`A. Custodians`, () => {
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
    wfio = await factory.deploy(1000, custodians);
    await wfio.deployTransaction.wait();
  });

  it(`get a custodian by address`, async () => {
    try {
      let result = await wfio.getCustodian(custodians[0]);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('boolean').and.equal(true);
      expect(result[1]).to.be.a('object').with.property('_hex');
      expect(result[1]).to.be.a('object').with.property('_isBigNumber');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`register a new custodian`, async () => {
    try {
      await wfio.connect(accounts[1]).regcust(accounts[18].address);
      await wfio.connect(accounts[2]).regcust(accounts[18].address);
      await wfio.connect(accounts[3]).regcust(accounts[18].address);
      await wfio.connect(accounts[4]).regcust(accounts[18].address);
      await wfio.connect(accounts[5]).regcust(accounts[18].address);
      await wfio.connect(accounts[6]).regcust(accounts[18].address);
      await wfio.connect(accounts[7]).regcust(accounts[18].address);
      let result = await wfio.getCustodian(accounts[18].address);
      expect(result[0]).to.be.a('boolean').and.equal(true);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`unregister a custodian`, async () => {
    try {
      await wfio.connect(accounts[1]).unregcust(accounts[9].address);
      await wfio.connect(accounts[2]).unregcust(accounts[9].address);
      await wfio.connect(accounts[3]).unregcust(accounts[9].address);
      await wfio.connect(accounts[4]).unregcust(accounts[9].address);
      await wfio.connect(accounts[5]).unregcust(accounts[9].address);
      await wfio.connect(accounts[6]).unregcust(accounts[9].address);
      await wfio.connect(accounts[7]).unregcust(accounts[9].address);
      let result = await wfio.getCustodian(accounts[9].address);
      expect(result[0]).to.be.a('boolean').and.equal(false);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  // unhappy paths
  // get custodian
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
    try {
      let result = await wfio.getCustodian(accounts[15].address);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('boolean').and.equal(false);
      expect(result[1]).to.be.a('object').with.property('_hex');
      expect(result[1]).to.be.a('object').with.property('_isBigNumber');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`no authority`, async () => {
    try {
      let result = await wfio.getCustodian(custodians[0]);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('boolean').and.equal(true);
      expect(result[1]).to.be.a('object').with.property('_hex');
      expect(result[1]).to.be.a('object').with.property('_isBigNumber');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  // register
  it(`register custodian with an invalid eth address, expect Error 400 `, async () => {
    try {
      let result = await wfio.regcust('0x0')

    } catch (err) {
      // console.log(err.message);
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
      expect(result).to.be.a('Object');
    } catch (err) {
      // console.log(err.message);
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: revert Only a wFIO custodian may call this function.');
    }
  });

  it(`register custodian with an already-registered eth address, expect Error 400 `, async () => {
    try {
      let result = await wfio.connect(accounts[1]).regcust(accounts[2].address);

      expect(result).to.be.a('Object');
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('transactionHash').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.contain('Custodian is already registered');
    }
  });

  //unregister
  it(`unregister a missing ETH address, expect error`, async () => {
    try {
      let result = await wfio.unregcust()
      expect(result).to.be.a('Object');
      expect(result.status).to.equal('OK')
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
      expect(result).to.be.a('Object');
      expect(result.status).to.equal('OK')
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
      expect(result).to.be.a('Object');
      expect(result.status).to.equal('OK')
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: revert Only a wFIO custodian may call this function.');
    }
  });
});

describe(`B. Oracles`, () => {
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
    wfio = await factory.deploy(1000, custodians);
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

  it(`get list of oracles`, async () => {
    try {
      let result = await wfio.getOracles();
      expect(result).to.be.a('array');
      expect(result.length).to.equal(1);
      expect(result).to.contain(accounts[12].address);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`get an oracle by address`, async () => {
    try {
      let result = await wfio.getOracle(accounts[12].address);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('boolean').and.equal(true);
      expect(result[1]).to.be.a('object').with.property('_hex');
      expect(result[1]).to.be.a('object').with.property('_isBigNumber');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`register oracle`, async () => {
    try {
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
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  it(`Unregister oracle`, async () => {
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
      expect(err).to.equal(null);
    }
  });

  // unhappy paths
  // get oracle
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

  // it(`already `)

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

  it(`no authority`, async () => {
    try {
      let result = await wfio.getOracle(custodians[0]);
      expect(result).to.be.a('array');
      expect(result[0]).to.be.a('boolean').and.equal(false);
      expect(result[1]).to.be.a('object').with.property('_hex');
      expect(result[1]).to.be.a('object').with.property('_isBigNumber');
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  // register oracle
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
      expect(result).to.be.a('Object');
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: revert Only a wFIO custodian may call this function.');
    }
  });

  // unregister
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
});

describe(`C. wFIO wrapping`, () => {

  let fioAccount;
  let fioBalance;
  let fioTransaction;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;
  let TRANSACTIION_ID;

  beforeEach(async () => {
    fioAccount = await newUser(faucet);
    fioBalance = await fioAccount.sdk.genericAction('getFioBalance', { });
    fioTransaction = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: fioAccount.publicKey,
      amount: 100,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    // console.log('Result: ', fioTransaction)
    TRANSACTIION_ID = fioTransaction.transaction_id;
  });

  before(async () => {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('WFIO', owner);
    wfio = await factory.deploy(1000, custodians);
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
  });

  it(`Wrap 100 wFIO`, async () => {
    try {
      await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, TRANSACTIION_ID);
      await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, TRANSACTIION_ID);
      let result = await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, TRANSACTIION_ID);
      expect(result.from).to.equal(accounts[14].address);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  // unhappy paths
  // wrap
  it(`invalid address, expect Error 400`, async () => {
    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, TRANSACTIION_ID);
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, TRANSACTIION_ID);
    try {
      let result = await wfio.connect(accounts[14]).wrap("donkey", 100, TRANSACTIION_ID);
      expect(result.status).to.equal('OK');
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
    try {
      let result = await wfio.wrap(100, TRANSACTIION_ID);
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

  it(`invalid tx amount, expect Error 400`, async () => {
    try {
      let result = await wfio.wrap(custodians[0], "donkey", TRANSACTIION_ID);
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
      let result = await wfio.wrap(custodians[0], TRANSACTIION_ID);
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

  it.skip(`invalid obtid, expect Error 400`, async () => {
    await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, "donkey");
    await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, "donkey");
    try {
      let result = await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, "donkey"); // TODO: Should this third arg take any arbitrary string
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.equal(null);
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
      let result = await wfio.wrap(accounts[13].address, 100, TRANSACTIION_ID);
      expect(result.status).to.equal('OK');
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.equal('VM Exception while processing transaction: revert Only a wFIO oracle may call this function.');
    }
  });

  it(`wrap 100 wFIO (Less than 3 oracles)`, async () => {
    // unregister oracle 1
    await wfio.connect(accounts[1]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[2]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[3]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[4]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[5]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[6]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[7]).unregoracle(accounts[12].address);
    try {
      // await wfio.connect(accounts[12]).wrap(accounts[1].address, 100, TRANSACTIION_ID)
      await wfio.connect(accounts[13]).wrap(accounts[1].address, 100, TRANSACTIION_ID)
      let result = await wfio.connect(accounts[14]).wrap(accounts[1].address, 100, TRANSACTIION_ID)
      expect(result);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('transactionHash').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.contain('Oracles must be 3 or greater');
    }
  });

  it(`wrap 100 wFIO (No oracles)`, async () => {
    // unregister oracles
    await wfio.connect(accounts[1]).unregoracle(accounts[13].address);
    await wfio.connect(accounts[2]).unregoracle(accounts[13].address);
    await wfio.connect(accounts[3]).unregoracle(accounts[13].address);
    await wfio.connect(accounts[4]).unregoracle(accounts[13].address);
    await wfio.connect(accounts[5]).unregoracle(accounts[13].address);
    await wfio.connect(accounts[6]).unregoracle(accounts[13].address);
    await wfio.connect(accounts[7]).unregoracle(accounts[13].address);
    await wfio.connect(accounts[1]).unregoracle(accounts[14].address);
    await wfio.connect(accounts[2]).unregoracle(accounts[14].address);
    await wfio.connect(accounts[3]).unregoracle(accounts[14].address);
    await wfio.connect(accounts[4]).unregoracle(accounts[14].address);
    await wfio.connect(accounts[5]).unregoracle(accounts[14].address);
    await wfio.connect(accounts[6]).unregoracle(accounts[14].address);
    await wfio.connect(accounts[7]).unregoracle(accounts[14].address);
    try {
      let result = await wfio.connect(accounts[14]).wrap(accounts[1].address, 100, TRANSACTIION_ID)
      expect(result);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('transactionHash').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.contain('Only a wFIO oracle may call this function.');
    }  });
});

describe(`D. wFIO unwrapping`, () => {

  let fioAccount;
  let fioBalance;
  let fioTransaction;
  let accounts;
  let custodians;
  let owner;
  let factory;
  let wfio;
  let TRANSACTIION_ID;

  beforeEach(async () => {
    fioAccount = await newUser(faucet);
    fioBalance = await fioAccount.sdk.genericAction('getFioBalance', { });
    fioTransaction = await faucet.genericAction('transferTokens', {
      payeeFioPublicKey: fioAccount.publicKey,
      amount: 100,
      maxFee: config.api.transfer_tokens_pub_key.fee,
      technologyProviderId: ''
    })
    // console.log('Result: ', fioTransaction)

    TRANSACTIION_ID = fioTransaction.transaction_id;
    // wrap some fio for testing
    try {
      await wfio.connect(accounts[12]).wrap(accounts[0].address, 100, TRANSACTIION_ID);
      await wfio.connect(accounts[13]).wrap(accounts[0].address, 100, TRANSACTIION_ID);
      await wfio.connect(accounts[14]).wrap(accounts[0].address, 100, TRANSACTIION_ID);
    } catch (err) {
      expect(err).to.equal(null);
    }

    // // let result =
    // let bal = await fioAccount.sdk.genericAction('getFioBalance', { });
    // console.log('balance: ', bal);
  });

  before(async () => {
    [owner, ...accounts] = await ethers.getSigners();
    custodians = [];
    for (let i = 1; i < 11; i++) {
      custodians.push(accounts[i].address);
    }
    factory = await ethers.getContractFactory('WFIO', owner);
    wfio = await factory.deploy(1000, custodians);
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
  });

  it.skip(`Unwrap 100 wFIO`, async () => {
    let balances = await fioAccount.sdk.genericAction('getFioBalance', { });
    try {
      await wfio.connect(accounts[12]).unwrap(fioAccount.address, 100);
      await wfio.connect(accounts[13]).unwrap(fioAccount.address, 100);
      let result = await wfio.connect(accounts[14]).unwrap(fioAccount.address, 100);
      expect(result.from).to.equal(accounts[14].address);
    } catch (err) {
      expect(err).to.equal(null);
    }
  });

  // unwrap
  it(`invalid address, expect Error 400`, async () => {
    try {
      await wfio.connect(accounts[12]).unwrap("donkey", 100);
      await wfio.connect(accounts[13]).unwrap("donkey", 100);
      let result = await wfio.connect(accounts[14]).unwrap("donkey", 100, TRANSACTIION_ID);
    } catch (err) {
      // expect(err).to.have.property('reason').which.is.a('string');
      // expect(err).to.have.property('code').which.is.a('string');
      // expect(err).to.have.property('operation').which.is.a('string');
      // expect(err).to.have.property('network').which.is.a('string');
      // expect(err.reason).to.equal('network does not support ENS');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
    }
  });

  it(`missing address, expect Error 400`, async () => {
    try {
      let result = await wfio.unwrap(100);
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

  it(`invalid tx amount, expect Error 400`, async () => {
    try {
      let result = await wfio.unwrap(fioAccount.address, "text");
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
      let result = await wfio.unwrap(fioAccount.address);
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
      let result = await wfio.unwrap(fioAccount.address, 100);
      // expect(result.status).to.equal('OK');
    } catch (err) {
      // expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      // expect(err.message).to.equal('VM Exception while processing transaction: revert Only a wFIO custodian may call this function.');
    }
  });

  it.skip(`unwrap 100 wFIO (Less than 3 oracles)`, async () => {
    // unregister oracle 1
    await wfio.connect(accounts[1]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[2]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[3]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[4]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[5]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[6]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[7]).unregoracle(accounts[12].address);
    try {
      // await wfio.connect(accounts[12]).wrap(accounts[1].address, 100, TRANSACTIION_ID)
      // await wfio.connect(accounts[13]).wrap(accounts[1].address, 100, TRANSACTIION_ID)
      let result = await wfio.connect(accounts[14]).unwrap(owner.address, 0);
      expect(result);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('transactionHash').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      // expect(err.message).to.contain('Oracles must be 3 or greater');
    }
  });

  it.skip(`unwrap 100 wFIO (No oracles)`, async () => {
    // unregister oracles
    await wfio.connect(accounts[1]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[2]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[3]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[4]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[5]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[6]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[7]).unregoracle(accounts[12].address);
    await wfio.connect(accounts[1]).unregoracle(accounts[13].address);
    await wfio.connect(accounts[2]).unregoracle(accounts[13].address);
    await wfio.connect(accounts[3]).unregoracle(accounts[13].address);
    await wfio.connect(accounts[4]).unregoracle(accounts[13].address);
    await wfio.connect(accounts[5]).unregoracle(accounts[13].address);
    await wfio.connect(accounts[6]).unregoracle(accounts[13].address);
    await wfio.connect(accounts[7]).unregoracle(accounts[13].address);
    await wfio.connect(accounts[1]).unregoracle(accounts[14].address);
    await wfio.connect(accounts[2]).unregoracle(accounts[14].address);
    await wfio.connect(accounts[3]).unregoracle(accounts[14].address);
    await wfio.connect(accounts[4]).unregoracle(accounts[14].address);
    await wfio.connect(accounts[5]).unregoracle(accounts[14].address);
    await wfio.connect(accounts[6]).unregoracle(accounts[14].address);
    await wfio.connect(accounts[7]).unregoracle(accounts[14].address);
    try {
      // TODO: Do we need to validate the amount arg before calling _burn with it?
      let result = await wfio.connect(accounts[14]).unwrap(owner.address, 0);
      expect(result);
    } catch (err) {
      expect(err).to.have.property('stackTrace').which.is.a('array');
      expect(err).to.have.property('transactionHash').which.is.a('string');
      expect(err).to.have.property('stack').which.is.a('string');
      expect(err).to.have.property('message').which.is.a('string');
      expect(err.message).to.contain('Only a wFIO oracle may call this function.');
    }
  });
});

describe.skip(`E. Approval`, () => {

});