import { initDashboard } from "./dashboard.js";
import { initWidgetSettings } from "./widgetSettings.js";
import { initScreenSettings } from "./screenSettings.js";
import { runAction, createDebouncedActionNotifier } from "./toast.js";

async function main() {
  /** @type {{ syncForm: () => void } | null} */
  let widgetSettings = null;
  /** @type {ReturnType<typeof initScreenSettings> | null} */
  let screenSettings = null;

  /** @type {ReturnType<typeof setTimeout> | null} */
  let advanceTimer = null;

  /** @type {Awaited<ReturnType<typeof initDashboard>>} */
  let dashboardApi;

  const AUTO_ADVANCE_KEY = "editAutoAdvanceEnabled";
  let autoAdvanceEnabled = sessionStorage.getItem(AUTO_ADVANCE_KEY) === "true";

  const autoAdvanceToggle = document.getElementById("autoAdvanceToggle");
  const autoAdvanceIcon = document.getElementById("autoAdvanceIcon");
  const autoAdvanceLabel = document.getElementById("autoAdvanceLabel");

  const notifyEdit = createDebouncedActionNotifier("Редактирование");

  function updateAutoAdvanceUi() {
    if (!autoAdvanceToggle || !autoAdvanceIcon || !autoAdvanceLabel) return;

    autoAdvanceToggle.setAttribute("aria-pressed", String(autoAdvanceEnabled));
    autoAdvanceToggle.classList.toggle("btn-secondary", !autoAdvanceEnabled);
    autoAdvanceToggle.title = autoAdvanceEnabled
      ? "Автопереход включён — нажмите, чтобы остановить"
      : "Автопереход выключен — нажмите, чтобы включить";

    autoAdvanceIcon.className = autoAdvanceEnabled
      ? "mdi mdi-motion-play btn-icon"
      : "mdi mdi-motion-pause btn-icon";
    autoAdvanceLabel.textContent = autoAdvanceEnabled ? "Автопереход" : "Автопереход выкл";
  }

  function setAutoAdvanceEnabled(enabled) {
    autoAdvanceEnabled = enabled;
    sessionStorage.setItem(AUTO_ADVANCE_KEY, String(enabled));
    updateAutoAdvanceUi();

    if (!enabled && advanceTimer !== null) {
      clearTimeout(advanceTimer);
      advanceTimer = null;
    } else if (enabled) {
      scheduleAdvance();
    }
  }

  function updateNextButtonVisibility() {
    const btn = document.getElementById("nextScreenBtn");
    if (!btn) return;
    const screen = dashboardApi.getCurrentScreen();
    btn.hidden = screen.transition.advanceMode !== "button";
  }

  function scheduleAdvance() {
    if (advanceTimer !== null) {
      clearTimeout(advanceTimer);
      advanceTimer = null;
    }

    const screen = dashboardApi.getCurrentScreen();
    updateNextButtonVisibility();

    if (!autoAdvanceEnabled) return;
    if (screen.transition.advanceMode !== "timer") return;

    advanceTimer = setTimeout(() => {
      dashboardApi.nextScreen();
    }, screen.transition.displayDuration * 1000);
  }

  dashboardApi = await initDashboard({
    settingsMode: true,
    dashboard: document.getElementById("dashboard"),
    screenTitle: document.getElementById("screenTitle"),
    screenList: document.getElementById("screenList"),
    primaryColorInput: document.getElementById("primaryColor"),
    backgroundColorInput: document.getElementById("backgroundColor"),
    onSelectionChange: () => widgetSettings?.syncForm(),
    onScreenChange: () => scheduleAdvance(),
    onOpenScreenSettings: (index) => screenSettings?.open(index),
  });

  dashboardApi.setOnNavigateComplete(() => scheduleAdvance());

  widgetSettings = initWidgetSettings({
    modal: document.getElementById("widgetSettingsModal"),
    title: document.getElementById("widgetSettingsTitle"),
    closeBtn: document.getElementById("widgetSettingsClose"),
    textSettings: document.getElementById("textSettings"),
    imageSettings: document.getElementById("imageSettings"),
    fontSizeInput: document.getElementById("widgetFontSize"),
    fontFamilySelect: document.getElementById("widgetFontFamily"),
    colorInput: document.getElementById("widgetColor"),
    textContentField: document.getElementById("textContentField"),
    textInput: document.getElementById("widgetText"),
    urlInput: document.getElementById("widgetUrl"),
    fileInput: document.getElementById("widgetFile"),
    deleteBtn: document.getElementById("widgetDeleteBtn"),
    getSelectedWidget: dashboardApi.getSelectedWidget,
    onChange: () => {
      dashboardApi.render();
      notifyEdit(() => dashboardApi.save());
    },
    onRender: () => dashboardApi.render(),
    onClose: () => dashboardApi.selectWidget(null),
    onDelete: () => dashboardApi.deleteSelectedWidget(),
    onSave: () => dashboardApi.save(),
  });

  screenSettings = initScreenSettings({
    modal: document.getElementById("screenSettingsModal"),
    title: document.getElementById("screenSettingsTitle"),
    closeBtn: document.getElementById("screenSettingsClose"),
    nameInput: document.getElementById("screenName"),
    advanceModeSelect: document.getElementById("screenAdvanceMode"),
    timerFields: document.getElementById("screenTimerFields"),
    displayDurationInput: document.getElementById("screenDisplayDuration"),
    enterEffectSelect: document.getElementById("screenEnterEffect"),
    animationDurationInput: document.getElementById("screenAnimationDuration"),
    deleteBtn: document.getElementById("screenDeleteBtn"),
    getEditingScreenIndex: () => screenSettings?.getEditingScreenIndex() ?? null,
    getScreen: dashboardApi.getScreen,
    getScreenCount: () => dashboardApi.getScreenCount(),
    onChange: () => {
      dashboardApi.render();
      notifyEdit(() => dashboardApi.save());
      scheduleAdvance();
    },
    onClose: () => {},
    onDelete: (index) => dashboardApi.deleteScreen(index),
  });

  document.getElementById("addScreenBtn").addEventListener("click", () => {
    void runAction("Добавление", () => dashboardApi.addScreen());
  });

  document.getElementById("applyThemeBtn").addEventListener("click", () => {
    void runAction("Сохранение", () => dashboardApi.applyTheme());
  });

  const nextBtn = document.getElementById("nextScreenBtn");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => dashboardApi.nextScreen());
  }

  if (autoAdvanceToggle) {
    autoAdvanceToggle.addEventListener("click", () => {
      setAutoAdvanceEnabled(!autoAdvanceEnabled);
    });
  }

  updateAutoAdvanceUi();

  document.querySelectorAll("[data-widget]").forEach((btn) => {
    btn.addEventListener("click", () => {
      void runAction("Добавление", () => dashboardApi.addWidget(btn.dataset.widget));
    });
  });

  setInterval(dashboardApi.updateLiveContent, 1000);
  widgetSettings.syncForm();
  if (autoAdvanceEnabled) scheduleAdvance();
}

main();
