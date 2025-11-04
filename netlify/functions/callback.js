// netlify/functions/callback.js

// Simple in-memory store untuk demo
// Untuk production, gunakan database (Supabase/Redis)
const paymentCallbacks = new Map();

exports.handler = async function(event) {
  try {
    console.log("📨 Callback Received - Headers:", event.headers);
    console.log("📨 Callback Received - Body:", event.body);

    let callbackData;

    // Handle JSON body (dari iPaymu Callback Simulation)
    if (event.headers['content-type']?.includes('application/json')) {
      callbackData = JSON.parse(event.body);
      callbackData.source = 'ipaymu_simulation';
    } 
    // Handle form-data (production)
    else if (event.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(event.body);
      callbackData = {
        trx_id: params.get('trx_id'),
        status: params.get('status'),
        status_code: params.get('status_code'),
        sid: params.get('sid'),
        reference_id: params.get('reference_id'),
        amount: params.get('amount'),
        paid_at: params.get('paid_at'),
        source: 'ipaymu_production'
      };
    } else {
      // Try to parse as JSON
      try {
        callbackData = JSON.parse(event.body);
        callbackData.source = 'auto_detected';
      } catch (e) {
        callbackData = { 
          raw: event.body, 
          source: 'unknown'
        };
      }
    }

    console.log("💳 iPaymu Callback Parsed:", JSON.stringify(callbackData, null, 2));

    // ✅ Simpan callback data untuk frontend
    if (callbackData.reference_id) {
      paymentCallbacks.set(callbackData.reference_id, {
        ...callbackData,
        received_at: new Date().toISOString(),
        processed: true
      });
      
      console.log(`💾 Callback saved: ${callbackData.reference_id} = ${callbackData.status}`);
    }

    // 🎯 PROCESS BUSINESS LOGIC
    await processPaymentCallback(callbackData);

    return { 
      statusCode: 200, 
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        success: true, 
        message: "Callback processed successfully",
        reference_id: callbackData.reference_id,
        status: callbackData.status,
        stored: true
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
  const { reference_id, status, amount } = callbackData;
  
  console.log(`🎯 Processing business logic: ${reference_id} - ${status} - ${amount}`);
  
  // TODO: Implement your business logic here
  // 1. Update database
  // 2. Send email notification
  // 3. Update inventory, etc.
  
  if (status === 'berhasil') {
    console.log(`💰 Payment successful: ${reference_id} - Amount: ${amount}`);
    // await sendSuccessEmail(reference_id);
    // await updateOrderStatus(reference_id, 'paid');
  }
  
  console.log(`✅ Business logic executed for: ${reference_id}`);
  return true;
}

// Function untuk frontend check status (optional, hanya untuk manual check)
exports.getCallbackStatus = async function(referenceId) {
  return paymentCallbacks.get(referenceId);
};
