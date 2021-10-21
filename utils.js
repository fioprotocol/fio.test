const rp = require('request-promise');
const exec = require('child_process').exec;
var fs = require('fs');
config = require ('./config');

const fiourl = config.URL + "/v1/chain/";
const historyUrl = config.URL + "/v1/history/"

const { Fio } = require('@fioprotocol/fiojs');
fetch = require('node-fetch');
const {FIOSDK } = require('@fioprotocol/fiosdk')
const {TextEncoder,TextDecoder } = require('text-encoding')
const Transactions_2 = require("@fioprotocol/fiosdk/lib/transactions/Transactions")
let transaction = new Transactions_2.Transactions

function randStr(len) {
    var charset = "abcdefghijklmnopqrstuvwxyz";
    result="";
    for( var i=0; i < len; i++ )
        result += charset[Math.floor(Math.random() * charset.length)];
    return result
}

function convertToK1(pubkey) {
    return pubkey.replace("FIO", "PUB_K1_");
}

function user(account, privateKey, publicKey) {
    this.account = account;
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.ramUsage = [];
}

function getMnemonic() {
    //randStr = Math.random().toString(26).substr(2, 8)
    return 'test health mine over uncover someone gain powder urge slot property ' + randStr(7)
}


async function fetchJson(uri, opts = {}) {
    return fetch(uri, opts)
}

async function timeout(ms) {
    await new Promise(resolve => {
      setTimeout(resolve, ms)
    })
}

function generateFioDomain(size) {
    return randStr(size)
}

function generateFioAddress(customDomain = config.DEFAULT_DOMAIN, size) {
    let fioname;
    try {
        if (size + customDomain.length < config.paramMax.fio_address) {
            fioname = randStr(size)
        } else {
            fioname = randStr(config.paramMax.fio_address - customDomain.length - 1)
        }
        return fioname + '@' + customDomain
    } catch (err) {
        console.log('Error: ', err)
    }
}

async function createKeypair() {
    let privateKeyRes = await FIOSDK.createPrivateKeyMnemonic(getMnemonic())
    privateKey = privateKeyRes.fioKey
    let publicKeyRes = FIOSDK.derivedPublicKey(privateKey)
    publicKey = publicKeyRes.publicKey
    account = transaction.getActor(publicKey)
    return {
        privateKey: privateKey,
        publicKey: publicKey,
        account: account
      };
}

async function getAccountFromKey(publicKey) {
    account = transaction.getActor(publicKey)
    return (account);
}

function getTestType() {
    let testType;
    // Argument 6 = test type
    var myArgs = process.argv.slice(5);
    //console.log('myarg: ', myArgs)
    switch (myArgs[0]) {
        case 'sdk':
            testType = 'sdk';
            break;
        default:
            testType = 'pushtransaction';
    }
    return testType;
}

