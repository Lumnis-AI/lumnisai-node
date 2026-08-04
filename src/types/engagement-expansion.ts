import type { CriteriaMetadata, ValidatedCandidate } from './responses'

/** Options accepted by {@link ResponsesResource.engagementExpansion}. */
export interface EngagementExpansionOptions {
  /** Finished content_intelligence response whose saved package seeds the walk. */
  expandFromResponse: string
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
}

/** Resolved parameters echoed in `structuredResponse.agentParams`. */
export interface EngagementExpansionResolvedParams {
  expandFromResponse: string
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
  hopsRequested: number
  postsPerHop: number
  postsPerHopSource: 'requested' | 'derived'
  /** Hop collection only; enrichment and validation use standard deep-search economics. */
  collectionCreditsSpent: number
  collectionCreditCeiling: number
  stopReason: string
  perHop: EngagementExpansionHopStats[]
  /** Credits spent loading broader engagement history for finalists. */
  finalistHistoryCredits?: number
  /** Finalists for whom broader engagement history was available. */
  finalistsWithHistory?: number
}

/** A recent LinkedIn reaction used to give validation broader behavioral context. */
export interface EngagementHistoryEntry {
  when?: string | null
  reactionType?: string | null
  postAuthor?: string | null
  postUrl?: string | null
  postText?: string | null
}

/** Full structured output from a succeeded `engagement_expansion` run. */
export interface EngagementExpansionOutput {
  /** Validated candidates, preserving the backend's scoring order and capped to `limit`. */
  candidates: ValidatedCandidate[]
  criteria?: CriteriaMetadata
  expansionStats?: EngagementExpansionStats
  agentParams: EngagementExpansionResolvedParams
}
