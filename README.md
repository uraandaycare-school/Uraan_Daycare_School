# Uraan Daycare & Montessori — Pre-Launch Waitlist

[![Deployed on Cloudflare Pages](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-orange?logo=cloudflare)](https://pages.cloudflare.com)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)](https://nodejs.org)
[![Security](https://img.shields.io/badge/Security-OWASP%20Hardened-blue)](https://owasp.org)

> **Karachi's first high-security Montessori daycare** — pre-launch VIP waitlist page deployed on Cloudflare Pages.

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
| Deployment | Cloudflare Pages (Advanced Mode via `_worker.js`) |

---

## 📁 Project Structure

```
Uraan/
├── server.js              # Express server (OWASP hardened, Cloudflare-ready)
├── _worker.js             # Cloudflare Pages entry point (wraps Express app)
├── build.js               # esbuild bundler script (run before deploy)
├── wrangler.toml          # Cloudflare Wrangler configuration
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
# Edit .env and fill in your keys
```

`.env` file:
```
DATABASE_URL=your_neon_postgres_connection_string
SESSION_SECRET=a_long_random_secret_min_64_chars
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

## ☁️ Cloudflare Pages Deployment

This app uses **Cloudflare Pages Advanced Mode** via a `_worker.js` entry point that wraps the Express app using Cloudflare's `nodejs_compat` layer.

### Deploy via Cloudflare Pages Dashboard

1. Push this repo to GitHub
2. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → Connect to Git
3. Set the following **Build Settings** in the dashboard:

   | Setting | Value |
   |---|---|
   | Build command | `npm install && npm run build` |
   | Build output directory | `/` (root) |
   | Root directory | `/` (root) |

4. Add the following **Environment Variables** under *Settings → Environment Variables → Production*:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Your Neon PostgreSQL connection string |
   | `SESSION_SECRET` | A long random secret (min 64 chars) |
   | `RECAPTCHA_SITE_KEY` | Your reCAPTCHA v2 site key |
   | `RECAPTCHA_SECRET_KEY` | Your reCAPTCHA v2 secret key |
   | `NODE_ENV` | `production` |

5. Deploy — Cloudflare detects `_worker.js` and runs it in Workers runtime with `nodejs_compat`.

### Deploy via CLI (Wrangler)
```bash
npm install
npm run build
npx wrangler pages deploy . --project-name uraan-daycare-school
```

> **Note:** The `DATABASE_URL` must be set in the Cloudflare dashboard; it cannot be committed to `wrangler.toml` for security.

---

## 🗄️ Database (Neon PostgreSQL)

This app uses [Neon](https://neon.tech) serverless PostgreSQL, which supports WebSocket-based connections compatible with Cloudflare Workers.

**Connection string format:**
```
postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

The `pg` driver connects over TLS to Neon's serverless endpoint. Ensure your `DATABASE_URL` includes `?sslmode=require`.

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
