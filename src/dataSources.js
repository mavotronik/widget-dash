import { publishMqtt } from "./storage.js";

/** @type {Map<string, string>} */
const haValues = new Map();

/** @type {Map<string, string>} */
const mqttValues = new Map();

/** @type {Set<(event: { type: string, entityId?: string, topic?: string, value: string }) => void>} */
const listeners = new Set();

/** @type {WebSocket | null} */
let socket = null;

/** @type {ReturnType<typeof setTimeout> | null} */
let reconnectTimer = null;

let reconnectAttempt = 0;

function getWsUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/ws`;
}

function notify(event) {
  for (const listener of listeners) {
    listener(event);
  }
}

function scheduleReconnect() {
  if (reconnectTimer !== null) return;
  const delay = Math.min(30_000, 1000 * 2 ** reconnectAttempt);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectAttempt += 1;
    connect();
  }, delay);
}

function connect() {
  if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
    return;
  }

  try {
    socket = new WebSocket(getWsUrl());
  } catch {
    scheduleReconnect();
    return;
  }

  socket.addEventListener("open", () => {
    reconnectAttempt = 0;
  });

  socket.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(String(event.data));
      if (data.type === "ha" && typeof data.entityId === "string") {
        haValues.set(data.entityId, String(data.value ?? ""));
        notify({ type: "ha", entityId: data.entityId, value: String(data.value ?? "") });
      }
      if (data.type === "mqtt" && typeof data.topic === "string") {
        mqttValues.set(data.topic, String(data.value ?? ""));
        notify({ type: "mqtt", topic: data.topic, value: String(data.value ?? "") });
      }
    } catch {
      // ignore malformed messages
    }
  });

  socket.addEventListener("close", () => {
    socket = null;
    scheduleReconnect();
  });

  socket.addEventListener("error", () => {
    socket?.close();
  });
}

export function initDataSources() {
  connect();
}

/** @param {(event: { type: string, entityId?: string, topic?: string, value: string }) => void} listener */
export function onDataUpdate(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** @param {string} entityId */
export function getHaValue(entityId) {
  return haValues.get(entityId) ?? null;
}

/** @param {string} topic */
export function getMqttValue(topic) {
  return mqttValues.get(topic) ?? null;
}

/**
 * @param {string} topic
 * @param {string} payload
 * @param {0 | 1 | 2} [qos]
 */
export async function publishMqttMessage(topic, payload, qos = 0) {
  return publishMqtt({ topic, payload, qos });
}

export function disconnectDataSources() {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.close();
  socket = null;
}
