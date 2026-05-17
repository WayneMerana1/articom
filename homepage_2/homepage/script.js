document.addEventListener('DOMContentLoaded', function () {

    // ── DROPDOWN TOGGLE ──────────────────────────────────────────────────────
    const containers = document.querySelectorAll('.dropdown-container');

    containers.forEach(container => {
        const button = container.querySelector('.header-btn');
        if (!button) return;

        // Message button goes directly to chat.html
        if (button.classList.contains('message-btn')) {
            button.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = 'chat.html';
            });
            return;
        }

        button.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            containers.forEach(c => {
                if (c !== container) c.classList.remove('active');
            });

            container.classList.toggle('active');
        });
    });

    document.addEventListener('click', function () {
        containers.forEach(c => c.classList.remove('active'));
    });


    // ── LOGOUT MODAL ─────────────────────────────────────────────────────────
    const modal = document.createElement('div');
    modal.id = 'logoutModal';
    modal.style.cssText = `
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.6);
        z-index: 9999;
        justify-content: center;
        align-items: center;
    `;
    modal.innerHTML = `
        <div style="
            background: #3a3535;
            border-radius: 16px;
            padding: 2rem 2.5rem;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.1);
            max-width: 360px;
            width: 90%;
        ">
            <p style="font-size: 1.1rem; font-weight: 600; color: white; margin-bottom: 0.5rem;">Log Out</p>
            <p style="font-size: 0.95rem; color: rgba(255,255,255,0.6); margin-bottom: 1.8rem;">Are you sure you want to log out?</p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="logoutYes" style="
                    background: #6e3078;
                    color: white;
                    border: none;
                    padding: 10px 32px;
                    border-radius: 50px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                ">Yes</button>
                <button id="logoutNo" style="
                    background: transparent;
                    color: white;
                    border: 1px solid rgba(255,255,255,0.3);
                    padding: 10px 32px;
                    border-radius: 50px;
                    font-size: 14px;
                    cursor: pointer;
                ">No</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    function showLogoutModal() {
        modal.style.display = 'flex';
    }

    document.getElementById('logoutNo').addEventListener('click', function () {
        modal.style.display = 'none';
    });

    document.getElementById('logoutYes').addEventListener('click', function () {
        modal.style.display = 'none';

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: #472454;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        overlay.innerHTML = `
    <img src="loading.gif" style="width: 120px; height: 120px; background: transparent; border-radius: 0; object-fit: contain;">
    <div style="width: 180px; height: 4px; background: rgba(255,255,255,0.15); border-radius: 10px; overflow: hidden;">
        <div id="logoutBar" style="height: 100%; width: 0%; background: #e3bfdb; border-radius: 10px; transition: width 1.5s ease;"></div>
    </div>
    <div style="color: rgba(255,255,255,0.5); font-size: 13px; letter-spacing: 1px;">Logging out...</div>
`;
        document.body.appendChild(overlay);

        setTimeout(() => {
            overlay.style.opacity = '1';
            document.getElementById('logoutBar').style.width = '100%';
        }, 50);

        setTimeout(() => {
          window.location.href = '/homepage_2/homepage/landing.html';
        }, 1800);
    });

    modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.style.display = 'none';
    });


    // ── SETTINGS PANEL ───────────────────────────────────────────────────────
    const settingsList = document.getElementById('Settings');
    if (settingsList) {
        const items = [
            { label: '🌙 Dark / Light Mode', action: toggleDarkMode },
            { label: '🔒 Privacy',            action: () => alert('Privacy settings coming soon!') },
            { label: '🚪 Log Out',            action: showLogoutModal },
        ];

        items.forEach(({ label, action }) => {
            const li = document.createElement('li');
            li.textContent = label;
            li.style.cssText = 'padding: 10px 16px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 14px;';
            li.addEventListener('mouseenter', () => li.style.background = 'rgba(255,255,255,0.15)');
            li.addEventListener('mouseleave', () => li.style.background = 'transparent');
            li.addEventListener('click', (e) => { e.stopPropagation(); action(); });
            settingsList.appendChild(li);
        });
    }



    // ── DARK / LIGHT MODE TOGGLE ─────────────────────────────────────────────
    function toggleDarkMode() {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('articom-theme', isLight ? 'light' : 'dark');
    }

    if (localStorage.getItem('articom-theme') === 'light') {
        document.body.classList.add('light-mode');
    }


    // ── MESSAGE SEARCH FILTER ────────────────────────────────────────────────
    const msgSearch = document.getElementById('msgSearch');
    const messageItems = document.querySelectorAll('#Messages li');

    if (msgSearch && messageItems.length) {
        msgSearch.addEventListener('input', function () {
            const query = this.value.toLowerCase();
            messageItems.forEach(li => {
                const name = (li.getAttribute('data-name') || '').toLowerCase();
                li.style.display = name.includes(query) ? '' : 'none';
            });
        });
    }


    // ── PROFILE IMAGE UPLOAD ─────────────────────────────────────────────────
    const fileInput = document.getElementById('fileInput');
    const profileImage = document.getElementById('profileImage');

    if (fileInput && profileImage) {
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (file) profileImage.src = URL.createObjectURL(file);
        });
    }


    // ── OPEN PROFILE PAGE BUTTON ─────────────────────────────────────────────
    const openProfilePageBtn = document.getElementById('openProfilePageBtn');
    if (openProfilePageBtn) {
        openProfilePageBtn.addEventListener('click', function () {
            window.location.href = 'other-page2.html';
        });
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


        // ── NOTIFICATIONS ─────────────────────────────────────────
var currentUser = {};
try { currentUser = JSON.parse(localStorage.getItem('articom-user') || '{}'); } catch(e) {}

if (currentUser.id) {
    fetch('/api/notifications/' + currentUser.id)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var total = (data.messages ? data.messages.length : 0) + (data.commissions ? data.commissions.length : 0);
        if (total > 0) {
            var bell = document.querySelector('.mail-btn');
            if (bell) {
                bell.style.position = 'relative';
                var badge = document.createElement('span');
                badge.style.cssText = 'background:red;color:white;border-radius:50%;padding:1px 5px;font-size:10px;position:absolute;top:-4px;right:-4px;';
                badge.textContent = total;
                bell.appendChild(badge);
            }
        }
      });
}
    }

});