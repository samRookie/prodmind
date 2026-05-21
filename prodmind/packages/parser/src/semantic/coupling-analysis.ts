import { createHash } from 'node:crypto';
import { CouplingType } from '@prodmind/contracts';
import type { CouplingEdgeResult } from './types.ts';

interface AnalysisNode {
  id: string;
  filePath: string;
  nodeType: string;
}

interface AnalysisEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: string;
  weight: number | null;
}

export interface CouplingAnalysisInput {
  nodes: AnalysisNode[];
  edges: AnalysisEdge[];
  snapshotId: string;
}

function stableEdgeId(snapshotId: string, source: string, target: string): string {
  const hash = createHash('sha256')
    .update(`${snapshotId}:${source}:${target}`)
    .digest('hex')
    .slice(0, 16);
  return `${snapshotId}-COUPLE-${hash}`;
}

function buildFanInFanOut(edges: AnalysisEdge[]): Map<string, { fanIn: number; fanOut: number }> {
  const stats = new Map<string, { fanIn: number; fanOut: number }>();

  for (const e of edges) {
    if (!stats.has(e.sourceNodeId)) stats.set(e.sourceNodeId, { fanIn: 0, fanOut: 0 });
    if (!stats.has(e.targetNodeId)) stats.set(e.targetNodeId, { fanIn: 0, fanOut: 0 });

    stats.get(e.sourceNodeId)!.fanOut++;
    stats.get(e.targetNodeId)!.fanIn++;
  }

  return stats;
}

function findCycles(
  nodes: AnalysisNode[],
  edges: AnalysisEdge[],
  maxCycles: number = 100,
): Set<string>[] {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    adj.get(e.sourceNodeId)?.push(e.targetNodeId);
  }

  const cycles: Set<string>[] = [];
  const color = new Map<string, number>();
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));

  for (const n of sortedNodes) color.set(n.id, WHITE);

  for (const startNode of sortedNodes) {
    if (color.get(startNode.id) !== WHITE) continue;
    if (cycles.length >= maxCycles) break;

    const stack: Array<{
      nodeId: string;
      path: string[];
      adjIdx: number;
      neighbors: string[];
    }> = [];

    const neighbors = (adj.get(startNode.id) ?? []).slice().sort();
    color.set(startNode.id, GRAY);
    stack.push({ nodeId: startNode.id, path: [startNode.id], adjIdx: 0, neighbors });

    while (stack.length > 0) {
      if (cycles.length >= maxCycles) break;
      const frame = stack[stack.length - 1]!;

      if (frame.adjIdx >= frame.neighbors.length) {
        color.set(frame.nodeId, BLACK);
        stack.pop();
        continue;
      }

      const neighbor = frame.neighbors[frame.adjIdx]!;
      frame.adjIdx++;

      const neighborColor = color.get(neighbor);
      if (neighborColor === GRAY) {
        const cycleStart = frame.path.indexOf(neighbor);
        if (cycleStart >= 0) {
          const cycle = frame.path.slice(cycleStart);
          cycle.push(neighbor);
          cycles.push(new Set(cycle));
        }
      } else if (neighborColor === WHITE) {
        color.set(neighbor, GRAY);
        const childNeighbors = (adj.get(neighbor) ?? []).slice().sort();
        stack.push({ nodeId: neighbor, path: [...frame.path, neighbor], adjIdx: 0, neighbors: childNeighbors });
      }
    }
  }

  return cycles;
}

function findTopHotspots(
  stats: Map<string, { fanIn: number; fanOut: number }>,
  topK: number,
): Array<{ nodeId: string; fanIn: number; fanOut: number; score: number }> {
  const entries: Array<{ nodeId: string; fanIn: number; fanOut: number; score: number }> = [];

  for (const [nodeId, s] of stats) {
    const score = s.fanIn * s.fanOut;
    entries.push({ nodeId, fanIn: s.fanIn, fanOut: s.fanOut, score });
  }

  entries.sort((a, b) => b.score - a.score);
  return entries.slice(0, topK);
}

