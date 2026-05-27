interface SourceCheckResult {
  line: number;
  pattern: string;
  risk: 'high' | 'medium' | 'low';
}

interface EnvCheckResult {
  source: string;
  risk: string;
}

const HIGH_RISK_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bDate\.now\(\)/g, label: 'Date.now()' },
  { pattern: /\bMath\.random\(\)/g, label: 'Math.random()' },
  { pattern: /\bnew\s+Date\(\)/g, label: 'new Date()' },
  { pattern: /\bperformance\.now\(\)/g, label: 'performance.now()' },
  { pattern: /\bcrypto\.randomUUID\(\)/g, label: 'crypto.randomUUID()' },
];

const MEDIUM_RISK_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bObject\.keys\(/g, label: 'Object.keys() (unordered)' },
  { pattern: /\bfor\s*\(\s*(const|let|var)\s+\w+\s+in\b/g, label: 'for...in (iteration order)' },
];

export class NonDeterminismDetector {
  static checkSourceCode(source: string): readonly SourceCheckResult[] {
    const results: SourceCheckResult[] = [];
    const lines = source.split('\n');

    for (const { pattern, label, risk } of [
      ...HIGH_RISK_PATTERNS.map(p => ({ ...p, risk: 'high' as const })),
      ...MEDIUM_RISK_PATTERNS.map(p => ({ ...p, risk: 'medium' as const })),
    ]) {
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i]!)) {
          results.push({ line: i + 1, pattern: label, risk });
        }
      }
    }

    return Object.freeze(results);
  }

  static checkExecutionEnv(): readonly EnvCheckResult[] {
    const results: EnvCheckResult[] = [];

    if (typeof process !== 'undefined' && process.env) {
      if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
        results.push({ source: 'NODE_ENV', risk: 'Production environment may introduce non-determinism' });
      }
    }

    return Object.freeze(results);
  }

  static analyzeOrdering(keys: readonly string[]): boolean {
    if (keys.length <= 1) return true;
    for (let i = 1; i < keys.length; i++) {
      if (keys[i - 1]! > keys[i]!) return false;
    }
    return true;
  }

  static isSortingStable<T>(arr: readonly T[], keyFn: (item: T) => string): boolean {
    const mapped = arr.map((item, index) => ({ item, index, key: keyFn(item) }));
    const sorted = [...mapped].sort((a, b) => {
      if (a.key < b.key) return -1;
      if (a.key > b.key) return 1;
      return 0;
    });

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i - 1]!.key === sorted[i]!.key && sorted[i - 1]!.index > sorted[i]!.index) {
        return false;
      }
    }
    return true;
  }
}
