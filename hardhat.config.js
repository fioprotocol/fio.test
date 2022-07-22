require("@nomiclabs/hardhat-waffle");


/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.7",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
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
    sources: "./ethContracts/"
  },
};
