/**
 * These tests require modifications to fio.contracts
 * 
 * In fio.oracle.cpp:
* 
* First, change to "1 <= oracle_size"
* Lines 65, 186, 374, 520
* Change:
* 
*             fio_400_assert(3 <= oracle_size, "actor", actor.to_string(), "Not enough registered oracles.",
*                            ErrorMaxFeeInvalid);
* to:
* 
*             fio_400_assert(1 <= oracle_size, "actor", actor.to_string(), "Not enough registered oracles.",
*                            ErrorMaxFeeInvalid);
* 
* Next, comment out require_auth
* Lines 263, 296 
* Change:
* 
*             require_auth(SYSTEMACCOUNT);
*             
* to: 
* 
*             //require_auth(SYSTEMACCOUNT);
*/

const fs = require('fs');
require("mocha");
const {expect} = require("chai");
const {FIOSDK} = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const {
    newUser,
    fetchJson,
    timeout,
    existingUser,
    callFioApi,
    callFioApiSigned,
    stringToHash
  } = require("../utils.js");
const {
    getOracleRecords,
    registerNewBp,
    registerNewOracle,
    setTestOracleFees,
    cleanUpOraclessTable,
    calculateOracleFeeFromOraclessTable
  } = require("./Helpers/wrapping.js");

const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:8545');

const fioABI = require("./Contracts/FIO.json");
const wfioContract = new web3.eth.Contract(fioABI, '0x7F256BACDA60E31Db3eE12d1ed4939954BdA4F8f');

const fionftABI = require("./Contracts/FIOMATICNFT.json");
const { resolve } = require('dns');
const nftContract = new web3.eth.Contract(fionftABI, '0x068C9650EE573D52C76e9AFc3EF8e8C197c5D489');

// Use to test against the erc20 Testnet contract at https://rinkeby.etherscan.io/address/0x39e55E8Fcc19ACA3606Ed3CFe7177442185a14F9
//const etherscan = new Web3('https://rinkeby.infura.io/v3/2ca52b84d74f46efb23d1730e4e215cf');
//const wfioEtherscanContract = new etherscan.eth.Contract(fioABI, '0x39e55E8Fcc19ACA3606Ed3CFe7177442185a14F9');

const domainWrapFee = 50000000000;  // 50 FIO
const tokenWrapFee = 40000000000; // 40 FIO
const logDir = '/Users/ericbutz/git/fio.oracle/controller/api/logs/';

let faucet, owner;
let accounts = [], custodians = [], oracles = [], users = [];
let oracle1, oracle2, oracle3;

before(async function () {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);

    oracle1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');
    oracle2 = await existingUser('hfdg2qumuvlc', '5JnhMxfnLhZeRCRvCUsaHbrvPSxaqjkQAgw4ZFodx4xXyhZbC9P', 'FIO7uTisye5w2hgrCSE1pJhBKHfqDzhvqDJJ4U3vN9mbYWzataS2b', 'dapixdev', 'bp2@dapixdev');
    oracle3 = await existingUser('wttywsmdmfew', '5JvmPVxPxypQEKPwFZQW4Vx7EC8cDYzorVhSWZvuYVFMccfi5mU', 'FIO6oa5UV9ghWgYH9en8Cv8dFcAxnZg2i9z9gKbnHahciuKNRPyHc', 'dapixdev', 'bp3@dapixdev');

    try {
        // owner = 0, custodians = 1-10, oracles = 11-13
        accounts = await web3.eth.getAccounts();
        owner = accounts[0]
        for (let i = 1; i < 11; i++) {
            custodians.push(accounts[i]);
        }
        for (let i = 11; i < 14; i++) {
                oracles.push(accounts[i]);
        }
        for (let i = 14; i < 20; i++) {
            users.push(accounts[i]);
        }
        //console.log('Owner: ', owner);
        //console.log('All accounts: ', accounts)
        //console.log('Custodians: ', custodians);
        //console.log('Oracles: ', oracles);
        //console.log('Users: ', users);

    } catch (err) {
        console.log('Error: ', err);
        throw(err);
    }

    try { 
        // This test requires that ONLY one FIO oracle is registered
        await cleanUpOraclessTable(faucet, true);
        await registerNewOracle(oracle1);
        await setTestOracleFees(oracle1, domainWrapFee, tokenWrapFee);

        let records = await getOracleRecords();
        //console.log('Records: ', records.rows[0]);
        expect(records.rows.length).to.equal(1);
        expect(records.rows[0].actor).to.equal(oracle1.account);
        expect(records.rows[0].fees.length).to.equal(2);
    } catch (err) {
        console.log('Error: ', err);
        throw(err);
    }
});

