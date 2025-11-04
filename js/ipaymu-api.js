class IpaymuAPI {
    constructor() {
        this.config = window.iPaymuConfig;
    }

    generateSignature(body, timestamp) {
        try {
            const formattedTimestamp = timestamp.replace(/[-:T]/g, '').replace(/\.\d{3}Z$/, '');
            const requestBody = body ? JSON.stringify(body) : '';
            const requestBodyHash = CryptoJS.SHA256(requestBody).toString(CryptoJS.enc.Hex).toLowerCase();
            const stringToSign = `POST:${this.config.va}:${requestBodyHash}:${this.config.apiKey}`;
            const signature = CryptoJS.HmacSHA256(stringToSign, this.config.apiKey).toString(CryptoJS.enc.Hex);
            
            console.log('🔐 Signature generated');
            return signature;
        } catch (error) {
            console.error('❌ Signature error:', error);
            throw error;
        }
    }

    async createPayment(paymentData) {
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

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ iPaymu API error:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ iPaymu response:', result);

            if (result.Status !== 200) {
                throw new Error(result.Message || 'Payment creation failed');
            }

            return result.Data;

        } catch (error) {
            console.error('❌ iPaymu API error:', error);
            throw error;
        }
    }

    async checkPaymentStatus(referenceId) {
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
}

// Global instance
window.iPaymuAPI = new IpaymuAPI();