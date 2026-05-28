import { describe, it, expect } from 'vitest';
import { getRemediationTemplate, getAllTemplates, selectTemplatesForCategory } from '../../recommendations/remediation-library.ts';

describe('remediation-library', () => {
  it('returns all 10 templates', () => {
    const templates = getAllTemplates();
    expect(templates).toHaveLength(10);
  });

  it('finds template by id', () => {
    const template = getRemediationTemplate('BREAK_CYCLIC');
    expect(template).toBeDefined();
    expect(template!.id).toBe('BREAK_CYCLIC');
    expect(template!.strategy).toBe('break-cyclic-dependency');
  });

  it('returns undefined for unknown id', () => {
    expect(getRemediationTemplate('NONEXISTENT')).toBeUndefined();
  });

  it('selects templates by category', () => {
    const decoupling = selectTemplatesForCategory('DECOUPLING');
    expect(decoupling.length).toBeGreaterThan(0);
    expect(decoupling.every(t => t.category === 'DECOUPLING')).toBe(true);
  });

  it('templates are immutable references', () => {
    const templates = getAllTemplates();
    const first = templates[0]!;
    expect(first.id).toBeTruthy();
    expect(first.strategy).toBeTruthy();
    expect(first.description).toBeTruthy();
    expect(first.category).toBeTruthy();
    expect(first.parameters).toBeTruthy();
    expect(first.expectedImpact).toBeTruthy();
  });
});
