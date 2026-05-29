import type { GraphDelta,TemporalSnapshot } from '../types/index.ts';

export function computeGraphDelta(
  previous: TemporalSnapshot,
  current: TemporalSnapshot,
): GraphDelta {
  return {
    addedNodes: Math.max(0, current.nodeCount - previous.nodeCount),
    removedNodes: Math.max(0, previous.nodeCount - current.nodeCount),
    addedEdges: Math.max(0, current.edgeCount - previous.edgeCount),
    removedEdges: Math.max(0, previous.edgeCount - current.edgeCount),
    nodeCountChange: current.nodeCount - previous.nodeCount,
    edgeCountChange: current.edgeCount - previous.edgeCount,
    complexityDelta: 0,
    instabilityDelta: 0,
    couplingDelta: 0,
    propagationDelta: 0,
  };
}

export function computeAggregateDeltas(snapshots: TemporalSnapshot[]): GraphDelta[] {
  const deltas: GraphDelta[] = [];
  for (let i = 1; i < snapshots.length; i++) {
    deltas.push(computeGraphDelta(snapshots[i - 1]!, snapshots[i]!));
  }
  return deltas;
}

export function computeTotalEvolution(deltas: GraphDelta[]): GraphDelta {
  return deltas.reduce(
    (acc, d) => ({
      addedNodes: acc.addedNodes + d.addedNodes,
      removedNodes: acc.removedNodes + d.removedNodes,
      addedEdges: acc.addedEdges + d.addedEdges,
      removedEdges: acc.removedEdges + d.removedEdges,
      nodeCountChange: acc.nodeCountChange + d.nodeCountChange,
      edgeCountChange: acc.edgeCountChange + d.edgeCountChange,
      complexityDelta: acc.complexityDelta + d.complexityDelta,
      instabilityDelta: acc.instabilityDelta + d.instabilityDelta,
      couplingDelta: acc.couplingDelta + d.couplingDelta,
      propagationDelta: acc.propagationDelta + d.propagationDelta,
    }),
    {
      addedNodes: 0, removedNodes: 0, addedEdges: 0, removedEdges: 0,
      nodeCountChange: 0, edgeCountChange: 0, complexityDelta: 0,
      instabilityDelta: 0, couplingDelta: 0, propagationDelta: 0,
    },
  );
}
