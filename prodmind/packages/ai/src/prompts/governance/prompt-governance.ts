import type { PromptCategory } from '../contracts/prompt-contracts.ts';
import { PromptRegistry } from '../registry/prompt-registry.ts';

export interface GovernanceViolation {
  readonly code: string;
  readonly message: string;
  readonly category?: PromptCategory;
  readonly promptId?: string;
}

export interface GovernanceResult {
  readonly valid: boolean;
  readonly violations: readonly GovernanceViolation[];
}

export interface GovernanceConfig {
  readonly strictMode: boolean;
  readonly allowedCategories: readonly PromptCategory[];
  readonly enforceVersionLock: boolean;
  readonly enforceProviderRestrictions: boolean;
  readonly maxPromptSize: number;
}

const DEFAULT_GOVERNANCE_CONFIG: GovernanceConfig = Object.freeze({
  strictMode: true,
  allowedCategories: Object.freeze([]),
  enforceVersionLock: true,
  enforceProviderRestrictions: false,
  maxPromptSize: 32000,
});

export class PromptGovernance {
  private readonly registry: PromptRegistry;
  private readonly config: GovernanceConfig;

  constructor(registry: PromptRegistry, config?: Partial<GovernanceConfig>) {
    this.registry = registry;
    this.config = Object.freeze({ ...DEFAULT_GOVERNANCE_CONFIG, ...config });
  }

  async validatePromptSelection(
    promptId: string,
    category: PromptCategory,
  ): Promise<GovernanceResult> {
    const violations: GovernanceViolation[] = [];

    const def = await this.registry.getLatest(promptId);
    if (!def) {
      violations.push({
        code: 'PROMPT_NOT_FOUND',
        message: `Prompt ${promptId} not found`,
        promptId,
      });
      return { valid: false, violations: Object.freeze(violations) };
    }

    if (this.config.enforceVersionLock && def.status !== 'published') {
      violations.push({
        code: 'PROMPT_NOT_PUBLISHED',
        message: `Prompt ${promptId} v${def.version} is ${def.status}, not published`,
        promptId,
        category,
      });
    }

    if (this.config.strictMode) {
      if (this.config.allowedCategories.length > 0 && !this.config.allowedCategories.includes(category)) {
        violations.push({
          code: 'CATEGORY_NOT_ALLOWED',
          message: `Category ${category} is not in the allowed categories list`,
          category,
        });
      }

      if (def.template.length > this.config.maxPromptSize) {
        violations.push({
          code: 'PROMPT_TOO_LARGE',
          message: `Prompt template is ${def.template.length} chars, maximum is ${this.config.maxPromptSize}`,
          promptId,
          category,
        });
      }
    }

    return {
      valid: violations.length === 0,
      violations: Object.freeze(violations),
    };
  }

  async enforceImmutability(promptId: string, version?: number): Promise<void> {
    await this.registry.enforceImmutability(promptId, version);
  }

  getConfig(): Readonly<GovernanceConfig> {
    return this.config;
  }
}
