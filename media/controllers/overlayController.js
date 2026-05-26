// @ts-check
"use strict";

import { RULER_SIZE_PX, RULER_COLORS } from "../constants.js";
import { el } from "../utils.js";

/**
 * Manages the grid and ruler overlays.
 * Subscribes to "deviceApplied" so rulers are redrawn whenever device or
 * orientation changes.
 */
export class OverlayController {
  /** @type {import("../appState.js").AppState} */ #state;

  /** @param {import("../appState.js").AppState} state */
  constructor(state) {
    this.#state = state;
    this.#bindGrid();
    this.#bindRuler();
    state.on("deviceApplied", () => {
      if (this.#state.showRuler) this.#drawRulers();
    });
  }

  #bindGrid() {
    const gridSizeSelect = /** @type {HTMLSelectElement} */ (el("gridSizeSelect"));

    el("btnGrid").addEventListener("click", () => {
      this.#state.showGrid = !this.#state.showGrid;
      el("btnGrid").classList.toggle("active", this.#state.showGrid);
      gridSizeSelect.classList.toggle("active", this.#state.showGrid);
      el("gridOverlay").hidden = !this.#state.showGrid;
      if (this.#state.showGrid) this.#applyGridSize();
    });

    gridSizeSelect.addEventListener("change", () => {
      if (this.#state.showGrid) this.#applyGridSize();
    });
  }

  #bindRuler() {
    el("btnRuler").addEventListener("click", () => {
      this.#state.showRuler = !this.#state.showRuler;
      el("btnRuler").classList.toggle("active", this.#state.showRuler);
      el("hRuler").hidden  = !this.#state.showRuler;
      el("vRuler").hidden  = !this.#state.showRuler;
      el("rulerCorner").hidden = !this.#state.showRuler;
      if (this.#state.showRuler) this.#drawRulers();
    });
  }

  #applyGridSize() {
    const size = /** @type {HTMLSelectElement} */ (el("gridSizeSelect")).value + "px";
    el("gridOverlay").style.backgroundSize = `${size} ${size}`;
  }

  #drawRulers() {
    const { currentDevice, isLandscape, bezelH, bezelV } = this.#state;
    if (!currentDevice) return;

    const dim = isLandscape && currentDevice.landscape
      ? currentDevice.landscape
      : currentDevice.portrait;

    const ry = bezelV - RULER_SIZE_PX;
    const rx = bezelH - RULER_SIZE_PX;

    const hRuler = /** @type {HTMLCanvasElement} */ (el("hRuler"));
    const vRuler = /** @type {HTMLCanvasElement} */ (el("vRuler"));

    el("rulerCorner").style.top  = ry + "px";
    el("rulerCorner").style.left = rx + "px";
    hRuler.style.top  = ry + "px";
    hRuler.style.left = bezelH + "px";
    vRuler.style.top  = bezelV + "px";
    vRuler.style.left = rx + "px";

    this.#drawHorizontal(hRuler, dim.width);
    this.#drawVertical(vRuler, dim.height);
  }

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {number} width
   */
  #drawHorizontal(canvas, width) {
    canvas.width  = width;
    canvas.height = RULER_SIZE_PX;
    const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));

    ctx.fillStyle = RULER_COLORS.BG;
    ctx.fillRect(0, 0, width, RULER_SIZE_PX);

    ctx.strokeStyle = RULER_COLORS.BORDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, RULER_SIZE_PX - 0.5);
    ctx.lineTo(width, RULER_SIZE_PX - 0.5);
    ctx.stroke();

    ctx.strokeStyle = RULER_COLORS.TICK;
    ctx.fillStyle   = RULER_COLORS.LABEL;
    ctx.font = "8px monospace";
    ctx.textBaseline = "top";

    for (let x = 0; x <= width; x++) {
      if (x % 10 !== 0) continue;
      const isMajor = x % 100 === 0;
      const isMid   = x % 50  === 0;
      const tickH   = isMajor ? 11 : isMid ? 7 : 4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, RULER_SIZE_PX);
      ctx.lineTo(x + 0.5, RULER_SIZE_PX - tickH);
      ctx.stroke();
      if (isMajor && x > 0) ctx.fillText(String(x), x + 2, 1);
    }
  }

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {number} height
   */
  #drawVertical(canvas, height) {
    canvas.width  = RULER_SIZE_PX;
    canvas.height = height;
    const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));

    ctx.fillStyle = RULER_COLORS.BG;
    ctx.fillRect(0, 0, RULER_SIZE_PX, height);

    ctx.strokeStyle = RULER_COLORS.BORDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(RULER_SIZE_PX - 0.5, 0);
    ctx.lineTo(RULER_SIZE_PX - 0.5, height);
    ctx.stroke();

    ctx.strokeStyle = RULER_COLORS.TICK;
    ctx.fillStyle   = RULER_COLORS.LABEL;
    ctx.font = "8px monospace";
    ctx.textBaseline = "middle";

    for (let y = 0; y <= height; y++) {
      if (y % 10 !== 0) continue;
      const isMajor = y % 100 === 0;
      const isMid   = y % 50  === 0;
      const tickW   = isMajor ? 11 : isMid ? 7 : 4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(RULER_SIZE_PX, y + 0.5);
      ctx.lineTo(RULER_SIZE_PX - tickW, y + 0.5);
      ctx.stroke();
      if (isMajor && y > 0) {
        const label = String(y);
        ctx.save();
        ctx.translate(RULER_SIZE_PX / 2, y);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(label, -ctx.measureText(label).width / 2, 0);
        ctx.restore();
      }
    }
  }
}
