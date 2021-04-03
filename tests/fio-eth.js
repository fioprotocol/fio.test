require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson, timeout, callFioApi} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
var Web3 = require('web3');
web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:9545>'));
var tx = require('ethereumjs-tx');
var testamount = web3.utils.numberToHex(web3.utils.toWei('0.1', 'ether'));

var wfioabi = "";
var fionftabi = "";
var wfioaddress = "";
var fionftaddress = "";
//var wfiocontact = new web3.eth.Contract(wfioabi, wfioaddress);
//var fionftcontract = new web3.eth.Contract(fionftabi, fionftaddress);

config = require('../config.js');

before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

describe.only(`************************** fio-eth.js ************************** \n   WFIO AND FIONFT QUICK TESTS`, () => {

  it(`Create ethereum account`, async () =>  {

    createWallet = cb => {
      cb(web3.eth.accounts.create());
    };

    createWallet(result => {
      expect(web3.utils.isAddress(result.address)).to.equal(true);

      console.log("Private Key is:", result.privateKey);
      console.log("Address is: ", result.address);
    });

  })

  it(`register custodian`, async () =>  {

  })

  it(`unregister custodian`, async () => {

  })

  it(`register oracle 1`, async () => {

  })

  it(`register oracle 2`, async () => {

  })

  it(`register oracle 3`, async () => {

  })

  it(`Wrap 100 wFIO`, async () => {

  })

  it(`Unwrap 100 wFIO`, async () => {

  })

  it(`Unregister oracle 1`, async () => {

  })

  it(`Wrap 100 wFIO (Less than 3 oracles)`, async () => {

  })

  it(`Unregister oracle 2`, async () => {

  })

  it(`Unregister oracle 3`, async () => {

  })

  it(`Wrap 100 wFIO (No oracles)`, async () => {

  })

  it(`Unwrap 100 wFIO`, async () => {

  })



})
