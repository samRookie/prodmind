import type { QueryNode, ConditionNode, LogicNode, ParameterNode } from './graph-query-ast.ts';
import { QueryParseError } from '../errors/index.ts';
import {
  createQueryNode,
  createTargetNode,
  createConditionNode,
  createLogicNode,
  createParameterNode,
} from './graph-query-ast.ts';

type TokenType =
  | 'KEYWORD'
  | 'IDENTIFIER'
  | 'NUMBER'
  | 'STRING'
  | 'OPERATOR'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'COMMA'
  | 'COLON'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  position: { line: number; column: number };
}

const KEYWORDS = new Set([
  'FIND', 'WHERE', 'TRACE', 'FROM', 'DEPTH', 'PATH', 'BETWEEN',
  'AND', 'OR', 'NOT', 'EXPLORE', 'OF', 'RADIUS', 'IN', 'NIN',
  'CONTAINS', 'MATCHES',
]);

const OPERATOR_MAP: [string, string][] = [
  ['!=', 'NEQ'],
  ['>=', 'GTE'],
  ['<=', 'LTE'],
  ['=', 'EQ'],
  ['>', 'GT'],
  ['<', 'LT'],
];

function mapOperator(dsl: string): string {
  for (const [d, mapped] of OPERATOR_MAP) {
    if (d === dsl) return mapped;
  }
  return dsl.toUpperCase();
}

export class GraphQueryParser {
  private tokens: Token[] = [];
  private pos = 0;

  public parse(input: string): QueryNode {
    this.pos = 0;
    this.tokens = this.tokenize(input);
    const query = this.parseQuery();
    if (this.peek().type !== 'EOF') {
      const t = this.peek();
      throw new QueryParseError(
        `Unexpected token '${t.value}' at ${t.position.line}:${t.position.column}`,
        { input, position: t.position },
      );
    }
    return query;
  }

  /* ------------------------------------------------------------------ */
  /*  Tokenizer                                                         */
  /* ------------------------------------------------------------------ */

  private tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    let line = 1;
    let col = 1;

    const add = (type: TokenType, value: string) => {
      tokens.push({ type, value, position: { line, column: col - value.length } });
    };

    while (i < input.length) {
      const ch = input[i]!;

      if (/\s/.test(ch)) {
        if (ch === '\n') { line++; col = 1; } else { col++; }
        i++;
        continue;
      }

      if (ch === '/' && input[i + 1] === '/') {
        while (i < input.length && input[i] !== '\n') i++;
        continue;
      }

      if (ch === '[') { add('LBRACKET', '['); i++; col++; continue; }
      if (ch === ']') { add('RBRACKET', ']'); i++; col++; continue; }
      if (ch === ',') { add('COMMA', ','); i++; col++; continue; }
      if (ch === ':') { add('COLON', ':'); i++; col++; continue; }

      if (ch === '"' || ch === "'") {
        const quote = ch;
        let str = '';
        i++; col++;
        while (i < input.length && input[i] !== quote) {
          if (input[i] === '\\' && i + 1 < input.length) {
            str += input[i + 1];
            i += 2;
            col += 2;
          } else {
            str += input[i];
            i++;
            col++;
          }
        }
        if (i < input.length) { i++; col++; }
        add('STRING', str);
        continue;
      }

      let matchedOp = false;
      for (const [opStr] of OPERATOR_MAP) {
        if (input.slice(i, i + opStr.length) === opStr) {
          add('OPERATOR', opStr);
          i += opStr.length;
          col += opStr.length;
          matchedOp = true;
          break;
        }
      }
      if (matchedOp) continue;

      if (/[0-9]/.test(ch)) {
        let num = '';
        while (i < input.length && /[0-9.]/.test(input[i]!)) {
          num += input[i];
          i++;
          col++;
        }
        add('NUMBER', num);
        continue;
      }

      if (/[a-zA-Z_$]/.test(ch)) {
        let ident = '';
        while (
          i < input.length &&
          /[a-zA-Z0-9_:$-]/.test(input[i]!)
        ) {
          let isOpStart = false;
          for (const [opStr] of OPERATOR_MAP) {
            if (input.slice(i, i + opStr.length) === opStr && opStr.length > 0) {
              isOpStart = true;
              break;
            }
          }
          if (isOpStart) break;
          if (/\s/.test(input[i]!)) break;
          ident += input[i];
          i++;
          col++;
        }
        const upper = ident.toUpperCase();
        if (KEYWORDS.has(upper)) {
          add('KEYWORD', upper);
        } else {
          add('IDENTIFIER', ident);
        }
        continue;
      }

      i++;
      col++;
    }

