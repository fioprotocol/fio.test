require('mocha')
const {expect} = require('chai')

describe('TEST SUITE', () => {


  // /**
  //  * Locked token tests (FIP-6,21). Tests may require additional configuration.
  //  */
  require('./tests/locks-transfer-locked-tokens-max-load.js');  // OPTIONAL PERFORMANCE TEST. Loads the chain with lots of general locks. Run this before other general locks tests when its desirable to test a loaded chain.
  // ### These Lock tests do NOT require additional configuration.
  // require('./tests/locks-transfer-locked-tokens-account-tests.js');  // FIP-6 tests of generic account functionality
  // require('./tests/locks-transfer-locked-tokens-large-grants.js'); //FIP-21 tests for FIO genesis locks functionality.
  // require('./tests/locks-transfer-locked-tokens.js');  //FIP-21 locking tests for general locks
  //### These Lock tests require additional configuration.
  // require('./tests/locks-mainnet-locked-tokens-lock1hotfix.js'); //Release 2.4.1 Hotfix for Type 1 locks (was not calculating voting power correctly)
  // require('./tests/locks-mainnet-locked-tokens.js'); //FIP-21 tests for FIO genesis locks functionality.
  //### Testnet only. Not sure this will work. May need updates for recent lock changes
  //require('./tests/locks-transfer-locked-tokens-testnet-smoke-tests.js'); //Only works for Testnet

  /**
   * Staking Tests (FIP-21)
   * May require additional configuration (see the notes in js files before running these tests)
   * in addition to this we need to possibly develop more tests for checking voting power when accounts have staked
   */
  //###These Staking tests do NOT require additional configuration.
  // require('./tests/stake-general-locked-tokens.js'); //FIP-21 tests for general lock accounts performing staking
  //###These Staking tests require additional configuration.
  // require('./tests/stake-mainnet-locked-tokens-with-staking.js'); //FIP-21 tests for genesis lock accounts performing staking
  // require('./tests/stake-rapid-unstake-with-mainnet-locks.js'); //FIP-21 tests for rapid fire unstaking in succession
  require('./tests/stake-regression.js'); //FIP-21 tests for new account calling staking using auto proxy, and full pull through to spend after unstaking unlock
  // require('./tests/stake-timing.js');
  require('./tests/stake-tokens.js');

});
