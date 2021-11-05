require("@nomiclabs/hardhat-waffle");


/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.6.2",
  networks: {
    hardhat: {
      accounts: { count: 40 }
    },
    ganache: {
      url: "http://127.0.0.1:9545"
    }
  },
  paths: {
    tests: "./tests/",
    sources: "./contracts/"
  },
};
