import { describe, it, expect } from 'vitest';
import { IgnoreRules } from '../sanitizers/ignore-rules.ts';

describe('IgnoreRules', () => {
  it('ignores node_modules directory', () => {
    const rules = new IgnoreRules();
    expect(rules.isDirectoryIgnored('node_modules')).toBe(true);
  });

  it('ignores .git directory', () => {
    const rules = new IgnoreRules();
    expect(rules.isDirectoryIgnored('.git')).toBe(true);
  });

  it('does not ignore src directory', () => {
    const rules = new IgnoreRules();
    expect(rules.isDirectoryIgnored('src')).toBe(false);
  });

  it('ignores lockfiles by name', () => {
    const rules = new IgnoreRules();
    expect(rules.isFileIgnored('package-lock.json')).toBe(true);
    expect(rules.isFileIgnored('pnpm-lock.yaml')).toBe(true);
    expect(rules.isFileIgnored('yarn.lock')).toBe(true);
  });

  it('ignores dotfiles like .DS_Store', () => {
    const rules = new IgnoreRules();
    expect(rules.isFileIgnored('.DS_Store')).toBe(true);
  });

  it('detects dangerous executable extensions', () => {
    const rules = new IgnoreRules();
    expect(rules.isDangerousExtension('.exe')).toBe(true);
    expect(rules.isDangerousExtension('.dll')).toBe(true);
    expect(rules.isDangerousExtension('.so')).toBe(true);
  });

  it('does not flag safe extensions as dangerous', () => {
    const rules = new IgnoreRules();
    expect(rules.isDangerousExtension('.ts')).toBe(false);
    expect(rules.isDangerousExtension('.json')).toBe(false);
    expect(rules.isDangerousExtension('.md')).toBe(false);
  });

  it('respects custom additional ignored directories', () => {
    const rules = new IgnoreRules({
      additionalIgnoredDirectories: new Set(['custom_cache']),
    });
    expect(rules.isDirectoryIgnored('custom_cache')).toBe(true);
    expect(rules.isDirectoryIgnored('node_modules')).toBe(true);
  });

  it('fileMatchesIgnoredDir detects path containing ignored dir', () => {
    const rules = new IgnoreRules();
    expect(rules.fileMatchesIgnoredDir('node_modules/foo/bar.ts')).toBe(true);
    expect(rules.fileMatchesIgnoredDir('src/node_modules/x.ts')).toBe(true);
    expect(rules.fileMatchesIgnoredDir('src/app.ts')).toBe(false);
  });

  it('shouldIgnore returns true for various ignored patterns', () => {
    const rules = new IgnoreRules();
    expect(rules.shouldIgnore('node_modules/foo.ts')).toBe(true);
    expect(rules.shouldIgnore('.DS_Store')).toBe(true);
    expect(rules.shouldIgnore('src/app.exe')).toBe(true);
    expect(rules.shouldIgnore('src/app.ts')).toBe(false);
  });
});
