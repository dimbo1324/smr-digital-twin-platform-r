const STORAGE_KEY = "smr.demoUserId";
const DEFAULT_DEMO_USER_ID = "demo-operator";
const EVENT_NAME = "smr-demo-user-changed";

export function getSelectedDemoUserId() {
  if (typeof window === "undefined") {
    return DEFAULT_DEMO_USER_ID;
  }
  return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_DEMO_USER_ID;
}

export function setSelectedDemoUserId(userId: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, userId);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: userId }));
}

export function subscribeDemoUserChange(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  window.addEventListener(EVENT_NAME, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT_NAME, listener);
    window.removeEventListener("storage", listener);
  };
}

export { DEFAULT_DEMO_USER_ID };
