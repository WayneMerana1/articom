const express  = require('express');
const sqlite3  = require('sqlite3').verbose();
const bcrypt   = require('bcryptjs');
const cors     = require('cors');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const http     = require('http');
const { WebSocketServer } = require('ws');
const paypal   = require('@paypal/checkout-server-sdk');

const app = express();
const nodemailer = require('nodemailer');

// ── EMAIL SETUP ───────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'waynemerana@gmail.com', 
        pass: 'vcla dpsc toer pxop'        // replace with app password
    }
});

// Store OTPs temporarily
const otpStore = new Map(); // email -> { otp, expires }

// ── MIDDLEWARE ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static('.'));
app.use(express.static(path.join(__dirname, 'folder_a.vscode')));
app.use(express.static(path.join(__dirname, 'homepage_2', 'homepage')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'folder_a.vscode', 'index.html'));
});

// ── DATABASE ──────────────────────────────────────────────────
const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
    if (err) console.error('DB error:', err.message);
    else console.log('✅ Database connected');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        fullname TEXT,
        email    TEXT UNIQUE,
        password TEXT,
        birthday TEXT,
        gender   TEXT,
        role     TEXT,
        bio      TEXT,
        location TEXT,
        specialization TEXT,
        profile_pic    TEXT,
        created  TEXT DEFAULT (datetime('now'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS artworks (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER,
        title      TEXT,
        category   TEXT,
        price      TEXT,
        image_path TEXT,
        created    TEXT DEFAULT (datetime('now'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS commissions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id   INTEGER,
        artist_id   INTEGER,
        title       TEXT,
        description TEXT,
        budget      TEXT,
        deadline    TEXT,
        status      TEXT DEFAULT 'pending',
        created     TEXT DEFAULT (datetime('now'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id   INTEGER,
        receiver_id INTEGER,
        message     TEXT,
        sent_at     TEXT DEFAULT (datetime('now'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id      INTEGER,
        artist_id      INTEGER,
        amount         TEXT,
        payment_method TEXT,
        description    TEXT,
        status         TEXT DEFAULT 'completed',
        created        TEXT DEFAULT (datetime('now'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ratings (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        artist_id INTEGER,
        client_id INTEGER,
        rating    INTEGER,
        review    TEXT,
        created   TEXT DEFAULT (datetime('now'))
    )`);
});

// ── FILE UPLOAD ───────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ── DB HELPERS ────────────────────────────────────────────────
function dbGet(sql, params) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
    });
}
function dbAll(sql, params) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
    });
}
function dbRun(sql, params) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) { err ? reject(err) : resolve(this); });
    });
}

// ══════════════════════════════════════════════════════════════
//  API ROUTES
// ══════════════════════════════════════════════════════════════

// ── REGISTER ──────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
    const { fullname, email, password, birthday, gender, role } = req.body;
    if (!fullname || !email || !password || !role)
        return res.json({ success: false, message: 'Fill in all fields.' });
    try {
        const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) return res.json({ success: false, message: 'Email already exists!' });
        const hashed = bcrypt.hashSync(password, 10);
        await dbRun(
            'INSERT INTO users (fullname,email,password,birthday,gender,role) VALUES (?,?,?,?,?,?)',
            [fullname, email, hashed, birthday || '', gender || '', role]
        );
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// ── LOGIN ─────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ success: false, message: 'Fill in all fields.' });
    try {
        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) return res.json({ success: false, message: 'Email not found!' });
        if (!bcrypt.compareSync(password, user.password))
            return res.json({ success: false, message: 'Wrong password!' });
        res.json({ success: true, user: { id: user.id, fullname: user.fullname, email: user.email, role: user.role } });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// ── USERS ─────────────────────────────────────────────────────
app.get('/api/users', async (req, res) => {
    try { res.json(await dbAll('SELECT id,fullname,email,role,created FROM users', [])); }
    catch (e) { res.json([]); }
});

// ── ARTISTS ───────────────────────────────────────────────────
app.get('/api/artists', async (req, res) => {
    try { res.json(await dbAll("SELECT id,fullname,email FROM users WHERE role='artist'", [])); }
    catch (e) { res.json([]); }
});

// ── UPLOAD ARTWORK ────────────────────────────────────────────
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        const { user_id, title, category, price } = req.body;
        const image_path = req.file ? req.file.filename : '';
        await dbRun(
            'INSERT INTO artworks (user_id,title,category,price,image_path) VALUES (?,?,?,?,?)',
            [user_id, title, category, price || '', image_path]
        );
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// ── GET ARTWORKS ──────────────────────────────────────────────
app.get('/api/artworks', async (req, res) => {
    try {
        res.json(await dbAll(
            'SELECT a.*,u.fullname as artist_name FROM artworks a JOIN users u ON a.user_id=u.id', []
        ));
    } catch (e) { res.json([]); }
});

// ── POST COMMISSION ───────────────────────────────────────────
app.post('/api/commission', async (req, res) => {
    try {
        const { client_id, artist_id, title, description, budget, deadline } = req.body;
        await dbRun(
            'INSERT INTO commissions (client_id,artist_id,title,description,budget,deadline) VALUES (?,?,?,?,?,?)',
            [client_id, artist_id || null, title || 'Untitled', description || '', budget || 'Negotiable', deadline || null]
        );
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// ── GET COMMISSIONS ───────────────────────────────────────────
app.get('/api/commissions', async (req, res) => {
    try {
        res.json(await dbAll(
            'SELECT c.*,u.fullname as client_name FROM commissions c JOIN users u ON c.client_id=u.id ORDER BY c.created DESC', []
        ));
    } catch (e) { res.json([]); }
});

// ── SEND MESSAGE ──────────────────────────────────────────────
app.post('/api/message', async (req, res) => {
    try {
        const { sender_id, receiver_id, message } = req.body;
        await dbRun('INSERT INTO messages (sender_id,receiver_id,message) VALUES (?,?,?)',
            [sender_id, receiver_id, message]);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// ── GET MESSAGES ──────────────────────────────────────────────
app.get('/api/messages', async (req, res) => {
    try {
        const { me, other } = req.query;
        res.json(await dbAll(
            `SELECT m.*,u.fullname as sender_name FROM messages m JOIN users u ON m.sender_id=u.id
             WHERE (m.sender_id=? AND m.receiver_id=?) OR (m.sender_id=? AND m.receiver_id=?)
             ORDER BY m.sent_at ASC`,
            [me, other, other, me]
        ));
    } catch (e) { res.json([]); }
});

// ── SAVE PROFILE ──────────────────────────────────────────────
app.post('/api/profile', async (req, res) => {
    try {
        const { user_id, bio, location, specialization, profile_pic } = req.body;
        await dbRun(
            'UPDATE users SET bio=?,location=?,specialization=?,profile_pic=? WHERE id=?',
            [bio || '', location || '', specialization || '', profile_pic || '', user_id]
        );
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// ── GET PROFILE ───────────────────────────────────────────────
app.get('/api/profile/:id', async (req, res) => {
    try {
        res.json(await dbGet(
            'SELECT id,fullname,email,role,bio,location,specialization,profile_pic FROM users WHERE id=?',
            [req.params.id]
        ) || {});
    } catch (e) { res.json({}); }
});

// ── SAVE TRANSACTION ──────────────────────────────────────────
app.post('/api/transaction', async (req, res) => {
    try {
        const { client_id, artist_id, amount, payment_method, description } = req.body;
        await dbRun(
            'INSERT INTO transactions (client_id,artist_id,amount,payment_method,description) VALUES (?,?,?,?,?)',
            [client_id, artist_id || null, amount || '0', payment_method || '', description || '']
        );
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// ── GET TRANSACTIONS ──────────────────────────────────────────
app.get('/api/transactions', async (req, res) => {
    try { res.json(await dbAll('SELECT * FROM transactions ORDER BY created DESC', [])); }
    catch (e) { res.json([]); }
});

// ── RATINGS ───────────────────────────────────────────────────
app.post('/api/rating', async (req, res) => {
    try {
        const { artist_id, client_id, rating, review } = req.body;
        await dbRun('INSERT INTO ratings (artist_id,client_id,rating,review) VALUES (?,?,?,?)',
            [artist_id, client_id, rating, review]);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

app.get('/api/ratings/:artist_id', async (req, res) => {
    try {
        const rows = await dbAll(
            'SELECT r.*,u.fullname as client_name FROM ratings r JOIN users u ON r.client_id=u.id WHERE r.artist_id=? ORDER BY r.created DESC',
            [req.params.artist_id]
        );
        const avg = rows.length ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1) : 0;
        res.json({ ratings: rows, average: avg, total: rows.length });
    } catch (e) {
        res.json({ ratings: [], average: 0, total: 0 });
    }
});

// ── NOTIFICATIONS ─────────────────────────────────────────────
app.get('/api/notifications/:user_id', async (req, res) => {
    try {
        const uid = req.params.user_id;
        const messages = await dbAll(
            'SELECT m.*,u.fullname as sender_name FROM messages m JOIN users u ON m.sender_id=u.id WHERE m.receiver_id=? ORDER BY m.sent_at DESC LIMIT 10',
            [uid]
        );
        const commissions = await dbAll(
            'SELECT c.*,u.fullname as client_name FROM commissions c JOIN users u ON c.client_id=u.id WHERE c.artist_id=? ORDER BY c.created DESC LIMIT 10',
            [uid]
        );
        res.json({ messages, commissions });
    } catch (e) {
        res.json({ messages: [], commissions: [] });
    }
});

// ── ADMIN STATS ───────────────────────────────────────────────
app.get('/api/admin/stats', async (req, res) => {
    try {
        const users        = await dbAll('SELECT id,fullname,email,role,created FROM users', []);
        const artworks     = await dbAll('SELECT a.*,u.fullname as artist_name FROM artworks a JOIN users u ON a.user_id=u.id', []);
        const commissions  = await dbAll('SELECT * FROM commissions', []);
        const transactions = await dbAll('SELECT * FROM transactions', []);
        const msgs         = await dbAll('SELECT COUNT(*) as count FROM messages', []);
        res.json({
            total_users:        users.length,
            total_artists:      users.filter(u => u.role === 'artist').length,
            total_clients:      users.filter(u => u.role === 'user').length,
            total_artworks:     artworks.length,
            total_commissions:  commissions.length,
            total_transactions: transactions.length,
            total_messages:     msgs[0].count,
            users, artworks, transactions
        });
    } catch (e) { res.json({}); }
});

app.delete('/api/admin/user/:id', async (req, res) => {
    try {
        await dbRun('DELETE FROM users WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

// ── PAYPAL ────────────────────────────────────────────────────
const paypalClient = new paypal.core.PayPalHttpClient(
    new paypal.core.SandboxEnvironment(
        'AcFCxPypADxS19JnZ8JItQvNht95nd2vxQFJaNjzDgFYiPDiag9jC22XgD6wxS8mOu4rOPBLPSZjYJLp',
        'EH8EHzssq8DEndenI69fAV-Pt57zhOO0b-nVOk-5NCuovuO3PBV3aIepegcr-fSflA4ezWRU9bsbsr7n'
    )
);

app.post('/api/paypal/create-order', async (req, res) => {
    try {
        const { amount, description } = req.body;
        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer('return=representation');
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: { currency_code: 'USD', value: String(parseFloat(amount || 5).toFixed(2)) },
                description: description || 'Artwork Commission'
            }]
        });
        const order = await paypalClient.execute(request);
        res.json({ success: true, orderID: order.result.id });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

app.post('/api/paypal/capture-order', async (req, res) => {
    try {
        const { orderID, client_id, artist_id, amount, description } = req.body;
        const request = new paypal.orders.OrdersCaptureRequest(orderID);
        request.requestBody({});
        const capture = await paypalClient.execute(request);
        await dbRun(
            "INSERT INTO transactions (client_id,artist_id,amount,payment_method,description,status) VALUES (?,?,?,'paypal',?,'completed')",
            [client_id || null, artist_id || null, amount, description || 'Commission Payment']
        );
        res.json({ success: true, details: capture.result });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// ── WEBSOCKET + SERVER ────────────────────────────────────────
const server  = http.createServer(app);
const wss     = new WebSocketServer({ server });
const clients = new Map();

wss.on('connection', function(ws) {
    ws.on('message', function(raw) {
        try {
            const data = JSON.parse(raw);
            if (data.type === 'register') {
                clients.set(String(data.user_id), ws);
                ws.user_id = String(data.user_id);
            }
            if (data.type === 'message') {
                const receiver = clients.get(String(data.receiver_id));
                if (receiver && receiver.readyState === 1) {
                    receiver.send(JSON.stringify({
                        type:      'message',
                        sender_id: data.sender_id,
                        message:   data.message,
                        sent_at:   new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }));
                }
            }
        } catch (e) {}
    });
    ws.on('close', function() { if (ws.user_id) clients.delete(ws.user_id); });
});

// ── SEND OTP ──────────────────────────────────────────────────
app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.json({ success: false, message: 'Email required.' });

    // Check if email looks real (basic check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.json({ success: false, message: 'Invalid email format.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(email, { otp, expires });

    try {
        await transporter.sendMail({
            from: '"ARTICOM" <YOUR_GMAIL@gmail.com>',
            to: email,
            subject: 'Your ARTICOM OTP Code',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:400px;margin:auto;padding:30px;background:#3a3535;border-radius:16px;color:white;">
                    <h2 style="color:#e3bfdb;text-align:center;">ARTICOM</h2>
                    <p>Your OTP verification code is:</p>
                    <div style="font-size:36px;font-weight:900;text-align:center;color:#e3bfdb;letter-spacing:8px;padding:20px;background:#272222;border-radius:12px;margin:20px 0;">
                        ${otp}
                    </div>
                    <p style="font-size:12px;color:rgba(255,255,255,0.5);">This code expires in 5 minutes. Do not share it with anyone.</p>
                </div>
            `
        });
        res.json({ success: true, message: 'OTP sent!' });
    } catch (e) {
        console.error('Email error:', e.message);
        res.json({ success: false, message: 'Failed to send email.' });
    }
});

// ── VERIFY OTP ─────────────────────────────────────────────────
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const stored = otpStore.get(email);

    if (!stored) return res.json({ success: false, message: 'OTP not found. Please request again.' });
    if (Date.now() > stored.expires) {
        otpStore.delete(email);
        return res.json({ success: false, message: 'OTP expired. Please request again.' });
    }
    if (stored.otp !== otp) return res.json({ success: false, message: 'Wrong OTP!' });

    otpStore.delete(email);
    res.json({ success: true });
});

// ── FORGOT PASSWORD ───────────────────────────────────────────
app.post('/api/forgot-password', async (req, res) => {
    const { email, newPassword, otp } = req.body;

    // Verify OTP first
    const stored = otpStore.get(email + '_reset');
    if (!stored || Date.now() > stored.expires || stored.otp !== otp) {
        return res.json({ success: false, message: 'Invalid or expired OTP.' });
    }
    otpStore.delete(email + '_reset');

    try {
        const user = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
        if (!user) return res.json({ success: false, message: 'Email not found!' });

        const hashed = bcrypt.hashSync(newPassword, 10);
        await dbRun('UPDATE users SET password = ? WHERE email = ?', [hashed, email]);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// ── SEND RESET OTP ────────────────────────────────────────────
app.post('/api/send-reset-otp', async (req, res) => {
    const { email } = req.body;

    const user = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (!user) return res.json({ success: false, message: 'Email not registered!' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000;
    otpStore.set(email + '_reset', { otp, expires });

    try {
        await transporter.sendMail({
            from: '"ARTICOM" <waynemerana@gmail.com>',
            to: email,
            subject: 'ARTICOM Password Reset',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:400px;margin:auto;padding:30px;background:#3a3535;border-radius:16px;color:white;">
                    <h2 style="color:#e3bfdb;text-align:center;">ARTICOM</h2>
                    <p>Your password reset code is:</p>
                    <div style="font-size:36px;font-weight:900;text-align:center;color:#e3bfdb;letter-spacing:8px;padding:20px;background:#272222;border-radius:12px;margin:20px 0;">
                        ${otp}
                    </div>
                    <p style="font-size:12px;color:rgba(255,255,255,0.5);">This code expires in 5 minutes.</p>
                </div>
            `
        });
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, message: 'Failed to send email.' });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('✅ ARTICOM running on port ' + PORT);
});