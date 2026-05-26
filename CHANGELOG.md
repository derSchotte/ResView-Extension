# Changelog

All notable changes to ResView are documented here.

---

## [1.1.24] – 2026-05-26

### Fixed
- **URL navigation without inspector.** Non-inspector navigation now sets the iframe `src` directly instead of routing through the proxy, fixing a regression where the preview did not update when the inspector was inactive.
- **Inspector disable restores preview directly.** Turning off the inspector now reloads the iframe with `currentUrl` immediately — no backend round-trip needed.
- **Proxy target only set when inspector is active.** `setUrl()` and `onReady()` no longer pre-warm the proxy target; the proxy is only involved when the inspector is enabled.

### Changed
- **JSDoc type annotations in `app.js`.** Event handler and DOM reference types are now documented inline for better editor support.

---

## [1.1.21] – 2026-05-26

### Changed
- **TypeScript backend fully restructured.** Split into dedicated modules: `src/types.ts` (shared types), `src/constants.ts` (all magic strings/keys), `src/storage.ts` (Repository pattern for devices and UI state), `src/WebviewHtml.ts` (Builder pattern for HTML/CSP). Private fields and methods use consistent naming with TypeScript `private` modifiers throughout.
- **Frontend split into native ES modules.** The monolithic `media/main.js` has been replaced by 12 focused ES module files loaded natively by the browser — no bundler required: `app.js`, `appState.js`, `bridges.js`, `constants.js`, `utils.js`, `eventEmitter.js`, and six controller modules under `media/controllers/`.
- **Observer / EventEmitter pattern introduced.** A lightweight `EventEmitter` base class drives all internal communication. `AppState` extends it and emits typed events; controllers subscribe instead of calling each other directly.
- **Repository pattern for storage.** `DeviceRepository` and `UiStateRepository` encapsulate all `globalState` reads/writes, removing scattered storage calls from `ResViewPanel`.
- **Command pattern for message dispatch.** `ResViewPanel.handleMessage()` routes each inbound message type to a dedicated handler method, replacing a large switch block.
- **CSP hardened.** Nonce is now generated with `crypto.randomBytes(16)` (cryptographically secure). `webview.cspSource` is added to `script-src` so ES module imports from the media directory are allowed without `'unsafe-inline'`.
- **URL parsing modernised.** Deprecated `url.parse()` replaced throughout the proxy with `new URL()`.
- **XSS hardening in CSS rules panel.** CSS property names and values from the inspected page are now inserted via `textContent`/`createTextNode` instead of `innerHTML`.
- **Error message sanitisation in proxy.** Upstream errors no longer expose `err.message` in response bodies.
- **`onOpenExternal` URL scheme validation.** Only `http:` and `https:` URLs may be opened in the system browser; all other schemes are rejected.

---

## [1.1.20] – 2026-05-26

### Added
- **Box model in CSS Rules panel.** The CSS Rules panel now has a three-column layout: rule list (left), Firefox-style box model (centre), and declared properties (right). When a CSS rule is selected, the box model visualises any declared margin, border-width, and padding values, with shorthand expansion.
- **Panels are mutually exclusive.** The Inspector panel and the CSS Rules panel can no longer be open simultaneously. Opening one automatically closes the other.

---

## [1.1.19] – 2026-05-26

