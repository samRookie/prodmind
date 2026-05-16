import {
  DEFAULT_IGNORED_DIRECTORIES,
} from './ignored-directories.ts';
import {
  DEFAULT_IGNORED_FILES,
} from './ignored-files.ts';
import {
  DANGEROUS_EXTENSIONS,
} from './dangerous-extensions.ts';
import type { SanitizationRules } from './sanitization-rules.ts';
import { DEFAULT_SANITIZATION_RULES } from './sanitization-rules.ts';

export interface IgnoreRulesConfig {
  additionalIgnoredDirectories?: ReadonlySet<string>;
  additionalIgnoredFiles?: ReadonlySet<string>;
  additionalDangerousExtensions?: ReadonlySet<string>;
  allowDotfiles?: boolean;
}

export class IgnoreRules {
  private readonly config: SanitizationRules;

  public constructor(config?: IgnoreRulesConfig) {
    this.config = {
      ...DEFAULT_SANITIZATION_RULES,
      ...(config?.allowDotfiles !== undefined
        ? { allowDotfiles: config.allowDotfiles, allowHiddenFiles: config.allowDotfiles }
        : {}),
      ignoredDirectories: new Set([
        ...DEFAULT_IGNORED_DIRECTORIES,
        ...(config?.additionalIgnoredDirectories ?? []),
      ]),
      ignoredFiles: new Set([
        ...DEFAULT_IGNORED_FILES,
        ...(config?.additionalIgnoredFiles ?? []),
      ]),
      dangerousExtensions: new Set([
        ...DANGEROUS_EXTENSIONS,
        ...(config?.additionalDangerousExtensions ?? []),
      ]),
    };
  }

  public get rules(): SanitizationRules {
    return this.config;
  }

  public isDirectoryIgnored(dirName: string): boolean {
    return this.config.ignoredDirectories.has(dirName);
  }

  public isFileIgnored(fileName: string): boolean {
    return this.config.ignoredFiles.has(fileName);
  }

  public isDangerousExtension(ext: string): boolean {
    return this.config.dangerousExtensions.has(ext.toLowerCase());
  }

  public isBinaryExtension(ext: string): boolean {
    const binExts = new Set([
      '.exe', '.dll', '.so', '.dylib', '.bin', '.iso', '.img',
      '.msi', '.msp', '.scr', '.cpl', '.sys', '.drv', '.pif', '.com',
      '.app', '.deb', '.rpm', '.apk', '.appx', '.dmg', '.pkg',
      '.elf', '.ko', '.o', '.class', '.jar', '.war', '.ear',
      '.wasm', '.swf',
    ]);
    return binExts.has(ext.toLowerCase());
  }

  public fileMatchesIgnoredDir(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    for (const part of parts) {
      if (this.config.ignoredDirectories.has(part)) {
        return true;
      }
    }
    return false;
  }

  public shouldIgnore(filePath: string): boolean {
    if (this.fileMatchesIgnoredDir(filePath)) return true;

    const fileName = filePath.split(/[/\\]/).pop() ?? '';
    if (this.isFileIgnored(fileName)) return true;

    const ext = this.getExtension(filePath);
    if (this.isDangerousExtension(ext)) return true;

    if (!this.config.allowDotfiles && fileName.startsWith('.') && fileName !== '.') {
      return true;
    }

    return false;
  }

  public getExtension(filePath: string): string {
    const fileName = filePath.split(/[/\\]/).pop() ?? '';
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex <= 0) return '';
    return fileName.slice(dotIndex).toLowerCase();
  }
}
