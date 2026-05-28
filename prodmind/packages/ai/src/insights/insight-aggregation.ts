import type { Insight, InsightCategory, InsightSeverity, InsightScope } from './insight-types.ts';

export interface AggregatedCategory {
  category: InsightCategory;
  total: number;
  bySeverity: Record<InsightSeverity, number>;
}

export interface AggregatedScope {
  scope: InsightScope;
  total: number;
  bySeverity: Record<InsightSeverity, number>;
}

export interface InsightSummary {
  totalInsights: number;
  byCategory: AggregatedCategory[];
  byScope: AggregatedScope[];
  topSeverities: { severity: InsightSeverity; count: number }[];
}

const SEVERITIES: InsightSeverity[] = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];

const CATEGORIES: InsightCategory[] = [
  'HOTSPOT', 'INSTABILITY', 'DEPTH', 'PROPAGATION',
  'COUPLING', 'ARCHITECTURE', 'COMPLEXITY', 'FRAGMENTATION',
];

const SCOPES: InsightScope[] = ['GLOBAL', 'NODE', 'CLUSTER', 'EDGE'];

function zeroSeverityMap(): Record<InsightSeverity, number> {
  return { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
}

export function aggregateByCategory(insights: Insight[]): AggregatedCategory[] {
  const map = new Map<InsightCategory, Record<InsightSeverity, number>>();
  for (const cat of CATEGORIES) map.set(cat, zeroSeverityMap());

  for (const insight of insights) {
    const sevMap = map.get(insight.type);
    if (sevMap) sevMap[insight.severity]++;
  }

  return CATEGORIES.map((cat) => {
    const bySeverity = map.get(cat) ?? zeroSeverityMap();
    const total = Object.values(bySeverity).reduce((a, b) => a + b, 0);
    return { category: cat, total, bySeverity };
  }).filter((c) => c.total > 0);
}

export function aggregateByScope(insights: Insight[]): AggregatedScope[] {
  const map = new Map<InsightScope, Record<InsightSeverity, number>>();
  for (const scope of SCOPES) map.set(scope, zeroSeverityMap());

  for (const insight of insights) {
    const sevMap = map.get(insight.scope);
    if (sevMap) sevMap[insight.severity]++;
  }

  return SCOPES.map((scope) => {
    const bySeverity = map.get(scope) ?? zeroSeverityMap();
    const total = Object.values(bySeverity).reduce((a, b) => a + b, 0);
    return { scope, total, bySeverity };
  }).filter((s) => s.total > 0);
}

export function summarizeInsights(insights: Insight[]): InsightSummary {
  const byCategory = aggregateByCategory(insights);
  const byScope = aggregateByScope(insights);

  const severityCounts: Record<InsightSeverity, number> = zeroSeverityMap();
  for (const insight of insights) {
    severityCounts[insight.severity]++;
  }

  const topSeverities = SEVERITIES
    .map((severity) => ({ severity, count: severityCounts[severity] }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    totalInsights: insights.length,
    byCategory,
    byScope,
    topSeverities,
  };
}
