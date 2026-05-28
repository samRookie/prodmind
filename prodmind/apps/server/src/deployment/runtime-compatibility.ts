export interface CompatibilityCheck {
  name: string;
  compatible: boolean;
  requirement: string;
  actual: string;
}

export class RuntimeCompatibility {
  checkNodeVersion(required: string): CompatibilityCheck {
    return { name: 'node-version', compatible: process.version.startsWith(required), requirement: `>=${required}`, actual: process.version };
  }

  checkPlatform(allowed: string[]): CompatibilityCheck {
    return { name: 'platform', compatible: allowed.includes(process.platform), requirement: allowed.join('|'), actual: process.platform };
  }

  checkMemory(minMemoryMB: number): CompatibilityCheck {
    const mem = process.memoryUsage().heapTotal / 1024 / 1024;
    return { name: 'memory', compatible: mem >= minMemoryMB, requirement: `>=${minMemoryMB}MB`, actual: `${Math.round(mem)}MB` };
  }

  checkAll(): CompatibilityCheck[] {
    return [
      this.checkNodeVersion('v18'),
      this.checkPlatform(['win32', 'darwin', 'linux']),
      this.checkMemory(128),
    ];
  }
}
