require("@nomiclabs/hardhat-waffle")
require('dotenv').config()

module.exports = {
  solidity: {
    compilers: [{
      version: "0.7.6",
      settings: {
        evmVersion: "istanbul",
        optimizer: {
          enabled: true,
          runs: 1000,
        },
      },
    }, ],
  },
  networks: {
    hardhat: {
      // prolly not gunna be used besides debuging
      // chainId: CHAIN_IDS.hardhat,
      forking: {
        url: process.env.NODE_URL,
        // prolly not gunna be used besides specific test
        blockNumber: 15775937, // a specific block number with which you want to work
      },
      initialBaseFeePerGas: 0,
      gasPrice: 0
    },
  },
  mocha: {
    timeout: 100000000,
  },
}