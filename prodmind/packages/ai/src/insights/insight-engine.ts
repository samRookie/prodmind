import type { Insight, InsightInput, InsightOutput } from './insight-types.ts';
import { fingerprintInsight } from './insight-fingerprint.ts';
import {
  classifyHotspotSeverity,
  classifyInstabilitySeverity,
  classifyDepthSeverity,
  classifyPropagationSeverity,
  classifyCouplingSeverity,
  classifyArchitectureSeverity,
  classifyComplexitySeverity,
  classifyFragmentationSeverity,
} from './insight-classifier.ts';
function findNodePath(nodes: InsightInput['nodes'], nodeId: string): string {
  const node = nodes.find((n) => n.id === nodeId);
  return node?.filePath ?? nodeId;
}

export class InsightEngine {
  analyze(input: InsightInput): InsightOutput {
    const insights: Insight[] = [];

    insights.push(...this.detectHotspots(input));
    insights.push(...this.detectUnstableDependencies(input));
    insights.push(...this.detectDeepChains(input));
    insights.push(...this.detectPropagationChokePoints(input));
    insights.push(...this.detectCouplingIssues(input));
    insights.push(...this.detectArchitectureWarnings(input));
    insights.push(...this.detectComplexityIssues(input));
    insights.push(...this.detectFragmentation(input));

    const sorted = insights.sort((a, b) => {
      const byType = a.type.localeCompare(b.type);
      if (byType !== 0) return byType;
      const bySeverity = b.severity.localeCompare(a.severity);
      if (bySeverity !== 0) return bySeverity;
      return a.fingerprint.localeCompare(b.fingerprint);
    });

    return {
      snapshotId: input.snapshotId,
      insights: sorted,
      generatedAt: new Date().toISOString(),
    };
  }

  private detectHotspots(input: InsightInput): Insight[] {
    const results: Insight[] = [];

    for (const fm of input.fanMetrics) {
      const path = findNodePath(input.nodes, fm.nodeId);
      const severity = classifyHotspotSeverity(fm.fanIn, fm.fanOut, fm.isUtilityHotspot);

      if (severity === 'LOW') continue;

      const evidence = [
        {
          nodeId: fm.nodeId,
          metricType: 'FAN_ANALYSIS',
          metricValue: fm.fanIn + fm.fanOut,
          description: `Fan-in: ${fm.fanIn}, fan-out: ${fm.fanOut}`,
        },
      ];

      if (fm.isUtilityHotspot) {
        results.push({
          type: 'HOTSPOT',
          severity,
          scope: 'NODE',
          fingerprint: '',
          title: `Utility hotspot: ${path}`,
          summary: `${fm.nodeId} is a utility hotspot with fan-in=${fm.fanIn}, fan-out=${fm.fanOut} and concentration=${fm.concentration.toFixed(3)}`,
          evidence,
          metadata: { fanIn: fm.fanIn, fanOut: fm.fanOut, concentration: fm.concentration, isUtilityHotspot: true },
        });
      }

      if (fm.isGodModule) {
        results.push({
          type: 'HOTSPOT',
          severity: severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          scope: 'NODE',
          fingerprint: '',
          title: `God module: ${path}`,
          summary: `${fm.nodeId} is a god module with fan-in=${fm.fanIn}, fan-out=${fm.fanOut} suggesting excessive responsibility`,
          evidence,
          metadata: { fanIn: fm.fanIn, fanOut: fm.fanOut, isGodModule: true },
        });
      }
    }

    return results.map((insight) => ({
      ...insight,
      fingerprint: fingerprintInsight({
        type: insight.type,
        severity: insight.severity,
        scope: insight.scope,
        title: insight.title,
        summary: insight.summary,
        evidence: insight.evidence,
        metadata: insight.metadata as Record<string, unknown>,
      }),
    }));
  }

