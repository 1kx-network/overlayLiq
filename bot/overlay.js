const logger = require('ishan-logger')
const config = require(`./config.${process.env.NETWORK}.json`)
const abi_OVL_STATE = require('../abis/OVL_STATE.json')
const abi_OVL_MARKET = require('../abis/OVL_MARKET.json')
const ethers = require('ethers');
const TG = require('./tg.js');

let etherscanLink = 'https://etherscan.io/tx/'

function sleep(ms) {
    return new Promise((res, rej) => {
        setTimeout(res, ms)
    })
}
class Overlay {
    constructor(walletProvider) {
        this.walletProvider = walletProvider
        this.fundingRate = {}
    }
    async getFRAll() {
        logger.info('config.ADDRESS_OVL_STATE', config.ADDRESS_OVL_STATE)
        logger.info(`abi_OVL_STATE ${abi_OVL_STATE}`)
        logger.info('walletProvider.address', this.walletProvider.address)
        let ovlStateContract = new ethers.Contract(config.ADDRESS_OVL_STATE, abi_OVL_STATE, this.walletProvider)
        for (let market of config.MARKETS) {
            logger.info(`market.ADDRESS_OVL_MARKET ${market.ADDRESS_OVL_MARKET}`)
            this.fundingRate[`${market.ADDRESS_OVL_MARKET}`] = (await ovlStateContract.fundingRate(`${market.ADDRESS_OVL_MARKET}`)).toString()
        }
        return
    }

    async build() {

    }

    async getFRArbTxn() {
        let arbTxns = []
        for (let market of config.MARKETS) {
            let fr = Number(this.fundingRate[`${market.ADDRESS_OVL_MARKET}`])
            if (fr < 0) {
                // get uniswapv3 weth to ovl exececution price 
                // get wethovl long execution price 
                // get maxBaseFee + 5n * 500,000
                // get loss = weth to eth loss in percents + txn fee 
                // check loss*3 < fr 
                // if true then build long
            } else {
                logger.info(`market ${market.ADDRESS_OVL_MARKET} has fr ${fr}`)
            }
        }
        return
    }

    async checkAndLiquidate(positionInfo, minLiqFee) {
        let ovlStateContract = new ethers.Contract(config.ADDRESS_OVL_STATE, abi_OVL_STATE, this.walletProvider)
        let isLiq = await ovlStateContract.liquidatable(
            positionInfo.marketAddress,
            positionInfo.address,
            positionInfo.id,
        )
        if (isLiq === true) {
            let liqProfit = await ovlStateContract.liquidationFee(
                positionInfo.marketAddress,
                positionInfo.address,
                positionInfo.id,
            )
            logger.info('liqProfit', BigInt(liqProfit).toString())
            logger.info('minLiqFee', minLiqFee)
            if (BigInt(liqProfit.toString()) > BigInt(minLiqFee)) {
                let ovlMarketContract = new ethers.Contract(positionInfo.marketAddress, abi_OVL_MARKET, this.walletProvider)
                let populateTransaction = await ovlMarketContract.populateTransaction.liquidate(positionInfo.address, positionInfo.id, {
                    gasLimit: 1000000
                })
                logger.info(`populateTransaction ${JSON.stringify(populateTransaction, null, 2)}`)
                return populateTransaction
            } else {
                logger.info(`liq profit too low`)
            }
        }
        return undefined
    }

    async checkAndLiquidateAll(positionInfoArray, minLiqFee) {
        let liqTxns = []
        // set gas fee
        let fee = await this.walletProvider.getFeeData();
        logger.info(`gas fee: ${fee.gasPrice}`)
        let ourFee = (2n * (10n ** 9n)) + ((BigInt(fee.gasPrice) * 12500n) / 1000n)
        logger.info(`ourFee: ${ourFee}`)

        let allGeneratedLiqTxns = await Promise.allSettled(
            positionInfoArray.map((positionInfo) => this.checkAndLiquidate(positionInfo, minLiqFee))
        )
        for (let generateLiqTx of allGeneratedLiqTxns) {
            if (generateLiqTx.status == 'fulfilled' && typeof generateLiqTx.value !== 'undefined') {
                liqTxns.push(generateLiqTx.value)
            }
        }

        let nonce = await this.walletProvider.provider.getTransactionCount(this.walletProvider.address, 'latest')
        for (let i = 0; i < liqTxns.length; i++) {
            let txn = liqTxns[i]
            txn.nonce = nonce
            nonce++
            // set gas fee
            txn.gasPrice = ourFee;
            this.walletProvider.sendTransaction(txn).then((res, err) => {
                TG.sendMessage(`OVLBOT: Liquidated Position ${etherscanLink+res.hash}`);
            }).catch((e) => {
                logger.error(`error Liquidate txn: ${txn} error: ${e}`)
            })
        }
        return
    }
}

module.exports = {
    Overlay
}