export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isUrl(value: string): boolean {
  try { new URL(value); return true; }
  catch { return false; }
}

export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}
