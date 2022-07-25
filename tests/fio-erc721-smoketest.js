require("mocha");
const {expect} = require("chai");
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {
    newUser,
    fetchJson,
    timeout,
    existingUser,
    randStr
  } = require("../utils.js");

const fionftABI = require("./Contracts/FIOMATICNFT.json");

const Web3 = require('web3');

// Goerli
const polygonMumbai = new Web3('https://goerli.infura.io/v3/2ca52b84d74f46efb23d1730e4e215cf');
const polyContractAddress = 'XXXX';


const polyMumbaiContract = new polygonMumbai.eth.Contract(fionftABI, polyContractAddress);

let oracle1, oracle2, oracle3;

const oracle1PublicKey = '0xa28e1D23A8Cc32cf11410A12bb97897B891f84A2';
const oracle1PrivateKey = 'a49905be22c6091a242e3f4ab9f344ae0a8d75306b9af589b60ad3a5fc5a96cc';
const oracle2PublicKey = '0xa0073162Ed8b8DD76300D8f0f111839C45554BF8';
const oracle2PrivateKey = '6ef6367581512d64b79d351f0f0595aab3880f1fecb9efca99b14f0c045a232d';
const oracle3PublicKey = '0x128202c9a1224d2fF2104Bf3a25a038529b0220B';
const oracle3PrivateKey = '73631268de5ae6be4e10edb306cfd3b6a221b6bfb039506971e9a382d7cfeac7';
const mumbaiPublicKey = '0x2Aed9C44bf9E8f55A1082be42C80587F6F210c10';
const mumbaiPrivateKey = '7a12dcf741f5fd343d99ec2600b4f8b202b6e2cf1bca1fbf2c64152a0f66190e';

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

