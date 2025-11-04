// netlify/functions/verifyPayment.js
const crypto = require("crypto");

exports.handler = async function(event) {
  try {
    const { referenceId } = JSON.parse(event.body || "{}");

    if (!referenceId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing referenceId" }) };
    }

    const VA = process.env.IPAYMU_VA;
    const APIKEY = process.env.IPAYMU_APIKEY;
    const URL = process.env.IPAYMU_BASE_URL || "";

    const body = { referenceId };
    const jsonBody = JSON.stringify(body);
    
    // ✅ Format timestamp yang benar
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

    console.log("🔎 Verifying payment:", { referenceId });

    const res = await fetch(URL, { method: "POST", headers, body: jsonBody });
    const data = await res.json();

    console.log("✅ VerifyPayment result:", data);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("❌ verifyPayment error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
