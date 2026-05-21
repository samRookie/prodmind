import { Hono } from 'hono';
import { createDrizzleClient, RetrievalRepository } from '@prodmind/db';
import type { Database } from '@prodmind/db';
import { RetrievalEngine } from '@prodmind/parser';
import type { RetrievalQuery } from '@prodmind/parser';
import { RetrievalStrategy, RetrievalScope, RetrievalOrdering } from '@prodmind/contracts';
import type { SemanticType } from '@prodmind/contracts';

const retrievalRouter = new Hono();

const MAX_RETRIEVAL_GRAPH_SIZE = 50000;

function buildNodePathMap(nodes: Array<{ id: string; filePath: string }>): Map<string, string> {
  const map = new Map<string, string>();
  for (const n of nodes) map.set(n.id, n.filePath);
  return map;
}

function buildCentrality(metrics: Array<{ metricType: string; nodeId: string | null; metricValue: number }>, nodePathMap: Map<string, string>) {
  return metrics.filter((m) => m.metricType === 'CENTRALITY').map((m) => ({
    nodeId: m.nodeId ?? '',
    filePath: nodePathMap.get(m.nodeId ?? '') ?? '',
    inDegree: 0,
    outDegree: 0,
    reachabilityCount: 0,
    dependencyInfluenceScore: m.metricValue,
    isUtilityHub: false,
  }));
}

function buildClassifications(
  classRows: Array<{ nodeId: string; semanticType: string; ruleStrength: string | null; classificationReasonsJson: string | null; matchedHeuristicsJson: string | null }>,
  nodePathMap: Map<string, string>,
) {
  return classRows.map((r) => ({
    nodeId: r.nodeId,
    filePath: nodePathMap.get(r.nodeId) ?? '',
    semanticType: r.semanticType as SemanticType,
    ruleStrength: r.ruleStrength as any,
    classificationReasons: JSON.parse(r.classificationReasonsJson ?? '[]'),
    matchedHeuristics: JSON.parse(r.matchedHeuristicsJson ?? '[]'),
  }));
}

async function loadRetrievalData(db: Database, snapshotId: string) {
  const retrievalRepo = new RetrievalRepository(db);
  const { nodes, edges } = await retrievalRepo.getSnapshotGraph(snapshotId);

  if (nodes.length === 0) {
    return null;
  }

  if (nodes.length > MAX_RETRIEVAL_GRAPH_SIZE) {
    console.warn(`[RETRIEVAL] Large graph detected: ${nodes.length} nodes, ${edges.length} edges`);
  }

  const metrics = await retrievalRepo.getMetricWeightedNodes(snapshotId);
  const classRows = await retrievalRepo.getSemanticClassifications(snapshotId);

  const nodePathMap = buildNodePathMap(nodes);
  const centrality = buildCentrality(metrics, nodePathMap);
  const classifications = buildClassifications(classRows, nodePathMap);

  return { nodes, edges, centrality, classifications, nodePathMap };
}

retrievalRouter.post('/neighborhood', async (c) => {
  try {
    const body = await c.req.json();
    const { snapshotId, seedNodeIds, maxDepth, ordering } = body;

    if (!snapshotId || typeof snapshotId !== 'string') {
      return c.json({ success: false, error: 'snapshotId is required' }, 400);
    }
    if (!seedNodeIds || !Array.isArray(seedNodeIds) || seedNodeIds.length === 0) {
      return c.json({ success: false, error: 'seedNodeIds is required' }, 400);
    }

    const db = createDrizzleClient();
    const data = await loadRetrievalData(db, snapshotId);
    if (!data) {
      return c.json({ success: false, error: 'Snapshot not found or empty' }, 404);
    }

    const engine = new RetrievalEngine();
    const query: RetrievalQuery = {
      snapshotId,
      strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
      scope: RetrievalScope.NODE,
      seedNodeIds,
      maxDepth: Math.min(maxDepth ?? 5, 20),
      ordering: ordering ?? RetrievalOrdering.DETERMINISTIC,
    };

    const result = engine.retrieve({
      nodes: data.nodes,
      edges: data.edges,
      centrality: data.centrality,
      classifications: data.classifications,
      snapshotId,
    }, query);

    return c.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: message }, 500);
  }
});

