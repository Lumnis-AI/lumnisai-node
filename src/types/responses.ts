// Response API types
import type { Message, UUID } from './common'
import type {
  IntelligenceCreditLedger,
  IntelligenceReportEnvelope,
  IntelligenceReportSummary,
  PersonEvidenceRichness,
} from './company-intelligence'
import type {
  AgentCostStats,
  DiscoveryTrace,
  PostEngagementData,
  PostEngagementType,
  ResolvedCompetitorTarget,
} from './competitor-post-engagement'
import type { RepEngagementStats } from './competitor-rep-engagement'
import type {
  ContentIntelligenceAudienceStats,
  ContentIntelligenceCompetitorCoverage,
  ContentIntelligenceCompetitorPackage,
  ContentIntelligenceCoverage,
  ContentIntelligenceOutputName,
  ContentIntelligenceOutputs,
  ContentIntelligencePackage,
  ContentIntelligenceSummary,
} from './content-intelligence'
import type {
  EngagementExpansionStats,
  EngagementHistoryEntry,
} from './engagement-expansion'
import type {
  InfluencerEngagementSeedCoverage,
  InfluencerEngagementSeedPost,
} from './influencer-engagement'
import type { PersonResult } from './people'

export type { PostEngagementType } from './competitor-post-engagement'

export type ResponseStatus = 'queued' | 'in_progress' | 'succeeded' | 'failed' | 'cancelled'

export interface FileAttachment {
  name: string
  uri: string
  mimeType?: string | null
  sizeBytes?: number | null
}

export interface AgentConfig {
  plannerModelType?: 'SMART_MODEL' | 'REASONING_MODEL' | string
  coordinatorModelType?: 'SMART_MODEL' | 'REASONING_MODEL' | string
  orchestratorModelType?: 'SMART_MODEL' | 'REASONING_MODEL' | string | null

  // Optional: Model name overrides (e.g., 'openai:gpt-4o', 'anthropic:claude-3-7-sonnet-20250219')
  plannerModelName?: string | null
  coordinatorModelName?: string | null
  orchestratorModelName?: string | null
  finalResponseModelName?: string | null
  fastModelName?: string | null

  // Optional: Feature flags
  useCognitiveTools?: boolean
  enableTaskValidation?: boolean
  generateComprehensiveOutput?: boolean

  // Optional: Skill filtering
  skillIds?: string[]
}

export interface ModelOverrides {
  [key: string]: string
}

export type CriterionType
  = | 'universal'
    | 'post_hard'
    | 'varying'
    | 'post_soft'
    | 'validation_only'
export type ColumnKind = 'extraction' | 'verdict'

/** SLM relevance reranker tier (deep_people_search / people_scoring output). */
export type RelevanceTier = 'STRONG_MATCH' | 'PARTIAL_MATCH' | 'WEAK_MATCH'

export interface CriterionDefinition {
  criterionId: string
  columnName: string
  criterionText: string
  criterionType: CriterionType
  weight: number
  /** Exact user-prompt clause supporting the generated criterion, when available. */
  sourceClauseQuote?: string
  /** The grounded fidelity audit edited, retyped, or added this criterion. */
  auditMutated?: 'edited' | 'edited+retyped' | 'added'
  /** The deterministic source-clause strength guard retyped this criterion. */
  strengthGuardMutated?: boolean
  /** Machine-readable explanation for a deterministic strength retype. */
  strengthGuardReason?: string
  /** Expected answer shape for an extraction column. */
  answerFormat?: string
  /** Whether this criterion extracts a value or produces a score-bearing verdict. */
  columnKind?: ColumnKind
  /** Extraction columns are excluded from fit-score calculations. */
  scoringRelevance?: 'none'
  /** Set by the web-need classifier when deep verification runs (response output). */
  requiresWebVerification?: boolean
  /** Whose fact must be verified: person, organization, or location (response output). */
  verificationEntity?: 'person' | 'organization' | 'location'
  /** Positive fact question used for web verification (response output). */
  verificationQuestion?: string
}

export interface CriteriaClassification {
  universalCriteria: CriterionDefinition[]
  postHardCriteria?: CriterionDefinition[]
  varyingCriteria: CriterionDefinition[]
  postSoftCriteria?: CriterionDefinition[]
  validationOnlyCriteria: CriterionDefinition[]
  universalReasoning?: string
  postHardReasoning?: string
  varyingReasoning?: string
  postSoftReasoning?: string
  validationReasoning?: string
}

export interface AddCriterionRequest {
  columnName: string
  criterionText: string
  criterionType?: CriterionType
  weight?: number
}

export interface AddAndRunCriterionRequest {
  criterionText: string
  suggestedColumnName?: string
  /** Expected answer shape, such as "Exactly one of: A, B, C". */
  answerFormat?: string
  /** Extraction columns are score-neutral; verdict columns contribute to fit. */
  columnKind?: ColumnKind
  /** Verify the answer with web retrieval. Defaults to true. */
  webVerify?: boolean
}

export interface CriteriaMetadata {
  version: number
  createdAt: string
  source: 'generated' | 'reused' | 'provided'
  sourceResponseId?: string | null
  criteriaDefinitions: CriterionDefinition[]
  criteriaClassification: CriteriaClassification
}

// ═══════════════════════════════════════════════════════════════════════════
// Deep People Search Output Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Preview metadata for progressive surfacing during deep search.
 * Shows partial results as batches complete.
 */
export interface DeepSearchPreview {
  /** True if results are still being processed */
  isPartial: boolean
  /** Current processing phase */
  phase: 'fast_filter_in_progress' | 'fast_filter_complete' | 'validation_complete' | string
  /** Number of batches completed so far */
  batchesComplete?: number
  /** Total number of batches to process */
  batchesTotal?: number
  /** Total candidates that have passed filtering so far */
  totalPassed?: number
  /** Number of candidates shown in this preview (capped at 50) */
  candidatesShown?: number
  /** Total candidates excluded so far */
  totalExcluded?: number
  /** Candidates pending deep validation */
  pendingDeepValidation?: number
  /** ISO timestamp of last update */
  lastUpdate?: string
}

/**
 * Source of evidence for a criterion evaluation.
 */
export interface EvidenceSource {
  /** Type of source: profile data or web search */
  sourceType: 'profile' | 'web_search'
  /** Field name (for profile) or search query (for web) */
  fieldOrQuery: string
  /** URL if from web search */
  url?: string | null
}

/**
 * Result of evaluating a single criterion for a candidate.
 * Contains scoring, evidence, and reasoning.
 */
export interface CriterionResult {
  /** Unique identifier matching criteria definition */
  criterionId: string
  /** Type encodes both requirement strength and evaluation stage. */
  criterionType: CriterionType
  /** Column name for display */
  columnName: string
  /** User-friendly display text for the criterion */
  criterionText: string
  /** Weight used in score calculation (0.0-1.0) */
  weight: number

  // Evaluation results
  /** Whether the criterion was met */
  criterionMet: boolean
  /** Score for this criterion (0-10) */
  score: number
  /** Confidence in the evaluation (0.0-1.0) */
  confidence: number
  /** Canonical cell value for extraction columns; null when no reliable answer was found. */
  extractedValue?: string | null
  /** Risk that the result is unsupported or hallucinated. */
  hallucinationRisk?: 'low' | 'medium' | 'high'

  // Evidence and reasoning
  /** User-facing explanation of what was checked and found (min 2 sentences) */
  reasoning: string
  /** Concrete evidence with sources */
  evidence: string
  /** List of sources where evidence was found */
  evidenceSources: EvidenceSource[]

  // Sufficient information assessment
  /** Whether sufficient data was available */
  sufficientInformation: boolean
  /** Explanation of why data was/wasn't sufficient */
  sufficientInformationReasoning: string

  // Inference fields (when direct evidence is missing)
  /** Explanation of what's missing and whether inference is possible */
  inferenceReasoning?: string | null
  /** Specific signals used for inference (career progression, company selectivity, etc.) */
  inferenceSignalsUsed?: string | null
  /** One-sentence summary connecting signals to criterion */
  inferenceSummary?: string | null
  /** True if evaluation relies on inference rather than direct evidence */
  inferenceApplied: boolean

  // Reasoning chain
  /** Why criterion was/wasn't met */
  criterionMetReasoning: string
  /** Why this specific score was given */
  scoreReasoning: string
  /** Why this confidence level */
  confidenceReasoning: string
}

/**
 * One discrete buying-intent signal, broken out from the synthesized
 * `intentScore`.
 *
 * ADDITIVE / OPTIONAL: the scalar `intentScore` + `intentReasoning` remain the
 * source of truth for ranking. This list is an auditable, per-signal breakdown
 * for the frontend.
 */
