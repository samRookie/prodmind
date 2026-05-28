export const REPORT_TYPES = ['ARCHITECTURE_REPORT', 'RISK_REPORT', 'HEALTH_REPORT', 'COMPREHENSIVE_REPORT'] as const;
export type ReportType = typeof REPORT_TYPES[number];

export interface ReportSection {
  title: string;
  content: string;
  severity: string;
  metrics: { metricType: string; metricValue: number }[];
  impactedNodes: string[];
}

export interface ArchitectureReport {
  reportType: ReportType;
  fingerprint: string;
  title: string;
  generatedAt: string;
  snapshotId: string;
  summary: string;
  sections: ReportSection[];
  markdownContent: string;
  jsonContent: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface ReportInput {
  snapshotId: string;
  cognitionSnapshots: { cognitionType: string; fingerprint: string; architectureSummary: string; healthScore: { overall: number; label: string }; severityDistribution: { critical: number; high: number; moderate: number; low: number }; dominantRisks: { riskType: string; normalizedScore: number; severity: string }[]; dominantPatterns: { patternType: string; confidence: number; severity: string }[]; topRecommendations: { category: string; priority: string; title: string }[]; criticalHotspots: { nodeId: string; severity: string; reason: string }[]; evidenceReferences: { source: string; fingerprint: string; description: string }[]; confidenceSummary: { overall: number } }[];
  narratives: { narrativeType: string; fingerprint: string; title: string; summary: string; severity: string; sections: { title: string; content: string; severity: string; metrics: { metricType: string; metricValue: number }[] }[]; evidenceRefs: { source: string; fingerprint: string; description: string }[] }[];
  patterns: { patternType: string; severity: string; impactedNodes: string[]; title: string }[];
  risks: { riskType: string; severity: string; normalizedScore: number; impactedNodes: string[]; title: string }[];
  recommendations: { category: string; priority: string; title: string; impactedNodes: string[] }[];
}

export interface ReportOutput {
  snapshotId: string;
  reports: ArchitectureReport[];
  generatedAt: string;
}
