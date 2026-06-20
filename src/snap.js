export const EDGE_SNAP_THRESHOLD = 8;
export const SIZE_SNAP_THRESHOLD = 12;
export const SIZE_PROXIMITY = 48;

const MIN_W = 80;
const MIN_H = 60;

/** @typedef {{ axis: 'x' | 'y', value: number }} SnapGuide */
/** @typedef {{ edgeAlign: boolean, sizeMatch: boolean }} SnapSettings */

/**
 * @param {import("./data/defaults.js").Widget} widget
 */
function getEdgeValues(widget) {
  return {
    left: widget.x,
    right: widget.x + widget.w,
    centerX: widget.x + widget.w / 2,
    top: widget.y,
    bottom: widget.y + widget.h,
    centerY: widget.y + widget.h / 2,
  };
}

/**
 * @param {Record<string, number>} movingPoints
 * @param {number[]} targetValues
 * @param {number} threshold
 */
function snapAxis(movingPoints, targetValues, threshold) {
  let bestDelta = threshold + 1;
  let bestTarget = null;
  let bestOffset = 0;

  for (const movingVal of Object.values(movingPoints)) {
    for (const targetVal of targetValues) {
      const delta = Math.abs(movingVal - targetVal);
      if (delta <= threshold && delta < bestDelta) {
        bestDelta = delta;
        bestTarget = targetVal;
        bestOffset = targetVal - movingVal;
      }
    }
  }

  if (bestTarget === null) return null;
  return { offset: bestOffset, guideValue: bestTarget };
}

/**
 * @param {{ x: number, y: number, w: number, h: number }} a
 * @param {{ x: number, y: number, w: number, h: number }} b
 */
function hasVerticalOverlap(a, b) {
  return a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * @param {{ x: number, y: number, w: number, h: number }} a
 * @param {{ x: number, y: number, w: number, h: number }} b
 */
function hasHorizontalOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x;
}

/**
 * @param {{ x: number, y: number, w: number, h: number }} a
 * @param {{ x: number, y: number, w: number, h: number }} b
 */
function horizontalGap(a, b) {
  if (a.x + a.w <= b.x) return b.x - (a.x + a.w);
  if (b.x + b.w <= a.x) return a.x - (b.x + b.w);
  return 0;
}

/**
 * @param {{ x: number, y: number, w: number, h: number }} a
 * @param {{ x: number, y: number, w: number, h: number }} b
 */
function verticalGap(a, b) {
  if (a.y + a.h <= b.y) return b.y - (a.y + a.h);
  if (b.y + b.h <= a.y) return a.y - (b.y + b.h);
  return 0;
}

/**
 * @param {{ x: number, y: number, w: number, h: number }} moving
 * @param {import("./data/defaults.js").Widget} other
 * @param {number} proximity
 */
function isNearForWidthSnap(moving, other, proximity) {
  return hasVerticalOverlap(moving, other) && horizontalGap(moving, other) <= proximity;
}

/**
 * @param {{ x: number, y: number, w: number, h: number }} moving
 * @param {import("./data/defaults.js").Widget} other
 * @param {number} proximity
 */
function isNearForHeightSnap(moving, other, proximity) {
  return hasHorizontalOverlap(moving, other) && verticalGap(moving, other) <= proximity;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {import("./data/defaults.js").Widget[]} others
 * @param {number} threshold
 */
function applyEdgeAlign(x, y, w, h, others, threshold) {
  /** @type {SnapGuide[]} */
  const guides = [];
  let newX = x;
  let newY = y;

  const xTargets = [];
  const yTargets = [];
  for (const other of others) {
    const edges = getEdgeValues(other);
    xTargets.push(edges.left, edges.right, edges.centerX);
    yTargets.push(edges.top, edges.bottom, edges.centerY);
  }

  if (xTargets.length > 0) {
    const xSnap = snapAxis(
      { left: x, right: x + w, centerX: x + w / 2 },
      xTargets,
      threshold
    );
    if (xSnap) {
      newX += xSnap.offset;
      guides.push({ axis: "x", value: xSnap.guideValue });
    }
  }

  if (yTargets.length > 0) {
    const ySnap = snapAxis(
      { top: y, bottom: y + h, centerY: y + h / 2 },
      yTargets,
      threshold
    );
    if (ySnap) {
      newY += ySnap.offset;
      guides.push({ axis: "y", value: ySnap.guideValue });
    }
  }

  return { x: newX, y: newY, guides };
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {import("./data/defaults.js").Widget[]} others
 * @param {number} threshold
 * @param {number} proximity
 */
function applySizeMatch(x, y, w, h, others, threshold, proximity) {
  let newW = w;
  let newH = h;

  for (const other of others) {
    const candidate = { x, y, w: newW, h: newH };

    if (isNearForWidthSnap(candidate, other, proximity)) {
      if (Math.abs(newW - other.w) <= threshold) {
        newW = other.w;
      }
    }

    if (isNearForHeightSnap({ x, y, w: newW, h: newH }, other, proximity)) {
      if (Math.abs(newH - other.h) <= threshold) {
        newH = other.h;
      }
    }
  }

  return {
    w: Math.max(MIN_W, newW),
    h: Math.max(MIN_H, newH),
  };
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {{ width: number, height: number }} bounds
 */
function clampToBounds(x, y, w, h, bounds) {
  const clampedW = Math.max(MIN_W, Math.min(w, bounds.width));
  const clampedH = Math.max(MIN_H, Math.min(h, bounds.height));
  const maxX = Math.max(0, bounds.width - clampedW);
  const maxY = Math.max(0, bounds.height - clampedH);

  return {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY)),
    w: clampedW,
    h: clampedH,
  };
}

/**
 * @param {object} params
 * @param {number} params.x
 * @param {number} params.y
 * @param {number} params.w
 * @param {number} params.h
 * @param {import("./data/defaults.js").Widget[]} params.others
 * @param {{ width: number, height: number }} params.bounds
 * @param {SnapSettings} params.settings
 * @returns {{ x: number, y: number, w: number, h: number, guides: SnapGuide[] }}
 */
export function applyDragSnap({ x, y, w, h, others, bounds, settings }) {
  let nextX = x;
  let nextY = y;
  let nextW = w;
  let nextH = h;
  /** @type {SnapGuide[]} */
  let guides = [];

  if (settings.sizeMatch && others.length > 0) {
    const sized = applySizeMatch(
      nextX,
      nextY,
      nextW,
      nextH,
      others,
      SIZE_SNAP_THRESHOLD,
      SIZE_PROXIMITY
    );
    nextW = sized.w;
    nextH = sized.h;
  }

  if (settings.edgeAlign && others.length > 0) {
    const aligned = applyEdgeAlign(
      nextX,
      nextY,
      nextW,
      nextH,
      others,
      EDGE_SNAP_THRESHOLD
    );
    nextX = aligned.x;
    nextY = aligned.y;
    guides = aligned.guides;
  }

  const clamped = clampToBounds(nextX, nextY, nextW, nextH, bounds);

  return {
    x: clamped.x,
    y: clamped.y,
    w: clamped.w,
    h: clamped.h,
    guides,
  };
}
