import type { PatternDetection, PatternInput } from './pattern-types.ts';
import { fingerprintPattern } from './pattern-fingerprint.ts';
import { classifyPatternConfidence, classifyPatternSeverity } from './pattern-classifier.ts';

export function detectAntiPatterns(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  results.push(...detectGodModules(input));
  results.push(...detectDependencyMesh(input));
  results.push(...detectCyclicClusters(input));
  results.push(...detectPropagationHubs(input));
  results.push(...detectUtilityGravityWells(input));
  results.push(...detectLayerLeakage(input));
  results.push(...detectUnstableCore(input));
  results.push(...detectArchitecturalFragmentation(input));
  return results;
}

function detectGodModules(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  for (const fm of input.fanMetrics) {
    if (fm.isGodModule) {
      const totalFan = fm.fanIn + fm.fanOut;
      const confidence = classifyPatternConfidence(2, 0, 1, Math.min(totalFan / 100, 1));
      const severity = totalFan >= 50 ? 'CRITICAL' : totalFan >= 30 ? 'HIGH' : 'MODERATE';
      const detection: PatternDetection = {
        patternType: 'GOD_MODULE', isAntiPattern: true, severity, confidence,
        fingerprint: '', title: `God module: ${fm.nodeId}`, summary: `Module has fan-in=${fm.fanIn}, fan-out=${fm.fanOut} suggesting excessive responsibility`,
        impactedNodes: [fm.nodeId], impactedClusters: [],
        topologyEvidence: [{ nodeIds: [fm.nodeId], edgeCount: totalFan, subgraphDensity: 0, description: `Fan-in: ${fm.fanIn}, fan-out: ${fm.fanOut}` }],
        sccEvidence: [], metricEvidence: [
          { metricType: 'FAN_IN', metricValue: fm.fanIn, description: `Fan-in: ${fm.fanIn}` },
          { metricType: 'FAN_OUT', metricValue: fm.fanOut, description: `Fan-out: ${fm.fanOut}` },
          { metricType: 'CONCENTRATION', metricValue: fm.concentration, description: `Concentration: ${fm.concentration.toFixed(3)}` },
        ],
        metadata: { fanIn: fm.fanIn, fanOut: fm.fanOut, concentration: fm.concentration },
      };
      detection.fingerprint = fingerprintPattern({ patternType: 'GOD_MODULE', isAntiPattern: true, severity: detection.severity, title: detection.title, summary: detection.summary, impactedNodes: detection.impactedNodes, metricEvidence: detection.metricEvidence });
      results.push(detection);
    }
  }
  return results;
}

function detectDependencyMesh(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  if (input.couplingDensity.globalDensity > 0.15) {
    const confidence = classifyPatternConfidence(2, 0, 1, Math.min(input.couplingDensity.globalDensity * 3, 1));
    const severity = classifyPatternSeverity(input.nodes.length, input.couplingDensity.globalDensity);
    const detection: PatternDetection = {
      patternType: 'DEPENDENCY_MESH', isAntiPattern: true, severity, confidence,
      fingerprint: '', title: 'Dependency mesh detected',
      summary: `Global coupling density ${input.couplingDensity.globalDensity.toFixed(4)} suggests excessive interdependency`,
      impactedNodes: input.nodes.map(n => n.id), impactedClusters: [],
      topologyEvidence: [{ nodeIds: input.nodes.map(n => n.id), edgeCount: input.edges.length, subgraphDensity: input.couplingDensity.globalDensity, description: `Global density: ${input.couplingDensity.globalDensity.toFixed(4)}` }],
      sccEvidence: [], metricEvidence: [{ metricType: 'GLOBAL_DENSITY', metricValue: input.couplingDensity.globalDensity, description: `Global density: ${input.couplingDensity.globalDensity.toFixed(4)}` }],
      metadata: { globalDensity: input.couplingDensity.globalDensity, edgeCount: input.edges.length },
    };
    detection.fingerprint = fingerprintPattern({ patternType: 'DEPENDENCY_MESH', isAntiPattern: true, severity: detection.severity, title: detection.title, summary: detection.summary, impactedNodes: detection.impactedNodes, metricEvidence: detection.metricEvidence });
    results.push(detection);
  }
  return results;
}

