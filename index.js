require('mocha');
const {expect} = require('chai');

describe('TEST SUITE', () => {

  describe(`Run only...`, function () {
    // Use this to run only a few tests

  });

  /**
   * !!! ERC20 and ERC721 contract tests inside this test suite rely on hardhat
   * Be sure to rerun npm install !!!
   */

  /**
   * WFIO and FIONFT wrapping and unwrapping
   * FIO token wrapping and unwrapping (FIP-17a)
   * FIO domain wrapping and unwrapping (FIP-17b)
   */
  describe.skip(`** FIP-17a and b - WRAPPING TESTS **`, function () {
    /**
     * These tests require modifications to the contracts
     */

    /**
     * Full system tests for wrapping
     */
    require('./tests/fio-wrapping-system');

    /**
     * ERC20 and ERC721 contract tests
     */
    require('./tests/fio-erc20');
    require('./tests/fio-erc721');

    /**
     * fio.oracle contract tests
     *
     * Test coverage for the API as well as TypeScript SDK
     */
    require('./tests/fio-token-wrapping-sdk');
    require('./tests/fio-token-wrapping-api');
    require('./tests/fio-domain-wrapping-sdk');
    require('./tests/fio-domain-wrapping-api');
  });

  /**
   * Staking Tests (FIP-21)
   * These tests require additional configuration (see the notes in js files before running these tests)
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

    require('./tests/stake-rapid-unstake-with-mainnet-locks.js'); //FIP-21 tests for rapid fire unstaking in succession
    require('./tests/stake-mainnet-locked-tokens-with-staking.js'); //FIP-21 tests for genesis lock accounts performing staking
  });

  describe('** GENERAL TESTS - NO SETUP **', () => {

    /**
     * General Tests. Should work against all builds. Do not require additional configuration.
     */
    require('./tests/addaddress.js'); // v1.0.x  Also includes FIP-13 tests.
    require('./tests/fees.js'); // v1.0.x
    require('./tests/fio-request.js'); // v1.0.x
    require('./tests/producer.js'); // v1.0.x
    require('./tests/pushtransaction.js'); // v1.0.x
    require('./tests/ram.js');  // v1.0.x //Eric to update to remove clio
    require('./tests/register-renew-fio-address.js');
    require('./tests/register-renew-fio-domain.js'); // v1.0.x
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
    require('./tests/FIP-41-devtest-transfer-locked-tokens.js');
    require('./tests/fee-distribution.js');
    require('./tests/serialize-deserialize.js');  // Tests for BD-3636

    /**
     * Bugs
     */
    require('./tests/BD-3835-autoproxy.js');
    require('./tests/BD-3853-dev-tests.js');
    require('./tests/BD-3941-unstake.js');

    /**
     * Testnet smoketest. By default runs against local build.
     */
    require('./tests/testnet-smoketest.js');

    /**
     * FIP-27 FIO NFT
     */
    require('./tests/nft-add-remove.js'); //FIP-27
    require('./tests/nft-sdk-tests.js');
    require('./tests/nft-uniqueness.js'); //FIP-27
    require('./tests/nft-remove-burn.js'); //FIP-27
    //require('./tests/nft-performance-tests.js'); //FIP-27 - Take a long time and require monitoring

    /**
     * Lock tests - do NOT require additional configuration.
     */
    require('./tests/locks-transfer-locked-tokens-account-tests.js');  // FIP-6 tests of generic account functionality
    require('./tests/locks-transfer-locked-tokens.js');  //FIP-21 locking tests for general locks
    require('./tests/stake-general-locked-tokens.js'); //FIP-21 tests for general lock accounts performing staking
    require('./tests/stake-BD-3552-dev-tests.js');

    /**
     * Staking tests - do NOT require additional configuration.
     */
     require('./tests/stake-general-locked-tokens.js');
  
  });

  describe.skip('** GENERAL TESTS - REQUIRE SETUP **', () => {

    /**
     * Locked token tests (FIP-6,21). Tests require additional configuration.
     */
    //require('./tests/locks-transfer-locked-tokens-max-load.js');  // OPTIONAL PERFORMANCE TEST. Loads the chain with lots of general locks. Run this before other general locks tests when its desirable to test a loaded chain.

    /**
     * Lock tests - May require a new chain to have enough FIO?
     */
    //require('./tests/locks-transfer-locked-tokens-large-grants.js'); //FIP-21 tests for FIO genesis locks functionality.
    
    /**
     * Retire Tokens. Requires additional configuration
     */
    //require('./tests/retire-tokens.js');  // FIP-22 Retire tokens. Requires setup to run.

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
     * FIO Escrow Test. Requires configuration to enable modexpire
     */
    //require('./tests/fio-escrow'); // FIP-26 (marketplace). Requires additional configuration to add the modexpire action

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
});
