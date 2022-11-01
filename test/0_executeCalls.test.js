require('dotenv').config()
const {
    expect,
    assert,
    expectEvent,
    should
} = require("chai");
const {
    ethers
} = require("hardhat")

//set abis
const abi_UNIV3_QUOTER = require('../abis/UNI_V3_QUOTER.json');
const abi_UNIV3_ROUTER = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json').abi

const MAX_AMOUNT = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

const config = require(`../bot/config.${process.env.NETWORK}.json`)

const ADDRESS_UNIV3_QUOTER = config.ADDRESS_UNIV3_QUOTER
const ADDRESS_UNIV3_ROUTER = config.ADDRESS_UNIV3_ROUTER
const ADDRESS_DAI = config.ADDRESS_MISC.ADDRESS_DAI
const ADDRESS_WETH = config.ADDRESS_MISC.ADDRESS_WETH
const ADDRESS_USDC = config.ADDRESS_MISC.ADDRESS_USDC
const ADDRESS_WETH_WHALE = config.ADDRESS_MISC.ADDRESS_WETH_WHALE


console.log('config', JSON.stringify(config, null, 2))

const {
    getPrice,
    getPriceForList
} = require("../uniV3Utils/index");

async function printBalance(notes, tokenInst, address) {
    console.log(`${notes} ${await tokenInst.balanceOf(address)}`)
}

