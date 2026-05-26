// @ts-check
"use strict";

import { EventEmitter } from "./eventEmitter.js";
import { MSG } from "./constants.js";

/**
 * Wraps the VS Code webview API.
 * Emits one event per inbound message type so controllers can subscribe
 * without coupling to window.addEventListener directly.
 */
export class VsCodeBridge extends EventEmitter {
  #api;

  constructor() {
    super();
    // @ts-ignore — acquireVsCodeApi() is injected by the webview runtime
    this.#api = acquireVsCodeApi();
    window.addEventListener("message", (event) => {
      const msg = event.data;
      // Route only extension messages (iframe protocol starts with "__resview_")
      if (msg?.type && !msg.type.startsWith("__resview_")) {
        this.emit(msg.type, msg);
      }
    });
  }

  /**
   * Send a message to the VS Code extension host.
   * @param {object} message
   */
  post(message) {
    this.#api.postMessage(message);
  }
}

/**
 * Wraps communication with the previewed iframe.
 * Emits one event per iframe protocol message type.
 */
export class IframeBridge extends EventEmitter {
  /** @type {HTMLIFrameElement} */
  #iframe;

  /** @param {HTMLIFrameElement} iframe */
  constructor(iframe) {
    super();
    this.#iframe = iframe;
    window.addEventListener("message", (event) => {
      const msg = event.data;
      // Route only iframe inspector/CSS protocol messages
      if (msg?.type?.startsWith("__resview_")) {
        this.emit(msg.type, msg);
      }
    });
  }

  /**
   * Send a message into the previewed iframe.
   * @param {object} message
   */
  post(message) {
    try {
      this.#iframe.contentWindow?.postMessage(message, "*");
    } catch {
      // Sandbox or cross-origin restriction — silently ignore
    }
  }
}
