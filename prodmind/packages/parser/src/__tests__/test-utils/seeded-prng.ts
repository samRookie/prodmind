function splitMix32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    s = Math.imul(s ^ (s >>> 16), 0x85ebca6b) >>> 0;
    s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35) >>> 0;
    s = (s ^ (s >>> 16)) >>> 0;
    return s / 4294967296;
  };
}

export class SeededRng {
  private readonly state: Uint32Array;

  constructor(seed: number) {
    this.state = new Uint32Array(4);
    const sm = splitMix32(seed);
    for (let i = 0; i < 4; i++) {
      this.state[i] = (sm() * 4294967296) >>> 0;
    }
  }

  private rotl(x: number, k: number): number {
    return ((x << k) | (x >>> (32 - k))) >>> 0;
  }

  next(): number {
    const result = Math.imul(this.rotl(Math.imul(this.state[1]!, 5) >>> 0, 7), 9) >>> 0;
    const t = (this.state[1]! << 9) >>> 0;
    this.state[2] = (this.state[2]! ^ this.state[0]!) >>> 0;
    this.state[3] = (this.state[3]! ^ this.state[1]!) >>> 0;
    this.state[1] = (this.state[1]! ^ this.state[2]!) >>> 0;
    this.state[0] = (this.state[0]! ^ this.state[3]!) >>> 0;
    this.state[2] = (this.state[2]! ^ t) >>> 0;
    this.state[3] = this.rotl(this.state[3]!, 11);
    return result / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  pick<T>(array: readonly T[]): T {
    return array[this.nextInt(0, array.length - 1)]!;
  }

  shuffle<T>(array: readonly T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const tmp = result[i]!;
      result[i] = result[j]!;
      result[j] = tmp;
    }
    return result;
  }
}

export function createSeededRng(seed: number): SeededRng {
  return new SeededRng(seed);
}
