import { secretStore } from '../config/secrets.ts';

const SECRET_FIELD_PATTERNS = [
  /^api[_-]?key$/i,
  /^api[_-]?secret$/i,
  /^secret$/i,
  /^password$/i,
  /^token$/i,
  /^auth[_-]?token$/i,
  /^access[_-]?token$/i,
  /^refresh[_-]?token$/i,
  /^private[_-]?key$/i,
  /^gemini[_-]?api[_-]?key$/i,
  /^openai[_-]?api[_-]?key$/i,
  /^anthropic[_-]?api[_-]?key$/i,
];

function isSecretField(key: string): boolean {
  return SECRET_FIELD_PATTERNS.some((p) => p.test(key));
}

function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    if (secretStore.isSecretValue(value) || value.length > 20) {
      return secretStore.mask(value);
    }
    return value;
  }
  return value;
}

export function redactDeep(obj: unknown, depth = 0): unknown {
  if (depth > 10) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactDeep(item, depth + 1));
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (isSecretField(key)) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = redactDeep(value, depth + 1);
      } else if (typeof value === 'string') {
        result[key] = redactValue(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  return obj;
}

export function safeStringify(obj: unknown): string {
  return JSON.stringify(redactDeep(obj));
}
