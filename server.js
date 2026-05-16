const express  = require('express');
const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const cors     = require('cors');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');

const app = express();
const db  = new Database('database.db');

// ── MIDDLEWARE ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

// ── DATABASE SETUP ────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname TEXT,
    email    TEXT UNIQUE,
    password TEXT,
    birthday TEXT,
    gender   TEXT,
    role     TEXT,
    created  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS artworks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,
    title      TEXT,
    category   TEXT,
    price      TEXT,
    image_path TEXT,
    created    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS commissions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id   INTEGER,
    artist_id   INTEGER,
    title       TEXT,
    description TEXT,
    budget      TEXT,
    deadline    TEXT,
    status      TEXT DEFAULT 'pending',
    created     TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id   INTEGER,
    receiver_id INTEGER,
    message     TEXT,
    sent_at     TEXT DEFAULT (datetime('now'))
  );
`);

// ── FILE UPLOAD ───────────────────────────────────────────────
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ═══════════════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════════════

// ── REGISTER ──────────────────────────────────────────────────
app.post('/api/register', (req, res) => {
  const { fullname, email, password, birthday, gender, role } = req.body;

  if (!fullname || !email || !password || !role) {
    return res.json({ success: false, message: 'Fill in all fields.' });
  }

  // Check if email already exists first
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.json({ success: false, message: 'Email already exists!' });
  }

  try {
    const hashed = bcrypt.hashSync(password, 10);
    db.prepare(`
      INSERT INTO users (fullname, email, password, birthday, gender, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(fullname, email, hashed, birthday || '', gender || '', role);

    res.json({ success: true });
  } catch (e) {
    console.error('Register error:', e.message);
    res.json({ success: false, message: 'Registration failed: ' + e.message });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ success: false, message: 'Fill in all fields.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.json({ success: false, message: 'Email not found!' });
    }

    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      return res.json({ success: false, message: 'Wrong password!' });
    }

    res.json({
      success: true,
      user: {
        id:       user.id,
        fullname: user.fullname,
        email:    user.email,
        role:     user.role
      }
    });
  } catch (e) {
    console.error('Login error:', e.message);
    res.json({ success: false, message: 'Login failed: ' + e.message });
  }
});

// ── GET ALL ARTISTS ───────────────────────────────────────────
app.get('/api/artists', (req, res) => {
  try {
    const artists = db.prepare(`SELECT id, fullname, email FROM users WHERE role = 'artist'`).all();
    res.json(artists);
  } catch (e) {
    res.json([]);
  }
});

