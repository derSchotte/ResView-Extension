import * as vscode from "vscode";
import { DEVICES, Device } from "./devices";
import { detectRunningServers, DetectedServer } from "./serverDetector";
import { InspectorProxy } from "./proxy";

const CUSTOM_DEVICES_KEY = "resview.customDevices";
const UI_STATE_KEY = "resview.uiState";

interface UiState {
  category?: string;
  deviceName?: string;
  zoom?: number;
  landscape?: boolean;
  urlCollapsed?: boolean;
}

export class ResViewPanel {
  public static currentPanel: ResViewPanel | undefined;
  public static readonly viewType = "resview";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _context: vscode.ExtensionContext;
  private _disposables: vscode.Disposable[] = [];

  private _currentUrl = "";
  private _detectedServers: DetectedServer[] = [];
  private _proxy: InspectorProxy = new InspectorProxy();
  private _pollTimer: ReturnType<typeof setTimeout> | undefined;
  private _polling = false;
  private static readonly POLL_INTERVAL_MS = 3000;

  static async revive(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")],
    };
    ResViewPanel.currentPanel = new ResViewPanel(panel, context.extensionUri, context);
  }

  static async createOrShow(context: vscode.ExtensionContext, url?: string) {
    const extensionUri = context.extensionUri;
    const column = vscode.window.activeTextEditor
      ? vscode.ViewColumn.Beside
      : vscode.ViewColumn.One;

    if (ResViewPanel.currentPanel) {
      ResViewPanel.currentPanel._panel.reveal(column);
      if (url) await ResViewPanel.currentPanel._setUrl(url);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      ResViewPanel.viewType,
      "ResView",
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "media"),
        ],
      }
    );

    ResViewPanel.currentPanel = new ResViewPanel(panel, extensionUri, context);
    if (url) await ResViewPanel.currentPanel._setUrl(url);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._context = context;

    this._panel.iconPath = {
      light: vscode.Uri.joinPath(extensionUri, "media", "icon.png"),
      dark: vscode.Uri.joinPath(extensionUri, "media", "icon.png"),
    };

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (msg) => this._handleMessage(msg),
      null,
      this._disposables
    );

    this._init();
  }

  private async _init() {
    await this._proxy.start();

    const config = vscode.workspace.getConfiguration("resview");
    const autoDetect = config.get<boolean>("autoDetect", true);
    const defaultUrl = config.get<string>("defaultUrl", "");

    if (autoDetect) {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "ResView: Searching for dev servers…",
          cancellable: false,
        },
        async () => {
          this._detectedServers = await detectRunningServers();
        }
      );
      this._startPolling();
    }

    this._currentUrl = defaultUrl || "";
    this._render();
  }

  private _startPolling() {
    this._stopPolling();
    this._polling = true;
    const schedule = () => {
      this._pollTimer = setTimeout(async () => {
        if (!this._polling) return;
        await this._pollServers();
        if (this._polling) schedule();
      }, ResViewPanel.POLL_INTERVAL_MS);
    };
    schedule();
  }

  private _stopPolling() {
    this._polling = false;
    if (this._pollTimer !== undefined) {
      clearTimeout(this._pollTimer);
      this._pollTimer = undefined;
    }
  }

  private async _pollServers() {
    let servers: DetectedServer[];
    try {
      servers = await detectRunningServers();
    } catch {
      return;
    }

    const newServers = servers.filter(
      (s) => !this._detectedServers.some((d) => d.port === s.port)
    );

    if (newServers.length === 0) return;

    this._detectedServers = servers;
    this._panel.webview.postMessage({ type: "servers", servers });

    if (!this._currentUrl) {
      for (const server of newServers) {
        const label = server.framework ? ` (${server.framework})` : "";
        const pick = await vscode.window.showInformationMessage(
          `ResView: Dev server detected at ${server.url}${label}`,
          "Open",
          "Dismiss"
        );
        if (pick === "Open") {
          await this._setUrl(server.url);
        }
      }
    }
  }

  private async _setUrl(url: string) {
    this._currentUrl = url;
    this._panel.webview.postMessage({ type: "setUrl", url });
  }

  private _getCustomDevices(): Device[] {
    return this._context.globalState.get<Device[]>(CUSTOM_DEVICES_KEY, []);
  }

  private async _saveCustomDevices(devices: Device[]): Promise<void> {
    await this._context.globalState.update(CUSTOM_DEVICES_KEY, devices);
  }

  private _getUiState(): UiState {
    return this._context.globalState.get<UiState>(UI_STATE_KEY, {});
  }

  private _saveUiState(state: UiState): void {
    this._context.globalState.update(UI_STATE_KEY, state);
  }

  private _handleMessage(msg: { type: string; [k: string]: unknown }) {
    switch (msg.type) {
      case "ready":
        this._panel.webview.postMessage({
          type: "init",
          url: this._currentUrl,
          devices: DEVICES,
          customDevices: this._getCustomDevices(),
          uiState: this._getUiState(),
          servers: this._detectedServers,
          proxyPort: this._proxy.port,
        });
        break;

      case "rescan":
        detectRunningServers().then((servers) => {
          this._detectedServers = servers;
          this._panel.webview.postMessage({ type: "servers", servers });
        });
        break;

      case "addCustomDevice": {
        const device = msg.device as Device;
        const customs = this._getCustomDevices();
        if (!customs.find((d) => d.name === device.name)) {
          customs.push({ ...device, custom: true });
          this._saveCustomDevices(customs);
        }
        this._panel.webview.postMessage({
          type: "customDevices",
          devices: this._getCustomDevices(),
          selectName: device.name,
        });
        break;
      }

      case "deleteCustomDevice": {
        const name = msg.name as string;
        const customs = this._getCustomDevices().filter((d) => d.name !== name);
        this._saveCustomDevices(customs);
        this._panel.webview.postMessage({
          type: "customDevices",
          devices: customs,
        });
        break;
      }

      case "saveUiState":
        this._saveUiState(msg.state as UiState);
        break;

      case "inspectorToggle": {
        const enabled = msg.enabled as boolean;
        const targetUrl = msg.url as string | undefined;
        if (enabled && targetUrl) {
          this._proxy.setTarget(targetUrl);
          const proxyUrl = this._proxy.proxyUrlFor(targetUrl);
          this._panel.webview.postMessage({ type: "inspectorReady", proxyUrl });
        }
        break;
      }

      case "openExternal":
        if (typeof msg.url === "string") {
          vscode.env.openExternal(vscode.Uri.parse(msg.url));
        }
        break;
    }
  }

  private _render() {
    const webview = this._panel.webview;
    this._panel.title = "ResView – Responsive Preview";
    this._panel.webview.html = this._getHtml(webview);
  }

  private _getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "style.css")
    );
    const lucideUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "lucide.min.js")
    );
    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             frame-src *;
             script-src 'nonce-${nonce}';
             style-src ${webview.cspSource} 'unsafe-inline';
             img-src ${webview.cspSource} https: data:;
             connect-src *;" />
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
        </div>
      </div>
    </header>

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
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  dispose() {
    ResViewPanel.currentPanel = undefined;
    this._stopPolling();
    this._proxy.stop();
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) d.dispose();
    }
  }
}

function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
