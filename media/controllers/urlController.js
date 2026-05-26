// @ts-check
"use strict";

import { MSG } from "../constants.js";
import { el } from "../utils.js";

/**
 * Manages the URL bar, Go button, Live Server shortcut, server chips,
 * and the URL collapse toggle. Delegates URL loading to the iframe or
 * to the extension inspector proxy depending on current mode.
 */
export class UrlController {
  /** @type {import("../appState.js").AppState} */ #state;
  /** @type {import("../bridges.js").VsCodeBridge} */ #bridge;
  /** @type {HTMLIFrameElement} */ #preview;

  /**
   * @param {import("../appState.js").AppState} state
   * @param {import("../bridges.js").VsCodeBridge} bridge
   * @param {HTMLIFrameElement} preview
   */
  constructor(state, bridge, preview) {
    this.#state = state;
    this.#bridge = bridge;
    this.#preview = preview;
    this.#bindEvents();
  }

  /**
   * Load a URL into the preview iframe (or via the inspector proxy).
   * @param {string} url
   */
  loadUrl(url) {
    if (!url) return;
    this.#state.currentUrl = url;
    /** @type {HTMLInputElement} */ (el("urlInput")).value = url;
    el("urlCollapsedHint").textContent = this.#state.urlCollapsed ? url : "";

    // Always route through the proxy (sets target + responds with proxyUrl via inspectorReady)
    this.#bridge.post({
      type: MSG.INSPECTOR_TOGGLE,
      enabled: this.#state.showInspector,
      url,
    });
  }

  /**
   * Collapse or expand the URL bar.
   * @param {boolean} collapsed
   */
  setCollapsed(collapsed) {
    this.#state.urlCollapsed = collapsed;
    el("urlCollapsible").classList.toggle("url-collapsed", collapsed);
    el("urlChevron").classList.toggle("collapsed", collapsed);
    el("urlCollapsedHint").textContent =
      collapsed && this.#state.currentUrl ? this.#state.currentUrl : "";
    this.#state.emit("persistState");
  }

  /**
   * Render detected dev-server chips below the URL input.
   * @param {any[]} servers
   */
  renderServers(servers) {
    const container = el("serverChips");
    container.innerHTML = "";

    if (!servers.length) {
      const empty = document.createElement("span");
      empty.className = "no-servers";
      empty.textContent = "No dev servers detected";
      container.appendChild(empty);
      return;
    }

    for (const server of servers) {
      const chip = document.createElement("button");
      chip.className = "server-chip";

      const badge = document.createElement("span");
      badge.className = "server-badge";
      badge.textContent = server.confidence === "high" ? "✓" : "~";

      chip.appendChild(badge);
      chip.appendChild(
        document.createTextNode(` :${server.port}  ${server.framework ?? ""}`)
      );
      chip.title = `Load ${server.url}`;
      chip.addEventListener("click", () => this.loadUrl(server.url));
      container.appendChild(chip);
    }
  }

  #bindEvents() {
    el("btnGo").addEventListener("click", () => {
      const val = /** @type {HTMLInputElement} */ (el("urlInput")).value.trim();
      if (val) this.loadUrl(val);
    });

    el("urlInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = /** @type {HTMLInputElement} */ (el("urlInput")).value.trim();
        if (val) this.loadUrl(val);
      }
    });

    el("btnRescan").addEventListener("click", () => {
      el("btnRescan").classList.add("spinning");
      this.#bridge.post({ type: MSG.RESCAN });
      setTimeout(() => el("btnRescan").classList.remove("spinning"), 1800);
    });

    el("btnOpenBrowser").addEventListener("click", () => {
      if (this.#state.currentUrl) {
        this.#bridge.post({ type: MSG.OPEN_EXTERNAL, url: this.#state.currentUrl });
      }
    });

    el("btnLiveServer").addEventListener("click", () =>
      this.loadUrl("http://localhost:5500")
    );

    el("btnUrlToggle").addEventListener("click", () =>
      this.setCollapsed(!this.#state.urlCollapsed)
    );
  }
}
