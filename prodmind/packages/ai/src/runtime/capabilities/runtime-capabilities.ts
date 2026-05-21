export interface CapabilityDescriptor {
  readonly name: string;
  readonly version: string;
  readonly enabled: boolean;
  readonly dependencies: readonly string[];
}

export interface CapabilityRegistry {
  readonly list: readonly CapabilityDescriptor[];
  has(name: string): boolean;
  get(name: string): CapabilityDescriptor | undefined;
  isEnabled(name: string): boolean;
  checkDependencies(name: string): string[];
}

export class RuntimeCapabilityRegistry implements CapabilityRegistry {
  private readonly capabilities: Map<string, CapabilityDescriptor> = new Map();

  constructor(capabilities?: CapabilityDescriptor[]) {
    if (capabilities) {
      for (const cap of capabilities) {
        this.register(cap);
      }
    }
  }

  get list(): readonly CapabilityDescriptor[] {
    return Object.freeze(Array.from(this.capabilities.values()));
  }

  register(descriptor: CapabilityDescriptor): void {
    this.capabilities.set(descriptor.name, Object.freeze({
      name: descriptor.name,
      version: descriptor.version,
      enabled: descriptor.enabled,
      dependencies: Object.freeze([...descriptor.dependencies]),
    }));
  }

  has(name: string): boolean {
    return this.capabilities.has(name);
  }

  get(name: string): CapabilityDescriptor | undefined {
    return this.capabilities.get(name);
  }

  isEnabled(name: string): boolean {
    const cap = this.capabilities.get(name);
    return cap !== undefined && cap.enabled;
  }

  checkDependencies(name: string): string[] {
    const cap = this.capabilities.get(name);
    if (!cap) return ['unknown capability'];
    return cap.dependencies
      .filter(dep => !this.isEnabled(dep))
      .map(dep => `missing dependency: ${dep}`);
  }

  disable(name: string): void {
    const cap = this.capabilities.get(name);
    if (cap) {
      this.capabilities.set(name, { ...cap, enabled: false });
    }
  }

  enable(name: string): void {
    const cap = this.capabilities.get(name);
    if (cap) {
      this.capabilities.set(name, { ...cap, enabled: true });
    }
  }
}
