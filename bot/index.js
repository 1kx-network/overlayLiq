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
const {
    runJob
} = require('./healthCheck');

let archive_pokt = new ethers.providers.JsonRpcProvider(process.env.ARCHIVE_NODE_URL)

async function main() {
    let ethereumUtils = new EthereumUtils()
    let lastPing = new Date()
    let lastAccountFetch

    ethereumUtils = await init(ethereumUtils)
    let startingBlockNumber = true
    let fetchedPositions = []
    let isPerformingLiquidation = false
    let fromBlockEvent = 64174460
    let overlay = new Overlay(ethereumUtils.wallet, ethereumUtils)
    ethereumUtils.provider.on('block', async (blockNumber) => {
        let startTime = new Date()
        let toBlockEvent = blockNumber
        if (
            (typeof lastAccountFetch=="undefined"||new Date()-lastAccountFetch>10*60*1000) &&
            !isPerformingLiquidation
        ) {
            fetchedPositions = []
            await Promise.all(
                config.MARKETS.map(
                    async (market) => {
                        let ovlMarketContract = new ethers.Contract(market.ADDRESS_OVL_MARKET, abi_OVL_MARKET, archive_pokt)
                        // let oiLong = await ovlMarketContract.oiLong()
                        // logger.info(`oiLong ${oiLong}`)
                        // console.log(ovlMarketContract)
                        logger.info(`
                        fromBlockEvent ${fromBlockEvent}
                        toBlockEvent   ${toBlockEvent}  
                        `)
                        let allEvents = await ovlMarketContract.queryFilter("*", fromBlockEvent, toBlockEvent)

                        // use pokt archive node to retrieve events 
                        // fetchedPositions = await getEvents(market.ADDRESS_OVL_MARKET)
                        // logger.info(JSON.stringify(fetchedPositions[0], null,2))
                        new_fetchedPositions = await getOpenPositionFromEvents(allEvents)
                        fetchedPositions = fetchedPositions.concat(new_fetchedPositions);
                    }
                )
            )
            fromBlockEvent = toBlockEvent
            lastAccountFetch = new Date()
            logger.info(`fetched positions in ${new Date()-startTime}\n`)
        }
        if (!startingBlockNumber && !isPerformingLiquidation) {
            try {
                logger.info(`fetchedPositions: ${(fetchedPositions.length)}`)
                logger.info(`perform liquidations`)
                isPerformingLiquidation = true
                await overlay.checkAndLiquidateAll(fetchedPositions, 1)
                isPerformingLiquidation = false
                logger.info(`blockNumber@${blockNumber} done in ${new Date()-startTime}\n`)
            } catch (error) {
                logger.error(`error main: ${error}`)
                isPerformingLiquidation = false
            }
            if(new Date - lastPing > 30*1000){
                lastPing =  new Date()
                runJob().catch(e => logger.error(`ping fail`))
            }
        }
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