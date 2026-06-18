import { initDashboard } from "./dashboard.js";
import { initWidgetSettings } from "./widgetSettings.js";

async function main() {
  /** @type {{ syncForm: () => void } | null} */
  let settings = null;

  const dashboardApi = await initDashboard({
    settingsMode: true,
    dashboard: document.getElementById("dashboard"),
    screenTitle: document.getElementById("screenTitle"),
    screenList: document.getElementById("screenList"),
    primaryColorInput: document.getElementById("primaryColor"),
    backgroundColorInput: document.getElementById("backgroundColor"),
    onSelectionChange: () => settings?.syncForm(),
  });

  settings = initWidgetSettings({
    panel: document.getElementById("widgetSettingsPanel"),
    textSettings: document.getElementById("textSettings"),
    imageSettings: document.getElementById("imageSettings"),
    fontSizeInput: document.getElementById("widgetFontSize"),
    fontFamilySelect: document.getElementById("widgetFontFamily"),
    colorInput: document.getElementById("widgetColor"),
    textContentField: document.getElementById("textContentField"),
    textInput: document.getElementById("widgetText"),
    urlInput: document.getElementById("widgetUrl"),
    fileInput: document.getElementById("widgetFile"),
    getSelectedWidget: dashboardApi.getSelectedWidget,
    onChange: () => {
      dashboardApi.render();
      dashboardApi.save();
    },
  });

  document.getElementById("addScreenBtn").addEventListener("click", dashboardApi.addScreen);
  document.getElementById("applyThemeBtn").addEventListener("click", dashboardApi.applyTheme);

  document.querySelectorAll("[data-widget]").forEach((btn) => {
    btn.addEventListener("click", () => dashboardApi.addWidget(btn.dataset.widget));
  });

  setInterval(dashboardApi.updateLiveContent, 1000);
  settings.syncForm();
}

main();
