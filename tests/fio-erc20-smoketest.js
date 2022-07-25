require("mocha");
const {expect} = require("chai");
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {
    newUser,
    fetchJson,
    timeout,
    existingUser
  } = require("../utils.js");

const fioABI = require("./Contracts/FIO.json");
const Web3 = require('web3');

// Rinkeby (deprecated)
//const etherscan = new Web3('https://rinkeby.infura.io/v3/2ca52b84d74f46efb23d1730e4e215cf');
//const ethContractAddress = '0x39e55E8Fcc19ACA3606Ed3CFe7177442185a14F9';

// Goerli
const etherscan = new Web3('https://goerli.infura.io/v3/2ca52b84d74f46efb23d1730e4e215cf');
const ethContractAddress = '0xe3b94314e27f61b47d89f22e85f1465da52c5504';


const wfioEtherscanContract = new etherscan.eth.Contract(fioABI, ethContractAddress);

let oracle1, oracle2, oracle3;

const oracle1PublicKey = '0xa28e1D23A8Cc32cf11410A12bb97897B891f84A2';
const oracle1PrivateKey = 'a49905be22c6091a242e3f4ab9f344ae0a8d75306b9af589b60ad3a5fc5a96cc';
const oracle2PublicKey = '0xa0073162Ed8b8DD76300D8f0f111839C45554BF8';
const oracle2PrivateKey = '6ef6367581512d64b79d351f0f0595aab3880f1fecb9efca99b14f0c045a232d';
const oracle3PublicKey = '0x128202c9a1224d2fF2104Bf3a25a038529b0220B';
const oracle3PrivateKey = '73631268de5ae6be4e10edb306cfd3b6a221b6bfb039506971e9a382d7cfeac7';
const goerliPublicKey = '0xe28FF0D44d533d15cD1f811f4DE8e6b1549945c9';
const goerliPrivateKey = '49dab423907a7a4f09420adebe6f4bfc5e3b17518b83d9fdccda98a0a691285d';

const gasPrice = 20;
const gasLimit = 210000;

let faucet;

before(async function () {
    console.log('FIO erc20 Goerli testnet contract: ', ethContractAddress);
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);

    oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');

    oracle1.ethPublicKey = oracle1PublicKey;
    oracle2.ethPublicKey = oracle2PublicKey;
    oracle3.ethPublicKey = oracle3PublicKey;
    oracle1.ethPrivateKey = oracle1PrivateKey;
    oracle2.ethPrivateKey = oracle2PrivateKey;
    oracle3.ethPrivateKey = oracle3PrivateKey;
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
            //console.log('Result: ', result);
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
            //console.log('Result: ', result);
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