function detectCyclicClusters(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  for (const [compId, nodes] of input.sccData.componentNodes) {
    if (nodes.length <= 1) continue;
    const confidence = classifyPatternConfidence(0, 1, 1, Math.min(nodes.length / 10, 1));
    const severity = nodes.length > 5 ? 'CRITICAL' : nodes.length > 3 ? 'HIGH' : 'MODERATE';
    const detection: PatternDetection = {
      patternType: 'CYCLIC_CLUSTER', isAntiPattern: true, severity, confidence,
      fingerprint: '', title: `Cyclic cluster (${nodes.length} nodes)`,
      summary: `${nodes.length} modules form a cyclic dependency group`,
      impactedNodes: nodes, impactedClusters: [],
      topologyEvidence: [{ nodeIds: nodes, edgeCount: 0, subgraphDensity: 0, description: `${nodes.length} nodes in cycle component ${compId}` }],
      sccEvidence: [{ componentId: compId, componentSize: nodes.length, memberNodes: nodes }],
      metricEvidence: [{ metricType: 'SCC_SIZE', metricValue: nodes.length, description: `SCC component ${compId} has ${nodes.length} nodes` }],
      metadata: { componentId: compId, nodeCount: nodes.length },
    };
    detection.fingerprint = fingerprintPattern({ patternType: 'CYCLIC_CLUSTER', isAntiPattern: true, severity: detection.severity, title: detection.title, summary: detection.summary, impactedNodes: detection.impactedNodes, metricEvidence: detection.metricEvidence });
    results.push(detection);
  }
  return results;
}

function detectPropagationHubs(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  for (const pr of input.propagationRisk) {
    if (pr.isChokePoint) {
      const confidence = classifyPatternConfidence(2, 0, 1, Math.min(pr.blastRadiusAmplification, 1));
      const severity = pr.propagationPressure >= 0.7 ? 'CRITICAL' : pr.propagationPressure >= 0.5 ? 'HIGH' : 'MODERATE';
      const detection: PatternDetection = {
        patternType: 'PROPAGATION_HUB', isAntiPattern: true, severity, confidence,
        fingerprint: '', title: `Propagation hub: ${pr.nodeId}`,
        summary: `Choke point with propagation pressure ${pr.propagationPressure.toFixed(3)} and blast radius amplification ${pr.blastRadiusAmplification.toFixed(3)}`,
        impactedNodes: [pr.nodeId], impactedClusters: [],
        topologyEvidence: [{ nodeIds: [pr.nodeId], edgeCount: 0, subgraphDensity: 0, description: `Choke point with cascade estimate ${pr.cascadeEstimate.toFixed(3)}` }],
        sccEvidence: [], metricEvidence: [
          { metricType: 'PROPAGATION_PRESSURE', metricValue: pr.propagationPressure, description: `Propagation pressure: ${pr.propagationPressure.toFixed(3)}` },
          { metricType: 'BLAST_RADIUS', metricValue: pr.blastRadiusAmplification, description: `Blast radius: ${pr.blastRadiusAmplification.toFixed(3)}` },
          { metricType: 'CASCADE_ESTIMATE', metricValue: pr.cascadeEstimate, description: `Cascade estimate: ${pr.cascadeEstimate.toFixed(3)}` },
        ],
        metadata: { propagationPressure: pr.propagationPressure, blastRadiusAmplification: pr.blastRadiusAmplification, cascadeEstimate: pr.cascadeEstimate },
      };
      detection.fingerprint = fingerprintPattern({ patternType: 'PROPAGATION_HUB', isAntiPattern: true, severity: detection.severity, title: detection.title, summary: detection.summary, impactedNodes: detection.impactedNodes, metricEvidence: detection.metricEvidence });
      results.push(detection);
    }
  }
  return results;
}

