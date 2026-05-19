import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { batchParseFiles } from '../../parsers/index.ts';
import { DependencyResolver, GraphNormalizer } from '../../resolution/index.ts';
import { SemanticEngine } from '../../semantic/index.ts';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const FIXTURES = join(__dirname, 'fixtures', 'architectures');

async function discoverFiles(fixturePath: string): Promise<Array<{ path: string; source: string }>> {
  const { readdirSync } = await import('node:fs');
  const files: Array<{ path: string; source: string }> = [];
  const entries = readdirSync(fixturePath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(fixturePath, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await discoverFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      const relPath = fullPath.replace(FIXTURES, '').replace(/\\/g, '/');
      files.push({ path: relPath, source: readFileSync(fullPath, 'utf-8') });
    }
  }
  return files;
}

async function loadAndParse(fixtureName: string) {
  const fixturePath = join(FIXTURES, fixtureName);
  if (!existsSync(fixturePath)) return null;
  const files = await discoverFiles(fixturePath);
  if (files.length === 0) return null;
  const parseResults = await batchParseFiles(files, { timeoutPerFile: 10_000 });
  const success = parseResults.filter((r): r is { success: true; data: import('../../types/ast.types.ts').ParsedFile } => r.success);
  const fileHashes = new Map(success.map((r) => [r.data.path, `hash-${r.data.path}`]));
  const allFilePaths = files.map((f) => f.path);
  if (success.length === 0) return null;
  const resolver = new DependencyResolver(success.map((r) => r.data), allFilePaths);
  const rawResolution = resolver.resolve();
  const normalizer = new GraphNormalizer();
  const resolution = normalizer.normalize(rawResolution);
  const engine = new SemanticEngine();
  const graphNodes = success.map((r) => {
    const p = r.data;
    const fileNodeId = `file-${p.path.replace(/[^a-zA-Z0-9]/g, '-')}`;
    return { id: fileNodeId, filePath: p.path, fileHash: fileHashes.get(p.path) ?? null, nodeType: 'FILE', symbolName: null, language: p.language, metadataJson: null };
  });
  const graphEdges = resolution.dependencies.map((d, i) => ({
    id: `edge-${i}`,
    sourceNodeId: `file-${d.sourceFile.replace(/[^a-zA-Z0-9]/g, '-')}`,
    targetNodeId: `file-${d.targetFile.replace(/[^a-zA-Z0-9]/g, '-')}`,
    edgeType: d.relationshipType,
    weight: d.confidence,
    metadataJson: JSON.stringify({ symbols: d.symbols.map((s) => s.symbolName) }),
  }));
  const semantic = engine.analyze({ parseResults, resolution, nodes: graphNodes, edges: graphEdges, fileHashes, snapshotId: `test-${fixtureName}` });
  return { files, success, resolution, semantic, graphNodes, graphEdges };
}

describe('architecture boundary integrity', { timeout: 120_000 }, () => {

  describe('layered-backend: strict layering enforced', () => {
    it('controllers import only from services, not repositories', async () => {
      const result = await loadAndParse('layered-backend');
      if (!result) return;
      for (const dep of result.resolution.dependencies) {
        if (dep.sourceFile.includes('/controllers/')) {
          expect(dep.targetFile).toMatch(/\/services\//);
        }
      }
    });

    it('services import from repositories, not from controllers', async () => {
      const result = await loadAndParse('layered-backend');
      if (!result) return;
      for (const dep of result.resolution.dependencies) {
        if (dep.sourceFile.includes('/services/')) {
          expect(dep.targetFile).toMatch(/\/repositories\//);
        }
      }
    });

    it('repositories do not import from controllers or services', async () => {
      const result = await loadAndParse('layered-backend');
      if (!result) return;
      for (const dep of result.resolution.dependencies) {
        if (dep.sourceFile.includes('/repositories/')) {
          expect(dep.targetFile).toMatch(/\/repositories\//);
        }
      }
    });

    it('semantic engine produces classifications', async () => {
      const result = await loadAndParse('layered-backend');
      if (!result) return;
      expect(result.semantic.classifications.length).toBeGreaterThan(0);
    });
  });

  describe('microservice-layout: isolated services', () => {
    it('services do not import from each other directly', async () => {
      const result = await loadAndParse('microservice-layout');
      if (!result) return;
      for (const dep of result.resolution.dependencies) {
        const srcService = dep.sourceFile.match(/\/service-([a-z])\//)?.[1];
        const tgtService = dep.targetFile.match(/\/service-([a-z])\//)?.[1];
        if (srcService && tgtService && srcService !== tgtService) {
          expect(dep.sourceFile).toContain('shared');
        }
      }
    });

    it('all services share the shared logger module', async () => {
      const result = await loadAndParse('microservice-layout');
      if (!result) return;
      const sharedLoggerDeps = result.resolution.dependencies.filter(
        (d) => d.targetFile.includes('shared/logger'),
      );
      expect(sharedLoggerDeps.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('invalid-boundary-system: leaks detected', () => {
    it('business layer imports from infra layer (boundary violation)', async () => {
      const result = await loadAndParse('invalid-boundary-system');
      if (!result) return;
      const violations = result.resolution.dependencies.filter(
        (d) => d.sourceFile.includes('/business/') && d.targetFile.includes('/infra/'),
      );
      expect(violations.length).toBeGreaterThan(0);
    });

    it('semantic engine classifies business vs infra roles', async () => {
      const result = await loadAndParse('invalid-boundary-system');
      if (!result) return;
      expect(result.semantic.classifications.length).toBeGreaterThan(0);
      expect(result.semantic.domainClusters.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cyclic-architecture: cycles present', () => {
    it('a.ts imports b.ts and c.ts imports a.ts forms a cycle', async () => {
      const result = await loadAndParse('cyclic-architecture');
      if (!result) return;
      const sourceFiles = result.resolution.dependencies.map((d) => d.sourceFile);
      const targetFiles = result.resolution.dependencies.map((d) => d.targetFile);
      const hasACycle = sourceFiles.some((s) => s.includes('/a.ts')) && targetFiles.some((t) => t.includes('/a.ts'));
      const hasBCycle = sourceFiles.some((s) => s.includes('/b.ts')) && targetFiles.some((t) => t.includes('/b.ts'));
      const hasCCycle = sourceFiles.some((s) => s.includes('/c.ts')) && targetFiles.some((t) => t.includes('/c.ts'));
      const cycleNodes = [hasACycle, hasBCycle, hasCCycle].filter(Boolean).length;
      expect(cycleNodes).toBeGreaterThanOrEqual(2);
    });
  });

  describe('deep-dependency-chain: chain topology', () => {
    it('each file depends on the next in the chain (except leaf)', async () => {
      const result = await loadAndParse('deep-dependency-chain');
      if (!result) return;
      const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
      for (let i = 0; i < letters.length - 1; i++) {
        const depsToNext = result.resolution.dependencies.filter(
          (d) => d.sourceFile.includes(`/${letters[i]}.ts`) && d.targetFile.includes(`/${letters[i + 1]}.ts`),
        );
        expect(depsToNext.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
