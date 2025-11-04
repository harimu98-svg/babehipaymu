// scripts/main.js
let currentReferenceId = null;
let pollingInterval = null;

async function initPayment() {
  const amount = parseInt(document.getElementById("amount").value, 10);
  if (!amount || amount <= 0) return alert("Masukkan jumlah valid!");

  // Stop previous polling if any
  stopPolling();
  
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
      currentReferenceId = data.Data.ReferenceId;
      
      document.getElementById("result").innerHTML = `
        <div style="text-align: center;">
          <p>💰 Amount: Rp ${amount.toLocaleString()}</p>
          <p>🔗 Ref ID: <code>${currentReferenceId}</code></p>
          <p>Scan QRIS di bawah ini:</p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
            data.Data.QrString
          )}" alt="QRIS Code" style="border: 1px solid #ccc; padding: 10px;" />
          <br/><br/>
          
          <div style="margin: 15px 0;">
            <button onclick="testCallback('${currentReferenceId}')" style="padding: 10px 20px; background: #ff9800; color: white;">
              🧪 Simulate Payment (Test)
            </button>
          </div>
          
          <div id="statusDisplay" style="margin-top: 20px; min-height: 100px;">
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px;">
              <p>🟡 Menunggu pembayaran...</p>
              <p><strong>Status akan terupdate otomatis!</strong></p>
            </div>
          </div>
        </div>
      `;
      
      // Auto start polling
      startPolling(currentReferenceId);
      
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

// Simplified Polling System
function startPolling(referenceId) {
  stopPolling();
  
  const statusDisplay = document.getElementById("statusDisplay");
  if (statusDisplay) {
    statusDisplay.innerHTML = `
      <div style="background: #e7f3ff; padding: 15px; border-radius: 5px;">
        <p>🔄 <strong>Auto-monitoring aktif</strong></p>
        <p>Status akan update otomatis ketika pembayaran berhasil</p>
      </div>
    `;
  }
  
  // Check immediately and every 5 seconds
  checkPaymentStatus(referenceId);
  pollingInterval = setInterval(() => checkPaymentStatus(referenceId), 5000);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

async function checkPaymentStatus(referenceId) {
  try {
    const res = await fetch("/.netlify/functions/getPaymentStatus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenceId }),
    });
    
    const data = await res.json();
    console.log("Polling update:", data);
    
    updateStatusDisplay(data);
    
    // Stop polling if payment is completed
    if (data.status === 'berhasil' || data.status === 'expired') {
      stopPolling();
      
      if (data.status === 'berhasil') {
        // Optional: Redirect to success page or show confirmation
        setTimeout(() => {
          showSuccessMessage();
        }, 1000);
      }
    }
    
  } catch (error) {
    console.error("Polling error:", error);
  }
}

function updateStatusDisplay(data) {
  const statusDisplay = document.getElementById("statusDisplay");
  if (!statusDisplay) return;
  
  const statusConfig = {
    'pending': { color: '#fff3cd', icon: '🟡', message: 'Menunggu pembayaran...' },
    'berhasil': { color: '#d4edda', icon: '✅', message: 'Pembayaran berhasil!' },
    'expired': { color: '#f8d7da', icon: '❌', message: 'Pembayaran kadaluarsa' },
    'error': { color: '#f8d7da', icon: '❌', message: 'Terjadi error' }
  };
  
  const config = statusConfig[data.status] || statusConfig.error;
  
  statusDisplay.innerHTML = `
    <div style="background: ${config.color}; padding: 20px; border-radius: 5px; text-align: center;">
      <h3>${config.icon} ${config.message}</h3>
      <p><strong>Reference:</strong> ${data.reference_id || currentReferenceId}</p>
      <p><strong>Status:</strong> ${data.status}</p>
      ${data.updated_at ? `<p><strong>Update:</strong> ${new Date(data.updated_at).toLocaleString()}</p>` : ''}
      ${data.status === 'berhasil' ? `<p style="color: #155724;">✅ Transaksi selesai secara otomatis</p>` : ''}
    </div>
  `;
}

function showSuccessMessage() {
  const statusDisplay = document.getElementById("statusDisplay");
  if (statusDisplay) {
    statusDisplay.innerHTML += `
      <div style="background: #155724; color: white; padding: 15px; border-radius: 5px; margin-top: 15px;">
        <h3>🎉 Terima Kasih!</h3>
        <p>Pembayaran Anda telah berhasil diproses.</p>
      </div>
    `;
  }
}

// Hanya untuk testing
async function testCallback(referenceId) {
  try {
    const testData = {
      trx_id: "TEST_" + Date.now(),
      status: "berhasil", 
      status_code: "1",
      reference_id: referenceId,
      sid: "TEST_SESSION_" + Date.now()
    };
    
    await fetch('/.netlify/functions/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    alert('🧪 Test payment simulated! Status akan update otomatis...');
  } catch (error) {
    console.error("Test callback error:", error);
  }
}

window.initPayment = initPayment;
window.testCallback = testCallback;
