export const STORAGE_KEYS = {
  CUSTOM_DEVICES: "resview.customDevices",
  UI_STATE: "resview.uiState",
} as const;

export const CONFIG_KEYS = {
  DEFAULT_URL: "defaultUrl",
  AUTO_DETECT: "autoDetect",
  DEFAULT_DEVICE: "defaultDevice",
} as const;

export const COMMANDS = {
  OPEN: "resview.open",
  OPEN_WITH_URL: "resview.openWithUrl",
} as const;

export const VIEW_TYPE = "resview";
export const PANEL_TITLE = "ResView – Responsive Preview";
export const POLL_INTERVAL_MS = 3000;
export const LIVE_SERVER_URL = "http://localhost:5500";
