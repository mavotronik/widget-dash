/** @typedef {{ key: string, label: string, width: number, height: number }} ResolutionPreset */

/** @type {ResolutionPreset[]} */
export const RESOLUTION_PRESETS = [
  { key: "desktop_fhd", label: "Desktop FHD", width: 1920, height: 1080 },
  { key: "desktop_4k", label: "Desktop 4K", width: 3840, height: 2160 },
  { key: "desktop_hd", label: "Desktop HD", width: 1280, height: 720 },
  { key: "tablet_portrait", label: "Планшет (верт.)", width: 768, height: 1024 },
  { key: "tablet_landscape", label: "Планшет (гор.)", width: 1024, height: 768 },
  { key: "phone_portrait", label: "Телефон (верт.)", width: 390, height: 844 },
  { key: "phone_landscape", label: "Телефон (гор.)", width: 844, height: 390 },
  { key: "custom", label: "Свой размер", width: 1920, height: 1080 },
];

export const MIN_DESIGN_WIDTH = 320;
export const MIN_DESIGN_HEIGHT = 240;
export const MAX_DESIGN_WIDTH = 7680;
export const MAX_DESIGN_HEIGHT = 4320;

/** @param {string} key */
export function getPresetByKey(key) {
  return RESOLUTION_PRESETS.find((p) => p.key === key) ?? RESOLUTION_PRESETS[0];
}

/**
 * @param {string} presetKey
 * @param {number} [customW]
 * @param {number} [customH]
 */
export function resolveResolution(presetKey, customW, customH) {
  const preset = getPresetByKey(presetKey);

  if (preset.key === "custom") {
    const width = clampDimension(customW ?? preset.width, MIN_DESIGN_WIDTH, MAX_DESIGN_WIDTH);
    const height = clampDimension(customH ?? preset.height, MIN_DESIGN_HEIGHT, MAX_DESIGN_HEIGHT);
    return { width, height };
  }

  return { width: preset.width, height: preset.height };
}

/** @param {number} value @param {number} min @param {number} max */
function clampDimension(value, min, max) {
  if (typeof value !== "number" || Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
export function findPresetKeyForSize(width, height) {
  const match = RESOLUTION_PRESETS.find(
    (p) => p.key !== "custom" && p.width === width && p.height === height
  );
  return match?.key ?? "custom";
}
