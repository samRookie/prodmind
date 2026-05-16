import { describe, it, expect } from 'vitest';
import { PathResolver } from '../path-resolver.ts';

describe('PathResolver', () => {
  const allFiles = [
    'src/main.ts',
    'src/utils/helper.ts',
    'src/utils/index.ts',
    'src/types.ts',
    'src/components/Button.tsx',
    'src/lib/api.js',
    'src/lib/index.js',
    'src/data/config.ts',
    'src/legacy/old.jsx',
  ];

  function createResolver(tsconfigPaths?: { baseUrl?: string; paths?: Record<string, string[]> }): PathResolver {
    return new PathResolver(allFiles, tsconfigPaths);
  }

  describe('resolve', () => {
    it('marks npm packages as external', () => {
      const r = createResolver();
      const result = r.resolve('lodash', 'src/main.ts');
      expect(result.isExternal).toBe(true);
      expect(result.resolvedPath).toBeNull();
    });

    it('marks @scoped packages as external', () => {
      const r = createResolver();
      const result = r.resolve('@angular/core', 'src/main.ts');
      expect(result.isExternal).toBe(true);
      expect(result.resolvedPath).toBeNull();
    });

    it('marks bare module paths as external', () => {
      const r = createResolver();
      const result = r.resolve('src/types', 'src/main.ts');
      expect(result.isExternal).toBe(true);
      expect(result.resolvedPath).toBeNull();
    });

    it('resolves @/ tsconfig aliases as internal', () => {
      const r = createResolver({ baseUrl: '.', paths: { '@/*': ['./src/*'] } });
      const result = r.resolve('@/utils/helper', 'src/main.ts');
      expect(result.isExternal).toBe(false);
      expect(result.resolvedPath).toBe('src/utils/helper.ts');
    });

    it('resolves relative imports with extension', () => {
      const r = createResolver();
      const result = r.resolve('./utils/helper', 'src/main.ts');
      expect(result.isExternal).toBe(false);
      expect(result.resolvedPath).toBe('src/utils/helper.ts');
    });

    it('resolves relative imports without extension', () => {
      const r = createResolver();
      const result = r.resolve('./utils/helper', 'src/main.ts');
      expect(result.isExternal).toBe(false);
      expect(result.resolvedPath).toBe('src/utils/helper.ts');
    });

    it('resolves relative imports to index files for directories', () => {
      const r = createResolver();
      const result = r.resolve('./utils', 'src/main.ts');
      expect(result.isExternal).toBe(false);
      expect(result.resolvedPath).toBe('src/utils/index.ts');
    });

    it('resolves tsconfig alias with wildcard', () => {
      const r = createResolver({
        baseUrl: '.',
        paths: { '@components/*': ['src/components/*'] },
      });
      const result = r.resolve('@components/Button', 'src/main.ts');
      expect(result.isExternal).toBe(false);
      expect(result.resolvedPath).toBe('src/components/Button.tsx');
    });

    it('returns null for unresolvable relative paths', () => {
      const r = createResolver();
      const result = r.resolve('./nonexistent', 'src/main.ts');
      expect(result.resolvedPath).toBeNull();
      expect(result.isExternal).toBe(false);
      expect(result.reason).toContain('Could not resolve');
    });

    it('handles parent directory traversal', () => {
      const r = createResolver();
      const result = r.resolve('../types', 'src/utils/helper.ts');
      expect(result.isExternal).toBe(false);
      expect(result.resolvedPath).toBe('src/types.ts');
    });

    it('normalizes backslashes to forward slashes', () => {
      const r = createResolver();
      const result = r.resolve('.\\utils\\helper', 'src/main.ts');
      expect(result.isExternal).toBe(false);
      expect(result.resolvedPath).toBe('src/utils/helper.ts');
    });

    it('resolves ./legacy/old to old.jsx via extension probing', () => {
      const r = createResolver();
      const result = r.resolve('./legacy/old', 'src/main.ts');
      expect(result.resolvedPath).toBe('src/legacy/old.jsx');
    });

    it('resolves ./lib/api to api.js via extension probing', () => {
      const r = createResolver();
      const result = r.resolve('./lib/api', 'src/main.ts');
      expect(result.resolvedPath).toBe('src/lib/api.js');
    });
  });

  describe('case-insensitive fallback', () => {
    it('matches files with different casing', () => {
      const files = ['src/MyComponent.tsx'];
      const resolver = new PathResolver(files);
      const result = resolver.resolve('./mycomponent', 'src/main.ts');
      expect(result.resolvedPath).toBe('src/MyComponent.tsx');
    });
  });
});
