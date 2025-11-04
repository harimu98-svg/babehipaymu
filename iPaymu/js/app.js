let currentReferenceId = null;
let currentSessionId = null;
let statusInterval = null;

function log(message) {
    const logContent = document.getElementById('logContent');
    const timestamp = new Date().toLocaleTimeString();
    logContent.innerHTML = `[${timestamp}] ${message}<br>` + logContent.innerHTML;
}

async function createPayment() {
    try {
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

        const result = await window.iPaymuAPI.createPayment(paymentData);
        
        log(`✅ Pembayaran dibuat: ${result.SessionId}`);
        log(`🔗 Payment No: ${result.PaymentNo}`);
        
        currentSessionId = result.SessionId;

        // Show QR Code
        showQRCode(result, amount);

    } catch (error) {
        log(`❌ Error: ${error.message}`);
        alert('Error: ' + error.message);
        document.getElementById('payButton').disabled = false;
        document.getElementById('payButton').textContent = '💳 Buat Pembayaran QRIS';
    }
}

function showQRCode(paymentResult, amount) {
    document.getElementById('paymentForm').classList.add('hidden');
    document.getElementById('qrDisplay').classList.remove('hidden');
    
    document.getElementById('displayAmount').textContent = new Intl.NumberFormat('id-ID').format(amount);
    document.getElementById('displayOrderId').textContent = currentReferenceId;
    document.getElementById('displaySessionId').textContent = currentSessionId;

    // Generate QR code image (gunakan payment number atau session ID)
    const qrContent = paymentResult.PaymentNo || currentSessionId;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrContent)}`;
    
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
        
        const statusResult = await window.iPaymuAPI.checkPaymentStatus(currentReferenceId);
        
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
                
                // Auto redirect atau show success message
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
    clearInterval(statusInterval);
    currentReferenceId = null;
    currentSessionId = null;
    
    document.getElementById('qrDisplay').classList.add('hidden');
    document.getElementById('paymentForm').classList.remove('hidden');
    document.getElementById('payButton').disabled = false;
    document.getElementById('payButton').textContent = '💳 Buat Pembayaran QRIS';
    
    log('🔄 Form direset');
}

// Initialize
log('🚀 iPaymu Test App Ready');
log(`🔗 Callback URL: ${window.iPaymuConfig.callbackUrl}`);