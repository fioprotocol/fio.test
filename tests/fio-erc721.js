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

before(async function () {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
});

describe(`************************** fio-eth.js ************************** \n   A. [ETH] WFIO quick tests`, function () {

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

