// === Core ===
export {
  AnalysisSession,
  SessionManager,
  VALID_TRANSITIONS,
  isValidTransition,
  getNextStatuses,
  isTerminalStatus,
  statusToString,
  createSessionContext,
  addTimelineEvent,
  addSnapshot,
  compressContext,
  register,
  unregister,
  getActive,
  getByProject,
  count,
  isRegistered,
  createFromScratch,
  createFromTemplate,
  createFromReplay,
  validateSessionInput,
  SessionInputSchema,
  TemplateSchema,
  ReplayDataSchema,
  createRuntime,
  updateActivity,
  getRuntimeMetrics,
  isExpired,
} from './core/index.ts';
export type {
  AnalysisSessionData,
  SessionFilter,
  SessionContext,
  GraphReference,
  SessionRuntime,
  RuntimeMetrics,
} from './core/index.ts';

// === Timeline ===
export {
  InvestigationTimeline,
  EventStore,
  EventOrdering,
  queryEvents,
  getEventTimeline,
  getHypothesisEvents,
  getSnapshotEvents,
  getInteractionEvents,
  searchEvents,
  compressTimeline,
  decompressTimeline,
  summarizeTimeline,
  getTimelineStats,
} from './timeline/index.ts';
export type {
  TimelineEvent,
  SequencingGap,
  TimelineFilter,
  TimelineStats,
} from './timeline/index.ts';

// === Snapshots ===
export {
  ReasoningSnapshot,
  SnapshotManager,
  SnapshotDiffEngine,
  SnapshotFingerprint,
  SnapshotQueryEngine,
  serializeSnapshot,
  deserializeSnapshot,
  serializeSnapshotChain,
  deserializeSnapshotChain,
} from './snapshots/index.ts';
export type {
  ReasoningSnapshotData,
  SnapshotDiff,
  FieldChange,
  SnapshotChainData,
} from './snapshots/index.ts';

// === Persistence ===
export {
  SessionRepository,
  TimelineRepository,
  SnapshotRepository,
  InteractionRepository,
  MetadataRepository,
} from './persistence/index.ts';

// === Replay ===
export {
  SessionReplay,
  ReplayLinkageEngine,
  ReplayRestorationEngine,
  ReplayValidator,
  ReplayAudit,
} from './replay/index.ts';
export type {
  SessionReplayData,
  ReplayLink,
  RestorableState,
  RestorationDiff,
  ReplayLinkValidation,
  AuditEntry as ReplayModuleAuditEntry,
  AuditAction,
  ReplayHistorySummary,
} from './replay/index.ts';

// === Reasoning ===
export {
  InteractionRecord,
  AIInteractionHistory,
  ReasoningChain,
  ReasoningContext,
  compressInteractions,
  decompressInteractions,
  summarizeInteractions,
  extractKeyDecisions,
  queryInteractions,
  searchInteractions,
  findRelatedInteractions,
  getInteractionsByModel,
} from './reasoning/index.ts';
export type {
  InteractionRecordData,
  ReasoningStep,
  ReasoningContextData,
  InteractionSummaryStats,
  InteractionFilter,
} from './reasoning/index.ts';

// === Restoration ===
export {
  SessionRestorer,
  RestorationValidator,
  RestorationPipeline,
  RestorationReport,
  createRestorationError,
  isRetryableError,
  categorizeError,
  formatRestorationError,
} from './restoration/index.ts';
export type {
  RestorationCandidate,
  RestorationCost,
  RestorationValidationResult,
  PipelineStatus,
  PipelineState,
  RestorationStep,
  RestorationReportData,
  RestorationErrorCode,
  ErrorCategory,
  CategorizedError,
} from './restoration/index.ts';

// === Metadata ===
export {
  GraphReference as MetaGraphReference,
  GraphStateLinker,
  VersionReference,
  SemanticStateReference,
} from './metadata/index.ts';
export type {
  GraphReferenceData,
  ReferenceType,
  GraphStateLink,
  VersionRecord,
  SemanticStateReferenceData,
} from './metadata/index.ts';

