import { describe, it, expect } from 'vitest';
import { classifyNodeSemanticType, classifyFileSemanticRole, computeSemanticRuleStrength } from '../../semantic/classifier.ts';
import { SemanticType, RuleStrength } from '@prodmind/contracts';

describe('classifyNodeSemanticType', () => {
  it('classifies src/routes/ files as API_LAYER', () => {
    const result = classifyNodeSemanticType('n1', 'src/routes/users.ts', undefined);
    expect(result.semanticType).toBe(SemanticType.API_LAYER);
    expect(result.ruleStrength).toBe(RuleStrength.HIGH);
    expect(result.classificationReasons.length).toBeGreaterThan(0);
  });

  it('classifies .controller.ts files as API_LAYER', () => {
    const result = classifyNodeSemanticType('n2', 'src/controllers/user.controller.ts', undefined);
    expect(result.semanticType).toBe(SemanticType.API_LAYER);
  });

  it('classifies src/services/ files as SERVICE_LAYER', () => {
    const result = classifyNodeSemanticType('n3', 'src/services/user.service.ts', undefined);
    expect(result.semanticType).toBe(SemanticType.SERVICE_LAYER);
  });

  it('classifies src/data/repositories as DATA_LAYER', () => {
    const result = classifyNodeSemanticType('n4', 'src/data/repositories/user.ts', undefined);
    expect(result.semanticType).toBe(SemanticType.DATA_LAYER);
  });

  it('classifies src/domain/ files as DOMAIN_LAYER', () => {
    const result = classifyNodeSemanticType('n5', 'src/domain/user.ts', undefined);
    expect(result.semanticType).toBe(SemanticType.DOMAIN_LAYER);
  });

  it('classifies src/config/ files as CONFIGURATION', () => {
    const result = classifyNodeSemanticType('n6', 'src/config/settings.ts', undefined);
    expect(result.semanticType).toBe(SemanticType.CONFIGURATION);
  });

  it('classifies .test.ts files as TESTING', () => {
    const result = classifyNodeSemanticType('n7', 'src/__tests__/user.test.ts', undefined);
    expect(result.semanticType).toBe(SemanticType.TESTING);
  });

  it('classifies __tests__/ files as TESTING', () => {
    const result = classifyNodeSemanticType('n8', 'src/__tests__/user.test.ts', undefined);
    expect(result.semanticType).toBe(SemanticType.TESTING);
  });

  it('classifies .tsx files as UI_LAYER', () => {
    const result = classifyNodeSemanticType('n9', 'src/components/Button.tsx', undefined);
    expect(result.semanticType).toBe(SemanticType.UI_LAYER);
  });

  it('classifies src/utils/ as SHARED_UTILITY', () => {
    const result = classifyNodeSemanticType('n10', 'src/utils/format.ts', undefined);
    expect(result.semanticType).toBe(SemanticType.SHARED_UTILITY);
  });

  it('classifies src/middleware/ as INFRASTRUCTURE', () => {
    const result = classifyNodeSemanticType('n11', 'src/middleware/auth.ts', undefined);
    expect(result.semanticType).toBe(SemanticType.INFRASTRUCTURE);
  });

  it('classifies unknown paths as UNKNOWN with LOW strength', () => {
    const result = classifyNodeSemanticType('n12', 'src/weird-folder/random.ts', undefined);
    expect(result.semanticType).toBe(SemanticType.UNKNOWN);
    expect(result.ruleStrength).toBe(RuleStrength.LOW);
  });

  it('returns stable results across multiple runs', () => {
    const first = classifyNodeSemanticType('n1', 'src/routes/users.ts', undefined);
    const second = classifyNodeSemanticType('n1', 'src/routes/users.ts', undefined);
    expect(first.semanticType).toBe(second.semanticType);
    expect(first.ruleStrength).toBe(second.ruleStrength);
    expect(first.classificationReasons).toEqual(second.classificationReasons);
  });
});

describe('classifyFileSemanticRole', () => {
  it('classifies based on file path', () => {
    const result = classifyFileSemanticRole('src/services/user.ts', [], []);
    expect(result.semanticType).toBe(SemanticType.SERVICE_LAYER);
  });

  it('classifies based on framework imports', () => {
    const result = classifyFileSemanticRole('src/random/worker.ts', [{ source: 'express' }], []);
    expect(result.semanticType).toBe(SemanticType.API_LAYER);
  });

  it('returns UNKNOWN for unrecognized files without imports', () => {
    const result = classifyFileSemanticRole('src/generic/thing.ts', [], [{ name: 'run', symbolType: 'FUNCTION' }]);
    expect(result.semanticType).toBe(SemanticType.UNKNOWN);
  });
});

describe('computeSemanticRuleStrength', () => {
  it('returns HIGH for 0.8+ ratio', () => {
    expect(computeSemanticRuleStrength(8, 10)).toBe(RuleStrength.HIGH);
  });

  it('returns MEDIUM for 0.4-0.79 ratio', () => {
    expect(computeSemanticRuleStrength(5, 10)).toBe(RuleStrength.MEDIUM);
  });

  it('returns LOW for < 0.4 ratio', () => {
    expect(computeSemanticRuleStrength(2, 10)).toBe(RuleStrength.LOW);
  });

  it('returns LOW for zero total', () => {
    expect(computeSemanticRuleStrength(0, 0)).toBe(RuleStrength.LOW);
  });
});