//Creates a user and registers an address and domain
async function newUser(faucet, newAccount=null, newPrivateKey=null, newPublicKey=null, newDomain=null, newAddress=null) {
    if (newAccount != null) {
        this.account = newAccount;
        this.privateKey = newPrivateKey;
        this.publicKey = newPublicKey;
        this.domain = newDomain;
        this.address = newAddress;
    } else {
        keys = await createKeypair();
        this.account = keys.account;
        this.privateKey = keys.privateKey;
        this.publicKey = keys.publicKey;
        this.domain = generateFioDomain(10);
        this.address = generateFioAddress(this.domain, 5);
    }
    this.ramUsage = [];
    this.sdk = new FIOSDK(this.privateKey, this.publicKey, config.BASE_URL, fetchJson);
    this.lockAmount = 0;
    this.lockType = 0;

    try {
        const result = await faucet.genericAction('transferTokens', {
            payeeFioPublicKey: this.publicKey,
            amount: config.FUNDS,
            maxFee: config.api.transfer_tokens_pub_key.fee,
        })
        //console.log('Result', result)
        //expect(result.status).to.equal('OK')
    } catch (err) {
        console.log('Transfer tokens error: ', err.json.error)
        return(err);
    }

    try {
        const result1 = await this.sdk.genericAction('isAvailable', {fioName: this.domain})
        if ( ! result1.is_registered ) {
            const result = await this.sdk.genericAction('registerFioDomain', {
                fioDomain: this.domain,
                maxFee: config.api.register_fio_domain.fee ,
                walletFioAddress: ''
              })
              //console.log('Result', result)
              //expect(result.status).to.equal('OK')
        }
    } catch (err) {
        console.log('registerFioDomain error: ', err.json)
        return(err);
    }

    try {
        const result1 = await this.sdk.genericAction('isAvailable', {fioName: this.address})
        if ( ! result1.is_registered ) {
            const result = await this.sdk.genericAction('registerFioAddress', {
                fioAddress: this.address,
                maxFee: config.api.register_fio_address.fee,
                walletFioAddress: ''
            })
            //console.log('Result: ', result)
            //expect(result.status).to.equal('OK')
        }
    } catch (err) {
        console.log('registerFioAddress error: ', err.json)
        return(err);
    }

    try {
        const result = await this.sdk.genericAction('getFioBalance', {
          fioPublicKey: this.publicKey
        })
        this.fioBalance = result.balance;
        //console.log('foundationA1 fio balance', result)
        //expect(result.balance).to.equal(proxyA1.last_vote_weight)
      } catch (err) {
        // TODO Look this over
        if(err.json.error.code !== 6)
            console.log('getFioBalance Error', err.json.error);
      }

    return {
        privateKey: this.privateKey,
        publicKey: this.publicKey,
        account: this.account,
        ramUsage: this.ramUsage,
        sdk: this.sdk,
        domain: this.domain,
        address: this.address,
        fioBalance: this.fioBalance,
        lockAmount: this.lockAmount,
        lockType: this.lockType
      };
}

//Creates the user object for an account that already exists
async function existingUser(caccount, cprivateKey, cpublicKey, cdomain=null, caddress=null) {
    this.account = caccount;
    this.privateKey = cprivateKey;
    this.publicKey = cpublicKey;
    this.domain = cdomain
    this.address = caddress
    this.ramUsage = [];
    this.sdk = new FIOSDK(this.privateKey, this.publicKey, config.BASE_URL, fetchJson);
    this.lockAmount = 0;
    this.lockType = 0;

    try {
        if (cdomain == null) {
            const result = await this.sdk.genericAction('registerFioDomain', {
                fioDomain: this.domain,
                maxFee: config.api.register_fio_domain.fee ,
                walletFioAddress: ''
              })
        }
    } catch (err) {
        console.log('Register domain error: ', err.json)
        return(err);
    }

    try {
        if (caddress == null) {
            const result = await this.sdk.genericAction('registerFioAddress', {
                fioAddress: this.address,
                maxFee: config.api.register_fio_address.fee,
                walletFioAddress: ''
            })
        }
    } catch (err) {
        console.log('Register address error: ', err.json)
        return(err);
    }

    try {
        const result = await this.sdk.genericAction('getFioBalance', {
          fioPublicKey: this.publicKey
        })
        this.fioBalance = result.balance;
        //console.log('foundationA1 fio balance', result)
        //expect(result.balance).to.equal(proxyA1.last_vote_weight)
      } catch (err) {
        // TODO Look this over
        if(err.json.error.code !== 6) {
            console.log('Error', err.json.error);
        }
      }

    return {
        privateKey: this.privateKey,
        publicKey: this.publicKey,
        account: this.account,
        ramUsage: this.ramUsage,
        sdk: this.sdk,
        domain: this.domain,
        address: this.address,
        fioBalance: this.fioBalance,
        lockAmount: this.lockAmount,
        lockType: this.lockType
      };
}

/**
 * Generic call to API
 * @param {string} apiCall - The FIO API endpoint.
 * @param {{code: string, show_payer: boolean, scope: string, limit: number, json: boolean, reverse: boolean, table: string}} JSONObject - The json body to pass to the endpoint.
 * @return {json} - Returns json object.
 */
function callFioApi(apiCall, JSONObject) {
    return (new Promise(function(resolve, reject) {
        var options = {
            method: "POST",
            uri: fiourl + apiCall,
            body: JSONObject,
            json: true // Automatically stringifies the body to JSON
        };

        rp(options)
            .then(function (body){
                //console.log(body);
                resolve(body);
            }).catch(function(ex) {
                reject(ex);
            });
    }));
};

