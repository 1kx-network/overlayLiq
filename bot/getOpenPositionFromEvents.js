const logger = require('ishan-logger')
async function getOpenPositionFromEvents(events) {
    let openPositions = []
    let liquidatedPositions =[]
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
            liquidatedPositions.push({
                "marketAddress": event.address,
                "address": event.args[1],
                "id": BigInt(event.args[2]).toString()
            })
        }
    }

    openPositions = openPositions.filter(x => !liquidatedPositions.includes(x))
    // @todo: loop thru event and remove position that were already liquidated and closed 
    let filtered_openPositions = []
    for(one_position of openPositions){
        const isFound = liquidatedPositions.some(element => {
            if (element.id === one_position.id && element.address === one_position.address  && element.marketAddress === one_position.marketAddress) {
              return true;
            }
            return false;
          });
          
        //   console.log(isFound); // 👉️ true
          
          if (!isFound) {
            filtered_openPositions.push(one_position)
          }
    }
    
    // logger.info(`filtered_openPositions[0] ${JSON.stringify(filtered_openPositions[0],null,2)}`)
    // logger.info(`openPositions[0] ${JSON.stringify(openPositions[0],null,2)}`)
    // logger.info(`liquidatedPositions[0] ${JSON.stringify(liquidatedPositions[0],null,2)}`)
    // logger.info(`openPositions length ${openPositions.length}`)
    // logger.info(`liquidatedPositions length ${liquidatedPositions.length}`)
    // logger.info(`filtered_openPositions length ${filtered_openPositions.length}`)
    return filtered_openPositions

}

exports.getOpenPositionFromEvents = getOpenPositionFromEvents