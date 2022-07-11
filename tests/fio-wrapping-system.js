//const hre = require("hardhat");
const ethers = require('ethers');
//require("@nomiclabs/hardhat-ethers");
require("mocha");
const {expect} = require("chai");
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {
  newUser,
  fetchJson,
  existingUser,
  callFioApi,
  callFioApiSigned,
  getAccountFromKey,
  getRamForUser,
  randStr
} = require("../utils.js");
const {
  getOracleRecords,
  registerNewBp,
  registerNewOracle,
  setTestOracleFees,
  cleanUpOraclessTable,
  calculateOracleFeeFromOraclessTable
} = require("./Helpers/wrapping.js");
let faucet;

before(async function () {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)
});

describe(`************************** fio-wrapping-system.js ************************** \n   A. Wrap/unwrap FIO`, function () {

    let user1;
    let provider, wfioContract;
    const wfioAbi = config.wfio.abi;
    const wrapAmt = 100000000000;  // 100 fIO
    const unwrapAmt = 600000000000;  // 60 fIO
    const chainCode = "ETH";

    describe(`Wrap FIO`, function () {

        before(`Create users and connect to ETH chain`, async () => {
            try {
                user1 = await newUser(faucet);
                user1.ethPubAdd = config.users.publicKeys[1];
                user1.ethPrivKey = config.users.privateKeys[1];

                provider = new ethers.providers.JsonRpcProvider(config.ganache.host);          
                wfioContract = new ethers.Contract(config.ganache.wfioAddress, wfioAbi, provider);



            } catch (err) {
                console.log('Error: ', err);
                expect(err).to.equal(null);
            }
        });

        it(`Wrap tokens`, async function () {
            try {
                const result = await user1.sdk.genericAction('pushTransaction', {
                    action: 'wraptokens',
                    account: 'fio.oracle',
                    data: {
                    amount: wrapAmt,
                    chain_code: chainCode,
                    public_address: user1.ethPubAdd,
                    max_oracle_fee: config.maxOracleFee,
                    max_fee: config.maxFee,
                    tpid: "",
                    }
                });
                console.log('Result: ', result);
                expect(result.status).to.equal('OK');
            } catch (err) {
                console.log('Error: ', err.json.fields);
                expect(err).to.equal(null);;
            }
        });

        it(`Check Oracle Logs`, async function () {

        });

        it(`Confirm oracle signatures on ETH chain`, async function () {

        });

        it(`Confirm WFIO balance`, async function () {

        });
    });

    describe(`Unwrap WFIO`, function () {

        it(`Unwrap wfio tokens`, async function () {
            try {
                const signer = provider.getSigner(user1.ethPubAdd);
                const wfioWithSigner = wfioContract.connect(signer);
                const result = await wfioWithSigner.unwrap(user1.address, unwrapAmt);
            } catch (err) {
                console.log('Error: ', err);
                expect(err).to.equal(null);;
            }
        });

        it(`Check Oracle Logs`, async function () {

        });

        it(`Confirm oracle signatures on FIO chain`, async function () {

        });

        it(`Confirm FIO balance`, async function () {

        });
    });

});