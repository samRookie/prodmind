export type PolicyRuleType =
  | 'provider_allow'
  | 'provider_deny'
  | 'model_allow'
  | 'category_allow'
  | 'mode_allow'
  | 'replay_policy';

export interface PolicyRule {
  id: string;
  type: PolicyRuleType;
  pattern: string;
  enabled: boolean;
}

const DEFAULT_POLICIES: readonly PolicyRule[] = Object.freeze([
  { id: 'allow_all_providers', type: 'provider_allow', pattern: '*', enabled: true },
  { id: 'allow_all_models', type: 'model_allow', pattern: '*', enabled: true },
  { id: 'allow_all_categories', type: 'category_allow', pattern: '*', enabled: true },
  { id: 'allow_all_modes', type: 'mode_allow', pattern: '*', enabled: true },
  { id: 'replay_enabled', type: 'replay_policy', pattern: 'enabled', enabled: true },
]);

export class RuntimePolicyEngine {
  private policies: PolicyRule[];

  constructor(policies?: readonly PolicyRule[]) {
    this.policies = policies ? [...policies] : [...DEFAULT_POLICIES];
  }

  checkProviderAllowed(providerId: string): boolean {
    const denyRule = this.findFirstEnabled('provider_deny', providerId);
    if (denyRule) return false;
    const allowRule = this.findFirstEnabled('provider_allow', providerId);
    return allowRule !== undefined;
  }

  checkModelAllowed(_providerId: string, modelId: string): boolean {
    const allowRule = this.findFirstEnabled('model_allow', modelId);
    return allowRule !== undefined;
  }

  checkPromptCategory(category: string): boolean {
    const allowRule = this.findFirstEnabled('category_allow', category);
    return allowRule !== undefined;
  }

  checkOrchestrationMode(mode: string): boolean {
    const allowRule = this.findFirstEnabled('mode_allow', mode);
    return allowRule !== undefined;
  }

  checkReplayEnabled(): boolean {
    const replayRule = this.policies.find(
      (p) => p.type === 'replay_policy' && p.enabled,
    );
    return replayRule?.pattern === 'enabled';
  }

  getActivePolicies(): readonly PolicyRule[] {
    return Object.freeze([...this.policies]);
  }

  addPolicy(rule: PolicyRule): void {
    this.policies.push({ ...rule });
  }

  removePolicy(policyId: string): boolean {
    const index = this.policies.findIndex((p) => p.id === policyId);
    if (index === -1) return false;
    this.policies.splice(index, 1);
    return true;
  }

  private findFirstEnabled(type: PolicyRuleType, value: string): PolicyRule | undefined {
    const lowerValue = value.toLowerCase();
    return this.policies.find(
      (p) =>
        p.type === type &&
        p.enabled &&
        (p.pattern === '*' || lowerValue.includes(p.pattern.toLowerCase())),
    );
  }
}
