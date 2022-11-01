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
        url: process.env.NETWORK && process.env.NETWORK == 'kovan' ? "https://kovan.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161" : "https://eth-mainnet.g.alchemy.com/v2/cYTrVP5Q9ILCTqce9MNvni_66ZOhDfRj",
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