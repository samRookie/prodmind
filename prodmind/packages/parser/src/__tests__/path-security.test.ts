import { describe, it, expect } from 'vitest';
import {
  isPathTraversal,
  isAbsoluteEntry,
  getEntryDepth,
  validateEntryPath,
} from '../utils/path-security.ts';

describe('isPathTraversal', () => {
  it('returns true for simple ../ traversal', () => {
    expect(isPathTraversal('../file.txt')).toBe(true);
  });

  it('returns true for deep ../../dir/ traversal', () => {
    expect(isPathTraversal('dir/../../outside.txt')).toBe(true);
  });

  it('returns false for path with .. in directory name', () => {
    expect(isPathTraversal('foo..bar/file.txt')).toBe(false);
  });

  it('returns false for normal path', () => {
    expect(isPathTraversal('dir/file.txt')).toBe(false);
  });

  it('handles mixed traversal that stays inside', () => {
    expect(isPathTraversal('dir1/dir2/../dir3/file.txt')).toBe(false);
  });

  it('returns true when traversal reaches above root from inside', () => {
    expect(isPathTraversal('dir/../../../etc/passwd')).toBe(true);
  });
});

describe('isAbsoluteEntry', () => {
  it('returns true for Unix absolute path', () => {
    expect(isAbsoluteEntry('/etc/passwd')).toBe(true);
  });

  it('returns true for Windows drive path with backslash', () => {
    expect(isAbsoluteEntry('C:\\Windows\\file.txt')).toBe(true);
  });

  it('returns true for Windows drive path with forward slash', () => {
    expect(isAbsoluteEntry('D:/file.txt')).toBe(true);
  });

  it('returns true for UNC path', () => {
    expect(isAbsoluteEntry('\\\\server\\share\\file.txt')).toBe(true);
  });

  it('returns false for relative path', () => {
    expect(isAbsoluteEntry('dir/file.txt')).toBe(false);
  });

  it('returns false for simple filename', () => {
    expect(isAbsoluteEntry('file.txt')).toBe(false);
  });
});

describe('getEntryDepth', () => {
  it('returns 0 for root file', () => {
    expect(getEntryDepth('file.txt')).toBe(0);
  });

  it('returns 1 for one-level nested file', () => {
    expect(getEntryDepth('dir/file.txt')).toBe(1);
  });

  it('returns correct depth for deeply nested file', () => {
    expect(getEntryDepth('a/b/c/d/file.txt')).toBe(4);
  });

  it('handles empty string', () => {
    expect(getEntryDepth('')).toBe(0);
  });

  it('handles trailing slash as directory entry', () => {
    expect(getEntryDepth('dir/')).toBe(0);
  });

  it('handles mixed separators', () => {
    expect(getEntryDepth('dir\\sub/file.txt')).toBe(2);
  });
});

describe('validateEntryPath', () => {
  it('returns valid for safe relative path', () => {
    expect(validateEntryPath('dir/file.txt')).toEqual({ valid: true });
  });

  it('returns TRAVERSAL for path with parent directory traversal', () => {
    expect(validateEntryPath('../file.txt')).toEqual({ valid: false, error: 'TRAVERSAL' });
  });

  it('returns ABSOLUTE for Unix absolute path', () => {
    expect(validateEntryPath('/etc/passwd')).toEqual({ valid: false, error: 'ABSOLUTE' });
  });

  it('returns DANGEROUS for path with null byte', () => {
    expect(validateEntryPath('file\0.txt')).toEqual({ valid: false, error: 'DANGEROUS' });
  });

  it('returns DANGEROUS for path with angle brackets', () => {
    expect(validateEntryPath('file<bad>.txt')).toEqual({ valid: false, error: 'DANGEROUS' });
  });
});