const callFioApiSigned = async (endPoint, txn) => {
    const info = await (await fetch(fiourl + 'get_info')).json();
    const blockInfo = await (await fetch(fiourl + 'get_block', {body: `{"block_num_or_id": ${info.last_irreversible_block_num}}`, method: 'POST'})).json()
    const chainId = info.chain_id;
    const currentDate = new Date();
    const timePlusTen = currentDate.getTime() + 10000;
    const timeInISOString = (new Date(timePlusTen)).toISOString();
    const expiration = timeInISOString.substr(0, timeInISOString.length - 1);

    const transaction = {
       expiration,
       ref_block_num: blockInfo.block_num & 0xffff,
       ref_block_prefix: blockInfo.ref_block_prefix,
       actions: [{
           account: txn.account,
           name: txn.action,
           authorization: [{
               actor: txn.actor,
               permission: 'active',
           }],
           data: txn.data,
       }]
    };

    const abiMap = new Map()
    const tokenRawAbi = await (await fetch(fiourl + 'get_raw_abi', {body: '{"account_name": "' + txn.account + '"}', method: 'POST'})).json()
    abiMap.set(txn.account, tokenRawAbi)

    var privateKeys = [txn.privKey];

    const tx = await Fio.prepareTransaction({
      transaction,
      chainId,
      privateKeys,
      abiMap,
      textDecoder: new TextDecoder(),
      textEncoder: new TextEncoder()
    });

    const pushResult = await fetch(fiourl + endPoint, {
        body: JSON.stringify(tx),
        method: 'POST',
    });

    const json = await pushResult.json()
    return json;
  };

/**
 * Generic call to History API
 * @param {string} apiCall - The FIO API endpoint.
 * @param {json} JSONObject - The json body to pass to the endpoint.
 * @return {json} - Returns json object.
 */
function callFioHistoryApi(apiCall, JSONObject) {
    return (new Promise(function(resolve, reject) {
        var options = {
            method: "POST",
            uri: historyUrl + apiCall,
            body: JSONObject,
            json: true // Automatically stringifies the body to JSON
        };
        //console.log("\nCalling: " + options.uri);
        //console.log("\nWith stringified JSON: \n")
        //console.log(JSON.stringify(options.body));
        rp(options)
            .then(function (body){
                //console.log("\nAPI call result: \n");
                //console.log(body);
                resolve(body);
            }).catch(function(ex) {
                reject(ex);
            });
    }));
};

/**
 * Returns an array of fees from the fiofees table.
 * @returns {Array} array[end_point] = suf_amount
 */
async function getFees() {
    return new Promise(function(resolve, reject) {
        let fees = [];
        const json = {
            json: true,
            code: 'fio.fee',
            scope: 'fio.fee',
            table: 'fiofees',
            limit: 1000,
            reverse: false,
            show_payer: false
        }
        callFioApi("get_table_rows", json)
        .then(result => {
            var i;
            for (i = 0; i < result.rows.length; i++) {
                fees[result.rows[i].end_point] = result.rows[i].suf_amount
            }
            resolve(fees)
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });
    });
}

async function setRam(user, txnType, fee) {
    return new Promise(function(resolve, reject) {
        let ramEntry
        const json = {
            account_name: user.account,
        }
        callFioApi("get_account", json)
        .then(result => {
            ramEntry = {
                txnType: txnType,
                fee: fee,
                txnQuota: config.RAM[txnType],
                actualRamUsage: result.ram_usage,
                actualRamQuota: result.ram_quota,
                expectedRamQuota: config.RAM[txnType]
            }
            user.ramUsage.push(ramEntry);
            resolve()
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });

    });
}

async function printUserRam(user) {
    let entry, fee, type, txnQuota, actualRamQuota, deltaRamQuota, actualRamUsage, deltaActualRamUsage

    console.log('RAM Usage for: ', user.account)
    console.log('type' + '\t' + 'feeCollected' + '\t' + 'txnQuota' + '\t' + 'actualRamQuota' + '\t' + 'deltaRamQuota' + '\t' + 'actualRAMUsage' + '\t' + 'deltaActualRAMUsage')

    for (entry in user.ramUsage) {
        type = user.ramUsage[entry].txnType
        fee = user.ramUsage[entry].fee
        txnQuota = user.ramUsage[entry].txnQuota
        actualRamQuota = user.ramUsage[entry].actualRamQuota
        deltaRamQuota = actualRamQuota - txnQuota
        actualRamUsage = user.ramUsage[entry].actualRamUsage
        if (entry>0) {
            deltaActualRamUsage = actualRamUsage - user.ramUsage[entry-1].actualRamUsage
        } else {
            deltaActualRamUsage = 0
        }
        console.log(type + '\t' + fee  + '\t' + txnQuota + '\t' + actualRamQuota + '\t' + deltaRamQuota + '\t' + actualRamUsage + '\t' + deltaActualRamUsage)
    }
}

