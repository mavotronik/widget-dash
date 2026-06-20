/**
 * @typedef {{ scale: number, offsetX: number, offsetY: number, designWidth: number, designHeight: number }} ScaleInfo
 */

/**
 * @param {number} containerW
 * @param {number} containerH
 * @param {number} designW
 * @param {number} designH
 * @returns {ScaleInfo}
 */
export function computeScale(containerW, containerH, designW, designH) {
  const scale = Math.min(containerW / designW, containerH / designH) || 1;
  const scaledW = designW * scale;
  const scaledH = designH * scale;

  return {
    scale,
    offsetX: (containerW - scaledW) / 2,
    offsetY: (containerH - scaledH) / 2,
    designWidth: designW,
    designHeight: designH,
  };
}

/**
 * @param {number} clientX
 * @param {number} clientY
 * @param {DOMRect} scalerRect
 * @param {ScaleInfo} scaleInfo
 */
export function clientToDesign(clientX, clientY, scalerRect, scaleInfo) {
  const x = ((clientX - scalerRect.left) / scalerRect.width) * scaleInfo.designWidth;
  const y = ((clientY - scalerRect.top) / scalerRect.height) * scaleInfo.designHeight;
  return { x, y };
}

/**
 * @param {import("./data/defaults.js").Widget} widget
 * @param {number} designWidth
 * @param {number} designHeight
 */
export function clampWidgetBounds(widget, designWidth, designHeight) {
  widget.w = Math.max(80, Math.min(widget.w, designWidth));
  widget.h = Math.max(60, Math.min(widget.h, designHeight));
  widget.x = Math.max(0, Math.min(widget.x, designWidth - widget.w));
  widget.y = Math.max(0, Math.min(widget.y, designHeight - widget.h));
}

/**
 * @param {import("./data/defaults.js").DashboardData} data
 * @param {number} designWidth
 * @param {number} designHeight
 */
export function clampAllWidgets(data, designWidth, designHeight) {
  for (const screen of data.screens) {
    for (const widget of screen.widgets) {
      clampWidgetBounds(widget, designWidth, designHeight);
    }
  }
}

/**
 * @param {import("./data/defaults.js").DashboardData} data
 * @param {number} designWidth
 * @param {number} designHeight
 */
export function hasWidgetsOutOfBounds(data, designWidth, designHeight) {
  for (const screen of data.screens) {
    for (const widget of screen.widgets) {
      if (
        widget.x < 0 ||
        widget.y < 0 ||
        widget.x + widget.w > designWidth ||
        widget.y + widget.h > designHeight
      ) {
        return true;
      }
    }
  }
  return false;
}