describe.only(`************************** fio-erc721-smoketest.js ************************** \n   A. erc721 wrapnft smoketest`, function () {

    let user1, rawTx1, rawTx2, rawTx3;
    
    before(`Create users`, async () => {
        user1 = await newUser(faucet);
        user1.ethPublicKey = mumbaiPublicKey;
        user1.obtId = randStr(15);
    });

    it(`wfio getOracles`, async function () {
        const result = await polyMumbaiContract.methods.getOracles().call(function () {  })
        console.log('Oracles: ', result)
    });

    it(`wfio getBalance`, async function () {
        result = await polyMumbaiContract.methods.balanceOf(user1.ethPublicKey).call(function (err, result) { });
        user1.wfioBalance = result;
        console.log('Balance: ', result)
    });

    it.skip(`polygonMumbai testnet getPastEvents`, async function () {
        try {
            const result = await polyMumbaiContract.getPastEvents('unwrapped', {
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
            const result = await polygonMumbai.eth.getTransactionCount(oracle1.ethPublicKey);
            const data = polyMumbaiContract.methods.wrapnft(user1.ethPublicKey, user1.domain, user1.obtId).encodeABI();

            rawTx1 = {
                "nonce": polygonMumbai.utils.toHex(result),
                "gasPrice": polygonMumbai.utils.toHex(gasPrice * 1e9),
                "gasLimit": polygonMumbai.utils.toHex(gasLimit),
                "to": ethContractAddress,
                "value": "0x00",
                "data": data,
            }

        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`wrap domain - oracle1`, async function () {
        try {
            const signedTx = await polygonMumbai.eth.accounts.signTransaction(rawTx1, oracle1.ethPrivateKey);
            //console.log('signed: ', signedTx);
            const result = await polygonMumbai.eth.sendSignedTransaction(signedTx.rawTransaction);
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
            result = await polyMumbaiContract.methods.getApproval(user1.obtId).call(function (err, result) { });
            //console.log('Result: ', result);
            expect(result[0]).to.equal('1');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`getTransactionCount and create transaction for oracle2`, async function () {
        try {
            const result = await polygonMumbai.eth.getTransactionCount(oracle2.ethPublicKey);
            const data = polyMumbaiContract.methods.wrapnft(user1.ethPublicKey, user1.domain, user1.obtId).encodeABI();

            rawTx2 = {
                "nonce": polygonMumbai.utils.toHex(result),
                "gasPrice": polygonMumbai.utils.toHex(gasPrice * 1e9),
                "gasLimit": polygonMumbai.utils.toHex(gasLimit),
                "to": ethContractAddress,
                "value": "0x00",
                "data": data,
            }

        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`wrap domain wfio - oracle2`, async function () {
        try {

            const signedTx = await polygonMumbai.eth.accounts.signTransaction(rawTx2, oracle2.ethPrivateKey);
            //console.log('signed: ', signedTx);
            const result = await polygonMumbai.eth.sendSignedTransaction(signedTx.rawTransaction);
            console.log('Transaction hash: ', result.transactionHash)
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`Wait a few seconds.`, async () => { await timeout(3000) });

    it(`wfio getApproval`, async function () {
        try {
            result = await polyMumbaiContract.methods.getApproval(user1.obtId).call(function (err, result) { });
            //console.log('Result: ', result);
            expect(result[0]).to.equal('2');
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`getTransactionCount and create transaction for oracle3`, async function () {
        try {
            const result = await polygonMumbai.eth.getTransactionCount(oracle3.ethPublicKey);
            const data = polyMumbaiContract.methods.wrapnft(user1.ethPublicKey, user1.domain, user1.obtId).encodeABI();

            rawTx3 = {
                "nonce": polygonMumbai.utils.toHex(result),
                "gasPrice": polygonMumbai.utils.toHex(gasPrice * 1e9),
                "gasLimit": polygonMumbai.utils.toHex(gasLimit),
                "to": ethContractAddress,
                "value": "0x00",
                "data": data,
            }

        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`wrap domain - oracle3`, async function () {
        try {

            const signedTx = await polygonMumbai.eth.accounts.signTransaction(rawTx3, oracle3.ethPrivateKey);
            //console.log('signed: ', signedTx);
            const result = await polygonMumbai.eth.sendSignedTransaction(signedTx.rawTransaction);
            console.log('Transaction hash: ', result.logs[0].transactionHash)
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`Wait a few seconds.`, async () => { await timeout(3000) });

    it(`wfio getBalance`, async function () {
        result = await polyMumbaiContract.methods.balanceOf(user1.ethPublicKey).call(function (err, result) { });
        user1.wfioBalance = result;
        console.log('Balance: ', result)
    });

    it(`wfio getApproval`, async function () {
        try {
            result = await polyMumbaiContract.methods.getApproval(user1.obtId).call(function (err, result) { });
            //console.log('Result: ', result);
            expect(result[0]).to.equal('0');  // Has all approvals and has been removed from table
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

});

describe(`B. erc721 unwrapnft smoketest`, function () {

    let user1, rawTx;
    
    before(`Create users`, async () => {
        user1 = await newUser(faucet);
        user1.ethPublicKey = mumbaiPublicKey;
        user1.ethPrivateKey = mumbaiPrivateKey;
        user1.obtId = randStr(15);
    });

    it(`wfio getOracles`, async function () {
        const result = await polyMumbaiContract.methods.getOracles().call(function () {  })
        console.log('Oracles: ', result)
    });

    it(`getTransactionCount and create transaction for user1`, async function () {
        try {
            const txnCount = await polygonMumbai.eth.getTransactionCount(user1.ethPublicKey);

            const data = polyMumbaiContract.methods.unwrapnft(user1.address, tokenId).encodeABI();

            rawTx = {
                "nonce": polygonMumbai.utils.toHex(txnCount),
                "gasPrice": polygonMumbai.utils.toHex(gasPrice * 1e9),
                "gasLimit": polygonMumbai.utils.toHex(gasLimit),
                "to": ethContractAddress,
                "value": "0x00",
                "data": data,
            }

        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`unwrap domain - user1`, async function () {
        try {
            const signedTx = await polygonMumbai.eth.accounts.signTransaction(rawTx, user1.ethPrivateKey);
            //console.log('signed: ', signedTx);
            const result = await polygonMumbai.eth.sendSignedTransaction(signedTx.rawTransaction);
            //console.log('Result: ', result);
            console.log('Transaction hash: ', result.transactionHash)
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

});