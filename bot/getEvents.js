//0x000000000000000000000000608f0cade420e14b35b6f494867f302e78149d8a
// ethers.utils.id("Build(address,uint256,uint256,uint256,bool,uint256)")
const logger = require('ishan-logger')
const ethers = require('ethers')
const abi_OVL_MARKET = require('../abis/OVL_MARKET.json')

const axios = require('axios');
const iface = new ethers.utils.Interface(abi_OVL_MARKET)

async function getEvents(address_market) {
    var data = JSON.stringify({
        "method": "eth_getLogs",
        "params": [{
            "fromBlock": "0x0",
            "toBlock": "latest",
            "address": address_market
        }],
        "id": 53,
        "jsonrpc": "2.0"
    });

    var config = {
        method: 'post',
        url: process.env.ARCHIVE_POKT_NODE_URL,
        headers: {
            'Content-Type': 'application/json'
        },
        data: data
    };
    let result =  await axios(config)
    let events = result.data.result
    let modifyEvents = []
    for(let event of events){
        let parseLog = iface.parseLog({ data: event.data, topics: event.topics })
        event.event = parseLog.name
        event.args = parseLog.args
        modifyEvents.push(event)

    }
    return modifyEvents
}
module.exports = {
    getEvents
}

