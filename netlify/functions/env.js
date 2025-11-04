exports.handler = async function(event, context) {
    // Return actual values (dalam production mungkin perlu masking)
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            IPAYMU_BASE_URL: process.env.IPAYMU_BASE_URL,
            IPAYMU_APIKEY: process.env.IPAYMU_APIKEY, // Return actual value untuk testing
            IPAYMU_VA: process.env.IPAYMU_VA, // Return actual value untuk testing
            NETLIFY_SITE_URL: process.env.NETLIFY_SITE_URL,
            URL: process.env.URL // Netlify auto environment variable
        })
    };
};
