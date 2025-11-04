// netlify/functions/env.js
exports.handler = async () => {
  const safeEnv = {
    NETLIFY_SITE_URL: process.env.NETLIFY_SITE_URL || "",
    NODE_ENV: process.env.NODE_ENV || "",
    // ✅ boleh dipublikasikan (frontend butuh)
    SUPABASE_URL: process.env.SUPABASE_URL || "",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
    // ❌ jangan kirim secret API keys ke browser
    _private_flags: {
      ipaymu_present: !!process.env.IPAYMU_APIKEY,
      va_present: !!process.env.IPAYMU_VA,
      base_url_present: !!process.env.IPAYMU_BASE_URL,
    }
  };

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate"
    },
    body: JSON.stringify(safeEnv, null, 2)
  };
};
