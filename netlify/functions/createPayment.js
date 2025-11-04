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
    const URL = process.env.IPAYMU_BASE_URL || "";
    const RETURN_URL = `${process.env.NETLIFY_SITE_URL || 'https://your-site.netlify.app'}/success.html`;
    const NOTIFY_URL = `${process.env.NETLIFY_SITE_URL || 'https://your-site.netlify.app'}/.netlify/functions/callback`;

    // Format body yang lebih sederhana sesuai dokumentasi iPaymu
    const body = {
      product: ["Test Product"],
      qty: [1],
      price: [parseInt(amount)],
      amount: parseInt(amount),
      returnUrl: RETURN_URL,
      notifyUrl: NOTIFY_URL,
      referenceId: "TEST" + Date.now(),
      paymentMethod: "qris",
      buyerName: "Test Customer",
      buyerEmail: "customer@test.com",
      buyerPhone: "08123456789"
    };

    console.log("📝 Request Body:", body);

    // Stringify TANPA spasi/tab (sangat penting!)
    const jsonBody = JSON.stringify(body).replace(/\s+/g, '');
    
    // Method untuk signature harus uppercase
    const method = "POST";
    
    // Buat string untuk signature - format: METHOD:VA:RequestBody:APIKEY
    const requestBody = crypto.createHash('md5').update(jsonBody).digest('hex');
    const stringToSign = `${method}:${VA}:${requestBody}:${APIKEY}`;
    
    console.log("🔐 String to sign:", stringToSign);

    const signature = crypto
      .createHmac("sha256", APIKEY)
      .update(stringToSign)
      .digest("hex");

    const timestamp = new Date().toISOString();

    const headers = {
      "Content-Type": "application/json",
      "va": VA,
      "signature": signature,
      "timestamp": timestamp
    };

    console.log("📤 Request Details:", {
      url: URL,
      va: VA,
      signature: signature.substring(0, 20) + "...",
      timestamp,
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
