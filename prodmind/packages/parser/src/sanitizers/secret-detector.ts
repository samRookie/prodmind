import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SecretMatch } from '../types/sanitization.types.ts';
import { SecretDetectionError } from './sanitization-errors.ts';

interface SecretPattern {
  type: string;
  regex: RegExp;
  confidence: number;
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    type: 'AWS_ACCESS_KEY',
    regex: /(?:AKIA[0-9A-Z]{16})/g,
    confidence: 0.9,
  },
  {
    type: 'JWT',
    regex: /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g,
    confidence: 0.9,
  },
  {
    type: 'SSH_PRIVATE_KEY',
    regex: /-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH)?\s*PRIVATE\s+KEY-----/g,
    confidence: 0.95,
  },
  {
    type: 'API_KEY',
    regex: /(?:api[_-]?key|apikey)["\s:=]+["']?[\w-]{16,}/gi,
    confidence: 0.7,
  },
  {
    type: 'GENERIC_SECRET',
    regex: /(?:token|secret|password)["\s:=]+["']?[\w@#$%^&+=-]{8,}/gi,
    confidence: 0.5,
  },
];

export class SecretDetector {
  public async scanFile(
    workspacePath: string,
    filePath: string,
  ): Promise<SecretMatch[]> {
    const matches: SecretMatch[] = [];
    const fullPath = join(workspacePath, filePath);

    let content: string;
    try {
      content = await readFile(fullPath, 'utf-8');
    } catch {
      throw new SecretDetectionError(
        `Failed to read file for secret detection: "${filePath}"`,
      );
    }

    const lines = content.split('\n');
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum]!;

      for (const pattern of SECRET_PATTERNS) {
        const regex = new RegExp(pattern.regex.source, 'g');

        while (regex.exec(line) !== null) {
          matches.push({
            file: filePath,
            line: lineNum + 1,
            secretType: pattern.type,
            confidence: pattern.confidence,
          });
        }
      }
    }

    return this.deduplicate(matches);
  }

  public async scanFiles(
    workspacePath: string,
    filePaths: string[],
  ): Promise<SecretMatch[]> {
    const allMatches: SecretMatch[] = [];
    const errors: string[] = [];

    for (const filePath of filePaths) {
      try {
        const matches = await this.scanFile(workspacePath, filePath);
        allMatches.push(...matches);
      } catch (err) {
        errors.push(
          `Error scanning "${filePath}": ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (errors.length > 0) {
      throw new SecretDetectionError(errors.join('; '));
    }

    return this.sortByFileLine(allMatches);
  }

  private deduplicate(matches: SecretMatch[]): SecretMatch[] {
    const seen = new Set<string>();
    return matches.filter((m) => {
      const key = `${m.file}:${m.line}:${m.secretType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private sortByFileLine(matches: SecretMatch[]): SecretMatch[] {
    return [...matches].sort((a, b) => {
      const fileCmp = a.file.localeCompare(b.file);
      if (fileCmp !== 0) return fileCmp;
      return a.line - b.line;
    });
  }
}
