import type { GraphQuery, QueryCondition } from '../types/index.ts';

const VALID_TARGETS = new Set([
  'NODES', 'EDGES', 'PATHS', 'NEIGHBORHOODS', 'CYCLES', 'HOTSPOTS',
]);

const VALID_OPERATORS = new Set([
  'EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE', 'IN', 'NIN', 'CONTAINS', 'MATCHES',
]);

const VALID_LOGIC_OPS = new Set(['AND', 'OR', 'NOT']);

export class QueryValidator {
  public validate(query: GraphQuery): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!query.id) errors.push('Missing query id');
    if (!query.target) errors.push('Missing query target');
    if (!VALID_TARGETS.has(query.target)) {
      errors.push(`Invalid query target: ${query.target}`);
    }
    if (!query.clauses) {
      errors.push('Missing query clauses');
    } else {
      const clauseErrors = this.validateClause(query.clauses);
      errors.push(...clauseErrors);
    }
    if (query.parameters) {
      const paramErrors = this.validateParameters(query.parameters);
      errors.push(...paramErrors.errors);
    }
    return { valid: errors.length === 0, errors };
  }

  private validateClause(clause: {
    logic?: string;
    conditions: QueryCondition[];
    subClauses?: unknown[];
  }): string[] {
    const errors: string[] = [];
    if (clause.logic && !VALID_LOGIC_OPS.has(clause.logic)) {
      errors.push(`Invalid logic operator: ${clause.logic}`);
    }
    if (!clause.conditions || clause.conditions.length === 0) {
      errors.push('Clause must have at least one condition');
    } else {
      const condErrors = this.validateConditions(clause.conditions);
      errors.push(...condErrors.errors);
    }
    if (clause.subClauses && clause.subClauses.length > 0) {
      for (let i = 0; i < clause.subClauses.length; i++) {
        const sub = clause.subClauses[i] as {
          logic?: string;
          conditions: QueryCondition[];
          subClauses?: unknown[];
        };
        const subErrors = this.validateClause(sub);
        errors.push(...subErrors.map((e) => `SubClause ${i}: ${e}`));
      }
    }
    return errors;
  }

  public validateConditions(
    conditions: QueryCondition[],
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (let i = 0; i < conditions.length; i++) {
      const c = conditions[i]!;
      if (!c.field) errors.push(`Condition ${i}: missing field`);
      if (!c.operator) errors.push(`Condition ${i}: missing operator`);
      else if (!VALID_OPERATORS.has(c.operator)) {
        errors.push(`Condition ${i}: invalid operator ${c.operator}`);
      }
      if (c.value === undefined || c.value === null) {
        errors.push(`Condition ${i}: missing value`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  public validateParameters(
    params: Record<string, unknown>,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (params.depth !== undefined && (typeof params.depth !== 'number' || params.depth < 0)) {
      errors.push('depth must be a non-negative number');
    }
    if (params.limit !== undefined && (typeof params.limit !== 'number' || params.limit < 0)) {
      errors.push('limit must be a non-negative number');
    }
    if (params.offset !== undefined && (typeof params.offset !== 'number' || params.offset < 0)) {
      errors.push('offset must be a non-negative number');
    }
    if (params.from !== undefined && typeof params.from !== 'string') {
      errors.push('from must be a string');
    }
    if (params.to !== undefined && typeof params.to !== 'string') {
      errors.push('to must be a string');
    }
    return { valid: errors.length === 0, errors };
  }
}
