import { pingHost } from "./storage.js";

/**
 * @param {object} options
 * @param {boolean} options.enabled
 * @param {(widgetId: number, status: "ok" | "fail" | "unknown") => void} options.onStatus
 */
export function createPingPoller({ enabled, onStatus }) {
  /** @type {Map<number, number>} */
  const lastRunAt = new Map();
  /** @type {Set<number>} */
  const inFlight = new Set();

  /**
   * @param {import("./data/defaults.js").Widget[]} widgets
   */
  function tick(widgets) {
    if (!enabled) return;
    const now = Date.now();

    widgets.forEach((widget) => {
      if (widget.type !== "ping") return;
      if (!widget.host) {
        onStatus(widget.id, "unknown");
        return;
      }

      const intervalMs = typeof widget.intervalMs === "number" ? widget.intervalMs : 5000;
      const last = lastRunAt.get(widget.id) ?? 0;
      if (inFlight.has(widget.id) || now - last < intervalMs) return;

      lastRunAt.set(widget.id, now);
      inFlight.add(widget.id);

      const attempts = typeof widget.attempts === "number" ? widget.attempts : 2;
      void pingHost({
        host: widget.host,
        attempts,
        intervalMs,
      })
        .then((result) => {
          onStatus(widget.id, result.success ? "ok" : "fail");
        })
        .catch(() => {
          onStatus(widget.id, "fail");
        })
        .finally(() => {
          inFlight.delete(widget.id);
        });
    });
  }

  return { tick };
}
