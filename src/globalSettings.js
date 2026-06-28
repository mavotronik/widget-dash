import {
  loadAppSettings,
  saveAppSettings,
  testHaConnection,
  testMqttConnection,
} from "./storage.js";
import { runAction, showError } from "./toast.js";
import { createDebouncedActionNotifier } from "./toast.js";

/**
 * @param {object} options
 * @param {HTMLElement} options.modal
 * @param {HTMLButtonElement} options.openBtn
 * @param {HTMLButtonElement} options.closeBtn
 * @param {HTMLInputElement} options.primaryColorInput
 * @param {HTMLInputElement} options.backgroundColorInput
 * @param {HTMLInputElement} options.snapEdgeAlignInput
 * @param {HTMLInputElement} options.snapSizeMatchInput
 * @param {HTMLInputElement} options.haEnabledInput
 * @param {HTMLInputElement} options.haUrlInput
 * @param {HTMLInputElement} options.haTokenInput
 * @param {HTMLButtonElement} options.haTestBtn
 * @param {HTMLElement} options.haStatusEl
 * @param {HTMLInputElement} options.mqttEnabledInput
 * @param {HTMLInputElement} options.mqttHostInput
 * @param {HTMLInputElement} options.mqttPortInput
 * @param {HTMLInputElement} options.mqttUseAuthInput
 * @param {HTMLInputElement} options.mqttUsernameInput
 * @param {HTMLInputElement} options.mqttPasswordInput
 * @param {HTMLButtonElement} options.mqttTestBtn
 * @param {HTMLElement} options.mqttStatusEl
 * @param {(theme: { primary: string, background: string }) => void} options.onThemeChange
 * @param {string} options.snapEdgeAlignKey
 * @param {string} options.snapSizeMatchKey
 */