  private detectUnstableDependencies(input: InsightInput): Insight[] {
    const results: Insight[] = [];

    for (const inst of input.instability) {
      const path = findNodePath(input.nodes, inst.nodeId);
      const severity = classifyInstabilitySeverity(inst.instabilityScore, inst.isVolatileCore, inst.hasInversionRisk);

      if (severity === 'LOW') continue;

      const evidence = [
        {
          nodeId: inst.nodeId,
          metricType: 'INSTABILITY',
          metricValue: inst.instabilityScore,
          description: `Instability score: ${inst.instabilityScore.toFixed(3)}`,
        },
      ];

      if (inst.isUnstableInfrastructure) {
        results.push({
          type: 'INSTABILITY',
          severity,
          scope: 'NODE',
          fingerprint: '',
          title: `Unstable infrastructure: ${path}`,
          summary: `${inst.nodeId} is unstable infrastructure with score ${inst.instabilityScore.toFixed(3)} — infrastructure should be stable`,
          evidence,
          metadata: { instabilityScore: inst.instabilityScore, isUnstableInfrastructure: true },
        });
      }

      if (inst.isVolatileCore) {
        results.push({
          type: 'INSTABILITY',
          severity,
          scope: 'NODE',
          fingerprint: '',
          title: `Volatile core module: ${path}`,
          summary: `${inst.nodeId} is a volatile core module with instability ${inst.instabilityScore.toFixed(3)} — core should be stable`,
          evidence,
          metadata: { instabilityScore: inst.instabilityScore, isVolatileCore: true },
        });
      }

      if (inst.hasInversionRisk) {
        results.push({
          type: 'INSTABILITY',
          severity: severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          scope: 'NODE',
          fingerprint: '',
          title: `Dependency inversion risk: ${path}`,
          summary: `${inst.nodeId} has dependency inversion risk — stable module depends on unstable module`,
          evidence,
          metadata: { instabilityScore: inst.instabilityScore, hasInversionRisk: true },
        });
      }
    }

    return results.map((insight) => ({
      ...insight,
      fingerprint: fingerprintInsight({
        type: insight.type,
        severity: insight.severity,
        scope: insight.scope,
        title: insight.title,
        summary: insight.summary,
        evidence: insight.evidence,
        metadata: insight.metadata as Record<string, unknown>,
      }),
    }));
  }

  private detectDeepChains(input: InsightInput): Insight[] {
    const results: Insight[] = [];
    const { depth } = input;

    if (depth.hasExcessivelyDeepChains) {
      const severity = classifyDepthSeverity(depth.maxDepth);
      results.push({
        type: 'DEPTH',
        severity,
        scope: 'GLOBAL',
        fingerprint: '',
        title: 'Excessive dependency chain depth',
        summary: `Maximum dependency chain depth is ${depth.maxDepth} (average: ${depth.averageDepth.toFixed(2)}). Deep chains increase change propagation risk.`,
        evidence: [
          {
            metricType: 'DEPTH',
            metricValue: depth.maxDepth,
            description: `Max depth: ${depth.maxDepth}, avg depth: ${depth.averageDepth.toFixed(2)}`,
          },
        ],
        metadata: { maxDepth: depth.maxDepth, averageDepth: depth.averageDepth },
      });
    }

    for (const violation of depth.layeringViolations) {
      const sourcePath = findNodePath(input.nodes, violation.sourceId);
      const severity = classifyArchitectureSeverity(depth.layeringViolations.length, false);

      results.push({
        type: 'DEPTH',
        severity,
        scope: 'EDGE',
        fingerprint: '',
        title: `Layering violation: ${sourcePath}`,
        summary: `${violation.sourceId} depends on ${violation.targetId}: ${violation.reason}`,
        evidence: [
          {
            nodeId: violation.sourceId,
            edgeId: `${violation.sourceId}->${violation.targetId}`,
            description: violation.reason,
          },
          { nodeId: violation.targetId, description: 'Target of layering violation' },
        ],
        metadata: { sourceId: violation.sourceId, targetId: violation.targetId, reason: violation.reason },
      });
    }

    return results.map((insight) => ({
      ...insight,
      fingerprint: fingerprintInsight({
        type: insight.type,
        severity: insight.severity,
        scope: insight.scope,
        title: insight.title,
        summary: insight.summary,
        evidence: insight.evidence,
        metadata: insight.metadata as Record<string, unknown>,
      }),
    }));
  }

  private detectPropagationChokePoints(input: InsightInput): Insight[] {
    const results: Insight[] = [];

    for (const pr of input.propagationRisk) {
      if (!pr.isChokePoint && pr.propagationPressure < 0.3) continue;

      const path = findNodePath(input.nodes, pr.nodeId);
      const severity = classifyPropagationSeverity(pr.propagationPressure, pr.isChokePoint);

      const evidence = [
        {
          nodeId: pr.nodeId,
          metricType: 'PROPAGATION_RISK',
          metricValue: Math.max(pr.propagationPressure, pr.blastRadiusAmplification, pr.cascadeEstimate),
          description: `Propagation pressure: ${pr.propagationPressure.toFixed(3)}`,
        },
      ];

      if (pr.isChokePoint) {
        results.push({
          type: 'PROPAGATION',
          severity,
          scope: 'NODE',
          fingerprint: '',
          title: `Propagation choke point: ${path}`,
          summary: `${pr.nodeId} is a propagation choke point — changes here affect downstream modules with cascade estimate ${pr.cascadeEstimate.toFixed(3)}`,
          evidence,
          metadata: { propagationPressure: pr.propagationPressure, blastRadiusAmplification: pr.blastRadiusAmplification, cascadeEstimate: pr.cascadeEstimate, isChokePoint: true },
        });
      }

      if (pr.propagationPressure >= 0.5 && !pr.isChokePoint) {
        results.push({
          type: 'PROPAGATION',
          severity,
          scope: 'NODE',
          fingerprint: '',
          title: `High propagation risk: ${path}`,
          summary: `${pr.nodeId} has high propagation pressure (${pr.propagationPressure.toFixed(3)})`,
          evidence,
          metadata: { propagationPressure: pr.propagationPressure, blastRadiusAmplification: pr.blastRadiusAmplification, cascadeEstimate: pr.cascadeEstimate },
        });
      }
    }

    return results.map((insight) => ({
      ...insight,
      fingerprint: fingerprintInsight({
        type: insight.type,
        severity: insight.severity,
        scope: insight.scope,
        title: insight.title,
        summary: insight.summary,
        evidence: insight.evidence,
        metadata: insight.metadata as Record<string, unknown>,
      }),
    }));
  }

