import { defaultData, createEmptyDashboard } from "./data/defaults.js";
import { normalizeDashboard } from "./data/migrate.js";

/**
 * @param {object} [options]
 * @param {number} [options.id]
 * @param {string} [options.slug]
 * @returns {Promise<{ meta: { id: number, name: string, slug: string | null, updatedAt: string }, data: import("./data/defaults.js").DashboardData }>}
 */
export async function loadDashboard(options = {}) {
  const { id, slug } = options;

  try {
    let url = "/api/dashboards/1";
    if (slug) {
      url = `/api/dashboards/by-slug/${encodeURIComponent(slug)}`;
    } else if (id) {
      url = `/api/dashboards/${id}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      const fallback = normalizeDashboard(structuredClone(defaultData));
      return {
        meta: { id: 1, name: "Главный", slug: "main", updatedAt: "" },
        data: fallback,
      };
    }

    const payload = await res.json();
    return {
      meta: {
        id: payload.id,
        name: payload.name,
        slug: payload.slug ?? null,
        updatedAt: payload.updatedAt ?? "",
      },
      data: normalizeDashboard(payload.data),
    };
  } catch {
    return {
      meta: { id: 1, name: "Главный", slug: "main", updatedAt: "" },
      data: normalizeDashboard(structuredClone(defaultData)),
    };
  }
}

/** @returns {Promise<import("./data/defaults.js").DashboardData>} */
export async function loadData(options = {}) {
  const result = await loadDashboard(options);
  return result.data;
}

/** @param {number} id @param {import("./data/defaults.js").DashboardData} data @returns {Promise<import("./toast.js").ActionResult>} */
export async function saveData(id, data) {
  try {
    const res = await fetch(`/api/dashboards/${id}`, {
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

/** @returns {Promise<{ id: number, name: string, slug: string | null, designWidth: number, designHeight: number, updatedAt: string }[]>} */
export async function listDashboards() {
  try {
    const res = await fetch("/api/dashboards");
    if (!res.ok) return [];
    return res.json();
  } catch (err) {
    console.error("Failed to list dashboards:", err);
    return [];
  }
}

/**
 * @param {object} payload
 * @param {string} payload.name
 * @param {string} [payload.slug]
 * @param {number} [payload.blueprintId]
 * @param {number} [payload.designWidth]
 * @param {number} [payload.designHeight]
 */
export async function createDashboard(payload) {
  const res = await fetch("/api/dashboards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Ошибка создания (${res.status})`);
  }

  return res.json();
}

/** @param {number} id */
export async function deleteDashboard(id) {
  const res = await fetch(`/api/dashboards/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Ошибка удаления (${res.status})`);
  }
}

/**
 * @param {number} id
 * @param {object} payload
 * @param {string} [payload.name]
 * @param {string | null} [payload.slug]
 */
export async function updateDashboardMeta(id, payload) {
  const res = await fetch(`/api/dashboards/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Ошибка обновления (${res.status})`);
  }

  return res.json();
}

/** @returns {Promise<{ id: number, name: string, description: string | null, createdAt: string }[]>} */
export async function listBlueprints() {
  try {
    const res = await fetch("/api/blueprints");
    if (!res.ok) return [];
    return res.json();
  } catch (err) {
    console.error("Failed to list blueprints:", err);
    return [];
  }
}

/** @param {number} id */
export async function getBlueprint(id) {
  try {
    const res = await fetch(`/api/blueprints/${id}`);
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.error("Failed to get blueprint:", err);
    return null;
  }
}

/** @param {object} payload @param {string} payload.name @param {string} [payload.description] @param {import("./data/defaults.js").DashboardData} payload.data */
export async function createBlueprint(payload) {
  const res = await fetch("/api/blueprints", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Ошибка сохранения blueprint (${res.status})`);
  }

  return res.json();
}

/** @param {number} id */
export async function deleteBlueprint(id) {
  const res = await fetch(`/api/blueprints/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Ошибка удаления blueprint (${res.status})`);
  }
}

export { createEmptyDashboard };

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

/**
 * @param {object} payload
 * @param {string} payload.host
 * @param {number} payload.attempts
 * @param {number} payload.intervalMs
 * @returns {Promise<{ ok: boolean, success: boolean }>}
 */
export async function pingHost(payload) {
  const res = await fetch("/api/ping", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Ping error (${res.status})`);
  }

  return res.json();
}
