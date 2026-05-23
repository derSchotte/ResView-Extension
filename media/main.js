// @ts-check
(function () {
  "use strict";

  const vscode = acquireVsCodeApi();

  // ── State ──────────────────────────────────────────────────────────────────
  let devices = [];
  let customDevices = [];
  let currentCategory = "phone";
  let currentDevice = null;
  let isLandscape = false;
  let zoomLevel = 75;
  let currentUrl = "";
  let showGrid = false;
  let showRuler = false;
  let showInspector = false;
  let proxyPort = 0;
  let currentBezelH = 0;
  let currentBezelV = 0;

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const urlInput = /** @type {HTMLInputElement} */ (document.getElementById("urlInput"));
  const btnGo = document.getElementById("btnGo");
  const btnRescan = document.getElementById("btnRescan");
  const serverChips = document.getElementById("serverChips");
  const deviceSelect = /** @type {HTMLSelectElement} */ (document.getElementById("deviceSelect"));
  const btnRotate = document.getElementById("btnRotate");
  const rotateIcon = document.getElementById("rotateIcon");
  const btnAddDevice = document.getElementById("btnAddDevice");
  const btnDeleteDevice = document.getElementById("btnDeleteDevice");
  const deviceInfo = document.getElementById("deviceInfo");
  const dimensionBadge = document.getElementById("dimensionBadge");
  const deviceShell = document.getElementById("deviceShell");
  const deviceBezel = document.getElementById("deviceBezel");
  const frameWrapper = document.getElementById("frameWrapper");
  const preview = /** @type {HTMLIFrameElement} */ (document.getElementById("preview"));
  const zoomRange = /** @type {HTMLInputElement} */ (document.getElementById("zoomRange"));
  const zoomLabel = document.getElementById("zoomLabel");
  const tabBtns = document.querySelectorAll(".tab-btn");
  const btnGrid = document.getElementById("btnGrid");
  const gridSizeSelect = /** @type {HTMLSelectElement} */ (document.getElementById("gridSizeSelect"));
  const btnRuler = document.getElementById("btnRuler");
  const btnInspect = document.getElementById("btnInspect");
  const btnOpenBrowser = document.getElementById("btnOpenBrowser");
  const hRuler = /** @type {HTMLCanvasElement} */ (document.getElementById("hRuler"));
  const vRuler = /** @type {HTMLCanvasElement} */ (document.getElementById("vRuler"));
  const rulerCorner = document.getElementById("rulerCorner");
  const gridOverlay = document.getElementById("gridOverlay");
  const inspectorPanel = document.getElementById("inspectorPanel");
  const inspSelector = document.getElementById("inspSelector");
  const inspStyles = document.getElementById("inspStyles");
  const bmMT = document.getElementById("bmMT");
  const bmMR = document.getElementById("bmMR");
  const bmMB = document.getElementById("bmMB");
  const bmML = document.getElementById("bmML");
  const bmBT = document.getElementById("bmBT");
  const bmBR = document.getElementById("bmBR");
  const bmBB = document.getElementById("bmBB");
  const bmBL = document.getElementById("bmBL");
  const bmPT = document.getElementById("bmPT");
  const bmPR = document.getElementById("bmPR");
  const bmPB = document.getElementById("bmPB");
  const bmPL = document.getElementById("bmPL");
  const bmW = document.getElementById("bmW");
  const bmH = document.getElementById("bmH");

  // ── Measure native scrollbar width once (0 on macOS overlay scrollbars) ──────
  const SCROLLBAR_WIDTH = (() => {
    const div = document.createElement("div");
    div.style.cssText = "width:50px;height:50px;overflow:scroll;position:absolute;visibility:hidden;top:-9999px;";
    document.body.appendChild(div);
    const w = div.offsetWidth - div.clientWidth;
    div.remove();
    return w;
  })();

  // Modal refs
  const customDeviceModal = document.getElementById("customDeviceModal");
  const cdName = /** @type {HTMLInputElement} */ (document.getElementById("cdName"));
  const cdWidth = /** @type {HTMLInputElement} */ (document.getElementById("cdWidth"));
  const cdHeight = /** @type {HTMLInputElement} */ (document.getElementById("cdHeight"));
  const cdPpi = /** @type {HTMLInputElement} */ (document.getElementById("cdPpi"));
  const cdYear = /** @type {HTMLInputElement} */ (document.getElementById("cdYear"));
  const cdError = document.getElementById("cdError");
  const cdSave = document.getElementById("cdSave");
  const cdCancel = document.getElementById("cdCancel");
  const cdClose = document.getElementById("cdClose");

  // ── Init message ────────────────────────────────────────────────────────────
  vscode.postMessage({ type: "ready" });

  // ── Message handler ─────────────────────────────────────────────────────────
  window.addEventListener("message", (event) => {
    const msg = event.data;

    // Messages from the inspector script running inside the iframe
    if (msg?.type === "__resview_inspector_hover__") {
      updateInspectorPanel(msg);
      return;
    }
    if (msg?.type === "__resview_inspector_clear__") {
      clearInspectorHover();
      return;
    }

    switch (msg.type) {
      case "init": {
        devices = msg.devices || [];
        customDevices = msg.customDevices || [];

        // Restore persisted UI state
        const saved = msg.uiState || {};

        if (saved.category) {
          currentCategory = saved.category;
          tabBtns.forEach((b) => {
            b.classList.toggle("active", b.dataset.cat === currentCategory);
          });
        }
        if (saved.zoom) {
          zoomLevel = saved.zoom;
          zoomRange.value = String(zoomLevel);
          zoomLabel.textContent = zoomLevel + " %";
        }

        // Build list for the restored category (auto-selects first device)
        buildDeviceSelect();

        // Override auto-selection with saved device
        if (saved.deviceName) {
          const found = allDevices().find((d) => d.name === saved.deviceName);
          if (found) {
            currentDevice = found;
            deviceSelect.value = saved.deviceName;
          }
        }

        // Restore landscape AFTER device selection (selectDevice resets it to false)
        if (saved.landscape && currentDevice?.category !== "desktop") {
          isLandscape = true;
        }

        updateRotateButton();
        updateDeleteButton();
        applyDevice();

        proxyPort = msg.proxyPort || 0;

        // Load URL (not persisted intentionally)
        currentUrl = msg.url || "";
        if (currentUrl) {
          urlInput.value = currentUrl;
          loadUrl(currentUrl);
        }
        renderServers(msg.servers || []);
        break;
      }

      case "inspectorReady":
        preview.src = msg.proxyUrl;
        break;

      case "setUrl":
        currentUrl = msg.url;
        urlInput.value = currentUrl;
        loadUrl(currentUrl);
        break;

      case "servers":
        renderServers(msg.servers || []);
        break;

      case "customDevices": {
        const prevName = currentDevice?.name;
        customDevices = msg.devices || [];

        if (msg.selectName) {
          // Switch to the new device's category tab if needed
          const newDev = customDevices.find((d) => d.name === msg.selectName);
          if (newDev && newDev.category !== currentCategory) {
            tabBtns.forEach((b) => {
              b.classList.toggle("active", b.dataset.cat === newDev.category);
            });
            currentCategory = newDev.category;
          }
          buildDeviceSelect();
          deviceSelect.value = msg.selectName;
          selectDevice(msg.selectName);
        } else {
          buildDeviceSelect();
          // Restore previous selection if the device still exists
          const stillExists = allDevices().find((d) => d.name === prevName);
          if (stillExists) {
            deviceSelect.value = prevName;
            selectDevice(prevName);
          }
        }
        break;
      }
    }
  });

  // ── URL loading ─────────────────────────────────────────────────────────────
  function loadUrl(url) {
    if (!url) return;
    currentUrl = url;
    urlInput.value = url;
    if (showInspector) {
      vscode.postMessage({ type: "inspectorToggle", enabled: true, url });
      // Extension responds with inspectorReady + proxyUrl
    } else {
      preview.src = url;
    }
  }

  btnGo.addEventListener("click", () => {
    const val = urlInput.value.trim();
    if (val) loadUrl(val);
  });

  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = urlInput.value.trim();
      if (val) loadUrl(val);
    }
  });

  btnRescan.addEventListener("click", () => {
    btnRescan.classList.add("spinning");
    vscode.postMessage({ type: "rescan" });
    setTimeout(() => btnRescan.classList.remove("spinning"), 2000);
  });

  // ── Server chips ────────────────────────────────────────────────────────────
  function renderServers(servers) {
    serverChips.innerHTML = "";
    if (!servers.length) {
      const empty = document.createElement("span");
      empty.className = "no-servers";
      empty.textContent = "No dev servers detected";
      serverChips.appendChild(empty);
      return;
    }
    servers.forEach((s) => {
      const chip = document.createElement("button");
      chip.className = "server-chip";
      const badge = document.createElement("span");
      badge.className = "server-badge";
      badge.textContent = s.confidence === "high" ? "✓" : "~";
      chip.appendChild(badge);
      chip.appendChild(document.createTextNode(` :${s.port}  ${s.framework}`));
      chip.title = `Load ${s.url}`;
      chip.addEventListener("click", () => loadUrl(s.url));
      serverChips.appendChild(chip);
    });
  }

  // ── Device helpers ──────────────────────────────────────────────────────────
  function allDevices() {
    return [...devices, ...customDevices];
  }

  // ── Device Select ───────────────────────────────────────────────────────────
  function buildDeviceSelect() {
    deviceSelect.innerHTML = "";
    const filtered = allDevices().filter((d) => d.category === currentCategory);

    const groups = {};
    filtered.forEach((d) => {
      const key = d.custom ? "★ Custom" : (d.brand || "Other");
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "★ Custom") return 1;
      if (b === "★ Custom") return -1;
      return a.localeCompare(b);
    });

    sortedKeys.forEach((brand) => {
      const og = document.createElement("optgroup");
      og.label = brand;
      groups[brand].forEach((d) => {
        const opt = document.createElement("option");
        opt.value = d.name;
        opt.textContent = d.name;
        og.appendChild(opt);
      });
      deviceSelect.appendChild(og);
    });

    const preferred = filtered[0];
    if (preferred) {
      deviceSelect.value = preferred.name;
      selectDevice(preferred.name);
    }
  }

  deviceSelect.addEventListener("change", () => selectDevice(deviceSelect.value));

  function selectDevice(name) {
    currentDevice = allDevices().find((d) => d.name === name) || null;
    isLandscape = false;
    updateRotateButton();
    updateDeleteButton();
    applyDevice();
  }

  function updateDeleteButton() {
    btnDeleteDevice.hidden = !currentDevice?.custom;
  }

  // ── Rotate ──────────────────────────────────────────────────────────────────
  btnRotate.addEventListener("click", () => {
    if (!currentDevice || currentDevice.category === "desktop") return;
    isLandscape = !isLandscape;
    updateRotateButton();
    applyDevice();
  });

  function updateRotateButton() {
    const isDesktop = currentDevice?.category === "desktop";
    btnRotate.disabled = isDesktop;
    btnRotate.title = isDesktop
      ? "Rotation not available for desktop"
      : isLandscape
      ? "Switch to Portrait"
      : "Switch to Landscape";
    rotateIcon.textContent = isLandscape ? "↔" : "↕";
  }

  // ── Category tabs ────────────────────────────────────────────────────────────
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.cat;
      isLandscape = false;
      buildDeviceSelect();
    });
  });

  // ── Zoom ─────────────────────────────────────────────────────────────────────
  zoomRange.addEventListener("input", () => {
    zoomLevel = parseInt(zoomRange.value, 10);
    zoomLabel.textContent = zoomLevel + " %";
    applyDevice();
  });

  // ── Add Custom Device – Modal ─────────────────────────────────────────────────
  btnAddDevice.addEventListener("click", openAddModal);

  function openAddModal() {
    // Pre-select the currently active category
    const radio = /** @type {HTMLInputElement|null} */ (
      customDeviceModal.querySelector(`input[name="cdCat"][value="${currentCategory}"]`)
    );
    if (radio) radio.checked = true;
    cdName.value = "";
    cdWidth.value = "";
    cdHeight.value = "";
    cdPpi.value = "";
    cdYear.value = "";
    cdError.hidden = true;
    customDeviceModal.hidden = false;
    setTimeout(() => cdName.focus(), 50);
  }

  function closeAddModal() {
    customDeviceModal.hidden = true;
  }

  cdCancel.addEventListener("click", closeAddModal);
  cdClose.addEventListener("click", closeAddModal);

  customDeviceModal.addEventListener("click", (e) => {
    if (e.target === customDeviceModal) closeAddModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !customDeviceModal.hidden) closeAddModal();
    if (e.key === "Enter" && !customDeviceModal.hidden && document.activeElement !== cdSave) {
      saveCustomDevice();
    }
  });

  cdSave.addEventListener("click", saveCustomDevice);

  function saveCustomDevice() {
    const name = cdName.value.trim();
    const w = parseInt(cdWidth.value, 10);
    const h = parseInt(cdHeight.value, 10);
    const ppiRaw = cdPpi.value.trim();
    const yearRaw = cdYear.value.trim();
    const ppi = ppiRaw ? parseInt(ppiRaw, 10) : undefined;
    const year = yearRaw ? parseInt(yearRaw, 10) : undefined;
    const category = /** @type {HTMLInputElement|null} */ (
      customDeviceModal.querySelector('input[name="cdCat"]:checked')
    )?.value || "phone";

    if (!name) return showModalError("Please enter a device name.");
    if (allDevices().some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      return showModalError("A device with this name already exists.");
    }
    if (!cdWidth.value.trim() || isNaN(w) || w < 1) return showModalError("Please enter a valid width.");
    if (!cdHeight.value.trim() || isNaN(h) || h < 1) return showModalError("Please enter a valid height.");
    if (ppi !== undefined && (isNaN(ppi) || ppi < 1)) return showModalError("Please enter a valid PPI.");
    if (year !== undefined && (isNaN(year) || year < 1990 || year > 2099)) {
      return showModalError("Please enter a valid year (1990–2099).");
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

    vscode.postMessage({ type: "addCustomDevice", device });
    closeAddModal();
  }

  function showModalError(msg) {
    cdError.textContent = msg;
    cdError.hidden = false;
  }

  // ── Inspector toggle ─────────────────────────────────────────────────────────
  btnInspect.addEventListener("click", () => {
    if (!currentUrl) return;
    showInspector = !showInspector;
    btnInspect.classList.toggle("active", showInspector);
    if (showInspector) {
      inspectorPanel.hidden = false;
      vscode.postMessage({ type: "inspectorToggle", enabled: true, url: currentUrl });
    } else {
      inspectorPanel.hidden = true;
      clearInspectorHover();
      preview.src = currentUrl;
      vscode.postMessage({ type: "inspectorToggle", enabled: false });
    }
  });

  function updateInspectorPanel(msg) {
    inspSelector.textContent = msg.selector || "—";
    const b = msg.box || {};
    bmMT.textContent = px(b.marginTop);
    bmMR.textContent = px(b.marginRight);
    bmMB.textContent = px(b.marginBottom);
    bmML.textContent = px(b.marginLeft);
    bmBT.textContent = px(b.borderTop);
    bmBR.textContent = px(b.borderRight);
    bmBB.textContent = px(b.borderBottom);
    bmBL.textContent = px(b.borderLeft);
    bmPT.textContent = px(b.paddingTop);
    bmPR.textContent = px(b.paddingRight);
    bmPB.textContent = px(b.paddingBottom);
    bmPL.textContent = px(b.paddingLeft);
    bmW.textContent = b.width ?? "—";
    bmH.textContent = b.height ?? "—";

    const s = msg.styles || {};
    const entries = [
      ["color", s.color],
      ["background", s.backgroundColor],
      ["font-size", s.fontSize],
      ["font-family", s.fontFamily],
      ["font-weight", s.fontWeight !== "400" && s.fontWeight !== "normal" ? s.fontWeight : ""],
      ["line-height", s.lineHeight],
      ["display", s.display],
      ["position", s.position],
      ["flex-dir", s.flexDirection],
      ["gap", s.gap],
      ["border-radius", s.borderRadius],
      ["opacity", s.opacity],
      ["z-index", s.zIndex],
      ["overflow", s.overflow],
    ].filter(([, v]) => v);

    inspStyles.innerHTML = entries.map(([k, v]) => {
      const isColor = k === "color" || k === "background";
      const swatch = isColor
        ? `<span class="insp-swatch" style="background:${v}"></span>`
        : "";
      return `<span class="insp-prop">${k}</span><span class="insp-val">${swatch}${v}</span>`;
    }).join("");
  }

  function clearInspectorHover() {
    inspSelector.textContent = "Hover over an element to inspect it";
    inspStyles.innerHTML = "";
    bmMT.textContent = bmMR.textContent = bmMB.textContent = bmML.textContent = "—";
    bmBT.textContent = bmBR.textContent = bmBB.textContent = bmBL.textContent = "—";
    bmPT.textContent = bmPR.textContent = bmPB.textContent = bmPL.textContent = "—";
    bmW.textContent = bmH.textContent = "—";
  }

  function px(v) {
    if (!v) return "—";
    const n = parseFloat(v);
    if (isNaN(n)) return v;
    return n === 0 ? "0" : Math.round(n) + "";
  }

  // ── Live Server shortcut ─────────────────────────────────────────────────────
  document.getElementById("btnLiveServer").addEventListener("click", () => {
    loadUrl("http://localhost:5500");
  });

  // ── Open in Browser ──────────────────────────────────────────────────────────
  btnOpenBrowser.addEventListener("click", () => {
    if (currentUrl) vscode.postMessage({ type: "openExternal", url: currentUrl });
  });

  // ── Grid toggle ──────────────────────────────────────────────────────────────
  function applyGridSize() {
    const size = gridSizeSelect.value + "px";
    gridOverlay.style.backgroundSize = `${size} ${size}`;
  }

  btnGrid.addEventListener("click", () => {
    showGrid = !showGrid;
    btnGrid.classList.toggle("active", showGrid);
    gridSizeSelect.classList.toggle("active", showGrid);
    gridOverlay.hidden = !showGrid;
    if (showGrid) applyGridSize();
  });

  gridSizeSelect.addEventListener("change", () => {
    if (showGrid) applyGridSize();
  });

  // ── Ruler toggle ─────────────────────────────────────────────────────────────
  btnRuler.addEventListener("click", () => {
    showRuler = !showRuler;
    btnRuler.classList.toggle("active", showRuler);
    hRuler.hidden = !showRuler;
    vRuler.hidden = !showRuler;
    rulerCorner.hidden = !showRuler;
    if (showRuler) drawRulers();
  });

  // ── Ruler drawing ────────────────────────────────────────────────────────────
  const RULER_PX = 20;
  const RULER_BG = "#10101e";
  const RULER_BORDER = "rgba(68,68,90,0.7)";
  const RULER_TICK = "rgba(205,214,244,0.4)";
  const RULER_LABEL = "#6c7086";

  function drawRulers() {
    if (!currentDevice) return;
    const dim =
      isLandscape && currentDevice.landscape
        ? currentDevice.landscape
        : currentDevice.portrait;
    const w = dim.width;
    const h = dim.height;

    // Position rulers flush with the content area (outside the bezel padding)
    const ry = currentBezelV - RULER_PX;
    const rx = currentBezelH - RULER_PX;
    rulerCorner.style.top  = ry + "px";
    rulerCorner.style.left = rx + "px";
    hRuler.style.top  = ry + "px";
    hRuler.style.left = currentBezelH + "px";
    vRuler.style.top  = currentBezelV + "px";
    vRuler.style.left = rx + "px";

    drawHRuler(w);
    drawVRuler(h);
  }

  function drawHRuler(devW) {
    hRuler.width  = devW;
    hRuler.height = RULER_PX;
    const ctx = hRuler.getContext("2d");
    ctx.fillStyle = RULER_BG;
    ctx.fillRect(0, 0, devW, RULER_PX);
    ctx.strokeStyle = RULER_BORDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, RULER_PX - 0.5);
    ctx.lineTo(devW, RULER_PX - 0.5);
    ctx.stroke();
    ctx.strokeStyle = RULER_TICK;
    ctx.fillStyle = RULER_LABEL;
    ctx.font = "8px monospace";
    ctx.textBaseline = "top";
    for (let x = 0; x <= devW; x++) {
      const isMajor = x % 100 === 0;
      const isMid   = x % 50  === 0;
      const isMinor = x % 10  === 0;
      if (!isMinor) continue;
      const tickH = isMajor ? 11 : isMid ? 7 : 4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, RULER_PX);
      ctx.lineTo(x + 0.5, RULER_PX - tickH);
      ctx.stroke();
      if (isMajor && x > 0) ctx.fillText(String(x), x + 2, 1);
    }
  }

  function drawVRuler(devH) {
    vRuler.width  = RULER_PX;
    vRuler.height = devH;
    const ctx = vRuler.getContext("2d");
    ctx.fillStyle = RULER_BG;
    ctx.fillRect(0, 0, RULER_PX, devH);
    ctx.strokeStyle = RULER_BORDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(RULER_PX - 0.5, 0);
    ctx.lineTo(RULER_PX - 0.5, devH);
    ctx.stroke();
    ctx.strokeStyle = RULER_TICK;
    ctx.fillStyle = RULER_LABEL;
    ctx.font = "8px monospace";
    ctx.textBaseline = "middle";
    for (let y = 0; y <= devH; y++) {
      const isMajor = y % 100 === 0;
      const isMid   = y % 50  === 0;
      const isMinor = y % 10  === 0;
      if (!isMinor) continue;
      const tickW = isMajor ? 11 : isMid ? 7 : 4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(RULER_PX, y + 0.5);
      ctx.lineTo(RULER_PX - tickW, y + 0.5);
      ctx.stroke();
      if (isMajor && y > 0) {
        const label = String(y);
        ctx.save();
        ctx.translate(RULER_PX / 2, y);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(label, -ctx.measureText(label).width / 2, 0);
        ctx.restore();
      }
    }
  }

  // ── Delete Custom Device ─────────────────────────────────────────────────────
  btnDeleteDevice.addEventListener("click", () => {
    if (!currentDevice?.custom) return;
    vscode.postMessage({ type: "deleteCustomDevice", name: currentDevice.name });
  });

  // ── Persist UI state ─────────────────────────────────────────────────────────
  function persistState() {
    vscode.postMessage({
      type: "saveUiState",
      state: {
        category: currentCategory,
        deviceName: currentDevice?.name || null,
        zoom: zoomLevel,
        landscape: isLandscape,
      },
    });
  }

  // ── Core: apply device dimensions ────────────────────────────────────────────
  function applyDevice() {
    if (!currentDevice) return;

    const dim =
      isLandscape && currentDevice.landscape
        ? currentDevice.landscape
        : currentDevice.portrait;

    const w = dim.width;
    const h = dim.height;
    const scale = zoomLevel / 100;
    const isPhone = currentDevice.category === "phone";
    const isTablet = currentDevice.category === "tablet";
    const isDesktop = currentDevice.category === "desktop";

    // Thick bezel (notch side) swaps between top↔left when rotating
    const bezelThick = isPhone ? 60 : isTablet ? 50 : 8;
    const bezelThin  = isPhone ? 20 : isTablet ? 16 : 8;
    const bezelH = (!isDesktop && isLandscape) ? bezelThick : bezelThin;
    const bezelV = (!isDesktop && isLandscape) ? bezelThin  : bezelThick;

    currentBezelH = bezelH;
    currentBezelV = bezelV;

    frameWrapper.style.width = w + "px";
    frameWrapper.style.height = h + "px";

    deviceBezel.style.width = w + bezelH * 2 + "px";
    deviceBezel.style.height = h + bezelV * 2 + "px";
    deviceBezel.style.padding = `${bezelV}px ${bezelH}px`;
    deviceBezel.dataset.cat = currentDevice.category;
    deviceBezel.dataset.landscape = isLandscape ? "true" : "";

    const notch = deviceBezel.querySelector(".notch");
    if (notch) notch.remove();
    if (isPhone || isTablet) {
      const n = document.createElement("div");
      n.className = "notch";
      deviceBezel.prepend(n);
    }

    // transform: scale() shrinks the element visually but keeps the full
    // unscaled layout box. The negative marginBottom pulls up exactly the
    // surplus so the stage height matches what's actually visible.
    const unscaledH = h + bezelV * 2;
    const scaledH   = unscaledH * scale;
    deviceShell.style.transform    = `scale(${scale})`;
    deviceShell.style.transformOrigin = "top center";
    deviceShell.style.marginBottom = `-${unscaledH - scaledH}px`;

    const orientation = isDesktop ? "" : isLandscape ? " · Landscape" : " · Portrait";
    const ppiInfo = currentDevice.ppi ? ` · ${currentDevice.ppi} PPI` : "";
    dimensionBadge.textContent = `${w} × ${h} px${orientation}${ppiInfo}`;

    const yearInfo = currentDevice.year ? ` (${currentDevice.year})` : "";
    const customTag = currentDevice.custom ? ' <span class="custom-tag">Custom</span>' : "";
    deviceInfo.innerHTML =
      `<strong>${currentDevice.name}</strong>${yearInfo}${customTag}` +
      ` &nbsp;·&nbsp; ${w} × ${h} px`;

    // For phones/tablets: widen the iframe by the native scrollbar width so the
    // scrollbar is pushed outside frameWrapper's overflow:hidden boundary.
    // frameWrapper stays at exactly w px — it clips the invisible scrollbar.
    // Content area inside the iframe = (w + SCROLLBAR_WIDTH) - SCROLLBAR_WIDTH = w. ✓
    const sbOffset = isDesktop ? 0 : SCROLLBAR_WIDTH;
    preview.style.width  = (w + sbOffset) + "px";
    preview.style.height = h + "px";

    if (showRuler) drawRulers();
    persistState();
  }
})();