export interface IntentSignal {
  /**
   * Scope and category of the signal. Company rows use `company_<type>` such as
   * `company_hiring`, `company_funding`, or `company_events`; observed activity
   * uses `person_<activity>` such as `person_authored_post` or
   * `person_post_engagement`. Existing specialized values such as
   * `competitor_rep_engagement` are also returned.
   */
  signalType: string
  /** Concise who/what for this signal — e.g. 'AE @ Mercor commented on their post'. */
  source: string
  /** 0-10 strength of THIS signal alone (same rubric as intentScore). */
  score: number
  /**
   * 0-1 — how much THIS signal should count toward overall intent (person-level
   * > company-level). Used for analysis/aggregation, not ranking.
   */
  weight: number
  /** Human recency of the signal, e.g. '3d ago', '6mo ago', 'unknown'. */
  recency: string
  /** One sentence on why THIS signal suggests they're in-market now. */
  reasoning: string
  /** Stored post URL copied from the evidence row when this is a post-based signal. */
  postUrl?: string | null
  /** Stored post text copied from the evidence row when this is a post-based signal. */
  postText?: string | null
  [key: string]: any
}

/**
 * Validated candidate with scoring and criterion results.
 * Returned from deep_people_search after validation.
 */
export interface ValidatedCandidate {
  /** Unique identifier for the candidate */
  candidateId: string
  /** Full name */
  name: string
  /** LinkedIn profile URL */
  linkedinUrl?: string
  /** LinkedIn/provider member identifier, including Sales Navigator hidden-profile IDs. */
  linkedinMemberId?: string | null
  /**
   * Current job title. When the reranker runs, may reflect the resolved primary
   * operating role (`primaryTitle`); see `enrichedCurrentTitle` for the pre-rerank value.
   */
  currentTitle?: string
  /**
   * Current company. When the reranker runs, may reflect the resolved primary
   * employer (`primaryCompany`); see `enrichedCurrentCompany` for the pre-rerank value.
   */
  currentCompany?: string
  /** Location */
  location?: string
  /** Location resolved by validation, including an evidence-based inference when needed. */
  primaryLocation?: string | null
  /** Evidence and reasoning used to resolve `primaryLocation`. */
  locationReasoning?: string | null
  /** Provenance for an inferred `location`, such as `inferred:validation`. */
  locationSource?: string | null
  /** Profile picture URL */
  profilePictureUrl?: string

  // Scoring
  /** Overall match score (0-10) */
  overallScore: number
  /** Weighted average of criterion confidences */
  overallConfidence: number
  /** User-facing summary (3-5 sentences with highlights) */
  summary: string

  // Criterion results
  /** Legacy criterion-results field returned by some scoring paths. */
  criterionResults?: CriterionResult[]
  /** Criterion results emitted by deep_people_search and people_scoring. */
  deepCriteria?: CriterionResult[]
  /** Number of criteria actually judged by an LLM; zero means the candidate was unjudged. */
  criteriaJudged?: number

  // Metadata
  /** Warnings about criteria that couldn't be fully verified */
  criteriaQualityWarnings?: string[]
  /** Explanation of LinkedIn engagement relevance (if applicable) */
  engagementReasoning?: string | null
  /**
   * Buying-intent score (0-10), SEPARATE from fit (`overallScore`). 0 when no
   * intent signals are present. Synthesized from `intentSignals`.
   */
  intentScore?: number
  /**
   * User-facing buying-intent explanation (1-2 sentences per signal). Empty
   * string when the candidate has no intent signals.
   */
  intentReasoning?: string
  /**
   * Per-signal buying-intent breakdown that `intentReasoning`/`intentScore`
   * synthesize from. Empty/absent when no intent signals are present. Populated
   * by deep_people_search validation, competitor_post_engagement, and
   * competitor_rep_engagement.
   */
  intentSignals?: IntentSignal[]
  /**
   * Holistic relevance score (0-100) from the SLM reranker (on by default).
   * Ranking-only: absent when `deepValidationUseRelevanceReranker` was false or
   * when the fixed Sales Navigator lane was used; does not change `overallScore`
   * or routing.
   */
  relevanceScore?: number
  /** Coarse match tier paired with `relevanceScore`. */
  relevanceTier?: RelevanceTier
  /** One-line reranker justification grounded in candidate data. */
  relevanceReason?: string
  /**
   * Backend-authored delivery tier. Current runs use 3 for judged/in-region,
   * 2 for judged/out-of-region, and 0 for unjudged. Tier 1 may exist on older responses.
   */
  rankTier?: 0 | 1 | 2 | 3
  /**
   * Zero-based position in the backend's shipped order. Preserve response
   * order or sort this field ascending; per-row scores cannot reproduce
   * diversity reordering exactly.
   */
  deliveryRank?: number
  /** Whether the candidate satisfies the search's location requirement. */
  geoOk?: boolean
  /** Model's direct answer to the location requirement, when one exists. */
  llmRegionMatch?: boolean | null
  /** Reasoning behind `llmRegionMatch`. */
  llmRegionMatchReasoning?: string | null
  /**
   * Primary current operating role from the reranker (main full-time job, not side/advisory).
   * Also written to `currentTitle` when present.
   */
  primaryTitle?: string
  /**
   * Employer of the primary current role. Also written to `currentCompany` when present.
   */
  primaryCompany?: string
  /** Pre-rerank `currentTitle` preserved when the reranker overwrites display fields. */
  enrichedCurrentTitle?: string
  /** Pre-rerank `currentCompany` preserved when the reranker overwrites display fields. */
  enrichedCurrentCompany?: string
  /**
   * True when the candidate failed at least one universal or post_hard (must-have) criterion.
   * This affects scoring and routing but no longer forces a lower delivery tier.
   */
  anyUniversalFailed?: boolean
  /**
   * Legacy-named aggregate: true when any universal or post_hard criterion
   * could not be decided from sufficient evidence.
   */
  anyUniversalUncertain?: boolean
  /** Explicit alias for anyUniversalUncertain covering every hard criterion. */
  anyHardUncertain?: boolean
  /**
   * True when promoted from excluded to meet the requested count despite failing hard
   * criteria. This is useful for display and auditing but no longer forces a lower rank tier.
   */
  backfilled?: boolean
  /** Promoted from the excluded pool so deep validation could issue a real verdict. */
  promotedToValidation?: boolean
  /**
   * LinkedIn posts this candidate engaged with (reacted or commented).
   * One entry per post — if someone engaged with multiple competitor posts,
   * this is a list with multiple entries (merged by merge_candidates_node).
   * Populated by deep_people_search (posts / direct_posts) and
   * competitor_post_engagement (with competitor provenance joined in), and
   * influencer_engagement.
   */
  engagementData?: PostEngagementData[]
  /**
   * One row per checked signal: verdict, reason, proof, and the generic
   * `presentation` card. Written by the selected `signalDefinitions`, and by
   * the standalone job-signal lane (normalized into the same `hiring` row at
   * delivery). This is the versioned evidence contract — read it instead of
   * the underscore-prefixed compatibility fields such as `_jobSignalSummary`.
   */
  signalEvidence?: SignalEvidence[]
  /** Broader recent reaction history loaded for engagement-expansion finalists. */
  engagementHistory?: EngagementHistoryEntry[]
  /** Recent comments the person wrote, when the `comments` feed was collected. */
  engagementComments?: EngagementHistoryEntry[]
  /** Recent posts the person authored, when the `authored_posts` feed was collected. */
  authoredPosts?: EngagementHistoryEntry[]
  /** Number of history records found while preparing a later expansion hop. */
  engagementHistoryCount?: number
  /** True when a later hop found this person through an additional independent post. */
  refoundOnNewPost?: boolean
  /** Source of candidate data */
  source?: string
  /** Candidate-source lanes that found this person, including `sales_navigator`. */
  discoverySources?: string[]
  /** LinkedIn relationship distance reported by Sales Navigator. */
  networkDistance?: 'FIRST_DEGREE' | 'SECOND_DEGREE' | 'THIRD_DEGREE' | 'OUT_OF_NETWORK' | null
  /** Number of mutual LinkedIn connections reported by Sales Navigator. */
  mutualConnectionsCount?: number | null
  /** When source is job_signal: hiring-company context from CrustData job listings */
  jobSignalMetadata?: {
    companyId?: number | null
    companyName?: string
    companyLinkedinUrl?: string
    jobCount?: number
    signalSource?: string
    sampleJobListings?: Array<{
      jobId?: string | number | null
      title?: string
      description?: string
      workplaceType?: string
      country?: string
      dateAdded?: string
      dateUpdated?: string
      checkedAt?: string
      url?: string | null
      source?: string | null
    }>
  }
  /** Raw profile data */
  [key: string]: any
}

