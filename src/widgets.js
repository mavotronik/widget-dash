/** @param {import("./data/defaults.js").Widget} widget */
export function renderWidgetContent(widget) {
  switch (widget.type) {
    case "clock":
      return `<div class="clock">${new Date().toLocaleTimeString()}</div>`;
    case "date":
      return `<div class="date">${new Date().toLocaleDateString()}</div>`;
    case "text":
      return `<div class="text-widget">${widget.text || "Текст"}</div>`;
    case "image":
      return `<div class="image-widget"><img src="${widget.url}" alt=""></div>`;
    default:
      return "";
  }
}

/** @param {import("./data/defaults.js").Widget} widget @param {boolean} settingsMode */
export function createWidgetElement(widget, settingsMode) {
  const div = document.createElement("div");
  div.className = "widget";
  div.dataset.widgetId = String(widget.id);
  div.style.left = `${widget.x}px`;
  div.style.top = `${widget.y}px`;
  div.style.width = `${widget.w}px`;
  div.style.height = `${widget.h}px`;

  const header = settingsMode
    ? `<div class="widget-header">${widget.type}</div>`
    : "";

  div.innerHTML = `
    ${header}
    <div class="widget-content">
      ${renderWidgetContent(widget)}
    </div>
  `;

  return div;
}
