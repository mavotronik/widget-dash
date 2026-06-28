import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createEmptyDashboard, defaultData } from "../src/data/defaults.js";
import { normalizeDashboard } from "../src/data/migrate.js";
import { defaultAppSettings, normalizeAppSettings } from "../src/data/appSettings.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "../data/dashboard.db");

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

function migrateLegacyDashboard() {
  const legacy = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='dashboard'")
    .get();

  if (!legacy) return;

  const count = db.prepare("SELECT COUNT(*) AS count FROM dashboards").get().count;

  if (count > 0) {
    db.exec("DROP TABLE dashboard");
    return;
  }

  const row = db.prepare("SELECT data FROM dashboard WHERE id = 1").get();
  const data = row ? normalizeDashboard(JSON.parse(row.data)) : normalizeDashboard(defaultData);

  db.prepare("INSERT INTO dashboards (id, name, slug, data) VALUES (1, ?, ?, ?)").run(
    "Главный",
    "main",
    JSON.stringify(data)
  );

  db.exec("DROP TABLE dashboard");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS dashboards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS blueprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

migrateLegacyDashboard();

const dashboardCount = db.prepare("SELECT COUNT(*) AS count FROM dashboards").get().count;

if (dashboardCount === 0) {
  db.prepare("INSERT INTO dashboards (name, slug, data) VALUES (?, ?, ?)").run(
    "Главный",
    "main",
    JSON.stringify(normalizeDashboard(defaultData))
  );
}

/** @param {string} name */
export function generateSlug(name) {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || null;
}

/** @param {string | null | undefined} slug */
export function isValidSlug(slug) {
  if (slug == null || slug === "") return true;
  return /^[a-z0-9-]+$/.test(slug);
}

/** @returns {{ id: number, name: string, slug: string | null, designWidth: number, designHeight: number, updatedAt: string }[]} */
export function listDashboards() {
  return db
    .prepare("SELECT id, name, slug, data, updated_at AS updatedAt FROM dashboards ORDER BY id")
    .all()
    .map((row) => {
      const data = normalizeDashboard(JSON.parse(row.data));
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        designWidth: data.designWidth,
        designHeight: data.designHeight,
        updatedAt: row.updatedAt,
      };
    });
}

/** @param {number} id */
export function getDashboardMeta(id) {
  const row = db
    .prepare("SELECT id, name, slug, updated_at AS updatedAt FROM dashboards WHERE id = ?")
    .get(id);
  return row ?? null;
}

/** @param {number} id */
export function loadDashboardById(id) {
  const row = db.prepare("SELECT data FROM dashboards WHERE id = ?").get(id);
  if (!row) return null;
  return normalizeDashboard(JSON.parse(row.data));
}

/** @param {string} slug */
export function loadDashboardBySlug(slug) {
  const row = db.prepare("SELECT data FROM dashboards WHERE slug = ?").get(slug);
  if (!row) return null;
  return normalizeDashboard(JSON.parse(row.data));
}

/** @param {string} slug */
export function getDashboardMetaBySlug(slug) {
  return db
    .prepare("SELECT id, name, slug, updated_at AS updatedAt FROM dashboards WHERE slug = ?")
    .get(slug) ?? null;
}

/**
 * @param {object} options
 * @param {string} options.name
 * @param {string | null} [options.slug]
 * @param {number} [options.designWidth]
 * @param {number} [options.designHeight]
 * @param {import("../src/data/defaults.js").DashboardData} [options.data]
 */
export function createDashboard({ name, slug, designWidth = 1920, designHeight = 1080, data }) {
  const dashboardData = normalizeDashboard(
    data ?? createEmptyDashboard(designWidth, designHeight)
  );

  if (designWidth && designHeight) {
    dashboardData.designWidth = designWidth;
    dashboardData.designHeight = designHeight;
  }

  const resolvedSlug = slug ?? generateSlug(name);

  const result = db
    .prepare("INSERT INTO dashboards (name, slug, data) VALUES (?, ?, ?)")
    .run(name, resolvedSlug, JSON.stringify(dashboardData));

  return {
    id: Number(result.lastInsertRowid),
    name,
    slug: resolvedSlug,
    data: dashboardData,
  };
}

