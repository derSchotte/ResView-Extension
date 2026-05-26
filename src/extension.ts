import * as vscode from "vscode";
import { ResViewPanel } from "./ResViewPanel";
import { COMMANDS, CONFIG_KEYS } from "./constants";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.window.registerWebviewPanelSerializer(ResViewPanel.viewType, {
      async deserializeWebviewPanel(panel: vscode.WebviewPanel) {
        await ResViewPanel.revive(panel, context);
      },
    }),

    vscode.commands.registerCommand(COMMANDS.OPEN, () => {
      ResViewPanel.createOrShow(context);
    }),

    vscode.commands.registerCommand(COMMANDS.OPEN_WITH_URL, async () => {
      const url = await promptForUrl();
      if (!url) return;

      const config = vscode.workspace.getConfiguration("resview");
      await config.update(CONFIG_KEYS.DEFAULT_URL, url, vscode.ConfigurationTarget.Workspace);
      ResViewPanel.createOrShow(context, url);
    })
  );
}

export function deactivate(): void {}

async function promptForUrl(): Promise<string | undefined> {
  const config = vscode.workspace.getConfiguration("resview");
  const lastUrl = config.get<string>(CONFIG_KEYS.DEFAULT_URL, "");

  return vscode.window.showInputBox({
    title: "ResView: Enter URL to preview",
    value: lastUrl || "http://localhost:3000",
    placeHolder: "http://localhost:3000",
    validateInput(value) {
      try {
        new URL(value);
        return null;
      } catch {
        return "Please enter a valid URL (e.g. http://localhost:3000)";
      }
    },
  });
}
