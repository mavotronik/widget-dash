import { fetchHaEntities } from "./storage.js";

/**
 * @param {HTMLElement} container
 * @param {object} options
 * @param {() => string} options.getValue
 * @param {(entityId: string) => void} options.onChange
 */
export function createEntityPicker(container, { getValue, onChange }) {
  container.innerHTML = "";
  container.className = "entity-picker";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "entity-picker-input";
  input.placeholder = "Поиск сущности…";
  input.autocomplete = "off";

  const selectedLabel = document.createElement("div");
  selectedLabel.className = "entity-picker-selected";

  const dropdown = document.createElement("div");
  dropdown.className = "entity-picker-dropdown";
  dropdown.hidden = true;

  container.appendChild(selectedLabel);
  container.appendChild(input);
  container.appendChild(dropdown);

  /** @type {{ entityId: string, state: string, friendlyName: string }[]} */
  let entities = [];
  let loaded = false;
  let loading = false;

  function formatEntity(entity) {
    return `${entity.entityId} - ${entity.friendlyName}`;
  }

  function updateSelectedLabel() {
    const value = getValue();
    if (!value) {
      selectedLabel.textContent = "Сущность не выбрана";
      selectedLabel.classList.add("entity-picker-selected--empty");
      return;
    }

    const match = entities.find((item) => item.entityId === value);
    selectedLabel.textContent = match ? formatEntity(match) : value;
    selectedLabel.classList.remove("entity-picker-selected--empty");
  }

  function renderDropdown(filter = "") {
    const query = filter.trim().toLowerCase();
    dropdown.innerHTML = "";

    const filtered = entities.filter((entity) => {
      if (!query) return true;
      return (
        entity.entityId.toLowerCase().includes(query) ||
        entity.friendlyName.toLowerCase().includes(query)
      );
    });

    if (!loaded && loading) {
      const empty = document.createElement("div");
      empty.className = "entity-picker-option entity-picker-option--muted";
      empty.textContent = "Загрузка…";
      dropdown.appendChild(empty);
      return;
    }

    if (!loaded) {
      const empty = document.createElement("div");
      empty.className = "entity-picker-option entity-picker-option--muted";
      empty.textContent = "Настройте Home Assistant в глобальных настройках";
      dropdown.appendChild(empty);
      return;
    }

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "entity-picker-option entity-picker-option--muted";
      empty.textContent = "Ничего не найдено";
      dropdown.appendChild(empty);
      return;
    }

    const limit = 100;
    for (const entity of filtered.slice(0, limit)) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "entity-picker-option";
      if (entity.entityId === getValue()) {
        option.classList.add("is-selected");
      }
      option.textContent = formatEntity(entity);
      option.addEventListener("click", () => {
        onChange(entity.entityId);
        input.value = "";
        dropdown.hidden = true;
        updateSelectedLabel();
      });
      dropdown.appendChild(option);
    }

    if (filtered.length > limit) {
      const more = document.createElement("div");
      more.className = "entity-picker-option entity-picker-option--muted";
      more.textContent = `Показано ${limit} из ${filtered.length}. Уточните поиск.`;
      dropdown.appendChild(more);
    }
  }

  async function ensureLoaded() {
    if (loaded || loading) return;
    loading = true;
    renderDropdown(input.value);

    try {
      entities = await fetchHaEntities();
      loaded = true;
    } catch {
      entities = [];
      loaded = false;
    } finally {
      loading = false;
      updateSelectedLabel();
      renderDropdown(input.value);
    }
  }

  input.addEventListener("focus", () => {
    dropdown.hidden = false;
    void ensureLoaded();
    renderDropdown(input.value);
  });

  input.addEventListener("input", () => {
    dropdown.hidden = false;
    renderDropdown(input.value);
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) return;
    if (!container.contains(event.target)) {
      dropdown.hidden = true;
    }
  });

  updateSelectedLabel();

  return {
    refresh: () => {
      updateSelectedLabel();
    },
    preload: () => ensureLoaded(),
  };
}
