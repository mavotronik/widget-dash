import { icon } from "./icons.js";

/** @typedef {{ ok: true } | { ok: false, error: string }} ActionResult */

const TOAST_DURATION_MS = 3500;

/** @type {HTMLElement | null} */
let container = null;

function ensureContainer() {
  if (container) return container;

  container = document.createElement("div");
  container.className = "toast-container";
  container.setAttribute("aria-live", "polite");
  container.setAttribute("aria-atomic", "true");
  document.body.appendChild(container);
  return container;
}

/**
 * @param {"success" | "error"} variant
 * @param {string} message
 * @param {string} iconName
 */
function showToast(variant, message, iconName) {
  const root = ensureContainer();

  const toast = document.createElement("div");
  toast.className = `toast toast--${variant}`;
  toast.setAttribute("role", variant === "error" ? "alert" : "status");

  const iconEl = icon(iconName, "toast-icon");
  const text = document.createElement("span");
  text.className = "toast-message";
  text.textContent = message;

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "toast-close";
  closeBtn.setAttribute("aria-label", "Закрыть");
  closeBtn.appendChild(icon("close"));

  toast.append(iconEl, text, closeBtn);
  root.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("toast--visible");
  });

  let timer = setTimeout(() => dismiss(), TOAST_DURATION_MS);

  function dismiss() {
    clearTimeout(timer);
    toast.classList.remove("toast--visible");
    toast.addEventListener(
      "transitionend",
      () => {
        toast.remove();
        if (root.childElementCount === 0) {
          root.remove();
          container = null;
        }
      },
      { once: true }
    );
  }

  closeBtn.addEventListener("click", dismiss);
}

/** @param {string} action */
export function showSuccess(action) {
  showToast("success", `${action} успешно`, "check-circle");
}

/** @param {string} message */
export function showError(message) {
  showToast("error", message, "alert-circle");
}

/**
 * @param {string} action
 * @param {() => Promise<ActionResult> | ActionResult | void} fn
 * @returns {Promise<ActionResult>}
 */
export async function runAction(action, fn) {
  try {
    const result = await fn();
    if (result && typeof result === "object" && "ok" in result) {
      if (result.ok) showSuccess(action);
      else showError(result.error);
      return result;
    }
    showSuccess(action);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Произошла ошибка";
    showError(message);
    return { ok: false, error: message };
  }
}

/**
 * @param {string} action
 * @param {number} [delayMs]
 */
export function createDebouncedActionNotifier(action, delayMs = 700) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;

  /** @param {() => Promise<ActionResult> | ActionResult} fn */
  return (fn) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void runAction(action, fn);
    }, delayMs);
  };
}