/**
 * Statistics from posts search (when posts search was used).
 */
export interface PostsSearchStats {
  /** Posts search phase */
  phase?: string
  /** Credits used for posts search */
  creditsUsed?: number
  /** Total posts fetched */
  postsFetched?: number
  /** Posts committed for candidate extraction */
  postsCommitted?: number
  /** Duration of posts search in milliseconds */
  durationMs?: number
  /** Summary of exploration results */
  explorationSummary?: string
  /** Search strategies used */
  searchStrategies?: any[]
  /** Estimated ICP-matching candidates found */
  estimatedIcpCandidates?: number
  /** Metadata about committed posts */
  committedPosts?: any[]
  /** Suggested keywords for future searches */
  suggestedKeywordsForFuture?: string[]
}

/**
 * Search statistics from deep people search.
 */
export interface DeepSearchStats {
  /** Candidates that passed fast filter */
  fastFilterPassed?: number
  /** Candidates excluded by fast filter */
  fastFilterExcluded?: number
  /** Candidates pending deep validation */
  pendingDeepValidation?: number
  /** Batches completed */
  batchesComplete?: number
  /** Total batches */
  batchesTotal?: number
  /** Posts search statistics (when posts search was used) */
  postsSearch?: PostsSearchStats | null
  /** Job signal pipeline stats (companies found, confirmed, decision makers), when job signal search ran */
  jobSignalPrefilterStats?: Record<string, unknown> | null
  /**
   * Measured signal-enrichment accounting, including the paid pool the
   * dispatcher selected. Null when no signal ran.
   */
  enrichment?: SignalEnrichmentStats | null
  /** Per-signal coverage and spend. Empty when no signal ran. */
  signalFunnel?: SignalFunnel
}

/**
 * Structured output from deep_people_search specialized agent.
 * Available in ResponseObject.structuredResponse.
 */
export interface DeepPeopleSearchOutput {
  /** Preview metadata for progressive surfacing */
  preview?: DeepSearchPreview
  /** Validated candidates (sorted by score descending) */
  candidates: ValidatedCandidate[]
  /** Candidates that were excluded (limited to 100) */
  excludedCandidates?: ValidatedCandidate[]
  /** Total candidates found before filtering */
  totalFound?: number
  /** Search statistics */
  searchStats?: DeepSearchStats
  /** Criteria metadata */
  criteria?: CriteriaMetadata
  /** Definitions used by the scoring pipeline. */
  criteriaDefinitions?: CriterionDefinition[]
  /** Distinct canonical values for each extraction column. */
  columnValues?: Record<string, string[]>
  /** Version of the signal-evidence contract on these candidates. Currently 1. */
  signalContractVersion?: number
  /** The effective signal list — manual, or the one auto-selection resolved. */
  signalDefinitions?: SignalDefinition[]
  /** The intent-scoring direction the run used, or null. */
  intentScoringInstructions?: string | null
  /** Present only when `autoSelectLane` and/or `autoSelectSignals` ran. */
  autoSearchSelection?: AutoSearchSelection
}

export interface StructuredResponse extends Record<string, any> {
  criteria?: CriteriaMetadata
  criteriaDefinitions?: CriterionDefinition[]
  /** Distinct canonical values for each extraction column. */
  columnValues?: Record<string, string[]>
  /** Deep people search output (when using deep_people_search agent) */
  preview?: DeepSearchPreview
  candidates?: ValidatedCandidate[]
  /** Version of the signal-evidence contract on these candidates. Currently 1. */
  signalContractVersion?: number
  /** The effective signal list — manual, or the one auto-selection resolved. */
  signalDefinitions?: SignalDefinition[]
  /** The intent-scoring direction the run used, or null. */
  intentScoringInstructions?: string | null
  /** Present only when `autoSelectLane` and/or `autoSelectSignals` ran. */
  autoSearchSelection?: AutoSearchSelection
  /** Competitor post engagement output (when using competitor_post_engagement agent) */
  competitorsResolved?: ResolvedCompetitorTarget[]
  discoveredCompetitors?: string[]
  discoveryTrace?: DiscoveryTrace
  costStats?: AgentCostStats
  provenanceAttached?: boolean
  agentParams?: Record<string, any>
  /** Competitor rep engagement output (when using competitor_rep_engagement agent) */
  resolutionWarnings?: string[]
  repEngagementStats?: RepEngagementStats
  /** Saved content package from content_intelligence or engagement_expansion. */
  package?: ContentIntelligencePackage
  /** Competitor and optional own-company posts, separate from the audience package. */
  competitorPackage?: ContentIntelligenceCompetitorPackage
  /** Collection and resolution coverage for the competitor content lane. */
  competitorCoverage?: ContentIntelligenceCompetitorCoverage
  summary?: ContentIntelligenceSummary | IntelligenceReportSummary
  outputs?: ContentIntelligenceOutputs
  coverage?: ContentIntelligenceCoverage
  audienceStats?: ContentIntelligenceAudienceStats | Record<string, never>
  /** Engagement expansion output (when using engagement_expansion agent). */
  expansionStats?: EngagementExpansionStats
  /** Influencer engagement collection metadata. */
  seedCoverage?: InfluencerEngagementSeedCoverage[]
  seedPosts?: InfluencerEngagementSeedPost[]
  /**
   * Company/person intelligence output (when using company_intelligence or
   * person_intelligence). `envelope` is the display-block document; it is null
   * when the translator step failed — the report itself still ships and
   * `summary.errors` counts the failure.
   * @see {@link ./company-intelligence.ts} for the full agent reference.
   */
  envelope?: IntelligenceReportEnvelope | null
  /** The full intelligence report markdown — the same text as `outputText`. */
  reportMarkdown?: string
  /** Person-lane evidence grades. Null on company reports. */
  richness?: PersonEvidenceRichness | null
  /** Company-lane corpus statistics. Empty on person reports. */
  stats?: Record<string, any>
  /** Per-call vendor credit ledger for the run. */
  credits?: IntelligenceCreditLedger
}

/**
 * Available specialized agents
 * Using a union type that can be extended with any string to support future agents
 */
export type SpecializedAgentType =
  | 'quick_people_search'
  | 'deep_people_search'
  | 'people_scoring'
  | 'competitor_post_engagement'
  | 'competitor_rep_engagement'
  | 'content_intelligence'
  | 'engagement_expansion'
  | 'influencer_engagement'
  | 'company_intelligence'
  | 'person_intelligence'
  | (string & {})

/**
 * The one date-range vocabulary shared by every windowed parameter: post and
 * engagement lanes (`postsDateRange`), the standalone job-signal discovery lane
 * (`jobSignalDateRange`), and each signal's own `settings.dateRange` inside
 * `signalDefinitions`.
 */
export type DateRange =
  | 'past-24h'
  | 'past-week'
  | 'past-2-weeks'
  | 'past-3-weeks'
  | 'past-month'
  | 'past-quarter'
  | 'past-6-months'
  | 'past-year'
  | 'past-2-years'
  | 'past-3-years'

/**
 * Shared posts date-range enum for LinkedIn post and engagement agents.
 * Identical to {@link DateRange}; the alias documents the post-lane caveats.
 *
 * The longer ranges (`past-6-months`, `past-2-years`, `past-3-years`) apply fully
 * only to the Fiber profile-history lanes (`competitor_rep_engagement` and
 * `influencer_engagement`, ~3 years). For KEYWORD post search (deep_people_search posts +
 * competitor_post_engagement), Crustdata's keyword-post API only supports
 * `past-24h`, `past-week`, `past-month`, `past-quarter` and `past-year`: the
 * unsupported narrower windows (`past-2-weeks`, `past-3-weeks`, `past-6-months`)
 * request the nearest supported BROADER window and are then honored
 * window-exact via a client-side cutoff (may return fewer results), while
 * `past-2-years`/`past-3-years` are CAPPED to `past-year`.
 */
export type PostsDateRange = DateRange

