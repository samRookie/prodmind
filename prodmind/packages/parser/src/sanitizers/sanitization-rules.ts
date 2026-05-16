import { DEFAULT_IGNORED_DIRECTORIES } from './ignored-directories.ts';
import { DEFAULT_IGNORED_FILES } from './ignored-files.ts';
import { DANGEROUS_EXTENSIONS } from './dangerous-extensions.ts';

export interface SanitizationRules {
  ignoredDirectories: ReadonlySet<string>;
  ignoredFiles: ReadonlySet<string>;
  dangerousExtensions: ReadonlySet<string>;
  maxFilePathLength: number;
  maxFileNameLength: number;
  allowHiddenFiles: boolean;
  allowDotfiles: boolean;
}

export const DEFAULT_SANITIZATION_RULES: SanitizationRules = {
  ignoredDirectories: DEFAULT_IGNORED_DIRECTORIES,
  ignoredFiles: DEFAULT_IGNORED_FILES,
  dangerousExtensions: DANGEROUS_EXTENSIONS,
  maxFilePathLength: 4096,
  maxFileNameLength: 255,
  allowHiddenFiles: false,
  allowDotfiles: false,
};

export function createSanitizationRules(
  overrides?: Partial<SanitizationRules>,
): SanitizationRules {
  return {
    ...DEFAULT_SANITIZATION_RULES,
    ...overrides,
  };
}
