import { SemanticType, RuleStrength } from '@prodmind/contracts';

export interface ClassificationRule {
  name: string;
  type: SemanticType;
  strength: RuleStrength;
  priority: number;
  matcher: (filePath: string) => boolean;
}

const PATH_RULES: ClassificationRule[] = [
  { name: 'api-routes', type: SemanticType.API_LAYER, strength: RuleStrength.HIGH, priority: 10, matcher: (p) => /\/routes?\//.test(p) || /\broutes?\//.test(p) || /\bapi\b/.test(p) },
  { name: 'controllers', type: SemanticType.API_LAYER, strength: RuleStrength.HIGH, priority: 20, matcher: (p) => /\/controllers?\//.test(p) || /\.controller\./.test(p) },
  { name: 'service-layer', type: SemanticType.SERVICE_LAYER, strength: RuleStrength.HIGH, priority: 30, matcher: (p) => /\/services?\//.test(p) || /\.service\./.test(p) },
  { name: 'data-layer', type: SemanticType.DATA_LAYER, strength: RuleStrength.HIGH, priority: 40, matcher: (p) => /\/repositories?\//.test(p) || /\/daos?\//.test(p) || /\/databases?\//.test(p) || /\/models?\//.test(p) },
  { name: 'domain-layer', type: SemanticType.DOMAIN_LAYER, strength: RuleStrength.HIGH, priority: 50, matcher: (p) => /\/domain\//.test(p) || /\/entities?\//.test(p) || /\/aggregates?\//.test(p) },
  { name: 'infrastructure', type: SemanticType.INFRASTRUCTURE, strength: RuleStrength.HIGH, priority: 60, matcher: (p) => /\/infrastructure\//.test(p) || /\/adapters?\//.test(p) || /\/providers?\//.test(p) },
  { name: 'ui-components', type: SemanticType.UI_LAYER, strength: RuleStrength.HIGH, priority: 70, matcher: (p) => /\/components?\//.test(p) || /\/pages?\//.test(p) || /\/views?\//.test(p) || /\/ui\//.test(p) || /\.(tsx|jsx)$/.test(p) },
  { name: 'shared-utility', type: SemanticType.SHARED_UTILITY, strength: RuleStrength.MEDIUM, priority: 80, matcher: (p) => /\/utils?\//.test(p) || /\/helpers?\//.test(p) || /\/lib\//.test(p) || /\/shared\//.test(p) },
  { name: 'configuration', type: SemanticType.CONFIGURATION, strength: RuleStrength.HIGH, priority: 90, matcher: (p) => /\/config\//.test(p) || /\.config\./.test(p) || /\.env\./.test(p) },
  { name: 'testing', type: SemanticType.TESTING, strength: RuleStrength.HIGH, priority: 100, matcher: (p) => /\.(test|spec|e2e|integration)\./.test(p) || /\/__tests__\//.test(p) || /\/__mocks__\//.test(p) || /\/fixtures?\//.test(p) },
  { name: 'build-system', type: SemanticType.BUILD_SYSTEM, strength: RuleStrength.MEDIUM, priority: 110, matcher: (p) => /\/(build|dist|scripts?)\//.test(p) || /\.dockerfile/.test(p) || /\bDockerfile\b/.test(p) },
  { name: 'middleware', type: SemanticType.INFRASTRUCTURE, strength: RuleStrength.HIGH, priority: 120, matcher: (p) => /\/middleware\//.test(p) || /\.middleware\./.test(p) },
  { name: 'security', type: SemanticType.SECURITY, strength: RuleStrength.MEDIUM, priority: 130, matcher: (p) => /\/auth\//.test(p) || /\/guards?\//.test(p) || /\/security\//.test(p) },
  { name: 'observability', type: SemanticType.OBSERVABILITY, strength: RuleStrength.MEDIUM, priority: 140, matcher: (p) => /\/logging\//.test(p) || /\/monitoring\//.test(p) || /\/telemetry\//.test(p) || /\/tracing\//.test(p) },
  { name: 'migrations', type: SemanticType.DATA_LAYER, strength: RuleStrength.MEDIUM, priority: 150, matcher: (p) => /\/migrations?\//.test(p) },
  { name: 'graphql', type: SemanticType.API_LAYER, strength: RuleStrength.MEDIUM, priority: 160, matcher: (p) => /\/graphql\//.test(p) || /\/resolvers?\//.test(p) || /\/schemas?\//.test(p) },
];

export const FRAMEWORK_IMPORT_MAP: Record<string, SemanticType> = {
  express: SemanticType.API_LAYER,
  'express-session': SemanticType.API_LAYER,
  hono: SemanticType.API_LAYER,
  '@nestjs/core': SemanticType.API_LAYER,
  '@nestjs/common': SemanticType.API_LAYER,
  fastify: SemanticType.API_LAYER,
  koa: SemanticType.API_LAYER,
  react: SemanticType.UI_LAYER,
  'react-dom': SemanticType.UI_LAYER,
  vue: SemanticType.UI_LAYER,
  'next/router': SemanticType.UI_LAYER,
  '@angular/core': SemanticType.UI_LAYER,
  typeorm: SemanticType.DATA_LAYER,
  'typeorm/browser': SemanticType.DATA_LAYER,
  '@prisma/client': SemanticType.DATA_LAYER,
  prisma: SemanticType.DATA_LAYER,
  sequelize: SemanticType.DATA_LAYER,
  mongoose: SemanticType.DATA_LAYER,
  knex: SemanticType.DATA_LAYER,
  'drizzle-orm': SemanticType.DATA_LAYER,
  winston: SemanticType.OBSERVABILITY,
  pino: SemanticType.OBSERVABILITY,
  log4js: SemanticType.OBSERVABILITY,
  '@sentry/node': SemanticType.OBSERVABILITY,
  'opentelemetry/api': SemanticType.OBSERVABILITY,
  jest: SemanticType.TESTING,
  vitest: SemanticType.TESTING,
  mocha: SemanticType.TESTING,
  cypress: SemanticType.TESTING,
  playwright: SemanticType.TESTING,
  jsonwebtoken: SemanticType.SECURITY,
  bcrypt: SemanticType.SECURITY,
  passport: SemanticType.SECURITY,
  helmet: SemanticType.SECURITY,
};

export function getClassificationRules(): ClassificationRule[] {
  return PATH_RULES;
}

export function getFrameworkImportType(importName: string): SemanticType | null {
  if (!importName) return null;
  const exact = FRAMEWORK_IMPORT_MAP[importName];
  if (exact) return exact;
  for (const [prefix, type] of Object.entries(FRAMEWORK_IMPORT_MAP)) {
    if (importName.startsWith(prefix + '/') || importName.startsWith(prefix + '-')) {
      return type;
    }
  }
  return null;
}

export function isInfrastructurePath(filePath: string): boolean {
  const infraPatterns = [
    '/config/', '/middleware/', '/adapters?/', '/providers?/', '/infrastructure/',
    '/db/', '/databases?/', '/migrations?/', '/logger/', '/logging/',
    '/queue/', '/workers?/', '/transport/', '/gateways?/',
  ];
  for (const p of infraPatterns) {
    const regex = new RegExp(p.replace('?', '?'));
    if (regex.test(filePath)) return true;
  }
  return false;
}

export function isBusinessPath(filePath: string): boolean {
  const businessPatterns = [
    '/domain/', '/services?/', '/orchestrators?/', '/use-cases?/',
    '/business/', '/workflows?/', '/state-machines?/',
    '/entities?/', '/aggregates?/', '/value-objects?/',
    '/validators?/', '/rules?/', '/policies?/',
  ];
  for (const p of businessPatterns) {
    const regex = new RegExp(p.replace('?', '?'));
    if (regex.test(filePath)) return true;
  }
  return false;
}
