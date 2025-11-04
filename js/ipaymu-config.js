// Environment variables dari Netlify
const iPaymuConfig = {
    baseUrl: window.ENV?.IPAYMU_BASE_URL || process.env.IPAYMU_BASE_URL || '',
    apiKey: window.ENV?.IPAYMU_APIKEY || process.env.IPAYMU_APIKEY,
    va: window.ENV?.IPAYMU_VA || process.env.IPAYMU_VA,
    
    // Callback URL ke Netlify Function
    callbackUrl: window.ENV?.NETLIFY_SITE_URL ? 
        `${window.ENV.NETLIFY_SITE_URL}/.netlify/functions/ipaymu-callback` : 
        (process.env.NETLIFY_SITE_URL ? 
            `${process.env.NETLIFY_SITE_URL}/.netlify/functions/ipaymu-callback` : 
            `${window.location.origin}/.netlify/functions/ipaymu-callback`),
    
    paymentMethod: 'qris',
    paymentChannel: 'mpm',
    expiryHours: 1
};

// Validasi config
if (!iPaymuConfig.apiKey || !iPaymuConfig.va) {
    console.error('❌ iPaymu configuration missing!');
    console.error('Please set IPAYMU_APIKEY and IPAYMU_VA environment variables');
} else {
    console.log('✅ iPaymu Config loaded successfully');
}

// Assign ke window object
window.iPaymuConfig = iPaymuConfig;

console.log('🔗 Callback URL:', iPaymuConfig.callbackUrl);
console.log('🔑 VA:', iPaymuConfig.va ? '***' + iPaymuConfig.va.slice(-4) : 'NOT SET');
console.log('🏦 Base URL:', iPaymuConfig.baseUrl);
