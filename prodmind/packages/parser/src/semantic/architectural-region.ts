export interface ArchitecturalRegion {
  regionName: string;
  nodeIds: string[];
  boundaryType: 'isolated' | 'weakly-connected' | 'well-connected';
  connectivityScore: number;
  clusterDensity: number;
  edgeCount: number;
}

export interface RegionDetectionInput {
  nodes: Array<{ id: string; filePath: string }>;
  edges: Array<{ id: string; sourceNodeId: string; targetNodeId: string }>;
}

function buildAdjacencyList(
  nodes: Array<{ id: string }>,
  edges: Array<{ id: string; sourceNodeId: string; targetNodeId: string }>,
): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const n of nodes) {
    adj.set(n.id, new Set());
  }
  for (const e of edges) {
    const sourceSet = adj.get(e.sourceNodeId);
    const targetSet = adj.get(e.targetNodeId);
    if (sourceSet) sourceSet.add(e.targetNodeId);
    if (targetSet) targetSet.add(e.sourceNodeId);
  }
  return adj;
}

function findConnectedComponents(adj: Map<string, Set<string>>): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const nodeId of adj.keys()) {
    if (visited.has(nodeId)) continue;
    const component: string[] = [];
    const queue = [nodeId];
    visited.add(nodeId);
    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);
      const neighbors = adj.get(current);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
    }
    component.sort();
    components.push(component);
  }

  return components.sort((a, b) => b.length - a.length);
}

function computeConnectivity(
  componentIds: string[],
  adj: Map<string, Set<string>>,
  allEdges: number,
): { connectivityScore: number; edgeCount: number; clusterDensity: number } {
  const nodeSet = new Set(componentIds);
  let internalEdgeCount = 0;

  for (const nodeId of componentIds) {
    const neighbors = adj.get(nodeId);
    if (neighbors) {
      for (const n of neighbors) {
        if (nodeSet.has(n)) {
          internalEdgeCount++;
        }
      }
    }
  }

  internalEdgeCount = Math.floor(internalEdgeCount / 2);
  const n = componentIds.length;
  const maxPossible = n > 1 ? (n * (n - 1)) / 2 : 1;
  const clusterDensity = n > 1 ? internalEdgeCount / maxPossible : 0;
  const connectivityScore = allEdges > 0 ? internalEdgeCount / allEdges : 0;

  return { connectivityScore, edgeCount: internalEdgeCount, clusterDensity };
}

export function detectArchitecturalRegions(input: RegionDetectionInput): ArchitecturalRegion[] {
  const adj = buildAdjacencyList(input.nodes, input.edges);
  const components = findConnectedComponents(adj);
  const regions: ArchitecturalRegion[] = [];

  const filePathMap = new Map<string, string>();
  for (const n of input.nodes) {
    filePathMap.set(n.id, n.filePath);
  }

  for (const component of components) {
    const { connectivityScore, edgeCount, clusterDensity } = computeConnectivity(
      component,
      adj,
      input.edges.length,
    );

    let boundaryType: 'isolated' | 'weakly-connected' | 'well-connected';
    if (clusterDensity < 0.1) {
      boundaryType = 'isolated';
    } else if (clusterDensity < 0.3) {
      boundaryType = 'weakly-connected';
    } else {
      boundaryType = 'well-connected';
    }

    const samplePath = filePathMap.get(component[0]!) ?? 'unknown';
    const pathParts = samplePath.replace(/\\/g, '/').split('/');
    const regionName = component.length === 1
      ? `singleton:${pathParts[pathParts.length - 2] ?? 'root'}/${pathParts[pathParts.length - 1] ?? 'unknown'}`
      : `region:${pathParts[0] ?? 'root'}-${component.length}nodes`;

    regions.push({
      regionName,
      nodeIds: component,
      boundaryType,
      connectivityScore,
      clusterDensity,
      edgeCount,
    });
  }

  return regions;
}

export function computeBoundaryStrength(region: ArchitecturalRegion): number {
  return region.connectivityScore;
}
