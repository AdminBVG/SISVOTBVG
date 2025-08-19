export function getItem(key: string): string | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function setItem(key: string, value: string) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    localStorage.setItem(key, value);
  }
}
