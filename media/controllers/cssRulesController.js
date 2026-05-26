// @ts-check
"use strict";

import { MSG } from "../constants.js";
import { el, pxDisplay } from "../utils.js";

/**
 * CSS rules browser: fetches all CSS rules from the preview page,
 * renders them in a searchable list, and shows box model + properties
 * for the selected rule.
 */
export class CssRulesController {
  /** @type {import("../appState.js").AppState} */ #state;
  /** @type {import("../bridges.js").IframeBridge} */ #iframeBridge;
  /** @type {any[]} */ #allRules = [];
  /** @type {any|null} */ #selectedRule = null;

  /**
   * @param {import("../appState.js").AppState} state
   * @param {import("../bridges.js").IframeBridge} iframeBridge
   * @param {HTMLIFrameElement} preview
   */
  constructor(state, iframeBridge, preview) {
    this.#state = state;
    this.#iframeBridge = iframeBridge;
    this.#bindToggle();
    this.#bindSearch();
    this.#bindPreviewReload(preview);
    this.#subscribeIframe();
    state.on("closeCssRules", () => this.close());
  }

  /** Close the panel and clear any active selector highlight. */
  close() {
    if (!this.#state.showCssRules) return;
    this.#state.showCssRules = false;
    el("btnCssRules").classList.remove("active");
    el("cssRulesPanel").hidden = true;
    this.#iframeBridge.post({ type: MSG.IFRAME_CLEAR_HIGHLIGHT });
    this.#selectedRule = null;
  }

  #bindToggle() {
    el("btnCssRules").addEventListener("click", () => {
      this.#state.showCssRules = !this.#state.showCssRules;
      el("btnCssRules").classList.toggle("active", this.#state.showCssRules);
      el("cssRulesPanel").hidden = !this.#state.showCssRules;

      if (this.#state.showCssRules) {
        el("inspectorPanel").style.display = "none";
        if (this.#state.showInspector) {
          this.#requestRules();
          setTimeout(() => el("crSearch").focus(), 50);
        }
      } else {
        this.#iframeBridge.post({ type: MSG.IFRAME_CLEAR_HIGHLIGHT });
      }
    });

    el("crRefresh").addEventListener("click", () => this.#requestRules());
  }

  #bindSearch() {
    el("crClearSearch").addEventListener("click", () => {
      /** @type {HTMLInputElement} */ (el("crSearch")).value = "";
      this.#filter("");
      el("crSearch").focus();
    });
    el("crSearch").addEventListener("input", () => {
      this.#filter(/** @type {HTMLInputElement} */ (el("crSearch")).value);
    });
  }

  /** @param {HTMLIFrameElement} preview */
  #bindPreviewReload(preview) {
    preview.addEventListener("load", () => {
      if (this.#state.showCssRules && this.#state.showInspector) {
        setTimeout(() => this.#requestRules(), 600);
      }
    });
  }

  #subscribeIframe() {
    this.#iframeBridge.on(MSG.IFRAME_CSS_RULES, (msg) =>
      this.#receive(msg.rules ?? [])
    );
  }

  #requestRules() {
    el("crList").innerHTML = '<span class="cr-hint cr-loading">Loading…</span>';
    el("crProps").innerHTML = '<span class="cr-hint">Select a rule to see its properties</span>';
    this.#resetBoxModel();
    this.#selectedRule = null;
    this.#iframeBridge.post({ type: MSG.IFRAME_GET_CSS_RULES });
  }

  #resetBoxModel() {
    ["crBmMT","crBmMR","crBmMB","crBmML","crBmBT","crBmBR","crBmBB","crBmBL",
     "crBmPT","crBmPR","crBmPB","crBmPL","crBmW","crBmH"]
      .forEach((id) => { el(id).textContent = "—"; });
  }

  /** @param {any[]} rules */
  #receive(rules) {
    this.#allRules = rules;
    this.#filter(/** @type {HTMLInputElement} */ (el("crSearch")).value);
  }

  /** @param {string} query */
  #filter(query) {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? this.#allRules.filter(
          (r) => r.sel.toLowerCase().includes(q) || r.file.toLowerCase().includes(q)
        )
      : this.#allRules;

    el("crCount").textContent = q
      ? `${filtered.length} of ${this.#allRules.length}`
      : `${this.#allRules.length} rules`;

    el("crClearSearch").classList.toggle("cr-clear-visible", q.length > 0);

    const list = el("crList");
    list.innerHTML = "";

    if (!filtered.length) {
      const hint = document.createElement("span");
      hint.className = "cr-hint";
      hint.textContent = this.#allRules.length ? "No matching rules" : "No CSS rules found";
      list.appendChild(hint);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const rule of filtered) {
      const item = document.createElement("div");
      item.className = "cr-item";
      const isActive =
        this.#selectedRule &&
        this.#selectedRule.sel === rule.sel &&
        this.#selectedRule.file === rule.file;
      if (isActive) item.classList.add("active");

      const selEl = document.createElement("div");
      selEl.className = "cr-sel";
      selEl.textContent = rule.sel; // safe: textContent

      const meta = document.createElement("div");
      meta.className = "cr-meta";

      const fileEl = document.createElement("span");
      fileEl.className = "cr-file";
      fileEl.textContent = rule.file; // safe: textContent
      meta.appendChild(fileEl);

      if (rule.media) {
        const mediaEl = document.createElement("span");
        mediaEl.className = "cr-media";
        mediaEl.textContent = rule.media; // safe: textContent
        meta.appendChild(mediaEl);
      }

      item.appendChild(selEl);
      item.appendChild(meta);
      item.addEventListener("click", () => this.#selectRule(rule, item));
      fragment.appendChild(item);
    }
    list.appendChild(fragment);
  }

  /** @param {any} rule @param {HTMLElement} itemEl */
  #selectRule(rule, itemEl) {
    el("crList").querySelectorAll(".cr-item.active").forEach((e) =>
      e.classList.remove("active")
    );
    itemEl.classList.add("active");
    this.#selectedRule = rule;
    this.#iframeBridge.post({ type: MSG.IFRAME_HIGHLIGHT_SELECTOR, selector: rule.sel });
    this.#populateBoxModel(rule.props);
    this.#renderProps(rule.props);
  }

  /** @param {any[]} props @param {string} key */
  #getBoxVal(props, key) {
    return props.find((p) => p.n === key)?.v ?? "";
  }

  /** @param {string} shorthand @param {number} idx */
  #parseSide(shorthand, idx) {
    if (!shorthand) return "";
    const parts = shorthand.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return idx === 1 || idx === 3 ? parts[1] : parts[0];
    if (parts.length === 3) {
      if (idx === 0) return parts[0];
      if (idx === 2) return parts[2];
      return parts[1];
    }
    return parts[idx] ?? parts[0] ?? "";
  }

  /** @param {any[]} props */
  #populateBoxModel(props) {
    const g = (key) => this.#getBoxVal(props, key);
    const s = (sh, i) => this.#parseSide(this.#getBoxVal(props, sh), i);

    el("crBmMT").textContent = pxDisplay(g("margin-top")    || s("margin", 0));
    el("crBmMR").textContent = pxDisplay(g("margin-right")  || s("margin", 1));
    el("crBmMB").textContent = pxDisplay(g("margin-bottom") || s("margin", 2));
    el("crBmML").textContent = pxDisplay(g("margin-left")   || s("margin", 3));

    el("crBmBT").textContent = pxDisplay(g("border-top-width")    || s("border-width", 0));
    el("crBmBR").textContent = pxDisplay(g("border-right-width")  || s("border-width", 1));
    el("crBmBB").textContent = pxDisplay(g("border-bottom-width") || s("border-width", 2));
    el("crBmBL").textContent = pxDisplay(g("border-left-width")   || s("border-width", 3));

    el("crBmPT").textContent = pxDisplay(g("padding-top")    || s("padding", 0));
    el("crBmPR").textContent = pxDisplay(g("padding-right")  || s("padding", 1));
    el("crBmPB").textContent = pxDisplay(g("padding-bottom") || s("padding", 2));
    el("crBmPL").textContent = pxDisplay(g("padding-left")   || s("padding", 3));

    el("crBmW").textContent = g("width")  || "—";
    el("crBmH").textContent = g("height") || "—";
  }

  /** @param {any[]} props */
  #renderProps(props) {
    const propsEl = el("crProps");
    if (!props.length) {
      propsEl.innerHTML = '<span class="cr-hint">No properties</span>';
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const prop of props) {
      const row = document.createElement("div");
      row.className = "cr-prop-row";

      const nameEl = document.createElement("span");
      nameEl.className = "cr-prop-name";
      nameEl.textContent = prop.n; // safe: textContent

      const sepEl = document.createElement("span");
      sepEl.className = "cr-prop-sep";
      sepEl.textContent = ":";

      const valEl = document.createElement("span");
      valEl.className = "cr-prop-val";
      if (prop.n.includes("color") || prop.n === "background") {
        const swatch = document.createElement("span");
        swatch.className = "cr-swatch";
        swatch.style.background = String(prop.v); // style assignment, not innerHTML
        valEl.appendChild(swatch);
      }
      valEl.appendChild(document.createTextNode(String(prop.v))); // safe: textNode

      row.appendChild(nameEl);
      row.appendChild(sepEl);
      row.appendChild(valEl);
      fragment.appendChild(row);
    }
    propsEl.innerHTML = "";
    propsEl.appendChild(fragment);
  }
}
