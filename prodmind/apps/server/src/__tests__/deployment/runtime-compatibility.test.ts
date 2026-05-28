import { describe, it, expect } from 'vitest';
import { RuntimeCompatibility } from '../../deployment/runtime-compatibility.ts';

describe('RuntimeCompatibility', () => {
  it('checks node version', () => {
    const c = new RuntimeCompatibility();
    const result = c.checkNodeVersion(process.version.slice(0, 3));
    expect(result.compatible).toBe(true);
  });

  it('fails for unsupported platform', () => {
    const c = new RuntimeCompatibility();
    const result = c.checkPlatform(['nonexistent']);
    expect(result.compatible).toBe(false);
  });
});
