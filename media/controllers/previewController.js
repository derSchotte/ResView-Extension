// @ts-check
"use strict";

import { el, escHtml } from "../utils.js";

/**
 * Manages device shell layout, iframe sizing, zoom slider,
 * and the device info popup. Re-applies on every "deviceChanged" event.
 */
export class PreviewController {
  /** @type {import("../appState.js").AppState} */ #state;
  /** @type {HTMLIFrameElement} */ #iframe;
  /** @type {number} */ #scrollbarWidth;

  /** @param {import("../appState.js").AppState} state */
  constructor(state) {
    this.#state = state;
    this.#iframe = /** @type {HTMLIFrameElement} */ (el("preview"));
    this.#scrollbarWidth = this.#measureScrollbarWidth();
    this.#bindZoom();
    this.#bindDeviceInfoPopup();
    state.on("deviceChanged", () => this.apply());
  }

  /** Expose the iframe element for use by bridges and other controllers. */
  get iframe() {
    return this.#iframe;
  }

  /**
   * Restore zoom level from persisted UI state (called during init).
   * @param {number} zoom
   */
  restoreZoom(zoom) {
    this.#state.zoomLevel = zoom;
    /** @type {HTMLInputElement} */ (el("zoomRange")).value = String(zoom);
    el("zoomLabel").textContent = zoom + " %";
  }

  /** Apply current device dimensions, zoom, and bezel to the DOM. */
  apply() {
    const { currentDevice, isLandscape, zoomLevel } = this.#state;
    if (!currentDevice) return;

    const dim =
      isLandscape && currentDevice.landscape
        ? currentDevice.landscape
        : currentDevice.portrait;

    const { width: w, height: h } = dim;
    const scale = zoomLevel / 100;
    const isPhone = currentDevice.category === "phone";
    const isTablet = currentDevice.category === "tablet";
    const isDesktop = currentDevice.category === "desktop";

    const bezelThick = isPhone ? 60 : isTablet ? 50 : 8;
    const bezelThin  = isPhone ? 20 : isTablet ? 16 : 8;
    const bezelH = !isDesktop && isLandscape ? bezelThick : bezelThin;
    const bezelV = !isDesktop && isLandscape ? bezelThin  : bezelThick;

    this.#state.bezelH = bezelH;
    this.#state.bezelV = bezelV;

    el("frameWrapper").style.width  = w + "px";
    el("frameWrapper").style.height = h + "px";

    const bezel = el("deviceBezel");
    bezel.style.width   = w + bezelH * 2 + "px";
    bezel.style.height  = h + bezelV * 2 + "px";
    bezel.style.padding = `${bezelV}px ${bezelH}px`;
    bezel.dataset.cat   = currentDevice.category;
    bezel.dataset.landscape = isLandscape ? "true" : "";

    bezel.querySelector(".notch")?.remove();
    if (isPhone || isTablet) {
      const notch = document.createElement("div");
      notch.className = "notch";
      bezel.prepend(notch);
    }

    const unscaledH = h + bezelV * 2;
    const shell = el("deviceShell");
    shell.style.transform       = `scale(${scale})`;
    shell.style.transformOrigin = "top center";
    shell.style.marginBottom    = `-${unscaledH - unscaledH * scale}px`;

    const orientation = isDesktop ? "" : isLandscape ? " · Landscape" : " · Portrait";
    const ppiInfo = currentDevice.ppi ? ` · ${currentDevice.ppi} PPI` : "";
    el("dimensionBadge").textContent = `${w} × ${h} px${orientation}${ppiInfo}`;

    this.#updateDeviceInfoPopup(currentDevice);

    const sbOffset = isDesktop ? 0 : this.#scrollbarWidth;
    this.#iframe.style.width  = w + sbOffset + "px";
    this.#iframe.style.height = h + "px";

    this.#state.emit("deviceApplied");
    this.#state.emit("persistState");
  }

  /** @param {any} device */
  #updateDeviceInfoPopup(device) {
    const catLabel = device.category.charAt(0).toUpperCase() + device.category.slice(1);
    const yearRow = device.year
      ? `<div class="di-row">${device.year} · ${catLabel}</div>`
      : `<div class="di-row">${catLabel}</div>`;
    const dimPortrait  = `${device.portrait.width} × ${device.portrait.height} px`;
    const dimLandscape = device.landscape
      ? ` &nbsp;/&nbsp; ${device.landscape.width} × ${device.landscape.height} px`
      : "";
    const ppiRow   = device.ppi   ? `<div class="di-row">${device.ppi} PPI</div>` : "";
    const customTag = device.custom ? ' <span class="custom-tag">Custom</span>' : "";

    el("deviceInfoPopup").innerHTML =
      `<div class="di-name">${escHtml(device.name)}${customTag}</div>` +
      yearRow +
      `<div class="di-row">${dimPortrait}${dimLandscape}</div>` +
      ppiRow;
  }

  #measureScrollbarWidth() {
    const div = document.createElement("div");
    div.style.cssText =
      "width:50px;height:50px;overflow:scroll;position:absolute;visibility:hidden;top:-9999px;";
    document.body.appendChild(div);
    const w = div.offsetWidth - div.clientWidth;
    div.remove();
    return w;
  }

  #bindZoom() {
    const range = /** @type {HTMLInputElement} */ (el("zoomRange"));
    range.addEventListener("input", () => {
      this.#state.zoomLevel = parseInt(range.value, 10);
      el("zoomLabel").textContent = this.#state.zoomLevel + " %";
      this.apply();
    });
  }

  #bindDeviceInfoPopup() {
    const wrap = el("btnDeviceInfo").closest(".device-info-wrap");
    let hideTimer;
    wrap.addEventListener("mouseenter", () => {
      clearTimeout(hideTimer);
      el("deviceInfoPopup").hidden = false;
    });
    wrap.addEventListener("mouseleave", () => {
      hideTimer = setTimeout(() => { el("deviceInfoPopup").hidden = true; }, 180);
    });
    el("btnDeviceInfo").addEventListener("click", () => {
      const popup = el("deviceInfoPopup");
      popup.hidden = !popup.hidden;
    });
    document.addEventListener("click", (e) => {
      if (!wrap.contains(/** @type {Node} */ (e.target))) {
        el("deviceInfoPopup").hidden = true;
      }
    });
  }
}
