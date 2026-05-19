export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function truncate(s: string, maxLen: number): string {
  return s.length <= maxLen ? s : s.slice(0, maxLen) + '...';
}

export function isEmpty(s: string): boolean {
  return s.trim().length === 0;
}
