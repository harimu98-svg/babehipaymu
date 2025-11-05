// scripts/main.js
let currentReferenceId = null;
let pollingInterval = null;

// ✅ HARCODE URL - no env exposure
const APP_URL = "https://babehipaymu.netlify.app";

async function initPayment() {
  const amountInput = document.getElementById("amount");
  const amount = parseInt(amountInput.value, 10);
  
  if (!amount || amount < 1000) {
    alert("Masukkan jumlah valid! Minimum Rp 1.000");
    amountInput.focus();
    return;
  }

  // ✅ UI FEEDBACK IMMEDIATE
  const button = event.target;
  const originalText = button.innerHTML;
  button.innerHTML = "⏳ Membuat QRIS...";
  button.disabled = true;

  stopPolling();
  document.getElementById("result").innerHTML = `
    <div style="text-align: center; padding: 40px;">
      <div style="width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
      <h3 style="color: #004085;">Creating QRIS Payment...</h3>
      <p>Harap tunggu sebentar</p>
    </div>
    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
  `;

  try {
    const startTime = Date.now();
    const res = await fetch("/.netlify/functions/createPayment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });

    const responseTime = Date.now() - startTime;
    console.log(`⚡ Payment creation time: ${responseTime}ms`);

    const responseText = await res.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      showError("Invalid response from server", responseText);
      return;
    }

    console.log("📊 Payment Response:", data);

    if ((data.Status === 200 || data.Status === 0) && data.Data?.QrString) {
      currentReferenceId = data.Data.ReferenceId || data.Data.SessionId;
      
      displayQRIS(data, amount);
      startPolling(currentReferenceId);
      
    } else {
      showError(data.Message || "Gagal membuat pembayaran", data);
    }

  } catch (error) {
    console.error("Payment error:", error);
    showError(error.message);
  } finally {
    // ✅ RESTORE BUTTON
    button.innerHTML = originalText;
    button.disabled = false;
  }
}

