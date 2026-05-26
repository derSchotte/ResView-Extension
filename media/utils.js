// @ts-check
"use strict";

/**
 * Escapes a string for safe HTML insertion.
 * @param {unknown} value
 * @returns {string}
 */
export function escHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Formats a CSS pixel value for display ("0", "12", or "—" for empty/NaN).
 * @param {unknown} value
 * @returns {string}
 */
export function pxDisplay(value) {
  if (!value) return "—";
  const n = parseFloat(String(value));
  if (isNaN(n)) return String(value);
  return n === 0 ? "0" : String(Math.round(n));
}

/**
 * Shorthand for document.getElementById.
 * @param {string} id
 * @returns {HTMLElement}
 */
export function el(id) {
  return /** @type {HTMLElement} */ (document.getElementById(id));
}

/**
 * Returns the proxy URL for a given original URL, routing it through the
 * local inspector proxy so scripts can be injected into the page.
 * Falls back to the original URL if proxyPort is 0 or the URL is invalid.
 * @param {string} url
 * @param {number} proxyPort
 * @returns {string}
 */
export function toProxyUrl(url, proxyPort) {
  if (!url || !proxyPort) return url;
  try {
    const { pathname, search } = new URL(url);
    return `http://127.0.0.1:${proxyPort}${pathname}${search}`;
  } catch {
    return url;
  }
}