  private detectCouplingIssues(input: InsightInput): Insight[] {
    const results: Insight[] = [];

    const { couplingDensity } = input;

    if (couplingDensity.globalDensity > 0.05) {
      const severity = classifyCouplingSeverity(couplingDensity.globalDensity, false);
      results.push({
        type: 'COUPLING',
        severity,
        scope: 'GLOBAL',
        fingerprint: '',
        title: 'High global coupling density',
        summary: `Global coupling density is ${couplingDensity.globalDensity.toFixed(4)} with edge concentration ${couplingDensity.edgeConcentration.toFixed(3)}`,
        evidence: [
          {
            metricType: 'COUPLING_DENSITY',
            metricValue: couplingDensity.globalDensity,
            description: `Global density: ${couplingDensity.globalDensity.toFixed(4)}`,
          },
        ],
        metadata: { globalDensity: couplingDensity.globalDensity, edgeConcentration: couplingDensity.edgeConcentration },
      });
    }

    for (const cd of couplingDensity.clusterDensities) {
      if (cd.density > 0.1) {
        results.push({
          type: 'COUPLING',
          severity: 'MODERATE',
          scope: 'CLUSTER',
          fingerprint: '',
          title: `High cluster coupling: ${cd.clusterName}`,
          summary: `Cluster ${cd.clusterName} has coupling density ${cd.density.toFixed(4)} across ${cd.nodeCount} nodes`,
          evidence: [
            {
              metricType: 'COUPLING_DENSITY',
              metricValue: cd.density,
              description: `Cluster ${cd.clusterName}: density=${cd.density.toFixed(4)}, nodes=${cd.nodeCount}`,
            },
          ],
          metadata: { clusterName: cd.clusterName, density: cd.density, nodeCount: cd.nodeCount },
        });
      }
    }

    return results.map((insight) => ({
      ...insight,
      fingerprint: fingerprintInsight({
        type: insight.type,
        severity: insight.severity,
        scope: insight.scope,
        title: insight.title,
        summary: insight.summary,
        evidence: insight.evidence,
        metadata: insight.metadata as Record<string, unknown>,
      }),
    }));
  }

  private detectArchitectureWarnings(input: InsightInput): Insight[] {
    const results: Insight[] = [];

    const { sccData, depth } = input;

    if (sccData.componentCount > 0) {
      const violations = depth.layeringViolations.length;
      const hasCycles = sccData.componentCount > 0;
      const severity = classifyArchitectureSeverity(violations, hasCycles);

      const cyclicNodeCount = [...sccData.componentNodes.values()]
        .filter((nodes) => nodes.length > 1)
        .reduce((sum, nodes) => sum + nodes.length, 0);

      if (cyclicNodeCount > 0) {
        results.push({
          type: 'ARCHITECTURE',
          severity,
          scope: 'GLOBAL',
          fingerprint: '',
          title: 'Cyclic dependencies detected',
          summary: `${cyclicNodeCount} nodes participate in ${sccData.componentCount} cyclic dependency groups`,
          evidence: [
            {
              metricType: 'COMPLEXITY',
              metricValue: cyclicNodeCount,
              description: `${cyclicNodeCount} nodes in ${sccData.componentCount} SCCs`,
            },
          ],
          metadata: { componentCount: sccData.componentCount, cyclicNodeCount },
        });

        for (const [compId, nodes] of sccData.componentNodes) {
          if (nodes.length <= 1) continue;
          const firstPath = findNodePath(input.nodes, nodes[0]!);
          results.push({
            type: 'ARCHITECTURE',
            severity: nodes.length > 3 ? 'HIGH' : 'MODERATE',
            scope: 'CLUSTER',
            fingerprint: '',
            title: `Cyclic group (${nodes.length} nodes): ${firstPath}`,
            summary: `${nodes.length} nodes form a cycle: ${nodes.join(', ')}`,
            evidence: nodes.map((nid) => ({
              nodeId: nid,
              description: `Participant in cycle component ${compId}`,
            })),
            metadata: { componentId: compId, nodeCount: nodes.length, nodeIds: nodes },
          });
        }
      }
    }

    return results.map((insight) => ({
      ...insight,
      fingerprint: fingerprintInsight({
        type: insight.type,
        severity: insight.severity,
        scope: insight.scope,
        title: insight.title,
        summary: insight.summary,
        evidence: insight.evidence,
        metadata: insight.metadata as Record<string, unknown>,
      }),
    }));
  }

