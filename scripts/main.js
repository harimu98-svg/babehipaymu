// scripts/main.js
async function initPayment() {
  const amount = parseInt(document.getElementById("amount").value, 10);
  if (!amount || amount <= 0) return alert("Masukkan jumlah valid!");

  document.getElementById("result").innerHTML = "⏳ Membuat transaksi...";

  try {
    const res = await fetch("/.netlify/functions/createPayment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });

    const data = await res.json();
    console.log("iPaymu Response:", data);

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    if (data.Data?.QrString) {
      document.getElementById("result").innerHTML = `
        <p>Scan QRIS di bawah ini:</p>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
          data.Data.QrString
        )}" alt="QRIS Code" />
        <p>Ref ID: ${data.Data.ReferenceId}</p>
        <button onclick="verifyPayment('${data.Data.ReferenceId}')">Cek Status</button>
      `;
    } else {
      document.getElementById("result").innerHTML = `
        <p style="color: red;">Error: ${data.Message || "Gagal membuat pembayaran"}</p>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      `;
    }
  } catch (error) {
    console.error("Payment error:", error);
    document.getElementById("result").innerHTML = `
      <p style="color: red;">Error: ${error.message}</p>
    `;
  }
}

async function verifyPayment(referenceId) {
  try {
    const res = await fetch("/.netlify/functions/verifyPayment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenceId }),
    });
    
    const data = await res.json();
    alert(`Status: ${JSON.stringify(data, null, 2)}`);
  } catch (error) {
    console.error("Verify error:", error);
    alert("Gagal memverifikasi pembayaran");
  }
}

window.initPayment = initPayment;
window.verifyPayment = verifyPayment;
