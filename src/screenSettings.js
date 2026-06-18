/**
 * @param {object} options
 * @param {HTMLElement} options.modal
 * @param {HTMLElement} options.title
 * @param {HTMLButtonElement} options.closeBtn
 * @param {HTMLInputElement} options.nameInput
 * @param {HTMLSelectElement} options.advanceModeSelect
 * @param {HTMLElement} options.timerFields
 * @param {HTMLInputElement} options.displayDurationInput
 * @param {HTMLSelectElement} options.enterEffectSelect
 * @param {HTMLInputElement} options.animationDurationInput
 * @param {HTMLButtonElement} options.deleteBtn
 * @param {() => number | null} options.getEditingScreenIndex
 * @param {(index: number) => import("./data/defaults.js").Screen | null} options.getScreen
 * @param {() => number} options.getScreenCount
 * @param {() => void} options.onChange
 * @param {() => void} options.onClose
 * @param {(index: number) => boolean} options.onDelete
 */
export function initScreenSettings({
  modal,
  title,
  closeBtn,
  nameInput,
  advanceModeSelect,
  timerFields,
  displayDurationInput,
  enterEffectSelect,
  animationDurationInput,
  deleteBtn,
  getEditingScreenIndex,
  getScreen,
  getScreenCount,
  onChange,
  onClose,
  onDelete,
}) {
  /** @type {number | null} */
  let editingIndex = null;

  function updateTimerFieldsVisibility() {
    timerFields.hidden = advanceModeSelect.value !== "timer";
  }

  function syncForm() {
    const index = getEditingScreenIndex();
    editingIndex = index;

    if (index === null) {
      modal.hidden = true;
      return;
    }

    const screen = getScreen(index);
    if (!screen) {
      modal.hidden = true;
      return;
    }

    modal.hidden = false;
    title.textContent = "Настройки экрана";
    nameInput.value = screen.name;
    advanceModeSelect.value =
      screen.transition.advanceMode === "button" ? "button" : "timer";
    displayDurationInput.value = String(screen.transition.displayDuration);
    enterEffectSelect.value = screen.transition.enterEffect;
    animationDurationInput.value = String(screen.transition.animationDuration);
    deleteBtn.disabled = getScreenCount() <= 1;

    updateTimerFieldsVisibility();
  }

  /** @param {number} index */
  function open(index) {
    editingIndex = index;
    syncForm();
  }

  function close() {
    editingIndex = null;
    modal.hidden = true;
    onClose();
  }

  closeBtn.addEventListener("click", close);

  modal.addEventListener("mousedown", (e) => {
    if (e.target === modal) {
      close();
    }
  });

  advanceModeSelect.addEventListener("change", () => {
    const screen = editingIndex !== null ? getScreen(editingIndex) : null;
    if (!screen) return;

    screen.transition.advanceMode =
      advanceModeSelect.value === "button" ? "button" : "timer";
    updateTimerFieldsVisibility();
    onChange();
  });

  nameInput.addEventListener("input", () => {
    const screen = editingIndex !== null ? getScreen(editingIndex) : null;
    if (!screen) return;
    screen.name = nameInput.value;
    onChange();
  });

  displayDurationInput.addEventListener("input", () => {
    const screen = editingIndex !== null ? getScreen(editingIndex) : null;
    if (!screen) return;
    const value = Number(displayDurationInput.value);
    if (value >= 1) {
      screen.transition.displayDuration = value;
      onChange();
    }
  });

  enterEffectSelect.addEventListener("change", () => {
    const screen = editingIndex !== null ? getScreen(editingIndex) : null;
    if (!screen) return;
    screen.transition.enterEffect = /** @type {import("./data/defaults.js").ScreenTransition["enterEffect"]} */ (
      enterEffectSelect.value
    );
    onChange();
  });

  animationDurationInput.addEventListener("input", () => {
    const screen = editingIndex !== null ? getScreen(editingIndex) : null;
    if (!screen) return;
    const value = Number(animationDurationInput.value);
    if (value >= 0 && value <= 3000) {
      screen.transition.animationDuration = value;
      onChange();
    }
  });

  deleteBtn.addEventListener("click", () => {
    if (editingIndex === null) return;
    if (getScreenCount() <= 1) return;
    if (!confirm("Удалить этот экран?")) return;

    const index = editingIndex;
    close();
    onDelete(index);
  });

  return {
    open,
    close,
    syncForm,
    getEditingScreenIndex: () => editingIndex,
  };
}
