# Uraan Daycare & Montessori — Pre-Launch Waitlist

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://vercel.com)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)](https://nodejs.org)
[![Security](https://img.shields.io/badge/Security-OWASP%20Hardened-blue)](https://owasp.org)

> **Karachi's first high-security Montessori daycare** — pre-launch VIP waitlist page deployed on Vercel.

---

## 🏫 About

Uraan Daycare & Montessori is an upcoming early childhood education campus in Karachi, Pakistan, combining authentic Montessori pedagogy with 24/7 biometric security and live parent CCTV streaming.

This repository contains the **pre-launch coming-soon waitlist page** only, built to collect priority VIP pre-registrations before the physical campus opens.

- **Directoress:** Montessori Directoress Nida Asif
- **Campus Location:** Banglow No. A-250, Sector 11-A, Gulshan-e-Usman, Near Powerhouse Roundabout, North Karachi.
- **Contact:** uraandaycare@gmail.com | +92 334 3328877
- **Launch:** August 2026

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (Express.js) |
| Templating | EJS |
| Styling | Tailwind CSS (Play CDN) + Custom CSS |
| Animations | GSAP + ScrollTrigger |
| Security | Helmet, express-rate-limit, CSP nonce, CSRF guard |
| Captcha | Google reCAPTCHA v2 |
| Deployment | Vercel (`@vercel/node`) |

---

## 📁 Project Structure

```
Uraan/
├── server.js              # Express server (OWASP hardened, Vercel-ready)
├── vercel.json            # Vercel deployment configuration
├── package.json           # Dependencies
├── .env.example           # Environment variable template
├── views/
│   └── coming-soon.ejs    # Pre-launch waitlist page (single page)
└── public/
    ├── assets/            # Logo & images (U.png, Uraan.jpeg)
    └── css/
        └── style.css      # Custom CSS design tokens
```

---

## ⚙️ Local Development

### 1. Clone & install
```bash
git clone https://github.com/your-org/uraan.git
cd uraan
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Edit .env and fill in your reCAPTCHA keys
```

`.env` file:
```
RECAPTCHA_SITE_KEY=your_recaptcha_site_key
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key
NODE_ENV=development
```

### 3. Run locally
```bash
node server.js
# → http://localhost:3000
```

---

## ☁️ Vercel Deployment

### Deploy via Vercel Dashboard
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import repo
3. Add environment variables in Vercel dashboard:
   - `RECAPTCHA_SITE_KEY`
   - `RECAPTCHA_SECRET_KEY`
   - `NODE_ENV=production`
4. Deploy — Vercel auto-detects `vercel.json` and uses `@vercel/node`

### Deploy via CLI
```bash
npm i -g vercel
vercel --prod
```

---

## 🔒 Security Features (OWASP)

| Control | Implementation |
|---|---|
| A01 – CSRF | `X-Requested-With` header enforced on all POST endpoints |
| A03 – XSS | CSP nonce per-request; input sanitization on all fields |
| A04 – Insecure Design | PII redacted in all log output |
| A05 – Misconfiguration | `frameAncestors: none`, `Permissions-Policy`, `Referrer-Policy` |
| A06 – Vulnerable Deps | `express-rate-limit`, `helmet`, SRI on CDN assets |
| A09 – Logging | Structured, redacted logging — no raw PII ever written to stdout |

---

## 📄 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves the coming-soon waitlist page |
| `POST` | `/api/waitlist` | VIP pre-registration (name, email, phone) |

> Rate limited to **5 submissions per IP per 15 minutes**.

---

## 🌐 Page Sections & Hash Navigation

| Section | URL Hash |
|---|---|
| Hero + Enrollment Form | `/#waitlist-section` |
| Why Uraan (Pillars) | `/#vision-tour` |
| Slot Calculator | `/#estimator-section` |
| Programs Overview | `/#programs-preview` |
| Safety & Apply | `/#coming-soon` |
| FAQ | `/#faq-section` |

---

## 📜 License

Private — All rights reserved © 2026 Uraan Daycare & Montessori, Karachi.
