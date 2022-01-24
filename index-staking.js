require('mocha')
const {expect} = require('chai')

describe('TEST SUITE', () => {

  require('./tests/locks-mainnet-locked-tokens.js');
  require('./tests/locks-mainnet-locked-tokens-lock1hotfix');
  require('./tests/locks-transfer-locked-tokens-testnet-smoke-tests');
  require('./tests/locks-get-locks.js');
  require('./tests/stake-timing.js');
  require('./tests/stake-tokens.js');

});
