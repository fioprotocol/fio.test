require('mocha')
const {expect} = require('chai')
const {
  newUser, 
  existingUser,
  generateFioAddress, 
  generateFioDomain, 
  createKeypair, 
  callFioApi, 
  getFees,
  getCurrencyBalance,
  consumeRemainingBundles,
  getRemainingLockAmount,
  timeout, 
  fetchJson
} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk')
config = require('../config.js');

const faucet = new FIOSDK(config.FAUCET_PRIV_KEY, config.FAUCET_PUB_KEY, config.BASE_URL, fetchJson);
const userCount = 1;
let globalTable, voterWithProd, voterWithProxy, voterWithAutoproxy, bp1, proxy, autoproxy, otherUser;

class FioGlobal {
  constructor(globalParams) {
    Object.assign(this, globalParams);  // Pulls in the args from the FIO global table
    this.total_voted_fio = this.total_voted_fio;
    this.previous_total_voted_fio = this.total_voted_fio;
    this.total_producer_vote_weight = this.total_producer_vote_weight;
    this.previous_total_producer_vote_weight = this.total_producer_vote_weight;
  }
  static async initialize() {
    const globalTable = await getGlobalTable();
    return new FioGlobal(globalTable);
  }
  async updateValues() {
    const globalTable = await getGlobalTable();
    this.previous_total_voted_fio = this.total_voted_fio;
    this.total_voted_fio = globalTable.total_voted_fio;
    this.previous_total_producer_vote_weight = this.total_producer_vote_weight;
    this.total_producer_vote_weight = globalTable.total_producer_vote_weight;
    //console.log('globalTable: ', this);
  }
}
class User {
  constructor(userParams, currencyBalance) {
    Object.assign(this, userParams);  // Pulls in the args from the new user
    this.previous_currency_balance = currencyBalance;
    this.current_currency_balance = currencyBalance;
    this.unvotableLocked = 0;
  }
  async updateValues () {
    this.previous_currency_balance = this.current_currency_balance;
    this.current_currency_balance = await getCurrencyBalance(this.account);
    const voterInfo = await getVoterInfo(this);
    Object.assign(this, voterInfo);
  }
}

class Producer {
  constructor(prodInfo, currencyBalance, voterMap) {
    Object.assign(this, prodInfo);
    this.currencyBalance = currencyBalance;
    this.voters = voterMap;
  }
  static async initialize (account) {
    const prodInfo = await getProdInfo(account);
    const currencyBalance = await getCurrencyBalance(account);
    const voterMap = new Map();
    voterMap.set("InitialVotedFIO", Number(prodInfo.total_votes) / 1000000000);
    return new Producer(prodInfo, currencyBalance, voterMap);
  }
  updateVote (voter) {
    this.voters.set(voter.account, Number(voter.last_vote_weight) / 1000000000);
  }
  getTotalVotes () {
    let totalVotes = 0;
    this.voters.forEach (function(value, key) {
      totalVotes += value;
    })
    return totalVotes;
  }
  async updateValues () {
    const prodInfo = await getProdInfo(this.owner);
    Object.assign(this, prodInfo);
  }
}

class Proxy extends User {
  constructor(userParams, currencyBalance) {
    super(userParams, currencyBalance);
    this.proxiedVotes = new Map();
  }
  // To call async functions in a constructor, using an async initialize function that calls the constructor. Kind of a workaround...
  static async initialize (producer) {
    const user = await newUser(faucet);
    await voteProducer(user, producer.fio_address);
    await regProxy(user);
    const voterInfo = await getVoterInfo(user);
    Object.assign(user, voterInfo);  // Copy the info from voterInfo into the user object
    //await consumeRemainingBundles(user, otherUser);
    const currencyBalance = await getCurrencyBalance(user.account);
    return new Proxy(user, currencyBalance);
  }
  updateVote (voter) {
    this.proxiedVotes.set(voter.account, Number(voter.last_vote_weight) / 1000000000);
  }
  getTotalVotes () {
    let totalVotes = 0;
    this.proxiedVotes.forEach (function(value, key) {
      totalVotes += value;
    })
    return totalVotes;
  }
  async updateValues (prod) {
    super.updateValues();
    prod.updateVote(this); // Need to update the proxy total when updating the voter totals
  }
}


