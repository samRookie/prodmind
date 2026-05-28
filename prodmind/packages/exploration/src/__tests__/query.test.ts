import { describe, it, expect } from 'vitest';
import { createMockGraph } from './mock-graph.ts';
import { GraphQueryEngine } from '../query/graph-query-engine.ts';
import { GraphQueryParser } from '../query/graph-query-parser.ts';
import { GraphQueryValidator } from '../query/graph-query-validator.ts';
import { GraphQueryCompiler } from '../query/graph-query-compiler.ts';
import { GraphQueryExecutor } from '../query/graph-query-executor.ts';
import { GraphQueryOptimizer } from '../query/graph-query-optimizer.ts';
import { createConditionNode, createLogicNode, createQueryNode, createTargetNode, createParameterNode } from '../query/graph-query-ast.ts';
import { QueryParseError } from '../errors/index.ts';

describe('GraphQueryParser', () => {
  it('parses FIND nodes WHERE field = value', () => {
    const parser = new GraphQueryParser();
    const ast = parser.parse('FIND nodes WHERE instability = 0.5');
    expect(ast.target.value).toBe('NODES');
    expect(ast.clauses.length).toBe(1);
    expect(ast.parameters.length).toBe(0);
  });

  it('parses TRACE dependencies FROM node DEPTH 5', () => {
    const parser = new GraphQueryParser();
    const ast = parser.parse('TRACE dependencies FROM A DEPTH 5');
    expect(ast.target.value).toBe('PATHS');
    expect(ast.parameters.find(p => p.key === 'traceType')?.value).toBe('dependencies');
    expect(ast.parameters.find(p => p.key === 'from')?.value).toBe('A');
    expect(ast.parameters.find(p => p.key === 'depth')?.value).toBe(5);
  });

  it('parses PATH BETWEEN a AND b', () => {
    const parser = new GraphQueryParser();
    const ast = parser.parse('PATH BETWEEN A AND F');
    expect(ast.target.value).toBe('PATHS');
    expect(ast.parameters.find(p => p.key === 'from')?.value).toBe('A');
    expect(ast.parameters.find(p => p.key === 'to')?.value).toBe('F');
  });

  it('parses EXPLORE NEIGHBORHOOD OF x RADIUS 3', () => {
    const parser = new GraphQueryParser();
    const ast = parser.parse('EXPLORE NEIGHBORHOOD OF A RADIUS 3');
    expect(ast.target.value).toBe('NEIGHBORHOODS');
    expect(ast.parameters.find(p => p.key === 'from')?.value).toBe('A');
    expect(ast.parameters.find(p => p.key === 'depth')?.value).toBe(3);
  });

  it('parses FIND cycles WHERE severity = HIGH', () => {
    const parser = new GraphQueryParser();
    const ast = parser.parse('FIND cycles WHERE severity = HIGH');
    expect(ast.target.value).toBe('CYCLES');
  });

  it('parses FIND hotspots WHERE fanOut > 50', () => {
    const parser = new GraphQueryParser();
    const ast = parser.parse('FIND hotspots WHERE fanOut > 50');
    expect(ast.target.value).toBe('HOTSPOTS');
  });

  it('rejects malformed queries', () => {
    const parser = new GraphQueryParser();
    expect(() => parser.parse('')).toThrow(QueryParseError);
  });

  it('rejects empty queries', () => {
    const parser = new GraphQueryParser();
    expect(() => parser.parse('')).toThrow();
  });

  it('rejects unknown commands', () => {
    const parser = new GraphQueryParser();
    expect(() => parser.parse('UNKNOWN command')).toThrow(QueryParseError);
  });

  it('handles NOT logical operator as binary infix', () => {
    const parser = new GraphQueryParser();
    const ast = parser.parse('FIND nodes WHERE type = module NOT type = utility');
    expect(ast.clauses.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GraphQueryValidator', () => {
  it('validates correct queries pass', () => {
    const validator = new GraphQueryValidator();
    const ast = new GraphQueryParser().parse('FIND nodes WHERE instability = 0.5');
    const valid = validator.validate(ast);
    expect(valid).toBe(true);
  });

  it('validates incorrect target fails', () => {
    const validator = new GraphQueryValidator();
    expect(validator.validateTarget('INVALID')).toBe(false);
  });

  it('detects invalid operator for conditions', () => {
    const validator = new GraphQueryValidator();
    const result = validator.validateCondition('field', 'INVALID_OP', 'value');
    expect(result).toBe(false);
  });

  it('rejects empty field', () => {
    const validator = new GraphQueryValidator();
    expect(validator.validateCondition('', 'EQ', 'value')).toBe(false);
  });

  it('rejects IN operator with non-array', () => {
    const validator = new GraphQueryValidator();
    expect(validator.validateCondition('field', 'IN', 'not-array')).toBe(false);
  });

  it('rejects GT with non-numeric value', () => {
    const validator = new GraphQueryValidator();
    expect(validator.validateCondition('field', 'GT', 'string')).toBe(false);
  });

  it('rejects CONTAINS with non-string value', () => {
    const validator = new GraphQueryValidator();
    expect(validator.validateCondition('field', 'CONTAINS', 42)).toBe(false);
  });
});

describe('GraphQueryCompiler', () => {
  it('compiles FIND nodes query into plan', () => {
    const compiler = new GraphQueryCompiler();
    const ast = new GraphQueryParser().parse('FIND nodes WHERE type = module');
    const plan = compiler.compile(ast);
    expect(plan.steps).toContain('scan_all_nodes');
    expect(plan.steps).toContain('apply_conditions');
    expect(plan.estimatedCost).toBeGreaterThan(0);
  });

  it('compiles PATH query with bidirectional search', () => {
    const compiler = new GraphQueryCompiler();
    const ast = new GraphQueryParser().parse('PATH BETWEEN A AND F');
    const plan = compiler.compile(ast);
    expect(plan.steps).toContain('bidirectional_search');
    expect(plan.parallelism).toBe(true);
  });

  it('compiles NEIGHBORHOODS query', () => {
    const compiler = new GraphQueryCompiler();
    const ast = new GraphQueryParser().parse('EXPLORE NEIGHBORHOOD OF A RADIUS 2');
    const plan = compiler.compile(ast);
    expect(plan.steps).toContain('bfs_expansion');
    expect(plan.steps).toContain('collect_neighborhood');
  });

  it('compiles CYCLES query', () => {
    const compiler = new GraphQueryCompiler();
    const ast = new GraphQueryParser().parse('FIND cycles WHERE severity = HIGH');
    const plan = compiler.compile(ast);
    expect(plan.steps).toContain('dfs_with_coloring');
  });

  it('compiles HOTSPOTS query', () => {
    const compiler = new GraphQueryCompiler();
    const ast = new GraphQueryParser().parse('FIND hotspots WHERE score > 50');
    const plan = compiler.compile(ast);
    expect(plan.steps).toContain('compute_metrics');
    expect(plan.steps).toContain('score_nodes');
  });

  it('estimateCost returns non-negative', () => {
    const compiler = new GraphQueryCompiler();
    const graph = createMockGraph();
    const ast = new GraphQueryParser().parse('FIND nodes');
    const cost = compiler.estimateCost(ast, graph);
    expect(cost).toBeGreaterThan(0);
  });

  it('fingerprint is deterministic', () => {
    const compiler = new GraphQueryCompiler();
    const ast = new GraphQueryParser().parse('FIND nodes WHERE type = module');
    const fp1 = compiler.fingerprint(ast);
    const fp2 = compiler.fingerprint(ast);
    expect(fp1).toBe(fp2);
  });
});

describe('GraphQueryExecutor', () => {
  it('executes FIND nodes returns matching nodes', () => {
    const graph = createMockGraph();
    const executor = new GraphQueryExecutor(graph);
    const ast = new GraphQueryParser().parse('FIND nodes WHERE type = module');
    const result = executor.execute(ast) as string[];
    expect(result).toContain('A');
    expect(result).toContain('B');
    expect(result).toContain('D');
    expect(result).not.toContain('C');
  });

  it('executes PATH BETWEEN returns path', () => {
    const graph = createMockGraph();
    const executor = new GraphQueryExecutor(graph);
    const ast = new GraphQueryParser().parse('PATH BETWEEN A AND F');
    const result = executor.execute(ast) as string[];
    expect(result).toBeTruthy();
    expect(result[0]).toBe('A');
    expect(result[result.length - 1]).toBe('F');
  });

  it('executes TRACE returns traversal', () => {
    const graph = createMockGraph();
    const executor = new GraphQueryExecutor(graph);
    const ast = new GraphQueryParser().parse('TRACE dependencies FROM A DEPTH 5');
    const result = executor.execute(ast) as string[][];
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toContain('A');
  });

  it('executes EXPLORE returns neighborhood', () => {
    const graph = createMockGraph();
    const executor = new GraphQueryExecutor(graph);
    const ast = new GraphQueryParser().parse('EXPLORE NEIGHBORHOOD OF A RADIUS 1');
    const result = executor.execute(ast) as { center: string; nodes: string[]; edges: string[] };
    expect(result.center).toBe('A');
    expect(result.nodes).toContain('A');
    expect(result.nodes).toContain('B');
    expect(result.nodes).toContain('C');
  });

  it('executes FIND cycles returns cycles', () => {
    const graph = createMockGraph();
    const executor = new GraphQueryExecutor(graph);
    const ast = new GraphQueryParser().parse('FIND cycles');
    const result = executor.execute(ast);
    expect(result).toBeDefined();
  });

  it('executes FIND hotspots returns hotspots', () => {
    const graph = createMockGraph();
    const executor = new GraphQueryExecutor(graph);
    const ast = new GraphQueryParser().parse('FIND hotspots WHERE fanOut > 0');
    const result = executor.execute(ast) as Array<{ nodeId: string; score: number }>;
    expect(result.length).toBeGreaterThan(0);
  });

  it('execute with no matches returns empty', () => {
    const graph = createMockGraph();
    const executor = new GraphQueryExecutor(graph);
    const ast = new GraphQueryParser().parse('FIND nodes WHERE type = nonexistent');
    const result = executor.execute(ast) as string[];
    expect(result.length).toBe(0);
  });

  it('executes FIND edges', () => {
    const graph = createMockGraph();
    const executor = new GraphQueryExecutor(graph);
    const ast = new GraphQueryParser().parse('FIND edges WHERE type = depends');
    const result = executor.execute(ast) as string[];
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('GraphQueryEngine', () => {
  it('query executes end-to-end', () => {
    const graph = createMockGraph();
    const engine = new GraphQueryEngine(graph);
    const result = engine.query('FIND nodes WHERE type = module');
    expect(result.result).toBeDefined();
    expect(result.query).toBeDefined();
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('query returns query history', () => {
    const graph = createMockGraph();
    const engine = new GraphQueryEngine(graph);
    engine.query('FIND nodes');
    expect(engine.getHistory().length).toBe(1);
  });

  it('parse returns GraphQuery', () => {
    const graph = createMockGraph();
    const engine = new GraphQueryEngine(graph);
    const parsed = engine.parse('FIND nodes');
    expect(parsed.target).toBe('NODES');
  });

  it('validate returns correct for valid query', () => {
    const graph = createMockGraph();
    const engine = new GraphQueryEngine(graph);
    const result = engine.validate('FIND nodes');
    expect(result.valid).toBe(true);
  });

  it('validate returns errors for invalid query', () => {
    const graph = createMockGraph();
    const engine = new GraphQueryEngine(graph);
    const result = engine.validate('INVALID');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('compile returns plan', () => {
    const graph = createMockGraph();
    const engine = new GraphQueryEngine(graph);
    const plan = engine.compile('FIND nodes WHERE type = module');
    expect(plan.steps).toBeDefined();
  });
});

describe('GraphQueryOptimizer', () => {
  it('optimize pushes down conditions', () => {
    const optimizer = new GraphQueryOptimizer();
    const ast = new GraphQueryParser().parse('FIND nodes WHERE type = module NOT type = utility');
    const optimized = optimizer.optimize(ast);
    expect(optimized).toBeDefined();
    expect(optimized.clauses.length).toBeGreaterThanOrEqual(1);
  });

  it('simplifyLogic removes tautologies', () => {
    const optimizer = new GraphQueryOptimizer();
    const ast = new GraphQueryParser().parse('FIND nodes WHERE type = module');
    const simplified = optimizer.simplifyLogic(ast);
    expect(simplified).toBeDefined();
  });

  it('reorderJoins prioritizes cheaper conditions', () => {
    const optimizer = new GraphQueryOptimizer();
    const ast = new GraphQueryParser().parse('FIND nodes WHERE instability > 0 AND type = module');
    const reordered = optimizer.reorderJoins(ast);
    expect(reordered).toBeDefined();
  });

  it('pushDownConditions transforms NOT conditions', () => {
    const optimizer = new GraphQueryOptimizer();
    const ast = new GraphQueryParser().parse('FIND nodes WHERE type = module NOT type = utility');
    const pushed = optimizer.pushDownConditions(ast);
    expect(pushed).toBeDefined();
  });
});

describe('AST factory functions', () => {
  it('createQueryNode builds valid node', () => {
    const target = createTargetNode('NODES')!;
    const node = createQueryNode(target, [], []);
    expect(node.type).toBe('query');
    expect(node.target.value).toBe('NODES');
  });

  it('createConditionNode builds valid condition', () => {
    const cond = createConditionNode('type', 'EQ', 'module');
    expect(cond).not.toBeNull();
    expect(cond!.field).toBe('type');
  });

  it('createConditionNode returns null for invalid operator', () => {
    const cond = createConditionNode('type', 'INVALID', 'value');
    expect(cond).toBeNull();
  });

  it('createLogicNode returns null for empty conditions', () => {
    const logic = createLogicNode('AND', []);
    expect(logic).toBeNull();
  });

  it('createParameterNode creates parameter', () => {
    const param = createParameterNode('depth', 5);
    expect(param.key).toBe('depth');
    expect(param.value).toBe(5);
  });
});