// ═══════════════════════════════════════════════════════════════════════════
// Signal enrichment (deep_people_search and every standalone people lane)
//
// Signals are OPTIONAL evidence collected AFTER the lane's own discovery and
// fast filter, on the survivors only, and before deep validation:
//
//   lane -> discovery -> merge -> fast filter -> realtime refresh
//        -> selected enrichments -> deep validation -> results
//
// Selecting signals never chooses or changes the discovery lane, and never
// hard-filters candidates: each signal writes evidence, and the existing deep
// validator decides relevance and weight. Omitting `signalDefinitions` — or
// sending `[]` — leaves the pre-signal search behavior untouched.
//
// The paid pool is bounded: with a non-empty list the backend ranks fast-filter
// survivors by their existing fast-filter score and enriches at most
// `ceil(1.5 × the actual requested count)`, so a request for 200 people
// enriches and deep-validates at most 300.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Signals that can be selected in `signalDefinitions`.
 *
 * - `hiring` — the current employer has relevant open job postings (company scope).
 * - `engagement` — the person's own recent LinkedIn activity (person scope).
 * - `recently_joined` — they started the current role inside the window;
 *   derived from profile data already collected, at zero extra vendor cost.
 * - `funding` — the employer matches a requested funding stage or recently raised.
 * - `events` — a relevant recent company event (acquisition, security incident,
 *   migration, layoff, expansion, product launch); the same evidence serves
 *   requirements that an event DID or did NOT happen.
 *
 * `competitor_tools` and `web_traffic` are implemented but temporarily disabled
 * server-side (their shared company-record lookup measured $1.20 per employer);
 * sending either fails validation before any paid work starts.
 */
export type SignalType =
  | 'hiring'
  | 'engagement'
  | 'recently_joined'
  | 'funding'
  | 'events'

/** Paid activity feeds the `engagement` signal can collect, once each. */
export type EngagementActivity = 'reactions' | 'comments' | 'authored_posts'

/** Settings accepted by every signal that only needs a look-back window. */
export interface SignalDateRangeSettings {
  /**
   * Look-back window for THIS signal only. Omit to keep the signal's own
   * default (hiring inherits the job planner's 90-365 days, engagement uses
   * 30 days, `recently_joined` uses `past-quarter`, funding/events stay
   * request-driven).
   */
  dateRange?: DateRange
}

/** Settings implemented specifically by the `engagement` signal. */
export interface EngagementSignalSettings extends SignalDateRangeSettings {
  /**
   * Activity feeds to collect. Each selected feed is fetched once per person
   * and can back several output views. Omit to keep the existing behavior:
   * reuse any engagement the lane already collected, otherwise collect
   * reactions.
   */
  activities?: EngagementActivity[]
  /**
   * Company names, domains, or LinkedIn company URLs whose posts (or proven
   * employees' posts) matter. The signal derives the match from the SAME
   * activity it already collected — it never fetches activity twice and never
   * buys an author-profile lookup to guess an employer, so an unprovable
   * author stays `unknown`. Omitting this disables the derived view and leaves
   * the competitor discovery lanes unchanged.
   */
  targetCompanies?: string[]
}

/**
 * One selected signal plus its optional, signal-local settings.
 *
 * Unknown names, duplicate names, bare strings, unknown settings, and invalid
 * date ranges are rejected before any paid enrichment runs.
 *
 * @example
 * ```ts
 * const signalDefinitions: SignalDefinition[] = [
 *   { name: 'hiring', settings: { dateRange: 'past-quarter' } },
 *   { name: 'funding', settings: { dateRange: 'past-year' } },
 *   { name: 'engagement', settings: {
 *     dateRange: 'past-month',
 *     activities: ['reactions', 'comments'],
 *     targetCompanies: ['OpenAI', 'anthropic.com'],
 *   } },
 * ]
 * ```
 */
export type SignalDefinition =
  | {
    name: 'engagement'
    settings?: EngagementSignalSettings
    /** Detailed evidence brief appended to, never substituted for, the request. @maxLength 4000 */
    context?: string | null
  }
  | {
    name: Exclude<SignalType, 'engagement'>
    settings?: SignalDateRangeSettings
    /** Detailed evidence brief appended to, never substituted for, the request. @maxLength 4000 */
    context?: string | null
  }

/**
 * Discovery lanes the automatic selector can choose from when
 * `autoSelectLane` is true. `lookalike` runs the `engagement_expansion` agent;
 * the other standalone values map to their like-named specialized agents.
 */
export type SignalDiscoveryLane =
  | 'profile'
  | 'job_signal'
  | 'posts_engagement'
  | 'competitor_post_engagement'
  | 'competitor_rep_engagement'
  | 'influencer_engagement'
  | 'lookalike'

/**
 * What automatic selection actually applied, echoed on the structured response
 * whenever `autoSelectLane` and/or `autoSelectSignals` ran. Only the dimensions
 * that were requested appear: primary/secondary lane fields are absent in
 * signal-only mode, and `signalDefinitions` is absent in lane-only mode.
 */
export interface AutoSearchSelection {
  /** Why the planner chose this lane and these signals. */
  reasoning: string
  /** True when automatic planning failed and the backend used its standard fallback. */
  plannerFailed?: boolean
  /** Last planner failure, present when `plannerFailed` is true. */
  plannerError?: string
  /** True when the discovery lane was chosen automatically. */
  autoSelectedLane?: boolean
  /** True when the signal list was chosen automatically. */
  autoSelectedSignals?: boolean
  /** Legacy single-lane field retained for older responses. */
  lane?: SignalDiscoveryLane
  /** Primary lane chosen by the current two-lane planner. */
  primaryLane?: SignalDiscoveryLane
  /** Optional second lane chosen by the current two-lane planner. */
  secondaryLane?: SignalDiscoveryLane | null
  /** The chosen signals; present only when `autoSelectSignals` was true. */
  signalDefinitions?: SignalDefinition[]
  [key: string]: any
}

/**
 * Outcome of one signal check.
 *
 * - `evidence_found` — the evidence was observed and is in the row.
 * - `none_found` — the source was successfully read and affirmatively did not
 *   match. Neutral, not an error.
 * - `unknown` — coverage, identity, provider, date precision, or model
 *   processing could not establish the answer. Never render it as a "no".
 */
export type SignalVerdict = 'evidence_found' | 'none_found' | 'unknown'

/** Whether a signal row describes the person or their current employer. */
export type SignalScope = 'person' | 'company'

/** One label/value pair on a signal's presentation card. */
export interface SignalPresentationFact {
  label: string
  value: string
}

/** One source link on a signal's presentation card. */
export interface SignalPresentationLink {
  label: string
  url: string
  date?: string
}

/**
 * Code-derived, signal-agnostic projection of the evidence. Every signal fills
 * the same shape, so one component renders them all; `evidence` and `outputs`
 * remain the signal-specific detail behind it.
 */
export interface SignalPresentation {
  summary: string
  facts: SignalPresentationFact[]
  links: SignalPresentationLink[]
}

/** Named views the `engagement` signal exposes under `outputs`. */
export type EngagementSignalOutputName =
  | 'reactions'
  | 'comments'
  | 'authoredPosts'
  | 'competitorEngagement'
  | 'competitorRepEngagement'
  | 'companyRollup'

/** One processed view inside a signal's `outputs` dictionary. */
export interface SignalOutput {
  verdict: SignalVerdict
  /** Relevant in-window proof for this view. Not capped by record count. */
  evidence: Array<Record<string, any>>
  /** Why the view is `none_found` or `unknown`; absent when evidence was found. */
  reason?: string
  /** Measured 0-1 value where the view has one (e.g. the company roll-up share). */
  strength?: number
  /** Target companies this view matched, for the competitor views. */
  matchedCompanies?: string[]
  [key: string]: any
}

/**
 * One signal's public evidence row, written onto every checked candidate.
 *
 * Keys arrive camelCased by the SDK, so the backend's `signal_evidence`,
 * `signal_type`, and `detected_at` read as `signalEvidence`, `signalType`, and
 * `detectedAt` here; verdict and signal-name VALUES keep their wire spelling
 * (`evidence_found`, `recently_joined`).
 */
export interface SignalEvidence {
  signalType: SignalType | (string & {})
  verdict: SignalVerdict
  /** Measured 0-1 value where the signal has one (hiring share); null otherwise. */
  strength?: number | null
  /** Date of the evidence, when the source supports one. */
  detectedAt?: string | null
  /** Where the evidence came from, e.g. `crustdata_job_search`, `exa`. */
  source?: string | null
  /** Plain-English collection or judgment result. */
  reason: string
  /** The generic card contract; render this for the default view. */
  presentation: SignalPresentation
  /** Signal-specific detail. Empty for `engagement`, whose proof lives in `outputs`. */
  evidence: Array<Record<string, any>>
  /** Effective non-default settings this row was collected under. */
  settings?: Record<string, any>
  /** Detailed collection brief applied to this signal, when one was supplied. */
  context?: string | null
  scope: SignalScope
  /** Current employer this row describes; company-scoped signals only. */
  entity?: { name: string | null, domain: string | null }
  /**
   * Processed views, currently used by `engagement`: the selected activity
   * feeds plus zero-cost derived views (`companyRollup`, and the competitor
   * views when `targetCompanies` was configured).
   */
  outputs?: Partial<Record<EngagementSignalOutputName, SignalOutput>> & Record<string, SignalOutput>
  [key: string]: any
}

