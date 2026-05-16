import ts from 'typescript';
import type { ImportMetadata, ExportMetadata, SymbolMetadata, SourceLocation } from '../types/ast.types.ts';
import { SymbolType } from '../types/ast.types.ts';

export function getNodeLocation(node: ts.Node, sourceFile: ts.SourceFile): SourceLocation {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  return {
    startLine: start.line + 1,
    startCol: start.character + 1,
    endLine: end.line + 1,
    endCol: end.character + 1,
  };
}

export function extractImports(sourceFile: ts.SourceFile): ImportMetadata[] {
  const imports: ImportMetadata[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isImportDeclaration(node)) return;

    const moduleSpecifier = node.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) return;

    const source = moduleSpecifier.text;
    const location = getNodeLocation(node, sourceFile);

    if (node.importClause) {
      const clause = node.importClause;

      if (clause.name) {
        imports.push({
          source,
          specifiers: [clause.name.text],
          isDefault: true,
          isNamespace: false,
          location,
        });
      }

      if (clause.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings)) {
          imports.push({
            source,
            specifiers: [clause.namedBindings.name.text],
            isDefault: false,
            isNamespace: true,
            location,
          });
        } else if (ts.isNamedImports(clause.namedBindings)) {
          const specifiers = clause.namedBindings.elements.map((el) => el.name.text);
          imports.push({
            source,
            specifiers,
            isDefault: false,
            isNamespace: false,
            location,
          });
        }
      }
    } else {
      imports.push({
        source,
        specifiers: [],
        isDefault: false,
        isNamespace: false,
        location,
      });
    }
  });

  return imports;
}

export function extractExports(sourceFile: ts.SourceFile): ExportMetadata[] {
  const exports: ExportMetadata[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isExportAssignment(node)) {
      const location = getNodeLocation(node, sourceFile);
      exports.push({
        name: '(default)',
        symbolType: SymbolType.VARIABLE,
        isDefault: true,
        isNamed: false,
        location,
      });
      return;
    }

    if (ts.isExportDeclaration(node)) {
      const location = getNodeLocation(node, sourceFile);

      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const el of node.exportClause.elements) {
          exports.push({
            name: el.name.text,
            symbolType: SymbolType.VARIABLE,
            isDefault: false,
            isNamed: true,
            location: getNodeLocation(el, sourceFile),
          });
        }
      }

      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        exports.push({
          name: `* from "${node.moduleSpecifier.text}"`,
          symbolType: SymbolType.MODULE,
          isDefault: false,
          isNamed: false,
          location,
        });
      }
    }

    if (ts.isVariableStatement(node) && hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
      for (const decl of node.declarationList.declarations) {
        if (decl.name && ts.isIdentifier(decl.name)) {
          exports.push({
            name: decl.name.text,
            symbolType: SymbolType.VARIABLE,
            isDefault: false,
            isNamed: true,
            location: getNodeLocation(decl, sourceFile),
          });
        }
      }
    }

    if (
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isEnumDeclaration(node) ||
      (ts.isTypeAliasDeclaration(node))
    ) {
      if (hasModifier(node, ts.SyntaxKind.ExportKeyword) && node.name) {
        exports.push({
          name: node.name.text,
          symbolType: nodeTypeToSymbolType(node),
          isDefault: false,
          isNamed: true,
          location: getNodeLocation(node, sourceFile),
        });
      }
    }
  });

  return exports;
}

export function extractSymbols(sourceFile: ts.SourceFile): SymbolMetadata[] {
  const symbols: SymbolMetadata[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      symbols.push(makeSymbol(node, node.name.text, SymbolType.FUNCTION, sourceFile));
      return;
    }

    if (ts.isClassDeclaration(node) && node.name) {
      symbols.push(makeSymbol(node, node.name.text, SymbolType.CLASS, sourceFile));
      return;
    }

    if (ts.isInterfaceDeclaration(node) && node.name) {
      symbols.push(makeSymbol(node, node.name.text, SymbolType.INTERFACE, sourceFile));
      return;
    }

    if (ts.isEnumDeclaration(node) && node.name) {
      symbols.push(makeSymbol(node, node.name.text, SymbolType.ENUM, sourceFile));
      return;
    }

    if (ts.isTypeAliasDeclaration(node) && node.name) {
      symbols.push(makeSymbol(node, node.name.text, SymbolType.TYPE_ALIAS, sourceFile));
      return;
    }

    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (decl.name && ts.isIdentifier(decl.name)) {
          const init = decl.initializer;
          const isFunction =
            init &&
            (ts.isArrowFunction(init) || ts.isFunctionExpression(init));

          symbols.push(makeSymbol(decl, decl.name.text, isFunction ? SymbolType.FUNCTION : SymbolType.VARIABLE, sourceFile));
        }
      }
    }
  });

  return symbols;
}

function makeSymbol(
  node: ts.Node,
  name: string,
  symbolType: SymbolType,
  sourceFile: ts.SourceFile,
): SymbolMetadata {
  const exported = hasModifier(node, ts.SyntaxKind.ExportKeyword) ||
    hasModifier(node, ts.SyntaxKind.DefaultKeyword);

  const isAsync = hasModifier(node, ts.SyntaxKind.AsyncKeyword) ||
    isAsyncInitializer(node);

  const location = getNodeLocation(node, sourceFile);
  const dependencies = extractDependencyNames(node);

  return {
    name,
    symbolType,
    exported,
    isAsync,
    location,
    dependencies,
  };
}

function isAsyncInitializer(node: ts.Node): boolean {
  if (!ts.isVariableDeclaration(node)) return false;
  const init = node.initializer;
  if (!init) return false;
  const mods = (init as { modifiers?: ts.Modifier[] }).modifiers;
  if (!mods) return false;
  return mods.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
}

function extractDependencyNames(node: ts.Node): string[] {
  const names = new Set<string>();

  function walk(n: ts.Node) {
    if (ts.isIdentifier(n) && n.text !== undefined) {
      const parent = n.parent;
      if (
        parent &&
        !ts.isImportDeclaration(parent) &&
        !ts.isExportDeclaration(parent) &&
        !isTypeNodeContext(n)
      ) {
        names.add(n.text);
      }
    }
    ts.forEachChild(n, walk);
  }

  walk(node);
  return Array.from(names).sort();
}

function isTypeNodeContext(_node: ts.Node): boolean {
  return false;
}

function hasModifier(node: ts.Node, modifier: ts.SyntaxKind): boolean {
  const mods = (node as { modifiers?: ts.Modifier[] }).modifiers;
  if (!mods) return false;
  return mods.some((m) => m.kind === modifier);
}

function nodeTypeToSymbolType(node: ts.Node): SymbolType {
  if (ts.isFunctionDeclaration(node)) return SymbolType.FUNCTION;
  if (ts.isClassDeclaration(node)) return SymbolType.CLASS;
  if (ts.isInterfaceDeclaration(node)) return SymbolType.INTERFACE;
  if (ts.isEnumDeclaration(node)) return SymbolType.ENUM;
  if (ts.isTypeAliasDeclaration(node)) return SymbolType.TYPE_ALIAS;
  return SymbolType.VARIABLE;
}
