/** @typedef {{ primary: string, background: string }} AppTheme */
/** @typedef {{ enabled: boolean, url: string, token: string }} HomeAssistantSettings */
/** @typedef {{ enabled: boolean, host: string, port: number, useAuth: boolean, username: string, password: string }} MqttSettings */
/** @typedef {{ theme: AppTheme, homeAssistant: HomeAssistantSettings, mqtt: MqttSettings }} AppSettings */

/** @returns {AppSettings} */
export function defaultAppSettings() {
  return {
    theme: {
      primary: "#2196f3",
      background: "#111827",
    },
    homeAssistant: {
      enabled: false,
      url: "",
      token: "",
    },
    mqtt: {
      enabled: false,
      host: "",
      port: 1883,
      useAuth: false,
      username: "",
      password: "",
    },
  };
}

/**
 * @param {unknown} raw
 * @returns {AppSettings}
 */
export function normalizeAppSettings(raw) {
  const base = defaultAppSettings();
  if (!raw || typeof raw !== "object") return base;

  const data = /** @type {Record<string, unknown>} */ (raw);

  if (data.theme && typeof data.theme === "object") {
    const theme = /** @type {Record<string, unknown>} */ (data.theme);
    if (typeof theme.primary === "string" && theme.primary.trim()) {
      base.theme.primary = theme.primary.trim();
    }
    if (typeof theme.background === "string" && theme.background.trim()) {
      base.theme.background = theme.background.trim();
    }
  }

  if (data.homeAssistant && typeof data.homeAssistant === "object") {
    const ha = /** @type {Record<string, unknown>} */ (data.homeAssistant);
    base.homeAssistant.enabled = ha.enabled === true;
    base.homeAssistant.url = typeof ha.url === "string" ? ha.url.trim() : "";
    base.homeAssistant.token = typeof ha.token === "string" ? ha.token : "";
  }

  if (data.mqtt && typeof data.mqtt === "object") {
    const mqtt = /** @type {Record<string, unknown>} */ (data.mqtt);
    base.mqtt.enabled = mqtt.enabled === true;
    base.mqtt.host = typeof mqtt.host === "string" ? mqtt.host.trim() : "";
    base.mqtt.port =
      typeof mqtt.port === "number" && mqtt.port > 0 && mqtt.port <= 65535
        ? Math.floor(mqtt.port)
        : 1883;
    base.mqtt.useAuth = mqtt.useAuth === true;
    base.mqtt.username = typeof mqtt.username === "string" ? mqtt.username : "";
    base.mqtt.password = typeof mqtt.password === "string" ? mqtt.password : "";
  }

  return base;
}

/**
 * @param {AppSettings} settings
 * @returns {object}
 */
export function sanitizeAppSettingsForClient(settings) {
  return {
    theme: settings.theme,
    homeAssistant: {
      enabled: settings.homeAssistant.enabled,
      url: settings.homeAssistant.url,
      hasToken: Boolean(settings.homeAssistant.token),
    },
    mqtt: {
      enabled: settings.mqtt.enabled,
      host: settings.mqtt.host,
      port: settings.mqtt.port,
      useAuth: settings.mqtt.useAuth,
      username: settings.mqtt.username,
      hasPassword: Boolean(settings.mqtt.password),
    },
  };
}
