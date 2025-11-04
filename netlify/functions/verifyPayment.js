// netlify/functions/verifyPayment.js
import crypto from "crypto";

export async function handler(event) {
  try {
    const { referenceId } = JSON.parse(event.body || "{}");

    if (!referenceId) {
      return { statusCode: 400, body: "Missing referenceId" };
    }

    const VA = process.env.IPAYMU_VA;
    const APIKEY = process.env.IPAYMU_APIKEY;
    const BASE_URL = process.env.IPAYMU_BASE_URL || "";
    const URL = `${BASE_URL}/status`;

    // Body sesuai dokumentasi iPaymu
    const body = { referenceId };
    const jsonBody = JSON.stringify(body);

    // 🔐 Signature
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

    console.log("🔎 VerifyPayment:", data);

    return {
      statusCode: 200,
      body: JSON.stringify(data, null, 2),
    };
  } catch (err) {
    console.error("❌ verifyPayment error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
