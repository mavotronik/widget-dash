import { Router } from "express";
import {
  loadAppSettings,
  saveAppSettings,
} from "../db.js";
import {
  sanitizeAppSettingsForClient,
  normalizeAppSettings,
} from "../../src/data/appSettings.js";
import { configureHomeAssistant } from "../services/homeAssistant.js";
import { configureMqtt } from "../services/mqttService.js";
import { refreshSubscriptions } from "../services/subscriptionManager.js";

const router = Router();

function applyIntegrations(settings) {
  configureHomeAssistant(settings.homeAssistant);
  configureMqtt(settings.mqtt);
  refreshSubscriptions();
}

router.get("/", (_req, res) => {
  const settings = loadAppSettings();
  res.json(sanitizeAppSettingsForClient(settings));
});

router.put("/", (req, res) => {
  try {
    const current = loadAppSettings();
    const body = req.body ?? {};

    const merged = normalizeAppSettings({
      theme: body.theme ?? current.theme,
      homeAssistant: {
        enabled: body.homeAssistant?.enabled ?? current.homeAssistant.enabled,
        url:
          typeof body.homeAssistant?.url === "string"
            ? body.homeAssistant.url
            : current.homeAssistant.url,
        token:
          typeof body.homeAssistant?.token === "string" && body.homeAssistant.token
            ? body.homeAssistant.token
            : body.homeAssistant?.token === ""
              ? ""
              : current.homeAssistant.token,
      },
      mqtt: {
        enabled: body.mqtt?.enabled ?? current.mqtt.enabled,
        host: typeof body.mqtt?.host === "string" ? body.mqtt.host : current.mqtt.host,
        port: typeof body.mqtt?.port === "number" ? body.mqtt.port : current.mqtt.port,
        useAuth: body.mqtt?.useAuth ?? current.mqtt.useAuth,
        username:
          typeof body.mqtt?.username === "string" ? body.mqtt.username : current.mqtt.username,
        password:
          typeof body.mqtt?.password === "string" && body.mqtt.password
            ? body.mqtt.password
            : body.mqtt?.password === ""
              ? ""
              : current.mqtt.password,
      },
    });

    saveAppSettings(merged);
    applyIntegrations(merged);
    res.json(sanitizeAppSettingsForClient(merged));
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Ошибка сохранения настроек",
    });
  }
});

export { applyIntegrations };
export default router;
