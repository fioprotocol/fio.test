require('mocha');
const {expect} = require('chai');

describe('TEST SUITE', () => {

  /**
   * WFIO and FIONFT wrapping and unwrapping
   * FIO token wrapping and unwrapping (FIP-17a)
   * FIO domain wrapping and unwrapping (FIP-17b)
   */
  describe.only(`** FIP-17a and b - WRAPPING TESTS **`, function () {

    // require('./tests/fio-erc20');
    //
    // require('./tests/fio-erc721');

    require('./tests/fio-token-wrapping-sdk');

    require('./tests/fio-token-wrapping-api');

    require('./tests/fio-domain-wrapping-sdk');

    require('./tests/fio-domain-wrapping-api');

    // require('./tests/fio-wrapping-integration-tests');
  });

  /**
   * Staking Tests (FIP-21)
   * May require additional configuration (see the notes in js files before running these tests)
   * in addition to this we need to possibly develop more tests for checking voting power when accounts have staked
   *
   * To quickly obtain the local changes in fio.contracts, checkout branch ben/develop in that repository
   */
  describe.skip('** FIP-21 - STAKING TESTS **', () => {

    /**
     * !!! These Staking tests require additional configuration !!!
     */
    require('./tests/stake-tokens.js');
    require('./tests/stake-timing.js');
    require('./tests/locks-mainnet-locked-tokens.js');
    require('./tests/locks-mainnet-locked-tokens-lock1hotfix.js');
    require('./tests/locks-transfer-locked-tokens-testnet-smoke-tests.js');
    require('./tests/locks-get-locks.js');

    // TODO: Should this one be kept unmodified and just fail when we run with local mods to accomodate the other tests?
    // require('./tests/stake-general-locked-tokens.js');

    require('./tests/stake-rapid-unstake-with-mainnet-locks.js'); //FIP-21 tests for rapid fire unstaking in succession
    require('./tests/stake-mainnet-locked-tokens-with-staking.js'); //FIP-21 tests for genesis lock accounts performing staking

    /**
     * Locked token tests (FIP-6,21). Tests may require additional configuration.
     */
    require('./tests/locks-transfer-locked-tokens-max-load.js');  // OPTIONAL PERFORMANCE TEST. Loads the chain with lots of general locks. Run this before other general locks tests when its desirable to test a loaded chain.

    /**
     * These Lock tests do NOT require additional configuration.
     */
    require('./tests/locks-transfer-locked-tokens-account-tests.js');  // FIP-6 tests of generic account functionality
    require('./tests/locks-transfer-locked-tokens-large-grants.js'); //FIP-21 tests for FIO genesis locks functionality.
    require('./tests/locks-transfer-locked-tokens.js');  //FIP-21 locking tests for general locks
  });

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
  require('./tests/tpid.js');

  /**
   * !!! ERC20 and ERC721 contract tests inside this test suite rely on hardhat
   * Be sure to rerun npm install !!!
   */

  /**
   * FIP-27 FIO NFT
   */
  require('./tests/nft-add-remove.js'); //FIP-27
  require('./tests/nft-sdk-tests.js');
  require('./tests/nft-remove-burn.js'); //FIP-27
  require('./tests/nft-uniqueness.js'); //FIP-27
  //require('./tests/nft-performance-tests.js'); //FIP-27

  /**
   * Testnet smoketest. By default runs against local build.
   */
  require('./tests/testnet-smoketest.js');

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
  //require('./tests/expired-address-domain-modexpire.js'); // Requires modexpire action which allows expiring of domains

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

  /**
   * FIP-26 (marketplace)
   */
  // require('./tests/fio-escrow.js');
});
