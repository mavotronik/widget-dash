import { defaultData } from "./data/defaults.js";

const STORAGE_KEY = "dashboardData";

/** @returns {import("./data/defaults.js").DashboardData} */
export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultData);
    return JSON.parse(raw);
  } catch {
    return structuredClone(defaultData);
  }
}

/** @param {import("./data/defaults.js").DashboardData} data */
export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
