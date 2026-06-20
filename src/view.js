import { initDashboard } from "./dashboard.js";
import { loadDashboard } from "./storage.js";

const POLL_INTERVAL_MS = 1000;

async function main() {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let advanceTimer = null;
  /** @type {ReturnType<typeof setInterval> | null} */
  let pollTimer = null;
  let pollInFlight = false;

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

  let lastUpdatedAt = dashboardApi.getDashboardMeta().updatedAt;

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

  async function pollForUpdates() {
    if (pollInFlight) return;
    pollInFlight = true;

    try {
      const loaded = await loadDashboard({ id: dashboardId, slug: dashboardSlug });
      if (loaded.meta.updatedAt === lastUpdatedAt) return;

      lastUpdatedAt = loaded.meta.updatedAt;
      await dashboardApi.reload(loaded.data, loaded.meta);
      scheduleAdvance();
    } catch (err) {
      console.error("Failed to poll dashboard updates:", err);
    } finally {
      pollInFlight = false;
    }
  }

  dashboardApi.setOnNavigateComplete(() => scheduleAdvance());

  if (nextBtn) {
    nextBtn.addEventListener("click", () => dashboardApi.nextScreen());
  }

  setInterval(dashboardApi.updateLiveContent, 1000);
  pollTimer = setInterval(() => {
    void pollForUpdates();
  }, POLL_INTERVAL_MS);

  window.addEventListener("beforeunload", () => {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  });

  scheduleAdvance();
}

main();
