export type ASTNode = QueryNode | ConditionNode | LogicNode | TargetNode | ParameterNode;

export interface QueryNode {
  type: 'query';
  target: TargetNode;
  clauses: LogicNode[];
  parameters: ParameterNode[];
}

export interface TargetNode {
  type: 'target';
  value: 'NODES' | 'EDGES' | 'PATHS' | 'NEIGHBORHOODS' | 'CYCLES' | 'HOTSPOTS';
}

export interface ConditionNode {
  type: 'condition';
  field: string;
  operator: 'EQ' | 'NEQ' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'IN' | 'NIN' | 'CONTAINS' | 'MATCHES';
  value: unknown;
}

export interface LogicNode {
  type: 'logic';
  operator: 'AND' | 'OR' | 'NOT';
  conditions: (ConditionNode | LogicNode)[];
}

export interface ParameterNode {
  type: 'parameter';
  key: string;
  value: unknown;
}

const VALID_TARGETS: readonly string[] = ['NODES', 'EDGES', 'PATHS', 'NEIGHBORHOODS', 'CYCLES', 'HOTSPOTS'];
const VALID_OPERATORS: readonly string[] = ['EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE', 'IN', 'NIN', 'CONTAINS', 'MATCHES'];
const VALID_LOGIC_OPS: readonly string[] = ['AND', 'OR', 'NOT'];

export function createQueryNode(
  target: TargetNode,
  clauses: LogicNode[],
  parameters: ParameterNode[]
): QueryNode {
  return { type: 'query', target, clauses, parameters };
}

export function createTargetNode(value: string): TargetNode | null {
  const upper = value.toUpperCase();
  if (VALID_TARGETS.includes(upper)) {
    return { type: 'target', value: upper as TargetNode['value'] };
  }
  return null;
}

export function createConditionNode(
  field: string,
  operator: string,
  value: unknown
): ConditionNode | null {
  const upper = operator.toUpperCase();
  if (VALID_OPERATORS.includes(upper)) {
    return { type: 'condition', field, operator: upper as ConditionNode['operator'], value };
  }
  return null;
}

export function createLogicNode(
  operator: string,
  conditions: (ConditionNode | LogicNode)[]
): LogicNode | null {
  const upper = operator.toUpperCase();
  if (!VALID_LOGIC_OPS.includes(upper)) return null;
  if (conditions.length === 0) return null;
  return { type: 'logic', operator: upper as LogicNode['operator'], conditions };
}

export function createParameterNode(key: string, value: unknown): ParameterNode {
  return { type: 'parameter', key, value };
}
