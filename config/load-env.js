// config/load-env.js
async function loadEnvironment() {
  console.log("🔧 Loading environment...");

  try {
    const res = await fetch("/.netlify/functions/env", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    window.ENV = json;

    console.log("✅ Environment loaded:", Object.keys(window.ENV));
    console.log("🏠 SITE:", window.ENV.NETLIFY_SITE_URL);
  } catch (err) {
    console.error("❌ Failed to load environment:", err);
    window.ENV = {
      SUPABASE_URL: "",
      SUPABASE_ANON_KEY: "",
      NETLIFY_SITE_URL: "",
    };
  }
}

window.loadEnvironment = loadEnvironment;
