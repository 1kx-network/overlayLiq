const logger = require('ishan-logger')
async function getOpenPositionFromEvents(events) {
    let openPositions = []
    for (event of events) {
        if (event.event == "Build") {
            openPositions.push({
                "marketAddress": event.address,
                "address": event.args[0],
                "id": BigInt(event.args[1]).toString()
            })
        }
        if (event.event == "Unwind") {

        }
        if (event.event == "Liquidate") {

        }
    }
    // @todo: loop thru event and remove position that were already liquidated and closed 
    logger.info(`openPositions length ${openPositions.length}`)
    // logger.info(`openPositions ${openPositions}`)
    // logger.info(`openPositions[0] ${JSON.stringify(openPositions[0],null,2)}`)
    return openPositions

}

exports.getOpenPositionFromEvents = getOpenPositionFromEvents