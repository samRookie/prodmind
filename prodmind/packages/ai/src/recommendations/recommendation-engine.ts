import { RecommendationGenerator } from './recommendation-generator.ts';
import type { RecommendationInput, RecommendationOutput } from './recommendation-types.ts';
import { rankRecommendations, topRecommendations } from './recommendation-ranking.ts';
import { fingerprintRecommendationBatch } from './recommendation-fingerprint.ts';

export class RecommendationEngine {
  private generator = new RecommendationGenerator();

  generate(input: RecommendationInput): RecommendationOutput {
    return this.generator.generate(input);
  }

  rank(output: RecommendationOutput): RecommendationOutput {
    return { ...output, recommendations: rankRecommendations(output.recommendations) };
  }

  top(output: RecommendationOutput, count: number): RecommendationOutput {
    return { ...output, recommendations: topRecommendations(output.recommendations, count) };
  }

  fingerprint(output: RecommendationOutput): string {
    return fingerprintRecommendationBatch(output.recommendations);
  }
}
