export interface DeterministicClock {
  now(): number;
}

export type ClockSource = () => number;

function defaultClockSource(): number {
  return Date.now();
}

let _source: ClockSource = defaultClockSource;
let _frozen = false;
let _frozenTime = 0;

export class DeterministicClockImpl implements DeterministicClock {
  now(): number {
    if (_frozen) return _frozenTime;
    return _source();
  }

  setTime(time: number): void {
    _frozenTime = time;
    _source = () => _frozenTime;
    _frozen = false;
  }

  resetToSystemTime(): void {
    _source = defaultClockSource;
    _frozen = false;
    _frozenTime = 0;
  }

  advance(ms: number): void {
    const current = this.now();
    _source = () => current + ms;
    _frozen = false;
    _frozenTime = current + ms;
  }

  isFrozen(): boolean {
    return _frozen;
  }

  freeze(): void {
    _frozenTime = this.now();
    _frozen = true;
  }

  unfreeze(): void {
    _frozen = false;
  }
}

export const DeterministicClock = Object.freeze(new DeterministicClockImpl()) as DeterministicClock & {
  setTime(time: number): void;
  resetToSystemTime(): void;
  advance(ms: number): void;
  isFrozen(): boolean;
  freeze(): void;
  unfreeze(): void;
};
