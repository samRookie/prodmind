import { basename, extname } from 'node:path';

const SUPPORTED_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);

const BINARY_EXTENSIONS = new Set([
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.eot',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.mp3', '.mp4', '.avi', '.mov',
  '.o', '.obj', '.lib', '.a',
  '.jar', '.war', '.class',
  '.wasm',
]);

export function shouldParseFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();

  if (BINARY_EXTENSIONS.has(ext)) return false;

  if (!SUPPORTED_EXTENSIONS.has(ext)) return false;

  const base = basename(filePath).toLowerCase();
  if (base.startsWith('.')) return false;

  return true;
}

export function getLanguage(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case '.ts':
      return 'typescript';
    case '.tsx':
      return 'tsx';
    case '.js':
      return 'javascript';
    case '.jsx':
      return 'jsx';
    default:
      return 'unknown';
  }
}

export { SUPPORTED_EXTENSIONS, BINARY_EXTENSIONS };
