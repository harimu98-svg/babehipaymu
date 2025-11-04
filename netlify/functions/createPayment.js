import crypto from "crypto";

export default async (req) => {
  try {
    console.log("🔧 createPayment invoked");

    const BASE_URL = process.env.IPAYMU_BASE_URL;
    const VA = process.env.IPAYMU_VA;
    const APIKEY = process.env.IPAYMU_APIKEY;
    const SITE_URL = process.env.NETLIFY_SITE_URL;

    const { amount } = JSON.parse(req.body);
    const body = {
      product: ["QRIS Payment"],
      qty: ["1"],
      price: [amount],
      returnUrl: `${SITE_URL}/return`,
      cancelUrl: `${SITE_URL}/cancel`,
      notifyUrl: `${SITE_URL}/.netlify/functions/ipaymu-callback`,
    };
    const jsonBody = JSON.stringify(body);

    // Step 1: hash body
    const hashBody = crypto.createHash("sha256").update(jsonBody).digest("hex").toLowerCase();

    // Step 2: build StringToSign
    const stringToSign = `POST:${VA}:${hashBody}:${APIKEY}`;

    // Step 3: generate signature
    const signature = crypto.createHmac("sha256", APIKEY).update(stringToSign).digest("hex");

    // Step 4: timestamp
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);

    console.log("🧮 StringToSign:", stringToSign);
    console.log("🔑 Signature:", signature);
    console.log("🕒 Timestamp:", timestamp);

    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        va: VA,
        signature,
        timestamp,
      },
      body: jsonBody,
    });

    const text = await response.text();
    const data = JSON.parse(text);

    console.log("✅ iPaymu Response:", data);

    return {
      statusCode: response.status,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("❌ Error in createPayment:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
