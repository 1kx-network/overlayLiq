// Reimplementation of Python example https://github.com/grafana/cloud-graphite-scripts/blob/master/send/main.py
const axios = require('axios');
const publishHeartbeat = ({
    botName
}) => {
    const grafanaUrl = process.env["GRAFANA_URL"];
    const apiKey = process.env["GRAFANA_API_KEY"];

    if (!grafanaUrl || !apiKey) {
        console.error(
            "Skipping metrics as GRAFANA_* environment variables not set"
        );
        return;
    }

    axios
        .post(
            grafanaUrl,
            [{
                name: `bots.${botName}.heartbeat`,
                metric: `bots.${botName}.heartbeat`,
                value: 1,
                interval: 60,
                time: Math.floor(Date.now() / 1000),
            }, ], {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                },
            }
        )
        .then(() => {})
        .catch((reason) => {
            console.error("Error publishing metrics");
        });
};
module.exports = {
    publishHeartbeat
}