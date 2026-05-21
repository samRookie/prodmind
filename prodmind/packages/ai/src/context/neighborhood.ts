import { createRetrievalCache, type RetrievalContext, type RetrievalInput, retrieveArchitecturalSlice, retrieveBidirectionalNeighborhood, retrieveBlastRadiusSubgraph, retrieveCriticalPropagationPaths, retrieveDependencyNeighborhood, type RetrievedNode,retrieveReverseDependencies } from '@prodmind/parser';

import type { ContextConfig } from './config.ts';
import { resolveContextConfig } from './config.ts';
import type { ContextDependencyChain, ContextDependencyEdge, ContextNode, ContextRegion, ContextSlice } from './contracts.ts';
import { createContextDependencyChain, createContextDependencyEdge, createContextNode, createContextRegion, createContextSlice } from './contracts.ts';

export class NeighborhoodEngine {
  buildContext(input: RetrievalInput): RetrievalContext {
    return createRetrievalCache(input as unknown as Parameters<typeof createRetrievalCache>[0]);
  }

  getDependencyChain(
    ctx: RetrievalContext,
    seedId: string,
    direction: 'upstream' | 'downstream' | 'sibling',
    depth?: number,
    config?: ContextConfig,
  ): ContextDependencyChain {
    const cfg = config ?? resolveContextConfig();
    const maxDepth = depth ?? cfg.maxDepth;

    let result: { nodes: RetrievedNode[]; edges: any[] };

    switch (direction) {
      case 'upstream': {
        const nr = retrieveReverseDependencies(ctx, [seedId], maxDepth);
        result = { nodes: nr.nodes, edges: nr.edges };
        break;
      }
      case 'downstream': {
        const nr = retrieveDependencyNeighborhood(ctx, [seedId], maxDepth);
        result = { nodes: nr.nodes, edges: nr.edges };
        break;
      }
      case 'sibling': {
        const nr = retrieveBidirectionalNeighborhood(ctx, [seedId], maxDepth);
        result = { nodes: nr.nodes, edges: nr.edges };
        break;
      }
      default: {
        const nr = retrieveBidirectionalNeighborhood(ctx, [seedId], maxDepth);
        result = { nodes: nr.nodes, edges: nr.edges };
      }
    }

    const chainNodes = result.nodes.map(toNode);
    const chainEdges = result.edges.map(toEdge);
    const totalRisk = chainNodes.reduce(
      (sum, n) => sum + (n.propagationRiskScore ?? 0), 0,
    );
    const maxDepthReached = chainNodes.reduce(
      (max, n) => Math.max(max, n.depth), 0,
    );

    return createContextDependencyChain({
      direction,
      nodes: chainNodes,
      edges: chainEdges,
      totalRisk,
      maxDepth: maxDepthReached,
    });
  }

  getRegions(
    ctx: RetrievalContext,
    nodes: ContextNode[],
  ): ContextRegion[] {
    const regionMap = new Map<string, { nodeIds: string[]; semanticType: string | null; clusterName: string | null }>();

    for (const node of nodes) {
      const semanticType = node.semanticType;
      const ns = ctx.namespaceMap ? findNamespace(ctx, node.nodeId) : null;
      const key = semanticType ?? ns ?? 'ungrouped';

      if (!regionMap.has(key)) {
        regionMap.set(key, { nodeIds: [], semanticType, clusterName: ns });
      }
      regionMap.get(key)!.nodeIds.push(node.nodeId);
    }

    return Array.from(regionMap.entries()).map(([regionName, data]) =>
      createContextRegion({
        regionName,
        nodeIds: data.nodeIds,
        semanticType: data.semanticType,
        clusterName: data.clusterName,
      }),
    );
  }

