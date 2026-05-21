import * as vscode from "vscode";
import { ResViewPanel } from "./ResViewPanel";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerWebviewPanelSerializer(ResViewPanel.viewType, {
      async deserializeWebviewPanel(panel: vscode.WebviewPanel) {
        await ResViewPanel.revive(panel, context);
      },
    }),

    vscode.commands.registerCommand("resview.open", () => {
      ResViewPanel.createOrShow(context);
    }),

    vscode.commands.registerCommand("resview.openWithUrl", async () => {
      const config = vscode.workspace.getConfiguration("resview");
      const lastUrl = config.get<string>("defaultUrl", "");

      const url = await vscode.window.showInputBox({
        title: "ResView: Enter URL to preview",
        value: lastUrl || "http://localhost:3000",
        placeHolder: "http://localhost:3000",
        validateInput(v) {
          try {
            new URL(v);
            return null;
          } catch {
            return "Please enter a valid URL (e.g. http://localhost:3000)";
          }
        },
      });

      if (url) {
        await config.update("defaultUrl", url, vscode.ConfigurationTarget.Workspace);
        ResViewPanel.createOrShow(context, url);
      }
    })
  );
}

export function deactivate() {}
