function showForm(formId) {
    document.querySelectorAll(".form-box").forEach(f => f.classList.remove("active"));
    document.getElementById(formId).classList.add("active");
}

function showPopup(message) {
    var existing = document.getElementById('customPopup');
    if (existing) existing.remove();
    var popup = document.createElement('div');
    popup.id = 'customPopup';
    popup.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;justify-content:center;align-items:center;';
    popup.innerHTML =
        '<div style="background:#3a3535;border-radius:16px;padding:2rem 2.5rem;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);max-width:340px;width:90%;">' +
            '<p style="font-size:1rem;color:white;margin-bottom:1.5rem;">' + message + '</p>' +
            '<button onclick="document.getElementById(\'customPopup\').remove()" style="background:#6e3078;color:white;border:none;padding:10px 32px;border-radius:50px;font-size:14px;font-weight:600;cursor:pointer;">OK</button>' +
        '</div>';
    document.body.appendChild(popup);
}
// ── OTP STATE ─────────────────────────────────────────────────
var otpSent = false;
var otpVerified = false;
var pendingRegData = null;

async function handleRegister() {
    var name     = document.getElementById("reg-name").value.trim();
    var email    = document.getElementById("reg-email").value.trim();
    var password = document.getElementById("reg-password").value.trim();
    var birthday = document.getElementById("reg-birthday").value;
    var gender   = document.getElementById("reg-gender").value;
    var role     = document.getElementById("reg-role").value;

    if (!name || !email || !password || !birthday || !gender || !role) {
        showPopup("Please fill in all fields."); return;
    }

    // Email format check
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showPopup("Please enter a valid email address."); return;
    }

    if (!otpVerified) {
        // Send OTP first
        showLoadingOverlay("SENDING OTP...");
        const res  = await fetch('/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        removeOverlay();

        if (data.success) {
            pendingRegData = { name, email, password, birthday, gender, role };
            showOTPModal('register');
        } else {
            showPopup(data.message);
        }
        return;
    }

    // OTP verified — proceed to register
    showLoadingOverlay("CREATING ACCOUNT...");
    const res  = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullname: name, email, password, birthday, gender, role })
    });
    const data = await res.json();

    if (data.success) {
        updateOverlay("ACCOUNT CREATED ✅", "#4caf50");
        otpVerified = false;
        setTimeout(() => { removeOverlay(); showForm('login-form'); }, 2000);
    } else {
        removeOverlay();
        showPopup(data.message);
    }
}

async function handleLogin() {
    var email    = document.getElementById("login-email").value.trim();
    var password = document.getElementById("login-password").value.trim();
    if (!email || !password) { showPopup("Please fill in all fields."); return; }

    showLoginOverlay();
    const res  = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success) {
        localStorage.setItem('articom-user', JSON.stringify(data.user));
        localStorage.setItem('articom-role', data.user.role);
        setTimeout(() => {
            if (data.user.role === 'artist')     window.location.href = '/homepage_2/homepage/index.html';
            else if (data.user.role === 'user')  window.location.href = '/homepage_2/homepage/client-home.html';
            else                                 window.location.href = '/homepage_2/homepage/admin.html';
        }, 1800);
    } else {
        removeOverlay();
        showPopup(data.message);
    }
}

// ── OTP MODAL ─────────────────────────────────────────────────
function showOTPModal(type) {
    var existing = document.getElementById('otpModal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'otpModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;justify-content:center;align-items:center;';
    modal.innerHTML =
        '<div style="background:#3a3535;border-radius:20px;padding:2.5rem;max-width:360px;width:90%;text-align:center;border:1px solid rgba(255,255,255,0.1);">' +
            '<h3 style="color:#e3bfdb;font-size:1.1rem;margin-bottom:8px;">📧 Check Your Email</h3>' +
            '<p style="color:rgba(255,255,255,0.6);font-size:13px;margin-bottom:20px;">Enter the 6-digit OTP sent to your email</p>' +
            '<input id="otpInput" type="text" maxlength="6" placeholder="000000" style="width:100%;padding:14px;font-size:24px;text-align:center;letter-spacing:8px;background:#272222;border:1px solid rgba(255,255,255,0.2);border-radius:10px;color:white;box-sizing:border-box;margin-bottom:16px;">' +
            '<button onclick="verifyOTP(\'' + type + '\')" style="width:100%;padding:12px;background:#6e3078;color:white;border:none;border-radius:50px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;">Verify OTP</button>' +
            '<p style="color:rgba(255,255,255,0.4);font-size:12px;">Didn\'t get it? <a href="#" onclick="resendOTP(\'' + type + '\')" style="color:#e3bfdb;">Resend</a></p>' +
        '</div>';
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('otpInput') && document.getElementById('otpInput').focus(), 100);
}

