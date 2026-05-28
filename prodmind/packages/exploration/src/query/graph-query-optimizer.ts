import type { QueryNode, ConditionNode, LogicNode } from './graph-query-ast.ts';


export class GraphQueryOptimizer {
  public optimize(ast: QueryNode): QueryNode {
    let node = ast;
    node = this.pushDownConditions(node);
    node = this.simplifyLogic(node);
    node = this.reorderJoins(node);
    return node;
  }

  public pushDownConditions(ast: QueryNode): QueryNode {
    const optimizedClauses = ast.clauses.map((clause) =>
      this.transformLogicNode(clause),
    );
    return { ...ast, clauses: optimizedClauses };
  }

  private transformLogicNode(node: LogicNode): LogicNode {
    if (node.operator === 'NOT' && node.conditions.length === 1) {
      const inner = node.conditions[0]!;
      if (inner.type === 'condition') {
        return {
          ...node,
          conditions: [this.invertCondition(inner)],
        };
      }
    }

    const optimizedConds = node.conditions.map((cond) => {
      if (cond.type === 'logic') {
        return this.transformLogicNode(cond);
      }
      return cond;
    });

    return { ...node, conditions: optimizedConds };
  }

  private invertCondition(cond: ConditionNode): ConditionNode {
    const invertMap: Record<string, string> = {
      EQ: 'NEQ',
      NEQ: 'EQ',
      GT: 'LTE',
      GTE: 'LT',
      LT: 'GTE',
      LTE: 'GT',
      IN: 'NIN',
      NIN: 'IN',
    };
    const inv = invertMap[cond.operator];
    if (inv) {
      return { ...cond, operator: inv as ConditionNode['operator'] };
    }
    return cond;
  }

  public simplifyLogic(ast: QueryNode): QueryNode {
    const simplifiedClauses = ast.clauses
      .map((clause) => this.simplifyLogicNode(clause))
      .filter((clause): clause is LogicNode => clause !== null);

    return { ...ast, clauses: simplifiedClauses };
  }

  private simplifyLogicNode(node: LogicNode): LogicNode | null {
    if (node.operator === 'NOT' && node.conditions.length === 0) {
      return null;
    }

    if (node.operator === 'AND') {
      const filtered = node.conditions.filter((c) => {
        if (c.type === 'condition') {
          if (c.operator === 'EQ' && c.value === true) return false;
        }
        return true;
      });

      if (filtered.length === 0) return null;
      if (filtered.length === 1 && filtered[0]!.type === 'condition') {
        return { ...node, conditions: filtered };
      }

      const hasFalse = node.conditions.some(
        (c) => c.type === 'condition' && c.operator === 'EQ' && c.value === false,
      );
      if (hasFalse) {
        return {
          type: 'logic',
          operator: 'AND',
          conditions: [
            {
              type: 'condition',
              field: '1',
              operator: 'EQ',
              value: 0,
            },
          ],
        };
      }

      return { ...node, conditions: filtered };
    }

    if (node.operator === 'OR') {
      const hasTrue = node.conditions.some(
        (c) => c.type === 'condition' && c.operator === 'EQ' && c.value === true,
      );
      if (hasTrue) {
        return {
          type: 'logic',
          operator: 'OR',
          conditions: [
            {
              type: 'condition',
              field: '1',
              operator: 'EQ',
              value: 1,
            },
          ],
        };
      }
    }

    const simplified = node.conditions
      .map((c) => (c.type === 'logic' ? this.simplifyLogicNode(c) : c))
      .filter((c): c is ConditionNode | LogicNode => c !== null);

    if (simplified.length === 0) return null;
    return { ...node, conditions: simplified };
  }

  public reorderJoins(ast: QueryNode): QueryNode {
    const reordered = ast.clauses.map((clause) => {
      return this.reorderLogicNode(clause);
    });

    return { ...ast, clauses: reordered };
  }

  private reorderLogicNode(node: LogicNode): LogicNode {
    if (node.operator !== 'AND') {
      return {
        ...node,
        conditions: node.conditions.map((c) =>
          c.type === 'logic' ? this.reorderLogicNode(c) : c,
        ),
      };
    }

    const conditions = [...node.conditions];
    conditions.sort((a, b) => {
      const costA = this.estimateConditionCost(a);
      const costB = this.estimateConditionCost(b);
      return costA - costB;
    });

    return {
      ...node,
      conditions: conditions.map((c) =>
        c.type === 'logic' ? this.reorderLogicNode(c) : c,
      ),
    };
  }

  private estimateConditionCost(
    node: ConditionNode | LogicNode,
  ): number {
    if (node.type === 'condition') {
      const selectivity: Record<string, number> = {
        EQ: 1,
        NEQ: 5,
        GT: 3,
        GTE: 3,
        LT: 3,
        LTE: 3,
        IN: 2,
        NIN: 5,
        CONTAINS: 4,
        MATCHES: 6,
      };
      return selectivity[node.operator] ?? 5;
    }
    return 10;
  }
}
