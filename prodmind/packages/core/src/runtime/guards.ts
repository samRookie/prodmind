import { MAX_UPLOAD_SIZE_MB, MAX_EXTRACTION_SIZE_MB, MAX_FILE_COUNT } from './limits.ts';

export function isFileTooLarge(sizeBytes: number, limitMB?: number): boolean {
  const limit = (limitMB ?? MAX_UPLOAD_SIZE_MB) * 1024 * 1024;
  return sizeBytes > limit;
}

export function isExtractionTooLarge(sizeBytes: number, limitMB?: number): boolean {
  const limit = (limitMB ?? MAX_EXTRACTION_SIZE_MB) * 1024 * 1024;
  return sizeBytes > limit;
}

export function shouldSkipFile(
  filePath: string,
  options?: {
    ignoredDirs?: ReadonlySet<string>;
    ignoredFiles?: ReadonlySet<string>;
    dangerousExtensions?: ReadonlySet<string>;
  },
): boolean {
  const ignoredDirs = options?.ignoredDirs ?? new Set<string>(['node_modules', '.git', 'dist']);
  const escapedDirs = new Set<string>();
  for (const dir of ignoredDirs) {
    escapedDirs.add(dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  }
  for (const dir of escapedDirs) {
    if (new RegExp(`(^|[/\\\\])${dir}([/\\\\]|$)`).test(filePath)) {
      return true;
    }
  }

  const ignoredFiles = options?.ignoredFiles;
  if (ignoredFiles) {
    const fileName = filePath.split(/[/\\]/).pop();
    if (fileName && ignoredFiles.has(fileName)) {
      return true;
    }
  }

  const dangerousExts = options?.dangerousExtensions;
  if (dangerousExts) {
    const ext = filePath.split('.').pop();
    if (ext && dangerousExts.has(`.${ext.toLowerCase()}`)) {
      return true;
    }
  }

  return false;
}

const DANGEROUS_PATH_PATTERNS = [
  /\.\.[/\\]/,
  /\.\.$/,
  /\\\.\.\\/,
  /\0/,
  /[<>"|?*]/,
  /^\/[/\\]/,
  /^[A-Za-z]:[/\\]/,
  /^\\\\/,
];

export function isDangerousPath(filePath: string): boolean {
  for (const pattern of DANGEROUS_PATH_PATTERNS) {
    if (pattern.test(filePath)) {
      return true;
    }
  }
  return false;
}

export function isOverFileCountLimit(count: number, limit?: number): boolean {
  return count > (limit ?? MAX_FILE_COUNT);
}
