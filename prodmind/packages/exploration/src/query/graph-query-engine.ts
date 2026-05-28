import type { GraphQuery, QueryPlan } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import type { QueryNode } from './graph-query-ast.ts';
import { GraphQueryParser } from './graph-query-parser.ts';
import { GraphQueryValidator } from './graph-query-validator.ts';
import { GraphQueryCompiler } from './graph-query-compiler.ts';
import { GraphQueryExecutor } from './graph-query-executor.ts';
import { generateId } from '../utils/index.ts';

export class GraphQueryEngine {
  private parser: GraphQueryParser;
  private validator: GraphQueryValidator;
  private compiler: GraphQueryCompiler;
  private executor: GraphQueryExecutor;
  private history: GraphQuery[];

  constructor(_graph: GraphContract) {
    this.parser = new GraphQueryParser();
    this.validator = new GraphQueryValidator();
    this.compiler = new GraphQueryCompiler();
    this.executor = new GraphQueryExecutor(_graph);
    this.history = [];
  }

  public query(dsl: string): { result: unknown; query: GraphQuery; duration: number } {
    const start = performance.now();
    const ast = this.parser.parse(dsl);
    const graphQuery = this.astToGraphQuery(dsl, ast);
    const valid = this.validator.validate(ast);
    if (!valid) {
      const errors = this.validator.getErrors();
      throw new Error(`Query validation failed: ${errors.join('; ')}`);
    }
    const plan = this.compiler.compile(ast);
    const result = this.executor.executePlan(plan, ast);
    const duration = performance.now() - start;

    graphQuery.fingerprint = this.compiler.fingerprint(ast);
    this.history.push(graphQuery);

    return { result, query: graphQuery, duration };
  }

  public parse(dsl: string): GraphQuery {
    const ast = this.parser.parse(dsl);
    return this.astToGraphQuery(dsl, ast);
  }

  public validate(dsl: string): { valid: boolean; errors: string[] } {
    try {
      const ast = this.parser.parse(dsl);
      const valid = this.validator.validate(ast);
      return {
        valid,
        errors: valid ? [] : this.validator.getErrors(),
      };
    } catch (err) {
      return {
        valid: false,
        errors: [err instanceof Error ? err.message : String(err)],
      };
    }
  }

  public compile(dsl: string): QueryPlan {
    const ast = this.parser.parse(dsl);
    return this.compiler.compile(ast);
  }

  public getHistory(): GraphQuery[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
  }

  private astToGraphQuery(dsl: string, ast: QueryNode): GraphQuery {
    const params: GraphQuery['parameters'] = {};
    for (const p of ast.parameters) {
      (params as Record<string, unknown>)[p.key] = p.value;
    }

    const conditions = ast.clauses.flatMap((clause) =>
      this.extractConditions(clause),
    );

    return {
      id: generateId('qry'),
      target: ast.target.value,
      clauses: {
        logic: ast.clauses.length > 0 ? undefined : undefined,
        conditions,
      },
      parameters: params,
      raw: dsl,
      fingerprint: '',
    };
  }

  private extractConditions(
    node: import('./graph-query-ast.ts').LogicNode | import('./graph-query-ast.ts').ConditionNode,
  ): import('../types/index.ts').QueryCondition[] {
    if (node.type === 'condition') {
      return [
        {
          field: node.field,
          operator: node.operator,
          value: node.value,
        },
      ];
    }
    return node.conditions.flatMap((c) => this.extractConditions(c));
  }
}
