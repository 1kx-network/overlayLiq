const logger = require('ishan-logger')
const abi_erc20 = require('../abis/IERC20.json')['abi']
const {
    providers,
    Wallet
} = require('ethers')
const ethers = require('ethers')
const {
    FlashbotsBundleProvider,
    FlashbotsBundleResolution
} = require("@flashbots/ethers-provider-bundle");
const TG = require('./tg.js');
const FLASHBOTS_ENDPOINT_DICT = {
    '1': ["https://relay.flashbots.net", "https://api.edennetwork.io/v1/bundle", "https://builder0x69.io", "https://rpc.beaverbuild.org/"],
    '5': ["https://relay-goerli.flashbots.net"],
}
logger.info(`NODE RPC URL: ${process.env[`NODE_URL`]}`)
class EthereumUtils {
    constructor(node_url = '', chain_id = '1') {
        this.PUB_KEY = process.env['PUB_KEY']
        this.PRI_KEY = process.env['PRI_KEY']
        this.FB_PRI_KEY = process.env['FB_PRI_KEY']
        this.NODE_URL = node_url == '' ? process.env[`NODE_URL`] : node_url
        this.CHAIN_ID = chain_id
        // this.provider = new providers.JsonRpcProvider(process.env[`NODE_URL`])
        // this.provider = new providers.JsonRpcProvider(process.env[`ALCHEMY_NODE_URL`])
        this.provider = new providers.JsonRpcProvider( process.env[`NODE_URL`]) 
        this.wallet = new Wallet(this.PRI_KEY, this.provider)
        this.walletReputation = new Wallet(this.FB_PRI_KEY, this.provider)
        this.sCAddress = process.env.ADDRESS_SC
        this.fLSCAddress = process.env.ADDRESS_FLSC
        this.tokenBalances = {}
        this.tokenDecimalsDict = {
            '0xKEK': '18'
        }
    }

    async setFlashBotsProvider() {
        this.flashbotsProvider = await FlashbotsBundleProvider.create(this.provider, this.walletReputation, FLASHBOTS_ENDPOINT_DICT[`${this.CHAIN_ID}`][0])
        this.buildersProviders = []
        for (let i in FLASHBOTS_ENDPOINT_DICT[`${this.CHAIN_ID}`]) {
            this.buildersProviders[i] = await FlashbotsBundleProvider.create(this.provider, this.walletReputation, FLASHBOTS_ENDPOINT_DICT[`${this.CHAIN_ID}`][i])
        }
        return
    }

    async setTokensDecimalsDict(tokenDecimalsDict) {
        this.tokenDecimalsDict = tokenDecimalsDict
        return
    }

    async getTokensDecimalsDict(tokenAddressArray) {
        return this.tokenDecimalsDict
    }

    async setETHPrices() {
        let ethPriceDict = {
            '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 1, //weth price
        }
        this.ethPriceDict = ethPriceDict
    }

    /*
    let transaction = {
        transaction: {
            chainId: CHAIN_ID,
            type: 2,
            value: ETHER / 100n * 3n,
            data: "0x1249c58b",
            maxFeePerGas: GWEI * 10n,
            maxPriorityFeePerGas: GWEI * 10n,
            // gasLimit: 500000,
            to: "0x20EE855E43A7af19E407E39E5110c2C1Ee41F64D"
        },
        signer: wallet
    }
    let transactionArray = [transaction]
    */
    async signBundle(transactionArray) {
        const signedTransactions = await this.flashbotsProvider.signBundle(transactionArray)
        return signedTransactions
    }

    async simulate(signedTransactions, targetBlockNumber) {
        // todo run geth node and use our own node
        const simulation = await this.flashbotsProvider.simulate(signedTransactions, targetBlockNumber)
        // const simulation = await this.simulateProvider.simulate(signedTransactions, targetBlockNumber)
        return simulation
    }
    async sendRawBundle(signedTransactions, targetBlockNumber) {
        const bundleSubmission = await this.flashbotsProvider.sendRawBundle(
            signedTransactions,
            targetBlockNumber
        )
        return bundleSubmission
    }

    async getContractInstance(tokenAddress, abi) {
        let contractInst = new ethers.Contract(tokenAddress, abi, this.wallet);
        return contractInst
    }

    async setSCBalance(tokenAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2') {
        logger.info(`tokenAddress ${tokenAddress}`)
        logger.info(`this.sCAddress ${this.sCAddress}`)
        let balanceObj = new ethers.Contract(tokenAddress, abi_erc20, this.wallet)
        let balance = await balanceObj.balanceOf(this.sCAddress)
        console.log(`balance ${balance}`)
        // this.tokenBalances[`${tokenAddress}`] = await this.get18DecimalResult(tokenAddress, balance.toString())
    }

    async getTokenInfo(tokenArray) {
        let decimalsResult = {}
        let symbolResult = {}
        for (token of tokenArray) {
            let decimals = await new ethers.Contract(token, abi_erc20, this.wallet).decimals()
            let symbol = await new ethers.Contract(token, abi_erc20, this.wallet).symbol()
            decimalsResult[`${token}`] = decimals.toString()
            symbolResult[`${token}`] = symbol
        }
        return {
            decimalsResult,
            symbolResult
        }
    }

    async setWalletBalance() {
        const balance = await this.provider.getBalance(this.wallet.address);
        this.walletBalance = balance.toString()
    }

