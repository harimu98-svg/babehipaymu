class IpaymuService {
    constructor() {
        this.isReady = false;
        this.initialize();
    }

    
    async initialize() {
        try {
            console.log('🔄 Initializing iPaymuService...');
            
            // Pastikan config sudah loaded
            if (!window.iPaymuConfig) {
                console.error('❌ iPaymuConfig not found!');
                throw new Error('iPaymuConfig not initialized');
            }

            // Tunggu sampai config memiliki values yang diperlukan
            await this.waitForConfig();
            
            this.config = window.iPaymuConfig;
            this.isReady = true;
            
            console.log('🎯 iPaymuService initialized successfully');
            console.log('🔑 Config:', {
                baseUrl: this.config.baseUrl,
                va: this.config.va ? '***' + this.config.va.slice(-4) : 'MISSING',
                key: this.config.key ? '***' + this.config.key.slice(-4) : 'MISSING'
            });
            
        } catch (error) {
            console.error('❌ iPaymuService initialization failed:', error);
            this.isReady = false;
        }
    }

    waitForConfig() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 detik (100ms * 50)
            
            const checkConfig = () => {
                attempts++;
                
                if (window.iPaymuConfig && 
                    window.iPaymuConfig.key && 
                    window.iPaymuConfig.va) {
                    console.log('✅ Config ready after', attempts, 'attempts');
                    resolve();
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    reject(new Error('Config not ready after max attempts'));
                    return;
                }
                
                setTimeout(checkConfig, 100);
            };
            
            checkConfig();
        });
    }

    generateSignature(body, timestamp) {
        if (!this.isReady) {
            throw new Error('Service not ready');
        }

        try {
            const formattedTimestamp = timestamp.replace(/[-:T]/g, '').replace(/\.\d{3}Z$/, '');
            const requestBody = body ? JSON.stringify(body) : '';
            const requestBodyHash = CryptoJS.SHA256(requestBody).toString(CryptoJS.enc.Hex).toLowerCase();
            const stringToSign = `POST:${this.config.va}:${requestBodyHash}:${this.config.key}`;
            const signature = CryptoJS.HmacSHA256(stringToSign, this.config.key).toString(CryptoJS.enc.Hex);
            
            console.log('🔐 Signature generated');
            return signature;
        } catch (error) {
            console.error('❌ Signature error:', error);
            throw error;
        }
    }

    async createPayment(paymentData) {
        if (!this.isReady) {
            throw new Error('iPaymuService not ready. Please wait...');
        }

        try {
            console.log('🔄 Creating iPaymu payment...');
            
            const timestamp = new Date().toISOString();
            const formattedTimestamp = timestamp.replace(/[-:T]/g, '').replace(/\.\d{3}Z$/, '');
            
            const payload = {
                name: paymentData.name || 'Test Customer',
                phone: paymentData.phone || '081234567890',
                email: paymentData.email || 'test@babehbarbershop.com',
                amount: paymentData.amount,
                referenceId: paymentData.referenceId,
                paymentMethod: this.config.paymentMethod,
                paymentChannel: this.config.paymentChannel,
                notifyUrl: this.config.callbackUrl,
                expired: this.config.expiryHours,
                comments: `Test payment ${paymentData.referenceId}`,
                product: ['Test Product'],
                qty: [1],
                price: [paymentData.amount]
            };

            console.log('📦 Payload:', payload);

            // Generate signature
            const signature = this.generateSignature(payload, timestamp);
            
            console.log('🔐 Making service request to:', `${this.config.baseUrl}/payment/direct`);
            
            const response = await fetch(`${this.config.baseUrl}/payment/direct`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'va': this.config.va,
                    'signature': signature,
                    'timestamp': formattedTimestamp
                },
                body: JSON.stringify(payload)
            });

            console.log('📡 Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ iPaymu service error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ iPaymu response:', result);

            if (result.Status !== 200) {
                throw new Error(result.Message || 'Payment creation failed');
            }

            return result.Data;

        } catch (error) {
            console.error('❌ iPaymu service error:', error);
            throw error;
        }
    }

    async checkPaymentStatus(referenceId) {
        if (!this.isReady) {
            throw new Error('iPaymuService not ready');
        }

        try {
            console.log('🔄 Checking payment status for:', referenceId);
            
            const response = await fetch(`${this.config.callbackUrl}?reference_id=${referenceId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('❌ Status check error:', error);
            throw error;
        }
    }

    // Method untuk check readiness
    isServiceReady() {
        return this.isReady;
    }
}

// Global instance - TUNDA INISIALISASI SAMPAI SEMUA COMPONENT READY
function initializeIpaymuService() {
    if (!window.iPaymuService) {
        console.log('🔄 Initializing iPaymuService...');
        window.iPaymuService = new IpaymuService();
    }
    return window.iPaymuService;
}

// Auto initialize ketika semua ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeIpaymuService();
    }, 1000);
});
