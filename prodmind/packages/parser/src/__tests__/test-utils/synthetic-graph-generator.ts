import { SeededRng } from './seeded-prng.ts';
import type { MetricsNode, MetricsEdge } from '../../metrics/metrics-types.ts';
import type { ParsedFile, SymbolMetadata, ImportMetadata, ExportMetadata, SymbolType } from '../../types/ast.types.ts';

const DEFAULT_NODE_TYPES = ['FILE', 'FUNCTION', 'CLASS', 'INTERFACE', 'ENUM', 'TYPE_ALIAS', 'VARIABLE', 'MODULE'];
const DEFAULT_EDGE_TYPES = ['IMPORTS', 'DEPENDS_ON', 'CONTAINS', 'REFERENCES', 'EXPORTS'];
const DEFAULT_LANGUAGES = ['typescript', 'javascript', 'python'];

export interface SyntheticGraphConfig {
  nodeCount: number;
  edgeFactor?: number;
  seed: number;
  nodeTypes?: readonly string[];
  edgeTypes?: readonly string[];
  languages?: readonly string[];
}

export interface SyntheticGraph {
  nodes: MetricsNode[];
  edges: MetricsEdge[];
  parsedFiles?: ParsedFile[];
  snapshotId: string;
}

function generateId(prefix: string, index: number, seed: number): string {
  return `${prefix}-${seed}-${index}`;
}

function generateFilePath(rng: SeededRng, depth: number): string {
  const parts: string[] = [];
  for (let i = 0; i < depth; i++) {
    parts.push(rng.pick(['src', 'lib', 'utils', 'services', 'components', 'modules', 'shared', 'core', 'features', 'infra']));
  }
  const name = rng.pick(['index', 'main', 'utils', 'helper', 'service', 'component', 'module', 'types', 'config', 'constants']);
  const ext = rng.pick(['.ts', '.tsx', '.js', '.jsx']);
  return `/repo/${parts.join('/')}/${name}${ext}`;
}

export function generateChain(nodeCount: number, seed: number): SyntheticGraph {
  const nodes: MetricsNode[] = [];
  const edges: MetricsEdge[] = [];
  const snapshotId = `snapshot-chain-${seed}`;

  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: generateId('node', i, seed),
      filePath: `/repo/src/module-${i}.ts`,
      fileHash: `hash-${i}-${seed}`,
      nodeType: 'FILE',
      symbolName: null,
      language: 'typescript',
      metadataJson: null,
    });
  }

  for (let i = 0; i < nodeCount - 1; i++) {
    edges.push({
      id: generateId('edge', i, seed),
      sourceNodeId: generateId('node', i, seed),
      targetNodeId: generateId('node', i + 1, seed),
      edgeType: 'IMPORTS',
      weight: 1.0,
      metadataJson: null,
    });
  }

  return { nodes, edges, snapshotId };
}

export function generateMesh(config: SyntheticGraphConfig): SyntheticGraph {
  const rng = new SeededRng(config.seed);
  const nodes: MetricsNode[] = [];
  const edges: MetricsEdge[] = [];
  const edgeFactor = config.edgeFactor ?? 2;
  const snapshotId = `snapshot-mesh-${config.seed}`;
  const nodeTypes = config.nodeTypes ?? DEFAULT_NODE_TYPES;
  const edgeTypes = config.edgeTypes ?? DEFAULT_EDGE_TYPES;
  const languages = config.languages ?? DEFAULT_LANGUAGES;

  for (let i = 0; i < config.nodeCount; i++) {
    nodes.push({
      id: generateId('node', i, config.seed),
      filePath: generateFilePath(rng, rng.nextInt(1, 3)),
      fileHash: `hash-${i}-${config.seed}`,
      nodeType: rng.pick(nodeTypes),
      symbolName: i % 10 === 0 ? `symbol_${i}` : null,
      language: rng.pick(languages),
      metadataJson: null,
    });
  }

  const edgeSet = new Set<string>();
  let edgeCount = Math.floor(config.nodeCount * edgeFactor);
  let attempts = 0;
  while (edgeCount > 0 && attempts < config.nodeCount * 10) {
    attempts++;
    const src = rng.nextInt(0, config.nodeCount - 1);
    const tgt = rng.nextInt(0, config.nodeCount - 1);
    if (src === tgt) continue;
    const key = `${src}:${tgt}`;
    if (edgeSet.has(key)) continue;
    edgeSet.add(key);
    const edgeType = rng.pick(edgeTypes);
    edges.push({
      id: generateId('edge', edges.length, config.seed),
      sourceNodeId: generateId('node', src, config.seed),
      targetNodeId: generateId('node', tgt, config.seed),
      edgeType,
      weight: rng.nextFloat(0.5, 1.0),
      metadataJson: null,
    });
    edgeCount--;
  }

  return { nodes, edges, snapshotId };
}

export interface ModularConfig {
  clusters: number;
  filesPerCluster: number;
  seed: number;
  interClusterEdgeProbability?: number;
}

