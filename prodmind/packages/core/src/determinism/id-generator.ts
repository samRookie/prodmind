function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const chr = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash);
}

function hashKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const chr = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `stable_${Math.abs(hash).toString(36)}_${key.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

export class DeterministicIdGenerator {
  private _counter: number;
  private _seed: string;

  constructor(seed?: string) {
    this._counter = 0;
    this._seed = seed ?? '';
    if (this._seed) {
      this._counter = hashSeed(this._seed);
    }
  }

  next(prefix?: string): string {
    this._counter++;
    const p = prefix ?? 'id';
    return `${p}_${this._counter}`;
  }

  nextStable(key: string): string {
    if (this._seed) {
      return hashKey(this._seed + ':' + key);
    }
    return hashKey(key);
  }

  setCounter(value: number): void {
    this._counter = value;
  }

  getCounter(): number {
    return this._counter;
  }

  reset(): void {
    this._counter = 0;
    this._seed = '';
  }
}
