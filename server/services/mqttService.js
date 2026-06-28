import mqtt from "mqtt";
import { broadcast } from "./wsHub.js";

/** @type {import("mqtt").MqttClient | null} */
let client = null;

/** @type {{ enabled: boolean, host: string, port: number, useAuth: boolean, username: string, password: string } | null} */
let config = null;

/** @type {Set<string>} */
const subscribedTopics = new Set();

/** @type {Map<string, string>} */
const topicCache = new Map();

let connected = false;
let lastError = "";

/** @param {{ enabled: boolean, host: string, port: number, useAuth: boolean, username: string, password: string }} nextConfig */
export function configureMqtt(nextConfig) {
  disconnectMqtt();

  config = {
    enabled: nextConfig.enabled,
    host: nextConfig.host.trim(),
    port: nextConfig.port,
    useAuth: nextConfig.useAuth,
    username: nextConfig.username,
    password: nextConfig.password,
  };

  if (!config.enabled || !config.host) {
    connected = false;
    lastError = config.enabled ? "Укажите хост брокера" : "";
    return;
  }

  const url = `mqtt://${config.host}:${config.port}`;
  const options = /** @type {import("mqtt").IClientOptions} */ ({
    reconnectPeriod: 5000,
    connectTimeout: 10000,
  });

  if (config.useAuth) {
    options.username = config.username;
    options.password = config.password;
  }

  client = mqtt.connect(url, options);

  client.on("connect", () => {
    connected = true;
    lastError = "";
    resubscribeAll();
  });

  client.on("error", (err) => {
    connected = false;
    lastError = err.message;
  });

  client.on("close", () => {
    connected = false;
  });

  client.on("message", (topic, payload) => {
    const value = payload.toString();
    topicCache.set(topic, value);
    broadcast({ type: "mqtt", topic, value });
  });
}

function disconnectMqtt() {
  if (client) {
    client.end(true);
    client = null;
  }
  connected = false;
}

function resubscribeAll() {
  if (!client?.connected) return;
  for (const topic of subscribedTopics) {
    client.subscribe(topic, (err) => {
      if (err) lastError = err.message;
    });
  }
}

/** @param {string[]} topics */
export function setMqttSubscriptions(topics) {
  const nextTopics = new Set(topics.filter(Boolean));

  if (client?.connected) {
    for (const topic of subscribedTopics) {
      if (!nextTopics.has(topic)) {
        client.unsubscribe(topic);
      }
    }
    for (const topic of nextTopics) {
      if (!subscribedTopics.has(topic)) {
        client.subscribe(topic);
      }
    }
  }

  subscribedTopics.clear();
  for (const topic of nextTopics) {
    subscribedTopics.add(topic);
  }
}

/**
 * @param {string} topic
 * @param {string} payload
 * @param {0 | 1 | 2} [qos]
 */
export function publishMqtt(topic, payload, qos = 0) {
  if (!client?.connected) {
    throw new Error("MQTT не подключён");
  }

  return new Promise((resolve, reject) => {
    client.publish(topic, payload, { qos, retain: false }, (err) => {
      if (err) reject(err);
      else resolve(undefined);
    });
  });
}

export function getMqttStatus() {
  return { connected, error: lastError || null };
}

/** @param {string} topic */
export function getCachedMqttValue(topic) {
  return topicCache.get(topic) ?? null;
}

export async function testMqttConnection(override) {
  const testConfig = override ?? config;
  if (!testConfig?.host) {
    return { ok: false, error: "Укажите хост брокера" };
  }

  const url = `mqtt://${testConfig.host}:${testConfig.port ?? 1883}`;
  const options = /** @type {import("mqtt").IClientOptions} */ ({
    connectTimeout: 8000,
  });

  if (testConfig.useAuth) {
    options.username = testConfig.username;
    options.password = testConfig.password;
  }

  return new Promise((resolve) => {
    const testClient = mqtt.connect(url, options);
    const timeout = setTimeout(() => {
      testClient.end(true);
      resolve({ ok: false, error: "Таймаут подключения" });
    }, 9000);

    testClient.on("connect", () => {
      clearTimeout(timeout);
      testClient.end(true);
      resolve({ ok: true });
    });

    testClient.on("error", (err) => {
      clearTimeout(timeout);
      testClient.end(true);
      resolve({ ok: false, error: err.message });
    });
  });
}