  getBlastRadius(
    ctx: RetrievalContext,
    seedId: string,
    depth?: number,
    config?: ContextConfig,
  ): ContextSlice {
    const cfg = config ?? resolveContextConfig();
    const maxDepth = depth ?? cfg.maxDepth;

    const br = retrieveBlastRadiusSubgraph(ctx, seedId, maxDepth);

    const allNodes: RetrievedNode[] = [
      br.entryPoint,
      ...br.forwardImpacts,
      ...br.backwardImpacts,
    ];

    const chainEdges: ContextDependencyEdge[] = [];
    const chain = this.getDependencyChain(ctx, seedId, 'sibling', maxDepth, cfg);
    chainEdges.push(...chain.edges);

    const sliceNodes = allNodes.map(toNode);
    const regions = this.getRegions(ctx, sliceNodes);

    return createContextSlice({
      kind: 'risk_oriented',
      strategy: 'BLAST_RADIUS',
      nodes: sliceNodes,
      edges: chainEdges,
      regions,
      chains: [chain],
      tokenCount: 0,
      metadata: {
        entryPoint: seedId,
        totalAffected: br.totalAffected,
        criticalPaths: br.criticalPaths.length,
        forwardCount: br.forwardImpacts.length,
        backwardCount: br.backwardImpacts.length,
      },
    });
  }

  getArchitecturalSlice(
    ctx: RetrievalContext,
    semanticTypes: string[],
    _config?: ContextConfig,
  ): ContextSlice {
    const asResult = retrieveArchitecturalSlice(ctx, semanticTypes as any);
    const sliceNodes = asResult.nodes.map(toNode);
    const sliceEdges = asResult.edges.map(toEdge);
    const regions = this.getRegions(ctx, sliceNodes);

    return createContextSlice({
      kind: 'architectural_boundary',
      strategy: 'ARCHITECTURAL_SLICE',
      nodes: sliceNodes,
      edges: sliceEdges,
      regions,
      chains: [],
      tokenCount: 0,
      metadata: {
        sliceType: asResult.sliceType,
        clusters: asResult.clusters,
        semanticTypes: asResult.semanticTypes,
      },
    });
  }

