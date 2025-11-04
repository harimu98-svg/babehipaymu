// netlify/functions/callback.js
exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    console.log("💳 iPaymu Callback:", JSON.stringify(body, null, 2));

    // TODO: update status transaksi ke Supabase / log ke file
    // Contoh:
    // await supabase.from("transaksi").update({ status: body.status }).eq("ref_id", body.reference_id);

    return { 
      statusCode: 200, 
      body: JSON.stringify({ message: "Callback received successfully" }) 
    };
  } catch (err) {
    console.error("❌ Callback error:", err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: "Callback failed" }) 
    };
  }
};
