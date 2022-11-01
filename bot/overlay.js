const config = require(`./config.${process.env.NETWORK}.json`)
const abi_OVL_STATE = require('../abis/OVL_STATE.json')
const abi_OVL_MARKET = require('../abis/OVL_MARKET.json')
const ethers = require('ethers');

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
        console.log('config.ADDRESS_OVL_STATE', config.ADDRESS_OVL_STATE)
        console.log(`abi_OVL_STATE ${abi_OVL_STATE}`)
        console.log('walletProvider.address', this.walletProvider.address)
        let ovlStateContract = new ethers.Contract(config.ADDRESS_OVL_STATE, abi_OVL_STATE, this.this.walletProvider)
        for (let market of config.MARKETS) {
            console.log(`market.ADDRESS_OVL_MARKET ${market.ADDRESS_OVL_MARKET}`)
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
                console.log(`market ${market.ADDRESS_OVL_MARKET} has fr ${fr}`)
            }
        }
        return
    }


    async checkAndLiquidate(positionInfo, minLiqFee) {
        console.log(`checkAndLiquidate ${JSON.stringify(positionInfo)} ${minLiqFee}`)
        let ovlStateContract = new ethers.Contract(config.ADDRESS_OVL_STATE, abi_OVL_STATE, this.walletProvider)


        let factory = await ovlStateContract.factory()
        console.log(`factory ${factory}`)

        let isLiq = await ovlStateContract.liquidatable(
            positionInfo.marketAddress,
            positionInfo.address,
            positionInfo.id,
        )
        console.log(`isLiq ${isLiq}`)

        if (isLiq === true) {
            let liqProfit = await ovlStateContract.liquidationFee(
                positionInfo.marketAddress,
                positionInfo.address,
                positionInfo.id,
            )
            console.log('liqProfit', liqProfit)
            console.log('minLiqFee', minLiqFee)

            if (BigInt(liqProfit.toString()) > BigInt(minLiqFee)) {
                let ovlMarketContract = new ethers.Contract(positionInfo.marketAddress, abi_OVL_MARKET, this.walletProvider)
                // let liqPosTest = await ovlMarketContract.liquidate(positionInfo.address, positionInfo.id, {
                //     gasLimit: 1000000
                // })
                // console.log(liqPosTest)
                // await liqPosTest.wait()
                let populateTransaction = await ovlMarketContract.populateTransaction.liquidate(positionInfo.address, positionInfo.id, {
                    gasLimit: 1000000
                })
                console.log(`populateTransaction ${JSON.stringify(populateTransaction, null, 2)}`)
                return populateTransaction
            } else {
                console.log(`liq profit too low`)
            }
        } else {
            console.log(`position ${positionInfo} non liquidatable`)
        }
        return undefined
    }

    async checkAndLiquidateAll(positionInfoArray, minLiqFee) {
        let liqTxns = []
        for (let i = 0; i < positionInfoArray.length; i++) {
            let generateLiqTx = await this.checkAndLiquidate(positionInfoArray[i], minLiqFee)
            if (typeof generateLiqTx !== 'undefined') {
                liqTxns.push(generateLiqTx)
            }
        }
        // console.log(`liqTxns ${JSON.stringify(liqTxns, null, 2)} \n kekekekek`)
        // process.exit(0)
        // return 
        let nonce = await this.walletProvider.provider.getTransactionCount(this.walletProvider.address, 'latest')
        for (let i = 0; i < liqTxns.length; i++) {
            let txn = liqTxns[i]
            txn.nonce = nonce
            nonce++
            console.log(`txn txn txn ${txn}`)
            this.walletProvider.sendTransaction(txn).then((res, err) => {
                console.log(`txn res ${JSON.stringify(res, null, 2)}`)
            }).catch((e) => {
                console.log(`error sending transaction ${txn} ${e}`)
            })
        }
        // await sleep(22000)
        return
    }

}

module.exports = {
    Overlay
}