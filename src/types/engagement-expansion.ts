import type { ContentIntelligencePackage } from './content-intelligence'
import type {
  CriteriaMetadata,
  DateRange,
  EngagementActivity,
  SignalDefinition,
  ValidatedCandidate,
} from './responses'

/** Options accepted by {@link ResponsesResource.engagementExpansion}. */
export interface EngagementExpansionOptions {
  /**
   * Finished response whose saved package seeds the walk. This may be a
   * content-intelligence or prior engagement-expansion response. Omit it to
   * collect a seed audience and package from the persona prompt first.
   */
  expandFromResponse?: string
  /**
   * Number of outward rounds to run. At the default limit, collection is
   * approximately 300 credits for one hop and 1,060 for three hops.
   * Enrichment and validation are additional. @default 1
   */
  hops?: number
  /**
   * Answering posts to collect per hop at 5 credits each. Omit to derive
   * breadth from `limit`: limits 25 or 50 derive 60 posts (300 credits),
   * while limit 200 derives 240 posts (1,200 credits).
   */
  postsPerHop?: number
  /** Highest-fit people whose feeds seed the next hop. Ignored for one hop. @default 20 */
  peoplePerNextHop?: number
  /** Maximum validated people returned. @default 50 */
  limit?: number
  /** LinkedIn profile URLs excluded in addition to the source package's audience. */
  excludeUrls?: string[]
  /** SLM relevance reranker for surfaced candidates. @default true */
  deepValidationUseRelevanceReranker?: boolean
  /**
   * Signal enrichments to run on fast-filter survivors before validation.
   * Omitted or `[]` keeps this lane's existing behavior. Engagement evidence
   * the walk already collected is reused rather than repurchased.
   */
  signalDefinitions?: SignalDefinition[]
  /** Plain-English direction for the intent-scoring stages. */
  intentScoringInstructions?: string
}

/** Resolved parameters echoed in `structuredResponse.agentParams`. */
export interface EngagementExpansionResolvedParams {
  /** Null when the run collected its seed package from the prompt. */
  expandFromResponse: string | null
  hops: number
  postsPerHop?: number | null
  peoplePerNextHop: number
  limit: number
  excludeUrls?: string[] | null
}

/** Collection statistics for one expansion hop. */
export interface EngagementExpansionHopStats {
  hop: number
  postsPulled: number
  newPeople: number
  refinds: number
  refindsMergedAsNewEdges: number
  authorColleaguesExcluded: number
  credits: number
  stopReason: string
}

/** Collection and finalist-history accounting for an expansion run. */
export interface EngagementExpansionStats {
  hopsRun: number
  /** Absent on an early `empty_package` stop. */
  hopsRequested?: number
  /** Absent on an early `empty_package` stop. */
  postsPerHop?: number
  /** Absent on an early `empty_package` stop. */
  postsPerHopSource?: 'requested' | 'derived'
  /** Hop collection only; enrichment and validation use standard deep-search economics. */
  collectionCreditsSpent?: number
  /** Absent on an early `empty_package` stop. */
  collectionCreditCeiling?: number
  stopReason: string
  perHop: EngagementExpansionHopStats[]
  /** Credits spent loading broader engagement history for finalists. */
  finalistHistoryCredits?: number
  /** Finalists for whom broader engagement history was available. */
  finalistsWithHistory?: number
  /** Effective look-back window used when loading finalist activity. */
  finalistHistoryWindowDays?: number
  /** The `dateRange` that produced `finalistHistoryWindowDays`, when one was set. */
  finalistHistoryDateRange?: DateRange | null
  /** Fiber credits charged per collected activity feed. */
  engagementActivityCredits?: Record<string, number>
  /** Run-wide runaway guard derived per activity feed. */
  engagementActivityBudgets?: Record<string, number>
  /** Per-person collection outcome for every activity feed that ran. */
  engagementActivityCoverage?: EngagementActivityCoverage[]
  /** The reaction subset of `engagementActivityCoverage`, kept for compatibility. */
  finalistHistoryCoverage?: EngagementActivityCoverage[]
}

/**
 * What one person's activity collection actually did. A dormant person is
 * reported with zero records rather than dropped.
 */
export interface EngagementActivityCoverage {
  /** LinkedIn identifier the pull was made for. */
  person?: string | null
  /** Which feed this row covers, e.g. `reactions`. */
  activity?: EngagementActivity
  /** Paid pages fetched. */
  pages?: number
  /** In-window records retained. */
  records?: number
  newest?: string | null
  oldest?: string | null
  /**
   * Why paging stopped: `window`, `no_more_pages`, `empty_page`, `budget`,
   * `error`, `no_identifier`, or `resumed`.
   */
  stopReason?: string
  /** Fiber credits charged for this person's feed. */
  credits?: number
  /** Exception type when `stopReason` is `error`; never the raw provider message. */
  errorType?: string
  [key: string]: any
}

/**
 * One collected LinkedIn activity record used to give validation broader
 * behavioral context. The same shape carries reactions
 * (`candidate.engagementHistory`), comments (`candidate.engagementComments`),
 * and authored posts (`candidate.authoredPosts`); the fields a feed cannot
 * supply are absent — an authored post has no `reactionType`, a reaction has a
 * `commentText` only when the person left one with it.
 */
export interface EngagementHistoryEntry {
  when?: string | null
  reactionType?: string | null
  /** The person's own words: their comment, or the note left with a reaction. */
  commentText?: string | null
  postAuthor?: string | null
  /** Profile URL of the post's author, when the provider returned one. */
  postAuthorLinkedinUrl?: string | null
  postUrl?: string | null
  postText?: string | null
  [key: string]: any
}

/** Full structured output from a succeeded `engagement_expansion` run. */
export interface EngagementExpansionOutput {
  /** Validated candidates, preserving the backend's scoring order and capped to `limit`. */
  candidates: ValidatedCandidate[]
  criteria?: CriteriaMetadata
  expansionStats?: EngagementExpansionStats
  /** Package used by this run, saved so a later expansion can chain from it. */
  package?: ContentIntelligencePackage
  agentParams: EngagementExpansionResolvedParams
}
