export interface FileInfo {
  path: string;
  size: number;
  extension: string;
  isDirectory: boolean;
}

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: TreeNode[];
}

export interface UploadResult {
  projectId: string;
  filePath: string;
  fileCount: number;
  totalSize: number;
}
