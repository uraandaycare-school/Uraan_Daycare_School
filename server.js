'use strict';

require('dotenv').config();

const express     = require('express');
const path        = require('path');
const session     = require('express-session');
const pgSession   = require('connect-pg-simple')(session);
const pool        = require('./admin/db/connect');
const adminRouter = require('./admin/routes/adminRouter');

const app  = express();
const PORT = process.env.PORT || 3000;

// Required for Vercel (and any reverse-proxy host) so cookies/sessions work correctly
app.set('trust proxy', 1);

// ─── View Engine (EJS) ───────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', [
  path.join(__dirname, 'views'),
  path.join(__dirname, 'admin', 'views'),
]);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// ─── Session ──────────────────────────────────────────────────────────────────
app.use(
  session({
    store: new pgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'uraan-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge:   24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
    name: 'uraan.sid',
  })
);

// ─── Admin Router ─────────────────────────────────────────────────────────────
// Must come BEFORE the public catch-all route.
app.use('/admin', adminRouter);

// ─── API: Admissions ──────────────────────────────────────────────────────────
app.post('/api/admissions', async (req, res) => {
  const {
    childName, childDob, program,
    parentName, parentPhone, parentEmail,
    emergencyContact, shift,
  } = req.body;

  if (!childName || !childDob || !program || !parentName || !parentPhone || !parentEmail || !emergencyContact || !shift) {
    return res.status(400).json({ success: false, message: 'All required fields must be filled.' });
  }

  console.log(`[ADMISSIONS] Program: ${program} | Shift: ${shift}`);

  return res.status(200).json({
    success: true,
    message:
      'Congratulations! Your application has been submitted. ' +
      'Our Registrar will contact you shortly to confirm your campus visit.',
  });
});

// ─── API: Contact ─────────────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email || !phone || !message) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  console.log(`[CONTACT] Message received from: ${name}`);

  return res.status(200).json({
    success: true,
    message: 'Your message was sent successfully. We will reply within 24 hours.',
  });
});

// ─── API: Waitlist ────────────────────────────────────────────────────────────
app.post('/api/waitlist', (req, res) => {
  const { name, email, phone } = req.body || {};

  if (!name || !email || !phone) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  console.log(`[WAITLIST] New registration: ${name}`);

  return res.status(200).json({
    success: true,
    message: "You're on the list! We'll WhatsApp you the moment enrollment opens.",
  });
});

// ─── Page Routes ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.render('index');
});

// Catch-all: redirect unknown paths back to home
app.get('*', (req, res) => {
  res.redirect('/');
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const os = require('os');

function getLANAddress() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (
        net.family === 'IPv4' &&
        !net.internal &&
        !net.address.startsWith('169.') &&
        !name.toLowerCase().includes('vmware') &&
        !name.toLowerCase().includes('virtualbox')
      ) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    const lanIP = getLANAddress();
    console.log('=============================================================');
    console.log('  URAAN DAYCARE & SCHOOL WEB PORTAL');
    console.log('  Campus: Karachi, Pakistan');
    console.log('-------------------------------------------------------------');
    console.log(`  LOCAL   → http://localhost:${PORT}`);
    console.log(`  NETWORK → http://${lanIP}:${PORT}`);
    console.log('=============================================================');
  });
}

module.exports = app;
