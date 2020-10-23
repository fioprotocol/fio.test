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
  require('./tests/cancel-funds-request.js'); // FIP-3, fio v2.0.0, fio.contracts v2.1.0
  require('./tests/removeaddress.js'); // FIP-4, fio v2.0.0, fio.contracts v2.1.0
  require('./tests/txn-resubmit.js'); //Available with fiosdk_typescript v1.2.0
  require('./tests/burn-address.js'); // FIP-7
  //require('./tests/fee-voting-fee-setting.js'); // FIP-10
  //require('./tests/producer-fee-setting.js');  // FIP-10

  //require('./tests/transfer-locked-tokens.js');  // FIP-6

  //require('./tests/transfer-address.js'); // FIP-1.b in testing

  
  //require('./tests/locks.js');  // Depends on local wallet. Need to fix
  //require('./tests/testnet-smoketest.js'); // In development
  //require('./tests/pub_k1.js');  // Moved to later release
  //require('./tests/expired-domains.js'); // In development
 
  //TODO - Need to update: require('./tests/permissions.js');
  //TODO - Need to update: require('./tests/max-txn-size.js');
});
