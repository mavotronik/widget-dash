import { uploadImage } from "./storage.js";

/**
 * @param {object} options
 * @param {HTMLElement} options.panel
 * @param {HTMLElement} options.textSettings
 * @param {HTMLElement} options.imageSettings
 * @param {HTMLInputElement} options.fontSizeInput
 * @param {HTMLSelectElement} options.fontFamilySelect
 * @param {HTMLInputElement} options.colorInput
 * @param {HTMLElement} options.textContentField
 * @param {HTMLInputElement} options.textInput
 * @param {HTMLInputElement} options.urlInput
 * @param {HTMLInputElement} options.fileInput
 * @param {() => import("./data/defaults.js").Widget | null} options.getSelectedWidget
 * @param {() => void} options.onChange
 */
export function initWidgetSettings({
  panel,
  textSettings,
  imageSettings,
  fontSizeInput,
  fontFamilySelect,
  colorInput,
  textContentField,
  textInput,
  urlInput,
  fileInput,
  getSelectedWidget,
  onChange,
}) {
  function syncForm() {
    const widget = getSelectedWidget();

    if (!widget) {
      panel.hidden = true;
      return;
    }

    panel.hidden = false;

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
      onChange();
    } catch (err) {
      console.error("Image upload failed:", err);
    }

    fileInput.value = "";
  });

  return { syncForm };
}
