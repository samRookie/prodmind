import type { Recommendation, RecommendationCategory, RecommendationSeverity, RecommendationEvidenceRef, RemediationStrategy, RecommendationInput, RecommendationOutput } from './recommendation-types.ts';
import { fingerprintRecommendation } from './recommendation-fingerprint.ts';
import { computeRecommendationPriority } from './recommendation-priority.ts';
import { rankRecommendations } from './recommendation-ranking.ts';
import { getRemediationTemplate } from './remediation-library.ts';

export class RecommendationGenerator {
  generate(input: RecommendationInput): RecommendationOutput {
    const recommendations: Recommendation[] = [];

    recommendations.push(...this.fromInsights(input));
    recommendations.push(...this.fromRules(input));
    recommendations.push(...this.fromPatterns(input));
    recommendations.push(...this.fromRisks(input));
    recommendations.push(...this.fromPropagationData(input));
    recommendations.push(...this.fromCouplingData(input));

    const ranked = rankRecommendations(recommendations);
    return { snapshotId: input.snapshotId, recommendations: ranked, generatedAt: new Date().toISOString(), };
  }

  private fromInsights(input: RecommendationInput): Recommendation[] {
    const results: Recommendation[] = [];
    for (const insight of input.insights) {
      if (insight.severity === 'LOW') continue;
      const { cat, strat } = this.mapInsightToRecommendation(insight.type);
      if (!cat) continue;
      const template = getRemediationTemplate(strat);
      const impactedNodes = insight.evidence.filter(e => e.nodeId).map(e => e.nodeId!);
      const remediation: RemediationStrategy = { templateId: strat, strategy: template?.strategy ?? 'refactor', description: template?.description ?? '', parameters: {}, expectedImpact: template?.expectedImpact ?? '' };
      results.push(this.buildRecommendation(cat, insight.severity as RecommendationSeverity, insight.title, insight.summary, `Based on insight: ${insight.summary}`, impactedNodes, [insight.type], [{ insightFingerprint: insight.fingerprint, description: insight.title }], remediation));
    }
    return results;
  }

  private fromRules(input: RecommendationInput): Recommendation[] {
    const results: Recommendation[] = [];
    for (const rule of input.rules ?? []) {
      for (const finding of rule.findings) {
        if (finding.severity === 'LOW') continue;
        const cat: RecommendationCategory = 'REFACTORING';
        const template = getRemediationTemplate('REDUCE_FANOUT');
        const impactedNodes = finding.evidence.filter(e => e.nodeId).map(e => e.nodeId!);
        const remediation: RemediationStrategy = { templateId: 'REDUCE_FANOUT', strategy: template?.strategy ?? 'refactor', description: template?.description ?? '', parameters: {}, expectedImpact: template?.expectedImpact ?? '' };
        results.push(this.buildRecommendation(cat, finding.severity as RecommendationSeverity, finding.title, finding.summary, `Rule "${rule.ruleName}" triggered: ${finding.summary}`, impactedNodes, [rule.ruleId], [{ ruleId: rule.ruleId, description: finding.title }], remediation));
      }
    }
    return results;
  }

  private fromPatterns(input: RecommendationInput): Recommendation[] {
    const results: Recommendation[] = [];
    for (const pattern of input.patterns ?? []) {
      if (pattern.severity === 'LOW' || pattern.confidence < 0.3) continue;
      const cat = pattern.patternType.includes('GOD') || pattern.patternType.includes('MESH') ? 'REFACTORING' : pattern.patternType.includes('CYCLE') ? 'DECOUPLING' : pattern.patternType.includes('LEAK') ? 'BOUNDARY_ENFORCEMENT' : pattern.patternType.includes('UNSTABLE') ? 'STABILITY' : pattern.patternType.includes('FRAGMENT') ? 'MODULARIZATION' : 'REFACTORING' as RecommendationCategory;
      const template = getRemediationTemplate(cat === 'DECOUPLING' ? 'BREAK_CYCLIC' : cat === 'BOUNDARY_ENFORCEMENT' ? 'INTRODUCE_BOUNDARY' : cat === 'STABILITY' ? 'ISOLATE_UNSTABLE' : 'REDUCE_FANOUT');
      const remediation: RemediationStrategy = { templateId: template?.id ?? 'REDUCE_FANOUT', strategy: template?.strategy ?? 'refactor', description: template?.description ?? '', parameters: {}, expectedImpact: template?.expectedImpact ?? '' };
        results.push(this.buildRecommendation(cat, pattern.severity as RecommendationSeverity, pattern.title, pattern.summary, `Architecture pattern "${pattern.patternType}" detected: ${pattern.summary}`, pattern.impactedNodes, [pattern.patternType], [{ patternFingerprint: pattern.fingerprint, description: pattern.title }], remediation));
    }
    return results;
  }