async function getTotalVotedFio() {
    return new Promise(function(resolve, reject) {

        const json = {
            json: true,
            code: 'eosio',
            scope: 'eosio',
            table: 'global',
            limit: 1000,
            reverse: false,
            show_payer: false
        }
        callFioApi("get_table_rows", json)
        .then(result => {
            resolve(result.rows[0].total_voted_fio)
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });
    });
}

async function getProdVoteTotal(producer) {
    return new Promise(function(resolve, reject) {
        const json = {
            json: true,
            code: 'eosio',
            scope: 'eosio',
            table: 'producers',
            limit: 1000,
            reverse: false,
            show_payer: false
        }
        callFioApi("get_table_rows", json)
        .then(result => {
            for (prod in result.rows) {
                 if (result.rows[prod].fio_address == producer) {
                    resolve(Math.floor(result.rows[prod].total_votes))
                    break;
                }
            }
            resolve(null)
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });
    });
}

async function getAccountVoteWeight(account) {
    return new Promise(function(resolve, reject) {
        const json = {
            json: true,
            code: 'eosio',
            scope: 'eosio',
            table: 'voters',
            limit: 1000,
            reverse: false,
            show_payer: false
        }
        callFioApi("get_table_rows", json)
        .then(result => {
            for (voterID in result.rows) {
                 if (result.rows[voterID].owner == account) {
                    resolve(Math.floor(result.rows[voterID].last_vote_weight))
                    break;
                }
            }
            resolve(null)
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });
    });
}

async function readProdFile(prodFile) {
    return new Promise(function(resolve, reject) {
        try {
            let producers = [];
            //producers.push({}); // Push a null producer into the [0] position so the prod # aligns with the array #
            require('fs').readFileSync(prodFile, 'utf-8').split(/\r?\n/).forEach(function(prod){
                //console.log(prod);
                // Format of data: FIO_Address, Priv Key, Pub Key, Account, FIO Amount
                prodInfo = prod.split(',');
                if (prodInfo[0] != '') {
                    producers.push({
                        domain: prodInfo[0].split('@').pop(),
                        address: prodInfo[0],
                        privateKey: prodInfo[1],
                        publicKey: prodInfo[2],
                        account: prodInfo[3],
                        fioBalance: parseInt(prodInfo[4])
                    })
                }
            })
            resolve(producers);
        } catch (err) {
            console.log('Error: ', err);
            reject(err);
        }
    });
}

async function addLock(account, amount, lock) {
    return new Promise(function(resolve, reject) {
        var text = {owner: account, amount: amount, locktype: lock}
        text = JSON.stringify(text)
        runCmd(config.CLIO + " push action -j eosio addlocked '" + text + "' -p eosio@active")
         .then(result => {
            let jResult = JSON.parse(result);
            account.lockAmount = amount;
            account.lockType = lock;
            resolve(jResult)
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });
    });
}

async function unlockWallet(wallet) {
    return new Promise(function(resolve, reject) {
        const keyFile = config.WALLETKEYFILE;
        try {
            if (fs.existsSync(keyFile)) {
                walletKey = require('fs').readFileSync(keyFile, 'utf-8')
            }
        } catch(err) {
            console.error(err)
        }
        runCmd(config.CLIO + " wallet list")
        .then(result => {
            let walletLock = result.indexOf(wallet + " *")
            if (walletLock == -1 ) {  // Wallet is not unlocked
                runCmd(config.CLIO + " wallet unlock -n " + wallet + " --password " + walletKey)
            }
            resolve()
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });
    });
}


function runCmd(command) {
    return new Promise(function(resolve, reject) {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout.trim());
        });
    });
}


