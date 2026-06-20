/**
 * @param {HTMLElement} outgoingLayer
 * @param {HTMLElement} incomingLayer
 * @param {import("./data/defaults.js").ScreenTransition} transition
 * @returns {Promise<void>}
 */
export function playTransition(outgoingLayer, incomingLayer, transition) {
  const { enterEffect, animationDuration } = transition;

  if (enterEffect === "none" || animationDuration <= 0) {
    return Promise.resolve();
  }

  const effectClass = `screen-effect-${enterEffect}`;
  outgoingLayer.classList.add("screen-layer--outgoing", effectClass);
  incomingLayer.classList.add("screen-layer--incoming", effectClass);
  outgoingLayer.style.setProperty("--transition-duration", `${animationDuration}ms`);
  incomingLayer.style.setProperty("--transition-duration", `${animationDuration}ms`);

  return new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      outgoingLayer.removeEventListener("animationend", onEnd);
      incomingLayer.removeEventListener("animationend", onEnd);
      resolve();
    };

    const onEnd = (e) => {
      if (e.target !== outgoingLayer && e.target !== incomingLayer) return;
      finish();
    };

    outgoingLayer.addEventListener("animationend", onEnd);
    incomingLayer.addEventListener("animationend", onEnd);
    setTimeout(finish, animationDuration + 50);
  });
}

/** @param {HTMLElement} parent */
export function createScreenLayer(parent) {
  const layer = document.createElement("div");
  layer.className = "screen-layer";
  parent.appendChild(layer);
  return layer;
}
