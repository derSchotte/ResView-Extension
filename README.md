# ResView – Responsive Design Tester

> Test responsive designs without leaving your editor. Preview any URL in accurate phone, tablet, and desktop viewports with portrait/landscape support — works in VS Code, Cursor, Windsurf, VSCodium, and all VS Code-compatible IDEs.

---

## Features

### Live Responsive Preview
Load any local dev server or public URL directly inside your editor and see how your layout behaves across different screen sizes — no external browser required.

### Accurate Device Viewports
Every device uses its real CSS viewport dimensions (logical pixels), not arbitrary guesses. Viewport sizes are derived from the device's physical resolution divided by its device pixel ratio.

### Portrait & Landscape Toggle
Instantly flip between portrait and landscape orientation for any phone or tablet with a single click or the rotate button.

### Auto Dev-Server Detection
ResView scans for running local development servers on startup and shows them as clickable chips — just click to load instantly. Supports Next.js, React, Vite, Angular, Vue, Svelte, Flask, Django, and more. Re-scan at any time with the refresh button.

ResView also **polls for new servers every 3 seconds** while the panel is open. If you start a dev server after opening the panel (e.g. `npm run dev`), it is detected automatically: the server chips update and — if the URL bar is empty — a notification pops up with an **Open** button so you can load it with one click.

### Collapsible URL Bar
Click the **URL** header button to collapse the address bar and free up vertical space. When collapsed, a hint line shows the currently loaded URL so you always know what's being previewed. Click again to expand.

### Live Server Quick-Access
A dedicated **⚡ Live Server :5500** button is always visible in the toolbar, giving you instant one-click access to the VS Code Live Server extension without having to type the address manually.

### Zoom Control
Scale the preview from **25 % to 150 %** to fit the device preview into your available space. The dimension badge always shows the true CSS pixel size regardless of zoom level.

### Custom Devices
Add your own devices with fully configurable viewport size, category, PPI, and year. Custom devices persist across sessions and are grouped separately in the device list.

### Grid Overlay
Toggle a pixel grid over the preview with the **Grid** button. Choose from six cell sizes — **4 · 8 · 16 · 24 · 32 · 64 px** — via the adjacent dropdown. Useful for checking alignment, spacing, and layout consistency.

### Pixel Ruler
Toggle horizontal and vertical rulers with the **Ruler** button. Rulers appear outside the visible content area (in the device bezel) and show real CSS pixel coordinates starting at 0. They update automatically on device switch, rotation, and zoom change.

### Inspector Mode *(localhost only)*
Activate the **Inspect** button to enter element inspection mode. ResView starts a local HTTP proxy that injects an inspector script into every page response. Hovering over elements shows:

- A violet highlight around the hovered element
- The element's CSS selector — plus **green badges showing which CSS file** each rule comes from (e.g. `App.css`, `styles.css`)
- A **box model diagram** (margin / border / padding / content) in Firefox DevTools style
- Key computed styles: color, background, font-size, font-family, display, position, border-radius, and more — with inline color swatches

CSS source detection works for external stylesheets, Vite/React CSS imports (`data-vite-dev-id`), and rules inside `@media`, `@supports`, and `@layer` blocks.

**Hot Reload support:** CSS and JS changes made in your editor are picked up instantly in the preview — no need to toggle Inspector off and on. The proxy forwards Vite's HMR WebSocket connection transparently.

> **Note:** Inspector Mode requires a locally running HTTP server (e.g. `localhost:3000`, `localhost:5500`). External HTTPS sites are not supported.

### Open in Browser
The **↗** button next to the address bar opens the current URL directly in your default system browser.

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

Type any URL into the address bar and press **Go** or `Enter`. ResView also detects running dev servers automatically and shows them as clickable chips below the URL bar. For VS Code Live Server, click the **⚡ Live Server :5500** button directly.

### 3. Pick a Device

Use the **Phone / Tablet / Desktop** tabs to switch categories, then choose a device from the dropdown. The preview resizes immediately.

### 4. Toggle Orientation

Click the **↕ / ↔** button to switch between portrait and landscape mode. Not available for desktop breakpoints.

### 5. Adjust Zoom

Drag the zoom slider (**25 %–150 %**) to fit the device preview into your available screen space. The dimension badge at the bottom always shows the actual CSS viewport size.

---

## Developer Tools

### Grid Overlay

Click **Grid** in the toolbar to overlay a pixel grid on the preview. Use the adjacent dropdown to choose the cell size:

| Size | Use case |
|---|---|
| 4 px | Fine-grained pixel alignment |
| 8 px | Default — standard 8pt spacing system |
| 16 px | Base grid for most design systems |
| 24 px | Material Design baseline |
| 32 px | Coarse layout grid |
| 64 px | Section / column planning |

### Ruler

Click **Ruler** to show horizontal and vertical pixel rulers alongside the device frame. Rulers display real CSS pixel coordinates (0 → device width/height) and never overlap the visible content.

### Inspector Mode

Click **Inspect** to activate element inspection (requires a running localhost server). Hover over any element in the preview to see:

- The element's CSS selector, with **green source file badges** showing which CSS file(s) the rule comes from
- Full box model: margin, border, padding, and content dimensions
- Computed styles: color (with swatch), background, font-size, font-family, font-weight, line-height, display, position, flex-direction, gap, border-radius, opacity, z-index, overflow

**Hot Reload:** Changes to CSS or JS files in your editor appear immediately in the preview — Vite's HMR WebSocket is tunnelled through the proxy so the connection is never interrupted.

Click **Inspect** again to exit inspection mode and return to the normal preview.

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

> Custom devices are saved globally in your editor and persist across all workspaces and sessions.

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

Configure ResView via **File → Preferences → Settings** (or the equivalent in your editor) and search for `ResView`.

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

## Compatibility

ResView is built on the VS Code Extension API and runs in any editor that supports it:

| Editor | Status |
|---|---|
| [VS Code](https://code.visualstudio.com) | ✅ Fully supported |
| [Cursor](https://www.cursor.com) | ✅ Fully supported |
| [Windsurf](https://windsurf.com) | ✅ Fully supported |
| [VSCodium](https://vscodium.com) | ✅ Fully supported |
| [GitHub Codespaces](https://github.com/features/codespaces) | ⚠️ Not tested yet |
| [Gitpod](https://www.gitpod.io) | ⚠️ Not tested yet |
| [Eclipse Theia](https://theia-ide.org) | ⚠️ Not tested yet |

Any other editor that supports VS Code extensions (`.vsix` install) should work equally well.

---

## Requirements

- VS Code **1.85.0** or later (or a compatible editor)
- Any local or remote URL accessible from your machine (no special server configuration needed)
- Inspector Mode requires a locally running HTTP server

---

## License

MIT
