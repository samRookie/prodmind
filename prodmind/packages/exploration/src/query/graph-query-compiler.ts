import type { QueryNode } from './graph-query-ast.ts';
import type { QueryPlan } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { computeHash } from '../utils/index.ts';
import { TraversalOrdering } from '../traversal/traversal-ordering.ts';

export class GraphQueryCompiler {
  public compile(ast: QueryNode): QueryPlan {
    const steps: string[] = [];
    let estimatedCost = 0;
    let estimatedNodes = 0;
    let estimatedDepth = 0;
    let parallelism = false;

    switch (ast.target.value) {
      case 'NODES': {
        estimatedNodes = 100;
        estimatedDepth = 0;
        steps.push('scan_all_nodes');
        steps.push('apply_conditions');
        if (ast.clauses.length > 0) {
          steps.push('filter_results');
          estimatedCost = 50 + ast.clauses.length * 10;
        } else {
          estimatedCost = 50;
        }
        break;
      }

      case 'EDGES': {
        estimatedNodes = 0;
        estimatedDepth = 0;
        steps.push('scan_all_edges');
        steps.push('apply_conditions');
        if (ast.clauses.length > 0) {
          steps.push('filter_results');
          estimatedCost = 40 + ast.clauses.length * 8;
        } else {
          estimatedCost = 40;
        }
        break;
      }

      case 'PATHS': {
        const fromParam = ast.parameters.find((p) => p.key === 'from');
        const toParam = ast.parameters.find((p) => p.key === 'to');
        const depthParam = ast.parameters.find((p) => p.key === 'depth');

        estimatedDepth = depthParam ? (depthParam.value as number) : 10;
        estimatedNodes = Math.pow(3, Math.min(estimatedDepth, 6));

        steps.push('locate_start_node');
        if (fromParam) steps.push(`set_source:${String(fromParam.value)}`);
        if (toParam) {
          steps.push('bidirectional_search');
          parallelism = true;
          steps.push(`set_target:${String(toParam.value)}`);
        } else {
          steps.push('forward_traversal');
        }
        if (depthParam) steps.push(`depth_bound:${String(depthParam.value)}`);
        steps.push('collect_paths');
        estimatedCost = 30 + estimatedNodes * 2;
        break;
      }

      case 'NEIGHBORHOODS': {
        const depthParam = ast.parameters.find((p) => p.key === 'depth');
        estimatedDepth = depthParam ? (depthParam.value as number) : 2;
        estimatedNodes = Math.pow(3, estimatedDepth);

        steps.push('locate_center_node');
        steps.push('bfs_expansion');
        steps.push(`radius_bound:${estimatedDepth}`);
        steps.push('collect_neighborhood');
        estimatedCost = 20 + estimatedNodes;
        break;
      }

      case 'CYCLES': {
        estimatedDepth = 0;
        estimatedNodes = 100;

        steps.push('scan_for_cycles');
        steps.push('dfs_with_coloring');
        steps.push('collect_cycles');
        steps.push('severity_assessment');
        estimatedCost = 100;
        break;
      }

      case 'HOTSPOTS': {
        estimatedDepth = 0;
        estimatedNodes = 100;

        steps.push('scan_nodes');
        steps.push('compute_metrics');
        steps.push('score_nodes');
        steps.push('rank_by_score');
        steps.push('apply_conditions');
        estimatedCost = 80;
        break;
      }
    }

    const ordering = new TraversalOrdering();
    const ordered = ordering.order(steps);
    const orderedSteps = ordered.steps ?? steps;

    return {
      steps: orderedSteps,
      estimatedCost,
      estimatedNodes,
      estimatedDepth,
      parallelism,
    };
  }

  public estimateCost(ast: QueryNode, graph: GraphContract): number {
    const totalNodes = graph.nodeCount();
    const totalEdges = graph.edgeCount();

    switch (ast.target.value) {
      case 'NODES':
        return totalNodes * 0.5;
      case 'EDGES':
        return totalEdges * 0.3;
      case 'PATHS': {
        const depthParam = ast.parameters.find((p) => p.key === 'depth');
        const depth = depthParam ? (depthParam.value as number) : 10;
        const branchFactor = Math.min(
          totalEdges / Math.max(totalNodes, 1),
          5,
        );
        return Math.pow(branchFactor, depth) * 0.1;
      }
      case 'NEIGHBORHOODS': {
        const depthParam = ast.parameters.find((p) => p.key === 'depth');
        const depth = depthParam ? (depthParam.value as number) : 2;
        const branchFactor = Math.min(
          totalEdges / Math.max(totalNodes, 1),
          5,
        );
        return Math.pow(branchFactor, depth) * 0.2;
      }
      case 'CYCLES':
        return totalNodes * totalEdges * 0.01;
      case 'HOTSPOTS':
        return totalNodes * 0.3;
    }
  }

  public fingerprint(ast: QueryNode): string {
    const repr = JSON.stringify(ast, (key, value) => {
      if (key === 'type') return undefined;
      return value;
    });
    return computeHash(repr);
  }
}
