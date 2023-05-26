# Overlay Liquidation 

# Gravita Liq BOT

liquidation bot that sends transaction whenenver a position is liquidatable 

### Goal:

- liquidate positions for multiple markets on overlay
- portfolio support for overlay (find out areas of improvement, make sure positions are liq etc)

### Process:
- run the following everyblock
- get all positions (do it every 2mins async in background) 
- check if any of pos liquidatable and and generate txns
- send txns privately with ethereumUtils.js

# create `.env` file 
```shell
NETWORK="mainnet"

PRI_KEY=""
PUB_KEY=""

FB_PRI_KEY=""
FB_PUB_KEY=""

ADDRESS_SC=""
ADDRESS_FLSC=""

ARCHIVE_NODE_URL=""
ARCHIVE_POKT_NODE_URL=""
NODE_URL=""
```
# update `config.mainnet.json` file with market addresses

### run liq bot 
```shell
npm i
NETWORK=mainnet node bot/index.js
```

# Overlay Funding Rate Bot (WIP)

### Hardhat test for execute batched calls smart contract
```shell
npm i
npx hardhat test test/0_executeCalls.test.js
```
### Hardhat test for execute batched calls smart contract for Liquidation
```shell
npm i
npx hardhat test test/1_overlay.test.js
```
