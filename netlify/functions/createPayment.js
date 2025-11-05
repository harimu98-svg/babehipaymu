// netlify/functions/createPayment.js
const crypto = require("crypto");

exports.handler = async function(event, context) {
  // ✅ CACHE untuk environment variables
  const VA = process.env.IPAYMU_VA;
  const APIKEY = process.env.IPAYMU_APIKEY;
  const URL = process.env.IPAYMU_BASE_URL || "";
  const SITE_URL = process.env.NETLIFY_SITE_URL || 'https://babehipaymu.netlify.app';

  try {
    const { amount } = JSON.parse(event.body || "{}");

    if (!amount) {
      return { 
        statusCode: 400, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: "Missing amount" }) 
      };
    }

    // ✅ PREPARE DATA SEBELUM TIMEOUT
    const referenceId = "REF" + Date.now();
    const RETURN_URL = `${SITE_URL}/success.html`;
    const NOTIFY_URL = `${SITE_URL}/.netlify/functions/callback`;

    // ✅ OPTIMIZED BODY - minimal fields required
    const body = {
      name: "Customer",
      phone: "081234567890", 
      email: "customer@email.com",
      amount: parseInt(amount),
      notifyUrl: NOTIFY_URL,
      referenceId: referenceId,
      paymentMethod: "qris",
      expired: 24,
      expiredType: "hours"
    };

    const jsonBody = JSON.stringify(body);
    
    // ✅ OPTIMIZED TIMESTAMP - reuse Date object
    const now = new Date();
    const timestamp = 
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    // ✅ OPTIMIZED SIGNATURE - single pass
    const requestBodyHash = crypto.createHash('sha256').update(jsonBody).digest('hex').toLowerCase();
    const stringToSign = `POST:${VA}:${requestBodyHash}:${APIKEY}`;
    const signature = crypto.createHmac("sha256", APIKEY).update(stringToSign).digest("hex");

    const headers = {
      "Content-Type": "application/json",
      "va": VA,
      "signature": signature,
      "timestamp": timestamp
    };

    console.log("🚀 Sending optimized request to iPaymu");

    // ✅ OPTIMIZED FETCH dengan timeout pendek
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 detik timeout

    try {
      const startTime = Date.now();
      
      const response = await fetch(URL, { 
        method: "POST", 
        headers, 
        body: jsonBody,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      console.log(`⏱️ iPaymu response time: ${responseTime}ms`);

      const responseText = await response.text();
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: "Invalid JSON from iPaymu",
            rawResponse: responseText
          })
        };
      }

      // ✅ RETURN IMMEDIATELY - jangan proses tambahan
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        return {
          statusCode: 408,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: "iPaymu API timeout - please try again",
            code: "TIMEOUT"
          })
        };
      }
      throw fetchError;
    }

  } catch (err) {
    console.error("❌ iPaymu error:", err);
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: "Payment creation failed",
        message: err.message
      }) 
    };
  }
};
