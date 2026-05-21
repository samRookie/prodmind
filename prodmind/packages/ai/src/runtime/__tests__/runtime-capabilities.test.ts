import { describe, expect, it } from 'vitest';

import { RuntimeCapabilityRegistry } from '../capabilities/runtime-capabilities.ts';

describe('RuntimeCapabilityRegistry', () => {
  it('starts empty', () => {
    const reg = new RuntimeCapabilityRegistry();
    expect(reg.list).toEqual([]);
    expect(reg.has('anything')).toBe(false);
  });

  it('register adds capability', () => {
    const reg = new RuntimeCapabilityRegistry();
    reg.register({ name: 'test', version: '1.0', enabled: true, dependencies: [] });
    expect(reg.has('test')).toBe(true);
    expect(reg.get('test')?.version).toBe('1.0');
  });

  it('isEnabled checks flag', () => {
    const reg = new RuntimeCapabilityRegistry();
    reg.register({ name: 'a', version: '1.0', enabled: true, dependencies: [] });
    reg.register({ name: 'b', version: '1.0', enabled: false, dependencies: [] });
    expect(reg.isEnabled('a')).toBe(true);
    expect(reg.isEnabled('b')).toBe(false);
  });

  it('checkDependencies returns missing deps', () => {
    const reg = new RuntimeCapabilityRegistry();
    reg.register({ name: 'parent', version: '1.0', enabled: true, dependencies: ['child'] });
    const missing = reg.checkDependencies('parent');
    expect(missing).toHaveLength(1);
    expect(missing[0]).toContain('missing dependency: child');
  });

  it('checkDependencies returns empty for unknown capability', () => {
    const reg = new RuntimeCapabilityRegistry();
    const result = reg.checkDependencies('nonexistent');
    expect(result).toEqual(['unknown capability']);
  });

  it('enable/disable toggles', () => {
    const reg = new RuntimeCapabilityRegistry();
    reg.register({ name: 'x', version: '1.0', enabled: true, dependencies: [] });
    reg.disable('x');
    expect(reg.isEnabled('x')).toBe(false);
    reg.enable('x');
    expect(reg.isEnabled('x')).toBe(true);
  });

  it('list returns frozen array', () => {
    const reg = new RuntimeCapabilityRegistry();
    reg.register({ name: 'a', version: '1.0', enabled: true, dependencies: [] });
    expect(Object.isFrozen(reg.list)).toBe(true);
  });

  it('constructor accepts initial capabilities', () => {
    const reg = new RuntimeCapabilityRegistry([
      { name: 'a', version: '1.0', enabled: true, dependencies: [] },
      { name: 'b', version: '2.0', enabled: false, dependencies: ['a'] },
    ]);
    expect(reg.list).toHaveLength(2);
  });
});
