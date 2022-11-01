require('dotenv').config()
const fs = require('fs');
const {
  expect,
  assert,
  expectEvent,
  should
} = require("chai");
const {
  ethers
} = require("hardhat")

const {
  Overlay
} = require('../bot/overlay')

//set abis
// let abi_UNI_V3_ROUTER = require('../abis/UNI_V3_ROUTER.json');
let abi_OVL_MARKET = require('../abis/OVL_MARKET.json');
let abi_OVL_STATE = require('../abis/OVL_STATE.json');
let abi_ERC20 = require('../abis/ERC20.json');
let abi_UNI_V3_QUOTER = require('../abis/UNI_V3_QUOTER.json');
let abi_UNI_V3_ROUTER = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json').abi
const abi_UNI_V3_FACTORY = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json").abi
const abi_UNI_V3_POOL = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json").abi;

const MAX_AMOUNT = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

const config = require(`../bot/config.${process.env.NETWORK}.json`)
//set addresses
const ADDRESS_UNIV3_FACTORY = config.ADDRESS_UNIV3_FACTORY
const ADDRESS_UNIV3_QUOTER = config.ADDRESS_UNIV3_QUOTER
const ADDRESS_UNIV3_ROUTER = config.ADDRESS_UNIV3_ROUTER
const ADDRESS_OVL_STATE = config.ADDRESS_OVL_STATE
const ADDRESS_OVL = config.ADDRESS_OVL
const ADDRESS_DAI = config.ADDRESS_MISC.ADDRESS_DAI
const ADDRESS_WETH = config.ADDRESS_MISC.ADDRESS_WETH
const ADDRESS_USDC = config.ADDRESS_MISC.ADDRESS_USDC
const ADDRESS_WETH_WHALE = config.ADDRESS_MISC.ADDRESS_WETH_WHALE
const ADDRESS_DAI_WHALE = config.ADDRESS_MISC.ADDRESS_DAI_WHALE

/**change this  */
const ADDRESS_WETHOVL_UNIV3_POOL = config.MARKETS[0].ADDRESS_UNIV3_POOL;
const ADDRESS_WETH_OVL_MARKET = config.MARKETS[0].ADDRESS_OVL_MARKET
console.log(`ADDRESS_WETH_OVL_MARKET ${ADDRESS_WETH_OVL_MARKET}`)
/**change this  */

console.log('config', JSON.stringify(config, null, 2))


const {
  getPrice,
  getPriceForList
} = require("../uniV3Utils/index");
const {
  getOpenPositionFromEvents
} = require('../bot/getOpenPositionFromEvents');

async function printBalance(notes, tokenInst, address) {
  console.log(`${notes} ${await tokenInst.balanceOf(address)}`)
}

