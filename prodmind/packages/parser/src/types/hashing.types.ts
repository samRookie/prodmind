export interface DiscoveredFile {
  path: string;
  absolutePath: string;
  extension: string;
  sizeBytes: number;
  lastModified: string;
  classification: string;
  shouldParse: boolean;
}

export interface HashResult {
  path: string;
  sha256: string;
  sizeBytes: number;
  contentType: string;
  generatedAt: string;
}

export interface FileDiscoveryOptions {
  maxDepth?: number;
  followSymlinks?: boolean;
}