class VoterWithProducer extends User {
  constructor(userParams, currencyBalance) {
    super(userParams, currencyBalance);
  }
  // To call async functions in a constructor, using an async initialize function that calls the constructor. Kind of a workaround...
  static async initialize (producer) {
    const user = await newUser(faucet);
    await voteProducer(user, producer.fio_address);
    const voterInfo = await getVoterInfo(user);
    Object.assign(user, voterInfo);  // Copy the info from voterInfo into the user object
    //await consumeRemainingBundles(user, otherUser);
    const currencyBalance = await getCurrencyBalance(user.account);
    return new VoterWithProducer(user, currencyBalance);
  }
  async updateValues (prod) {
    super.updateValues();
    prod.updateVote(this); // Need to update the proxy total when updating the voter totals
  }
}

class VoterWithProxy extends User {
  constructor(userParams, currencyBalance) {
    super(userParams, currencyBalance);
  }
  // To call async functions in a constructor, using an async initialize function that calls the constructor. Kind of a workaround...
  static async initialize(proxy) {
    const user = await newUser(faucet);
    await voteProxy(user, proxy);
    const voterInfo = await getVoterInfo(user);
    Object.assign(user, voterInfo);  // Copy the info from voterInfo into the user object
    //await consumeRemainingBundles(user, otherUser);
    const currencyBalance = await getCurrencyBalance(user.account);
    return new VoterWithProxy(user, currencyBalance);
  }
  async updateValues (proxy) {
    super.updateValues();
    await proxy.updateVote(this); // Need to update the proxy total when updating the voter totals
  }
}

class VoterWithAutoproxy extends User {
  constructor(userParams, currencyBalance) {
    super(userParams, currencyBalance);
  }
  // To call async functions in a constructor, using an async initialize function that calls the constructor. Kind of a workaround...
  static async initialize(autoproxy) {
    const user = await newUser(faucet);
    //Transfer FIO using a TPID assigned to autoproxy. This makes the user an autoproxied user.
    const transfer = await user.sdk.genericAction('pushTransaction', {
      action: 'trnsfiopubky',
      account: 'fio.token',
      data: {
          payee_public_key: faucet.publicKey,
          amount: 1000000000,
          max_fee: config.maxFee,
          tpid: autoproxy.address,
          actor: user.account
      }
    });
    const voterInfo = await getVoterInfo(user);
    Object.assign(user, voterInfo);  // Copy the info from voterInfo into the user object
    //await consumeRemainingBundles(user, otherUser);
    const currencyBalance = await getCurrencyBalance(user.account);
    return new VoterWithAutoproxy(user, currencyBalance);
  }
  async updateValues (autoproxy) {
    super.updateValues();
    await autoproxy.updateVote(this); // Need to update the proxy total when updating the voter totals
  }
}

