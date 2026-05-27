export interface SecretPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
}

export interface SecretsSanitizeResult {
  sanitized: string;
  redactedCount: number;
  types: readonly string[];
}

export interface RedactionStats {
  totalScanned: number;
  totalRedacted: number;
  byType: Record<string, number>;
}

const SECRET_PATTERNS: readonly SecretPattern[] = Object.freeze([
  {
    name: 'api_key',
    pattern: /\b(?:sk-|pk-|api[_-]?key[_-]?)[a-zA-Z0-9_-]{16,64}\b/gi,
    replacement: '[API_KEY_REDACTED]',
  },
  {
    name: 'bearer_token',
    pattern: /\bBearer\s+[A-Za-z0-9._~+/-]{20,200}\b/g,
    replacement: '[BEARER_TOKEN_REDACTED]',
  },
  {
    name: 'aws_key',
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
    replacement: '[AWS_KEY_REDACTED]',
  },
  {
    name: 'aws_secret',
    pattern: /(?:"|')?aws\s*(?:_|\.)?secret\s*(?:_|\.)?access\s*(?:_|\.)?key(?:"|')?\s*[:=]\s*["']?[A-Za-z0-9/+]{40}["']?/gi,
    replacement: '[AWS_SECRET_REDACTED]',
  },
  {
    name: 'github_token',
    pattern: /\b(?:ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9_]{36,}\b/g,
    replacement: '[GITHUB_TOKEN_REDACTED]',
  },
  {
    name: 'slack_token',
    pattern: /\b(?:xox[baprs]-)[A-Za-z0-9-]{24,}\b/g,
    replacement: '[SLACK_TOKEN_REDACTED]',
  },
  {
    name: 'generic_secret',
    pattern: /\b(?:(?:secret|password|passwd|pwd|token|auth|credential|private_key)\s*[:=]\s*(?:"[^"]+"|'[^']+'|\S+))/gi,
    replacement: '[SECRET_REDACTED]',
  },
]);

export class SecretsExposureGuard {
  private patterns: SecretPattern[];
  private totalScanned: number = 0;
  private totalRedacted: number = 0;
  private byType: Record<string, number> = {};

  constructor(patterns?: readonly SecretPattern[]) {
    this.patterns = patterns ? [...patterns] : [...SECRET_PATTERNS];
  }

  containsSecret(text: string): boolean {
    return this.patterns.some((p) => p.pattern.test(text));
  }

  sanitize(text: string): SecretsSanitizeResult {
    this.totalScanned++;
    let sanitized = text;
    let redactedCount = 0;
    const typesFound: string[] = [];

    for (const pattern of this.patterns) {
      const matches = sanitized.match(pattern.pattern);
      if (matches) {
        const count = matches.length;
        redactedCount += count;
        typesFound.push(pattern.name);
        this.byType[pattern.name] = (this.byType[pattern.name] ?? 0) + count;
        this.totalRedacted += count;
      }
      sanitized = sanitized.replace(pattern.pattern, pattern.replacement);
    }

    return { sanitized, redactedCount, types: typesFound };
  }

  getRedactionStats(): RedactionStats {
    return {
      totalScanned: this.totalScanned,
      totalRedacted: this.totalRedacted,
      byType: { ...this.byType },
    };
  }
}
