import { SemanticType, RuleStrength } from '@prodmind/contracts';
import type { ParsedFile } from '../types/ast.types.ts';
import { getClassificationRules, getFrameworkImportType } from './classification-rules.ts';
import type { ClassificationResult, ClassificationHeuristic } from './types.ts';

function matchPathRules(filePath: string): ClassificationResult[] {
  const rules = getClassificationRules();
  const results: ClassificationResult[] = [];

  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    const matched = rule.matcher(filePath);
    const heuristic: ClassificationHeuristic = {
      ruleName: rule.name,
      pattern: '',
      matched,
    };

    const existing = results.find((r) => r.semanticType === rule.type);
    if (matched) {
      if (existing) {
        existing.matchedHeuristics.push(heuristic);
        existing.classificationReasons.push(rule.name);
        const currentStrength = strengthToNumber(existing.ruleStrength);
        const newStrength = strengthToNumber(rule.strength);
        if (newStrength > currentStrength) {
          existing.ruleStrength = rule.strength;
        }
      } else {
        results.push({
          nodeId: '',
          filePath,
          semanticType: rule.type,
          ruleStrength: rule.strength,
          classificationReasons: [rule.name],
          matchedHeuristics: [heuristic],
        });
      }
    }
  }

  return results;
}

function strengthToNumber(s: RuleStrength): number {
  switch (s) {
    case RuleStrength.HIGH: return 3;
    case RuleStrength.MEDIUM: return 2;
    case RuleStrength.LOW: return 1;
  }
}

function detectTypeFromImports(parsed: ParsedFile | undefined): ClassificationResult | null {
  if (!parsed) return null;

  const importTypes = new Map<SemanticType, number>();

  for (const imp of parsed.imports) {
    const frameworkType = getFrameworkImportType(imp.source);
    if (frameworkType) {
      const count = importTypes.get(frameworkType) ?? 0;
      importTypes.set(frameworkType, count + 1);
    }
  }

  if (importTypes.size === 0) return null;

  let dominantType: SemanticType = SemanticType.UNKNOWN;
  let maxCount = 0;

  for (const [type, count] of importTypes) {
    if (count > maxCount) {
      dominantType = type;
      maxCount = count;
    }
  }

  return {
    nodeId: '',
    filePath: parsed.path,
    semanticType: dominantType,
    ruleStrength: maxCount >= 3 ? RuleStrength.HIGH : maxCount >= 2 ? RuleStrength.MEDIUM : RuleStrength.LOW,
    classificationReasons: [`Framework imports indicate ${dominantType}`],
    matchedHeuristics: [{
      ruleName: 'framework-imports',
      pattern: `imports:${[...importTypes.keys()].join(',')}`,
      matched: true,
    }],
  };
}

export function classifyNodeSemanticType(
  nodeId: string,
  filePath: string,
  parsed: ParsedFile | undefined,
): ClassificationResult {
  const pathResults = matchPathRules(filePath);
  const importResult = detectTypeFromImports(parsed);

  let bestResult: ClassificationResult | null = null;

  if (pathResults.length > 0) {
    const sortedByPriority = pathResults.sort((a, b) => {
      const aIdx = getClassificationRules().findIndex((r) => r.name === a.classificationReasons[0]);
      const bIdx = getClassificationRules().findIndex((r) => r.name === b.classificationReasons[0]);
      return aIdx - bIdx;
    });
    bestResult = sortedByPriority[0]!;
  }

  if (importResult && bestResult) {
    if (
      importResult.semanticType !== bestResult.semanticType &&
      importResult.semanticType !== SemanticType.UNKNOWN
    ) {
      const importSig = strengthToNumber(importResult.ruleStrength);
      const pathSig = strengthToNumber(bestResult.ruleStrength);
      if (importSig > pathSig) {
        bestResult = importResult;
      } else if (importSig === pathSig) {
        bestResult.classificationReasons.push(...importResult.classificationReasons);
        bestResult.matchedHeuristics.push(...importResult.matchedHeuristics);
      }
    }
  }

  if (!bestResult) {
    bestResult = {
      nodeId,
      filePath,
      semanticType: SemanticType.UNKNOWN,
      ruleStrength: RuleStrength.LOW,
      classificationReasons: ['No matching classification heuristics'],
      matchedHeuristics: [{
        ruleName: 'fallback',
        pattern: 'no-match',
        matched: true,
      }],
    };
  }

  bestResult.nodeId = nodeId;
  return bestResult;
}

