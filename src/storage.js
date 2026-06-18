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

/** @returns {Promise<import("./toast.js").ActionResult>} */
export async function saveData(data) {
  try {
    const res = await fetch("/api/dashboard", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: text || `Не удалось сохранить данные (${res.status})`,
      };
    }
    return { ok: true };
  } catch (err) {
    console.error("Failed to save dashboard:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Не удалось сохранить данные",
    };
  }
}

/** @param {File} file @returns {Promise<{ url: string }>} */
export async function uploadImage(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Не удалось загрузить файл (${res.status})`);
  }
  return res.json();
}
