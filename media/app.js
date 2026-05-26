// @ts-check
"use strict";

import { AppState }             from "./appState.js";
import { VsCodeBridge,
         IframeBridge }         from "./bridges.js";
import { MSG }                  from "./constants.js";
import { DeviceController }     from "./controllers/deviceController.js";
import { UrlController }        from "./controllers/urlController.js";
import { PreviewController }    from "./controllers/previewController.js";
import { OverlayController }    from "./controllers/overlayController.js";
import { InspectorController }  from "./controllers/inspectorController.js";
import { CssRulesController }   from "./controllers/cssRulesController.js";

/**
 * Root orchestrator.
 * Instantiates all controllers with their dependencies, wires the shared
 * AppState event bus, and handles the init/customDevices messages from the
 * extension host.
 */
class ResViewApp {
  #state;
  #vsBridge;
  #deviceController;
  #urlController;
  #previewController;

  constructor() {
    this.#state    = new AppState();
    this.#vsBridge = new VsCodeBridge();

    // PreviewController must come first — it exposes the iframe reference
    this.#previewController = new PreviewController(this.#state);
    const preview    = this.#previewController.iframe;
    const iframeBridge = new IframeBridge(preview);

    this.#deviceController = new DeviceController(this.#state, this.#vsBridge);
    this.#urlController    = new UrlController(this.#state, this.#vsBridge, preview);

    new OverlayController(this.#state);
    new InspectorController(this.#state, this.#vsBridge, iframeBridge);
    new CssRulesController(this.#state, iframeBridge, preview);

    this.#state.on("persistState", () => this.#persistState());

    this.#subscribeExtension();
    this.#vsBridge.post({ type: MSG.READY });
  }

  #subscribeExtension() {
    this.#vsBridge.on(MSG.INIT,            (msg) => this.#onInit(msg));
    this.#vsBridge.on(MSG.SET_URL,         (msg) => this.#urlController.loadUrl(msg.url));
    this.#vsBridge.on(MSG.SERVERS,         (msg) => this.#urlController.renderServers(msg.servers ?? []));
    this.#vsBridge.on(MSG.CUSTOM_DEVICES,  (msg) => this.#onCustomDevices(msg));
    this.#vsBridge.on(MSG.INSPECTOR_READY, (msg) => {
      const iframe = this.#previewController.iframe;
      // Remove the attribute first so the subsequent assignment always triggers
      // navigation, even when proxyUrl hasn't changed (e.g. inspector toggle).
      iframe.removeAttribute("src");
      iframe.src = msg.proxyUrl;
    });
  }

  /** @param {any} msg */
  #onInit(msg) {
    this.#state.devices      = msg.devices ?? [];
    this.#state.customDevices = msg.customDevices ?? [];
    this.#state.proxyPort    = msg.proxyPort ?? 0;

    const saved = msg.uiState ?? {};

    if (saved.category) {
      this.#state.currentCategory = saved.category;
      document.querySelectorAll(".tab-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.cat === saved.category);
      });
    }

    if (saved.zoom)         this.#previewController.restoreZoom(saved.zoom);
    if (saved.urlCollapsed) this.#urlController.setCollapsed(true);

    this.#deviceController.buildSelect();

    if (saved.deviceName) {
      const found = this.#state.allDevices.find((d) => d.name === saved.deviceName);
      if (found) this.#deviceController.selectByName(saved.deviceName, false);
    }

    if (saved.landscape && this.#state.currentDevice?.category !== "desktop") {
      this.#state.isLandscape = true;
    }

    this.#previewController.apply();

    if (msg.url) this.#urlController.loadUrl(msg.url);
    this.#urlController.renderServers(msg.servers ?? []);
  }

  /** @param {any} msg */
  #onCustomDevices(msg) {
    const prevName = this.#state.currentDevice?.name;
    this.#state.customDevices = msg.devices ?? [];

    if (msg.selectName) {
      const newDev = this.#state.customDevices.find((d) => d.name === msg.selectName);
      if (newDev && newDev.category !== this.#state.currentCategory) {
        document.querySelectorAll(".tab-btn").forEach((b) => {
          b.classList.toggle("active", b.dataset.cat === newDev.category);
        });
        this.#state.currentCategory = newDev.category;
      }
      this.#deviceController.buildSelect(msg.selectName);
    } else {
      this.#deviceController.buildSelect();
      const stillExists = this.#state.allDevices.find((d) => d.name === prevName);
      if (stillExists) this.#deviceController.selectByName(prevName);
    }
  }

  #persistState() {
    this.#vsBridge.post({
      type: MSG.SAVE_UI_STATE,
      state: {
        category:    this.#state.currentCategory,
        deviceName:  this.#state.currentDevice?.name ?? null,
        zoom:        this.#state.zoomLevel,
        landscape:   this.#state.isLandscape,
        urlCollapsed: this.#state.urlCollapsed,
      },
    });
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
// @ts-ignore — lucide is loaded as a regular script before this module
lucide.createIcons();
new ResViewApp();
