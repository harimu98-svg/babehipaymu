// netlify/functions/callback.js

// Simple in-memory store (untuk demo)
// Untuk production, ganti dengan database (Supabase/Redis)
const paymentStatus = new Map();

exports.handler = async function(event) {
  try {
    console.log("📨 Callback Received - Headers:", event.headers);
    console.log("📨 Callback Received - Body:", event.body);

    // Handle both form-data and JSON
    let callbackData;
    
    if (event.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(event.body);
      callbackData = {
        trx_id: params.get('trx_id'),
        status: params.get('status'),
        status_code: params.get('status_code'),
        sid: params.get('sid'),
        reference_id: params.get('reference_id'),
        source: 'ipaymu_callback',
        timestamp: new Date().toISOString()
      };
    } else {
      try {
        callbackData = JSON.parse(event.body);
        callbackData.source = callbackData.source || 'manual_test';
        callbackData.timestamp = new Date().toISOString();
      } catch (e) {
        callbackData = { 
          raw: event.body, 
          source: 'unknown',
          timestamp: new Date().toISOString()
        };
      }
    }

    console.log("💳 iPaymu Callback Parsed:", JSON.stringify(callbackData, null, 2));

    // ✅ Simpan status ke storage
    if (callbackData.reference_id) {
      paymentStatus.set(callbackData.reference_id, {
        status: callbackData.status,
        status_code: callbackData.status_code,
        trx_id: callbackData.trx_id,
        sid: callbackData.sid,
        updated_at: callbackData.timestamp,
        source: callbackData.source
      });
      
      console.log(`💾 Status saved: ${callbackData.reference_id} = ${callbackData.status}`);
    }

    // 🎯 PROCESS BUSINESS LOGIC
    await processPaymentCallback(callbackData);

    return { 
      statusCode: 200, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        message: "Callback processed successfully",
        reference_id: callbackData.reference_id,
        status: callbackData.status
      }) 
    };
  } catch (err) {
    console.error("❌ Callback error:", err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: "Callback processing failed",
        message: err.message 
      }) 
    };
  }
};

// Business logic
async function processPaymentCallback(callbackData) {
  const { reference_id, status, trx_id, status_code } = callbackData;
  
  console.log(`🎯 Processing payment: ${reference_id} - Status: ${status}`);
  
  // TODO: Implement your business logic here
  // 1. Update database
  // 2. Send email notification
  // 3. Update inventory, etc.
  
  console.log(`✅ Business logic executed for: ${reference_id}`);
  return true;
}
