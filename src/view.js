import { initDashboard } from "./dashboard.js";

async function main() {
  const { render, nextScreen } = await initDashboard({
    settingsMode: false,
    dashboard: document.getElementById("dashboard"),
    screenTitle: document.getElementById("screenTitle"),
  });

  document.getElementById("nextScreenBtn").addEventListener("click", nextScreen);

  setInterval(render, 1000);
  setInterval(nextScreen, 15000);
}

main();
