exports.handler = async function(event, context) {
    console.log('🌍 Environment function called');
    
    // Debug: log semua environment variables yang tersedia
    console.log('Available environment variables:', {
        IPAYMU_URL: process.env.IPAYMU_URL ? 'SET' : 'NOT SET',
        IPAYMU_KEY: process.env.IPAYMU_KEY ? 'SET' : 'NOT SET', 
        IPAYMU_VA: process.env.IPAYMU_VA ? 'SET' : 'NOT SET',
        SITE_URL: process.env.SITE_URL ? 'SET' : 'NOT SET',
        URL: process.env.URL ? 'SET' : 'NOT SET' 
    });
    
    // Return actual values dari Netlify environment
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            IPAYMU_URL: process.env.IPAYMU_URL || null,
            IPAYMU_KEY: process.env.IPAYMU_KEY || null, // Pastikan ini return value
            IPAYMU_VA: process.env.IPAYMU_VA || null,
            SITE_URL: process.env.SITE_URL || null,
            URL: process.env.URL || null
        })
    };
};
