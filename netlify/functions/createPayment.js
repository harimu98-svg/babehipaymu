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
    const RETURN_URL = `${process.env.NETLIFY_SITE_URL}/success.html`;
    const NOTIFY_URL = `${process.env.NETLIFY_SITE_URL}/.netlify/functions/callback`;

    // iPaymu signature
    const body = {
      product: ["QRIS Payment"],
      qty: ["1"],
      price: [amount],
      amount,
      returnUrl: RETURN_URL,
      notifyUrl: NOTIFY_URL,
      referenceId: "INV" + Date.now(),
      paymentMethod: "qris",
      buyerName: "Tester",
    };

    const jsonBody = JSON.stringify(body);
    const signature = crypto
      .createHmac("sha256", APIKEY)
      .update(VA + jsonBody + APIKEY)
      .digest("hex");

    const headers = {
      "Content-Type": "application/json",
      va: VA,
      signature,
      timestamp: Date.now().toString(),
    };

    console.log("📤 Sending to iPaymu:", { URL, body, headers: { ...headers, signature: "***" } });

    const res = await fetch(URL, { method: "POST", headers, body: jsonBody });
    const data = await res.json();

    console.log("📥 iPaymu response:", data);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("❌ iPaymu error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
