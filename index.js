require('mocha')
const {expect} = require('chai')

describe('TEST SUITE', () => {

  //require('./tests/bravo-migr-test.js'); //This is required when testing 2.3.0 (bravo) with fio bahamas (need to do the full table migration).


  require('./tests/addaddress.js'); // v1.0.x  Also includes FIP-13 tests.
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
  //require('./tests/fee-voting-fee-setting.js'); // FIP-10
  //require('./tests/producer-fee-setting.js');  // FIP-10
  require('./tests/record-obt-data.js'); //FIP-1.b testing
  require('./tests/transfer-address.js'); // FIP-1.b
  require('./tests/transfer-locked-tokens.js');  // FIP-6 locking tests
  require('./tests/transfer-locked-tokens-account-tests.js');  // FIP-6 tests of generic account functionality
  require('./tests/addbundles.js');  // FIP-11.a
  require('./tests/tpid.js');
  require('./tests/add-remove-nfts.js'); //FIP-27
  //require('./tests/clio.js');  // FIP-16  //Only works with local testing
  //require('./tests/performance-request-obt.js');

  require('./tests/testnet-smoketest.js'); // Testnet smoketest. By default runs against local build.

  //require('./tests/expired-address-domain.js'); // Requires manual updates to contracts to shorten expiration timing
  //require('./tests/history.js'); // Only run against history node.
});
