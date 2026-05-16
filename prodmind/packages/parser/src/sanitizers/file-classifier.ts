import type { ClassifiedFile, FileCategory, Language } from '../types/classification.types.ts';
import { FileCategory as FC, Language as L } from '../types/classification.types.ts';
import { IgnoreRules } from './ignore-rules.ts';
import { FileClassificationError } from './sanitization-errors.ts';

const LANGUAGE_MAP: ReadonlyMap<string, Language> = new Map([
  ['.ts', L.TypeScript],
  ['.tsx', L.TSX],
  ['.mts', L.TypeScript],
  ['.cts', L.TypeScript],
  ['.js', L.JavaScript],
  ['.jsx', L.JSX],
  ['.mjs', L.JavaScript],
  ['.cjs', L.JavaScript],
  ['.py', L.Python],
  ['.rs', L.Rust],
  ['.go', L.Go],
  ['.java', L.Java],
  ['.rb', L.Ruby],
  ['.php', L.PHP],
  ['.c', L.C],
  ['.cpp', L.Cpp],
  ['.cc', L.Cpp],
  ['.cxx', L.Cpp],
  ['.h', L.C],
  ['.hpp', L.Cpp],
  ['.cs', L.CSharp],
  ['.swift', L.Swift],
  ['.kt', L.Kotlin],
  ['.kts', L.Kotlin],
  ['.scala', L.Scala],
  ['.yaml', L.Yaml],
  ['.yml', L.Yaml],
  ['.json', L.Json],
  ['.json5', L.Json],
  ['.jsonc', L.Json],
  ['.toml', L.Toml],
  ['.md', L.Markdown],
  ['.mdx', L.Markdown],
  ['.sh', L.Shell],
  ['.bash', L.Shell],
  ['.zsh', L.Shell],
  ['.sql', L.Sql],
  ['.asm', L.Assembly],
  ['.proto', L.Protobuf],
  ['.graphql', L.GraphQL],
  ['.gql', L.GraphQL],
  ['.tf', L.Terraform],
  ['.tfvars', L.Terraform],
]);

const ASSET_EXTENSIONS: ReadonlySet<string> = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp4', '.webm', '.avi', '.mov', '.mkv',
  '.mp3', '.wav', '.ogg', '.flac',
]);

const GENERATED_PATTERNS: ReadonlyArray<RegExp> = [
  /\.d\.[cm]?ts$/,
  /\.generated\./,
  /\.pb\./,
  /\.grpc\./,
  /\.min\.(js|css)$/,
  /\.bundle\./,
];

export class FileClassifier {
  private readonly ignoreRules: IgnoreRules;

  public constructor(ignoreRules?: IgnoreRules) {
    this.ignoreRules = ignoreRules ?? new IgnoreRules();
  }

  public classify(path: string, sizeBytes: number): ClassifiedFile {
    const extension = this.ignoreRules.getExtension(path);
    const fileName = path.split(/[/\\]/).pop() ?? '';
    const reasons: string[] = [];

    const classification = this.determineClassification(path, fileName, extension, reasons);
    const language = this.determineLanguage(extension, fileName, classification);

    return {
      path,
      extension,
      language,
      classification,
      sizeBytes,
      reasons,
    };
  }

  public classifyBatch(entries: Array<{ path: string; sizeBytes: number }>): ClassifiedFile[] {
    const results: ClassifiedFile[] = [];
    for (const entry of entries) {
      try {
        results.push(this.classify(entry.path, entry.sizeBytes));
      } catch (err) {
        throw new FileClassificationError(
          `Failed to classify "${entry.path}": ${err instanceof Error ? err.message : String(err)}`,
          { path: entry.path },
        );
      }
    }
    return this.sortByPath(results);
  }

