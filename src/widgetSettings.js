import { uploadImage } from "./storage.js";
import { showConfirm } from "./confirmModal.js";
import { runAction, showError } from "./toast.js";
import { createEntityPicker } from "./entityPicker.js";

const TYPE_NAMES = {
  clock: "Часы",
  date: "Дата",
  text: "Текст",
  image: "Картинка",
  numeric: "Число",
  button: "Кнопка",
  switch: "Переключатель",
  ping: "Ping",
};

/**
 * @param {string} value
 * @returns {number | undefined}
 */
function parseOptionalNumber(value) {
  if (!value.trim()) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

/** @param {0 | 1 | 2 | undefined} value */
function parseQos(value) {
  return value === 1 || value === 2 ? value : 0;
}

/**
 * @param {object} options
 * @param {HTMLElement} options.modal
 * @param {HTMLElement} options.title
 * @param {HTMLButtonElement} options.closeBtn
 * @param {HTMLElement} options.textSettings
 * @param {HTMLElement} options.imageSettings
 * @param {HTMLElement} options.numericSettings
 * @param {HTMLElement} options.buttonSettings
 * @param {HTMLElement} options.switchSettings
 * @param {HTMLElement} options.pingSettings
 * @param {HTMLInputElement} options.fontSizeInput
 * @param {HTMLSelectElement} options.fontFamilySelect
 * @param {HTMLInputElement} options.colorInput
 * @param {HTMLElement} options.textContentField
 * @param {HTMLInputElement} options.textInput
 * @param {HTMLElement} options.textExternalFields
 * @param {HTMLSelectElement} options.contentModeSelect
 * @param {HTMLElement} options.textExternalSourceFields
 * @param {HTMLSelectElement} options.textDataSourceSelect
 * @param {HTMLElement} options.textHaField
 * @param {HTMLElement} options.textHaPickerContainer
 * @param {HTMLElement} options.textMqttField
 * @param {HTMLInputElement} options.textMqttTopicInput
 * @param {HTMLInputElement} options.urlInput
 * @param {HTMLInputElement} options.fileInput
 * @param {HTMLSelectElement} options.numericDataSourceSelect
 * @param {HTMLElement} options.numericHaField
 * @param {HTMLElement} options.numericHaPickerContainer
 * @param {HTMLElement} options.numericMqttField
 * @param {HTMLInputElement} options.numericMqttTopicInput
 * @param {HTMLInputElement} options.numericValueInput
 * @param {HTMLInputElement} options.numericMinInput
 * @param {HTMLInputElement} options.numericMaxInput
 * @param {HTMLInputElement} options.numericStepInput
 * @param {HTMLInputElement} options.buttonLabelInput
 * @param {HTMLInputElement} options.buttonMqttTopicInput
 * @param {HTMLSelectElement} options.buttonMqttQosSelect
 * @param {HTMLTextAreaElement} options.switchPositionsInput
 * @param {HTMLInputElement} options.switchSelectedInput
 * @param {HTMLSelectElement} options.switchEmitModeSelect
 * @param {HTMLInputElement} options.switchMqttTopicInput
 * @param {HTMLSelectElement} options.switchMqttQosSelect
 * @param {HTMLInputElement} options.pingHostInput
 * @param {HTMLInputElement} options.pingAttemptsInput
 * @param {HTMLInputElement} options.pingIntervalInput
 * @param {HTMLButtonElement} options.deleteBtn
 * @param {() => import("./data/defaults.js").Widget | null} options.getSelectedWidget
 * @param {() => void} options.onChange
 * @param {(widgetId: number) => void} [options.onPingConfigChange]
 * @param {() => void} options.onRender
 * @param {() => void} options.onClose
 * @param {() => import("./toast.js").ActionResult | Promise<import("./toast.js").ActionResult>} options.onDelete
 * @param {() => import("./toast.js").ActionResult | Promise<import("./toast.js").ActionResult>} options.onSave
 */
export function initWidgetSettings(options) {
  const {
    modal,
    title,
    closeBtn,
    textSettings,
    imageSettings,
    numericSettings,
    buttonSettings,
    switchSettings,
    pingSettings,
    fontSizeInput,
    fontFamilySelect,
    colorInput,
    textContentField,
    textInput,
    textExternalFields,
    contentModeSelect,
    textExternalSourceFields,
    textDataSourceSelect,
    textHaField,
    textHaPickerContainer,
    textMqttField,
    textMqttTopicInput,
    urlInput,
    fileInput,
    numericDataSourceSelect,
    numericHaField,
    numericHaPickerContainer,
    numericMqttField,
    numericMqttTopicInput,
    numericValueInput,
    numericMinInput,
    numericMaxInput,
    numericStepInput,
    buttonLabelInput,
    buttonMqttTopicInput,
    buttonMqttQosSelect,
    switchPositionsInput,
    switchSelectedInput,
    switchEmitModeSelect,
    switchMqttTopicInput,
    switchMqttQosSelect,
    pingHostInput,
    pingAttemptsInput,
    pingIntervalInput,
    deleteBtn,
    getSelectedWidget,
    onChange,
    onPingConfigChange,
    onRender,
    onClose,
    onDelete,
    onSave,
  } = options;

  const textHaPicker = createEntityPicker(textHaPickerContainer, {
    getValue: () => getSelectedWidget()?.haEntityId ?? "",
    onChange: (entityId) => {
      const widget = getSelectedWidget();
      if (!widget || widget.type !== "text") return;
      widget.haEntityId = entityId;
      onChange();
    },
  });

  const numericHaPicker = createEntityPicker(numericHaPickerContainer, {
    getValue: () => getSelectedWidget()?.haEntityId ?? "",
    onChange: (entityId) => {
      const widget = getSelectedWidget();
      if (!widget || widget.type !== "numeric") return;
      widget.haEntityId = entityId;
      onChange();
    },
  });

  function syncTextExternalVisibility(widget) {
    const isTextWidget = widget.type === "text";
    textExternalFields.hidden = !isTextWidget;

    if (!isTextWidget) {
      textContentField.hidden = widget.type === "clock" || widget.type === "date";
      return;
    }

    const isExternal = widget.contentMode === "external";
    textContentField.hidden = isExternal;
    textExternalSourceFields.hidden = !isExternal;

    if (isExternal) {
      const isMqtt = widget.dataSource === "mqtt";
      textHaField.hidden = isMqtt;
      textMqttField.hidden = !isMqtt;
    }
  }

  function syncNumericSourceVisibility(widget) {
    const isMqtt = widget.dataSource === "mqtt";
    numericHaField.hidden = isMqtt;
    numericMqttField.hidden = !isMqtt;
  }

  function syncForm() {
    const widget = getSelectedWidget();

    if (!widget) {
      modal.hidden = true;
      return;
    }

    title.textContent = `Настройки: ${TYPE_NAMES[widget.type] || widget.type}`;

    const isTextType = widget.type === "clock" || widget.type === "date" || widget.type === "text";
    textSettings.hidden = !isTextType;
    imageSettings.hidden = widget.type !== "image";
    numericSettings.hidden = widget.type !== "numeric";
    buttonSettings.hidden = widget.type !== "button";
    switchSettings.hidden = widget.type !== "switch";
    pingSettings.hidden = widget.type !== "ping";

    fontSizeInput.value = widget.fontSize ? String(widget.fontSize) : "";
    fontFamilySelect.value = widget.fontFamily || "";
    colorInput.value = widget.color || "#ffffff";

    if (widget.type === "text") {
      contentModeSelect.value = widget.contentMode === "external" ? "external" : "local";
      textDataSourceSelect.value = widget.dataSource === "mqtt" ? "mqtt" : "ha";
      textMqttTopicInput.value = widget.mqttTopic ?? "";
      textInput.value = widget.text || "";
      syncTextExternalVisibility(widget);
      textHaPicker.refresh();
    } else if (isTextType) {
      textContentField.hidden = true;
      textExternalFields.hidden = true;
    }

    if (widget.type === "image") {
      urlInput.value = widget.url || "";
    }

    if (widget.type === "numeric") {
      numericDataSourceSelect.value = widget.dataSource === "mqtt" ? "mqtt" : "ha";
      numericMqttTopicInput.value = widget.mqttTopic ?? "";
      numericValueInput.value = String(widget.value ?? 0);
      numericMinInput.value = String(widget.min ?? 0);
      numericMaxInput.value = String(widget.max ?? 100);
      numericStepInput.value = String(widget.step ?? 1);
      syncNumericSourceVisibility(widget);
      numericHaPicker.refresh();
    }

    if (widget.type === "button") {
      buttonLabelInput.value = widget.label || "Кнопка";
      buttonMqttTopicInput.value = widget.mqttPublishTopic ?? "";
      buttonMqttQosSelect.value = String(widget.mqttQos ?? 0);
    }

    if (widget.type === "switch") {
      const positions = Array.isArray(widget.positions) ? widget.positions : [];
      switchPositionsInput.value = positions.map((item) => item.name).join("\n");
      switchSelectedInput.min = "1";
      switchSelectedInput.max = String(Math.max(positions.length, 1));
      switchSelectedInput.value = String((widget.selectedIndex ?? 0) + 1);
      switchEmitModeSelect.value = widget.emitMode === "index" ? "index" : "name";
      switchMqttTopicInput.value = widget.mqttPublishTopic ?? "";
      switchMqttQosSelect.value = String(widget.mqttQos ?? 0);
    }

    if (widget.type === "ping") {
      pingHostInput.value = widget.host ?? "";
      pingAttemptsInput.value = String(widget.attempts ?? 2);
      pingIntervalInput.value = String(widget.intervalMs ?? 1000);
    }
  }

  function openModal() {
    const widget = getSelectedWidget();
    if (!widget) return;
    syncForm();
    if (widget.type === "text" || widget.type === "numeric") {
      textHaPicker.preload();
      numericHaPicker.preload();
    }
    modal.hidden = false;
  }

  closeBtn.addEventListener("click", onClose);

  deleteBtn.addEventListener("click", async () => {
    if (!getSelectedWidget()) return;

    const confirmed = await showConfirm({
      title: "Удалить виджет?",
      message: "Виджет будет удалён без возможности восстановления.",
      confirmText: "Удалить",
      cancelText: "Отмена",
      danger: true,
    });

    if (!confirmed) return;
    await runAction("Удаление", () => onDelete());
  });

  modal.addEventListener("mousedown", (e) => {
    if (e.target === modal) {
      onClose();
    }
  });

  fontSizeInput.addEventListener("input", () => {
    const widget = getSelectedWidget();
    if (!widget) return;
    widget.fontSize = fontSizeInput.value ? Number(fontSizeInput.value) : undefined;
    onChange();
  });

  fontFamilySelect.addEventListener("change", () => {
    const widget = getSelectedWidget();
    if (!widget) return;
    widget.fontFamily = fontFamilySelect.value || undefined;
    onChange();
  });

  colorInput.addEventListener("input", () => {
    const widget = getSelectedWidget();
    if (!widget) return;
    widget.color = colorInput.value;
    onChange();
  });

  textInput.addEventListener("input", () => {
    const widget = getSelectedWidget();
    if (!widget || widget.type !== "text") return;
    widget.text = textInput.value;
    onChange();
  });

  contentModeSelect.addEventListener("change", () => {
    const widget = getSelectedWidget();
    if (!widget || widget.type !== "text") return;
    widget.contentMode = contentModeSelect.value === "external" ? "external" : "local";
    if (widget.contentMode === "external" && !widget.dataSource) {
      widget.dataSource = "ha";
    }
    syncTextExternalVisibility(widget);
    onChange();
  });

  textDataSourceSelect.addEventListener("change", () => {
    const widget = getSelectedWidget();
    if (!widget || widget.type !== "text") return;
    widget.dataSource = textDataSourceSelect.value === "mqtt" ? "mqtt" : "ha";
    syncTextExternalVisibility(widget);
    onChange();
  });

  textMqttTopicInput.addEventListener("input", () => {
    const widget = getSelectedWidget();
    if (!widget || widget.type !== "text") return;
    widget.mqttTopic = textMqttTopicInput.value.trim();
    onChange();
  });

  urlInput.addEventListener("change", () => {
    const widget = getSelectedWidget();
    if (!widget || widget.type !== "image") return;
    widget.url = urlInput.value.trim();
    onChange();
  });

  numericDataSourceSelect.addEventListener("change", () => {
    const widget = getSelectedWidget();
    if (!widget || widget.type !== "numeric") return;
    widget.dataSource = numericDataSourceSelect.value === "mqtt" ? "mqtt" : "ha";
    syncNumericSourceVisibility(widget);
    onChange();
  });

  numericMqttTopicInput.addEventListener("input", () => {
    const widget = getSelectedWidget();
    if (!widget || widget.type !== "numeric") return;
    widget.mqttTopic = numericMqttTopicInput.value.trim();
    onChange();
  });

  function updateNumericWidget() {
    const widget = getSelectedWidget();
    if (!widget || widget.type !== "numeric") return;

    const min = parseOptionalNumber(numericMinInput.value);
    const max = parseOptionalNumber(numericMaxInput.value);
    const step = parseOptionalNumber(numericStepInput.value);

    widget.min = min ?? 0;
    widget.max = max ?? 100;
    if (widget.max < widget.min) {
      [widget.min, widget.max] = [widget.max, widget.min];
    }
    widget.step = step && step > 0 ? step : 1;

    onChange();
  }

  numericMinInput.addEventListener("input", updateNumericWidget);
  numericMaxInput.addEventListener("input", updateNumericWidget);
  numericStepInput.addEventListener("input", updateNumericWidget);

  buttonLabelInput.addEventListener("input", () => {
    const widget = getSelectedWidget();
    if (!widget || widget.type !== "button") return;
    const next = buttonLabelInput.value.trim();
    widget.label = next || "Кнопка";
    onChange();
  });

  buttonMqttTopicInput.addEventListener("input", () => {
    const widget = getSelectedWidget();
    if (!widget || widget.type !== "button") return;
    widget.mqttPublishTopic = buttonMqttTopicInput.value.trim();
    onChange();
  });

  buttonMqttQosSelect.addEventListener("change", () => {
    const widget = getSelectedWidget();
    if (!widget || widget.type !== "button") return;
    widget.mqttQos = parseQos(Number(buttonMqttQosSelect.value));
    onChange();
  });

  function updateSwitchWidget() {
    const widget = getSelectedWidget();
    if (!widget || widget.type !== "switch") return;

    const positions = switchPositionsInput.value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
    widget.positions = positions.length >= 2 ? positions : [{ name: "1" }, { name: "2" }];

    const selectedOneBased = Number(switchSelectedInput.value);
    const selectedIndex = Number.isFinite(selectedOneBased)
      ? Math.max(0, Math.min(widget.positions.length - 1, Math.floor(selectedOneBased) - 1))
      : 0;
    widget.selectedIndex = selectedIndex;
    widget.emitMode = switchEmitModeSelect.value === "index" ? "index" : "name";

    switchSelectedInput.max = String(widget.positions.length);
    switchSelectedInput.value = String(selectedIndex + 1);
    onChange();
  }

  switchPositionsInput.addEventListener("input", updateSwitchWidget);
  switchSelectedInput.addEventListener("input", updateSwitchWidget);
  switchEmitModeSelect.addEventListener("change", updateSwitchWidget);

  switchMqttTopicInput.addEventListener("input", () => {
    const widget = getSelectedWidget();
    if (!widget || widget.type !== "switch") return;
    widget.mqttPublishTopic = switchMqttTopicInput.value.trim();
    onChange();
  });

  switchMqttQosSelect.addEventListener("change", () => {
    const widget = getSelectedWidget();
    if (!widget || widget.type !== "switch") return;
    widget.mqttQos = parseQos(Number(switchMqttQosSelect.value));
    onChange();
  });

  function updatePingWidget() {
    const widget = getSelectedWidget();
    if (!widget || widget.type !== "ping") return;

    widget.host = pingHostInput.value.trim();
    const attempts = Number(pingAttemptsInput.value);
    const intervalMs = Number(pingIntervalInput.value);
    widget.attempts = Number.isFinite(attempts) ? Math.min(10, Math.max(1, Math.floor(attempts))) : 2;
    widget.intervalMs = Number.isFinite(intervalMs)
      ? Math.min(60000, Math.max(500, Math.floor(intervalMs)))
      : 1000;
    widget.status = "unknown";
    onPingConfigChange?.(widget.id);
    onChange();
  }

  pingHostInput.addEventListener("input", updatePingWidget);
  pingAttemptsInput.addEventListener("input", updatePingWidget);
  pingIntervalInput.addEventListener("input", updatePingWidget);

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    const widget = getSelectedWidget();
    if (!widget || widget.type !== "image") return;

    try {
      const { url } = await uploadImage(file);
      widget.url = url;
      urlInput.value = url;
      onRender();
      await runAction("Загрузка", () => onSave());
    } catch (err) {
      console.error("Image upload failed:", err);
      showError(err instanceof Error ? err.message : "Не удалось загрузить файл");
    }

    fileInput.value = "";
  });

  return { syncForm, openModal };
}
