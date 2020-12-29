require('mocha')
const {expect} = require('chai')

describe('TEST SUITE', () => {

  //require('./tests/history.js'); // Only run against history node.
  require('./tests/addaddress.js'); // v1.0.x  Also includes FIP-13 tests.
  require('./tests/fees.js'); // v1.0.x
  require('./tests/fio-request.js'); // v1.0.x
  require('./tests/producer.js'); // v1.0.x
  require('./tests/pushtransaction.js'); // v1.0.x
  require('./tests/ram2.js');  // v1.0.x //Eric to update to remove clio
  require('./tests/register_fio_domain.js'); // v1.0.x
  require('./tests/transfer-tokens.js'); // v1.0.x
  require('./tests/vote.js');  // v1.0.x
  //require('./tests/action-whitelisting.js'); // FIP-12, fio v2.0.0, fio.contracts v2.0.0 // Causes future tests to fail. Only run alone.
  require('./tests/transfer-domain.js'); // FIP-1.a, fio v2.0.0, fio.contracts v2.1.0
  require('./tests/paging.js'); // FIP-2, fio v2.0.0, fio.contracts v2.1.0
  require('./tests/removeaddress.js'); // FIP-4, fio v2.0.0, fio.contracts v2.1.0
  require('./tests/txn-resubmit.js'); //Available with fiosdk_typescript v1.2.0
  require('./tests/burn-address.js'); // FIP-7
  //require('./tests/fee-voting-fee-setting.js'); // FIP-10
  //require('./tests/producer-fee-setting.js');  // FIP-10
  require('./tests/record-obt-data.js'); //FIP-1b testing
  //require('./tests/bravo-migr-test.js');  // FIP-1.b Only used to test table migration for Request/OBT optimization update
  require('./tests/transfer-locked-tokens.js');  // FIP-6 locking tests
  require('./tests/transfer-locked-tokens-account-tests.js');  // FIP-6 tests of generic account functionality

  require('./tests/tpid.js'); 
  require('./tests/transfer-address.js'); // FIP-1.b
  require('./tests/addbundles.js');
  
  //require('./tests/clio.js');  // FIP-6 (Bahamas release)
  
  //require('./tests/locks.js');  // Depends on local wallet. Need to fix
  //require('./tests/testnet-smoketest.js'); // In development
  //require('./tests/pub_k1.js');  // Moved to later release
  //require('./tests/expired-domains.js'); // In development
 
  //TODO - Need to update: require('./tests/permissions.js');
  //TODO - Need to update: require('./tests/max-txn-size.js');
});
