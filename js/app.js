let currentReferenceId = null;
let currentSessionId = null;
let statusInterval = null;

// Load environment variables dari Netlify Function
async function loadEnvironment() {
    try {
        log('🌍 Loading environment variables from Netlify...');
        
        const response = await fetch('/.netlify/functions/env');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const envData = await response.json();
        
        console.log('🌍 Raw environment data:', envData);
        
        // Debug detail
        log(`📦 Environment check:`);
        log(`   - IPAYMU_URL: ${envData.IPAYMU_URL ? '✅ SET' : '❌ MISSING'}`);
        log(`   - IPAYMU_KEY: ${envData.IPAYMU_KEY ? '✅ SET (' + '***' + envData.IPAYMU_KEY.slice(-4) + ')' : '❌ MISSING'}`);
        log(`   - IPAYMU_VA: ${envData.IPAYMU_VA ? '✅ SET (' + '***' + envData.IPAYMU_VA.slice(-4) + ')' : '❌ MISSING'}`);
        log(`   - SITE_URL: ${envData.SITE_URL ? '✅ SET' : '❌ MISSING'}`);
        
        // Set window.ENV dengan values sebenarnya
        window.ENV = envData;
        
        // Update config dengan values dari Netlify
        if (window.updateIpaymuConfig) {
            window.updateIpaymuConfig(envData);
            log('✅ Config updated with environment values');
        } else {
            log('❌ updateIpaymuConfig function not found');
        }
        
        return true;
        
    } catch (error) {
        console.log('⚠️ Cannot load environment from Netlify:', error.message);
        log(`❌ Failed to load environment: ${error.message}`);
        log('💡 Make sure Netlify function is deployed correctly');
        
        // Fallback untuk development
        window.ENV = {
            IPAYMU_URL: 'https://sandbox.ipaymu.com/api/v2',
            IPAYMU_KEY: null,
            IPAYMU_VA: null,
            SITE_URL: window.location.origin
        };
        
        return false;
    }
}

function log(message) {
    const logContent = document.getElementById('logContent');
    const timestamp = new Date().toLocaleTimeString();
    logContent.innerHTML = `[${timestamp}] ${message}<br>` + logContent.innerHTML;
}

function showConfigStatus() {
    if (!window.iPaymuConfig) {
        log('❌ iPaymuConfig not loaded');
        return false;
    }
    
    const config = window.iPaymuConfig;
    const hasKey = !!config.key;
    const hasVa = !!config.va;
    
    log(`🔧 Config Status: ${hasKey && hasVa ? '✅ READY' : '❌ INCOMPLETE'}`);
    log(`   - Key: ${hasKey ? '***' + config.key.slice(-4) : 'MISSING'}`);
    log(`   - VA: ${hasVa ? '***' + config.va.slice(-4) : 'MISSING'}`);
    log(`   - Base URL: ${config.baseUrl}`);
    log(`   - Callback: ${config.callbackUrl}`);
    
    return hasKey && hasVa;
}

// Check jika service sudah ready
function isServiceReady() {
    return window.iPaymuService && window.iPaymuService.isServiceReady && window.iPaymuService.isServiceReady();
}

async function createPayment() {
    try {
        // Pastikan payment service sudah siap
        if (!isServiceReady()) {
            log('⏳ iPaymuService belum siap, tunggu sebentar...');
            
            // Coba initialize service
            if (window.initializeIpaymuService) {
                window.initializeIpaymuService();
            }
            
            setTimeout(createPayment, 2000);
            return;
        }

        // Validasi config
        if (!window.iPaymuConfig.key || !window.iPaymuConfig.va) {
            const errorMsg = '❌ Konfigurasi iPaymu belum lengkap.';
            alert(errorMsg);
            log(errorMsg);
            return;
        }

        const amount = document.getElementById('amount').value;
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;

        if (!amount || amount < 1000) {
            alert('Amount minimal Rp 1.000');
            return;
        }

        // Generate unique reference ID
        currentReferenceId = 'TEST_' + Date.now();
        
        log(`🔄 Membuat pembayaran: Rp ${amount} (${currentReferenceId})`);
        log(`🔗 Menggunakan callback: ${window.iPaymuConfig.callbackUrl}`);

        const paymentData = {
            amount: parseInt(amount),
            referenceId: currentReferenceId,
            name: name,
            phone: phone,
            email: email
        };

        const payButton = document.getElementById('payButton');
        payButton.disabled = true;
        payButton.textContent = 'Memproses...';

        const result = await window.iPaymuService.createPayment(paymentData);
        
        log(`✅ Pembayaran dibuat: ${result.SessionId}`);
        log(`🔗 Payment No: ${result.PaymentNo}`);
        
        currentSessionId = result.SessionId;

        // Show QR Code
        showQRCode(result, amount);

    } catch (error) {
        log(`❌ Error: ${error.message}`);
        alert('Error: ' + error.message);
        
        const payButton = document.getElementById('payButton');
        payButton.disabled = false;
        payButton.textContent = '💳 Buat Pembayaran QRIS';
    }
}

