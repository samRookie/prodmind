import type { QueryNode, ConditionNode, LogicNode } from './graph-query-ast.ts';
import type { GraphQuery, QueryPlan } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { QueryExecutionError } from '../errors/index.ts';

export class GraphQueryExecutor {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public execute(ast: QueryNode): unknown {
    switch (ast.target.value) {
      case 'NODES':
        return this.executeFindNodes(ast);
      case 'EDGES':
        return this.executeFindEdges(ast);
      case 'PATHS':
        return this.executePaths(ast);
      case 'NEIGHBORHOODS':
        return this.executeExplore(ast);
      case 'CYCLES':
        return this.executeFindCycles(ast);
      case 'HOTSPOTS':
        return this.executeHotspots(ast);
      default:
        throw new QueryExecutionError(
          `Unknown target: ${ast.target.value}`,
        );
    }
  }

  public executeQuery(query: GraphQuery): unknown {
    const ast: QueryNode = {
      type: 'query',
      target: {
        type: 'target',
        value: query.target,
      },
      clauses: this.convertClauses(query.clauses),
      parameters: Object.entries(query.parameters)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => ({ type: 'parameter' as const, key: k, value: v })),
    };
    return this.execute(ast);
  }

  public executePlan(_plan: QueryPlan, ast: QueryNode): unknown {
    return this.execute(ast);
  }

  /* ---- internal clause conversion ---- */

  private convertClauses(clause: import('../types/index.ts').QueryClause): LogicNode[] {
    const conditions: (ConditionNode | LogicNode)[] = clause.conditions.map((c) => ({
      type: 'condition' as const,
      field: c.field,
      operator: c.operator,
      value: c.value,
    }));

    if (clause.subClauses && clause.subClauses.length > 0) {
      for (const sub of clause.subClauses) {
        conditions.push(...this.convertClauses(sub).flatMap((l) => l.conditions));
      }
    }

    const logicNode: LogicNode = {
      type: 'logic',
      operator: clause.logic ?? 'AND',
      conditions,
    };

    return [logicNode];
  }

  /* ---- NODES ---- */

  private executeFindNodes(ast: QueryNode): string[] {
    const allNodes = this.graph.getAllNodes();
    const conditions = this.flattenConditions(ast);
    return allNodes
      .filter((node) => this.matchesAllConditions(node as unknown as Record<string, unknown>, conditions))
      .map((node) => node.id);
  }

  private executeFindEdges(ast: QueryNode): string[] {
    const allNodes = this.graph.getAllNodes();
    const edgeIds = new Set<string>();
    const conditions = this.flattenConditions(ast);

    for (const node of allNodes) {
      const edges = this.graph.getEdgesForNode(node.id);
      for (const edge of edges) {
        const edgeRecord: Record<string, unknown> = {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          weight: edge.weight,
          ...edge.properties,
        };
        if (this.matchesAllConditions(edgeRecord, conditions)) {
          edgeIds.add(edge.id);
        }
      }
    }

    return Array.from(edgeIds);
  }

  /* ---- PATHS (trace / path-between) ---- */

  private executePaths(ast: QueryNode): unknown {
    const fromParam = ast.parameters.find((p) => p.key === 'from');
    const toParam = ast.parameters.find((p) => p.key === 'to');
    const depthParam = ast.parameters.find((p) => p.key === 'depth');

    if (!fromParam) {
      throw new QueryExecutionError('PATHS query requires a "from" parameter');
    }

    const from = String(fromParam.value);
    const maxDepth = depthParam ? Number(depthParam.value) : 10;

    if (toParam) {
      return this.findPathBetween(from, String(toParam.value), maxDepth);
    }
    return this.traceDependencies(from, maxDepth);
  }

  private findPathBetween(from: string, to: string, maxDepth: number): string[] | null {
    if (from === to) return [from];

    const visited = new Set<string>();
    const parent = new Map<string, string | null>();
    const queue: { id: string; depth: number }[] = [{ id: from, depth: 0 }];
    visited.add(from);
    parent.set(from, null);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.id === to) {
        return this.reconstructPath(parent, from, to);
      }
      if (current.depth >= maxDepth) continue;

      const node = this.graph.getNode(current.id);
      if (!node) continue;

      const neighbors = this.graph.getNeighbors(current.id);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          parent.set(neighbor.id, current.id);
          queue.push({ id: neighbor.id, depth: current.depth + 1 });
        }
      }
    }

    return null;
  }

  private reconstructPath(
    parent: Map<string, string | null>,
    from: string,
    to: string,
  ): string[] {
    const path: string[] = [];
    let current: string | null = to;
    while (current !== null) {
      path.unshift(current);
      current = parent.get(current) ?? null;
    }
    return path.length > 0 && path[0] === from ? path : [];
  }

  private traceDependencies(from: string, maxDepth: number): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();

    const dfs = (currentId: string, path: string[], depth: number) => {
      if (depth > maxDepth) return;
      if (visited.has(currentId) && depth > 0) return;

      visited.add(currentId);
      const newPath = [...path, currentId];
      paths.push(newPath);

      const node = this.graph.getNode(currentId);
      if (node) {
        const outgoing = this.graph.getOutgoingEdges(currentId);
        for (const edge of outgoing) {
          dfs(edge.target, newPath, depth + 1);
        }
      }

      visited.delete(currentId);
    };

    dfs(from, [], 0);
    return paths;
  }

  /* ---- NEIGHBORHOODS ---- */

  private executeExplore(ast: QueryNode): unknown {
    const fromParam = ast.parameters.find((p) => p.key === 'from');
    const depthParam = ast.parameters.find((p) => p.key === 'depth');

    if (!fromParam) {
      throw new QueryExecutionError('NEIGHBORHOODS query requires a "from" parameter');
    }

    const center = String(fromParam.value);
    const radius = depthParam ? Number(depthParam.value) : 2;

    const visited = new Set<string>();
    const nodes: string[] = [];
    const edges: string[] = [];
    const queue: { id: string; depth: number }[] = [{ id: center, depth: 0 }];
    visited.add(center);
    nodes.push(center);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= radius) continue;

      const node = this.graph.getNode(current.id);
      if (!node) continue;

      const nodeEdges = this.graph.getEdgesForNode(current.id);
      for (const edge of nodeEdges) {
        edges.push(edge.id);
        const neighbor = edge.source === current.id ? edge.target : edge.source;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          nodes.push(neighbor);
          queue.push({ id: neighbor, depth: current.depth + 1 });
        }
      }
    }

    const totalPossible = Math.pow(
      Math.max(this.graph.nodeCount(), 1),
      radius,
    );
    const density = totalPossible > 0 ? nodes.length / totalPossible : 0;

    return {
      center,
      nodes,
      edges: [...new Set(edges)],
      radius,
      nodeCount: nodes.length,
      edgeCount: new Set(edges).size,
      density: Math.min(density, 1),
    };
  }

  /* ---- CYCLES ---- */

  private executeFindCycles(ast: QueryNode): unknown {
    const allNodes = this.graph.getAllNodes();
    const conditions = this.flattenConditions(ast);
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const parent = new Map<string, string | null>();

    const dfs = (nodeId: string) => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const node = this.graph.getNode(nodeId);
      if (!node) return;

      const outgoing = this.graph.getOutgoingEdges(nodeId);
      for (const edge of outgoing) {
        if (!visited.has(edge.target)) {
          parent.set(edge.target, nodeId);
          dfs(edge.target);
        } else if (recStack.has(edge.target)) {
          const cycle: string[] = [];
          let current: string | null = nodeId;
          while (current !== null && current !== edge.target) {
            cycle.unshift(current);
            current = parent.get(current) ?? null;
          }
          cycle.unshift(edge.target);
          if (cycle.length >= 2) {
            cycle.push(edge.target);
            cycles.push(cycle);
          }
        }
      }

      recStack.delete(nodeId);
    };

    for (const node of allNodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }

    const matchesConditions = conditions.length === 0 || cycles.filter((cycle) => {
      const cycleRecord: Record<string, unknown> = {
        length: cycle.length - 1,
        nodeCount: cycle.length - 1,
        involves: cycle.slice(0, -1),
      };
      return this.matchesAllConditions(cycleRecord, conditions);
    });

    return matchesConditions;
  }

  /* ---- HOTSPOTS ---- */

  private executeHotspots(ast: QueryNode): unknown {
    const allNodes = this.graph.getAllNodes();
    const conditions = this.flattenConditions(ast);
    const hotspots: Array<{ nodeId: string; score: number; metrics: Record<string, number>; reason: string }> = [];

    for (const node of allNodes) {
      const incoming = this.graph.getIncomingEdges(node.id);
      const outgoing = this.graph.getOutgoingEdges(node.id);
      const fanIn = incoming.length;
      const fanOut = outgoing.length;
      const instability = fanOut + fanIn > 0 ? fanOut / (fanIn + fanOut) : 0;

      const metrics: Record<string, number> = { fanIn, fanOut, instability };
      const score = fanOut * 0.6 + fanIn * 0.3 + instability * 10;
      const reasons: string[] = [];
      if (fanOut > 20) reasons.push('high_fan_out');
      if (fanIn > 20) reasons.push('high_fan_in');
      if (instability > 0.8) reasons.push('high_instability');

      const record: Record<string, unknown> = { ...metrics, score, nodeId: node.id };
      if (this.matchesAllConditions(record, conditions)) {
        hotspots.push({
          nodeId: node.id,
          score: Math.round(score * 100) / 100,
          metrics,
          reason: reasons.join(', ') || 'normal',
        });
      }
    }

    hotspots.sort((a, b) => b.score - a.score);
    return hotspots;
  }

  /* ---- condition matching ---- */

  private flattenConditions(ast: QueryNode): ConditionNode[] {
    const result: ConditionNode[] = [];
    for (const clause of ast.clauses) {
      this.collectConditions(clause, result);
    }
    return result;
  }

  private collectConditions(
    node: LogicNode | ConditionNode,
    acc: ConditionNode[],
  ): void {
    if (node.type === 'condition') {
      acc.push(node);
      return;
    }
    for (const cond of node.conditions) {
      this.collectConditions(cond, acc);
    }
  }

  private matchesAllConditions(
    record: Record<string, unknown>,
    conditions: ConditionNode[],
  ): boolean {
    if (conditions.length === 0) return true;
    return conditions.every((c) =>
      this.matchCondition(record, c.field, c.operator, c.value),
    );
  }

  private matchCondition(
    node: Record<string, unknown>,
    field: string,
    operator: string,
    value: unknown,
  ): boolean {
    const fieldValue = node[field];

    switch (operator) {
      case 'EQ':
        return fieldValue === value;
      case 'NEQ':
        return fieldValue !== value;
      case 'GT':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue > value;
      case 'GTE':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue >= value;
      case 'LT':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue < value;
      case 'LTE':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue <= value;
      case 'IN':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'NIN':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'CONTAINS':
        return typeof fieldValue === 'string' && typeof value === 'string' && fieldValue.includes(value);
      case 'MATCHES':
        return typeof fieldValue === 'string' && typeof value === 'string' &&
          new RegExp(value, 'i').test(fieldValue);
      default:
        return false;
    }
  }
}
