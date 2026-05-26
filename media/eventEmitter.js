// @ts-check
"use strict";

/**
 * Minimal Observer/EventEmitter base class.
 * Controllers extend this to emit and subscribe to typed events.
 */
export class EventEmitter {
  /** @type {Map<string, Function[]>} */
  #listeners = new Map();

  /**
   * Subscribe to an event.
   * @param {string} event
   * @param {Function} handler
   * @returns {this}
   */
  on(event, handler) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, []);
    this.#listeners.get(event).push(handler);
    return this;
  }

  /**
   * Unsubscribe a handler from an event.
   * @param {string} event
   * @param {Function} handler
   * @returns {this}
   */
  off(event, handler) {
    const handlers = this.#listeners.get(event);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    }
    return this;
  }

  /**
   * Emit an event to all subscribers.
   * @param {string} event
   * @param {...unknown} args
   */
  emit(event, ...args) {
    this.#listeners.get(event)?.forEach((h) => h(...args));
  }
}
