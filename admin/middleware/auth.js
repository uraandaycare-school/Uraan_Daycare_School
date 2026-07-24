'use strict';

/**
 * auth.js — Admin session guard middleware
 * Redirects unauthenticated requests to /admin/login
 */
function requireAdminAuth(req, res, next) {
  if (req.session && req.session.adminUser) {
    return next();
  }
  // Store intended destination so we can redirect after login
  req.session.returnTo = req.originalUrl;
  return res.redirect('/admin/login');
}

module.exports = { requireAdminAuth };