/** Per-signal coverage and spend, keyed by signal name under `signalFunnel`. */
export interface SignalFunnelRow {
  candidatesChecked?: number
  candidatesEvidenceFound?: number
  candidatesNoneFound?: number
  candidatesUnknown?: number
  companiesChecked?: number
  companiesEvidenceFound?: number
  companiesNoneFound?: number
  companiesUnknown?: number
  /** Reason text → how many rows carried it. */
  unknownReasons?: Record<string, number>
  /** Company-scoped unknown reasons folded in by the engagement roll-up. */
  companyUnknownReasons?: Record<string, number>
  /** Vendor credits actually charged for this signal. */
  creditsSpent?: number
  /** Provider-reported dollar estimate (funding/events); absent when unreported. */
  costUsd?: number
  searchesRun?: number
  /** Searches whose response reported no normalized cost. */
  searchesWithoutCost?: number
  /** Result rows returned per provider, e.g. `{ exa: 20 }`. */
  providerResults?: Record<string, number>
  [key: string]: any
}

/**
 * `searchStats.signalFunnel`, keyed by signal name. Names arrive camelCased,
 * so `recently_joined` reads as `recentlyJoined`.
 */
export type SignalFunnel =
  & Partial<Record<'hiring' | 'engagement' | 'recentlyJoined' | 'funding' | 'events', SignalFunnelRow>>
  & Record<string, SignalFunnelRow>

/** How many fast-filter survivors the paid signal boundary actually enriched. */
export interface SignalEnrichmentPool {
  /** The customer-facing requested count the cap was derived from. */
  requested?: number
  availableAfterFastFilter?: number
  /** `ceil(1.5 × requested)`. */
  limit?: number
  selected?: number
  /** Survivors below the ranked paid boundary, never enriched. */
  skipped?: number
}

/**
 * Measured enrichment accounting for the run (`searchStats.enrichment`).
 * Signal-specific keys are added by whichever signals ran, so the shape stays
 * open; the fields below are the ones every run can carry.
 */
export interface SignalEnrichmentStats extends Record<string, any> {
  signalEnrichmentPool?: SignalEnrichmentPool
  signalFunnel?: SignalFunnel
}

/** @see {@link ./competitor-post-engagement.ts} for full agent reference (invocation, pipeline, output shape, costs). */

/**
 * Parameters for specialized agent execution
 * This is a flexible interface that supports any agent-specific parameters
 */
export interface SpecializedAgentParams {
  /**
   * Maximum number of results.
   * Agent-specific ranges: quick_people_search (1-100), deep_people_search
   * alias (1-1000), competitor_post_engagement (1-1000).
   */
  limit?: number
  /**
   * Number of candidates requested (for deep_people_search)
   * Range: 1-1000
   */
  requestedCandidates?: number
  /**
   * LinkedIn Sales Navigator people-search or people-list URL used as the
   * deterministic candidate source for deep_people_search. Requires `userId`
   * on the create request so the backend can resolve the acting user's owned
   * LinkedIn connection. V1 accepts people-search and people-list URLs only,
   * caps provider extraction at 2,500 rows, and disables all other discovery
   * lanes, relevance reranking, below-criteria backfill, and engagement-history
   * enrichment.
   * @maxLength 8192
   */
  salesNavigatorUrl?: string
  /**
   * Specific data sources to use (agent-specific)
   * For people search agents: ["PDL", "CORESIGNAL", "CRUST_DATA"]
   */
  dataSources?: string[]
  /**
   * Custom LinkedIn profile URLs to exclude from people search results.
   * Used for CrustData post-processing (exclude_profiles) and also applied as a server-side post-filter.
   */
  excludeProfiles?: string[]
  /**
   * If true, exclude people the user has previously contacted (best-effort via stored LinkedIn URLs).
   * @default false
   */
  excludePreviouslyContacted?: boolean
  /**
   * Names to exclude from results (passed through to CrustData post-processing when supported).
   */
  excludeNames?: string[]
  /**
   * Exclude people already in the acting user's synced CRM (`crm_contacts` ledger;
   * local lookup only, never a live CRM call). Matches on exact LinkedIn URL and
   * email; optionally name+company when `crmNameCompanyMatch` is true.
   * @default true
   * Used by deep_people_search (via `specializedAgentParams`) and quick_people_search
   * (via top-level `options` on the create request).
   */
  excludeCrmContacts?: boolean
  /**
   * Narrow CRM exclusion to specific granted owners' ledgers (user id or email).
   * Omitted = the acting user's own CRM only. Ungranted entries are ignored.
   */
  crmExclusionOwners?: string[]
  /**
   * Within CRM exclusion, also drop candidates matching by exact name + company
   * (catches CRM contacts with no LinkedIn URL, especially HubSpot).
   * @default true
   */
  crmNameCompanyMatch?: boolean
  /**
   * Response ID to reuse criteria from.
   */
  reuseCriteriaFrom?: string
  /**
   * Pre-defined criteria definitions to use.
   */
  criteriaDefinitions?: CriterionDefinition[]
  /**
   * Pre-defined criteria classification to use.
   */
  criteriaClassification?: CriteriaClassification
  /**
   * Run validation against a single criterion ID.
   */
  runSingleCriterion?: string
  /**
   * Add a new criterion to existing criteria.
   */
  addCriterion?: AddCriterionRequest
  /**
   * Add a new criterion from English text and run only that criterion.
   * Can be a string (criterion text) or an object with criterion_text and optional suggested_column_name.
   * Example string: 'Must have 5+ years Python experience'
   * Example object: { criterionText: 'Has ML experience', suggestedColumnName: 'ml_experience' }
   * If suggestedColumnName not provided, it will be auto-generated from the text.
   */
  addAndRunCriterion?: string | AddAndRunCriterionRequest
  /**
   * List of candidate profiles to score (for people_scoring agent).
   * Each candidate must include at least one identifier: linkedin_url or email/emails.
   */
  candidateProfiles?: Array<Record<string, any>>

  // ═══════════════════════════════════════════════════════════════════════════
  // Influencer Engagement
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * LinkedIn profile URLs whose authored posts seed discovery.
   * Required by influencer_engagement. Seeds are always excluded from results.
   */
  seedProfiles?: string[]

  /**
   * Whether influencer_engagement should also use posts the seeds reacted to.
   * These posts describe a wider, third-party audience and may carry no
   * engagement counts, so they can rank below authored posts.
   * @default false
   */
  includeReactedPosts?: boolean

  // ═══════════════════════════════════════════════════════════════════════════
  // Content Intelligence
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Re-cook the content package stored on a prior response without repeating
   * audience search or engagement collection.
   * Used by content_intelligence.
   */
  reusePackageFrom?: string

  /**
   * Outputs to produce. Omit to use the backend's default set, currently all
   * three supported outputs.
   * Used by content_intelligence.
   */
  outputs?: ContentIntelligenceOutputName[]

  // ═══════════════════════════════════════════════════════════════════════════
  // Engagement Expansion
  // ═══════════════════════════════════════════════════════════════════════════

  /** Saved content-intelligence response whose package seeds the expansion. */
  expandFromResponse?: string
  /** Outward rounds to walk. Minimum 1; defaults to 1. */
  hops?: number
  /** Answering posts per hop. Minimum 1; omitted derives breadth from `limit`. */
  postsPerHop?: number
  /** Highest-fit people carried into the next hop. Minimum 1; defaults to 20. */
  peoplePerNextHop?: number
  /**
   * LinkedIn profile URLs excluded in addition to the source package audience
   * or influencer seed profiles.
   */
  excludeUrls?: string[]

  /**
   * Results requested from each Exa query in the people-search research lane.
   * Minimum 1; omitted uses the lane default of 100.
   * Used by deep_people_search and content_intelligence.
   */
  exaResultsPerQuery?: number

  // ═══════════════════════════════════════════════════════════════════════════
  // LinkedIn Posts Integration (deep_people_search)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Whether to search profile databases (CrustData/PDL).
   * Options: true (always), false (never), 'auto' (LLM decides).
   * @default true
   * Used by deep_people_search.
   */
  searchProfiles?: boolean | 'auto'

  /**
   * Whether to search LinkedIn posts for engagement (authors, reactors, commenters).
   * Options: true (always), false (never), 'auto' (LLM decides based on query).
   * @default 'auto'
   * Used by deep_people_search.
   */
  searchPosts?: boolean | 'auto'

  /**
   * Whether to include LinkedIn post engagement in candidate scoring.
   * Options: true (always), false (never), 'auto' (LLM decides).
   * @default 'auto'
   * Used by deep_people_search.
   */
  includeEngagementInScore?: boolean | 'auto'

