import type { CognitionIndex, IndexBuildInput, IndexType } from './indexing-types.ts';
import { normalizeBuildInput } from './index-normalizer.ts';
import { buildNodeIndex, buildEdgeIndex, buildSccIndex, buildNamespaceIndex, buildSubsystemIndex } from './graph-index.ts';
import { buildHotspotIndex } from './hotspot-index.ts';
import { buildRiskIndex } from './risk-index.ts';
import { buildPatternIndex } from './pattern-index.ts';
import { buildRecommendationIndex } from './recommendation-index.ts';
import { buildCognitionIndex } from './cognition-index.ts';
import { buildNarrativeIndex } from './narrative-index.ts';
import { buildTrendIndex } from './trend-index.ts';

export class IndexBuilder {
  buildAll(input: IndexBuildInput): Map<IndexType, CognitionIndex> {
    const normalized = normalizeBuildInput(input);
    const indexes = new Map<IndexType, CognitionIndex>();

    indexes.set('NODE_INDEX', buildNodeIndex(normalized));
    indexes.set('EDGE_INDEX', buildEdgeIndex(normalized));
    indexes.set('SCC_INDEX', buildSccIndex(normalized));
    indexes.set('NAMESPACE_INDEX', buildNamespaceIndex(normalized));
    indexes.set('SUBSYSTEM_INDEX', buildSubsystemIndex(normalized));
    indexes.set('HOTSPOT_INDEX', buildHotspotIndex(normalized));
    indexes.set('RISK_INDEX', buildRiskIndex(normalized));
    indexes.set('PATTERN_INDEX', buildPatternIndex(normalized));
    indexes.set('RECOMMENDATION_INDEX', buildRecommendationIndex(normalized));
    indexes.set('COGNITION_INDEX', buildCognitionIndex(normalized));
    indexes.set('NARRATIVE_INDEX', buildNarrativeIndex(normalized));
    indexes.set('TREND_INDEX', buildTrendIndex(normalized));

    return indexes;
  }

  buildSingle(input: IndexBuildInput, indexType: IndexType): CognitionIndex {
    const normalized = normalizeBuildInput(input);
    switch (indexType) {
      case 'NODE_INDEX': return buildNodeIndex(normalized);
      case 'EDGE_INDEX': return buildEdgeIndex(normalized);
      case 'SCC_INDEX': return buildSccIndex(normalized);
      case 'NAMESPACE_INDEX': return buildNamespaceIndex(normalized);
      case 'SUBSYSTEM_INDEX': return buildSubsystemIndex(normalized);
      case 'HOTSPOT_INDEX': return buildHotspotIndex(normalized);
      case 'RISK_INDEX': return buildRiskIndex(normalized);
      case 'PATTERN_INDEX': return buildPatternIndex(normalized);
      case 'RECOMMENDATION_INDEX': return buildRecommendationIndex(normalized);
      case 'COGNITION_INDEX': return buildCognitionIndex(normalized);
      case 'NARRATIVE_INDEX': return buildNarrativeIndex(normalized);
      case 'TREND_INDEX': return buildTrendIndex(normalized);
      default: throw new Error(`Unknown index type: ${indexType}`);
    }
  }
}
