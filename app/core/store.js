export function createStore(initialState) {
  let state = structuredClone(initialState);
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(updater, changedKeys = []) {
    const previousState = state;
    const partial = typeof updater === "function" ? updater(previousState) : updater;

    if (!partial || typeof partial !== "object") {
      return;
    }

    state = mergeState(previousState, partial);
    notify(previousState, state, changedKeys.length > 0 ? changedKeys : Object.keys(partial));
  }

  function update(pathOrUpdater, valueOrChangedKeys, maybeChangedKeys = []) {
    if (typeof pathOrUpdater === "string") {
      const previousState = state;
      state = setByPath(previousState, pathOrUpdater, valueOrChangedKeys);

      const rootKey = String(pathOrUpdater).split(".")[0];
      notify(previousState, state, [rootKey]);
      return;
    }

    const changedKeys = Array.isArray(valueOrChangedKeys) ? valueOrChangedKeys : maybeChangedKeys;
    setState(pathOrUpdater, changedKeys);
  }

  function subscribe(handler, keys = []) {
    const item = { handler, keys };
    listeners.add(item);
    return () => listeners.delete(item);
  }

  function notify(previousState, nextState, changedKeys) {
    listeners.forEach(item => {
      if (!Array.isArray(item.keys) || item.keys.length === 0) {
        item.handler(nextState, previousState, changedKeys);
        return;
      }

      const shouldNotify = item.keys.some(key => changedKeys.includes(key));
      if (shouldNotify) {
        item.handler(nextState, previousState, changedKeys);
      }
    });
  }

  return {
    getState,
    update,
    setState,
    subscribe
  };
}

function setByPath(base, path, value) {
  const keys = String(path || "").split(".").filter(Boolean);
  if (keys.length === 0) return base;

  const output = Array.isArray(base) ? [...base] : { ...base };
  let cursorOut = output;
  let cursorBase = base;

  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const isLast = index === keys.length - 1;

    if (isLast) {
      cursorOut[key] = value;
      continue;
    }

    const nextBase = cursorBase?.[key];
    const nextValue = isObject(nextBase)
      ? { ...nextBase }
      : {};

    cursorOut[key] = nextValue;
    cursorOut = nextValue;
    cursorBase = nextBase;
  }

  return output;
}

function mergeState(base, patch) {
  const output = { ...base };

  Object.keys(patch).forEach(key => {
    const patchValue = patch[key];
    const baseValue = base[key];

    if (isObject(baseValue) && isObject(patchValue)) {
      output[key] = mergeState(baseValue, patchValue);
      return;
    }

    output[key] = patchValue;
  });

  return output;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
