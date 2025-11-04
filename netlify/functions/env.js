exports.handler = async function(event, context) {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            IPAYMU_BASE_URL: process.env.IPAYMU_BASE_URL,
            IPAYMU_APIKEY: process.env.IPAYMU_APIKEY ? '***' + process.env.IPAYMU_APIKEY.slice(-4) : null,
            IPAYMU_VA: process.env.IPAYMU_VA ? '***' + process.env.IPAYMU_VA.slice(-4) : null,
            NETLIFY_SITE_URL: process.env.NETLIFY_SITE_URL
        })
    };
};
