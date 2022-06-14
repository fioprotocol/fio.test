require('mocha');
const {expect} = require('chai');

describe('TEST SUITE', () => {

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
    require('./tests/testnet-smoketest.js');
    require('./tests/FIP-41-devtest-transfer-locked-tokens.js');
    */

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
    require('./tests/stake-general-locked-tokens.js'); //FIP-21 tests for general lock accounts performing staking
    require('./tests/stake-BD-3552-dev-tests.js');
  });

  describe('** GENERAL TESTS **', () => {

    /**
     * General Tests. Should work against all builds. Do not require additional configuration.
     */
    require('./tests/BD-3853-dev-tests.js');
  });
});
