const logger = require('ishan-logger')
require('dotenv').config({
    override: true
})
logger.info(` process.env.NODE_URL `, process.env.NODE_URL)
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
const {
    getEvents
} = require('../bot/getEvents');
const {
    publishHeartbeat
} = require('./metrics');
const TG = require('./tg.js');

let archive_pokt = new ethers.providers.JsonRpcProvider(process.env.ARCHIVE_NODE_URL)

async function main() {
    let ethereumUtils = new EthereumUtils()
    ethereumUtils = await init(ethereumUtils, [config.ADDRESS_MISC.ADDRESS_OVL, config.ADDRESS_MISC.ADDRESS_WETH])
    let startingBlockNumber = true
    let fetchedPositions = []
    let isPerformingLiquidation = false
    ethereumUtils.provider.on('block', async (blockNumber) => {
        let startTime = new Date()
        if (startingBlockNumber || blockNumber.toString().slice(-2) == '50') {
            for (let market of config.MARKETS) {
                // let ovlMarketContract = new ethers.Contract(market.ADDRESS_OVL_MARKET, abi_OVL_MARKET, archive_pokt)
                // fetchedPositions = await ovlMarketContract.queryFilter("*")
                // use pokt archive node to retrieve events 
                fetchedPositions = await getEvents(market.ADDRESS_OVL_MARKET)
                // logger.info(JSON.stringify(fetchedPositions[0], null,2))
                fetchedPositions = await getOpenPositionFromEvents(fetchedPositions)
            }
        }
        if (!startingBlockNumber && !isPerformingLiquidation) {
            try {
                let overlay = new Overlay(ethereumUtils.wallet)
                logger.info(`perform liquidations`)
                isPerformingLiquidation = true
                await overlay.checkAndLiquidateAll(fetchedPositions, 10 ** 16)
                isPerformingLiquidation = false
            } catch (error) {
                logger.error(`error main: ${error}`)
                isPerformingLiquidation = false
            }
        }
        logger.info(`blockNumber@${blockNumber} done in ${new Date()-startTime}\n`)
        publishHeartbeat({
            botName: "overlay-bot"
        });
        startingBlockNumber = false
    })

}

// sleep time expects milliseconds
function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

main().catch(async (e) => {
    TG.sendMessage('ovlbot: overlay bot stopped due to error')
    logger.error(`bot stopped `, e)
    await sleep(60000)
})