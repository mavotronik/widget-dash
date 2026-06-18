import { isResizing } from "./resize.js";

let activeDrags = 0;

export function isDragging() {
  return activeDrags > 0;
}

export function isInteracting() {
  return activeDrags > 0 || isResizing();
}

/** @param {HTMLElement} el @param {import("./data/defaults.js").Widget} widget @param {() => void} onSave */
export function makeDraggable(el, widget, onSave) {
  const handle = el.querySelector(".widget-header");
  if (!handle) return;

  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;

  const onMouseMove = (e) => {
    if (!dragging) return;

    widget.x = e.clientX - offsetX;
    widget.y = e.clientY - offsetY;

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
    offsetX = e.clientX - widget.x;
    offsetY = e.clientY - widget.y;
    el.classList.add("dragging");
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}
