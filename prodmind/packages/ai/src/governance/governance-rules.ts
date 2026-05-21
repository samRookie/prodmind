import type { PromptDefinition } from '../prompts/registry/prompt-registry.ts';
import { PromptRegistry } from '../prompts/registry/prompt-registry.ts';
import { ImmutablePromptError } from './governance-errors.ts';

export interface GovernanceConfig {
  strictMode: boolean;
  allowDraftExecution: boolean;
}

export const DEFAULT_GOVERNANCE_CONFIG: GovernanceConfig = {
  strictMode: true,
  allowDraftExecution: true,
};

export interface GovernanceValidation {
  valid: boolean;
  prompt: PromptDefinition;
  warnings: string[];
  errors: string[];
}

export class GovernanceLayer {
  private readonly registry: PromptRegistry;
  private readonly config: GovernanceConfig;

  public constructor(registry: PromptRegistry, config?: Partial<GovernanceConfig>) {
    this.registry = registry;
    this.config = { ...DEFAULT_GOVERNANCE_CONFIG, ...config };
  }

  public async enforceImmutability(promptId: string, version?: number): Promise<void> {
    const prompt = version
      ? await this.registry.get(promptId, version)
      : await this.registry.getLatest(promptId);

    if (!prompt) {
      return;
    }

    if (prompt.status === 'published') {
      throw new ImmutablePromptError(promptId, prompt.version);
    }
  }

  public async getLatestVersion(promptId: string): Promise<PromptDefinition> {
    const prompt = await this.registry.getLatest(promptId);
    if (!prompt) {
      throw new Error(`Prompt ${promptId} not found`);
    }
    return prompt;
  }

  public async getCompatibleVersions(
    promptId: string,
    _provider: string,
    _model: string,
  ): Promise<PromptDefinition[]> {
    const all = await this.registry.list();
    return all.filter((p) => p.promptId === promptId && p.status !== 'deprecated');
  }

  public async validateExecutionPath(
    promptId: string,
    version?: number,
  ): Promise<GovernanceValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const prompt = version
      ? await this.registry.get(promptId, version)
      : await this.registry.getLatest(promptId);

    if (!prompt) {
      errors.push(`Prompt ${promptId}${version ? ` v${version}` : ''} not found`);
      return { valid: false, prompt: null as unknown as PromptDefinition, warnings, errors };
    }

    if (prompt.status === 'deprecated') {
      if (this.config.strictMode) {
        errors.push(`Deprecated prompt ${promptId} v${prompt.version} cannot be used in strict mode`);
      } else {
        warnings.push(`Using deprecated prompt ${promptId} v${prompt.version}`);
      }
    }

    if (prompt.status === 'draft' && !this.config.allowDraftExecution) {
      errors.push(`Draft prompt ${promptId} v${prompt.version} cannot be executed`);
    }

    return {
      valid: errors.length === 0,
      prompt,
      warnings,
      errors,
    };
  }
}
