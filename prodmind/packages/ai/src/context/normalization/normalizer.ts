import type { ContextAssemblyResult, ContextDependencyChain,ContextDependencyEdge, ContextNode, ContextRegion, ContextSlice } from '../contracts.ts';

export class ContextNormalizer {
  normalize(result: ContextAssemblyResult): ContextAssemblyResult {
    const sortedSlices = [...result.slices]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((slice) => this.normalizeSlice(slice));

    return Object.freeze({
      ...result,
      slices: Object.freeze(sortedSlices),
    });
  }

  private normalizeSlice(slice: ContextSlice): ContextSlice {
    const nodes = this.normalizeNodes(slice.nodes);
    const edges = this.normalizeEdges(slice.edges);
    const regions = this.normalizeRegions(slice.regions);
    const chains = this.normalizeChains(slice.chains);

    return Object.freeze({
      ...slice,
      nodes,
      edges,
      regions,
      chains,
      metadata: Object.freeze({ ...slice.metadata }),
    });
  }

  private normalizeNodes(nodes: readonly ContextNode[]): readonly ContextNode[] {
    return Object.freeze(
      [...nodes].sort((a, b) => a.nodeId.localeCompare(b.nodeId)),
    );
  }

  private normalizeEdges(edges: readonly ContextDependencyEdge[]): readonly ContextDependencyEdge[] {
    return Object.freeze(
      [...edges].sort((a, b) => {
        const src = a.sourceNodeId.localeCompare(b.sourceNodeId);
        return src !== 0 ? src : a.targetNodeId.localeCompare(b.targetNodeId);
      }),
    );
  }

  private normalizeRegions(regions: readonly ContextRegion[]): readonly ContextRegion[] {
    return Object.freeze(
      [...regions].sort((a, b) => a.regionName.localeCompare(b.regionName)),
    );
  }

  private normalizeChains(chains: readonly ContextDependencyChain[]): readonly ContextDependencyChain[] {
    return Object.freeze(
      [...chains].sort((a, b) => {
        const dir = a.direction.localeCompare(b.direction);
        return dir !== 0 ? dir : a.chainId.localeCompare(b.chainId);
      }),
    );
  }
}
