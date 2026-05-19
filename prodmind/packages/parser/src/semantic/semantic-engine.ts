import type { SemanticInput, SemanticOutput, ClassificationResult, InfraBusinessResult, DomainClusterResult, CouplingEdgeResult } from './types.ts';
import { classifyNodeSemanticType } from './classifier.ts';
import { detectInfrastructureLayer } from './infra-detector.ts';
import { clusterDomainRegions } from './domain-clustering.ts';
import { analyzeDirectEdges, type CouplingAnalysisInput } from './coupling-analysis.ts';

export class SemanticEngine {
  public analyze(input: SemanticInput): SemanticOutput {
    const parseMap = new Map<string, import('../types/ast.types.ts').ParsedFile>();
    for (const result of input.parseResults) {
      if (result.success) {
        parseMap.set(result.data.path, result.data);
      }
    }

    const fileNodeMap = new Map<string, string>();
    for (const node of input.nodes) {
      if (node.nodeType === 'FILE' && !fileNodeMap.has(node.filePath)) {
        fileNodeMap.set(node.filePath, node.id);
      }
    }

    const classifications: ClassificationResult[] = [];
    const infraBusinessResults: InfraBusinessResult[] = [];

    const sortedNodes = [...input.nodes].sort((a, b) => a.filePath.localeCompare(b.filePath));

    for (const node of sortedNodes) {
      const parsed = parseMap.get(node.filePath);
      const classification = classifyNodeSemanticType(node.id, node.filePath, parsed);
      classifications.push(classification);

      const infraResult = detectInfrastructureLayer(node.id, node.filePath, parsed);
      infraBusinessResults.push(infraResult);
    }

    const clusterNodes = input.nodes.map((n) => ({ id: n.id, filePath: n.filePath }));
    const clusterEdges = input.edges.map((e) => ({ id: e.id, sourceNodeId: e.sourceNodeId, targetNodeId: e.targetNodeId }));
    const domainClusters: DomainClusterResult[] = clusterDomainRegions(
      input.snapshotId,
      clusterNodes,
      clusterEdges,
    );

    const couplingInput: CouplingAnalysisInput = {
      nodes: input.nodes.map((n) => ({ id: n.id, filePath: n.filePath, nodeType: n.nodeType })),
      edges: input.edges.map((e) => ({ id: e.id, sourceNodeId: e.sourceNodeId, targetNodeId: e.targetNodeId, edgeType: e.edgeType, weight: e.weight })),
      snapshotId: input.snapshotId,
    };
    const couplingEdges: CouplingEdgeResult[] = analyzeDirectEdges(couplingInput);

    return {
      snapshotId: input.snapshotId,
      classifications,
      infraBusinessResults,
      domainClusters,
      couplingEdges,
      generatedAt: new Date().toISOString(),
    };
  }
}
