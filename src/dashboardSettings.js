import { showConfirm } from "./confirmModal.js";
import { runAction } from "./toast.js";
import {
  RESOLUTION_PRESETS,
  resolveResolution,
  findPresetKeyForSize,
} from "./data/resolutions.js";

/** @param {HTMLSelectElement} select */
function populateResolutionSelect(select) {
  select.innerHTML = "";
  for (const preset of RESOLUTION_PRESETS) {
    const option = document.createElement("option");
    option.value = preset.key;
    option.textContent = `${preset.label} (${preset.width}×${preset.height})`;
    select.appendChild(option);
  }
}

/**
 * @param {HTMLSelectElement} presetSelect
 * @param {HTMLInputElement} widthInput
 * @param {HTMLInputElement} heightInput
 */
function syncResolutionInputsFromPreset(presetSelect, widthInput, heightInput) {
  const isCustom = presetSelect.value === "custom";
  widthInput.readOnly = !isCustom;
  heightInput.readOnly = !isCustom;

  if (!isCustom) {
    const { width, height } = resolveResolution(presetSelect.value);
    widthInput.value = String(width);
    heightInput.value = String(height);
  }
}

/**
 * @param {object} options
 * @param {HTMLElement} options.modal
 * @param {HTMLElement} options.title
 * @param {HTMLButtonElement} options.closeBtn
 * @param {HTMLInputElement} options.nameInput
 * @param {HTMLInputElement} options.slugInput
 * @param {HTMLSelectElement} options.resolutionPreset
 * @param {HTMLInputElement} options.designWidthInput
 * @param {HTMLInputElement} options.designHeightInput
 * @param {HTMLButtonElement} options.saveBtn
 * @param {HTMLButtonElement} options.deleteBtn
 * @param {() => { id: number, name: string, slug: string | null }} options.getDashboardMeta
 * @param {() => import("./data/defaults.js").DashboardData} options.getData
 * @param {(width: number, height: number, opts?: { clampWidgets?: boolean }) => Promise<import("./toast.js").ActionResult>} options.onApplyResolution
 * @param {(width: number, height: number) => boolean} options.checkResolutionBounds
 * @param {(payload: { name?: string, slug?: string | null }) => Promise<void>} options.onSaveMeta
 * @param {(payload: { name: string, slug: string | null }) => void} options.onUpdateMetaLocal
 * @param {() => Promise<void>} options.onAfterSave
 * @param {() => Promise<import("./toast.js").ActionResult>} options.onDelete
 */
export function initDashboardSettings({
  modal,
  title,
  closeBtn,
  nameInput,
  slugInput,
  resolutionPreset,
  designWidthInput,
  designHeightInput,
  saveBtn,
  deleteBtn,
  getDashboardMeta,
  getData,
  onApplyResolution,
  checkResolutionBounds,
  onSaveMeta,
  onUpdateMetaLocal,
  onAfterSave,
  onDelete,
}) {
  populateResolutionSelect(resolutionPreset);

  function syncForm() {
    const meta = getDashboardMeta();
    const data = getData();

    title.textContent = "Настройки дашборда";
    nameInput.value = meta.name;
    slugInput.value = meta.slug ?? "";
    resolutionPreset.value = findPresetKeyForSize(data.designWidth, data.designHeight);
    designWidthInput.value = String(data.designWidth);
    designHeightInput.value = String(data.designHeight);
    syncResolutionInputsFromPreset(resolutionPreset, designWidthInput, designHeightInput);
  }

  function open() {
    syncForm();
    modal.hidden = false;
  }

  function close() {
    modal.hidden = true;
  }

  closeBtn.addEventListener("click", close);

  modal.addEventListener("mousedown", (e) => {
    if (e.target === modal) close();
  });

  resolutionPreset.addEventListener("change", () => {
    syncResolutionInputsFromPreset(resolutionPreset, designWidthInput, designHeightInput);
  });

  saveBtn.addEventListener("click", () => {
    void runAction("Сохранение", async () => {
      const name = nameInput.value.trim();
      if (!name) return { ok: false, error: "Укажите название" };

      const slug = slugInput.value.trim() || null;
      const { width, height } = resolveResolution(
        resolutionPreset.value,
        Number(designWidthInput.value),
        Number(designHeightInput.value)
      );

      const data = getData();
      const resolutionChanged = data.designWidth !== width || data.designHeight !== height;

      if (resolutionChanged && checkResolutionBounds(width, height)) {
        const clamp = await showConfirm({
          title: "Изменение разрешения",
          message:
            "Некоторые виджеты выходят за новые границы холста. Обрезать их позиции?",
          confirmText: "Обрезать",
          cancelText: "Отмена",
        });
        if (!clamp) return { ok: false, error: "Отменено" };

        await onSaveMeta({ name, slug });
        onUpdateMetaLocal({ name, slug });
        const result = await onApplyResolution(width, height, { clampWidgets: true });
        if (result.ok) {
          close();
          await onAfterSave();
        }
        return result;
      }

      await onSaveMeta({ name, slug });
      onUpdateMetaLocal({ name, slug });

      if (resolutionChanged) {
        const result = await onApplyResolution(width, height);
        if (result.ok) {
          close();
          await onAfterSave();
        }
        return result;
      }

      close();
      await onAfterSave();
      return { ok: true };
    });
  });

  deleteBtn.addEventListener("click", () => {
    void runAction("Удаление", async () => {
      const meta = getDashboardMeta();
      const confirmed = await showConfirm({
        title: "Удаление дашборда",
        message: `Удалить дашборд «${meta.name}»?`,
        confirmText: "Удалить",
        cancelText: "Отмена",
        danger: true,
      });
      if (!confirmed) return { ok: false, error: "Отменено" };

      const result = await onDelete();
      if (result.ok) close();
      return result;
    });
  });

  return { open, close, syncForm };
}
