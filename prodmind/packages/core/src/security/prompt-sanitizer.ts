export interface SanitizeRule {
  name: string;
  pattern: RegExp;
  replacement: string;
  severity: 'strip' | 'block' | 'warn';
}

export interface SanitizeResult {
  sanitized: string;
  warnings: readonly string[];
  blocked: boolean;
}

const DEFAULT_RULES: readonly SanitizeRule[] = Object.freeze([
  {
    name: 'prompt_injection',
    pattern: /\b(ignore\s+(previous|all)\s+(instructions|directions|commands)|forget\s+all\s+instructions|system\s+prompt|you\s+are\s+a(?:n?\s+(?:helpful\s+)?(?:assistant|ai|chatbot|model))?)\b/gi,
    replacement: '[redacted]',
    severity: 'strip',
  },
  {
    name: 'replay_poisoning',
    pattern: /(?:\breplay\s*[:=]|\[REPLAY\])\s*.+/gi,
    replacement: '[redacted]',
    severity: 'strip',
  },
  {
    name: 'governance_bypass',
    pattern: /\b(?:bypass\s+(?:governance|policy|restrictions|controls|security)|override\s+(?:policy|rules|restrictions|safeguards)|ignore\s+policy)\b/gi,
    replacement: '',
    severity: 'block',
  },
  {
    name: 'recursive_execution',
    pattern: /\b(?:repeat\s+(?:this\s+)?(?:indefinitely|forever|continuously|infinitely|ad\s+nauseam)|loop\s+(?:this\s+)?(?:indefinitely|forever)|recursive\s+(?:call|invocation|execution|prompt|loop))\b/gi,
    replacement: '[redacted]',
    severity: 'strip',
  },
  {
    name: 'zero_width_unicode',
    pattern: /[\u200B-\u200D\uFEFF\u2060\u2061\u2062\u2063\u2064\u202A-\u202E\uFFF9-\uFFFB\u00AD]/g,
    replacement: '',
    severity: 'strip',
  },
  {
    name: 'homoglyph_attack',
    pattern: /[Α-ΡΣ-Ωα-ρσ-ωА-Яа-яЁё]/g,
    replacement: '',
    severity: 'strip',
  },
  {
    name: 'bidirectional_text',
    pattern: /[\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069\u200E\u200F]/g,
    replacement: '',
    severity: 'strip',
  },
]);

const MAX_PROMPT_SIZE_BYTES = 128_000;

export class PromptSanitizer {
  private rules: SanitizeRule[];

  constructor(rules?: readonly SanitizeRule[]) {
    this.rules = rules ? [...rules] : [...DEFAULT_RULES];
  }

  sanitize(prompt: string): SanitizeResult {
    const warnings: string[] = [];
    let sanitized = prompt;
    let blocked = false;

    if (Buffer.byteLength(prompt, 'utf-8') > MAX_PROMPT_SIZE_BYTES) {
      warnings.push(`Prompt exceeds ${MAX_PROMPT_SIZE_BYTES} byte limit`);
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
}
