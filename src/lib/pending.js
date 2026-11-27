// The application this browser created and may still owe the fee for: { id, token }.
// Session storage — it only has to survive a page reload during payment, and is gone when the
// tab closes. Every access is guarded: storage can be blocked (private mode, site settings).

const KEY = "yulo-careers:pending";

// `which` picks the form: the job application (default) or "business".
const keyOf = (which) => (which === "business" ? "yulo-careers:pending-business" : KEY);

export function savePending(value, which) {
  try {
    sessionStorage.setItem(keyOf(which), JSON.stringify(value));
  } catch {
    /* storage unavailable — the in-memory copy still works for this page */
  }
}

export function readPending(which) {
  try {
    const value = JSON.parse(sessionStorage.getItem(keyOf(which)) ?? "null");
    return value?.id && value?.token ? value : null;
  } catch {
    return null;
  }
}

export function clearPending(which) {
  try {
    sessionStorage.removeItem(keyOf(which));
  } catch {
    /* nothing to clear */
  }
}
