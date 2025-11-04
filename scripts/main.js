// scripts/main.js
async function initPayment() {
  const amount = parseInt(document.getElementById("amount").value, 10);
  if (!amount || amount <= 0) return alert("Masukkan jumlah valid!");

  document.getElementById("result").innerHTML = "⏳ Membuat transaksi...";

  const res = await fetch("/.netlify/functions/createPayment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });

  const data = await res.json();
  console.log("iPaymu Response:", data);

  if (data.Data?.QrString) {
    document.getElementById("result").innerHTML = `
      <p>Scan QRIS di bawah ini:</p>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
        data.Data.QrString
      )}" alt="QRIS Code" />
      <p>Ref ID: ${data.Data.ReferenceId}</p>
    `;
  } else {
    document.getElementById("result").innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  }
}
