import crypto from "crypto";

export default async function handler(req) {
  try {
    console.log("🔧 createPayment invoked");

    const BASE_URL = process.env.IPAYMU_BASE_URL;
    const VA = process.env.IPAYMU_VA;
    const APIKEY = process.env.IPAYMU_APIKEY;
    const SITE_URL = process.env.NETLIFY_SITE_URL;

    // 🧠 Perbaikan: body bisa berupa object atau string
    const bodyData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { amount } = bodyData;

   const payload = {
  name: "Ronaldo", // nama transaksi atau pelanggan
  email: "customer@dummy.email", // opsional tapi bagus untuk log
  phone: "08123456789", // opsional
  amount: amount.toString(), // total pembayaran
  product: "Kerupuk", // minimal satu produk
  qty: ["1"],
  price: [amount.toString()],
  returnUrl: `${SITE_URL}/return`,
  cancelUrl: `${SITE_URL}/cancel`,
  notifyUrl: `${SITE_URL}/.netlify/functions/ipaymu-callback`,
  paymentMethod: "qris",
  channel: "mpm",
  referenceId: `INV${Date.now()}`
};
    const jsonBody = JSON.stringify(payload);

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

    // Step 5: send to iPaymu
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
    console.log("📄 Raw response from iPaymu:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("❌ JSON parse failed:", e);
      return new Response(JSON.stringify({ error: "Invalid JSON from iPaymu", raw: text }), { status: 500 });
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("❌ Error in createPayment:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
