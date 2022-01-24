require('mocha')
const {expect} = require('chai')

describe('TEST SUITE', () => {

  /**
   * General Tests. Should work against all builds. Do not require additional configuration.
   */

  require('./tests/addaddress.js'); // v1.0.x  Also includes FIP-13 tests.
  require('./tests/fees.js'); // v1.0.x
  require('./tests/fio-request.js'); // v1.0.x
  require('./tests/producer.js'); // v1.0.x
  require('./tests/pushtransaction.js'); // v1.0.x
  require('./tests/ram.js');  // v1.0.x //Eric to update to remove clio
  require('./tests/register-fio-address.js');
  require('./tests/register-fio-domain.js'); // v1.0.x
  require('./tests/transfer-tokens.js'); // v1.0.x
  require('./tests/vote.js');  // v1.0.x
  require('./tests/action-whitelisting.js'); // FIP-12, fio v2.0.0, fio.contracts v2.0.0 // Causes future tests to fail. Only run alone.
  require('./tests/transfer-domain.js'); // FIP-1.a, fio v2.0.0, fio.contracts v2.1.0
  require('./tests/paging.js'); // FIP-2, fio v2.0.0, fio.contracts v2.1.0
  require('./tests/remove-address.js'); // FIP-4, fio v2.0.0, fio.contracts v2.1.0
  require('./tests/txn-resubmit.js'); //Available with fiosdk_typescript v1.2.0
  require('./tests/burn-address.js'); // FIP-7
  require('./tests/record-obt-data.js'); //FIP-1.b testing
  require('./tests/transfer-address.js'); // FIP-1.b
  require('./tests/addbundles.js');  // FIP-11.a
  require('./tests/retire-tokens.js');  // FIP-22 Retire tokens
  require('./tests/tpid.js');
  require('./tests/nft-add-remove.js'); //FIP-27
  require('./tests/nft-sdk-tests.js');
  //require('./tests/nft-performance-tests.js'); //FIP-27
  require('./tests/nft-uniqueness.js'); //FIP-27
  //require('./tests/nft-remove-burn.js'); //FIP-27
  //require('./tests/clio.js');  // FIP-16  //Only works with local testing
  //require('./tests/performance-request-obt.js');
  require('./tests/fee-distribution.js');

  //require('./tests/expired-address-domain.js'); // Requires manual updates to contracts to shorten expiration timing
  //require('./tests/expired-address-domain-modexpire.js'); // Requires modexpire action which allows expiring of domains

  //require('./tests/history.js'); // Only run against history node.

  require('./tests/testnet-smoketest.js'); // Testnet smoketest. By default runs against local build.

  /**
   * Locked token tests (FIP-6,21). Tests may require additional configuration.
   */
  //require('./tests/locks-transfer-locked-tokens-max-load.js');  // OPTIONAL PERFORMANCE TEST. Loads the chain with lots of general locks. Run this before other general locks tests when its desirable to test a loaded chain.
  //### These Lock tests do NOT require additional configuration.
  require('./tests/locks-transfer-locked-tokens-account-tests.js');  // FIP-6 tests of generic account functionality
  require('./tests/locks-transfer-locked-tokens-large-grants.js'); //FIP-21 tests for FIO genesis locks functionality.
  require('./tests/locks-transfer-locked-tokens.js');  //FIP-21 locking tests for general locks
  //### These Lock tests require additional configuration.
  //require('./tests/locks-mainnet-locked-tokens-lock1hotfix.js'); //Release 2.4.1 Hotfix for Type 1 locks (was not calculating voting power correctly)
  //require('./tests/locks-mainnet-locked-tokens.js'); //FIP-21 tests for FIO genesis locks functionality.
  //### Testnet only. Not sure this will work. May need updates for recent lock changes
  //require('./tests/locks-transfer-locked-tokens-testnet-smoke-tests.js'); //Only works for Testnet

  /**
   * Staking Tests (FIP-21)
   * May require additional configuration (see the notes in js files before running these tests)
   * in addition to this we need to possibly develop more tests for checking voting power when accounts have staked
   */
  //###These Staking tests do NOT require additional configuration.
  require('./tests/stake-general-locked-tokens.js'); //FIP-21 tests for general lock accounts performing staking
  //###These Staking tests require additional configuration.
  //require('./tests/stake-tokens.js');
  //require('./tests/stake-mainnet-locked-tokens-with-staking.js'); //FIP-21 tests for genesis lock accounts performing staking
  //require('./tests/stake-rapid-unstake-with-mainnet-locks.js'); //FIP-21 tests for rapid fire unstaking in succession
  //require('./tests/stake-regression.js'); //FIP-21 tests for new account calling staking using auto proxy, and full pull through to spend after unstaking unlock
  //require('./tests/stake-timing.js');

  /**
   * clio tests. Only works with local testing since it accesses the fio.devtools/bin directory
   */
  //require('./tests/clio.js');  // FIP-16

  /**
   * Producer Tests. Only run on devnet. Requires additional configuration
   */
  //require('./tests/producer-fee-voting-fee-setting.js'); // FIP-10
  //require('./tests/producer-fee-setting.js');  // FIP-10

  /**
   * Expired Address and Domain Testing. Requires manual updates to contracts to shorten expiration timing
   */
  //require('./tests/expired-address-domain.js');

  /**
   * History Node tests. Only run against history node.
   */
  //require('./tests/history.js');

  /**
   * Performance tests. May require additional configuration. See notes in tests
   */
  //require('./tests/performance-request-obt.js');

  /**
   * Archived tests
   */
  //require('./tests/bravo-migr-test.js'); //This is required when testing 2.3.0 (bravo) with fio bahamas (need to do the full table migration).

  require('./tests/fio-escrow'); // FIP-26 (marketplace)
});