describe("UNI_V3 TESTS", () => {
  let executeCalls
  let accounts
  let weth
  let dai
  let ovl
  let usdc
  let quoterContract
  let swapRouterContract
  let univ3FactoryContract
  let pairPool_weth_ovl
  let ovlWETHOVLMarketContract
  let ovlStateContract
  let overlayHelperObj

  before(async () => {
    accounts = await ethers.getSigners(1)

    const ExecuteCalls = await ethers.getContractFactory("ExecuteCalls")
    executeCalls = await ExecuteCalls.deploy(accounts[0].address, ADDRESS_WETH, {
      value: ethers.utils.parseEther("99.0")
    })
    await executeCalls.deployed()

    weth = await ethers.getContractAt("IWETH", ADDRESS_WETH)
    dai = await ethers.getContractAt("IERC20", ADDRESS_DAI)
    usdc = await ethers.getContractAt("IERC20", ADDRESS_USDC)
    console.log(`ADDRESS_OVL ${ADDRESS_OVL}`)
    ovl = await ethers.getContractAt("IERC20", ADDRESS_OVL)

    // quoterContract = new ethers.Contract(ADDRESS_UNIV3_QUOTER, abi_UNI_V3_QUOTER, accounts[0])
    // swapRouterContract = new ethers.Contract(ADDRESS_UNIV3_ROUTER, abi_UNI_V3_ROUTER, accounts[0])
    // univ3FactoryContract = new ethers.Contract(ADDRESS_UNIV3_FACTORY, abi_UNI_V3_FACTORY, accounts[0])
    // console.log('ADDRESS_OVL', ADDRESS_OVL)
    // console.log('ADDRESS_WETH', ADDRESS_WETH)
    // // let poolAddress = await univ3FactoryContract.getPool(WETH, OVL, '500')
    // let poolAddress = ADDRESS_WETHOVL_UNIV3_POOL
    // console.log(`poolAddress ${poolAddress}`)
    // // pairPool_weth_ovl = new ethers.Contract(poolAddress, UniswapV3Pool, accounts[0])


    ovlWETHOVLMarketContract = new ethers.Contract(ADDRESS_WETH_OVL_MARKET, abi_OVL_MARKET, accounts[0])
    ovlStateContract = new ethers.Contract(ADDRESS_OVL_STATE, abi_OVL_STATE, accounts[0])

    overlayHelperObj = new Overlay(accounts[0])

    console.log("executeCalls DEPLOYED with weth balance", await weth.balanceOf(executeCalls.address))
    console.log()
  })


  // it("execute price weth for usdc", async () => {

  //   console.log('-------')
  //   let fetchPrice = await getPrice(ADDRESS_OVL, ADDRESS_WETH, 10n ** 18n, quoterContract, '500')
  //   console.log(`fetchPrice ${1} eth to ${fetchPrice} ovl`)

  //   let fetchPrice2 = await getPrice(ADDRESS_WETH, ADDRESS_OVL, 10n ** 18n, quoterContract, '500')
  //   console.log(`fetchPrice ${1} ovl to ${fetchPrice2} eth`)

  //   console.log('-------')

  //   console.log('-------')
  //   // const poolFee = await pairPool_weth_ovl.fee();
  //   // const slot0 = await pairPool_weth_ovl.slot0();
  //   // const poolLiquidity = await pairPool_weth_ovl.liquidity();
  //   // const tickSpacing = await pairPool_weth_ovl.tickSpacing();
  //   // const nearestTick = Math.floor(slot0[1] / tickSpacing) * tickSpacing;

  //   // console.log('poolFee', poolFee)
  //   // console.log('slot0', slot0)
  //   // console.log('poolLiquidity', poolLiquidity)
  //   // console.log('tickSpacing', tickSpacing)
  //   // console.log('nearestTick', nearestTick)
  //   // console.log(`price ${1.0001**Number(nearestTick)}`)
  //   // console.log(`price ${1/(1.0001**Number(nearestTick))}`)
  //   console.log('-------')


  //   console.log('-------')

  //   console.log('-------')

  //   await printBalance("executeCalls weth balance ", weth, executeCalls.address)
  //   await printBalance("executeCalls ovl balance ", ovl, executeCalls.address)
  //   let sellAmt = 1n * (10n ** 18n)
  //   let quotePrice1 = await getPrice(ADDRESS_WETH, ADDRESS_OVL, sellAmt, quoterContract, '500')
  //   console.log(`quotePrice ${sellAmt} eth to ${quotePrice1} ovl`)
  //   // process.exit(0)

  //   let quotePrice2 = await getPrice(ADDRESS_OVL, ADDRESS_WETH, quotePrice1, quoterContract, '500')
  //   console.log(`quotePrice2 ${quotePrice1} ovl to ${quotePrice2} eth`)

  //   let list_txns = []
  //   let list_address = []


  //   list_txns.push(
  //     (
  //       await weth.populateTransaction.approve(
  //         ADDRESS_UNIV3_ROUTER,
  //         MAX_AMOUNT.toString()
  //       )
  //     ).data
  //   )
  //   list_address.push(ADDRESS_WETH)

  //   list_txns.push(
  //     (
  //       await ovl.populateTransaction.approve(
  //         ADDRESS_UNIV3_ROUTER,
  //         MAX_AMOUNT.toString()
  //       )
  //     ).data
  //   )
  //   list_address.push(ADDRESS_OVL)

  //   list_txns.push(
  //     (
  //       await weth.populateTransaction.approve(
  //         ADDRESS_WETH_OVL_MARKET,
  //         MAX_AMOUNT.toString()
  //       )
  //     ).data
  //   )
  //   list_address.push(ADDRESS_WETH)

  //   list_txns.push(
  //     (
  //       await ovl.populateTransaction.approve(
  //         ADDRESS_WETH_OVL_MARKET,
  //         MAX_AMOUNT.toString()
  //       )
  //     ).data
  //   )
  //   list_address.push(ADDRESS_OVL)

  //   let params1_exactInputSingle = {
  //     tokenIn: ADDRESS_WETH,
  //     tokenOut: ADDRESS_OVL,
  //     fee: '500',
  //     recipient: executeCalls.address,
  //     deadline: Math.floor(Date.now() / 1000) + (60 * 10),
  //     amountIn: (sellAmt).toString(),
  //     amountOutMinimum: quotePrice1.toString(),
  //     sqrtPriceLimitX96: 0,
  //   }

  //   list_txns.push(
  //     (
  //       await swapRouterContract.populateTransaction.exactInputSingle(params1_exactInputSingle)
  //     ).data
  //   )
  //   list_address.push(ADDRESS_UNIV3_ROUTER)

  //   // start: build position
  //   let aparams1_exactInputSingle = {
  //     tokenIn: ADDRESS_WETH,
  //     tokenOut: ADDRESS_OVL,
  //     fee: '500',
  //     recipient: executeCalls.address,
  //     deadline: Math.floor(Date.now() / 1000) + (60 * 10),
  //     amountIn: (sellAmt).toString(),
  //     amountOutMinimum: quotePrice1.toString(),
  //     sqrtPriceLimitX96: 0,
  //   }

  //   list_txns.push(
  //     (
  //       await ovlWETHOVLMarketContract.populateTransaction.build(
  //         '10000000000000000', // 0.01 ovl collateral
  //         '1000000000000000000', //1x leverage
  //         true,
  //         '964465032516062404365'
  //       )
  //     ).data
  //   )
  //   list_address.push(ADDRESS_WETH_OVL_MARKET)
  //   // end: build position

  //   let tx = await executeCalls.executeCalls(list_address, list_txns, {
  //     gasLimit: ethers.utils.hexlify(1000000)
  //   })
  //   // let txwait = await tx.wait()
  //   // console.log('txwait', JSON.stringify(txwait, null, 2))
  //   // console.log('tx ', JSON.stringify(tx , null, 2))
  //   await printBalance("executeCalls weth balance ", weth, executeCalls.address)
  //   await printBalance("executeCalls dai balance ", dai, executeCalls.address)

  // })

  it("get ETHOVL funding", async () => {
    // console.log(`await ovlStateContract.fundingRate(ovlWETHOVLMarketContract.address) ${await ovlStateContract.fundingRate(ovlWETHOVLMarketContract.address)}`)
    // let nonce = await ethers.provider.getTransactionCount(accounts[0].address, 'latest')
    // console.log(`nonce ${nonce}`)
    // let eventTest = await ovlWETHOVLMarketContract.queryFilter("*", 15641603, 15775938)
    let eventTest = await ovlWETHOVLMarketContract.queryFilter("*")

    console.log('eventTest', JSON.stringify(eventTest, null, 2))
    // await fs.writeFileSync('rough.json', JSON.stringify(eventTest, null, 2));

    if (1 == 2) {
      let currentOpenPositions = [{},
        {}
      ]
      let liquidatablePosition = [{},
        {}
      ]
    }

    // get all events 
    // for each liquidate(addy,id) remove build(addy,id)
    // for each unwind(addy,id) remove build(addy,id)
    eventTest = await getOpenPositionFromEvents(eventTest)
    // console.log('eventTest2', JSON.stringify(eventTest, null, 2))

    console.log(`asdasd`)
    await fs.writeFileSync('rough2.json', JSON.stringify(eventTest, null, 2));

    let minLiqFee = 1 == 1 ? '0' : await getPrice(ADDRESS_WETH, ADDRESS_OVL, 333000n * (10n ** 6n), quoterContract, '500')
    // console.log(`minLiqFee ${minLiqFee} ovl`)
    
    //liquidate a position on weth ovl market 
    let openPositions = [
      {
      address: "0x716e3f2f257c9956b56842a67f14e623e7629053",
      id: "83",
      marketAddress: ADDRESS_WETH_OVL_MARKET
    },
      {
      address: "0xe5cc7B86bB776F9Ceaad80E6d9e1cEB6ab48bb7C",
      id: "64",
      marketAddress: ADDRESS_WETH_OVL_MARKET
    }
  ]

    await overlayHelperObj.checkAndLiquidateAll(eventTest, minLiqFee)
  })

})