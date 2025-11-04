// netlify/functions/callback.js
export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    console.log("💳 iPaymu Callback:", body);

    // TODO: update status transaksi ke Supabase / log ke file
    // Contoh:
    // await supabase.from("transaksi").update({ status: body.status }).eq("ref_id", body.reference_id);

    return { statusCode: 200, body: "Callback OK" };
  } catch (err) {
    console.error("❌ Callback error:", err);
    return { statusCode: 500, body: "Callback failed" };
  }
}