// ── UPLOAD ARTWORK ────────────────────────────────────────────
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    const { user_id, title, category, price } = req.body;
    const image_path = req.file ? req.file.filename : '';

    db.prepare(`
      INSERT INTO artworks (user_id, title, category, price, image_path)
      VALUES (?, ?, ?, ?, ?)
    `).run(user_id, title, category, price || '', image_path);

    res.json({ success: true });
  } catch (e) {
    console.error('Upload error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// ── GET ARTWORKS ──────────────────────────────────────────────
app.get('/api/artworks', (req, res) => {
  try {
    const artworks = db.prepare(`
      SELECT a.*, u.fullname as artist_name
      FROM artworks a JOIN users u ON a.user_id = u.id
    `).all();
    res.json(artworks);
  } catch (e) {
    res.json([]);
  }
});

// ── POST COMMISSION ───────────────────────────────────────────
app.post('/api/commission', (req, res) => {
  try {
    const { client_id, artist_id, title, description, budget, deadline } = req.body;

    db.prepare(`
      INSERT INTO commissions (client_id, artist_id, title, description, budget, deadline)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      client_id,
      artist_id || null,
      title || 'Untitled',
      description || '',
      budget || 'Negotiable',
      deadline || null
    );

    res.json({ success: true });
  } catch (e) {
    console.error('Commission error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// ── SEND MESSAGE ──────────────────────────────────────────────
app.post('/api/message', (req, res) => {
  try {
    const { sender_id, receiver_id, message } = req.body;

    db.prepare(`
      INSERT INTO messages (sender_id, receiver_id, message)
      VALUES (?, ?, ?)
    `).run(sender_id, receiver_id, message);

    res.json({ success: true });
  } catch (e) {
    console.error('Message error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// ── GET MESSAGES ──────────────────────────────────────────────
app.get('/api/messages', (req, res) => {
  try {
    const { me, other } = req.query;

    const msgs = db.prepare(`
      SELECT m.*, u.fullname as sender_name
      FROM messages m JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id=? AND m.receiver_id=?)
         OR (m.sender_id=? AND m.receiver_id=?)
      ORDER BY m.sent_at ASC
    `).all(me, other, other, me);

    res.json(msgs);
  } catch (e) {
    res.json([]);
  }
});

// ── GET ALL USERS (for admin) ─────────────────────────────────
app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare(`SELECT id, fullname, email, role, created FROM users`).all();
    res.json(users);
  } catch (e) {
    res.json([]);
  }
});



// ── SAVE PROFILE ──────────────────────────────────────────────
app.post('/api/profile', (req, res) => {
  try {
    const { user_id, bio, location, specialization, profile_pic } = req.body;

    // Add profile columns if not exist
    try { db.exec(`ALTER TABLE users ADD COLUMN bio TEXT`); } catch(e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN location TEXT`); } catch(e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN specialization TEXT`); } catch(e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN profile_pic TEXT`); } catch(e) {}

    db.prepare(`
      UPDATE users SET bio=?, location=?, specialization=?, profile_pic=?
      WHERE id=?
    `).run(bio||'', location||'', specialization||'', profile_pic||'', user_id);

    res.json({ success: true });
  } catch(e) {
    console.error('Profile error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// ── GET PROFILE ───────────────────────────────────────────────
app.get('/api/profile/:id', (req, res) => {
  try {
    const user = db.prepare(`SELECT id, fullname, email, role, bio, location, specialization, profile_pic FROM users WHERE id=?`).get(req.params.id);
    res.json(user || {});
  } catch(e) {
    res.json({});
  }
});

// ── SAVE TRANSACTION ──────────────────────────────────────────
app.post('/api/transaction', (req, res) => {
  try {
    const { client_id, artist_id, amount, payment_method, description } = req.body;

    try { db.exec(`CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      artist_id INTEGER,
      amount TEXT,
      payment_method TEXT,
      description TEXT,
      status TEXT DEFAULT 'completed',
      created TEXT DEFAULT (datetime('now'))
    )`); } catch(e) {}

    db.prepare(`
      INSERT INTO transactions (client_id, artist_id, amount, payment_method, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(client_id, artist_id||null, amount||'0', payment_method||'', description||'');

    res.json({ success: true });
  } catch(e) {
    console.error('Transaction error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// ── GET TRANSACTIONS ──────────────────────────────────────────
app.get('/api/transactions', (req, res) => {
  try {
    const rows = db.prepare(`SELECT * FROM transactions ORDER BY created DESC`).all();
    res.json(rows);
  } catch(e) {
    res.json([]);
  }
});

// ── GET COMMISSIONS ───────────────────────────────────────────
app.get('/api/commissions', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT c.*, u.fullname as client_name
      FROM commissions c JOIN users u ON c.client_id = u.id
      ORDER BY c.created DESC
    `).all();
    res.json(rows);
  } catch(e) {
    res.json([]);
  }
});
const http = require('http');
const { WebSocketServer } = require('ws');

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// store connected clients
const clients = new Map(); // user_id -> ws

wss.on('connection', function(ws) {
    ws.on('message', function(raw) {
        try {
            const data = JSON.parse(raw);

            // register user
            if (data.type === 'register') {
                clients.set(String(data.user_id), ws);
                ws.user_id = String(data.user_id);
            }

            // relay message to receiver
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
        } catch(e) {}
    });

    ws.on('close', function() {
        if (ws.user_id) clients.delete(ws.user_id);
    });
});

// ── PAYPAL SETUP ──────────────────────────────────────────────
const paypal = require('@paypal/checkout-server-sdk');

const paypalClient = new paypal.core.PayPalHttpClient(
  new paypal.core.SandboxEnvironment(
    'AcFCxPypADxS19JnZ8JItQvNht95nd2vxQFJaNjzDgFYiPDiag9jC22XgD6wxS8mOu4rOPBLPSZjYJLp',     // replace this
    'EH8EHzssq8DEndenI69fAV-Pt57zhOO0b-nVOk-5NCuovuO3PBV3aIepegcr-fSflA4ezWRU9bsbsr7n'  // replace this
  )
);

// Create PayPal order
app.post('/api/paypal/create-order', async (req, res) => {
  try {
    const { amount, description } = req.body;
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: 'USD', value: String(parseFloat(amount).toFixed(2)) },
        description: description || 'Artwork Commission'
      }]
    });
    const order = await paypalClient.execute(request);
    res.json({ success: true, orderID: order.result.id });
  } catch(e) {
    console.error('PayPal create error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// Capture PayPal order
app.post('/api/paypal/capture-order', async (req, res) => {
  try {
    const { orderID, client_id, artist_id, amount, description } = req.body;
    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});
    const capture = await paypalClient.execute(request);

    // save to transactions table
    db.prepare(`
      INSERT INTO transactions (client_id, artist_id, amount, payment_method, description, status)
      VALUES (?, ?, ?, 'paypal', ?, 'completed')
    `).run(client_id || null, artist_id || null, amount, description || 'Commission Payment');

    res.json({ success: true, details: capture.result });
  } catch(e) {
    console.error('PayPal capture error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// CHANGE app.listen TO server.listen
server.listen(3000, () => {
    console.log('✅ ARTICOM running at http://localhost:3000');
    console.log('📁 Open: http://localhost:3000/folder_a.vscode/index.html');
});

