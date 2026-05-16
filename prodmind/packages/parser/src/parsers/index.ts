export { parseTypeScriptFile } from './ts-parser.ts';
export { batchParseFiles } from './parser-orchestrator.ts';
export type { BatchParseOptions } from './parser-orchestrator.ts';
export { shouldParseFile, getLanguage } from './unsupported-files.ts';
export {
  ParserError,
  UnsupportedFileError,
  MalformedSyntaxError,
  WorkerParserError,
} from './parser-errors.ts';
