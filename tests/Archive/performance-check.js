require('mocha')
const rp = require('request-promise');
const {performance} = require('perf_hooks');
config = require('../../config.js');
const {expect} = require('chai')
const {newUser, fetchJson, generateFioDomain, generateFioAddress, createKeypair, callFioApi} = require('../../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')


before(async () => {
  faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
})

const servers = [
  //'https://fio.cryptolions.io/v1/',
  'https://fio.eu.eosamsterdam.net:443/v1/',
  'https://fio.eosdac.io:443/v1/',
  'http://fioapi.nodeone.io:6881/v1/',
  'https://fio.eosphere.io:443/v1/',
  'https://fio.acherontrading.com:443/v1/',
  'https://fio.eos.barcelona:443/v1/',
  'https://api.fio.eosdetroit.io:443/v1/',
  'https://fio.zenblocks.io:443/v1/',
  'https://api.fio.alohaeos.com:443/v1/',
  'https://fio.greymass.com:443/v1/',
  'https://fio.eosusa.news:443/v1/',
  'https://fio.eosargentina.io:443/v1/',
  'https://fio-mainnet.eosblocksmith.io:443/v1/',
  'https://api.fio.currencyhub.io:443/v1/',
  'https://fio.eoscannon.io:443/v1/',
  //'https://fio.eosdublin.io:443/v1/',
  'https://fio.eossweden.org:443/v1/',
  'https://fio.maltablock.org:443/v1/'
]

describe(`************************** performance-check.js ************************** \n A. Test name lookup`, () => {
  let userA1, name = 'ericbutz@edge'

  it('Create userA1', async () => {
      let keys = await createKeypair();
      userA1 = new FIOSDK(keys.privateKey, keys.publicKey, config.BASE_URL, fetchJson)
      //console.log('userA1 pub key: ', userA1.publicKey)
  })

  it('get_pub_address', async () => {
    let apiCall = 'get_pub_address';
    const json = {
      "fio_address": "ericbutz@edge",
      "token_code": "FIO",
      "chain_code": "FIO"
    }
    for (server in servers) {
        var options = {
          method: "POST",
          uri: servers[server] + "chain/" + apiCall,
          body: json,
          json: true 
        };
        console.log("uri: " + options.uri);
        //console.log("\nWith stringified JSON: \n")
        //console.log(JSON.stringify(options.body));
        t0 = performance.now();
        await rp(options)
          .then(function (body){
              console.log('Response', body.public_address);
              t1 = performance.now();
              console.log('Time', t1 - t0);
              console.log();
              //resolve(body);
          }).catch(function(ex) {
              console.log('ex: ', ex);
          });
    }
  })

})
