require('mocha')
const {expect} = require('chai')

describe('TEST SUITE', () => {

  require('./tests/locks-mainnet-locked-tokens.js');
  require('./tests/locks-get-locks.js');
  require('./tests/stake-timing.js');
  require('./tests/stake-tokens.js');

});