  private determineClassification(
    path: string,
    fileName: string,
    extension: string,
    reasons: string[],
  ): FileCategory {
    const normalizedPath = path.replace(/\\/g, '/');

    if (this.isSecretFile(fileName, normalizedPath)) {
      reasons.push('File is a secrets/credentials file');
      return FC.SECRET;
    }

    if (this.ignoreRules.isBinaryExtension(extension)) {
      reasons.push(`Binary file extension: ${extension}`);
      return FC.BINARY;
    }

    if (ASSET_EXTENSIONS.has(extension)) {
      reasons.push(`Asset file extension: ${extension}`);
      return FC.ASSET;
    }

    if (this.isTestFile(normalizedPath, fileName)) {
      reasons.push('File is a test file');
      return FC.TEST;
    }

    if (this.isGeneratedFile(normalizedPath, fileName)) {
      reasons.push('File is generated');
      return FC.GENERATED;
    }

    if (this.isInfrastructureFile(normalizedPath, fileName)) {
      reasons.push('File is infrastructure configuration');
      return FC.INFRASTRUCTURE;
    }

    if (this.isConfigFile(fileName, extension, normalizedPath)) {
      reasons.push('File is configuration');
      return FC.CONFIG;
    }

    if (this.isDocumentationFile(extension, fileName)) {
      reasons.push('File is documentation');
      return FC.DOCUMENTATION;
    }

    const lang = LANGUAGE_MAP.get(extension);
    if (lang) {
      reasons.push(`Source code file: ${lang}`);
      return FC.SOURCE_CODE;
    }

    reasons.push('Unknown file type');
    return FC.UNKNOWN;
  }

  private determineLanguage(
    extension: string,
    fileName: string,
    classification: FileCategory,
  ): Language {
    if (classification === FC.INFRASTRUCTURE) {
      if (/^Dockerfile/.test(fileName)) return L.Dockerfile;
      if (extension === '.tf' || extension === '.tfvars') return L.Terraform;
      if (extension === '.yaml' || extension === '.yml') return L.Yaml;
      return L.Unknown;
    }

    if (classification === FC.DOCUMENTATION) {
      if (extension === '.md' || extension === '.mdx') return L.Markdown;
      return L.Unknown;
    }

    if (classification === FC.GENERATED) {
      const tsMatch = extension.match(/\.([cm]?ts|js)$/);
      if (tsMatch) {
        return tsMatch[1]?.includes('ts') ? L.TypeScript : L.JavaScript;
      }
      return L.Unknown;
    }

    if (classification === FC.CONFIG) {
      if (extension === '.json' || extension === '.json5' || extension === '.jsonc') return L.Json;
      if (extension === '.yaml' || extension === '.yml') return L.Yaml;
      if (extension === '.toml') return L.Toml;
      return L.Unknown;
    }

    return LANGUAGE_MAP.get(extension) ?? L.Unknown;
  }

  private isTestFile(normalizedPath: string, fileName: string): boolean {
    const testDirPattern = /(^|\/)__tests__(\/|$)|(^|\/)tests?(\/|$)/;
    if (testDirPattern.test(normalizedPath)) return true;
    if (/\.(test|spec|e2e|integration|mock|fixture|stub)\./.test(fileName)) return true;
    return false;
  }

  private isGeneratedFile(normalizedPath: string, fileName: string): boolean {
    for (const pattern of GENERATED_PATTERNS) {
      if (pattern.test(normalizedPath) || pattern.test(fileName)) return true;
    }
    return false;
  }

  private isInfrastructureFile(normalizedPath: string, fileName: string): boolean {
    if (/^Dockerfile/.test(fileName)) return true;
    if (/^docker-compose\./.test(fileName)) return true;
    if (/\.github\/workflows\//.test(normalizedPath)) return true;
    if (fileName === '.gitlab-ci.yml') return true;
    if (/^\.circleci\//.test(normalizedPath)) return true;
    if (/^(Kubernetes|k8s)/i.test(fileName)) return true;
    return false;
  }

  private isConfigFile(fileName: string, extension: string, _normalizedPath: string): boolean {
    if (extension === '.json' || extension === '.yaml' || extension === '.yml' || extension === '.toml') {
      return true;
    }
    if (fileName === 'Dockerfile') return false;
    if (/\.(ini|cfg|conf)$/.test(fileName)) return true;
    return false;
  }

  private isDocumentationFile(extension: string, fileName: string): boolean {
    if (extension === '.md' || extension === '.mdx') return true;
    if (extension === '.txt' && fileName !== '.gitignore') return true;
    if (extension === '.rst' || extension === '.adoc' || extension === '.asciidoc') return true;
    if (extension === '.tex') return true;
    return false;
  }

  private isSecretFile(fileName: string, _normalizedPath: string): boolean {
    if (/credentials?/i.test(fileName)) return true;
    if (/secret/i.test(fileName) && !/\.test/.test(fileName)) return true;
    if (/\.pem$/.test(fileName)) return true;
    if (/\.key$/.test(fileName)) return true;
    if (/\.p12$|\.pfx$|\.jks$/.test(fileName)) return true;
    return false;
  }

  private sortByPath(files: ClassifiedFile[]): ClassifiedFile[] {
    return [...files].sort((a, b) => a.path.localeCompare(b.path));
  }
}
