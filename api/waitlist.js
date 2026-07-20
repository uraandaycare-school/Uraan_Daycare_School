'use strict';

/**
 * Vercel Serverless Function: POST /api/waitlist
 * Handles VIP Waitlist signups for Uraan Daycare & School pre-launch page.
 */

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[;'"\\]/g, ' ')
    .trim();
}

const VALIDATORS = {
  name:  (v) => /^[a-zA-Z\s]{2,100}$/.test(v),
  phone: (v) => /^(?:\+92|92|0)?3\d{9}$|^\+?[0-9\s\-()]{7,20}$/.test(v),
  email: (v) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v),
};

function redact(str) {
  if (!str || typeof str !== 'string' || str.length === 0) return '[empty]';
  return str.slice(0, 2) + '***';
}

module.exports = async function handler(req, res) {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const raw = req.body || {};
    const sName  = sanitizeInput(String(raw.name  || ''));
    const sEmail = sanitizeInput(String(raw.email || ''));
    const sPhone = sanitizeInput(String(raw.phone || ''));

    if (!VALIDATORS.name(sName)) {
      return res.status(400).json({ success: false, message: 'Invalid name. Only letters allowed.' });
    }
    if (!VALIDATORS.email(sEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }
    if (!VALIDATORS.phone(sPhone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format.' });
    }

    // OWASP A09: PII-redacted structured log
    console.log(`[WAITLIST] Registered: ${redact(sName)} | Email: ${redact(sEmail)} | Phone: ${redact(sPhone)}`);

    return res.status(200).json({
      success: true,
      message: "You're on the list! We'll WhatsApp you the moment enrollment opens.",
    });
  } catch (err) {
    console.error('[WAITLIST ERROR]', err);
    return res.status(500).json({ success: false, message: 'Internal server error processing waitlist request.' });
  }
};
