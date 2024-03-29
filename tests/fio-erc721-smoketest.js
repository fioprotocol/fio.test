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
const { Console } = require("console");

// Goerli
const polygonMumbai = new Web3('https://polygon-mumbai.infura.io/v3/<key>');
const polyContractAddress = '';


const polyMumbaiContract = new polygonMumbai.eth.Contract(fionftABI, polyContractAddress);

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

const mumbaiPublicKey = '';
const mumbaiPrivateKey = '';

const gasPrice = 50;
const gasLimit = 4000000;

let faucet;

before(async function () {
    console.log('FIO erc721 Mumbai testnet contract: ', polyContractAddress);
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
});

describe(`************************** fio-erc721-smoketest.js ************************** \n   A. erc721 wrapnft smoketest`, function () {

    let user1, rawTx1, rawTx2, rawTx3;
    
    before(`Create users`, async () => {
        user1 = await newUser(faucet);
        console.log('Domain: ', user1.domain);
        user1.ethPublicKey = mumbaiPublicKey;
        user1.obtId = randStr(20);
        console.log('obt: ', user1.obtId);
    });

    it(`getOracles`, async function () {
        const result = await polyMumbaiContract.methods.getOracles().call(function () {  })
        console.log('Oracles: ', result)
    });

    it(`getBalance (returns number of domains)`, async function () {
        result = await polyMumbaiContract.methods.balanceOf(user1.ethPublicKey).call(function (err, result) { });
        user1.numberOfDomains = parseInt(result);
        console.log('Number of Domains: ', result)
    });

    it(`polygonMumbai testnet getPastEvents`, async function () {
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
                "to": polyContractAddress,
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

    it(`(BUG BD-3947) getApproval`, async function () {
        try {
            result = await polyMumbaiContract.methods.getApproval(user1.obtId).call(function (err, result) { });
            console.log('Result: ', result);
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
                "to": polyContractAddress,
                "value": "0x00",
                "data": data,
            }

        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`wrap domain - oracle2`, async function () {
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

    it(`(BUG BD-3947) getApproval`, async function () {
        try {
            result = await polyMumbaiContract.methods.getApproval(user1.obtId).call(function (err, result) { });
            console.log('Result: ', result);
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
                "to": polyContractAddress,
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

    it(`Wait a few seconds.`, async () => { await timeout(6000) });

    it(`getBalance (returns number of domains)`, async function () {
        result = await polyMumbaiContract.methods.balanceOf(user1.ethPublicKey).call(function (err, result) { });
        console.log('Number of domains: ', result);
        expect(parseInt(result)).to.equal(user1.numberOfDomains + 1);
    });

    it(`listDomainsOfOwner. Expect new domain.`, async function () {
        result = await polyMumbaiContract.methods.listDomainsOfOwner(user1.ethPublicKey).call(function (err, result) { });
        console.log('Domains: ', result);
        expect(result[result.length - 1]).to.equal(user1.domain);
    });

    it(`getApproval`, async function () {
        try {
            result = await polyMumbaiContract.methods.getApproval(user1.obtId).call(function (err, result) { });
            console.log('Result: ', result);
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

    it(`getOracles`, async function () {
        const result = await polyMumbaiContract.methods.getOracles().call(function () {  })
        console.log('Oracles: ', result)
    });

    it(`listDomainsOfOwner. Expect at least one wrapped domain. We will unwrap the most recently wrapped domain.`, async function () {
        result = await polyMumbaiContract.methods.listDomainsOfOwner(user1.ethPublicKey).call(function (err, result) { });
        console.log('Domains: ', result);
        expect(result.length).to.be.greaterThan(0);
        user1.unwrapDomain = result[result.length - 1];
    });

    it(`getPastEvents for 'wrapped' events fom erc721 contract. Expect to find wrap.`, async function () {
        try {
            let transactions, finishBlock;
            const stepSize = 3000;

            const result = await polygonMumbai.eth.getBlockNumber();
            finishBlock = result;  // Set to latest block

            let txnsFound = false;
            while (txnsFound === false) {
                transactions = await polyMumbaiContract.getPastEvents('wrapped', {
                    fromBlock: finishBlock - stepSize,
                    toBlock: finishBlock
                })
                if (transactions.length != 0) {
                    console.log('Found');
                    txnsFound = true;
                    break;
                } else {
                    console.log('finishBlock: ', finishBlock);
                    finishBlock -= stepSize;
                }
            }

            //console.log('Transactions: ', transactions);
            for (txn in transactions) {
                //console.log('Txn account: ', transactions[txn].returnValues.account);
                if (transactions[txn].returnValues.domain === user1.unwrapDomain) {
                    //console.log('Found txn: ', transactions[txn]);
                    user1.ethTxnId = transactions[txn].transactionHash;
                    break;
                }
            }
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`Get tokenId from the txn receipt`, async function () {
        try {
            result = await polygonMumbai.eth.getTransactionReceipt(user1.ethTxnId);
            console.log('Token ID: ', polygonMumbai.utils.hexToNumber(result.logs[0].topics[3]));  
            user1.tokenId = polygonMumbai.utils.hexToNumber(result.logs[0].topics[3]);   // How strange is this?
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    });

    it(`Get ownerOf tokenId. Expect user1`, async function () {
        try {
            result = await polyMumbaiContract.methods.ownerOf(user1.tokenId).call(function (err, result) { });
            //console.log('result ', result);           
            expect(result).to.equal(user1.ethPublicKey);
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    });

    it(`getTransactionCount and create transaction for user1`, async function () {
        try {
            const txnCount = await polygonMumbai.eth.getTransactionCount(user1.ethPublicKey);

            const data = polyMumbaiContract.methods.unwrapnft(user1.address, user1.tokenId).encodeABI();

            rawTx = {
                "nonce": polygonMumbai.utils.toHex(txnCount),
                "gasPrice": polygonMumbai.utils.toHex(gasPrice * 1e9),
                "gasLimit": polygonMumbai.utils.toHex(gasLimit),
                "to": polyContractAddress,
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