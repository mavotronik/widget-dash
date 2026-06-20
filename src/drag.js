import { isResizing } from "./resize.js";

let activeDrags = 0;

export function isDragging() {
  return activeDrags > 0;
}

export function isInteracting() {
  return activeDrags > 0 || isResizing();
}

/**
 * @param {HTMLElement} el
 * @param {import("./data/defaults.js").Widget} widget
 * @param {() => void} onSave
 * @param {() => { getScalerRect: () => DOMRect, getDesignBounds: () => { width: number, height: number } }} getInteractionContext
 */
export function makeDraggable(el, widget, onSave, getInteractionContext) {
  const handle = el.querySelector(".widget-header");
  if (!handle) return;

  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;

  const onMouseMove = (e) => {
    if (!dragging) return;

    const { getScalerRect, getDesignBounds } = getInteractionContext();
    const rect = getScalerRect();
    const bounds = getDesignBounds();

    const x = ((e.clientX - rect.left) / rect.width) * bounds.width;
    const y = ((e.clientY - rect.top) / rect.height) * bounds.height;

    widget.x = Math.max(0, Math.min(x - offsetX, bounds.width - widget.w));
    widget.y = Math.max(0, Math.min(y - offsetY, bounds.height - widget.h));

    el.style.left = `${widget.x}px`;
    el.style.top = `${widget.y}px`;
  };

  const onMouseUp = () => {
    if (!dragging) return;

    dragging = false;
    activeDrags -= 1;
    el.classList.remove("dragging");
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    onSave();
  };

  handle.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    dragging = true;
    activeDrags += 1;

    const { getScalerRect, getDesignBounds } = getInteractionContext();
    const rect = getScalerRect();
    const bounds = getDesignBounds();
    const x = ((e.clientX - rect.left) / rect.width) * bounds.width;
    const y = ((e.clientY - rect.top) / rect.height) * bounds.height;

    offsetX = x - widget.x;
    offsetY = y - widget.y;
    el.classList.add("dragging");
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}
