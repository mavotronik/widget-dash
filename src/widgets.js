/** @param {import("./data/defaults.js").Widget} widget */
function getTextStyleAttrs(widget) {
  const parts = [];
  if (widget.fontSize) parts.push(`font-size:${widget.fontSize}px`);
  if (widget.fontFamily) parts.push(`font-family:${widget.fontFamily}`);
  if (widget.color) parts.push(`color:${widget.color}`);
  return parts.length ? ` style="${parts.join(";")}"` : "";
}

/** @param {string} value */
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** @param {import("./data/defaults.js").Widget} widget */
function resolveExternalTextValue(widget) {
  if (widget.contentMode !== "external") {
    return widget.text || "Текст";
  }

  if (!liveSourcesModule) return "—";

  if (widget.dataSource === "mqtt" && widget.mqttTopic) {
    return liveSourcesModule.getMqttValue(widget.mqttTopic) ?? "—";
  }

  if (widget.haEntityId) {
    return liveSourcesModule.getHaValue(widget.haEntityId) ?? "—";
  }

  return "—";
}

/** @param {import("./data/defaults.js").Widget} widget */
function resolveNumericValue(widget) {
  if (!liveSourcesModule) return "—";

  let raw = null;

  if (widget.dataSource === "mqtt" && widget.mqttTopic) {
    raw = liveSourcesModule.getMqttValue(widget.mqttTopic);
  } else if (widget.haEntityId) {
    raw = liveSourcesModule.getHaValue(widget.haEntityId);
  }

  if (raw === null) return "—";

  const num = parseFloat(raw);
  if (!Number.isFinite(num)) return raw;

  const min = typeof widget.min === "number" ? widget.min : num;
  const max = typeof widget.max === "number" ? widget.max : num;
  const clamped = Math.min(max, Math.max(min, num));
  return String(clamped);
}

/** @type {typeof import("./dataSources.js") | null} */
let liveSourcesModule = null;

/** @param {typeof import("./dataSources.js")} module */
export function setLiveSourcesModule(module) {
  liveSourcesModule = module;
}

/** @param {import("./data/defaults.js").Widget} widget */
export function renderWidgetContent(widget) {
  const style = getTextStyleAttrs(widget);

  switch (widget.type) {
    case "clock":
      return `<div class="clock"${style}>${new Date().toLocaleTimeString()}</div>`;
    case "date":
      return `<div class="date"${style}>${new Date().toLocaleDateString()}</div>`;
    case "text": {
      const text =
        widget.contentMode === "external" && liveSourcesModule
          ? escapeHtml(resolveExternalTextValue(widget))
          : escapeHtml(widget.text || "Текст");
      return `<div class="text-widget"${style}>${text}</div>`;
    }
    case "image":
      if (!widget.url) {
        return `<div class="image-placeholder">Укажите изображение</div>`;
      }
      return `<div class="image-widget"><img src="${widget.url}" alt=""></div>`;
    case "numeric": {
      const value =
        liveSourcesModule && widget.dataSource
          ? resolveNumericValue(widget)
          : typeof widget.value === "number"
            ? String(widget.value)
            : "0";
      return `<div class="numeric-widget"${style}>${escapeHtml(value)}</div>`;
    }
    case "button": {
      const label = escapeHtml(widget.label || "Кнопка");
      return `<button type="button" class="widget-action-btn" data-role="widget-button">${label}</button>`;
    }
    case "switch": {
      const positions =
        Array.isArray(widget.positions) && widget.positions.length
          ? widget.positions
          : [{ name: "1" }, { name: "2" }];
      const selectedIndex =
        typeof widget.selectedIndex === "number" ? widget.selectedIndex : 0;
      return `<div class="switch-widget">${positions
        .map((position, index) => {
          const active = index === selectedIndex ? " is-active" : "";
          return `<button type="button" class="switch-option${active}" data-role="switch-option" data-switch-index="${index}">${escapeHtml(position.name)}</button>`;
        })
        .join("")}</div>`;
    }
    case "ping": {
      const status =
        widget.status === "ok" || widget.status === "fail" ? widget.status : "unknown";
      const host = escapeHtml(widget.host || "host");
      const statusIcon =
        status === "ok"
          ? "mdi-check-circle"
          : status === "fail"
            ? "mdi-close-circle"
            : "mdi-help-circle-outline";
      return `<div class="ping-widget ping-widget--${status}">
        <span class="mdi ${statusIcon}" aria-hidden="true"></span>
        <span class="ping-host">${host}</span>
      </div>`;
    }
    default:
      return "";
  }
}

const RESIZE_HANDLES = `
  <div class="resize-handle resize-nw" data-corner="nw"></div>
  <div class="resize-handle resize-ne" data-corner="ne"></div>
  <div class="resize-handle resize-sw" data-corner="sw"></div>
  <div class="resize-handle resize-se" data-corner="se"></div>
`;

const WIDGET_ICONS = {
  clock: "clock-outline",
  date: "calendar",
  text: "format-text",
  image: "image",
  numeric: "numeric",
  button: "gesture-tap-button",
  switch: "toggle-switch",
  ping: "lan-check",
};

const WIDGET_LABELS = {
  clock: "Часы",
  date: "Дата",
  text: "Текст",
  image: "Картинка",
  numeric: "Число",
  button: "Кнопка",
  switch: "Переключатель",
  ping: "Ping",
};

/** @param {import("./data/defaults.js").Widget} widget @param {boolean} settingsMode @param {number | null} [selectedId] */
export function createWidgetElement(widget, settingsMode, selectedId = null) {
  const div = document.createElement("div");
  div.className = "widget";
  if (widget.type === "image") {
    div.classList.add("widget--image");
  }
  if (settingsMode && selectedId === widget.id) {
    div.classList.add("selected");
  }
  div.dataset.widgetId = String(widget.id);
  div.style.left = `${widget.x}px`;
  div.style.top = `${widget.y}px`;
  div.style.width = `${widget.w}px`;
  div.style.height = `${widget.h}px`;

  const header = settingsMode
    ? `<div class="widget-header widget-header--with-icon">
        <span class="mdi mdi-${WIDGET_ICONS[widget.type] || "widgets"} widget-header-icon" aria-hidden="true"></span>
        <span>${WIDGET_LABELS[widget.type] || widget.type}</span>
      </div>`
    : "";

  const handles = settingsMode ? RESIZE_HANDLES : "";

  div.innerHTML = `
    ${header}
    <div class="widget-content">
      ${renderWidgetContent(widget)}
    </div>
    ${handles}
  `;

  return div;
}
