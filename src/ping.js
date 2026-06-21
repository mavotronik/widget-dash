import { pingHost } from "./storage.js";

const INITIAL_DELAY_MS = 1000;

/** @param {number} ms */
function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * @param {object} options
 * @param {() => import("./data/defaults.js").Screen[]} options.getScreens
 * @param {() => number} options.getQueueIntervalMs
 * @param {(widgetId: number, status: "ok" | "fail" | "unknown") => void} options.onStatus
 */
export function createPingPoller({ getScreens, getQueueIntervalMs, onStatus }) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let cycleTimer = null;
  let running = false;
  let active = false;
  let startedAt = 0;
  let hasCompletedInitialDelay = false;
  /** @type {Map<number, "ok" | "fail" | "unknown">} */
  const statusCache = new Map();

  function collectPingWidgets() {
    return getScreens().flatMap((screen) =>
      screen.widgets.filter((widget) => widget.type === "ping")
    );
  }

  function setStatus(widgetId, status) {
    statusCache.set(widgetId, status);
    onStatus(widgetId, status);
  }

  function resetAllUnknown() {
    collectPingWidgets().forEach((widget) => {
      setStatus(widget.id, "unknown");
    });
  }

  function applyCachedStatuses() {
    collectPingWidgets().forEach((widget) => {
      const cached = statusCache.get(widget.id);
      if (cached) {
        onStatus(widget.id, cached);
      }
    });
  }

  /** @param {import("./data/defaults.js").Widget} widget */
  async function pingWidget(widget) {
    if (!widget.host) {
      setStatus(widget.id, "unknown");
      return;
    }

    const attemptIntervalMs =
      typeof widget.intervalMs === "number" ? widget.intervalMs : 1000;

    try {
      const result = await pingHost({
        host: widget.host,
        attempts: widget.attempts ?? 2,
        intervalMs: attemptIntervalMs,
      });
      setStatus(widget.id, result.success ? "ok" : "fail");
    } catch {
      setStatus(widget.id, "fail");
    }
  }

  function scheduleCycle(delayMs) {
    if (cycleTimer !== null) {
      clearTimeout(cycleTimer);
    }
    cycleTimer = setTimeout(() => {
      cycleTimer = null;
      void runCycle();
    }, delayMs);
  }

  async function runCycle() {
    if (!active || running) return;

    if (!hasCompletedInitialDelay) {
      const elapsed = Date.now() - startedAt;
      if (elapsed < INITIAL_DELAY_MS) {
        scheduleCycle(INITIAL_DELAY_MS - elapsed);
        return;
      }
      hasCompletedInitialDelay = true;
    }

    running = true;
    const widgets = collectPingWidgets();
    const queueIntervalMs = getQueueIntervalMs();

    for (let index = 0; index < widgets.length; index += 1) {
      if (!active) break;
      await pingWidget(widgets[index]);
      if (index < widgets.length - 1) {
        await delay(queueIntervalMs);
      }
    }

    running = false;

    if (active) {
      scheduleCycle(queueIntervalMs);
    }
  }

  function start({ resetStatuses = true } = {}) {
    stop(false);
    active = true;

    if (resetStatuses) {
      startedAt = Date.now();
      hasCompletedInitialDelay = false;
      statusCache.clear();
      resetAllUnknown();
      scheduleCycle(INITIAL_DELAY_MS);
      return;
    }

    if (!hasCompletedInitialDelay) {
      startedAt = Date.now();
      scheduleCycle(INITIAL_DELAY_MS);
    } else if (!running && cycleTimer === null) {
      scheduleCycle(0);
    }
  }

  function restart({ resetStatuses = false } = {}) {
    start({ resetStatuses });
  }

  function stop(clearTimer = true) {
    active = false;
    running = false;
    if (clearTimer && cycleTimer !== null) {
      clearTimeout(cycleTimer);
      cycleTimer = null;
    }
  }

  function invalidate(widgetId) {
    setStatus(widgetId, "unknown");
  }

  return {
    start,
    restart,
    stop,
    applyCachedStatuses,
    getStatusCache: () => statusCache,
    invalidate,
  };
}
