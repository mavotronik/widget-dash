import { defaultData, defaultTransition } from "./defaults.js";

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {number} min
 * @param {number} [max]
 */
function normalizeNumber(value, fallback, min, max = Number.POSITIVE_INFINITY) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/** @param {unknown} widget @returns {import("./defaults.js").Widget | null} */
function normalizeWidget(widget) {
  if (!widget || typeof widget !== "object") return null;

  const w = /** @type {Record<string, unknown>} */ (widget);
  const id = typeof w.id === "number" ? w.id : Date.now();
  const type = typeof w.type === "string" && w.type ? w.type : "text";

  /** @type {import("./defaults.js").Widget} */
  const normalized = {
    id,
    type,
    x: normalizeNumber(w.x, 50, 0),
    y: normalizeNumber(w.y, 50, 0),
    w: normalizeNumber(w.w, 250, 20),
    h: normalizeNumber(w.h, 120, 20),
  };

  if (typeof w.fontSize === "number" && w.fontSize > 0) normalized.fontSize = w.fontSize;
  if (typeof w.fontFamily === "string" && w.fontFamily.trim()) normalized.fontFamily = w.fontFamily;
  if (typeof w.color === "string" && w.color.trim()) normalized.color = w.color;

  if (type === "text") {
    normalized.text = typeof w.text === "string" ? w.text : "Новый текст";
    normalized.contentMode = w.contentMode === "external" ? "external" : "local";
    if (normalized.contentMode === "external") {
      normalized.dataSource = w.dataSource === "mqtt" ? "mqtt" : "ha";
      if (typeof w.haEntityId === "string") normalized.haEntityId = w.haEntityId.trim();
      if (typeof w.mqttTopic === "string") normalized.mqttTopic = w.mqttTopic.trim();
    }
  } else if (type === "image") {
    normalized.url = typeof w.url === "string" ? w.url.trim() : "";
  } else if (type === "numeric") {
    const min = normalizeNumber(w.min, 0, -1_000_000_000, 1_000_000_000);
    const max = normalizeNumber(w.max, 100, -1_000_000_000, 1_000_000_000);
    const safeMin = Math.min(min, max);
    const safeMax = Math.max(min, max);
    normalized.min = safeMin;
    normalized.max = safeMax;
    normalized.step = normalizeNumber(w.step, 1, 0.000001, 1_000_000_000);
    normalized.value = normalizeNumber(w.value, 0, safeMin, safeMax);
    normalized.dataSource = w.dataSource === "mqtt" ? "mqtt" : "ha";
    if (typeof w.haEntityId === "string") normalized.haEntityId = w.haEntityId.trim();
    if (typeof w.mqttTopic === "string") normalized.mqttTopic = w.mqttTopic.trim();
  } else if (type === "button") {
    normalized.label = typeof w.label === "string" && w.label.trim() ? w.label : "Кнопка";
    if (typeof w.mqttPublishTopic === "string") normalized.mqttPublishTopic = w.mqttPublishTopic.trim();
    normalized.mqttQos = w.mqttQos === 1 || w.mqttQos === 2 ? w.mqttQos : 0;
  } else if (type === "switch") {
    const positionsSource = Array.isArray(w.positions) ? w.positions : [];
    const positions = positionsSource
      .map((p) => {
        if (!p || typeof p !== "object") return null;
        const name = /** @type {{name?: unknown}} */ (p).name;
        if (typeof name !== "string" || !name.trim()) return null;
        return { name: name.trim() };
      })
      .filter(Boolean);

    normalized.positions =
      positions.length > 0
        ? /** @type {{name: string}[]} */ (positions)
        : [{ name: "1" }, { name: "2" }];
    normalized.selectedIndex = normalizeNumber(
      w.selectedIndex,
      0,
      0,
      normalized.positions.length - 1
    );
    normalized.emitMode = w.emitMode === "index" ? "index" : "name";
    if (typeof w.mqttPublishTopic === "string") normalized.mqttPublishTopic = w.mqttPublishTopic.trim();
    normalized.mqttQos = w.mqttQos === 1 || w.mqttQos === 2 ? w.mqttQos : 0;
  } else if (type === "ping") {
    normalized.host = typeof w.host === "string" ? w.host.trim() : "";
    normalized.attempts = normalizeNumber(w.attempts, 2, 1, 10);
    normalized.intervalMs = normalizeNumber(w.intervalMs, 1000, 500, 60000);
  }

  return normalized;
}

/** @param {import("./defaults.js").ScreenTransition} transition */
function normalizeTransition(transition) {
  const base = defaultTransition();
  const t = transition ?? {};

  /** @type {import("./defaults.js").ScreenTransition} */
  const normalized = {
    advanceMode: t.advanceMode === "button" || t.advanceMode === "event" ? t.advanceMode : "timer",
    displayDuration:
      typeof t.displayDuration === "number" && t.displayDuration >= 1
        ? t.displayDuration
        : base.displayDuration,
    enterEffect:
      t.enterEffect === "none" ||
      t.enterEffect === "fade" ||
      t.enterEffect === "slideUp" ||
      t.enterEffect === "slideDown" ||
      t.enterEffect === "overlay"
        ? t.enterEffect
        : base.enterEffect,
    animationDuration:
      typeof t.animationDuration === "number" && t.animationDuration >= 0
        ? Math.min(3000, Math.max(0, t.animationDuration))
        : base.animationDuration,
  };

  if (t.eventTrigger && typeof t.eventTrigger.key === "string" && t.eventTrigger.key) {
    normalized.eventTrigger = {
      key: t.eventTrigger.key,
      action: t.eventTrigger.action === "goto" ? "goto" : "next",
      targetScreenIndex:
        typeof t.eventTrigger.targetScreenIndex === "number"
          ? t.eventTrigger.targetScreenIndex
          : undefined,
    };
  }

  return normalized;
}

/** @param {import("./defaults.js").DashboardData} data */
export function normalizeDashboard(data) {
  if (!data || typeof data !== "object") {
    return structuredClone(defaultData);
  }

  if (!Array.isArray(data.screens) || data.screens.length === 0) {
    data.screens = [{ name: "Экран 1", widgets: [], transition: defaultTransition() }];
  }

  data.screens = data.screens.map((screen) => ({
    name: typeof screen?.name === "string" ? screen.name : "Экран",
    widgets: Array.isArray(screen?.widgets)
      ? screen.widgets.map((widget) => normalizeWidget(widget)).filter(Boolean)
      : [],
    transition: normalizeTransition(screen?.transition),
  }));

  if (
    typeof data.currentScreen !== "number" ||
    data.currentScreen < 0 ||
    data.currentScreen >= data.screens.length
  ) {
    data.currentScreen = 0;
  }

  delete data.theme;

  if (typeof data.designWidth !== "number" || data.designWidth < 320) {
    data.designWidth = 1920;
  }

  if (typeof data.designHeight !== "number" || data.designHeight < 240) {
    data.designHeight = 1080;
  }

  data.pingIntervalMs = normalizeNumber(data.pingIntervalMs, 5000, 500, 60000);

  return /** @type {import("./defaults.js").DashboardData} */ (data);
}