// === Lifecycle ===
export {
  LifecycleManager,
  LifecyclePolicy,
  SessionArchiver,
  SessionRetention,
  SessionExpiration,
  LifecycleEventBus,
} from './lifecycle/index.ts';
export type {
  SessionLifecycleData,
  PolicyDecision,
  ArchiveRecord,
  ArchiveStats,
  RetentionConfig,
  SessionExpiryInfo,
  ExpirationCheckResult,
  LifecycleEvent,
  LifecycleEventType,
  LifecycleEventHandler,
} from './lifecycle/index.ts';

// === Query ===
export {
  SessionQueryEngine,
  TimelineQueryEngine,
  SessionSnapshotQueryEngine,
  InvestigationQueryEngine,
  SessionSearchEngine,
} from './query/index.ts';
export type {
  SessionFilter as QuerySessionFilter,
  PaginatedResult,
  SessionStats,
  TimelineEventFilter,
  EventTypeDistribution,
  HeatmapEntry,
  SnapshotFilter,
  SnapshotStats,
  InsightFilter,
  InvestigationSummary,
  SearchResult,
  RankedSearchResult,
} from './query/index.ts';

// === Serialization ===
export {
  DeterministicSerializer,
  serializeTimeline,
  deserializeTimeline,
  serializeTimelineBatch,
  deserializeTimelineBatch,
  exportTimeline,
  SerializeSnapshot,
  DeserializeSnapshot,
  SerializeSnapshotChain,
  DeserializeSnapshotChain,
  exportSnapshot,
  serializeReplayLink,
  deserializeReplayLink,
  serializeReplayBatch,
  deserializeReplayBatch,
  exportReplayAudit,
  CanonicalizationEngine,
} from './serialization/index.ts';
export type {
  TimelineExportFormat,
  SnapshotExportFormat,
  ReplayExportFormat,
} from './serialization/index.ts';

// === Validation ===
export {
  SessionValidator,
  SnapshotValidator,
  TimelineValidator,
  SessionReplayValidator,
  IntegrityValidator,
} from './validation/index.ts';
export type {
  NewSessionInput,
  SessionValidationResult,
  SnapshotValidationResult,
  ChainValidationResult,
  TimelineValidationResult,
  AnomalyReport,
  ReplayValidationResult,
  ReplayIntegrityResult,
  IntegrityReport,
  CrossValidationResult,
} from './validation/index.ts';

// === Telemetry ===
export {
  SessionTelemetry,
  InvestigationMetrics,
  ReplayMetrics,
  RestorationMetrics,
} from './telemetry/index.ts';
export type {
  TelemetryEvent,
  MetricEntry,
  TelemetrySummary,
  HypothesisMetrics,
  InvestigationStats,
  ReplayRecord,
  ReplayStats,
  RestorationRecord,
  RestorationStats,
} from './telemetry/index.ts';

// === Audit ===
export {
  SessionAuditor,
  DeterminismAuditor,
  ReplayAuditor,
  IntegrityAuditor,
  InvestigationAuditor,
} from './audit/index.ts';
export type {
  AuditEntry,
  AuditExportFormat,
  DeterminismReport,
  NonDeterministicEvent,
  ReplayAuditEntry,
  ReplayAuditSummary,
  IntegrityAuditReport,
  InvestigationAuditReport,
} from './audit/index.ts';

// === Errors ===
export {
  SessionError,
  SessionNotFoundError,
  SessionStateError,
  SessionValidationError,
  TimelineError,
  SnapshotError,
  PersistenceError,
  ReplayError,
  RestorationError,
  LifecycleError,
  SerializationError,
  AuditError,
} from './errors/index.ts';

// === Types ===
export type {
  SessionStatus,
  SessionPriority,
  SnapshotType,
  TimelineEventType,
  InteractionType,
  InteractionRole,
  ReplayLinkType,
  ReplayLinkStatus,
  RestorationStatus,
  SessionConfig,
  HypothesisRecord,
  SessionSummary,
  InvestigationInsight,
} from './types/index.ts';

// === Utils ===
export {
  generateSessionId,
  generateTimelineId,
  generateSnapshotId,
  generateCorrelationId,
  generateCausationId,
  nowISO,
  computeHash,
  computeDeterministicHash,
  safeJsonParse,
  parseTags,
  serializeTags,
  paginate,
} from './utils/index.ts';
