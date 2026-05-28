import type { NarrativeInput } from '../narrative-types.ts';

export function renderRecommendationSummary(input: NarrativeInput): string {
  if (input.recommendations.length === 0) return 'No recommendations generated.';
  const immediateCount = input.recommendations.filter(r => r.priority === 'IMMEDIATE').length;
  const parts: string[] = [];
  parts.push(`${input.recommendations.length} recommendation(s) generated`);
  if (immediateCount > 0) parts.push(`${immediateCount} require immediate action`);
  const categories = [...new Set(input.recommendations.map(r => r.category))];
  parts.push(`Categories: ${categories.join(', ')}`);
  return parts.join('. ') + '.';
}

export function collectRecommendationMetrics(input: NarrativeInput): { metricType: string; metricValue: number }[] {
  return [
    { metricType: 'TOTAL_RECOMMENDATIONS', metricValue: input.recommendations.length },
    { metricType: 'IMMEDIATE_RECOMMENDATIONS', metricValue: input.recommendations.filter(r => r.priority === 'IMMEDIATE').length },
    { metricType: 'HIGH_RECOMMENDATIONS', metricValue: input.recommendations.filter(r => r.priority === 'HIGH').length },
  ].sort((a, b) => a.metricType.localeCompare(b.metricType));
}

export function collectRecommendationImpactedSystems(input: NarrativeInput): string[] {
  return [...new Set(input.recommendations.flatMap(r => r.impactedNodes))].sort();
}
