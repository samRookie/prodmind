export const VERSION = '0.1.0' as const;
export const SCHEMA_VERSION = '1.0.0' as const;
export const PROMPT_VERSION = '1.0.0' as const;

export const BUILD_INFO = {
  version: VERSION,
  schemaVersion: SCHEMA_VERSION,
  promptVersion: PROMPT_VERSION,
  buildDate: '__BUILD_DATE__',
} as const;
