import { defaultData } from "./data/defaults.js";
import { normalizeDashboard } from "./data/migrate.js";

/** @returns {Promise<import("./data/defaults.js").DashboardData>} */
export async function loadData() {
  try {
    const res = await fetch("/api/dashboard");
    if (!res.ok) return normalizeDashboard(structuredClone(defaultData));
    return normalizeDashboard(await res.json());
  } catch {
    return normalizeDashboard(structuredClone(defaultData));
  }
}

/** @param {import("./data/defaults.js").DashboardData} data */
export async function saveData(data) {
  try {
    await fetch("/api/dashboard", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error("Failed to save dashboard:", err);
  }
}

/** @param {File} file @returns {Promise<{ url: string }>} */
export async function uploadImage(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}
