import type { PatternDetection, PatternInput } from './pattern-types.ts';
import { fingerprintPattern } from './pattern-fingerprint.ts';
import { classifyPatternConfidence, classifyPatternSeverity } from './pattern-classifier.ts';

export function detectArchitecturePatterns(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  results.push(...detectLayered(input));
  results.push(...detectModular(input));
  results.push(...detectHubAndSpoke(input));
  results.push(...detectServiceCluster(input));
  results.push(...detectDomainGrouping(input));
  results.push(...detectSharedCore(input));
  results.push(...detectBoundedContext(input));
  return results;
}

function detectLayered(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  const depth = input.complexity.depthScore;
  const layerViolations = input.edges.filter(e => e.edgeType === 'CROSS_LAYER' || e.edgeType === 'BACK_EDGE');
  const strongLayering = layerViolations.length === 0 && depth > 0 && depth < 0.4;
  const moderateLayering = layerViolations.length <= 3 && depth > 0 && depth < 0.6;
  if (strongLayering || moderateLayering) {
    const confidence = classifyPatternConfidence(2, 0, input.edges.length > 0 ? 1 : 0, strongLayering ? 0.9 : 0.6);
    const severity = classifyPatternSeverity(input.nodes.length, confidence);
    const detection: PatternDetection = {
      patternType: 'LAYERED', isAntiPattern: false, severity, confidence,
      fingerprint: '', title: strongLayering ? 'Layered architecture detected' : 'Partial layering detected',
      summary: strongLayering ? `System exhibits ${depth.toFixed(2)} depth score with no cross-layer violations` : `System has ${layerViolations.length} cross-layer violations but exhibits layering characteristics`,
      impactedNodes: input.nodes.map(n => n.id), impactedClusters: [],
      topologyEvidence: [{ nodeIds: input.nodes.map(n => n.id), edgeCount: input.edges.length, subgraphDensity: input.couplingDensity.globalDensity, description: `Depth: ${depth.toFixed(3)}, violations: ${layerViolations.length}` }],
      sccEvidence: [], metricEvidence: [{ metricType: 'DEPTH_SCORE', metricValue: depth, description: `Depth score: ${depth.toFixed(3)}` }],
      metadata: { depthScore: depth, violationCount: layerViolations.length },
    };
    detection.fingerprint = fingerprintPattern({ patternType: 'LAYERED', isAntiPattern: false, severity: detection.severity, title: detection.title, summary: detection.summary, impactedNodes: detection.impactedNodes, metricEvidence: detection.metricEvidence });
    results.push(detection);
  }
  return results;
}

function detectModular(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  const clusterCount = input.couplingDensity.clusterDensities.length;
  const lowGlobalDensity = input.couplingDensity.globalDensity < 0.1;
  const hasDomainClusters = clusterCount >= 2;
  if (hasDomainClusters && lowGlobalDensity) {
    const avgClusterCohesion = input.couplingDensity.clusterDensities.reduce((s, c) => s + c.density, 0) / clusterCount;
    const confidence = classifyPatternConfidence(2, 0, clusterCount, Math.min(avgClusterCohesion * 2, 1));
    const severity = classifyPatternSeverity(input.nodes.length, confidence);
    const detection: PatternDetection = {
      patternType: 'MODULAR', isAntiPattern: false, severity, confidence,
      fingerprint: '', title: 'Modular architecture detected',
      summary: `${clusterCount} domain clusters with global coupling density ${input.couplingDensity.globalDensity.toFixed(4)}`,
      impactedNodes: input.nodes.map(n => n.id), impactedClusters: input.couplingDensity.clusterDensities.map(c => c.clusterName),
      topologyEvidence: [{ nodeIds: input.nodes.map(n => n.id), edgeCount: input.edges.length, subgraphDensity: input.couplingDensity.globalDensity, description: `${clusterCount} clusters, avg cohesion ${avgClusterCohesion.toFixed(4)}` }],
      sccEvidence: [], metricEvidence: [
        { metricType: 'GLOBAL_DENSITY', metricValue: input.couplingDensity.globalDensity, description: `Global density: ${input.couplingDensity.globalDensity.toFixed(4)}` },
        { metricType: 'CLUSTER_COUNT', metricValue: clusterCount, description: `${clusterCount} clusters` },
      ],
      metadata: { clusterCount, globalDensity: input.couplingDensity.globalDensity, avgClusterCohesion },
    };
    detection.fingerprint = fingerprintPattern({ patternType: 'MODULAR', isAntiPattern: false, severity: detection.severity, title: detection.title, summary: detection.summary, impactedNodes: detection.impactedNodes, metricEvidence: detection.metricEvidence });
    results.push(detection);
  }
  return results;
}

