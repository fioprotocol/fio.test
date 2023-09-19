require('mocha');
const {expect} = require('chai');
const { newUser, fetchJson, getTotalVotedFio, callFioApi, callFioApiSigned, getAccountFromKey, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const rp = require('request-promise');
let faucet;

const fiourl = config.URL + "/v1/chain/";

const producerVotesMap = new Map();
const proxyVotesMap = new Map();
let sumOfVotedFio = 0;
let sumOfProducerTotalVotes = 0;

async function getGlobalTable() {
  const json = {
      json: true,
      code: 'eosio',
      scope: 'eosio',
      table: 'global',
      limit: 1000,
      reverse: false,
      show_payer: false
  }
  const globalTable = callFioApi("get_table_rows", json);
  return globalTable;
}

async function getPublicKey(account) {
  const json = {
    code: "fio.address",
    scope: "fio.address",
    table: "accountmap",
    lower_bound: account,
    upper_bound: account,
    key_type: "i64",
    index_position: "0",
    json: true
  }
  const result = await callFioApi("get_table_rows", json);
  const public_key = result.rows[0].clientkey;
  console.log('publickey: ', public_key)
  return public_key;
}

async function getFioBalance(public_key) {
  const json = {
    fio_public_key: public_key
  }
  const result = await callFioApi("get_fio_balance", json);
  const getter_balance = result.balance;
  const getter_available = result.available;
  const getter_staked = result.staked;
  return {getter_balance, getter_available, getter_staked};
}

async function getCurrencyBalance(account) {
  const json = {
    code: 'fio.token',
    symbol: 'FIO',
    account: account
  }
  const result = await callFioApi("get_currency_balance", json);
  const newstring = result[0].replace(' FIO','');
  const currency_balance = Number(newstring);
  return currency_balance;
}

async function getLocks(voter) {
  const json = {
    code: "eosio",
    scope: "eosio",
    table: "lockedtokens",
    lower_bound: voter.owner,
    upper_bound: voter.owner,
    key_type: "i64",
    index_position: "1",
    json: true
  }
  const result = await callFioApi("get_table_rows", json);
  const remaining_locked_amount = result.length > 0 ? result.rows[0].remaining_locked_amount / 1000000000 : 0;
  return remaining_locked_amount;
}

async function getGlobalProducerVoteWeight() {
  const json = {
    json: true,
    code: 'eosio',
    scope: 'eosio',
    table: 'global',
    limit: 1
  }
  const result = await callFioApi("get_table_rows", json);
  return result.rows[0].total_producer_vote_weight;
}

class Voter {
  constructor(voterParams, public_key, getter_balance, getter_available, getter_staked, currency_balance) {
    Object.assign(this, voterParams);  // Pulls in the args from the FIO voters table
    this.last_vote_weight_num =  Number(this.last_vote_weight) / 1000000000;
    this.proxied_vote_weight_num =  Number(this.proxied_vote_weight) / 1000000000;
    this.public_key = public_key;
    this.getter_balance = getter_balance / 1000000000;
    this.getter_available = getter_available / 1000000000;
    this.getter_staked = getter_staked / 1000000000;
    this.currency_balance = currency_balance;
    this.unvotable_locked = 0;
    this.unvotable_staked = 0;
    this.votable_fio = this.currency_balance - this.unvotable_locked - this.unvotable_staked;
  }
  static async initialize(voterParams) {
    const public_key = await getPublicKey(voterParams.owner);
    const { getter_balance, getter_available, getter_staked } = await getFioBalance(public_key);
    const currency_balance = await getCurrencyBalance(voterParams.owner);
    return new Voter(voterParams, public_key, getter_balance, getter_available, getter_staked, currency_balance);
}
}


async function voterInfo(voter) {
  const last_vote_weight_num =  Number(voter.last_vote_weight) / 1000000000;
  const proxied_vote_weight_num =  Number(voter.proxied_vote_weight) / 1000000000;
  const public_key = await getPublicKey(voter);
  const { getter_balance, getter_available, getter_staked } = await getFioBalance(public_key);
  const currency_balance = await getCurrencyBalance(voter);

  // Get unvotable locked amount
  const remaining_locked_amount = await getLocks(voter);
  const unvotable_locked = 0;


  sumOfVotedFio += voter.last_vote_weight;
  
  // If user has voted (which overrides proxy?), add to producerVotesMap
  if (voter.producers.length > 0) {
    for (let i = 0; i < voter.producers.length; i++) {
      producerVotesMap.get(voter.producers[i]) === undefined ?  producerVotesMap.set(voter.producers[i], last_vote_weight_num) : producerVotesMap.set(voter.producers[i], producerVotesMap.get(voter.producers[i]) + last_vote_weight_num);
      //console.log('try: ', producerVotesMap.get(voter.producers[i]))
    } 
  } else if (voter.proxy != '' ) {
    proxyVotesMap.get(voter.proxy) === undefined ?  proxyVotesMap.set(voter.proxy, proxied_vote_weight_num) : proxyVotesMap.set(proxy, proxyVotesMap.get(proxy) + proxied_vote_weight_num);
  }

  // Check for double proxy
  if (voter.proxy != '' && (voter.is_proxy != 0 || voter.is_auto_proxy != 0)) { 
    console.log("PROBLEM: user is regstered as proxy and also has proxied")
  }

  const votableFio = voter.currency_balance; // - voter.lockedUnvotable - voter.stakedUnvotable;
  valid_last_vote_weight: voter.last_vote_weight === votableFio

  return {
    ...voter,
    public_key,
    currency_balance,
    unvotable_locked,
    unvotable_staked,
    votable_balance,
    last_vote_weight_num,
    valid_last_vote_weight,   //boolean
    proxied_vote_weight_num,
    getter_balance,
    getter_available,
    getter_staked,
    csvOutput: `${voter.owner}, ${voter.proxied_vote_weight}, ${voter.last_vote_weight}, ${voter.is_proxy}, ${voter.is_auto_proxy}, ${voter.currency_balance}, ${voter.getter_balance}, ${voter.getter_available}, ${voter.getter_staked}, ${voter.proxy}, [${voter.producers}]`
  }
}


async function producerInfo(producer) {
  sumOfProducerTotalVotes += producer.total_votes;
  return {
    ...producer
    //public_key,
//    csvOutput: `${voter.owner}, ${voter.proxied_vote_weight}, ${voter.last_vote_weight}, ${voter.is_proxy}, ${voter.is_auto_proxy}, ${voter.currency_balance}, ${voter.getter_balance}, ${voter.getter_available}, ${voter.getter_staked}, ${voter.proxy}, [${voter.producers}]`
  }

}


async function calcVotersData() {
  let voters, votersWithCalcs = []; 
  const json = {
    json: true,
    code: 'eosio',
    scope: 'eosio',
    table: 'voters',
    limit: 1
  }
  const result = await callFioApi("get_table_rows", json); 
  voters = result.rows;
  //console.log('Voters: ', voters);
  // Create new array with extended voter info in voter objects.
  for (let i = 0; i < voters.length; i++) {
    //votersWithCalcs[i] = await voterInfo(voters[i]);
    //votersWithCalcs[i] = new Voter(voters[i]);
    console.log('voters[i]: ', voters[i])
    votersWithCalcs[i] = await Voter.initialize(voters[i]);
    console.log('votersWithCalcs[i]: ', votersWithCalcs[i]);
  }
  //console.log('newVoters: ', newVoters  )
  return votersWithCalcs;
}


async function calcProducersData() {
  let producers, producersWithCalcs = []; 
    // Get all producers
    const json = {
      code: "eosio",
      scope: "eosio",
      table: "producers",
      limit: 1,
      reverse: false,
      json: true
    }
    const result = await callFioApi("get_table_rows", json);
    producers = result.rows;
    //console.log('producers: ', producers);

    // Create new array with extended producer info.
    for (let i = 0; i < producers.length; i++) {
      producersWithCalcs[i] = await producerInfo(producers[i]);
    }
    //console.log('newProducers: ', newProducers  )
    return producersWithCalcs;
};

async function calcGlobalData(voters, producers) {

}

/**
 * code: eosio
 * table: voters
 * field: last_vote_weight
 * 
 * Validate: 
 *    last_vote_weight = currency_balance - unvotable_locked - unvotable_staked
 */
async function verify_last_vote_weight(voters) {
  if (!VoterData.isCalculated) calcVoterData();
  const votersWithLastVoteWeightValidation = voters.map( (voter) => {
    const votableFio = voter.currency_balance; // - voter.lockedUnvotable - voter.stakedUnvotable;
    return {
      ...voter,
      valid_last_vote_weight: voter.last_vote_weight === votableFio
    }
  })
  return votersWithLastVoteWeightValidation;
}

/**
 * code: eosio
 * table: voters
 * field: proxied_vote_weight
 * 
 * Validate 
 *    For registered proxy: proxied_vote_weight = sum of all last_vote_weights from voters that have proxied their votes
 *    All others: proxied_vote_weight = 0
 * 
 * Adds "valid_proxied_vote_weight" boolean to the voter object.
 */
async function verify_proxied_vote_weight(voters) {

}

/**
 * code: eosio
 * table: producers
 * field: total_votes
 * 
 * Validate 
 *    total_votes = sum of all last_vote_weights from voters that have voted for that producer
 * 
 * NOTE: flag if there are cases where a user has votes for producers AND has a proxy
 * 
 * Adds "valid_total_votes" boolean to the producer object.
 */
async function verify_proxied_vote_weight(producers, voters) {

}

/**
* code: eosio
 * table: global
 * field: total_voted_fio
 * 
 * Validate 
 *    total_voted_fio = sum of all last_vote_weights from voters table
 * 
 * Adds "valid_total_voted_fio" boolean to the fioGlobal object.
 */
async function verify_total_voted_fio(global) {

}

/**
* code: eosio
 * table: global
 * field: total_producer_vote_weight
 * 
 * Validate 
 *    total_producer_vote_weight = sum of all total_votes from producer table
 * 
 * Adds "valid_total_producer_vote_weight" boolean to the fioGlobal object.
 */
async function verify_total_producer_vote_weight(global) {

}

async function main() {
  const voters = await calcVotersData();  // Voters table includes proxy information
  //const producers = await calcProducersData(voters);
  //const global = await calcGlobalData(voters, producers);

  /**
   * code: eosio
   * table: voters
   * field: last_vote_weight
   * 
   * Validate: 
   *    last_vote_weight = currency_balance - unvotable_locked - unvotable_staked
   */
  invalidVoteWeight = voters.filter((voter) => {
    return voter.votable_fio !== voter.last_vote_weight_num;
  });
  const invalidVoteWeightAccounts = invalidVoteWeight.map( (voter) => {
    return voter.owner;
  })
  console.log('Accounts with invalid last_vote_weight: ', invalidVoteWeightAccounts);



  // Global: Validate total_voted_fio in global table
  // const globalTotalVotedFio = await getTotalVotedFio()  / 1000000000;
  // const sumOfVotedFioNum = Number(sumOfVotedFio) / 1000000000;
  // console.log('\neosio > global > total_voted_fio = ', globalTotalVotedFio);
  // console.log('sum of votable fio from individual voters = ', sumOfVotedFioNum);
  // console.log('Difference = ', globalTotalVotedFio - sumOfVotedFioNum);

  // Global: Validate total_producer_vote_weight in global table
  // console.log('\neosio > global > total_producer_vote_weight = ', globalProducerVoteWeight / 1000000000);
  // console.log('sum of all eosio > producers-total_votes = ', sumOfProducerTotalVotes / 1000000000);
  // console.log('Difference = ', globalProducerVoteWeight / 1000000000 - sumOfProducerTotalVotes / 1000000000);

  // Producers: Validate total_votes in producers table
  // = sum of all valid producer votes from proxies and individual voters (fio can be voted to multiple producers)
  // const globalProducerVoteWeight = await getGlobalProducerVoteWeight();
  // let sumOfVotesForProducer = 0;
  // producerVotesMap.forEach(value => {
  //   sumOfVotesForProducer += value;
  // });
  // console.log('\neosio > global > total_producer_vote_weight = ', globalProducerVoteWeight / 1000000000);
  // console.log('sum of all valid producer votes from proxies and individual voters = ', sumOfVotesForProducer);
  // console.log('Difference = ', globalProducerVoteWeight / 1000000000 - sumOfVotesForProducer);
  


  /**
   * sum of all (non-proxied eosio-voters-last_vote_weight
   *   + registered proxy eosio-voters-last_vote_weight
   *   + registered proxy eosio-voters-proxied_vote_weight) 
   *   = sum of all individual eosio-producers-total_votes
   */

  // console.log('sum of all valid producer votes from proxies and individual voters = ', sumOfVotesForProducer);
  // console.log('sum of all eosio > producers-total_votes = ', sumOfProducerTotalVotes / 1000000000);
  // console.log('Difference = ', globalProducerVoteWeight / 1000000000 - sumOfProducerTotalVotes / 1000000000);

  /**
   * sum of all (voter proxied eosio-voter-last_vote_weight) = sum of all (registered proxy eosio-voters-proxied_vote_weight)
   */

}



main();