  getCyclicDependencies(
    ctx: RetrievalContext,
    _config?: ContextConfig,
  ): readonly ContextNode[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cyclicNodeIds = new Set<string>();

    function dfs(nodeId: string): void {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      const neighbors = ctx.adjacency.get(nodeId) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recursionStack.has(neighbor)) {
          cyclicNodeIds.add(nodeId);
          cyclicNodeIds.add(neighbor);
        }
      }
      recursionStack.delete(nodeId);
    }

    for (const nodeId of ctx.sortedNodeIds) {
      if (!visited.has(nodeId)) dfs(nodeId);
    }

    const result: ContextNode[] = [];
    for (const nodeId of cyclicNodeIds) {
      const raw = ctx.nodeMap.get(nodeId);
      if (!raw) continue;
      const cent = ctx.centralityMap.get(nodeId);
      const inst = ctx.instabilityMap.get(nodeId);
      const risk = ctx.propagationRiskMap.get(nodeId);
      result.push(toNode({
        nodeId: raw.id, filePath: raw.filePath, depth: 0, nodeType: raw.nodeType,
        language: raw.language, symbolName: raw.symbolName, centralityScore: cent?.dependencyInfluenceScore ?? null,
        instabilityScore: inst?.instabilityScore ?? null, propagationRiskScore: risk?.propagationPressure ?? null,
        fanIn: null, fanOut: null, semanticType: null, classification: null,
      }));
    }

    return Object.freeze(result);
  }

  getChokePoints(
    ctx: RetrievalContext,
    threshold?: number,
    maxResults?: number,
  ): readonly ContextNode[] {
    const limit = maxResults ?? 25;
    const fanThreshold = threshold ?? 5;

    const chokeCandidates: Array<{ nodeId: string; score: number }> = [];

    for (const nodeId of ctx.sortedNodeIds) {
      const fwd = ctx.adjacency.get(nodeId) ?? [];
      const rev = ctx.reverseAdjacency.get(nodeId) ?? [];
      const totalConnections = fwd.length + rev.length;
      if (totalConnections >= fanThreshold) {
        chokeCandidates.push({ nodeId, score: totalConnections });
      }
    }

    chokeCandidates.sort((a, b) => b.score - a.score || a.nodeId.localeCompare(b.nodeId));

    const result: ContextNode[] = [];
    for (const { nodeId } of chokeCandidates.slice(0, limit)) {
      const raw = ctx.nodeMap.get(nodeId);
      if (!raw) continue;
      const cent = ctx.centralityMap.get(nodeId);
      const inst = ctx.instabilityMap.get(nodeId);
      const risk = ctx.propagationRiskMap.get(nodeId);
      result.push(toNode({
        nodeId: raw.id, filePath: raw.filePath, depth: 0, nodeType: raw.nodeType,
        language: raw.language, symbolName: raw.symbolName, centralityScore: cent?.dependencyInfluenceScore ?? null,
        instabilityScore: inst?.instabilityScore ?? null, propagationRiskScore: risk?.propagationPressure ?? null,
        fanIn: null, fanOut: null, semanticType: null, classification: null,
      }));
    }

    return Object.freeze(result);
  }

  getHotspotRegions(
    ctx: RetrievalContext,
    threshold?: number,
  ): readonly ContextNode[] {
    const instThreshold = threshold ?? 0.5;
    const result: ContextNode[] = [];

    for (const nodeId of ctx.sortedNodeIds) {
      const inst = ctx.instabilityMap.get(nodeId);
      if (inst && inst.instabilityScore >= instThreshold) {
        const raw = ctx.nodeMap.get(nodeId);
        if (!raw) continue;
        const cent = ctx.centralityMap.get(nodeId);
        const risk = ctx.propagationRiskMap.get(nodeId);
        result.push(toNode({
          nodeId: raw.id, filePath: raw.filePath, depth: 0, nodeType: raw.nodeType,
          language: raw.language, symbolName: raw.symbolName, centralityScore: cent?.dependencyInfluenceScore ?? null,
          instabilityScore: inst.instabilityScore, propagationRiskScore: risk?.propagationPressure ?? null,
          fanIn: null, fanOut: null, semanticType: null, classification: null,
        }));
      }
    }

    return Object.freeze(result);
  }

  getCriticalPaths(
    ctx: RetrievalContext,
    seedId: string,
    depth?: number,
    config?: ContextConfig,
  ): Array<{ source: string; target: string; riskScore: number }> {
    const cfg = config ?? resolveContextConfig();
    const maxDepth = depth ?? cfg.maxDepth;
    return retrieveCriticalPropagationPaths(ctx, seedId, maxDepth);
  }
}

function toNode(n: RetrievedNode): ContextNode {
  return createContextNode({
    nodeId: n.nodeId,
    filePath: n.filePath,
    depth: n.depth,
    nodeType: n.nodeType,
    language: n.language,
    symbolName: n.symbolName,
    centralityScore: n.centralityScore,
    instabilityScore: n.instabilityScore,
    propagationRiskScore: n.propagationRiskScore,
    fanIn: n.fanIn,
    fanOut: n.fanOut,
    semanticType: n.semanticType,
  });
}

function toEdge(e: any): ContextDependencyEdge {
  return createContextDependencyEdge({
    sourceNodeId: e.sourceNodeId ?? e.sourceNodeId,
    targetNodeId: e.targetNodeId ?? e.targetNodeId,
    edgeType: e.edgeType ?? '',
    weight: e.weight ?? null,
  });
}

function findNamespace(ctx: RetrievalContext, nodeId: string): string | null {
  for (const [ns, ids] of ctx.namespaceMap.entries()) {
    if (ids.includes(nodeId)) return ns;
  }
  return null;
}
