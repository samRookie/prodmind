import { foo } from './utils';
import bar from 'lodash';
import * as everything from './exports';

export const x = 1;

function greet(name: string): string {
  return `Hello, ${name}`;
}

export function add(a: number, b: number): number {
  return a + b;
}
