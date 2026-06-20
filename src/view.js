import { initDashboard } from "./dashboard.js";

async function main() {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let advanceTimer = null;

  const params = new URLSearchParams(window.location.search);
  const dashboardId = params.get("id") ? Number(params.get("id")) : undefined;
  const dashboardSlug = params.get("slug") ?? undefined;

  const dashboardApi = await initDashboard({
    settingsMode: false,
    dashboard: document.getElementById("dashboard"),
    screenTitle: document.getElementById("screenTitle"),
    dashboardId,
    dashboardSlug,
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
}

main();
