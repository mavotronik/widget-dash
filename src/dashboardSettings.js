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
 * @param {HTMLInputElement} options.pingIntervalInput
 * @param {HTMLButtonElement} options.deleteBtn
 * @param {() => { id: number, name: string, slug: string | null }} options.getDashboardMeta
 * @param {() => import("./data/defaults.js").DashboardData} options.getData
 * @param {(width: number, height: number, opts?: { clampWidgets?: boolean }) => void} options.onApplyResolutionPreview
 * @param {(width: number, height: number) => boolean} options.checkResolutionBounds
 * @param {(payload: { name?: string, slug?: string | null }) => Promise<void>} options.onSaveMeta
 * @param {(payload: { name: string, slug: string | null }) => void} options.onUpdateMetaLocal
 * @param {() => Promise<import("./toast.js").ActionResult>} options.onPersistData
 * @param {() => Promise<void>} options.onAfterMetaSave
 * @param {() => void} [options.onPingIntervalChange]
 * @param {(fn: () => Promise<import("./toast.js").ActionResult> | import("./toast.js").ActionResult) => void} options.notifyPersist
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
  pingIntervalInput,
  deleteBtn,
  getDashboardMeta,
  getData,
  onApplyResolutionPreview,
  checkResolutionBounds,
  onSaveMeta,
  onUpdateMetaLocal,
  onPersistData,
  onAfterMetaSave,
  onPingIntervalChange,
  notifyPersist,
  onDelete,
}) {
  populateResolutionSelect(resolutionPreset);

  /** @type {{ name: string, slug: string | null }} */
  let lastSavedMeta = { name: "", slug: null };
  /** @type {{ width: number, height: number, pingIntervalMs: number }} */
  let lastSavedResolution = { width: 0, height: 0, pingIntervalMs: 5000 };
  let isSyncing = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let resolutionDebounceTimer = null;
  /** @type {Promise<void>} */
  let persistQueue = Promise.resolve();

  function readFormMeta() {
    return {
      name: nameInput.value.trim(),
      slug: slugInput.value.trim() || null,
    };
  }

  function readFormResolution() {
    return resolveResolution(
      resolutionPreset.value,
      Number(designWidthInput.value),
      Number(designHeightInput.value)
    );
  }

  function syncSavedStateFromCurrent() {
    const meta = getDashboardMeta();
    const data = getData();
    lastSavedMeta = { name: meta.name, slug: meta.slug ?? null };
    lastSavedResolution = {
      width: data.designWidth,
      height: data.designHeight,
      pingIntervalMs: data.pingIntervalMs ?? 5000,
    };
  }

  function syncForm() {
    isSyncing = true;
    const meta = getDashboardMeta();
    const data = getData();

    title.textContent = "Настройки дашборда";
    nameInput.value = meta.name;
    slugInput.value = meta.slug ?? "";
    resolutionPreset.value = findPresetKeyForSize(data.designWidth, data.designHeight);
    designWidthInput.value = String(data.designWidth);
    designHeightInput.value = String(data.designHeight);
    pingIntervalInput.value = String(data.pingIntervalMs ?? 5000);
    syncResolutionInputsFromPreset(resolutionPreset, designWidthInput, designHeightInput);
    syncSavedStateFromCurrent();
    isSyncing = false;
  }

  function open() {
    syncForm();
    modal.hidden = false;
  }

  function close() {
    modal.hidden = true;
  }

  function updateMetaPreview() {
    const { name, slug } = readFormMeta();
    if (!name) return;
    onUpdateMetaLocal({ name, slug });
  }

  function schedulePersist() {
    notifyPersist(async () => {
      persistQueue = persistQueue.then(() => persistChanges());
      return persistQueue;
    });
  }

  async function persistChanges() {
    const { name, slug } = readFormMeta();
    if (!name) {
      return { ok: false, error: "Укажите название" };
    }

    const { width, height } = readFormResolution();
    const pingIntervalMs = Number(pingIntervalInput.value);
    const nextPingIntervalMs = Number.isFinite(pingIntervalMs)
      ? Math.min(60000, Math.max(500, Math.floor(pingIntervalMs)))
      : 5000;
    const metaChanged =
      name !== lastSavedMeta.name || slug !== lastSavedMeta.slug;
    const resolutionChanged =
      width !== lastSavedResolution.width || height !== lastSavedResolution.height;
    const pingIntervalChanged = nextPingIntervalMs !== lastSavedResolution.pingIntervalMs;

    if (!metaChanged && !resolutionChanged && !pingIntervalChanged) {
      return { ok: true };
    }

    if (metaChanged) {
      try {
        await onSaveMeta({ name, slug });
        onUpdateMetaLocal({ name, slug });
        lastSavedMeta = { name, slug };
        await onAfterMetaSave();
      } catch (err) {
        syncForm();
        throw err;
      }
    }

    if (resolutionChanged || pingIntervalChanged) {
      const data = getData();
      data.pingIntervalMs = nextPingIntervalMs;
      const result = await onPersistData();
      if (result.ok) {
        lastSavedResolution = { width, height, pingIntervalMs: nextPingIntervalMs };
        if (pingIntervalChanged) {
          onPingIntervalChange?.();
        }
      } else {
        syncForm();
      }
      return result;
    }

    return { ok: true };
  }

  async function applyResolutionFromForm() {
    if (isSyncing) return;

    const { width, height } = readFormResolution();
    const data = getData();

    if (data.designWidth === width && data.designHeight === height) {
      return;
    }

    if (checkResolutionBounds(width, height)) {
      const clamp = await showConfirm({
        title: "Изменение разрешения",
        message:
          "Некоторые виджеты выходят за новые границы холста. Обрезать их позиции?",
        confirmText: "Обрезать",
        cancelText: "Отмена",
      });

      if (!clamp) {
        syncForm();
        return;
      }

      onApplyResolutionPreview(width, height, { clampWidgets: true });
    } else {
      onApplyResolutionPreview(width, height);
    }

    schedulePersist();
  }

  function scheduleResolutionApply() {
    if (resolutionDebounceTimer !== null) {
      clearTimeout(resolutionDebounceTimer);
    }

    resolutionDebounceTimer = setTimeout(() => {
      resolutionDebounceTimer = null;
      void applyResolutionFromForm();
    }, 700);
  }

  closeBtn.addEventListener("click", close);

  modal.addEventListener("mousedown", (e) => {
    if (e.target === modal) close();
  });

  resolutionPreset.addEventListener("change", () => {
    if (isSyncing) return;
    syncResolutionInputsFromPreset(resolutionPreset, designWidthInput, designHeightInput);
    void applyResolutionFromForm();
  });

  nameInput.addEventListener("input", () => {
    if (isSyncing) return;
    updateMetaPreview();
    schedulePersist();
  });

  slugInput.addEventListener("input", () => {
    if (isSyncing) return;
    updateMetaPreview();
    schedulePersist();
  });

  designWidthInput.addEventListener("input", () => {
    if (isSyncing) return;
    if (resolutionPreset.value !== "custom") {
      resolutionPreset.value = "custom";
      syncResolutionInputsFromPreset(resolutionPreset, designWidthInput, designHeightInput);
    }
    scheduleResolutionApply();
  });

  designHeightInput.addEventListener("input", () => {
    if (isSyncing) return;
    if (resolutionPreset.value !== "custom") {
      resolutionPreset.value = "custom";
      syncResolutionInputsFromPreset(resolutionPreset, designWidthInput, designHeightInput);
    }
    scheduleResolutionApply();
  });

  pingIntervalInput.addEventListener("input", () => {
    if (isSyncing) return;
    const pingIntervalMs = Number(pingIntervalInput.value);
    getData().pingIntervalMs = Number.isFinite(pingIntervalMs)
      ? Math.min(60000, Math.max(500, Math.floor(pingIntervalMs)))
      : 5000;
    schedulePersist();
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
