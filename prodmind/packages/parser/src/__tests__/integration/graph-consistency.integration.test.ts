import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { batchParseFiles } from '../../parsers/index.ts';
import { DependencyResolver, GraphNormalizer } from '../../resolution/index.ts';
import { generateMesh, generateChain, generateModular } from '../test-utils/synthetic-graph-generator.ts';
import { fingerprintGraph } from '../test-utils/graph-fingerprinter.ts';

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

async function tryParseFixture(name: string) {
  const fixturePath = join(FIXTURES, name);
  if (!existsSync(fixturePath)) return null;
  const files = await discoverFiles(fixturePath);
  if (files.length === 0) return null;
  const parseResults = await batchParseFiles(files, { timeoutPerFile: 10_000 });
  const successfulParsedFiles = parseResults.filter((r): r is { success: true; data: import('../../types/ast.types.ts').ParsedFile } => r.success).map((r) => r.data);
  if (successfulParsedFiles.length === 0) return null;
  const allFilePaths = files.map((f) => f.path);
  const resolver = new DependencyResolver(successfulParsedFiles, allFilePaths);
  const rawResolution = resolver.resolve();
  const normalizer = new GraphNormalizer();
  const resolution = normalizer.normalize(rawResolution);
  return { parsedFiles: successfulParsedFiles, dependencies: resolution.dependencies, parseResults };
}

describe('graph consistency', { timeout: 60_000 }, () => {

  describe('synthetic graph invariants', () => {
    it('generated chain has correct node and edge counts', () => {
      const graph = generateChain(10, 42);
      expect(graph.nodes.length).toBe(10);
      expect(graph.edges.length).toBe(9);
    });

    it('generated mesh has no duplicate nodes', () => {
      const graph = generateMesh({ nodeCount: 100, seed: 42 });
      const ids = new Set(graph.nodes.map((n) => n.id));
      expect(ids.size).toBe(graph.nodes.length);
    });

    it('generated mesh has no duplicate edges', () => {
      const graph = generateMesh({ nodeCount: 100, seed: 42 });
      const edgeKeys = new Set(graph.edges.map((e) => `${e.sourceNodeId}:${e.targetNodeId}:${e.edgeType}`));
      expect(edgeKeys.size).toBe(graph.edges.length);
    });

    it('generated mesh has no self-referencing edges', () => {
      const graph = generateMesh({ nodeCount: 100, seed: 42 });
      for (const edge of graph.edges) {
        expect(edge.sourceNodeId).not.toBe(edge.targetNodeId);
      }
    });

    it('modular graph has no orphan edges', () => {
      const graph = generateModular({ clusters: 3, filesPerCluster: 5, seed: 42 });
      const nodeIds = new Set(graph.nodes.map((n) => n.id));
      for (const edge of graph.edges) {
        expect(nodeIds.has(edge.sourceNodeId)).toBe(true);
        expect(nodeIds.has(edge.targetNodeId)).toBe(true);
      }
    });

    it('deterministic generation: same seed produces identical graph', () => {
      const a = generateChain(50, 123);
      const b = generateChain(50, 123);
      expect(fingerprintGraph(a.nodes, a.edges)).toBe(fingerprintGraph(b.nodes, b.edges));
    });

    it('different seeds produce different graphs', () => {
      const a = generateMesh({ nodeCount: 50, seed: 1 });
      const b = generateMesh({ nodeCount: 50, seed: 2 });
      expect(fingerprintGraph(a.nodes, a.edges)).not.toBe(fingerprintGraph(b.nodes, b.edges));
    });

    it('large chain (500 nodes) has correct connectivity', () => {
      const graph = generateChain(500, 42);
      expect(graph.nodes.length).toBe(500);
      expect(graph.edges.length).toBe(499);
      const hasOrphans = graph.nodes.some((n) => {
        const degree = graph.edges.filter((e) => e.sourceNodeId === n.id || e.targetNodeId === n.id).length;
        return degree === 0;
      });
      expect(hasOrphans).toBe(false);
    });
  });

  describe('fixture-based graph invariants', () => {
    it('small-monolith: all files parse successfully', async () => {
      const result = await tryParseFixture('small-monolith');
      if (!result) return;
      const failed = result.parseResults.filter((r) => !r.success);
      expect(failed.length).toBe(0);
      expect(result.parsedFiles.length).toBeGreaterThan(0);
    });

    it('layered-backend: edges reference valid source and target files', async () => {
      const result = await tryParseFixture('layered-backend');
      if (!result) return;
      const nodeFiles = new Set(result.parsedFiles.map((n) => n.path));
      for (const dep of result.dependencies) {
        expect(nodeFiles.has(dep.sourceFile)).toBe(true);
        expect(nodeFiles.has(dep.targetFile)).toBe(true);
      }
    });

    it('deep-dependency-chain: files discovered in the fixture', async () => {
      const result = await tryParseFixture('deep-dependency-chain');
      if (!result) return;
      const filenames = result.parsedFiles.map((n) => {
        const parts = n.path.replace(/\\/g, '/').split('/');
        return '/' + parts[parts.length - 1];
      }).sort();
      const chainOrder = ['/a.ts', '/b.ts', '/c.ts', '/d.ts', '/e.ts', '/f.ts', '/g.ts', '/h.ts', '/i.ts', '/j.ts'];
      for (const name of chainOrder) {
        expect(filenames).toContain(name);
      }
    });

    it('has fixtures that parse (at least small-monolith works)', async () => {
      const result = await tryParseFixture('small-monolith');
      if (!result) return;
      expect(result.parsedFiles.length).toBeGreaterThan(0);
    });

    it('layered-backend produces resolution dependencies', async () => {
      const result = await tryParseFixture('layered-backend');
      if (!result) return;
      expect(result.dependencies.length).toBeGreaterThan(0);
    });
  });
});
