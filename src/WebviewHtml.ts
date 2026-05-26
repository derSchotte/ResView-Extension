import * as vscode from "vscode";
import * as crypto from "crypto";

export class WebviewHtmlBuilder {
  constructor(
    private readonly webview: vscode.Webview,
    private readonly extensionUri: vscode.Uri
  ) {}

  build(): string {
    const nonce = crypto.randomBytes(16).toString("hex");
    const appUri = this.getMediaUri("app.js");
    const styleUri = this.getMediaUri("style.css");
    const lucideUri = this.getMediaUri("lucide.min.js");
    const csp = this.buildCsp(nonce);

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>ResView</title>
</head>
<body>
  <div id="app">
    <!-- Toolbar -->
    <header id="toolbar">
      <div class="toolbar-row toolbar-row--top">
        <div class="url-group">
          <button class="url-header" id="btnUrlToggle" title="URL-Leiste ein-/ausklappen">
            <span class="url-header-label">URL</span>
            <span id="urlCollapsedHint" class="url-collapsed-hint"></span>
            <i data-lucide="chevron-down" class="url-chevron" id="urlChevron"></i>
          </button>
          <div id="urlCollapsible" class="url-collapsible">
            <div class="url-row">
              <input id="urlInput" class="url-input" type="url" placeholder="http://localhost:3000" spellcheck="false" />
              <button id="btnGo" class="btn btn-primary" title="Load URL">Go</button>
              <button id="btnRescan" class="btn btn-icon" title="Re-scan for dev servers"><i data-lucide="refresh-cw"></i></button>
              <button id="btnOpenBrowser" class="btn btn-icon" title="Open in system browser"><i data-lucide="external-link"></i></button>
            </div>
            <div class="server-chips-row">
              <button id="btnLiveServer" class="server-chip server-chip--pinned" title="Load http://localhost:5500">
                <i data-lucide="zap" class="server-badge server-badge--pin"></i> Live Server :5500
              </button>
              <div id="serverChips" class="server-chips"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="toolbar-row toolbar-row--devices">
        <div class="category-tabs">
          <button class="tab-btn active" data-cat="phone"><i data-lucide="smartphone"></i> Phone</button>
          <button class="tab-btn" data-cat="tablet"><i data-lucide="tablet"></i> Tablet</button>
          <button class="tab-btn" data-cat="desktop"><i data-lucide="monitor"></i> Desktop</button>
        </div>

        <div class="device-select-group">
          <select id="deviceSelect" class="device-select"></select>
          <button id="btnRotate" class="btn btn-icon rotate-btn" title="Toggle Portrait / Landscape"><i data-lucide="rotate-cw"></i></button>
          <button id="btnAddDevice" class="btn btn-add" title="Add custom device"><i data-lucide="plus"></i></button>
          <button id="btnDeleteDevice" class="btn btn-danger" title="Delete this custom device" hidden><i data-lucide="trash-2"></i></button>
        </div>

        <div class="device-info-wrap">
          <button id="btnDeviceInfo" class="btn btn-icon btn-device-info" title="Device info"><i data-lucide="info"></i></button>
          <div id="deviceInfoPopup" class="device-info-popup" hidden></div>
        </div>

        <div class="zoom-group">
          <label class="label">Zoom</label>
          <input id="zoomRange" class="zoom-range" type="range" min="25" max="150" value="75" step="5" />
          <span id="zoomLabel" class="zoom-label">75 %</span>
        </div>
        <div class="overlay-controls">
          <button id="btnGrid" class="btn btn-icon btn-overlay-toggle" title="Toggle Grid"><i data-lucide="grid-2x2"></i></button>
          <select id="gridSizeSelect" class="grid-size-select" title="Grid cell size">
            <option value="4">4 px</option>
            <option value="8" selected>8 px</option>
            <option value="16">16 px</option>
            <option value="24">24 px</option>
            <option value="32">32 px</option>
            <option value="64">64 px</option>
          </select>
          <button id="btnRuler" class="btn btn-icon btn-overlay-toggle" title="Toggle Ruler"><i data-lucide="ruler"></i></button>
          <button id="btnInspect" class="btn btn-icon btn-overlay-toggle" title="Inspector Mode (localhost only)"><i data-lucide="crosshair"></i></button>
          <button id="btnCssRules" class="btn btn-icon btn-overlay-toggle" title="CSS Rules"><i data-lucide="braces"></i></button>
        </div>
      </div>
    </header>

    <!-- CSS Rules Panel -->
    <div id="cssRulesPanel" class="css-rules-panel" hidden>
      <div class="cr-header">
        <i data-lucide="search" class="cr-search-icon"></i>
        <input id="crSearch" class="cr-search" type="text" placeholder="Search selectors or filenames…" autocomplete="off" spellcheck="false" />
        <span id="crCount" class="cr-count"></span>
        <button id="crClearSearch" class="btn btn-icon cr-clear-btn" title="Clear search"><i data-lucide="x"></i></button>
        <button id="crRefresh" class="btn btn-icon cr-refresh-btn" title="Refresh rules"><i data-lucide="refresh-cw"></i></button>
      </div>
      <div class="cr-body">
        <div id="crList" class="cr-list"></div>
        <div class="cr-boxmodel-col">
          <div class="insp-boxmodel">
            <div class="bm-margin bm-layer">
              <span class="bm-lbl">margin</span>
              <span class="bm-t" id="crBmMT">—</span>
              <span class="bm-r" id="crBmMR">—</span>
              <span class="bm-b" id="crBmMB">—</span>
              <span class="bm-l" id="crBmML">—</span>
              <div class="bm-border bm-layer">
                <span class="bm-lbl">border</span>
                <span class="bm-t" id="crBmBT">—</span>
                <span class="bm-r" id="crBmBR">—</span>
                <span class="bm-b" id="crBmBB">—</span>
                <span class="bm-l" id="crBmBL">—</span>
                <div class="bm-padding bm-layer">
                  <span class="bm-lbl">padding</span>
                  <span class="bm-t" id="crBmPT">—</span>
                  <span class="bm-r" id="crBmPR">—</span>
                  <span class="bm-b" id="crBmPB">—</span>
                  <span class="bm-l" id="crBmPL">—</span>
                  <div class="bm-content"><span id="crBmW">—</span>&nbsp;×&nbsp;<span id="crBmH">—</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div id="crProps" class="cr-props"><span class="cr-hint">Select a rule to see its properties</span></div>
      </div>
    </div>

    <!-- Inspector Panel -->
    <div id="inspectorPanel" class="inspector-panel" hidden>
      <div class="insp-selector-row">
        <span class="insp-selector" id="inspSelector">Hover over an element to inspect it</span>
        <span class="insp-sources" id="inspSources"></span>
      </div>
      <div class="insp-body">
        <div class="insp-boxmodel">
          <div class="bm-margin bm-layer">
            <span class="bm-lbl">margin</span>
            <span class="bm-t" id="bmMT">—</span>
            <span class="bm-r" id="bmMR">—</span>
            <span class="bm-b" id="bmMB">—</span>
            <span class="bm-l" id="bmML">—</span>
            <div class="bm-border bm-layer">
              <span class="bm-lbl">border</span>
              <span class="bm-t" id="bmBT">—</span>
              <span class="bm-r" id="bmBR">—</span>
              <span class="bm-b" id="bmBB">—</span>
              <span class="bm-l" id="bmBL">—</span>
              <div class="bm-padding bm-layer">
                <span class="bm-lbl">padding</span>
                <span class="bm-t" id="bmPT">—</span>
                <span class="bm-r" id="bmPR">—</span>
                <span class="bm-b" id="bmPB">—</span>
                <span class="bm-l" id="bmPL">—</span>
                <div class="bm-content"><span id="bmW">—</span>&nbsp;×&nbsp;<span id="bmH">—</span></div>
              </div>
            </div>
          </div>
        </div>
        <div class="insp-styles" id="inspStyles"></div>
      </div>
    </div>

    <!-- Preview Stage -->
    <main id="stage">
      <div id="deviceShell">
        <div id="rulerCorner" class="ruler-corner" hidden></div>
        <canvas id="hRuler" class="ruler ruler-h" hidden></canvas>
        <canvas id="vRuler" class="ruler ruler-v" hidden></canvas>
        <div id="deviceBezel">
          <div id="frameWrapper">
            <div id="gridOverlay" class="grid-overlay" hidden></div>
            <iframe id="preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
          </div>
        </div>
        <div id="dimensionBadge" class="dimension-badge"></div>
      </div>
    </main>
  </div>

  <!-- Add Custom Device Modal -->
  <div id="customDeviceModal" class="modal-overlay" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal-header">
        <h3 class="modal-title" id="modalTitle">Add Custom Device</h3>
        <button id="cdClose" class="btn btn-icon modal-close" title="Close"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <div class="field-group">
          <label class="field-label" for="cdName">Name</label>
          <input id="cdName" class="text-input" type="text" placeholder="My Custom Phone" autocomplete="off" />
        </div>
        <div class="field-group">
          <span class="field-label">Category</span>
          <div class="radio-group">
            <label class="radio-label"><input type="radio" name="cdCat" value="phone" checked /> Phone</label>
            <label class="radio-label"><input type="radio" name="cdCat" value="tablet" /> Tablet</label>
            <label class="radio-label"><input type="radio" name="cdCat" value="desktop" /> Desktop</label>
          </div>
        </div>
        <div class="field-row-two">
          <div class="field-group">
            <label class="field-label" for="cdWidth">Width <span class="field-unit">(CSS px)</span></label>
            <input id="cdWidth" class="text-input" type="number" min="1" max="9999" placeholder="390" />
          </div>
          <div class="field-group">
            <label class="field-label" for="cdHeight">Height <span class="field-unit">(CSS px)</span></label>
            <input id="cdHeight" class="text-input" type="number" min="1" max="9999" placeholder="844" />
          </div>
        </div>
        <div class="field-row-two">
          <div class="field-group">
            <label class="field-label" for="cdPpi">PPI <span class="field-optional">(optional)</span></label>
            <input id="cdPpi" class="text-input" type="number" min="1" max="9999" placeholder="460" />
          </div>
          <div class="field-group">
            <label class="field-label" for="cdYear">Year <span class="field-optional">(optional)</span></label>
            <input id="cdYear" class="text-input" type="number" min="1990" max="2099" placeholder="2024" />
          </div>
        </div>
        <p id="cdError" class="field-error" hidden></p>
      </div>
      <div class="modal-footer">
        <button id="cdCancel" class="btn btn-icon">Cancel</button>
        <button id="cdSave" class="btn btn-primary">Save Device</button>
      </div>
    </div>
  </div>

  <script nonce="${nonce}" src="${lucideUri}"></script>
  <script type="module" nonce="${nonce}" src="${appUri}"></script>
</body>
</html>`;
  }

  private getMediaUri(filename: string): vscode.Uri {
    return this.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", filename)
    );
  }

  private buildCsp(nonce: string): string {
    const cspSource = this.webview.cspSource;
    return [
      "default-src 'none'",
      "frame-src *",
      // nonce covers the two entry scripts (lucide + app.js);
      // cspSource allows ES module imports from the webview resource root
      `script-src 'nonce-${nonce}' ${cspSource}`,
      `style-src ${cspSource} 'unsafe-inline'`,
      `img-src ${cspSource} https: data:`,
      "connect-src *",
    ].join("; ");
  }
}
