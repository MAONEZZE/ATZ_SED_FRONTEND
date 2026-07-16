export function getDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function setDraft<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function removeDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function isSubmitted(flagKey: string): boolean {
  try {
    return localStorage.getItem(flagKey) === "true";
  } catch {
    return false;
  }
}

export function markSubmitted(flagKey: string): void {
  try {
    localStorage.setItem(flagKey, "true");
  } catch {}
}
