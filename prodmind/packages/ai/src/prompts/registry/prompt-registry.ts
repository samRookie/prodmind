import { generateId, now } from '@prodmind/db';

import { PromptType } from '../contracts/prompt-contracts.ts';
import { PromptFingerprinter } from '../fingerprinting/prompt-fingerprinter.ts';
import { ImmutablePromptError, PromptNotFoundError } from './registry-errors.ts';

export type PromptStatus = 'draft' | 'published' | 'deprecated';

export interface PromptDefinition {
  id: string;
  promptId: string;
  version: number;
  promptType: PromptType;
  template: string;
  checksum: string;
  status: PromptStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterPromptInput {
  promptId: string;
  promptType: PromptType;
  template: string;
  metadata?: Record<string, unknown>;
}

export class PromptRegistry {
  private readonly fingerprinter = new PromptFingerprinter();
  private readonly prompts = new Map<string, PromptDefinition>();

  public async register(input: RegisterPromptInput): Promise<PromptDefinition> {
    const existing = await this.getLatest(input.promptId);
    const nextVersion = existing ? existing.version + 1 : 1;

    const checksum = await this.fingerprinter.templateFingerprint(input.template, input.promptType);

    const definition: PromptDefinition = {
      id: generateId(),
      promptId: input.promptId,
      version: nextVersion,
      promptType: input.promptType,
      template: input.template,
      checksum,
      status: 'draft',
      metadata: input.metadata ?? {},
      createdAt: now(),
      updatedAt: now(),
    };

    this.prompts.set(definition.id, definition);
    return Object.freeze(definition);
  }

  public get(promptId: string, version?: number): Promise<PromptDefinition | null> {
    const allVersions = [...this.prompts.values()]
      .filter((p) => p.promptId === promptId)
      .sort((a, b) => b.version - a.version);

    if (allVersions.length === 0) return Promise.resolve(null);

    if (version) {
      return Promise.resolve(allVersions.find((p) => p.version === version) ?? null);
    }

    return Promise.resolve(allVersions[0]!);
  }

  public async getLatest(promptId: string): Promise<PromptDefinition | null> {
    return this.get(promptId);
  }

  public async publish(promptId: string, version?: number): Promise<PromptDefinition> {
    const prompt = await this.get(promptId, version);
    if (!prompt) {
      throw new PromptNotFoundError(promptId, version);
    }

    if (prompt.status === 'published') {
      return prompt;
    }

    const updated = { ...prompt, status: 'published' as const, updatedAt: now() };
    this.prompts.set(prompt.id, Object.freeze(updated));
    return updated;
  }

  public async deprecate(promptId: string, version?: number): Promise<PromptDefinition> {
    const prompt = await this.get(promptId, version);
    if (!prompt) {
      throw new PromptNotFoundError(promptId, version);
    }

    const updated = { ...prompt, status: 'deprecated' as const, updatedAt: now() };
    this.prompts.set(prompt.id, Object.freeze(updated));
    return updated;
  }

  public list(type?: PromptType): Promise<PromptDefinition[]> {
    const all = [...this.prompts.values()];

    if (type) {
      return Promise.resolve(all.filter((p) => p.promptType === type));
    }

    return Promise.resolve(all);
  }

  public async enforceImmutability(promptId: string, version?: number): Promise<void> {
    const prompt = version
      ? await this.get(promptId, version)
      : await this.getLatest(promptId);

    if (!prompt) {
      throw new PromptNotFoundError(promptId, version);
    }

    if (prompt.status === 'published') {
      throw new ImmutablePromptError(promptId, prompt.version);
    }
  }

  public async update(promptId: string, newTemplate: string): Promise<PromptDefinition> {
    await this.enforceImmutability(promptId);

    const existing = await this.getLatest(promptId);
    if (!existing) {
      throw new PromptNotFoundError(promptId);
    }

    return this.register({
      promptId,
      promptType: existing.promptType,
      template: newTemplate,
      metadata: existing.metadata,
    });
  }
}
