// netlify/functions/createPayment.js
const crypto = require("crypto");

exports.handler = async function(event, context) {
  // ✅ SERVER-SIDE ENV VARS ONLY
  const VA = process.env.IPAYMU_VA;
  const APIKEY = process.env.IPAYMU_APIKEY;
  const IPAYMU_URL = process.env.IPAYMU_BASE_URL;
  
  // ✅ HARCODE - no env exposure
  const SITE_URL = "https://babehipaymu.netlify.app";

  // ✅ STRICT VALIDATION
  if (!VA || !APIKEY || !IPAYMU_URL) {
    console.error("❌ Missing environment variables");
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: "Payment service configuration error",
        message: "Please check server configuration"
      })
    };
  }

  try {
    const { amount } = JSON.parse(event.body || "{}");
    
    if (!amount || amount < 1000) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ 
          error: "Invalid amount",
          message: "Minimum payment amount is Rp 1.000" 
        }) 
      };
    }

    const referenceId = "REF" + Date.now();
    const RETURN_URL = `${SITE_URL}/success.html`;
    const NOTIFY_URL = `${SITE_URL}/.netlify/functions/callback`;

    // ✅ OPTIMIZED BODY
    const body = {
      name: "Customer",
      phone: "081234567890",
      email: "customer@email.com",
      amount: parseInt(amount),
      notifyUrl: NOTIFY_URL,
      referenceId: referenceId,
      paymentMethod: "qris",
      expired: 24,
      expiredType: "hours",
      comments: "QRIS Payment"
    };

    const jsonBody = JSON.stringify(body);
    
    // ✅ OPTIMIZED TIMESTAMP
    const now = new Date();
    const timestamp = 
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    // ✅ OPTIMIZED SIGNATURE
    const requestBodyHash = crypto.createHash('sha256').update(jsonBody).digest('hex').toLowerCase();
    const stringToSign = `POST:${VA}:${requestBodyHash}:${APIKEY}`;
    const signature = crypto.createHmac("sha256", APIKEY).update(stringToSign).digest("hex");

    const headers = {
      "Content-Type": "application/json",
      "va": VA,
      "signature": signature,
      "timestamp": timestamp
    };

    console.log("🚀 Creating payment:", { amount, referenceId });

    // ✅ OPTIMIZED FETCH dengan timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const startTime = Date.now();
      const response = await fetch(IPAYMU_URL, { 
        method: "POST", 
        headers, 
        body: jsonBody,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      const responseText = await response.text();
      console.log(`⏱️ iPaymu response (${responseTime}ms):`, responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ JSON parse error:", parseError);
        return {
          statusCode: 200,
          body: JSON.stringify({
            error: "Invalid response from payment gateway",
            rawResponse: responseText.substring(0, 200) + "..."
          })
        };
      }

      // ✅ RETURN CLEAN RESPONSE
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
          body: JSON.stringify({ 
            error: "Payment gateway timeout",
            message: "Please try again in a moment"
          })
        };
      }
      throw fetchError;
    }

  } catch (err) {
    console.error("❌ Payment creation error:", err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: "Payment creation failed",
        message: err.message
      }) 
    };
  }
};
