// Environment variables untuk browser - HANYA gunakan window.ENV
const iPaymuConfig = {
    // Default values - akan di-override oleh window.ENV dari Netlify Function
    baseUrl: 'https://sandbox.ipaymu.com/payment/v2',
    key: null, // Wajib dari environment
    va: null, // Wajib dari environment
    
    // Callback URL ke Netlify Function
    callbackUrl: `${window.location.origin}/.netlify/functions/ipaymu-callback`,
    
    paymentMethod: 'qris',
    paymentChannel: 'mpm',
    expiryHours: 1
};

// Function untuk update config dengan values dari Netlify
function updateConfigFromEnvironment(envData) {
    if (envData.IPAYMU_URL) {
        iPaymuConfig.baseUrl = envData.IPAYMU_URL;
    }
    if (envData.IPAYMU_KEY) {
        iPaymuConfig.key = envData.IPAYMU_KEY;
    }
    if (envData.IPAYMU_VA) {
        iPaymuConfig.va = envData.IPAYMU_VA;
    }
    if (envData.SITE_URL) {
        iPaymuConfig.callbackUrl = `${envData.SITE_URL}/.netlify/functions/ipaymu-callback`;
    }
    
    console.log('🔄 Config updated from environment');
}

// Validasi config
function validateConfig() {
    const errors = [];
    
    if (!iPaymuConfig.key) {
        errors.push('IPAYMU_KEY is required');
    }
    
    if (!iPaymuConfig.va) {
        errors.push('IPAYMU_VA is required');
    }
    
    if (errors.length > 0) {
        console.error('❌ iPaymu configuration errors:', errors);
        return false;
    }
    
    console.log('✅ iPaymu Config loaded successfully');
    return true;
}

// Assign ke window object
window.iPaymuConfig = iPaymuConfig;
window.updateIpaymuConfig = updateConfigFromEnvironment;

console.log('🔗 Initial Callback URL:', iPaymuConfig.callbackUrl);
console.log('🔑 VA:', iPaymuConfig.va ? '***' + iPaymuConfig.va.slice(-4) : 'NOT SET');
console.log('🔑 Key:', iPaymuConfig.key ? '***' + iPaymuConfig.key.slice(-4) : 'NOT SET');
console.log('🏦 Base URL:', iPaymuConfig.baseUrl);