async function getTopprods() {
    return new Promise(function(resolve, reject) {
        runCmd(config.CLIO + " get table -l -1 eosio eosio topprods")
        .then(result => {
            let jresult = JSON.parse(result)
            //console.log("jresult", jresult.rows[0])
            resolve(jresult)
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });
    });
}

async function readProdFile(prodFile) {
    return new Promise(function(resolve, reject) {
        try {
            let producers = [];
            //producers.push({}); // Push a null producer into the [0] position so the prod # aligns with the array #
            require('fs').readFileSync(prodFile, 'utf-8').split(/\r?\n/).forEach(function(prod){
                //console.log(prod);
                // Format of data: FIO_Address, Priv Key, Pub Key, Account, FIO Amount
                prodInfo = prod.split(',');
                if (prodInfo[0] != '') {
                    producers.push({
                        domain: prodInfo[0].split('@').pop(),
                        address: prodInfo[0],
                        privateKey: prodInfo[1],
                        publicKey: prodInfo[2],
                        account: prodInfo[3],
                        fioBalance: parseInt(prodInfo[4])
                    })
                }
            })
            resolve(producers);
        } catch (err) {
            console.log('Error: ', err);
            reject(err);
        }
    });
}


/**
 * Old. Need to get rid of clio calls and replace with API
 */

 /*
async function getVoteShares() {
    return new Promise(function(resolve, reject) {
        //console.log('in getAccountVoteWeight')
        runCmd(config.CLIO + " get table -l -1 fio.treasury fio.treasury voteshares")
        .then(result => {
            let jresult = JSON.parse(result)
            console.log("jresult", jresult.rows[0])
            resolve(jresult)
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });
    });
}

async function getFeevoters() {
    return new Promise(function(resolve, reject) {
        runCmd(config.CLIO + " get table -l -1 fio.fee fio.fee feevoters")
        .then(result => {
            let jresult = JSON.parse(result)
            console.log("jresult", jresult.rows[0])
            resolve(jresult)
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });
    });
}

async function getTopprods() {
    return new Promise(function(resolve, reject) {
        runCmd(config.CLIO + " get table -l -1 eosio eosio topprods")
        .then(result => {
            let jresult = JSON.parse(result)
            //console.log("jresult", jresult.rows[0])
            resolve(jresult)
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });
    });
}


async function getBlock(number) {
    return new Promise(function(resolve, reject) {
        runCmd(config.CLIO + " get block " + number)
        .then(result => {
            let jresult = JSON.parse(result)
            //console.log("jresult", jresult)
            resolve(jresult)
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });
    });
}

function getBlock2(number) {
    result = runCmd(config.CLIO + " get block " + number)
    console.log("result", result)
    return (result);
}


async function getTable(account, table) {
    return new Promise(function(resolve, reject) {
        runCmd(config.CLIO + " get table -l -1 " + account + " " + account + " " + table)
        .then(result => {
            let jresult = JSON.parse(result)
            //console.log("jresult", jresult.rows[0])
            resolve(jresult)
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });
    });
}
*/

/**
 * Generic call to clio push action
 * @param {string} account - The account that holds the action.
 * @param {string} action - The action being called.
 * @param {string} json - The json to pass to the action.
 * @param {string} permission - 'eosio@active' formatted permission for executing the action
 * @return {json} - Returns json object.
 */
/*
async function pushAction(account, action, json, permission) {
    return new Promise(function(resolve, reject) {
        runCmd(config.CLIO + " push action " + account + " " + action + " '" + json + "' --permission " + permission + " --json")
        .then(result => {
            let jresult = JSON.parse(result)
            console.log("jresult", jresult)
            resolve(jresult)
        }).catch(error => {
            console.log('Error pushaction: ', error)
            reject(error)
        });
    });
}
*/

/**
 * Get actions from a history node for an account.
 * @param {string} account - The name of the account to query on.
 * @param {number} pos - The account_action_seq of the action, -1 for last.
 * @param {number} offset - The number of actions to return. Returns [pos, pos+offset] for positive offset or [pos-offset,pos) for negative offset.
 * @return {json} - Returns actions[], an array of of actions.

async function getActions(account, pos, offset) {
    return new Promise(function(resolve, reject) {
        runCmd(config.CLIO + " get actions " + account + " " + pos + " " + offset)
        .then(result => {
            let jresult = JSON.parse(result)
            //console.log("jresult", jresult.rows)
            resolve(jresult)
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });
    });
}
 */
