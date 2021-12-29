const { callFioApi, httpRequest, httpRequestBig } = require('../../utils');
const LosslessJSON = require('lossless-json');

async function getStakingTableRows () {
  const json = {
    json: true,               // Get the response as json
    code: 'fio.staking',      // Contract that we target
    scope: 'fio.staking',         // Account that owns the data
    table: 'staking',        // Table name
    limit: 100,                // Maximum number of rows that we want to get
    reverse: false,           // Optional: Get reversed data
    show_payer: false          // Optional: Show ram payer
  }
  return httpRequest("get_table_rows", json);
}

async function getStakedTokenPool () {
  const result = await getStakingTableRows();
  return result.rows[0].staked_token_pool;
}

async function getCombinedTokenPool () {
  const result = await getStakingTableRows();
  return result.rows[0].combined_token_pool;
}

async function getLastCombinedTokenPool() {
  const result = await getStakingTableRows();
  return result.rows[0].last_combined_token_pool;
}

async function getRewardsTokenPool () {
  const result = await getStakingTableRows();
  return result.rows[0].rewards_token_pool;
}

async function getGlobalSrpCount () {
  const result = await getStakingTableRows();
  return result.rows[0].global_srp_count;
}

async function getLastGlobalSrpCount() {
  const result = await getStakingTableRows();
  return result.rows[0].last_global_srp_count;
}

async function getDailyStakingRewards () {
  const result = await getStakingTableRows();
  return result.rows[0].daily_staking_rewards;
}

async function getStakingRewardsReservesMinted () {
  const result = await getStakingTableRows();
  return result.rows[0].staking_rewards_reserves_minted;
}

async function getStakingRewardsActivated() {
  const result = await getStakingTableRows();
  return result.rows[0].staking_rewards_activated;
}


// convert LosslessNumber to Big
function reviver(key, value) {
  if (value && value.isLosslessNumber) {
    return value.toString();
  }
  else {
    return value;
  }
}

async function getStakingTableRowsBig() {
  const json = {
    json: true,               // Get the response as json
    code: 'fio.staking',      // Contract that we target
    scope: 'fio.staking',         // Account that owns the data
    table: 'staking',        // Table name
    limit: 100,                // Maximum number of rows that we want to get
    reverse: false,           // Optional: Get reversed data
    show_payer: false          // Optional: Show ram payer
  }
  //return httpRequest("get_table_rows", json);
  const stakingTable = await httpRequestBig("get_table_rows", json);
  const stakingJsonBig = LosslessJSON.parse(stakingTable, reviver);
  return stakingJsonBig;
}

async function getStakedTokenPoolBig() {
  const result = await getStakingTableRowsBig();
  return result.rows[0].staked_token_pool;
}

async function getCombinedTokenPoolBig() {
  const result = await getStakingTableRowsBig();
  return result.rows[0].combined_token_pool;
}

async function getLastCombinedTokenPoolBig() {
  const result = await getStakingTableRowsBig();
  return result.rows[0].last_combined_token_pool;
}

async function getRewardsTokenPoolBig() {
  const result = await getStakingTableRowsBig();
  return result.rows[0].rewards_token_pool;
}

async function getGlobalSrpCountBig() {
  const result = await getStakingTableRowsBig();
  return result.rows[0].global_srp_count;
}

async function getLastGlobalSrpCountBig() {
  const result = await getStakingTableRowsBig();
  return result.rows[0].last_global_srp_count;
}

async function getDailyStakingRewardsBig() {
  const result = await getStakingTableRowsBig();
  return result.rows[0].daily_staking_rewards;
}

async function getStakingRewardsReservesMintedBig() {
  const result = await getStakingTableRowsBig();
  return result.rows[0].staking_rewards_reserves_minted;
}

async function getStakingRewardsActivatedBig() {
  const result = await getStakingTableRowsBig();
  return result.rows[0].staking_rewards_activated;
}

module.exports = {
  getStakingTableRows,
  getStakedTokenPool,
  getCombinedTokenPool,
  getLastCombinedTokenPool,
  getRewardsTokenPool,
  getGlobalSrpCount,
  getLastGlobalSrpCount,
  getDailyStakingRewards,
  getStakingRewardsReservesMinted,
  getStakingRewardsActivated,
  getStakingTableRowsBig,
  getStakedTokenPoolBig,
  getCombinedTokenPoolBig,
  getLastCombinedTokenPoolBig,
  getRewardsTokenPoolBig,
  getGlobalSrpCountBig,
  getLastGlobalSrpCountBig,
  getDailyStakingRewardsBig,
  getStakingRewardsReservesMintedBig,
  getStakingRewardsActivatedBig
}
