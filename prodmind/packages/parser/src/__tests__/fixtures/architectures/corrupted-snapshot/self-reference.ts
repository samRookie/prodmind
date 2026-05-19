import { selfReference } from './self-reference';

export function selfReference(): string {
  return selfReference() + ' (recursive)';
}
