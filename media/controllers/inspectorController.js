// @ts-check
"use strict";

import { MSG } from "../constants.js";
import { el, pxDisplay } from "../utils.js";

/**
 * Element hover inspector: highlights DOM elements inside the preview iframe
 * and displays their computed box model and CSS styles in the inspector panel.
 */
export class InspectorController {
  /** @type {import("../appState.js").AppState} */ #state;
  /** @type {import("../bridges.js").VsCodeBridge} */ #vsBridge;
  /** @type {import("../bridges.js").IframeBridge} */ #iframeBridge;

  /**
   * @param {import("../appState.js").AppState} state
   * @param {import("../bridges.js").VsCodeBridge} vsBridge
   * @param {import("../bridges.js").IframeBridge} iframeBridge
   */
  constructor(state, vsBridge, iframeBridge) {
    this.#state = state;
    this.#vsBridge = vsBridge;
    this.#iframeBridge = iframeBridge;
    this.#bindToggle();
    this.#subscribeIframe();
  }

  /** Reset the panel to its idle state. */
  clear() {
    el("inspSelector").textContent = "Hover over an element to inspect it";
    el("inspStyles").innerHTML = "";
    const ids = [
      "bmMT","bmMR","bmMB","bmML","bmBT","bmBR","bmBB","bmBL",
      "bmPT","bmPR","bmPB","bmPL","bmW","bmH",
    ];
    ids.forEach((id) => { el(id).textContent = "—"; });
  }

  #bindToggle() {
    el("btnInspect").addEventListener("click", () => {
      if (!this.#state.currentUrl) return;
      this.#state.showInspector = !this.#state.showInspector;
      el("btnInspect").classList.toggle("active", this.#state.showInspector);

      if (this.#state.showInspector) {
        el("inspectorPanel").style.display = "flex";
        this.#state.emit("closeCssRules");
        this.#vsBridge.post({
          type: MSG.INSPECTOR_TOGGLE,
          enabled: true,
          url: this.#state.currentUrl,
        });
      } else {
        el("inspectorPanel").style.display = "none";
        this.clear();
        /** @type {HTMLIFrameElement} */ (el("preview")).src = this.#state.currentUrl;
        this.#vsBridge.post({ type: MSG.INSPECTOR_TOGGLE, enabled: false });
      }
    });
  }

  #subscribeIframe() {
    this.#iframeBridge.on(MSG.IFRAME_INSPECTOR_HOVER, (msg) => this.#update(msg));
    this.#iframeBridge.on(MSG.IFRAME_INSPECTOR_CLEAR, () => this.clear());
  }

  /** @param {any} msg */
  #update(msg) {
    el("inspSelector").textContent = msg.selector ?? "—";

    const sourcesEl = el("inspSources");
    sourcesEl.innerHTML = "";
    for (const file of msg.sources ?? []) {
      const span = document.createElement("span");
      span.className = "insp-source-file";
      span.textContent = file; // safe: textContent
      sourcesEl.appendChild(span);
    }

    const b = msg.box ?? {};
    el("bmMT").textContent = pxDisplay(b.marginTop);
    el("bmMR").textContent = pxDisplay(b.marginRight);
    el("bmMB").textContent = pxDisplay(b.marginBottom);
    el("bmML").textContent = pxDisplay(b.marginLeft);
    el("bmBT").textContent = pxDisplay(b.borderTop);
    el("bmBR").textContent = pxDisplay(b.borderRight);
    el("bmBB").textContent = pxDisplay(b.borderBottom);
    el("bmBL").textContent = pxDisplay(b.borderLeft);
    el("bmPT").textContent = pxDisplay(b.paddingTop);
    el("bmPR").textContent = pxDisplay(b.paddingRight);
    el("bmPB").textContent = pxDisplay(b.paddingBottom);
    el("bmPL").textContent = pxDisplay(b.paddingLeft);
    el("bmW").textContent = String(b.width ?? "—");
    el("bmH").textContent = String(b.height ?? "—");

    this.#renderStyles(msg.styles ?? {});
  }

  /** @param {any} styles */
  #renderStyles(styles) {
    const entries = [
      ["color",        styles.color],
      ["background",   styles.backgroundColor],
      ["font-size",    styles.fontSize],
      ["font-family",  styles.fontFamily],
      ["font-weight",  styles.fontWeight !== "400" && styles.fontWeight !== "normal" ? styles.fontWeight : ""],
      ["line-height",  styles.lineHeight],
      ["display",      styles.display],
      ["position",     styles.position],
      ["flex-dir",     styles.flexDirection],
      ["gap",          styles.gap],
      ["border-radius",styles.borderRadius],
      ["opacity",      styles.opacity],
      ["z-index",      styles.zIndex],
      ["overflow",     styles.overflow],
    ].filter(([, v]) => v);

    const container = el("inspStyles");
    container.innerHTML = "";
    const fragment = document.createDocumentFragment();

    for (const [key, value] of entries) {
      const propEl = document.createElement("span");
      propEl.className = "insp-prop";
      propEl.textContent = key; // safe: textContent

      const valEl = document.createElement("span");
      valEl.className = "insp-val";
      if (key === "color" || key === "background") {
        const swatch = document.createElement("span");
        swatch.className = "insp-swatch";
        swatch.style.background = String(value); // style assignment, not innerHTML
        valEl.appendChild(swatch);
      }
      valEl.appendChild(document.createTextNode(String(value))); // safe: textNode

      fragment.appendChild(propEl);
      fragment.appendChild(valEl);
    }
    container.appendChild(fragment);
  }
}