describe("ExecuteCalls TESTS", () => {
    let executeCalls
    let accounts
    let weth
    let dai
    let usdc
    let quoterContract
    let swapRouterContract

    beforeEach(async () => {
        try {
            console.log(`--- beforeEach ---`)
            accounts = await ethers.getSigners(2)

            const ExecuteCalls = await ethers.getContractFactory("ExecuteCalls")
            executeCalls = await ExecuteCalls.deploy(accounts[0].address, ADDRESS_WETH, {
                value: ethers.utils.parseEther("99.0")
            })
            await executeCalls.deployed()

            weth = await ethers.getContractAt("IWETH", ADDRESS_WETH)
            dai = await ethers.getContractAt("IERC20", ADDRESS_DAI)
            usdc = await ethers.getContractAt("IERC20", ADDRESS_USDC)

            whale = await ethers.getImpersonatedSigner(ADDRESS_WETH_WHALE);

            quoterContract = new ethers.Contract(ADDRESS_UNIV3_QUOTER, abi_UNIV3_QUOTER, accounts[0])
            console.log('ADDRESS_UNIV3_ROUTER ', ADDRESS_UNIV3_ROUTER)
            try {
                swapRouterContract = new ethers.Contract(ADDRESS_UNIV3_ROUTER, abi_UNIV3_ROUTER, accounts[0])
            } catch (error) {
                console.log('error router ', error)
            }

            console.log("executeCalls DEPLOYED with weth balance", await weth.balanceOf(executeCalls.address))
            console.log(`--- beforeEach ---`)
            console.log()
        } catch (error) {
            console.log('error', error)
        }
    })

    it("1. contract funded with 99 WETH", async () => {
        let weth_balance = (await weth.balanceOf(executeCalls.address)).toString()
        expect(BigInt(weth_balance)).to.equal(BigInt((99n * (10n ** 18n)).toString()))
    })

    it("2. transfer 1 WETH and balance should increase", async () => {
        let weth_balance = (await weth.balanceOf(executeCalls.address)).toString()
        expect(BigInt(weth_balance)).to.equal(BigInt((99n * (10n ** 18n)).toString()))
        await weth.connect(whale).transfer(executeCalls.address, 1n * (10n ** 18n))
        let new_weth_balance = (await weth.balanceOf(executeCalls.address)).toString()
        expect(BigInt(new_weth_balance)).to.equal((100n * (10n ** 18n)))
    })

    it("3. executeCalls balance should increase", async () => {
        let executeCallsEtherBalance = await ethers.provider.getBalance(executeCalls.address)
        expect(BigInt(executeCallsEtherBalance)).to.equal(0n)
        await accounts[1].sendTransaction({
            to: executeCalls.address,
            value: 1n * 10n ** 18n
        })
        let updatedExcuteCallsEtherBalance = await ethers.provider.getBalance(executeCalls.address)
        expect(BigInt(updatedExcuteCallsEtherBalance)).to.equal(1n * 10n ** 18n)
    })

    it("4. withdraw executeCalls balance ", async () => {
        let init_executeCallsEtherBalance = await ethers.provider.getBalance(executeCalls.address)
        expect(BigInt(init_executeCallsEtherBalance)).to.equal(0n)
        await accounts[1].sendTransaction({
            to: executeCalls.address,
            value: 1n * 10n ** 18n
        })
        let excuteCallsEtherBalance = BigInt(await ethers.provider.getBalance(executeCalls.address))
        expect(excuteCallsEtherBalance).to.equal(1n * 10n ** 18n)

        let ownerWethBalance = BigInt(await weth.balanceOf(accounts[0].address))
        let executeCallsWethBalance = BigInt(await weth.balanceOf(executeCalls.address))
        let ownerEtherBalance = BigInt(await ethers.provider.getBalance(accounts[0].address))
        console.log('before withdraw ownerWethBalance              ', ownerWethBalance)
        console.log('before withdraw ownerEtherBalance             ', ownerEtherBalance)
        console.log('before withdraw executeCallsWethBalance       ', executeCallsWethBalance)
        console.log('before withdraw excuteCallsEtherBalance', excuteCallsEtherBalance)

        await expect(executeCalls.connect(accounts[1]).withdraw(ADDRESS_WETH)).to.be.reverted
        await expect(executeCalls.connect(accounts[1]).withdraw('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE')).to.be.reverted

        await executeCalls.connect(accounts[0]).withdraw(ADDRESS_WETH)
        await executeCalls.connect(accounts[0]).withdraw('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE')

        new_excuteCallsEtherBalance = BigInt(await ethers.provider.getBalance(executeCalls.address))
        new_executeCallsWethBalance = BigInt(await weth.balanceOf(executeCalls.address))
        new_ownerWethBalance = BigInt(await weth.balanceOf(accounts[0].address))
        new_ownerEtherBalance = BigInt(await ethers.provider.getBalance(accounts[0].address))

        console.log('after withdraw new_ownerWethBalance               ', new_ownerWethBalance)
        console.log('after withdraw new_ownerEtherBalance              ', new_ownerEtherBalance)
        console.log('after withdraw new_executeCallsWethBalance        ', new_executeCallsWethBalance)
        console.log('after withdraw new_excuteCallsEtherBalance ', new_excuteCallsEtherBalance)

        expect(new_ownerEtherBalance).to.equal(ownerEtherBalance + excuteCallsEtherBalance)
        expect(new_ownerWethBalance).to.equal(executeCallsWethBalance + ownerWethBalance)
        expect(new_excuteCallsEtherBalance).to.equal(0n)
        expect(new_executeCallsWethBalance).to.equal(0n)
    })

    it("5. only owner can call executeCalls", async () => {
        let list_txns = []
        let list_address = []

        list_txns.push(
            (
                await weth.populateTransaction.approve(
                    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                    MAX_AMOUNT.toString()
                )
            ).data
        )
        list_address.push(ADDRESS_WETH)

        await expect(
            executeCalls.connect(accounts[1]).executeCalls(list_address, list_txns, {
                gasLimit: ethers.utils.hexlify(1000000)
            })
        ).to.be.reverted


        list_txns = []
        list_address = []

        list_txns.push(
            (
                await weth.populateTransaction.transfer(
                    accounts[1].address,
                    10n ** 18n
                )
            ).data
        )
        list_address.push(ADDRESS_WETH)

        let old_balance = BigInt(await weth.balanceOf(accounts[1].address))
        console.log(`old_balance ${old_balance}`)
        await executeCalls.connect(accounts[0]).executeCalls(list_address, list_txns, {
            gasLimit: ethers.utils.hexlify(1000000)
        })
        let new_balance = BigInt(await weth.balanceOf(accounts[1].address))
        console.log(`new_balance ${new_balance}`)
        expect(old_balance).to.equal(5000000000000000000n)
        expect(new_balance).to.equal(6000000000000000000n)
    })

})