import { defaultData, defaultTransition } from "./defaults.js";

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
    widgets: Array.isArray(screen?.widgets) ? screen.widgets : [],
    transition: normalizeTransition(screen?.transition),
  }));

  if (
    typeof data.currentScreen !== "number" ||
    data.currentScreen < 0 ||
    data.currentScreen >= data.screens.length
  ) {
    data.currentScreen = 0;
  }

  if (!data.theme) {
    data.theme = { primary: "#2196f3", background: "#111827" };
  }

  if (typeof data.designWidth !== "number" || data.designWidth < 320) {
    data.designWidth = 1920;
  }

  if (typeof data.designHeight !== "number" || data.designHeight < 240) {
    data.designHeight = 1080;
  }

  return /** @type {import("./defaults.js").DashboardData} */ (data);
}
