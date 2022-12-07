const logger = require('ishan-logger');
const {
    Telegraf
} = require('telegraf')

const bot = new Telegraf(process.env.TG_BOT_TOKEN);
const CHAT_ID = parseInt(process.env.CHAT_ID)

// sleep time expects milliseconds
function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

let timeTracker = parseInt(Date.now() / 1000) + 1000

function sendMessage(message, flag = 1) {
    let to = CHAT_ID
    logger.info(message)
    if (flag == 1) {
        try {
            message = message.length > 4000 ? '4000+ ' + message.slice(0, 4000) : message
            let timeBeingCalled = parseInt(Date.now() / 1000)
            sleep(timeTracker > timeBeingCalled ? timeTracker - timeBeingCalled : 1000).then(() => {
                bot.telegram.sendMessage(to, message)
            });
            timeTracker = timeTracker + 1000
        } catch (e) {
            logger.info(`telegram message error :\n${e}\nmessage: ${message}`)
        }
    }
}

module.exports = {
    sendMessage
}