export function generateModular(config: ModularConfig): SyntheticGraph {
  const rng = new SeededRng(config.seed);
  const nodes: MetricsNode[] = [];
  const edges: MetricsEdge[] = [];
  const interClusterProb = config.interClusterEdgeProbability ?? 0.1;
  const snapshotId = `snapshot-modular-${config.seed}`;

  const clusterNames = ['services', 'core', 'utils', 'infra', 'components', 'features', 'shared', 'lib'];

  let nodeIndex = 0;
  let edgeIndex = 0;
  const clusterNodeIds: string[][] = [];

  for (let c = 0; c < config.clusters; c++) {
    const clusterName = clusterNames[c % clusterNames.length] ?? `cluster-${c}`;
    const ids: string[] = [];
    for (let f = 0; f < config.filesPerCluster; f++) {
      const id = generateId('node', nodeIndex, config.seed);
      nodeIndex++;
      nodes.push({
        id,
        filePath: `/repo/${clusterName}/module-${f}.ts`,
        fileHash: `hash-${id}`,
        nodeType: 'FILE',
        symbolName: null,
        language: 'typescript',
        metadataJson: null,
      });
      ids.push(id);
    }
    clusterNodeIds.push(ids);
  }

  for (const ids of clusterNodeIds) {
    for (let i = 0; i < ids.length - 1; i++) {
      edges.push({
        id: generateId('edge', edgeIndex, config.seed),
        sourceNodeId: ids[i]!,
        targetNodeId: ids[i + 1]!,
        edgeType: 'IMPORTS',
        weight: 1.0,
        metadataJson: null,
      });
      edgeIndex++;
    }
  }

  for (let ci = 0; ci < clusterNodeIds.length; ci++) {
    for (let cj = ci + 1; cj < clusterNodeIds.length; cj++) {
      if (rng.next() < interClusterProb) {
        const srcId = rng.pick(clusterNodeIds[ci]!);
        const tgtId = rng.pick(clusterNodeIds[cj]!);
        edges.push({
          id: generateId('edge', edgeIndex, config.seed),
          sourceNodeId: srcId,
          targetNodeId: tgtId,
          edgeType: 'DEPENDS_ON',
          weight: rng.nextFloat(0.3, 0.8),
          metadataJson: null,
        });
        edgeIndex++;
      }
    }
  }

  return { nodes, edges, snapshotId };
}

export function generateSyntheticParsedFiles(
  config: SyntheticGraphConfig & { symbolsPerFile?: number; importsPerFile?: number },
): { parsedFiles: ParsedFile[]; snapshotId: string } {
  const rng = new SeededRng(config.seed);
  const symbolsPerFile = config.symbolsPerFile ?? 3;
  const importsPerFile = config.importsPerFile ?? 2;
  const snapshotId = `snapshot-parsed-${config.seed}`;
  const parsedFiles: ParsedFile[] = [];
  const symbolTypes: SymbolType[] = ['FUNCTION' as SymbolType, 'CLASS' as SymbolType, 'INTERFACE' as SymbolType, 'ENUM' as SymbolType, 'TYPE_ALIAS' as SymbolType, 'VARIABLE' as SymbolType];

  for (let i = 0; i < config.nodeCount; i++) {
    const filePath = `/repo/src/module-${i}.ts`;
    const symbols: SymbolMetadata[] = [];

    for (let s = 0; s < symbolsPerFile; s++) {
      const symType = rng.pick(symbolTypes);
      symbols.push({
        name: `${symType.toLowerCase()}_${i}_${s}`,
        symbolType: symType,
        exported: rng.next() > 0.5,
        isAsync: symType === 'FUNCTION' && rng.next() > 0.5,
        location: {
          startLine: s * 10 + 1,
          startCol: 0,
          endLine: s * 10 + 5,
          endCol: 40,
        },
        dependencies: [],
      });
    }

    const imports: ImportMetadata[] = [];
    for (let im = 0; im < importsPerFile; im++) {
      const targetIdx = (i + im + 1) % config.nodeCount;
      imports.push({
        source: `./module-${targetIdx}`,
        specifiers: [`imported_${im}`],
        isDefault: im === 0,
        isNamespace: false,
        location: { startLine: im * 2 + 1, startCol: 0, endLine: im * 2 + 1, endCol: 40 },
      });
    }

    const exports: ExportMetadata[] = symbols
      .filter((s) => s.exported)
      .map((s) => ({
        name: s.name,
        symbolType: s.symbolType,
        isDefault: false,
        isNamed: true,
        location: s.location,
      }));

    parsedFiles.push({
      path: filePath,
      language: 'typescript',
      symbols,
      imports,
      exports,
      timing: {
        startTime: new Date(0).toISOString(),
        endTime: new Date(1000).toISOString(),
        durationMs: 1,
        parserVersion: 'test',
      },
    });
  }

  return { parsedFiles, snapshotId };
}

export function generateFromFixture(fixturePath: string): SyntheticGraph {
  const graph: SyntheticGraph = {
    nodes: [],
    edges: [],
    snapshotId: `fixture-${fixturePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
  };
  return graph;
}

export function generateGraph(config: SyntheticGraphConfig): SyntheticGraph {
  if (config.nodeCount <= 1) {
    return {
      nodes: [],
      edges: [],
      snapshotId: `snapshot-${config.seed}`,
    };
  }
  return generateMesh(config);
}