    async setBaseFeeNextBlock() {
        const block = await this.provider.getBlock("latest");
        const maxBaseFeeInFutureBlock = FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(block.baseFeePerGas, 1);
        logger.info(`maxBaseFeeInFutureBlock ${maxBaseFeeInFutureBlock}`)
        this.maxBaseFeeInFutureBlock = maxBaseFeeInFutureBlock
        return maxBaseFeeInFutureBlock
    }

    async getBlockNumber() {
        const blockNumber = await this.provider.getBlockNumber()
        this.blockNumber = blockNumber
        logger.info(`...getBlockNumber(): ${blockNumber}`)
        return this.blockNumber
    }

    async get18DecimalResult(token, stringAmt) {
        if (typeof this.tokenDecimalsDict[`${token}`] === 'undefined') {
            let cObj = new ethers.Contract(token, abi_erc20, this.wallet)
            let decimalValue = await cObj.decimals()
            this.tokenDecimalsDict[`${token}`] = decimalValue.toString()
        }
        let decimal = BigInt(this.tokenDecimalsDict[`${token}`])
        if (decimal > BigInt(18)) {
            return (BigInt(stringAmt) / (10n ** (decimal - 18n))).toString()
        } else {
            return (BigInt(stringAmt) * ((10n ** (18n - decimal)))).toString()
        }
    }

    async getTokenDecimalResult(token, stringAmt) {
        if (typeof this.tokenDecimalsDict[`${token}`] === 'undefined') {
            let cObj = new ethers.Contract(token, abi_erc20, this.wallet)
            let decimalValue = await cObj.decimals()
            this.tokenDecimalsDict[`${token}`] = decimalValue.toString()
        }
        let decimal = BigInt(this.tokenDecimalsDict[`${token}`])
        if (decimal > BigInt(18)) {
            return (BigInt(stringAmt) * (10n ** (decimal - 18n))).toString()
        } else {
            return (BigInt(stringAmt) / ((10n ** (18n - decimal)))).toString()
        }
    }

    async sendPrivateTx(txn, targetBlockNumber) {
        logger.info(`using flashbots`)
        let transactionArray = [{
            transaction: {
                chainId: 1,
                type: 2,
                value: 0,
                data: txn.data,
                maxFeePerGas: txn.gasPrice,
                nonce: txn.nonce,
                maxPriorityFeePerGas: txn.gasPrice,
                gasLimit: 1000000,
                to: txn.to
            },
            signer: this.wallet
        }]
        let signedTransactions = await this.signBundle(transactionArray)

        try {
            await Promise.allSettled(
                this.buildersProviders.map(
                    async (buildersProvider)=>{
                        let bundleSubmission = await buildersProvider.sendRawBundle(signedTransactions, targetBlockNumber)
                        let waitResponse = await bundleSubmission.wait()
                        logger.info(` waitResponse ${waitResponse}`)
                        if (waitResponse === FlashbotsBundleResolution.BundleIncluded || waitResponse === FlashbotsBundleResolution.AccountNonceTooHigh) {
                            TG.sendMessage(`FB txn was included https://etherscan.io/tx/${bundleSubmission.bundleTransactions[0].hash}`, 1)
                        } else {
                            try {
                                logger.error(`txn not included :( (means not a fb block or txnFee/profit not high enough)`, 1)
                                let simulationPost = await bundleSubmission.simulate()
                                logger.info(`target_blockNum@${target_blockNumber} simulationPost ${JSON.stringify(simulationPost,null,2)}`)
                                let bundleStats = await this.buildersProvider.getBundleStats(simulationPost.bundleHash, target_blockNumber)
                                logger.info(`target_blockNum@${target_blockNumber} bundleStats ${JSON.stringify(bundleStats,null,2)}`)
                            } catch (e) {
                                logger.error(`debug bundle that didn't make it ${e}`)
                            }
                        }
                    }
                )
            )
        } catch (e) {
            let bundleSubmission = await this.sendRawBundle(signedTransactions, targetBlockNumber)
            let waitResponse = await bundleSubmission.wait()
            logger.info(` waitResponse ${waitResponse}`)
            if (waitResponse === FlashbotsBundleResolution.BundleIncluded || waitResponse === FlashbotsBundleResolution.AccountNonceTooHigh) {
                TG.sendMessage(`FB txn was included https://etherscan.io/tx/${bundleSubmission.bundleTransactions[0].hash}`, 1)
            } else {
                try {
                    logger.error(`txn not included :( (means not a fb block or txnFee/profit not high enough)`, 1)
                    let simulationPost = await bundleSubmission.simulate()
                    logger.info(`target_blockNum@${target_blockNumber} simulationPost ${JSON.stringify(simulationPost,null,2)}`)
                    let bundleStats = await this.flashbotsProvider.getBundleStats(simulationPost.bundleHash, target_blockNumber)
                    logger.info(`target_blockNum@${target_blockNumber} bundleStats ${JSON.stringify(bundleStats,null,2)}`)
                } catch (e) {
                    logger.error(`debug bundle that didn't make it ${e}`)
                }
            }
        }
    }

}

async function init(ethereumUtils) {
    await ethereumUtils.setFlashBotsProvider()
    await ethereumUtils.setBaseFeeNextBlock()
    await ethereumUtils.setWalletBalance()
    return ethereumUtils
}


module.exports = {
    EthereumUtils,
    init
}