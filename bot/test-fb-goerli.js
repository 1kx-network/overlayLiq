const logger = require('ishan-logger')
require('dotenv').config({
    override: true
})
logger.info(` process.env.NODE_URL `, process.env.NODE_URL)
const {
    EthereumUtils,
    init
} = require('./ethereumUtils');
const ethers = require('ethers');

async function main() {
    let ethereumUtils = new EthereumUtils("https://eth-goerli.g.alchemy.com/v2/EBqKHb9omBS5TabVvEJmZMGr03l0Tt6B", "5")
    ethereumUtils = await init(ethereumUtils)
    let startingBlockNumber = true


    ethereumUtils.provider.on('block', async (blockNumber) => {
        let startTime = new Date()

        if (!startingBlockNumber) {
            try {
                let transactionArray = [{
                        transaction: {
                            to: "0xf1a54b075fb71768ac31b33fd7c61ad8f9f7dd18",
                            gasPrice: 5039615,
                            gasLimit: 210000,
                            chainId: 5,
                            value: 1,

                        },
                        signer: ethereumUtils.wallet
                    },
                    {
                        transaction: {
                            to: "0xf1a54b075fb71768ac31b33fd7c61ad8f9f7dd18",
                            gasPrice: 5039615,
                            gasLimit: 210000,
                            chainId: 5,
                            value: 1,

                        },
                        signer: ethereumUtils.wallet
                    }
                ]


                ethereumUtils.signBundle(transactionArray, blockNumber + 1).then(async (signedTransactions) => {

                    console.log(new Date());
                    const simulation = await ethereumUtils.simulate(
                        signedTransactions,
                        blockNumber + 1
                    );
                    console.log(new Date());

                    // Using TypeScript discrimination
                    if ("error" in simulation) {
                        console.log(`Simulation Error: ${simulation.error.message}`);
                    } else {
                        console.log(
                            `Simulation Success: ${blockNumber} ${JSON.stringify(
                          simulation,
                          null,
                          2
                        )}`
                        );
                    }


                    ethereumUtils.sendRawBundle(signedTransactions, blockNumber + 1).then(
                        (bundleSubmission) => {
                            logger.info(`bundleSubmission ${bundleSubmission}`)
                        }
                    ).catch(e => logger.error(`error sendRawBundle ${e}`))
                }).catch(e => logger.error(`error signBundle ${e}`))

            } catch (error) {
                logger.error(`error main: ${error}`)
            }
        }
        logger.info(`blockNumber@${blockNumber} done in ${new Date()-startTime}\n`)

        startingBlockNumber = false
    })

}

main()