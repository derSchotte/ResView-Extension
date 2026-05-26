import * as vscode from "vscode";
import { DEVICES } from "./devices";
import { detectRunningServers } from "./serverDetector";
import { InspectorProxy } from "./proxy";
import { DeviceRepository, UiStateRepository } from "./storage";
import { WebviewHtmlBuilder } from "./WebviewHtml";
import { VIEW_TYPE, PANEL_TITLE, CONFIG_KEYS, POLL_INTERVAL_MS } from "./constants";
import type { Device, InboundWebviewMessage, DetectedServer } from "./types";

export class ResViewPanel {
  public static currentPanel: ResViewPanel | undefined;
  public static readonly viewType = VIEW_TYPE;

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly proxy: InspectorProxy;
  private readonly deviceRepo: DeviceRepository;
  private readonly uiStateRepo: UiStateRepository;
  private readonly disposables: vscode.Disposable[] = [];

  private currentUrl = "";
  private detectedServers: DetectedServer[] = [];
  private pollTimer: ReturnType<typeof setTimeout> | undefined;
  private polling = false;

  static async revive(
    panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext
  ): Promise<void> {
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")],
    };
    ResViewPanel.currentPanel = new ResViewPanel(panel, context);
  }

  static async createOrShow(
    context: vscode.ExtensionContext,
    url?: string
  ): Promise<void> {
    const column = vscode.window.activeTextEditor
      ? vscode.ViewColumn.Beside
      : vscode.ViewColumn.One;

    if (ResViewPanel.currentPanel) {
      ResViewPanel.currentPanel.panel.reveal(column);
      if (url) await ResViewPanel.currentPanel.setUrl(url);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      VIEW_TYPE,
      PANEL_TITLE,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")],
      }
    );

    ResViewPanel.currentPanel = new ResViewPanel(panel, context);
    if (url) await ResViewPanel.currentPanel.setUrl(url);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext
  ) {
    this.panel = panel;
    this.extensionUri = context.extensionUri;
    this.proxy = new InspectorProxy();
    this.deviceRepo = new DeviceRepository(context);
    this.uiStateRepo = new UiStateRepository(context);

    this.panel.iconPath = {
      light: vscode.Uri.joinPath(this.extensionUri, "media", "icon.png"),
      dark: vscode.Uri.joinPath(this.extensionUri, "media", "icon.png"),
    };

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (msg) => this.handleMessage(msg as InboundWebviewMessage),
      null,
      this.disposables
    );

    this.render();
    this.initialize();
  }

  private render(): void {
    this.panel.title = PANEL_TITLE;
    this.panel.webview.html = new WebviewHtmlBuilder(
      this.panel.webview,
      this.extensionUri
    ).build();
  }

  private async initialize(): Promise<void> {
    try {
      await this.proxy.start();
    } catch {
      vscode.window.showErrorMessage("ResView: Failed to start inspector proxy.");
    }

    const config = vscode.workspace.getConfiguration("resview");
    this.currentUrl = config.get<string>(CONFIG_KEYS.DEFAULT_URL, "");

    if (config.get<boolean>(CONFIG_KEYS.AUTO_DETECT, true)) {
      this.runInitialScan();
      this.startPolling();
    }
  }

  private runInitialScan(): void {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "ResView: Searching for dev servers…",
        cancellable: false,
      },
      async () => {
        this.detectedServers = await detectRunningServers();
      }
    );
  }

  private startPolling(): void {
    this.stopPolling();
    this.polling = true;
    const schedule = (): void => {
      this.pollTimer = setTimeout(async () => {
        if (!this.polling) return;
        await this.pollServers();
        if (this.polling) schedule();
      }, POLL_INTERVAL_MS);
    };
    schedule();
  }

  private stopPolling(): void {
    this.polling = false;
    if (this.pollTimer !== undefined) {
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private async pollServers(): Promise<void> {
    let servers: DetectedServer[];
    try {
      servers = await detectRunningServers();
    } catch {
      return;
    }

    const newServers = servers.filter(
      (s) => !this.detectedServers.some((d) => d.port === s.port)
    );

    if (newServers.length === 0) return;

    this.detectedServers = servers;
    this.panel.webview.postMessage({ type: "servers", servers });

    if (!this.currentUrl) {
      await this.promptForNewServers(newServers);
    }
  }

  private async promptForNewServers(servers: DetectedServer[]): Promise<void> {
    for (const server of servers) {
      const label = server.framework ? ` (${server.framework})` : "";
      const pick = await vscode.window.showInformationMessage(
        `ResView: Dev server detected at ${server.url}${label}`,
        "Open",
        "Dismiss"
      );
      if (pick === "Open") {
        await this.setUrl(server.url);
      }
    }
  }

  private async setUrl(url: string): Promise<void> {
    this.currentUrl = url;
    this.proxy.setTarget(url);
    this.panel.webview.postMessage({ type: "setUrl", url });
  }

  private handleMessage(msg: InboundWebviewMessage): void {
    switch (msg.type) {
      case "ready":         return this.onReady();
      case "rescan":        return this.onRescan();
      case "addCustomDevice":    return this.onAddCustomDevice(msg.device);
      case "deleteCustomDevice": return this.onDeleteCustomDevice(msg.name);
      case "saveUiState":   return this.onSaveUiState(msg.state);
      case "inspectorToggle":    return this.onInspectorToggle(msg.enabled, msg.url);
      case "openExternal":  return this.onOpenExternal(msg.url);
    }
  }

  private onReady(): void {
    if (this.currentUrl) this.proxy.setTarget(this.currentUrl);
    this.panel.webview.postMessage({
      type: "init",
      url: this.currentUrl,
      devices: DEVICES,
      customDevices: this.deviceRepo.getCustomDevices(),
      uiState: this.uiStateRepo.get(),
      servers: this.detectedServers,
      proxyPort: this.proxy.proxyPort,
    });
  }

  private onRescan(): void {
    detectRunningServers().then((servers) => {
      this.detectedServers = servers;
      this.panel.webview.postMessage({ type: "servers", servers });
    });
  }

  private onAddCustomDevice(device: Device): void {
    this.deviceRepo.addCustomDevice(device).then((updated) => {
      this.panel.webview.postMessage({
        type: "customDevices",
        devices: updated,
        selectName: device.name,
      });
    });
  }

  private onDeleteCustomDevice(name: string): void {
    this.deviceRepo.removeCustomDevice(name).then((updated) => {
      this.panel.webview.postMessage({ type: "customDevices", devices: updated });
    });
  }

  private onSaveUiState(state: ReturnType<typeof this.uiStateRepo.get>): void {
    this.uiStateRepo.save(state);
  }

  private onInspectorToggle(enabled: boolean, url?: string): void {
    this.proxy.setInspectorEnabled(enabled);
    if (enabled && url) {
      this.proxy.setTarget(url);
    }
    const targetUrl = url ?? this.currentUrl;
    if (targetUrl) {
      const proxyUrl = this.proxy.proxyUrlFor(targetUrl);
      this.panel.webview.postMessage({ type: "inspectorReady", proxyUrl });
    }
  }

  private onOpenExternal(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;
    vscode.env.openExternal(vscode.Uri.parse(url));
  }

  dispose(): void {
    ResViewPanel.currentPanel = undefined;
    this.stopPolling();
    this.proxy.stop();
    this.panel.dispose();
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }
}
