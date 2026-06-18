/**
 * @param {string} name MDI icon name without "mdi-" prefix
 * @param {string} [className]
 * @returns {HTMLElement}
 */
export function icon(name, className = "") {
  const span = document.createElement("span");
  span.className = ["mdi", `mdi-${name}`, className].filter(Boolean).join(" ");
  span.setAttribute("aria-hidden", "true");
  return span;
}

/**
 * @param {string} name
 * @param {string} text
 * @param {string} [className]
 * @returns {DocumentFragment}
 */
export function iconLabel(name, text, className = "") {
  const frag = document.createDocumentFragment();
  const btnIcon = icon(name, "btn-icon");
  const label = document.createElement("span");
  label.className = className;
  label.textContent = text;
  frag.append(btnIcon, label);
  return frag;
}

/**
 * @param {HTMLElement} el
 * @param {string} name
 * @param {string} [text]
 */
export function setIconButton(el, name, text) {
  el.innerHTML = "";
  el.classList.add("btn-with-icon");
  el.appendChild(icon(name, "btn-icon"));
  if (text) {
    const label = document.createElement("span");
    label.textContent = text;
    el.appendChild(label);
  }
}
