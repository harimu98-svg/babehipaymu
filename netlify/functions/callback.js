// netlify/functions/callback.js

// Global storage
if (typeof global.paymentCallbacks === 'undefined') {
  global.paymentCallbacks = new Map();
}
const paymentCallbacks = global.paymentCallbacks;

exports.handler = async function(event, context) {
  // ✅ HANDLE CHECK STATUS REQUEST (Polling dari frontend)
  if (event.httpMethod === 'POST' && event.path.includes('/check-status')) {
    try {
      const { referenceId } = JSON.parse(event.body || "{}");

      if (!referenceId) {
        return { 
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: "Missing referenceId" }) 
        };
      }

      console.log(`🔍 Checking status for: ${referenceId}`);
      
      // Check callback data dari shared storage
      const callbackData = paymentCallbacks.get(referenceId);
      
      if (callbackData) {
        console.log(`✅ Status found: ${referenceId} = ${callbackData.status}`);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            exists: true,
            source: 'callback',
            status: callbackData.status,
            status_code: callbackData.status_code,
            reference_id: callbackData.reference_id,
            amount: callbackData.amount,
            paid_at: callbackData.paid_at,
            received_at: callbackData.received_at,
            trx_id: callbackData.trx_id
          })
        };
      } else {
        console.log(`⏳ No callback yet: ${referenceId}`);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            exists: false,
            reference_id: referenceId,
            status: 'pending'
          })
        };
      }

    } catch (err) {
      console.error("❌ Check status error:", err);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: err.message })
      };
    }
  }

  // ✅ HANDLE CALLBACK REQUEST (Dari iPaymu)
  try {
    console.log("📨 Callback Received - Method:", event.httpMethod);
    console.log("📨 Callback Received - Body:", event.body);

    let callbackData;

    // Handle form-data
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
    // Handle JSON
    else if (event.headers['content-type']?.includes('application/json')) {
      callbackData = JSON.parse(event.body);
      callbackData.source = 'ipaymu_simulation';
    } else {
      try {
        callbackData = JSON.parse(event.body);
        callbackData.source = 'auto_detected';
      } catch (e) {
        callbackData = { raw: event.body, source: 'unknown' };
      }
    }

    console.log("💳 iPaymu Callback Parsed:", JSON.stringify(callbackData, null, 2));

    // ✅ Simpan ke storage
    if (callbackData.reference_id) {
      paymentCallbacks.set(callbackData.reference_id, {
        ...callbackData,
        received_at: new Date().toISOString(),
        processed: true
      });
      console.log(`💾 Callback saved: ${callbackData.reference_id} = ${callbackData.status}`);
      console.log(`📊 Total stored: ${paymentCallbacks.size}`);
    }

    // 🎯 Business logic
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
        data: callbackData,
        reference_id: callbackData.reference_id,
        status: callbackData.status,
        amount: callbackData.amount,
        paid_at: callbackData.paid_at,
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

async function processPaymentCallback(callbackData) {
  const { reference_id, status, amount } = callbackData;
  console.log(`🎯 Processing: ${reference_id} - ${status} - ${amount}`);
  
  if (status === 'berhasil') {
    console.log(`💰 Payment successful: ${reference_id} - Amount: ${amount}`);
  }
  
  return true;
}
