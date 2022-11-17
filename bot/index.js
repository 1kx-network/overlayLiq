require('dotenv').config({
    override: true
})
console.log(` process.env.NODE_URL `, process.env.NODE_URL)
const {
    EthereumUtils,
    init
} = require('./ethereumUtils');
const {
    Overlay
} = require("./overlay")
const config = require(`./config.${process.env.NETWORK}.json`)
const abi_OVL_MARKET = require('../abis/OVL_MARKET.json')
const ethers = require('ethers');
const {
    getOpenPositionFromEvents
} = require('../bot/getOpenPositionFromEvents');

let archive_pokt = new ethers.providers.JsonRpcProvider(process.env.ARCHIVE_NODE_URL)

async function main() {
    let ethereumUtils = new EthereumUtils()
    ethereumUtils = await init(ethereumUtils, [config.ADDRESS_MISC.ADDRESS_OVL, config.ADDRESS_MISC.ADDRESS_WETH])
    let startingBlockNumber = true
    let eventTest = []

    ethereumUtils.provider.on('block', async (blockNumber) => {
        if (startingBlockNumber || blockNumber.toString().slice(-2) == '50') {
            for (let market of config.MARKETS) {
                let ovlMarketContract = new ethers.Contract(market.ADDRESS_OVL_MARKET, abi_OVL_MARKET, archive_pokt)
                eventTest = await ovlMarketContract.queryFilter("*")
                eventTest = await getOpenPositionFromEvents(eventTest)
            }
        }
        if (!startingBlockNumber 
        ) {
            try {
                console.log(blockNumber)
                let overlay = new Overlay(ethereumUtils.wallet)
                console.log(`perform liquidations`)
                await overlay.checkAndLiquidateAll(eventTest, 10 ** 19)

            } catch (error) {
                console.log(`error main: ${error}`)
            }
        }
        startingBlockNumber = false
    })

}
main()