export function classifyCoupling(
  sourceNodeId: string,
  targetNodeId: string,
  allNodes: AnalysisNode[],
  allEdges: AnalysisEdge[],
): { couplingType: CouplingType; strength: number } {
  const edgeCount = allEdges.filter(
    (e) =>
      (e.sourceNodeId === sourceNodeId && e.targetNodeId === targetNodeId) ||
      (e.sourceNodeId === targetNodeId && e.targetNodeId === sourceNodeId),
  ).length;

  const stats = buildFanInFanOut(allEdges);
  const sourceStats = stats.get(sourceNodeId);
  const targetStats = stats.get(targetNodeId);

  const sourceFanOut = sourceStats?.fanOut ?? 0;
  const targetFanIn = targetStats?.fanIn ?? 0;

  const cycles = findCycles(allNodes, allEdges);
  const isCyclic = cycles.some((c) => c.has(sourceNodeId) && c.has(targetNodeId));

  let couplingType: CouplingType;
  let strength: number;

  if (isCyclic) {
    couplingType = CouplingType.CYCLIC_COUPLING;
    strength = 1.0;
  } else if (edgeCount >= 3 || (sourceFanOut >= 10 && targetFanIn >= 10)) {
    couplingType = CouplingType.TIGHT_COUPLING;
    strength = 0.9;
  } else if (edgeCount >= 2 || (sourceFanOut >= 5 || targetFanIn >= 5)) {
    couplingType = CouplingType.MODERATE_COUPLING;
    strength = 0.6;
  } else {
    couplingType = CouplingType.LOOSE_COUPLING;
    strength = 0.3;
  }

  return { couplingType, strength };
}

export function computeCouplingStrength(
  sourceNodeId: string,
  targetNodeId: string,
  allEdges: AnalysisEdge[],
): number {
  const connectedEdges = allEdges.filter(
    (e) => (e.sourceNodeId === sourceNodeId && e.targetNodeId === targetNodeId) ||
           (e.sourceNodeId === targetNodeId && e.targetNodeId === sourceNodeId),
  );
  const weights = connectedEdges.map((e) => e.weight ?? 1.0);
  if (weights.length === 0) return 0;
  return weights.reduce((a, b) => a + b, 0) / weights.length;
}

export function computePropagationRisk(
  nodeId: string,
  allNodes: AnalysisNode[],
  allEdges: AnalysisEdge[],
): number {
  const stats = buildFanInFanOut(allEdges);
  const nodeStats = stats.get(nodeId);
  if (!nodeStats) return 0;

  const totalNodes = allNodes.length;
  if (totalNodes === 0) return 0;

  const fanInRatio = nodeStats.fanIn / totalNodes;
  const fanOutRatio = nodeStats.fanOut / totalNodes;

  return Math.min(1.0, (fanInRatio * 0.6 + fanOutRatio * 0.4) * 2);
}

export function detectCouplingHotspots(
  input: CouplingAnalysisInput,
  topK: number = 10,
): CouplingEdgeResult[] {
  const stats = buildFanInFanOut(input.edges);
  const hotspots = findTopHotspots(stats, topK);

  const results: CouplingEdgeResult[] = [];

  for (const hotspot of hotspots) {
    const connectedEdges = input.edges.filter(
      (e) => e.sourceNodeId === hotspot.nodeId || e.targetNodeId === hotspot.nodeId,
    );

    for (const edge of connectedEdges.slice(0, 5)) {
      const { couplingType, strength } = classifyCoupling(
        edge.sourceNodeId,
        edge.targetNodeId,
        input.nodes,
        input.edges,
      );

      const propagationRisk = computePropagationRisk(
        hotspot.nodeId,
        input.nodes,
        input.edges,
      );

      results.push({
        id: stableEdgeId(input.snapshotId, edge.sourceNodeId, edge.targetNodeId),
        snapshotId: input.snapshotId,
        sourceNodeId: edge.sourceNodeId,
        targetNodeId: edge.targetNodeId,
        couplingType,
        couplingStrength: strength,
        propagationRisk,
        metadataJson: JSON.stringify({
          fanIn: hotspot.fanIn,
          fanOut: hotspot.fanOut,
          score: hotspot.score,
        }),
      });
    }
  }

  return results;
}

export function analyzeDirectEdges(
  input: CouplingAnalysisInput,
): CouplingEdgeResult[] {
  const results: CouplingEdgeResult[] = [];
  const processed = new Set<string>();

  const sortedEdges = [...input.edges].sort((a, b) => a.id.localeCompare(b.id));

  for (const edge of sortedEdges) {
    const key = [edge.sourceNodeId, edge.targetNodeId].sort().join(':');
    if (processed.has(key)) continue;
    processed.add(key);

    const { couplingType, strength } = classifyCoupling(
      edge.sourceNodeId,
      edge.targetNodeId,
      input.nodes,
      input.edges,
    );

    const propagationRisk = computePropagationRisk(
      edge.sourceNodeId,
      input.nodes,
      input.edges,
    );

    results.push({
      id: stableEdgeId(input.snapshotId, edge.sourceNodeId, edge.targetNodeId),
      snapshotId: input.snapshotId,
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: edge.targetNodeId,
      couplingType,
      couplingStrength: strength,
      propagationRisk,
      metadataJson: null,
    });
  }

  return results;
}
