# ResView – Responsive Design Tester

> Test responsive designs without leaving VS Code. Preview any URL in accurate phone, tablet, and desktop viewports with portrait/landscape support.

---

## Features

### Live Responsive Preview
Load any local dev server or public URL directly inside VS Code and see how your layout behaves across different screen sizes — no external browser required.

### Accurate Device Viewports
Every device uses its real CSS viewport dimensions (logical pixels), not arbitrary guesses. Viewport sizes are derived from the device's physical resolution divided by its device pixel ratio.

### Portrait & Landscape Toggle
Instantly flip between portrait and landscape orientation for any phone or tablet with a single click or the rotate button.

### Auto Dev-Server Detection
ResView scans for running local development servers on startup and shows them as clickable chips — just click to load instantly. Re-scan at any time with the refresh button.

### Zoom Control
Scale the preview from 25 % to 100 % to fit your screen while keeping the viewport dimensions accurate. The dimension badge always shows the true CSS pixel size.

### Custom Devices
Add your own devices with fully configurable viewport size, category, PPI, and year. Custom devices persist across sessions and are grouped separately in the device list.

---

## Supported Devices

### iPhones

| Device | Viewport (Portrait) | PPI | Year |
|---|---|---|---|
| iPhone SE (3rd Gen) | 375 × 667 | 326 | 2022 |
| iPhone 14 | 390 × 844 | 460 | 2022 |
| iPhone 14 Plus | 428 × 926 | 458 | 2022 |
| iPhone 14 Pro | 393 × 852 | 460 | 2022 |
| iPhone 14 Pro Max | 430 × 932 | 460 | 2022 |
| iPhone 15 | 393 × 852 | 460 | 2023 |
| iPhone 15 Pro Max | 430 × 932 | 460 | 2023 |

### Android Phones

| Device | Viewport (Portrait) | PPI | Year |
|---|---|---|---|
| Samsung Galaxy S23 | 360 × 780 | 425 | 2023 |
| Samsung Galaxy S23 Ultra | 384 × 824 | 500 | 2023 |
| Samsung Galaxy S24 | 360 × 780 | 416 | 2024 |
| Google Pixel 7 | 412 × 915 | 416 | 2022 |
| Google Pixel 8 Pro | 448 × 998 | 489 | 2023 |
| OnePlus 12 | 412 × 905 | 510 | 2024 |

### iPads

| Device | Viewport (Portrait) | PPI | Year |
|---|---|---|---|
| iPad Mini (6th Gen) | 744 × 1133 | 326 | 2021 |
| iPad (10th Gen) | 820 × 1180 | 264 | 2022 |
| iPad Air (5th Gen) | 820 × 1180 | 264 | 2022 |
| iPad Pro 11" | 834 × 1194 | 264 | 2022 |
| iPad Pro 12.9" | 1024 × 1366 | 264 | 2022 |

### Android Tablets

| Device | Viewport (Portrait) | PPI | Year |
|---|---|---|---|
| Samsung Galaxy Tab S9 | 800 × 1280 | 274 | 2023 |
| Samsung Galaxy Tab S9 Ultra | 1232 × 1973 | 240 | 2023 |
| Google Pixel Tablet | 800 × 1280 | 276 | 2023 |

### Desktop Breakpoints

| Preset | Resolution |
|---|---|
| Small Laptop | 1280 × 800 |
| Laptop | 1440 × 900 |
| Full HD | 1920 × 1080 |
| QHD | 2560 × 1440 |
| 4K UHD | 3840 × 2160 |

---

## Getting Started

### 1. Open the Preview

Three ways to open ResView:

- **Keyboard shortcut:** `Ctrl+Shift+R` (Windows / Linux) · `Cmd+Shift+R` (Mac)
- **Command Palette:** `Ctrl+Shift+P` → type `ResView: Open Responsive Preview`
- **Editor title bar:** Click the phone icon (📱) when a `.html`, `.jsx`, `.tsx`, `.vue`, or `.svelte` file is open

### 2. Enter a URL

Type any URL into the address bar and press **Go** or `Enter`. ResView also detects running dev servers automatically and shows them as clickable chips below the URL bar.

### 3. Pick a Device

Use the **Phone / Tablet / Desktop** tabs to switch categories, then choose a device from the dropdown. The preview resizes immediately.

### 4. Toggle Orientation

Click the **↕ / ↔** button to switch between portrait and landscape mode. Not available for desktop breakpoints.

### 5. Adjust Zoom

Drag the zoom slider (25 %–100 %) to fit the device preview into your available space. The dimension badge at the bottom always shows the actual CSS viewport size.

---

## Custom Devices

You can add any device that isn't in the built-in list.

1. Click the **+** button next to the device dropdown.
2. Fill in the form:
   - **Name** — a unique label for your device
   - **Category** — Phone, Tablet, or Desktop
   - **Width / Height** — CSS viewport dimensions in logical pixels
   - **PPI** *(optional)* — physical pixels per inch of the display
   - **Year** *(optional)* — model year
3. Click **Save Device**.

Your custom devices appear under the **★ Custom** group in the dropdown and are marked with a `Custom` badge in the info bar. Landscape dimensions are automatically calculated by swapping width and height.

To delete a custom device, select it in the dropdown — a **🗑** delete button will appear next to the + button.

> Custom devices are saved globally in VS Code and persist across all workspaces and sessions.

---

## Commands

| Command | Description |
|---|---|
| `ResView: Open Responsive Preview` | Opens the preview panel next to the active editor |
| `ResView: Open with Custom URL` | Prompts for a URL, saves it as the workspace default, then opens the panel |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+R` / `Cmd+Shift+R` | Open Responsive Preview |
| `Escape` | Close the Add Custom Device dialog |
| `Enter` | Confirm URL input or save a custom device |

---

## Settings

Configure ResView via **File → Preferences → Settings** and search for `ResView`.

| Setting | Type | Default | Description |
|---|---|---|---|
| `resview.defaultUrl` | `string` | `""` | URL to load automatically when the panel opens. Leave empty to use auto-detection. |
| `resview.autoDetect` | `boolean` | `true` | Scan for running local dev servers on startup and display them as quick-load chips. |
| `resview.defaultDevice` | `string` | `"iPhone 14"` | Device name to pre-select when the panel opens. |

---

## How Device Viewports Work

ResView uses **CSS viewport dimensions** (logical pixels), which is what your CSS `@media` queries actually respond to — not the physical pixel count of the screen.

```
CSS viewport = physical resolution ÷ device pixel ratio (DPR)

Example — Samsung Galaxy S23:
  Physical:  1080 × 2340 px
  DPR:       3
  CSS:       360 × 780 px  ← this is what ResView emulates
```

This means a site that looks correct at `360px` width in ResView will behave identically on a real S23.

---

## Requirements

- VS Code **1.85.0** or later
- Any local or remote URL accessible from your machine (no special server configuration needed)

---

## License

MIT
