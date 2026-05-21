import { sha256Truncated } from '../fingerprinting/canonical-hash.ts';
import { stableStringify } from '../serialization/stable-json.ts';
import type { ExecutionConfig, NormalizedPromptResult } from '../contracts/prompt-contracts.ts';

const DEFAULT_CONFIG: ExecutionConfig['normalizationRules'] = {
  trimWhitespace: true,
  sortSections: true,
  maxSections: 50,
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface ParsedSection {
  name: string;
  content: string;
}

function parseSections(text: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const sectionRegex = /^#+\s+(.+)$/gm;
  let lastIndex = 0;
  let lastHeader = 'preamble';
  let match: RegExpExecArray | null;

  while ((match = sectionRegex.exec(text)) !== null) {
    const headerStart = match.index;
    if (headerStart > lastIndex) {
      sections.push({
        name: lastHeader,
        content: text.slice(lastIndex, headerStart).trim(),
      });
    }
    lastHeader = match[1]!.trim();
    lastIndex = headerStart + match[0].length;
  }

  if (lastIndex < text.length) {
    sections.push({
      name: lastHeader,
      content: text.slice(lastIndex).trim(),
    });
  }

  return sections;
}

export class PromptNormalizer {
  async normalize(
    text: string,
    rules?: Partial<ExecutionConfig['normalizationRules']>,
  ): Promise<NormalizedPromptResult> {
    const config = { ...DEFAULT_CONFIG, ...rules };

    let normalized = text;
    if (config.trimWhitespace) {
      normalized = normalizeWhitespace(normalized);
    }

    let sections: readonly string[];
    if (config.sortSections) {
      const parsed = parseSections(normalized);
      parsed.sort((a, b) => a.name.localeCompare(b.name));
      sections = Object.freeze(parsed.map((s) => s.name));

      const max = Math.min(parsed.length, config.maxSections);
      normalized = parsed.slice(0, max)
        .map((s) => `# ${s.name}\n${s.content}`)
        .join('\n\n');
    } else {
      sections = Object.freeze([]);
    }

    const tokenEstimate = estimateTokens(normalized);
    const fingerprint = await sha256Truncated(stableStringify({
      normalizedText: normalized,
      sections,
      tokenEstimate,
    }));

    return Object.freeze({
      normalizedText: normalized,
      sections,
      fingerprint,
      tokenEstimate,
    });
  }
}
