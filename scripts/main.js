// scripts/main.js
let currentReferenceId = null;

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
          <p>✅ Status: ${data.Message || 'Success'}</p>
          <p>Scan QRIS di bawah ini:</p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
            data.Data.QrString
          )}" alt="QRIS Code" style="border: 1px solid #ccc; padding: 10px;" />
          <br/><br/>
          
          <div style="margin: 15px 0;">
            <button onclick="testCallback('${currentReferenceId}', ${amount})" style="padding: 10px 20px; background: #ff9800; color: white;">
              🧪 Simulate Payment (Test)
            </button>
            <button onclick="checkStatus('${currentReferenceId}')" style="padding: 10px 20px; background: #17a2b8; color: white;">
              🔍 Check Status Manual
            </button>
          </div>
          
          <div id="statusDisplay" style="margin-top: 20px; min-height: 100px;">
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px;">
              <h3>🟡 Menunggu Pembayaran</h3>
              <p><strong>Sistem Real-time Active!</strong></p>
              <p>Status akan update <strong>otomatis</strong> ketika pembayaran berhasil</p>
              <p><small>Reference: ${currentReferenceId}</small></p>
              <p><small>Callback URL: ${window.ENV?.NETLIFY_SITE_URL || window.location.origin}/.netlify/functions/callback</small></p>
            </div>
          </div>
        </div>
      `;
      
    } else {
      showError(data.Message || "Gagal membuat pembayaran", data);
    }

  } catch (error) {
    console.error("Payment error:", error);
    showError(error.message);
  }
}

// Manual check status (optional)
async function checkStatus(referenceId) {
  try {
    const res = await fetch("/.netlify/functions/checkCallback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenceId }),
    });
    
    const data = await res.json();
    updateStatusDisplay(data);
  } catch (error) {
    console.error("Check status error:", error);
  }
}

function updateStatusDisplay(data) {
  const statusDisplay = document.getElementById("statusDisplay");
  if (!statusDisplay) return;
  
  const status = data.status || 'pending';
  const exists = data.exists;
  
  if (!exists) {
    statusDisplay.innerHTML = `
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px;">
        <h3>🟡 Menunggu Pembayaran</h3>
        <p>Belum ada callback diterima dari iPaymu</p>
        <p><strong>Callback system aktif - akan update otomatis</strong></p>
      </div>
    `;
    return;
  }

  const statusConfig = {
    'pending': { 
      color: '#fff3cd', 
      icon: '🟡', 
      message: 'Menunggu Pembayaran',
      description: 'Scan QR code untuk melakukan pembayaran'
    },
    'berhasil': { 
      color: '#d4edda', 
      icon: '✅', 
      message: 'Pembayaran Berhasil!',
      description: 'Pembayaran telah diterima dan diproses'
    },
    'expired': { 
      color: '#f8d7da', 
      icon: '❌', 
      message: 'Pembayaran Kadaluarsa',
      description: 'QR code telah kadaluarsa'
    }
  };
  
  const config = statusConfig[status] || statusConfig.pending;
  
  statusDisplay.innerHTML = `
    <div style="background: ${config.color}; padding: 20px; border-radius: 8px; border-left: 4px solid ${status === 'berhasil' ? '#28a745' : '#ffc107'};">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <span style="font-size: 24px;">${config.icon}</span>
        <div>
          <h3 style="margin: 0; color: ${status === 'berhasil' ? '#155724' : '#856404'};">${config.message}</h3>
          <p style="margin: 5px 0 0 0; color: ${status === 'berhasil' ? '#155724' : '#856404'};">${config.description}</p>
        </div>
      </div>
      
      <div style="background: rgba(255,255,255,0.5); padding: 15px; border-radius: 5px; margin-top: 10px;">
        <p style="margin: 5px 0;"><strong>Reference:</strong> ${data.reference_id}</p>
        <p style="margin: 5px 0;"><strong>Status:</strong> ${data.status}</p>
        <p style="margin: 5px 0;"><strong>Source:</strong> ${data.source}</p>
        ${data.amount ? `<p style="margin: 5px 0;"><strong>Amount:</strong> Rp ${parseInt(data.amount).toLocaleString()}</p>` : ''}
        ${data.paid_at ? `<p style="margin: 5px 0;"><strong>Paid at:</strong> ${new Date(data.paid_at).toLocaleString()}</p>` : ''}
        ${data.received_at ? `<p style="margin: 5px 0;"><strong>Callback received:</strong> ${new Date(data.received_at).toLocaleString()}</p>` : ''}
      </div>
      
      ${status === 'berhasil' ? `
        <div style="background: #155724; color: white; padding: 15px; border-radius: 5px; margin-top: 15px; text-align: center;">
          <h4 style="margin: 0;">🎉 Terima Kasih!</h4>
          <p style="margin: 5px 0 0 0;">Pembayaran Anda telah berhasil</p>
        </div>
      ` : ''}
    </div>
  `;
}

// Test callback
async function testCallback(referenceId, amount = 15000) {
  try {
    const testData = {
      trx_id: "TEST_" + Date.now(),
      status: "berhasil",
      status_code: "1",
      reference_id: referenceId,
      sid: "TEST_SESSION_" + Date.now(),
      amount: amount.toString(),
      paid_at: new Date().toISOString(),
      sub_total: amount.toString(),
      total: amount.toString()
    };
    
    const response = await fetch('/.netlify/functions/callback', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    // Update UI immediately after test callback
    setTimeout(() => {
      checkStatus(referenceId);
    }, 1000);
    
    alert('🧪 Test payment simulated!\nStatus akan update dalam 1 detik...');
  } catch (error) {
    console.error("Test callback error:", error);
    alert("Error testing callback");
  }
}

function showError(message, data = null) {
  let errorHtml = `
    <div style="color: red; text-align: center; background: #f8d7da; padding: 20px; border-radius: 5px;">
      <h3>❌ ${message}</h3>
  `;

  if (data) {
    errorHtml += `
      <details style="margin-top: 15px; text-align: left;">
        <summary>Debug Information</summary>
        <pre style="background: white; padding: 10px; border-radius: 5px; overflow-x: auto;">${JSON.stringify(data, null, 2)}</pre>
      </details>
    `;
  }

  errorHtml += `</div>`;
  
  document.getElementById("result").innerHTML = errorHtml;
}

window.initPayment = initPayment;
window.testCallback = testCallback;
window.checkStatus = checkStatus;