async function verifyOTP(type) {
    var otp   = document.getElementById('otpInput').value.trim();
    var email = type === 'register'
        ? document.getElementById('reg-email').value.trim()
        : document.getElementById('forgot-email') ? document.getElementById('forgot-email').value.trim() : '';

    if (otp.length !== 6) { showPopup('Enter 6-digit OTP.'); return; }

    const res  = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
    });
    const data = await res.json();

    if (data.success) {
        document.getElementById('otpModal').remove();
        otpVerified = true;
        if (type === 'register') handleRegister();
        else completeForgotPassword();
    } else {
        showPopup(data.message);
    }
}

async function resendOTP(type) {
    var email = type === 'register'
        ? document.getElementById('reg-email').value.trim()
        : document.getElementById('forgot-email').value.trim();
    await fetch('/api/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    showPopup('OTP resent! Check your email.');
}

// ── FORGOT PASSWORD ───────────────────────────────────────────
function showForgotPassword() {
    var existing = document.getElementById('forgotModal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'forgotModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;justify-content:center;align-items:center;';
    modal.innerHTML =
        '<div style="background:#3a3535;border-radius:20px;padding:2.5rem;max-width:360px;width:90%;text-align:center;border:1px solid rgba(255,255,255,0.1);">' +
            '<h3 style="color:#e3bfdb;font-size:1.1rem;margin-bottom:8px;">🔑 Forgot Password</h3>' +
            '<input id="forgot-email" type="email" placeholder="Enter your email" style="width:100%;padding:12px;background:#272222;border:1px solid rgba(255,255,255,0.2);border-radius:10px;color:white;box-sizing:border-box;margin-bottom:12px;font-size:14px;">' +
            '<input id="forgot-newpass" type="password" placeholder="New password" style="width:100%;padding:12px;background:#272222;border:1px solid rgba(255,255,255,0.2);border-radius:10px;color:white;box-sizing:border-box;margin-bottom:16px;font-size:14px;">' +
            '<button onclick="sendResetOTP()" style="width:100%;padding:12px;background:#6e3078;color:white;border:none;border-radius:50px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;">Send OTP</button>' +
            '<p><a href="#" onclick="document.getElementById(\'forgotModal\').remove()" style="color:rgba(255,255,255,0.4);font-size:12px;">Cancel</a></p>' +
        '</div>';
    document.body.appendChild(modal);
}

async function sendResetOTP() {
    var email = document.getElementById('forgot-email').value.trim();
    if (!email) { showPopup('Enter your email.'); return; }

    const res  = await fetch('/api/send-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (data.success) {
        document.getElementById('forgotModal').remove();
        showOTPModal('reset');
    } else {
        showPopup(data.message);
    }
}

async function completeForgotPassword() {
    var email   = document.getElementById('forgot-email') ? document.getElementById('forgot-email').value.trim() : '';
    var newPass = document.getElementById('forgot-newpass') ? document.getElementById('forgot-newpass').value.trim() : '';

    const res  = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword: newPass, otp: 'verified' })
    });
    const data = await res.json();

    if (data.success) {
        showPopup('✅ Password reset! Please login.');
        showForm('login-form');
    } else {
        showPopup(data.message);
    }
}

function showLoadingOverlay(text) {
    var ov = document.createElement('div');
    ov.id = 'registerOverlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s ease;';
    ov.innerHTML =
        '<div style="background:#3a3535;border-radius:20px;padding:2.5rem 3rem;text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px;">' +
            '<img src="loading2.gif" style="width:80px;height:80px;object-fit:contain;">' +
            '<div id="registerStatus" style="color:#e3bfdb;font-size:1rem;font-weight:700;letter-spacing:2px;">' + text + '</div>' +
            '<div style="width:160px;height:4px;background:rgba(255,255,255,0.15);border-radius:10px;overflow:hidden;">' +
                '<div id="registerBar" style="height:100%;width:0%;background:#e3bfdb;border-radius:10px;transition:width 1.5s ease;"></div>' +
            '</div>' +
        '</div>';
    document.body.appendChild(ov);
    setTimeout(() => { ov.style.opacity='1'; document.getElementById('registerBar').style.width='100%'; }, 50);
}

function showLoginOverlay() {
    var ov = document.createElement('div');
    ov.id = 'registerOverlay';
    ov.style.cssText = 'position:fixed;inset:0;background:#472454;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;opacity:0;transition:opacity 0.3s ease;';
    ov.innerHTML =
        '<img src="loading.gif" style="width:120px;height:120px;object-fit:contain;">' +
        '<div style="width:180px;height:4px;background:rgba(255,255,255,0.15);border-radius:10px;overflow:hidden;">' +
            '<div id="loadBar" style="height:100%;width:0%;background:#e3bfdb;border-radius:10px;transition:width 1.5s ease;"></div>' +
        '</div>' +
        '<div style="color:rgba(255,255,255,0.5);font-size:13px;letter-spacing:1px;">Please Wait...</div>';
    document.body.appendChild(ov);
    setTimeout(() => { ov.style.opacity='1'; document.getElementById('loadBar').style.width='100%'; }, 50);
}

function updateOverlay(text, color) {
    var s = document.getElementById('registerStatus');
    if(s){ s.textContent = text; s.style.color = color; }
}

function removeOverlay() {
    var ov = document.getElementById('registerOverlay');
    if(ov) ov.remove();
}