function detectUtilityGravityWells(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  for (const fm of input.fanMetrics) {
    if (fm.isUtilityHotspot && fm.fanIn > 20) {
      const confidence = classifyPatternConfidence(2, 0, 1, Math.min(fm.concentration, 1));
      const severity = fm.fanIn > 50 ? 'CRITICAL' : fm.fanIn > 30 ? 'HIGH' : 'MODERATE';
      const detection: PatternDetection = {
        patternType: 'UTILITY_GRAVITY_WELL', isAntiPattern: true, severity, confidence,
        fingerprint: '', title: `Utility gravity well: ${fm.nodeId}`,
        summary: `High fan-in (${fm.fanIn}) creates utility gravity well with concentration ${fm.concentration.toFixed(3)}`,
        impactedNodes: [fm.nodeId], impactedClusters: [],
        topologyEvidence: [{ nodeIds: [fm.nodeId], edgeCount: fm.fanIn, subgraphDensity: 0, description: `Fan-in: ${fm.fanIn}` }],
        sccEvidence: [], metricEvidence: [
          { metricType: 'FAN_IN', metricValue: fm.fanIn, description: `Fan-in: ${fm.fanIn}` },
          { metricType: 'CONCENTRATION', metricValue: fm.concentration, description: `Concentration: ${fm.concentration.toFixed(3)}` },
        ],
        metadata: { fanIn: fm.fanIn, concentration: fm.concentration },
      };
      detection.fingerprint = fingerprintPattern({ patternType: 'UTILITY_GRAVITY_WELL', isAntiPattern: true, severity: detection.severity, title: detection.title, summary: detection.summary, impactedNodes: detection.impactedNodes, metricEvidence: detection.metricEvidence });
      results.push(detection);
    }
  }
  return results;
}

function detectLayerLeakage(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  const crossLayerEdges = input.edges.filter(e => e.edgeType === 'CROSS_LAYER' || e.edgeType === 'BACK_EDGE');
  if (crossLayerEdges.length > 0) {
    const confidence = classifyPatternConfidence(1, 0, crossLayerEdges.length, Math.min(crossLayerEdges.length / 20, 1));
    const severity = crossLayerEdges.length > 10 ? 'CRITICAL' : crossLayerEdges.length > 5 ? 'HIGH' : 'MODERATE';
    const sourceNodes = [...new Set(crossLayerEdges.map(e => e.sourceNodeId))];
    const detection: PatternDetection = {
      patternType: 'LAYER_LEAKAGE', isAntiPattern: true, severity, confidence,
      fingerprint: '', title: 'Layer leakage detected',
      summary: `${crossLayerEdges.length} cross-layer or back-edge violations found across ${sourceNodes.length} source modules`,
      impactedNodes: sourceNodes, impactedClusters: [],
      topologyEvidence: [{ nodeIds: sourceNodes, edgeCount: crossLayerEdges.length, subgraphDensity: 0, description: `${crossLayerEdges.length} layering violations` }],
      sccEvidence: [], metricEvidence: [{ metricType: 'LAYER_VIOLATIONS', metricValue: crossLayerEdges.length, description: `${crossLayerEdges.length} cross-layer violations` }],
      metadata: { violationCount: crossLayerEdges.length, sourceNodeCount: sourceNodes.length },
    };
    detection.fingerprint = fingerprintPattern({ patternType: 'LAYER_LEAKAGE', isAntiPattern: true, severity: detection.severity, title: detection.title, summary: detection.summary, impactedNodes: detection.impactedNodes, metricEvidence: detection.metricEvidence });
    results.push(detection);
  }
  return results;
}

