import type { ContextNode, ContextSlice } from '../contracts.ts';

export class ContextDeduper {
  dedupNodes(nodes: ContextNode[]): readonly ContextNode[] {
    const seen = new Set<string>();
    const result: ContextNode[] = [];

    for (const node of nodes) {
      if (!seen.has(node.nodeId)) {
        seen.add(node.nodeId);
        result.push(node);
      }
    }

    return Object.freeze(result);
  }

  dedupSlices(slices: ContextSlice[]): readonly ContextSlice[] {
    const seen = new Map<string, ContextSlice>();
    const merged: Map<string, Set<string>> = new Map();

    for (const slice of slices) {
      const key = this.sliceKey(slice);
      const existing = seen.get(key);

      if (existing) {
        const existingIds = new Set(existing.nodes.map((n) => n.nodeId));
        const newNodeIds: string[] = [];

        for (const node of slice.nodes) {
          if (!existingIds.has(node.nodeId)) {
            existingIds.add(node.nodeId);
            newNodeIds.push(node.nodeId);
          }
        }

        if (newNodeIds.length > 0) {
          const mergedNodes = Object.freeze([...existing.nodes, ...slice.nodes.filter((n) => newNodeIds.includes(n.nodeId))]);
          const mergedEdges = Object.freeze([...existing.edges, ...slice.edges]);
          const mergedChains = Object.freeze([...existing.chains, ...slice.chains]);

          seen.set(key, Object.freeze({
            ...existing,
            nodes: mergedNodes,
            edges: mergedEdges,
            chains: mergedChains,
            tokenCount: existing.tokenCount + slice.tokenCount,
          }));
        }
      } else {
        seen.set(key, slice);
        merged.set(key, new Set(slice.nodes.map((n) => n.nodeId)));
      }
    }

    return Object.freeze([...seen.values()]);
  }

  removeSemanticRedundancy(slices: ContextSlice[]): readonly ContextSlice[] {
    const grouped = new Map<string, ContextSlice[]>();

    for (const slice of slices) {
      const regionKey = slice.regions
        .map((r) => r.regionName)
        .sort()
        .join('|');

      const existing = grouped.get(regionKey) ?? [];
      existing.push(slice);
      grouped.set(regionKey, existing);
    }

    const result: ContextSlice[] = [];

    for (const [, group] of grouped) {
      if (group.length === 1) {
        result.push(group[0]!);
      } else {
        group.sort((a, b) => {
          const chainDiff = b.chains.length - a.chains.length;
          if (chainDiff !== 0) return chainDiff;
          return b.nodes.length - a.nodes.length;
        });
        result.push(group[0]!);
      }
    }

    return Object.freeze(result);
  }

  canonicalize(slices: ContextSlice[]): readonly ContextSlice[] {
    return Object.freeze(
      [...slices]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((slice) =>
          Object.freeze({
            ...slice,
            nodes: Object.freeze(
              [...slice.nodes].sort((a, b) => a.nodeId.localeCompare(b.nodeId)),
            ),
            edges: Object.freeze(
              [...slice.edges].sort((a, b) => {
                const src = a.sourceNodeId.localeCompare(b.sourceNodeId);
                return src !== 0 ? src : a.targetNodeId.localeCompare(b.targetNodeId);
              }),
            ),
            regions: Object.freeze(
              [...slice.regions].sort((a, b) => a.regionName.localeCompare(b.regionName)),
            ),
            chains: Object.freeze(
              [...slice.chains].sort((a, b) => {
                const dir = a.direction.localeCompare(b.direction);
                return dir !== 0 ? dir : a.chainId.localeCompare(b.chainId);
              }),
            ),
            metadata: Object.freeze({ ...slice.metadata }),
          }),
        ),
    );
  }

  private sliceKey(slice: ContextSlice): string {
    const nodeIds = [...slice.nodes].map((n) => n.nodeId).sort().join(',');
    return `${slice.kind}:${nodeIds}`;
  }
}
