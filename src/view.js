import { initDashboard } from "./dashboard.js";

const { render, nextScreen } = initDashboard({
  settingsMode: false,
  dashboard: document.getElementById("dashboard"),
  screenTitle: document.getElementById("screenTitle"),
});

document.getElementById("nextScreenBtn").addEventListener("click", nextScreen);

setInterval(render, 1000);
setInterval(nextScreen, 15000);
