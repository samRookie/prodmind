import type { QueryNode, LogicNode } from './graph-query-ast.ts';

const VALID_TARGETS = new Set([
  'NODES', 'EDGES', 'PATHS', 'NEIGHBORHOODS', 'CYCLES', 'HOTSPOTS',
]);

const VALID_OPERATORS = new Set([
  'EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE', 'IN', 'NIN', 'CONTAINS', 'MATCHES',
]);

const VALID_FIELDS_BY_TARGET: Record<string, Set<string>> = {
  NODES: new Set(['instability', 'fanIn', 'fanOut', 'type', 'name', 'module', 'complexity', 'cohesion']),
  EDGES: new Set(['weight', 'type', 'source', 'target', 'label']),
  PATHS: new Set(['length', 'weight', 'riskScore', 'riskLevel']),
  NEIGHBORHOODS: new Set(['radius', 'density', 'nodeCount', 'edgeCount']),
  CYCLES: new Set(['severity', 'length', 'nodeCount', 'involves']),
  HOTSPOTS: new Set(['score', 'fanIn', 'fanOut', 'instability', 'reason']),
};

export class GraphQueryValidator {
  private errors: string[] = [];
  private validTargets: Set<string>;
  private validOperators: Set<string>;
  private validFields: Set<string>;

  constructor() {
    this.validTargets = new Set(VALID_TARGETS);
    this.validOperators = new Set(VALID_OPERATORS);
    this.validFields = new Set<string>();
    for (const fields of Object.values(VALID_FIELDS_BY_TARGET)) {
      for (const f of fields) this.validFields.add(f);
    }
  }

  public validate(node: QueryNode): boolean {
    this.errors = [];
    if (!node || node.type !== 'query') {
      this.errors.push('Root node must be a query node');
      return false;
    }

    let valid = true;

    if (!this.validateTarget(node.target.value)) {
      valid = false;
    }

    for (const param of node.parameters) {
      if (!param.key || param.key.trim().length === 0) {
        this.errors.push('Parameter key cannot be empty');
        valid = false;
      }
    }

    for (const clause of node.clauses) {
      if (!this.validateLogicNode(clause, node.target.value)) {
        valid = false;
      }
    }

    return valid;
  }

  private validateLogicNode(node: LogicNode, target: string): boolean {
    if (!['AND', 'OR', 'NOT'].includes(node.operator)) {
      this.errors.push(`Invalid logic operator: ${node.operator}`);
      return false;
    }

    if (!node.conditions || node.conditions.length === 0) {
      this.errors.push('Logic node must have at least one condition');
      return false;
    }

    let valid = true;
    for (const cond of node.conditions) {
      if (cond.type === 'condition') {
        if (!this.validateCondition(cond.field, cond.operator, cond.value)) {
          valid = false;
        }
      } else if (cond.type === 'logic') {
        if (!this.validateLogicNode(cond, target)) {
          valid = false;
        }
      }
    }
    return valid;
  }

  public validateTarget(target: string): boolean {
    if (!this.validTargets.has(target)) {
      this.errors.push(
        `Invalid target '${target}'. Valid targets: ${Array.from(this.validTargets).join(', ')}`,
      );
      return false;
    }
    return true;
  }

  public validateOperator(operator: string): boolean {
    if (!this.validOperators.has(operator)) {
      this.errors.push(
        `Invalid operator '${operator}'. Valid operators: ${Array.from(this.validOperators).join(', ')}`,
      );
      return false;
    }
    return true;
  }

  public validateCondition(field: string, operator: string, value: unknown): boolean {
    let valid = true;

    if (!field || field.trim().length === 0) {
      this.errors.push('Field name cannot be empty');
      valid = false;
    }

    if (!this.validateOperator(operator)) {
      valid = false;
    }

    if (value === undefined) {
      this.errors.push(`Value for field '${field}' cannot be undefined`);
      valid = false;
    }

    if (['EQ', 'NEQ'].includes(operator) && value === null) {
      this.errors.push(`Operator ${operator} does not accept null value`);
      valid = false;
    }

    if (['GT', 'GTE', 'LT', 'LTE'].includes(operator)) {
      if (typeof value !== 'number') {
        this.errors.push(`Operator ${operator} requires a numeric value for field '${field}'`);
        valid = false;
      }
    }

    if (['IN', 'NIN'].includes(operator)) {
      if (!Array.isArray(value)) {
        this.errors.push(`Operator ${operator} requires an array value for field '${field}'`);
        valid = false;
      }
    }

    if (['CONTAINS', 'MATCHES'].includes(operator)) {
      if (typeof value !== 'string') {
        this.errors.push(`Operator ${operator} requires a string value for field '${field}'`);
        valid = false;
      }
    }

    return valid;
  }

  public getErrors(): string[] {
    return [...this.errors];
  }
}
