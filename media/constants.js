// @ts-check
"use strict";

export const MSG = Object.freeze({
  // Outbound (to extension)
  READY: "ready",
  RESCAN: "rescan",
  ADD_CUSTOM_DEVICE: "addCustomDevice",
  DELETE_CUSTOM_DEVICE: "deleteCustomDevice",
  SAVE_UI_STATE: "saveUiState",
  INSPECTOR_TOGGLE: "inspectorToggle",
  OPEN_EXTERNAL: "openExternal",
  // Inbound (from extension)
  INIT: "init",
  INSPECTOR_READY: "inspectorReady",
  SET_URL: "setUrl",
  SERVERS: "servers",
  CUSTOM_DEVICES: "customDevices",
  // Iframe protocol
  IFRAME_INSPECTOR_HOVER: "__resview_inspector_hover__",
  IFRAME_INSPECTOR_CLEAR: "__resview_inspector_clear__",
  IFRAME_CSS_RULES: "__resview_css_rules__",
  IFRAME_GET_CSS_RULES: "__resview_get_css_rules__",
  IFRAME_HIGHLIGHT_SELECTOR: "__resview_highlight_selector__",
  IFRAME_CLEAR_HIGHLIGHT: "__resview_clear_highlight__",
});

export const RULER_SIZE_PX = 20;

export const RULER_COLORS = Object.freeze({
  BG: "#10101e",
  BORDER: "rgba(68,68,90,0.7)",
  TICK: "rgba(205,214,244,0.4)",
  LABEL: "#6c7086",
});
