import { isResizing } from "./resize.js";
import { applyDragSnap } from "./snap.js";

let activeDrags = 0;

export function isDragging() {
  return activeDrags > 0;
}

export function isInteracting() {
  return activeDrags > 0 || isResizing();
}

/** @param {HTMLElement | null} container */
function clearSnapGuides(container) {
  if (!container) return;
  container.querySelectorAll(".snap-guide").forEach((el) => el.remove());
}

/**
 * @param {HTMLElement | null} container
 * @param {import("./snap.js").SnapGuide[]} guides
 * @param {{ width: number, height: number }} bounds
 */
function renderSnapGuides(container, guides, bounds) {
  clearSnapGuides(container);
  if (!container || guides.length === 0) return;

  for (const guide of guides) {
    const el = document.createElement("div");
    el.className = `snap-guide snap-guide--${guide.axis}`;
    el.setAttribute("aria-hidden", "true");

    if (guide.axis === "x") {
      el.style.left = `${guide.value}px`;
      el.style.height = `${bounds.height}px`;
    } else {
      el.style.top = `${guide.value}px`;
      el.style.width = `${bounds.width}px`;
    }

    container.appendChild(el);
  }
}

/**
 * @param {HTMLElement} el
 * @param {import("./data/defaults.js").Widget} widget
 * @param {() => void} onSave
 * @param {() => {
 *   getScalerRect: () => DOMRect,
 *   getDesignBounds: () => { width: number, height: number },
 *   getOtherWidgets: (excludeId: number) => import("./data/defaults.js").Widget[],
 *   getSnapSettings: () => import("./snap.js").SnapSettings,
 *   getCanvasScaler: () => HTMLElement | null,
 * }} getInteractionContext
 */
export function makeDraggable(el, widget, onSave, getInteractionContext) {
  const handle = el.querySelector(".widget-header");
  if (!handle) return;

  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;

  const onMouseMove = (e) => {
    if (!dragging) return;

    const {
      getScalerRect,
      getDesignBounds,
      getOtherWidgets,
      getSnapSettings,
      getCanvasScaler,
    } = getInteractionContext();
    const rect = getScalerRect();
    const bounds = getDesignBounds();

    const pointerX = ((e.clientX - rect.left) / rect.width) * bounds.width;
    const pointerY = ((e.clientY - rect.top) / rect.height) * bounds.height;

    const rawX = pointerX - offsetX;
    const rawY = pointerY - offsetY;

    const snapped = applyDragSnap({
      x: rawX,
      y: rawY,
      w: widget.w,
      h: widget.h,
      others: getOtherWidgets(widget.id),
      bounds,
      settings: getSnapSettings(),
    });

    widget.x = snapped.x;
    widget.y = snapped.y;
    widget.w = snapped.w;
    widget.h = snapped.h;

    el.style.left = `${widget.x}px`;
    el.style.top = `${widget.y}px`;
    el.style.width = `${widget.w}px`;
    el.style.height = `${widget.h}px`;

    renderSnapGuides(getCanvasScaler(), snapped.guides, bounds);
  };

  const onMouseUp = () => {
    if (!dragging) return;

    dragging = false;
    activeDrags -= 1;
    el.classList.remove("dragging");
    clearSnapGuides(getInteractionContext().getCanvasScaler());
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
