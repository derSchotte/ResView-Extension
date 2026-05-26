// @ts-check
"use strict";

import { EventEmitter } from "./eventEmitter.js";

/**
 * Central state store — single source of truth for the entire UI.
 *
 * Events emitted:
 *   "deviceChanged"  — active device or orientation changed → PreviewController re-applies
 *   "deviceApplied"  — PreviewController finished layout → OverlayController redraws rulers
 *   "persistState"   — any UI state changed → ResViewApp persists to extension storage
 *   "closeCssRules"  — Inspector toggled on → CssRulesController closes its panel
 */
export class AppState extends EventEmitter {
  /** @type {any[]} */ devices = [];
  /** @type {any[]} */ customDevices = [];
  /** @type {string} */ currentCategory = "phone";
  /** @type {any|null} */ currentDevice = null;
  /** @type {boolean} */ isLandscape = false;
  /** @type {number} */ zoomLevel = 75;
  /** @type {string} */ currentUrl = "";
  /** @type {boolean} */ urlCollapsed = false;
  /** @type {number} */ proxyPort = 0;
  /** @type {any[]} */ detectedServers = [];
  /** @type {boolean} */ showGrid = false;
  /** @type {boolean} */ showRuler = false;
  /** @type {boolean} */ showInspector = false;
  /** @type {boolean} */ showCssRules = false;
  /** @type {number} */ bezelH = 0;
  /** @type {number} */ bezelV = 0;

  /** Combined built-in + custom devices for the current session. */
  get allDevices() {
    return [...this.devices, ...this.customDevices];
  }
}
