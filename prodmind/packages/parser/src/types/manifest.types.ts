export interface ManifestFileEntry {
  path: string;
  sha256: string;
  sizeBytes: number;
  classification: string;
  shouldParse: boolean;
}

export interface RepositoryManifest {
  repositoryHash: string;
  totalFiles: number;
  hashedFiles: number;
  parseCandidates: number;
  ignoredFiles: string[];
  retainedSourceBytes: number;
  generatedAt: string;
  files: ManifestFileEntry[];
}
