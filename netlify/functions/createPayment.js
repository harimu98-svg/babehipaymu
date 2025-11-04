// netlify/functions/createPayment.js
import crypto from "crypto";

export async function handler(event) {
  try {
    const { amount } = JSON.parse(event.body || "{}");

    if (!amount) {
      return { statusCode: 400, body: "Missing amount" };
    }

    const VA = process.env.IPAYMU_VA;
    const APIKEY = process.env.IPAYMU_APIKEY;
    const URL = process.env.IPAYMU_BASE_URL || "https://sandbox.ipaymu.com/api/v2/payment/direct";
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

    const res = await fetch(URL, { method: "POST", headers, body: jsonBody });
    const data = await res.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("❌ iPaymu error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
