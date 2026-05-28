import type { PatternInput, PatternOutput } from './pattern-types.ts';
import { detectArchitecturePatterns } from './pattern-detectors.ts';
import { detectAntiPatterns } from './anti-pattern-detectors.ts';


export class PatternEngine {
  analyze(input: PatternInput): PatternOutput {
    const architectureDetections = detectArchitecturePatterns(input);
    const antiPatternDetections = detectAntiPatterns(input);
    const allDetections = [...architectureDetections, ...antiPatternDetections].sort((a, b) => {
      const byConfidence = b.confidence - a.confidence;
      if (byConfidence !== 0) return byConfidence;
      const bySeverity = b.severity.localeCompare(a.severity);
      if (bySeverity !== 0) return bySeverity;
      return a.fingerprint.localeCompare(b.fingerprint);
    });
    return { snapshotId: input.snapshotId, detections: allDetections, generatedAt: new Date().toISOString(), };
  }
}
