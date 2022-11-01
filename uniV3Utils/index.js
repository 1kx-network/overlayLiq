const {
  ethers, BigNumber
} = require("ethers");

/**
 * 
 * @param {String} tokenIn 
 * @param {String} tokenOut 
 * @param {String/BigInt} amountIn 
 * @param {Object} quoterContract 
 * @param {String/BigInt/BigInt} fee 
 * @returns {BigNumber} quotedAmountOut
 */
async function getPrice(tokenIn, tokenOut, amountIn, quoterContract, fee=3000) {
  const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle(
    tokenIn,
    tokenOut,
    fee,
    amountIn.toString(),
    0
  );
  if (!ethers.BigNumber.isBigNumber(quotedAmountOut)) {
    return getBigNumber(0);
  }
  return quotedAmountOut;
}
/**
 * 
 * @param {String} tokenIn 
 * @param {String} tokenOut 
 * @param {Array[String/BigInt]} amountIn 
 * @param {Object} quoterContract 
 * @param {String/BigInt/BigInt} fee 
 * @returns {BigNumber} quotedAmountOut
 */
async function getPriceForList(tokenIn, tokenOut, amountInList, quoterContract, fee=3000){
  let response  = {

  }

  await Promise.all(
    amountInList.map(async amountIn => {
      let quotedAmountOut = await getPrice(tokenIn, tokenOut, amountIn, quoterContract, fee)
      response[`${amountIn}`] = quotedAmountOut.toString()
      return 
    })
  )
  return {
    responseDict: response,
    inputArray: Object.keys(response),
    outputArray: Object.values(response)
  }
}

exports.getPrice = getPrice;
exports.getPriceForList = getPriceForList;