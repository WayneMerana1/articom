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