    add('EOF', '');
    return tokens;
  }

  /* ------------------------------------------------------------------ */
  /*  Parser helpers                                                     */
  /* ------------------------------------------------------------------ */

  private peek(): Token {
    return this.pos < this.tokens.length
      ? this.tokens[this.pos]!
      : this.tokens[this.tokens.length - 1]!;
  }

  private consume(expected?: string | TokenType): Token {
    const token = this.peek();
    if (expected !== undefined) {
      const matches =
        token.value === expected || token.type === expected;
      if (!matches) {
        throw new QueryParseError(
          `Expected ${expected} but got '${token.value}' at ${token.position.line}:${token.position.column}`,
          { expected, actual: token.value, position: token.position },
        );
      }
    }
    this.pos++;
    return token;
  }

  private matchKeyword(...values: string[]): boolean {
    const t = this.peek();
    return t.type === 'KEYWORD' && values.includes(t.value);
  }

  /* ------------------------------------------------------------------ */
  /*  Grammar                                                            */
  /* ------------------------------------------------------------------ */

  private parseQuery(): QueryNode {
    const t = this.peek();
    switch (t.value) {
      case 'FIND':    return this.parseFindQuery();
      case 'TRACE':   return this.parseTraceQuery();
      case 'PATH':    return this.parsePathQuery();
      case 'EXPLORE': return this.parseExploreQuery();
      default:
        throw new QueryParseError(
          `Expected FIND, TRACE, PATH, or EXPLORE but got '${t.value}'`,
          { position: t.position },
        );
    }
  }

  /* FIND nodes|edges|... WHERE field op value [AND/OR ...] */
  private parseFindQuery(): QueryNode {
    this.consume('FIND');
    const raw = this.consume('IDENTIFIER');
    const target = createTargetNode(raw.value);
    if (!target) {
      throw new QueryParseError(
        `Invalid target '${raw.value}'. Expected NODES, EDGES, PATHS, NEIGHBORHOODS, CYCLES, or HOTSPOTS`,
        { position: raw.position },
      );
    }

    const parameters: ParameterNode[] = [];
    let clauses: LogicNode[] = [];

    if (this.matchKeyword('WHERE')) {
      this.consume('WHERE');
      const conds = this.parseConditionList();
      if (conds.length > 0) {
        const logic = createLogicNode('AND', conds);
        if (logic) clauses = [logic];
      }
    }

    while (this.peek().type === 'IDENTIFIER' || this.peek().type === 'NUMBER') {
      const next = this.consume();
      const val: unknown = next.type === 'NUMBER' ? parseFloat(next.value) : next.value;
      parameters.push(createParameterNode(next.value, val));
    }

    return createQueryNode(target, clauses, parameters);
  }

  /* TRACE [dependencies|semantic|paths] FROM node [DEPTH n] */
  private parseTraceQuery(): QueryNode {
    this.consume('TRACE');
    const target = createTargetNode('PATHS');
    if (!target) throw new Error('Unexpected');

    const parameters: ParameterNode[] = [];

    const traceType = this.consume('IDENTIFIER');
    parameters.push(createParameterNode('traceType', traceType.value));

    this.consume('FROM');
    const from = this.consume('IDENTIFIER');
    parameters.push(createParameterNode('from', from.value));

    if (this.matchKeyword('DEPTH')) {
      this.consume('DEPTH');
      const depth = this.consume();
      parameters.push(createParameterNode('depth', parseFloat(depth.value)));
    }

    return createQueryNode(target, [], parameters);
  }

  /* PATH BETWEEN nodeA AND nodeB */
  private parsePathQuery(): QueryNode {
    this.consume('PATH');
    const target = createTargetNode('PATHS');
    if (!target) throw new Error('Unexpected');

    this.consume('BETWEEN');
    const from = this.consume('IDENTIFIER');
    this.consume('AND');
    const to = this.consume('IDENTIFIER');

    const parameters: ParameterNode[] = [
      createParameterNode('from', from.value),
      createParameterNode('to', to.value),
    ];

    return createQueryNode(target, [], parameters);
  }

  /* EXPLORE neighborhood OF node [RADIUS n] */
  private parseExploreQuery(): QueryNode {
    this.consume('EXPLORE');
    const target = createTargetNode('NEIGHBORHOODS');
    if (!target) throw new Error('Unexpected');

    this.consume('NEIGHBORHOOD');
    this.consume('OF');
    const from = this.consume('IDENTIFIER');

    const parameters: ParameterNode[] = [
      createParameterNode('from', from.value),
    ];

    if (this.matchKeyword('RADIUS')) {
      this.consume('RADIUS');
      const depth = this.consume();
      parameters.push(createParameterNode('depth', parseFloat(depth.value)));
    }

    return createQueryNode(target, [], parameters);
  }

  /* conditionList := condition (booleanOp condition)* */
  private parseConditionList(): (ConditionNode | LogicNode)[] {
    const conditions: (ConditionNode | LogicNode)[] = [];
    conditions.push(this.parseCondition());

    while (this.matchKeyword('AND', 'OR', 'NOT')) {
      const op = this.consume().value;
      const next = this.parseCondition();
      const last = conditions[conditions.length - 1];
      if (last && last.type === 'condition') {
        const logic = createLogicNode(op, [last, next]);
        if (logic) {
          conditions[conditions.length - 1] = logic;
        }
      } else if (last && last.type === 'logic' && last.operator === op) {
        last.conditions.push(next);
      } else {
        const logic = createLogicNode(op, [last!, next]);
        if (logic) {
          conditions[conditions.length - 1] = logic;
        }
      }
    }

    return conditions;
  }

  /* condition := IDENTIFIER OPERATOR value */
  private parseCondition(): ConditionNode {
    const field = this.consume('IDENTIFIER').value;
    const opTok = this.consume('OPERATOR');
    const op = mapOperator(opTok.value);
    const value = this.parseValue();

    const node = createConditionNode(field, op, value);
    if (!node) {
      throw new QueryParseError(
        `Invalid operator '${op}' for field '${field}'`,
        { position: opTok.position },
      );
    }
    return node;
  }

  /* value := NUMBER | STRING | IDENTIFIER | '[' list ']' */
  private parseValue(): unknown {
    const t = this.peek();
    if (t.type === 'NUMBER') {
      this.consume();
      return parseFloat(t.value);
    }
    if (t.type === 'STRING') {
      this.consume();
      return t.value;
    }
    if (t.type === 'LBRACKET') {
      return this.parseArray();
    }
    if (t.type === 'IDENTIFIER') {
      this.consume();
      if (t.value.toLowerCase() === 'true') return true;
      if (t.value.toLowerCase() === 'false') return false;
      if (t.value.toLowerCase() === 'null') return null;
      return t.value;
    }
    throw new QueryParseError(
      `Expected a value but got '${t.value}' at ${t.position.line}:${t.position.column}`,
      { position: t.position },
    );
  }

  private parseArray(): unknown[] {
    this.consume('LBRACKET');
    const arr: unknown[] = [];
    if (this.peek().type !== 'RBRACKET') {
      arr.push(this.parseValue());
      while (this.peek().type === 'COMMA') {
        this.consume('COMMA');
        arr.push(this.parseValue());
      }
    }
    this.consume('RBRACKET');
    return arr;
  }
}
