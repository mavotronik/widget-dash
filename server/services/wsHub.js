import { WebSocketServer } from "ws";

/** @type {WebSocketServer | null} */
let wss = null;

/** @param {import("http").Server} server */
export function initWsHub(server) {
  wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws) => {
    ws.on("error", () => {});
  });
}

/** @param {object} message */
export function broadcast(message) {
  if (!wss) return;

  const payload = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}
