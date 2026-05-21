import type { RetrievalContext } from '@prodmind/parser';

import type { ContextConfig } from '../config.ts';
import type { ContextDependencyChain, ContextDependencyEdge, ContextNode, ContextRegion, ContextSlice, ContextSliceKind,RetrievalCandidate } from '../contracts.ts';
import { createContextDependencyChain,createContextRegion, createContextSlice } from '../contracts.ts';
import { SlicingError } from '../errors.ts';

export class SliceBuilder {
  constructor(_config?: ContextConfig) {} // config reserved for future budget integration

  buildLocalNeighborhoodSlice(
    candidates: RetrievalCandidate[],
    entryPointId: string,
    ctx: RetrievalContext,
  ): ContextSlice {
    const nodes = candidates.map((c) => c.node);
    const edges = this.extractEdges(nodes, ctx);
    const regions = this.buildRegions(nodes, ctx);
    const chain = this.buildChain(nodes, edges, 'sibling');

    return createContextSlice({
      kind: 'local_neighborhood',
      strategy: 'LOCAL_NEIGHBORHOOD',
      nodes,
      edges,
      regions,
      chains: [chain],
      tokenCount: nodes.length * 20,
      metadata: { entryPoint: entryPointId, candidateCount: candidates.length },
    });
  }

  buildUpstreamChainSlice(
    candidates: RetrievalCandidate[],
    entryPointId: string,
    ctx: RetrievalContext,
  ): ContextSlice {
    const nodes = candidates.map((c) => c.node);
    const edges = this.extractEdges(nodes, ctx);
    const regions = this.buildRegions(nodes, ctx);
    const chain = this.buildChain(nodes, edges, 'upstream');

    return createContextSlice({
      kind: 'upstream_chain',
      strategy: 'UPSTREAM_CHAIN',
      nodes,
      edges,
      regions,
      chains: [chain],
      tokenCount: nodes.length * 20,
      metadata: { entryPoint: entryPointId, dependencyCount: nodes.length },
    });
  }

  buildDownstreamChainSlice(
    candidates: RetrievalCandidate[],
    entryPointId: string,
    ctx: RetrievalContext,
  ): ContextSlice {
    const nodes = candidates.map((c) => c.node);
    const edges = this.extractEdges(nodes, ctx);
    const regions = this.buildRegions(nodes, ctx);
    const chain = this.buildChain(nodes, edges, 'downstream');

    return createContextSlice({
      kind: 'downstream_chain',
      strategy: 'DOWNSTREAM_CHAIN',
      nodes,
      edges,
      regions,
      chains: [chain],
      tokenCount: nodes.length * 20,
      metadata: { entryPoint: entryPointId, dependentCount: nodes.length },
    });
  }

  buildSemanticRegionSlice(
    nodes: ContextNode[],
    regionName: string,
    ctx: RetrievalContext,
  ): ContextSlice {
    const edges = this.extractEdges(nodes, ctx);
    const region = createContextRegion({
      regionName,
      nodeIds: nodes.map((n) => n.nodeId),
      semanticType: nodes[0]?.semanticType ?? null,
      clusterName: regionName,
    });

    return createContextSlice({
      kind: 'semantic_region',
      strategy: 'SEMANTIC_REGION',
      nodes,
      edges,
      regions: [region],
      chains: [],
      tokenCount: nodes.length * 20,
      metadata: { regionName, nodeCount: nodes.length },
    });
  }

  buildArchitecturalBoundarySlice(
    nodes: ContextNode[],
    edges: ContextDependencyEdge[],
    semanticTypes: string[],
  ): ContextSlice {
    const regions: ContextRegion[] = semanticTypes.map((st) =>
      createContextRegion({
        regionName: `arch:${st}`,
        nodeIds: nodes.filter((n) => n.semanticType === st).map((n) => n.nodeId),
        semanticType: st,
        clusterName: null,
      }),
    );

    return createContextSlice({
      kind: 'architectural_boundary',
      strategy: 'ARCHITECTURAL_BOUNDARY',
      nodes,
      edges,
      regions,
      chains: [],
      tokenCount: nodes.length * 20,
      metadata: { semanticTypes },
    });
  }

  buildCoupledSubsystemSlice(
    nodes: ContextNode[],
    edges: ContextDependencyEdge[],
    couplingScore: number,
  ): ContextSlice {
    const chain = createContextDependencyChain({
      direction: 'sibling',
      nodes,
      edges,
      totalRisk: couplingScore,
      maxDepth: 1,
    });

    return createContextSlice({
      kind: 'coupled_subsystem',
      strategy: 'COUPLED_SUBSYSTEM',
      nodes,
      edges,
      regions: [],
      chains: [chain],
      tokenCount: nodes.length * 20,
      metadata: { couplingScore },
    });
  }

  buildUnstableRegionSlice(
    nodes: ContextNode[],
    edges: ContextDependencyEdge[],
  ): ContextSlice {
    const totalInstability = nodes.reduce(
      (sum, n) => sum + (n.instabilityScore ?? 0), 0,
    );

    return createContextSlice({
      kind: 'unstable_region',
      strategy: 'UNSTABLE_REGION',
      nodes,
      edges,
      regions: [],
      chains: [],
      tokenCount: nodes.length * 20,
      metadata: { totalInstability, avgInstability: nodes.length > 0 ? totalInstability / nodes.length : 0 },
    });
  }