### Changed
- **Lucide icons throughout.** All toolbar icons, tab icons, and modal controls have been replaced with [Lucide](https://lucide.dev) SVG icons: `chevron-down`, `refresh-cw`, `external-link`, `zap`, `smartphone`, `tablet`, `monitor`, `rotate-cw`, `plus`, `trash-2`, `info`, `grid-2x2`, `ruler`, `crosshair`, `x`.

---

## [1.1.18] – 2026-05-26

### Changed
- **URL bar toggle button redesigned.** The collapse/expand button is now visually prominent: background, border, hover highlight, and more padding — no longer easy to miss.
- **Device info moved to a popup.** The inline device name/dimensions text between the + button and the zoom slider has been replaced by a compact **ⓘ** button. Hovering over it (or clicking) opens a structured popup showing the device name, year, category, portrait and landscape dimensions, and PPI.

---

## [1.1.17] – 2026-05-26

### Added
- **Background server polling.** ResView now continuously checks for running dev servers every 3 seconds while the panel is open. When a new server starts (e.g. after running `npm run dev`), the server chips in the toolbar update automatically. If the URL bar is empty, a VS Code notification appears with an **Open** button to load the server immediately — no manual re-scan needed.

---

## [1.1.16] – 2026-05-26

### Added
- **Collapsible URL bar.** The URL bar can be collapsed to maximise preview space. When collapsed, a hint line shows the currently loaded URL so you always know what's being previewed. Click the **URL** header button to toggle.

---

## [1.1.15] – 2026-05-23

### Added
- **Hot Reload in Inspector Mode:** CSS and JS changes made in the editor are now picked up instantly in the preview. The proxy forwards Vite's HMR WebSocket connection via TCP tunnel so the HMR client stays connected without interruption.

### Fixed
- Inspector CSS source badges: `@media`, `@supports`, and `@layer` blocks are now scanned recursively — files that consist mainly of media queries (e.g. `MediaBig.css`, `MediaSmall.css`) are correctly identified as sources.
- Inspector CSS source badges: Vite/React CSS imports (`data-vite-dev-id` attribute) are resolved to their real filename instead of falling back to `index.html`.
- Inspector CSS source badges: Inline `<style>` blocks without a URL fall back to the HTML page filename.
- Inspector CSS source badges: Filenames containing `<` or `>` (e.g. `<style>`) are now HTML-escaped before insertion via `innerHTML` so they render as text rather than being swallowed as HTML tags.
- Badge font size increased (10 px → 12 px, weight 600) for better readability.

---

## [1.1.9] – 2026-05-23

### Added
- **Inspector: CSS source file badges.** When hovering over an element in Inspector Mode, green badges to the right of the CSS selector show which stylesheet file(s) the matching rules come from. Supports external stylesheets, Vite-injected `<style>` tags, and inline `<style>` blocks.

---

## [1.1.8] – 2026-05-23

### Added
- **Live Server quick-access button.** A permanent **⚡ Live Server :5500** button is always visible in the toolbar for one-click access to the VS Code Live Server extension.
- Port 5500 added to the automatic dev-server detection list.

---

## [1.1.7] – 2026-05-23

### Added
- **Grid: configurable cell size.** A dropdown next to the Grid button lets you choose the grid cell size: **4 · 8 · 16 · 24 · 32 · 64 px** (default: 8 px). Changes apply live while the grid is active.

---

## [1.1.6] – 2026-05-23

### Changed
- Zoom slider range extended from **25–100 %** to **25–150 %** (5 % steps).

---

## [1.1.5] – 2026-05-23

### Fixed
- **Inspector panel height flickering.** The panel now has a fixed height of 170 px (`overflow: hidden`) so it no longer jumps when hovering between elements with different numbers of CSS properties.
- Inspector properties layout changed from a vertical 2-column list to a **horizontal 6-column grid** (3 property-value pairs per row), making better use of horizontal space and reducing row count.

---

## [1.1.4] – 2026-05-23

### Added
- **Grid Overlay.** Toggle a pixel grid over the preview with the **Grid** button. The grid scales with zoom level.
- **Pixel Ruler.** Toggle horizontal and vertical rulers with the **Ruler** button. Rulers appear outside the visible content area and show real CSS pixel coordinates. They update automatically on device switch, rotation, and zoom change.
- **Inspector Mode** *(localhost only).* The **Inspect** button activates element inspection via a local HTTP proxy that injects an inspector script into page responses. Hovering over elements shows a violet highlight, the CSS selector, a box model diagram, and key computed styles with color swatches. The proxy also strips `X-Frame-Options` and `Content-Security-Policy` headers.
- **Open in Browser button.** The **↗** button opens the current URL in the default system browser.

---

## [1.1.0] – 2026-05-23

### Fixed
- **Panel survives editor reload.** After `Developer: Reload Window` or a full editor restart, the ResView panel was previously blank. A `WebviewPanelSerializer` is now registered on activation so VS Code can restore the panel automatically, including saved UI state (device, category, zoom, orientation).

---

## [1.0.9] – 2026-05-23

### Added
- **Custom devices.** Add, name, and persist your own devices (phone, tablet, desktop). Custom devices appear in a dedicated **★ Custom** group in the dropdown and survive editor restarts. Individual devices can be deleted via the 🗑 button.
- **Persistent UI state.** Selected category, device, zoom level, and orientation are saved on close and restored on next open.

### Fixed
- Bezel rotation (portrait ↔ landscape): the device frame and notch now rotate correctly — in landscape mode the wide bezel (notch side) moves from top to left.
- Scrollbar hidden inside preview iframe: the iframe is widened internally and clipped by the wrapper so the native scrollbar is never visible, matching real mobile behavior.
- Zoom whitespace: negative `marginBottom` compensation removes the excess layout space left by CSS `transform: scale()`.
- Corrected device data (CSS viewport and PPI) for Samsung Galaxy S23, OnePlus 12, Samsung Galaxy Tab S9 Ultra, and Google Pixel Tablet.
