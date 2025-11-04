// scripts/main.js
let currentReferenceId = null;
let refreshInterval = null;
let countdownTimer = null;

async function initPayment() {
  const amount = parseInt(document.getElementById("amount").value, 10);
  if (!amount || amount <= 0) return alert("Masukkan jumlah valid!");

  // Stop previous refresh jika ada
  stopAutoRefresh();
  
  document.getElementById("result").innerHTML = "⏳ Membuat transaksi...";

  try {
    const res = await fetch("/.netlify/functions/createPayment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });

    const responseText = await res.text();
    console.log("📨 Raw Response:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      showError("Invalid response from server", responseText);
      return;
    }

    console.log("📊 Parsed Data:", data);

    // Handle success response
    if ((data.Status === 200 || data.Status === 0) && data.Data?.QrString) {
      currentReferenceId = data.Data.ReferenceId || data.Data.SessionId;
      
      document.getElementById("result").innerHTML = `
        <div style="text-align: center;">
          <p>💰 Amount: Rp ${amount.toLocaleString()}</p>
          <p>🔗 Ref ID: <code>${currentReferenceId}</code></p>
          <p>Scan QRIS di bawah ini:</p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
            data.Data.QrString
          )}" alt="QRIS Code" style="border: 1px solid #ccc; padding: 10px; max-width: 100%;" />
          <br/><br/>
          
          <div id="statusDisplay" style="margin-top: 20px; min-height: 100px;">
            <div style="background: #e7f3ff; padding: 25px; border-radius: 10px; border: 2px solid #b8daff;">
              <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px;">
                <div class="loading-spinner" style="width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <h3 style="margin: 0; color: #004085;">⏳ Menunggu Pembayaran</h3>
              </div>
              
              <div style="text-align: left; background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p style="margin: 8px 0;"><strong>Status:</strong> <span style="color: #856404;">Menunggu pembayaran...</span></p>
                <p style="margin: 8px 0;"><strong>Reference ID:</strong> <code>${currentReferenceId}</code></p>
                <p style="margin: 8px 0;"><strong>Amount:</strong> Rp ${amount.toLocaleString()}</p>
                <p style="margin: 8px 0;"><strong>Payment Method:</strong> QRIS</p>
                <p style="margin: 8px 0;"><strong>Expired:</strong> 24 jam</p>
              </div>
              
              <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; border-left: 4px solid #0c5460;">
                <p style="margin: 0; color: #0c5460; font-size: 14px;">
                  <strong>🔄 Auto Refresh Active:</strong> 
                  Halaman akan refresh otomatis dalam <span id="countdown">10</span> detik untuk mengecek status terbaru
                </p>
              </div>
              
              <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 5px;">
                <p style="margin: 0; font-size: 13px; color: #856404;">
                  <strong>💡 Tips:</strong> Setelah bayar, tunggu 5-10 detik sampai status berubah otomatis
                </p>
              </div>
              
              <div style="margin-top: 10px;">
                <button onclick="refreshNow()" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 5px;">
                  🔄 Refresh Sekarang
                </button>
                <button onclick="stopAutoRefresh()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 5px;">
                  ⏸️ Stop Auto Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;
      
      // Start auto refresh
      startAutoRefresh();
      
    } else {
      showError(data.Message || "Gagal membuat pembayaran", data);
    }

  } catch (error) {
    console.error("Payment error:", error);
    showError(error.message);
  }
}

function startAutoRefresh() {
  let countdown = 10;
  const countdownElement = document.getElementById('countdown');
  
  // Update countdown setiap detik
  countdownTimer = setInterval(() => {
    countdown--;
    
    if (countdownElement) {
      countdownElement.textContent = countdown;
    }
    
    if (countdown <= 0) {
      refreshNow();
    }
  }, 1000);
  
  // Refresh setelah 10 detik
  refreshInterval = setTimeout(() => {
    refreshNow();
  }, 10000);
}

function refreshNow() {
  console.log('🔄 Auto refreshing page...');
  stopAutoRefresh();
  location.reload();
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearTimeout(refreshInterval);
    refreshInterval = null;
  }
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  console.log('⏸️ Auto refresh stopped');
}

function showError(message, data = null) {
  let errorHtml = `
    <div style="color: #721c24; text-align: center; background: #f8d7da; padding: 20px; border-radius: 5px; border: 1px solid #f5c6cb;">
      <h3 style="margin: 0 0 15px 0;">❌ ${message}</h3>
  `;

  if (data) {
    errorHtml += `
      <details style="margin-top: 15px; text-align: left;">
        <summary style="cursor: pointer; color: #856404;">Detail Error</summary>
        <pre style="background: white; padding: 10px; border-radius: 5px; overflow-x: auto; margin-top: 10px;">${JSON.stringify(data, null, 2)}</pre>
      </details>
    `;
  }

  errorHtml += `</div>`;
  
  document.getElementById("result").innerHTML = errorHtml;
}

// Global functions
window.refreshNow = refreshNow;
window.stopAutoRefresh = stopAutoRefresh;
window.initPayment = initPayment;

// Stop refresh ketika page unload
window.addEventListener('beforeunload', stopAutoRefresh);
