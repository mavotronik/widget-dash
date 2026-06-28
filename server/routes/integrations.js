import { Router } from "express";
import {
  fetchEntities,
  getHaStatus,
  testConnection,
  getCachedHaState,
  getState,
} from "../services/homeAssistant.js";
import {
  getMqttStatus,
  publishMqtt,
  testMqttConnection,
  getCachedMqttValue,
} from "../services/mqttService.js";
import { loadAppSettings } from "../db.js";

const router = Router();

/** @type {{ entities: unknown, fetchedAt: number } | null} */
let entitiesCache = null;

const ENTITIES_CACHE_MS = 30_000;

router.get("/ha/entities", async (_req, res) => {
  try {
    const now = Date.now();
    if (entitiesCache && now - entitiesCache.fetchedAt < ENTITIES_CACHE_MS) {
      res.json(entitiesCache.entities);
      return;
    }

    const entities = await fetchEntities();
    entitiesCache = { entities, fetchedAt: now };
    res.json(entities);
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : "Не удалось загрузить сущности",
    });
  }
});

router.get("/ha/status", (_req, res) => {
  res.json(getHaStatus());
});

router.post("/ha/test", async (req, res) => {
  try {
    const current = loadAppSettings();
    const { url, token } = req.body ?? {};
    const result = await testConnection({
      enabled: true,
      url: typeof url === "string" ? url : current.homeAssistant.url,
      token: typeof token === "string" && token ? token : current.homeAssistant.token,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Ошибка проверки",
    });
  }
});

router.get("/ha/state/:entityId", async (req, res) => {
  try {
    const cached = getCachedHaState(req.params.entityId);
    if (cached !== null) {
      res.json({ entityId: req.params.entityId, value: cached });
      return;
    }

    const value = await getState(req.params.entityId);
    res.json({ entityId: req.params.entityId, value });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : "Не удалось получить состояние",
    });
  }
});

router.get("/mqtt/status", (_req, res) => {
  res.json(getMqttStatus());
});

router.post("/mqtt/test", async (req, res) => {
  try {
    const current = loadAppSettings();
    const body = req.body ?? {};
    const result = await testMqttConnection({
      enabled: true,
      host: typeof body.host === "string" ? body.host : current.mqtt.host,
      port: typeof body.port === "number" ? body.port : current.mqtt.port,
      useAuth: body.useAuth ?? current.mqtt.useAuth,
      username: typeof body.username === "string" ? body.username : current.mqtt.username,
      password:
        typeof body.password === "string" && body.password
          ? body.password
          : current.mqtt.password,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Ошибка проверки",
    });
  }
});

router.post("/mqtt/publish", async (req, res) => {
  try {
    const { topic, payload, qos } = req.body ?? {};
    if (!topic || typeof topic !== "string") {
      res.status(400).json({ error: "Укажите топик" });
      return;
    }

    const safeQos = qos === 1 || qos === 2 ? qos : 0;
    const message = payload != null ? String(payload) : "";
    await publishMqtt(topic, message, safeQos);
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : "Не удалось опубликовать",
    });
  }
});

router.get("/mqtt/value/:topic", (req, res) => {
  const topic = decodeURIComponent(req.params.topic);
  const value = getCachedMqttValue(topic);
  res.json({ topic, value });
});

export default router;
