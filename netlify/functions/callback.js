// netlify/functions/callback.js

// Global storage untuk semua functions - shared memory
if (typeof global.paymentCallbacks === 'undefined') {
  global.paymentCallbacks = new Map();
}
const paymentCallbacks = global.paymentCallbacks;

// ✅ CORRECT: exports.handler untuk Netlify Functions
exports.handler = async function(event, context) {
  try {
    console.log("📨 Callback Received - Method:", event.httpMethod);
    console.log("📨 Callback Received - Headers:", JSON.stringify(event.headers, null, 2));
    console.log("📨 Callback Received - Body:", event.body);

    let callbackData;

    // Handle form-data (format production iPaymu)
    if (event.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(event.body);
      callbackData = {
        trx_id: params.get('trx_id'),
        status: params.get('status'),
        status_code: params.get('status_code'),
        sid: params.get('sid'),
        reference_id: params.get('reference_id'),
        amount: params.get('amount'),
        paid_at: params.get('paid_at'),
        sub_total: params.get('sub_total'),
        total: params.get('total'),
        fee: params.get('fee'),
        paid_off: params.get('paid_off'),
        created_at: params.get('created_at'),
        expired_at: params.get('expired_at'),
        settlement_status: params.get('settlement_status'),
        via: params.get('via'),
        channel: params.get('channel'),
        buyer_name: params.get('buyer_name'),
        buyer_email: params.get('buyer_email'),
        buyer_phone: params.get('buyer_phone'),
        source: 'ipaymu_production'
      };
    } 
    // Handle JSON body (dari iPaymu Callback Simulation)
    else if (event.headers['content-type']?.includes('application/json')) {
      callbackData = JSON.parse(event.body);
      callbackData.source = 'ipaymu_simulation';
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

    // ✅ Simpan callback data ke shared storage
    if (callbackData.reference_id) {
      paymentCallbacks.set(callbackData.reference_id, {
        ...callbackData,
        received_at: new Date().toISOString(),
        processed: true
      });
      
      console.log(`💾 Callback saved: ${callbackData.reference_id} = ${callbackData.status}`);
      console.log(`📊 Total stored callbacks: ${paymentCallbacks.size}`);
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
        amount: callbackData.amount,
        stored: true,
        timestamp: new Date().toISOString()
      }) 
    };
  } catch (err) {
    console.error("❌ Callback error:", err);
    return { 
      statusCode: 500, 
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: "Callback processing failed",
        message: err.message,
        timestamp: new Date().toISOString()
      }) 
    };
  }
};

// Business logic
async function processPaymentCallback(callbackData) {
  const { reference_id, status, amount, paid_at } = callbackData;
  
  console.log(`🎯 Processing business logic: ${reference_id} - ${status} - ${amount}`);
  
  // TODO: Implement your business logic here
  // 1. Update database
  // 2. Send email notification
  // 3. Update inventory, etc.
  
  if (status === 'berhasil') {
    console.log(`💰 Payment successful: ${reference_id} - Amount: ${amount} - Paid at: ${paid_at}`);
    // await sendSuccessEmail(reference_id);
    // await updateOrderStatus(reference_id, 'paid');
  }
  
  console.log(`✅ Business logic executed for: ${reference_id}`);
  return true;
}

// Function untuk check status (optional - bisa digunakan oleh function lain)
exports.getCallbackStatus = function(referenceId) {
  return paymentCallbacks.get(referenceId);
};
