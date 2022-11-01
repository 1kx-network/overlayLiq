async function getOpenPositionFromEvents(events) {
    let openPositions = []
    for (event of events) {
        if (event.event == "Build") {
            // openPositions[`${event.args[1]}:${event.args[2].toString()}`] = {
            //     'address': event.args[1],
            //     'id': event.args[2].toString()
            // }
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
    console.log(`openPositions length ${openPositions.length}`)
    console.log(`openPositions ${openPositions}`)
    console.log(`openPositions[0] ${JSON.stringify(openPositions[0],null,2)}`)
    return openPositions

}

exports.getOpenPositionFromEvents = getOpenPositionFromEvents