function detectHubAndSpoke(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  const hubs = input.centrality.filter(c => c.isUtilityHub && c.dependencyInfluenceScore > 0.5);
  if (hubs.length >= 1 && hubs.length <= 3) {
    const confidence = classifyPatternConfidence(2, 0, hubs.length, hubs[0]!.dependencyInfluenceScore);
    const severity = classifyPatternSeverity(hubs.length, confidence);
    const detection: PatternDetection = {
      patternType: 'HUB_AND_SPOKE', isAntiPattern: false, severity, confidence,
      fingerprint: '', title: 'Hub-and-spoke topology detected',
      summary: `${hubs.length} central hub(s) with high dependency influence`,
      impactedNodes: hubs.map(h => h.nodeId), impactedClusters: [],
      topologyEvidence: [{ nodeIds: hubs.map(h => h.nodeId), edgeCount: hubs.reduce((s, h) => s + h.inDegree + h.outDegree, 0), subgraphDensity: 0, description: `${hubs.length} central hubs identified` }],
      sccEvidence: [], metricEvidence: hubs.map(h => ({ metricType: 'INFLUENCE_SCORE', metricValue: h.dependencyInfluenceScore, description: `${h.nodeId} influence: ${h.dependencyInfluenceScore.toFixed(3)}` })),
      metadata: { hubCount: hubs.length, hubs: hubs.map(h => ({ nodeId: h.nodeId, influence: h.dependencyInfluenceScore })) },
    };
    detection.fingerprint = fingerprintPattern({ patternType: 'HUB_AND_SPOKE', isAntiPattern: false, severity: detection.severity, title: detection.title, summary: detection.summary, impactedNodes: detection.impactedNodes, metricEvidence: detection.metricEvidence });
    results.push(detection);
  }
  return results;
}

function detectServiceCluster(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  const clusters = input.couplingDensity.clusterDensities;
  const highCohesionClusters = clusters.filter(c => c.density > 0.2 && c.nodeCount >= 3);
  if (highCohesionClusters.length >= 2) {
    const avgCohesion = highCohesionClusters.reduce((s, c) => s + c.density, 0) / highCohesionClusters.length;
    const confidence = classifyPatternConfidence(2, 0, highCohesionClusters.length, Math.min(avgCohesion, 1));
    const severity = classifyPatternSeverity(highCohesionClusters.reduce((s, c) => s + c.nodeCount, 0), confidence);
    const detection: PatternDetection = {
      patternType: 'SERVICE_CLUSTER', isAntiPattern: false, severity, confidence,
      fingerprint: '', title: 'Service-like cluster grouping detected',
      summary: `${highCohesionClusters.length} clusters with high internal cohesion`,
      impactedNodes: input.nodes.map(n => n.id), impactedClusters: highCohesionClusters.map(c => c.clusterName),
      topologyEvidence: [{ nodeIds: [], edgeCount: 0, subgraphDensity: 0, description: `${highCohesionClusters.length} cohesive clusters (density > 0.2)` }],
      sccEvidence: [], metricEvidence: highCohesionClusters.map(c => ({ metricType: 'CLUSTER_COHESION', metricValue: c.density, description: `${c.clusterName}: cohesion ${c.density.toFixed(4)}` })),
      metadata: { clusterCount: highCohesionClusters.length, avgCohesion, clusters: highCohesionClusters.map(c => ({ name: c.clusterName, cohesion: c.density, nodeCount: c.nodeCount })) },
    };
    detection.fingerprint = fingerprintPattern({ patternType: 'SERVICE_CLUSTER', isAntiPattern: false, severity: detection.severity, title: detection.title, summary: detection.summary, impactedNodes: detection.impactedNodes, metricEvidence: detection.metricEvidence });
    results.push(detection);
  }
  return results;
}

