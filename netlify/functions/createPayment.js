// netlify/functions/createPayment.js
const crypto = require("crypto");

exports.handler = async function(event) {
  try {
    const { amount } = JSON.parse(event.body || "{}");

    if (!amount) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing amount" }) };
    }

    const VA = process.env.IPAYMU_VA;
    const APIKEY = process.env.IPAYMU_APIKEY;
    const URL = process.env.IPAYMU_BASE_URL || "https://sandbox.ipaymu.com/api/v2/payment/direct";
    const RETURN_URL = `${process.env.NETLIFY_SITE_URL || 'https://your-site.netlify.app'}/success.html`;
    const NOTIFY_URL = `${process.env.NETLIFY_SITE_URL || 'https://your-site.netlify.app'}/.netlify/functions/callback`;

    // Format body sesuai dokumentasi
    const body = {
      name: "Test Customer",
      phone: "081234567890",
      email: "test@email.com",
      amount: parseInt(amount),
      notifyUrl: NOTIFY_URL,
      referenceId: "REF" + Date.now(),
      paymentMethod: "qris", // QRIS payment
      expired: 24,
      expiredType: "hours",
      comments: "Payment Test"
    };

    const jsonBody = JSON.stringify(body);
    
    // ✅ Format timestamp yang benar: YYYYMMDDhhmmss
    const now = new Date();
    const timestamp = 
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    // ✅ Format signature yang benar
    const requestBodyHash = crypto.createHash('sha256').update(jsonBody).digest('hex').toLowerCase();
    const stringToSign = `POST:${VA}:${requestBodyHash}:${APIKEY}`;
    
    console.log("🔐 String to sign:", stringToSign);

    const signature = crypto
      .createHmac("sha256", APIKEY)
      .update(stringToSign)
      .digest("hex");

    const headers = {
      "Content-Type": "application/json",
      "va": VA,
      "signature": signature,
      "timestamp": timestamp
    };

    console.log("📤 Request Details:", {
      url: URL,
      va: VA,
      timestamp: timestamp,
      signature: signature.substring(0, 20) + "...",
      body: body
    });

    const response = await fetch(URL, { 
      method: "POST", 
      headers, 
      body: jsonBody 
    });
    
    const responseText = await response.text();
    console.log("📥 Raw Response:", responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { error: "Invalid JSON response", raw: responseText };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("❌ iPaymu error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
