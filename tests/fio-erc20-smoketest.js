require("mocha");
const {expect} = require("chai");
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {
    newUser,
    fetchJson,
    timeout,
    randStr,
    existingUser
  } = require("../utils.js");

const fioABI = require("./Contracts/FIO.json");
const Web3 = require('web3');

// Goerli
const etherscan = new Web3('https://goerli.infura.io/v3/<key>');
const ethContractAddress = '';

const wfioEtherscanContract = new etherscan.eth.Contract(fioABI, ethContractAddress);

const oracle1 = {
    ethPublicKey: '',
    ethPrivateKey: ''
}

const oracle2 = {
    ethPublicKey: '',
    ethPrivateKey: ''
}

const oracle3 = {
    ethPublicKey: '',
    ethPrivateKey: ''
}

const goerliPublicKey = '';
const goerliPrivateKey = '';

const gasPrice = 20;
const gasLimit = 210000;

let faucet;

before(async function () {
    try {
        console.log('FIO erc20 Goerli testnet contract: ', ethContractAddress);
        faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
    } catch (err) {
        console.log('Error: ', err.json);
        expect(err).to.equal(null);;
    }
});

describe(`************************** fio-erc20-smoketest.js ************************** \n   A. erc20 wrap smoketest`, function () {

    let user1, rawTx1, rawTx2, rawTx3;
    const wrapAmount = 10000000000; // 10 wfio
    
    before(`Create users`, async () => {
        user1 = await newUser(faucet);
        user1.ethPublicKey = goerliPublicKey;
        user1.obtId = randStr(15);
    });

    it(`wfio getOracles`, async function () {
        const result = await wfioEtherscanContract.methods.getOracles().call(function () {  })
        console.log('Oracles: ', result)
    });

    it(`wfio getBalance`, async function () {
        result = await wfioEtherscanContract.methods.balanceOf(user1.ethPublicKey).call(function (err, result) { });
        user1.wfioBalance = result;
        console.log('Balance: ', result)
    });

    it.skip(`etherscan testnet getPastEvents`, async function () {
        try {
            const result = await wfioEtherscanContract.getPastEvents('unwrapped', {
                fromBlock: 11012398,
                toBlock: 'latest'
            })
            console.log('Result: ', result);
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`getTransactionCount and create transaction for oracle1`, async function () {
        try {
            const result = await etherscan.eth.getTransactionCount(oracle1.ethPublicKey);
            const data = wfioEtherscanContract.methods.wrap(user1.ethPublicKey, wrapAmount, user1.obtId).encodeABI();

            rawTx1 = {
                "nonce": etherscan.utils.toHex(result),
                "gasPrice": etherscan.utils.toHex(gasPrice * 1e9),
                "gasLimit": etherscan.utils.toHex(gasLimit),
                "to": ethContractAddress,
                "value": "0x00",
                "data": data,
            }

        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`wrap wfio - oracle1`, async function () {
        try {
            const signedTx = await etherscan.eth.accounts.signTransaction(rawTx1, oracle1.ethPrivateKey);
            //console.log('signed: ', signedTx);
            const result = await etherscan.eth.sendSignedTransaction(signedTx.rawTransaction);
            //console.log('Result: ', result);
            console.log('Transaction hash: ', result.transactionHash)
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`Wait a few seconds.`, async () => { await timeout(3000) });

    it(`wfio getApproval`, async function () {
        try {
            result = await wfioEtherscanContract.methods.getApproval(user1.obtId).call(function (err, result) { });
            console.log('Result: ', result);
            expect(result[0]).to.equal('1');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`getTransactionCount and create transaction for oracle2`, async function () {
        try {
            const result = await etherscan.eth.getTransactionCount(oracle2.ethPublicKey);
            const data = wfioEtherscanContract.methods.wrap(user1.ethPublicKey, wrapAmount, user1.obtId).encodeABI();

            rawTx2 = {
                "nonce": etherscan.utils.toHex(result),
                "gasPrice": etherscan.utils.toHex(gasPrice * 1e9),
                "gasLimit": etherscan.utils.toHex(gasLimit),
                "to": ethContractAddress,
                "value": "0x00",
                "data": data,
            }

        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`wrap wfio - oracle2`, async function () {
        try {

            const signedTx = await etherscan.eth.accounts.signTransaction(rawTx2, oracle2.ethPrivateKey);
            //console.log('signed: ', signedTx);
            const result = await etherscan.eth.sendSignedTransaction(signedTx.rawTransaction);
            console.log('Transaction hash: ', result.transactionHash)
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`Wait a few seconds.`, async () => { await timeout(3000) });

    it(`wfio getApproval`, async function () {
        try {
            result = await wfioEtherscanContract.methods.getApproval(user1.obtId).call(function (err, result) { });
            console.log('Result: ', result);
            expect(result[0]).to.equal('2');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`getTransactionCount and create transaction for oracle3`, async function () {
        try {
            const result = await etherscan.eth.getTransactionCount(oracle3.ethPublicKey);
            const data = wfioEtherscanContract.methods.wrap(user1.ethPublicKey, wrapAmount, user1.obtId).encodeABI();

            rawTx3 = {
                "nonce": etherscan.utils.toHex(result),
                "gasPrice": etherscan.utils.toHex(gasPrice * 1e9),
                "gasLimit": etherscan.utils.toHex(gasLimit),
                "to": ethContractAddress,
                "value": "0x00",
                "data": data,
            }

        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`wrap wfio - oracle3`, async function () {
        try {

            const signedTx = await etherscan.eth.accounts.signTransaction(rawTx3, oracle3.ethPrivateKey);
            //console.log('signed: ', signedTx);
            const result = await etherscan.eth.sendSignedTransaction(signedTx.rawTransaction);
            console.log('Transaction hash: ', result.logs[0].transactionHash)
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`Wait a few seconds.`, async () => { await timeout(3000) });

    it(`wfio getBalance`, async function () {
        result = await wfioEtherscanContract.methods.balanceOf(user1.ethPublicKey).call(function (err, result) { });
        user1.wfioBalance = result;
        console.log('Balance: ', result)
    });

    it(`wfio getApproval`, async function () {
        try {
            result = await wfioEtherscanContract.methods.getApproval(user1.obtId).call(function (err, result) { });
            //console.log('Result: ', result);
            expect(result[0]).to.equal('0');  // Has all approvals and has been removed from table
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

});

describe(`B. erc20 unwrap smoketest`, function () {

    let user1, rawTx;
    const unwrapAmount = 5000000000; // 5 wfio
    
    before(`Create users`, async () => {
        user1 = await newUser(faucet);
        user1.ethPublicKey = goerliPublicKey;
        user1.ethPrivateKey = goerliPrivateKey;
        user1.obtId = randStr(15);
    });

    it(`wfio getOracles`, async function () {
        const result = await wfioEtherscanContract.methods.getOracles().call(function () {  })
        console.log('Oracles: ', result)
    });

    it(`wfio getBalance`, async function () {
        result = await wfioEtherscanContract.methods.balanceOf(user1.ethPublicKey).call(function (err, result) { });
        user1.wfioBalance = result;
        console.log('Balance: ', result)
    });

    it(`getTransactionCount and create transaction for user1`, async function () {
        try {
            const txnCount = await etherscan.eth.getTransactionCount(user1.ethPublicKey);

            const data = wfioEtherscanContract.methods.unwrap(user1.address, unwrapAmount).encodeABI();

            rawTx = {
                "nonce": etherscan.utils.toHex(txnCount),
                "gasPrice": etherscan.utils.toHex(gasPrice * 1e9),
                "gasLimit": etherscan.utils.toHex(gasLimit),
                "to": ethContractAddress,
                "value": "0x00",
                "data": data,
            }

        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`unwrap wfio - user1`, async function () {
        try {
            const signedTx = await etherscan.eth.accounts.signTransaction(rawTx, user1.ethPrivateKey);
            //console.log('signed: ', signedTx);
            const result = await etherscan.eth.sendSignedTransaction(signedTx.rawTransaction);
            //console.log('Result: ', result);
            console.log('Transaction hash: ', result.transactionHash)
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`Wait a few seconds`, async () => { await timeout(3000) });

    it(`wfio getBalance`, async function () {
        result = await wfioEtherscanContract.methods.balanceOf(user1.ethPublicKey).call(function (err, result) { });
        user1.wfioBalance = result;
        console.log('Balance: ', result)
    });

});