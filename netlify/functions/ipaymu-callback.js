// Simple in-memory storage untuk demo
const paymentStatus = new Map();

exports.handler = async (event) => {
    console.log('🔄 iPaymu Callback Received');
    console.log('📦 Method:', event.httpMethod); 

    // Handle GET requests untuk check status
    if (event.httpMethod === 'GET') {
        const referenceId = event.queryStringParameters?.reference_id;
        
        if (referenceId && paymentStatus.has(referenceId)) {
            return {
                statusCode: 200,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*' 
                },
                body: JSON.stringify({
                    success: true,
                    data: paymentStatus.get(referenceId)
                })
            };
        } else {
            return {
                statusCode: 404,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*' 
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Payment not found'
                })
            };
        }
    }

    // Handle POST requests (callback dari iPaymu)
    if (event.httpMethod === 'POST') {
        try {
            // Parse formdata dari iPaymu
            const params = new URLSearchParams(event.body);
            const callbackData = {
                trx_id: params.get('trx_id'),
                status: params.get('status'),
                status_code: params.get('status_code'),
                sid: params.get('sid'),
                reference_id: params.get('reference_id'),
                received_at: new Date().toISOString(),
                site_url: process.env.NETLIFY_SITE_URL || 'unknown'
            };

            console.log('📦 Parsed Callback Data:', callbackData);

            const { trx_id, status, status_code, sid, reference_id } = callbackData;

            // Validate required fields
            if (!reference_id) {
                console.error('❌ Missing reference_id');
                return {
                    statusCode: 400,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*' 
                    },
                    body: JSON.stringify({ error: 'Missing reference_id' })
                };
            }

            // Simpan status pembayaran
            paymentStatus.set(reference_id, callbackData);

            console.log(`✅ Payment status saved: ${reference_id} -> ${status}`);

            // Return success ke iPaymu
            return {
                statusCode: 200,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*' 
                },
                body: JSON.stringify({
                    success: true,
                    message: 'Callback processed successfully',
                    order_no: reference_id,
                    status: status,
                    processed_by: process.env.NETLIFY_SITE_URL || 'local'
                })
            };

        } catch (error) {
            console.error('❌ Callback processing error:', error);
            
            return {
                statusCode: 200,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*' 
                },
                body: JSON.stringify({
                    success: true,
                    message: 'Error logged but callback acknowledged'
                })
            };
        }
    }

    return {
        statusCode: 405,
        headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' 
        },
        body: JSON.stringify({ error: 'Method Not Allowed' })
    };
};