/*
function callWalletApi(apiCall, JSONObject) {
    return (new Promise(function(resolve, reject) {
        var options = {
            method: "POST",
            uri: KeosdUrl + apiCall,
            body: JSONObject,
            json: true // Automatically stringifies the body to JSON
        };

        rp(options)
            .then(function (body){
                //console.log(body);
                resolve(body);
            }).catch(function(ex) {
                reject(ex);
            });
    }));
};

function runCmd(command) {
    return new Promise(function(resolve, reject) {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout.trim());
        });
    });
}

function runClio2(parms) {
    return new Promise(function(resolve, reject) {
        //command = clio + " -u " + url + " " + parms
        command = config.CLIO + " get info"
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout.trim());
        });
    });
}

async function runClio(parms) {
    return new Promise(function(resolve, reject) {
        runCmd(config.CLIO + " " + parms)
        .then(result => {
            let jresult = JSON.parse(result)
            console.log("jresult", jresult)
            resolve(jresult)
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });
    });
}

// TODO: Eric need to complete
async function importPrivKey(pubkey, privkey) {
    return new Promise(function(resolve, reject) {
        runCmd(config.CLIO + " wallet keys")
        .then(result => {
            let keyexists = result.indexOf(pubkey)
            console.log('keyexists: ', keyexists)
            if (keyexists == -1 ) {  // Pub Key not found
                //runCmd(config.CLIO + " wallet import --private-key " + privkey + " -n fio")
            }
            resolve()
        }).catch(error => {
            console.log('Error: ', error)
            reject()
        });
    });
}


async function getPermissions(publicKey) {
    return new Promise(function(resolve, reject) {
        account = transaction.getActor(publicKey)
        runCmd(config.CLIO + " get account " + account + " -j")
        .then(result => {
            let jresult = JSON.parse(result)
            console.log("jresult", jresult.permissions[1])
            permissions = {
                active: jresult.permissions[0],
                owner: jresult.permissions[1]
            }
            resolve(permissions)
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });
    });
}


async function getRam(account) {
    return new Promise(function(resolve, reject) {
        let ramUse
        runCmd(config.CLIO + " get account " + account + " -j")
        .then(result => { //console.log("prev result", result)
            let jResult = JSON.parse(result)
            ramUse = {
                actualRamUsage: jResult.ram_usage,
                actualRamQuota: jResult.ram_quota
            }
            //ramLog.ramUsage.push(ramEntry);
            resolve(ramUse)
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });
    });
}
*/

// Todo: Eric Need to complete
/*
async function updateAuth(account, ) {
    return new Promise(function(resolve, reject) {
        //#Create msig for 2lqw5qowwhin. This account will require kkpvib4wwhif (weight=1) and rkrpwdp3ismx (weight=1)
        //./clio -u http://localhost:8889 push action eosio updateauth
        var text = {
            account: "2lqw5qowwhin",
            permission: "active",
            parent: "owner",
            auth: {
                threshold: 2,
                keys: [],
                waits: [],
                accounts: [{
                    permission: {
                        actor: "kkpvib4wwhif",
                        permission: "active"
                    },
                    weight: 1
                },
                {
                    permission: {
                        actor: "rkrpwdp3ismx",
                        permission: "active"
                    },
                    weight: 1
                }]
            },
            max_fee: 4000000000
        }
            //' -p 2lqw5qowwhin@active
        text = JSON.stringify(text)

        //console.log('in getAccountVoteWeight')
        runCmd(config.CLIO + " get table -l -1 fio.treasury fio.treasury voteshares")
        .then(result => {
            let jresult = JSON.parse(result)
            console.log("jresult", jresult.rows[0])
            resolve(jresult)
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });
    });
}
*/

