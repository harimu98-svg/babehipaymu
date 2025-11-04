// Environment variables - bisa di-set di Netlify dashboard
const iPaymuConfig = {
    baseUrl: window.ENV?.IPAYMU_BASE_URL || '',
    apiKey: window.ENV?.IPAYMU_APIKEY || '',
    va: window.ENV?.IPAYMU_VA || '',
    
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
