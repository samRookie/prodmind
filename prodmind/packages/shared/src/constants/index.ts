export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;
export const MAX_FILES_PER_PROJECT = 100;
export const ALLOWED_EXTENSIONS = ['.zip'] as const;

export const MAX_AST_DEPTH = 50;
export const MAX_IMPORTS_PER_FILE = 500;
export const MAX_PARSE_TIME_MS = 30_000;
export const MAX_CONTEXT_SIZE_BYTES = 10 * 1024 * 1024;

export const MAX_CONCURRENT_JOBS = 4;
export const MAX_RETRIES = 3;
export const REQUEST_TIMEOUT_MS = 60_000;

export const TEMP_DIR_PREFIX = 'prodmind-';
export const UPLOAD_DIR = 'uploads';
export const SNAPSHOT_DIR = 'snapshots';
