import { initDashboard } from "./dashboard.js";
import { initWidgetSettings } from "./widgetSettings.js";
import { initScreenSettings } from "./screenSettings.js";
import { initDashboardSettings } from "./dashboardSettings.js";
import { runAction, createDebouncedActionNotifier, showError } from "./toast.js";
import {
  RESOLUTION_PRESETS,
  resolveResolution,
  findPresetKeyForSize,
} from "./data/resolutions.js";
import {
  createDashboard,
  createBlueprint,
  listBlueprints,
  getBlueprint,
  deleteDashboard,
  updateDashboardMeta,
} from "./storage.js";

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

async function main() {
  /** @type {{ syncForm: () => void } | null} */
  let widgetSettings = null;
  /** @type {ReturnType<typeof initScreenSettings> | null} */
  let screenSettings = null;
  /** @type {ReturnType<typeof initDashboardSettings> | null} */
  let dashboardSettings = null;

  /** @type {ReturnType<typeof setTimeout> | null} */
  let advanceTimer = null;

  /** @type {Awaited<ReturnType<typeof initDashboard>>} */
  let dashboardApi;

  const params = new URLSearchParams(window.location.search);
  const dashboardId = params.get("id") ? Number(params.get("id")) : undefined;
  const dashboardSlug = params.get("slug") ?? undefined;

  const newResolutionPreset = /** @type {HTMLSelectElement} */ (
    document.getElementById("newResolutionPreset")
  );
  const newDesignWidthInput = /** @type {HTMLInputElement} */ (
    document.getElementById("newDesignWidth")
  );
  const newDesignHeightInput = /** @type {HTMLInputElement} */ (
    document.getElementById("newDesignHeight")
  );

  populateResolutionSelect(newResolutionPreset);

  const AUTO_ADVANCE_KEY = "editAutoAdvanceEnabled";
  const SNAP_EDGE_ALIGN_KEY = "editSnapEdgeAlign";
  const SNAP_SIZE_MATCH_KEY = "editSnapSizeMatch";

  let autoAdvanceEnabled = sessionStorage.getItem(AUTO_ADVANCE_KEY) === "true";

  const snapEdgeAlignInput = /** @type {HTMLInputElement} */ (
    document.getElementById("snapEdgeAlign")
  );
  const snapSizeMatchInput = /** @type {HTMLInputElement} */ (
    document.getElementById("snapSizeMatch")
  );

  if (localStorage.getItem(SNAP_EDGE_ALIGN_KEY) === "false") {
    snapEdgeAlignInput.checked = false;
  }
  if (localStorage.getItem(SNAP_SIZE_MATCH_KEY) === "false") {
    snapSizeMatchInput.checked = false;
  }

  function getSnapSettings() {
    return {
      edgeAlign: snapEdgeAlignInput.checked,
      sizeMatch: snapSizeMatchInput.checked,
    };
  }

  snapEdgeAlignInput.addEventListener("change", () => {
    localStorage.setItem(SNAP_EDGE_ALIGN_KEY, String(snapEdgeAlignInput.checked));
  });

  snapSizeMatchInput.addEventListener("change", () => {
    localStorage.setItem(SNAP_SIZE_MATCH_KEY, String(snapSizeMatchInput.checked));
  });

  const autoAdvanceToggle = document.getElementById("autoAdvanceToggle");
  const autoAdvanceIcon = document.getElementById("autoAdvanceIcon");
  const autoAdvanceLabel = document.getElementById("autoAdvanceLabel");

  const notifyEdit = createDebouncedActionNotifier("Редактирование");
  const notifyDashboardSettingsSave = createDebouncedActionNotifier("Редактирование");

  function updateAutoAdvanceUi() {
    if (!autoAdvanceToggle || !autoAdvanceIcon || !autoAdvanceLabel) return;

    autoAdvanceToggle.setAttribute("aria-pressed", String(autoAdvanceEnabled));
    autoAdvanceToggle.classList.toggle("btn-secondary", !autoAdvanceEnabled);
    autoAdvanceToggle.title = autoAdvanceEnabled
      ? "Автопереход включён — нажмите, чтобы остановить"
      : "Автопереход выключен — нажмите, чтобы включить";

    autoAdvanceIcon.className = autoAdvanceEnabled
      ? "mdi mdi-motion-play btn-icon"
      : "mdi mdi-motion-pause btn-icon";
    autoAdvanceLabel.textContent = autoAdvanceEnabled ? "Автопереход" : "Автопереход выкл";
  }

  function setAutoAdvanceEnabled(enabled) {
    autoAdvanceEnabled = enabled;
    sessionStorage.setItem(AUTO_ADVANCE_KEY, String(enabled));
    updateAutoAdvanceUi();

    if (!enabled && advanceTimer !== null) {
      clearTimeout(advanceTimer);
      advanceTimer = null;
    } else if (enabled) {
      scheduleAdvance();
    }
  }

  function updateNextButtonVisibility() {
    const btn = document.getElementById("nextScreenBtn");
    if (!btn) return;
    const screen = dashboardApi.getCurrentScreen();
    btn.hidden = screen.transition.advanceMode !== "button";
  }

  function scheduleAdvance() {
    if (advanceTimer !== null) {
      clearTimeout(advanceTimer);
      advanceTimer = null;
    }

    const screen = dashboardApi.getCurrentScreen();
    updateNextButtonVisibility();

    if (!autoAdvanceEnabled) return;
    if (screen.transition.advanceMode !== "timer") return;

    advanceTimer = setTimeout(() => {
      dashboardApi.nextScreen();
    }, screen.transition.displayDuration * 1000);
  }

  dashboardApi = await initDashboard({
    settingsMode: true,
    dashboard: document.getElementById("dashboard"),
    screenTitle: document.getElementById("screenTitle"),
    screenList: document.getElementById("screenList"),
    dashboardList: document.getElementById("dashboardList"),
    primaryColorInput: document.getElementById("primaryColor"),
    backgroundColorInput: document.getElementById("backgroundColor"),
    dashboardId,
    dashboardSlug,
    viewDashboardLink: document.getElementById("viewDashboardLink"),
    onSelectionChange: () => widgetSettings?.syncForm(),
    onScreenChange: () => scheduleAdvance(),
    onOpenScreenSettings: (index) => screenSettings?.open(index),
    onOpenWidgetSettings: () => widgetSettings?.openModal(),
    onOpenDashboardSettings: () => dashboardSettings?.open(),
    onDashboardSwitch: ({ id, slug }) => {
      const urlParams = slug ? `?slug=${encodeURIComponent(slug)}` : `?id=${id}`;
      history.replaceState(null, "", `/edit.html${urlParams}`);
    },
    getSnapSettings,
  });

  dashboardApi.setOnNavigateComplete(() => scheduleAdvance());

  widgetSettings = initWidgetSettings({
    modal: document.getElementById("widgetSettingsModal"),
    title: document.getElementById("widgetSettingsTitle"),
    closeBtn: document.getElementById("widgetSettingsClose"),
    textSettings: document.getElementById("textSettings"),
    imageSettings: document.getElementById("imageSettings"),
    numericSettings: document.getElementById("numericSettings"),
    buttonSettings: document.getElementById("buttonSettings"),
    switchSettings: document.getElementById("switchSettings"),
    pingSettings: document.getElementById("pingSettings"),
    fontSizeInput: document.getElementById("widgetFontSize"),
    fontFamilySelect: document.getElementById("widgetFontFamily"),
    colorInput: document.getElementById("widgetColor"),
    textContentField: document.getElementById("textContentField"),
    textInput: document.getElementById("widgetText"),
    urlInput: document.getElementById("widgetUrl"),
    fileInput: document.getElementById("widgetFile"),
    numericValueInput: document.getElementById("widgetNumericValue"),
    numericMinInput: document.getElementById("widgetNumericMin"),
    numericMaxInput: document.getElementById("widgetNumericMax"),
    numericStepInput: document.getElementById("widgetNumericStep"),
    buttonLabelInput: document.getElementById("widgetButtonLabel"),
    switchPositionsInput: document.getElementById("widgetSwitchPositions"),
    switchSelectedInput: document.getElementById("widgetSwitchSelected"),
    switchEmitModeSelect: document.getElementById("widgetSwitchEmitMode"),
    pingHostInput: document.getElementById("widgetPingHost"),
    pingAttemptsInput: document.getElementById("widgetPingAttempts"),
    pingIntervalInput: document.getElementById("widgetPingIntervalMs"),
    deleteBtn: document.getElementById("widgetDeleteBtn"),
    getSelectedWidget: dashboardApi.getSelectedWidget,
    onChange: () => {
      dashboardApi.render();
      notifyEdit(() => dashboardApi.save());
    },
    onRender: () => dashboardApi.render(),
    onClose: () => dashboardApi.selectWidget(null),
    onDelete: () => dashboardApi.deleteSelectedWidget(),
    onSave: () => dashboardApi.save(),
  });

  screenSettings = initScreenSettings({
    modal: document.getElementById("screenSettingsModal"),
    title: document.getElementById("screenSettingsTitle"),
    closeBtn: document.getElementById("screenSettingsClose"),
    nameInput: document.getElementById("screenName"),
    advanceModeSelect: document.getElementById("screenAdvanceMode"),
    timerFields: document.getElementById("screenTimerFields"),
    displayDurationInput: document.getElementById("screenDisplayDuration"),
    enterEffectSelect: document.getElementById("screenEnterEffect"),
    animationDurationInput: document.getElementById("screenAnimationDuration"),
    deleteBtn: document.getElementById("screenDeleteBtn"),
    getEditingScreenIndex: () => screenSettings?.getEditingScreenIndex() ?? null,
    getScreen: dashboardApi.getScreen,
    getScreenCount: () => dashboardApi.getScreenCount(),
    onChange: () => {
      dashboardApi.render();
      notifyEdit(() => dashboardApi.save());
      scheduleAdvance();
    },
    onClose: () => {},
    onDelete: (index) => dashboardApi.deleteScreen(index),
  });

  dashboardSettings = initDashboardSettings({
    modal: document.getElementById("dashboardSettingsModal"),
    title: document.getElementById("dashboardSettingsTitle"),
    closeBtn: document.getElementById("dashboardSettingsClose"),
    nameInput: document.getElementById("dashboardSettingsName"),
    slugInput: document.getElementById("dashboardSettingsSlug"),
    resolutionPreset: document.getElementById("dashboardSettingsResolutionPreset"),
    designWidthInput: document.getElementById("dashboardSettingsDesignWidth"),
    designHeightInput: document.getElementById("dashboardSettingsDesignHeight"),
    deleteBtn: document.getElementById("dashboardSettingsDeleteBtn"),
    getDashboardMeta: () => dashboardApi.getDashboardMeta(),
    getData: () => dashboardApi.getData(),
    onApplyResolutionPreview: (width, height, opts) =>
      dashboardApi.applyResolutionPreview(width, height, opts),
    checkResolutionBounds: (width, height) => dashboardApi.checkResolutionBounds(width, height),
    onSaveMeta: async ({ name, slug }) => {
      await updateDashboardMeta(dashboardApi.getDashboardId(), { name, slug });
    },
    onUpdateMetaLocal: (payload) => dashboardApi.updateDashboardMetaLocal(payload),
    onPersistData: () => dashboardApi.save(),
    onAfterMetaSave: () => dashboardApi.renderDashboardList(),
    notifyPersist: notifyDashboardSettingsSave,
    onDelete: async () => {
      await deleteDashboard(dashboardApi.getDashboardId());
      await dashboardApi.switchDashboard(1);
      history.replaceState(null, "", "/edit.html?id=1");
      return { ok: true };
    },
  });

  newResolutionPreset.addEventListener("change", () => {
    syncResolutionInputsFromPreset(
      newResolutionPreset,
      newDesignWidthInput,
      newDesignHeightInput
    );
  });

  const createDashboardModal = document.getElementById("createDashboardModal");
  const newDashboardBlueprint = /** @type {HTMLSelectElement} */ (
    document.getElementById("newDashboardBlueprint")
  );

  async function refreshBlueprintOptions() {
    const blueprints = await listBlueprints();
    newDashboardBlueprint.innerHTML = '<option value="">Без шаблона</option>';
    for (const bp of blueprints) {
      const option = document.createElement("option");
      option.value = String(bp.id);
      option.textContent = bp.name;
      newDashboardBlueprint.appendChild(option);
    }
  }

  document.getElementById("createDashboardBtn").addEventListener("click", async () => {
    await refreshBlueprintOptions();
    document.getElementById("newDashboardName").value = "";
    document.getElementById("newDashboardSlug").value = "";
    newDashboardBlueprint.value = "";
    newResolutionPreset.value = "desktop_fhd";
    syncResolutionInputsFromPreset(
      newResolutionPreset,
      newDesignWidthInput,
      newDesignHeightInput
    );
    createDashboardModal.hidden = false;
  });

  document.getElementById("createDashboardClose").addEventListener("click", () => {
    createDashboardModal.hidden = true;
  });

  newDashboardBlueprint.addEventListener("change", async () => {
    const id = Number(newDashboardBlueprint.value);
    if (!id) return;

    const blueprint = await getBlueprint(id);
    if (!blueprint) return;

    newResolutionPreset.value = findPresetKeyForSize(
      blueprint.data.designWidth,
      blueprint.data.designHeight
    );
    syncResolutionInputsFromPreset(
      newResolutionPreset,
      newDesignWidthInput,
      newDesignHeightInput
    );
  });

  document.getElementById("createDashboardConfirmBtn").addEventListener("click", () => {
    void runAction("Создание", async () => {
      const name = document.getElementById("newDashboardName").value.trim();
      if (!name) return { ok: false, error: "Укажите название" };

      const slug = document.getElementById("newDashboardSlug").value.trim() || undefined;
      const blueprintId = newDashboardBlueprint.value
        ? Number(newDashboardBlueprint.value)
        : undefined;
      const { width, height } = resolveResolution(
        newResolutionPreset.value,
        Number(newDesignWidthInput.value),
        Number(newDesignHeightInput.value)
      );

      const created = await createDashboard({
        name,
        slug,
        blueprintId,
        designWidth: width,
        designHeight: height,
      });

      createDashboardModal.hidden = true;
      await dashboardApi.reload(created.data, {
        id: created.id,
        name: created.name,
        slug: created.slug,
        updatedAt: "",
      });

      const editParams = created.slug
        ? `?slug=${encodeURIComponent(created.slug)}`
        : `?id=${created.id}`;
      history.replaceState(null, "", `/edit.html${editParams}`);

      return { ok: true };
    });
  });

  const saveBlueprintModal = document.getElementById("saveBlueprintModal");

  document.getElementById("saveBlueprintBtn").addEventListener("click", () => {
    document.getElementById("blueprintName").value = dashboardApi.getDashboardMeta().name;
    document.getElementById("blueprintDescription").value = "";
    saveBlueprintModal.hidden = false;
  });

  document.getElementById("saveBlueprintClose").addEventListener("click", () => {
    saveBlueprintModal.hidden = true;
  });

  document.getElementById("saveBlueprintConfirmBtn").addEventListener("click", () => {
    void runAction("Сохранение", async () => {
      const name = document.getElementById("blueprintName").value.trim();
      if (!name) return { ok: false, error: "Укажите название" };

      const description = document.getElementById("blueprintDescription").value.trim();

      await createBlueprint({
        name,
        description: description || undefined,
        data: structuredClone(dashboardApi.getData()),
      });

      saveBlueprintModal.hidden = true;
      return { ok: true };
    });
  });

  document.getElementById("addScreenBtn").addEventListener("click", () => {
    void runAction("Добавление", () => dashboardApi.addScreen());
  });

  const primaryColorInput = document.getElementById("primaryColor");
  const backgroundColorInput = document.getElementById("backgroundColor");

  primaryColorInput?.addEventListener("input", () => {
    dashboardApi.previewTheme();
    notifyEdit(() => dashboardApi.save());
  });

  backgroundColorInput?.addEventListener("input", () => {
    dashboardApi.previewTheme();
    notifyEdit(() => dashboardApi.save());
  });

  const nextBtn = document.getElementById("nextScreenBtn");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => dashboardApi.nextScreen());
  }

  if (autoAdvanceToggle) {
    autoAdvanceToggle.addEventListener("click", () => {
      setAutoAdvanceEnabled(!autoAdvanceEnabled);
    });
  }

  updateAutoAdvanceUi();

  document.querySelectorAll("[data-widget]").forEach((btn) => {
    btn.addEventListener("click", () => {
      void runAction("Добавление", () => dashboardApi.addWidget(btn.dataset.widget));
    });
  });

  setInterval(dashboardApi.updateLiveContent, 1000);
  widgetSettings.syncForm();
  if (autoAdvanceEnabled) scheduleAdvance();
}

main().catch((err) => {
  console.error("Failed to initialize editor:", err);
  showError(err instanceof Error ? err.message : "Не удалось загрузить редактор");
});
