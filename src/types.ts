export type DeviceCategory = "phone" | "tablet" | "desktop";

export interface DeviceDimensions {
  readonly width: number;
  readonly height: number;
}

export interface Device {
  readonly name: string;
  readonly category: DeviceCategory;
  readonly brand: string;
  readonly portrait: DeviceDimensions;
  readonly landscape?: DeviceDimensions;
  readonly ppi?: number;
  readonly year?: number;
  readonly custom?: boolean;
}

export interface UiState {
  readonly category?: DeviceCategory;
  readonly deviceName?: string;
  readonly zoom?: number;
  readonly landscape?: boolean;
  readonly urlCollapsed?: boolean;
}

export interface DetectedServer {
  readonly url: string;
  readonly port: number;
  readonly framework?: string;
  readonly confidence: "high" | "medium" | "low";
}

export type InboundWebviewMessage =
  | { readonly type: "ready" }
  | { readonly type: "rescan" }
  | { readonly type: "addCustomDevice"; readonly device: Device }
  | { readonly type: "deleteCustomDevice"; readonly name: string }
  | { readonly type: "saveUiState"; readonly state: UiState }
  | { readonly type: "inspectorToggle"; readonly enabled: boolean; readonly url?: string }
  | { readonly type: "openExternal"; readonly url: string };