  private fromRisks(input: RecommendationInput): Recommendation[] {
    const results: Recommendation[] = [];
    for (const risk of input.risks ?? []) {
      if (risk.severity === 'LOW' || risk.normalizedScore < 0.3) continue;
      const cat = this.mapRiskToCategory(risk.riskType);
      const template = getRemediationTemplate(cat === 'STABILITY' ? 'ISOLATE_UNSTABLE' : cat === 'DECOUPLING' ? 'BREAK_CYCLIC' : cat === 'PROPAGATION_REDUCTION' ? 'REDUCE_PROPAGATION' : 'REDUCE_FANOUT');
      const remediation: RemediationStrategy = { templateId: template?.id ?? 'REDUCE_FANOUT', strategy: template?.strategy ?? 'refactor', description: template?.description ?? '', parameters: {}, expectedImpact: template?.expectedImpact ?? '' };
        results.push(this.buildRecommendation(cat, risk.severity as RecommendationSeverity, `${risk.riskType}: Risk mitigation`, `Risk score ${risk.normalizedScore.toFixed(3)} - ${risk.riskType}`, `Correlated risk identified: ${risk.riskType}`, risk.impactedNodes, [risk.riskType], [{ riskFingerprint: risk.fingerprint, description: risk.riskType }], remediation));
    }
    return results;
  }

  private fromPropagationData(input: RecommendationInput): Recommendation[] {
    const results: Recommendation[] = [];
    for (const pr of input.propagationRisk ?? []) {
      if (pr.propagationPressure < 0.3) continue;
      const severity: RecommendationSeverity = pr.propagationPressure >= 0.7 ? 'CRITICAL' : pr.propagationPressure >= 0.5 ? 'HIGH' : 'MODERATE';
      const template = getRemediationTemplate('REDUCE_PROPAGATION');
      const remediation: RemediationStrategy = { templateId: 'REDUCE_PROPAGATION', strategy: template?.strategy ?? 'reduce-propagation-risk', description: template?.description ?? '', parameters: { nodeId: pr.nodeId, cascadeEstimate: pr.cascadeEstimate }, expectedImpact: template?.expectedImpact ?? '' };
        results.push(this.buildRecommendation('PROPAGATION_REDUCTION', severity, `Propagation risk: ${pr.nodeId}`, `Propagation pressure ${pr.propagationPressure.toFixed(3)}, cascade estimate ${pr.cascadeEstimate.toFixed(3)}`, `Node ${pr.nodeId} is a propagation risk point`, [pr.nodeId], ['PROPAGATION'], [{ metricType: 'PROPAGATION_RISK', metricValue: pr.propagationPressure, description: `Propagation pressure: ${pr.propagationPressure.toFixed(3)}` }], remediation));
    }
    return results;
  }

