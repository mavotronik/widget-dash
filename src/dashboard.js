import { loadDashboard, saveData, listDashboards } from "./storage.js";
import { createWidgetElement, renderWidgetContent } from "./widgets.js";
import { isInteracting, makeDraggable } from "./drag.js";
import { makeResizable } from "./resize.js";
import { defaultTransition } from "./data/defaults.js";
import { playTransition, createScreenLayer } from "./screenTransitions.js";
import {
  computeScale,
  clampWidgetBounds,
  clampAllWidgets,
  hasWidgetsOutOfBounds,
} from "./scale.js";
import { icon } from "./icons.js";
import { createPingPoller } from "./ping.js";

/**
 * @param {object} options
 * @param {boolean} options.settingsMode
 * @param {HTMLElement} options.dashboard
 * @param {HTMLElement} options.screenTitle
 * @param {HTMLElement} [options.screenList]
 * @param {HTMLElement} [options.dashboardList]
 * @param {HTMLInputElement} [options.primaryColorInput]
 * @param {HTMLInputElement} [options.backgroundColorInput]
 * @param {number} [options.dashboardId]
 * @param {string} [options.dashboardSlug]
 * @param {HTMLAnchorElement} [options.viewDashboardLink]
 * @param {() => void} [options.onSelectionChange]
 * @param {(index: number) => void} [options.onScreenChange]
 * @param {(screen: import("./data/defaults.js").Screen) => void} [options.onOpenScreenSettings]
 * @param {() => void} [options.onDashboardListChange]
 * @param {(meta: { id: number, slug: string | null }) => void} [options.onDashboardSwitch]
 * @param {() => void} [options.onOpenWidgetSettings]
 * @param {(id: number) => void} [options.onOpenDashboardSettings]
 * @param {() => import("./snap.js").SnapSettings} [options.getSnapSettings]
 */