/** @param {number} id @param {import("../src/data/defaults.js").DashboardData} data */
export function saveDashboard(id, data) {
  const normalized = normalizeDashboard(data);
  db.prepare("UPDATE dashboards SET data = ?, updated_at = datetime('now') WHERE id = ?").run(
    JSON.stringify(normalized),
    id
  );
}

/** @param {number} id @param {string} name @param {string | null} slug */
export function updateDashboardMeta(id, name, slug) {
  db.prepare("UPDATE dashboards SET name = ?, slug = ?, updated_at = datetime('now') WHERE id = ?").run(
    name,
    slug,
    id
  );
}

/** @param {number} id */
export function deleteDashboard(id) {
  const count = db.prepare("SELECT COUNT(*) AS count FROM dashboards").get().count;
  if (count <= 1) {
    throw new Error("Нельзя удалить последний дашборд");
  }

  db.prepare("DELETE FROM dashboards WHERE id = ?").run(id);
}

/** @returns {{ id: number, name: string, description: string | null, createdAt: string }[]} */
export function listBlueprints() {
  return db
    .prepare("SELECT id, name, description, created_at AS createdAt FROM blueprints ORDER BY id DESC")
    .all();
}

/** @param {number} id */
export function getBlueprint(id) {
  const row = db
    .prepare("SELECT id, name, description, data, created_at AS createdAt FROM blueprints WHERE id = ?")
    .get(id);

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    data: normalizeDashboard(JSON.parse(row.data)),
    createdAt: row.createdAt,
  };
}

/** @param {string} name @param {string | null} description @param {import("../src/data/defaults.js").DashboardData} data */
export function createBlueprint(name, description, data) {
  const result = db
    .prepare("INSERT INTO blueprints (name, description, data) VALUES (?, ?, ?)")
    .run(name, description, JSON.stringify(normalizeDashboard(data)));

  return { id: Number(result.lastInsertRowid), name, description };
}

/** @param {number} id */
export function deleteBlueprint(id) {
  db.prepare("DELETE FROM blueprints WHERE id = ?").run(id);
}

/** @param {string} slug @param {number} [excludeId] */
export function isSlugTaken(slug, excludeId) {
  if (!slug) return false;
  const row = excludeId
    ? db.prepare("SELECT id FROM dashboards WHERE slug = ? AND id != ?").get(slug, excludeId)
    : db.prepare("SELECT id FROM dashboards WHERE slug = ?").get(slug);
  return Boolean(row);
}

/** @returns {import("../src/data/appSettings.js").AppSettings} */
export function loadAppSettings() {
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'global'").get();

  if (row) {
    return normalizeAppSettings(JSON.parse(row.value));
  }

  const firstDashboard = db
    .prepare("SELECT data FROM dashboards ORDER BY id LIMIT 1")
    .get();

  const settings = defaultAppSettings();

  if (firstDashboard) {
    const raw = JSON.parse(firstDashboard.data);
    if (raw.theme && typeof raw.theme === "object") {
      settings.theme = {
        primary:
          typeof raw.theme.primary === "string" ? raw.theme.primary : settings.theme.primary,
        background:
          typeof raw.theme.background === "string"
            ? raw.theme.background
            : settings.theme.background,
      };
    }
  }

  saveAppSettings(settings);
  return settings;
}

/** @param {import("../src/data/appSettings.js").AppSettings} settings */
export function saveAppSettings(settings) {
  const normalized = normalizeAppSettings(settings);
  db.prepare(
    "INSERT INTO app_settings (key, value) VALUES ('global', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(JSON.stringify(normalized));
}

/** @returns {import("../src/data/defaults.js").DashboardData[]} */
export function listAllDashboardData() {
  return db
    .prepare("SELECT data FROM dashboards ORDER BY id")
    .all()
    .map((row) => normalizeDashboard(JSON.parse(row.data)));
}
