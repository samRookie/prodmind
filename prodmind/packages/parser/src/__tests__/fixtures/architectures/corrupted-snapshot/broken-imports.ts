import { nonExistentFunction } from './nonexistent-module';
import { missingSymbol } from '../does-not-exist/missing';

export function useBrokenImports(): void {
  nonExistentFunction();
  missingSymbol();
}