function showQRCode(paymentResult, amount) {
    document.getElementById('paymentForm').classList.add('hidden');
    document.getElementById('qrDisplay').classList.remove('hidden');
    
    document.getElementById('displayAmount').textContent = new Intl.NumberFormat('id-ID').format(amount);
    document.getElementById('displayOrderId').textContent = currentReferenceId;
    document.getElementById('displaySessionId').textContent = currentSessionId;

    // Generate QR code image
    const qrContent = paymentResult.PaymentNo || currentSessionId;
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrContent)}&size=200`;
    
    document.getElementById('qrImage').innerHTML = `<img src="${qrUrl}" alt="QR Code">`;

    // Start status polling
    startStatusPolling();
}

function startStatusPolling() {
    log('🔄 Memulai status polling...');
    
    // Check immediately
    checkStatus();
    
    // Check every 5 seconds
    statusInterval = setInterval(checkStatus, 5000);
}

async function checkStatus() {
    if (!currentReferenceId) return;

    try {
        log(`📊 Checking status: ${currentReferenceId}`);
        
        const statusResult = await window.iPaymuService.checkPaymentStatus(currentReferenceId);
        
        const statusDiv = document.getElementById('paymentStatus');
        
        if (statusResult.success && statusResult.data) {
            const paymentData = statusResult.data;
            
            statusDiv.className = 'status';
            statusDiv.innerHTML = `
                <strong>Status:</strong> ${paymentData.status}<br>
                <strong>TRX ID:</strong> ${paymentData.trx_id}<br>
                <strong>Received:</strong> ${new Date(paymentData.received_at).toLocaleTimeString()}
            `;

            if (paymentData.status === 'berhasil') {
                statusDiv.classList.add('success');
                log('🎉 PEMBAYARAN BERHASIL!');
                clearInterval(statusInterval);
                
                setTimeout(() => {
                    alert('Pembayaran berhasil! Terima kasih.');
                }, 1000);
            } else if (paymentData.status === 'pending') {
                statusDiv.classList.add('pending');
            } else if (paymentData.status === 'expired') {
                statusDiv.classList.add('error');
                log('❌ Pembayaran expired');
                clearInterval(statusInterval);
            }
        } else {
            statusDiv.className = 'status pending';
            statusDiv.innerHTML = 'Menunggu pembayaran... (belum ada callback)';
        }

    } catch (error) {
        log(`❌ Status check error: ${error.message}`);
    }
}

function resetForm() {
    if (statusInterval) {
        clearInterval(statusInterval);
    }
    currentReferenceId = null;
    currentSessionId = null;
    
    document.getElementById('qrDisplay').classList.add('hidden');
    document.getElementById('paymentForm').classList.remove('hidden');
    
    const payButton = document.getElementById('payButton');
    payButton.disabled = false;
    payButton.textContent = '💳 Buat Pembayaran QRIS';
    
    log('🔄 Form direset');
}

// Initialize ketika DOM ready
document.addEventListener('DOMContentLoaded', async function() {
    log('🚀 iPaymu Test App Initializing...');
    
    // Load environment variables terlebih dahulu
    const envLoaded = await loadEnvironment();
    
    // Tunggu sebentar untuk memastikan config ter-update
    setTimeout(() => {
        // Show config status
        const configReady = showConfigStatus();
        
        if (!configReady) {
            log('❌ APPLICATION NOT READY: Missing configuration');
            document.getElementById('payButton').disabled = true;
            document.getElementById('payButton').textContent = '❌ Setup Required';
        } else {
            log('✅ APPLICATION READY: Configuration complete');
            log('🎯 You can now create test payments');
            
            // Initialize service setelah config ready
            if (window.initializeIpaymuService) {
                window.initializeIpaymuService();
                log('🔄 iPaymuService initialization started...');
            }
        }
    }, 500);
});
