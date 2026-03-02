const listenersRegistry = new WeakMap();

export function getById(id) {
  return document.getElementById(id);
}

export function query(selector) {
  return document.querySelector(selector);
}

export function queryAll(selector) {
  return Array.from(document.querySelectorAll(selector));
}

export function on(element, eventName, handler, onceKey = "bound") {
  if (!element || typeof element.addEventListener !== "function") return;

  const key = String(onceKey || "bound");
  const hasDataset = typeof element === "object" && element !== null && "dataset" in element && element.dataset;

  if (hasDataset) {
    if (element.dataset[key]) return;
    element.addEventListener(eventName, handler);
    element.dataset[key] = "1";
    return;
  }

  let keys = listenersRegistry.get(element);
  if (!keys) {
    keys = new Set();
    listenersRegistry.set(element, keys);
  }

  if (keys.has(key)) return;
  element.addEventListener(eventName, handler);
  keys.add(key);
}

export function setHtml(element, html) {
  if (!element) return;
  element.innerHTML = html;
}

export function setText(element, value) {
  if (!element) return;
  element.textContent = String(value ?? "");
}

export function setValue(element, value) {
  if (!element) return;
  element.value = String(value ?? "");
}

export function getValue(element) {
  return String(element?.value || "").trim();
}

export function toggleClass(element, className, enabled) {
  if (!element) return;
  if (enabled) {
    element.classList.add(className);
  } else {
    element.classList.remove(className);
  }
}

export function setDisabled(element, disabled) {
  if (!element) return;
  element.disabled = Boolean(disabled);
}

export function clearInlineBorder(element) {
  if (!element) return;
  element.style.borderColor = "";
  element.style.borderWidth = "";
  element.style.borderStyle = "";
}

export function markInvalid(element) {
  if (!element) return;
  element.style.borderColor = "#dc2626";
  element.style.borderWidth = "2px";
  element.style.borderStyle = "solid";
}

export function setDatasetFlag(element, key, value) {
  if (element?.dataset == null) return;
  element.dataset[key] = value;
}

export function removeDatasetFlag(element, key) {
  if (element?.dataset == null) return;
  delete element.dataset[key];
}
