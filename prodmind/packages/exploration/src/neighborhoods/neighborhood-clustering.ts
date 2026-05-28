import type { NodeId } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';

export class NeighborhoodClustering {
  public clusterByDensity(nodes: NodeId[], graph: GraphContract): NodeId[][] {
    const clusters: NodeId[][] = [];
    const assigned = new Set<NodeId>();

    const adjList = new Map<NodeId, NodeId[]>();
    for (const nodeId of nodes) {
      const edges = graph.getEdgesForNode(nodeId);
      const neighbors: NodeId[] = [];
      for (const edge of edges) {
        const neighbor = edge.source === nodeId ? edge.target : edge.source;
        if (nodes.includes(neighbor)) {
          neighbors.push(neighbor);
        }
      }
      adjList.set(nodeId, neighbors);
    }

    for (const nodeId of nodes) {
      if (assigned.has(nodeId)) continue;

      const cluster: NodeId[] = [];
      const queue = [nodeId];
      assigned.add(nodeId);

      while (queue.length > 0) {
        const current = queue.shift()!;
        cluster.push(current);

        const neighbors = adjList.get(current) ?? [];
        const denseNeighbors = neighbors.filter((n) => {
          if (assigned.has(n)) return false;
          const nDegree = adjList.get(n)?.length ?? 0;
          const avgDegree = nodes.length > 0
            ? Array.from(adjList.values()).reduce((s, ns) => s + ns.length, 0) / nodes.length
            : 1;
          return nDegree >= avgDegree * 0.5;
        });

        for (const neighbor of denseNeighbors) {
          assigned.add(neighbor);
          queue.push(neighbor);
        }
      }

      if (cluster.length > 0) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  public clusterByType(nodes: NodeId[], graph: GraphContract): Map<string, NodeId[]> {
    const typeMap = new Map<string, NodeId[]>();

    for (const nodeId of nodes) {
      const node = graph.getNode(nodeId);
      if (!node) continue;

      const type = node.type;
      if (!typeMap.has(type)) {
        typeMap.set(type, []);
      }
      typeMap.get(type)!.push(nodeId);
    }

    return typeMap;
  }

  public clusterByConnectivity(nodes: NodeId[], graph: GraphContract): NodeId[][] {
    const clusters: NodeId[][] = [];
    const visited = new Set<NodeId>();

    const adjList = new Map<NodeId, NodeId[]>();
    for (const nodeId of nodes) {
      const edges = graph.getEdgesForNode(nodeId);
      const neighbors: NodeId[] = [];
      for (const edge of edges) {
        const neighbor = edge.source === nodeId ? edge.target : edge.source;
        if (nodes.includes(neighbor)) {
          neighbors.push(neighbor);
        }
      }
      adjList.set(nodeId, neighbors);
    }

    for (const nodeId of nodes) {
      if (visited.has(nodeId)) continue;

      const component: NodeId[] = [];
      const queue = [nodeId];
      visited.add(nodeId);

      while (queue.length > 0) {
        const current = queue.shift()!;
        component.push(current);

        const neighbors = adjList.get(current) ?? [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      if (component.length > 0) {
        clusters.push(component);
      }
    }

    return clusters;
  }

  public computeClusteringCoefficient(nodes: NodeId[], graph: GraphContract): number {
    if (nodes.length < 3) return 0;

    const nodeSet = new Set(nodes);
    let totalTriangles = 0;
    let totalTriples = 0;

    for (const nodeId of nodes) {
      const edges = graph.getEdgesForNode(nodeId);
      const neighbors = edges
        .map((e) => (e.source === nodeId ? e.target : e.source))
        .filter((n) => nodeSet.has(n));

      const k = neighbors.length;
      if (k < 2) continue;

      const neighborSet = new Set(neighbors);
      let triangles = 0;

      for (let i = 0; i < neighbors.length; i++) {
        const neighborId = neighbors[i]!;
        const neighborEdges = graph.getEdgesForNode(neighborId);
        for (const edge of neighborEdges) {
          const secondNeighbor = edge.source === neighborId ? edge.target : edge.source;
          if (secondNeighbor !== nodeId && neighborSet.has(secondNeighbor)) {
            triangles++;
          }
        }
      }

      totalTriangles += triangles / 2;
      totalTriples += (k * (k - 1)) / 2;
    }

    return totalTriples > 0
      ? Math.round((totalTriangles / totalTriples) * 10000) / 10000
      : 0;
  }
}