export function initGlobalSettings({
  modal,
  openBtn,
  closeBtn,
  primaryColorInput,
  backgroundColorInput,
  snapEdgeAlignInput,
  snapSizeMatchInput,
  haEnabledInput,
  haUrlInput,
  haTokenInput,
  haTestBtn,
  haStatusEl,
  mqttEnabledInput,
  mqttHostInput,
  mqttPortInput,
  mqttUseAuthInput,
  mqttUsernameInput,
  mqttPasswordInput,
  mqttTestBtn,
  mqttStatusEl,
  onThemeChange,
  snapEdgeAlignKey,
  snapSizeMatchKey,
}) {
  /** @type {import("./data/appSettings.js").AppSettings | null} */
  let settings = null;

  const notifySave = createDebouncedActionNotifier("Настройки");

  function syncAuthFields() {
    const authFields = document.getElementById("mqttAuthFields");
    if (authFields) {
      authFields.hidden = !mqttUseAuthInput.checked;
    }
  }

  function buildPayload() {
    if (!settings) return null;

    return {
      theme: {
        primary: primaryColorInput.value,
        background: backgroundColorInput.value,
      },
      homeAssistant: {
        enabled: haEnabledInput.checked,
        url: haUrlInput.value.trim(),
        token: haTokenInput.value || undefined,
      },
      mqtt: {
        enabled: mqttEnabledInput.checked,
        host: mqttHostInput.value.trim(),
        port: Number(mqttPortInput.value) || 1883,
        useAuth: mqttUseAuthInput.checked,
        username: mqttUsernameInput.value,
        password: mqttPasswordInput.value || undefined,
      },
    };
  }

  async function persist() {
    const payload = buildPayload();
    if (!payload) return;

    await saveAppSettings(payload);
    settings = await loadAppSettings();
    haTokenInput.value = "";
    haTokenInput.placeholder = settings.homeAssistant.url ? "••••••••" : "Long-Lived Access Token";
    mqttPasswordInput.value = "";
    mqttPasswordInput.placeholder = settings.mqtt.useAuth ? "••••••••" : "Пароль";
  }

  function schedulePersist() {
    notifySave(async () => {
      await persist();
      return { ok: true };
    });
  }

  async function syncForm() {
    settings = await loadAppSettings();

    primaryColorInput.value = settings.theme.primary;
    backgroundColorInput.value = settings.theme.background;

    haEnabledInput.checked = settings.homeAssistant.enabled;
    haUrlInput.value = settings.homeAssistant.url;
    haTokenInput.value = "";
    haTokenInput.placeholder = "Long-Lived Access Token";

    mqttEnabledInput.checked = settings.mqtt.enabled;
    mqttHostInput.value = settings.mqtt.host;
    mqttPortInput.value = String(settings.mqtt.port);
    mqttUseAuthInput.checked = settings.mqtt.useAuth;
    mqttUsernameInput.value = settings.mqtt.username;
    mqttPasswordInput.value = "";
    mqttPasswordInput.placeholder = settings.mqtt.useAuth ? "Пароль" : "Пароль";

    syncAuthFields();
    onThemeChange(settings.theme);
  }

  function open() {
    void syncForm();
    modal.hidden = false;
  }

  function close() {
    modal.hidden = true;
  }

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);

  modal.addEventListener("mousedown", (e) => {
    if (e.target === modal) close();
  });

  primaryColorInput.addEventListener("input", () => {
    onThemeChange({
      primary: primaryColorInput.value,
      background: backgroundColorInput.value,
    });
    schedulePersist();
  });

  backgroundColorInput.addEventListener("input", () => {
    onThemeChange({
      primary: primaryColorInput.value,
      background: backgroundColorInput.value,
    });
    schedulePersist();
  });

  snapEdgeAlignInput.addEventListener("change", () => {
    localStorage.setItem(snapEdgeAlignKey, String(snapEdgeAlignInput.checked));
  });

  snapSizeMatchInput.addEventListener("change", () => {
    localStorage.setItem(snapSizeMatchKey, String(snapSizeMatchInput.checked));
  });

  for (const input of [
    haEnabledInput,
    haUrlInput,
    haTokenInput,
    mqttEnabledInput,
    mqttHostInput,
    mqttPortInput,
    mqttUseAuthInput,
    mqttUsernameInput,
    mqttPasswordInput,
  ]) {
    input.addEventListener("input", () => {
      syncAuthFields();
      schedulePersist();
    });
    input.addEventListener("change", () => {
      syncAuthFields();
      schedulePersist();
    });
  }

  haTestBtn.addEventListener("click", () => {
    void runAction("Проверка HA", async () => {
      haStatusEl.textContent = "Проверка…";
      haStatusEl.className = "connection-status";

      const result = await testHaConnection({
        url: haUrlInput.value.trim(),
        token: haTokenInput.value || undefined,
      });

      if (result.ok) {
        haStatusEl.textContent = "Подключено";
        haStatusEl.className = "connection-status connection-status--ok";
        return { ok: true };
      }

      haStatusEl.textContent = result.error || "Ошибка";
      haStatusEl.className = "connection-status connection-status--error";
      return { ok: false, error: result.error || "Ошибка подключения" };
    });
  });

  mqttTestBtn.addEventListener("click", () => {
    void runAction("Проверка MQTT", async () => {
      mqttStatusEl.textContent = "Проверка…";
      mqttStatusEl.className = "connection-status";

      const result = await testMqttConnection({
        host: mqttHostInput.value.trim(),
        port: Number(mqttPortInput.value) || 1883,
        useAuth: mqttUseAuthInput.checked,
        username: mqttUsernameInput.value,
        password: mqttPasswordInput.value || undefined,
      });

      if (result.ok) {
        mqttStatusEl.textContent = "Подключено";
        mqttStatusEl.className = "connection-status connection-status--ok";
        return { ok: true };
      }

      mqttStatusEl.textContent = result.error || "Ошибка";
      mqttStatusEl.className = "connection-status connection-status--error";
      return { ok: false, error: result.error || "Ошибка подключения" };
    });
  });

  return {
    open,
    close,
    loadAndApplyTheme: async () => {
      try {
        settings = await loadAppSettings();
        onThemeChange(settings.theme);
        return settings.theme;
      } catch (err) {
        showError(err instanceof Error ? err.message : "Не удалось загрузить настройки");
        return null;
      }
    },
  };
}
