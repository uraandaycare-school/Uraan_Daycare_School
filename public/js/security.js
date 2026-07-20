/**
 * URAAN-WEB-2026: Client-Side Security Guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Loaded BEFORE main.js to establish DOM safety primitives at page start.
 *
 * OWASP Coverage:
 *   A03 – XSS: document.write() XSS vector blocked
 *   A03 – XSS: safeText() and textNode() enforce textContent over innerHTML
 *   A03 – XSS: escapeHTML() utility for any dynamic UI rendering
 *
 * This script intentionally makes no network requests and has no dependencies.
 */

(function (window, document) {
  'use strict';

  // ── 1. Block document.write / document.writeln ────────────────────────────
  // document.write() is a classic XSS injection vector that can be used to
  // replace the entire page DOM. It has no legitimate use in modern web apps.
  document.write = function () {
    console.warn('[Uraan/Security] document.write() is disabled on this page.');
  };
  document.writeln = document.write;

  // ── 2. Expose a frozen security utility namespace ─────────────────────────
  // Use Object.defineProperty so the namespace cannot be overwritten.
  Object.defineProperty(window, 'UraanSecurity', {
    value: Object.freeze({

      /**
       * Safely set an element's visible text content.
       * ALWAYS prefer this over innerHTML when displaying user-supplied data.
       *
       * @param {Element} el   - Target DOM element
       * @param {string}  text - Raw text string (user input safe)
       */
      safeText: function (el, text) {
        if (el instanceof Element) {
          el.textContent = String(text);
        }
      },

      /**
       * Escape HTML special characters to prevent XSS in dynamic content.
       * Uses the browser's own text serializer — no regex needed.
       *
       * @param  {string} str - Raw user-supplied string
       * @returns {string}    - HTML-entity-escaped safe string
       */
      escapeHTML: function (str) {
        const span = document.createElement('span');
        span.textContent = String(str);
        return span.innerHTML;
      },

      /**
       * Create a Text node from user input — always XSS-safe.
       * Insert into DOM directly without innerHTML.
       *
       * @param  {string} str - Raw string
       * @returns {Text}      - Safe DOM Text node
       */
      textNode: function (str) {
        return document.createTextNode(String(str));
      },

    }),
    writable:     false,
    configurable: false,
    enumerable:   true,
  });

}(window, document));
