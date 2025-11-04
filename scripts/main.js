// scripts/main.js
let currentReferenceId = null;
let pollingInterval = null;
let pollingCount = 0;
const MAX_POLLING_COUNT = 60; // 5 menit (60 x 5 detik)

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
      pollingCount = 0;
      
      document.getElementById("result").innerHTML = `
        <div style="text-align: center;">
          <p>💰 Amount: Rp ${amount.toLocaleString()}</p>
          <p>🔗 Ref ID: <code>${currentReferenceId}</code></p>
          <p>Scan QRIS di bawah ini:</p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
            data.Data.QrString
          )}" alt="QRIS Code" style="border: 1px solid #ccc; padding: 10px;" />
          <br/><br/>
          
          <div id="pollingControls">
            <button onclick="startPolling('${currentReferenceId}')" style="padding: 10px 20px; margin: 5px; background: #4CAF50; color: white;">
              🔄 Start Auto Polling
            </button>
            <button onclick="verifyPayment('${currentReferenceId}')" style="padding: 10px 20px; margin: 5px;">
              🔍 Check Status Once
            </button>
            <button onclick="testCallback('${currentReferenceId}')" style="padding: 10px 20px; margin: 5px; background: #ff9800; color: white;">
              🧪 Simulate Payment
            </button>
          </div>
          
          <div id="statusDisplay" style="margin-top: 20px; min-height: 100px;">
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px;">
              <p>🟡 Menunggu pembayaran...</p>
              <p>Status akan terupdate otomatis ketika pembayaran berhasil</p>
            </div>
          </div>
          
          ${showReferenceInfo(currentReferenceId, amount)}
        </div>
      `;
      
      // Auto start polling setelah 3 detik
      setTimeout(() => {
        startPolling(currentReferenceId);
      }, 3000);
      
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

// Polling System
function startPolling(referenceId) {
  stopPolling();
  pollingCount = 0;
  
  const statusDisplay = document.getElementById("statusDisplay");
  if (statusDisplay) {
    statusDisplay.innerHTML = `
      <div style="background: #e7f3ff; padding: 15px; border-radius: 5px;">
        <p>🔄 Auto polling started... (Checking every 5 seconds)</p>
        <p id="pollingCounter">Checks: 0/${MAX_POLLING_COUNT}</p>
      </div>
    `;
  }
  
  // Immediate first check
  checkPaymentStatus(referenceId);
  
  // Continue polling every 5 seconds
  pollingInterval = setInterval(() => {
    checkPaymentStatus(referenceId);
  }, 5000);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

async function checkPaymentStatus(referenceId) {
  if (pollingCount >= MAX_POLLING_COUNT) {
    stopPolling();
    updateStatusDisplay({
      status: 'expired',
      message: 'Polling stopped after 5 minutes'
    });
    return;
  }
  
  pollingCount++;
  
  const counterElement = document.getElementById("pollingCounter");
  if (counterElement) {
    counterElement.textContent = `Checks: ${pollingCount}/${MAX_POLLING_COUNT}`;
  }
  
  try {
    const res = await fetch("/.netlify/functions/getPaymentStatus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenceId }),
    });
    
    const data = await res.json();
    console.log(`Polling #${pollingCount}:`, data);
    
    updateStatusDisplay(data);
    
    // Stop polling if payment is completed
    if (data.status === 'berhasil' || data.status === 'expired') {
      stopPolling();
      
      // Show success message
      if (data.status === 'berhasil') {
        setTimeout(() => {
          alert('🎉 Pembayaran Berhasil! Transaksi telah selesai.');
        }, 1000);
      }
    }
    
  } catch (error) {
    console.error("Polling error:", error);
    updateStatusDisplay({
      status: 'error',
      message: `Error: ${error.message}`
    });
  }
}

function updateStatusDisplay(data) {
  const statusDisplay = document.getElementById("statusDisplay");
  if (!statusDisplay) return;
  
  const statusColors = {
    'pending': '#fff3cd',
    'berhasil': '#d4edda', 
    'expired': '#f8d7da',
    'error': '#f8d7da'
  };
  
  const statusIcons = {
    'pending': '🟡',
    'berhasil': '✅',
    'expired': '❌',
    'error': '❌'
  };
  
  const statusMessages = {
    'pending': 'Menunggu pembayaran...',
    'berhasil': 'Pembayaran berhasil!',
    'expired': 'Pembayaran kadaluarsa',
    'error': 'Terjadi error'
  };
  
  const color = statusColors[data.status] || '#f8d7da';
  const icon = statusIcons[data.status] || '❓';
  const message = statusMessages[data.status] || 'Status tidak diketahui';
  
  statusDisplay.innerHTML = `
    <div style="background: ${color}; padding: 15px; border-radius: 5px;">
      <p><strong>${icon} ${message}</strong></p>
      <p><strong>Reference ID:</strong> ${data.reference_id || currentReferenceId}</p>
      <p><strong>Status:</strong> ${data.status || 'unknown'}</p>
      <p><strong>Source:</strong> ${data.source || 'unknown'}</p>
      ${data.updated_at ? `<p><strong>Last Update:</strong> ${new Date(data.updated_at).toLocaleString()}</p>` : ''}
      ${data.trx_id ? `<p><strong>Transaction ID:</strong> ${data.trx_id}</p>` : ''}
      ${pollingInterval ? `<p><em>Auto polling active... (${pollingCount}/${MAX_POLLING_COUNT})</em></p>` : ''}
    </div>
  `;
}

// Existing functions tetap sama...
async function verifyPayment(referenceId) {
  try {
    const res = await fetch("/.netlify/functions/verifyPayment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenceId }),
    });
    
    const data = await res.json();
    updateStatusDisplay(data);
  } catch (error) {
    console.error("Verify error:", error);
    updateStatusDisplay({
      status: 'error',
      message: `Error: ${error.message}`
    });
  }
}

// Test callback function
async function testCallback(referenceId) {
  try {
    const testData = {
      trx_id: "TEST_" + Date.now(),
      status: "berhasil",
      status_code: "1",
      reference_id: referenceId,
      sid: "TEST_SESSION_" + Date.now()
    };
    
    const response = await fetch('/.netlify/functions/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    alert(`🧪 Test Callback Sent!\nStatus should update automatically via polling.`);
  } catch (error) {
    console.error("Test callback error:", error);
    alert("Error testing callback");
  }
}
