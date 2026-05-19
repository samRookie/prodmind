import { describe, it, expect } from 'vitest';
import { SemanticEngine } from '../../semantic/semantic-engine.ts';
import type { SemanticInput } from '../../semantic/types.ts';

describe('SemanticEngine', () => {
  it('produces deterministic output for identical input', () => {
    const input: SemanticInput = {
      parseResults: [
        { success: true, data: {
          path: 'src/routes/users.ts',
          language: 'TypeScript',
          symbols: [],
          imports: [],
          exports: [],
          timing: { startTime: '', endTime: '', durationMs: 0, parserVersion: 'test' },
        }},
      ],
      nodes: [
        { id: 'n1', filePath: 'src/routes/users.ts', fileHash: 'abc', nodeType: 'FILE', symbolName: null, language: 'TypeScript', metadataJson: null },
      ],
      edges: [],
      fileHashes: new Map([['src/routes/users.ts', 'abc']]),
      snapshotId: 'snap-1',
    };

    const engine = new SemanticEngine();
    const first = engine.analyze(input);
    const second = engine.analyze(input);

    expect(first.snapshotId).toBe(second.snapshotId);
    expect(first.classifications.length).toBe(second.classifications.length);
    expect(first.infraBusinessResults.length).toBe(second.infraBusinessResults.length);
    expect(first.couplingEdges.length).toBe(second.couplingEdges.length);
    expect(first.domainClusters.length).toBe(second.domainClusters.length);

    for (let i = 0; i < first.classifications.length; i++) {
      expect(first.classifications[i]!.semanticType).toBe(second.classifications[i]!.semanticType);
      expect(first.classifications[i]!.ruleStrength).toBe(second.classifications[i]!.ruleStrength);
    }

    for (let i = 0; i < first.domainClusters.length; i++) {
      expect(first.domainClusters[i]!.clusterId).toBe(second.domainClusters[i]!.clusterId);
    }
  });

  it('classifies all nodes in the input', () => {
    const input: SemanticInput = {
      parseResults: [],
      nodes: [
        { id: 'n1', filePath: 'src/routes/api.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: null, metadataJson: null },
        { id: 'n2', filePath: 'src/services/user.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: null, metadataJson: null },
        { id: 'n3', filePath: 'src/config/settings.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: null, metadataJson: null },
        { id: 'n4', filePath: 'src/__tests__/test.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: null, metadataJson: null },
      ],
      edges: [],
      fileHashes: new Map(),
      snapshotId: 'snap-1',
    };

    const engine = new SemanticEngine();
    const output = engine.analyze(input);

    expect(output.classifications.length).toBe(4);
    const sortedByPath = [...output.classifications].sort((a, b) => a.filePath.localeCompare(b.filePath));
    expect(sortedByPath[0]!.filePath).toContain('__tests__');
    expect(sortedByPath[0]!.semanticType).toBe('TESTING');
    expect(sortedByPath[1]!.filePath).toContain('config');
    expect(sortedByPath[1]!.semanticType).toBe('CONFIGURATION');
    expect(sortedByPath[2]!.filePath).toContain('routes');
    expect(sortedByPath[2]!.semanticType).toBe('API_LAYER');
    expect(sortedByPath[3]!.filePath).toContain('services');
    expect(sortedByPath[3]!.semanticType).toBe('SERVICE_LAYER');
  });

  it('includes generatedAt timestamp', () => {
    const input: SemanticInput = {
      parseResults: [],
      nodes: [{ id: 'n1', filePath: 'src/file.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: null, metadataJson: null }],
      edges: [],
      fileHashes: new Map(),
      snapshotId: 'snap-1',
    };

    const engine = new SemanticEngine();
    const output = engine.analyze(input);
    expect(output.generatedAt).toBeDefined();
    expect(() => new Date(output.generatedAt)).not.toThrow();
  });

  it('handles empty parse results gracefully', () => {
    const input: SemanticInput = {
      parseResults: [],
      nodes: [],
      edges: [],
      fileHashes: new Map(),
      snapshotId: 'snap-1',
    };

    const engine = new SemanticEngine();
    const output = engine.analyze(input);

    expect(output.classifications).toEqual([]);
    expect(output.infraBusinessResults).toEqual([]);
    expect(output.domainClusters).toEqual([]);
    expect(output.couplingEdges).toEqual([]);
  });

  it('handles failed parse results without crashing', () => {
    const input: SemanticInput = {
      parseResults: [
        { success: false, path: 'src/broken.ts', error: 'syntax error', errorType: 'MALFORMED_SYNTAX', timing: { startTime: '', endTime: '', durationMs: 0, parserVersion: 'test' } },
      ],
      nodes: [
        { id: 'n1', filePath: 'src/broken.ts', fileHash: 'abc', nodeType: 'FILE', symbolName: null, language: 'TypeScript', metadataJson: null },
      ],
      edges: [],
      fileHashes: new Map([['src/broken.ts', 'abc']]),
      snapshotId: 'snap-1',
    };

    const engine = new SemanticEngine();
    const output = engine.analyze(input);
    // Should classify the file based on path even without parsed data
    expect(output.classifications.length).toBe(1);
    expect(output.infraBusinessResults.length).toBe(1);
  });
});
