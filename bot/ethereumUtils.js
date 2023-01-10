const logger = require('ishan-logger')
const abi_erc20 = require('../abis/IERC20.json')['abi']
const {
    providers,
    Wallet
} = require('ethers')
const ethers = require('ethers')
const {
    FlashbotsBundleProvider
} = require("@flashbots/ethers-provider-bundle");

const FLASHBOTS_ENDPOINT_DICT = {
    '1': "https://relay.flashbots.net",
    '5': "https://relay-goerli.flashbots.net",
}

const ETHERMINE_ENDPOINT = 'https://mev-relay.ethermine.org'
logger.info(`NODE RPC URL: ${process.env[`NODE_URL`]}`)
class EthereumUtils {
    constructor(node_url = '', chain_id = '') {
        this.PUB_KEY = process.env['PUB_KEY']
        this.PRI_KEY = process.env['PRI_KEY']
        this.FB_PRI_KEY = process.env['FB_PRI_KEY']
        this.NODE_URL = node_url == '' ? process.env[`NODE_URL`] : node_url
        this.CHAIN_ID = process.env['CHAIN_ID']
        // this.provider = new providers.JsonRpcProvider(process.env[`NODE_URL`])
        this.provider = new providers.FallbackProvider(
            [{
                    provider: new providers.StaticJsonRpcProvider(process.env[`ALCHEMY_NODE_URL`], "mainnet"),
                    priority: 1,
                    stallTimeout: 200,
                    weight: 1,
                },
                {
                    provider: new providers.StaticJsonRpcProvider(process.env[`NODE_URL`], "mainnet"),
                    priority: 1,
                    stallTimeout: 200,
                    weight: 1,
                }
            ], 1)
        this.FLASHBOTS_ENDPOINT = FLASHBOTS_ENDPOINT_DICT[`CHAIN_ID`]
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
        this.flashbotsProvider = await FlashbotsBundleProvider.create(this.provider, this.walletReputation, this.FLASHBOTS_ENDPOINT)
        this.simulateProvider = await FlashbotsBundleProvider.create(this.provider, this.walletReputation, this.NODE_URL)
        this.ethermineProvider = await FlashbotsBundleProvider.create(this.provider, this.walletReputation, ETHERMINE_ENDPOINT)
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
    async signBundle(transactionArray, targetBlockNumber) {
        const signedTransactions = await this.flashbotsProvider.signBundle(transactionArray)
        return signedTransactions
    }

    async simulate(signedTransactions, targetBlockNumber) {
        // todo run geth node and use our own node
        const simulation = await this.flashbotsProvider.simulate(signedTransactions, targetBlockNumber)

        // const simulation = await this.simulateProvider.simulate(signedTransactions, targetBlockNumber)
        return simulation
    }
    async sendRawBundle(signedTransactions, targetBlockNumber, relay = 'FB') {
        if (relay === 'EM') {
            const bundleSubmission = await this.ethermineProvider.sendRawBundle(
                signedTransactions,
                targetBlockNumber
            )
            return bundleSubmission
        }
        if (relay === 'FB') {
            const bundleSubmission = await this.flashbotsProvider.sendRawBundle(
                signedTransactions,
                targetBlockNumber
            )
            return bundleSubmission
        }
    }

    async getContractInstance(tokenAddress, abi) {
        let contractInst = new ethers.Contract(tokenAddress, abi, this.wallet);
        return contractInst
    }

    async setSCBalance(tokenAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2') {
        logger.info(`tokenAddress ${tokenAddress}`)
        logger.info(`this.sCAddress ${this.sCAddress}`)
        let decimals = await new ethers.Contract(tokenAddress, abi_erc20, this.wallet).decimals().catch((err) => {
            logger.info(`err decimals ${err}`)
        })
        logger.info(`decimals ${decimals}`)
        let balance = await new ethers.Contract(tokenAddress, abi_erc20, this.wallet).balanceOf(this.sCAddress).catch((err) => {
            logger.info(`err balanceOf ${err}`)
        })
        this.sCBalance = balance.toString()
        this.tokenBalances[`${tokenAddress}`] = await this.get18DecimalResult(tokenAddress, balance.toString())
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

}

async function init(ethereumUtils, tokenArray) {
    await ethereumUtils.setFlashBotsProvider()
    await ethereumUtils.setBaseFeeNextBlock()
    await ethereumUtils.setWalletBalance()
    // for (token of tokenArray) {
    //     await ethereumUtils.setSCBalance(token).catch(
    //         function (err) {
    //             logger.info('err', err)
    //         }
    //     )
    // }
    return ethereumUtils
}


module.exports = {
    EthereumUtils,
    init
}