// Response API types
import type { Message, UUID } from './common'
import type {
  AgentCostStats,
  DiscoveryTrace,
  PostEngagementData,
  PostEngagementType,
  ResolvedCompetitorTarget,
} from './competitor-post-engagement'
import type { RepEngagementStats } from './competitor-rep-engagement'
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

export type CriterionType = 'universal' | 'varying' | 'validation_only'

/** SLM relevance reranker tier (deep_people_search / people_scoring output). */
export type RelevanceTier = 'STRONG_MATCH' | 'PARTIAL_MATCH' | 'WEAK_MATCH'

export interface CriterionDefinition {
  criterionId: string
  columnName: string
  criterionText: string
  criterionType: CriterionType
  weight: number
  /** Set by the web-need classifier when deep verification runs (response output). */
  requiresWebVerification?: boolean
  /** Whose fact must be verified: person, organization, or location (response output). */
  verificationEntity?: 'person' | 'organization' | 'location'
  /** Positive fact question used for web verification (response output). */
  verificationQuestion?: string
}

export interface CriteriaClassification {
  universalCriteria: CriterionDefinition[]
  varyingCriteria: CriterionDefinition[]
  validationOnlyCriteria: CriterionDefinition[]
  universalReasoning?: string
  varyingReasoning?: string
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
}

