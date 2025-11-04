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
              </div>
              
              <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; border-left: 4px solid #0c5460;">
                <p style="margin: 0; color: #0c5460; font-size: 14px;">
                  <strong>💡 Informasi:</strong> 
                  Setelah melakukan pembayaran, status akan berubah otomatis dalam beberapa detik. 
                  Tidak perlu refresh halaman.
                </p>
              </div>
              
              <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 5px;">
                <p style="margin: 0; font-size: 13px; color: #856404;">
                  <strong>⏰ Masa aktif:</strong> QRIS ini berlaku selama 24 jam
                </p>
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
      
      // Start auto-checking status setiap 5 detik
      startAutoCheck(currentReferenceId);
      
    } else {
      showError(data.Message || "Gagal membuat pembayaran", data);
    }

  } catch (error) {
    console.error("Payment error:", error);
    showError(error.message);
  }
}

// Auto check status (hanya untuk monitoring, bukan polling berat)
let checkInterval = null;

function startAutoCheck(referenceId) {
  stopAutoCheck();
  
  // Check pertama setelah 3 detik
  setTimeout(() => {
    checkPaymentStatus(referenceId);
  }, 3000);
  
  // Lalu check setiap 10 detik (tidak terlalu sering)
  checkInterval = setInterval(() => {
    checkPaymentStatus(referenceId);
  }, 10000);
}

function stopAutoCheck() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

async function checkPaymentStatus(referenceId) {
  try {
    const res = await fetch("/.netlify/functions/checkCallback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenceId }),
    });
    
    const data = await res.json();
    
    // Only update if payment status changed
    if (data.exists && data.status !== 'pending') {
      updateStatusDisplay(data);
      stopAutoCheck(); // Stop checking if payment is completed
    }
    
  } catch (error) {
    console.error("Check status error:", error);
  }
}

function updateStatusDisplay(data) {
  const statusDisplay = document.getElementById("statusDisplay");
  if (!statusDisplay) return;
  
  const status = data.status || 'pending';
  
  const statusConfig = {
    'pending': { 
      color: '#e7f3ff', 
      border: '#b8daff',
      icon: '⏳', 
      message: 'Menunggu Pembayaran',
      description: 'Scan QR code untuk melakukan pembayaran',
      showLoading: true
    },
    'berhasil': { 
      color: '#d4edda', 
      border: '#c3e6cb',
      icon: '✅', 
      message: 'Pembayaran Berhasil!',
      description: 'Pembayaran telah diterima dan diproses',
      showLoading: false
    },
    'expired': { 
      color: '#f8d7da', 
      border: '#f5c6cb',
      icon: '❌', 
      message: 'Pembayaran Kadaluarsa',
      description: 'QR code telah kadaluarsa, silakan buat transaksi baru',
      showLoading: false
    }
  };
  
  const config = statusConfig[status] || statusConfig.pending;
  
  statusDisplay.innerHTML = `
    <div style="background: ${config.color}; padding: 25px; border-radius: 10px; border: 2px solid ${config.border};">
      <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px;">
        ${config.showLoading ? `
          <div class="loading-spinner" style="width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        ` : ''}
        <h3 style="margin: 0; color: ${status === 'berhasil' ? '#155724' : status === 'expired' ? '#721c24' : '#004085'};">
          ${config.icon} ${config.message}
        </h3>
      </div>
      
      <div style="text-align: left; background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p style="margin: 8px 0;"><strong>Status:</strong> 
          <span style="color: ${status === 'berhasil' ? '#155724' : status === 'expired' ? '#721c24' : '#856404'};">
            ${config.description}
          </span>
        </p>
        <p style="margin: 8px 0;"><strong>Reference ID:</strong> <code>${data.reference_id}</code></p>
        ${data.amount ? `<p style="margin: 8px 0;"><strong>Amount:</strong> Rp ${parseInt(data.amount).toLocaleString()}</p>` : ''}
        ${data.paid_at ? `<p style="margin: 8px 0;"><strong>Waktu Bayar:</strong> ${new Date(data.paid_at).toLocaleString('id-ID')}</p>` : ''}
        ${data.received_at ? `<p style="margin: 8px 0;"><strong>Update Terakhir:</strong> ${new Date(data.received_at).toLocaleString('id-ID')}</p>` : ''}
      </div>
      
      ${status === 'berhasil' ? `
        <div style="background: #155724; color: white; padding: 20px; border-radius: 5px; text-align: center; margin-top: 15px;">
          <h4 style="margin: 0 0 10px 0;">🎉 Pembayaran Berhasil!</h4>
          <p style="margin: 0; font-size: 18px;">Terima kasih telah melakukan pembayaran</p>
          ${data.amount ? `<p style="margin: 10px 0 0 0; font-size: 20px; font-weight: bold;">Rp ${parseInt(data.amount).toLocaleString()}</p>` : ''}
        </div>
      ` : ''}
      
      ${status === 'expired' ? `
        <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; text-align: center; margin-top: 15px;">
          <p style="margin: 0;"><strong>QR Code telah kadaluarsa</strong></p>
          <p style="margin: 5px 0 0 0;">Silakan buat transaksi baru untuk mendapatkan QR code yang fresh</p>
        </div>
      ` : ''}
      
      ${status === 'pending' ? `
        <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; border-left: 4px solid #0c5460; margin-top: 15px;">
          <p style="margin: 0; color: #0c5460; font-size: 14px;">
            <strong>💡 Sistem aktif:</strong> 
            Status akan berubah otomatis ketika pembayaran berhasil. Tidak perlu refresh halaman.
          </p>
        </div>
      ` : ''}
    </div>
  `;
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

window.initPayment = initPayment;
