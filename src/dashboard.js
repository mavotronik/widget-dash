import { loadData, saveData } from "./storage.js";
import { createWidgetElement, renderWidgetContent } from "./widgets.js";
import { isInteracting, makeDraggable } from "./drag.js";
import { makeResizable } from "./resize.js";

/**
 * @param {object} options
 * @param {boolean} options.settingsMode
 * @param {HTMLElement} options.dashboard
 * @param {HTMLElement} options.screenTitle
 * @param {HTMLElement} [options.screenList]
 * @param {HTMLInputElement} [options.primaryColorInput]
 * @param {HTMLInputElement} [options.backgroundColorInput]
 * @param {() => void} [options.onSelectionChange]
 */
export async function initDashboard({
  settingsMode,
  dashboard,
  screenTitle,
  screenList,
  primaryColorInput,
  backgroundColorInput,
  onSelectionChange,
}) {
  const data = await loadData();
  /** @type {number | null} */
  let selectedWidgetId = null;

  function save() {
    saveData(data);
  }

  function applyThemeToDom() {
    document.documentElement.style.setProperty("--primary", data.theme.primary);
    document.documentElement.style.setProperty("--background", data.theme.background);
    if (primaryColorInput) primaryColorInput.value = data.theme.primary;
    if (backgroundColorInput) backgroundColorInput.value = data.theme.background;
  }

  function renderScreens() {
    if (!screenList) return;

    screenList.innerHTML = "";

    data.screens.forEach((screen, index) => {
      const btn = document.createElement("button");
      btn.className = "btn";
      if (index === data.currentScreen) {
        btn.classList.add("active-screen");
      }
      btn.textContent = screen.name;
      btn.onclick = () => {
        data.currentScreen = index;
        selectedWidgetId = null;
        onSelectionChange?.();
        render();
        save();
      };
      screenList.appendChild(btn);
    });
  }

  function updateLiveContent() {
    const screen = data.screens[data.currentScreen];

    screen.widgets.forEach((widget) => {
      if (widget.type !== "clock" && widget.type !== "date") return;

      const el = dashboard.querySelector(`[data-widget-id="${widget.id}"] .widget-content`);
      if (el) {
        el.innerHTML = renderWidgetContent(widget);
      }
    });
  }

  /** @returns {import("./data/defaults.js").Widget | null} */
  function getSelectedWidget() {
    if (selectedWidgetId === null) return null;
    const screen = data.screens[data.currentScreen];
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
    render();
  }

  function render() {
    if (settingsMode && isInteracting()) return;

    dashboard.innerHTML = "";

    const screen = data.screens[data.currentScreen];
    screenTitle.textContent = screen.name;

    screen.widgets.forEach((widget) => {
      const el = createWidgetElement(widget, settingsMode, selectedWidgetId);
      dashboard.appendChild(el);

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

    renderScreens();
  }

  function nextScreen() {
    data.currentScreen = (data.currentScreen + 1) % data.screens.length;
    selectedWidgetId = null;
    onSelectionChange?.();
    render();
  }

  function addScreen() {
    data.screens.push({
      name: `Экран ${data.screens.length + 1}`,
      widgets: [],
    });
    save();
    render();
  }

  /** @param {string} type */
  function addWidget(type) {
    const screen = data.screens[data.currentScreen];

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
    save();
    render();
  }

  function applyTheme() {
    if (!primaryColorInput || !backgroundColorInput) return;

    data.theme.primary = primaryColorInput.value;
    data.theme.background = backgroundColorInput.value;
    applyThemeToDom();
    save();
  }

  if (settingsMode) {
    dashboard.addEventListener("mousedown", () => {
      if (selectedWidgetId !== null) {
        selectWidget(null);
      }
    });
  }

  applyThemeToDom();
  render();

  return {
    render,
    updateLiveContent,
    nextScreen,
    addScreen,
    addWidget,
    applyTheme,
    getSelectedWidget,
    selectWidget,
    save,
  };
}
