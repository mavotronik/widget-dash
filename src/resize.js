let activeResizes = 0;

export function isResizing() {
  return activeResizes > 0;
}

const MIN_W = 80;
const MIN_H = 60;

/**
 * @param {HTMLElement} el
 * @param {import("./data/defaults.js").Widget} widget
 * @param {() => void} onSave
 * @param {() => { getScalerRect: () => DOMRect, getDesignBounds: () => { width: number, height: number } }} getInteractionContext
 */
export function makeResizable(el, widget, onSave, getInteractionContext) {
  const handles = el.querySelectorAll(".resize-handle");
  if (!handles.length) return;

  /** @param {MouseEvent} e @param {"nw"|"ne"|"sw"|"se"} corner */
  const startResize = (e, corner) => {
    e.preventDefault();
    e.stopPropagation();

    let resizing = true;
    activeResizes += 1;

    const { getScalerRect, getDesignBounds } = getInteractionContext();
    const rect = getScalerRect();
    const bounds = getDesignBounds();

    const startX = ((e.clientX - rect.left) / rect.width) * bounds.width;
    const startY = ((e.clientY - rect.top) / rect.height) * bounds.height;
    const startLeft = widget.x;
    const startTop = widget.y;
    const startW = widget.w;
    const startH = widget.h;

    el.classList.add("resizing");

    const onMouseMove = (moveEvent) => {
      if (!resizing) return;

      const currentRect = getScalerRect();
      const currentBounds = getDesignBounds();
      const currentX =
        ((moveEvent.clientX - currentRect.left) / currentRect.width) * currentBounds.width;
      const currentY =
        ((moveEvent.clientY - currentRect.top) / currentRect.height) * currentBounds.height;

      const dx = currentX - startX;
      const dy = currentY - startY;

      let newX = startLeft;
      let newY = startTop;
      let newW = startW;
      let newH = startH;

      if (corner.includes("e")) {
        newW = Math.max(MIN_W, startW + dx);
      }
      if (corner.includes("w")) {
        newW = Math.max(MIN_W, startW - dx);
        newX = startLeft + (startW - newW);
      }
      if (corner.includes("s")) {
        newH = Math.max(MIN_H, startH + dy);
      }
      if (corner.includes("n")) {
        newH = Math.max(MIN_H, startH - dy);
        newY = startTop + (startH - newH);
      }

      newW = Math.min(newW, currentBounds.width);
      newH = Math.min(newH, currentBounds.height);
      newX = Math.max(0, Math.min(newX, currentBounds.width - newW));
      newY = Math.max(0, Math.min(newY, currentBounds.height - newH));

      if (corner.includes("e")) {
        newW = Math.min(newW, currentBounds.width - newX);
      }
      if (corner.includes("s")) {
        newH = Math.min(newH, currentBounds.height - newY);
      }

      widget.x = newX;
      widget.y = newY;
      widget.w = newW;
      widget.h = newH;

      el.style.left = `${widget.x}px`;
      el.style.top = `${widget.y}px`;
      el.style.width = `${widget.w}px`;
      el.style.height = `${widget.h}px`;
    };

    const onMouseUp = () => {
      if (!resizing) return;

      resizing = false;
      activeResizes -= 1;
      el.classList.remove("resizing");
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      onSave();
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  handles.forEach((handle) => {
    const corner = /** @type {"nw"|"ne"|"sw"|"se"} */ (handle.dataset.corner);
    handle.addEventListener("mousedown", (e) => startResize(e, corner));
  });
}