function displayQRIS(data, amount) {
  document.getElementById("result").innerHTML = `
    <div style="text-align: center;">
      <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px;">
        <p style="font-size: 18px; font-weight: bold; color: #333; margin: 0 0 10px 0;">💰 Amount: Rp ${amount.toLocaleString()}</p>
        <p style="margin: 5px 0; color: #666;">🔗 Ref ID: <code style="background: #f1f1f1; padding: 2px 6px; border-radius: 3px;">${currentReferenceId}</code></p>
      </div>
      
      <p style="font-size: 16px; margin: 10px 0;">Scan QRIS di bawah ini:</p>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data.Data.QrString)}" 
           alt="QRIS Code" 
           style="border: 2px solid #e0e0e0; padding: 15px; border-radius: 10px; max-width: 100%; background: white;" />
      <br><br>
      
      <div id="statusDisplay" style="margin-top: 20px; min-height: 120px;">
        <div style="background: linear-gradient(135deg, #e7f3ff, #d4e6ff); padding: 25px; border-radius: 10px; border: 2px solid #b8daff;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px;">
            <div class="loading-spinner" style="width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <h3 style="margin: 0; color: #004085;">⏳ Menunggu Pembayaran</h3>
          </div>
          
          <div style="text-align: left; background: rgba(255,255,255,0.8); padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 8px 0;"><strong>Status:</strong> <span style="color: #856404;">Menunggu pembayaran...</span></p>
            <p style="margin: 8px 0;"><strong>Reference ID:</strong> <code>${currentReferenceId}</code></p>
            <p style="margin: 8px 0;"><strong>Amount:</strong> Rp ${amount.toLocaleString()}</p>
            <p style="margin: 8px 0;"><strong>Payment Method:</strong> QRIS</p>
            <p style="margin: 8px 0;"><strong>Expired:</strong> 24 jam</p>
          </div>
          
          <div style="background: rgba(209, 236, 241, 0.8); padding: 15px; border-radius: 5px; border-left: 4px solid #0c5460;">
            <p style="margin: 0; color: #0c5460; font-size: 14px;">
              <strong>🔄 Real-time Monitoring Active</strong> - Status akan update otomatis setiap 3 detik
            </p>
          </div>
          
          <div style="margin-top: 15px; padding: 12px; background: rgba(255, 243, 205, 0.8); border-radius: 5px;">
            <p style="margin: 0; font-size: 13px; color: #856404;">
              <strong>Last check:</strong> <span id="lastCheck">${new Date().toLocaleTimeString()}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ✅ POLLING SYSTEM
function startPolling(referenceId) {
  stopPolling();
  
  // Immediate first check
  checkPaymentStatus(referenceId);
  
  // Then every 3 seconds
  pollingInterval = setInterval(() => {
    checkPaymentStatus(referenceId);
  }, 3000);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

async function checkPaymentStatus(referenceId) {
  try {
    const res = await fetch("/.netlify/functions/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        referenceId: referenceId,
        action: 'checkStatus'
      }),
    });
    
    if (!res.ok) return;
    
    const data = await res.json();
    
    // Update last check time
    const lastCheckElement = document.getElementById('lastCheck');
    if (lastCheckElement) {
      lastCheckElement.textContent = new Date().toLocaleTimeString();
    }
    
    // Update UI if status changed
    if (data.exists && data.status) {
      updateStatusDisplay(data);
      
      // Stop polling if completed
      if (data.status === 'berhasil' || data.status === 'expired') {
        stopPolling();
        
        if (data.status === 'berhasil') {
          showSuccessCelebration(data);
        }
      }
    }
    
  } catch (error) {
    console.log("Polling check:", error.message);
  }
}

function updateStatusDisplay(data) {
  const statusDisplay = document.getElementById("statusDisplay");
  if (!statusDisplay) return;
  
  const status = data.status || 'pending';
  
  const statusConfig = {
    'pending': { 
      color: 'linear-gradient(135deg, #e7f3ff, #d4e6ff)', 
      border: '#b8daff',
      icon: '⏳', 
      message: 'Menunggu Pembayaran',
      description: 'Scan QR code untuk melakukan pembayaran',
      showLoading: true
    },
    'berhasil': { 
      color: 'linear-gradient(135deg, #d4edda, #c3e6cb)', 
      border: '#28a745',
      icon: '✅', 
      message: 'Pembayaran Berhasil!',
      description: 'Pembayaran telah diterima dan diproses',
      showLoading: false
    },
    'expired': { 
      color: 'linear-gradient(135deg, #f8d7da, #f5c6cb)', 
      border: '#dc3545',
      icon: '❌', 
      message: 'Pembayaran Kadaluarsa',
      description: 'QR code telah kadaluarsa',
      showLoading: false
    }
  };
  
  const config = statusConfig[status] || statusConfig.pending;
  
  statusDisplay.innerHTML = `
    <div style="background: ${config.color}; padding: 25px; border-radius: 10px; border: 2px solid ${config.border}; transition: all 0.3s ease;">
      <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px;">
        ${config.showLoading ? `
          <div class="loading-spinner" style="width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        ` : ''}
        <h3 style="margin: 0; color: ${status === 'berhasil' ? '#155724' : status === 'expired' ? '#721c24' : '#004085'};">
          ${config.icon} ${config.message}
        </h3>
      </div>
      
      <div style="text-align: left; background: rgba(255,255,255,0.9); padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p style="margin: 8px 0;"><strong>Status:</strong> 
          <span style="color: ${status === 'berhasil' ? '#155724' : status === 'expired' ? '#721c24' : '#856404'}; font-weight: bold;">
            ${config.description}
          </span>
        </p>
        <p style="margin: 8px 0;"><strong>Reference ID:</strong> <code>${data.reference_id}</code></p>
        ${data.amount ? `<p style="margin: 8px 0;"><strong>Amount:</strong> Rp ${parseInt(data.amount).toLocaleString()}</p>` : ''}
        ${data.paid_at ? `<p style="margin: 8px 0;"><strong>Waktu Bayar:</strong> ${new Date(data.paid_at).toLocaleString('id-ID')}</p>` : ''}
        ${data.received_at ? `<p style="margin: 8px 0;"><strong>Update Time:</strong> ${new Date(data.received_at).toLocaleString('id-ID')}</p>` : ''}
      </div>
      
      ${status === 'berhasil' ? `
        <div style="background: #155724; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-top: 15px; animation: fadeIn 0.5s ease-in;">
          <h4 style="margin: 0 0 10px 0; font-size: 20px;">🎉 Pembayaran Berhasil!</h4>
          <p style="margin: 0; opacity: 0.9;">Terima kasih telah melakukan pembayaran</p>
        </div>
      ` : ''}
      
      ${status === 'pending' ? `
        <div style="background: rgba(209, 236, 241, 0.8); padding: 15px; border-radius: 5px; border-left: 4px solid #0c5460; margin-top: 15px;">
          <p style="margin: 0; color: #0c5460; font-size: 14px;">
            <strong>🔄 Real-time Active</strong> - System monitoring aktif
          </p>
        </div>
        <div style="margin-top: 10px; padding: 12px; background: rgba(255, 243, 205, 0.8); border-radius: 5px;">
          <p style="margin: 0; font-size: 13px; color: #856404;">
            <strong>Last check:</strong> <span id="lastCheck">${new Date().toLocaleTimeString()}</span>
          </p>
        </div>
      ` : ''}
    </div>
    
    <style>
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>
  `;
}

function showSuccessCelebration(data) {
  const statusDisplay = document.getElementById("statusDisplay");
  if (statusDisplay) {
    const celebration = document.createElement('div');
    celebration.innerHTML = `
      <div style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 30px; border-radius: 15px; margin-top: 20px; text-align: center; animation: celebrate 0.6s ease-out;">
        <h3 style="margin: 0 0 15px 0; font-size: 24px;">🎉 SELAMAT! 🎉</h3>
        <p style="margin: 0 0 10px 0; font-size: 18px;">Pembayaran Anda telah berhasil diproses</p>
        ${data.amount ? `<p style="margin: 0; font-size: 22px; font-weight: bold;">Rp ${parseInt(data.amount).toLocaleString()}</p>` : ''}
        <p style="margin: 15px 0 0 0; font-size: 14px; opacity: 0.9;">Transaksi selesai secara real-time</p>
      </div>
      <style>
        @keyframes celebrate {
          0% { opacity: 0; transform: scale(0.8) translateY(20px); }
          50% { transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      </style>
    `;
    statusDisplay.appendChild(celebration);
    
    // Auto scroll to celebration
    celebration.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function showError(message, data = null) {
  let errorHtml = `
    <div style="color: #721c24; text-align: center; background: #f8d7da; padding: 25px; border-radius: 10px; border: 2px solid #f5c6cb; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; font-size: 20px;">❌ ${message}</h3>
  `;

  if (data) {
    errorHtml += `
      <details style="margin-top: 15px; text-align: left;">
        <summary style="cursor: pointer; color: #856404; font-weight: bold;">Detail Error</summary>
        <pre style="background: white; padding: 15px; border-radius: 5px; overflow-x: auto; margin-top: 10px; font-size: 12px;">${JSON.stringify(data, null, 2)}</pre>
      </details>
    `;
  }

  errorHtml += `</div>`;
  
  document.getElementById("result").innerHTML = errorHtml;
}

// ✅ GLOBAL FUNCTIONS
window.initPayment = initPayment;
window.stopPolling = stopPolling;

// ✅ CLEANUP ON PAGE UNLOAD
window.addEventListener('beforeunload', stopPolling);
window.addEventListener('pagehide', stopPolling);

console.log('✅ Payment system loaded successfully');