function detectUnstableCore(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  for (const inst of input.instability) {
    if (inst.isVolatileCore || inst.isUnstableInfrastructure) {
      const confidence = classifyPatternConfidence(2, 0, 1, Math.min(inst.instabilityScore * 1.5, 1));
      const severity = inst.instabilityScore >= 0.8 ? 'CRITICAL' : inst.instabilityScore >= 0.6 ? 'HIGH' : 'MODERATE';
      const detection: PatternDetection = {
        patternType: 'UNSTABLE_CORE', isAntiPattern: true, severity, confidence,
        fingerprint: '', title: `Unstable core: ${inst.nodeId}`,
        summary: inst.isVolatileCore ? `Core module is volatile with instability ${inst.instabilityScore.toFixed(3)}` : `Infrastructure module is unstable with score ${inst.instabilityScore.toFixed(3)}`,
        impactedNodes: [inst.nodeId], impactedClusters: [],
        topologyEvidence: [{ nodeIds: [inst.nodeId], edgeCount: 0, subgraphDensity: 0, description: `Instability: ${inst.instabilityScore.toFixed(3)}` }],
        sccEvidence: [], metricEvidence: [{ metricType: 'INSTABILITY', metricValue: inst.instabilityScore, description: `Instability: ${inst.instabilityScore.toFixed(3)}` }],
        metadata: { instabilityScore: inst.instabilityScore, isVolatileCore: inst.isVolatileCore, isUnstableInfrastructure: inst.isUnstableInfrastructure },
      };
      detection.fingerprint = fingerprintPattern({ patternType: 'UNSTABLE_CORE', isAntiPattern: true, severity: detection.severity, title: detection.title, summary: detection.summary, impactedNodes: detection.impactedNodes, metricEvidence: detection.metricEvidence });
      results.push(detection);
    }
  }
  return results;
}

function detectArchitecturalFragmentation(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  const clusters = input.couplingDensity.clusterDensities;
  const lowCohesionClusters = clusters.filter(c => c.density <= 0.05);
  if (lowCohesionClusters.length > 3 && clusters.length > 5) {
    const fragmentationRatio = lowCohesionClusters.length / clusters.length;
    const confidence = classifyPatternConfidence(1, 0, clusters.length, Math.min(input.complexity.fragmentationScore * 1.5, 1));
    const severity = classifyPatternSeverity(clusters.length, input.complexity.fragmentationScore);
    const detection: PatternDetection = {
      patternType: 'ARCHITECTURAL_FRAGMENTATION', isAntiPattern: true, severity, confidence,
      fingerprint: '', title: 'Architectural fragmentation detected',
      summary: `${lowCohesionClusters.length}/${clusters.length} clusters have low cohesion (≤ 0.05), fragmentation score ${input.complexity.fragmentationScore.toFixed(3)}`,
      impactedNodes: input.nodes.map(n => n.id), impactedClusters: lowCohesionClusters.map(c => c.clusterName),
      topologyEvidence: [{ nodeIds: [], edgeCount: 0, subgraphDensity: 0, description: `Fragmentation ratio: ${fragmentationRatio.toFixed(3)}` }],
      sccEvidence: [], metricEvidence: [
        { metricType: 'FRAGMENTATION_SCORE', metricValue: input.complexity.fragmentationScore, description: `Fragmentation: ${input.complexity.fragmentationScore.toFixed(3)}` },
        { metricType: 'LOW_COHESION_CLUSTERS', metricValue: lowCohesionClusters.length, description: `${lowCohesionClusters.length} low-cohesion clusters` },
      ],
      metadata: { totalClusters: clusters.length, lowCohesionCount: lowCohesionClusters.length, fragmentationRatio, fragmentationScore: input.complexity.fragmentationScore },
    };
    detection.fingerprint = fingerprintPattern({ patternType: 'ARCHITECTURAL_FRAGMENTATION', isAntiPattern: true, severity: detection.severity, title: detection.title, summary: detection.summary, impactedNodes: detection.impactedNodes, metricEvidence: detection.metricEvidence });
    results.push(detection);
  }
  return results;
}