  /**
   * Maximum number of posts to search.
   * Range: 1-500
   * @default 50
   * Used by deep_people_search when searchPosts is enabled.
   */
  postsMaxResults?: number

  /**
   * Maximum number of keywords to use for posts search.
   * If not provided, all extracted keywords are used.
   * Range: 1-20
   * Used by deep_people_search when searchPosts is enabled.
   */
  postsMaxKeywords?: number

  /**
   * Date window for posts search / post selection / rep engagement lookback.
   * Options: 'past-24h', 'past-week', 'past-month', 'past-quarter',
   * 'past-6-months', 'past-year', 'past-2-years', 'past-3-years'.
   * @default 'past-month'
   * Used by deep_people_search, competitor_post_engagement,
   * competitor_rep_engagement, influencer_engagement, and content_intelligence.
   *
   * For deep_people_search / competitor_post_engagement it bounds POST recency;
   * for competitor_rep_engagement it bounds how far back each rep's OUTGOING
   * engagement is considered (also bounded by `maxEngagementsPerRep`); for
   * influencer_engagement it bounds each seed's authored posts and, when
   * `includeReactedPosts` is true, reacted-to posts;
   * for content_intelligence it bounds each audience member's reaction history.
   *
   * NOTE on keyword post search: Crustdata's keyword-post API only supports up to
   * 'past-year'. 'past-6-months' is honored window-exact via a client-side cutoff
   * (may return fewer results); 'past-2-years'/'past-3-years' are capped to
   * 'past-year'. The longer ranges apply fully to the Fiber history lanes.
   */
  postsDateRange?: PostsDateRange

  /**
   * Engagement fields to fetch from posts.
   * Options: 'reactors' (5 credits/post), 'comments' (5 credits/post), 'reactors,comments' (10 credits/post)
   * @default 'reactors'
   * Used by deep_people_search when searchPosts is enabled.
   */
  postsFields?: 'reactors' | 'comments' | 'reactors,comments'

  /**
   * Maximum reactors per post to fetch.
   * Range: 1-5000
   * @default 5000
   * No additional cost (same 5 credits/post for 1-5000 reactors).
   * Used by deep_people_search when postsFields includes 'reactors'.
   */
  postsMaxReactors?: number

  /**
   * Maximum comments per post to fetch.
   * Range: 1-5000
   * @default 5000
   * No additional cost (same 5 credits/post for 1-5000 comments).
   * Used by deep_people_search when postsFields includes 'comments'.
   */
  postsMaxComments?: number

  /**
   * Whether to enrich posts candidates with EnrichLayer.
   * @default false
   * CrustData posts API already provides rich data (skills, experience, education).
   * Enable only if you need additional fields from EnrichLayer.
   * Used by deep_people_search when searchPosts is enabled.
   */
  postsEnableEnrichment?: boolean

  /**
   * Whether to filter posts for relevance before extracting people.
   * @default true
   * Uses LLM to identify and skip hiring posts, spam, and irrelevant content.
   * Improves candidate quality at cost of ~1 LLM call per post.
   * In content_intelligence this marks junk on package rows without deleting it.
   * Used by deep_people_search, content_intelligence, and influencer_engagement.
   */
  postsEnableFiltering?: boolean

  /**
   * Weight for engagement score when included in match score calculation.
   * Range: 0.0-0.3
   * @default 0.15
   * Used by deep_people_search when includeEngagementInScore is true.
   */
  engagementScoreWeight?: number

  /**
   * Web verification of criteria a LinkedIn profile cannot establish (customer/vendor
   * status, agency type, city stats, grants, etc.).
   * - 'auto' (default): classifier forces only web-only criteria to real web verification
   * - 'always': force every non-profile criterion to web verification
   * - 'off': legacy behavior (may clear web-only criteria from profile data alone)
   * Used by deep_people_search.
   */
  deepVerify?: 'off' | 'auto' | 'always'

  /**
   * If true, re-rank surfaced results with a cheap SLM relevance judge (holistic fit
   * to the request). Ranking-only: never changes routing/inclusion; `overallScore` and
   * `intentScore` are untouched. Adds `relevanceScore` / `relevanceTier` per candidate.
   * @default true
   * Used by deep_people_search, people_scoring, competitor_post_engagement,
   * competitor_rep_engagement, and influencer_engagement. Forced off for the
   * Sales Navigator V1 source lane.
   */
  deepValidationUseRelevanceReranker?: boolean

  /**
   * When fewer candidates pass hard criteria than requested, pad the result list by
   * promoting top-scoring excluded candidates (tagged `backfilled=true`). Set false for
   * quality-over-count (return only passing candidates, even if fewer than requested).
   * @default true
   * Used by deep_people_search and people_scoring. Forced off for the Sales
   * Navigator V1 source lane.
   */
  deepValidationBackfillBelowCriteria?: boolean

  /**
   * Enrich fast-filter survivors with recent LinkedIn engagement history before
   * deep validation. This is an optional paid stage and is forced off for the
   * Sales Navigator V1 source lane.
   * @default true
   * Used by deep_people_search.
   */
  enrichEngagementHistory?: boolean

  /**
   * Override the model used for criteria decomposition (e.g. 'openai:gpt-5.4').
   * Defaults to the configured deep-search model. Only changes the criteria generator,
   * not fast_filter/validation.
   * Used by deep_people_search and people_scoring.
   */
  deepSearchCriteriaModel?: string

  /**
   * Whether to extract post authors as candidates from posts search.
   * When true with directPostsExtractReactors=false and directPostsExtractCommenters=false,
   * enables author-only mode at 1 credit/post (vs 5-10 credits/post with engagement).
   * Finds content creators talking about relevant topics.
   * @default true
   * Used by deep_people_search.
   */
  postsExtractAuthor?: boolean

  /**
   * Whether to extract reactors from topic-based post search results.
   * Omitted lets the post-search agent decide per committed post.
   */
  postsExtractReactors?: boolean

  /**
   * Whether to extract commenters from topic-based post search results.
   * Omitted lets the post-search agent decide per committed post.
   */
  postsExtractCommenters?: boolean

  // ═══════════════════════════════════════════════════════════════════════════
  // Direct LinkedIn Post URLs (deep_people_search)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Direct LinkedIn post URLs to extract candidates from.
   * System will extract authors, reactors, and commenters with full profile data.
   *
   * **Format:** `['https://www.linkedin.com/posts/username_topic-activity-123456-hash']`
   *
   * **Note:** Only works reliably for recent posts (~1 month). Older posts return author only.
   *
   * **Cost:** ~11 + N credits per URL (N = people to enrich).
   *
   * Used by deep_people_search.
   */
  directPostUrls?: string[]

  /**
   * Maximum number of reactors to fetch per direct post URL.
   * Range: 0-5000
   * @default 500
   * Used by deep_people_search when directPostUrls is provided.
   */
  directPostsMaxReactors?: number

  /**
   * Maximum number of comments to fetch per direct post URL.
   * Range: 0-5000
   * @default 100
   * Used by deep_people_search when directPostUrls is provided.
   */
  directPostsMaxComments?: number

  /**
   * Whether to extract the post author as a candidate.
   * @default true
   * Used by deep_people_search when directPostUrls is provided.
   */
  directPostsExtractAuthor?: boolean

  /**
   * Whether to extract post reactors as candidates.
   * @default true
   * Used by deep_people_search when directPostUrls is provided.
   */
  directPostsExtractReactors?: boolean

  /**
   * Whether to extract post commenters as candidates.
   * @default true
   * Used by deep_people_search when directPostUrls is provided.
   */
  directPostsExtractCommenters?: boolean

  // ═══════════════════════════════════════════════════════════════════════════
  // LinkedIn Connections Search (deep_people_search)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Search user's 1st-degree LinkedIn connections for candidates.
   * Requires LinkedIn connected and synced.
   * Cost: ~$0.01 per connection enriched (EnrichLayer).
   * LLM pre-filters connections based on headline before enrichment.
   * @default false
   * Used by deep_people_search.
   */
  searchConnections?: boolean

  /**
   * Search for decision makers at companies with active hiring signals (CrustData job listings).
   * Options: true (always), false (never), 'auto' (enable when profile search is classified as needed).
   * Requires CrustData API access; uses additional credits (~15–50 per run).
   * @default false
   * Used by deep_people_search.
   */
  searchJobSignal?: boolean | 'auto'

  /**
   * Maximum candidates to return per company. Prevents results
   * dominated by a single large company. Applied after validation,
   * keeps highest-scored per company.
   * @default 3
   * @minimum 1
   * @maximum 1000
   * Used by deep_people_search.
   */
  maxCandidatesPerCompany?: number

