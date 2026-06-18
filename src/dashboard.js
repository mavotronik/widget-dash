import { loadData, saveData } from "./storage.js";
import { createWidgetElement, renderWidgetContent } from "./widgets.js";
import { isDragging, makeDraggable } from "./drag.js";

/**
 * @param {object} options
 * @param {boolean} options.settingsMode
 * @param {HTMLElement} options.dashboard
 * @param {HTMLElement} options.screenTitle
 * @param {HTMLElement} [options.screenList]
 * @param {HTMLInputElement} [options.primaryColorInput]
 * @param {HTMLInputElement} [options.backgroundColorInput]
 */
export function initDashboard({
  settingsMode,
  dashboard,
  screenTitle,
  screenList,
  primaryColorInput,
  backgroundColorInput,
}) {
  const data = loadData();

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
      btn.textContent = screen.name;
      btn.onclick = () => {
        data.currentScreen = index;
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

  function render() {
    if (settingsMode && isDragging()) return;

    dashboard.innerHTML = "";

    const screen = data.screens[data.currentScreen];
    screenTitle.textContent = screen.name;

    screen.widgets.forEach((widget) => {
      const el = createWidgetElement(widget, settingsMode);
      dashboard.appendChild(el);

      if (settingsMode) {
        makeDraggable(el, widget, save);
      }
    });

    renderScreens();
  }

  function nextScreen() {
    data.currentScreen = (data.currentScreen + 1) % data.screens.length;
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
      widget.url = `https://picsum.photos/600/400?random=${Math.random()}`;
      widget.h = 250;
    }

    screen.widgets.push(widget);
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

  applyThemeToDom();
  render();

  return { render, updateLiveContent, nextScreen, addScreen, addWidget, applyTheme };
}
