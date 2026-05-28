export class QueryError extends Error {
  public readonly code: string;
  public readonly position?: { line: number; column: number };

  constructor(code: string, message: string, position?: { line: number; column: number }) {
    super(message);
    this.name = 'QueryError';
    this.code = code;
    this.position = position;
  }
}
