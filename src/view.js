import { initDashboard } from "./dashboard.js";

async function main() {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let advanceTimer = null;

  const dashboardApi = await initDashboard({
    settingsMode: false,
    dashboard: document.getElementById("dashboard"),
    screenTitle: document.getElementById("screenTitle"),
  });

  const nextBtn = document.getElementById("nextScreenBtn");

  function updateNextButtonVisibility() {
    if (!nextBtn) return;
    const screen = dashboardApi.getCurrentScreen();
    nextBtn.hidden = screen.transition.advanceMode !== "button";
  }

  function scheduleAdvance() {
    if (advanceTimer !== null) {
      clearTimeout(advanceTimer);
      advanceTimer = null;
    }

    const screen = dashboardApi.getCurrentScreen();
    updateNextButtonVisibility();

    if (screen.transition.advanceMode !== "timer") return;

    advanceTimer = setTimeout(() => {
      dashboardApi.nextScreen();
    }, screen.transition.displayDuration * 1000);
  }

  dashboardApi.setOnNavigateComplete(() => scheduleAdvance());

  if (nextBtn) {
    nextBtn.addEventListener("click", () => dashboardApi.nextScreen());
  }

  setInterval(dashboardApi.updateLiveContent, 1000);
  scheduleAdvance();

  // Future: connect external events via SSE or POST /api/events
  // eventSource.addEventListener('navigate', (e) => {
  //   dashboardApi.handleExternalEvent(JSON.parse(e.data).key);
  // });
}

main();
