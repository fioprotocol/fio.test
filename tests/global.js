require('mocha');
const { callFioApi} = require('../utils.js');
const {FIOSDK } = require('@fioprotocol/fiosdk');
const config = require('../config.js');

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
    this.proxied_vote_weight_calculated = 0;
  }
  // To call async functions in a constructor, using an async initialize function that calls the constructor. Kind of a workaround...
  static async initialize(voterParams) {
    const public_key = await getPublicKey(voterParams.owner);
    const { getter_balance, getter_available, getter_staked } = await getFioBalance(public_key);
    const currency_balance = await getCurrencyBalance(voterParams.owner);
    const unvotable_locked = await getRemainingNonvotableLockAmount(public_key);
    return new Voter(voterParams, public_key, getter_balance, getter_available, getter_staked, currency_balance, unvotable_locked);
  }
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

async function getRemainingNonvotableLockAmount(publicKey) {
  const json = {
    fio_public_key: publicKey,
  }
  try {
    const result = await callFioApi("get_locks", json);
    if (result.can_vote === 1) {
      return 0;
    } else {
      return result.remaining_lock_amount
    }
  } catch (err) {
    // no locked tokens in account
  }
  return 0;
}

/**
 * 
 * @returns The FioGlobal object populated from eosio global table
 */
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

/**
 * 
 * @param {*} global FioGlobal object
 * @returns array of Producer objects for each producer in the producers table
 */
async function getProducers(global) {
  let producers = []; 
    const json = {
      code: "eosio",
      scope: "eosio",
      table: "producers",
      limit: 5000,
      reverse: false,
      json: true
    }
    const result = await callFioApi("get_table_rows", json);
    const producersTable = result.rows;
    // Initialize Producer objects for every voter and put into a new array.
    for (let i = 0; i < producersTable.length; i++) {
       const newProducer = new Producer(producersTable[i]);
       global.addProdVotes(newProducer.total_votes);
       producers[i] = newProducer;
    }
    // Update the global > total_producer_vote_weight_calculated field with the producer vote weight
    return producers;
};


/**
 * 
 * @param {*} producers array of producer objects
 * @param {*} global FioGlobal object
 * @returns array of Voter objects for each voter in the voters table
 */
async function getVoters(producers, global) {
  let voters = []; 
  const json = {
    json: true,
    code: 'eosio',
    scope: 'eosio',
    table: 'voters',
    limit: 5000
  }
  const result = await callFioApi("get_table_rows", json); 
  const votersTable = result.rows;
  // Initialize Voter objects for every voter and put into a new array.
  for (let i = 0; i < votersTable.length; i++) {
    const newVoter = await Voter.initialize(votersTable[i]);
    // Add all voters last_vote_weight + proxies proxied_vote_weight to the producer total vote count for each of the producers
    newVoter.producers.forEach((producerAccount) => {
      const producer = producers.find((prod) => prod.owner === producerAccount);
      if (producer === undefined) {   //TODO: change this to an assert.
        console.log('Cannot find producer: ', producerAccount)
      } else {
        producer.addVotes(newVoter.last_vote_weight);  // Adds voters vote total to the producers total_votes_calculated field
        if (newVoter.is_proxy === 1) {
          producer.addVotes(newVoter.proxied_vote_weight); 
        }
      }
    });
    global.addVoterVotes(newVoter.last_vote_weight);  // Adds the voters last_vote_weight to total_voted_fio_calculated in the global object
    voters[i] = newVoter;
  }
  return voters;
}

/**
 * Adds a new proxied_vote_weight_calculated for every proxy
 * 
 * @param {*} voters array of Voter objects
 * @returns array of Voter objects that are registered proxies
 */
async function calcProxyVotes(voters) {
  let proxies = [];
  for (let i = 0; i < voters.length; i++) {
    if (voters[i].is_proxy === 1) {proxies.push(voters[i])}
    if (voters[i].proxy != '') {
      const proxy = voters.find((voter) => voter.owner === voters[i].proxy);
      proxy.proxied_vote_weight_calculated += voters[i].proxied_vote_weight;
    };
  }
  return proxies;
}






