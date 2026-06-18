import { initDashboard } from "./dashboard.js";

const { updateLiveContent, addScreen, addWidget, applyTheme } = initDashboard({
  settingsMode: true,
  dashboard: document.getElementById("dashboard"),
  screenTitle: document.getElementById("screenTitle"),
  screenList: document.getElementById("screenList"),
  primaryColorInput: document.getElementById("primaryColor"),
  backgroundColorInput: document.getElementById("backgroundColor"),
});

document.getElementById("addScreenBtn").addEventListener("click", addScreen);
document.getElementById("applyThemeBtn").addEventListener("click", applyTheme);

document.querySelectorAll("[data-widget]").forEach((btn) => {
  btn.addEventListener("click", () => addWidget(btn.dataset.widget));
});

setInterval(updateLiveContent, 1000);
