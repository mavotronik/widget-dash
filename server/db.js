import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { defaultData } from "../src/data/defaults.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "../data/dashboard.db");

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS dashboard (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL
  )
`);

const row = db.prepare("SELECT data FROM dashboard WHERE id = 1").get();

if (!row) {
  db.prepare("INSERT INTO dashboard (id, data) VALUES (1, ?)").run(
    JSON.stringify(defaultData)
  );
}

/** @returns {import("../src/data/defaults.js").DashboardData} */
export function loadDashboard() {
  const result = db.prepare("SELECT data FROM dashboard WHERE id = 1").get();
  return JSON.parse(result.data);
}

/** @param {import("../src/data/defaults.js").DashboardData} data */
export function saveDashboard(data) {
  db.prepare("UPDATE dashboard SET data = ? WHERE id = 1").run(JSON.stringify(data));
}