export function classifyFileSemanticRole(
  filePath: string,
  imports: Array<{ source: string }>,
  _symbols: Array<{ name: string; symbolType: string }>,
): { semanticType: SemanticType; ruleStrength: RuleStrength; reasons: string[] } {
  const pathRules = getClassificationRules();
  const sorted = [...pathRules].sort((a, b) => a.priority - b.priority);
  const matchedTypes = new Map<SemanticType, { strength: RuleStrength; reasons: string[] }>();

  for (const rule of sorted) {
    if (rule.matcher(filePath)) {
      const existing = matchedTypes.get(rule.type);
      if (existing) {
        existing.reasons.push(rule.name);
        if (strengthToNumber(rule.strength) > strengthToNumber(existing.strength)) {
          existing.strength = rule.strength;
        }
      } else {
        matchedTypes.set(rule.type, { strength: rule.strength, reasons: [rule.name] });
      }
    }
  }

  for (const imp of imports) {
    const ft = getFrameworkImportType(imp.source);
    if (ft && ft !== SemanticType.UNKNOWN) {
      const existing = matchedTypes.get(ft);
      if (existing) {
        existing.reasons.push(`framework:${imp.source}`);
      } else {
        matchedTypes.set(ft, { strength: RuleStrength.LOW, reasons: [`framework:${imp.source}`] });
      }
    }
  }

  if (matchedTypes.size === 0) {
    return { semanticType: SemanticType.UNKNOWN, ruleStrength: RuleStrength.LOW, reasons: ['No heuristics matched'] };
  }

  let dominantType = SemanticType.UNKNOWN;
  let dominantStrength = 0;
  const dominantReasons: string[] = [];

  for (const [type, info] of matchedTypes) {
    const s = strengthToNumber(info.strength);
    if (s > dominantStrength) {
      dominantType = type;
      dominantStrength = s;
      dominantReasons.length = 0;
      dominantReasons.push(...info.reasons);
    } else if (s === dominantStrength && dominantType !== type) {
      dominantReasons.push(...info.reasons);
    }
  }

  return {
    semanticType: dominantType,
    ruleStrength: dominantStrength >= 3 ? RuleStrength.HIGH : dominantStrength >= 2 ? RuleStrength.MEDIUM : RuleStrength.LOW,
    reasons: dominantReasons,
  };
}

export function classifyModuleSemanticRole(
  _modulePath: string,
  files: Array<{ filePath: string }>,
): { semanticType: SemanticType; ruleStrength: RuleStrength; reasons: string[] } {
  const classifications = files.map((f) => classifyFileSemanticRole(f.filePath, [], []));
  const typeCounts = new Map<SemanticType, { count: number; strengths: number[] }>();

  for (const c of classifications) {
    const existing = typeCounts.get(c.semanticType);
    const s = strengthToNumber(c.ruleStrength);
    if (existing) {
      existing.count++;
      existing.strengths.push(s);
    } else {
      typeCounts.set(c.semanticType, { count: 1, strengths: [s] });
    }
  }

  let dominantType = SemanticType.UNKNOWN;
  let maxCount = 0;
  let maxAvgStrength = 0;

  for (const [type, info] of typeCounts) {
    const avgStrength = info.strengths.reduce((a, b) => a + b, 0) / info.strengths.length;
    if (info.count > maxCount || (info.count === maxCount && avgStrength > maxAvgStrength)) {
      dominantType = type;
      maxCount = info.count;
      maxAvgStrength = avgStrength;
    }
  }

  return {
    semanticType: dominantType,
    ruleStrength: maxCount >= 5 ? RuleStrength.HIGH : maxCount >= 2 ? RuleStrength.MEDIUM : RuleStrength.LOW,
    reasons: [`Majority of ${maxCount}/${files.length} files classified as ${dominantType}`],
  };
}

export function computeSemanticRuleStrength(
  matchedCount: number,
  totalConsidered: number,
): RuleStrength {
  if (totalConsidered === 0) return RuleStrength.LOW;
  const ratio = matchedCount / totalConsidered;
  if (ratio >= 0.8) return RuleStrength.HIGH;
  if (ratio >= 0.4) return RuleStrength.MEDIUM;
  return RuleStrength.LOW;
}
