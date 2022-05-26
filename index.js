require('mocha');
const {expect} = require('chai');

describe('TEST SUITE', () => {


  require('./tests/FIP-41-devtest-transfer-locked-tokens.js');


  /**
   * !!! ERC20 and ERC721 contract tests inside this test suite rely on hardhat
   * Be sure to rerun npm install !!!
   */

  /**
   * WFIO and FIONFT wrapping and unwrapping
   * FIO token wrapping and unwrapping (FIP-17a)
   * FIO domain wrapping and unwrapping (FIP-17b)
   
  describe.skip(`** FIP-17a and b - WRAPPING TESTS **`, function () {

    require('./tests/fio-erc20');
    require('./tests/fio-erc721');
    require('./tests/fio-token-wrapping-sdk');
    require('./tests/fio-token-wrapping-api');
    require('./tests/fio-domain-wrapping-sdk');
    require('./tests/fio-domain-wrapping-api');
  });
*/
  /**
   * Staking Tests (FIP-21)
   * May require additional configuration (see the notes in js files before running these tests)
   * in addition to this we need to possibly develop more tests for checking voting power when accounts have staked
   *
   * To quickly obtain the local changes in fio.contracts, checkout branch ben/develop in that repository
   */
});