  /**
   * Job-posting window for the STANDALONE job-signal discovery lane
   * (`searchJobSignal`). Omit to keep the existing job planner's automatic
   * 90-365 day window. Stacked hiring is configured separately, through its own
   * `signalDefinitions` entry's `settings.dateRange`.
   * Used by deep_people_search.
   */
  jobSignalDateRange?: DateRange

  // ═══════════════════════════════════════════════════════════════════════════
  // Signal enrichment and automatic selection
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Signal enrichments to run on fast-filter survivors, before deep validation.
   * One list, no weights, no required flags, no OR groups — each entry is a
   * signal name plus optional signal-local settings.
   *
   * Omitting the field, or sending `[]`, runs no enrichment and preserves the
   * existing search flow exactly. A non-empty list bounds paid work to the
   * top `ceil(1.5 × requested count)` survivors and sends every enriched person
   * through deep validation so the new evidence is judged.
   *
   * Selecting a signal the chosen lane already collected (job-signal lane +
   * `hiring`, an engagement lane + `engagement`) reuses that evidence rather
   * than buying it twice.
   *
   * Used by deep_people_search, competitor_post_engagement,
   * competitor_rep_engagement, influencer_engagement, and engagement_expansion.
   *
   * @example [{ name: 'hiring', settings: { dateRange: 'past-quarter' } }, { name: 'funding' }]
   */
  signalDefinitions?: SignalDefinition[]

  /**
   * Choose the signal enrichments automatically from the request. Ignores any
   * `signalDefinitions` you send; the discovery lane is left untouched unless
   * `autoSelectLane` is also true.
   * @default false
   */
  autoSelectSignals?: boolean

  /**
   * Choose the discovery lane automatically from the request. Ignores the
   * requested agent as a lane choice, the manual lane booleans, Sales
   * Navigator, and direct-post sources; manual `signalDefinitions` survive
   * unless `autoSelectSignals` is also true. Lane inputs the chosen lane needs
   * (`company`, `competitors`, `seedProfiles`, `expandFromResponse`) are
   * preserved — the selector picks workflows, it does not invent targets.
   * @default false
   */
  autoSelectLane?: boolean

  /**
   * Plain-English direction for how every intent-scoring stage should
   * prioritize and combine the available evidence — post selection, reactor
   * pre-ranking, the light pre-ranker, the job-signal relevance gate, the
   * funding/events extractor, fast filter, and deep validation all receive the
   * same sentence. It never changes fit criteria, filtering, lane routing,
   * collection, or any ranking formula. Omit it to keep existing scoring
   * behavior byte-for-byte.
   *
   * @example 'Prioritize direct engagement over company-level evidence.'
   */
  intentScoringInstructions?: string

  // ═══════════════════════════════════════════════════════════════════════════
  // Competitor Post Engagement (competitor_post_engagement)
  //
  // Scores people who reacted to / commented on competitor LinkedIn posts.
  // Discovery mode (`company`): ReAct finds competitors via Exa + optional
  // Firecrawl homepage fetch + Fiber kitchen-sink validation, then ranks by
  // engagement. Explicit mode (`competitors`): skips discovery.
  //
  // Required API keys (BYO or platform):
  //   - FIBER_API_KEY — company resolution + post listing (required)
  //   - CRUSTDATA_API_KEY — reactor/commenter extraction + exec search
  //   - FIRECRAWL_API_KEY — optional; improves discovery on ambiguous domains
  //     (Exa-only fallback when absent; fetch_url_content returns {error})
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Single seed company (domain or name).
   *
   * For competitor_post_engagement / competitor_rep_engagement this is the seed
   * whose competitors are discovered; exactly one of `company` or `competitors`
   * is required. For content_intelligence it is the caller's own company, read
   * through the competitor sources and presented as `self` beside the requested
   * competitors; it is only meaningful when `competitors` is supplied. For
   * company_intelligence it is the REQUIRED target domain (the one the company
   * uses on LinkedIn when they differ). For person_intelligence it is the
   * EMPLOYER's domain — required on the name door, optional context on the
   * LinkedIn-URL door.
   *
   * The intelligence agents normalize a pasted URL: `https://www.acme.com/about`
   * resolves to `acme.com`.
   */
  company?: string

  /**
   * Explicit list of competitor companies (domains or names). Skips discovery
   * in the competitor prospecting agents. For content_intelligence, up to five
   * values add a separate competitor-publication report to the audience report.
   */
  competitors?: string[]

  /**
   * Free-text summary of what a company does.
   *
   * For competitor_post_engagement, this describes the seed company and
   * anchors discovery when `company` is provided. For content_intelligence,
   * this describes the company the post ideas are for and steers only those
   * ideas; search, curation, and engagement analysis remain unsteered. For
   * company_intelligence / person_intelligence it says who is asking and why,
   * and is the only content-tailoring input.
   *
   * @example 'AI-powered outbound automation for B2B sales — books meetings via LinkedIn + email on autopilot'
   */
  companyContext?: string

  /**
   * Desired content type, angle, format, or exclusions for post ideas.
   * Used only by content_intelligence post-idea generation; it does not steer
   * search, curation, or engagement analysis.
   *
   * @example 'Practitioner how-tos, not hot takes; no hiring posts'
   */
  contentDirection?: string

  /**
   * Optional list of known-good example competitors. The discovery ReAct
   * uses these as anchors and finds more in the same vertical.
   * Used when `company` is provided (discovery mode).
   *
   * @example ['outreach.io', 'apollo.io']
   */
  companyExamples?: string[]

  /**
   * Which engagement signals to use. Options: 'reactor', 'commenter'.
   * @default ['reactor', 'commenter']
   *
   * For competitor_post_engagement: which engagers to extract FROM competitor
   * posts (also drives post ranking — reactor-only ranks by reactions, not
   * comments). For competitor_rep_engagement: which OUTGOING actions of the rep
   * to harvest (reactor = posts they reacted to, commenter = posts they
   * commented on).
   */
  engagementTypes?: PostEngagementType[]

  /**
   * Include posts from competitor company pages.
   * @default true
   */
  includeCompanyPosts?: boolean

  /**
   * Include posts from competitor executive personal pages.
   * @default true
   */
  includeExecPosts?: boolean

  /**
   * Drop candidates whose current employer is one of the analyzed competitors.
   * Competitor employees reacting to their own company's posts are noise.
   * Set false for poaching / hiring use cases.
   * @default true
   */
  excludeCompetitorEmployees?: boolean

  /**
   * Titles to count as 'executive' when searching exec posts. Supplying the
   * list replaces the agent's defaults outright.
   * @default ['Founder', 'Co-Founder', 'CEO', 'CTO', 'COO', 'CFO', 'CRO', 'CMO', 'VP', 'Chief']
   */
  execTitles?: string[]

  /**
   * Max competitors to analyze after discovery (engagement-ranked).
   * Only applied in discovery mode; explicit `competitors` lists are not capped.
   * @default 10
   * @minimum 1
   * @maximum 50
   */
  maxCompetitors?: number

  /**
   * Max executives per competitor. The competitor prospecting lane defaults to
   * five and ranks by post engagement; content_intelligence defaults to ten and
   * selects by title seniority before reading histories.
   * @default 5 for competitor_post_engagement; 10 for content_intelligence
   * @minimum 1
   * @maximum 20
   */
  maxExecsPerTarget?: number

  /**
   * Max posts per competitor (union of company + exec posts), engagement-ranked.
   * @default 5
   * @minimum 1
   * @maximum 20
   */
  maxPostsPerTarget?: number

  /**
   * Cap reactors extracted per post. Omit to use the agent default (5000).
   * Lower values speed up runs but reduce the candidate pool.
   * Cost is unchanged — Crustdata bills per call regardless of count.
   * @minimum 1
   * @maximum 5000
   */
  maxReactorsPerPost?: number

  /**
   * Requested commenter cap per post. Competitor post engagement accepts up to
   * 100; influencer engagement accepts up to 5000. The backend currently echoes
   * this field but does not enforce it in direct-post extraction.
   * @minimum 1
   * @maximum 5000 (influencer_engagement); 100 (competitor_post_engagement)
   */
  maxCommentsPerPost?: number

  /**
   * Enrich the full author/candidate pool BEFORE the LLM prefilter cuts it.
   * Higher discrimination, higher cost (~20x enrichment spend on large runs).
   * Default false enriches only prefilter survivors.
   * @default false
   * Used by competitor_post_engagement, competitor_rep_engagement, and
   * influencer_engagement.
   */
  thoroughEnrichment?: boolean

