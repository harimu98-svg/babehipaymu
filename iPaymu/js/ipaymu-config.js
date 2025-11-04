// Environment variables - bisa di-set di Netlify dashboard
const iPaymuConfig = {
    baseUrl: window.ENV?.IPAYMU_BASE_URL || 'https://sandbox.ipaymu.com/api/v2',
    apiKey: window.ENV?.IPAYMU_APIKEY || 'SANDBOX587AE7DE-8F83-4D2A-981C-CC6A32140110',
    va: window.ENV?.IPAYMU_VA || '0000000811159429',
    
    // Callback URL ke Netlify Function
    callbackUrl: window.ENV?.NETLIFY_SITE_URL ? 
        `${window.ENV.NETLIFY_SITE_URL}/.netlify/functions/ipaymu-callback` : 
        `${window.location.origin}/.netlify/functions/ipaymu-callback`,
    
    paymentMethod: 'qris',
    paymentChannel: 'mpm',
    expiryHours: 1
};

console.log('✅ iPaymu Config loaded');
console.log('🔗 Callback URL:', iPaymuConfig.callbackUrl);