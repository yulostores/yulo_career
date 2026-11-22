// The application this browser created and may still owe the fee for: { id, token }.
// Session storage — it only has to survive a page reload during payment, and is gone when the
// tab closes. Every access is guarded: storage can be blocked (private mode, site settings).

const KEY = "yulo-careers:pending";

export function savePending(value) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable — the in-memory copy still works for this page */
  }
}

export function readPending() {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    return value?.id && value?.token ? value : null;
  } catch {
    return null;
  }
}

export function clearPending() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
