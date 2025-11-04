// netlify/functions/getPaymentStatus.js
const paymentStatus = new Map(); // Same store as callback.js

exports.handler = async function(event) {
  try {
    const { referenceId } = JSON.parse(event.body || "{}");

    if (!referenceId) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: "Missing referenceId" }) 
      };
    }

    // Check local storage first
    const localStatus = paymentStatus.get(referenceId);
    
    if (localStatus) {
      console.log(`📊 Status from local: ${referenceId} = ${localStatus.status}`);
      return {
        statusCode: 200,
        body: JSON.stringify({
          source: 'local_storage',
          status: localStatus.status,
          status_code: localStatus.status_code,
          trx_id: localStatus.trx_id,
          updated_at: localStatus.updated_at,
          reference_id: referenceId
        })
      };
    }

    // If not in local storage, check iPaymu API
    console.log(`🔍 Status not in local, checking iPaymu API: ${referenceId}`);
    
    // Fallback to verifyPayment function
    const verifyResponse = await fetch(`${process.env.URL || event.headers.host}/.netlify/functions/verifyPayment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referenceId })
    });
    
    const verifyData = await verifyResponse.json();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        source: 'ipaymu_api',
        ...verifyData
      })
    };

  } catch (err) {
    console.error("❌ getPaymentStatus error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