// Todo: Eric Need to complete
/*
async function msigPropose() {
    return new Promise(function(resolve, reject) {
        //#Create msig for 2lqw5qowwhin. This account will require kkpvib4wwhif (weight=1) and rkrpwdp3ismx (weight=1)
        //./clio -u http://localhost:8889 push action eosio updateauth '{"account": "2lqw5qowwhin", "permission": "active",  "parent": "owner", "auth": { "threshold": 2, "keys": [], "waits": [],"accounts": [{"permission":{"actor":"kkpvib4wwhif","permission":"active"},"weight":1},{"permission":{"actor":"rkrpwdp3ismx","permission":"active"},"weight":1}] }, "max_fee": 4000000000 }' -p 2lqw5qowwhin@active


        //console.log('in getAccountVoteWeight')
        runCmd(config.CLIO + " get table -l -1 fio.treasury fio.treasury voteshares")
        .then(result => {
            let jresult = JSON.parse(result)
            console.log("jresult", jresult.rows[0])
            resolve(jresult)
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });
    });
}

async function msigApprove() {
    return new Promise(function(resolve, reject) {
        //#Create msig for 2lqw5qowwhin. This account will require kkpvib4wwhif (weight=1) and rkrpwdp3ismx (weight=1)
        //./clio -u http://localhost:8889 push action eosio updateauth '{"account": "2lqw5qowwhin", "permission": "active",  "parent": "owner", "auth": { "threshold": 2, "keys": [], "waits": [],"accounts": [{"permission":{"actor":"kkpvib4wwhif","permission":"active"},"weight":1},{"permission":{"actor":"rkrpwdp3ismx","permission":"active"},"weight":1}] }, "max_fee": 4000000000 }' -p 2lqw5qowwhin@active


        //console.log('in getAccountVoteWeight')
        runCmd(config.CLIO + " get table -l -1 fio.treasury fio.treasury voteshares")
        .then(result => {
            let jresult = JSON.parse(result)
            console.log("jresult", jresult.rows[0])
            resolve(jresult)
        }).catch(error => {
            console.log('Error: ', error)
            reject(error)
        });
    });
}
*/

// Todo: Need to replace use of this with the above Ram function
/*
class Ram {
    constructor(account) {
        this.account = account;
        this.ramUsage = [];
    }

    setRamData(txnType, fee, ramLog) {
        return new Promise(function(resolve, reject) {
            let ramEntry
            runCmd(config.CLIO + " get account " + ramLog.account + " -j")
            .then(result => { //console.log("prev result", result)
                let jResult = JSON.parse(result)
                ramEntry = {
                    txnType: txnType,
                    fee: fee,
                    txnQuota: config.RAM[txnType],
                    actualRamUsage: jResult.ram_usage,
                    actualRamQuota: jResult.ram_quota,
                    expectedRamQuota: config.RAM[txnType]
                }
                ramLog.ramUsage.push(ramEntry);
                resolve(ramEntry)

            }).catch(error => {
                console.log('Error: ', error)
                reject(error)
            });

        });
    }

    printRam() {
        let entry, fee, type, txnQuota, actualRamQuota, deltaRamQuota, actualRamUsage, deltaActualRamUsage
        console.log('type' + '\t' + 'feeCollected' + '\t' + 'txnQuota' + '\t' + 'actualRamQuota' + '\t' + 'deltaRamQuota' + '\t' + 'actualRAMUsage' + '\t' + 'deltaActualRAMUsage')

        for (entry in this.ramUsage) {
            type = this.ramUsage[entry].txnType
            fee = this.ramUsage[entry].fee
            txnQuota = this.ramUsage[entry].txnQuota
            actualRamQuota = this.ramUsage[entry].actualRamQuota
            deltaRamQuota = actualRamQuota - txnQuota
            actualRamUsage = this.ramUsage[entry].actualRamUsage
            if (entry>0) {
                deltaActualRamUsage = actualRamUsage - this.ramUsage[entry-1].actualRamUsage
            } else {
                deltaActualRamUsage = 0
            }
            console.log(type + '\t' + fee  + '\t' + txnQuota + '\t' + actualRamQuota + '\t' + deltaRamQuota + '\t' + actualRamUsage + '\t' + deltaActualRamUsage)

        }
    }
} //Ram class
*/

module.exports = {newUser, existingUser, getTestType, getTopprods, callFioApi, callFioApiSigned, callFioHistoryApi, convertToK1, unlockWallet, getFees, getAccountFromKey, getProdVoteTotal, addLock, getTotalVotedFio, getAccountVoteWeight, setRam, printUserRam, user, getMnemonic, fetchJson, randStr, timeout, generateFioDomain, generateFioAddress, createKeypair, readProdFile};

