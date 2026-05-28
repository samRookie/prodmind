import type { QueryNode, ConditionNode } from '../query/graph-query-ast.ts';
import type { GraphContract } from '../contracts/index.ts';

class AstOptimizer {
  public optimize(ast: QueryNode, _graph: GraphContract): QueryNode {
    const optimizedClauses = ast.clauses.map((clause) => {
      const sortedConditions = [...clause.conditions].sort((a, b) => {
        if (a.type === 'condition' && b.type === 'condition') {
          const fieldA = a.field;
          const fieldB = b.field;
          return fieldA.localeCompare(fieldB);
        }
        return 0;
      });
      return { ...clause, conditions: sortedConditions };
    });
    return { ...ast, clauses: optimizedClauses };
  }

  public estimateCost(ast: QueryNode): number {
    const clauseCost = ast.clauses.length * 10;
    const conditionCost = ast.clauses.reduce((sum, c) => sum + c.conditions.length * 5, 0);
    return clauseCost + conditionCost;
  }

  public selectIndex(ast: QueryNode, _graph: GraphContract): string {
    const conditions = ast.clauses.flatMap((c) => c.conditions);
    const fieldConditions = conditions.filter((c): c is ConditionNode =>
      c.type === 'condition',
    );
    for (const cond of fieldConditions) {
      if (cond.field === 'type' || cond.field === 'nodeType') {
        return `type_index:${cond.value}`;
      }
    }
    return 'full_scan';
  }

  public estimateCardinality(ast: QueryNode, graph: GraphContract): number {
    const totalNodes = graph.nodeCount();
    const selectivity = 1 / (ast.clauses.length + 1);
    return Math.max(1, Math.floor(totalNodes * selectivity));
  }
}

export class QueryOptimizer {
  private astOptimizer: AstOptimizer;

  constructor() {
    this.astOptimizer = new AstOptimizer();
  }

  public optimizeQuery(
    ast: QueryNode,
    graph: GraphContract,
  ): { ast: QueryNode; estimatedCost: number; improvements: string[] } {
    const improvements: string[] = [];
    const optimized = this.astOptimizer.optimize(ast, graph);
    const originalCost = this.astOptimizer.estimateCost(ast);
    const newCost = this.astOptimizer.estimateCost(optimized);
    if (newCost < originalCost) {
      improvements.push(`reduced estimated cost from ${originalCost} to ${newCost}`);
    }
    const index = this.astOptimizer.selectIndex(optimized, graph);
    if (index !== 'full_scan') {
      improvements.push(`using index: ${index}`);
    }
    return {
      ast: optimized,
      estimatedCost: newCost,
      improvements,
    };
  }

  public selectIndexStrategy(query: QueryNode, graph: GraphContract): string {
    return this.astOptimizer.selectIndex(query, graph);
  }

  public estimateCardinality(query: QueryNode, graph: GraphContract): number {
    return this.astOptimizer.estimateCardinality(query, graph);
  }
}