  buildRiskOrientedSlice(
    nodes: ContextNode[],
    edges: ContextDependencyEdge[],
    chains: ContextDependencyChain[],
    entryPointId: string,
  ): ContextSlice {
    const regions = this.buildRegions(nodes, undefined);

    return createContextSlice({
      kind: 'risk_oriented',
      strategy: 'RISK_ORIENTED',
      nodes,
      edges,
      regions,
      chains,
      tokenCount: nodes.length * 20,
      metadata: { entryPoint: entryPointId, chainCount: chains.length },
    });
  }

  buildFromKind(
    kind: ContextSliceKind,
    nodes: ContextNode[],
    edges: ContextDependencyEdge[],
    _ctx?: RetrievalContext,
  ): ContextSlice {
    const regions = _ctx ? this.buildRegions(nodes, _ctx) : [];
    const tokenCount = nodes.length * 20;

    switch (kind) {
      case 'local_neighborhood':
        return createContextSlice({
          kind, strategy: 'LOCAL_NEIGHBORHOOD', nodes, edges, regions, chains: [],
          tokenCount, metadata: { nodeCount: nodes.length },
        });
      case 'upstream_chain':
        return createContextSlice({
          kind, strategy: 'UPSTREAM_CHAIN', nodes, edges, regions, chains: [],
          tokenCount, metadata: { nodeCount: nodes.length },
        });
      case 'downstream_chain':
        return createContextSlice({
          kind, strategy: 'DOWNSTREAM_CHAIN', nodes, edges, regions, chains: [],
          tokenCount, metadata: { nodeCount: nodes.length },
        });
      case 'semantic_region':
        return createContextSlice({
          kind, strategy: 'SEMANTIC_REGION', nodes, edges, regions, chains: [],
          tokenCount, metadata: { nodeCount: nodes.length },
        });
      case 'architectural_boundary':
        return createContextSlice({
          kind, strategy: 'ARCHITECTURAL_BOUNDARY', nodes, edges, regions, chains: [],
          tokenCount, metadata: { nodeCount: nodes.length },
        });
      case 'coupled_subsystem':
        return createContextSlice({
          kind, strategy: 'COUPLED_SUBSYSTEM', nodes, edges, regions, chains: [],
          tokenCount, metadata: { nodeCount: nodes.length },
        });
      case 'unstable_region':
        return createContextSlice({
          kind, strategy: 'UNSTABLE_REGION', nodes, edges, regions, chains: [],
          tokenCount, metadata: { nodeCount: nodes.length },
        });
      case 'risk_oriented':
        return createContextSlice({
          kind, strategy: 'RISK_ORIENTED', nodes, edges, regions, chains: [],
          tokenCount, metadata: { nodeCount: nodes.length },
        });
      default:
        throw new SlicingError(kind, `Unknown slice kind: ${kind}`);
    }
  }

  private extractEdges(
    nodes: ContextNode[],
    ctx: RetrievalContext | undefined,
  ): ContextDependencyEdge[] {
    if (!ctx) return [];
    const nodeIds = new Set(nodes.map((n) => n.nodeId));
    const edges: ContextDependencyEdge[] = [];

    for (const nodeId of nodeIds) {
      const fwd = ctx.adjacency.get(nodeId) ?? [];
      for (const targetId of fwd) {
        if (nodeIds.has(targetId)) {
          const edge = ctx.adjacencyEdge.get(nodeId)?.get(targetId);
          if (edge) {
            edges.push({
              sourceNodeId: edge.sourceNodeId,
              targetNodeId: edge.targetNodeId,
              edgeType: edge.edgeType,
              weight: edge.weight ?? null,
            });
          }
        }
      }
    }

    return edges;
  }

  private buildRegions(
    nodes: ContextNode[],
    _ctx?: RetrievalContext,
  ): ContextRegion[] {
    const regionMap = new Map<string, string[]>();

    for (const node of nodes) {
      const key = node.semanticType ?? 'ungrouped';
      const existing = regionMap.get(key) ?? [];
      existing.push(node.nodeId);
      regionMap.set(key, existing);
    }

    return Array.from(regionMap.entries()).map(([regionName, nodeIds]) =>
      createContextRegion({
        regionName,
        nodeIds,
        semanticType: regionName === 'ungrouped' ? null : regionName,
        clusterName: null,
      }),
    );
  }

  private buildChain(
    nodes: ContextNode[],
    edges: ContextDependencyEdge[],
    direction: 'upstream' | 'downstream' | 'sibling',
  ): ContextDependencyChain {
    const totalRisk = nodes.reduce((sum, n) => sum + (n.propagationRiskScore ?? 0), 0);
    return createContextDependencyChain({
      direction,
      nodes,
      edges,
      totalRisk,
      maxDepth: Math.max(...nodes.map((n) => n.depth), 0),
    });
  }
}
