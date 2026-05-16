import { describe, it, expect } from 'vitest';
import { ModuleResolver } from '../module-resolver.ts';

describe('ModuleResolver', () => {
  const allFiles = [
    'src/main.ts',
    'src/utils/helper.ts',
    'src/utils/index.ts',
    'src/components/Button.tsx',
  ];

  it('delegates to PathResolver for relative imports', () => {
    const r = new ModuleResolver(allFiles);
    const result = r.resolve('./utils/helper', 'src/main.ts');
    expect(result.resolvedPath).toBe('src/utils/helper.ts');
    expect(result.isExternal).toBe(false);
  });

  it('delegates to PathResolver for external modules', () => {
    const r = new ModuleResolver(allFiles);
    const result = r.resolve('express', 'src/main.ts');
    expect(result.isExternal).toBe(true);
    expect(result.resolvedPath).toBeNull();
  });

  it('delegates to PathResolver for unresolvable relative paths', () => {
    const r = new ModuleResolver(allFiles);
    const result = r.resolve('./nonexistent', 'src/main.ts');
    expect(result.resolvedPath).toBeNull();
    expect(result.reason).toBeTruthy();
  });

  it('accepts optional tsconfig paths for @/ aliases', () => {
    const r = new ModuleResolver(allFiles, {
      baseUrl: '.',
      paths: { '@/*': ['src/*'] },
    });
    const result = r.resolve('@/utils/helper', 'src/main.ts');
    expect(result.resolvedPath).toBe('src/utils/helper.ts');
  });
});
