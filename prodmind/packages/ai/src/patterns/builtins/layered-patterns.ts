import type { PatternDetection, PatternInput } from '../pattern-types.ts';
import { detectArchitecturePatterns } from '../pattern-detectors.ts';

export function detectLayeredPatterns(input: PatternInput): PatternDetection[] {
  return detectArchitecturePatterns(input).filter(d => d.patternType === 'LAYERED');
}