retrievalRouter.post('/blast-radius', async (c) => {
  try {
    const body = await c.req.json();
    const { snapshotId, seedNodeId, maxDepth } = body;

    if (!snapshotId || typeof snapshotId !== 'string') {
      return c.json({ success: false, error: 'snapshotId is required' }, 400);
    }
    if (!seedNodeId || typeof seedNodeId !== 'string') {
      return c.json({ success: false, error: 'seedNodeId is required' }, 400);
    }

    const db = createDrizzleClient();
    const data = await loadRetrievalData(db, snapshotId);
    if (!data) {
      return c.json({ success: false, error: 'Snapshot not found or empty' }, 404);
    }

    const engine = new RetrievalEngine();
    const query: RetrievalQuery = {
      snapshotId,
      strategy: RetrievalStrategy.BLAST_RADIUS,
      scope: RetrievalScope.SUBGRAPH,
      seedNodeIds: [seedNodeId],
      maxDepth: Math.min(maxDepth ?? 10, 20),
      ordering: RetrievalOrdering.DETERMINISTIC,
    };

    const result = engine.retrieve({
      nodes: data.nodes,
      edges: data.edges,
      centrality: data.centrality,
      classifications: data.classifications,
      snapshotId,
    }, query);

    return c.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: message }, 500);
  }
});

retrievalRouter.post('/slice', async (c) => {
  try {
    const body = await c.req.json();
    const { snapshotId, semanticTypes, clusterNames } = body;

    if (!snapshotId || typeof snapshotId !== 'string') {
      return c.json({ success: false, error: 'snapshotId is required' }, 400);
    }

    const db = createDrizzleClient();
    const data = await loadRetrievalData(db, snapshotId);
    if (!data) {
      return c.json({ success: false, error: 'Snapshot not found or empty' }, 404);
    }

    const engine = new RetrievalEngine();
    const query: RetrievalQuery = {
      snapshotId,
      strategy: RetrievalStrategy.ARCHITECTURAL_SLICE,
      scope: RetrievalScope.CLUSTER,
      semanticTypes: semanticTypes as SemanticType[],
      clusterNames,
      ordering: RetrievalOrdering.DETERMINISTIC,
    };

    const result = engine.retrieve({
      nodes: data.nodes,
      edges: data.edges,
      centrality: data.centrality,
      classifications: data.classifications,
      snapshotId,
    }, query);

    return c.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: message }, 500);
  }
});

retrievalRouter.post('/symbols', async (c) => {
  try {
    const body = await c.req.json();
    const { snapshotId, symbolNames } = body;

    if (!snapshotId || typeof snapshotId !== 'string') {
      return c.json({ success: false, error: 'snapshotId is required' }, 400);
    }
    if (!symbolNames || !Array.isArray(symbolNames) || symbolNames.length === 0) {
      return c.json({ success: false, error: 'symbolNames is required' }, 400);
    }

    const db = createDrizzleClient();
    const data = await loadRetrievalData(db, snapshotId);
    if (!data) {
      return c.json({ success: false, error: 'Snapshot not found or empty' }, 404);
    }

    const engine = new RetrievalEngine();
    const query: RetrievalQuery = {
      snapshotId,
      strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
      scope: RetrievalScope.SYMBOL,
      seedSymbolNames: symbolNames,
      ordering: RetrievalOrdering.DETERMINISTIC,
    };

    const result = engine.retrieveSymbolNeighborhood({
      nodes: data.nodes,
      edges: data.edges,
      centrality: data.centrality,
      classifications: data.classifications,
      snapshotId,
    }, query);

    return c.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: message }, 500);
  }
});

export { retrievalRouter };
