import type { PatternDetection } from './pattern-types.ts';

export interface PatternEvidenceSummary {
  patternFingerprint: string;
  patternType: string;
  isAntiPattern: boolean;
  confidence: number;
  evidenceCount: number;
  topEvidence: string[];
}

export function summarizePatternEvidence(detection: PatternDetection): PatternEvidenceSummary {
  const evidenceDescriptions = [
    ...detection.topologyEvidence.map(e => e.description),
    ...detection.sccEvidence.map(e => `SCC: ${e.memberNodes.length} nodes in component ${e.componentId}`),
    ...detection.metricEvidence.map(e => e.description),
  ];
  return {
    patternFingerprint: detection.fingerprint,
    patternType: detection.patternType,
    isAntiPattern: detection.isAntiPattern,
    confidence: detection.confidence,
    evidenceCount: evidenceDescriptions.length,
    topEvidence: evidenceDescriptions.slice(0, 5),
  };
}

export function aggregatePatternEvidence(detections: PatternDetection[]): PatternEvidenceSummary[] {
  return detections.map(summarizePatternEvidence).sort((a, b) => b.confidence - a.confidence || a.patternType.localeCompare(b.patternType));
}
