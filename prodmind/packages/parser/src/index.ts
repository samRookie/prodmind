export interface ParseResult {
  projectId: string;
  files: number;
  duration: number;
  success: boolean;
}

export interface ParserConfig {
  maxDepth: number;
  maxImports: number;
  timeout: number;
}

export async function parseProject(
  _projectPath: string,
  _config?: Partial<ParserConfig>,
): Promise<ParseResult> {
  throw new Error('Not implemented yet');
}
