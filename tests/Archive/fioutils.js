const rp = require('request-promise');
const exec = require('child_process').exec;
const fioData = require('./Archive/serverResponses');

const url = "http://localhost:8889"
const fiourl = url + "/v1/chain/"
const KeosdUrl = url + "/v1/chain/"
const clio = "../fio.devtools/bin/clio"

const generateTestingFioDomain = () => {
    return `testing-domain-${Math.random().toString(26).substr(2, 8)}`
}

const generateTestingFioAddress = (customDomain = fioTestnetDomain) => {
    return `testing${Math.random().toString(26).substr(2, 8)}@${customDomain}`
  }

class fioUtils {
    constructor() {}

    callFioApi(apiCall, JSONObject) {
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

    callWalletApi(apiCall, JSONObject) {
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

    runCmd(command) {
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

    runCmd2(command) {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log("runcmd2 error: ", error)
                return(error);
            }
            console.log("runcmd2 result: ", stdout.trim())
            return(stdout.trim());
        });
    }

    runClio(parms) {
        return new Promise(function(resolve, reject) {
            //command = clio + " -u " + url + " " + parms
            command = "../fio.devtools/bin/clio -u http://localhost:8889 get info"
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(stdout.trim());
            });
        });
    }

    ensureAccount(fundAmount, sourceAccount, pubKey) {
        //const MINAMOUNT = fioData.FEE_register_fio_domain
        //return new Promise(function(resolve, reject) {
        
            return sourceAccount.genericAction('transferTokens', {
                payeeFioPublicKey: pubKey,
                amount: fundAmount,
                maxFee: fioData.fees.FEE_transfer_tokens_pub_key
            })
            /*const command = sourceAccount.genericAction('transferTokens', {
                payeeFioPublicKey: pubKey,
                amount: fundAmount,
                maxFee: fioData.fees.FEE_transfer_tokens_pub_key
            })
            exec(command, (error, stdout, stderr) => {
                console.log("Command: ", command)
                if (error) {
                    console.log("Error: ", error)
                    reject(error);
                    return;
                }
                console.log("stdout: ", stdout)
                resolve(stdout.trim());
            }); */
        //});
    }

    registerDomain(sourceAccount) {
        let fioDomain = generateTestingFioDomain()
        return sourceAccount.genericAction('registerFioDomain', { 
            fioDomain: fioDomain, 
            maxFee: fioData.fees.FEE_register_fio_domain,
            walletFioAddress: ''
        })
    }

    registerAddress(sourceAccount, domain) {
        let newAddress = generateTestingFioAddress(domain)
        return sourceAccount.genericAction('registerFioAddress', {
            fioAddress: newAddress,
            maxFee: fioData.api.register_fio_address.fee,
            walletFioAddress: ''
        })
    }
    
    registerAddDom(sourceAccount) {
        let newDomain = this.registerDomain(sourceAccount)        
        return newDomain, this.registerAddress(sourceAccount, newDomain)
    }


      
} //fioUtils class

class RAM {
    constructor(account) {
        this.account = account;
        this.ramUsage = [];
    }
/*
    addRAMEntry(txnType, txnQuota, actualRAMUsage, actualRAMQuota, expectedRAMQuota) {
        try {
            this.RAMEntry = {
                txnType: txnType,
                txnQuota: txnQuota,
                actualRAMUsage: actualRAMUsage, 
                actualRAMQuota: actualRAMQuota, 
                expectedRAMQuota: expectedRAMQuota
            }
            this.ramUsage.push(this.RAMEntry);
            console.log('addRAMEntry txnType: ', this.RAMEntry.txnType)
        } catch (err) {
           console.log('Error: ', err)
        }
    }
*/
    setRAMData(txnType,ramLog) {
        return new Promise(function(resolve, reject) {
            let RAMEntry
            fio = new fioUtils()
            fio.runCmd("../fio.devtools/bin/clio -u http://localhost:8889 get account " + ramLog.account + " -j")
            .then(result => { //console.log("prev result", result)
                let jResult = JSON.parse(result) 
                RAMEntry = {
                    txnType: txnType,
                    txnQuota: fioData.RAM[txnType],
                    actualRAMUsage: jResult.ram_usage, 
                    actualRAMQuota: jResult.ram_quota, 
                    expectedRAMQuota: fioData.RAM[txnType]
                }
                ramLog.ramUsage.push(RAMEntry);
                resolve(RAMEntry)

            }).catch(error => {
                console.log('Error: ', error)
                reject(error)
            });
            
        });
    }

/*
    set(txnType) {
        //let getRAMData = this.getRAMData
        return new Promise(function(resolve, reject) {
            try {
                const result = await this.getRAMData(txnType);
                resolve(result);
            } catch (err) {
                reject(err);
            }
        });
    }
*/
/*
    get() {
        result = JSON.parse(runCmd("../fio.devtools/bin/clio -u http://localhost:8889 get account " + this.account + " -j"))
        //jsonResult = JSON.parse(result) 
        //console.log('get account: ', jsonResult)
        this.addRAMEntry(result.ram_usage, result.ram_quota)
    }
*/
    printLatest() {
        previous = this.ramUsage[this.ramUsage.length - 1]
        latest = this.ramUsage[this.ramUsage.length]
        console.log('Actual RAM usage: ', latest.actualRAMUsage)
        console.log('Actual RAM usage delta: ', latest.actualRAMUsage - previous.actualRAMUsag)
        console.log('Actual RAM quota: ', latest.actualRAMQuota)
        console.log('Actual RAM quota delta: ', latest.actualRAMQuota - previous.actualRAMQuota)
        console.log('Expected RAM quota: ', latest.expectedRAMQuota)
        console.log('Expected RAM quota delta: ', latest.txnType)
      }
} //RAM class


module.exports = {fioUtils,RAM};

