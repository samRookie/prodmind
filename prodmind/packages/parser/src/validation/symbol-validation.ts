import { ValidationSeverity, ValidationCategory } from '@prodmind/contracts';
import type { ValidationContext, ValidationIssue } from './validation-types.ts';

function safeJsonParse(text: string): Record<string, unknown> | null {
  try { return JSON.parse(text); } catch { return null; }
}

function makeIssue(
  code: string, severity: ValidationSeverity, message: string,
  nodeId: string | null = null,
): ValidationIssue {
  return { issueCode: code, severity, category: ValidationCategory.SYMBOL_OWNERSHIP, message, nodeId, edgeId: null, metadataJson: null };
}

export function validateCanonicalOwnership(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const symbolToNodes = new Map<string, string[]>();

  for (const nodeId of ctx.nodeMap.keys()) {
    const node = ctx.nodeMap.get(nodeId);
    if (!node || !node.symbolName) continue;

    const existing = symbolToNodes.get(node.symbolName) ?? [];
    existing.push(nodeId);
    symbolToNodes.set(node.symbolName, existing);
  }

  for (const [symbol, nodeIds] of symbolToNodes) {
    if (nodeIds.length > 1) {
      issues.push(makeIssue('DUPLICATE_SYMBOL_OWNERSHIP', ValidationSeverity.ERROR,
        `Symbol "${symbol}" owned by multiple nodes: ${nodeIds.join(', ')}`, nodeIds[0] ?? null));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateDuplicateSymbolOwnership(ctx: ValidationContext): ValidationIssue[] {
  return validateCanonicalOwnership(ctx);
}

export function validateUnresolvedSymbols(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ownedSymbols = new Set<string>();

  for (const nodeId of ctx.nodeMap.keys()) {
    const node = ctx.nodeMap.get(nodeId);
    if (node?.symbolName) ownedSymbols.add(node.symbolName);
  }

  for (const edge of ctx.edgeMap.values()) {
    if (edge.edgeType === 'SYMBOL_IMPORT') {
      const metadata = edge.metadataJson ? safeJsonParse(edge.metadataJson) : null;
      const importedSymbol = typeof metadata?.symbolName === 'string' ? metadata.symbolName : null;
      if (importedSymbol && !ownedSymbols.has(importedSymbol)) {
        issues.push(makeIssue('UNRESOLVED_SYMBOL', ValidationSeverity.WARNING,
          `Symbol "${importedSymbol}" imported by ${edge.sourceNodeId} but not defined in any node`,
          edge.sourceNodeId));
      }
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateSymbolNamespaceConsistency(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const nodeId of ctx.nodeMap.keys()) {
    const node = ctx.nodeMap.get(nodeId);
    if (!node?.symbolName) continue;

    const normalized = node.filePath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    const namespace = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
    const symbolDir = node.symbolName.includes('/') ? node.symbolName.split('/').slice(0, -1).join('/') : null;

    if (symbolDir && !namespace.endsWith(symbolDir)) {
      issues.push(makeIssue('SYMBOL_NAMESPACE_MISMATCH', ValidationSeverity.INFO,
        `Symbol "${node.symbolName}" in namespace "${namespace}" but path suggests "${symbolDir}"`, nodeId));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateCrossModuleOwnership(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeSymbols = new Map<string, string>();

  for (const nodeId of ctx.nodeMap.keys()) {
    const node = ctx.nodeMap.get(nodeId);
    if (node?.symbolName) nodeSymbols.set(nodeId, node.symbolName);
  }

  for (const edge of ctx.edgeMap.values()) {
    if (edge.edgeType === 'IMPORTS') {
      const sourceSymbol = nodeSymbols.get(edge.sourceNodeId);
      const targetSymbol = nodeSymbols.get(edge.targetNodeId);

      if (sourceSymbol && targetSymbol && sourceSymbol === targetSymbol) {
        issues.push(makeIssue('SAME_SYMBOL_CROSS_MODULE', ValidationSeverity.INFO,
          `Same symbol "${sourceSymbol}" used across modules ${edge.sourceNodeId} and ${edge.targetNodeId}`,
          edge.sourceNodeId));
      }
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateSymbolStructure(ctx: ValidationContext): ValidationIssue[] {
  return [
    ...validateCanonicalOwnership(ctx),
    ...validateUnresolvedSymbols(ctx),
    ...validateSymbolNamespaceConsistency(ctx),
    ...validateCrossModuleOwnership(ctx),
  ];
}
