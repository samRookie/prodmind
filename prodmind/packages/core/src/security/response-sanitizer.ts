export interface ResponseSanitizeRule {
  name: string;
  pattern: RegExp;
  replacement: string;
  severity: 'strip' | 'block' | 'warn';
}

export interface ResponseSanitizeResult {
  sanitized: string;
  warnings: readonly string[];
  blocked: boolean;
}

const DEFAULT_RULES: readonly ResponseSanitizeRule[] = Object.freeze([
  {
    name: 'null_bytes',
    pattern: /\0/g,
    replacement: '',
    severity: 'strip',
  },
  {
    name: 'suspicious_base64',
    pattern: /(?:[A-Za-z0-9+/]{40,}={0,2})/g,
    replacement: '[base64-redacted]',
    severity: 'strip',
  },
  {
    name: 'hidden_html',
    pattern: /<!--[\s\S]*?-->/g,
    replacement: '',
    severity: 'strip',
  },
  {
    name: 'control_characters',
    pattern: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
    replacement: '',
    severity: 'strip',
  },
  {
    name: 'hallucination_injection',
    pattern: /\b(?:IMPORTANT|SYSTEM|ADMIN|OVERRIDE|EMERGENCY)\s*:\s*.+/gi,
    replacement: '[redacted]',
    severity: 'warn',
  },
]);

const MAX_RESPONSE_SIZE_BYTES = 524_288;

export class ProviderResponseSanitizer {
  private rules: ResponseSanitizeRule[];

  constructor(rules?: readonly ResponseSanitizeRule[]) {
    this.rules = rules ? [...rules] : [...DEFAULT_RULES];
  }

  sanitize(response: string): ResponseSanitizeResult {
    const warnings: string[] = [];
    let sanitized = response;
    let blocked = false;

    if (Buffer.byteLength(response, 'utf-8') > MAX_RESPONSE_SIZE_BYTES) {
      warnings.push(`Response exceeds ${MAX_RESPONSE_SIZE_BYTES} byte limit`);
    }

    const malformedJson = this.detectMalformedJson(response);
    if (malformedJson) {
      const repaired = this.tryRepairJson(response);
      if (repaired !== null) {
        sanitized = repaired;
        warnings.push('Malformed JSON detected and repaired');
      } else {
        warnings.push('Malformed JSON detected and could not be repaired');
      }
    }

    for (const rule of this.rules) {
      if (rule.severity === 'block' && rule.pattern.test(sanitized)) {
        blocked = true;
        warnings.push(`Blocked: ${rule.name} pattern detected`);
      }
      sanitized = sanitized.replace(rule.pattern, rule.replacement);
    }

    return { sanitized, warnings, blocked };
  }

  private detectMalformedJson(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.length === 0) return false;
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && (trimmed.endsWith('}') || trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        return false;
      } catch {
        return true;
      }
    }
    return false;
  }

  private tryRepairJson(text: string): string | null {
    const trimmed = text.trim();
    const repaired = trimmed
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/'/g, '"')
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
      .replace(/:\s*undefined/g, ':null')
      .replace(/:\s*NaN/g, ':null');
    try {
      JSON.parse(repaired);
      return repaired;
    } catch {
      return null;
    }
  }
}
