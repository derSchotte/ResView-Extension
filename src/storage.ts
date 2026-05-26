import * as vscode from "vscode";
import type { Device, UiState } from "./types";
import { STORAGE_KEYS } from "./constants";

export class DeviceRepository {
  constructor(private readonly context: vscode.ExtensionContext) {}

  getCustomDevices(): Device[] {
    return this.context.globalState.get<Device[]>(STORAGE_KEYS.CUSTOM_DEVICES, []);
  }

  async addCustomDevice(device: Device): Promise<Device[]> {
    const current = this.getCustomDevices();
    if (!current.some((d) => d.name === device.name)) {
      await this.context.globalState.update(STORAGE_KEYS.CUSTOM_DEVICES, [
        ...current,
        { ...device, custom: true },
      ]);
    }
    return this.getCustomDevices();
  }

  async removeCustomDevice(name: string): Promise<Device[]> {
    const updated = this.getCustomDevices().filter((d) => d.name !== name);
    await this.context.globalState.update(STORAGE_KEYS.CUSTOM_DEVICES, updated);
    return updated;
  }
}

export class UiStateRepository {
  constructor(private readonly context: vscode.ExtensionContext) {}

  get(): UiState {
    return this.context.globalState.get<UiState>(STORAGE_KEYS.UI_STATE, {});
  }

  save(state: UiState): void {
    this.context.globalState.update(STORAGE_KEYS.UI_STATE, state);
  }
}
