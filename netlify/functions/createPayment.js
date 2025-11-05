// netlify/functions/createPayment.js
const crypto = require("crypto");

exports.handler = async function(event, context) {
  // ✅ GUNAKAN process.env LANGSUNG - SERVER ONLY
  const VA = process.env.IPAYMU_VA;
  const APIKEY = process.env.IPAYMU_APIKEY;
  const IPAYMU_URL = process.env.IPAYMU_BASE_URL;
  
  // ✅ HARCODE SITE_URL - tidak perlu env variable
  const SITE_URL = "https://babehipaymu.netlify.app";

  // Validasi environment variables
  if (!VA || !APIKEY || !IPAYMU_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server configuration error",
        message: "Payment service not properly configured"
      })
    };
  }

  try {
    const { amount } = JSON.parse(event.body || "{}");
    
    if (!amount || amount < 1000) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: "Amount minimum Rp 1.000" }) 
      };
    }

    const referenceId = "REF" + Date.now();
    const RETURN_URL = `${SITE_URL}/success.html`;
    const NOTIFY_URL = `${SITE_URL}/.netlify/functions/callback`;

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
    
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    const requestBodyHash = crypto.createHash('sha256').update(jsonBody).digest('hex').toLowerCase();
    const stringToSign = `POST:${VA}:${requestBodyHash}:${APIKEY}`;
    const signature = crypto.createHmac("sha256", APIKEY).update(stringToSign).digest("hex");

    const headers = {
      "Content-Type": "application/json",
      "va": VA,
      "signature": signature,
      "timestamp": timestamp
    };

    console.log("🚀 Sending to iPaymu...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(IPAYMU_URL, { 
        method: "POST", 
        headers, 
        body: jsonBody,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseText = await response.text();
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            error: "Invalid response from payment gateway",
            rawResponse: responseText
          })
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(data)
      };

    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return {
          statusCode: 408,
          body: JSON.stringify({ 
            error: "Payment gateway timeout",
            code: "TIMEOUT"
          })
        };
      }
      throw fetchError;
    }

  } catch (err) {
    console.error("❌ Payment error:", err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: "Payment creation failed",
        message: err.message
      }) 
    };
  }
};