  // ═══════════════════════════════════════════════════════════════════════════
  // Competitor Rep Engagement (competitor_rep_engagement)
  //
  // INVERSE of competitor_post_engagement: finds a competitor's SALES REPS and
  // surfaces the AUTHORS of the posts those reps engage with (the reps' prospects).
  // REUSES the competitor-sourcing params above (company / competitors /
  // companyContext / companyExamples / excludeCompetitorEmployees /
  // expandExclusionViaDiscovery / postsDateRange / thoroughEnrichment / limit) AND
  // `engagementTypes` (reactor → posts the rep reacted to, commenter → posts the
  // rep commented on). Only the rep-crawl knobs below are new.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Override the default sales-rep title list used to find competitor reps
   * (e.g. Account Executive, SDR, BDR, Account Manager).
   * Used by competitor_rep_engagement.
   */
  repTitles?: string[]

  /**
   * Max sales reps to crawl per competitor.
   * @default 20
   * @minimum 1
   * @maximum 100
   * Used by competitor_rep_engagement.
   */
  maxRepsPerCompetitor?: number

  /**
   * Max outgoing engagements (reactions + comments combined) harvested per rep.
   * Bounds Fiber pagination cost.
   * @default 100
   * @minimum 1
   * @maximum 1000
   * Used by competitor_rep_engagement.
   */
  maxEngagementsPerRep?: number

  /**
   * Only mine a rep's engagement from AFTER they joined the competitor
   * (engagement before their start date is a prior job's network, not
   * current-role prospects). Effective lookback = min(postsDateRange,
   * time-since-joined). Reps with unknown start date are not capped (kept).
   * @default true
   * Used by competitor_rep_engagement.
   */
  restrictEngagementToTenure?: boolean

  /**
   * In explicit-competitors mode, also run a names-only discovery to build a
   * broader employee-exclusion set across the vertical.
   * @default true
   * Used by competitor_rep_engagement.
   */
  expandExclusionViaDiscovery?: boolean

  // ═══════════════════════════════════════════════════════════════════════════
  // Company / Person Intelligence (company_intelligence, person_intelligence)
  //
  // One deep report on a single company, or on a single person. Two registered
  // agents over one pipeline. The company lane REUSES `company` (its domain)
  // and `companyContext` (who is asking) from above; the person lane reuses
  // `company` as the EMPLOYER's domain and `companyContext` as requester
  // context. Only the params below are new.
  //
  // Required API keys (BYO or platform) — every leg fails soft when one is absent:
  //   - CRUSTDATA_API_KEY — posting corpus, headcount/traffic series, enrichment,
  //     roster, exec posts
  //   - FIBER_API_KEY — talent flow, revenue estimate, person profile/posts/X/IG
  //   - FIRECRAWL_API_KEY — careers + press page capture (plain fetch fallback)
  //   - EXA_API_KEY — news sweep, web-events check, person web presence
  //
  // Full reference: src/types/company-intelligence.ts
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * LinkedIn profile URL of the person to report on (person_intelligence, URL
   * door). No name needed — it is read from the live profile. `company` may
   * accompany it as the employer's domain for employer context.
   */
  linkedinUrl?: string

  /**
   * Full name of the person to report on (person_intelligence, name door).
   * Requires `company` — the employer's domain — to resolve the right person.
   * Prefer `linkedinUrl` when you have it; the URL door needs no name.
   */
  personName?: string

  /**
   * Report register for company_intelligence: investor, competitor, vendor or
   * neutral. Register only — it never changes which findings appear or how
   * they are weighted. Content tailoring comes from `companyContext`.
   * @default 'neutral'
   */
  reader?: string

  /**
   * Permit company_intelligence's job-posting fetch to spend past the per-run
   * credit ceiling. Off by default: an oversized corpus stops before buying.
   * @default false
   */
  allowSpend?: boolean

  /**
   * Job-posting window in days for company_intelligence, filtered server-side
   * on the posting's date added. Omit for the FULL posting history — the deep
   * report's timelines, first-of-function detection and never-posted claims
   * need the whole record. Set a window only to trade depth for credits.
   * @minimum 1
   * @maximum 3650
   */
  sinceDays?: number

  /**
   * Additional parameters for any specialized agent
   * This allows flexibility for future agents without SDK updates
   */
  [key: string]: any
}

export interface CreateResponseRequest {
  threadId?: UUID
  messages: Message[]
  files?: FileAttachment[]
  options?: Record<string, any>
  userId?: string
  agentConfig?: AgentConfig
  responseFormat?: Record<string, any>
  responseFormatInstructions?: string
  modelOverrides?: ModelOverrides
  /**
   * Route to a specialized agent instead of the main Lumnis agent
   * Known agents: 'quick_people_search', 'deep_people_search', 'people_scoring',
   * 'competitor_post_engagement', 'competitor_rep_engagement',
   * 'content_intelligence', 'engagement_expansion', 'influencer_engagement',
   * 'company_intelligence', 'person_intelligence'
   * Accepts any string to support future agents without SDK updates
   */
  specializedAgent?: SpecializedAgentType
  /**
   * Parameters specific to the specialized agent
   */
  specializedAgentParams?: SpecializedAgentParams
}

export interface ProgressEntry {
  ts: string
  state: string
  message: string
  toolCalls?: Array<Record<string, any>> | null
  outputText?: string | null
}

export interface ResponseArtifact {
  type: string
  language?: string
  content: string
  [key: string]: any
}

export interface ResponseObject {
  responseId: UUID
  threadId: UUID
  tenantId: UUID
  userId?: UUID | null
  status: ResponseStatus
  progress: ProgressEntry[]
  inputMessages: Message[]
  outputText?: string | null
  content?: string | null // Alias for outputText
  responseTitle?: string | null // Human-readable title for the response (generated after plan creation)
  structuredResponse?: StructuredResponse | null
  artifacts?: ResponseArtifact[] | null
  createdAt: string
  completedAt?: string | null
  error?: Record<string, any> | null
  options?: Record<string, any> | null
}

export interface CreateResponseResponse {
  responseId: UUID
  threadId: UUID
  status: ResponseStatus
  tenantId: UUID
  createdAt: string
}

export interface CancelResponseResponse {
  status: string
  message: string
}

export interface ArtifactObject {
  artifactId: UUID
  responseId: UUID
  name: string
  uri: string
  mimeType: string
  bytes: number
  createdAt: string
}

export interface ArtifactsListResponse {
  artifacts: ArtifactObject[]
  total: number
  limit: number
  offset: number
}

export interface ResponseListResponse {
  responses: ResponseObject[]
  total: number
  limit: number
  offset: number
}

// Feedback types
export type FeedbackType = 'suggestion' | 'correction' | 'guidance'

export interface CreateFeedbackRequest {
  feedbackText: string
  feedbackType?: FeedbackType
  userId?: string
  progressId?: string
  toolCallId?: string
  toolArgsUpdate?: Record<string, any>
}

export interface CreateFeedbackResponse {
  feedbackId: UUID
  createdAt: string
}

export interface FeedbackObject {
  feedbackId: UUID
  responseId: UUID
  tenantId: UUID
  userId?: UUID | null
  feedbackText: string
  feedbackType: FeedbackType
  progressId?: UUID | null
  toolCallId?: string | null
  toolArgsUpdate?: Record<string, any> | null
  isConsumed: boolean
  consumedAt?: string | null
  createdAt: string
}

export interface FeedbackListResponse {
  responseId: UUID
  progressIdFilter?: UUID | null
  totalFeedback: number
  consumedCount: number
  unconsumedCount: number
  feedback: FeedbackObject[]
  note: string
}

// Specialized Agent Response Types

/**
 * Structured output from quick_people_search specialized agent
 * This will be available in ResponseObject.structuredResponse
 * Note: PersonResult is imported from './people' to avoid duplication
 */
export interface QuickPeopleSearchOutput {
  candidates: PersonResult[]
  totalFound: number
  appliedFilters: Record<string, any>
  executionTimeMs: number
  dataSourcesUsed: string[]
}

/**
 * Note: Deep people search and other specialized agents may return different
 * structured outputs. The actual structure will be available in
 * ResponseObject.structuredResponse as a generic Record<string, any>
 *
 * The SDK is designed to be flexible and accept any specialized agent
 * without requiring updates for each new agent type.
 *
 * For competitor_post_engagement, see {@link ./competitor-post-engagement.ts}.
 */

export type {
  AgentCostStats,
  CompetitorPostEngagementOutput,
  DiscoveryTrace,
  PostEngagementData,
  PostEngagementProvenance,
  ResolvedCompetitorTarget,
} from './competitor-post-engagement'

export type {
  CompetitorRepEngagementOutput,
  RepEngagementData,
  RepEngagementStats,
} from './competitor-rep-engagement'