describe(`************************** fio-wrapping-system.js ************************** \n   A. Single token wrap/unwrap with oracle example`, function () {

    let user0;
    const wrapAmt = 20000000000;  // 20 fIO
    const unwrapAmt = 5000000000;  // 5 wfIO
    const chainCode = "ETH";

    before(`Create users and connect to ETH chain`, async () => {
        try {
            user0 = await newUser(faucet);
            user0.ethAddress = users[0];
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });

    describe(`Wrap FIO`, function () {
        let wrap_fio_tokens_fee;

        it(`Get user0 wfio balanceOf from ETH chain`, async function () {
            result = await wfioContract.methods.balanceOf(user0.ethAddress).call(function (err, result) { });
            user0.wfioBalance = result;
            //console.log('wfio balance: ', result)
        });

        it(`Get user0 FIO balance from FIO chain`, async () => {
            try {
                const result = await user0.sdk.genericAction('getFioBalance', {
                    fioPublicKey: user0.publicKey
                })
                user0.fioBalance = result.balance;
                //console.log('user0 fio balance', result);
            } catch (err) {
                //console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it('Get fee for wrap_fio_tokens', async () => {
            try {
                result = await user0.sdk.getFee('wrap_fio_tokens', user0.address);
                wrap_fio_tokens_fee = result.fee;

                //oracleFee = await callFioApi('get_oracle_fees', {});
                //wrap_fio_tokens_oracle_fee = oracleFee.oracle_fees[1].fee_amount;  // 1 is wrap_fio_tokens              
            } catch (err) {
                console.log('Error', err);
                expect(err).to.equal(null);
            }
        })

        it(`Wrap tokens`, async function () {
            try {
                const result = await user0.sdk.genericAction('pushTransaction', {
                    action: 'wraptokens',
                    account: 'fio.oracle',
                    data: {
                    amount: wrapAmt,
                    chain_code: chainCode,
                    public_address: user0.ethAddress,
                    max_oracle_fee: config.maxOracleFee,
                    max_fee: config.maxFee,
                    tpid: "",
                    }
                });
                user0.transaction_id = result.transaction_id;
                //console.log('transaction_id: ', user0.transaction_id);
                expect(result.status).to.equal('OK');
            } catch (err) {
                console.log('Error: ', err.json);
                expect(err).to.equal(null);
            }
        });

        it(`Get user0 FIO balance from FIO chain. Expect reduced.`, async () => {
            try {
                const result = await user0.sdk.genericAction('getFioBalance', {
                    fioPublicKey: user0.publicKey
                });
                //console.log('Balance', result);
                expect(result.balance).to.equal(user0.fioBalance - wrapAmt - wrap_fio_tokens_fee - tokenWrapFee);
            } catch (err) {
                //console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Wait 8 seconds for fio.oracle to execute`, async () => { await timeout(8000) });

        it(`Check FIO.log`, async function () {
            try {
                let logItem;
                
                let logFile = logDir + 'FIO.log';

                const array = fs.readFileSync(logFile).toString().split("\n");

                for(i in array) {
                    if (array[i].search(user0.transaction_id) > 0) {
                        //console.log('Found item: ', array[i]);
                        logItem = JSON.parse(array[i]);
                        break
                    }
                }
                expect(logItem.transaction.action_trace.act.name).to.equal('wraptokens');
                expect(logItem.transaction.action_trace.act.data.amount).to.equal(wrapAmt);
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`getPastEvents for 'wrapped' events on ETH chain. Expect to find wrap.`, async function () {
            try {
                let txnEvent;
                const transactions = await wfioContract.getPastEvents('wrapped', {
                    fromBlock: 0,
                    toBlock: 'latest'
                })
                //console.log('Result: ', transactions);
                //console.log('user0.transaction_id: ', user0.transaction_id);
                for (txn in transactions) {
                    if (transactions[txn].returnValues.obtid === user0.transaction_id) {
                        //console.log('Found txn: ', transactions[txn].returnValues.obtid);
                        txnEvent = transactions[txn];
                        break;
                    }
                }
                expect(txnEvent.returnValues.amount).to.equal(wrapAmt.toString());
                expect(txnEvent.returnValues.account).to.equal(user0.ethAddress);
            } catch (err) {
                console.log('Error: ', err);
                expect(err).to.equal(null);;
            }
        });

        it(`Get user0 wfio balance. Expect increase.`, async function () {
            try {
                result = await wfioContract.methods.balanceOf(user0.ethAddress).call(function (err, result) { });
                //console.log('Prev wfio balance: ', user0.wfioBalance);
                //console.log('wrapAmt: ', wrapAmt);
                //console.log('New wfio balance: ', result);               
                expect(parseInt(result)).to.equal(parseInt(user0.wfioBalance) + wrapAmt);
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        });
    });

    describe(`Unwrap WFIO`, function () {
        let unwrapTxnId = "0x134213413421343";

        it(`Get user0 wfio balanceOf from ETH chain`, async function () {
            result = await wfioContract.methods.balanceOf(user0.ethAddress).call(function (err, result) { });
            user0.wfioBalance = result;
            //console.log('Balance: ', result)
        });

        it(`Get user0 FIO balance from FIO chain`, async () => {
            try {
                const result = await user0.sdk.genericAction('getFioBalance', {
                    fioPublicKey: user0.publicKey
                })
                user0.fioBalance = result.balance;
                //console.log('user0 fio balance', result);
            } catch (err) {
                //console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`wfio unwrap`, async function () {  
            try {
                wfioContract.methods
                    .unwrap(user0.address, unwrapAmt)
                    .send({ from: user0.ethAddress }, function (err, res) {
                        if (err) {
                            console.log("An error occured", err)
                            return
                        }   
                        //console.log("Hash of the transaction: " + res);
                        unwrapTxnId = res;
                    })
            } catch (err) {
                console.log('Error: ', err);
                expect(err).to.equal(null);;
            }
        });

        it(`Wait 8 seconds for fio.oracle to execute`, async () => { await timeout(8000) });

        it(`Get user0 wfio balance. Expect reduced.`, async function () {
            try {
                result = await wfioContract.methods.balanceOf(user0.ethAddress).call(function (err, result) { });
                //console.log('Balance: ', result);
                expect(parseInt(result)).to.equal(parseInt(user0.wfioBalance) - unwrapAmt);
            } catch (err) {
                //console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Check FIO.log`, async function () {
            try {
                let logItem;
                let logFile = logDir + 'FIO.log';
                const array = fs.readFileSync(logFile).toString().split("\n");

                for(i in array) {
                    if (array[i].search(unwrapTxnId) > 0) {
                        //console.log('Found item: ', array[i]);
                        logItem = JSON.parse(array[i]);
                        break
                    }
                }
                expect(logItem.transaction.processed.action_traces[0].act.name).to.equal('unwraptokens');
                expect(logItem.transaction.processed.action_traces[0].act.data.amount).to.equal(unwrapAmt);
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Confirm entry in FIO oravotes table`, async function () {
            try {
                const obtidHash = stringToHash(unwrapTxnId);

                const json = {
                    json: true,
                    code: 'fio.oracle',
                    scope: 'fio.oracle',
                    table: 'oravotes',
                    lower_bound: obtidHash.toString(), //"0xc5eae74c669130ff533b98394f0b7a2e",
                    upper_bound: obtidHash.toString(), //"0xc5eae74c669130ff533b98394f0b7a2e",
                    key_type: "i128",
                    index_position: '2',
                }
                const unwrapVotes = await callFioApi("get_table_rows", json);
                //console.log('voterInfo: ', unwrapVotes);
                expect(unwrapVotes.rows.length).to.equal(1);
                expect(unwrapVotes.rows[0].obt_id).to.equal(unwrapTxnId);
                expect(unwrapVotes.rows[0].amount).to.equal(unwrapAmt);
            } catch (err) {
                console.log('Error', err);
                expect(err).to.equal(null);
            }
        });

        it(`Get user0 FIO balance from FIO chain. Expect increase.`, async () => {
            try {
                const result = await user0.sdk.genericAction('getFioBalance', {
                    fioPublicKey: user0.publicKey
                });
                //console.log('Balance', result);
                expect(result.balance).to.equal(user0.fioBalance + unwrapAmt);
            } catch (err) {
                //console.log('Error', err)
                expect(err).to.equal(null)
            }
        });



    });

});

describe(`B. Single domain wrap/unwrap with oracle Example`, function () {

    let user0;
    const chainCode = "MATIC";

    before(`Create users and connect to ETH chain`, async () => {
        try {
            user0 = await newUser(faucet);
            user0.ethAddress = users[0];
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });

    describe(`Wrap/unwrap Domain`, function () {
        let wrap_fio_domain_fee;

        it(`Get user0 domains from FIO chain. Expect single domain.`, async () => {
            try {
                const result = await user0.sdk.genericAction('getFioDomains', {
                    fioPublicKey: user0.publicKey
                })
                //console.log('Result:', result);
                expect(result.fio_domains.length).to.equal(1);
            } catch (err) {
                //console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it('Get fee for wrap_fio_domain', async () => {
            try {
                result = await user0.sdk.getFee('wrap_fio_domain', user0.address);
                wrap_fio_domain_fee = result.fee;          
            } catch (err) {
                console.log('Error', err);
                expect(err).to.equal(null);
            }
        });

        it(`Estimate gas`, async function () {  
            try {
                nftContract.methods
                    .wrapnft(user0.ethAddress, user0.domain, '132413241324')
                    .estimateGas({ from: '0xFC5951F15085B0245407332EEFe6B20315395382' }, function (err, res) {
                        if (err) {
                            console.log("An error occured", err)
                            return
                        }   
                        //console.log("             Estimated gas cost (the PGASLIMIT .env var must be greater than this value): " + res);
                        unwrapTxnId = res;
                    })
            } catch (err) {
                console.log('Error: ', err);
                expect(err).to.equal(null);;
            }
        });

        it(`Wrap user0 domain`, async function () {
            try {
                const result = await user0.sdk.genericAction('pushTransaction', {
                    action: 'wrapdomain',
                    account: 'fio.oracle',
                    data: {
                    fio_domain: user0.domain,
                    chain_code: chainCode,
                    public_address: user0.ethAddress,
                    max_oracle_fee: config.maxOracleFee,
                    max_fee: config.maxFee,
                    tpid: "",
                    }
                });
                user0.transaction_id = result.transaction_id;
                //console.log('             transaction_id: ', user0.transaction_id);
                expect(result.status).to.equal('OK');
            } catch (err) {
                console.log('Error: ', err.json);
                expect(err).to.equal(null);
            }
        });

        it(`Wait 8 seconds for fio.oracle to execute`, async () => { await timeout(8000) });

        it(`Get user0 FIO domains from FIO chain. Expect error: No FIO Domains.`, async () => {
            try {
                const result = await user0.sdk.genericAction('getFioDomains', {
                    fioPublicKey: user0.publicKey
                });
                console.log('Domains', result);
                expect(result.status).to.equal(null);
            } catch (err) {
                //console.log('Error', err);
                expect(err.json.message).to.equal('No FIO Domains');
                expect(err.errorCode).to.equal(404);
            }
        });

        it(`Check FIO.log`, async function () {
            try {
                let logItem;
                
                let logFile = logDir + 'FIO.log';

                const array = fs.readFileSync(logFile).toString().split("\n");

                for(i in array) {
                    if (array[i].search(user0.transaction_id) > 0) {
                        //console.log('Found item: ', array[i]);
                        logItem = JSON.parse(array[i]);
                        break
                    }
                }
                expect(logItem.transaction.action_trace.act.name).to.equal('wrapdomain');
                expect(logItem.transaction.action_trace.act.data.fio_domain).to.equal(user0.domain);
                expect(logItem.transaction.action_trace.act.data.chain_code).to.equal(chainCode);
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`getPastEvents for 'wrapped' events fom erc721 contract. Expect to find wrap.`, async function () {
            try {
                let txnEvent;
                const transactions = await nftContract.getPastEvents('wrapped', {
                    fromBlock: 0,
                    toBlock: 'latest'
                })
                //console.log('Result: ', transactions);
                for (txn in transactions) {
                    if (transactions[txn].returnValues.obtid === user0.transaction_id) {
                        //console.log('Found txn: ', transactions[txn]);
                        txnEvent = transactions[txn];
                        user0.ethTxnId = txnEvent.transactionHash;
                        break;
                    }
                }
                expect(txnEvent.returnValues.domain).to.equal(user0.domain);
                expect(txnEvent.returnValues.account).to.equal(user0.ethAddress);
            } catch (err) {
                console.log('Error: ', err);
                expect(err).to.equal(null);;
            }
        });

        it(`Get tokenId from the txn receipt`, async function () {
            try {
                result = await web3.eth.getTransactionReceipt(user0.ethTxnId);
                //console.log('Result: ', web3.utils.hexToNumber(result.logs[0].topics[3]));  
                user0.tokenId = web3.utils.hexToNumber(result.logs[0].topics[3]);   // How strange is this?
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Get ownerOf tokenId. Expect user0`, async function () {
            try {
                result = await nftContract.methods.ownerOf(user0.tokenId).call(function (err, result) { });
                //console.log('result ', result);           
                expect(result).to.equal(user0.ethAddress);
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`getURI for tokenId. Expect domain url`, async function () {
            try {
                result = await nftContract.methods.tokenURI(user0.tokenId).call(function (err, result) { });
                //console.log('result: ', result);
                user0.tokenURL = result;            
                expect(result).to.equal(`https://metadata.fioprotocol.io/domainnft/${user0.domain}.json`);
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

    /**
     * For domain unwrap, we need access to the tokenId, so keeping it as part of the same describe chunk
     */


        it(`user0 unwrapnft`, async function () {  
            try {
                nftContract.methods
                    .unwrapnft(user0.address, user0.tokenId)
                    .send({ from: user0.ethAddress }, function (err, res) {
                        if (err) {
                            console.log("An error occured", err)
                            return
                        }   
                        //console.log("Hash of the transaction: " + res);
                        user0.unwrapTxnId = res;
                    })
            } catch (err) {
                console.log('Error: ', err);
                expect(err).to.equal(null);;
            }
        });

        it(`Wait 8 seconds for fio.oracle to execute`, async () => { await timeout(8000) });

        it(`Check FIO.log`, async function () {
            try {
                let logItem;
                let logFile = logDir + 'FIO.log';
                const array = fs.readFileSync(logFile).toString().split("\n");

                for(i in array) {
                    if (array[i].search(user0.unwrapTxnId) > 0) {
                        //console.log('Found item: ', array[i]);
                        logItem = JSON.parse(array[i]);
                        break
                    }
                }
                expect(logItem.transaction.processed.action_traces[0].act.name).to.equal('unwrapdomain');
                expect(logItem.transaction.processed.action_traces[0].act.data.fio_domain).to.equal(user0.domain);
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Confirm entry in FIO oravotes table`, async function () {
            try {
                const obtidHash = stringToHash(user0.unwrapTxnId);

                const json = {
                    json: true,
                    code: 'fio.oracle',
                    scope: 'fio.oracle',
                    table: 'oravotes',
                    lower_bound: obtidHash.toString(), //"0xc5eae74c669130ff533b98394f0b7a2e",
                    upper_bound: obtidHash.toString(), //"0xc5eae74c669130ff533b98394f0b7a2e",
                    key_type: "i128",
                    index_position: '2',
                }
                const unwrapVotes = await callFioApi("get_table_rows", json);
                //console.log('voterInfo: ', unwrapVotes);
                expect(unwrapVotes.rows.length).to.equal(1);
                expect(unwrapVotes.rows[0].obt_id).to.equal(user0.unwrapTxnId);
                expect(unwrapVotes.rows[0].nftname).to.equal(user0.domain);
            } catch (err) {
                console.log('Error', err);
                expect(err).to.equal(null);
            }
        });

        it(`Get user0 FIO domains from FIO chain. Expect: 1 domain`, async () => {
            try {
                const result = await user0.sdk.genericAction('getFioDomains', {
                    fioPublicKey: user0.publicKey
                });
                //console.log('Domains', result);
                expect(result.fio_domains[0].fio_domain).to.equal(user0.domain);
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        });
    });

});

describe(`C. Three token wraps in same oracle polltime, then three token unwraps in same oracle polltime`, function () {

    let user0;
    const wrapAmt = 20000000000;  // 20 fIO
    const unwrapAmt = 5000000000;  // 5 wfIO
    const chainCode = "ETH";

    before(`Create users and connect to ETH chain`, async () => {
        try {
            user0 = await newUser(faucet);
            user0.ethAddress = users[0];
            user1 = await newUser(faucet);
            user1.ethAddress = users[1];
            user2 = await newUser(faucet);
            user2.ethAddress = users[2];
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });

    describe(`Wrap FIO`, function () {
        let wrap_fio_tokens_fee;

        it(`Get user0 wfio balanceOf from ETH chain`, async function () {
            result = await wfioContract.methods.balanceOf(user0.ethAddress).call(function (err, result) { });
            user0.wfioBalance = result;
            result1 = await wfioContract.methods.balanceOf(user1.ethAddress).call(function (err, result) { });
            user1.wfioBalance = result1;
            result2 = await wfioContract.methods.balanceOf(user2.ethAddress).call(function (err, result) { });
            user2.wfioBalance = result2;
            //console.log('wfio balance: ', result)
        });

        it(`Get FIO balances from FIO chain`, async () => {
            try {
                const result = await user0.sdk.genericAction('getFioBalance', {
                    fioPublicKey: user0.publicKey
                })
                user0.fioBalance = result.balance;

                const result1 = await user1.sdk.genericAction('getFioBalance', {
                    fioPublicKey: user1.publicKey
                })
                user1.fioBalance = result1.balance;

                const result2 = await user2.sdk.genericAction('getFioBalance', {
                    fioPublicKey: user2.publicKey
                })
                user2.fioBalance = result2.balance;
                //console.log('user0 fio balance', result);
            } catch (err) {
                //console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it('Get fee for wrap_fio_tokens', async () => {
            try {
                result = await user0.sdk.getFee('wrap_fio_tokens', user0.address);
                wrap_fio_tokens_fee = result.fee;

                //oracleFee = await callFioApi('get_oracle_fees', {});
                //wrap_fio_tokens_oracle_fee = oracleFee.oracle_fees[1].fee_amount;  // 1 is wrap_fio_tokens              
            } catch (err) {
                console.log('Error', err);
                expect(err).to.equal(null);
            }
        })

        it(`Wrap tokens - user0`, async function () {
            try {
                const result = await user0.sdk.genericAction('pushTransaction', {
                    action: 'wraptokens',
                    account: 'fio.oracle',
                    data: {
                    amount: wrapAmt,
                    chain_code: chainCode,
                    public_address: user0.ethAddress,
                    max_oracle_fee: config.maxOracleFee,
                    max_fee: config.maxFee,
                    tpid: "",
                    }
                });
                user0.transaction_id = result.transaction_id;
                //console.log('transaction_id: ', user0.transaction_id);
                expect(result.status).to.equal('OK');
            } catch (err) {
                console.log('Error: ', err.json);
                expect(err).to.equal(null);
            }
        });

        it(`Wrap tokens - user1`, async function () {
            try {
                const result = await user1.sdk.genericAction('pushTransaction', {
                    action: 'wraptokens',
                    account: 'fio.oracle',
                    data: {
                    amount: wrapAmt,
                    chain_code: chainCode,
                    public_address: user1.ethAddress,
                    max_oracle_fee: config.maxOracleFee,
                    max_fee: config.maxFee,
                    tpid: "",
                    }
                });
                user1.transaction_id = result.transaction_id;
                //console.log('transaction_id: ', user1.transaction_id);
                expect(result.status).to.equal('OK');
            } catch (err) {
                console.log('Error: ', err.json);
                expect(err).to.equal(null);
            }
        });

        it(`Wrap tokens - user2`, async function () {
            try {
                const result = await user2.sdk.genericAction('pushTransaction', {
                    action: 'wraptokens',
                    account: 'fio.oracle',
                    data: {
                    amount: wrapAmt,
                    chain_code: chainCode,
                    public_address: user2.ethAddress,
                    max_oracle_fee: config.maxOracleFee,
                    max_fee: config.maxFee,
                    tpid: "",
                    }
                });
                user2.transaction_id = result.transaction_id;
                //console.log('transaction_id: ', user2.transaction_id);
                expect(result.status).to.equal('OK');
            } catch (err) {
                console.log('Error: ', err.json);
                expect(err).to.equal(null);
            }
        });

        it(`Wait 8 seconds for fio.oracle to execute`, async () => { await timeout(8000) });

        it(`Get FIO balance for user0 from FIO chain. Expect reduced.`, async () => {
            try {
                const result = await user0.sdk.genericAction('getFioBalance', {
                    fioPublicKey: user0.publicKey
                })
                //console.log('Balance', result);
                expect(result.balance).to.equal(user0.fioBalance - wrapAmt - wrap_fio_tokens_fee - tokenWrapFee);
            } catch (err) {
                //console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Get FIO balance for user1 from FIO chain. Expect reduced.`, async () => {
            try {
                const result = await user1.sdk.genericAction('getFioBalance', {
                    fioPublicKey: user1.publicKey
                })
                //console.log('Balance', result);
                expect(result.balance).to.equal(user1.fioBalance - wrapAmt - wrap_fio_tokens_fee - tokenWrapFee);
            } catch (err) {
                //console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Get FIO balance for user2 from FIO chain. Expect reduced.`, async () => {
            try {
                const result = await user2.sdk.genericAction('getFioBalance', {
                    fioPublicKey: user2.publicKey
                })
                //console.log('Balance', result);
                expect(result.balance).to.equal(user2.fioBalance - wrapAmt - wrap_fio_tokens_fee - tokenWrapFee);
            } catch (err) {
                //console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Check FIO.log for user0`, async function () {
            try {
                let logItem;
                
                let logFile = logDir + 'FIO.log';

                const array = fs.readFileSync(logFile).toString().split("\n");

                //console.log('array: ', array);

                for(i in array) {
                    if (array[i].search(user0.transaction_id) > 0) {
                        //console.log('Found item: ', array[i]);
                        logItem = JSON.parse(array[i]);
                        break
                    }
                }
                expect(logItem.transaction.action_trace.act.name).to.equal('wraptokens');
                expect(logItem.transaction.action_trace.act.data.amount).to.equal(wrapAmt);
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Check FIO.log for user1`, async function () {
            try {
                let logItem;
                
                let logFile = logDir + 'FIO.log';

                const array = fs.readFileSync(logFile).toString().split("\n");

                for(i in array) {
                    if (array[i].search(user1.transaction_id) > 0) {
                        //console.log('Found item: ', array[i]);
                        logItem = JSON.parse(array[i]);
                        break
                    }
                }
                expect(logItem.transaction.action_trace.act.name).to.equal('wraptokens');
                expect(logItem.transaction.action_trace.act.data.amount).to.equal(wrapAmt);
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Check FIO.log for user2`, async function () {
            try {
                let logItem;
                
                let logFile = logDir + 'FIO.log';

                const array = fs.readFileSync(logFile).toString().split("\n");

                for(i in array) {
                    if (array[i].search(user2.transaction_id) > 0) {
                        //console.log('Found item: ', array[i]);
                        logItem = JSON.parse(array[i]);
                        break
                    }
                }
                expect(logItem.transaction.action_trace.act.name).to.equal('wraptokens');
                expect(logItem.transaction.action_trace.act.data.amount).to.equal(wrapAmt);
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`getPastEvents for'wrapped' events on ETH chain. Expect to find wrap.`, async function () {
            try {
                let txnEvent, txnEvent1, txnEvent2;
                const transactions = await wfioContract.getPastEvents('wrapped', {
                    fromBlock: 0,
                    toBlock: 'latest'
                })
                //console.log('Result: ', transactions);
                //console.log('user0.transaction_id: ', user0.transaction_id);
                for (txn in transactions) {
                    if (transactions[txn].returnValues.obtid === user0.transaction_id) {
                        //console.log('Found txn: ', transactions[txn].returnValues.obtid);
                        txnEvent = transactions[txn];
                    }
                    if (transactions[txn].returnValues.obtid === user1.transaction_id) {
                        //console.log('Found txn: ', transactions[txn].returnValues.obtid);
                        txnEvent1 = transactions[txn];
                    }
                    if (transactions[txn].returnValues.obtid === user2.transaction_id) {
                        //console.log('Found txn: ', transactions[txn].returnValues.obtid);
                        txnEvent2 = transactions[txn];
                    }
                }
                expect(txnEvent.returnValues.amount).to.equal(wrapAmt.toString());
                expect(txnEvent.returnValues.account).to.equal(user0.ethAddress);
                expect(txnEvent1.returnValues.amount).to.equal(wrapAmt.toString());
                expect(txnEvent1.returnValues.account).to.equal(user1.ethAddress);
                expect(txnEvent2.returnValues.amount).to.equal(wrapAmt.toString());
                expect(txnEvent2.returnValues.account).to.equal(user2.ethAddress);
            } catch (err) {
                console.log('Error: ', err);
                expect(err).to.equal(null);;
            }
        });

        it(`Get user0 wfio balance. Expect increase.`, async function () {
            try {
                const result = await wfioContract.methods.balanceOf(user0.ethAddress).call(function (err, result) { });
                //console.log('Prev wfio balance: ', user0.wfioBalance);
                //console.log('wrapAmt: ', wrapAmt);
                //console.log('New wfio balance: ', result);               
                expect(parseInt(result)).to.equal(parseInt(user0.wfioBalance) + wrapAmt);
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Get user1 wfio balance. Expect increase.`, async function () {
            try {
                const result = await wfioContract.methods.balanceOf(user1.ethAddress).call(function (err, result) { });
                //console.log('Prev wfio balance: ', user1.wfioBalance);
                //console.log('wrapAmt: ', wrapAmt);
                //console.log('New wfio balance: ', result);               
                expect(parseInt(result)).to.equal(parseInt(user1.wfioBalance) + wrapAmt);
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Get user2 wfio balance. Expect increase.`, async function () {
            try {
                const result = await wfioContract.methods.balanceOf(user2.ethAddress).call(function (err, result) { });
                //console.log('Prev wfio balance: ', user2.wfioBalance);
                //console.log('wrapAmt: ', wrapAmt);
                //console.log('New wfio balance: ', result);               
                expect(parseInt(result)).to.equal(parseInt(user2.wfioBalance) + wrapAmt);
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        });
    });

    describe(`Unwrap WFIO`, function () {

        it(`Get wfio balanceOf from ETH chain`, async function () {
            result = await wfioContract.methods.balanceOf(user0.ethAddress).call(function (err, result) { });
            user0.wfioBalance = result;
            result1 = await wfioContract.methods.balanceOf(user1.ethAddress).call(function (err, result) { });
            user1.wfioBalance = result1;
            result2 = await wfioContract.methods.balanceOf(user2.ethAddress).call(function (err, result) { });
            user2.wfioBalance = result2;
            //console.log('Balance: ', result)
        });

        it(`Get FIO balances from FIO chain`, async () => {
            try {
                const result = await user0.sdk.genericAction('getFioBalance', {
                    fioPublicKey: user0.publicKey
                })
                user0.fioBalance = result.balance;

                const result1 = await user1.sdk.genericAction('getFioBalance', {
                    fioPublicKey: user1.publicKey
                })
                user1.fioBalance = result1.balance;

                const result2 = await user2.sdk.genericAction('getFioBalance', {
                    fioPublicKey: user2.publicKey
                })
                user2.fioBalance = result2.balance;
                //console.log('user0 fio balance', result);
            } catch (err) {
                //console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`wfio unwrap`, async function () {  
            try {
                wfioContract.methods
                    .unwrap(user0.address, unwrapAmt)
                    .send({ from: user0.ethAddress }, function (err, res) {
                        if (err) {
                            console.log("An error occured", err)
                            return
                        }   
                        //console.log("Hash of the transaction: " + res);
                        user0.unwrapTxnId = res;
                    })
            } catch (err) {
                console.log('Error: ', err);
                expect(err).to.equal(null);;
            }
        });

        it(`wfio unwrap`, async function () {  
            try {
                wfioContract.methods
                    .unwrap(user1.address, unwrapAmt)
                    .send({ from: user1.ethAddress }, function (err, res) {
                        if (err) {
                            console.log("An error occured", err)
                            return
                        }   
                        //console.log("Hash of the transaction: " + res);
                        user1.unwrapTxnId = res;
                    })
            } catch (err) {
                console.log('Error: ', err);
                expect(err).to.equal(null);;
            }
        });

        it(`wfio unwrap`, async function () {  
            try {
                wfioContract.methods
                    .unwrap(user2.address, unwrapAmt)
                    .send({ from: user2.ethAddress }, function (err, res) {
                        if (err) {
                            console.log("An error occured", err)
                            return
                        }   
                        //console.log("Hash of the transaction: " + res);
                        user2.unwrapTxnId = res;
                    })
            } catch (err) {
                console.log('Error: ', err);
                expect(err).to.equal(null);;
            }
        });

        it(`Wait 8 seconds for fio.oracle to execute`, async () => { await timeout(8000) });

        it(`Get user0 wfio balance. Expect reduced.`, async function () {
            try {
                result = await wfioContract.methods.balanceOf(user0.ethAddress).call(function (err, result) { });
                //console.log('Balance: ', result);
                expect(parseInt(result)).to.equal(parseInt(user0.wfioBalance) - unwrapAmt);
            } catch (err) {
                //console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Get user1 wfio balance. Expect reduced.`, async function () {
            try {
                result = await wfioContract.methods.balanceOf(user1.ethAddress).call(function (err, result) { });
                //console.log('Balance: ', result);
                expect(parseInt(result)).to.equal(parseInt(user1.wfioBalance) - unwrapAmt);
            } catch (err) {
                //console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Get user0 wfio balance. Expect reduced.`, async function () {
            try {
                result = await wfioContract.methods.balanceOf(user2.ethAddress).call(function (err, result) { });
                //console.log('Balance: ', result);
                expect(parseInt(result)).to.equal(parseInt(user2.wfioBalance) - unwrapAmt);
            } catch (err) {
                //console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Check FIO.log for user0`, async function () {
            try {
                let logItem;
                let logFile = logDir + 'FIO.log';
                const array = fs.readFileSync(logFile).toString().split("\n");

                for(i in array) {
                    if (array[i].search(user0.unwrapTxnId) > 0) {
                        //console.log('Found item: ', array[i]);
                        logItem = JSON.parse(array[i]);
                        break
                    }
                }
                expect(logItem.transaction.processed.action_traces[0].act.name).to.equal('unwraptokens');
                expect(logItem.transaction.processed.action_traces[0].act.data.amount).to.equal(unwrapAmt);
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Check FIO.log for user1`, async function () {
            try {
                let logItem;
                let logFile = logDir + 'FIO.log';
                const array = fs.readFileSync(logFile).toString().split("\n");

                for(i in array) {
                    if (array[i].search(user1.unwrapTxnId) > 0) {
                        //console.log('Found item: ', array[i]);
                        logItem = JSON.parse(array[i]);
                        break
                    }
                }
                expect(logItem.transaction.processed.action_traces[0].act.name).to.equal('unwraptokens');
                expect(logItem.transaction.processed.action_traces[0].act.data.amount).to.equal(unwrapAmt);
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Check FIO.log for user2`, async function () {
            try {
                let logItem;
                let logFile = logDir + 'FIO.log';
                const array = fs.readFileSync(logFile).toString().split("\n");

                for(i in array) {
                    if (array[i].search(user2.unwrapTxnId) > 0) {
                        //console.log('Found item: ', array[i]);
                        logItem = JSON.parse(array[i]);
                        break
                    }
                }
                expect(logItem.transaction.processed.action_traces[0].act.name).to.equal('unwraptokens');
                expect(logItem.transaction.processed.action_traces[0].act.data.amount).to.equal(unwrapAmt);
            } catch (err) {
                console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Confirm user0 entry in FIO oravotes table`, async function () {
            try {
                const obtidHash = stringToHash(user0.unwrapTxnId);

                const json = {
                    json: true,
                    code: 'fio.oracle',
                    scope: 'fio.oracle',
                    table: 'oravotes',
                    lower_bound: obtidHash.toString(), //"0xc5eae74c669130ff533b98394f0b7a2e",
                    upper_bound: obtidHash.toString(), //"0xc5eae74c669130ff533b98394f0b7a2e",
                    key_type: "i128",
                    index_position: '2',
                }
                const unwrapVotes = await callFioApi("get_table_rows", json);
                //console.log('voterInfo: ', unwrapVotes);
                expect(unwrapVotes.rows.length).to.equal(1);
                expect(unwrapVotes.rows[0].obt_id).to.equal(user0.unwrapTxnId);
                expect(unwrapVotes.rows[0].amount).to.equal(unwrapAmt);
            } catch (err) {
                console.log('Error', err);
                expect(err).to.equal(null);
            }
        });

        it(`Confirm user1 entry in FIO oravotes table`, async function () {
            try {
                const obtidHash = stringToHash(user1.unwrapTxnId);

                const json = {
                    json: true,
                    code: 'fio.oracle',
                    scope: 'fio.oracle',
                    table: 'oravotes',
                    lower_bound: obtidHash.toString(), //"0xc5eae74c669130ff533b98394f0b7a2e",
                    upper_bound: obtidHash.toString(), //"0xc5eae74c669130ff533b98394f0b7a2e",
                    key_type: "i128",
                    index_position: '2',
                }
                const unwrapVotes = await callFioApi("get_table_rows", json);
                //console.log('voterInfo: ', unwrapVotes);
                expect(unwrapVotes.rows.length).to.equal(1);
                expect(unwrapVotes.rows[0].obt_id).to.equal(user1.unwrapTxnId);
                expect(unwrapVotes.rows[0].amount).to.equal(unwrapAmt);
            } catch (err) {
                console.log('Error', err);
                expect(err).to.equal(null);
            }
        });

        it(`Confirm user2 entry in FIO oravotes table`, async function () {
            try {
                const obtidHash = stringToHash(user2.unwrapTxnId);

                const json = {
                    json: true,
                    code: 'fio.oracle',
                    scope: 'fio.oracle',
                    table: 'oravotes',
                    lower_bound: obtidHash.toString(), //"0xc5eae74c669130ff533b98394f0b7a2e",
                    upper_bound: obtidHash.toString(), //"0xc5eae74c669130ff533b98394f0b7a2e",
                    key_type: "i128",
                    index_position: '2',
                }
                const unwrapVotes = await callFioApi("get_table_rows", json);
                //console.log('voterInfo: ', unwrapVotes);
                expect(unwrapVotes.rows.length).to.equal(1);
                expect(unwrapVotes.rows[0].obt_id).to.equal(user2.unwrapTxnId);
                expect(unwrapVotes.rows[0].amount).to.equal(unwrapAmt);
            } catch (err) {
                console.log('Error', err);
                expect(err).to.equal(null);
            }
        });

        it(`Get user0 FIO balance from FIO chain. Expect increase.`, async () => {
            try {
                const result = await user0.sdk.genericAction('getFioBalance', {
                    fioPublicKey: user0.publicKey
                });
                //console.log('Balance', result);
                expect(result.balance).to.equal(user0.fioBalance + unwrapAmt);
            } catch (err) {
                //console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Get user1 FIO balance from FIO chain. Expect increase.`, async () => {
            try {
                const result = await user1.sdk.genericAction('getFioBalance', {
                    fioPublicKey: user1.publicKey
                });
                //console.log('Balance', result);
                expect(result.balance).to.equal(user1.fioBalance + unwrapAmt);
            } catch (err) {
                //console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

        it(`Get user2 FIO balance from FIO chain. Expect increase.`, async () => {
            try {
                const result = await user2.sdk.genericAction('getFioBalance', {
                    fioPublicKey: user2.publicKey
                });
                //console.log('Balance', result);
                expect(result.balance).to.equal(user2.fioBalance + unwrapAmt);
            } catch (err) {
                //console.log('Error', err)
                expect(err).to.equal(null)
            }
        });

    });

});

describe(`D. Single token wrap/unwrap in same oracle poll time`, function () {

    let user0;
    let wrap_fio_tokens_fee;
    const wrapAmt = 20000000000;  // 20 fIO
    const unwrapAmt = 5000000000;  // 5 wfIO
    const chainCode = "ETH";

    before(`Create users and connect to ETH chain`, async () => {
        try {
            user0 = await newUser(faucet);
            user0.ethAddress = users[0];
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });


    it(`Get user0 wfio balanceOf from ETH chain`, async function () {
        result = await wfioContract.methods.balanceOf(user0.ethAddress).call(function (err, result) { });
        user0.wfioBalance = result;
        //console.log('wfio balance: ', result)
    });

    it(`Get user0 FIO balance from FIO chain`, async () => {
        try {
            const result = await user0.sdk.genericAction('getFioBalance', {
                fioPublicKey: user0.publicKey
            })
            user0.fioBalance = result.balance;
            //console.log('user0 fio balance', result);
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    });

    it('Get fee for wrap_fio_tokens', async () => {
        try {
            result = await user0.sdk.getFee('wrap_fio_tokens', user0.address);
            wrap_fio_tokens_fee = result.fee;

            //oracleFee = await callFioApi('get_oracle_fees', {});
            //wrap_fio_tokens_oracle_fee = oracleFee.oracle_fees[1].fee_amount;  // 1 is wrap_fio_tokens              
        } catch (err) {
            console.log('Error', err);
            expect(err).to.equal(null);
        }
    })

    it(`Wrap wfio tokens`, async function () {
        try {
            const result = await user0.sdk.genericAction('pushTransaction', {
                action: 'wraptokens',
                account: 'fio.oracle',
                data: {
                amount: wrapAmt,
                chain_code: chainCode,
                public_address: user0.ethAddress,
                max_oracle_fee: config.maxOracleFee,
                max_fee: config.maxFee,
                tpid: "",
                }
            });
            user0.transaction_id = result.transaction_id;
            //console.log('transaction_id: ', user0.transaction_id);
            expect(result.status).to.equal('OK');
        } catch (err) {
            console.log('Error: ', err.json);
            expect(err).to.equal(null);
        }
    });

    it(`unwrap wfio tokens`, async function () {  
        try {
            wfioContract.methods
                .unwrap(user0.address, unwrapAmt)
                .send({ from: user0.ethAddress }, function (err, res) {
                    if (err) {
                        console.log("An error occured", err)
                        return
                    }   
                    //console.log("Hash of the transaction: " + res);
                    user0.unwrapTxnId = res;
                })
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`Wait 8 seconds for fio.oracle to execute`, async () => { await timeout(8000) });

    it(`Check FIO.log for wrap`, async function () {
        try {
            let logItem;
            
            let logFile = logDir + 'FIO.log';

            const array = fs.readFileSync(logFile).toString().split("\n");

            for(i in array) {
                if (array[i].search(user0.transaction_id) > 0) {
                    //console.log('Found item: ', array[i]);
                    logItem = JSON.parse(array[i]);
                    break
                }
            }
            expect(logItem.transaction.action_trace.act.name).to.equal('wraptokens');
            expect(logItem.transaction.action_trace.act.data.amount).to.equal(wrapAmt);
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    });

    it(`Check FIO.log`, async function () {
        try {
            let logItem;
            let logFile = logDir + 'FIO.log';
            const array = fs.readFileSync(logFile).toString().split("\n");

            for(i in array) {
                if (array[i].search(user0.unwrapTxnId) > 0) {
                    //console.log('Found item: ', array[i]);
                    logItem = JSON.parse(array[i]);
                    break
                }
            }
            expect(logItem.transaction.processed.action_traces[0].act.name).to.equal('unwraptokens');
            expect(logItem.transaction.processed.action_traces[0].act.data.amount).to.equal(unwrapAmt);
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    });

    it(`getPastEvents for 'wrapped' events on ETH chain. Expect to find wrap.`, async function () {
        try {
            let txnEvent;
            const transactions = await wfioContract.getPastEvents('wrapped', {
                fromBlock: 0,
                toBlock: 'latest'
            })
            //console.log('Result: ', transactions);
            //console.log('user0.transaction_id: ', user0.transaction_id);
            for (txn in transactions) {
                if (transactions[txn].returnValues.obtid === user0.transaction_id) {
                    //console.log('Found txn: ', transactions[txn].returnValues.obtid);
                    txnEvent = transactions[txn];
                    break;
                }
            }
            expect(txnEvent.returnValues.amount).to.equal(wrapAmt.toString());
            expect(txnEvent.returnValues.account).to.equal(user0.ethAddress);
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`Get user0 FIO balance from FIO chain. Expect decrease of (unwrap - wrap).`, async () => {
        try {
            const result = await user0.sdk.genericAction('getFioBalance', {
                fioPublicKey: user0.publicKey
            });
            //console.log('Balance', result);
            expect(result.balance).to.equal(user0.fioBalance - wrapAmt - wrap_fio_tokens_fee - tokenWrapFee + unwrapAmt);
        } catch (err) {
            //console.log('Error', err)
            expect(err).to.equal(null)
        }
    });

    it(`Get user0 wfio balance. Expect increase of (wrap - unwrap).`, async function () {
        try {
            result = await wfioContract.methods.balanceOf(user0.ethAddress).call(function (err, result) { });
            //console.log('Prev wfio balance: ', user0.wfioBalance);
            //console.log('wrapAmt: ', wrapAmt);
            //console.log('New wfio balance: ', result);               
            expect(parseInt(result)).to.equal(parseInt(user0.wfioBalance) + wrapAmt - unwrapAmt);
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    });

});

describe.skip(`web3 examples`, function () {

    let user1;
    
    before(`Create users and connect to ETH chain`, async () => {
        user1 = await newUser(faucet);
        user1.ethAddress = '0x1693F5557f1509E759e6c4D6B8deb5827e22e984';
    });

    it(`getPastEvents`, async function () {
        try {
            const result = await wfioContract.getPastEvents('unwrapped', {
                fromBlock: 0,
                toBlock: 'latest'
            })
            console.log('Result: ', result);
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`etherscan testnet getPastEvents`, async function () {
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


    it(`wfio getOracles with callback`, async function () {
        wfioContract.methods.getOracles().call(function (err, result) {
            if (err) {
                console.log("Error", err);
                return;
            }
            console.log("Oracles with callback: ", result);
        })
    });

    it(`wfio getOracles`, async function () {
        const result = await wfioContract.methods.getOracles().call(function () {  })
        console.log('Oracles: ', result)
    });

    it(`etherscan - balanceOf with callback`, async function () {
        try {

            
            await wfioEtherscanContract.methods.balanceOf('0xe28FF0D44d533d15cD1f811f4DE8e6b1549945c9').call(function (err, result) {
                if (err) {
                    console.log("Error", err);
                    return;
                }
                console.log("balanceOf with callback: ", result);
            })
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`etherscan - balanceOf with callback`, async function () {
        try {

            
            await wfioContract.methods.balanceOf('0x1693F5557f1509E759e6c4D6B8deb5827e22e984').call(function (err, result) {
                if (err) {
                    console.log("Error", err);
                    return;
                }
                console.log("balanceOf with callback: ", result);
            })
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`wfio - balanceOf with callback`, async function () {
        try {
            

            let token = '0x7a67f5639b09F9402f60113376AA2bE7dDe4B33c'
            let target = '0x1693F5557f1509E759e6c4D6B8deb5827e22e984'
            
            let balance_function = web3.utils.sha3('balanceOf(address)').substring(0,10)
            let padding = '000000000000000000000000'
            let calldata = {to:token, data:balance_function + padding + target.substring(2)}
            let result = await web3.eth.call(calldata);
            console.log('Balance: ', result)
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });


    it(`wfio getBalance`, async function () {
        result = await wfioContract.methods.balanceOf('0x1693F5557f1509E759e6c4D6B8deb5827e22e984').call(function (err, result) { });
        console.log('Balance: ', result)
    });

    it.skip(`wfio getApproval`, async function () {
        try {
            result = await wfioContract.methods.getApproval('0e45418abe1b2e870203904f95fccb3a39a4e1084d5131296eab6deb558024b1').call(function (err, result) { });
            console.log('Result: ', result);
            //const approval = result.toNumber();
            console.log('approval: ', result[1]);
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`wfio unwrap`, async function () {
        const senderEthAddress = '0x1693F5557f1509E759e6c4D6B8deb5827e22e984';
        const amount = 5000000000; // 5 wfio
        const receiverHandle = "casey@dapixdev";

        try {
            wfioContract.methods
                .unwrap(receiverHandle, amount)
                .send({ from: senderEthAddress }, function (err, res) {
                    if (err) {
                        console.log("An error occured", err)
                        return
                    }   
                    console.log("Hash of the transaction: " + res)
                })
            //console.log('Oracles: ', result)
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`wfio unwrap 2`, async function () {
        const senderEthAddress = '0x1693F5557f1509E759e6c4D6B8deb5827e22e984';
        const amount = 5000000000; // 5 wfio
        const receiverHandle = "casey@dapixdev";

        try {
            result = await wfioContract.methods
                .unwrap(receiverHandle, amount)
                .send({ from: senderEthAddress });
            //console.log('Oracles: ', result)
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });


    it(`ganache getApproval - only returns values of number of wrap approvals is < 3, otherwise returns zeros`, async function () {
        try {
            const result = await wfioContract.methods.getApproval('555518abe1b2e870203904f95fccb3a39a4e1084d5131296eab6deb558024b1').call(function (err, result) { });
            console.log('Result: ', result);
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it(`etherscan getApproval`, async function () {
        try {
            result = await wfioEtherscanContract.methods.getApproval('648b02521416b2421ede045158a01af6d4cfbaf2d0a7181e78553faf509f62ac').call(function (err, result) { });
            console.log('Result: ', result);
            //const approval = result.toNumber();
            console.log('approval: ', result[1]);
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);;
        }
    });

    it.skip(`Get Transaction`, async function () {
        try {
            result = await web3.eth.getTransaction(user0.ethTxnId);

            console.log('Result: ', result);
        } catch (err) {
            console.log('Error', err)
            expect(err).to.equal(null)
        }
    });
});

describe.skip(`utils`, function () {
    let OBT_ID_1 = "0x134213413421343";

    let user0;
    const wrapAmt = 100000000000;  // 100 fIO
    const unwrapAmt = 5000000000;  // 5 wfIO
    const chainCode = "ETH";

    before(`Create users`, async () => {
        try {
            user0 = await newUser(faucet);
            user0.ethAddress = users[0];
        } catch (err) {
            console.log('Error: ', err);
            expect(err).to.equal(null);
        }
    });

    describe(`unwrap`, function () {

        it(`oracle1 - unwrap FIO tokens`, async function () {
            try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'unwraptokens',
                account: 'fio.oracle',
                actor: oracle1.account,
                privKey: oracle1.privateKey,
                data: {
                amount: unwrapAmt,
                obt_id: OBT_ID_1,
                fio_address: 'casey@dapixdev',
                actor: oracle1.account
                }
            });
            console.log('Result: ', result);
            expect(result).to.have.all.keys('transaction_id', 'processed');
            } catch (err) {
            console.log('Error: ', err);
            throw err;
            }
        });

        it(`oracle2 - unwrap FIO tokens`, async function () {
            try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'unwraptokens',
                account: 'fio.oracle',
                actor: oracle2.account,
                privKey: oracle2.privateKey,
                data: {
                amount: unwrapAmt,
                obt_id: OBT_ID_1,
                fio_address: 'casey@dapixdev',
                actor: oracle2.account
                }
            });
            console.log('Result: ', result);
            expect(result).to.have.all.keys('transaction_id', 'processed');
            } catch (err) {
            console.log('Error: ', err);
            throw err;
            }
        });

        it(`oracle3 - unwrap FIO tokens`, async function () {
            try {
            const result = await callFioApiSigned('push_transaction', {
                action: 'unwraptokens',
                account: 'fio.oracle',
                actor: oracle3.account,
                privKey: oracle3.privateKey,
                data: {
                amount: unwrapAmt,
                obt_id: OBT_ID_1,
                fio_address: 'casey@dapixdev',
                actor: oracle3.account
                }
            });
            console.log('Result: ', result);
            expect(result).to.have.all.keys('transaction_id', 'processed');
            } catch (err) {
            console.log('Error: ', err);
            throw err;
            }
        });
    });

    describe(`wrap`, function () {


    });
});

describe.skip(`Reg 1 oracle and set fees`, function () {
              
    it(`clean out oracless record with helper function`, async function () {
      try {
        await cleanUpOraclessTable(faucet, true);
      } catch (err) {
        console.log('Error: ', err)
        throw err;
      }
    });
  
    it(`confirm oracles table is empty`, async function () {
      try {
        let records = await getOracleRecords();
        //console.log('Records: ', records);
        expect(records.rows.length).to.equal(0);
      } catch (err) {
        console.log('Error: ', err)
        throw err;
      }
    });

    it('try to get the wrapping fees from the API, expect: Not enough registered oracles. ', async function () {
        try {
          await callFioApi('get_oracle_fees', {});
        } catch (err) {
          //console.log('Error: ', err);
          expect(err.error.message).to.equal('Not enough registered oracles.');
        }
      });
  
    it(`reg oracles`, async function () {
      try {
        await registerNewOracle(oracle1);
        //await registerNewOracle(oracle2);
        //await registerNewOracle(oracle3);
      } catch (err) {
        console.log('Error: ', err.json);
      }
    });
  
    it(`set fees`, async function () {
      try {
        await setTestOracleFees(oracle1, domainWrapFee, tokenWrapFee);
        //await setTestOracleFees(oracle2, domainWrapFee, tokenWrapFee);
        //await setTestOracleFees(oracle3, domainWrapFee, tokenWrapFee);
      } catch (err) {
        console.log('Error: ', err.json);
      }
    });
    
  });