// netlify/functions/createPayment.js
import crypto from "crypto";

export async function handler(event) {
  try {
    console.log("🔧 createPayment invoked");

    const { amount } = JSON.parse(event.body || "{}");
    if (!amount) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing amount" }) };
    }

    const VA = process.env.IPAYMU_VA;
    const APIKEY = process.env.IPAYMU_APIKEY;
    const BASE_URL = process.env.IPAYMU_BASE_URL || "";

    if (!VA || !APIKEY || !BASE_URL) {
      console.error("❌ Missing iPaymu env:", { VA: !!VA, APIKEY: !!APIKEY, BASE_URL: !!BASE_URL });
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Server misconfigured: missing environment variables" }),
      };
    }

    const body = {
      product: ["QRIS Payment"],
      qty: ["1"],
      price: [amount],
      amount,
      returnUrl: `${process.env.NETLIFY_SITE_URL}/success.html`,
      notifyUrl: `${process.env.NETLIFY_SITE_URL}/.netlify/functions/callback`,
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

    console.log("🔧 Sending request to:", BASE_URL);

    const res = await fetch(BASE_URL, { method: "POST", headers, body: jsonBody });
    const text = await res.text();
    console.log("📄 Raw response from iPaymu:", text.substring(0, 200));

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("❌ JSON parse failed:", err);
      return { statusCode: 500, body: JSON.stringify({ error: "Invalid JSON from iPaymu", raw: text }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("❌ createPayment error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Unknown error" }),
    };
  }
}
