import type { ParsedFile } from '../types/ast.types.ts';
import { isInfrastructurePath, isBusinessPath, getFrameworkImportType } from './classification-rules.ts';
import type { InfraBusinessResult } from './types.ts';
import { SemanticType } from '@prodmind/contracts';

interface InfraHeuristic {
  name: string;
  matched: boolean;
}

function detectInfraHeuristics(filePath: string, parsed: ParsedFile | undefined): InfraHeuristic[] {
  const heuristics: InfraHeuristic[] = [];
  heuristics.push({ name: 'infra-path', matched: isInfrastructurePath(filePath) });
  heuristics.push({ name: 'business-path', matched: isBusinessPath(filePath) });

  if (parsed) {
    let hasFrameworkInfra = false;
    let hasFrameworkBusiness = false;
    for (const imp of parsed.imports) {
      const ft = getFrameworkImportType(imp.source);
      if (ft === SemanticType.INFRASTRUCTURE || ft === SemanticType.API_LAYER || ft === SemanticType.DATA_LAYER) {
        hasFrameworkInfra = true;
      }
      if (ft === SemanticType.DOMAIN_LAYER || ft === SemanticType.SERVICE_LAYER) {
        hasFrameworkBusiness = true;
      }
    }
    heuristics.push({ name: 'framework-infra-imports', matched: hasFrameworkInfra });
    heuristics.push({ name: 'framework-business-imports', matched: hasFrameworkBusiness });
  }

  return heuristics;
}

export function detectInfrastructureLayer(
  nodeId: string,
  filePath: string,
  parsed: ParsedFile | undefined,
): InfraBusinessResult {
  const heuristics = detectInfraHeuristics(filePath, parsed);

  let infraCount = 0;
  let businessCount = 0;
  let totalWeighted = 0;

  const supporting: string[] = [];

  for (const h of heuristics) {
    if (!h.matched) continue;
    if (h.name === 'infra-path' || h.name === 'framework-infra-imports') {
      infraCount++;
      supporting.push(h.name);
    } else if (h.name === 'business-path' || h.name === 'framework-business-imports') {
      businessCount++;
      supporting.push(h.name);
    }
  }

  totalWeighted = infraCount + businessCount;
  const infraScore = totalWeighted > 0 ? infraCount / totalWeighted : 0;
  const businessScore = totalWeighted > 0 ? businessCount / totalWeighted : 0;

  let dominantRole: 'infrastructure' | 'business' | 'balanced';
  if (infraScore > businessScore + 0.1) {
    dominantRole = 'infrastructure';
  } else if (businessScore > infraScore + 0.1) {
    dominantRole = 'business';
  } else {
    dominantRole = 'balanced';
  }

  return {
    nodeId,
    filePath,
    infraScore,
    businessScore,
    dominantRole,
    supportingHeuristics: supporting,
  };
}

export function detectBusinessLogicLayer(
  nodeId: string,
  filePath: string,
  parsed: ParsedFile | undefined,
): InfraBusinessResult {
  return detectInfrastructureLayer(nodeId, filePath, parsed);
}

export function computeInfraWeight(
  filePath: string,
  parsed: ParsedFile | undefined,
): number {
  const result = detectInfrastructureLayer('', filePath, parsed);
  return result.infraScore;
}

export function computeBusinessWeight(
  filePath: string,
  parsed: ParsedFile | undefined,
): number {
  const result = detectInfrastructureLayer('', filePath, parsed);
  return result.businessScore;
}
