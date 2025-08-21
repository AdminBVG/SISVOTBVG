export function getItem<T = string>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as T;
  }
}

export function setItem<T>(key: string, value: T) {
  try {
    const stored = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, stored);
  } catch {
    // Fallback to default string conversion to avoid crashing
    localStorage.setItem(key, String(value));
  }
}