export async function initDashboard({
  settingsMode,
  dashboard,
  screenTitle,
  screenList,
  dashboardList,
  primaryColorInput,
  backgroundColorInput,
  dashboardId,
  dashboardSlug,
  viewDashboardLink,
  onSelectionChange,
  onScreenChange,
  onOpenScreenSettings,
  onDashboardListChange,
  onDashboardSwitch,
  onOpenWidgetSettings,
  onOpenDashboardSettings,
  getSnapSettings,
}) {
  const loaded = await loadDashboard({ id: dashboardId, slug: dashboardSlug });
  /** @type {import("./data/defaults.js").DashboardData} */
  let data = loaded.data;
  /** @type {{ id: number, name: string, slug: string | null, updatedAt: string }} */
  let meta = loaded.meta;
  /** @type {number | null} */
  let selectedWidgetId = null;
  let isTransitioning = false;
  /** @type {(() => void) | null} */
  let onNavigateComplete = null;
  const pingPoller = createPingPoller({
    getScreens: () => data.screens,
    getQueueIntervalMs: () => data.pingIntervalMs ?? 5000,
    onStatus: (widgetId, status) => {
      const widget = findPingWidget(widgetId);
      if (!widget) return;
      widget.status = status;
      if (getCurrentScreen().widgets.some((item) => item.id === widgetId)) {
        refreshWidgetContent(widget);
      }
    },
  });

  function syncPingStatusesFromCache() {
    const cache = pingPoller.getStatusCache();
    for (const screen of data.screens) {
      for (const widget of screen.widgets) {
        if (widget.type === "ping" && cache.has(widget.id)) {
          widget.status = cache.get(widget.id);
        }
      }
    }
  }

  /** @type {HTMLElement | null} */
  let canvasViewport = null;
  /** @type {HTMLElement | null} */
  let canvasScaler = null;
  /** @type {ResizeObserver | null} */
  let resizeObserver = null;

  function getInteractionContext() {
    return {
      getScalerRect: () => canvasScaler?.getBoundingClientRect() ?? new DOMRect(),
      getDesignBounds: () => ({
        width: data.designWidth,
        height: data.designHeight,
      }),
      getOtherWidgets: (excludeId) =>
        getCurrentScreen().widgets.filter((w) => w.id !== excludeId),
      getSnapSettings: () =>
        getSnapSettings?.() ?? { edgeAlign: true, sizeMatch: true },
      getCanvasScaler: () => canvasScaler,
    };
  }

  async function save() {
    return saveData(meta.id, data);
  }

  function applyThemeToDom() {
    document.documentElement.style.setProperty("--primary", data.theme.primary);
    document.documentElement.style.setProperty("--background", data.theme.background);
    if (primaryColorInput) primaryColorInput.value = data.theme.primary;
    if (backgroundColorInput) backgroundColorInput.value = data.theme.background;
    if (canvasViewport) {
      canvasViewport.style.background = data.theme.background;
    }
  }

  function updateViewLink() {
    if (!viewDashboardLink) return;
    const params = meta.slug
      ? `?slug=${encodeURIComponent(meta.slug)}`
      : `?id=${meta.id}`;
    viewDashboardLink.href = `/${params}`;
  }

  function updateCanvasSize() {
    if (!canvasScaler || !canvasViewport) return;

    canvasScaler.style.width = `${data.designWidth}px`;
    canvasScaler.style.height = `${data.designHeight}px`;

    const containerW = dashboard.clientWidth;
    const containerH = dashboard.clientHeight;
    const scaleInfo = computeScale(
      containerW,
      containerH,
      data.designWidth,
      data.designHeight
    );

    canvasScaler.style.transform = `translate(${scaleInfo.offsetX}px, ${scaleInfo.offsetY}px) scale(${scaleInfo.scale})`;
  }

  function ensureCanvasStructure() {
    if (canvasViewport && canvasScaler && dashboard.contains(canvasViewport)) {
      updateCanvasSize();
      return canvasScaler;
    }

    dashboard.innerHTML = "";

    canvasViewport = document.createElement("div");
    canvasViewport.className = "canvas-viewport";

    if (settingsMode) {
      const letterbox = document.createElement("div");
      letterbox.className = "canvas-letterbox";
      letterbox.setAttribute("aria-hidden", "true");
      canvasViewport.appendChild(letterbox);
    }

    canvasScaler = document.createElement("div");
    canvasScaler.className = "canvas-scaler";
    if (settingsMode) {
      canvasScaler.classList.add("canvas-scaler--edit");
    }

    canvasViewport.appendChild(canvasScaler);
    dashboard.appendChild(canvasViewport);

    if (!resizeObserver) {
      resizeObserver = new ResizeObserver(() => updateCanvasSize());
      resizeObserver.observe(dashboard);
    }

    applyThemeToDom();
    updateCanvasSize();
    return canvasScaler;
  }

  /** @returns {import("./data/defaults.js").Screen} */
  function getCurrentScreen() {
    return data.screens[data.currentScreen];
  }

  /** @param {number} widgetId */
  function findPingWidget(widgetId) {
    for (const screen of data.screens) {
      const widget = screen.widgets.find((item) => item.id === widgetId && item.type === "ping");
      if (widget) return widget;
    }
    return null;
  }

  /** @param {import("./data/defaults.js").Widget} widget */
  function refreshWidgetContent(widget) {
    const layer = canvasScaler?.querySelector(".screen-layer");
    if (!layer) return;
    const content = layer.querySelector(`[data-widget-id="${widget.id}"] .widget-content`);
    if (content) {
      content.innerHTML = renderWidgetContent(widget);
    }
  }

  function getCurrentScreenIndex() {
    return data.currentScreen;
  }

  function getData() {
    return data;
  }

  function getDashboardMeta() {
    return meta;
  }

  function getDashboardId() {
    return meta.id;
  }

  /**
   * @param {import("./data/defaults.js").Screen} screen
   * @param {HTMLElement} layerEl
   */
  function renderScreenContent(screen, layerEl) {
    layerEl.innerHTML = "";

    screen.widgets.forEach((widget) => {
      clampWidgetBounds(widget, data.designWidth, data.designHeight);
      const el = createWidgetElement(widget, settingsMode, selectedWidgetId);
      layerEl.appendChild(el);

      if (settingsMode) {
        makeDraggable(el, widget, save, getInteractionContext);
        makeResizable(el, widget, save, getInteractionContext);

        el.addEventListener("mousedown", (e) => {
          if (e.target instanceof Element && e.target.closest(".resize-handle")) return;
          e.stopPropagation();
          selectWidget(widget.id);
        });

        el.addEventListener("dblclick", (e) => {
          if (e.target instanceof Element && e.target.closest(".resize-handle")) return;
          e.stopPropagation();
          selectWidget(widget.id);
          onOpenWidgetSettings?.();
        });
      } else {
        if (widget.type === "button") {
          const button = el.querySelector('[data-role="widget-button"]');
          if (button) {
            let pressed = false;
            const release = () => {
              if (!pressed) return;
              pressed = false;
              button.classList.remove("is-pressed");
              console.info("button event", { widgetId: widget.id, event: "released" });
            };
            button.addEventListener("pointerdown", () => {
              pressed = true;
              button.classList.add("is-pressed");
              console.info("button event", { widgetId: widget.id, event: "pressed" });
            });
            button.addEventListener("pointerup", release);
            button.addEventListener("pointercancel", release);
            button.addEventListener("pointerleave", release);
          }
        }

        if (widget.type === "switch") {
          el.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const option = target.closest('[data-role="switch-option"]');
            if (!option) return;
            const nextIndex = Number(option.dataset.switchIndex);
            const positions = Array.isArray(widget.positions) ? widget.positions : [];
            if (!Number.isFinite(nextIndex) || nextIndex < 0 || nextIndex >= positions.length) {
              return;
            }
            widget.selectedIndex = nextIndex;
            refreshWidgetContent(widget);
            const value =
              widget.emitMode === "index"
                ? nextIndex + 1
                : positions[nextIndex]?.name ?? String(nextIndex + 1);
            console.info("switch event", { widgetId: widget.id, value });
          });
        }
      }
    });
  }

  function renderScreens() {
    if (!screenList) return;

    screenList.innerHTML = "";

    data.screens.forEach((screen, index) => {
      const item = document.createElement("div");
      item.className = "screen-list-item";

      const nameBtn = document.createElement("button");
      nameBtn.type = "button";
      nameBtn.className = "btn btn-screen-name";
      if (index === data.currentScreen) {
        nameBtn.classList.add("active-screen");
      }
      nameBtn.textContent = screen.name;
      nameBtn.onclick = () => {
        if (isTransitioning) return;
        goToScreen(index, { animate: true });
      };

      const settingsBtn = document.createElement("button");
      settingsBtn.type = "button";
      settingsBtn.className = "btn btn-screen-settings btn-icon-only";
      settingsBtn.title = "Настройки экрана";
      settingsBtn.appendChild(icon("cog", "btn-icon"));
      settingsBtn.onclick = (e) => {
        e.stopPropagation();
        onOpenScreenSettings?.(index);
      };

      item.appendChild(nameBtn);
      item.appendChild(settingsBtn);
      screenList.appendChild(item);
    });
  }

  async function renderDashboardList() {
    if (!dashboardList) return;

    try {
      const dashboards = await listDashboards();

    dashboardList.innerHTML = "";

    dashboards.forEach((item) => {
      const row = document.createElement("div");
      row.className = "dashboard-list-item";

      const nameBtn = document.createElement("button");
      nameBtn.type = "button";
      nameBtn.className = "btn btn-screen-name";
      if (item.id === meta.id) {
        nameBtn.classList.add("active-screen");
      }
      nameBtn.textContent = item.name;
      nameBtn.onclick = () => {
        if (item.id === meta.id) return;
        switchDashboard(item.id);
      };

      const settingsBtn = document.createElement("button");
      settingsBtn.type = "button";
      settingsBtn.className = "btn btn-screen-settings btn-icon-only";
      settingsBtn.title = "Настройки дашборда";
      settingsBtn.appendChild(icon("cog", "btn-icon"));
      settingsBtn.onclick = async (e) => {
        e.stopPropagation();
        if (item.id !== meta.id) {
          await switchDashboard(item.id);
        }
        onOpenDashboardSettings?.(item.id);
      };

      row.appendChild(nameBtn);
      row.appendChild(settingsBtn);
      dashboardList.appendChild(row);
    });

    onDashboardListChange?.();
    } catch (err) {
      console.error("Failed to render dashboard list:", err);
    }
  }

  /** @param {number} id */
  async function switchDashboard(id) {
    const next = await loadDashboard({ id });
    meta = next.meta;
    data = next.data;
    selectedWidgetId = null;
    onSelectionChange?.();
    updateViewLink();
    onDashboardSwitch?.({ id: meta.id, slug: meta.slug });
    render({ animate: false });
    await renderDashboardList();
    pingPoller.start({ resetStatuses: true });
  }

  /**
   * @param {import("./data/defaults.js").DashboardData} nextData
   * @param {{ id: number, name: string, slug: string | null, updatedAt: string }} [nextMeta]
   */
  async function reload(nextData, nextMeta) {
    data = nextData;
    syncPingStatusesFromCache();
    if (nextMeta) meta = nextMeta;
    selectedWidgetId = null;
    onSelectionChange?.();
    updateViewLink();
    render({ animate: false });
    await renderDashboardList();
    pingPoller.restart({ resetStatuses: false });
  }

  function updateLiveContent() {
    const scaler = canvasScaler;
    if (!scaler) return;

    const screen = getCurrentScreen();
    const layer = scaler.querySelector(".screen-layer");
    if (!layer) return;

    screen.widgets.forEach((widget) => {
      if (widget.type !== "clock" && widget.type !== "date" && widget.type !== "ping") return;
      const el = layer.querySelector(`[data-widget-id="${widget.id}"] .widget-content`);
      if (el) {
        el.innerHTML = renderWidgetContent(widget);
      }
    });
  }

  /** @returns {import("./data/defaults.js").Widget | null} */
  function getSelectedWidget() {
    if (selectedWidgetId === null) return null;
    const screen = getCurrentScreen();
    return screen.widgets.find((w) => w.id === selectedWidgetId) ?? null;
  }

  /** @param {number | null} id */
  function selectWidget(id) {
    if (selectedWidgetId === id) {
      if (id !== null) onSelectionChange?.();
      return;
    }
    selectedWidgetId = id;
    onSelectionChange?.();
    render({ animate: false });
  }

  async function deleteSelectedWidget() {
    if (selectedWidgetId === null) {
      return { ok: false, error: "Виджет не выбран" };
    }

    const screen = getCurrentScreen();
    screen.widgets = screen.widgets.filter((w) => w.id !== selectedWidgetId);
    selectedWidgetId = null;
    onSelectionChange?.();
    render({ animate: false });
    return save();
  }

  /**
   * @param {{ animate?: boolean }} [options]
   */
  function render(options = {}) {
    if (settingsMode && isInteracting()) return;

    syncPingStatusesFromCache();

    const screen = getCurrentScreen();
    screenTitle.textContent = settingsMode ? `${meta.name} — ${screen.name}` : meta.name;

    const scaler = ensureCanvasStructure();
    scaler.querySelectorAll(".screen-layer").forEach((layer) => layer.remove());

    const layer = createScreenLayer(scaler);
    renderScreenContent(screen, layer);
    renderScreens();
  }

  /**
   * @param {number} nextIndex
   * @param {{ animate?: boolean }} [options]
   */
  async function goToScreen(nextIndex, options = {}) {
    if (isTransitioning) return;
    if (nextIndex < 0 || nextIndex >= data.screens.length) return;
    if (nextIndex === data.currentScreen && options.animate) return;

    const animate = options.animate ?? true;
    const outgoingScreen = getCurrentScreen();
    const incomingScreen = data.screens[nextIndex];
    const transition = incomingScreen.transition;

    if (!animate || transition.enterEffect === "none" || transition.animationDuration <= 0) {
      data.currentScreen = nextIndex;
      selectedWidgetId = null;
      onSelectionChange?.();
      render({ animate: false });
      save();
      onScreenChange?.(nextIndex);
      onNavigateComplete?.();
      return;
    }

    isTransitioning = true;

    const scaler = ensureCanvasStructure();
    scaler.querySelectorAll(".screen-layer").forEach((layer) => layer.remove());

    const outgoingLayer = createScreenLayer(scaler);
    renderScreenContent(outgoingScreen, outgoingLayer);

    const incomingLayer = createScreenLayer(scaler);
    renderScreenContent(incomingScreen, incomingLayer);

    screenTitle.textContent = settingsMode
      ? `${meta.name} — ${incomingScreen.name}`
      : meta.name;
    renderScreens();

    await playTransition(outgoingLayer, incomingLayer, transition);

    data.currentScreen = nextIndex;
    selectedWidgetId = null;
    onSelectionChange?.();

    scaler.querySelectorAll(".screen-layer").forEach((layer) => layer.remove());
    const layer = createScreenLayer(scaler);
    renderScreenContent(incomingScreen, layer);

    isTransitioning = false;
    save();
    onScreenChange?.(nextIndex);
    onNavigateComplete?.();
  }

  function nextScreen() {
    if (isTransitioning) return;
    const nextIndex = (data.currentScreen + 1) % data.screens.length;
    goToScreen(nextIndex, { animate: true });
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  function handleExternalEvent(key) {
    if (isTransitioning) return false;

    const current = getCurrentScreen();

    if (
      current.transition.advanceMode === "event" &&
      current.transition.eventTrigger?.key === key
    ) {
      const trigger = current.transition.eventTrigger;
      if (trigger.action === "goto" && trigger.targetScreenIndex != null) {
        goToScreen(trigger.targetScreenIndex, { animate: true });
      } else {
        nextScreen();
      }
      return true;
    }

    const targetIndex = data.screens.findIndex(
      (s) =>
        s.transition.eventTrigger?.key === key &&
        s.transition.eventTrigger?.action === "goto"
    );

    if (targetIndex >= 0) {
      goToScreen(targetIndex, { animate: true });
      return true;
    }

    return false;
  }

  /** @param {number} index */
  async function deleteScreen(index) {
    if (data.screens.length <= 1) {
      return { ok: false, error: "Нельзя удалить последний экран" };
    }
    if (index < 0 || index >= data.screens.length) {
      return { ok: false, error: "Экран не найден" };
    }

    data.screens.splice(index, 1);

    if (data.currentScreen >= data.screens.length) {
      data.currentScreen = data.screens.length - 1;
    } else if (data.currentScreen > index) {
      data.currentScreen--;
    }

    selectedWidgetId = null;
    onSelectionChange?.();
    render({ animate: false });
    onScreenChange?.(data.currentScreen);
    return save();
  }

  /** @param {number} index @returns {import("./data/defaults.js").Screen | null} */
  function getScreen(index) {
    return data.screens[index] ?? null;
  }

  function getScreenCount() {
    return data.screens.length;
  }

  async function addScreen() {
    data.screens.push({
      name: `Экран ${data.screens.length + 1}`,
      widgets: [],
      transition: defaultTransition(),
    });
    render({ animate: false });
    renderScreens();
    return save();
  }

  /** @param {string} type */
  async function addWidget(type) {
    const screen = getCurrentScreen();

    /** @type {import("./data/defaults.js").Widget} */
    const widget = {
      id: Date.now(),
      type,
      x: 50,
      y: 50,
      w: 250,
      h: 120,
    };

    if (type === "text") {
      widget.text = "Новый текст";
    }

    if (type === "image") {
      widget.url = "";
      widget.h = 250;
    }

    if (type === "numeric") {
      widget.value = 0;
      widget.min = 0;
      widget.max = 100;
      widget.step = 1;
    }

    if (type === "button") {
      widget.label = "Кнопка";
      widget.h = 90;
      widget.w = 220;
    }

    if (type === "switch") {
      widget.positions = [{ name: "1" }, { name: "2" }];
      widget.selectedIndex = 0;
      widget.emitMode = "name";
      widget.h = 100;
      widget.w = 300;
    }

    if (type === "ping") {
      widget.host = "localhost";
      widget.attempts = 2;
      widget.intervalMs = 1000;
      widget.status = "unknown";
      widget.h = 90;
      widget.w = 260;
    }

    clampWidgetBounds(widget, data.designWidth, data.designHeight);

    screen.widgets.push(widget);
    selectedWidgetId = widget.id;
    onSelectionChange?.();
    render({ animate: false });
    return save();
  }

  async function applyTheme() {
    previewTheme();
    return save();
  }

  function previewTheme() {
    if (!primaryColorInput || !backgroundColorInput) return;

    data.theme.primary = primaryColorInput.value;
    data.theme.background = backgroundColorInput.value;
    applyThemeToDom();
  }

  /**
   * @param {number} designWidth
   * @param {number} designHeight
   * @param {{ clampWidgets?: boolean }} [options]
   */
  function applyResolutionPreview(designWidth, designHeight, options = {}) {
    data.designWidth = designWidth;
    data.designHeight = designHeight;

    if (options.clampWidgets) {
      clampAllWidgets(data, designWidth, designHeight);
    }

    render({ animate: false });
  }

  /**
   * @param {number} designWidth
   * @param {number} designHeight
   * @param {{ clampWidgets?: boolean }} [options]
   */
  async function applyResolution(designWidth, designHeight, options = {}) {
    applyResolutionPreview(designWidth, designHeight, options);
    return save();
  }

  function checkResolutionBounds(designWidth, designHeight) {
    return hasWidgetsOutOfBounds(data, designWidth, designHeight);
  }

  function updateDashboardMetaLocal(partial) {
    meta = { ...meta, ...partial };
    updateViewLink();
    screenTitle.textContent = settingsMode
      ? `${meta.name} — ${getCurrentScreen().name}`
      : meta.name;
  }

  /** @param {() => void} callback */
  function setOnNavigateComplete(callback) {
    onNavigateComplete = callback;
  }

  if (settingsMode) {
    dashboard.addEventListener("mousedown", (e) => {
      if (e.target instanceof Element && e.target.closest(".canvas-scaler")) return;
      if (selectedWidgetId !== null) {
        selectWidget(null);
      }
    });
  }

  applyThemeToDom();
  updateViewLink();
  render({ animate: false });
  await renderDashboardList();
  pingPoller.start({ resetStatuses: true });

  return {
    render: () => render({ animate: false }),
    reload,
    switchDashboard,
    updateLiveContent,
    nextScreen,
    goToScreen,
    handleExternalEvent,
    addScreen,
    addWidget,
    applyTheme,
    previewTheme,
    applyResolution,
    applyResolutionPreview,
    checkResolutionBounds,
    getSelectedWidget,
    getCurrentScreen,
    getCurrentScreenIndex,
    getScreen,
    getScreenCount,
    getData,
    getDashboardMeta,
    getDashboardId,
    selectWidget,
    deleteSelectedWidget,
    deleteScreen,
    setOnNavigateComplete,
    renderDashboardList,
    updateDashboardMetaLocal,
    save,
    restartPingPoller: () => pingPoller.restart({ resetStatuses: false }),
    invalidatePingWidget: (widgetId) => pingPoller.invalidate(widgetId),
  };
}