function detectDomainGrouping(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  const clusters = input.couplingDensity.clusterDensities;
  if (clusters.length >= 3) {
    const confidence = classifyPatternConfidence(1, 0, clusters.length, Math.min(clusters.length / 10, 1));
    const severity = classifyPatternSeverity(clusters.reduce((s, c) => s + c.nodeCount, 0), confidence);
    const detection: PatternDetection = {
      patternType: 'DOMAIN_GROUPING', isAntiPattern: false, severity, confidence,
      fingerprint: '', title: 'Domain grouping detected',
      summary: `${clusters.length} domain groups identified across the architecture`,
      impactedNodes: input.nodes.map(n => n.id), impactedClusters: clusters.map(c => c.clusterName),
      topologyEvidence: [{ nodeIds: [], edgeCount: 0, subgraphDensity: 0, description: `${clusters.length} domain groups` }],
      sccEvidence: [], metricEvidence: clusters.map(c => ({ metricType: 'CLUSTER_NODE_COUNT', metricValue: c.nodeCount, description: `${c.clusterName}: ${c.nodeCount} nodes` })),
      metadata: { clusterCount: clusters.length, clusters: clusters.map(c => ({ name: c.clusterName, nodeCount: c.nodeCount })) },
    };
    detection.fingerprint = fingerprintPattern({ patternType: 'DOMAIN_GROUPING', isAntiPattern: false, severity: detection.severity, title: detection.title, summary: detection.summary, impactedNodes: detection.impactedNodes, metricEvidence: detection.metricEvidence });
    results.push(detection);
  }
  return results;
}

function detectSharedCore(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  const highFanInNodes = input.centrality.filter(c => c.inDegree > input.centrality.length * 0.1 && c.dependencyInfluenceScore > 0.3);
  if (highFanInNodes.length >= 2) {
    const avgInfluence = highFanInNodes.reduce((s, h) => s + h.dependencyInfluenceScore, 0) / highFanInNodes.length;
    const confidence = classifyPatternConfidence(2, 0, highFanInNodes.length, Math.min(avgInfluence, 1));
    const severity = classifyPatternSeverity(highFanInNodes.length, confidence);
    const detection: PatternDetection = {
      patternType: 'SHARED_CORE', isAntiPattern: false, severity, confidence,
      fingerprint: '', title: 'Shared core detected',
      summary: `${highFanInNodes.length} modules with high shared dependency influence`,
      impactedNodes: highFanInNodes.map(h => h.nodeId), impactedClusters: [],
      topologyEvidence: [{ nodeIds: highFanInNodes.map(h => h.nodeId), edgeCount: highFanInNodes.reduce((s, h) => s + h.inDegree, 0), subgraphDensity: 0, description: `${highFanInNodes.length} shared core modules` }],
      sccEvidence: [], metricEvidence: highFanInNodes.map(h => ({ metricType: 'INFLUENCE_SCORE', metricValue: h.dependencyInfluenceScore, description: `${h.nodeId}: influence ${h.dependencyInfluenceScore.toFixed(3)}` })),
      metadata: { coreModuleCount: highFanInNodes.length, avgInfluence, modules: highFanInNodes.map(h => ({ nodeId: h.nodeId, inDegree: h.inDegree, influence: h.dependencyInfluenceScore })) },
    };
    detection.fingerprint = fingerprintPattern({ patternType: 'SHARED_CORE', isAntiPattern: false, severity: detection.severity, title: detection.title, summary: detection.summary, impactedNodes: detection.impactedNodes, metricEvidence: detection.metricEvidence });
    results.push(detection);
  }
  return results;
}

function detectBoundedContext(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  const clusters = input.couplingDensity.clusterDensities;
  const isolatedClusters = clusters.filter(c => c.density < 0.05 && c.nodeCount >= 2);
  if (isolatedClusters.length >= 2) {
    const confidence = classifyPatternConfidence(1, 0, isolatedClusters.length, Math.min(isolatedClusters.length / 8, 1));
    const severity = classifyPatternSeverity(isolatedClusters.reduce((s, c) => s + c.nodeCount, 0), confidence);
    const detection: PatternDetection = {
      patternType: 'BOUNDED_CONTEXT', isAntiPattern: false, severity, confidence,
      fingerprint: '', title: 'Bounded context detected',
      summary: `${isolatedClusters.length} isolated clusters with minimal coupling between them`,
      impactedNodes: input.nodes.map(n => n.id), impactedClusters: isolatedClusters.map(c => c.clusterName),
      topologyEvidence: [{ nodeIds: [], edgeCount: 0, subgraphDensity: 0, description: `${isolatedClusters.length} bounded contexts` }],
      sccEvidence: [], metricEvidence: isolatedClusters.map(c => ({ metricType: 'ISOLATION_SCORE', metricValue: 1 - c.density, description: `${c.clusterName}: isolation ${(1 - c.density).toFixed(4)}` })),
      metadata: { boundedContextCount: isolatedClusters.length, clusters: isolatedClusters.map(c => ({ name: c.clusterName, nodeCount: c.nodeCount })) },
    };
    detection.fingerprint = fingerprintPattern({ patternType: 'BOUNDED_CONTEXT', isAntiPattern: false, severity: detection.severity, title: detection.title, summary: detection.summary, impactedNodes: detection.impactedNodes, metricEvidence: detection.metricEvidence });
    results.push(detection);
  }
  return results;
}
