require('mocha')
const {expect} = require('chai')
const {newUser, fetchJson} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/FIOSDK')
config = require('../config.js');

const exec = require('child_process').exec;
const clio = "../fio.devtools/bin/clio";
const url = config.URL

async function runClio(parms) {
    return new Promise(function(resolve, reject) {
        command = clio + " -u " + url + " " + parms
        //command = "../fio.devtools/bin/clio -u http://localhost:8889 get info"
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout.trim());
        });
    });
}

before(async () => {
    faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson)

    result = await runClio('wallet unlock -n fio --password ' + config.WALLETKEY);
})

describe(`************************** clio.js ************************** \n A. Test clio`, () => {

    it(`get info`, async () => {
        result = await runClio('get info');
        expect(JSON.parse(result).head_block_num).to.be.a('number')
      })
})

describe(`B. Request`, () => {

    it(`Create users and import private keys`, async () => {
        user1 = await newUser(faucet);
        result = await runClio('wallet import -n fio --private-key ' + user1.privateKey);
        user2 = await newUser(faucet);
        result = await runClio('wallet import -n fio --private-key ' + user2.privateKey);
    })

    it(`get info`, async () => {
        result = await runClio('get info');
        expect(JSON.parse(result).head_block_num).to.be.a('number')
    })

})