  private detectComplexityIssues(input: InsightInput): Insight[] {
    const results: Insight[] = [];
    const { complexity } = input;

    const severity = classifyComplexitySeverity(complexity.finalScore);
    if (severity === 'LOW') return results;

    const details: string[] = [];
    if (complexity.densityScore > 0.5) details.push(`density=${complexity.densityScore.toFixed(3)}`);
    if (complexity.entropyScore > 0.5) details.push(`entropy=${complexity.entropyScore.toFixed(3)}`);
    if (complexity.fragmentationScore > 0.5) details.push(`fragmentation=${complexity.fragmentationScore.toFixed(3)}`);
    if (complexity.cycleScore > 0.3) details.push(`cycles=${complexity.cycleScore.toFixed(3)}`);
    if (complexity.depthScore > 0.3) details.push(`depth=${complexity.depthScore.toFixed(3)}`);

    results.push({
      type: 'COMPLEXITY',
      severity,
      scope: 'GLOBAL',
      fingerprint: '',
      title: `Architecture complexity: ${complexity.complexityLevel}`,
      summary: `System complexity score is ${complexity.finalScore.toFixed(3)} (${complexity.complexityLevel}). Factors: ${details.join(', ')}`,
      evidence: [
        {
          metricType: 'COMPLEXITY',
          metricValue: complexity.finalScore,
          description: `Complexity score: ${complexity.finalScore.toFixed(3)} level: ${complexity.complexityLevel}`,
        },
      ],
      metadata: {
        finalScore: complexity.finalScore,
        complexityLevel: complexity.complexityLevel,
        densityScore: complexity.densityScore,
        entropyScore: complexity.entropyScore,
        fragmentationScore: complexity.fragmentationScore,
        cycleScore: complexity.cycleScore,
        depthScore: complexity.depthScore,
        edgeNodeRatio: complexity.edgeNodeRatio,
        sccDensity: complexity.sccDensity,
        architecturalEntropy: complexity.architecturalEntropy,
      },
    });

    return results.map((insight) => ({
      ...insight,
      fingerprint: fingerprintInsight({
        type: insight.type,
        severity: insight.severity,
        scope: insight.scope,
        title: insight.title,
        summary: insight.summary,
        evidence: insight.evidence,
        metadata: insight.metadata as Record<string, unknown>,
      }),
    }));
  }

  private detectFragmentation(input: InsightInput): Insight[] {
    const results: Insight[] = [];

    const { couplingDensity, complexity } = input;

    if (couplingDensity.clusterDensities.length > 5) {
      const severity = classifyFragmentationSeverity(
        couplingDensity.clusterDensities.length,
        complexity.fragmentationScore,
      );

      const highDensityClusters = couplingDensity.clusterDensities.filter((c) => c.density > 0.05);
      const fragmentedClusters = couplingDensity.clusterDensities.filter((c) => c.density <= 0.05);

      if (fragmentedClusters.length > 3) {
        results.push({
          type: 'FRAGMENTATION',
          severity,
          scope: 'GLOBAL',
          fingerprint: '',
          title: 'Fragmented architecture detected',
          summary: `${fragmentedClusters.length}/${couplingDensity.clusterDensities.length} clusters have low cohesion (density ≤ 0.05)`,
          evidence: [
            {
              metricType: 'COUPLING_DENSITY',
              metricValue: complexity.fragmentationScore,
              description: `Fragmentation score: ${complexity.fragmentationScore.toFixed(3)}`,
            },
          ],
          metadata: {
            totalClusters: couplingDensity.clusterDensities.length,
            highDensityClusters: highDensityClusters.length,
            fragmentedClusters: fragmentedClusters.length,
            fragmentationScore: complexity.fragmentationScore,
          },
        });
      }
    }

    return results.map((insight) => ({
      ...insight,
      fingerprint: fingerprintInsight({
        type: insight.type,
        severity: insight.severity,
        scope: insight.scope,
        title: insight.title,
        summary: insight.summary,
        evidence: insight.evidence,
        metadata: insight.metadata as Record<string, unknown>,
      }),
    }));
  }
}
