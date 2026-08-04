'use strict';

/**
 * Netlify Serverless Function — Uraan Daycare & School
 *
 * Wraps the Express app with serverless-http so Netlify can invoke it
 * as a Lambda function. All HTTP traffic is proxied here via netlify.toml.
 *
 * Environment variables required (set in Netlify dashboard → Site → Environment):
 *   DATABASE_URL       — Neon PostgreSQL connection string
 *   SESSION_SECRET     — Strong random string (min 32 chars)
 *   RECAPTCHA_SITE_KEY — Google reCAPTCHA v2 site key
 *   RECAPTCHA_SECRET_KEY — Google reCAPTCHA v2 secret key
 *   NODE_ENV           — Set to "production"
 */

const serverless = require('serverless-http');
const app        = require('../../server');

module.exports.handler = serverless(app);
