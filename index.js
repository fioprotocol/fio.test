require('mocha')
const {expect} = require('chai')

describe('TEST SUITE', () => {

  //require('./tests/bravo-migr-test.js'); //This is required when testing 2.3.0 (bravo) with fio bahamas (need to do the full table migration).

  //FIP-21 staking testing notes.
  //!!!!!!!!!!  see the notes in js files before running these tests
  //!!!!!!!!!   mainnet locking tests require local contract changes to run the tests
  //!!!!!!!!!   some staking tests (staking-regression.js) require modifying the contracts before running the tests
  /*
  require('./tests/mainnet-locked-tokens.js'); //FIP-21 tests for FIO genesis locks functionality.
  require('./tests/transfer-locked-tokens-max-load.js');  // FIP-21 tests that load the chain with lots of general locks, run this before other general locks tests when its desirable to test a loaded chain.
  require('./tests/transfer-locked-tokens.js');  //FIP-21 locking tests for general locks
  require('./tests/mainnet-locked-tokens-with-staking.js'); //FIP-21 tests for genesis lock accounts performing staking
  require('./tests/stake-general-locked-tokens.js'); //FIP-21 tests for general lock accounts performing staking
  require('./tests/stake-mainnet-locked-tokens.js'); //FIP-21 tests for rapid fire unstaking in succession
  require('./tests/stake-regression.js'); //FIP-21 tests for new account calling staking using auto proxy, and full pull through to spend after unstaking unlock
  in addition to this we need to possibly develop more tests for checking voting power when accounts have staked
  */


 /* require('./tests/addaddress.js'); // v1.0.x  Also includes FIP-13 tests.
  require('./tests/fees.js'); // v1.0.x
  require('./tests/fio-request.js'); // v1.0.x
  require('./tests/producer.js'); // v1.0.x
  require('./tests/pushtransaction.js'); // v1.0.x
  require('./tests/ram2.js');  // v1.0.x //Eric to update to remove clio
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
  */

  //require('./tests/fee-voting-fee-setting.js'); // FIP-10
  //require('./tests/producer-fee-setting.js');  // FIP-10
/*
  require('./tests/record-obt-data.js'); //FIP-1.b testing
  require('./tests/transfer-address.js'); // FIP-1.b
  require('./tests/transfer-locked-tokens.js');  // FIP-6 locking tests
  require('./tests/transfer-locked-tokens-account-tests.js');  // FIP-6 tests of generic account functionality
  require('./tests/addbundles.js');  // FIP-11.a
  require('./tests/tpid.js');
*/
  //require('./tests/clio.js');  // FIP-16  //Only works with local testing
  //require('./tests/performance-request-obt.js');

/*
  require('./tests/testnet-smoketest.js'); // Testnet smoketest. By default runs against local build.
*/
  //require('./tests/expired-address-domain.js'); // Requires manual updates to contracts to shorten expiration timing
  //require('./tests/history.js'); // Only run against history node.
});
