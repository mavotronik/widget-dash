import { listAllDashboardData } from "../db.js";
import { setHaSubscriptions } from "./homeAssistant.js";
import { setMqttSubscriptions } from "./mqttService.js";

/** Collect HA entity IDs and MQTT subscribe topics from all dashboards. */
export function refreshSubscriptions() {
  const dashboards = listAllDashboardData();
  /** @type {Set<string>} */
  const haEntities = new Set();
  /** @type {Set<string>} */
  const mqttTopics = new Set();

  for (const data of dashboards) {
    for (const screen of data.screens) {
      for (const widget of screen.widgets) {
        if (widget.type === "text" && widget.contentMode === "external") {
          if (widget.dataSource === "ha" && widget.haEntityId) {
            haEntities.add(widget.haEntityId);
          }
          if (widget.dataSource === "mqtt" && widget.mqttTopic) {
            mqttTopics.add(widget.mqttTopic);
          }
        }

        if (widget.type === "numeric") {
          if (widget.dataSource === "ha" && widget.haEntityId) {
            haEntities.add(widget.haEntityId);
          }
          if (widget.dataSource === "mqtt" && widget.mqttTopic) {
            mqttTopics.add(widget.mqttTopic);
          }
        }
      }
    }
  }

  setHaSubscriptions([...haEntities]);
  setMqttSubscriptions([...mqttTopics]);
}