export interface CriteriaMetadata {
  version: number
  createdAt: string
  source: 'generated' | 'reused' | 'provided'
  sourceResponseId?: string
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
  /** Type: universal, varying, or validation_only */
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
   * Category of the signal, e.g. 'competitor_rep_engagement' (a competitor's rep
   * engaged with this person's post), 'person_post_engagement' (they
   * authored/reacted/commented), or 'company_hiring' (their employer is hiring
   * for the initiative).
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
  /** Results for each evaluated criterion */
  criterionResults: CriterionResult[]

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
   * Ranking-only: absent only when `deepValidationUseRelevanceReranker` was false;
   * does not change `overallScore` or routing.
   */
  relevanceScore?: number
  /** Coarse match tier paired with `relevanceScore`. */
  relevanceTier?: RelevanceTier
  /** One-line reranker justification grounded in candidate data. */
  relevanceReason?: string
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
   * Demoted candidates (`anyUniversalFailed` or `backfilled`) sort after passing ones regardless
   * of relevance score.
   */
  anyUniversalFailed?: boolean
  /**
   * True when promoted from excluded to meet the requested count despite failing hard
   * criteria. Such candidates sort after passing ones; use to segregate or badge them.
   */
  backfilled?: boolean
  /**
   * LinkedIn posts this candidate engaged with (reacted or commented).
   * One entry per post — if someone engaged with multiple competitor posts,
   * this is a list with multiple entries (merged by merge_candidates_node).
   * Populated by deep_people_search (posts / direct_posts) and
   * competitor_post_engagement (with competitor provenance joined in).
   */
  engagementData?: PostEngagementData[]
  /** Source of candidate data */
  source?: string
  /** When source is job_signal: hiring-company context from CrustData job listings */
  jobSignalMetadata?: {
    companyId?: number | null
    companyName?: string
    companyLinkedinUrl?: string
    jobCount?: number
    signalSource?: string
    sampleJobListings?: Array<{
      title?: string
      description?: string
      workplaceType?: string
      country?: string
      dateAdded?: string
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
}

export interface StructuredResponse extends Record<string, any> {
  criteria?: CriteriaMetadata
  /** Deep people search output (when using deep_people_search agent) */
  preview?: DeepSearchPreview
  candidates?: ValidatedCandidate[]
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
  | (string & {})

/**
 * Shared posts date-range enum (deep_people_search, competitor_post_engagement,
 * competitor_rep_engagement).
 *
 * The longer ranges (`past-6-months`, `past-2-years`, `past-3-years`) apply fully
 * only to `competitor_rep_engagement` (engagement is sourced from Fiber profile
 * history, ~3 years). For KEYWORD post search (deep_people_search posts +
 * competitor_post_engagement), Crustdata's keyword-post API only supports up to
 * `past-year`: `past-6-months` is honored window-exact via a client-side cutoff
 * (may return fewer results), while `past-2-years`/`past-3-years` are CAPPED to
 * `past-year`.
 */
export type PostsDateRange =
  | 'past-24h'
  | 'past-week'
  | 'past-month'
  | 'past-quarter'
  | 'past-6-months'
  | 'past-year'
  | 'past-2-years'
  | 'past-3-years'

/** @see {@link ./competitor-post-engagement.ts} for full agent reference (invocation, pipeline, output shape, costs). */

/**
 * Parameters for specialized agent execution
 * This is a flexible interface that supports any agent-specific parameters
 */
export interface SpecializedAgentParams {
  /**
   * Maximum number of results.
   * Agent-specific ranges: quick_people_search (1-100), competitor_post_engagement (1-1000).
   */
  limit?: number
  /**
   * Number of candidates requested (for deep_people_search)
   * Range: 1-1000
   */
  requestedCandidates?: number
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
   * Used by deep_people_search, competitor_post_engagement, and
   * competitor_rep_engagement.
   *
   * For deep_people_search / competitor_post_engagement it bounds POST recency;
   * for competitor_rep_engagement it bounds how far back each rep's OUTGOING
   * engagement is considered (also bounded by `maxEngagementsPerRep`).
   *
   * NOTE on keyword post search: Crustdata's keyword-post API only supports up to
   * 'past-year'. 'past-6-months' is honored window-exact via a client-side cutoff
   * (may return fewer results); 'past-2-years'/'past-3-years' are capped to
   * 'past-year'. The longer ranges apply fully only to competitor_rep_engagement.
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
   * Used by deep_people_search when searchPosts is enabled.
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
   * Used by deep_people_search, people_scoring, competitor_post_engagement, and
   * competitor_rep_engagement.
   */
  deepValidationUseRelevanceReranker?: boolean

  /**
   * When fewer candidates pass hard criteria than requested, pad the result list by
   * promoting top-scoring excluded candidates (tagged `backfilled=true`). Set false for
   * quality-over-count (return only passing candidates, even if fewer than requested).
   * @default true
   * Used by deep_people_search and people_scoring.
   */
  deepValidationBackfillBelowCriteria?: boolean

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
   * Single seed company (domain or name) for competitor discovery.
   * The agent discovers competitors of this seed and analyzes their post engagement.
   * Exactly one of `company` or `competitors` is required.
   */
  company?: string

  /**
   * Explicit list of competitor companies (domains or names). Skips discovery.
   * Exactly one of `company` or `competitors` is required.
   */
  competitors?: string[]

  /**
   * Free-text summary of what the seed company does. Anchors competitor
   * discovery so the ReAct doesn't misclassify ambiguous domains
   * (e.g. "lumnis.ai" → academic AI vs sales automation).
   * Used when `company` is provided (discovery mode).
   *
   * @example 'AI-powered outbound automation for B2B sales — books meetings via LinkedIn + email on autopilot'
   */
  companyContext?: string

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
   * Titles to count as 'executive' when searching exec posts via CrustData.
   * OR-fanned as fuzzy title matches under the company LinkedIn URL.
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
   * Max executives per competitor, ranked by total post engagement in window.
   * @default 5
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
   * Cap reactors extracted per post. Omit to use Crustdata API max (5000).
   * Lower values speed up runs but reduce the candidate pool.
   * Cost is unchanged — Crustdata bills per call regardless of count.
   * @minimum 1
   * @maximum 5000
   */
  maxReactorsPerPost?: number

  /**
   * Cap commenters extracted per post. Omit to use quality-cliff threshold (100).
   * Hard-capped at 100: above 100 Crustdata returns thin profiles
   * (name + headline only — no employer/skills/education), degrading scoring.
   * @minimum 1
   * @maximum 100
   */
  maxCommentsPerPost?: number

  /**
   * Enrich the full author/candidate pool BEFORE the LLM prefilter cuts it.
   * Higher discrimination, higher cost (~20x enrichment spend on large runs).
   * Default false enriches only prefilter survivors.
   * @default false
   * Used by competitor_post_engagement and competitor_rep_engagement.
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
   * 'competitor_post_engagement', 'competitor_rep_engagement'
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
