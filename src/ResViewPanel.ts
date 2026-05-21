import * as vscode from "vscode";
import { DEVICES, Device } from "./devices";
import { detectRunningServers, DetectedServer } from "./serverDetector";

const CUSTOM_DEVICES_KEY = "resview.customDevices";
const UI_STATE_KEY = "resview.uiState";

interface UiState {
  category?: string;
  deviceName?: string;
  zoom?: number;
  landscape?: boolean;
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
    }

    this._currentUrl = defaultUrl || "";
    this._render();
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
          <label class="label" for="urlInput">URL</label>
          <div class="url-row">
            <input id="urlInput" class="url-input" type="url" placeholder="http://localhost:3000" spellcheck="false" />
            <button id="btnGo" class="btn btn-primary" title="Load URL">Go</button>
            <button id="btnRescan" class="btn btn-icon" title="Re-scan for dev servers">
              <span class="icon">⟳</span>
            </button>
          </div>
          <div id="serverChips" class="server-chips"></div>
        </div>
      </div>

      <div class="toolbar-row toolbar-row--devices">
        <div class="category-tabs">
          <button class="tab-btn active" data-cat="phone">📱 Phone</button>
          <button class="tab-btn" data-cat="tablet">🖥 Tablet</button>
          <button class="tab-btn" data-cat="desktop">🖥️ Desktop</button>
        </div>

        <div class="device-select-group">
          <select id="deviceSelect" class="device-select"></select>
          <button id="btnRotate" class="btn btn-icon rotate-btn" title="Toggle Portrait / Landscape">
            <span id="rotateIcon">↕</span>
          </button>
          <button id="btnAddDevice" class="btn btn-add" title="Add custom device">+</button>
          <button id="btnDeleteDevice" class="btn btn-danger" title="Delete this custom device" hidden>🗑</button>
        </div>

        <div id="deviceInfo" class="device-info"></div>

        <div class="zoom-group">
          <label class="label">Zoom</label>
          <input id="zoomRange" class="zoom-range" type="range" min="25" max="100" value="75" step="5" />
          <span id="zoomLabel" class="zoom-label">75 %</span>
        </div>
      </div>
    </header>

    <!-- Preview Stage -->
    <main id="stage">
      <div id="deviceShell">
        <div id="deviceBezel">
          <div id="frameWrapper">
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
        <button id="cdClose" class="btn btn-icon modal-close" title="Close">✕</button>
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

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  dispose() {
    ResViewPanel.currentPanel = undefined;
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
