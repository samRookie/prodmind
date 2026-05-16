import { isDangerousPath } from '@prodmind/core/runtime';

const SEP = '/';

export function isPathTraversal(entryPath: string): boolean {
  if (entryPath.includes('..')) {
    const normalized = entryPath.replace(/\\/g, SEP);
    const parts = normalized.split(SEP);
    let depth = 0;
    for (const part of parts) {
      if (part === '..') {
        depth--;
        if (depth < 0) return true;
      } else if (part !== '.' && part !== '') {
        depth++;
      }
    }
  }
  return false;
}

export function isAbsoluteEntry(entryPath: string): boolean {
  if (entryPath.startsWith(SEP)) return true;
  if (/^[A-Za-z]:[/\\]/.test(entryPath)) return true;
  if (entryPath.startsWith('\\\\')) return true;
  return false;
}

export function getEntryDepth(entryPath: string): number {
  const normalized = entryPath.replace(/\\/g, SEP);
  const withoutTrailing = normalized.endsWith(SEP) ? normalized.slice(0, -1) : normalized;
  if (withoutTrailing === '') return 0;
  const parts = withoutTrailing.split(SEP).filter(Boolean);
  return parts.length - 1;
}

export type PathValidationResult =
  | { valid: true }
  | { valid: false; error: 'TRAVERSAL' | 'ABSOLUTE' | 'DANGEROUS' };

export function validateEntryPath(entryPath: string): PathValidationResult {
  if (isPathTraversal(entryPath)) {
    return { valid: false, error: 'TRAVERSAL' };
  }
  if (isAbsoluteEntry(entryPath)) {
    return { valid: false, error: 'ABSOLUTE' };
  }
  if (isDangerousPath(entryPath)) {
    return { valid: false, error: 'DANGEROUS' };
  }
  return { valid: true };
}
