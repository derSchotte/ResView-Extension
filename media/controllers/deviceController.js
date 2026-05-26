// @ts-check
"use strict";

import { MSG } from "../constants.js";
import { el } from "../utils.js";

/**
 * Manages device category tabs, device select dropdown, and the
 * "Add Custom Device" modal. Delegates persistence to the extension host.
 */
export class DeviceController {
  /** @type {import("../appState.js").AppState} */ #state;
  /** @type {import("../bridges.js").VsCodeBridge} */ #bridge;

  /**
   * @param {import("../appState.js").AppState} state
   * @param {import("../bridges.js").VsCodeBridge} bridge
   */
  constructor(state, bridge) {
    this.#state = state;
    this.#bridge = bridge;
    this.#bindTabEvents();
    this.#bindSelectEvents();
    this.#bindModalEvents();
  }

  #bindTabEvents() {
    const tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabs.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.#state.currentCategory = /** @type {string} */ (btn.dataset.cat);
        this.#state.isLandscape = false;
        this.buildSelect();
      });
    });
  }

  #bindSelectEvents() {
    const select = /** @type {HTMLSelectElement} */ (el("deviceSelect"));
    select.addEventListener("change", () => this.selectByName(select.value));

    el("btnRotate").addEventListener("click", () => {
      const { currentDevice } = this.#state;
      if (!currentDevice || currentDevice.category === "desktop") return;
      this.#state.isLandscape = !this.#state.isLandscape;
      this.#updateRotateButton();
      this.#state.emit("deviceChanged");
    });

    el("btnDeleteDevice").addEventListener("click", () => {
      if (!this.#state.currentDevice?.custom) return;
      this.#bridge.post({
        type: MSG.DELETE_CUSTOM_DEVICE,
        name: this.#state.currentDevice.name,
      });
    });
  }

  #bindModalEvents() {
    const modal = el("customDeviceModal");
    el("btnAddDevice").addEventListener("click", () => this.#openModal());
    el("cdCancel").addEventListener("click", () => this.#closeModal());
    el("cdClose").addEventListener("click", () => this.#closeModal());
    el("cdSave").addEventListener("click", () => this.#saveDevice());

    modal.addEventListener("click", (e) => {
      if (e.target === modal) this.#closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (modal.hidden) return;
      if (e.key === "Escape") this.#closeModal();
      if (e.key === "Enter" && document.activeElement?.id !== "cdSave") this.#saveDevice();
    });
  }

  /**
   * Rebuild the device <select> for the current category.
   * @param {string|null} [preferredName] - Pre-select this device name if provided.
   */
  buildSelect(preferredName = null) {
    const select = /** @type {HTMLSelectElement} */ (el("deviceSelect"));
    select.innerHTML = "";

    const filtered = this.#state.allDevices.filter(
      (d) => d.category === this.#state.currentCategory
    );

    /** @type {Map<string, any[]>} */
    const groups = new Map();
    for (const device of filtered) {
      const key = device.custom ? "★ Custom" : device.brand ?? "Other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(device);
    }

    const sortedKeys = [...groups.keys()].sort((a, b) => {
      if (a === "★ Custom") return 1;
      if (b === "★ Custom") return -1;
      return a.localeCompare(b);
    });

    for (const brand of sortedKeys) {
      const group = document.createElement("optgroup");
      group.label = brand;
      for (const device of groups.get(brand)) {
        const opt = document.createElement("option");
        opt.value = device.name;
        opt.textContent = device.name;
        group.appendChild(opt);
      }
      select.appendChild(group);
    }

    const targetName = preferredName ?? filtered[0]?.name;
    if (targetName) {
      select.value = targetName;
      this.selectByName(targetName, false);
    }
  }

  /**
   * Select a device by name and optionally reset landscape orientation.
   * @param {string} name
   * @param {boolean} [resetLandscape]
   */
  selectByName(name, resetLandscape = true) {
    const device = this.#state.allDevices.find((d) => d.name === name) ?? null;
    this.#state.currentDevice = device;
    if (resetLandscape) this.#state.isLandscape = false;
    this.#updateRotateButton();
    this.#updateDeleteButton();
    this.#state.emit("deviceChanged");
  }

  #updateRotateButton() {
    const isDesktop = this.#state.currentDevice?.category === "desktop";
    const btn = /** @type {HTMLButtonElement} */ (el("btnRotate"));
    btn.disabled = isDesktop;
    btn.title = isDesktop
      ? "Rotation not available for desktop"
      : this.#state.isLandscape
      ? "Switch to Portrait"
      : "Switch to Landscape";
  }

  #updateDeleteButton() {
    el("btnDeleteDevice").hidden = !this.#state.currentDevice?.custom;
  }

  #openModal() {
    const modal = el("customDeviceModal");
    const radio = /** @type {HTMLInputElement|null} */ (
      modal.querySelector(`input[name="cdCat"][value="${this.#state.currentCategory}"]`)
    );
    if (radio) radio.checked = true;
    ["cdName", "cdWidth", "cdHeight", "cdPpi", "cdYear"].forEach((id) => {
      /** @type {HTMLInputElement} */ (el(id)).value = "";
    });
    el("cdError").hidden = true;
    modal.hidden = false;
    setTimeout(() => el("cdName").focus(), 50);
  }

  #closeModal() {
    el("customDeviceModal").hidden = true;
  }

  /** @param {string} message */
  #showModalError(message) {
    const err = el("cdError");
    err.textContent = message;
    err.hidden = false;
  }

  #saveDevice() {
    const name = /** @type {HTMLInputElement} */ (el("cdName")).value.trim();
    const wRaw = /** @type {HTMLInputElement} */ (el("cdWidth")).value.trim();
    const hRaw = /** @type {HTMLInputElement} */ (el("cdHeight")).value.trim();
    const ppiRaw = /** @type {HTMLInputElement} */ (el("cdPpi")).value.trim();
    const yearRaw = /** @type {HTMLInputElement} */ (el("cdYear")).value.trim();
    const w = parseInt(wRaw, 10);
    const h = parseInt(hRaw, 10);
    const ppi = ppiRaw ? parseInt(ppiRaw, 10) : undefined;
    const year = yearRaw ? parseInt(yearRaw, 10) : undefined;
    const category =
      /** @type {HTMLInputElement|null} */ (
        el("customDeviceModal").querySelector("input[name=\"cdCat\"]:checked")
      )?.value ?? "phone";

    if (!name) return this.#showModalError("Please enter a device name.");
    if (this.#state.allDevices.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      return this.#showModalError("A device with this name already exists.");
    }
    if (!wRaw || isNaN(w) || w < 1) return this.#showModalError("Please enter a valid width.");
    if (!hRaw || isNaN(h) || h < 1) return this.#showModalError("Please enter a valid height.");
    if (ppi !== undefined && (isNaN(ppi) || ppi < 1)) return this.#showModalError("Please enter a valid PPI.");
    if (year !== undefined && (isNaN(year) || year < 1990 || year > 2099)) {
      return this.#showModalError("Please enter a valid year (1990–2099).");
    }

    const device = {
      name,
      category,
      brand: "Custom",
      portrait: { width: w, height: h },
      ...(category !== "desktop" && { landscape: { width: h, height: w } }),
      ...(ppi !== undefined && { ppi }),
      ...(year !== undefined && { year }),
      custom: true,
    };

    this.#bridge.post({ type: MSG.ADD_CUSTOM_DEVICE, device });
    this.#closeModal();
  }
}
