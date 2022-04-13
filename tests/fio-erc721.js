const hre = require("hardhat");
const ethers = hre.ethers;
require("@nomiclabs/hardhat-ethers");
require("mocha");
const {expect} = require("chai");
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {newUser, fetchJson, timeout} = require('../utils.js');
const {callFioApiSigned} = require("../utils");
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

describe(`B. Pause FIONFT contract`, function () {

  let fioAccount;
  let fioTransaction;
  let owner;
  let ercAccts;
  let custodians;
  let factory;
  let fioNft;
  let TRANSACTIION_ID;
  let newOracle, newOracle1, newOracle2;

  before(async function () {
    fioAccount = await newUser(faucet);

    // new FIO oracles
    newOracle = await newUser(faucet);
    newOracle1 = await newUser(faucet);
    newOracle2 = await newUser(faucet);

    // register new oracles as bps
    await registerNewBp(newOracle);
    await registerNewBp(newOracle1);
    await registerNewBp(newOracle2);

    // await newOracles
    await registerNewOracle(newOracle);
    await registerNewOracle(newOracle1);
    await registerNewOracle(newOracle2);

    // set oracle fees
    await setTestOracleFees(newOracle, 10000000000, 11000000000);
    await setTestOracleFees(newOracle1, 11000000000, 20000000000);
    await setTestOracleFees(newOracle2, 20000000000, 21000000000);

    [owner, ercAccts, fioNft] = await setupFIONFTcontract(ethers);
    await registerFioNftOracles(fioNft, ercAccts);

    try {
      fioTransaction = await callFioApiSigned('push_transaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        actor: fioAccount.account,
        privKey: fioAccount.privateKey,
        data: {
          fio_domain: fioAccount.domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: fioAccount.account
        }
      });
      TRANSACTIION_ID = fioTransaction.transaction_id;
    } catch (err) {
      throw err;
    }
  });

  it(`pause the contract`, async function () {
    await fioNft.connect(ercAccts[1]).pause();
    try {
      // wrapping/unwrapping is prohibited when contract is paused
      await fioNft.connect(ercAccts[12]).wrapnft(ercAccts[0].address, fioAccount.domain, TRANSACTIION_ID);
    } catch (err) {
      expect(err.message).to.contain('Pausable: paused');
    } finally {
      await fioNft.connect(ercAccts[1]).unpause();




      await fioNft.connect(ercAccts[12]).wrapnft(ercAccts[0].address, fioAccount.domain, TRANSACTIION_ID);
    }
  });
});

describe(`C. Unpause FIONFT contract`, function () {

  let fioAccount;
  let fioTransaction;
  let owner;
  let ercAccts;
  let custodians;
  let factory;
  let fioNft;
  let TRANSACTIION_ID;
  let newOracle, newOracle1, newOracle2;

  before(async function () {
    fioAccount = await newUser(faucet);

    // new FIO oracles
    newOracle = await newUser(faucet);
    newOracle1 = await newUser(faucet);
    newOracle2 = await newUser(faucet);

    // register new oracles as bps
    await registerNewBp(newOracle);
    await registerNewBp(newOracle1);
    await registerNewBp(newOracle2);

    // await newOracles
    await registerNewOracle(newOracle);
    await registerNewOracle(newOracle1);
    await registerNewOracle(newOracle2);

    // set oracle fees
    await setTestOracleFees(newOracle, 10000000000, 11000000000);
    await setTestOracleFees(newOracle1, 11000000000, 20000000000);
    await setTestOracleFees(newOracle2, 20000000000, 21000000000);

    [owner, ercAccts, fioNft] = await setupFIONFTcontract(ethers);
    await registerFioNftOracles(fioNft, ercAccts);

    try {
      fioTransaction = await callFioApiSigned('push_transaction', {
        action: 'wrapdomain',
        account: 'fio.oracle',
        actor: fioAccount.account,
        privKey: fioAccount.privateKey,
        data: {
          fio_domain: fioAccount.domain,
          chain_code: "ETH",
          public_address: fioNft.address,
          max_oracle_fee: config.maxFee,
          max_fee: config.maxFee,
          tpid: "",
          actor: fioAccount.account
        }
      });
      TRANSACTIION_ID = fioTransaction.transaction_id;
    } catch (err) {
      throw err;
    }
    await fioNft.connect(ercAccts[1]).pause();
  });

  it(`unpause the wFIO contract`, async function () {
    try {
      await fioNft.connect(ercAccts[1]).unpause();
      // wrapping/unwrapping is prohibited when contract is paused
      await fioNft.connect(ercAccts[12]).wrapnft(ercAccts[0].address, fioAccount.domain, TRANSACTIION_ID);
    } catch (err) {
      throw err;
    }
  });

});