async function main() {
  const global = await getGlobal();
  const producers = await getProducers(global);
  const voters = await getVoters(producers, global);  // Voters table includes proxy information
  const proxies = await calcProxyVotes(voters);

  // console.log('global: ', global);
  // console.log('voters: ', voters);
  // console.log('producers: ', producers);
  // console.log('proxies: ', proxies);

  console.log('Assert: No voters have proxy and producers\n');
  const invalidVoters = voters.filter((voter) => {
    return voter.proxy !== '' && voter.producers.length > 0;
  });
  if (invalidVoters.length > 0) {
    console.log('FAIL\nAccounts have proxy and producers fields');
    invalidVoters.forEach((voter) => {
      console.log(voter.owner + '\n')
    });
  } else {
    console.log('SUCCESS: No voters have proxy and producers')
  }

console.log(`\n
/**
 * code: eosio
 * table: global
 * field: total_voted_fio
 * 
 * Validate 
 *    total_voted_fio = sum of all last_vote_weights from voters table
 */
`)
  console.log('Assert: total_voted_fio = total_voted_fio_calculated\n');
  if(global.total_voted_fio === global.total_voted_fio_calculated) {
    console.log(`SUCCESS: ${global.total_voted_fio} = ${global.total_voted_fio_calculated}`);
  } else {
    console.log(`FAIL: ${global.total_voted_fio} != ${global.total_voted_fio_calculated}`);
    console.log(`Difference = ${global.total_voted_fio - global.total_voted_fio_calculated} `)
  }


console.log(`\n
/**
 * code: eosio
 * table: global
 * field: total_producer_vote_weight
 * 
 * Validate 
 *    total_producer_vote_weight = sum of all total_votes from producer table
 */
`)
  console.log('Assert: total_producer_vote_weight = total_producer_vote_weight_calculated\n');
  if(global.total_producer_vote_weight === global.total_producer_vote_weight_calculated) {
    console.log(`SUCCESS: ${global.total_producer_vote_weight} = ${global.total_producer_vote_weight_calculated}`);
  } else {
    console.log(`FAIL: ${global.total_producer_vote_weight} != ${global.total_producer_vote_weight_calculated}`);
  }


console.log(`\n
/**
 * code: eosio
 * table: voters
 * field: last_vote_weight
 * 
 * Validate: 
 *    last_vote_weight = currency_balance + proxied_vote_weight - unvotable_locked
 * 
 * Note: Tokens Staked do not count towards voting power of account.
 * 
 * NOTE: flag if there are cases where a user has votes for producers AND has a proxy
 */
`)
  console.log('Assert: last_vote_weight = currency_balance + proxied_vote_weight - unvotable_locked\n');
  const invalidVoterVoteWeight = voters.filter((voter) => {
    return voter.votable_fio !== voter.last_vote_weight;
  });
  if (invalidVoterVoteWeight.length > 0) {
    console.log('FAIL\naccount: last_vote_weight = currency_balance + proxied_vote_weight - unvotable_locked');
    invalidVoterVoteWeight.forEach((voter) => {
      console.log(`${voter.owner}: ${voter.last_vote_weight} != ${voter.currency_balance} + ${voter.proxied_vote_weight} - ${voter.unvotable_locked}`);
      //console.log(JSON.stringify(voter, null, 4));
    });
  } else {
    console.log('SUCCESS: No Voters last_vote_weight errors')
  }


console.log(`\n
/**
 * Confirm total_votes for each producer in the producers table
 * 
 * code: eosio
 * table: producers
 * field: total_votes
 * 
 * Validate 
 *    total_votes = sum of all last_vote_weights for all voters that have voted for the producer + sum of proxied_vote_weight for proxies that have voted for that producer
 * 
 * TODO: confirm proxy
 */
`)
  console.log('Assert: total_votes = total_votes_calculated\n');
  const invalidProducerVoteWeight = producers.filter((producer) => {
    return producer.total_votes !== producer.total_votes_calculated;
  });
  if (invalidProducerVoteWeight.length > 0) {
    console.log('FAIL\naccount: total_votes = total_votes_calculated');
    invalidProducerVoteWeight.forEach((producer) => {
      console.log(`${producer.owner}: ${producer.total_votes} != ${producer.total_votes_calculated}`);
    });
  } else {
    console.log('SUCCESS: No Producer total_votes errors')
  }
  
console.log(`\n
/**
 * code: eosio
 * table: voters
 * field: proxied_vote_weight
 * 
 * Validate 
 *    For registered proxies: proxied_vote_weight = sum of all last_vote_weights from voters that have proxied their votes
 */
`)
  console.log('Assert: proxied_vote_weight = proxied_vote_weight_calculated\n');
  const invalidProxyVoteWeight = proxies.filter((proxy) => {
    if (proxy.is_proxy === 1) {
      return (proxy.is_proxy === 1) && (proxy.proxied_vote_weight !== proxy.proxied_vote_weight_calculated);
    }
  });
  if (invalidProxyVoteWeight.length > 0) {
    console.log('FAIL\naccount: proxied_vote_weight = proxied_vote_weight_calculated');
    invalidProxyVoteWeight.forEach((proxy) => {
      console.log(`${proxy.owner}: ${proxy.proxied_vote_weight} != ${proxy.proxied_vote_weight_calculated}`);
    });
  } else {
    console.log('SUCCESS: No Proxy proxied_vote_weight errors')
  }

  console.log('\n\n');
}



main();
