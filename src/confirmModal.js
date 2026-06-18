import { icon } from "./icons.js";

/** @type {HTMLElement | null} */
let overlay = null;
/** @type {HTMLHeadingElement | null} */
let titleEl = null;
/** @type {HTMLParagraphElement | null} */
let messageEl = null;
/** @type {HTMLButtonElement | null} */
let cancelBtn = null;
/** @type {HTMLButtonElement | null} */
let confirmBtn = null;
/** @type {HTMLSpanElement | null} */
let cancelLabel = null;
/** @type {HTMLSpanElement | null} */
let confirmLabel = null;
/** @type {((value: boolean) => void) | null} */
let resolvePromise = null;

function ensureModal() {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.id = "confirmModal";
  overlay.className = "modal-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="modal-dialog modal-dialog--confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirmModalTitle" aria-describedby="confirmModalMessage">
      <div class="modal-header">
        <h3 id="confirmModalTitle"></h3>
        <button type="button" class="modal-close" id="confirmModalClose" aria-label="Закрыть"></button>
      </div>
      <div class="modal-body">
        <p id="confirmModalMessage" class="confirm-message"></p>
        <div class="confirm-actions">
          <button type="button" class="btn btn-secondary" id="confirmModalCancel"></button>
          <button type="button" class="btn" id="confirmModalConfirm"></button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  titleEl = /** @type {HTMLHeadingElement} */ (overlay.querySelector("#confirmModalTitle"));
  messageEl = /** @type {HTMLParagraphElement} */ (overlay.querySelector("#confirmModalMessage"));
  cancelBtn = /** @type {HTMLButtonElement} */ (overlay.querySelector("#confirmModalCancel"));
  confirmBtn = /** @type {HTMLButtonElement} */ (overlay.querySelector("#confirmModalConfirm"));

  const closeBtn = /** @type {HTMLButtonElement} */ (overlay.querySelector("#confirmModalClose"));
  closeBtn.appendChild(icon("close"));

  cancelLabel = document.createElement("span");
  confirmLabel = document.createElement("span");
  cancelBtn.append(icon("close", "btn-icon"), cancelLabel);
  confirmBtn.append(icon("check", "btn-icon"), confirmLabel);

  function finish(result) {
    if (!overlay || !resolvePromise) return;
    overlay.hidden = true;
    const resolve = resolvePromise;
    resolvePromise = null;
    resolve(result);
  }

  closeBtn.addEventListener("click", () => finish(false));
  cancelBtn.addEventListener("click", () => finish(false));
  confirmBtn.addEventListener("click", () => finish(true));

  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) finish(false);
  });

  document.addEventListener("keydown", (e) => {
    if (overlay?.hidden || !resolvePromise) return;
    if (e.key === "Escape") finish(false);
  });
}

/**
 * @param {object} options
 * @param {string} [options.title]
 * @param {string} options.message
 * @param {string} [options.confirmText]
 * @param {string} [options.cancelText]
 * @param {boolean} [options.danger]
 * @returns {Promise<boolean>}
 */
export function showConfirm({
  title = "Подтверждение",
  message,
  confirmText = "Подтвердить",
  cancelText = "Отмена",
  danger = false,
}) {
  ensureModal();

  titleEl.textContent = title;
  messageEl.textContent = message;
  cancelLabel.textContent = cancelText;
  confirmLabel.textContent = confirmText;
  confirmBtn.classList.toggle("btn-danger", danger);
  confirmBtn.classList.toggle("btn-primary-inline", !danger);

  overlay.hidden = false;
  confirmBtn.focus();

  return new Promise((resolve) => {
    resolvePromise = resolve;
  });
}
