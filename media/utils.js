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
