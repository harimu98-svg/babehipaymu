// netlify/functions/callback.js
exports.handler = async function(event) {
  try {
    // iPaymu mengirim data sebagai form-data, bukan JSON
    const params = new URLSearchParams(event.body);
    const callbackData = {
      trx_id: params.get('trx_id'),
      status: params.get('status'),
      status_code: params.get('status_code'),
      sid: params.get('sid'),
      reference_id: params.get('reference_id')
    };

    console.log("💳 iPaymu Callback Received:", callbackData);

    // TODO: Update status transaksi di database berdasarkan reference_id
    // await updateTransactionStatus(callbackData.reference_id, callbackData.status);

    return { 
      statusCode: 200, 
      body: JSON.stringify({ message: "Callback processed successfully" }) 
    };
  } catch (err) {
    console.error("❌ Callback error:", err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: "Callback processing failed" }) 
    };
  }
};