  private fromCouplingData(input: RecommendationInput): Recommendation[] {
    const results: Recommendation[] = [];
    for (const fm of input.fanMetrics ?? []) {
      if (fm.isGodModule) {
        const template = getRemediationTemplate('SPLIT_GOD_MODULE');
        const remediation: RemediationStrategy = { templateId: 'SPLIT_GOD_MODULE', strategy: template?.strategy ?? 'split-god-module', description: template?.description ?? '', parameters: { nodeId: fm.nodeId, fanIn: fm.fanIn, fanOut: fm.fanOut }, expectedImpact: template?.expectedImpact ?? '' };
        const severity: RecommendationSeverity = (fm.fanIn + fm.fanOut) >= 50 ? 'CRITICAL' : (fm.fanIn + fm.fanOut) >= 30 ? 'HIGH' : 'MODERATE';
        results.push(this.buildRecommendation('MODULARIZATION', severity, `God module: ${fm.nodeId}`, `Fan-in=${fm.fanIn}, fan-out=${fm.fanOut} suggests excessive responsibility`, `Module ${fm.nodeId} has god-module characteristics`, [fm.nodeId], ['COUPLING'], [{ metricType: 'FAN_ANALYSIS', metricValue: fm.fanIn + fm.fanOut, description: `Fan-in: ${fm.fanIn}, fan-out: ${fm.fanOut}` }], remediation));
      }
      if (fm.isUtilityHotspot) {
        const template = getRemediationTemplate('REDUCE_FANOUT');
        const remediation: RemediationStrategy = { templateId: 'REDUCE_FANOUT', strategy: template?.strategy ?? 'reduce-fan-out-concentration', description: template?.description ?? '', parameters: { nodeId: fm.nodeId, currentFanOut: fm.fanOut }, expectedImpact: template?.expectedImpact ?? '' };
        results.push(this.buildRecommendation('REFACTORING', (fm.fanIn + fm.fanOut) >= 50 ? 'HIGH' : 'MODERATE', `Utility hotspot: ${fm.nodeId}`, `High fan-in concentration suggests utility coupling issue`, `Module ${fm.nodeId} is a utility hotspot`, [fm.nodeId], ['COUPLING'], [{ metricType: 'FAN_ANALYSIS', metricValue: fm.concentration, description: `Concentration: ${fm.concentration.toFixed(3)}` }], remediation));
      }
    }
    return results;
  }

  private buildRecommendation(category: RecommendationCategory, severity: RecommendationSeverity, title: string, summary: string, rationale: string, impactedNodes: string[], impactedSubsystems: string[], evidenceRefs: RecommendationEvidenceRef[], remediation: RemediationStrategy): Recommendation {
    const priority = computeRecommendationPriority(category, severity);
    const fingerprint = fingerprintRecommendation({ category, severity, title, summary, rationale, impactedNodes, evidenceRefs: evidenceRefs.map(e => ({ description: e.description })), remediation: { templateId: remediation.templateId, strategy: remediation.strategy } });
    return { category, severity, priority: priority.label, priorityScore: priority.score, fingerprint, title, summary, rationale, impactedNodes, impactedSubsystems, evidenceRefs, remediation, metadata: {} };
  }

  private mapInsightToRecommendation(type: string): { cat: RecommendationCategory | null; strat: string } {
    const map: Record<string, { cat: RecommendationCategory; strat: string }> = {
      HOTSPOT: { cat: 'REFACTORING', strat: 'REDUCE_FANOUT' },
      INSTABILITY: { cat: 'STABILITY', strat: 'ISOLATE_UNSTABLE' },
      DEPTH: { cat: 'COMPLEXITY_REDUCTION', strat: 'FLATTEN_CHAIN' },
      PROPAGATION: { cat: 'PROPAGATION_REDUCTION', strat: 'REDUCE_PROPAGATION' },
      COUPLING: { cat: 'DECOUPLING', strat: 'ISOLATE_DEPENDENCY' },
      ARCHITECTURE: { cat: 'BOUNDARY_ENFORCEMENT', strat: 'INTRODUCE_BOUNDARY' },
      COMPLEXITY: { cat: 'COMPLEXITY_REDUCTION', strat: 'FLATTEN_CHAIN' },
      FRAGMENTATION: { cat: 'MODULARIZATION', strat: 'SPLIT_GOD_MODULE' },
    };
    return map[type] ?? { cat: null, strat: 'REDUCE_FANOUT' };
  }

  private mapRiskToCategory(riskType: string): RecommendationCategory {
    const map: Record<string, RecommendationCategory> = {
      ARCHITECTURAL_COLLAPSE_RISK: 'REFACTORING', CASCADE_FAILURE_RISK: 'PROPAGATION_REDUCTION',
      MAINTAINABILITY_RISK: 'REFACTORING', CHANGE_AMPLIFICATION_RISK: 'PROPAGATION_REDUCTION',
      COUPLING_RISK: 'DECOUPLING', STABILITY_RISK: 'STABILITY',
      COMPLEXITY_RISK: 'COMPLEXITY_REDUCTION', FRAGMENTATION_RISK: 'MODULARIZATION',
      SCALABILITY_RISK: 'PERFORMANCE', EVOLUTION_RISK: 'REFACTORING',
    };
    return map[riskType] ?? 'REFACTORING';
  }
}
