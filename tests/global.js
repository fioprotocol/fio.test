require('mocha');
const {expect} = require('chai');
const { newUser, fetchJson, getTotalVotedFio, callFioApi, callFioApiSigned, getAccountFromKey, timeout} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');
const rp = require('request-promise');
let faucet;

const fiourl = config.URL + "/v1/chain/";

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
  return public_key;
}

async function getFioBalance(public_key) {
  let getter_balance = getter_available = getter_staked = 0;
  const json = {
    fio_public_key: public_key
  }
  try {
    const result = await callFioApi("get_fio_balance", json);
    console.log('result: ', result)
    getter_balance = result.balance;
    getter_available = result.available;
    getter_staked = result.staked;
  } catch (err) {
    console.log('Error', err);
  }
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

async function getRemainingLockAmount(publicKey) {
  let remaining_lock_amount = 0;
  const json = {
    fio_public_key: publicKey,
  }
  try {
    const result = await callFioApi("get_locks", json);
    remaining_lock_amount = result.remaining_lock_amount ? result.remaining_lock_amount / 1000000000 : 0;
    console.log('remaining_lock_amount: ', remaining_lock_amount)
  } catch (err) {
    // no locked tokens in account
  }
  return remaining_lock_amount;
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

class FioGlobal {
  constructor(globalParams) {
    Object.assign(this, globalParams);  // Pulls in the args from the FIO global table
    this.total_voted_fio = this.total_voted_fio / 1000000000;
    this.total_producer_vote_weight = Number(this.total_producer_vote_weight) / 1000000000;
    this.total_voted_fio_calculated = 0;
    this.total_producer_vote_weight_calculated = 0;
  }
  addVoterVotes(voteWeight) {
    this.total_voted_fio_calculated += voteWeight;
  }
  addProdVotes(voteWeight) {
    this.total_producer_vote_weight_calculated += voteWeight;
  }
}
class Producer {
  constructor(producerParams) {
    Object.assign(this, producerParams);  // Pulls in the args from the FIO producers table
    this.total_votes = Number(producerParams.total_votes) / 1000000000
    this.total_votes_calculated = 0
  }
  addVotes(voteWeight) {
    this.total_votes_calculated += voteWeight;
  }
}

class Voter {
  constructor(voterParams, public_key, getter_balance, getter_available, getter_staked, currency_balance, unvotable_locked) {
    Object.assign(this, voterParams);  // Pulls in the args from the FIO voters table
    this.last_vote_weight =  Number(voterParams.last_vote_weight) / 1000000000;
    this.proxied_vote_weight =  Number(voterParams.proxied_vote_weight) / 1000000000;
    this.public_key = public_key;
    this.getter_balance = getter_balance / 1000000000;
    this.getter_available = getter_available / 1000000000;
    this.getter_staked = getter_staked / 1000000000;
    this.currency_balance = currency_balance;
    this.unvotable_locked = unvotable_locked;
    this.votable_fio = this.currency_balance + this.proxied_vote_weight - this.unvotable_locked;
  }
  // To call async functions in a constructor, using an async initialize function that calls the constructor. Kind of a workaround...
  static async initialize(voterParams) {
    const public_key = await getPublicKey(voterParams.owner);
    const { getter_balance, getter_available, getter_staked } = await getFioBalance(public_key);
    const currency_balance = await getCurrencyBalance(voterParams.owner);
    const unvotable_locked = await getRemainingLockAmount(public_key);
    return new Voter(voterParams, public_key, getter_balance, getter_available, getter_staked, currency_balance, unvotable_locked);
  }
}


async function getProducers(global) {
  let producers = []; 
    const json = {
      code: "eosio",
      scope: "eosio",
      table: "producers",
      limit: 2,
      reverse: false,
      json: true
    }
    const result = await callFioApi("get_table_rows", json);
    const producersTable = result.rows;
    //console.log('producers: ', producers);
    // Initialize Producer objects for every voter and put into a new array.
    for (let i = 0; i < producersTable.length; i++) {
       const newProducer = new Producer(producersTable[i]);
       global.addProdVotes(newProducer.total_votes);
       producers[i] = newProducer;
    }
    // Update the global > total_producer_vote_weight_calculated field with the producer vote weight
    return producers;
};


async function getVoters(producers,global) {
  let voters = []; 
  const json = {
    json: true,
    code: 'eosio',
    scope: 'eosio',
    table: 'voters',
    limit: 2
  }
  const result = await callFioApi("get_table_rows", json); 
  const votersTable = result.rows;
  // Initialize Voter objects for every voter and put into a new array.
  for (let i = 0; i < votersTable.length; i++) {
    const newVoter = await Voter.initialize(votersTable[i]);
    // Add the last_vote_weight to the producer total vote count for each of the producers
    newVoter.producers.forEach((producerAccount) => {
      const producer = producers.find((prod) => prod.owner === producerAccount);
      if (producer === undefined) {   //TODO: change this to an assert.
        console.log('Cannot find producer: ', producerAccount)
      } else {
        producer.addVotes(newVoter.last_vote_weight);
      }
    });
    // Add the voters last_vote_weight to total_voted_fio_calculated in the global object
    global.addVoterVotes(newVoter.last_vote_weight);
    voters[i] = newVoter;
  }
  return voters;
}


async function getGlobal() {
  const json = {
    json: true,
    code: 'eosio',
    scope: 'eosio',
    table: 'global',
    limit: 1
  }
  const result = await callFioApi("get_table_rows", json);
  const global = new FioGlobal(result.rows[0]);
  return global;
}


async function main() {
  const global = await getGlobal();
  const producers = await getProducers(global);
  const voters = await getVoters(producers, global);  // Voters table includes proxy information

  console.log('global: ', global);
  console.log('voters: ', voters);
  console.log('producers2: ', producers);


  /**
   * code: eosio
   * table: voters
   * field: last_vote_weight
   * 
   * Validate: 
   *    last_vote_weight = currency_balance + proxied_vote_weight - unvotable_locked
   * 
   * Note: Tokens Staked do count towards voting power of account.
   * 
   * NOTE: flag if there are cases where a user has votes for producers AND has a proxy
   */
  console.log('\nTesting eosio > voters > last_vote_weight\n');
  const invalidVoterVoteWeight = voters.filter((voter) => {
    return voter.votable_fio !== voter.last_vote_weight;
  });
  if (invalidVoterVoteWeight.length > 0) console.log('account: last_vote_weight = currency_balance + proxied_vote_weight - unvotable_locked');
  invalidVoterVoteWeight.forEach((voter) => {
    console.log(`${voter.owner}: ${voter.last_vote_weight} != ${voter.currency_balance} + ${voter.proxied_vote_weight} - ${voter.unvotable_locked}`);
  });
//  const invalidVoteWeightAccounts = invalidVoteWeight.map( (voter) => {
//    return voter.owner;
//  })

  /**
   * code: eosio
   * table: global
   * field: total_voted_fio
   * 
   * Validate 
   *    total_voted_fio = sum of all last_vote_weights from voters table
   */
  console.log('\nTesting eosio > global > total_voted_fio\n');
  console.log('total_voted_fio = total_voted_fio_calculated');
  if(global.total_voted_fio === global.total_voted_fio_calculated) {
    console.log(`SUCCESS - ${global.total_voted_fio} = ${global.total_voted_fio_calculated}`);
  } else {
    console.log(`FAIL - ${global.total_voted_fio} != ${global.total_voted_fio_calculated}`);
  }


  /**
   * code: eosio
   * table: producers
   * field: total_votes
   * 
   * Validate 
   *    total_votes = sum of all last_vote_weights from voters that have voted for that producer
   */
  console.log('\nTesting eosio > producers > total_votes\n');
  const invalidProducerVoteWeight = producers.filter((producer) => {
    return producer.total_votes !== producer.total_votes_calculated;
  });
  if (invalidProducerVoteWeight.length > 0) console.log('account: total_votes = total_votes_calculated');
  invalidProducerVoteWeight.forEach((producer) => {
    console.log(`${producer.owner}: ${producer.total_votes} != ${producer.total_votes_calculated}`);
  });
  

  /**
   * code: eosio
   * table: global
   * field: total_producer_vote_weight
   * 
   * Validate 
   *    total_producer_vote_weight = sum of all total_votes from producer table
   */
  console.log('\nTesting eosio > global > total_producer_vote_weight\n');
  console.log('total_producer_vote_weight = total_producer_vote_weight_calculated');
  if(global.total_producer_vote_weight === global.total_producer_vote_weight_calculated) {
    console.log(`SUCCESS - ${global.total_producer_vote_weight} = ${global.total_producer_vote_weight_calculated}`);
  } else {
    console.log(`FAIL - ${global.total_producer_vote_weight} != ${global.total_producer_vote_weight_calculated}`);
  }

 
/**
 * code: eosio
 * table: voters
 * field: proxied_vote_weight
 * 
 * Validate 
 *    For registered proxy: proxied_vote_weight = sum of all last_vote_weights from voters that have proxied their votes
 */

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
