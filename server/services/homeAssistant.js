import { broadcast } from "./wsHub.js";

/** @type {{ enabled: boolean, url: string, token: string } | null} */
let config = null;

/** @type {ReturnType<typeof setInterval> | null} */
let pollTimer = null;

/** @type {Set<string>} */
const subscribedEntities = new Set();

/** @type {Map<string, string>} */
const stateCache = new Map();

let lastError = "";
let connected = false;

const POLL_INTERVAL_MS = 3000;

/**
 * @param {string} path
 * @param {RequestInit} [options]
 */
async function haFetch(path, options = {}) {
  if (!config?.enabled || !config.url || !config.token) {
    throw new Error("Home Assistant не настроен");
  }

  const baseUrl = config.url.replace(/\/+$/, "");
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 401 || response.status === 403) {
    connected = false;
    lastError = "Неверный токен";
    throw new Error(lastError);
  }

  if (!response.ok) {
    connected = false;
    lastError = `HTTP ${response.status}`;
    throw new Error(lastError);
  }

  connected = true;
  lastError = "";
  return response;
}

/** @param {{ enabled: boolean, url: string, token: string }} nextConfig */
export function configureHomeAssistant(nextConfig) {
  config = {
    enabled: nextConfig.enabled,
    url: nextConfig.url.trim(),
    token: nextConfig.token,
  };

  if (!config.enabled || !config.url || !config.token) {
    stopPolling();
    connected = false;
    lastError = config?.enabled ? "Укажите URL и токен" : "";
    return;
  }

  restartPolling();
}

export function getHaStatus() {
  return { connected, error: lastError || null };
}

export async function testConnection(override) {
  const testConfig = override ?? config;
  if (!testConfig?.url || !testConfig?.token) {
    return { ok: false, error: "Укажите URL и токен" };
  }

  const prev = config;
  config = {
    enabled: true,
    url: testConfig.url.trim(),
    token: testConfig.token,
  };

  try {
    await haFetch("/api/");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Ошибка подключения",
    };
  } finally {
    config = prev;
    if (prev) {
      connected = false;
      lastError = "";
    }
  }
}

/** @returns {Promise<{ entityId: string, state: string, friendlyName: string }[]>} */
export async function fetchEntities() {
  const response = await haFetch("/api/states");
  const states = /** @type {{ entity_id: string, state: string, attributes?: { friendly_name?: string } }[]} */ (
    await response.json()
  );

  return states.map((item) => ({
    entityId: item.entity_id,
    state: item.state,
    friendlyName:
      typeof item.attributes?.friendly_name === "string"
        ? item.attributes.friendly_name
        : item.entity_id,
  }));
}

/** @param {string} entityId */
export async function getState(entityId) {
  const response = await haFetch(`/api/states/${encodeURIComponent(entityId)}`);
  const item = /** @type {{ entity_id: string, state: string }} */ (await response.json());
  return item.state;
}

function stopPolling() {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function restartPolling() {
  stopPolling();
  if (!config?.enabled || subscribedEntities.size === 0) return;

  void pollOnce();
  pollTimer = setInterval(() => {
    void pollOnce();
  }, POLL_INTERVAL_MS);
}

async function pollOnce() {
  if (!config?.enabled || subscribedEntities.size === 0) return;

  try {
    const entities = await fetchEntities();
    const entitySet = subscribedEntities;

    for (const entity of entities) {
      if (!entitySet.has(entity.entityId)) continue;

      const prev = stateCache.get(entity.entityId);
      if (prev !== entity.state) {
        stateCache.set(entity.entityId, entity.state);
        broadcast({ type: "ha", entityId: entity.entityId, value: entity.state });
      }
    }

    connected = true;
    lastError = "";
  } catch (err) {
    connected = false;
    lastError = err instanceof Error ? err.message : "Ошибка опроса";
  }
}

/** @param {string[]} entityIds */
export function setHaSubscriptions(entityIds) {
  subscribedEntities.clear();
  for (const id of entityIds) {
    if (id) subscribedEntities.add(id);
  }

  if (!config?.enabled) {
    stopPolling();
    return;
  }

  restartPolling();
}

/** @param {string} entityId */
export function getCachedHaState(entityId) {
  return stateCache.get(entityId) ?? null;
}
