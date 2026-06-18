/** @param {import("./data/defaults.js").Widget} widget */
function getTextStyleAttrs(widget) {
  const parts = [];
  if (widget.fontSize) parts.push(`font-size:${widget.fontSize}px`);
  if (widget.fontFamily) parts.push(`font-family:${widget.fontFamily}`);
  if (widget.color) parts.push(`color:${widget.color}`);
  return parts.length ? ` style="${parts.join(";")}"` : "";
}

/** @param {import("./data/defaults.js").Widget} widget */
export function renderWidgetContent(widget) {
  const style = getTextStyleAttrs(widget);

  switch (widget.type) {
    case "clock":
      return `<div class="clock"${style}>${new Date().toLocaleTimeString()}</div>`;
    case "date":
      return `<div class="date"${style}>${new Date().toLocaleDateString()}</div>`;
    case "text":
      return `<div class="text-widget"${style}>${widget.text || "Текст"}</div>`;
    case "image":
      if (!widget.url) {
        return `<div class="image-placeholder">Укажите изображение</div>`;
      }
      return `<div class="image-widget"><img src="${widget.url}" alt=""></div>`;
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
};

const WIDGET_LABELS = {
  clock: "Часы",
  date: "Дата",
  text: "Текст",
  image: "Картинка",
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