async function voteProducer(user, prodAddress) {  // e.g., bp1@dapixdev
  try {
    const result = await user.sdk.genericAction('pushTransaction', {
      action: 'voteproducer',
      account: 'eosio',
      data: {
        "producers": [
          prodAddress
        ],
        fio_address: user.address,
        actor: user.account,
        max_fee: config.maxFee
      }
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  } catch (err) {
    console.log('Error: ', err.json)
    expect(err).to.equal('null')
  }
}

async function regProxy(user) {
  try {
    const result = await user.sdk.genericAction('pushTransaction', {
      action: 'regproxy',
      account: 'eosio',
      data: {
        fio_address: user.address,
        actor: user.account,
        max_fee: config.maxFee
      }
    })
    //console.log('Result: ', result)
    expect(result.status).to.equal('OK')
  } catch (err) {
    console.log('Error: ', err)
    expect(err).to.equal('null')
  }
}

async function voteProxy(user, proxy) {
  try {
    await user.sdk.genericAction('pushTransaction', {
      action: 'voteproxy',
      account: 'eosio',
      data: {
        proxy: proxy.address,
        fio_address: user.address,
        actor: user.account,
        max_fee: config.maxFee
      }
    });
  } catch (err) {
    console.log('Error: ', err)
    expect(err).to.equal('null')
  }
}

async function getBundleCount(user) {
  console.log('key:', user.publicKey);
  let bundleCount = 0;
  try {
    const json = {
      "fio_public_key": user.publicKey
    }
    result = await callFioApi("get_fio_names", json);
    bundleCount = result.fio_addresses[0].remaining_bundled_tx;

  } catch (err) {
      //console.log(err);
  }
  return bundleCount;
}

async function getVoterInfo(user) {
  const json = {
    json: true,
    code: 'eosio',
    scope: 'eosio',
    table: 'voters',
    lower_bound: user.account,
    upper_bound: user.account,
    key_type: "name",
    index_position: "3",
    json: true
  }
  const result = await callFioApi("get_table_rows", json);
  //console.log(result)
  return result.rows[0];
}

async function getVoterLastVoteWeight(user) {
  const json = {
    json: true,
    code: 'eosio',
    scope: 'eosio',
    table: 'voters',
    lower_bound: user.account,
    upper_bound: user.account,
    key_type: "name",
    index_position: "3",
    json: true
  }
  const result = await callFioApi("get_table_rows", json);
  console.log(result)
  return result.rows[0].last_vote_weight;
}

async function getProdVoteWeight(account) {
  const json = {
    json: true,
    code: 'eosio',
    scope: 'eosio',
    table: 'producers',
    lower_bound: account,
    upper_bound: account,
    key_type: "name",
    index_position: "4",
    json: true
  }
  const result = await callFioApi("get_table_rows", json);
  //console.log(result)
  return result.rows[0].vote_weight;
}

async function getProdInfo(account) {
  const json = {
    json: true,
    code: 'eosio',
    scope: 'eosio',
    table: 'producers',
    lower_bound: account,
    upper_bound: account,
    key_type: "name",
    index_position: "4",
    json: true
  }
  const result = await callFioApi("get_table_rows", json);
  //console.log(result)
  return result.rows[0];
}

async function getGlobalTable() {
  const json = {
    json: true,
    code: 'eosio',
    scope: 'eosio',
    table: 'global',
    limit: 1
  }
  const result = await callFioApi("get_table_rows", json);
  return result.rows[0];
}

let prev_producer_total_votes, 
  producer_total_votes, 
  prev_voterWithProd_last_vote_weight, 
  voterWithProd_last_vote_weight,
  prev_proxy_last_vote_weight,
  proxy_last_vote_weight,
  prev_voterWithProxy_last_vote_weight,
  voterWithProxy_last_vote_weight,
  prev_autoproxy_last_vote_weight,
  autoproxy_last_vote_weight,
  prev_voterWithAutoproxy_last_vote_weight,
  voterWithAutoproxy_last_vote_weight


before(async () => {
  //otherUser = await newUser(faucet);

  // bp1 = qbxn5zhw2ypw
  // bp2 = hfdg2qumuvlc
  // bp3 = wttywsmdmfew
  // bp1 = await Producer.initialize('qbxn5zhw2ypw');
  // const result = await getProdInfo('qbxn5zhw2ypw');
  // console.log('result: ', result)
  // console.log('bp1: ', bp1)

  // // await timeout(5000);

  // voterWithProd = await VoterWithProducer.initialize(bp1);
  // await voterWithProd.updateValues(bp1); // After you create a voterWithProxy you need to call updateValues to add its vote total to the proxy total
  // //await bp1.updateValues();
  // //console.log('voterWithProd: ', voterWithProd)
  // // const result2 = await getProdInfo('qbxn5zhw2ypw');
  // // console.log('result2: ', result2)
  // // console.log('bp1: ', bp1)


  // proxy = await Proxy.initialize(bp1);
  // await proxy.updateValues(bp1);

  // voterWithProxy = await VoterWithProxy.initialize(proxy);
  // await voterWithProxy.updateValues(proxy); // After you create a voterWithProxy you need to call updateValues to add its vote total to the proxy total
  // console.log('voterWithProxy: ', voterWithProxy)

  // // autoproxy = await Proxy.initialize(bp1);
  // // await autoproxy.updateValues(bp1);

  // // voterWithAutoproxy = await VoterWithAutoproxy.initialize(autoproxy);
  // // await voterWithAutoproxy.updateValues(autoproxy); // After you create a voterWithProxy you need to call updateValues to add its vote total to the proxy total

  // // Do a final update of the producer values after all of the voter and proxy votes have been updated
  // await bp1.updateValues();
  // console.log('bp1 end of setup: ', bp1)

  // Initialize the global table at the end
  //globalTable = await FioGlobal.initialize();
  //console.log('global init: ', globalTable);

})


describe('************************** vote-action-tests.js ************************** \n    A. Testing generic actions', () => {
  const xferAmount = 10000000000; // 10 FIO  

  beforeEach(async () => {
    // runs before each test in this block

    // Set producer_total_votes
  });

  afterEach(async () => {
/*    await timeout(2000);
    // Check voterWithProd votes
    try {
      await voterWithProd.updateValues(bp1);
      console.log('afterEach voterWithProd: ', voterWithProd);
      expect(Number(voterWithProd.last_vote_weight) / 1000000000).to.equal(voterWithProd.current_currency_balance);
    } catch (err) {
      console.log(`voterWithProd error: ${err}`);
    }

    // Check producer votes
    try {
      await bp1.updateValues();
      console.log('afterEach bp1: ', bp1);
      const sumOfProdVotes = bp1.getTotalVotes();
      console.log('sumOfProdVotes: ', sumOfProdVotes);
      expect(Number(bp1.total_votes) / 1000000000).to.equal(sumOfProdVotes);
    } catch (err) {
      console.log(`producer error: ${err}`);
    }

    // For voterWithProxy
    await voterWithProxy.updateValues(proxy);
    //console.log('afterEach voterWithProxy: ', voterWithProxy);
    expect(Number(voterWithProxy.last_vote_weight) / 1000000000).to.equal(voterWithProxy.current_currency_balance);

    // For proxy
    await proxy.updateValues();
    //console.log('afterEach proxy: ', proxy);
    const sumOfProxiedVotes = proxy.getTotalVotes();
    expect(Number(proxy.last_vote_weight) / 1000000000).to.equal(proxy.current_currency_balance + Number(proxy.proxied_vote_weight) / 1000000000);
    expect(Number(proxy.last_vote_weight) / 1000000000).to.equal(proxy.current_currency_balance + sumOfProxiedVotes);
    expect(Number(proxy.proxied_vote_weight) / 1000000000).to.equal(sumOfProxiedVotes);

    // For voterWithAutoproxy
    await voterWithAutoproxy.updateValues(autoproxy);
    //console.log('afterEach voterWithAutoproxy: ', voterWithAutoproxy);
    expect(Number(voterWithAutoproxy.last_vote_weight) / 1000000000).to.equal(voterWithAutoproxy.current_currency_balance);

    // For autoproxy
    await autoproxy.updateValues();
    //console.log('afterEach autoproxy: ', autoproxy);
    const sumOfAutoProxiedVotes = autoproxy.getTotalVotes();
    expect(Number(autoproxy.last_vote_weight) / 1000000000).to.equal(autoproxy.current_currency_balance + Number(autoproxy.proxied_vote_weight) / 1000000000);
    expect(Number(autoproxy.last_vote_weight) / 1000000000).to.equal(autoproxy.current_currency_balance + sumOfAutoProxiedVotes);
    expect(Number(autoproxy.proxied_vote_weight) / 1000000000).to.equal(sumOfAutoProxiedVotes);
*/

    // For producer


    // For global
    //await globalTable.updateValues();
    // if (false) {
    //   console.log(`             previous_total_voted_fio = ${globalTable.previous_total_voted_fio}`);
    //   console.log(`             total_voted_fio = ${globalTable.total_voted_fio}`);
    //   console.log(`             difference = ${globalTable.previous_total_voted_fio - globalTable.total_voted_fio}`);
    //   console.log(`             previous_currency_balance = ${voterWithProd.previous_currency_balance}`);
    //   console.log(`             current_currency_balance = ${voterWithProd.current_currency_balance}`);
    //   console.log(`             difference = ${voterWithProd.previous_currency_balance - voterWithProd.current_currency_balance}`);
    // }
    //expect(globalTable.total_voted_fio - globalTable.previous_total_voted_fio).to.equal(voterWithProd.current_currency_balance - voterWithProd.previous_currency_balance);

  });
let user1;


  // it(`Producer Info.`, async () => {
  //   const result = await getProdInfo('qbxn5zhw2ypw');
  // });

  // it(`Success, vote for producers.`, async () => {
  //   try {
  //     const result = await user1.sdk.genericAction('pushTransaction', {
  //       action: 'voteproducer',
  //       account: 'eosio',
  //       data: {
  //         producers: ["bp1@dapixdev"],
  //         fio_address: user1.address,
  //         actor: user1.account,
  //         max_fee: config.maxFee
  //       }
  //     })
  //     expect(result.status).to.equal('OK')
  //   } catch (err) {
  //     console.log("ERROR: ", err);
  //     expect(err).to.equal(null);
  //   }
  // })

  it(`Users`, async () => {
    try {
      bp1 = await existingUser('qbxn5zhw2ypw', '5KQ6f9ZgUtagD3LZ4wcMKhhvK9qy4BuwL3L1pkm6E2v62HCne2R', 'FIO7jVQXMNLzSncm7kxwg9gk7XUBYQeJPk8b6QfaK5NVNkh3QZrRr', 'dapixdev', 'bp1@dapixdev');

      voterWithProd = await newUser(faucet);
      const result1 = await voterWithProd.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            bp1.address
          ],
          fio_address: voterWithProd.address,
          actor: voterWithProd.account,
          max_fee: config.maxFee
        }
      })

      // proxy
      proxy = await newUser(faucet);
      const result2 = await proxy.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: proxy.address,
          actor: proxy.account,
          max_fee: config.maxFee
        }
      })
      const result3 = await proxy.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            bp1.address
          ],
          fio_address: proxy.address,
          actor: proxy.account,
          max_fee: config.maxFee
        }
      })

      // voterWithProxy
      voterWithProxy = await newUser(faucet);
      const result4 = await voterWithProxy.sdk.genericAction('pushTransaction', {
        action: 'voteproxy',
        account: 'eosio',
        data: {
          proxy: proxy.address,
          fio_address: voterWithProxy.address,
          actor: voterWithProxy.account,
          max_fee: config.maxFee
        }
      })


      // autoproxy
      autoproxy = await newUser(faucet);
      const result5 = await autoproxy.sdk.genericAction('pushTransaction', {
        action: 'regproxy',
        account: 'eosio',
        data: {
          fio_address: autoproxy.address,
          actor: autoproxy.account,
          max_fee: config.maxFee
        }
      })
      const result6 = await autoproxy.sdk.genericAction('pushTransaction', {
        action: 'voteproducer',
        account: 'eosio',
        data: {
          "producers": [
            bp1.address
          ],
          fio_address: autoproxy.address,
          actor: autoproxy.account,
          max_fee: config.maxFee
        }
      })

      voterWithAutoproxy = await newUser(faucet);
      //Transfer FIO using a TPID assigned to autoproxy. This makes the user an autoproxied user.
      const transfer = await voterWithAutoproxy.sdk.genericAction('pushTransaction', {
        action: 'trnsfiopubky',
        account: 'fio.token',
        data: {
            payee_public_key: faucet.publicKey,
            amount: 1000000000,
            max_fee: config.maxFee,
            tpid: autoproxy.address,
            actor: voterWithAutoproxy.account
        }
      });
    } catch (err) {
      console.log("ERROR: ", err);
      expect(err).to.equal(null);
    }
  });

  it(`Confirm initial values are correct.`, async () => {
    producer_total_votes = Number(await getProdVoteWeight('qbxn5zhw2ypw')) / 1000000000;

    voterWithProd_last_vote_weight = Number(await getVoterLastVoteWeight(voterWithProd)) / 1000000000;

    proxy_last_vote_weight = Number(await getVoterLastVoteWeight(proxy)) / 1000000000;
    voterWithProxy_last_vote_weight = Number(await getVoterLastVoteWeight(voterWithProxy)) / 1000000000;
 
    autoproxy_last_vote_weight = Number(await getVoterLastVoteWeight(autoproxy)) / 1000000000;
    voterWithAutoproxy_last_vote_weight = Number(await getVoterLastVoteWeight(voterWithAutoproxy)) / 1000000000;

  });

  it(`token.trnsfiopubky (voterWithProd) - Transfer 10 FIO from faucet to voterWithProd`, async () => {
    try {
        const transfer = await faucet.genericAction('pushTransaction', {
            action: 'trnsfiopubky',
            account: 'fio.token',
            data: {
                payee_public_key: voterWithProd.publicKey,
                amount: xferAmount,
                max_fee: config.maxFee,
                tpid: '',
                actor: faucet.account
            }
        });
        expect(transfer.status).to.equal('OK')
    } catch (err) {
        console.log(err);
        expect(err).to.equal(null);
    }
  }); 



  it(`Confirm initial values are correct.`, async () => {
    prev_producer_total_votes = producer_total_votes;
    producer_total_votes = Number(await getProdVoteWeight('qbxn5zhw2ypw')) / 1000000000;

    prev_voterWithProd_last_vote_weight = voterWithProd_last_vote_weight;
    voterWithProd_last_vote_weight = Number(await getVoterLastVoteWeight(voterWithProd)) / 1000000000;

    prev_proxy_last_vote_weight = proxy_last_vote_weight;
    proxy_last_vote_weight = Number(await getVoterLastVoteWeight(proxy)) / 1000000000;

    prev_voterWithProxy_last_vote_weight = voterWithProxy_last_vote_weight;
    voterWithProxy_last_vote_weight = Number(await getVoterLastVoteWeight(voterWithProxy)) / 1000000000;
 
    prev_autoproxy_last_vote_weight = autoproxy_last_vote_weight;
    autoproxy_last_vote_weight = Number(await getVoterLastVoteWeight(autoproxy)) / 1000000000;

    prev_voterWithAutoproxy_last_vote_weight = voterWithAutoproxy_last_vote_weight;
    voterWithAutoproxy_last_vote_weight = Number(await getVoterLastVoteWeight(voterWithAutoproxy)) / 1000000000;

    expect(producer_total_votes).to.equal(voterWithProd_last_vote_weight + proxy_last_vote_weight + autoproxy_last_vote_weight);

  });


  // it.skip(`token.trnsfiopubky (voterWithProxy)`, async () => {
  //   try {
  //       const transfer = await faucet.genericAction('pushTransaction', {
  //           action: 'trnsfiopubky',
  //           account: 'fio.token',
  //           data: {
  //               payee_public_key: otherUser.publicKey,
  //               amount: xferAmount,
  //               max_fee: config.maxFee,
  //               tpid: '',
  //               actor: faucet.account
  //           }
  //       });
  //       expect(transfer.status).to.equal('OK')
  //   } catch (err) {
  //       console.log(err);
  //       expect(err).to.equal(null);
  //   }
  // }); 

});

