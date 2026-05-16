export const FileCategory = {
  SOURCE_CODE: 'SOURCE_CODE',
  CONFIG: 'CONFIG',
  INFRASTRUCTURE: 'INFRASTRUCTURE',
  DOCUMENTATION: 'DOCUMENTATION',
  GENERATED: 'GENERATED',
  TEST: 'TEST',
  ASSET: 'ASSET',
  BINARY: 'BINARY',
  SECRET: 'SECRET',
  UNKNOWN: 'UNKNOWN',
} as const;

export type FileCategory = (typeof FileCategory)[keyof typeof FileCategory];

export const Language = {
  TypeScript: 'TypeScript',
  TSX: 'TSX',
  JavaScript: 'JavaScript',
  JSX: 'JSX',
  Python: 'Python',
  Rust: 'Rust',
  Go: 'Go',
  Java: 'Java',
  Ruby: 'Ruby',
  PHP: 'PHP',
  C: 'C',
  Cpp: 'C++',
  CSharp: 'C#',
  Swift: 'Swift',
  Kotlin: 'Kotlin',
  Scala: 'Scala',
  Yaml: 'YAML',
  Json: 'JSON',
  Toml: 'TOML',
  Markdown: 'Markdown',
  Dockerfile: 'Dockerfile',
  Terraform: 'Terraform',
  Shell: 'Shell',
  Sql: 'SQL',
  Assembly: 'Assembly',
  Protobuf: 'Protobuf',
  GraphQL: 'GraphQL',
  Unknown: 'Unknown',
} as const;

export type Language = (typeof Language)[keyof typeof Language];

export interface ClassifiedFile {
  path: string;
  extension: string;
  language: Language;
  classification: FileCategory;
  sizeBytes: number;
  reasons: string[];
}
