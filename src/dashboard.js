import { loadData, saveData } from "./storage.js";
import { createWidgetElement, renderWidgetContent } from "./widgets.js";
import { isInteracting, makeDraggable } from "./drag.js";
import { makeResizable } from "./resize.js";
import { defaultTransition } from "./data/defaults.js";
import { playTransition, createScreenLayer } from "./screenTransitions.js";
import { icon } from "./icons.js";

/**
 * @param {object} options
 * @param {boolean} options.settingsMode
 * @param {HTMLElement} options.dashboard
 * @param {HTMLElement} options.screenTitle
 * @param {HTMLElement} [options.screenList]
 * @param {HTMLInputElement} [options.primaryColorInput]
 * @param {HTMLInputElement} [options.backgroundColorInput]
 * @param {() => void} [options.onSelectionChange]
 * @param {(index: number) => void} [options.onScreenChange]
 * @param {(screen: import("./data/defaults.js").Screen) => void} [options.onOpenScreenSettings]
 */
export async function initDashboard({
  settingsMode,
  dashboard,
  screenTitle,
  screenList,
  primaryColorInput,
  backgroundColorInput,
  onSelectionChange,
  onScreenChange,
  onOpenScreenSettings,
}) {
  const data = await loadData();
  /** @type {number | null} */
  let selectedWidgetId = null;
  let isTransitioning = false;
  /** @type {(() => void) | null} */
  let onNavigateComplete = null;

  async function save() {
    return saveData(data);
  }

  function applyThemeToDom() {
    document.documentElement.style.setProperty("--primary", data.theme.primary);
    document.documentElement.style.setProperty("--background", data.theme.background);
    if (primaryColorInput) primaryColorInput.value = data.theme.primary;
    if (backgroundColorInput) backgroundColorInput.value = data.theme.background;
  }

  /** @returns {import("./data/defaults.js").Screen} */
  function getCurrentScreen() {
    return data.screens[data.currentScreen];
  }

  function getCurrentScreenIndex() {
    return data.currentScreen;
  }

  /**
   * @param {import("./data/defaults.js").Screen} screen
   * @param {HTMLElement} layerEl
   */
  function renderScreenContent(screen, layerEl) {
    layerEl.innerHTML = "";

    screen.widgets.forEach((widget) => {
      const el = createWidgetElement(widget, settingsMode, selectedWidgetId);
      layerEl.appendChild(el);

      if (settingsMode) {
        makeDraggable(el, widget, save);
        makeResizable(el, widget, save);

        el.addEventListener("mousedown", (e) => {
          if (e.target instanceof Element && e.target.closest(".resize-handle")) return;
          e.stopPropagation();
          selectWidget(widget.id);
        });
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

  function updateLiveContent() {
    const screen = getCurrentScreen();
    const layer = dashboard.querySelector(".screen-layer");
    if (!layer) return;

    screen.widgets.forEach((widget) => {
      if (widget.type !== "clock" && widget.type !== "date") return;

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

    const screen = getCurrentScreen();
    screenTitle.textContent = screen.name;

    dashboard.innerHTML = "";
    const layer = createScreenLayer(dashboard);
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

    const outgoingLayer = dashboard.querySelector(".screen-layer") ?? createScreenLayer(dashboard);
    renderScreenContent(outgoingScreen, outgoingLayer);

    const incomingLayer = createScreenLayer(dashboard);
    renderScreenContent(incomingScreen, incomingLayer);

    screenTitle.textContent = incomingScreen.name;
    renderScreens();

    await playTransition(outgoingLayer, incomingLayer, transition);

    data.currentScreen = nextIndex;
    selectedWidgetId = null;
    onSelectionChange?.();

    dashboard.innerHTML = "";
    const layer = createScreenLayer(dashboard);
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

    screen.widgets.push(widget);
    selectedWidgetId = widget.id;
    onSelectionChange?.();
    render({ animate: false });
    return save();
  }

  async function applyTheme() {
    if (!primaryColorInput || !backgroundColorInput) {
      return { ok: false, error: "Не удалось применить тему" };
    }

    data.theme.primary = primaryColorInput.value;
    data.theme.background = backgroundColorInput.value;
    applyThemeToDom();
    return save();
  }

  /** @param {() => void} callback */
  function setOnNavigateComplete(callback) {
    onNavigateComplete = callback;
  }

  if (settingsMode) {
    dashboard.addEventListener("mousedown", () => {
      if (selectedWidgetId !== null) {
        selectWidget(null);
      }
    });
  }

  applyThemeToDom();
  render({ animate: false });

  return {
    render: () => render({ animate: false }),
    updateLiveContent,
    nextScreen,
    goToScreen,
    handleExternalEvent,
    addScreen,
    addWidget,
    applyTheme,
    getSelectedWidget,
    getCurrentScreen,
    getCurrentScreenIndex,
    getScreen,
    getScreenCount,
    selectWidget,
    deleteSelectedWidget,
    deleteScreen,
    setOnNavigateComplete,
    save,
  };
}
