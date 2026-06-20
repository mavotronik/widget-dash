import { uploadImage } from "./storage.js";
import { showConfirm } from "./confirmModal.js";
import { runAction, showError } from "./toast.js";

const TYPE_NAMES = {
  clock: "Часы",
  date: "Дата",
  text: "Текст",
  image: "Картинка",
};

/**
 * @param {object} options
 * @param {HTMLElement} options.modal
 * @param {HTMLElement} options.title
 * @param {HTMLButtonElement} options.closeBtn
 * @param {HTMLElement} options.textSettings
 * @param {HTMLElement} options.imageSettings
 * @param {HTMLInputElement} options.fontSizeInput
 * @param {HTMLSelectElement} options.fontFamilySelect
 * @param {HTMLInputElement} options.colorInput
 * @param {HTMLElement} options.textContentField
 * @param {HTMLInputElement} options.textInput
 * @param {HTMLInputElement} options.urlInput
 * @param {HTMLInputElement} options.fileInput
 * @param {HTMLButtonElement} options.deleteBtn
 * @param {() => import("./data/defaults.js").Widget | null} options.getSelectedWidget
 * @param {() => void} options.onChange
 * @param {() => void} options.onRender
 * @param {() => void} options.onClose
 * @param {() => import("./toast.js").ActionResult | Promise<import("./toast.js").ActionResult>} options.onDelete
 * @param {() => import("./toast.js").ActionResult | Promise<import("./toast.js").ActionResult>} options.onSave
 */
export function initWidgetSettings({
  modal,
  title,
  closeBtn,
  textSettings,
  imageSettings,
  fontSizeInput,
  fontFamilySelect,
  colorInput,
  textContentField,
  textInput,
  urlInput,
  fileInput,
  deleteBtn,
  getSelectedWidget,
  onChange,
  onRender,
  onClose,
  onDelete,
  onSave,
}) {
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

    fontSizeInput.value = widget.fontSize ? String(widget.fontSize) : "";
    fontFamilySelect.value = widget.fontFamily || "";
    colorInput.value = widget.color || "#ffffff";

    if (widget.type === "text") {
      textContentField.hidden = false;
      textInput.value = widget.text || "";
    } else {
      textContentField.hidden = true;
    }

    if (widget.type === "image") {
      urlInput.value = widget.url || "";
    }
  }

  function openModal() {
    const widget = getSelectedWidget();
    if (!widget) return;
    syncForm();
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

  urlInput.addEventListener("change", () => {
    const widget = getSelectedWidget();
    if (!widget || widget.type !== "image") return;
    widget.url = urlInput.value.trim();
    onChange();
  });

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
