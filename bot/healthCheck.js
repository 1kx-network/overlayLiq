const axios = require("axios");

async function ping(url) {
    try {
        await axios.get(url, {
            timeout: 5000
        });
    } catch (error) {
        // Log the error and continue. A ping failure should
        // not prevent the job from running.
        console.error("Ping failed: " + error);
    }
}

async function runJob() {
    var pingUrl = `https://hc-ping.com/${process.env.HEALTHCHECKS_IO_ID}`;

    await ping(pingUrl + "/start");
    try {
        console.log("ping here");

        await ping(pingUrl); // success
    } catch (error) {
        await ping(pingUrl + "/fail");
    }
}

module.exports = {
    runJob
}