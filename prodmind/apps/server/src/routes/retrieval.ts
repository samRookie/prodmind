import { Hono } from 'hono';
import { createDrizzleClient, RetrievalRepository } from '@prodmind/db';
import { RetrievalEngine } from '@prodmind/parser';
import type { RetrievalQuery } from '@prodmind/parser';
import { RetrievalStrategy, RetrievalScope, RetrievalOrdering } from '@prodmind/contracts';
import type { SemanticType } from '@prodmind/contracts';

const retrievalRouter = new Hono();

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
    const retrievalRepo = new RetrievalRepository(db);

    const { nodes, edges } = await retrievalRepo.getSnapshotGraph(snapshotId);
    if (nodes.length === 0) {
      return c.json({ success: false, error: 'Snapshot not found or empty' }, 404);
    }

    const metrics = await retrievalRepo.getMetricWeightedNodes(snapshotId);
    const classRows = await retrievalRepo.getSemanticClassifications(snapshotId);

    const centrality = metrics.filter((m) => m.metricType === 'CENTRALITY').map((m) => ({
      nodeId: m.nodeId ?? '',
      filePath: nodes.find((n) => n.id === m.nodeId)?.filePath ?? '',
      inDegree: 0,
      outDegree: 0,
      reachabilityCount: 0,
      dependencyInfluenceScore: m.metricValue,
      isUtilityHub: false,
    }));

    const classifications = classRows.map((r) => ({
      nodeId: r.nodeId,
      filePath: nodes.find((n) => n.id === r.nodeId)?.filePath ?? '',
      semanticType: r.semanticType as SemanticType,
      ruleStrength: r.ruleStrength as any,
      classificationReasons: JSON.parse(r.classificationReasonsJson ?? '[]'),
      matchedHeuristics: JSON.parse(r.matchedHeuristicsJson ?? '[]'),
    }));

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
      nodes,
      edges,
      centrality,
      classifications,
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
    const retrievalRepo = new RetrievalRepository(db);

    const { nodes, edges } = await retrievalRepo.getSnapshotGraph(snapshotId);
    if (nodes.length === 0) {
      return c.json({ success: false, error: 'Snapshot not found or empty' }, 404);
    }

    const metrics = await retrievalRepo.getMetricWeightedNodes(snapshotId);
    const classRows = await retrievalRepo.getSemanticClassifications(snapshotId);

    const centrality = metrics.filter((m) => m.metricType === 'CENTRALITY').map((m) => ({
      nodeId: m.nodeId ?? '',
      filePath: nodes.find((n) => n.id === m.nodeId)?.filePath ?? '',
      inDegree: 0,
      outDegree: 0,
      reachabilityCount: 0,
      dependencyInfluenceScore: m.metricValue,
      isUtilityHub: false,
    }));

    const classifications = classRows.map((r) => ({
      nodeId: r.nodeId,
      filePath: nodes.find((n) => n.id === r.nodeId)?.filePath ?? '',
      semanticType: r.semanticType as SemanticType,
      ruleStrength: r.ruleStrength as any,
      classificationReasons: JSON.parse(r.classificationReasonsJson ?? '[]'),
      matchedHeuristics: JSON.parse(r.matchedHeuristicsJson ?? '[]'),
    }));

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
      nodes,
      edges,
      centrality,
      classifications,
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
    const retrievalRepo = new RetrievalRepository(db);

    const { nodes, edges } = await retrievalRepo.getSnapshotGraph(snapshotId);
    if (nodes.length === 0) {
      return c.json({ success: false, error: 'Snapshot not found or empty' }, 404);
    }

    const metrics = await retrievalRepo.getMetricWeightedNodes(snapshotId);
    const classRows = await retrievalRepo.getSemanticClassifications(snapshotId);

    const centrality = metrics.filter((m) => m.metricType === 'CENTRALITY').map((m) => ({
      nodeId: m.nodeId ?? '',
      filePath: nodes.find((n) => n.id === m.nodeId)?.filePath ?? '',
      inDegree: 0,
      outDegree: 0,
      reachabilityCount: 0,
      dependencyInfluenceScore: m.metricValue,
      isUtilityHub: false,
    }));

    const classifications = classRows.map((r) => ({
      nodeId: r.nodeId,
      filePath: nodes.find((n) => n.id === r.nodeId)?.filePath ?? '',
      semanticType: r.semanticType as SemanticType,
      ruleStrength: r.ruleStrength as any,
      classificationReasons: JSON.parse(r.classificationReasonsJson ?? '[]'),
      matchedHeuristics: JSON.parse(r.matchedHeuristicsJson ?? '[]'),
    }));

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
      nodes,
      edges,
      centrality,
      classifications,
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
    const retrievalRepo = new RetrievalRepository(db);

    const { nodes, edges } = await retrievalRepo.getSnapshotGraph(snapshotId);
    if (nodes.length === 0) {
      return c.json({ success: false, error: 'Snapshot not found or empty' }, 404);
    }

    const metrics = await retrievalRepo.getMetricWeightedNodes(snapshotId);
    const classRows = await retrievalRepo.getSemanticClassifications(snapshotId);

    const centrality = metrics.filter((m) => m.metricType === 'CENTRALITY').map((m) => ({
      nodeId: m.nodeId ?? '',
      filePath: nodes.find((n) => n.id === m.nodeId)?.filePath ?? '',
      inDegree: 0,
      outDegree: 0,
      reachabilityCount: 0,
      dependencyInfluenceScore: m.metricValue,
      isUtilityHub: false,
    }));

    const classifications = classRows.map((r) => ({
      nodeId: r.nodeId,
      filePath: nodes.find((n) => n.id === r.nodeId)?.filePath ?? '',
      semanticType: r.semanticType as SemanticType,
      ruleStrength: r.ruleStrength as any,
      classificationReasons: JSON.parse(r.classificationReasonsJson ?? '[]'),
      matchedHeuristics: JSON.parse(r.matchedHeuristicsJson ?? '[]'),
    }));

    const engine = new RetrievalEngine();
    const query: RetrievalQuery = {
      snapshotId,
      strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
      scope: RetrievalScope.SYMBOL,
      seedSymbolNames: symbolNames,
      ordering: RetrievalOrdering.DETERMINISTIC,
    };

    const result = engine.retrieveSymbolNeighborhood({
      nodes,
      edges,
      centrality,
      classifications,
      snapshotId,
    }, query);

    return c.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: message }, 500);
  }
});

export { retrievalRouter };
